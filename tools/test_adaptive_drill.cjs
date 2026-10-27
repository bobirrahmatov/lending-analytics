const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const A=path.resolve(__dirname,'../attachments');
function fixture(){
 const dom=new JSDOM('<main id="credit-hub"><a class="ch-skip"></a><button id="ch-download"></button><div id="ch-content"><section class="ch-card"><div class="ch-card-head"><h2>Selected population</h2></div><div id="test-chart">Original chart</div></section></div></main>',{url:'http://localhost/test',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,root=w.document.querySelector('main'),charts=[];
 w.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.WCSUI={enhance(){},closePopover(){}};
 for(const file of ['credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-portfolio-journey.js'])w.eval(fs.readFileSync(path.join(A,file),'utf8'));
 w.Highcharts={chart(el,options){const chart={renderTo:el,options,chartHeight:320,series:options.series.map(s=>({...s,data:s.data.map((p,i)=>({...p,options:p,color:options.colors?.[i%options.colors.length]||'#255BE3'}))})),update(){},reflow(){},redraw(){},destroy(){this.destroyed=true;}};charts.push(chart);return chart;}};
 const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
 return {dom,w,root,charts,esc,latest:()=>charts.findLast(c=>!c.destroyed&&c.renderTo.isConnected)};
}
function pointClick(chart,index=0){const p=chart.options.series[0].data[index];chart.options.plotOptions.series.point.events.click.call({options:p});return p.custom.rows;}
const sample=Array.from({length:24},(_,i)=>({item_id:'I'+i,category:i<12?'COVENANTS':'CCM',region:'Region '+(Math.floor(i/4)%3),owner_id:'Owner '+Math.floor(i/2)%2,relationship_id:'R'+Math.floor(i/2),relationship_name:'Relationship '+Math.floor(i/2),facility_id:'F'+i,as_of_date:'2026-08-31',tfa:100,osuc:80,reporting_currency:'USD'}));
// The policy changes only presentation. Non-additive and incomplete totals never become pie charts.
{
 const f=fixture(),m=f.w.CreditPortfolioJourneyModel,decide=overrides=>m.drillChartType({groups:[{y:3},{y:2}],total:5,depth:1,...overrides});
 assert.equal(decide({depth:0}),'bar');assert.equal(decide({}),'pie');
 for(const count of [2,5,6])assert.equal(decide({groups:Array.from({length:count},()=>({y:1})),total:count}),'pie');
 for(const count of [0,1,7])assert.equal(decide({groups:Array.from({length:count},()=>({y:1})),total:count}),'bar');
 for(const overrides of [{ordered:true},{groups:[{y:3},{y:null}]},{groups:[{y:6},{y:-1}]},{groups:[{y:0},{y:0}],total:0},{total:null},{groups:[{y:3},{y:2,other:true}]},{measure:'rotce'},{measure:'spread'},{measure:'relationships',total:4},{measure:'facilities',total:4}])assert.equal(decide(overrides),'bar',JSON.stringify(overrides));
 assert.equal(decide({measure:'tfa',groups:[{y:.1},{y:.2}],total:.3}),'pie','Rounding tolerance must allow valid money totals');
 assert.equal(decide({ordered:true,requested:'line'}),'line');
 const overlap=[{region:'NAM',relationship_id:'R1',facility_id:'F1'},{region:'EMEA',relationship_id:'R1',facility_id:'F2'}],c={measure:'relationships'};
 assert.equal(m.drillChartType({groups:m.groups(overlap,'region',c),total:m.value(overlap,c),measure:c.measure,depth:2}),'bar','A relationship repeated across regions is not a part-to-whole split');
 f.dom.window.close();
}
// Real shared donut wrapper/legend stays inside the same journey and hides with Chart/Data.
{
 const f=fixture(),{w,root,esc,charts}=f,details=w.CreditChartDetails({root,esc,getCharts:()=>[],getRows:()=>sample,getContext:()=>({}),getAnalysis:()=>({})});root._exportRows=sample;
 details.drillInPlace('test-chart',sample,'All actions',root.querySelector('#test-chart'));
 assert.equal(f.latest().options.chart.type,'bar','First breakdown is a bar');assert.equal(details.exportRows().length,24);
 pointClick(f.latest());assert.equal(f.latest().options.chart.type,'pie','Three regions at the next layer use a donut');assert.equal(details.exportRows().length,12);
 let donut=root.querySelector('.cw-donut-layout');assert.ok(donut);assert.equal(donut.querySelectorAll('.cw-donut-row').length,3);assert.equal(donut.querySelector('.cw-donut-center strong').textContent,'12');
 root.querySelector('[data-inline-mode="records"]').click();assert.equal(donut.hidden,true,'Data hides the entire donut, including legend');assert.equal(details.exportRows().length,12);
 root.querySelector('[data-inline-mode="chart"]').click();assert.equal(donut.hidden,false);
 donut.querySelector('.cw-donut-row').click();assert.equal(details.exportRows().length,4,'Accessible donut legend narrows the same source cohort');assert.equal(f.latest().options.chart.type,'pie');
 while(root.querySelector('[data-inline-chart] [data-drill-chart-type], [data-inline-chart][data-drill-chart-type]')){
  const current=f.latest();if(!current||!current.renderTo.isConnected)break;
  pointClick(current);if(details.exportRows().length===1)break;
 }
 assert.equal(details.exportRows().length,1);assert.equal(root.querySelector('.cd-inline-records').hidden,false,'Leaf renders selected supporting records');
 root.querySelector('[data-inline-level="0"]').click();assert.equal(f.latest().options.chart.type,'bar');assert.equal(details.exportRows().length,24);assert.equal(root.querySelector('.cw-donut-layout'),null,'Breadcrumb removes the stale donut wrapper');
 root.querySelector('[data-inline-reset]').click();assert.equal(root.querySelector('.cd-inline-drill'),null);assert.equal(root.querySelector('#test-chart').hidden,false);f.dom.window.close();
}
// Portfolio uses the same policy, keeps facility units and reaches an exact entity.
{
 const f=fixture(),{w,root,esc}=f,rows=Array.from({length:24},(_,i)=>({...sample[i],item_id:undefined,region:i<12?'NAM':'EMEA',relationship_id:'R'+Math.floor(i/2)}));root._exportRows=rows;
 const journey=w.CreditPortfolioJourney({root,esc,getRows:()=>rows,getData:()=>({portfolio:rows}),getScope:()=>({monitoring:[]}),getSettings:()=>({}),methodology(){},getCharts:()=>[]});
 journey.click('facilities',rows,'All facilities',root.querySelector('#test-chart'));
 assert.equal(f.latest().options.chart.type,'bar');pointClick(f.latest());assert.equal(f.latest().options.chart.type,'pie','Six relationships form a valid partition of facilities');
 const donut=root.querySelector('.cw-donut-layout');assert.equal(donut.querySelector('.cw-donut-center strong').textContent,'12');
 root.querySelector('[data-pj-inline-view="data"]').click();assert.equal(donut.hidden,true);assert.equal(journey.exportRows().length,12);root.querySelector('[data-pj-inline-view="charts"]').click();assert.equal(donut.hidden,false);
 donut.querySelector('.cw-donut-row').click();assert.equal(f.latest().options.chart.type,'pie');assert.equal(journey.exportRows().length,2);pointClick(f.latest());assert.ok(root.querySelector('.pj-leaf'));assert.equal(journey.exportRows().length,1);assert.equal(root.querySelector('[data-pj-inline-data]').hidden,false);
 root.querySelector('[data-pj-level="0"]').click();assert.equal(f.latest().options.chart.type,'bar');assert.equal(journey.exportRows().length,24);root.querySelector('[data-pj-reset]').click();assert.equal(root.querySelector('.pj-inline'),null);f.dom.window.close();
}
console.log('PASS adaptive drill: 2–6-group policy, non-additive/negative/missing guards, bar → donut → entity, legend click, Data visibility, breadcrumbs and reset in both shared engines.');
