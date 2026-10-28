const {JSDOM}=require('jsdom'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const dom=new JSDOM('<main id="credit-hub"></main>',{runScripts:'outside-only'}),w=dom.window,d=w.document;
w.eval(fs.readFileSync(path.join(__dirname,'../attachments/credit-workspace.js'),'utf8'));
w.eval(fs.readFileSync(path.join(__dirname,'../attachments/credit-tables.js'),'utf8'));
const T=w.CreditTables,cols=[{key:'name',label:'Name'},{key:'amount',label:'Amount'},{key:'date',label:'Date'},{key:'status',label:'Status'}],rows=Array.from({length:60},(_,i)=>({name:'Record '+i,amount:i===59?null:i*100,date:'2026-10-'+String(i%28+1).padStart(2,'0'),status:i%2?'Open':'Closed'}));
let s=T.createState();s.filters.name={query:'59'};assert.equal(T.select(rows,cols,s)[0].name,'Record 59');s.filters={amount:{min:'1000',max:'3000'},status:{values:['Open']}};assert.equal(T.select(rows,cols,s).length,10);
s.sortKey='amount';s.sortDir=-1;assert.equal(T.select(rows,cols,s)[0].amount,2900);s.filters={};assert.equal(T.select(rows,cols,s).at(-1).amount,null);s.filters.date={min:'2026-10-10',max:'2026-10-12'};assert.ok(T.select(rows,cols,s).every(r=>r.date>='2026-10-10'&&r.date<='2026-10-12'));s.filters={status:{values:[]}};assert.equal(T.select(rows,cols,s).length,0);
s.filters={amount:{values:['']}};assert.equal(T.select(rows,cols,s).length,1);
s.filters={amount:{min:'20',max:'30'}};assert.equal(T.select([{amount:.2},{amount:.3},{amount:.4}], [{key:'amount',rangeScale:100}],s).length,2);
assert.equal(T.scalar('$1.2m'),1200000);assert.equal(T.scalar('-2.5%'),-2.5);assert.equal(T.scalar('FA1000'),null);
d.querySelector('main').innerHTML='<section><div class="credit-data-table-scroll"><table class="credit-data-table"><thead><tr><th>Name</th><th>Amount</th></tr></thead><tbody><tr><td><button>Alpha</button></td><td>$2.0m</td></tr><tr><td>Beta</td><td>$900.0k</td></tr></tbody></table></div></section>';
let clicks=0;const original=d.querySelector('tbody button');original.onclick=()=>clicks++;
let pop;w.CreditUI={popover(options){const el=d.createElement('div');el.innerHTML=options.body;d.body.append(el);pop={element:el,close(){el.remove();options.onClose();}};options.onMount(pop);return pop;}};
T.enhanceStatic(d);assert.equal(d.querySelectorAll('[data-ct-search]').length,2);
assert.equal(d.querySelectorAll('.ct-heading [data-ct-filter]').length,0,'column headings contain sorting only');
for(const [index,field] of [...d.querySelectorAll('.ct-column-search')].entries()){
 assert.equal(field.closest('tr').className,'ct-search-row');
 assert.equal(field.firstElementChild.getAttribute('data-ct-search'),String(index));
 const filter=field.lastElementChild;assert.equal(filter.getAttribute('data-ct-filter'),String(index));assert.equal(filter.getAttribute('aria-haspopup'),'dialog');assert.equal(filter.getAttribute('aria-expanded'),'false');
}
d.querySelector('[data-ct-sort="1"]').click();assert.equal(d.querySelector('tbody tr').textContent,'Beta$900.0k');original.click();assert.equal(clicks,1);
const input=d.querySelector('[data-ct-search="0"]');input.value='alpha';input.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('tbody tr').length,1);assert.equal(d.activeElement.getAttribute('data-ct-search'),'0');assert.ok(d.querySelector('.ct-column-search [data-ct-filter="0"]').classList.contains('is-active'),'the adjacent filter shows the active column search');
d.querySelector('[data-ct-reset]').click();d.querySelector('[data-ct-filter="0"]').click();pop.element.querySelector('[data-none]').click();pop.close();assert.equal(d.querySelectorAll('tbody tr').length,2,'cancel does not apply');d.querySelector('[data-ct-filter="0"]').click();pop.element.querySelector('[data-none]').click();pop.element.querySelector('[data-apply]').click();assert.match(d.querySelector('tbody').textContent,/No matching rows/);d.querySelector('[data-ct-reset]').click();assert.equal(d.querySelectorAll('tbody tr').length,2);
d.querySelector('[data-ct-filter="1"]').click();pop.element.querySelector('[data-min]').value='30';pop.element.querySelector('[data-max]').value='20';pop.element.querySelector('[data-apply]').click();assert.match(pop.element.querySelector('[role="alert"]').textContent,/valid range/);pop.close();
console.log('PASS: cross-page search, combined exact/range/date filters, numeric currency/percent sorting, blanks, no selection, scaled units, DOM row actions, focus restoration, draft cancel/apply, reset and invalid ranges.');
// The same search and pagination apply to summary tables, without cloning row actions.
d.querySelector('main').innerHTML='<section><div class="credit-data-table-scroll"><table class="credit-data-table"><thead><tr><th>Name</th><th>Amount</th></tr></thead><tbody>'+Array.from({length:31},(_,i)=>'<tr><td>Entry '+i+'</td><td>'+i+'</td></tr>').join('')+'</tbody></table></div></section>';
T.enhanceStatic(d);assert.equal(d.querySelectorAll('tbody tr').length,10);assert.equal(d.querySelector('[data-ct-size]').value,'10');assert.ok(d.querySelector('[data-ct-prev]').disabled);d.querySelector('[data-ct-next]').click();assert.equal(d.querySelector('tbody tr').cells[0].textContent,'Entry 10');d.querySelector('[data-ct-next]').click();d.querySelector('[data-ct-next]').click();assert.equal(d.querySelectorAll('tbody tr').length,1);assert.ok(d.querySelector('[data-ct-next]').disabled);d.querySelector('[data-ct-prev]').click();assert.equal(d.querySelector('tbody tr').cells[0].textContent,'Entry 20');
const size=d.querySelector('[data-ct-size]');size.value='25';size.dispatchEvent(new w.Event('change'));assert.equal(d.querySelectorAll('tbody tr').length,25);assert.match(d.querySelector('.ch-pagination').textContent,/1–25 of 31/);const globalSearch=d.querySelector('[data-ct-global]');globalSearch.value='Entry 30';globalSearch.dispatchEvent(new w.Event('input'));assert.equal(d.querySelectorAll('tbody tr').length,1);assert.equal(d.activeElement.getAttribute('data-ct-global'),'');assert.equal(d.querySelector('.ch-pagination'),null);d.querySelector('[data-ct-reset]').click();assert.equal(d.querySelector('[data-ct-global]').value,'');assert.equal(d.querySelectorAll('tbody tr').length,25);const noMatch=d.querySelector('[data-ct-global]');noMatch.value='nothing';noMatch.dispatchEvent(new w.Event('input'));assert.equal(d.querySelector('.ch-pagination'),null);
console.log('PASS: shared 10-row defaults, next/previous and last-page boundaries, 25-row selection, global search across all rows, search focus, page reset and empty pagination.');
// Compact navigation retains one page status, bounded previous/next and focus.
d.querySelector('[data-ct-reset]').click();const ten=d.querySelector('[data-ct-size]');ten.value='10';ten.dispatchEvent(new w.Event('change'));
const checkNavigation=(page,pages,range)=>{
 const footer=d.querySelector('.ch-pagination'),nav=footer.querySelector('nav');
 assert.equal(nav.querySelector('.ct-page-status').textContent,'Page '+page+' of '+pages);
 assert.equal(nav.querySelector('.ct-page-status').getAttribute('role'),'status');
 assert.equal(footer.querySelector('.ct-page-range').textContent,range);
 assert.equal((footer.textContent.match(/Page \d+ of \d+/g)||[]).length,1,'one page announcement without duplicate text');
 assert.deepEqual([...nav.children].map(n=>n.tagName),['BUTTON','SPAN','BUTTON']);
 assert.deepEqual([...nav.querySelectorAll('button')].map(b=>b.textContent),['Previous','Next']);
 assert.equal(footer.querySelector('[data-ct-page],.ct-page-numbers,.ct-page-gap'),null,'no numbered page buttons or ellipses');
};
checkNavigation(1,4,'1–10 of 31');
for(let page=2;page<=4;page++){d.querySelector('[data-ct-next]').click();checkNavigation(page,4,((page-1)*10+1)+'–'+Math.min(page*10,31)+' of 31');}
assert.equal(d.querySelector('tbody tr').cells[0].textContent,'Entry 30');assert.ok(d.querySelector('[data-ct-next]').disabled);assert.equal(d.activeElement.getAttribute('data-ct-prev'),'','focus moves to Previous when Next becomes disabled');
for(let page=3;page>=1;page--)d.querySelector('[data-ct-prev]').click();
checkNavigation(1,4,'1–10 of 31');assert.equal(d.querySelector('tbody tr').cells[0].textContent,'Entry 0');assert.ok(d.querySelector('[data-ct-prev]').disabled);assert.equal(d.activeElement.getAttribute('data-ct-next'),'','focus moves to Next when Previous becomes disabled');
const filteredSearch=d.querySelector('[data-ct-global]');filteredSearch.value='Entry 1';filteredSearch.dispatchEvent(new w.Event('input'));
d.querySelector('[data-ct-sort="1"]').click();d.querySelector('[data-ct-sort="1"]').click();d.querySelector('[data-ct-next]').click();
checkNavigation(2,2,'11–11 of 11');assert.equal(d.querySelector('tbody tr').cells[0].textContent,'Entry 1');assert.equal(d.querySelector('[data-ct-global]').value,'Entry 1');assert.equal(d.querySelector('th:nth-child(2)').getAttribute('aria-sort'),'descending','page changes preserve search and numeric sorting');
d.querySelector('[data-ct-reset]').click();const fifty=d.querySelector('[data-ct-size]');fifty.value='50';fifty.dispatchEvent(new w.Event('change'));
checkNavigation(1,1,'1–31 of 31');assert.equal(d.querySelectorAll('tbody tr').length,31);assert.ok(d.querySelector('[data-ct-prev]').disabled);assert.ok(d.querySelector('[data-ct-next]').disabled);assert.equal(d.activeElement.getAttribute('data-ct-size'),'','page size remains focused when all rows fit');
for(const total of [0,1,10,11]){const host=d.createElement('div');T.pagination({host,total,page:0,pageSize:10,onChange(){}});assert.equal(!!host.querySelector('.ch-pagination'),total>10);}
const longHost=d.createElement('div');T.pagination({host:longHost,total:120,page:99,pageSize:10,onChange(){}});assert.equal(longHost.querySelector('.ct-page-status').textContent,'Page 12 of 12');assert.equal(longHost.querySelector('.ct-page-range').textContent,'111–120 of 120');assert.equal(longHost.querySelectorAll('nav button').length,2);assert.ok(longHost.querySelector('[data-ct-next]').disabled);
console.log('PASS: adjacent column filters, Previous/Page n of n/Next only, row ranges, first/last focus, search/sort preservation, 50-row single-page controls and clamped bounds.');
// Overview summaries stay compact, including after their card is expanded and closed.
d.querySelector('main').innerHTML='<div id="ch-content">'+['pal-pipeline','pal-snapshot'].map(id=>'<section class="ch-card pal-table-card" id="'+id+'" data-table-mode="summary"><div class="credit-data-table-scroll"><table class="credit-data-table"><thead><tr><th>Measure</th><th>Count</th></tr></thead><tbody><tr><td>Facilities</td><td><button data-drill>24</button></td></tr></tbody></table></div></section>').join('')+'</div>';
let drilled=0;const pending=d.querySelector('#pal-pipeline'),coverage=d.querySelector('#pal-snapshot');T.enhanceNumbers(d);const before=pending.outerHTML,coverageBefore=coverage.outerHTML;pending.querySelector('[data-drill]').onclick=()=>drilled++;
T.enhanceStatic(d);assert.equal(pending.outerHTML,before);assert.equal(coverage.outerHTML,coverageBefore);assert.equal(d.querySelectorAll('[data-ct-search],.ch-pagination,.ct-status').length,0);
const expanded=d.createElement('section');expanded.className='cd-detail-page';d.querySelector('main').append(expanded);expanded.append(pending);T.enhanceStatic(expanded);assert.equal(pending.querySelectorAll('[data-ct-search]').length,0);assert.equal(pending.querySelector('[data-ct-global],.ch-pagination'),null);assert.equal(pending.outerHTML,before);pending.querySelector('[data-drill]').click();assert.equal(drilled,1);
T.releaseStatic(pending);d.querySelector('#ch-content').append(pending);assert.equal(pending.outerHTML,before);pending.querySelector('[data-drill]').click();assert.equal(drilled,2);T.enhanceStatic(d.querySelector('#ch-content'));assert.equal(pending.outerHTML,before);assert.equal(coverage.outerHTML,coverageBefore);
console.log('PASS: both overview summaries are untouched; expanded summaries also stay simple; close restores exact original markup and row handlers.');

