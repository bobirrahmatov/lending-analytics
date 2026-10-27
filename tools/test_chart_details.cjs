/* DOM lifecycle tests; real rendering and native top-layer behavior are checked in Chrome. */
const {JSDOM}=require('jsdom');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const dom=new JSDOM('<div id="credit-hub"><a class="ch-skip" href="#ch-content"></a><button id="ch-download"></button><button id="ch-customize"></button><div class="ch-actions"><button data-layout-control></button></div><div class="ch-demo"></div><div class="cw-layout-notice" hidden></div><div id="ch-content"></div></div>',{runScripts:'outside-only',url:'http://localhost'});
const w=dom.window,d=w.document,root=d.querySelector('#credit-hub');w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};let dialogOptions;
w.CreditUI={closePopover(){},enhance(){},dialog(options){dialogOptions=options;const el=d.createElement('div');el.innerHTML=options.body;d.body.append(el);return{element:el,body:el,close(){el.remove();options.onClose?.();}};}};
w.eval(fs.readFileSync(path.join(__dirname,'../attachments/credit-workspace.js'),'utf8'));
w.eval(fs.readFileSync(path.join(__dirname,'../attachments/credit-tables.js'),'utf8'));
w.eval(fs.readFileSync(path.join(__dirname,'../attachments/credit-chart-details.js'),'utf8'));
const esc=s=>String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
let records=Array.from({length:31},(_,i)=>({facility_id:'FA'+i,relationship_name:i===0?'<img src=x onerror=alert(1)>':'Client '+i,as_of_date:'2026-08-31',tfa:100+i})),chart;
function render(){d.querySelector('#ch-content').innerHTML='<section class="ch-card"><div class="ch-card-head"><div><h2>New Facilities Approved</h2><p class="ch-card-sub">Eligible approvals</p></div></div><div id="creditClassificationChart" class="ch-chart" style="height:310px"></div></section>';chart={renderTo:d.querySelector('.ch-chart'),chartHeight:310,series:[{name:'Count',options:{},data:[{name:'Loans',y:31}]}],setSize(width,height){this.chartHeight=height;}};}
render();root._exportRows=[{facility_id:'ALL'}];const controller=w.CreditChartDetails({root,esc,getCharts:()=>[chart],getRows:()=>records,getContext:()=>({demo:true,date:'31 Aug 2026',filters:'Region: NAM'})});controller.apply();const original=chart.renderTo;
controller.open('creditClassificationChart');assert.equal(d.querySelector('#ch-content').hidden,false,'Dashboard stays visible behind the overlay');assert.equal(d.querySelector('.cd-detail-page .ch-chart'),original);assert.equal(chart.renderTo.style.height,'320px');assert.ok(d.querySelector('dialog.ca-overlay[open]'));assert.equal(d.documentElement.style.overflow,'hidden');assert.equal(controller.exportRows().length,31);assert.equal(d.querySelectorAll('.cd-records tbody tr').length,10);assert.equal(d.querySelector('.cd-records img'),null);
assert.ok(original.closest('.cd-chart-slot').parentElement.classList.contains('cd-analysis-grid'));
for(const card of d.querySelectorAll('.cd-insight-card'))assert.ok(card.querySelector('[data-section-method]'));
assert.equal(d.querySelector('.cd-analysis-kpis').parentElement.className,'cd-detail-page cd-pal-analysis');
assert.ok(d.querySelector('.cd-analysis-kpis').nextElementSibling.classList.contains('cd-analysis-grid'));const summary=d.querySelector('.cd-expanded-summary');assert.equal(summary.nextElementSibling,d.querySelector('.cd-analysis-kpis'));assert.equal(summary.querySelector('button'),null);
assert.equal(d.querySelectorAll('.cd-analysis-metric [data-section-method]').length,4);
d.querySelector('.cd-analysis-metric [data-section-method]').click();assert.equal(dialogOptions.description,'Total New Facilities');assert.match(dialogOptions.body,/first approval date/);
d.querySelector('.cd-insight-visual [data-section-method]').click();assert.equal(dialogOptions.description,'Top 10 Underwriters by Deal Count');assert.match(dialogOptions.body,/Count eligible records/);
d.querySelector('[data-source-method]').click();assert.match(dialogOptions.body,/every matching row across all pages/);
d.querySelector('.cd-records [data-ct-next]').click();assert.equal(d.querySelectorAll('.cd-records tbody tr').length,10);
const columnSearch=d.querySelector('.cd-records [data-ct-search="0"]');columnSearch.value='no-match';columnSearch.dispatchEvent(new w.Event('input'));assert.equal(controller.exportRows().length,0);assert.equal(d.querySelector('#ch-download').disabled,true);d.querySelector('.cd-records [data-ct-reset]').click();assert.equal(controller.exportRows().length,31);assert.equal(d.querySelectorAll('.cd-records tbody tr').length,10);
const search=d.querySelector('.cd-search-label input');search.value='no-match';search.dispatchEvent(new w.Event('input'));assert.equal(controller.exportRows().length,0);assert.equal(d.querySelector('#ch-download').disabled,true);
controller.open('creditClassificationChart',records.slice(0,3),'Loans');assert.equal(controller.exportRows().length,3);assert.equal(d.querySelector('#ch-download').disabled,false);assert.match(d.querySelector('.cd-record-note').textContent,/Selected point: Loans/);
controller.methodology('creditClassificationChart');assert.equal(dialogOptions.placement,'right');assert.match(dialogOptions.body,/Region: NAM/);
controller.beforeRender();assert.equal(d.querySelector('#ch-content').hidden,false);assert.equal(chart.renderTo.style.height,'310px');assert.equal(chart.chartHeight,310);assert.equal(d.querySelector('.cw-layout-notice').hidden,true);
records=[];render();controller.apply();assert.ok(d.querySelector('.cd-detail-page'));assert.equal(controller.exportRows().length,0);assert.equal(d.querySelector('#ch-download').disabled,true);controller.close();assert.equal(d.querySelector('#ch-content').hidden,false);assert.equal(d.querySelector('.cd-detail-page'),null);assert.equal(d.querySelector('#ch-customize').hidden,false);assert.equal(d.querySelector('.ch-skip').getAttribute('href'),'#ch-content');
console.log('PASS: same-instance expansion, height restoration, pagination, escaped source text, empty search/export, point scope, right drawer, rerender continuity, hidden-state and skip-link restoration.');

