// Exercise production loader via local mocked attachments; never publish these test envelopes.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const P=path.resolve(__dirname,'..'),A=path.join(P,'attachments'),D=path.join(P,'demo-comparison');
(async()=>{for(const scenario of ['valid','missing','wrong-bundle','demo-previous','bad-source-count','demo-current','bad-current-date','missing-enrichment']){
 const dom=new JSDOM('<div id="credit-hub"></div>',{url:'http://localhost/pages/ca.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,root=d.querySelector('#credit-hub');
 w.TextDecoder=TextDecoder;w.ResizeObserver=class{observe(){}disconnect(){}};w.HTMLElement.prototype.scrollIntoView=()=>{};w.scrollTo=()=>{};
 w.CREDIT_CONFIG={mode:'production',page:'CA',baseUrl:'http://localhost/attachments/'};
 w.WCSUI={enhance(){},closePopover(){},dialog(o){const el=d.createElement('div');el.innerHTML=o.body;d.body.append(el);return{element:el,body:el,close(){el.remove()}};}};
 const manifest=JSON.parse(fs.readFileSync(path.join(D,'credit-manifest.json')));manifest.is_demo=scenario==='demo-current';
 const reads=new Map();
 w.fetch=async url=>{const name=new URL(url).pathname.split('/').pop();reads.set(name,(reads.get(name)||0)+1);if(scenario==='missing-enrichment'&&name===manifest.files.documents.filename)return{ok:false,status:404};if(name===manifest.files.previous.filename&&scenario==='missing')return{ok:false,status:404};const payload=name==='credit-manifest.json'?manifest:JSON.parse(fs.readFileSync(path.join(D,name)));
 if(name===manifest.files.previous.filename){payload.is_demo=scenario==='demo-previous';if(scenario==='wrong-bundle')payload.bundle_id='wrong';if(scenario==='bad-source-count')payload.datasets.sources[0].record_count++;}
 if(name===manifest.files.monitoring.filename&&scenario==='bad-current-date')payload.rows[0].as_of_date='2026-08-01';
 return{ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify(payload)).buffer};};
 for(const f of ['credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-portfolio-journey.js','credit-pal.js','credit-covenant-risk.js','credit-snapshots.js','credit-monitoring.js','credit-covenants.js','credit-data-cache.js','credit-dashboard.js'])w.eval(fs.readFileSync(path.join(A,f),'utf8'));
 await w.CreditHub.mount(root);
 if(['demo-current','bad-current-date'].includes(scenario))assert.ok(root.querySelector('.ch-error'),scenario);
 else{assert.ok(!root.querySelector('.ch-error'),scenario+': '+root.textContent.slice(-500));assert.equal(root.querySelectorAll('.ch-chart').length,4);const kpi=root.querySelector('.mon-kpis').textContent;if(['valid','missing-enrichment'].includes(scenario))assert.ok(kpi.includes('2026-08-28'),kpi);else assert.ok(!kpi.includes('vs 2026-08-28'),scenario+': '+kpi);}
 if(scenario==='missing-enrichment'){for(let i=0;i<3;i++){root.querySelector('#ch-reset').click();await new Promise(resolve=>setTimeout(resolve,30));assert.ok(!root.querySelector('[aria-busy=true]'));assert.ok(!root.querySelector('.ch-error'));}assert.equal(reads.get(manifest.files.documents.filename),1,'Reset reuses optional-source failure without repeating failed requests');assert.equal(reads.get(manifest.files.monitoring.filename),1,'Reset reuses validated primary records');}
 console.log('PASS production loader:',scenario);dom.window.close();
}})().catch(e=>{console.error(e);process.exitCode=1});
