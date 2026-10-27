"""Build a reviewable data handoff from current schemas and validated illustrative files."""
import json,html,shutil,zipfile
from pathlib import Path
P=Path(__file__).resolve().parents[1];K=P/'Data_Integration_Kit'
# This folder is generated; replace it so retired tools and setup pages cannot ship.
if K.exists():shutil.rmtree(K)
K.mkdir()
S=json.loads((P/'tools/schema.json').read_text());I=json.loads((P/'tools/input-schema.json').read_text())
M=json.loads((P/'demo-comparison/credit-manifest.json').read_text())
D={k:json.loads((P/'demo-comparison'/v['filename']).read_text()) for k,v in M['files'].items()}
keys={'monitoring':'item_id','portfolio':'facility_key','activity':'event_id','history':'history_id','sources':'source_id','documents':'document_id'}
grains={'monitoring':'One obligation association per source/cycle: covenant × relationship × facility where applicable.','portfolio':'One facility in the current source snapshot.','activity':'One recorded maker event, not one covenant.','history':'One dated facility snapshot when comparison_ready=true; otherwise explicitly aggregated history.','sources':'One source/feed control row for its current reporting date.','documents':'One reference document; entity linkage requires extensions below.'}
pages=[
 ('lendingAnalytics','Lending Analytics','Understand the dashboards and choose a view from the native sidebar','No financial dataset; credit-pages.js contains native Confluence page IDs','Destination dashboards load validated shared release files'),
 ('portfolio','Portfolio Overview','Financial position, approvals, pipeline, return and consolidated monitoring','portfolio + monitoring (COVENANTS, CCM and other action categories) + history','activity; linked documents; previous; covenant_history'),
 ('overview','Underwriter Summary','High-level action distribution, accountable-owner workload, regional distribution and critical items','monitoring (all six categories)','portfolio; activity; history; documents; previous; covenant_history'),
 ('workload','Underwriter Workload','Accountable-owner action counts, critical work and action aging; includes specialists supplied in source','monitoring (all six categories)','portfolio; activity; history; documents; previous; covenant_history'),
 ('deepdive','Relationship Deep Dive','Relationship facilities, exposure, utilization and supplied return','portfolio','monitoring; activity; history; documents; previous; covenant_history'),
 ('COVENANTS','Covenants','Past due / coming due associations and covenant activity','monitoring where category=COVENANTS + activity; portfolio for linked exposure','previous; covenant_history; history; documents'),
 ('CA','CA Expiration','CA workflow obligations, authorization status and expiry','monitoring where category=CA','portfolio; activity; history; documents; previous; covenant_history'),
 ('FACILITY','Facility Maturity','Maturity obligations, due horizon and owner follow-up','monitoring where category=FACILITY','portfolio; activity; history; documents; previous; covenant_history'),
 ('CCM','CCM','CCM lifecycle, classification, approval due dates and owner queue','monitoring where category=CCM','portfolio; activity; history; documents; previous; covenant_history'),
 ('INSURANCE','Insurances','Certificates, review status and insurance exceptions','monitoring where category=INSURANCE','portfolio; activity; history; documents; previous; covenant_history'),
 ('APPRAISALS','Appraisals','Valuation requirements, due dates, aging and owner queue','monitoring where category=APPRAISALS','portfolio; activity; history; documents; previous; covenant_history'),
 ('activity','Covenants Activity','Deferred, waived and deleted maker events','activity','monitoring covenant associations; portfolio; previous; documents; history'),
 ('trends','Portfolio trends (compatibility URL)','Existing Trends route resolves to Portfolio Overview; no second sidebar page is needed','Same as portfolio; history supports trends','Same as portfolio')]
for sub in ['release','schema','examples','page-examples','excel','tools','qa']:(K/sub).mkdir(exist_ok=True)
for f in ['credit-manifest.json']+[v['filename'] for v in M['files'].values()]:shutil.copy2(P/'demo-comparison'/f,K/'release'/f)
# Optional retained covenant history, built from the same validated current/prior payloads.
from build_covenant_history import snapshot
history_rows=[];history_portfolio=[];history_controls=[]
for dataset in [D['previous']['datasets'],{k:v['rows'] for k,v in D.items() if k!='previous'}]:
 control,rows=snapshot({k:{'rows':v} for k,v in dataset.items()})
 history_portfolio.extend(control.pop('_portfolio_rows',[]));history_rows.extend(rows);history_controls.append(control)
