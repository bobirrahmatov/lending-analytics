"""Build content-only Confluence page pairs and ONE global WCSpedia stylesheet."""
from pathlib import Path
import re,json,hashlib,argparse,shutil
P=Path(__file__).resolve().parents[1]; A=P/'attachments'
parser=argparse.ArgumentParser();parser.add_argument('--wcspedia',type=Path,default=P/'source/wcspedia',help='Shared WCSpedia source folder; defaults to the bundled source snapshot.');W=parser.parse_args().wcspedia
PAGES={'lendingAnalytics':'Lending Analytics','portfolio':'Portfolio','trends':'Portfolio trends','deepdive':'Relationship deep dive','overview':'Underwriters Summary','workload':'Underwriter workload','COVENANTS':'Covenants','CA':'CA expiration','FACILITY':'Facility maturity','CCM':'CCM','INSURANCE':'Insurance','APPRAISALS':'Appraisals','activity':'Covenant activity'}
# Retired page artifacts must not survive a rebuild or enter deployment packages.
for retired in ['pages/sources.html','confluence-pages/sources.html','attachments/credit-sourcesPage.js','attachments/credit-sourcesHTMLPage.js']:
 (P/retired).unlink(missing_ok=True)
# Use the font-inheriting production WCSpedia build verbatim, then add scoped dashboard components.
base=(W/'confluence-upload/attachments/wcspedia-style.css').read_text()
base=base.split('/* Dashboard component source.')[0].split('/* Credit dashboard components:')[0]
assert '@font-face' not in base
css=base+'\n/* Credit dashboard components: wcspedia/credit-dashboard.css */\n'+(W/'credit-dashboard.css').read_text()
(A/'wcspedia-style.css').write_text(css)
shutil.copyfile(W/'confluence-upload/attachments/wcspedia-loading-overlay.js',A/'wcspedia-loading-overlay.js')
ui=(W/'ui.js').read_text().replace("  'use strict';","  'use strict';\n  if (global.WCSUI) return;",1)
(A/'wcspedia-ui.js').write_text(ui)
# The native sidebar adapter only enhances the host tree; no custom shell exists.
logic='\n;\n'.join((A/f).read_text() for f in ['credit-native-sidebar.js','credit-data-cache.js','credit-workspace.js','credit-tables.js','credit-chart-details.js','credit-portfolio-journey.js','credit-pal.js','credit-covenant-risk.js','credit-snapshots.js','credit-monitoring.js','credit-covenants.js','credit-dashboard.js'])
landing='\n;\n'.join((A/f).read_text() for f in ['credit-native-sidebar.js','credit-landing.js'])
rev=hashlib.sha256((css+logic+landing+ui+(A/'wcspedia-loading-overlay.js').read_text()+Path(__file__).read_text()).encode()).hexdigest()[:12]
baseurl='/confluence/download/attachments/REPLACE_WITH_ATTACHMENTS_PAGE_ID/'
shared='''<!-- Update the existing navBar once. Replace its current wcspedia-style.css link;
     do not add a second global stylesheet, header or sidebar. Keep other navBar widgets. -->
<link rel="stylesheet" href="BASEwcspedia-style.css?v=REV">
<script src="BASEwcspedia-ui.js?v=REV"></script>
'''.replace('BASE',baseurl).replace('REV',rev)
shared += '''<!-- OPTIONAL: for the same early loading handoff as WCSpedia, keep ONE helper
in navBar after the stylesheet. Merge these numeric page IDs into its existing
allow-list; do not add a second helper. Page settings still precede logic/renderer.
<script src="BASEwcspedia-loading-overlay.js?v=REV" data-wcs-loading-pages="REPLACE_WITH_COMMA_SEPARATED_PAGE_IDS"></script>
-->
'''.replace('BASE',baseurl).replace('REV',rev)
(P/'Shared_WCSpedia_Include.html').write_text(shared)
# Page IDs stay explicit until actual Confluence pages are available.
settings={'lendingAnalytics':'REPLACE_WITH_LENDING_ANALYTICS_PAGE_ID',**{k:'REPLACE_WITH_'+k.upper()+'_PAGE_ID' for k in PAGES}}
if not (A/'credit-pages.js').exists():(A/'credit-pages.js').write_text('/* Set the native Confluence page IDs once; no page URLs are guessed. */\nwindow.CREDIT_PAGE_IDS='+json.dumps(settings,indent=2)+';\n')
for key,title in PAGES.items():
 slug=key.lower();name='credit-'+slug
 guard="const root=document.getElementById('credit-hub');if(!root)return;if(window.CREDIT_CONFIG?.page!=="+json.dumps(key)+"){root.textContent='This page needs its matching dashboard settings and scripts.';window.WCSHeaderLoading?.claim(root)?.destroy();return;}"
 (A/(name+'Page.js')).write_text('(function(){\n'+guard+'\n'+(landing if key=='lendingAnalytics' else logic)+'\nwindow.CREDIT_PAGE_BUILD='+json.dumps(rev+':'+key)+';\n})();\n')
 renderer='''(function(){'use strict';GUARD
if(root.dataset.creditStarted)return;
if(window.CREDIT_PAGE_BUILD!==@@BUILD@@||!window.CreditHub){root.textContent='Load the matching dashboard logic before this renderer.';window.WCSHeaderLoading?.claim(root)?.destroy();return;}
root.dataset.creditStarted=@@PAGE@@;window.CreditHub.mount(root);
})();'''.replace('GUARD',guard).replace('@@BUILD@@',json.dumps(rev+':'+key)).replace('@@PAGE@@',json.dumps(key))
 (A/(name+'HTMLPage.js')).write_text(renderer)
 fragment='''<!-- TITLE: separate native Confluence page. Header/title/sidebar are owned by Confluence.
     First update Shared_WCSpedia_Include.html in existing navBar. No page-specific stylesheet. -->
<div id="credit-hub" aria-label="TITLE"></div>
<script>window.CREDIT_CONFIG={mode:'production',page:@@PAGE@@,contextPath:'/confluence',baseUrl:'BASE',pageIds:window.CREDIT_PAGE_IDS||{}};</script>
<script src="BASEcredit-pages.js?v=REV"></script>
<script>window.CREDIT_CONFIG.pageIds=window.CREDIT_PAGE_IDS;</script>
<script src="BASEwcspedia-loading-overlay.js?v=REV"></script>
<script src="BASEhighcharts.js?v=REV"></script>
<script src="BASEhighcharts-accessibility.js?v=REV"></script>
<script src="BASENAMEPage.js?v=REV"></script>
<script src="BASENAMEHTMLPage.js?v=REV"></script>
'''.replace('TITLE',title).replace('@@PAGE@@',json.dumps(key)).replace('BASENAME',baseurl+name).replace('BASE',baseurl).replace('REV',rev)
 if key=='lendingAnalytics':fragment=re.sub(r'<script src="[^"]*highcharts[^"]*"></script>\n','',fragment)
 (P/'confluence-pages'/(slug+'.html')).write_text(fragment)
 demo='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TITLE — illustrative preview</title><link rel="stylesheet" href="../attachments/wcspedia-style.css?v=REV"><style>body{margin:0;padding:24px;font-family:Arial,sans-serif;background:#fff}#wcspedia{font-family:inherit}@media(max-width:600px){body{padding:12px 6px}}</style></head><body><div id="wcspedia" class="credit-ui-host"><div id="credit-hub" aria-label="TITLE"></div></div><noscript>Enable JavaScript to view this dashboard.</noscript>
