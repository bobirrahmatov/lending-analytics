/* Native attachment XLSX integration across the 11 dashboards. No live upload. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const P=path.resolve(__dirname,'..'),A=path.join(P,'attachments'),D=path.join(P,'excel/runtime'),XLSX=require(path.join(A,'xlsx.full.min.js'));
const files=['wcspedia-ui.js','credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-portfolio-journey.js','credit-pal.js','credit-covenant-risk.js','credit-snapshots.js','credit-monitoring.js','credit-covenants.js','credit-excel.js','credit-data-cache.js','credit-dashboard.js'];
const scripts=files.map(file=>fs.readFileSync(path.join(A,file),'utf8'));
const published=JSON.parse(fs.readFileSync(path.join(D,'credit-manifest.json'),'utf8'));
const sleep=()=>new Promise(resolve=>setTimeout(resolve,30));
async function mount(page,{allowSampleData=true,approvedFixture=false}={}){
 const dom=new JSDOM('<div id="credit-hub"></div>',{url:'https://example.test/confluence/pages/viewpage.action?pageId=3977008171',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,root=w.document.querySelector('#credit-hub'),errors=[],reads=new Map(),loaded={};
 w.TextDecoder=TextDecoder;w.XLSX=XLSX;w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.CREDIT_CONFIG={mode:'production',page,allowSampleData,baseUrl:'/confluence/download/attachments/3845862527/'};
 w.addEventListener('error',event=>errors.push(String(event.error||event.message)));
 w.fetch=async(url,options)=>{
  assert.equal(options.credentials,'same-origin');assert.equal(options.cache,'no-cache');
  const address=new URL(url,w.location.href);assert.equal(address.origin,w.location.origin);assert.equal(address.search,'');assert.equal(address.hash,'');assert.equal(address.pathname.split('/').slice(0,-1).join('/'),'/confluence/download/attachments/3845862527');
  const name=address.pathname.split('/').pop();reads.set(name,(reads.get(name)||0)+1);let bytes=fs.readFileSync(path.join(D,name));
  // This transformation exists only inside the test fetch; source files retain
  // their true sample flag. It exercises the normal approved-data branch.
  if(approvedFixture){
   if(name.endsWith('.json')){const data=JSON.parse(bytes);data.is_demo=false;bytes=Buffer.from(JSON.stringify(data));}
   else{const book=XLSX.read(bytes,{cellNF:true});const sheet=book.Sheets.Metadata,range=XLSX.utils.decode_range(sheet['!ref']);for(let row=1;row<=range.e.r;row++)if(sheet['A'+(row+1)]?.v==='is_demo')sheet['B'+(row+1)]={t:'b',v:false};bytes=XLSX.write(book,{type:'buffer',bookType:'xlsx'});}
  }
  return{ok:true,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
 };
 for(const script of scripts)w.eval(script);
 const originalCreate=w.CreditDataCache.createLoader;w.CreditDataCache.createLoader=options=>{const result=originalCreate(options),load=result.load;result.load=async name=>{const rows=await load(name);loaded[name]=rows;return rows;};return result;};
 let prior;const validatePrevious=w.CreditSnapshots.validate;w.CreditSnapshots.validate=(...args)=>{prior=validatePrevious(...args);return prior;};
 await w.CreditHub.mount(root);
 const settled=async()=>{for(let count=0;count<30;count++){await sleep();if(!root.querySelector('[aria-busy="true"]'))break;}assert.equal(root.querySelector('[aria-busy="true"]'),null,'render settled');assert.equal(root.querySelector('.ch-error'),null,root.textContent);assert.deepEqual(errors,[]);};
 return{dom,w,root,reads,loaded,settled,get prior(){return prior;}};
}
(async()=>{
 const blocked=await mount('portfolio',{allowSampleData:false});assert.match(blocked.root.querySelector('.ch-error')?.textContent||'',/Illustrative data cannot be loaded/);assert.equal(blocked.reads.size,1,'sample manifest rejects before downloading workbooks');blocked.dom.window.close();
 for(const page of ['portfolio','overview','workload','deepdive','COVENANTS','activity','CCM','CA','FACILITY','INSURANCE','APPRAISALS']){
  const e=await mount(page);try{
   const {root,w,loaded}=e;await e.settled();
   assert.equal(w.CREDIT_DEMO,undefined,'no embedded demo data bypasses native workbook loading');
   assert.equal(root.querySelector('.ch-demo'),null,'dashboard sample banner removed');assert.doesNotMatch(root.textContent,/DEMO SNAPSHOT|Illustrative preview|Sample records demonstrate/);
   for(const name of ['sources','monitoring','portfolio','activity','history','documents'])assert.equal(loaded[name]?.length,published.files[name].rows,page+' loaded complete '+name+' workbook');
   for(const name of ['monitoring','portfolio','activity'])w.CreditDataCache.verifySources(name,loaded[name],loaded.sources);
   assert(e.prior?.datasets?.monitoring?.length>0,page+' retained previous snapshot loaded and validated');
   if(page==='portfolio'){root.querySelector('[data-portfolio-view="data"]').click();await e.settled();assert.equal(root._exportRows.length,loaded.portfolio.length,'Portfolio register reconciles to XLSX facilities');}
   if(page==='deepdive'){const choice=root.querySelector('[data-pal-setting="relationship"]'),id=loaded.portfolio[0].relationship_id;choice.value=id;choice.dispatchEvent(new w.Event('change'));await e.settled();assert(root._exportRows.every(row=>row.relationship_id===id),'Deep dive retains exact selected relationship');}
   const before=[...root._exportRows];assert(before.length>0,page+' register has supporting records');assert(root.querySelector('#ch-table tbody tr'),page+' renders supporting table');
   const primary=page==='activity'?loaded.activity:['portfolio','deepdive'].includes(page)?loaded.portfolio:loaded.monitoring;
   const key=page==='activity'?'event_id':['portfolio','deepdive'].includes(page)?'facility_key':'item_id',ids=new Set(primary.map(row=>row[key]));
   assert(before.every(row=>ids.has(row[key])),page+' visible/export records retain their source identities');
   const readCounts=JSON.stringify([...e.reads]);
   const search=root.querySelector('#ch-search');search.value='NO_MATCH_FROM_XLSX_CHECK';search.dispatchEvent(new w.Event('input'));assert.equal(root._exportRows.length,0,page+' search narrows export population');
   root.querySelector('#ch-reset').click();await e.settled();
   if(page==='deepdive'){assert(root.querySelector('.pal-deep-empty'),'Deep dive Reset restores the relationship picker');}
   else{assert.equal(root._exportRows.length,before.length,page+' Reset restores complete register');assert.equal(root.querySelector('#ch-search')?.value,'');}
   assert.equal(JSON.stringify([...e.reads]),readCounts,page+' Reset reuses validated workbook and previous data');
   for(const [name,count] of e.reads)assert.equal(count,1,page+' downloads '+name+' once');
   if(page==='portfolio'){root.querySelector('[data-portfolio-view="charts"]').click();await e.settled();root.querySelector('[data-portfolio-view="data"]').click();await e.settled();assert.equal(root._exportRows.length,loaded.portfolio.length);assert.equal(JSON.stringify([...e.reads]),readCounts,'Charts/Data reuses the XLSX cohort');}
   if(page==='COVENANTS'){root.querySelector('[data-cov-setting="view"][data-value="coming"]').click();await e.settled();assert(root._exportRows.length>0,'Coming due tab has rows');root.querySelector('[data-cov-setting="view"][data-value="past"]').click();await e.settled();assert.equal(root._exportRows.length,before.length);assert.equal(JSON.stringify([...e.reads]),readCounts,'Covenant tabs reuse the XLSX cohort');}
   console.log('PASS native XLSX page:',page);
  }finally{e.dom.window.close();}
 }
 const approved=await mount('portfolio',{allowSampleData:false,approvedFixture:true});await approved.settled();assert(approved.loaded.portfolio.length>0);assert(approved.prior);approved.dom.window.close();
 console.log('PASS: all 11 pages mount from native-style XLSX attachments, source/previous validation, exact table cohorts, no sample banner, complete Reset, tab caching, default sample rejection and approved-data branch.');
})().catch(error=>{console.error(error);process.exitCode=1;});
