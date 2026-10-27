"""PAL business outputs. Executed at build time only; never shipped as browser ETL."""
import datetime as dt, calendar, re
EXCLUDED = ['Cash Management-DOL','Cash Management-ACH','Settlement','Overdraft Line','Collateral Monitoring Line','Outgoing TPC','Credit Card','Guaranty','Cash Management-Other','B&I Margin Loan','Cash Management-BACS','SAFE - Prime Finance','Clearing','Agency Clearing','SAFE - Financing','B&I Short Market Values','Residential First Mortgage-Standard','B&I Non-Purpose Loan','Unallocated']
PORT_FIELDS = [
('unused_uncommitted','number','Total undrawn minus unused commitment; PAL overview card.'),
('pal_ca_expired','boolean','CM only; EMEA CA Review Yes; CA expiration before reporting date. Count distinct relationships.'),
('pal_ca_month','text','Eligible CA expiry month in reporting month and next two months, date >= report date; otherwise null.'),
('pal_facility_expired','boolean','Facility maturity before report date; CM and DM both included.'),
('pal_facility_month','text','Facility expiry month in reporting month and next two months, date >= report date; otherwise null.'),
('pal_approval_period','text','CURRENT/PREVIOUS month from first approval date; NAM/LATAM/EMEA only. Otherwise null.'),
('pal_pipeline_bucket','text','1-30 / 31-60 / 61-90 / >90 days since first approval in reporting year; NAM/LATAM non-PSE, no origination date and 19 excluded facility types. Otherwise null.'),
('pal_spread_bucket','text','SBL with Direct OS >0; <=70 / 70-125 / >125 bps. Missing spread remains null.'),
('pal_spread_weight','number','Loan spread in bps multiplied by Direct OS for eligible SBL; null without valid spread.'),
('pal_spread_os','number','Direct OS denominator for valid-spread SBL; zero otherwise.'),
('pal_pricing_exception','boolean','SBL Direct OS >0 and pricing exception Yes.'),
('pal_prior_ytd','boolean','Non-PSE origination or renewal fallback in prior year through same month/day.'),
('pal_prior_mtd','boolean','Non-PSE origination or renewal fallback in prior month through same day; clamped to month end.'),
]
# Period membership is prepared once, identically for every UI and export.
for period in ['ytd','qtd','mtd','wtd']:
 for prefix,definition in [('pal_new_','Non-PSE origination or renewal fallback'),('pal_approved_','NAM/LATAM/EMEA first approval'),('pal_pending_','Eligible pending closure first approval')]:
  PORT_FIELDS.append((prefix+period,'boolean',definition+' within '+period.upper()+' through report date. Weeks start Monday.'))
for period in ['qtd','wtd']:
 PORT_FIELDS.append(('pal_prior_'+period,'boolean','Non-PSE new deals in the previous '+period.upper()+' period through the same elapsed day, capped at period end.'))
