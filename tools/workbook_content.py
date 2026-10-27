import json
from pathlib import Path
P=Path(__file__).resolve().parents[1]
S=json.loads((P/'tools/schema.json').read_text()); inputs=json.loads((P/'tools/input-schema.json').read_text())
source_catalog=[
['Portfolio regional extracts','NAM Report 1; EMEA/APAC first sheet','LPTM-Hub/PAL-ETL.html:7717','Facility × source snapshot','TFA, OS, OSUC, classification, owners, maturity, new business','Exact regional field maps in Legacy Mappings; currency basis must be confirmed'],
['Portfolio_current.xlsx / .xlsb','Dashboard first sheet; ETL consolidated output','LPTM-Hub/PAL-dashboard.html:3356; PAL-ETL.html:5399','Facility snapshot','Portfolio / deep dive; facility maturity candidates','Legacy reader .xlsx and writer .xlsb mismatch. Replace with prepared JSON.'],
['Covenants_current.xlsx / .xlsb','First worksheet','PAL-ETL.html:6827; covenants.js:1179','Covenant × facility × cycle × source snapshot','Covenants, aging, due dates, accountable owner','Source covenant ID alone may repeat across facilities/cycles; preserve full native key.'],
['Covenants_Activity_Report.xlsx','Covenant Compliance; Maker Date','covenants.js:1204; 1418','One maker event','Deferred / waived / deleted monthly events','Activity counts are events, not unique covenants. Add stable event IDs.'],
['CCM_current.xlsx / .xlsb','First worksheet; regional variants','PAL-ETL.html:8367','Relationship × CCM approval cycle','Classification, next month end, next approval, status','APAC Specialist maps to Underwriter; EMEA CA ID is not a client name.'],
['CCM_previous.xlsx','Previous month snapshot','PAL-dashboard.html:3359','Relationship × previous approval cycle','Legacy monthly comparison','Do not invent prior deltas without aligned historical cycles; previous CCM comparison not populated here.'],
['ROTCE_current.xlsx','clientRelationshipId; variableRoTCE','PAL-ETL.html:6564','Relationship × return reporting period','Relationship return, decimal fraction','Missing values remain null. Check uniqueness before a many-to-one join.'],
['Product_Mapping.xlsx','PSE map and category map','PAL-ETL.html:7019-7130','Region × raw program/type','Product, subprogram, PSE','EMEA uses Facility Type; NAM/APAC use Product Program Name for category lookup.'],
['Regions_Mapping.xlsx','Control Unit mapping','PAL-ETL.html:6906-7014','Unique control unit','NAM / LATAM / IPB / SARG region mapping','Never silently infer NAM. Current pipeline imports all regions.'],
['Portfolio_Aggregated_History.xlsx','Historical aggregates','PAL-ETL.html:7190; PAL-dashboard.html:3368','Date × region × product × subproduct × commitment × PSE','Stock trends','Legacy history has no staff grain. Owner/team filters unavailable in trends.'],
['CA workflow extract','Not supplied; proposed input','Screenshots 7/8; portfolio has expiry only','CA × approval cycle','Pending authorization versus upcoming expiry','Expiry alone cannot establish pending auth. CA extract must be deduplicated across facilities.'],
['Insurance extract','Not supplied; proposed input','Screenshots 12/13','Policy/requirement × facility × renewal cycle','Awaiting certificate; pending review; two aging buckets','Facility ID alone is not a policy key. Named source file/owner required before production.'],
['Appraisal extract','Not supplied; proposed input','Screenshots 14/28','Collateral × valuation requirement × cycle','Appraisal due date, specialist and delinquency','Collateral/requirement key is needed; not every facility row is one appraisal.'],
['Owner and team mapping','Approved local mapping table','Proposed canonical owner map','One source alias → stable staff identity','Cross-domain workload','Do not join names by fuzzy text; one accountable owner per obligation.']]
issues=[
['File format mismatch','ETL publishes .xlsb; dashboard constants read .xlsx','PAL-ETL.html:5398-5404; PAL-dashboard.html:3356-3359','Use versioned prepared JSON; remove Excel parsing from reader.'],
['Mixed source dates','CCM Jul 13; covenants/CA/facility Aug 31; insurance/appraisal Sep 1','Provided screenshots','Keep as_of_date per source and display the range.'],
['CA inconsistency','Overview pending auth 88; CA page pending auth 3','Screenshots 1 and 7','Do not seed either number as reconciled data; derive from the CA workflow extract.'],
['Covenant gap','Displayed aging 121+41+0+3 = 165 versus 168 total','Screenshot 5','Include >90-day remainder explicitly; reconcile from source records.'],
['Facility mismatch','KPI past due 49; donut legend values 17+11+9+13 = 50','Screenshot 9','Use the same filtered record set for KPIs, charts and register.'],
['Appraisal mismatch','Past due KPI 169 versus donut bucket total 235','Screenshot 14','Different populations must be labelled or unified.'],
['Clearance denominator','63.4% shown without a verifiable complete population','Screenshot 1','Do not expose a clearance KPI from exception-only feeds.'],
['Local dummy data','covenants-local.html forces generated covenant and activity rows','covenants-local.html:31-35','Demo must be explicitly labelled; production rejects demo manifests.'],
['Missing return becomes zero','ROTCE missing/no match assigned 0%','PAL-ETL.html:6564-6596','Preserve null; no default-zero profitability.'],
['Numeric sign loss','Legacy parser removes parentheses without applying negative sign','PAL-ETL.html:7960-7985','Typed staging numbers; raw adapters must preserve negatives and reject nonnumeric input.'],
['Regional policy ambiguity','SARG/IPB mode helpers exist but import path says import all regions','PAL-ETL.html:7760-7810','Keep region codes; apply an explicit approved inclusion policy in Access.'],
['EMEA CCM label','CA ID mapped into Client_Name','PAL-ETL.html:8410','Store CA ID as ca_id; join approved relationship master for relationship_name.'],
['Owner team inference','EMEA defaults team via hardcoded names','PAL-ETL.html:7928','Use approved owner map, with explicit UNASSIGNED exceptions.'],
['Covenant rule drift','Legacy action count uses recognized source bucket; new design uses dated obligations','covenants.js:416-486','Proposed-1 is a documented rule change; reconcile legacy bucket discrepancies before go-live.'],
['No live extract validation','Screenshots and local HTML are available; production feeds are not','Supplied files','Preview is illustrative; Access must be tested in Windows and Confluence in the internal instance.']]
rules=[
['M01','Actionable obligations','Monitoring','Count(action_required=true)','One obligation, one owner; count is not client count'],
['M02','Covenant past due','Monitoring','category=COVENANTS and status=PAST_DUE; effective due < as_of','Dates and source status must agree; internal-prefixed description/remarks excluded'],
['M03','Coming due','Monitoring','status=COMING_DUE and as_of <= effective_due <= DateAdd(m,3,as_of)','Inclusive 3 calendar months; not a fixed 90 days'],
['M04','Critical monitoring','Monitoring','Covenants >=31d; facility >=60d; appraisal >=90d; insurance awaiting cert; CCM SUBSTANDARD','Proposed screenshot-derived rules; CA has no critical threshold'],
['M05','CA actions','Monitoring','category=CA and status in PAST_DUE,PENDING_AUTH','PENDING_AUTH must come from workflow source, not expiry alone'],
['M06','Insurance issues','Monitoring','AWAITING_CERTIFICATE or PENDING_REVIEW','Expired and deficiency buckets remain separate'],
['M07','Total outstanding','Portfolio','direct_os + contingent_os + pse_os','USD units; null financial components must be resolved'],
['M08','OSUC','Portfolio','EMEA/APAC: committed ? tfa : total_os; Americas: supplied osuc','No implicit currency conversion'],
['M09','Undrawn and unused','Portfolio','total_undrawn=tfa-total_os; EMEA/APAC unused=committed ? total_undrawn : 0','Negative results retained; Americas unused supplied'],
['M10','Utilization','Portfolio','SUM(total_os)/SUM(tfa)','If denominator zero show unavailable'],
['M11','YTD / MTD new business','Portfolio','Non-PSE; origination else renewal in source reporting year/month through as_of','Prepared flags; count one facility snapshot record'],
['M12','ROTCE','Portfolio','One unique relationship return and period; value as decimal fraction','No facility-weighted average or missing-to-zero'],
['M13','History','History','Retained daily facility snapshots; legacy aggregate history retained','Never sum balances across dates. Daily KPI comparisons retain all filters; legacy trends have no staff filter.'],
['M14','Activity','Activity','Count event_id by maker month and event_type','Latest 3 available months; DEACTIVATED => DELETED'],
['M15','Workload share','Monitoring','Top five owner action counts / all selected action counts','No denominator when selection empty'],
['M16','Clearance ratio','Not displayed','Requires full eligible population plus explicit cleared records','Unavailable for exceptions-only or mixed eligible populations']]
taxonomy=[
['category','COVENANTS | CA | FACILITY | CCM | INSURANCE | APPRAISALS','Closed enumeration','Monitoring domain'],
['region','NAM | LATAM | EMEA | APAC | IPB | SARG | CROSS_REGION | UNMAPPED','UNMAPPED blocks publication','NAM/EMEA combination must use CROSS_REGION and retain original source value externally'],
['status','PAST_DUE | COMING_DUE | PENDING_AUTH | OPEN | AWAITING_CERTIFICATE | PENDING_REVIEW | CLEARED | UNKNOWN','UNKNOWN blocks publication','Allowed subset depends on category'],
['owner_role','UNDERWRITER | SPECIALIST','Required','One accountable owner; secondary contributors outside workload counts'],
['classification','PASS | PASS_WATCH_LIST | SPECIAL_MENTION | SUBSTANDARD | SUBSTANDARD_PERFORMING | SUBSTANDARD_NONPERFORMING | DOUBTFUL | LOSS | UNKNOWN','Preserve distinct codes','Confirm whether substandard subtypes enter critical CCM definition'],
['aging_bucket','CURRENT | 1-30 | 31-45 | 46-60 | 61-90 | 91-199 | 200+ | UNKNOWN','Computed in Access','Days calculated as of source date; date null stays null'],
['coverage','ALL_OBLIGATIONS | EXCEPTIONS_ONLY','Per source','Coverage describes supplied universe, not an assurance of completeness'],
['commitment','COMMITTED | UNCOMMITTED','Unknown blocks publication','Source-specific conversion in Access adapter'],
['maturity_basis','DATED | DEMAND | UNKNOWN','Required','DEMAND maturity_date=null, never a fabricated expiry'],
['event_type','DEFERRED | WAIVED | DELETED','DEACTIVATED maps to DELETED','Do not count repeated exports of the same event twice'],
['dates','Excel date value; JSON YYYY-MM-DD','Date only','No locale-dependent text parsing; publication date separate'],
['amounts','Numeric USD units','No strings or comma separators','Zero is a valid supplied amount; null means absent'],
['percentages','Decimal fraction','0.125 = 12.5%','Never mix percentage points and fraction units'],
['keys','Text; stable native IDs','Keep leading zeros','One snapshot per source; IDs cannot be regenerated by row position']]
workflow=[
['1','Preserve raw reports','Keep immutable dated raw files on the local drive; record source file, owner and as_of. Do not upload raw client extracts to the dashboard package.'],
['2','Map in Access','Use saved Access import specifications and append queries using Legacy Mappings. Populate typed stg tables from the exact input headers. Product_Map, Region_Map and Owner_Map are supplied for adapters; BuildCreditRelease does not infer them.'],
['3','Use the input template','Header row is row 1. Required fields in the dictionary must be populated. Blank rows are not data. Template has no sample rows. Set keys/IDs to text and dates to Excel dates.'],
['4','Install once','Create a new .accdb. Import CreditHubInstall.bas, CreditHubBuild.bas and CreditHubPAL.bas (schema version 2). For a new database run InstallCreditHub. For the preceding installed schema, back up and run UpgradeCreditDashboardSchema to add fields without clearing history. Requires Windows Access/DAO; never run installation over existing tables.'],
['5','Import canonical input','Run ImportCreditInputs "C:\\CreditHub\\Credit_Input_Template.xlsx". This replaces only stg tables. A failed import is partial: fix it and repeat all sheets before building.'],
['6','Build locally','Run BuildCreditRelease "C:\\CreditHub\\release-20261023", "20261023-r1". Validates staging, computes flags/exposure, retains historical snapshots, writes JSON and Excel.'],
['7','Reconcile release','Compare source totals, exclusion counts, unique keys, statuses and report dates. Confirm proposed-1 business rules. Run the bundled Python validator optionally; then review Windows Access results.'],
['8','Publish files','Upload immutable versioned JSON attachments first. Verify downloads and expected counts; replace credit-manifest.json last. Keep the previous manifest and data for rollback.'],
['9','Install reader','Paste Confluence_Macro.html into the existing HTML macro and replace attachment page IDs. Keep navBar and global fonts/CSS. Use same-origin attachments and current user session.'],
['10','Verify live','Verify access permissions, loading timeout/error, every tab, filtered totals and CSV exports. Test an unauthorized account. Local browser tests do not establish Confluence or Access runtime behavior.']]
rules += [
['PAL01','CA expiry eligibility','Portfolio','CM only; EMEA requires ca_review Yes; expiry before as_of; distinct relationship_id','Facility expiry includes CM and DM; dates equal to as_of are coming due'],
['PAL02','Expiry horizon','Portfolio','as_of through end of second following calendar month; pal_ca_month / pal_facility_month','Build month windows from first day to avoid month-end Date.setMonth overflow'],
['PAL03','New approvals','Portfolio','First approval date in current/previous month; NAM/LATAM/EMEA','APAC excluded; origination date is not first approval'],
['PAL04','Pending closure','Portfolio','NAM/LATAM, non-PSE, origination null, first approval in report year; 19 excluded facility types','Days since approval: 1-30 / 31-60 / 61-90 / >90. Exact exclusions in CreditHubPAL.bas'],
['PAL05','SBL spreads','Portfolio','SBL Direct OS >0; <=70 / >70 to125 / >125 bps; SUM(spread*OS)/SUM(valid-spread OS)','Original count and OS tables retained. Missing spread excluded from weighted denominator.'],
['PAL06','Linked relationship ranking','Portfolio','Rank selected exposure by stable relationship_id; show same Top 5/10/20 order in ROTCE','ROTCE target12%; missing remains null, genuine zero retained; source return period separate'],
['PAL07','PAL covenant view','Monitoring','PAST_DUE: 1-45 / 46-90 / >90; COMING_DUE: next30 days inclusive','Separate from monitoring page three-calendar-month window'],
['PAL08','Regional CCM','Monitoring','ccm_status PAST_DUE / COMING_DUE / OPEN by APAC,EMEA,NAM,LATAM','Source status, independently of credit classification and lifecycle status'],
['PAL09','Prior comparable deals','Portfolio','Non-PSE origination/renewal fallback through same day last month/year','Clamp end-of-month / leap-year date; prepared flags, no browser ETL'],
['PAL11','Daily KPI variance','History','Current minus previous Monday-Friday snapshot; percentage uses prior balance','Requires complete comparison_ready history. Monday compares Friday. Zero prior = New balance; missing snapshot = unavailable.'],
['PAL12','Period controls','Portfolio','YTD / calendar QTD / MTD / Monday-based week through report date','New deals exclude PSE; approval and pending periods use first approval. Prior quarter compares elapsed days; prior week caps at Friday.'],
['PAL10','Historical variances','History','Latest four observations; MoM/QoQ/YoY compare matching calendar months','Missing comparison or zero denominator gives unavailable, never fabricated growth']
]
taxonomy += [
['loan_spread','Numeric basis points','70 and 125 are inclusive upper boundaries','100 bps = 1 percentage point; do not submit decimal percentage'],
['ccm_status','PAST_DUE | COMING_DUE | OPEN','Required for CCM records','Map original CCM_Status separately from classification'],
['management_status / ca_review','CM | DM / Yes | No','Controls PAL CA eligibility','EMEA CA Review must equal Yes'],
['schema_version','2','Required for manifest and all envelopes','168 fields; daily period flags and comparison history are exported by Access']
]
fieldrows=[]
for entity,fields in S.items():
 for f in fields:
  fieldrows.append([entity,f['field'],f['type'],'Yes' if f['required'] else 'No','Access output' if f['field'].startswith('pal_') or f['field']=='unused_uncommitted' or f['field'] in {'effective_due_date','days_past_due','aging_bucket','action_required','critical','coming_due','total_os','total_undrawn','ytd_new','mtd_new','month','record_count'} or entity=='History' else 'Source / mapping',f['definition']])
content={
 'Source Catalogue':{'headers':['Source','Worksheet / columns','Evidence','Grain','Dashboard use','Handling / limitation'],'rows':source_catalog,'widths':[34,48,53,47,65,90]},
 'Field Dictionary':{'headers':['Entity','Field','Type','Required','Producer','Definition'],'rows':fieldrows,'widths':[19,27,14,12,22,115]},
 'Legacy Mappings':{'headers':['Regional mapper','Legacy output field','Existing source expression','Evidence'],'rows':json.loads((P/'tools/legacy-mappings.json').read_text()),'widths':[29,31,125,46]},
 'Metric Rules':{'headers':['Rule','Metric','Entity','Definition','Boundary / exception'],'rows':rules,'widths':[10,30,20,110,95]},
 'Taxonomy':{'headers':['Field family','Allowed values / format','Validation','Meaning'],'rows':taxonomy,'widths':[21,125,40,85]},
 'Migration Issues':{'headers':['Issue','Observed evidence','Source reference','Resolution'],'rows':issues,'widths':[32,95,64,110]},
 'Access Workflow':{'headers':['Step','Action','Instructions'],'rows':workflow,'widths':[10,30,150]}}
(P/'tools/workbook-content.json').write_text(json.dumps(content,indent=2))
