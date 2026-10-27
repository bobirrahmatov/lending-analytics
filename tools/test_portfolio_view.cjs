/* Period selection, scoped daily snapshots, exports and missing-data behavior. */
const {JSDOM}=require('jsdom');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const dom=new JSDOM('<div id="credit-hub"><span id="ch-filter-status"></span><button id="ch-download"></button><div id="ch-content"></div></div>',{runScripts:'outside-only'});
const w=dom.window,d=w.document,root=d.querySelector('#credit-hub');const configs={};let clicked,navigated,history=[],scope='';const monitoring=[{category:'INSURANCE',region:'NAM',as_of_date:'2026-09-01',action_required:true,critical:true},{category:'INSURANCE',region:'NAM',as_of_date:'2026-09-01',action_required:false,critical:false},{category:'CCM',region:'LATAM',as_of_date:'2026-07-13',action_required:true,critical:false}];
w.Highcharts={chart(el,options){configs[el.id]=options;return{renderTo:el};}};
w.eval(fs.readFileSync(path.join(__dirname,'../attachments/credit-data-cache.js'),'utf8'));
w.eval(fs.readFileSync(path.join(__dirname,'../attachments/credit-pal.js'),'utf8'));
const row=(id,flags,tfa)=>({facility_id:id,relationship_id:id,relationship_name:id,as_of_date:'2026-08-31',region:'NAM',product:'Real Estate',management_status:'CM',direct_os:100,rotce:.1,tfa,total_os:tfa/2,unused_commitment:tfa/4,unused_uncommitted:tfa/4,...flags});
const rows=[row('A',{pal_new_ytd:true,pal_new_mtd:true,pal_new_wtd:true,pal_approved_ytd:true,pal_approved_wtd:true,pal_ca_expired:true},100),row('B',{pal_new_ytd:true,pal_new_qtd:true,pal_prior_mtd:true,pal_pending_ytd:true,pal_pipeline_bucket:'31-60',pal_facility_expired:true},300),row('C',{pal_prior_ytd:true,pal_prior_qtd:true,pal_pending_ytd:true,pal_pending_qtd:true,pal_pipeline_bucket:'1-30'},200),row('D',{pal_prior_ytd:true,pal_prior_wtd:true},400),row('E',{management_status:'DM'},800)];
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const pal=w.CreditPAL({root,esc,num:String,money:n=>'$'+n,pct:String,sum:(rs,k)=>rs.reduce((a,r)=>a+(Number(r[k])||0),0),unique:(rs,k)=>new Set(rs.map(r=>r[k])).size,filtered:r=>r.filter(r=>!scope||r.region===scope),register(){throw Error('Portfolio must not render a register');},showRows(){},state:()=>({}),data:()=>({portfolio:rows,history,monitoring}),addChart(){},navigatePage(...args){navigated=args;},openChart(...args){clicked=args;},render(){pal.overview(rows);}});
const dealRows=()=>[...d.querySelectorAll('#newDealsChart .pal-deal-row')];
const dealButton=(period,index=0)=>dealRows()[index].querySelector('[data-deal-period="'+period+'"]');
const values=()=>['current','prior'].map(period=>dealRows().reduce((sum,r)=>sum+Number(r.querySelector('[data-deal-period="'+period+'"]').dataset.count),0));
const period=(key,value)=>d.querySelector(`[data-pal-period="${key}"][data-value="${value}"]`).click();
pal.overview(rows);
assert.deepEqual(values(),[2,2]);assert.equal(pal.getRows('newDealsChart').length,4);
assert.match(d.querySelector('.pal-variance').textContent,/unavailable/);
assert.equal(d.querySelector('#ch-content').children[0].className,'pal-metrics');assert.equal(d.querySelector('.pal-summary'),null);assert.equal(d.querySelector('.pal-metrics').nextElementSibling.id,'pal-snapshot','Coverage follows KPI cards');
assert.equal(d.querySelector('#newDealsChart').closest('.ch-card').nextElementSibling.id,'pal-pipeline','New deals and Pending Closure remain adjacent');
assert.equal(root._exportRows.length,5);assert.equal(d.querySelector('#ch-download').disabled,false);assert.equal(d.querySelectorAll('#pal-snapshot [data-pal-rows]').length,4);
assert.ok(d.querySelector('#pal-pipeline > .credit-data-table-scroll > .credit-data-table'));
assert.equal(d.querySelectorAll('#pal-snapshot .pal-coverage-stat').length,4);
for(const [key,expected,count] of [['facilities',rows,5],['relationships',rows,5],['caexpired',[rows[0]],1],['expired',[rows[1]],1]]){const stat=d.querySelector('#pal-snapshot [data-pal-rows="'+key+'"]');assert.equal(Number(stat.querySelector('strong').textContent),count);stat.click();assert.equal(clicked[0],key);assert.deepEqual(clicked[1],expected,key+' keeps the exact source cohort');assert.equal(clicked[3],stat,'Coverage opens from its own card');}
assert.equal(d.querySelectorAll('[data-pal-navigate]').length,0);assert.equal(pal.getRows('pal-pipeline').length,2);
assert.deepEqual([...d.querySelectorAll('#ch-content section.ch-card')].map(el=>el.querySelector('.ch-chart')?.id||el.id),['pal-snapshot','facilityTrendChart','creditClassificationChart','newDealsChart','pal-pipeline','relationshipChart','monitoringPriorityChart','covenantMonitoringChart','ccmRegionalChart','pal-trends']);
assert.equal(d.querySelector('#relationshipChart').previousElementSibling.querySelector('strong').textContent,'$500');
assert.equal(d.querySelector('#rotceChart'),null);assert.equal(configs.relationshipChart.series[1].type,'scatter');assert.equal(configs.relationshipChart.series[1].yAxis,1);assert.equal(configs.relationshipChart.yAxis[1].plotLines[0].value,.12);assert.ok(d.querySelector('#newDealsChart.ch-chart.pal-deals-list'));assert.equal(configs.newDealsChart,undefined,'The ranked list needs no Highcharts instance');
period('dealPeriod','mtd');assert.deepEqual(values(),[1,1]);period('dealPeriod','qtd');assert.deepEqual(values(),[1,1]);period('dealPeriod','wtd');assert.deepEqual(values(),[1,1]);
period('pendingPeriod','qtd');assert.equal(pal.getRows('pipeline').length,1);period('pendingPeriod','wtd');assert.equal(pal.getRows('pipeline').length,0);
period('approvalPeriod','wtd');assert.equal(pal.getRows('creditClassificationChart').length,1);
period('dealPeriod','ytd');assert.equal(d.querySelector('[data-pal-setting="dealMeasure"]'),null);assert.deepEqual(values(),[2,2]);assert.equal(configs.creditClassificationChart.chart.type,'pie');assert.equal(d.querySelector('[data-pal-setting="covenants"]'),null);assert.equal(d.querySelectorAll('[data-pal-period="covenants"]').length,2);assert.equal(configs.relationshipChart.series[0].color,'#255BE3');
dealButton('current').click();assert.equal(clicked[0],'newDealsChart');assert.deepEqual(clicked[1],rows.filter(r=>r.pal_new_ytd));assert.equal(clicked[2],'Real Estate · Current period');
dealButton('prior').click();assert.equal(clicked[0],'newDealsChart');assert.deepEqual(clicked[1],rows.filter(r=>r.pal_prior_ytd));assert.equal(clicked[2],'Real Estate · Prior year to date');
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
console.log('PASS: four periods, pending and approval cohorts, count-only new deals, approval labels, combined exposure/ROTCE axes, covenant segments, point drill-through, compact coverage stats and exact cohorts, shared pipeline table, export/empty state, Monday/Tuesday comparisons, filtered balances, missing/incomplete/zero/negative and mixed-date history.');

