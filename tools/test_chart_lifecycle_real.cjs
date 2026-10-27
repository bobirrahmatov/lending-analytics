/* Real Highcharts and dashboard controls: repeated drill, close and reset teardown. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM,VirtualConsole}=require('jsdom');
const attachments=path.resolve(__dirname,'../attachments');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function mount(page){
 const errors=[],virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error.message));
 const dom=new JSDOM('<div id="credit-hub"></div>',{url:'http://localhost/'+page,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole}),w=dom.window,root=w.document.querySelector('#credit-hub');
 w.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.CREDIT_CONFIG={mode:'demo',page};
 for(const file of ['credit-ui.js','highcharts.js','highcharts-accessibility.js','credit-demo-data.js','credit-comparison-demo.js','credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-portfolio-journey.js','credit-pal.js','credit-covenant-risk.js','credit-snapshots.js','credit-monitoring.js','credit-covenants.js','credit-data-cache.js','credit-dashboard.js'])w.eval(fs.readFileSync(path.join(attachments,file),'utf8'));
 w.Highcharts.setOptions({chart:{animation:false},plotOptions:{series:{animation:false}}});
 const factory=w.CreditChartDetails;let details;w.CreditChartDetails=opts=>(details=factory(opts));await w.CreditHub.mount(root);
 const live=()=>w.Highcharts.charts.filter(Boolean);
 return{dom,w,root,errors,live,get details(){return details;}};
}
async function settled(root){for(let i=0;i<100;i++){await pause(10);if(!root.querySelector('#ch-content[aria-busy]'))return;}assert.fail('Dashboard render did not settle');}
function visible(el){return el&&!el.closest('[hidden]');}
(async()=>{
 for(const page of ['portfolio','overview','COVENANTS','CCM','INSURANCE','APPRAISALS','activity']){
  const e=await mount(page),{root,w}=e;assert.equal(root.querySelector('.ch-error'),null);const base=e.live().length;assert.ok(base>0);
  for(let cycle=0;cycle<4;cycle++){
   const chart=e.live().find(c=>c.series.some(s=>s.points.some(p=>p.options.custom?.rows?.length))),point=chart.series.flatMap(s=>s.points).find(p=>p.options.custom?.rows?.length);point.firePointEvent('click');
   let local=[...root.querySelectorAll('.cd-inline-drill')].find(visible);assert.ok(local,page+' chart drill');
   const data=local.closest('.ch-card').querySelector('[data-pj-inline-view=data],[data-inline-mode=records]');assert.ok(data);data.click();
   local.querySelector('.cd-records [data-ct-row-drill]').click();assert.ok(root.querySelector('.cd-table-drill'));
   // Unwind all child frames through the top-level reset, including real charts
   // retained beneath a table frame. No detached live Highcharts may survive.
   root.querySelector('#ch-reset').click();await settled(root);
   assert.equal(root.querySelector('.cd-inline-drill'),null);assert.equal(e.details.tableExportRows(),null);assert.equal(e.live().length,base,page+' reset restores the original live chart count');assert.ok(e.live().every(c=>c.renderTo.isConnected));
   const expand=root.querySelector('[data-chart-expand]');expand.click();const overlay=root.querySelector('dialog.ca-overlay');assert.ok(overlay);
   const source=overlay.querySelector('.cd-source-card .cd-records [data-ct-row-drill]');assert.ok(source);source.click();assert.ok(overlay.querySelector('.cd-table-drill'));
   overlay.querySelector('.ca-overlay-close').click();await pause(10);
   assert.equal(root.querySelector('dialog.ca-overlay'),null);assert.equal(root.querySelector('.cd-inline-drill'),null);assert.equal(e.details.exportRows(),null);assert.equal(e.live().length,base,page+' close releases expanded and nested charts');assert.ok(e.live().every(c=>c.renderTo.isConnected));
   if(page==='portfolio')for(const mode of ['data','charts']){root.querySelector('[data-portfolio-view='+mode+']').click();await settled(root);assert.ok(e.live().every(c=>c.renderTo.isConnected));}
   if(page==='portfolio')assert.equal(e.live().length,base,'Charts tab restores every portfolio chart');
  }
  const localSetting=root.querySelector('[data-monitor-setting]');if(localSetting){const key=localSetting.dataset.monitorSetting;localSetting.value=page==='INSURANCE'?'all':'31–45';localSetting.dispatchEvent(new w.Event('change'));await settled(root);assert.equal(root.querySelector('[data-monitor-setting="'+key+'"]').value,page==='INSURANCE'?'all':'31–45');assert.ok(e.live().every(c=>c.renderTo.isConnected));root.querySelector('#ch-reset').click();await settled(root);assert.equal(root.querySelector('[data-monitor-setting="'+key+'"]').value,page==='INSURANCE'?'10':'all');assert.equal(e.live().length,base,'Local chart settings reset cleanly');}
  assert.deepEqual(e.errors,[],page+' has no DOM event errors');e.dom.window.close();
 }
 console.log('PASS real Highcharts lifecycle: 7 pages × 4 drill/reset/expand/close cycles, real dashboard controls, nested table frames, Portfolio view tabs, product-aging and specialist selectors, stable live chart counts and no detached charts.');
})().catch(error=>{console.error(error);process.exitCode=1;});