// Pill decoration is visual only and must not style amounts, IDs or source dates.
d.querySelector('main').innerHTML='<table class="credit-data-table"><thead><tr>'+['Facility ID','Amount','Facilities','Change','Variance','Source date','TFA change','Days past due'].map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody><tr><td>12345</td><td>$1,200</td><td><button>0</button></td><td>−3</td><td>+5.3%</td><td>2026-08-31</td><td>2500</td><td>90</td></tr></tbody><tfoot><tr><td>Total</td><td>$1,200</td><td>24</td><td>0.0%</td><td>—</td><td></td><td>2500</td><td>90</td></tr></tfoot></table>';
const pillTable=d.querySelector('table'),pillText=pillTable.textContent;let pillClicks=0;const drill=pillTable.querySelector('button');drill.onclick=()=>pillClicks++;T.enhanceNumbers(d);T.enhanceNumbers(d);const cs=pillTable.tBodies[0].rows[0].cells;assert.deepEqual([...cs].map(c=>!!c.querySelector('.ct-number-pill')),[false,false,true,true,true,false,false,true]);assert.equal(pillTable.querySelectorAll('.ct-number-pill .ct-number-pill').length,0);assert.equal(pillTable.textContent,pillText);drill.click();assert.equal(pillClicks,1);assert.equal(pillTable.tFoot.rows[0].cells[2].querySelector('.ct-number-pill').textContent,'24');
console.log('PASS: shared count/change pills, zero and negative values, totals, unboxed currency/IDs/dates, idempotent formatting and preserved row actions.');

