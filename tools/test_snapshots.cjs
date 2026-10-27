/* Previous release coverage/date safety and the aligned demonstration contract. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const A=path.resolve(__dirname,'../attachments'),w={};w.window=w;w.CREDIT_CONFIG={mode:'demo'};w.URLSearchParams=URLSearchParams;w.location={search:''};
const c=vm.createContext(w);for(const f of ['credit-covenant-risk.js','credit-snapshots.js','credit-demo-data.js','credit-comparison-demo.js'])vm.runInContext(fs.readFileSync(path.join(A,f),'utf8'),c);
const data={...w.CREDIT_DEMO.datasets,previous:w.CREDIT_DEMO.previous};
const check=(k,rs)=>{assert.ok(Array.isArray(rs),k);};w.CreditSnapshots.validate(data.previous,check);
for(const domain of ['COVENANTS','CA','FACILITY','CCM','INSURANCE','APPRAISALS','PORTFOLIO','ACTIVITY']){
 const result=w.CreditSnapshots.compare(data,[domain]);assert.equal(result.ready,true,domain);assert.ok(result.prior.length);assert.match(result.label,/2026-08-28/);
 const filtered=w.CreditSnapshots.compare(data,[domain],{region:'NAM'});assert.ok(filtered.prior.every(r=>r.region==='NAM'));
}
let bad=structuredClone(data);bad.previous.datasets.sources[0].as_of_date='2026-08-27';assert.equal(w.CreditSnapshots.compare(bad,[bad.sources[0].domain]).ready,false);assert.throws(()=>w.CreditSnapshots.validate(bad.previous,check),/source\/date/);
bad=structuredClone(data);bad.previous.datasets.sources[0].coverage='EXCEPTIONS_ONLY';assert.equal(w.CreditSnapshots.compare(bad,[bad.sources[0].domain]).ready,false);
bad=structuredClone(data);bad.previous.datasets.sources[0].record_count++;assert.throws(()=>w.CreditSnapshots.validate(bad.previous,check),/count/);
assert.equal(w.CreditSnapshots.compare({...data,previous:null},['COVENANTS']).ready,false);
const history=w.CreditSnapshots.covenantHistory(data);w.CreditCovenantRisk.validateHistory(history);assert.equal(history.snapshots[0].as_of_date,'2026-08-28');assert.equal(history.portfolio_rows.length,120);
assert.ok(new Set(data.activity.map(r=>r.month)).size>=3,'Activity history preserves multiple months');
console.log('PASS: all eight domains compare exact previous weekday; filters, date/coverage/count failures, covenant history adaptation and multi-month demo activity.');