HISTORY_FIELDS=[('facility_key','text'),('owner_id','text'),('owner_name','text'),('team_lead','text'),('management_status','text'),('product_subprogram','text'),('facility_type','text'),('unused_commitment','number'),('unused_uncommitted','number'),('comparison_ready','boolean')]
def period_windows(asof):
 qstart=asof.replace(month=((asof.month-1)//3)*3+1,day=1)
 pqend=qstart-dt.timedelta(days=1);pqstart=pqend.replace(month=((pqend.month-1)//3)*3+1,day=1)
 week=asof-dt.timedelta(days=asof.weekday())
 return {'ytd':asof.replace(month=1,day=1),'qtd':qstart,'mtd':asof.replace(day=1),'wtd':week}, {'qtd':(pqstart,min(pqend,pqstart+(asof-qstart))),'wtd':(week-dt.timedelta(days=7),week-dt.timedelta(days=7)+dt.timedelta(days=min(asof.weekday(),4)))}
MON_FIELDS = [('pal_covenant_bucket','text','PAL past due covenant bands 1-45 / 46-90 / >90, based on effective due date.'),('pal_due30','boolean','Coming-due covenant within 30 days including as-of date; separate from monitoring three-month window.'),('ccm_status','text','Source CCM_Status mapped exactly to PAST_DUE / COMING_DUE / OPEN, independently of classification and open/cleared lifecycle.')]
def extend(schema):
 for entity,fields in [('Portfolio',PORT_FIELDS),('Monitoring',MON_FIELDS)]:
  for name,t,definition in fields:
   schema[entity].append(dict(field=name,type=t,required=t in ['number','boolean'] and name!='pal_spread_weight',definition=definition))
 for name,t in HISTORY_FIELDS:
  schema['History'].append(dict(field=name,type=t,required=False,definition='Daily comparison snapshot: '+name+'. Legacy aggregated history may leave this null.'))
 # ROTCE reporting period is a source dimension, independent of the portfolio snapshot.
 schema['Portfolio'].append(dict(field='rotce_period',type='text',required=False,definition='Source ROTCE reporting period, displayed independently of portfolio report date.'))
def prepare(rows):
 for r in rows:
  asof=dt.date.fromisoformat(r['as_of_date']);start=asof.replace(day=1);idx=start.year*12+start.month-1
  months=[f'{(idx+i)//12:04}-{(idx+i)%12+1:02}' for i in range(3)]
  prev=f'{(idx-1)//12:04}-{(idx-1)%12+1:02}'
  ca=r['ca_expiration_date'];mat=r['maturity_date'];approval=r['facility_first_approval_date']
  eligible=r['management_status']=='CM' and (r['region']!='EMEA' or str(r['ca_review']).strip().lower()=='yes')
  r['unused_uncommitted']=r['total_undrawn']-r['unused_commitment']
  r['pal_ca_expired']=bool(eligible and ca and ca<r['as_of_date'])
  r['pal_ca_month']=ca[:7] if eligible and ca and ca>=r['as_of_date'] and ca[:7] in months else None
  r['pal_facility_expired']=bool(mat and mat<r['as_of_date'])
  r['pal_facility_month']=mat[:7] if mat and mat>=r['as_of_date'] and mat[:7] in months else None
  r['pal_approval_period']=('CURRENT' if approval[:7]==months[0] else 'PREVIOUS' if approval[:7]==prev else None) if approval and r['region'] in ['NAM','LATAM','EMEA'] else None
  days=(asof-dt.date.fromisoformat(approval)).days if approval else 0
  pipeline=not r['pse'] and r['region'] in ['NAM','LATAM'] and r['facility_type'] not in EXCLUDED and not r['origination_date'] and approval and approval[:4]==str(asof.year) and days>0
  r['pal_pipeline_bucket']=('1-30' if days<=30 else '31-60' if days<=60 else '61-90' if days<=90 else '>90') if pipeline else None
  spread=r['loan_spread'];sbl=r['product']=='Securities Based Lending' and r['direct_os']>0
  r['pal_spread_bucket']=('<=70' if spread<=70 else '70-125' if spread<=125 else '>125') if sbl and spread is not None else None
  r['pal_spread_weight']=spread*r['direct_os'] if sbl and spread is not None else None
  r['pal_spread_os']=r['direct_os'] if sbl and spread is not None else 0
  r['pal_pricing_exception']=bool(sbl and str(r['pricing_exception']).strip().lower()=='yes')
  d=r['origination_date'] or r['renewal_date'];pyend=asof.replace(year=asof.year-1,day=min(asof.day,calendar.monthrange(asof.year-1,asof.month)[1]));pystart=pyend.replace(month=1,day=1)
  pmstart=dt.date.fromisoformat(prev+'-01');pmend=pmstart.replace(day=min(asof.day,calendar.monthrange(pmstart.year,pmstart.month)[1]))
  r['pal_prior_ytd']=bool(d and not r['pse'] and pystart.isoformat()<=d<=pyend.isoformat())
  r['pal_prior_mtd']=bool(d and not r['pse'] and pmstart.isoformat()<=d<=pmend.isoformat())
  starts,prior_windows=period_windows(asof)
  for period,begin in starts.items():
   in_period=lambda value: bool(value and begin.isoformat()<=value<=asof.isoformat())
   r['pal_new_'+period]=bool(not r['pse'] and in_period(d))
   r['pal_approved_'+period]=bool(r['region'] in ['NAM','LATAM','EMEA'] and in_period(approval))
   r['pal_pending_'+period]=bool(pipeline and in_period(approval))
  for period,(begin,end) in prior_windows.items():
   r['pal_prior_'+period]=bool(d and not r['pse'] and begin.isoformat()<=d<=end.isoformat())

def monitoring(rows):
 for r in rows:
  days=r['days_past_due'];r['pal_covenant_bucket']=('1-45' if days<=45 else '46-90' if days<=90 else '>90') if r['category']=='COVENANTS' and r['status']=='PAST_DUE' and days and days>0 else None
  gap=(dt.date.fromisoformat(r['effective_due_date'])-dt.date.fromisoformat(r['as_of_date'])).days if r['effective_due_date'] else -1
  r['pal_due30']=bool(r['category']=='COVENANTS' and r['status']=='COMING_DUE' and 0<=gap<=30)
