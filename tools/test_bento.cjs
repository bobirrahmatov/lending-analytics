// Verify analytical series reconcile to their cohorts, including prior-only groups.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const A=path.resolve(__dirname,'../attachments');
const dom=new JSDOM('<div id="credit-hub"><div id="ch-content"></div></div>',{runScripts:'outside-only'}),w=dom.window,root=w.document.querySelector('#credit-hub');
w.CREDIT_CONFIG={mode:'demo'};
for(const f of ['credit-demo-data.js','credit-comparison-demo.js','credit-workspace.js','credit-pal.js','credit-covenants.js','credit-covenant-risk.js','credit-snapshots.js','credit-monitoring.js'])w.eval(fs.readFileSync(path.join(A,f),'utf8'));
const data={...w.CREDIT_DEMO.datasets,previous:w.CREDIT_DEMO.previous},charts=[];let openedRows=null;
w.Highcharts={chart(el,options){charts.push({id:el.id,options});return{destroy(){},setSize(){}};}};w.CreditDonut=()=>{};
const renderer=w.CreditMonitoring({root,esc:s=>String(s??''),num:n=>String(n),register:()=>'<section id="ch-register"><div class="ch-toolbar"></div></section>',data:()=>data,filters:()=>({}),addChart(){},openChart(id,rows){openedRows=rows},methodology(){},openMetric(){}});
for(const page of ['overview','workload','CA','FACILITY','CCM','INSURANCE','APPRAISALS','activity']){
 charts.length=0;renderer.main(page,page==='activity'?data.activity:data.monitoring);
 assert.equal(charts.length,page==='workload'?5:4,page);
 for(const {id,options:o} of charts){
  const def=renderer.getDefinition(id),sum=s=>s.data.reduce((n,p)=>n+(p.y||0),0);
  if(o.series[0].custom?.comparison){
   assert.equal(o.plotOptions.series.stacking,undefined,id+' grouped comparison');
   assert.equal(sum(o.series[0]),def.rows.length,id+' current total');
   assert.equal(sum(o.series[1]),def.prior.length,id+' prior total');
   const p=o.series[1].data[0];o.plotOptions.series.point.events.click.call({options:p,index:0,series:{name:o.series[1].name}});assert.equal(openedRows,p.custom.rows,'historical points retain their exact prior records');
  }else{
   assert.equal(o.series.reduce((n,s)=>n+sum(s),0),def.rows.length,id+' cohort total');
   for(const s of o.series)for(const p of s.data)assert.equal(p.y,p.custom.rows.length,id+' exact drill-through rows');
  }
  if(o.chart.type==='areaspline')assert.deepEqual([...o.xAxis.categories],[...o.xAxis.categories].sort(),id+' chronological');
 }
 // Every expansion reconciles each point to its supporting records.
 for(const main of charts.slice()){
  const panel=w.document.createElement('div');panel.innerHTML='<div class="cd-chart-slot"></div><div class="cd-analysis-kpis"></div><div class="cd-analysis-grid"></div>';root.append(panel);const a={id:main.id,panel};const before=charts.length;assert.equal(renderer.expanded(a),true);
  for(const {id,options:o} of charts.slice(before)){const def=renderer.getDefinition(id);assert.equal(o.series.reduce((n,s)=>n+s.data.reduce((t,p)=>t+(p.y||0),0),0),def.rows.length,id+' expanded cohort');for(const series of o.series)for(const point of series.data)assert.equal(point.y,point.custom.rows.length,id+' expanded point');if(o.chart.type==='line')assert.equal(o.plotOptions.series.stacking,undefined);}
  panel.remove();
 }
 console.log('PASS',page,'overview and all expansions: series totals, exact cohorts, comparison semantics');
}
// A category only present in history still appears; missing history never becomes zero.
const extra={...data.previous.datasets.monitoring.find(r=>r.category==='CA'&&r.action_required),region:'PRIOR_ONLY'};
data.previous.datasets.monitoring.push(extra);charts.length=0;renderer.main('CA',data.monitoring);
let c=charts.find(c=>c.options.series[0].custom?.comparison);assert.ok(c.options.xAxis.categories.includes('Prior only'));
data.previous=null;charts.length=0;renderer.main('CA',data.monitoring);c=charts.find(c=>c.options.series[0].custom?.comparison);assert.ok(c.options.series[1].data.every(p=>p.y===null));
console.log('PASS historical-only categories and unavailable history');dom.window.close();
