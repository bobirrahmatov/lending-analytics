"""Build a local native-host fixture. No production sidebar is created."""
from pathlib import Path
import html
import json
import re
import sys

page = sys.argv[1] if len(sys.argv) > 1 else "overview"

P = Path(__file__).resolve().parents[1]
pages = {
    'portfolio': 'Portfolio Overview', 'overview': 'Underwriter Summary',
    'workload': 'Underwriter Workload', 'deepdive': 'Relationship Deep Dive',
    'COVENANTS': 'Covenants', 'activity': 'Covenants Activity', 'CCM': 'CCM',
    'CA': 'CA Expiration', 'FACILITY': 'Facility Maturity',
    'INSURANCE': 'Insurances', 'APPRAISALS': 'Appraisals',
}
ids = {'lendingAnalytics': '100', **{key: str(101 + i) for i, key in enumerate(pages)}}
links = ''.join(
    '<li><div class="plugin_pagetree_childtoggle_container">·</div><div class="plugin_pagetree_children_content"><span class="plugin_pagetree_children_span"><a href="/confluence/pages/viewpage.action?pageId='
    + ids[key] + '"' + (' aria-current="page"' if key.lower() == page else '') + '>'
    + '<span class="aui-icon aui-iconfont-page-default" aria-hidden="true"></span>' + html.escape(title) + '</a></span></div></li>' for key, title in pages.items()
)
sidebar = '''<aside class="acs-side-bar" aria-label="Native Confluence navigation fixture">
<button class="acs-side-bar-toggle" aria-label="Collapse sidebar" aria-expanded="true">☰</button>
<ul><li><div class="plugin_pagetree_children_content"><span class="plugin_pagetree_children_span"><a href="/confluence/pages/viewpage.action?pageId=100">Lending Analytics</a></span></div>
<div class="plugin_pagetree_childtoggle_container"><button id="native-branch" aria-label="Toggle Lending Analytics pages" aria-expanded="true">⌄</button></div>
<div class="plugin_pagetree_children_container"><ul id="native-children">''' + links + '''</ul></div></li>
<li id="fixture-unrelated"><a href="/confluence/pages/viewpage.action?pageId=999" aria-label="Space resources"><span aria-hidden="true">◇</span><span class="fixture-native-label">Space resources</span></a></li>
</ul><div class="acs-side-bar-footer"><a href="#configure-sidebar" id="fixture-configure">Configure sidebar</a></div></aside>'''
styles = '''<style>
/* Deliberately conflicting host rules reproduce Confluence decoration/overrides. */
.acs-side-bar .plugin_pagetree_children_span::before{content:"•";display:inline-block}
.acs-side-bar .aui-icon::before{content:"▣"}
.acs-side-bar svg{width:40px;height:40px;fill:red;stroke:red}
.acs-side-bar svg path{fill:none;stroke:red}
.acs-side-bar li::before{content:"•"}
.fixture-shell{display:grid;grid-template-columns:252px minmax(0,1fr);gap:24px}
.fixture-shell.collapsed{grid-template-columns:64px minmax(0,1fr)}
.acs-side-bar{border:1px solid #dce6ef;min-width:0;position:sticky;top:10px;height:90vh;overflow:auto}
.acs-side-bar-footer{padding:12px;border-top:1px solid #dce6ef;white-space:nowrap}
.acs-side-bar ul{padding:0 10px;list-style:none}.acs-side-bar li{padding:5px 0}
.acs-side-bar a{display:flex;align-items:center;gap:0;font-size:13px}
.fixture-shell.collapsed #native-branch span,.fixture-shell.collapsed .fixture-native-label{display:none}
.fixture-shell.collapsed .plugin_pagetree_children_container{display:none}.fixture-content{min-width:0;padding:10px;background:var(--credit-theme-subtle,#f0f5f9)}.fixture-heading{font:12px Arial;color:#666;margin-bottom:12px}
.acs-side-bar-toggle,#native-branch{border:1px solid #dce6ef;border-radius:6px;background:var(--ds-surface,#fff);color:var(--ds-text,#17385e);padding:7px;font:inherit;font-size:12px;max-width:100%}
#fixture-unrelated a{gap:7px;color:inherit;text-decoration:none}
</style>'''
handlers = '''<script>
document.getElementById('fixture-theme').onclick=function(){
  document.documentElement.dataset.colorMode=document.documentElement.dataset.colorMode==='dark'?'light':'dark';
};
let detachedHub=null;
document.getElementById('fixture-space').onclick=function(){
 const content=document.querySelector('.fixture-content');
 if(detachedHub){content.replaceChildren(detachedHub);detachedHub=null;this.textContent='Ordinary space page';}
 else{detachedHub=content.firstElementChild;detachedHub.remove();content.innerHTML='<h1>Space resources</h1><p>Native space page without a dashboard macro.</p>';this.textContent='Dashboard page';}
};
window.CREDIT_NAV_CONFIG={spaceKey:'wcs'};
</script><script>
document.querySelector('.acs-side-bar-toggle').onclick=function(){
  const collapsed=document.querySelector('.fixture-shell').classList.toggle('collapsed');
  document.querySelector('.acs-side-bar').classList.toggle('acs-side-bar-collapsed',collapsed);
  this.setAttribute('aria-expanded',String(!collapsed));
  this.setAttribute('aria-label',collapsed?'Expand sidebar':'Collapse sidebar');
};
document.getElementById('native-branch').onclick=function(){
  const children=document.getElementById('native-children');children.hidden=!children.hidden;
  this.setAttribute('aria-expanded',String(!children.hidden));
};
</script>'''
s = (P / ('pages/'+page+'.html')).read_text()
s = s.replace('</head>', '<meta name="ajs-space-key" content="wcs">' + styles + '</head>', 1)
s = s.replace('<body class="credit-preview">', '<body class="credit-preview"><button id="fixture-theme">Toggle theme</button> <button id="fixture-space">Ordinary space page</button><p class="fixture-heading">QA fixture only — simulated native host tree; no production sidebar is created</p><div class="fixture-shell">' + sidebar + '<div class="fixture-content">', 1)
s = s.replace('<script>window.CREDIT_CONFIG=', '</div></div>' + handlers + '<script>window.CREDIT_CONFIG=', 1)
s, replacements = re.subn(r'(page:\s*[\'\"][A-Za-z]+[\'\"],)', lambda match: match.group(1) + 'pageIds:' + json.dumps(ids) + ',', s, count=1)
if replacements != 1:
    raise ValueError('Overview preview settings could not be located; rebuild pages first.')
(P / ('qa/'+(sys.argv[2] if len(sys.argv)>2 else 'native-sidebar-fixture.html'))).write_text(s)
print('Built qa/native-sidebar-fixture.html (local fixture only).')
