from pathlib import Path
import json, re, datetime, random
P=Path(__file__).resolve().parents[1]; ROOT=P.parents[1]
rng=random.Random(231026)
# A single schema drives templates, export contract and Access table definitions.
S={}
def schema(name, spec):
    S[name]=[]
    for line in spec.strip().splitlines():
        f,t,req,definition=line.split('|',3); S[name].append(dict(field=f,type=t,required=req=='Y',definition=definition))
common='''source_id|text|Y|Approved source identifier; foreign key to Sources.source_id.
source_record_id|text|Y|Stable source key; never a worksheet row number.
as_of_date|date|Y|Business reporting date from this source, not publication date.
region|text|Y|NAM, LATAM, EMEA, APAC, IPB, SARG, CROSS_REGION or UNMAPPED; no silent remap.
owner_id|text|Y|Stable staff identifier; use UNASSIGNED explicitly when unresolved.
owner_name|text|Y|Display name from controlled owner mapping.
team_lead|text|Y|Controlled team lead display name; UNASSIGNED if unresolved.
product|text|Y|Controlled product program; UNMAPPED if unresolved.
relationship_id|text|Y|CARE or approved relationship identifier, stored as text.
relationship_name|text|Y|Relationship display name; never substitute a CA ID.'''
schema('Monitoring', '''item_id|text|Y|Unique category + source + obligation + relationship + facility + cycle key; preserve every covenant-facility association.
category|text|Y|COVENANTS, CA, FACILITY, CCM, INSURANCE or APPRAISALS.
'''+common+'''
owner_role|text|Y|UNDERWRITER or SPECIALIST; one accountable owner per item.
ca_id|text|N|CA identifier, deduplicated by approval cycle for CA monitoring.
facility_id|text|N|Facility identifier; not itself a unique insurance/appraisal key.
covenant_id|text|N|Native covenant identifier; required for COVENANTS.
status|text|Y|PAST_DUE, COMING_DUE, PENDING_AUTH, OPEN, AWAITING_CERTIFICATE, PENDING_REVIEW, CLEARED or UNKNOWN.
due_date|date|N|Original contractual due/expiry date; required for date-based categories.
deferred_date|date|N|Approved deferred due date; used only when deferral_approved is true.
deferral_approved|boolean|Y|Explicit source approval; a date alone does not authorize a deferral.
effective_due_date|date|N|Access output: approved deferral date or original due date.
days_past_due|integer|N|Access output: nonnegative days as of source date; null if no date.
aging_bucket|text|Y|Access output: CURRENT, 1-30, 31-45, 46-60, 61-90, 91-199, 200+ or UNKNOWN.
action_required|boolean|Y|Access output: actionable under the documented category rule.
critical|boolean|Y|Access output: category escalation threshold; rule version attached to release.
coming_due|boolean|Y|Access output: COMING_DUE in inclusive next 3 calendar months.
classification|text|N|PASS, PASS_WATCH_LIST, SPECIAL_MENTION, SUBSTANDARD, SUBSTANDARD_PERFORMING, SUBSTANDARD_NONPERFORMING, DOUBTFUL, LOSS or UNKNOWN.
next_month_end|date|N|CCM data month end, separate from approval due date.
expired_bucket|text|N|Insurance source expiration bucket, kept separately from deficiency aging.
deficiency_bucket|text|N|Insurance source deficiency bucket; never overwrite expiration bucket.
description|text|N|Covenant or monitoring description; internal covenants excluded in Access.
remarks|text|N|Source remarks; internal-prefixed covenant remarks excluded in Access.''')
schema('Portfolio', '''facility_key|text|Y|Unique source + facility identifier at the selected snapshot.
'''+common+'''
facility_id|text|Y|Native facility identifier as text.
parent_facility_id|text|N|Parent identifier for reconciliation; do not add parent and child balances twice.
ca_id|text|N|Credit approval ID.
commitment|text|Y|COMMITTED or UNCOMMITTED; unknown values block publication.
pse|boolean|Y|Controlled PSE classification from Product_Mapping.
sft|boolean|Y|Controlled SFT classification; do not infer from blank fields.
classification|text|Y|Canonical credit classification code.
tfa|number|Y|Total facility amount in USD units; reporting basis must be confirmed.
direct_os|number|Y|Direct outstanding in USD units.
contingent_os|number|Y|Contingent outstanding in USD units.
pse_os|number|Y|Pre-settlement exposure outstanding in USD units.
osuc|number|Y|NAM/LATAM/IPB/SARG supplied exposure; EMEA/APAC computed in Access.
total_os|number|Y|Access output: direct_os + contingent_os + pse_os.
unused_commitment|number|Y|Source supplied for Americas; computed for EMEA/APAC.
total_undrawn|number|Y|Access output: tfa minus total_os; negative values retained for review.
rotce|number|N|Relationship return as decimal fraction, e.g. 0.125 = 12.5%; missing stays null.
maturity_date|date|N|Facility maturity; null for demand with maturity_basis DEMAND.
maturity_basis|text|Y|DATED, DEMAND or UNKNOWN.
ca_expiration_date|date|N|CA expiration date; does not establish authorization workflow status.
origination_date|date|N|Primary new-business date.
renewal_date|date|N|Fallback new-business date when origination absent.
ytd_new|boolean|Y|Access output: non-PSE business date in reporting year to as_of_date.
mtd_new|boolean|Y|Access output: non-PSE business date in reporting month to as_of_date.''')
schema('History','''history_id|text|Y|Unique report date + facility key for daily snapshots; legacy aggregate IDs are retained.
as_of_date|date|Y|Historical snapshot date; stocks must not be summed across dates.
region|text|Y|Canonical region.
product|text|Y|Canonical product.
commitment|text|Y|COMMITTED or UNCOMMITTED.
pse|boolean|Y|Canonical PSE flag.
tfa|number|Y|Sum of prepared facility amounts, USD units.
total_os|number|Y|Sum of prepared total outstanding, USD units.
osuc|number|Y|Sum of prepared OSUC, USD units.
facility_count|integer|Y|Distinct facilities at this exact grain; nonadditive if grain overlaps.''')
schema('Activity','''event_id|text|Y|Unique source event ID; one row per event, not one per covenant.
'''+common+'''
covenant_id|text|Y|Covenant key associated with event.
event_date|date|Y|Maker date from activity source.
month|text|Y|Access output: event_date formatted YYYY-MM.
event_type|text|Y|DEFERRED, WAIVED or DELETED; DEACTIVATED normalized to DELETED in Access.''')
schema('Sources','''source_id|text|Y|Unique source/feed identifier.
domain|text|Y|Monitoring category, PORTFOLIO, HISTORY or ACTIVITY.
source_name|text|Y|Human-readable extract name.
source_file|text|Y|Actual original filename or approved report reference.
as_of_date|date|Y|Source business date; one per selected source snapshot.
coverage|text|Y|ALL_OBLIGATIONS or EXCEPTIONS_ONLY; an exceptions-only feed cannot support clearance rate.
record_count|integer|Y|Reconciled published row count for this source, after exclusions.
source_owner|text|Y|Accountable source provider.
quality_note|text|N|Specific limitation, stale date or mapping issue; not a generic quality score.''')
schema('Documents','''document_id|text|Y|Stable document ID.
category|text|Y|Monitoring category or ALL.
title|text|Y|Document title.
url|text|Y|Approved https or same-origin relative URL; javascript/file/data URLs rejected.
as_of_date|date|N|Document reporting date.''')
schema('Portfolio_Extra', """banker_name|text|N|Explicit source banker or relationship manager; never substitute underwriter.
product_subprogram|text|N|Approved product subprogram from Product_Mapping category mapping.
management_status|text|N|Source DM/CM management status.
facility_type|text|N|Original facility type for product lineage.
risk_category|text|N|Original risk category; NAM Clearing/Notation/Settlement excluded upstream in Access.
control_unit|text|N|Source Control Unit used for region mapping.
product_underwriter|text|N|Source product underwriter; not an additional accountable workload owner.
facility_first_approval_date|date|N|Original facility approval date, kept separately from origination.
ca_review|text|N|Canonical Yes or No from EMEA CA Review; required for EMEA CA eligibility.
loan_spread|number|N|Loan spread in basis points, matching original PAL thresholds 70 / 125; 100 bps = 1 percentage point.
pricing_exception|text|N|Source pricing exception indicator.
total_comm_exposure|number|N|Source committed exposure in USD; retained for OSUC reconciliation.
reporting_currency|text|Y|USD; amounts must be translated upstream using an approved FX basis.""")
S['Portfolio'] += S.pop('Portfolio_Extra')
schema('Monitoring_Extra', """banker_name|text|N|Explicit source banker or relationship manager; never substitute underwriter.
origination_unit|text|N|Source originating unit, distinct from Control Unit.
control_unit|text|N|Source Control Unit used for region mapping.
ou_expense_code|text|N|Origination Unit expense code; text preserves leading zeros.
cu_expense_code|text|N|Control Unit expense code; text preserves leading zeros.
borrowers_name|text|N|Source borrower display name, distinct from relationship.
product_underwriter|text|N|Source product underwriter; not counted as a second owner.
facility_type|text|N|Source facility type.
frequency|text|N|Covenant periodicity or CCM frequency.
source_aging_bucket|text|N|Original source aging category for past-due reconciliation and coming-due display bands.
day45_date|date|N|Source 45 Days Past Due Date; retained separately from computed day count.""")
S['Monitoring'] += S.pop('Monitoring_Extra')
import pal_contract
pal_contract.extend(S)
# Deterministic illustrative dataset. No screenshot totals are represented as reconciled source data.
owners=['Morgan Ellis','Jordan Lee','Avery Chen','Sam Rivera','Taylor Reed','Casey Park','Alex Morgan','Riley Patel','Cameron Diaz','Drew Wilson','Jamie Cole','Robin Shaw']
regions=['NAM','LATAM','EMEA','APAC']; products=['Real Estate','Securities Based Lending','Tailored Lending','Aircraft Finance']
def iso(d):return d.isoformat()
def base(i,source,asof):
    j=i%len(owners)
    return dict(source_id=source,source_record_id=f'{source}-{i:04}',as_of_date=asof,region=regions[i%4],owner_id=f'UW{j+1:03}',owner_name=owners[j],team_lead=['North team','International team','Specialty team'][j%3],product=products[(i//3)%4],relationship_id=f'R{i%65+1:04}',relationship_name=f'Illustrative relationship {i%65+1:03}')
monitor=[]; sources=[]
asofs={'COVENANTS':'2026-08-31','CA':'2026-08-31','FACILITY':'2026-08-31','CCM':'2026-07-13','INSURANCE':'2026-09-01','APPRAISALS':'2026-09-01'}
for cat,n in [('COVENANTS',112),('CA',48),('FACILITY',42),('CCM',14),('INSURANCE',54),('APPRAISALS',86)]:
    source='SRC_'+cat; asof=asofs[cat]; ad=datetime.date.fromisoformat(asof)
    for i in range(n):
        r=base(i,source,asof); d=[7,19,35,44,58,75,109,205,-12,-35,0][i%11]
        status=('PAST_DUE' if d>0 else 'COMING_DUE')
        if cat=='CA':status=['PENDING_AUTH','COMING_DUE','PAST_DUE','CLEARED'][i%4]
        if cat=='CA':
            d = [35,-12,58,-35][i%4]
        if cat=='CCM':status='OPEN'
        if cat=='INSURANCE':status=['AWAITING_CERTIFICATE','PENDING_REVIEW','CLEARED'][i%3]
        if cat=='APPRAISALS' and i%7==0:status='CLEARED'
        dp=max(0,d); act=status in ['PAST_DUE','PENDING_AUTH','OPEN','AWAITING_CERTIFICATE','PENDING_REVIEW']; cl=['SUBSTANDARD','SPECIAL_MENTION'][i%2] if cat=='CCM' else 'PASS'
        critical=act and ((cat=='COVENANTS' and dp>=31) or(cat=='FACILITY' and dp>=60)or(cat=='APPRAISALS' and dp>=90)or(cat=='CCM' and cl=='SUBSTANDARD')or(cat=='INSURANCE' and status=='AWAITING_CERTIFICATE'))
        due=iso(ad-datetime.timedelta(days=d)); r.update(item_id=f'{cat}:{i+1:04}',category=cat,owner_role='SPECIALIST' if cat in ['INSURANCE','APPRAISALS'] else 'UNDERWRITER',ca_id=f'CA2026/{i%50+1:04}',facility_id=f'FA{i+100000}',covenant_id=f'COV{i+1000}' if cat=='COVENANTS' else None,status=status,due_date=due,deferred_date=None,deferral_approved=False,effective_due_date=due,days_past_due=dp,aging_bucket=next((b for a,b in [(0,'CURRENT'),(30,'1-30'),(45,'31-45'),(60,'46-60'),(90,'61-90'),(199,'91-199')] if dp<=a),'200+'),action_required=act,critical=bool(critical),coming_due=status=='COMING_DUE' and d<=0,classification=cl,next_month_end='2026-06-30' if cat=='CCM' else None,expired_bucket='<30 DAYS' if cat=='INSURANCE' else None,deficiency_bucket='<60 DAYS' if cat=='INSURANCE' else None,description='Illustrative monitoring obligation',remarks=None)
        monitor.append(r)
    sources.append(dict(source_id=source,domain=cat,source_name=cat.title()+' monitoring',source_file='ILLUSTRATIVE — replace with approved extract',as_of_date=asof,coverage='ALL_OBLIGATIONS',record_count=n,source_owner='Demo source owner',quality_note='Illustrative data; not the screenshot population.'))
portfolio=[]
for i in range(120):
    r=base(i,'SRC_PORTFOLIO','2026-08-31');tfa=(i%17+3)*1250000; direct=tfa*(.18+(i%7)*.08); cont=tfa*.04;pseos=tfa*.03 if i%7==0 else 0;total=round(direct+cont+pseos,2);comm=i%4!=0;orig=f'2026-{i%8+1:02}-12'
    r.update(facility_key=f'PORT:{i+1:04}',facility_id=f'FA{i+100000}',parent_facility_id=None,ca_id=f'CA2026/{i%50+1:04}',commitment='COMMITTED' if comm else 'UNCOMMITTED',pse=i%7==0,sft=i%13==0,classification=['PASS','PASS','PASS','PASS_WATCH_LIST','SPECIAL_MENTION','SUBSTANDARD'][i%6],tfa=tfa,direct_os=round(direct,2),contingent_os=cont,pse_os=pseos,osuc=tfa if comm else total,total_os=total,unused_commitment=tfa-total if comm else 0,total_undrawn=tfa-total,rotce=None if (i%65)%9==0 else .08+((i%65)%8)*.015,maturity_date='2027-08-31',maturity_basis='DATED',ca_expiration_date='2026-09-30',origination_date=orig,renewal_date=None,ytd_new=i%7!=0,mtd_new=i%8==7 and i%7!=0)
    r['reporting_currency']='USD'
    r.update(management_status='DM' if i%5==0 else 'CM',ca_review='No' if i%6==0 else 'Yes',facility_type='Term Loan' if i%8 else 'Credit Card',facility_first_approval_date=f'2026-{[8,7,6,5][i%4]:02}-{i%25+1:02}',loan_spread=[55,70,95,125,150,None][i%6],pricing_exception='Yes' if i%5==0 else 'No',rotce_period='2026 Q2')
    r['maturity_date']=['2026-07-31','2026-08-31','2026-09-30','2026-10-31','2027-08-31'][i%5]
    r['ca_expiration_date']=['2026-07-31','2026-08-31','2026-09-30','2026-10-31'][i%4]
    if i%6==0:r['origination_date']=None;r['ytd_new']=False;r['mtd_new']=False
    if i%11==0:r['origination_date']='2025-04-12';r['ytd_new']=False;r['mtd_new']=False
    portfolio.append(r)
sources.append(dict(source_id='SRC_PORTFOLIO',domain='PORTFOLIO',source_name='Consolidated facility snapshot',source_file='ILLUSTRATIVE',as_of_date='2026-08-31',coverage='ALL_OBLIGATIONS',record_count=len(portfolio),source_owner='Portfolio reporting',quality_note='USD units; illustrative balances.'))
history=[]
for m in range(3,9):
    groups={}
    for r in portfolio:
        key=(r['region'],r['product'],r['commitment'],r['pse']);g=groups.setdefault(key,dict(region=key[0],product=key[1],commitment=key[2],pse=key[3],tfa=0,total_os=0,osuc=0,facility_count=0))
        for f in ['tfa','total_os','osuc']:g[f]+=round(r[f]*(.8+m*.025),2)
        g['facility_count']+=1
    for j,g in enumerate(groups.values()):history.append(dict(history_id=f'H{m:02}-{j:03}',as_of_date=iso(datetime.date(2026,m+1,1)-datetime.timedelta(days=1)),**g))
activity=[]
for i in range(90):
    r=base(i,'SRC_ACTIVITY','2026-09-01');r.update(event_id=f'EV{i+1:04}',covenant_id=f'COV{i%50+1000}',event_date=f'2026-{6+i%3:02}-{i%27+1:02}',month=f'2026-{6+i%3:02}',event_type=['DEFERRED','WAIVED','DELETED'][(i//3)%3]);activity.append(r)
sources.append(dict(source_id='SRC_ACTIVITY',domain='ACTIVITY',source_name='Covenant activity events',source_file='Covenants_Activity_Report.xlsx — illustrative records',as_of_date='2026-09-01',coverage='ALL_OBLIGATIONS',record_count=90,source_owner='Covenant operations',quality_note='Maker-date event counts; not unique covenant counts.'))
pal_contract.prepare(portfolio)
# Retained daily history uses facility grain so all dashboard filters compare like-for-like.
# Demo balances are explicitly illustrative; production copies actual published balances.
for snapshot,factor in [('2026-08-28',0.985),('2026-08-31',1.0)]:
 history=[h for h in history if h['as_of_date']!=snapshot]
 for r in portfolio:
  h={k:r.get(k) for k in ['region','product','commitment','pse','facility_key','owner_id','owner_name','team_lead','management_status','product_subprogram','facility_type']}
  h.update(history_id=snapshot+'|'+r['facility_key'],as_of_date=snapshot,facility_count=1,comparison_ready=True)
  for k in ['tfa','total_os','osuc','unused_commitment','unused_uncommitted']:h[k]=round(r[k]*factor,2)
  history.append(h)
for i,r in enumerate(monitor):r['ccm_status']=['PAST_DUE','COMING_DUE','OPEN'][i%3] if r['category']=='CCM' else None
pal_contract.monitoring(monitor)
datasets={'monitoring':monitor,'portfolio':portfolio,'history':history,'activity':activity,'sources':sources,'documents':[]}
for entity,fields in S.items():
    for r in datasets.get(entity.lower(),[]):
        for f in fields:r.setdefault(f['field'], None)
bundle='demo-20261023';manifest=dict(schema_version=2,bundle_id=bundle,is_demo=True,published_at='2026-10-23',rule_version='proposed-1',files={})
for name,rows in datasets.items():
    filename=f'credit-{name}-{bundle}.json';data=dict(schema_version=2,bundle_id=bundle,rows=rows);raw=json.dumps(data,ensure_ascii=False,separators=(',',':'))
    (P/'attachments'/filename).write_text(raw);manifest['files'][name]={'filename':filename,'rows':len(rows)}
(P/'attachments'/'credit-manifest.json').write_text(json.dumps(manifest,indent=2));(P/'attachments'/'credit-demo-data.js').write_text('window.CREDIT_DEMO = '+json.dumps(dict(manifest=manifest,datasets=datasets),ensure_ascii=False,separators=(',',':'))+';\n')
(P/'tools'/'schema.json').write_text(json.dumps(S,indent=2))
# Preserve every regional source mapping expression, independently of proposed canonical schema.
src=(ROOT/'LPTM-Hub/PAL-ETL.html').read_text(); mappings=[]
for method in ['mapPortfolioRowEMEA','mapPortfolioRowAPAC','mapPortfolioRowNAM','mapCovenantRow']:
    a=src.index('                '+method+'(');b=src.find('\n                },',a);block=src[a:b]
    for match in re.finditer(r'^\s{24}(\w+|\x27[^\x27]+\x27):\s*(.*)',block,re.M):
        tail=block[match.end():].splitlines(); continuation=[]
        for line in tail:
            if line.strip() and len(line)-len(line.lstrip())<=24: break
            if line.strip(): continuation.append(line.strip())
        expression=' '.join([match.group(2),*continuation])
        mappings.append([method,match.group(1).strip("'"),expression,f'LPTM-Hub/PAL-ETL.html:{src[:a+match.start()].count(chr(10))+1}'])
(P/'tools'/'legacy-mappings.json').write_text(json.dumps(mappings,indent=2))
print('Generated',sum(len(v) for v in datasets.values()),'illustrative records;',sum(len(v) for v in S.values()),'contract fields;',len(mappings),'legacy mappings.')
