const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const A=path.resolve(__dirname,'../attachments'),read=n=>fs.readFileSync(path.join(A,n),'utf8');
(async()=>{
 for(const scenario of ['demo','configured','unconfigured','failure']){
  const dom=new JSDOM('<button id="origin">Origin</button><div id="credit-hub"></div>',{url:'http://localhost/pages/lendinganalytics.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,root=d.getElementById('credit-hub');
  w.CREDIT_CONFIG={page:'lendingAnalytics',mode:scenario==='demo'?'demo':'production',contextPath:'/confluence',pageIds:scenario==='configured'?{portfolio:'123',deepdive:'124'}:{}};
  w.WCSUI={enhance(){if(scenario==='failure')throw Error('Test failure');}};
  w.eval(read('wcspedia-loading-overlay.js'));const early=w.WCSLoadingOverlay.create({target:d.createElement('div')});early.show('Loading WCSpedia…');
  let claimed=0,maximum=1;w.WCSHeaderLoading={claim(target){claimed++;early.adoptTarget(target);return early;}};
  const originalPaint=early.paint;early.paint=async()=>{maximum=Math.max(maximum,d.querySelectorAll('.wcs-loading-overlay').length);await originalPaint();};
  w.fetch=()=>{throw Error('Landing must not download financial records');};
  w.eval(read('credit-landing.js'));await w.CreditHub.mount(root);
  assert.equal(claimed,1);assert.equal(maximum,1);assert.equal(d.querySelector('.wcs-loading-overlay'),null);assert.equal(root.hasAttribute('inert'),false);assert.equal(d.body.style.overflow,'');
  if(scenario==='demo')assert.equal(root.querySelectorAll('a.la-destination').length,11);
  if(scenario==='configured'){assert.equal(root.querySelectorAll('a.la-destination').length,2);assert.equal(root.querySelector('a').getAttribute('href'),'/confluence/pages/viewpage.action?pageId=123');}
  if(scenario==='unconfigured')assert.equal(root.querySelectorAll('a.la-destination').length,0);
  if(scenario==='failure')assert.ok(root.querySelector('[role=alert]'));
  if(scenario==='configured'){early.show('Loading…');w.eval(read('credit-lendinganalyticsHTMLPage.js'));assert.match(root.textContent,/Load the matching dashboard logic/);assert.equal(d.querySelector('.wcs-loading-overlay'),null);}
  console.log('PASS landing:',scenario);dom.window.close();
 }
 // A timed-out bootstrap must not later overwrite its actionable error screen.
 const dom=new JSDOM('<div id="credit-hub"></div>',{url:'http://localhost',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,root=w.document.getElementById('credit-hub');
 let resolveManifest;w.TextDecoder=TextDecoder;w.CREDIT_CONFIG={mode:'production',page:'portfolio',baseUrl:'http://localhost/attachments/'};
 w.fetch=()=>new Promise(resolve=>{resolveManifest=resolve;});
 w.WCSLoadingOverlay={create:()=>({show(){},paint:async()=>{},destroy(){},wait:async promise=>{promise.catch(()=>{});throw Error('Loading took too long');}})};
 for(const name of ['credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-portfolio-journey.js','credit-pal.js','credit-covenant-risk.js','credit-snapshots.js','credit-monitoring.js','credit-covenants.js','credit-data-cache.js','credit-dashboard.js'])w.eval(read(name));
 await w.CreditHub.mount(root);assert.match(root.textContent,/Loading took too long/);
 w.fetch=async()=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify({schema_version:2,bundle_id:'late',rows:[]})).buffer});
 resolveManifest({ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify({schema_version:2,bundle_id:'late',is_demo:false,files:{monitoring:{filename:'m.json',rows:0},sources:{filename:'s.json',rows:0}}})).buffer});await new Promise(r=>setTimeout(r,20));assert.match(root.textContent,/Loading took too long/);dom.window.close();
 console.log('PASS startup timeout: overlay released and late response cannot replace failure.');
})().catch(e=>{console.error(e);process.exitCode=1;});
