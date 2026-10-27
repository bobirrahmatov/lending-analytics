"""Generate explicit illustrative current/prior releases. Never reads or changes production JSON."""
from pathlib import Path
import json,copy,datetime as dt,calendar
import pal_contract
P=Path(__file__).resolve().parents[1];A=P/'attachments'
base=json.loads((A/'credit-demo-data.js').read_text().split('=',1)[1].strip().removesuffix(';'))
raw=(A/'credit-covenants-demo.js').read_text().split('const fixtures=',1)[1]
fixtures=json.JSONDecoder().raw_decode(raw)[0]['local']
d=copy.deepcopy(base['datasets']);today='2026-08-31';previous='2026-08-28'
d['monitoring']=[r for r in d['monitoring'] if r['category']!='COVENANTS']+copy.deepcopy(fixtures['monitoring'])
d['activity']=copy.deepcopy(fixtures['activity'])
# The original samples remain unchanged. This separate scenario deliberately aligns IDs and dates.
for i,p in enumerate(d['portfolio']):p['banker_name']='Illustrative banker '+str(i%8+1)
for kind in ['monitoring','activity']:
 baseline=max(r['as_of_date'] for r in d[kind])
 for i,r in enumerate(d[kind]):
  old=dt.date.fromisoformat(baseline if kind=='activity' else r['as_of_date']);shift=dt.date.fromisoformat(today)-old
  for k in ['due_date','effective_due_date','deferred_date','event_date','day45_date','days45_date','next_month_end']:
   if r.get(k):
    try:r[k]=(dt.date.fromisoformat(r[k])+shift).isoformat()
    except ValueError:pass
  p=d['portfolio'][i%len(d['portfolio'])]
  for k in ['region','relationship_id','relationship_name','facility_id','ca_id','product','owner_id','owner_name','team_lead','banker_name']:r[k]=p.get(k)
  if kind=='monitoring' and r['category']=='COVENANTS':r['lead_underwriter']=p['owner_name'];r['product_program_name']=p['product']
  r['as_of_date']=today;r['source_record_id']=r.get('source_record_id') or r.get('item_id') or r.get('event_id')
  if kind=='activity':r['month']=r['event_date'][:7]
  else:
   if r['category']=='COVENANTS':
    r['covenant_id']='DEMO-COV-'+str(i//3);r['item_id']='COVENANTS:DEMO-LINK:'+str(i);r['source_record_id']=r['item_id']
    for k in ['deferral_approved','critical','coming_due','action_required','pal_due30']:r[k]=bool(r.get(k))
    r['critical']=r['status']=='PAST_DUE' and (r.get('days_past_due') or 0)>=31
    r['aging_bucket']=r.get('source_aging_bucket') or 'CURRENT'
   r['demo_scenario']='Aligned illustrative comparison; not a historical source export'
  # Raw legacy aliases must not contradict the displayed canonical scenario fields.
  for k,v in list(r.items()):
   if k and k[0].isupper():del r[k]
# Produce prior independently with some added/resolved/changed obligations and smaller exposures.
p=copy.deepcopy(d)
p['monitoring']=[r for i,r in enumerate(p['monitoring']) if i%17!=0]
p['activity']=[r for i,r in enumerate(p['activity']) if i%13!=0 and r['event_date']<=previous]
for kind in ['monitoring','activity','portfolio']:
 for i,r in enumerate(p[kind]):
  r['as_of_date']=previous
  if kind=='monitoring' and r.get('effective_due_date') and r['category']!='INSURANCE':
   n=(dt.date.fromisoformat(previous)-dt.date.fromisoformat(r['effective_due_date'])).days
   r['days_past_due']=max(0,n);r['status']='PAST_DUE' if n>0 else 'COMING_DUE';r['action_required']=n>0;r['coming_due']=n<=0
   if r['category']=='CCM':r['ccm_status']=r['status']
  if kind=='portfolio':
   for k in ['tfa','direct_os','contingent_os','pse_os','osuc','total_os','unused_commitment','unused_uncommitted','total_undrawn','total_comm_exposure']:
    if isinstance(r.get(k),(float,int)):r[k]=round(r[k]*(.96 if i%3 else 1.02),2)
# Complete contracts retain nullable columns from schema, without fabricating missing source attributes.
schema=json.loads((P/'tools/schema.json').read_text())
for data,date in [(d,today),(p,previous)]:
 for kind in ['monitoring','activity','portfolio']:
  for r in data[kind]:
   for f in schema[kind.title()]:r.setdefault(f['field'],False if f['type']=='boolean' else None)
 for r in data['monitoring']:
  end=dt.date.fromisoformat(date);due=r['deferred_date'] if r['deferral_approved'] else r['due_date'];r['effective_due_date']=due
  days=max(0,(end-dt.date.fromisoformat(due)).days) if due else None;r['days_past_due']=days
  r['aging_bucket']='UNKNOWN' if days is None else next((b for n,b in [(0,'CURRENT'),(30,'1-30'),(45,'31-45'),(60,'46-60'),(90,'61-90'),(199,'91-199')] if days<=n),'200+')
  action=r['status'] in ['PAST_DUE','PENDING_AUTH','OPEN','AWAITING_CERTIFICATE','PENDING_REVIEW'];r['action_required']=action
  cat=r['category'];r['critical']=bool(action and ((cat=='COVENANTS' and (days or 0)>=31) or (cat=='FACILITY' and (days or 0)>=60) or (cat=='APPRAISALS' and (days or 0)>=90) or (cat=='INSURANCE' and r['status']=='AWAITING_CERTIFICATE') or (cat=='CCM' and r['classification']=='SUBSTANDARD')))
  month=end.month+3;year=end.year+(month-1)//12;month=(month-1)%12+1;limit=dt.date(year,month,min(end.day,calendar.monthrange(year,month)[1]))
  r['coming_due']=bool(r['status']=='COMING_DUE' and due and end<=dt.date.fromisoformat(due)<=limit)
  if cat=='COVENANTS':
   n=days if r['status']=='PAST_DUE' else (dt.date.fromisoformat(due)-end).days if due else None
   r['source_aging_bucket']=None if n is None else '1-30' if n<=30 else '31-45' if n<=45 else '46-60' if n<=60 else '61-90' if n<=90 else '>90'
 pal_contract.prepare(data['portfolio']);pal_contract.monitoring(data['monitoring'])
 for s in data['sources']:
  s['as_of_date']=date;s['source_file']='ILLUSTRATIVE aligned scenario / '+s['domain'];s['quality_note']='Synthetic comparison scenario derived from local field contracts; not live or historical results.'
  rows=data['portfolio'] if s['domain']=='PORTFOLIO' else data['activity'] if s['domain']=='ACTIVITY' else [r for r in data['monitoring'] if r['category']==s['domain']]
  s['record_count']=sum(r['source_id']==s['source_id'] for r in rows)
# Include exact prior weekday history for PAL, plus month/quarter/year comparisons.
hfields=[f['field'] for f in schema['History']]
history=[]
for date,factor in [('2025-08-31',.82),('2026-05-31',.91),('2026-07-31',.95),(previous,None),(today,1)]:
 for r in (p if factor is None else d)['portfolio']:
  h={k:r.get(k) for k in hfields};h.update(history_id=date+'|'+r['facility_key'],as_of_date=date,facility_count=1,comparison_ready=True)
  if factor is not None:
   for k in ['tfa','total_os','osuc','unused_commitment','unused_uncommitted']:h[k]=round(r[k]*factor,2)
  history.append(h)
d['history']=history;p['history']=[r for r in history if r['as_of_date']!=today]
release='demo-comparison-20261025'
priorPayload={'schema_version':2,'bundle_id':release,'is_demo':True,'rows':p['monitoring'],'datasets':p}
manifest={**base['manifest'],'bundle_id':release,'published_at':'2026-10-25','files':{k:{'filename':'credit-'+k+'-'+release+'.json','rows':len(v)} for k,v in d.items()}}
manifest['files']['previous']={'filename':'credit-previous-'+release+'.json','rows':len(p['monitoring'])}
scenario={'manifest':manifest,'datasets':d,'previous':priorPayload}
(A/'credit-comparison-demo.js').write_text("/* Explicit synthetic comparison scenario. Original workbook/local samples remain available via ?covenants_source=local or workbook. */\nif(window.CREDIT_CONFIG?.mode==='demo'&&!new URLSearchParams(location.search).has('covenants_source'))window.CREDIT_DEMO="+json.dumps(scenario,separators=(',',':'))+';\n')
out=P/'demo-comparison';out.mkdir(exist_ok=True)
for k,rows in d.items():(out/manifest['files'][k]['filename']).write_text(json.dumps({'schema_version':2,'bundle_id':release,'rows':rows},separators=(',',':')))
(out/manifest['files']['previous']['filename']).write_text(json.dumps(priorPayload,separators=(',',':')))
(out/'credit-manifest.json').write_text(json.dumps(manifest,indent=2))
(out/'README.txt').write_text('ILLUSTRATIVE ONLY. Current 2026-08-31 / prior weekday 2026-08-28.\nEvery page consumes the same scenario; previous file retains full source/portfolio/activity/monitoring records.\nNot a production release. Source fixtures were not modified. Banker names and financial changes are synthetic.\n')
print('Built aligned illustrative snapshots:',len(d['monitoring']),'current,',len(p['monitoring']),'prior obligations')
# Per-page extracts make the illustrative comparisons directly reviewable.
for retired in ['sources-current.json','sources-previous.json']:(out/'pages'/retired).unlink(missing_ok=True)
page_names={'portfolio':'Portfolio','trends':'Portfolio trends','deepdive':'Relationship deep dive','overview':'Underwriters Summary','workload':'Underwriter workload','covenants':'Covenants','ca':'CA expiration','facility':'Facility maturity','ccm':'CCM','insurance':'Insurance','appraisals':'Appraisals','activity':'Covenant activity'}
views=out/'pages';views.mkdir(exist_ok=True)
links=[]
for page,title in page_names.items():
 for label,data,date in [('current',d,today),('previous',p,previous)]:
  records=data['portfolio'] if page in ['portfolio','deepdive'] else data['history'] if page=='trends' else data['activity'] if page=='activity' else data['monitoring'] if page in ['overview','workload'] else [r for r in data['monitoring'] if r['category']==page.upper()]
  payload={'is_demo':True,'page':page,'as_of_date':date,'note':'Illustrative extract for inspection. Dashboard loads the shared validated release, not these duplicate views.','rows':records}
  if page=='covenants':payload['portfolio_rows']=data['portfolio'];payload['sources']=data['sources']
  (views/(page+'-'+label+'.json')).write_text(json.dumps(payload,separators=(',',':')))
 if page!='trends':links.append('<tr><td><a href="pages/'+page+'.html">'+title+'</a></td><td><a download href="demo-comparison/pages/'+page+'-current.json">31 Aug 2026</a></td><td><a download href="demo-comparison/pages/'+page+'-previous.json">28 Aug 2026</a></td></tr>')
(P/'Dashboard_Preview.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Credit dashboards — comparison previews</title><link rel="stylesheet" href="attachments/credit-style.css"><style>body{margin:0;font:15px/1.6 Arial,sans-serif;color:#173862;background:white}main{max-width:1000px;margin:40px auto;padding:0 24px}h1{font-size:30px}p{color:#61738a}table{border-collapse:collapse;width:100%;border:1px solid #dae4ee}th,td{padding:14px 20px;text-align:left;border-bottom:1px solid #dae4ee}th{background:#f0f5f9}a{color:#255be3}.actions{display:flex;gap:24px;flex-wrap:wrap;margin:24px 0}</style><main><h1>Lending Analytics</h1><p>Illustrative current and previous-weekday releases. Each page uses shared dashboard controls, Highcharts, full-page analyses and source-record tables.</p><p>Current: Monday, 31 August 2026. Previous: Friday, 28 August 2026. Balances, banker names and changes are synthetic demo values, not historical portfolio results. The original local/workbook covenant examples remain available separately.</p><div class="actions"><a href="pages/overview.html">Open Underwriters Summary</a><a href="pages/portfolio.html">Open Portfolio</a><a href="pages/lendinganalytics.html">Lending Analytics</a><a href="All_Pages_Data_Handoff.txt">Data sources and keys</a><a href="Start_Here.html">Project handoff</a></div><table><thead><tr><th>Dashboard</th><th>Current file</th><th>Previous file</th></tr></thead><tbody>'''+''.join(links)+'''</tbody></table><p>Portfolio includes the PAL trend table; the legacy Trends URL opens Portfolio. Trend files retain separate historical snapshots; never sum balances across reporting dates. Source provenance always shows all source controls.</p></main></html>''')