ch={'schema_version':2,'bundle_id':M['bundle_id'],'is_demo':True,'rows':history_rows,'snapshots':history_controls,'portfolio_rows':history_portfolio}
ch_name='credit-covenant_history-'+M['bundle_id']+'.json'
(K/'release'/ch_name).write_text(json.dumps(ch,separators=(',',':')))
kit_manifest={**M,'files':{**M['files'],'covenant_history':{'filename':ch_name,'rows':len(history_rows)}}}
(K/'release/credit-manifest.json').write_text(json.dumps(kit_manifest,indent=2))
(K/'examples/covenant_history.json').write_text(json.dumps({**ch,'rows':history_rows[:2],'portfolio_rows':history_portfolio[:2],'note':'ILLUSTRATIVE EXCERPT ONLY. Full reconciled history is in release/.'},indent=2))
for f in ['schema.json','input-schema.json','legacy-mappings.json']:shutil.copy2(P/'tools'/f,K/'schema'/f)
# Validator retains its existing tools-relative schema location.
for f in ['validate_release.py','pal_contract.py','schema.json','build_covenant_history.py','partition_release.py']:shutil.copy2(P/'tools'/f,K/'tools'/f)
# Direct browser workbooks use fixed filenames and the exact same sample release.
# Replace this generated folder so retired/versioned sample files cannot linger.
runtime=P/'excel/runtime';runtime_manifest=json.loads((runtime/'credit-manifest.json').read_text())
assert runtime_manifest['bundle_id']==M['bundle_id'] and runtime_manifest['is_demo'] is True
for name in keys:
 descriptor=runtime_manifest['files'][name]
 assert descriptor['filename']==name.title()+'.xlsx' and descriptor['format']=='xlsx'
 assert (runtime/descriptor['filename']).stat().st_size<10_000_000
assert runtime_manifest['files']['documents']['rows']>0,'Runtime reference document must be present'
for name,filename in [('previous','credit-previous.json'),('covenant_history','credit-covenant-history.json')]:
 descriptor=runtime_manifest['files'][name];assert descriptor['filename']==filename
 payload=json.loads((runtime/filename).read_text());assert payload['bundle_id']==M['bundle_id'] and len(payload['rows'])==descriptor['rows']
if (K/'excel/runtime').exists():shutil.rmtree(K/'excel/runtime')
shutil.copytree(runtime,K/'excel/runtime',ignore=shutil.ignore_patterns('*.inspect.ndjson','.DS_Store'))
for f in ['Covenants_Risk_Reporting.txt','Covenants_Field_Parity.txt','Lending_Analytics_Deployment.txt']:shutil.copy2(P/f,K/f)
for f in ['Data_Linkage_Verification.json']:shutil.copy2(P/'qa'/f,K/'qa'/f)
for name,envelope in D.items():
 if name=='previous':sample={**envelope,'rows':envelope['rows'][:2],'datasets':{k:v[:2] for k,v in envelope['datasets'].items()}}
 else:sample={**envelope,'rows':envelope['rows'][:2]}
 sample['note']='ILLUSTRATIVE EXCERPT ONLY. Not a complete release and not suitable for publication. Use release/ for reconciled files.'
 (K/'examples'/(name+'.json')).write_text(json.dumps(sample,indent=2))
for key,title,question,primary,related in pages:
 pkey=key.lower();kind='portfolio' if key in ['portfolio','deepdive','trends'] else 'activity' if key=='activity' else 'monitoring'
 rows=D[kind]['rows'];rows=[r for r in rows if r.get('category')==key] if key in ['COVENANTS','CA','FACILITY','CCM','INSURANCE','APPRAISALS'] else rows
 if key=='lendingAnalytics':kind=None;rows=[]
 sample={'is_demo':True,'page':key,'title':title,'primary_dataset':kind,'eligible_sample_rows':len(rows),'note':'Inspection sample only. Pages read shared release files, not these excerpts. See page-source-map.json for every primary/enrichment dependency.','rows':rows[:3]}
 if key in ['portfolio','COVENANTS']:sample['monitoring_examples']=[next(r for r in D['monitoring']['rows'] if r['category']==c) for c in ['COVENANTS','CCM','FACILITY']]
 (K/'page-examples'/(pkey+'.json')).write_text(json.dumps(sample,indent=2))
