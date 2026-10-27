/* Real segmented control scheduling: rapid selection, busy ownership and recovery. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
const dom=new JSDOM('<main id="root"><div class="pal-segments"><button data-value="a">A</button><button data-value="b">B</button><button data-value="c">C</button></div><div class="cov-segments"><button data-value="x">X</button></div></main>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
w.eval(fs.readFileSync(path.resolve(__dirname,'../attachments/credit-workspace.js'),'utf8'));
const controls=w.CreditControls,group=w.document.querySelector('.pal-segments'),[a,b,c]=group.querySelectorAll('button'),x=w.document.querySelector('.cov-segments button'),deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
(async()=>{
 const calls=[];
 await Promise.all([controls.run(a,()=>calls.push('a')),controls.run(b,()=>calls.push('b')),controls.run(c,()=>calls.push('c'))]);
 assert.deepEqual(calls,['c'],'Rapid same-turn tab selection applies the last click');assert.equal(group.hasAttribute('aria-busy'),false);
 const first=deferred(),second=deferred(),older=controls.run(a,()=>{calls.push('first');return first.promise;});await Promise.resolve();
 const newer=controls.run(b,()=>{calls.push('second');return second.promise;});await Promise.resolve();assert.equal(calls.at(-1),'second','An in-flight render must not discard another tab click');
 first.resolve();await older;assert.equal(group.getAttribute('aria-busy'),'true','Older completion must not release a newer request');
 second.resolve();await newer;assert.equal(group.hasAttribute('aria-busy'),false);
 const stalled=deferred(),previous=controls.run(a,()=>stalled.promise);await Promise.resolve();
 await controls.run(c,()=>calls.push('latest'));assert.equal(group.hasAttribute('aria-busy'),false,'Latest completion releases the control even if an obsolete render is still pending');stalled.resolve();await previous;
 await Promise.all([controls.run(a,()=>calls.push('group-one')),controls.run(x,()=>calls.push('group-two'))]);assert.deepEqual(calls.slice(-2),['group-one','group-two'],'Independent controls both run');
 await assert.rejects(controls.run(b,()=>Promise.reject(Error('render failed'))),/render failed/);assert.equal(group.hasAttribute('aria-busy'),false);await controls.run(c,()=>calls.push('recovered'));assert.equal(calls.at(-1),'recovered');
 dom.window.close();console.log('PASS segmented controls: latest click wins, independent groups, obsolete completion isolation, error recovery.');
})().catch(error=>{dom.window.close();console.error(error);process.exitCode=1;});
