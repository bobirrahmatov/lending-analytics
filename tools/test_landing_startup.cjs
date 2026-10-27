const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{JSDOM}=require('jsdom');
const A=path.resolve(__dirname,'../attachments'),read=n=>fs.readFileSync(path.join(A,n),'utf8');
const expectedNativeIds=['3977008171','3977008237','3977008198','3977008221','3977008265','3977008280','3977008303','3977008325','3977008340','3977008348','3977008352'];
(async()=>{
 for(const scenario of ['demo','configured','confirmed','unconfigured','failure']){
  const dom=new JSDOM('<button id="origin">Origin</button><div id="credit-hub"></div>',{url:'http://localhost/pages/lendinganalytics.html',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,d=w.document,root=d.getElementById('credit-hub');
  if(scenario==='confirmed')w.eval(read('credit-pages.js'));
  w.CREDIT_CONFIG={page:'lendingAnalytics',mode:scenario==='demo'?'demo':'production',contextPath:'/confluence',baseUrl:'/confluence/download/attachments/3845862527/',pageIds:scenario==='confirmed'?w.CREDIT_PAGE_IDS:scenario==='configured'?{portfolio:'123',deepdive:'124'}:{}};
  w.CreditUI={enhance(){if(scenario==='failure')throw Error('Test failure');}};
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
    const img=picture.querySelector('img'),source=picture.querySelector('source'),jpg=new URL(img.src),webp=new URL(source.getAttribute('srcset'),w.location.href);
    assert.equal(source.getAttribute('type'),'image/webp');assert.equal(jpg.pathname,'/confluence/download/attachments/3845862527/'+expectedImages[index]+'.jpg');assert.equal(webp.pathname,'/confluence/download/attachments/3845862527/'+expectedImages[index]+'.webp');
    for(const url of [jpg,webp]){assert.equal(url.search,'','image attachments use stable filenames without version queries');assert.equal(url.hash,'');}
    assert.ok(Number(img.width)>0&&Number(img.height)>0,'image dimensions reserve layout space before loading');return expectedImages[index];
   }),expectedImages);
   for(const card of cards){
    assert.equal(card.closest('a,button,[role=link]'),null,'the card shell does not compete with its contained links');
    const images=card.querySelectorAll('.la-area-media img');assert.equal(images.length,1,'one image per subject card');
    const img=images[0],figure=img.closest('figure');assert.ok(figure?.classList.contains('la-area-media'));assert.equal(img.getAttribute('loading'),'lazy');
    assert.ok(new URL(img.src).pathname.startsWith('/confluence/download/attachments/3845862527/'));assert.equal(new URL(img.src).search,'','card images use fixed attachment filenames');
    const fallback=img.getAttribute('src');img.dispatchEvent(new w.Event('error'));
    assert.equal(figure.querySelector('source'),null,'a failed WebP source is removed so the JPEG can be retried');assert.equal(img.getAttribute('src'),fallback,'the original fixed JPEG is the fallback');assert.equal(figure.hidden,false,'the first format failure does not discard a usable JPEG');
    img.dispatchEvent(new w.Event('error'));
    assert.equal(figure.hidden,true,'only failure of both formats hides its own media figure');assert.equal(card.closest('[hidden]'),null,'failed image does not hide its card');
    for(const link of card.querySelectorAll('a.la-page-link'))assert.equal(link.closest('[hidden],a a'),null,'dashboard links remain available after an image fails');
   }
   assert.deepEqual([...root.querySelectorAll('a.la-page-link')].map(a=>a.getAttribute('href')),hrefs,'image failures retain all dashboard destinations');
   assert.equal(root.querySelector('.la-hero').hidden,false,'card image errors leave the hero unchanged');
   hero.dispatchEvent(new w.Event('error'));assert.equal(hero.closest('picture').querySelector('source'),null);assert.equal(hero.closest('figure').hidden,false,'hero also retries the JPEG before hiding');hero.dispatchEvent(new w.Event('error'));assert.equal(hero.closest('figure').hidden,true);
   assert.deepEqual([...root.querySelectorAll('a.la-page-link')].map(a=>a.getAttribute('href')),hrefs,'even failure of every image retains all destinations');
  }
  if(scenario==='configured'){w.eval(read('credit-lendinganalyticsHTMLPage.js'));assert.match(root.textContent,/Load the matching dashboard logic/);assert.equal(d.querySelector('.credit-loading-overlay'),null);}
  console.log('PASS landing:',scenario);dom.window.close();
 }
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