const monitorOnly=w.CreditPAL({root,filtered:r=>r,data:()=>({monitoring})});assert.equal(monitorOnly.getAnalysis().portfolio.length,0);assert.equal(monitorOnly.getAnalysis().monitoring.length,3);

// Both measures must preserve the same rank and source population; missing ROTCE is not zero.
pal.settings.management='';rows[0].rotce=null;pal.overview(rows);
assert.equal(configs.relationshipChart.series[1].data[0].y,null);
configs.relationshipChart.series[0].data.forEach((p,i)=>assert.deepEqual(p.custom.rows,configs.relationshipChart.series[1].data[i].custom.rows));
rows[0].product='Aircraft Finance';pal.overview(rows);assert.deepEqual(values(),[2,2]);assert.equal(dealRows().length,2);
dealButton('current').click();assert.equal(clicked[1].length,1);

// Eleven products remain available with a common current-period scale and exact comparison cohorts.
{
 const saved=rows.slice(),longName='Very long <Product> & "Specialist" Lending — International Portfolio';
 const specs=[['Zulu',5,1],['Alpha',5,3],['Beta',5,3],[longName,2,1],['Current only',3,0],['Prior only',0,4],['Product A',1,1],['Product B',2,1],['Product C',3,1],['Product D',4,1],['Product E',1,2]];
 const expanded=specs.flatMap(([product,now,prior],i)=>[...Array.from({length:now},(_,j)=>row('new-'+i+'-'+j,{product,pal_new_ytd:true},100)),...Array.from({length:prior},(_,j)=>row('prior-'+i+'-'+j,{product,pal_prior_ytd:true},100))]);
 // Duplicate source rows remain drillable but must not inflate the distinct facility count.
 expanded.push({...expanded[0]});
 try{
  rows.splice(0,rows.length,...expanded);pal.overview(rows);
  const ranked=[...specs].sort((a,b)=>b[1]-a[1]||b[2]-a[2]||a[0].localeCompare(b[0])),rendered=dealRows();
  assert.equal(rendered.length,11,'All products are shown; no top-N truncation');
  assert.deepEqual(rendered.map(r=>r.querySelector('.pal-deal-label').textContent),ranked.map(s=>s[0]));
  assert.equal(d.querySelector('#newDealsChart Product'),null,'Product text is escaped, never markup');
  assert.ok(d.querySelector('#newDealsChart .pal-deal-scroll'));
  assert.equal(pal.getRows('newDealsChart').length,expanded.length,'Supporting records retain both full cohorts and duplicate source rows');
  for(const [index,productRow] of rendered.entries()){
   const [product,now,prior]=ranked[index];assert.equal(Number(productRow.dataset.dealIndex),index);
   assert.ok(Math.abs(parseFloat(productRow.querySelector('.pal-deal-track').style.getPropertyValue('--deal-share'))-now/5*100)<.001,'Track length uses the largest current count across every product');
   for(const [which,flag,count,label] of [['current','pal_new_ytd',now,'Current period'],['prior','pal_prior_ytd',prior,'Prior year to date']]){
    const button=productRow.querySelector('[data-deal-period="'+which+'"]');assert.equal(Number(button.dataset.count),count);assert.equal(button.disabled,count===0);assert.equal(button.tagName,'BUTTON');
    const before=clicked;button.click();
    if(!count){assert.equal(clicked,before,'Zero counts do not start empty drills');continue;}
    assert.equal(clicked[0],'newDealsChart');assert.deepEqual(clicked[1],expanded.filter(r=>r.product===product&&r[flag]),'Each period opens only its own exact source rows');assert.equal(clicked[2],product+' · '+label);
   }
  }
  pal.overview(expanded.filter(r=>r.pal_prior_ytd));assert.equal(dealRows().length,10,'Prior-only products remain available');
  assert.ok(dealRows().every(r=>r.querySelector('[data-deal-period=current]').disabled));
  assert.ok(dealRows().every(r=>parseFloat(r.querySelector('.pal-deal-track').style.getPropertyValue('--deal-share'))===0));
  assert.doesNotMatch(d.querySelector('#newDealsChart').innerHTML,/NaN|Infinity/,'All-zero current baseline has finite empty tracks');
 }finally{rows.splice(0,rows.length,...saved);pal.overview(rows);}
}
console.log('PASS: eleven ranked products, tie ordering, common current scale, prior-only products, distinct counts, escaped labels, zero states and exact current/prior source drills.');

