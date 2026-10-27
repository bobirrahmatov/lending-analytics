"""Build self-contained dashboard macros with one dashboard-owned stylesheet."""
from pathlib import Path
import re,json,hashlib,shutil
P=Path(__file__).resolve().parents[1]; A=P/'attachments'
W=P/'source/dashboard'
PAGES={'lendingAnalytics':'Lending Analytics','portfolio':'Portfolio Overview','trends':'Portfolio trends','deepdive':'Relationship Deep Dive','overview':'Underwriter Summary','workload':'Underwriter Workload','COVENANTS':'Covenants','CA':'CA expiration','FACILITY':'Facility maturity','CCM':'CCM','INSURANCE':'Insurances','APPRAISALS':'Appraisals','activity':'Covenants Activity'}
# Retired page artifacts must not survive a rebuild or enter deployment packages.
for retired in ['pages/sources.html','confluence-pages/sources.html','attachments/credit-sourcesPage.js','attachments/credit-sourcesHTMLPage.js']:
 (P/retired).unlink(missing_ok=True)
# Dashboard controls and components own their styles and inherit the space font.
base=(W/'controls.css').read_text()
assert '@font-face' not in base
css=base+'\n/* Lending Analytics dashboard components */\n'+(W/'dashboard.css').read_text()
(A/'credit-style.css').write_text(css)
shutil.copyfile(W/'loading-overlay.js',A/'credit-loading-overlay.js')
ui=(W/'ui.js').read_text()
(A/'credit-ui.js').write_text(ui)
# The native sidebar adapter only enhances the host tree; no custom shell exists.
logic='\n;\n'.join((A/f).read_text() for f in ['credit-native-sidebar.js','credit-excel.js','credit-data-cache.js','credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-portfolio-journey.js','credit-pal.js','credit-covenant-risk.js','credit-snapshots.js','credit-monitoring.js','credit-covenants.js','credit-dashboard.js'])
landing='\n;\n'.join((A/f).read_text() for f in ['credit-native-sidebar.js','credit-landing.js'])
rev=hashlib.sha256((css+logic+landing+ui+(A/'credit-loading-overlay.js').read_text()+Path(__file__).read_text()).encode()).hexdigest()[:12]
baseurl='/confluence/download/attachments/3845862527/'
# Optional space-wide upload protection; dashboards do not depend on a navbar include.
(P/'Space_File_Drop_Guard.html').write_text('<!-- Optional wcs space-wide guard. Prevents accidental drops; uploads nothing. -->\n<script src="'+baseurl+'credit-file-drop-guard.js" data-credit-space-key="wcs"></script>\n')
(P/'Space_Navigation.html').write_text('<!-- Paste once into the existing wcs space header/include. Uses native navigation and permissions. -->\n<link rel="stylesheet" href="'+baseurl+'credit-style.css">\n<script src="'+baseurl+'credit-pages.js"></script>\n<script>window.CREDIT_NAV_CONFIG={spaceKey:"wcs"};</script>\n<script defer src="'+baseurl+'credit-native-sidebar.js"></script>\n')
for obsolete in ['Shared_WCSpedia_Include.html','Confluence_With_Header_Macro.html','Confluence_Native_Header_Preview.html']:
 (P/obsolete).unlink(missing_ok=True)
