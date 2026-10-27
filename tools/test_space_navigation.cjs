/* Execute the space include on ordinary native pages, without dashboard/data code. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),include=fs.readFileSync(path.join(root,'Space_Navigation.html'),'utf8');
async function run(space,editor=false){
 const dom=new JSDOM('<html><head><meta name="ajs-space-key" content="'+space+'"></head><body><aside class="acs-side-bar"><a href="/confluence/pages/viewpage.action?pageId=3977008171">Portfolio</a></aside>'+(editor?'<form id="editpageform"></form>':'')+include+'</body></html>',{url:'https://example.test/confluence/pages/viewpage.action?pageId=999',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document,executed=[];w.fetch=()=>{throw Error('Space navigation must not read dashboard data or permissions');};
 try{
  for(const script of d.querySelectorAll('script')){
   const src=script.getAttribute('src');
   if(!src){w.eval(script.textContent);continue;}
   const url=new URL(src,w.location.href);assert.equal(url.pathname.startsWith('/confluence/download/attachments/3845862527/'),true);assert.equal(url.search,'');
   const file=path.basename(url.pathname);executed.push(file);w.eval(fs.readFileSync(path.join(root,'attachments',file),'utf8'));
  }
  await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(executed,['credit-pages.js','credit-native-sidebar.js']);
  assert.equal(d.querySelectorAll('link[rel=stylesheet]').length,1);
  assert.equal(w.CreditHub,undefined);assert.equal(w.XLSX,undefined);assert.equal(w.Highcharts,undefined);
  assert.equal(d.querySelectorAll('.credit-native-page-icon').length,space==='wcs'&&!editor?1:0);
  w.eval(fs.readFileSync(path.join(root,'attachments/credit-native-sidebar.js'),'utf8'));
  assert.equal(d.querySelectorAll('.credit-native-page-icon').length,space==='wcs'&&!editor?1:0,'Repeated include does not duplicate icons');
 }finally{w.CreditSidebar?.destroy();w.close();}
}
(async()=>{await run('wcs');await run('other');await run('wcs',true);console.log('PASS space header include: ordinary wcs pages, single stylesheet, no dashboard/data dependency, other spaces/editor exclusion and idempotence.');})().catch(e=>{console.error(e);process.exitCode=1;});
