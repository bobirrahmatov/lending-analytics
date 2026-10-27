/* Period selection, scoped daily snapshots, exports and missing-data behavior. */
const {JSDOM}=require('jsdom');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const dom=new JSDOM('<div id="credit-hub"><span id="ch-filter-status"></span><button id="ch-download"></button><div id="ch-content"></div></div>',{runScripts:'outside-only'});
const w=dom.window,d=w.document,root=d.querySelector('#credit-hub');const configs={};let clicked,navigated,history=[],scope='';const monitoring=[{category:'INSURANCE',region:'NAM',as_of_date:'2026-09-01',action_required:true,critical:true},{category:'INSURANCE',region:'NAM',as_of_date:'2026-09-01',action_required:false,critical:false},{category:'CCM',region:'LATAM',as_of_date:'2026-07-13',action_required:true,critical:false}];
w.Highcharts={chart(el,options){configs[el.id]=options;return{renderTo:el};}};
w.eval(fs.readFileSync(path.join(__dirname,'../attachments/credit-data-cache.js'),'utf8'));
w.eval(fs.readFileSync(path.join(__dirname,'../attachments/credit-pal.js'),'utf8'));
const row=(id,flags,tfa)=>({facility_id:id,relationship_id:id,relationship_name:id,as_of_date:'2026-08-31',region:'NAM',product:'Real Estate',management_status:'CM',direct_os:100,rotce:.1,tfa,total_os:tfa/2,unused_commitment:tfa/4,unused_uncommitted:tfa/4,...flags});
const rows=[row('A',{pal_new_ytd:true,pal_new_mtd:true,pal_new_wtd:true,pal_approved_ytd:true,pal_approved_wtd:true},100),row('B',{pal_new_ytd:true,pal_new_qtd:true,pal_prior_mtd:true,pal_pending_ytd:true,pal_pipeline_bucket:'31-60'},300),row('C',{pal_prior_ytd:true,pal_prior_qtd:true,pal_pending_ytd:true,pal_pending_qtd:true,pal_pipeline_bucket:'1-30'},200),row('D',{pal_prior_ytd:true,pal_prior_wtd:true},400),row('E',{management_status:'DM'},800)];
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const pal=w.CreditPAL({root,esc,num:String,money:n=>'$'+n,pct:String,sum:(rs,k)=>rs.reduce((a,r)=>a+(Number(r[k])||0),0),unique:(rs,k)=>new Set(rs.map(r=>r[k])).size,filtered:r=>r.filter(r=>!scope||r.region===scope),register(){throw Error('Portfolio must not render a register');},showRows(){},state:()=>({}),data:()=>({portfolio:rows,history,monitoring}),addChart(){},navigatePage(...args){navigated=args;},openChart(...args){clicked=args;},render(){pal.overview(rows);}});
const values=()=>Array.from(configs.newDealsChart.series,s=>s.data.reduce((sum,p)=>sum+p.y,0));
const period=(key,value)=>d.querySelector(`[data-pal-period="${key}"][data-value="${value}"]`).click();
pal.overview(rows);
assert.deepEqual(values(),[2,2]);assert.equal(pal.getRows('newDealsChart').length,4);
assert.match(d.querySelector('.pal-variance').textContent,/unavailable/);
assert.equal(d.querySelector('#ch-content').children[0].className,'pal-metrics');assert.equal(d.querySelector('.pal-summary'),null);assert.equal(d.querySelector('#creditClassificationChart').closest('.ch-card').nextElementSibling.id,'pal-snapshot','Coverage follows New Facilities Approved');
assert.equal(d.querySelector('#newDealsChart').closest('.ch-card').nextElementSibling.id,'pal-pipeline','New deals and Pending Closure remain adjacent');
assert.equal(root._exportRows.length,5);assert.equal(d.querySelector('#ch-download').disabled,false);assert.equal(d.querySelectorAll('#pal-snapshot [data-pal-rows]').length,4);
assert.ok(d.querySelector('#pal-pipeline > .wcs-data-table-scroll > .wcs-data-table'));
assert.equal(d.querySelectorAll('#pal-snapshot tbody tr').length,4);assert.equal(d.querySelectorAll('[data-pal-navigate]').length,0);assert.equal(pal.getRows('pal-pipeline').length,2);
assert.deepEqual([...d.querySelectorAll('#ch-content section.ch-card')].map(el=>el.querySelector('.ch-chart')?.id||el.id),['facilityTrendChart','creditClassificationChart','pal-snapshot','newDealsChart','pal-pipeline','relationshipChart','monitoringPriorityChart','covenantMonitoringChart','ccmRegionalChart','pal-trends']);
assert.equal(d.querySelector('#relationshipChart').previousElementSibling.querySelector('strong').textContent,'$500');
assert.equal(d.querySelector('#rotceChart'),null);assert.equal(configs.relationshipChart.series[1].type,'scatter');assert.equal(configs.relationshipChart.series[1].yAxis,1);assert.equal(configs.relationshipChart.yAxis[1].plotLines[0].value,.12);assert.equal(configs.newDealsChart.chart.type,'bar');
period('dealPeriod','mtd');assert.deepEqual(values(),[1,1]);period('dealPeriod','qtd');assert.deepEqual(values(),[1,1]);period('dealPeriod','wtd');assert.deepEqual(values(),[1,1]);
period('pendingPeriod','qtd');assert.equal(pal.getRows('pipeline').length,1);period('pendingPeriod','wtd');assert.equal(pal.getRows('pipeline').length,0);
period('approvalPeriod','wtd');assert.equal(pal.getRows('creditClassificationChart').length,1);
period('dealPeriod','ytd');assert.equal(d.querySelector('[data-pal-setting="dealMeasure"]'),null);assert.deepEqual(values(),[2,2]);assert.equal(configs.creditClassificationChart.chart.type,'pie');assert.equal(d.querySelector('[data-pal-setting="covenants"]'),null);assert.equal(d.querySelectorAll('[data-pal-period="covenants"]').length,2);assert.equal(configs.relationshipChart.series[0].color,'#255BE3');
const point=configs.newDealsChart.series[0].data[0];configs.newDealsChart.plotOptions.series.point.events.click.call({options:point,index:0,series:{name:'Facilities'}});assert.equal(clicked[0],'newDealsChart');assert.equal(clicked[1].length,2);assert.equal(clicked[2],'Real Estate · Facilities');
// Monday must use Friday, not the closest available stale date or Sunday.
history=rows.map(r=>({...r,as_of_date:'2026-08-28',comparison_ready:true,tfa:r.tfa/2}));pal.overview(rows);
assert.match(d.querySelector('.pal-variance').textContent,/\+100\.0% \(\+\$900\)/);assert.match(d.querySelector('.pal-variance').title,/2026-08-28/);
pal.settings.management='CM';pal.overview(rows);assert.match(d.querySelector('.pal-variance').textContent,/\+100\.0% \(\+\$500\)/);
pal.settings.management='';history.forEach(r=>r.as_of_date='2026-08-27');pal.overview(rows);assert.match(d.querySelector('.pal-variance').textContent,/unavailable/);
history.forEach(r=>{r.as_of_date='2026-08-28';r.tfa=0;});pal.overview(rows);assert.match(d.querySelector('.pal-variance').textContent,/New balance/);assert.doesNotMatch(d.querySelector('.pal-variance').textContent,/Infinity|NaN/);
history[0].comparison_ready=false;pal.overview(rows);assert.match(d.querySelector('.pal-variance').textContent,/unavailable/);
history.forEach(r=>{r.comparison_ready=true;r.tfa=1000;});pal.overview(rows);assert.match(d.querySelector('.pal-variance').textContent,/−64.0%/);
// An absent scope in a complete prior snapshot is zero, not a missing snapshot.
scope='LATAM';pal.overview([]);assert.match(d.querySelector('.pal-variance').textContent,/0.0%/);scope='';
// Tuesday uses Monday; mixed source dates suppress an invalid comparison.
rows.forEach(r=>r.as_of_date='2026-09-01');history.forEach(r=>r.as_of_date='2026-08-31');pal.overview(rows);assert.match(d.querySelector('.pal-variance').title,/2026-08-31/);
rows[0].as_of_date='2026-08-31';pal.overview(rows);assert.match(d.querySelector('.pal-variance').textContent,/Comparable date unavailable/);
pal.settings.management='NO_MATCH';pal.overview(rows);assert.equal(root._exportRows.length,0);assert.equal(d.querySelector('#ch-download').disabled,true);assert.match(d.querySelector('#newDealsChart').textContent,/No eligible records/);assert.equal(pal.getRows('newDealsChart').length,0);assert.equal(d.querySelector('#relationshipChart').previousElementSibling.querySelector('strong').textContent,'$0');assert.doesNotMatch(d.querySelector('#ch-content').textContent,/NaN|Infinity/);
console.log('PASS: four periods, pending and approval cohorts, count-only new deals, approval labels, combined exposure/ROTCE axes, covenant segments, point drill-through, compact snapshot order and actionable navigation, shared table, export/empty state, Monday/Tuesday comparisons, filtered balances, missing/incomplete/zero/negative and mixed-date history.');

