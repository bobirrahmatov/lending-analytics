/* Table drill integration: exact cohorts, local navigation, controls and restoration. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const A=path.resolve(__dirname,'../attachments'),pause=()=>new Promise(resolve=>setTimeout(resolve,30));
const same=(actual,expected,message)=>assert.equal(JSON.stringify(actual),JSON.stringify(expected),message);
const visible=el=>el&&!el.closest('[hidden]');
async function mount(page){
 const dom=new JSDOM('<div id="credit-hub"></div>',{url:'http://localhost/'+page,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,root=w.document.querySelector('#credit-hub'),charts=[];
 w.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.CREDIT_CONFIG={mode:'demo',page};w.CreditUI={enhance(){},closePopover(){},dialog(o){const el=w.document.createElement('div');el.innerHTML=o.body;w.document.body.append(el);return{element:el,body:el,close(){el.remove();}};}};
 for(const f of ['credit-demo-data.js','credit-comparison-demo.js','credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-portfolio-journey.js','credit-pal.js','credit-covenant-risk.js','credit-snapshots.js','credit-monitoring.js','credit-covenants.js','credit-data-cache.js','credit-dashboard.js'])w.eval(fs.readFileSync(path.join(A,f),'utf8'));
 w.CreditDonut=()=>{};w.Highcharts={chart(el,o){const c={renderTo:el,options:o,chartHeight:320,xAxis:[{categories:o.xAxis?.categories||[]}],series:o.series.map(s=>({...s,options:s,data:s.data.map(p=>({...p,options:p}))})),setSize(){},reflow(){},redraw(){},update(){},destroy(){}};charts.push(c);return c;}};
 const detailsFactory=w.CreditChartDetails,covenantsFactory=w.CreditCovenants;let details,covenants;
 w.CreditChartDetails=opts=>(details=detailsFactory(opts));w.CreditCovenants=opts=>(covenants=covenantsFactory(opts));await w.CreditHub.mount(root);assert.equal(root.querySelector('.ch-error'),null,root.textContent);
 return{dom,w,root,charts,get details(){return details;},get covenants(){return covenants;}};
}
function frame(root){return [...root.querySelectorAll('.cd-table-drill')].find(visible);}
function back(root){const current=frame(root);assert.ok(current,'A visible table drill exists');const button=current.querySelector('[data-inline-reset]');assert.equal(button.textContent,'Back to table');button.click();}
function assertLocal(e,expected,label){const p=frame(e.root);assert.ok(p,label+' inline drill');assert.ok(p.closest('.cd-inline-active'));assert.equal(e.root.querySelector('#cd-record-drill'),null,label+' no separate record view');assert.ok(p.querySelector('nav[aria-label="Table drill-down path"]'));same(e.details.tableExportRows(),expected,label+' exact record export');return p;}
(async()=>{
 let checked=0;
 for(const page of ['portfolio','deepdive','overview','workload','COVENANTS','CA','FACILITY','CCM','INSURANCE','APPRAISALS','activity']){
  const e=await mount(page),{root,w}=e;
  if(page==='portfolio'){root.querySelector('[data-portfolio-view="data"]').click();await pause();}
  if(page==='deepdive'){root.querySelector('[data-deep-open="R0033"]').click();await pause();}
  const search=root.querySelector('#ch-search');assert.ok(search,page+' register search');search.value='Relationship';search.dispatchEvent(new w.Event('input'));
  root.querySelector('#ch-table [data-ct-sort="0"]').click();root.querySelector('#ch-table [data-ct-sort="0"]').click();
  let offset=0;if(root.querySelector('#ch-table [data-ct-next]:not(:disabled)')){root.querySelector('#ch-table [data-ct-next]').click();offset=10;}
  const table=root.querySelector('#ch-table table'),first=table.tBodies[0].rows[0],originalRows=[...table.tBodies[0].rows],originalMarkup=table.outerHTML,exportBefore=[...root._exportRows],expected=e.covenants.getTableRows(exportBefore[offset])??[exportBefore[offset]],pageBefore=root.querySelector('#ch-table .ct-page-status')?.textContent;
  const otherCard=[...root.querySelectorAll('#ch-content .ch-card')].find(el=>!el.contains(table)),dialogs=root.querySelectorAll('dialog.ca-overlay').length;
  first.cells[Math.min(1,first.cells.length-1)].click();let p=assertLocal(e,expected,page+' row background');assert.equal(root.querySelectorAll('dialog.ca-overlay').length,dialogs);if(otherCard)assert.ok(otherCard.isConnected,'Unrelated widget remains intact');
  let nested;
  for(const tab of p.querySelectorAll('[data-pj-dataset]')){if(tab.dataset.pjDataset==='records')continue;tab.click();const related=e.details.tableExportRows().slice(),index=related.slice(0,10).findIndex(r=>JSON.stringify([r])!==JSON.stringify(expected));if(index>=0){nested={related,index,row:p.querySelectorAll('.cd-records tbody tr[data-ct-drill]')[index]};break;}}
  if(nested?.row){const {related,index,row}=nested,originRecords=p.querySelector('.cd-records'),beforeNested=originRecords.innerHTML;row.querySelector('[data-ct-row-drill]').click();assertLocal(e,[related[index]],page+' related dataset record');assert.notEqual(frame(root),p,'Related row opens a child frame');assert.equal(root.querySelectorAll('dialog.ca-overlay').length,dialogs);back(root);assert.equal(frame(root),p,'Nested Back restores parent frame');assert.equal(p.querySelector('.cd-records'),originRecords);assert.equal(originRecords.innerHTML,beforeNested,'Nested Back preserves table controls');same(e.details.tableExportRows(),related,'Nested Back restores export scope');}
  back(root);assert.equal(frame(root),undefined);assert.equal(root.querySelector('#ch-table table'),table,'Original table node is retained');assert.deepEqual([...table.tBodies[0].rows],originalRows,'Original row nodes are retained');assert.equal(table.outerHTML,originalMarkup,'Table sorting and column controls are retained');assert.equal(root.querySelector('#ch-search').value,'Relationship');assert.equal(root.querySelector('#ch-table .ct-page-status')?.textContent,pageBefore);same(root._exportRows,exportBefore,'Register export unchanged');assert.equal(e.details.tableExportRows(),null,'No stale nested export after Back');
  const keyboardButton=first.querySelector('[data-ct-row-drill]');assert.equal(keyboardButton.tagName,'BUTTON','Native keyboard activator');assert.equal(keyboardButton.type,'button');assert.match(keyboardButton.getAttribute('aria-label'),/^Drill into /);keyboardButton.focus();keyboardButton.click();assertLocal(e,expected,page+' accessible first-cell action');back(root);assert.equal(w.document.activeElement,keyboardButton,'Back restores trigger focus');
  checked++;e.dom.window.close();
 }
 // All seven Covenant dataset tabs preserve their grain; grouped rows drill to their stored members.
 const e=await mount('COVENANTS'),{root,w}=e;
 for(const name of ['grouped','facilities','records','events','all','links','sources']){
  root.querySelector('[data-cov-setting="detail"][data-value="'+name+'"]').click();await pause();const rows=root._exportRows;if(!rows.length)continue;
  const expected=e.covenants.getTableRows(rows[0])??[rows[0]],row=root.querySelector('#ch-table tbody tr');
  if(name==='grouped'){assert.equal(expected.length,rows[0].total,'Grouped totals reconcile to source members');assert.ok(expected.every(r=>r.item_id&&r.as_of_date),'Grouped row retains source identity/date');assert.equal(Object.hasOwn(rows[0],'_rows'),false,'Provenance does not leak into export fields');}
  if(name==='facilities')assert.equal(expected.length,rows[0].covenants,'Facility record resolves every covenant association');
  row.querySelector('[data-ct-row-drill]').click();const panel=assertLocal(e,expected,'Covenants '+name);if(name==='sources'){assert.equal(panel.querySelector('[data-pj-dataset=facilities]'),null,'Source controls cannot invent facility matches');assert.equal(panel.querySelector('[data-pj-dataset=COVENANTS],[data-pj-dataset=CA],[data-pj-dataset=CCM]'),null,'Metadata does not become an entity cohort');assert.ok(expected.every(r=>r.source_id&&!r.facility_id));}back(root);
 }
 // Static detail-table provenance survives sorting/pagination and never matches by display text.
 root.querySelector('[data-chart-expand="cov-aging"]').click();const expanded=root.querySelector('#cd-chart-analysis'),staticCard=[...expanded.querySelectorAll('.cov-table-card[data-table-mode="detail"]')].find(c=>c.id.endsWith('-details'));assert.ok(staticCard);
 const definition=e.covenants.getDefinition(staticCard.id),displayRow=definition.table.rows[0],cohort=e.covenants.getTableRows(displayRow);assert.ok(cohort.length);assert.ok(cohort.every(r=>r.relationship_id===cohort[0].relationship_id&&r.region===cohort[0].region));
 expanded.querySelector('[role=tab][aria-controls="'+staticCard.id+'"]').click();assert.ok(visible(staticCard),'Activate expanded grouped table view');const count=root.querySelectorAll('dialog.ca-overlay').length;staticCard.querySelector('[data-ct-row-drill]').click();assertLocal(e,cohort,'Covenant expanded grouped detail');assert.equal(root.querySelectorAll('dialog.ca-overlay').length,count,'Static detail does not stack overlays');back(root);assert.equal(root.querySelector('#cd-chart-analysis'),expanded);expanded.closest('dialog').querySelector('.ca-overlay-close').click();
 // Equal relationship names and reused IDs at different dates must retain exact membership.
 const seed=w.CREDIT_DEMO.datasets.monitoring.find(r=>r.category==='COVENANTS');
 const synthetic=[['A','R-A','F-A','NAM','2026-08-31'],['B','R-A','F-B','NAM','2026-08-31'],['C','R-B','F-C','NAM','2026-08-31'],['D','R-A','F-D','EMEA','2026-08-31'],['E','R-A','F-A','NAM','2026-08-28']].map(([item_id,relationship_id,facility_id,region,as_of_date])=>({...seed,item_id,relationship_id,facility_id,region,as_of_date,relationship_name:'Same displayed name',status:'PAST_DUE',lead_underwriter:'Same owner',days_past_due:20}));
 e.covenants.settings.detail='grouped';e.covenants.main(synthetic,[]);const aggregates=e.covenants.getDefinition('ch-register').rows,selected=aggregates.find(r=>r.relationship_id==='R-A'&&r.region==='NAM'),members=e.covenants.getTableRows(selected);
 same(members.map(r=>r.item_id),['A','B','E'],'Provenance uses exact source members despite equal display names');same(members.map(r=>r.as_of_date),['2026-08-31','2026-08-31','2026-08-28'],'Original reporting dates survive aggregation');assert.equal(Object.hasOwn(selected,'_rows'),false);
 e.dom.window.close();
 // Shared binder does not steal embedded controls or activate while selecting text.
 const b=await mount('CA'),host=b.w.document.createElement('section');host.innerHTML='<table><tbody><tr><td>Entry</td><td><button id="action">Action</button><input value="edit"><a href="#">Link</a></td><td>Details</td></tr></tbody></table>';b.w.document.body.append(host);const record={facility_id:'F1',relationship_id:'R1',region:'NAM',as_of_date:'2026-08-31'},table=host.querySelector('table');let calls=0;
 b.w.CreditTables.bindRows({table,rows:[record],onSelect:rs=>{same(rs,[record]);calls++;}});host.querySelector('#action').click();host.querySelector('input').click();host.querySelector('a').click();assert.equal(calls,0);table.tBodies[0].rows[0].cells[2].click();assert.equal(calls,1);const originalSelection=b.w.getSelection;b.w.getSelection=()=>({toString:()=> 'selected text'});table.tBodies[0].rows[0].cells[2].click();assert.equal(calls,1,'Text selection does not drill');b.w.getSelection=originalSelection;
 b.w.CreditTables.bindRows({table,rows:[record],onSelect:()=>calls++});host.querySelector('[data-ct-row-drill]').click();assert.equal(calls,2,'Rebinding retains one handler');assert.equal(host.querySelectorAll('[data-ct-row-drill]').length,1);b.dom.window.close();
 console.log('PASS table drill:',checked,'page registers; seven Covenant datasets; explicit static cohorts; nested same-card navigation; exact exports; search/sort/page/focus restoration; embedded controls and text selection.');
})().catch(error=>{console.error(error);process.exitCode=1;});