page_ids=json.loads((P/'attachments/credit-pages.js').read_text().split('=',1)[1].strip().rstrip(';'))
primary_sets={'lendingAnalytics':[], 'portfolio':['portfolio','monitoring','history'], 'overview':['monitoring'], 'workload':['monitoring'], 'deepdive':['portfolio'], 'COVENANTS':['monitoring','activity','portfolio'], 'activity':['activity'], 'trends':['portfolio','monitoring','history']}
for key in ['CA','FACILITY','CCM','INSURANCE','APPRAISALS']:primary_sets[key]=['monitoring']
page_map=[]
for row in pages:
 key=row[0];primary=primary_sets[key]
 # Source controls participate in every financial page's startup validation.
 direct=list(dict.fromkeys([*primary,'monitoring','sources'])) if primary else []
 related=[name for name in runtime_manifest['files'] if name not in direct] if primary else []
 page_map.append({**dict(zip(['page_key','title','question','primary','related'],row)),
  'native_page_id':page_ids[key],
  'primary_files':[runtime_manifest['files'][name]['filename'] for name in direct],
  'related_files':[runtime_manifest['files'][name]['filename'] for name in related]})
(K/'page-source-map.json').write_text(json.dumps(page_map,indent=2))
# A coherent, real subset of the illustrative release, without synthetic joins.
p=max(D['portfolio']['rows'],key=lambda p:sum(r['facility_id']==p['facility_id'] for r in D['monitoring']['rows']))
entity=lambda r:all(r.get(k)==p.get(k) for k in ['region','relationship_id','facility_id','as_of_date'])
(K/'examples/linked-journey.json').write_text(json.dumps({'is_demo':True,'note':'Exact same-date entity subset; full source controls remain in release/.','facility':p,'monitoring':[r for r in D['monitoring']['rows'] if entity(r)],'activity':[r for r in D['activity']['rows'] if entity(r)]},indent=2))
(K/'examples/document-entity-extension.json').write_text(json.dumps({'is_demo':True,'note':'Proposed ETL extension example. The supplied general-reference Documents row has no entity keys. Not included in release/.','row':{'document_id':'ILLUSTRATIVE-DOC-001','category':'COVENANTS','title':'Illustrative supporting review','url':'https://example.invalid/review','as_of_date':p['as_of_date'],'region':p['region'],'relationship_id':p['relationship_id'],'facility_id':p['facility_id'],'ca_id':p['ca_id']}},indent=2))
source_catalog=json.loads((P/'tools/source-catalog.json').read_text())
(K/'source-catalog.json').write_text(json.dumps(source_catalog,indent=2))
parts=[]
def h(title):parts.append('<h2>'+html.escape(title)+'</h2>')
def para(t):parts.append('<p>'+html.escape(t)+'</p>')
def table(headers,rows):parts.append('<div class="scroll"><table><thead><tr>'+''.join('<th>'+html.escape(str(x))+'</th>' for x in headers)+'</tr></thead><tbody>'+''.join('<tr>'+''.join('<td>'+html.escape(str(x))+'</td>' for x in row)+'</tr>' for row in rows)+'</tbody></table></div>')
def link(path,title):parts.append('<p><a href="'+path+'">'+html.escape(title)+'</a></p>')
h('Start with the prepared Excel attachments')
para('The direct Excel path uses six prepared workbooks in excel/runtime/. Upload them and the optional comparison JSON files to attachment page 3845862527, then upload their credit-manifest.json last. Each workbook contains Data with canonical field headers and Metadata with its schema, release, dataset and row count. The dashboard reads these fixed-name attachments through the current native Confluence session. No filename version suffix or cache-busting query is required. Raw CCM, covenant and facility extracts still need field mapping and preparation before they meet this contract.')
link('excel/runtime/README.txt','Prepared Excel format, typed fields and publication contract')
link('excel/runtime/credit-manifest.json','Fixed-filename Excel sample manifest')
for name in ['Sources','Monitoring','Portfolio','Activity','History','Documents']:link('excel/runtime/'+name+'.xlsx',name+' — prepared runtime workbook')
link('excel/runtime/credit-previous.json','Previous snapshot for the same sample release')
link('excel/runtime/credit-covenant-history.json','Retained covenant and linked-facility snapshots for the same release')
para('These workbooks contain sample records and retain is_demo=true in Metadata and the manifest. Use the explicit sample installation to inspect them. Production mode rejects sample releases unless allowSampleData is explicitly enabled. The Documents workbook includes the configured Lending Analytics landing-page reference; it is a general reference rather than fabricated facility evidence. Uploading several fixed-name files is not atomic: all metadata must share one bundle_id and control counts. The loader rejects inconsistent sets, and an already loaded page retains its validated snapshot.')
h('Portfolio Overview versus Underwriter Summary')
para('Portfolio Overview answers: How large is the portfolio, where is exposure concentrated, what is approved or expiring, and what monitoring risk needs attention? It consolidates facility balances, covenant and CCM obligations, and dated history. Underwriter Summary answers: Which obligations need action across the six monitoring areas, who owns them, and where are critical items concentrated? Their overlap is intentional; their counting units differ.')
para('The original Overview is Underwriter Summary, retaining the overview route key and existing page ID. It is the high-level monitoring view. Underwriter Workload remains the detailed owner queue and aging view. Both include specialist-owned obligations where supplied; the title does not introduce an owner-role filter. Portfolio Overview remains the separate PAL financial dashboard. The Sources & definitions page is removed; the sources dataset remains required for validation and lineage.')
h('What to give each source owner')
para('Collect the original source records and stable native IDs, snapshot date, approved product/region/owner mappings, and reconciled controls. Prepare the canonical Data and Metadata sheets for the six direct runtime workbooks above. Raw source workbook layouts are not accepted directly by the browser. Complete field lists below are generated from the actual input and output schemas, not inferred from screenshots.')
link('schema/schema.json','Canonical runtime schema and field definitions')
link('schema/legacy-mappings.json','Upstream field mappings retained for source preparation')
link('source-catalog.json','Original source catalogue and lineage references')
table(['Upstream feed','Required native/business identity','Destination / limits'],[
['Portfolio_current and regional portfolio extracts','Source + facility ID + snapshot date; region and relationship ID retained','Portfolio; confirm parent/child balance eligibility and USD basis.'],
['Covenants_current','Source + covenant + relationship + facility association + obligation/cycle','Monitoring/COVENANTS. Covenant number alone is not unique.'],
['CCM_current; retained CCM_previous','Source + relationship + CCM approval cycle; retain facility association when explicit','Monitoring/CCM. Classification, next_month_end, approval due date and ccm_status are distinct fields.'],
['Covenants_Activity_Report','Native event ID; covenant ID + relationship + region + Maker Date; facility and CA if supplied','Activity. DEFERRED does not mean cleared. Maker Date is not Deferred Date.'],
['CA workflow extract (not supplied)','CA ID + approval/review cycle + stable workflow obligation ID','Monitoring/CA. Portfolio expiration alone cannot infer PENDING_AUTH. Avoid repeating one CA action per linked facility.'],
['Facility maturity extract / prepared facility feed','Source + facility + maturity/review cycle','Monitoring/FACILITY; reconcile its eligibility with portfolio dates, not balances alone.'],
['Insurance extract (not supplied)','Policy/requirement + facility association + renewal cycle','Monitoring/INSURANCE. Facility ID alone is not a policy key.'],
['Appraisal extract (not supplied)','Collateral + valuation requirement + cycle + explicit facility association','Monitoring/APPRAISALS. Facility ID alone is not a valuation key.'],
['ROTCE_current','Relationship ID + return period','Join consistently upstream into portfolio.rotce; decimal fraction, never sum ratios. Explicit return period is not currently a mandatory output field.'],
['Product_Mapping / Product_Map','region + raw_product','Controlled product; richer PSE/SFT/category mapping must be supplied by source adapter.'],
['Regions_Mapping / Region_Map','control_unit','Exact region mapping; no default region.'],
['Owner_Map','raw_owner (unambiguous approved alias)','owner_id + owner_name + team_lead. If aliases collide across feeds, extend mapping with source_id before use.'],
['Retained prepared releases','Same entity key at distinct reporting dates','Previous snapshot and history, not a fabricated change from current data.']])
h('Published files, primary keys and join keys')
para('Direct Excel descriptors use filename, rows and format="xlsx". Keep all six Metadata sheets and the manifest on the same release. Optional previous and covenant_history JSON envelopes must each remain below 10 MB. Standalone JSON validation and partitioning utilities are retained for prepared releases; they require no database integration. validate_release.py validates JSON publication folders, not XLSX files. The runtime validates typed workbook records, source counts and keys before displaying them.')
para('Every JSON envelope uses schema_version=2, the same bundle_id as credit-manifest.json, and rows. Every field in schema.json must be present; optional means null is allowed, not that the field may be silently omitted. Keys are text and must preserve leading zeros. Primary keys below are unique within each dataset/snapshot; across an archive retain as_of_date and bundle_id. Never generate a key from worksheet position.')
table(['Logical dataset','Direct Excel filename','Primary key','Record grain'],[[k,runtime_manifest['files'][k]['filename'],v,grains[k]] for k,v in keys.items()])
para('Required core: monitoring, portfolio, history, activity, sources and documents entries in manifest.files. A file with zero rows is permitted where the source is genuinely unavailable (for example documents); disclose missing coverage. This does not make all financial or analytical views complete. Startup loads monitoring and sources even for Portfolio. Related enrichment failures are isolated so the primary page can remain usable.')
para('Optional previous file: schema_version + current bundle_id + rows (equal to datasets.monitoring), datasets.monitoring/portfolio/activity/sources and retained historical/document data if supplied. Its manifest rows counts previous monitoring rows, not all nested rows. Keys repeat between periods by design; evaluate per snapshot. Daily comparisons require the exact preceding weekday and reconciled matching source coverage.')
para('Optional covenant_history: rows of retained monitoring associations, snapshots with as_of_date, complete flag and source controls, and optional portfolio_rows with portfolio_sources. Identity is (as_of_date,item_id); associated balance history is (as_of_date,facility_key). Use build_covenant_history.py with validated releases, not hand-created aggregate comparisons.')
link('release/credit-manifest.json','Optional prepared JSON sample manifest (current plus previous and covenant history)')
for name in [*keys,'previous','covenant_history']:link('examples/'+name+'.json',name+' — short JSON example')
h('Linking rules and cardinalities')
table(['Link','Cardinality / exact condition','Failure behavior'],[
['Fact → source control','Many rows → one source_id; current fact.as_of_date must equal Sources.as_of_date; source domain must match','Reject wrong feed/date and unreconciled source counts.'],
['Monitoring / activity → facility','Many associations → one (region, relationship_id, facility_id, as_of_date); supplied CA IDs must agree','Keep original records; exposure unavailable for missing, ambiguous, conflicting-date/CA or non-USD matches.'],
['Facility snapshot balance','One facility snapshot, regardless of how many covenant links','Deduplicate before summing TFA/OSUC; linked partial totals are not complete portfolio totals.'],
['Covenant event without facility ID','Explicit (region, relationship_id, covenant_id, as_of_date) associations only','Do not guess links from names or owners; ambiguous scope must not bring unrelated facilities.'],
['Previous related rows','Same composite entity, earlier as_of_date, compatible CA','Related history is not automatically a comparable daily KPI population.'],
['Owner / product / region','Approved exact mapping → canonical code','Unresolved values remain explicit UNASSIGNED/UNMAPPED; resolve before claiming complete coverage.'],
['History','Daily (as_of_date,facility_key) or declared aggregate grain','Do not sum balances over dates. Aggregate history cannot be drilled into invented facility records.'],
['Documents','Base file lists references; entity drill needs region + relationship_id + facility_id + as_of_date (+ compatible CA)','Generic category-only documents do not automatically appear as entity-specific evidence.']])
para('Important current restriction: validate_release.py and preparation currently require globally unique facility_id across the current portfolio, although the UI protects joins with region + relationship + facility. If your native IDs are region-local or a facility is legitimately associated with multiple relationships, do not drop rows to satisfy validation. Agree the master facility identity and allocation/association contract, then update schema, source preparation, validation and UI together. No such source-system change has been assumed here.')
link('examples/linked-journey.json','One coherent facility → monitoring → activity journey from actual demo rows')
h('Every page and its data dependencies')
table(['Page / stable route','Business question','Primary datasets','Related data'],[[title+' ['+key+']',q,primary,related] for key,title,q,primary,related in pages])
table(['Page','Native page ID','Primary and shared startup files','Related files'],[[row['title'],row['native_page_id'],', '.join(row['primary_files']) or 'None — navigation only',', '.join(row['related_files']) or 'None'] for row in page_map])
link('page-source-map.json','Machine-readable page, file and native-ID mapping')
para('All these pages use the same published files. Do not create a separate authoritative database/file per page. page-examples/ contains inspection excerpts only. Source controls always show the complete published feed controls, not the filtered table count. Trends is a compatibility route; new navigation should use Portfolio.')
for key,title,*_ in pages:link('page-examples/'+key.lower()+'.json',title+' — sample records')
h('Fields still needed for the complete linked journey')
table(['Dataset','Current support','Needed for richer linking / production action'],[
['Activity','Base contract has event_id, covenant_id, relationship_id, region, event_date/month/type, owner and source date','Add facility_id and ca_id where supplied; preserve deferred_date, due_date, cumulative_deferred_days and modified_in_reporting_month for activity-specific analysis. The runtime workbooks and UI support these extra columns; upstream extracts must supply their actual values. Keep field mappings, preparation and tests aligned.'],
['Documents','Reference list; direct runtime workbook includes the native landing-page link','Add region, relationship_id, facility_id and matching as_of_date for entity linking; source_id if provenance is needed. A general landing-page reference is not entity-specific evidence. The example illustrates the required fields; the supplied general reference does not establish entity evidence.'],
['History','Daily facility_key and owner/team available; legacy aggregates supported','Current terminal entity matcher needs region, relationship_id, facility_id and date. Base history lacks relationship_id/facility_id and detailScope does not expose arbitrary portfolio history as a related tab. This requires a designed ETL/UI extension; trend charts and previous snapshot tabs already work.'],
['Covenant and other monitoring IDs','Stable item_id preserves each association','Native cycle, policy, collateral and requirement IDs must be encoded in stable item_id/source_record_id or carried explicitly; actual raw CA/insurance/appraisal formats are still needed.'],
['ROTCE','Consistent relationship decimal return in current snapshot','Retain explicit source return period in a coordinated extension for cross-period attribution; do not infer it from facility date.']])
link('examples/document-entity-extension.json','Proposed document entity-link example (not part of validated release)')
h('Dashboard navigation and deployment')
para('Everyone with the existing Confluence space permissions can use the dashboard. Lending Analytics has no additional login, access request, entitlement registry or separate administration pages. The server still enforces its native page and attachment permissions.')
para('Keep the native Confluence tree, navbar, links and collapse/branch handlers. The dashboard adapter only styles and marks existing nodes; it never creates a second sidebar. The local previews have no production sidebar by design. The browser fixture simulates the host tree, so it cannot establish live Confluence behavior.')
para('The configured native space key is wcs, Lending Analytics parent page is 3782729579 and attachment host is 3845862527. Child IDs are recorded in attachments/credit-pages.js and the deployment instructions. Keep route key overview for Underwriter Summary and portfolio for Portfolio Overview. Place the 11 distinct dashboards beneath Lending Analytics. Each dashboard has a distinct SVG reused in both sidebar states, with compact keyboard/hover tooltips. The top-left content breadcrumb reads Lending Analytics then the current page. Do not add the legacy Trends alias as another overview. Native sidebar labels come from actual page titles, not the JavaScript label map. These IDs configure the package; they do not prove live access or change native pages.')
para('Local sidebar checks cover one tree, unchanged native hrefs, preserved click handlers, user-controlled collapse/expand, nested branch toggling, current page marking, accessible compact tooltips and teardown. Before live signoff: verify those behaviors with ordinary viewer permissions, real page IDs, navigation to every page, back/forward, keyboard focus, expanded-dialog Close and no content overlap at narrow widths. No actual native page title or permission was changed in this task.')