const monitorOnly=w.CreditPAL({root,filtered:r=>r,data:()=>({monitoring})});assert.equal(monitorOnly.getAnalysis().portfolio.length,0);assert.equal(monitorOnly.getAnalysis().monitoring.length,3);

// Both measures must preserve the same rank and source population; missing ROTCE is not zero.
pal.settings.management='';rows[0].rotce=null;pal.overview(rows);
assert.equal(configs.relationshipChart.series[1].data[0].y,null);
configs.relationshipChart.series[0].data.forEach((p,i)=>assert.deepEqual(p.custom.rows,configs.relationshipChart.series[1].data[i].custom.rows));
rows[0].product='Aircraft Finance';pal.overview(rows);assert.deepEqual(values(),[2,2]);assert.equal(configs.newDealsChart.xAxis.categories.length,2);
const newPoint=configs.newDealsChart.series[0].data[0];configs.newDealsChart.plotOptions.series.point.events.click.call({options:newPoint,index:0,series:{name:'Current period'}});assert.equal(clicked[1].length,1);

// Cross-domain priority segments cannot double-count critical/upcoming action flags.
monitoring[0].coming_due=true;monitoring[1].coming_due=true;monitoring[2].action_required=true;
pal.overview(rows);
const summary=configs.monitoringPriorityChart;
assert.equal(summary.chart.type,'bar');assert.equal(summary.plotOptions.series.stacking,'normal');assert.equal(summary.xAxis.categories.length,6);
assert.deepEqual(Array.from(summary.series,s=>s.data.reduce((n,p)=>n+p.y,0)),[1,1,1]);
assert.equal(pal.getRows('monitoringPriorityChart').length,3);
const item=summary.series[0].data.find(p=>p.y);summary.plotOptions.series.point.events.click.call({options:item,index:summary.series[0].data.indexOf(item),series:{name:'Critical actions'}});assert.equal(clicked[0],'monitoringPriorityChart');assert.equal(clicked[1].length,1);
scope='NAM';pal.overview(rows);assert.equal(pal.getRows('monitoringPriorityChart').length,2);scope='';
console.log('PASS: six-domain priority summary, exclusive segments, shared filters and point records.');