const main=d.querySelector('#ch-content');main.insertAdjacentHTML('afterbegin','<div class="pal-metrics"><button class="pal-metric" data-pal-rows="tfa" data-title="Total facility amount">Balance</button></div>');
controller.apply();assert.equal(d.querySelectorAll('.cd-kpi-shell').length,1);assert.equal(d.querySelector('.pal-metric button'),null);
d.querySelector('.cd-kpi-method').click();assert.equal(dialogOptions.description,'Total facility amount');assert.match(dialogOptions.body,/Sum the supplied tfa/);assert.match(dialogOptions.body,/Saturdays and Sundays/);
console.log('PASS: KPI calculation drawer, independent accessible controls and bento summary placement.');

const coverageMetrics=[
 ['facilities','Facilities',/Repeated rows with the same facility ID count once/],
 ['relationships','Relationships',/multiple facilities or repeated source rows counts once/],
 ['caexpired','CAs expired',/affected relationships, not individual CA IDs/],
 ['expired','Facilities expired',/both CM and DM records are included/]
];
main.insertAdjacentHTML('afterbegin','<section class="pal-coverage-card"><div class="pal-coverage-stats">'+coverageMetrics.map(([key,title])=>'<button type="button" class="pal-coverage-stat" data-pal-rows="'+key+'" data-title="'+title+'"><span class="pal-coverage-title">'+title+'</span></button>').join('')+'</div></section>');
records=[{facility_id:'FA1',relationship_id:'R1',as_of_date:'2026-08-31'}];
let coverageDrills=0;for(const card of d.querySelectorAll('.pal-coverage-stat'))card.addEventListener('click',()=>coverageDrills++);
controller.apply();controller.apply();assert.equal(d.querySelectorAll('.cd-coverage-shell').length,4,'Repeated enhancement must not duplicate coverage wrappers');
for(const [key,title,rule] of coverageMetrics){
 const card=d.querySelector('.pal-coverage-stat[data-pal-rows="'+key+'"]'),shell=card.parentElement,method=shell.querySelector('.cd-kpi-method');
 assert.equal(card.querySelector('button'),null,'Methodology must be a sibling, never a nested button');assert.equal(shell.children.length,2);
 assert.equal(method.getAttribute('aria-label'),'Methodology for '+title);method.click();assert.equal(coverageDrills,0,'Methodology must not trigger a supporting-record drill');
 assert.equal(dialogOptions.description,title);assert.equal(dialogOptions.placement,'right');assert.match(dialogOptions.body,rule);
 for(const wording of [/All page filters and Portfolio filters apply to both snapshots/,/must not be added together/,/current count minus previous count/,/change divided by previous count/,/immediately preceding weekday/,/zero previous count/,/Missing or incompatible baselines/,/Region: NAM/,/2026-08-31/])assert.match(dialogOptions.body,wording);
 if(key==='caexpired'){assert.match(dialogOptions.body,/CM records only/);assert.match(dialogOptions.body,/EMEA also requires CA Review Yes/);}
 if(key==='caexpired'||key==='expired')assert.match(dialogOptions.body,/Due-today and missing/);
 d.querySelector('.cd-methodology').parentElement.querySelector('[data-method-done]').click();assert.equal(d.querySelector('.cd-methodology'),null);
}
for(const card of d.querySelectorAll('.pal-coverage-stat'))card.click();assert.equal(coverageDrills,4,'Statistic controls retain their independent drill handlers');
console.log('PASS: all four coverage methodology drawers, exact counting and comparison rules, source/filter context, close/reapply lifecycle and independent drills.');