// Bubble coordinates and area keep separate, exact source quantities.
monitoring[0].coming_due=true;monitoring[1].coming_due=true;monitoring[2].action_required=true;
pal.overview(rows);
const summary=configs.monitoringPriorityChart;
assert.equal(summary.chart.type,'scatter');assert.equal(summary.chart.inverted,undefined);
assert.equal(summary.xAxis.title.text,'Actions required');assert.equal(summary.yAxis.title.text,'Critical actions');
assert.equal(summary.series.length,6);assert.ok(summary.chart.height>=460);
assert.equal(configs.relationshipChart.plotOptions.bar.dataLabels.enabled,false);
const priorityPoints=summary.series.flatMap(series=>series.data),largest=Math.max(...priorityPoints.map(p=>p.z));
for(const series of summary.series){const p=series.data[0],rs=monitoring.filter(r=>r.category===p.custom.category&&(r.action_required||r.coming_due));
 assert.equal(p.marker.symbol,'circle');assert.equal(p.name,series.name);assert.deepEqual(p.custom.rows,rs);
 assert.equal(p.x,rs.filter(r=>r.action_required).length);assert.equal(p.y,rs.filter(r=>r.action_required&&r.critical).length);assert.equal(p.z,rs.length);
 assert.equal(p.custom.upcoming,rs.filter(r=>!r.action_required&&r.coming_due).length);assert.equal(p.z,p.x+p.custom.upcoming,'Critical subset must not inflate bubble size');
 assert.ok(Math.abs(p.marker.radius**2/(42**2)-p.z/largest)<1e-12,'Circle area is proportional to count');
 assert.equal(p.marker.enabled,p.z>0);assert.equal(p.dataLabels.enabled,p.z>0,'Zero categories have no visible bubble or label');
 assert.equal(summary.legend.labelFormatter.call({name:series.name,options:series}),series.name+' · '+p.z);
}
assert.deepEqual(priorityPoints.reduce((n,p)=>[n[0]+p.x,n[1]+p.y,n[2]+p.custom.upcoming,n[3]+p.z],[0,0,0,0]),[2,1,1,3]);
assert.equal(pal.getRows('monitoringPriorityChart').length,3);
const item=priorityPoints.find(p=>p.z===2);summary.plotOptions.series.point.events.click.call({name:item.name,options:item});assert.equal(clicked[0],'monitoringPriorityChart');assert.deepEqual(clicked[1],item.custom.rows);
assert.match(summary.tooltip.formatter.call({point:item}),/Actions required: 1/);assert.match(summary.tooltip.formatter.call({point:item}),/Total items \/ bubble size: 2/);
assert.match(summary.accessibility.point.descriptionFormatter(item),/1 critical, 1 upcoming; 2 total items/);
assert.equal(summary.plotOptions.scatter.dataLabels.formatter.call({point:item}),'INS');
scope='NAM';pal.overview(rows);assert.equal(pal.getRows('monitoringPriorityChart').length,2);scope='';
console.log('PASS: category bubbles use exact action/critical coordinates, proportional count area, zero/empty scopes, readable labels, filtered populations and exact point records.');