h('Validation and publishing sequence')
para('1. Confirm source owners, raw formats, stable IDs, reporting dates, eligible populations and coverage. Resolve critical rule_version=proposed-1 thresholds with the business owner. Do not treat proposed rules as signed-off policy.')
para('2. For direct Excel, create the six prepared Data/Metadata workbooks, preserve IDs and typed amounts/booleans, assign one new bundle_id to every file and manifest, and reconcile source counts and dates. For sample use, upload the complete excel/runtime/ attachment set with its sample installation. For production, use approved records and production metadata. Upload the data and optional comparisons first, then the matching manifest. Validate all pages with normal native viewer permissions.')
parts.append('<pre>python3 tools/validate_release.py release --allow-demo</pre>')
para('This command validates the included JSON sample release only. It does not validate XLSX workbooks. For approved JSON data use validate_release.py YOUR_RELEASE without --allow-demo. The direct dashboard installation uses the six fixed Excel filenames described above. Publish data and optional comparisons first, then the matching manifest. Every attachment and archive must remain strictly below 10,000,000 bytes.')
para('Local results: all 444 monitoring records matched exact same-date demo facilities; all 420 demo activity events linked to facilities. Negative checks rejected date mismatches, ambiguous portfolio records, conflicting CA IDs and non-USD exposure; duplicate associations retained one facility balance. Current and prior release validation passed. These figures validate the synthetic fixture, not external feed completeness.')
link('qa/Data_Linkage_Verification.json','Machine-readable join audit and limitations')
h('Complete output field dictionary')
para('Required=yes means non-null and nonblank. Required=no permits null. Conditional business requirements, such as covenant_id for COVENANTS, still apply. Additional supported columns must be supplied explicitly in the prepared Data sheet; they cannot be inferred from a source name or display label.')
for entity,fields in S.items():
 parts.append('<h3>'+entity+'</h3>');table(['Field','Type','Required','Definition'],[[f['field'],f['type'],'yes' if f['required'] else 'no',f['definition']] for f in fields])
