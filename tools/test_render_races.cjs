/* Real Highcharts and dashboard controls: overlapping renders must not strand destroyed charts. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const A=path.resolve(__dirname,'../attachments'),pause=()=>new Promise(resolve=>setTimeout(resolve,40));
async function mount(page){
 const dom=new JSDOM('<div id="credit-hub"></div>',{url:'http://localhost/'+page,runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,root=w.document.querySelector('#credit-hub');
 w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.CREDIT_CONFIG={mode:'demo',page};
 const errors=[];w.addEventListener('error',event=>errors.push(event.error||event.message));
 for(const name of ['credit-ui.js','highcharts.js','highcharts-accessibility.js','credit-demo-data.js','credit-comparison-demo.js','credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-portfolio-journey.js','credit-pal.js','credit-covenant-risk.js','credit-snapshots.js','credit-monitoring.js','credit-covenants.js','credit-data-cache.js','credit-dashboard.js'])w.eval(fs.readFileSync(path.join(A,name),'utf8'));
 await w.CreditHub.mount(root);assert.equal(root.querySelector('.ch-error'),null,root.textContent);
 const live=()=>w.Highcharts.charts.filter(c=>c?.renderTo?.isConnected);
 const ready=async()=>{await pause();assert.equal(root.querySelector('[aria-busy="true"]'),null,'Busy controls must settle');assert.equal(root.querySelector('.ch-error'),null,root.textContent);assert.deepEqual(errors,[]);};
 return{dom,w,root,live,ready};
}
(async()=>{
 const e=await mount('portfolio'),{root,w,live,ready}=e,baseline=live().length;
 const chart=id=>live().find(c=>c.renderTo.id===id);
 // Two unrelated period controls fire before either asynchronous render commits.
 root.querySelector('[data-pal-period="approvalPeriod"][data-value="ytd"]').click();
 root.querySelector('[data-pal-period="dealPeriod"][data-value="mtd"]').click();
 await ready();assert.ok(chart('creditClassificationChart'),'Approval chart survives a superseding New deals render');assert.ok(root.querySelector('#newDealsChart .pal-deal-row'),'New deals list survives a superseding render');assert.equal(chart('newDealsChart'),undefined,'Ranked list does not allocate a chart');assert.equal(live().length,baseline,'No unrelated chart is destroyed');
 assert.equal(root.querySelector('[data-pal-period="approvalPeriod"][data-value="ytd"]').getAttribute('aria-pressed'),'true');
 assert.equal(root.querySelector('[data-pal-period="dealPeriod"][data-value="mtd"]').getAttribute('aria-pressed'),'true');
 assert.equal([...root.querySelectorAll('#newDealsChart [data-deal-period=current]')].reduce((total,b)=>total+Number(b.dataset.count),0),w.CREDIT_DEMO.datasets.portfolio.filter(r=>r.pal_new_mtd).length,'The list reflects the latest selected period');
 // Reset cannot lose its full-page update when a partial request follows it.
 root.querySelector('#ch-reset').click();root.querySelector('[data-pal-period="dealPeriod"][data-value="qtd"]').click();await ready();assert.equal(live().length,baseline,'Reset followed by a partial update leaves every chart live');assert.ok(root.querySelector('#newDealsChart .pal-deal-row'),'Reset retains the ranked list');
 // A newer full view wins over queued partial charts; switching back fully rebuilds.
 root.querySelector('[data-pal-period="approvalPeriod"][data-value="ytd"]').click();root.querySelector('[data-portfolio-view="data"]').click();await ready();assert.ok(root.querySelector('#ch-table table'));assert.equal(live().length,0);
 root.querySelector('[data-portfolio-view="charts"]').click();await ready();assert.equal(live().length,baseline);e.dom.window.close();
 const c=await mount('COVENANTS');
 const exportBefore=c.root._exportRows;c.root.querySelector('[data-cov-setting=\"activity\"][data-value=\"DELETED\"]').click();await c.ready();assert.equal(c.root._exportRows,exportBefore,'Unrelated chart tabs preserve register export');assert.equal(c.root.querySelector('#ch-download').disabled,false);
 c.root.querySelector('[data-cov-setting="view"][data-value="coming"]').click();c.root.querySelector('[data-cov-setting="activity"][data-value="WAIVED"]').click();await c.ready();
 assert.ok(c.live().find(x=>x.renderTo.id==='cov-aging'),'Covenant status chart survives concurrent activity tab');assert.ok(c.live().find(x=>x.renderTo.id==='cov-activity'));
 c.root.querySelector('[data-cov-setting="view"][data-value="past"]').click();c.root.querySelector('[data-cov-setting="view"][data-value="coming"]').click();await c.ready();assert.equal(c.root.querySelector('[data-cov-setting="view"][data-value="coming"]').getAttribute('aria-pressed'),'true','Newest tab request wins');
 // Reset clears column filters as well as page filters and global search.
 const column=c.root.querySelector('#ch-table [data-ct-search]');column.value='NO MATCH';column.dispatchEvent(new c.w.Event('input'));assert.equal(c.root._exportRows.length,0);
 c.root.querySelector('[data-cov-setting=\"view\"][data-value=\"coming\"]').click();c.root.querySelector('#ch-reset').click();await c.ready();assert.equal(c.root.querySelector('[data-cov-setting=\"view\"][data-value=\"past\"]').getAttribute('aria-pressed'),'true','Reset wins over previously queued tab');assert.ok(c.root._exportRows.length>0,'Reset clears advanced table filters');assert.equal(c.root.querySelector('#ch-table [data-ct-search]').value,'');c.dom.window.close();
 console.log('PASS real Highcharts render races: concurrent chart tabs, full Reset plus partial update, Charts/Data switching, latest Covenant tab and complete table reset.');
})().catch(error=>{console.error(error);process.exitCode=1;});