// Coincident bubbles remain independently reachable through their category legends.
{
 const savedLength=monitoring.length,savedScope=scope,savedClicked=clicked;
 const ca={category:'CA',region:'NAM',as_of_date:'2026-09-01',action_required:true,critical:false},facility={...ca,category:'FACILITY'};
 try{
  monitoring.push(ca,facility);
  for(const [selectedScope,label,groupCount] of [['NAM','CA / FAC',2],['','3 groups',3]]){
   scope=selectedScope;pal.overview(rows);
   const collision=configs.monitoringPriorityChart,seriesFor=category=>collision.series.find(s=>s.data[0].custom.category===category);
   const caSeries=seriesFor('CA'),facilitySeries=seriesFor('FACILITY');
   assert.deepEqual([caSeries.data[0].x,caSeries.data[0].y,caSeries.data[0].marker.radius],[facilitySeries.data[0].x,facilitySeries.data[0].y,facilitySeries.data[0].marker.radius],'The fixture must produce completely coincident bubbles');
   const samePosition=collision.series.flatMap(s=>s.data).filter(p=>p.z>0&&p.x===caSeries.data[0].x&&p.y===caSeries.data[0].y);
   assert.equal(samePosition.length,groupCount);
   assert.equal(samePosition.filter(p=>p.dataLabels.enabled).length,1,'A shared coordinate has one readable combined label');
   assert.equal(samePosition.at(-1).dataLabels.enabled,true,'Only the topmost point labels a shared coordinate');
   assert.equal(collision.plotOptions.scatter.dataLabels.formatter.call({point:samePosition.at(-1)}),label);
   for(const p of samePosition){
    assert.deepEqual(Array.from(p.custom.overlap).sort(),Array.from(samePosition,other=>other.name).sort());
    const tooltip=collision.tooltip.formatter.call({point:p});
    assert.ok(tooltip.includes('Same position: '+p.custom.overlap.join(', ')),'Every coincident point discloses all categories sharing its position');
    assert.ok(tooltip.includes('Select a legend category for its records.'));
   }
   assert.equal(collision.legend.enabled,true,'Categories remain available independently of their overlapping circles');
   const legendClick=collision.plotOptions.series.events.legendItemClick;
   for(const [series,expected] of [[caSeries,[ca]],[facilitySeries,[facility]],[seriesFor('COVENANTS'),[]]]){
    const legendSeries={name:series.name,options:series,visible:true,setVisible(){assert.fail('Category drill must not toggle series visibility');}};
    const result=legendClick.call(legendSeries);
    assert.equal(result,false,'Returning false cancels the native legend visibility toggle');
    assert.equal(legendSeries.visible,true);assert.equal(clicked[0],'monitoringPriorityChart');
    assert.deepEqual(clicked[1],expected,'Each legend opens only its exact category source records, including empty categories');
    assert.ok(clicked[2].includes(series.name),'The selected category identifies the drill');
   }
  }
 }finally{monitoring.length=savedLength;scope=savedScope;pal.overview(rows);clicked=savedClicked;}
}
console.log('PASS: two- and three-category collisions use one combined label and explanatory tooltip; coincident and zero-category legends retain exact independent drills without hiding series.');

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

