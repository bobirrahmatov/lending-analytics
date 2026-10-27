const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const A=path.resolve(__dirname,'../attachments');
const sharedCSS=fs.readFileSync(path.resolve(__dirname,'../source/dashboard/dashboard.css'),'utf8');
const sharedRules=[...sharedCSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
const portfolioOrder=['pal-snapshot','facilityTrendChart','creditClassificationChart','newDealsChart','pal-pipeline','relationshipChart','monitoringPriorityChart','covenantMonitoringChart','ccmRegionalChart','pal-trends'];
(async()=>{
for(const page of ['portfolio','trends','deepdive','overview','workload','COVENANTS','CA','FACILITY','CCM','INSURANCE','APPRAISALS','activity']){
 const dom=new JSDOM('<div id="credit-hub"></div>',{url:'http://localhost/pages/'+page.toLowerCase()+'.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,root=d.querySelector('#credit-hub');
 w.localStorage.setItem('wcs-credit-layout-v1:'+w.location.pathname+':',JSON.stringify({[page]:{preset:'focus',hidden:['cov-activity'],wide:['cov-activity'],order:['cov-activity-region','cov-activity']}}));
 w.ResizeObserver=class {observe(){} disconnect(){}};w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};w.CREDIT_CONFIG={mode:'demo',page};w.CreditUI={enhance(){},closePopover(){},dialog(o){const el=d.createElement('div');el.innerHTML=o.body;d.body.append(el);return{element:el,body:el,close(){el.remove()}};}};
 for(const f of ['credit-demo-data.js','credit-comparison-demo.js','credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-portfolio-journey.js','credit-pal.js','credit-covenant-risk.js','credit-snapshots.js','credit-monitoring.js','credit-covenants.js','credit-data-cache.js','credit-dashboard.js'])w.eval(fs.readFileSync(path.join(A,f),'utf8'));
 await w.CreditHub.mount(root);assert.ok(!root.querySelector('.ch-error'),page+': '+root.textContent.slice(-1000));
 if(page==='deepdive'){const sel=root.querySelector('[data-pal-setting=relationship]');sel.value=sel.options[1].value;sel.dispatchEvent(new w.Event('change'));await new Promise(resolve=>setTimeout(resolve,30));}
 assert.equal(root.querySelectorAll('.ch-breadcrumbs').length,1);assert.equal(root.querySelector('.ch-breadcrumbs a').textContent,'Lending Analytics');assert.equal(root.querySelector('[data-breadcrumb-current]').textContent,root.querySelector('#ch-title').textContent);
 const defs=w.CREDIT_DEMO;assert.equal(defs.previous.datasets.portfolio.length,120);assert.ok(defs.datasets.portfolio.every(r=>r.banker_name));
 if(page==='COVENANTS'){assert.equal(root.querySelectorAll('.cov-kpis .cov-kpi').length,4);assert.equal(root.querySelector('.cov-kpi-exposures'),null);assert.equal(root.querySelector('.cov-kpi-facilities'),null);}
 if(['CA','FACILITY','CCM','INSURANCE','APPRAISALS','overview','workload','activity'].includes(page))assert.equal(root.querySelectorAll('.ch-chart').length,page==='workload'?5:4,page);
 assert.equal(root.querySelector('#ch-customize').hidden,true);assert.equal(root.querySelector('[data-layout-control]'),null);assert.equal(root.querySelector('.cw-widget-menu'),null);
 for(const grid of root.querySelectorAll('.cw-widget-grid')){
  assert.equal(grid.dataset.preset,'balanced');
  for(const span of new Set([...grid.children].map(card=>card.dataset.bentoSpan).filter(Boolean))){
   assert.ok(sharedRules.some(([,selector,body])=>selector.includes('.cw-widget-grid[data-preset=balanced]>[data-bento-span="'+span+'"]')&&new RegExp('grid-column\\s*:\\s*span\\s+'+span+'(?:\\s*[;}]|\\s*$)').test(body)),page+': shared layout must define span '+span+' so cards do not collapse into one grid column');
  }
 }
 if(page==='COVENANTS')assert.equal(root.querySelector('[data-widget="cov-activity"]').hidden,false);
 if(page==='overview'){
  assert.equal(root.querySelector('#ch-title').textContent,'Underwriter Summary');
  const actions=defs.datasets.monitoring.filter(r=>r.action_required);
  assert.equal(root.querySelectorAll('.mon-kpis .cov-kpi').length,6);
  assert.deepEqual([...root.querySelectorAll('.ch-chart')].map(e=>e.closest('section').querySelector('h2').textContent),['Action distribution','Underwriter & specialist workload','Regional distribution','Critical items by category']);
  assert.equal(root.querySelector('.ch-insights'),null,'Redundant Summary insight strip is removed');
  assert.equal(root._exportRows.length,actions.length,'Action register retains the full selected action population');
  assert.equal(root.querySelector('#ch-register h2').textContent,'Action register');
  assert.equal(w.CreditHub.validateRows('sources',defs.datasets.sources).length,defs.datasets.sources.length,'Source validation is retained after removing its page');
 }
 if(page==='portfolio'||page==='trends'){
  assert.equal(root.querySelector('#ch-title').textContent,'Portfolio Overview');
  assert.deepEqual([...root.querySelector('.cw-widget-grid').children].map(card=>card.dataset.widget),portfolioOrder,'Portfolio places full-width coverage below KPIs, then expiry/approvals, deals/pending, relationships/priorities and Covenants/CCM');
 }
 assert.equal(root.querySelector('a[href$="sources.html"]'),null);
 const chartIds=[...root.querySelectorAll('[data-chart-expand]')].map(b=>b.dataset.chartExpand);
 for(const id of chartIds){root.querySelector('[data-chart-expand="'+id+'"]').click();const panel=root.querySelector('.cd-detail-page');assert.ok(panel,page+' '+id);assert.ok(panel.closest('dialog[open]'),page+' native analysis shell');assert.equal(d.documentElement.style.overflow,'hidden');assert.equal(root.querySelector('#ch-content').hidden,false,'Overview stays behind backdrop');assert.ok(panel.querySelectorAll('.cd-analysis-kpis>div').length>=3,page+' metrics '+id);assert.ok(panel.querySelector('[data-source-method]'),page+' methodology');assert.ok(panel.querySelector('.cd-records table'),page+' records');assert.equal(panel.querySelector('[data-all-chart]'),null);const sourceHead=panel.querySelector('.cd-source-card .ch-toolbar');assert.ok(sourceHead.querySelector('.ct-global-search'),page+' search beside table title');for(const tab of [...panel.querySelectorAll('[data-table-view]')].filter(el=>el.tagName==='BUTTON')){tab.click();assert.ok(tab.closest('.cc-table-actions'),'Table tabs stay in header');}
 assert.equal(panel.querySelector('[data-close-chart]').textContent.trim(),'Back to dashboard');
 assert.equal(panel.querySelector('.cd-source-card').hidden,false,'Supporting records default visible');const summary=panel.querySelector('.cd-expanded-summary');assert.ok(summary,page+' '+id+' shared summary required');assert.equal(panel.querySelectorAll('.cd-expanded-summary').length,1);assert.equal(summary.querySelector('.cd-summary-caption').textContent,'In this selection');if(summary){assert.equal(summary.nextElementSibling,panel.querySelector('.cd-analysis-kpis'),'Compact summary above KPIs');assert.equal(summary.classList.contains('ch-card'),false);assert.ok(summary.querySelector('dl'));assert.equal(summary.querySelector('button'),null,'Summary has no info button');assert.doesNotMatch(summary.textContent,/\b\d{4}-\d{2}-\d{2}\b/,'Summary omits reporting and comparison dates');assert.equal(panel.querySelector('.cd-analysis-grid .cd-takeaways,.cd-analysis-grid .mon-insights'),null);}const plots=[...panel.querySelectorAll('.ch-chart,.cd-insight-chart')].filter(el=>!el.closest('[hidden]'));assert.ok(plots.length>=2,page+' '+id+' requires at least two charts, got '+plots.length);const close=panel.closest('dialog').querySelector('.ca-overlay-close');assert.equal(close.textContent,'');assert.ok(close.querySelector('svg'));assert.ok(panel.closest('dialog').querySelector('.ca-overlay-download.cw-primary'));
 for(const card of panel.querySelectorAll('.cd-source-card,.cd-insight-table[data-table-mode="detail"]'))assert.equal(card.querySelector('[data-back-dashboard]'),null,page+' no duplicate table return '+id);
 if(page==='COVENANTS'&&['cov-activity','cov-activity-region'].includes(id)){const cards=panel.querySelector('.cd-analysis-grid').children;assert.match(cards[0].textContent,/Deferred activity by month/);assert.match(cards[1].textContent,/Activity by Region/);assert.ok(panel.querySelector('.cd-expanded-summary'));}
 panel.closest('dialog').querySelector('.ca-overlay-close').click();assert.equal(root.querySelector('dialog.ca-overlay'),null);assert.equal(d.documentElement.style.overflow,'');assert.equal(root.querySelector('#ch-content').hidden,false);}
 {for(const button of [...root.querySelectorAll('#ch-content .cov-kpis [data-cov-open],#ch-content .mon-kpis [data-monitor-open]')]){button.click();const panel=root.querySelector('.cd-detail-page');assert.ok(panel);assert.equal(panel.querySelectorAll('.cd-expanded-summary').length,1,'Covenant KPI compact summary');assert.equal(panel.querySelector('.cd-expanded-summary').nextElementSibling,panel.querySelector('.cd-analysis-kpis,.cd-explorer-kpis'));assert.equal(panel.querySelector('.cd-takeaways,.cd-explorer-insights'),null);assert.equal(panel.querySelector('.cd-expanded-summary button'),null);assert.ok([...panel.querySelectorAll('.ch-chart,.cd-insight-chart')].filter(el=>!el.closest('[hidden]')).length>=2,'KPI expansion requires two charts');assert.equal(panel.querySelector('.cd-source-card').hidden,false);assert.doesNotMatch(panel.querySelector('.cd-detail-heading').textContent,/Methodology/);assert.doesNotMatch(panel.querySelector('.cd-expanded-summary').textContent,/\b\d{4}-\d{2}-\d{2}\b/);panel.closest('dialog').querySelector('.ca-overlay-close').click();}}
 console.log('PASS',page,chartIds.length,'expansions');dom.window.close();
}
})().catch(e=>{console.error(e);process.exitCode=1;});
