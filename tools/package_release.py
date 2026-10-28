"""Package content-only native pages and dashboard-owned assets."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import hashlib
P=Path(__file__).resolve().parents[1]
assets=['credit-style.css','credit-ui.js','credit-pages.js','credit-loading-overlay.js','highcharts.js','highcharts-accessibility.js','xlsx.full.min.js','SheetJS-LICENSE.txt','credit-file-drop-guard.js','credit-native-sidebar.js','lending-analytics-hero.jpg','lending-portfolio.jpg','lending-underwriting.jpg','lending-monitoring.jpg']
assets += ['lending-analytics-hero.webp','lending-portfolio.webp','lending-underwriting.webp','lending-monitoring.webp']
assets += [f.name for f in sorted((P/'attachments').glob('credit-*Page.js'))]
instructions=(P/'Lending_Analytics_Deployment.txt').read_text()
(P/'INSTALL.txt').write_text(instructions)
with ZipFile(P/'Confluence_Deployment.zip','w',ZIP_DEFLATED) as z:
 for name in assets:
  f=P/'attachments'/name;assert f.stat().st_size<10_000_000;z.write(f,'attachments/'+name)
 for f in sorted((P/'confluence-pages').glob('*.html')):z.write(f,'confluence-pages/'+f.name)
 for name in ['Space_Navigation.html','Space_File_Drop_Guard.html','INSTALL.txt','LICENSES.txt','Covenants_Field_Parity.txt','Covenants_Risk_Reporting.txt','All_Pages_Data_Handoff.txt','Lending_Analytics_Deployment.txt']:z.write(P/name,name)
# Keep only current validation evidence and maintained browser fixtures.
keep_qa = {
 'Dashboard_Refinement_Verification.txt',
 'Data_Linkage_Verification.json',
 'Landing-Centered-Intro.png',
 'Landing-FAQs-Mobile.png',
 'Landing-FAQs.png',
 'Landing_Cards_Verification.txt',
 'Landing_FAQ_Verification.txt',
 'Layout_Regression_Browser.json',
 'Lending-Analytics-Cards-Mobile.png',
 'Lending-Analytics-Cards.png',
 'PAL_Chart_Traceability.txt',
 'Performance_75000.json',
 'Portfolio-Three-Card-Row.png',
 'Portfolio_Three_Card_Row_Verification.txt',
 'README.txt',
 'Reset-Tabs-Verified.png',
 'Reset_Tab_Performance_Verification.txt',
 'Reset_Tabs_Browser.json',
 'Standalone-Dashboard-Expanded.png',
 'Standalone-Dashboard-Portfolio.png',
 'Standalone_Dashboard_Verification.txt',
 'Table-Typography-Portfolio.png',
 'Table_Drill_Adaptive_Verification.txt',
 'Table_Typography_Browser.json',
 'Table_Typography_Verification.txt',
 'Table_Confluence_Style_Verification.txt',
 'excel-runtime.html',
 'landing-cards-responsive.html',
 'layout-regression.html',
 'native-sidebar-fixture.html',
 'performance-75000.html',
 'table-style-regression.html',
}
# A complete source archive must not sweep up unrelated local exports or backups.
package_dirs={'attachments','confluence-pages','pages','source','tools','excel','demo-comparison','Data_Integration_Kit','.github','qa'}
package_root_files={'README.md','AGENTS.md','.gitignore','.nvmrc','package.json','package-lock.json','Start_Here.html','Space_Navigation.html','Space_File_Drop_Guard.html','Confluence_Macro.html','Credit_Monitoring_Demo.html','INSTALL.txt','LICENSES.txt','Covenants_Field_Parity.txt','Covenants_Risk_Reporting.txt','All_Pages_Data_Handoff.txt','Lending_Analytics_Deployment.txt'}
with ZipFile(P/'Credit_Monitoring_Package.zip','w',ZIP_DEFLATED) as z:
 for f in sorted(P.rglob('*')):
  if not f.is_file():continue
  rel=f.relative_to(P)
  if (len(rel.parts)==1 and rel.name not in package_root_files) or (len(rel.parts)>1 and rel.parts[0] not in package_dirs):continue
  if rel.parts[:2]==('demo-comparison','pages'):continue
  if any(x in rel.parts for x in ['.git','node_modules','__pycache__','fixtures','styles']) or f.suffix.lower() in ['.ndjson','.pyc','.zip','.log','.tmp','.pem','.key','.p12','.accdb','.mdb'] or f.name in ['.DS_Store','Credit_Monitoring_Package.zip','Confluence_With_Header_Macro.html','SHA256SUMS']:continue
  if f.name=='.env' or f.name.startswith('.env.'):continue
  if rel.parts[0]=='qa' and f.name not in keep_qa:continue
  z.write(f,rel.as_posix())
for name in ['Confluence_Deployment.zip','Credit_Monitoring_Package.zip','Data_Integration_Kit.zip']:
 with ZipFile(P/name) as z:
  assert z.testzip() is None;assert (P/name).stat().st_size<10_000_000;print(name,len(z.namelist()),'files', (P/name).stat().st_size,'bytes')
(P/'SHA256SUMS').write_text(''.join(hashlib.sha256((P/name).read_bytes()).hexdigest()+'  '+name+'\n' for name in ['Credit_Monitoring_Package.zip','Confluence_Deployment.zip','Data_Integration_Kit.zip']))