// Direction is distinct from status: rising past-due counts still have green deltas.
d.body.innerHTML='<section class="ch-card"><h2>CCM status summary</h2><table class="credit-data-table"><thead><tr><th>Status</th><th>Count</th><th>Change</th><th>TFA</th></tr></thead><tbody><tr><td><span class="ch-badge bad">PAST_DUE</span></td><td>12</td><td>+5.3%</td><td>$10m</td></tr><tr><td>COMING_DUE</td><td>8</td><td>−2.0%</td><td>$5m</td></tr><tr><td>OPEN</td><td>3</td><td>0.0%</td><td>$1m</td></tr></tbody><tfoot><tr><td>Total</td><td>23</td><td>+1.0%</td><td>$16m</td></tr></tfoot></table></section>';
T.enhanceNumbers(d);T.enhanceNumbers(d);
const colored=d.querySelector('table'),r=[...colored.tBodies[0].rows];
for(const [i,color] of ['red','green','amber'].entries()){assert.ok(r[i].cells[0].querySelector('.ct-status-pill.ct-tone-'+color));assert.ok(r[i].cells[1].querySelector('.ct-number-pill.ct-tone-'+color));assert.equal(r[i].cells[3].querySelector('span'),null);}
for(const [i,color] of ['green','red','amber'].entries())assert.ok(r[i].cells[2].querySelector('.ct-number-pill.ct-tone-'+color));
assert.ok(colored.tFoot.rows[0].cells[2].querySelector('.ct-tone-green'));assert.equal(colored.querySelectorAll('.ct-number-pill .ct-number-pill,.ct-status-pill .ct-status-pill').length,0);
d.body.innerHTML='<section class="ch-card"><h3>Past Due Covenants by Region</h3><table class="credit-data-table"><thead><tr><th>Region</th><th>Facilities</th><th>TFA</th></tr></thead><tbody><tr><td>NAM</td><td>4</td><td>100000</td></tr></tbody></table></section>';T.enhanceNumbers(d);assert.ok(d.querySelector('td:nth-child(2) .ct-tone-red'));assert.equal(d.querySelector('td:nth-child(3) span'),null);
d.querySelector('h3').textContent='Coming Due Covenants by Region';T.enhanceNumbers(d);assert.ok(d.querySelector('td:nth-child(2) .ct-tone-green'));assert.equal(d.querySelector('.ct-tone-red'),null);
console.log('PASS: semantic red/green/amber status and count pills, signed deltas, totals, summary context changes and plain amounts.');