# Stable native IDs; maintain this file when the page tree changes.
assert (A/'credit-pages.js').exists()
for key,title in PAGES.items():
 slug=key.lower();name='credit-'+slug
 guard="const root=document.getElementById('credit-hub');if(!root)return;if(window.CREDIT_CONFIG?.page!=="+json.dumps(key)+"){root.textContent='This page needs its matching dashboard settings and scripts.';return;}"
 (A/(name+'Page.js')).write_text('(function(){\n'+guard+'\n'+(landing if key=='lendingAnalytics' else logic)+'\nwindow.CREDIT_PAGE_BUILD='+json.dumps(rev+':'+key)+';\n})();\n')
 renderer='''(function(){'use strict';GUARD
if(root.dataset.creditStarted)return;
if(window.CREDIT_PAGE_BUILD!==@@BUILD@@||!window.CreditHub){root.textContent='Load the matching dashboard logic before this renderer.';return;}
root.dataset.creditStarted=@@PAGE@@;window.CreditHub.mount(root);
})();'''.replace('GUARD',guard).replace('@@BUILD@@',json.dumps(rev+':'+key)).replace('@@PAGE@@',json.dumps(key))
 (A/(name+'HTMLPage.js')).write_text(renderer)
 fragment='''<!-- TITLE: separate native Confluence page. Header/title/sidebar are owned by Confluence.
     Self-contained dashboard assets; no navbar, access app or portal dependency. -->
<link rel="stylesheet" href="BASEcredit-style.css">
<div id="credit-ui" class="credit-ui-host"><div id="credit-hub" aria-label="TITLE"></div></div>
<script>window.CREDIT_CONFIG={mode:'production',allowSampleData:true,spaceKey:'wcs',page:@@PAGE@@,contextPath:'/confluence',baseUrl:'BASE',pageIds:window.CREDIT_PAGE_IDS||{}};</script>
<script src="BASEcredit-pages.js"></script>
<script>window.CREDIT_CONFIG.pageIds=window.CREDIT_PAGE_IDS;</script>
<script src="BASEcredit-ui.js"></script>
<script src="BASEcredit-loading-overlay.js"></script>
<script src="BASEhighcharts.js"></script>
<script src="BASEhighcharts-accessibility.js"></script>
<script src="BASExlsx.full.min.js"></script>
<script src="BASENAMEPage.js"></script>
<script src="BASENAMEHTMLPage.js"></script>
'''.replace('TITLE',title).replace('@@PAGE@@',json.dumps(key)).replace('BASENAME',baseurl+name).replace('BASE',baseurl).replace('REV',rev)
 if key=='lendingAnalytics':fragment=fragment.replace('class="credit-ui-host"','class="credit-ui-host credit-landing-host"');fragment=re.sub(r'<script src="[^"]*(?:highcharts|xlsx.full.min)[^"]*"></script>\n','',fragment)
 (P/'confluence-pages'/(slug+'.html')).write_text(fragment)
 demo='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TITLE</title><link rel="stylesheet" href="../attachments/credit-style.css"><style>body{margin:0;padding:24px;font-family:Arial,sans-serif;background:#fff}#credit-ui{font-family:inherit}@media(max-width:600px){body{padding:12px 6px}}</style></head><body class="credit-preview"><div id="credit-ui" class="credit-ui-host"><div id="credit-hub" aria-label="TITLE"></div></div><noscript>Enable JavaScript to view this dashboard.</noscript>
<script>window.CREDIT_CONFIG={mode:'demo',page:@@PAGE@@,baseUrl:'../attachments/'};</script>
<script src="../attachments/credit-ui.js"></script><script src="../attachments/credit-loading-overlay.js"></script><script src="../attachments/highcharts.js"></script><script src="../attachments/highcharts-accessibility.js"></script><script src="../attachments/credit-demo-data.js"></script><script src="../attachments/NAMEPage.js"></script><script src="../attachments/NAMEHTMLPage.js"></script></body></html>'''.replace('TITLE',title).replace('@@PAGE@@',json.dumps(key)).replace('NAME',name).replace('REV',rev)
 if key=='COVENANTS':demo=demo.replace('<script src="../attachments/'+name+'Page.js', '<script src="../attachments/credit-covenants-demo.js"></script><script src="../attachments/'+name+'Page.js')
 demo=demo.replace('<script src="../attachments/'+name+'Page.js','<script src="../attachments/credit-comparison-demo.js"></script><script src="../attachments/'+name+'Page.js')
 if key=='lendingAnalytics':demo=demo.replace('class="credit-ui-host"','class="credit-ui-host credit-landing-host"');demo=re.sub(r'<script src="[^"]*(?:highcharts|credit-demo-data|credit-comparison-demo)[^"]*"></script>','',demo)
 (P/'pages'/(slug+'.html')).write_text(demo)
(P/'Confluence_Macro.html').write_text((P/'confluence-pages/portfolio.html').read_text())
# Retain known preview URLs as redirects; old custom-header variants cannot return.
for file in ['Credit_Monitoring_Demo.html']:
 (P/file).write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=pages/portfolio.html"><title>Portfolio dashboard</title><a href="pages/portfolio.html">Open portfolio dashboard</a></html>')
print('Built',len(PAGES),'native page pairs; one shared stylesheet;',rev)
