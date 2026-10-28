const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const A=path.resolve(__dirname,'../attachments'),read=n=>fs.readFileSync(path.join(A,n),'utf8');
const expectedNativeIds=['3977008171','3977008237','3977008198','3977008221','3977008265','3977008280','3977008303','3977008325','3977008340','3977008348','3977008352'];
(async()=>{
 for(const scenario of ['demo','configured','confirmed','unconfigured','failure','cached-image-failure','cached-image-success']){
  const dom=new JSDOM('<button id="origin">Origin</button><div id="credit-hub"></div>',{url:'http://localhost/pages/lendinganalytics.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,root=d.getElementById('credit-hub');
  if(scenario==='confirmed')w.eval(read('credit-pages.js'));
  w.CREDIT_CONFIG={page:'lendingAnalytics',mode:scenario==='demo'?'demo':'production',contextPath:'/confluence',baseUrl:'/confluence/download/attachments/3845862527/',pageIds:scenario==='confirmed'?w.CREDIT_PAGE_IDS:scenario==='configured'?{portfolio:'123',deepdive:'124'}:{}};
  w.CreditUI={enhance(){if(scenario==='failure')throw Error('Test failure');}};
  if(scenario.startsWith('cached-image-')){
   Object.defineProperty(w.HTMLImageElement.prototype,'complete',{get:()=>true});
   Object.defineProperty(w.HTMLImageElement.prototype,'naturalWidth',{get:()=>scenario==='cached-image-success'?640:0});
  }
  w.eval(read('credit-loading-overlay.js'));
  let created=0,maximum=0;const create=w.CreditLoadingOverlay.create;
  w.CreditLoadingOverlay.create=options=>{created++;const overlay=create(options),paint=overlay.paint;overlay.paint=async()=>{maximum=Math.max(maximum,d.querySelectorAll('.credit-loading-overlay').length);await paint();};return overlay;};
  w.fetch=()=>{throw Error('Landing must not download financial records');};
  w.eval(read('credit-landing.js'));await w.CreditHub.mount(root);
  assert.equal(created,1);assert.equal(maximum,1);assert.equal(d.querySelector('.credit-loading-overlay'),null);assert.equal(root.hasAttribute('inert'),false);assert.equal(d.body.style.overflow,'');
  if(scenario==='demo')assert.equal(root.querySelectorAll('a.la-page-link').length,11);
  if(scenario==='configured'){assert.equal(root.querySelectorAll('a.la-page-link').length,2);assert.equal(root.querySelector('a').getAttribute('href'),'/confluence/pages/viewpage.action?pageId=123');}
  if(scenario==='confirmed'){
   assert.deepEqual([...root.querySelectorAll('a.la-page-link')].map(a=>a.getAttribute('href')),expectedNativeIds.map(id=>'/confluence/pages/viewpage.action?pageId='+id),'all eleven confirmed native destinations remain unchanged');
   assert.deepEqual([...root.querySelectorAll('article.la-area')].map(card=>card.querySelectorAll('a.la-page-link').length),[2,2,7],'every dashboard remains visible in its subject group');
  }
  if(scenario==='unconfigured')assert.equal(root.querySelectorAll('a.la-page-link').length,0);
  if(scenario==='failure')assert.ok(root.querySelector('[role=alert]'));
  else{
   const cards=[...root.querySelectorAll('article.la-area')],hrefs=[...root.querySelectorAll('a.la-page-link')].map(a=>a.getAttribute('href'));
   assert.equal(cards.length,3,'three subject cards');
   const hero=root.querySelector('.la-hero img');assert.equal(hero.getAttribute('loading'),'eager','the first-view hero is requested immediately');assert.equal(hero.getAttribute('fetchpriority'),'high','the hero takes priority over off-screen cards');
   const expectedImages=['lending-analytics-hero','lending-portfolio','lending-underwriting','lending-monitoring'];
   assert.deepEqual([...root.querySelectorAll('picture')].map((picture,index)=>{
    const img=picture.querySelector('img'),jpg=new URL(img.src);
    assert.equal(picture.querySelector('source'),null,'no optional WebP attachment can override the reliable JPEG request');
    assert.equal(jpg.pathname,'/confluence/download/attachments/3845862527/'+expectedImages[index]+'.jpg');
    assert.equal(jpg.search,'','image attachments use stable filenames without version queries');assert.equal(jpg.hash,'');
    const bytes=fs.readFileSync(path.join(A,expectedImages[index]+'.jpg'));assert.equal(bytes.readUInt16BE(0),0xffd8,'each requested attachment is a packaged JPEG');
    assert.ok(Number(img.width)>0&&Number(img.height)>0,'image dimensions reserve layout space before loading');return expectedImages[index];
   }),expectedImages);
   for(const card of cards){
    assert.equal(card.closest('a,button,[role=link]'),null,'the card shell does not compete with its contained links');
    const images=card.querySelectorAll('.la-area-media img');assert.equal(images.length,1,'one image per subject card');
    const img=images[0],figure=img.closest('figure');assert.ok(figure?.classList.contains('la-area-media'));assert.equal(img.getAttribute('loading'),'lazy');
    assert.ok(new URL(img.src).pathname.startsWith('/confluence/download/attachments/3845862527/'));assert.equal(new URL(img.src).search,'','card images use fixed attachment filenames');
    assert.equal(figure.hidden,scenario==='cached-image-failure','cached attachment failures are handled even before a new error event');
    const requestedImage=img.getAttribute('src');img.dispatchEvent(new w.Event('error'));
    assert.equal(img.getAttribute('src'),requestedImage,'an unavailable attachment cannot start a retry loop or substitute a WebP request');
    assert.equal(figure.hidden,true,'a failed decorative attachment leaves no broken-image slot');assert.equal(card.closest('[hidden]'),null,'failed image does not hide its card');
    img.dispatchEvent(new w.Event('error'));assert.equal(figure.hidden,true,'repeated failures remain harmless');
    for(const link of card.querySelectorAll('a.la-page-link'))assert.equal(link.closest('[hidden],a a'),null,'dashboard links remain available after an image fails');
   }
   assert.deepEqual([...root.querySelectorAll('a.la-page-link')].map(a=>a.getAttribute('href')),hrefs,'image failures retain all dashboard destinations');
   assert.equal(root.querySelector('.la-hero').hidden,scenario==='cached-image-failure','card image errors leave the hero unchanged');
   hero.dispatchEvent(new w.Event('error'));assert.equal(hero.closest('figure').hidden,true,'an unavailable hero leaves the introduction and destinations usable');
   assert.deepEqual([...root.querySelectorAll('a.la-page-link')].map(a=>a.getAttribute('href')),hrefs,'even failure of every image retains all destinations');
  }
  if(scenario==='configured'){w.eval(read('credit-lendinganalyticsHTMLPage.js'));assert.match(root.textContent,/Load the matching dashboard logic/);assert.equal(d.querySelector('.credit-loading-overlay'),null);}
  console.log('PASS landing:',scenario);dom.window.close();
 }
 for(const [filename,expected] of [['confluence-pages/lendinganalytics.html','/confluence/download/attachments/3845862527/lending-analytics-hero.jpg'],['pages/lendinganalytics.html','../attachments/lending-analytics-hero.jpg']]){
  const dom=new JSDOM(fs.readFileSync(path.resolve(__dirname,'..',filename),'utf8')),preloads=[...dom.window.document.querySelectorAll('link[rel=preload][as=image]')];
  assert.equal(preloads.length,1,'one priority image preload per landing entry point');assert.equal(preloads[0].getAttribute('type'),'image/jpeg');assert.equal(preloads[0].getAttribute('href'),expected,'preload and rendered image must use the same JPEG attachment');dom.window.close();
 }
 console.log('PASS landing JPEG preload: native fragment and preview.');
 // A timed-out bootstrap must not later overwrite its actionable error screen.
 const dom=new JSDOM('<div id="credit-hub"></div>',{url:'http://localhost',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,root=w.document.getElementById('credit-hub');
 let resolveManifest;w.TextDecoder=TextDecoder;w.CREDIT_CONFIG={mode:'production',page:'portfolio',baseUrl:'http://localhost/attachments/'};
 w.fetch=()=>new Promise(resolve=>{resolveManifest=resolve;});
 w.CreditLoadingOverlay={create:()=>({show(){},paint:async()=>{},destroy(){},wait:async promise=>{promise.catch(()=>{});throw Error('Loading took too long');}})};
 for(const name of ['credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-portfolio-journey.js','credit-pal.js','credit-covenant-risk.js','credit-snapshots.js','credit-monitoring.js','credit-covenants.js','credit-data-cache.js','credit-dashboard.js'])w.eval(read(name));
 await w.CreditHub.mount(root);assert.match(root.textContent,/Loading took too long/);
 w.fetch=async()=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify({schema_version:2,bundle_id:'late',rows:[]})).buffer});
 resolveManifest({ok:true,arrayBuffer:async()=>new TextEncoder().encode(JSON.stringify({schema_version:2,bundle_id:'late',is_demo:false,files:{monitoring:{filename:'m.json',rows:0},sources:{filename:'s.json',rows:0}}})).buffer});await new Promise(r=>setTimeout(r,20));assert.match(root.textContent,/Loading took too long/);dom.window.close();
 console.log('PASS startup timeout: overlay released and late response cannot replace failure.');
})().catch(e=>{console.error(e);process.exitCode=1;});