h('Upstream preparation field reference')
para('These retained source-mapping fields describe upstream preparation only. The six runtime workbooks use the canonical output dictionary above. Source owners prepare calculated fields before publication; the dashboard does not run a staging database or ingestion application.')
for entity,fields in I.items():
 parts.append('<h3>'+entity+'</h3>');table(['Field','Type','Required','Definition'],[[f['field'],f['type'],'yes' if f['required'] else 'no',f['definition']] for f in fields])
body=''.join(parts)
(K/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Credit dashboard data integration guide</title><style>body{font:16px/1.55 system-ui;color:#183453;margin:0;background:#f5f7fa}main{max-width:1200px;margin:auto;padding:36px;background:white}h1{font-size:32px}h2{margin-top:42px}h3{margin-top:30px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:12px;text-align:left;border-bottom:1px solid #dbe3eb;vertical-align:top}th{background:#edf3f9}.scroll{overflow:auto}a{color:#2456cf}pre{white-space:pre-wrap;padding:20px;background:#edf3f9}p{max-width:1050px}@media print{body{background:white}main{padding:0}h2,h3{break-after:avoid}tr{break-inside:avoid}}</style><main><h1>Credit dashboard data integration guide</h1><p>27 October 2026 · Source code audit · Illustrative data only</p>'+body+'</main></html>')
(K/'README.txt').write_text('LENDING ANALYTICS — DATA GUIDE\nOpen index.html for each dashboard’s sources, stable filenames, primary keys, joins, field dictionaries and examples.\n\nUPLOAD INPUTS: excel/runtime/ contains the six prepared fixed-name workbooks, credit-manifest.json and optional same-release comparison/history JSON. Data and Metadata sheets retain typed identifiers, source dates and release identity. These samples use is_demo=true; use the explicit sample installation only.\n\nexamples/ and page-examples/ are inspection excerpts, not complete upload bundles. page-source-map.json lists every dashboard’s dependencies. source-catalog.json records upstream source lineage. schema/ retains canonical fields and source mappings.\n\nrelease/ contains a coherent prepared JSON example for standalone validation. tools/ contains validators and history/partition utilities; these do not validate XLSX files and require no database integration.\n\nDashboard viewers use the existing Confluence wcs space permissions. There is no separate access request, entitlement application or account setup. Landing page: 3782729579. Attachment page: 3845862527. Prepare the six shared files once for all 11 dashboards; do not maintain separate page-specific datasets.\n\nThe included examples are synthetic. Validate real source fields, coverage and live Confluence loading before publishing approved records. Upload data first and manifest last; mismatched bundles are rejected.\n')
with zipfile.ZipFile(P/'Data_Integration_Kit.zip','w',zipfile.ZIP_DEFLATED) as z:
 for f in sorted(K.rglob('*')):
  if f.is_file():assert f.stat().st_size<10_000_000;z.write(f,f.relative_to(K))
assert (P/'Data_Integration_Kit.zip').stat().st_size<10_000_000
print('Integration kit:',len(list(K.rglob('*'))),'entries;', (P/'Data_Integration_Kit.zip').stat().st_size,'bytes')
