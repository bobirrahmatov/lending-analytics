/* CSSOM scope/priority contract. jsdom does not implement the browser's full
   !important cascade or paint scrollbars; the browser layout check covers those. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../source/dashboard/dashboard.css'),'utf8');
const marker='/* Confluence host protection.';
assert.equal(source.split(marker).length,2,'one shared host-protection block');
const css=marker+source.split(marker)[1];
const dom=new JSDOM(`<!doctype html><html><head><style>${css}</style></head><body>
 <nav id="native"><button>Confluence</button><h2>Native heading</h2><span class="aui-icon" style="font-family:'Atlassian Icons'">Icon</span></nav>
 <div id="credit-ui" class="credit-ui-host"><main id="credit-hub">
  <h1 id="page-title">Lending Analytics</h1><div class="font-display" id="display-text">Wealth Credit Services</div>
  <span class="aui-icon" id="native-glyph" style="font-family:'Atlassian Icons'">Icon</span>
  <section class="ch-card"><header class="ch-card-head"><h2 id="title">Facilities</h2><p class="ch-card-sub" id="subtitle">Current portfolio</p></header>
   <strong class="ch-kpi-value" id="kpi">120</strong><div class="credit-data-table-scroll" id="table-scroll"><table class="credit-data-table"><thead><tr><th id="heading">Category</th></tr></thead><tbody><tr>
    <td class="ct-category-cell" id="category"><button class="ch-row-link">Aircraft Finance</button></td>
    <td class="ct-amount-cell" id="amount"><button class="ch-row-link" id="amount-link">$1m</button></td>
    <td id="plain">2026-08-31</td><td><span id="severity" class="ct-status-pill ct-tone-red">Past due</span><span id="delta" class="ct-number-pill ct-tone-green">+5%</span></td>
   </tr></tbody></table></div>
   <div class="ct-global-search"><input type="search" id="search"></div>
   <svg><text id="chart-label">120</text><path id="chart-series"></path></svg>
  </section>
  <dialog class="ca-overlay" id="dialog"><div class="ca-overlay-body" id="dialog-scroll"></div></dialog>
 </main><div class="credit-ui-layer"><section class="credit-ui-dialog cw-dashboard-drawer"><div class="credit-ui-dialog-heading"><h2 id="drawer-title">Filters</h2></div><div class="credit-ui-dialog-body" id="drawer-scroll"><input id="drawer-input"></div></section>
 <div class="credit-ui-popover ct-filter-popover" id="filter-popup"><div class="ct-values" id="filter-values"></div></div>
 <div class="credit-searchable-select"><div role="listbox" id="list-scroll"></div></div></div></div>
 </body></html>`);
const d=dom.window.document;
const rules=[...d.styleSheets[0].cssRules].filter(r=>r.type===1);
const element=id=>d.getElementById(id);
function matching(id,property){return rules.filter(r=>r.style.getPropertyValue(property)&&!r.selectorText.includes('::-webkit-')&&element(id).matches(r.selectorText));}
function protectedValue(id,property,value){const matches=matching(id,property).filter(r=>r.style.getPropertyPriority(property)==='important'&&r.style.getPropertyValue(property)===value);assert.ok(matches.length,`${id}: ${property} ${value} is protected`);}
for(const [id,size] of [['title','16px'],['kpi','31px'],['heading','12px'],['category','14px'],['plain','13px'],['search','12px'],['drawer-title','21px'],['drawer-input','13px']])protectedValue(id,'font-size',size);
protectedValue('category','font-weight','600');
for(const id of ['amount','amount-link','plain','title'])protectedValue(id,'color','var(--ink)');
for(const id of ['table-scroll','dialog-scroll','drawer-scroll','filter-popup','filter-values','list-scroll'])protectedValue(id,'scrollbar-width','auto');
protectedValue('table-scroll','overflow-x','auto');
protectedValue('dialog-scroll','overflow-y','auto');
assert.equal(matching('dialog','overflow').length,0,'modal shell remains clipped by its existing rule');
for(const id of ['severity','delta','chart-label','chart-series'])assert.equal(matching(id,'color').length,0,`${id} retains its own semantic colour`);
const textFamily='var(--credit-space-font,var(--credit-resolved-space-font,inherit))';
const displayFamily='var(--credit-space-display-font,var(--credit-resolved-space-display-font,inherit))';
const spaceFontFamilies=new Set(['inherit',textFamily,displayFamily]);
protectedValue('credit-ui','font-family',textFamily);
for(const id of ['page-title','display-text'])protectedValue(id,'font-family',displayFamily);
for(const id of ['title','subtitle','search','heading','category']){
 protectedValue(id,'font-family','inherit');
 assert.equal(matching(id,'font-family').some(r=>r.style.getPropertyValue('font-family')===displayFamily),false,`${id} retains the space text font rather than the display font`);
}
assert.equal(matching('native-glyph','font-family').length,0,'Dashboard font protection does not overwrite a native AUI icon font');
assert.equal(dom.window.getComputedStyle(element('native-glyph')).fontFamily.replace(/["']/g,''),'Atlassian Icons','Existing native icon-family declaration remains intact');
for(const rule of rules){
 const family=rule.style.getPropertyValue('font-family');
 if(family)assert.ok(spaceFontFamilies.has(family.replace(/\s+/g,'')),`the space owns font families; unexpected family: ${family}`);
 if(rule.selectorText.includes('::-webkit-'))continue;
 for(const node of [d.documentElement,d.body,...d.querySelectorAll('#native,#native *')])assert.equal(node.matches(rule.selectorText),false,'rules do not restyle Confluence chrome');
}
const rootRule=matching('credit-hub','--ch-ink')[0];
assert.equal(rootRule.style.getPropertyValue('--ch-ink'),'var(--ink)');
assert.equal(rootRule.style.getPropertyValue('--ch-muted'),'var(--muted)');
assert.equal(rootRule.style.getPropertyValue('--surface-soft'),'var(--pale)');
const webkit=rules.filter(r=>r.selectorText.endsWith('::-webkit-scrollbar'));
assert.equal(webkit.length,1);assert.equal(webkit[0].style.getPropertyValue('display'),'block');assert.equal(webkit[0].style.getPropertyPriority('display'),'important');
assert.equal(webkit[0].style.getPropertyValue('height'),'10px');
assert.equal(webkit[0].style.getPropertyValue('width'),'10px');
d.querySelector('#credit-hub').remove();
assert.equal(matching('filter-popup','scrollbar-width').length,0,'shared dashboard popovers outside Lending Analytics keep their own styles');
dom.window.close();
console.log('PASS: scoped Confluence text/display typography and scrollbar priorities, host theme aliases, preserved native icon fonts, native chrome isolation and semantic chart/table colours (CSSOM contract; browser paint checked separately).');
