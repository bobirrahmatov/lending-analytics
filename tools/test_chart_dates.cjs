/* Axis display formatting must not change the source values used by drills/exports. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../attachments/credit-chart-details.js'),'utf8'),context);
const {label}=context.window.CreditDates;
for(const [source,display] of [
 ['2026-01-10','10-Jan-26'],['2026-12-31','31-Dec-26'],['2000-02-29','29-Feb-00'],['2024-02-29','29-Feb-24'],
 ['2026-01','Jan-26'],['2026-12','Dec-26'],['1999-07','Jul-99']
])assert.equal(label(source),display,source);
for(const source of ['2026-02-29','1900-02-29','2026-04-31','2026-01-00','2026-13-01','2026-00-12','2026-00','2026-13','2026-1-10','2026-01-1','2026-01-10 extra','Past due','1–30','10','',null,undefined])assert.equal(label(source),String(source??''),'invalid or non-date categories stay unchanged: '+source);
// Source timestamps are UTC epoch milliseconds. The supplied offset must not
// accidentally shift the axis label back to the timestamp's local calendar day.
assert.equal(label(Date.parse('2026-01-09T23:30:00-02:00')),'10-Jan-26');
assert.equal(label(Date.parse('2026-01-10T00:30:00+02:00')),'09-Jan-26');
assert.equal(label(Date.UTC(2024,1,29,23,59,59)),'29-Feb-24');
assert.equal(label(Date.UTC(2024,2,1,0,0,0)),'01-Mar-24');
assert.equal(label(0),'01-Jan-70');
for(const source of [NaN,Infinity,-Infinity,1e20])assert.equal(label(source),String(source));
// Model representative chart points: the display result is independent from
// raw category/row keys so date filters, grouping, downloads and clicks reconcile.
const rows=Object.freeze([Object.freeze({due_date:'2026-01-10',maker_month:'2026-01',id:'C-1'}),Object.freeze({due_date:'2024-02-29',maker_month:'2024-02',id:'C-2'})]);
const before=JSON.stringify(rows),categories=rows.map(row=>row.due_date),formatted=categories.map(label);
assert.deepEqual(formatted,['10-Jan-26','29-Feb-24']);assert.deepEqual(categories,['2026-01-10','2024-02-29']);assert.equal(JSON.stringify(rows),before);assert.equal(rows.filter(row=>row.due_date===categories[0])[0].id,'C-1');
console.log('PASS chart date labels: ISO day/month, leap-year validity, non-date passthrough, UTC timestamps, invalid timestamps and unchanged source/drill keys.');