// Five exact aging bands, authoritative file categories and safe legacy fallbacks.
const aging=w.CreditCovenantAging;
for(const [days,want] of [[0,'1–30'],[1,'1–30'],[30,'1–30'],[31,'31–45'],[45,'31–45'],[46,'46–60'],[60,'46–60'],[61,'61–90'],[90,'61–90'],[91,'>90']]){
 const effective_due_date=new Date(Date.UTC(2026,7,31+days)).toISOString().slice(0,10);
 assert.equal(aging.bucket({as_of_date:'2026-08-31',effective_due_date},false),want);
 if(days)assert.equal(aging.bucket({days_past_due:days,pal_covenant_bucket:days<=45?'1-45':days<=90?'46-90':'>90'},true),want);
}
for(const past of [true,false])assert.equal(aging.bucket({source_aging_bucket:'46–60 Days',days_past_due:2,effective_due_date:'2026-09-01',as_of_date:'2026-08-31'},past),'46–60');
assert.equal(aging.bucket({source_aging_bucket:'31-45 Days'},false),'31–45');
assert.equal(aging.bucket({source_aging_bucket:'61-90 Days'},false),'61–90');
assert.equal(aging.bucket({source_aging_bucket:'1-45 Days'},false),null);
assert.equal(aging.bucket({pal_covenant_bucket:'46-90'},true),null);
assert.equal(aging.bucket({days_past_due:0},false),null);
assert.equal(aging.bucket({days_past_due:-100},false),'>90');
assert.equal(aging.bucket({effective_due_date:'bad',as_of_date:'2026-08-31'},false),null);
assert.equal(aging.bucket({effective_due_date:'2026-08-30',as_of_date:'2026-08-31'},false),null);
monitoring.push(...['1-30 Days','31-45 Days','46-60 Days','61-90 Days','>90 Days',null].map((source_aging_bucket,i)=>({category:'COVENANTS',status:'COMING_DUE',source_aging_bucket,relationship_id:'CV'+i,region:'NAM',days_past_due:0})));
monitoring.push({category:'COVENANTS',status:'CLEARED',source_aging_bucket:'1-30 Days'},{category:'COVENANTS',status:'PAST_DUE',source_aging_bucket:'46-60 Days',pal_covenant_bucket:'46-90'});
period('covenants','coming');assert.equal(pal.getRows('covenantMonitoringChart').length,6);
const covPoints=configs.covenantMonitoringChart.series[0].data;
assert.deepEqual(Array.from(covPoints,p=>[p.name,p.y]),[['1–30',1],['31–45',1],['46–60',1],['61–90',1],['>90',1],['Aging not supplied',1]]);
assert.equal(covPoints[4].custom.rows[0].relationship_id,'CV4');
assert.match(d.querySelector('#covenantMonitoringChart').previousElementSibling.textContent,/Coming-due obligations/);
period('covenants','past');assert.equal(pal.getRows('covenantMonitoringChart').length,1);
assert.deepEqual(Array.from(configs.covenantMonitoringChart.series[0].data,p=>[p.name,p.y]),[['1–30',0],['31–45',0],['46–60',1],['61–90',0],['>90',0]]);
console.log('PASS: five aging bands, all boundaries, file categories for both views, safe coarse-band fallback, missing aging, uncapped coming-due cohort and drill-through.');
