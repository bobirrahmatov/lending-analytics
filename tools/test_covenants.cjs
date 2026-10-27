/* Field parity and covenant page/expansion integration. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const P=path.resolve(__dirname,'..');
const dom=new JSDOM('<div id="credit-hub"><a class="ch-skip"></a><button id="ch-download"></button><button id="ch-customize"></button><div class="ch-actions"></div><div class="ch-demo"></div><div id="ch-content"></div></div>',{url:'http://localhost',runScripts:'outside-only'});
const w=dom.window,d=w.document,root=d.querySelector('#credit-hub');w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};
let dialog,charts=[],selected;w.CreditUI={closePopover(){},enhance(){},dialog(o){dialog=o;const el=d.createElement('div');el.innerHTML=o.body;d.body.append(el);return{element:el,body:el,close(){el.remove();}};}};
for(const file of ['credit-pal.js','credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-covenant-risk.js','credit-covenants.js'])w.eval(fs.readFileSync(path.join(P,'attachments',file),'utf8'));
const D=w.CreditCovenantsData,raw=JSON.parse(fs.readFileSync(path.join(__dirname,'covenants-workbook-samples.json')));
for(const [type,rs]of Object.entries(raw))for(const [i,r]of rs.entries()){const n=D.normalize(r,i,type==='activity');for(const [k,v]of Object.entries(r))assert.deepEqual(n[k],v,'Original field retained: '+k);}
for(const [days,band]of [[1,'1–30'],[30,'1–30'],[31,'31–45'],[45,'31–45'],[46,'46–60'],[60,'46–60'],[61,'61–90'],[90,'61–90'],[91,'>90']]){
 assert.equal(D.age(D.normalize({'Coming Due / Past Due':'Past Due','No of Days Past Due':days})),band);
 const due=new Date(Date.UTC(2026,0,1+days)).toISOString().slice(0,10);
 const n=D.normalize({'Coming Due / Past Due':'Coming Due','As Of Date':'2026-01-01','Covenant Due Date':due});assert.equal(D.age(n),band);assert.equal(D.coming(n),true);
}
assert.equal(D.age(D.normalize({status:'PAST_DUE',days_past_due:null})),'Aging not supplied');
assert.equal(D.normalize({due_date:'2026-02-30'}).due_date,null);
assert.equal(D.normalize({due_date:'2026-02-01',deferred_date:'2026-03-01'}).effective_due_date,'2026-02-01');
assert.equal(D.normalize({due_date:'2026-02-01',deferred_date:'2026-03-01',deferral_approved:true}).effective_due_date,'2026-03-01');
assert.equal(D.normalize({'Covenant Compliance':'Deactivated'},0,true).event_type,'DELETED');
const sparse=['01','03','07','09'].map(m=>D.normalize({event_date:'2026-'+m+'-01',event_type:'WAIVED'},0,true));assert.deepEqual(Array.from(D.activityWindow(sparse,'WAIVED').months),['2026-03','2026-07','2026-09']);
w.CREDIT_CONFIG={page:'COVENANTS',mode:'demo'};w.CREDIT_DEMO={datasets:{monitoring:[],sources:[{source_id:'SRC_COVENANTS'},{source_id:'SRC_ACTIVITY'}]}};
w.eval(fs.readFileSync(path.join(P,'attachments/credit-covenants-demo.js'),'utf8'));
const cov=w.CREDIT_DEMO.datasets.monitoring,events=w.CREDIT_DEMO.datasets.activity;
assert.equal(cov.length,200);assert.equal(events.length,420);assert.equal(cov.filter(D.past).length,80);assert.equal(cov.filter(D.coming).length,120);assert.equal(D.distinct(cov,'relationship_id'),50);
w.Highcharts={chart(el,o){const c={renderTo:el,chartHeight:320,series:o.series.map(s=>({...s,options:s,data:s.data.map(p=>({...p,options:p}))})),setSize(){},update(){},reflow(){},redraw(){},destroy(){}};charts.push(c);return c;}};
w.CreditDonut=()=>{};
const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');let controller,testData={};
const page=w.CreditCovenants({root,esc,data:()=>testData,num:v=>Number(v).toLocaleString('en'),register(title,rows,cols){selected={rows,cols};return '<section id="ch-register" class="ch-card"><div class="ch-toolbar"><h2>'+title+'</h2></div><div class="ch-register-controls"></div></section>';},addChart(){},openMetric:k=>controller.openMetric(k),openChart:(...args)=>controller.open(...args),methodology:id=>controller.methodology(id),resetTable(){},render:render});
controller=w.CreditChartDetails({root,esc,getCharts:()=>charts,getRows:id=>page.getRows(id),getCustomDefinition:id=>page.getDefinition(id),getCustomMethod:id=>page.getMethod(id),renderCustomAnalysis:a=>page.expanded(a),getContext:()=>({demo:true,date:'30 Nov 2024',filters:'All'})});
function render(){controller.beforeRender();charts=[];page.main(cov,events);controller.apply();w.CreditTables.enhanceStatic(root);}
render();assert.equal(selected.rows.length,200);assert.equal(root.querySelectorAll('.cov-kpi .cw-metric-icon').length,4);
for(const id of ['cov-aging','cov-regional','cov-activity','cov-activity-region','cov-severity','cov-products','cov-facility']){
 const el=root.querySelector('#'+id),card=el.closest('.ch-card');assert.equal(card.querySelectorAll('[data-chart-method]').length,1);assert.equal(card.querySelectorAll('[data-cov-method]').length,0);
 controller.open(id);assert.ok(root.querySelector('.cd-chart-slot')===null||root.querySelector('.cd-chart-slot').hidden);assert.equal(root.querySelectorAll('.cd-analysis-kpis .cd-kpi-shell').length,4);
 for(const c of root.querySelectorAll('.cd-analysis-grid .ch-card'))assert.ok(c.querySelector('[data-cov-method],[data-section-method]'),'Methodology missing '+c.textContent.slice(0,40));
 assert.equal(root.querySelectorAll('.cd-detail-page .ct-table-card:not([hidden])').length,1);
 const before=page.getRows(id).length;assert.equal(controller.exportRows().length,before);
 controller.methodology(id);assert.ok(dialog.body.includes(page.getMethod(id)[0].slice(0,20)));
 controller.close();assert.equal(root.querySelector('#ch-content').hidden,false);
}
for(const id of ['cov-total','cov-action','cov-coming','cov-relationships']){controller.openMetric(id);assert.equal(root.querySelectorAll('.cd-analysis-kpis .cd-kpi-shell').length,4);controller.close();}
(async()=>{
root.querySelector('[data-cov-setting="view"][data-value="coming"]').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(page.getRows('cov-aging').length,120);assert.ok(selected.cols.some(c=>c[0]==='osuc_usd'));
root.querySelector('[data-cov-setting="detail"][data-value="all"]').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(selected.rows.length,200);assert.ok(selected.cols.some(c=>c[0]==='description'));
root.querySelector('[data-cov-setting="activity"][data-value="DELETED"]').click();await new Promise(resolve=>setTimeout(resolve,0));assert.ok(page.getRows('cov-activity').every(r=>r.event_type==='DELETED'));
controller.openMetric('cov-coming');
const titles=[...root.querySelectorAll('.cd-analysis-grid>.ch-card h2')].map(e=>e.textContent);
assert.equal(titles.indexOf('Coming Due Aging Mix'),titles.indexOf('Aging Severity by Region')+1);
assert.equal(titles.indexOf('What needs attention'),-1,'Summary no longer occupies a chart card');
assert.equal(root.querySelectorAll('.cd-expanded-summary').length,1);
assert.equal(root.querySelector('.cd-expanded-summary button'),null);
assert.ok(titles.indexOf('Upcoming Due Timeline')>titles.indexOf('Coming Due Aging Mix'));
assert.ok(root.querySelector('.cd-wide:has([id$="-timeline"])'));
controller.close();
root.querySelector('[data-cov-setting="detail"][data-value="facilities"]').click();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(selected.rows.length,100);assert.ok(selected.cols.some(c=>c[0]==='match_status'));
page.main([],[]);assert.ok(!root.textContent.includes('NaN'));assert.equal(page.getRows('cov-aging').length,0);
const priorDate=w.CreditCovenantRisk.previousWeekday(cov[0].as_of_date),prior=cov.slice(1).map(r=>({...r,as_of_date:priorDate}));
testData={monitoring:cov,sources:[{source_id:cov[0].source_id,domain:'COVENANTS',as_of_date:cov[0].as_of_date,record_count:cov.length,coverage:'ALL_OBLIGATIONS'}],covenantHistory:{rows:prior,snapshots:[{as_of_date:priorDate,complete:true,sources:[{source_id:cov[0].source_id,record_count:prior.length,coverage:'ALL_OBLIGATIONS'}]}]}};
page.main(cov,events);assert.ok(root.querySelector('[data-cov-open="cov-total"] .cov-kpi-variance').textContent.includes('+0.5% (+1)'));assert.ok(root.querySelector('#cov-products').closest('.ch-card').querySelector('.cov-chart-variance').textContent.includes('+0.5% (+1)'));
// Same covenant number has two facility/relationship associations, plus another covenant on F1.
const financialRows=[['I1','C1','R1','F1'],['I2','C1','R2','F2'],['I3','C2','R1','F1']].map(([item_id,covenant_id,relationship_id,facility_id])=>D.normalize({item_id,covenant_id,relationship_id,facility_id,relationship_name:relationship_id+' name',category:'COVENANTS',source_id:'COV',as_of_date:'2026-10-26',region:'NAM',status:'PAST_DUE',owner_name:'Underwriter',days_past_due:10}));
const financialPortfolio=[['R1','F1',1000000,800000],['R2','F2',2000000,1700000]].map(([relationship_id,facility_id,tfa,osuc])=>({relationship_id,facility_id,tfa,osuc,facility_key:facility_id,as_of_date:'2026-10-26',source_id:'PORT',region:'NAM',reporting_currency:'USD',banker_name:facility_id+' banker'}));
testData={monitoring:financialRows,portfolio:financialPortfolio,sources:[{source_id:'COV',domain:'COVENANTS',as_of_date:'2026-10-26',record_count:3,coverage:'ALL_OBLIGATIONS'},{source_id:'PORT',domain:'PORTFOLIO',as_of_date:'2026-10-26',record_count:2,coverage:'ALL_OBLIGATIONS'}],covenantHistory:{rows:financialRows.map(r=>({...r,as_of_date:'2026-10-23'})),portfolio_rows:financialPortfolio.map((r,i)=>({...r,as_of_date:'2026-10-23',tfa:i?1500000:1000000,osuc:i?1200000:800000})),snapshots:[{as_of_date:'2026-10-23',complete:true,sources:[{source_id:'COV',record_count:3,coverage:'ALL_OBLIGATIONS'}],portfolio_sources:[{source_id:'PORT',record_count:2,coverage:'ALL_OBLIGATIONS'}]}]}};
page.main(financialRows,[]);
const totalKpi=root.querySelector('[data-cov-open="cov-total"]');
assert.equal(totalKpi.querySelector('.cov-kpi-exposures'),null);const context=page.getMethod('metric-cov-total')[0];assert.match(context,/\$3.00m/);assert.match(context,/\$2.50m/);
assert.match(context,/\+20.0% \(\+\$0.50m\)/);assert.match(context,/\+25.0% \(\+\$0.50m\)/);
assert.equal(selected.rows.length,2);assert.equal(selected.rows[0].banker_name,'F1 banker');assert.equal(selected.rows[0].covenant_numbers,2);
controller.openMetric('cov-total');assert.equal(root.querySelectorAll('.cd-analysis-kpis .cd-kpi-shell').length,4);assert.equal(controller.exportRows()[0].osuc_usd,800000);controller.close();
console.log('PASS: legacy field parity, five-band aging, seven chart and four enriched KPI expansions, one visible detail table, methodology, controls, exact facility TFA/OSUC totals, banker names, duplicate covenant associations and monetary daily variances.');

})().catch(e=>{console.error(e);process.exitCode=1;});