// Coverage compares distinct entities in complete, like-for-like facility snapshots.
// Repeated source associations must not inflate the displayed counts or their deltas.
{
 const coverageDOM=new JSDOM('<div id="credit-hub"><span id="ch-filter-status"></span><button id="ch-download"></button><div id="ch-content"></div></div>',{runScripts:'outside-only'});
 const cw=coverageDOM.window,cr=cw.document.querySelector('#credit-hub');
 cw.Highcharts={chart(el){return{renderTo:el};}};
 for(const file of ['credit-data-cache.js','credit-covenant-risk.js','credit-snapshots.js','credit-pal.js'])cw.eval(fs.readFileSync(path.join(__dirname,'../attachments',file),'utf8'));
 const facility=(id,relationship,options={})=>row(id,{relationship_id:relationship,source_id:'PORT',pal_ca_expired:false,pal_facility_expired:false,...options},100);
 const current=[facility('F1','R1',{pal_ca_expired:true}),facility('F1','R1',{pal_ca_expired:true}),facility('F2','R1',{pal_facility_expired:true}),facility('F3','R2',{management_status:'DM',pal_ca_expired:true}),facility('F4','R3',{region:'LATAM',pal_ca_expired:true,pal_facility_expired:true})];
 const previous=[facility('F1','R1',{pal_facility_expired:true}),facility('F1','R1',{pal_facility_expired:true}),facility('F2','R1',{pal_ca_expired:true}),facility('F3','R2',{management_status:'DM'}),facility('F5','R4',{region:'LATAM',pal_ca_expired:true,pal_facility_expired:true}),facility('F6','R5',{region:'LATAM',pal_ca_expired:true,pal_facility_expired:true})].map(r=>({...r,as_of_date:'2026-08-28'}));
 const source=(date,count)=>({source_id:'PORT',domain:'PORTFOLIO',coverage:'ALL_OBLIGATIONS',as_of_date:date,record_count:count});
 const priorRelease={datasets:{portfolio:previous,monitoring:[],activity:[],sources:[source('2026-08-28',previous.length)]}};
 const coverageData={portfolio:current,monitoring:[],history:[],sources:[source('2026-08-31',current.length)],previous:priorRelease};
 const scopeValues={region:''};let coverageClick;
 const selected=rs=>rs.filter(r=>!scopeValues.region||r.region===scopeValues.region);
 const coveragePAL=cw.CreditPAL({root:cr,esc,num:String,money:n=>'$'+n,pct:String,sum:(rs,k)=>rs.reduce((n,r)=>n+(Number(r[k])||0),0),unique:(rs,k)=>new Set(rs.map(r=>r[k]).filter(Boolean)).size,filtered:selected,state:()=>scopeValues,data:()=>coverageData,addChart(){},openChart(...args){coverageClick=args;},render(){coveragePAL.overview(selected(coverageData.portfolio));}});
 const renderCoverage=()=>coveragePAL.overview(selected(coverageData.portfolio));
 const stat=key=>cr.querySelector('#pal-snapshot [data-pal-rows="'+key+'"]');
 const metric=key=>({value:stat(key).querySelector('.pal-coverage-value').textContent,badge:stat(key).querySelector('.pal-coverage-change').textContent,footer:stat(key).querySelector('.pal-coverage-comparison').textContent});
 const check=(key,value,badge,delta)=>{const actual=metric(key);assert.equal(actual.value,String(value),key+' distinct count');assert.equal(actual.badge,badge,key+' percentage');assert.equal(actual.footer,delta+' vs previous weekday',key+' absolute delta');};
 const keys=['facilities','relationships','caexpired','expired'];
 const unavailable=()=>keys.forEach(key=>{assert.equal(metric(key).badge,'Unavailable',key);assert.equal(metric(key).footer,'Prior weekday unavailable',key);});
 renderCoverage();
 check('facilities',4,'−20.0%','−1');check('relationships',3,'−25.0%','−1');check('caexpired',3,'0.0%','0');check('expired',2,'−33.3%','−1');
 for(const key of keys){const expected=key==='caexpired'?current.filter(r=>r.pal_ca_expired===true):key==='expired'?current.filter(r=>r.pal_facility_expired===true):current;stat(key).click();assert.equal(coverageClick[0],key);assert.deepEqual(coverageClick[1],expected,key+' retains current source records for drill-through');}
 scopeValues.region='NAM';renderCoverage();
 check('facilities',3,'0.0%','0');check('relationships',2,'0.0%','0');check('caexpired',2,'+100.0%','+1');check('expired',1,'0.0%','0');
 coveragePAL.settings.management='CM';renderCoverage();
 check('facilities',2,'0.0%','0');check('relationships',1,'0.0%','0');check('caexpired',1,'0.0%','0');check('expired',1,'0.0%','0');
 scopeValues.region='';renderCoverage();check('facilities',3,'−25.0%','−1');check('caexpired',2,'−33.3%','−1');
 coveragePAL.settings.management='';
 coverageData.previous=null;
 coverageData.history=current.map(r=>({...r,as_of_date:'2026-08-28',comparison_ready:true}));
 renderCoverage();unavailable(); // Prepared balance history is not distinct-entity history.
 coverageData.previous=priorRelease;
 coverageData.previous={datasets:{...priorRelease.datasets,sources:[source('2026-08-27',previous.length)]}};renderCoverage();unavailable();
 coverageData.previous={datasets:{...priorRelease.datasets,sources:[{...source('2026-08-28',previous.length),coverage:'EXCEPTIONS_ONLY'}]}};renderCoverage();unavailable();
 coverageData.previous=priorRelease;
 coverageData.portfolio=current.map((r,i)=>i===0?{...r,as_of_date:'2026-08-30'}:r);renderCoverage();unavailable();
 coverageData.portfolio=current;
 coverageData.previous={datasets:{...priorRelease.datasets,portfolio:[],sources:[source('2026-08-28',0)]}};
 renderCoverage();keys.forEach(key=>{assert.equal(metric(key).badge,'New',key+' zero baseline');assert.doesNotMatch(metric(key).footer,/NaN|Infinity/);});
 scopeValues.region='NO_MATCH';renderCoverage();keys.forEach(key=>check(key,0,'0.0%','0'));
 const snapshots=cw.CreditSnapshots;cw.CreditSnapshots=undefined;renderCoverage();unavailable();cw.CreditSnapshots=snapshots;
 coverageDOM.window.close();
 console.log('PASS: coverage distinct counts and exact drills; current/prior page and PAL filters; positive, negative, zero and new populations; missing, stale, changed-coverage and mixed-date comparisons; no aggregate-history fallback.');
}
