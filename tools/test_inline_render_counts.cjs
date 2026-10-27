/* Each local view transition builds its table once; context joins are not repeated. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const attachments=path.resolve(__dirname,'../attachments');
(async()=>{
 const dom=new JSDOM('<div id="credit-hub"></div>',{url:'http://localhost/CA',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,root=w.document.querySelector('#credit-hub');
 w.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.CREDIT_CONFIG={mode:'demo',page:'CA'};w.WCSUI={enhance(){},closePopover(){}};
 for(const file of ['credit-demo-data.js','credit-comparison-demo.js','credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-portfolio-journey.js','credit-pal.js','credit-covenant-risk.js','credit-snapshots.js','credit-monitoring.js','credit-covenants.js','credit-data-cache.js','credit-dashboard.js'])w.eval(fs.readFileSync(path.join(attachments,file),'utf8'));
 w.Highcharts={chart(el,o){return{renderTo:el,options:o,chartHeight:320,xAxis:[{categories:o.xAxis?.categories||[]}],series:o.series.map(s=>({...s,options:s,data:s.data.map(p=>({...p,options:p}))})),setSize(){},reflow(){},redraw(){},update(){},destroy(){}};}};
 let renders=0,contextBuilds=0,details;const decorate=w.CreditTables.decorate,factory=w.CreditChartDetails;
 w.CreditTables.decorate=opts=>{if(opts.table.closest('.cd-inline-drill'))renders++;return decorate(opts);};
 w.CreditChartDetails=opts=>{const related=opts.renderRelated;return details=factory({...opts,renderRelated:args=>{contextBuilds++;return related(args);}});};
 await w.CreditHub.mount(root);assert.equal(root.querySelector('.ch-error'),null);
 const original=root.querySelector('#ch-table table'),row=root._exportRows[0];
 original.querySelector('[data-ct-row-drill]').click();let frame=root.querySelector('.cd-table-drill');assert.ok(frame.querySelector('.pj-leaf'));assert.equal(renders,1,'Terminal entry renders its supporting table once');assert.equal(contextBuilds,1);assert.equal(details.tableExportRows()[0],row);
 const controls=frame.closest('.ch-card');
 for(const mode of ['records','chart','records']){const before=renders;controls.querySelector('[data-inline-mode='+mode+']').click();assert.equal(renders-before,1,'Terminal '+mode+' transition renders once');assert.equal(contextBuilds,1,'Chart/Data switches reuse the exact related context');assert.equal(details.tableExportRows()[0],row);}
 const dataset=frame.querySelector('[data-pj-dataset=facilities]');assert.ok(dataset);let before=renders;dataset.click();assert.equal(renders-before,1,'Related dataset selection renders once');assert.equal(contextBuilds,1);assert.equal(details.tableExportRows()[0].facility_id,row.facility_id);assert.equal(details.tableExportRows()[0].as_of_date,row.as_of_date);
 frame.querySelector('[data-inline-reset]').click();assert.equal(root.querySelector('#ch-table table'),original);
 // A nonterminal group builds its chart and related context, deferring the table until Data.
 renders=0;contextBuilds=0;const cohort=root._exportRows.slice();assert.ok(cohort.length>1);details.drillTable(cohort,'All CA records',original);frame=root.querySelector('.cd-table-drill');assert.equal(frame.querySelector('.pj-leaf'),null);assert.equal(renders,0,'Hidden table is not constructed before Data');assert.equal(contextBuilds,1);
 const groupControls=frame.closest('.ch-card');groupControls.querySelector('[data-inline-mode=records]').click();assert.equal(renders,1);assert.equal(details.tableExportRows().length,cohort.length);groupControls.querySelector('[data-inline-mode=chart]').click();assert.equal(renders,1,'Chart mode does not rebuild a hidden table');groupControls.querySelector('[data-inline-mode=records]').click();assert.equal(renders,2);assert.equal(contextBuilds,1,'Group tabs do not rescan linkage sources');
 frame.querySelector('[data-inline-reset]').click();assert.equal(details.tableExportRows(),null);dom.window.close();
 console.log('PASS inline render counts: one table render per visible transition, no hidden-table rebuild, one related-context build per drill level, exact dataset exports and return.');
})().catch(error=>{console.error(error);process.exitCode=1;});
