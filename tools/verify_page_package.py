"""Check deployment boundaries, page pair integrity, and inline/generated JS syntax."""
from pathlib import Path
import re,subprocess,tempfile
P=Path(__file__).resolve().parents[1];A=P/'attachments'
fragments=list((P/'confluence-pages').glob('*.html'));assert len(fragments)==13
assert len([f for f in A.glob('credit-*Page.js') if f.name!='credit-dashboardHTMLPage.js'])==26
for retired in ['pages/sources.html','confluence-pages/sources.html','attachments/credit-sourcesPage.js','attachments/credit-sourcesHTMLPage.js']:
 assert not (P/retired).exists(),retired
assert 'sourceView' not in (A/'credit-dashboard.js').read_text()
for f in fragments:
 s=f.read_text();assert not re.search(r'<(?:html|head|body|header|aside|nav)\b|rel="stylesheet"',s)
 assert "mode:'production'" in s and 'credit-demo-data' not in s
 for filename in re.findall(r'/([^/"?]+\.js)\?',s):assert (A/filename).is_file(),filename
 for inline in re.findall(r'<script>(.*?)</script>',s,re.S):
  with tempfile.NamedTemporaryFile(suffix='.js',mode='w') as temp:
   temp.write(inline);temp.flush();subprocess.run(['node','--check',temp.name],check=True,capture_output=True)
for f in A.glob('credit-*Page.js'):subprocess.run(['node','--check',str(f)],check=True,capture_output=True)
for f in (P/'pages').glob('*.html'):
 s=f.read_text();assert s.count('rel="stylesheet"')==1;assert 'wcspedia-style.css' in s
css=(A/'wcspedia-style.css').read_text();assert '@font-face' not in css
assert '.wcs-ui-popover' in css and '.wcs-reader-navigation' in css and '#credit-hub' in css
assert '.cw-side' not in css and '.cw-shell-frame' not in css
adapter=(A/'credit-native-sidebar.js').read_text()
assert 'fetch(' not in adapter and 'toggle.click()' not in adapter
assert "createElement('aside')" not in adapter and 'setAttribute(\'href\',record.rewritten)' not in adapter
assert all(f.stat().st_size<10_000_000 for f in A.glob('*') if f.is_file())
print('PASS: 13 content-only production fragments, 26 paired scripts, shared CSS, native ownership and attachment sizes.')