<script>window.CREDIT_CONFIG={mode:'demo',page:@@PAGE@@,baseUrl:'../attachments/'};</script>
<script src="../attachments/wcspedia-ui.js?v=REV"></script><script src="../attachments/wcspedia-loading-overlay.js"></script><script src="../attachments/highcharts.js"></script><script src="../attachments/highcharts-accessibility.js"></script><script src="../attachments/credit-demo-data.js?v=REV"></script><script src="../attachments/NAMEPage.js?v=REV"></script><script src="../attachments/NAMEHTMLPage.js?v=REV"></script></body></html>'''.replace('TITLE',title).replace('@@PAGE@@',json.dumps(key)).replace('NAME',name).replace('REV',rev)
 if key=='COVENANTS':demo=demo.replace('<script src="../attachments/'+name+'Page.js', '<script src="../attachments/credit-covenants-demo.js?v='+rev+'"></script><script src="../attachments/'+name+'Page.js')
 demo=demo.replace('<script src="../attachments/'+name+'Page.js','<script src="../attachments/credit-comparison-demo.js?v='+rev+'"></script><script src="../attachments/'+name+'Page.js')
 if key=='lendingAnalytics':demo=re.sub(r'<script src="[^"]*(?:highcharts|credit-demo-data|credit-comparison-demo)[^"]*"></script>','',demo)
 (P/'pages'/(slug+'.html')).write_text(demo)
(P/'Confluence_Macro.html').write_text((P/'confluence-pages/portfolio.html').read_text())
# Retain known preview URLs as redirects; old custom-header variants cannot return.
for file in ['Credit_Monitoring_Demo.html','Confluence_Native_Header_Preview.html']:
 (P/file).write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=pages/portfolio.html"><title>Portfolio dashboard</title><a href="pages/portfolio.html">Open portfolio dashboard</a></html>')
(P/'Confluence_With_Header_Macro.html').write_text('<!-- Retired. Do not install a dashboard header. Use confluence-pages/portfolio.html with the existing WCSpedia navBar and native sidebar. -->\n')
print('Built',len(PAGES),'native page pairs; one shared stylesheet;',rev)
