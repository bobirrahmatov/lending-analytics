"""Local-only benchmark. Synthetic rows stay in the browser and are never published."""
from pathlib import Path
P=Path(__file__).resolve().parents[1]
html=(P/'pages/portfolio.html').read_text()
html=html.replace('<div id="credit-hub"', '<section style="padding:16px;background:#eef4ff;margin-bottom:24px"><h1>Local performance check · 75,000 illustrative facilities</h1><p>Measures JSON parsing, validation, calculations and actual chart rendering. Excludes network transfer and synthetic data generation. This is not live Confluence validation.</p><button id="run-benchmark">Run 75,000-row benchmark</button><pre id="benchmark-result" style="white-space:pre-wrap">Not run</pre></section><div id="credit-hub"')
import re
html=re.sub(r'<script src="[^\"]*credit-portfolioHTMLPage.js[^\"]*"></script>','',html)
html=html.replace('</body>',r'''<script>
document.getElementById('run-benchmark').onclick=async function(){
 this.disabled=true;const output=document.getElementById('benchmark-result');output.textContent='Preparing illustrative input…';
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 try{
 const original=CREDIT_DEMO.datasets.portfolio,rows=Array.from({length:75000},(_,i)=>{
  const r={...original[i%original.length]};if(i>=original.length){r.facility_key='BENCH-'+i;r.facility_id='BENCH-FA-'+i;r.source_record_id='BENCH-SOURCE-'+i;r.relationship_id='BENCH-R-'+i;r.relationship_name='Illustrative benchmark relationship '+i;r.ca_id='BENCH-CA-'+i;}return r;
 });
 const input=JSON.stringify(rows);const bytes=new TextEncoder().encode(input).byteLength;
 output.textContent='Running validation and rendering…';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
 const start=performance.now();CREDIT_DEMO.datasets.portfolio=JSON.parse(input);const parsed=performance.now();
 CREDIT_DEMO.datasets.sources.find(s=>s.domain==='PORTFOLIO').record_count=75000;
 CREDIT_DEMO.manifest.files.portfolio.rows=75000;
 const mountStart=performance.now();await CreditHub.mount(document.getElementById('credit-hub'));
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const ready=performance.now();
 if(document.querySelector('.ch-error'))throw Error(document.querySelector('.ch-error').textContent);
 const filterStart=performance.now(),criteria={region:'EMEA',product:'Real Estate'};
 const selected=CreditDataCache.select(CREDIT_DEMO.datasets.portfolio,criteria);const filterEnd=performance.now();
 const cachedStart=performance.now();for(let i=0;i<1000;i++)CreditDataCache.select(CREDIT_DEMO.datasets.portfolio,criteria);const cachedEnd=performance.now();
 const expected=CREDIT_DEMO.datasets.portfolio.filter(r=>r.region===criteria.region&&r.product===criteria.product);if(expected.length!==selected.length)throw Error('Filter parity failed');
 const result={build:CREDIT_PAGE_BUILD,rows:75000,distinctRelationships:new Set(rows.map(r=>r.relationship_id)).size,payloadBytes:bytes,jsonParseMs:parsed-start,mountAndPaintMs:ready-mountStart,parseToChartsMs:ready-start,firstFilterMs:filterEnd-filterStart,cachedFilterMeanMs:(cachedEnd-cachedStart)/1000,matchingRows:selected.length,renderedCharts:document.querySelectorAll('.highcharts-root').length,processingUnderFiveSeconds:ready-start<5000,userAgent:navigator.userAgent};
 output.textContent=JSON.stringify(result,null,2);
 }catch(e){output.textContent='FAILED: '+e.message;}
};
</script></body>''')
(P/'qa/performance-75000.html').write_text(html)
print('Created qa/performance-75000.html; illustrative data generated only on button click.')
