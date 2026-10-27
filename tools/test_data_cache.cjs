const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const context={window:{},TextDecoder,AbortController,setTimeout,clearTimeout};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../attachments/credit-data-cache.js'),'utf8'),context);
const C=context.window.CreditDataCache,plain=v=>JSON.parse(JSON.stringify(v));
(async()=>{
 const rows=Array.from({length:75000},(_,i)=>({id:i,region:['NAM','EMEA','APAC'][i%3],owner:'O'+i%100,pse:i%2===0,tfa:i}));
 for(const criteria of [{},{region:'EMEA'},{region:'EMEA',owner:'O4'},{pse:false},{region:'missing'}]){
  const expected=rows.filter(r=>Object.entries(criteria).every(([k,v])=>r[k]===v));assert.deepEqual(plain(C.select(rows,criteria)),expected);
  assert.equal(C.select(rows,criteria),C.select(rows,{...criteria}),'same selection reused');
 }
 assert.notEqual(C.select(rows,{region:'NAM'}),C.select(rows.slice(),{region:'NAM'}),'new snapshot gets fresh cache');
 assert.equal(C.sum(rows,'tfa'),rows.reduce((n,r)=>n+r.tfa,0));
 let reads=0,fail=false,duplicate=false,mixed=false;
 const manifest={bundle_id:'A',files:{portfolio:{rows:2,parts:[{filename:'a.json',rows:1},{filename:'b.json',rows:1}]}}};
 const loader=C.createLoader({manifest,attachment:n=>n,read:async name=>{reads++;await new Promise(r=>setTimeout(r,5));if(fail)throw Error('403');return{schema_version:2,bundle_id:mixed?'B':'A',rows:[{id:duplicate?1:name==='a.json'?1:2}]};},validate:(name,rs)=>{assert.equal(new Set(rs.map(r=>r.id)).size,rs.length,'duplicate across parts');return rs;}});
 const [one,two]=await Promise.all([loader.load('portfolio'),loader.load('portfolio')]);assert.equal(one,two);assert.equal(reads,2);await loader.load('portfolio');assert.equal(reads,2);
 loader.invalidate('portfolio');fail=true;await assert.rejects(loader.load('portfolio'),/403/);fail=false;assert.equal((await loader.load('portfolio')).length,2);
 loader.invalidate('portfolio');mixed=true;await assert.rejects(loader.load('portfolio'),/Mixed release/);mixed=false;
 duplicate=true;await assert.rejects(loader.load('portfolio'),/duplicate/);duplicate=false;assert.equal((await loader.load('portfolio')).length,2);
 const fresh=C.createLoader({manifest:{...manifest,bundle_id:'B'},attachment:n=>n,read:async()=>({schema_version:2,bundle_id:'B',rows:[{}]}),validate:(_,rs)=>rs});assert.notEqual(await fresh.load('portfolio'),one);
 context.window.fetch=async(url,options)=>{assert.equal(options.cache,'no-cache');assert.equal(options.credentials,'same-origin');return{ok:true,arrayBuffer:async()=>new TextEncoder().encode('{"name":"café"}').buffer};};assert.equal((await C.readJSON('/same-origin')).name,'café');
 context.window.fetch=async()=>({ok:false,status:403});await assert.rejects(C.readJSON('/same-origin'),/403/);
 context.window.fetch=async()=>({ok:true,arrayBuffer:async()=>new Uint8Array(10000000).buffer});await assert.rejects(C.readJSON('/same-origin'),/10 MB/);
 context.window.fetch=async()=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode('<html>sign in</html>').buffer});await assert.rejects(C.readJSON('/same-origin'),/not valid JSON/);
 console.log('PASS: 75,000-row cache parity, boolean filters, snapshot isolation, concurrency, rejected-cache retry, cross-part duplicates, mixed release, byte limit, sign-in response and permission denial.');
})().catch(e=>{console.error(e);process.exitCode=1});
