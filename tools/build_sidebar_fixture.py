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
sidebar = '''<div class="ia-fixed-sidebar"><aside class="acs-side-bar" aria-label="Native Confluence navigation fixture">

<ul><li><div class="plugin_pagetree_children_content"><span class="plugin_pagetree_children_span"><a href="/confluence/pages/viewpage.action?pageId=100">Lending Analytics</a></span></div>
<div class="plugin_pagetree_childtoggle_container"><button id="native-branch" aria-label="Toggle Lending Analytics pages" aria-expanded="true">⌄</button></div>
<div class="plugin_pagetree_children_container"><ul id="native-children">''' + links + '''</ul></div></li>
<li id="fixture-unrelated"><a href="/confluence/pages/viewpage.action?pageId=999" aria-label="Space resources"><span aria-hidden="true">◇</span><span class="fixture-native-label">Space resources</span></a></li>
</ul></aside><div id="fixture-native-footer" class="fixture-native-toolbar-shell"><div class="fixture-native-toolbar-surface"><button id="fixture-space-tools" class="aui-dropdown2-trigger" aria-controls="space-tools-menu" aria-expanded="false">Space tools</button><a href="#" role="button" class="expand-collapse-trigger aui-icon aui-icon-small aui-iconfont-chevron-double-left" aria-label="Sidebar" aria-expanded="true" data-tooltip="Collapse sidebar"></a></div></div>
<aui-dropdown-menu id="space-tools-menu" class="aui-dropdown2 aui-layer" role="menu" tabindex="-1" hidden><ul><li><a href="#configure-sidebar" id="fixture-configure">Configure sidebar</a></li><li><a href="/confluence/pages/viewpage.action?pageId=101">Portfolio settings</a></li></ul></aui-dropdown-menu></div>'''
styles = '''<style>
/* Fixture-only aliases exercise the space's Citi family names without bundling
   or claiming access to the actual proprietary fonts. */
@font-face{font-family:"Citi-Sans-Text";src:local("Arial");font-style:normal;font-weight:400}
@font-face{font-family:"Citi-Sans-Display";src:local("Georgia");font-style:normal;font-weight:400}
@font-face{font-family:"Citi-Sans-Text";src:local("Arial Bold");font-style:normal;font-weight:700}
@font-face{font-family:"Citi-Sans-Display";src:local("Georgia Bold");font-style:normal;font-weight:700}
body,p{font-family:"Citi Sans Text","Citi-Sans-Text",Arial,sans-serif}
h1,.font-display{font-family:"Citi Sans Display","Citi-Sans-Display",Georgia,serif}
/* Deliberately conflicting host rules reproduce Confluence decoration/overrides. */
.acs-side-bar .plugin_pagetree_children_span::before{content:"•";display:inline-block}
.acs-side-bar .aui-icon::before{content:"▣"}
.acs-side-bar svg{width:40px;height:40px;fill:red;stroke:red}
.acs-side-bar svg path{fill:none;stroke:red}
#credit-ui .ch-main{width:100vw;min-width:1200px}
.ch-card{border:12px solid red!important;border-radius:45px!important;background:pink!important;box-shadow:0 0 0 14px pink!important}
.acs-side-bar li::before{content:"•"}
.acs-side-bar{background:#eee!important}
#fixture-native-footer,#fixture-native-footer .fixture-native-toolbar-surface,#fixture-native-footer :is(button,a){background:linear-gradient(#fff,#f7f8fa)!important;background-color:#fff!important}
.acs-side-bar,.acs-side-bar a,.wiki-content h2,.wiki-content h3{font-family:Arial,sans-serif}
.wiki-content{font-family:Arial,sans-serif}.ia-splitter-right{background-color:#eef2f6}
html[data-color-mode="dark"] .ia-splitter-right{background-color:#252a31}
.fixture-shell{display:grid;grid-template-columns:252px minmax(0,1fr);gap:24px}
.fixture-shell.collapsed{grid-template-columns:64px minmax(0,1fr)}
.ia-fixed-sidebar{min-width:0;position:sticky;top:10px;align-self:start}.acs-side-bar{border:1px solid #dce6ef;min-width:0;position:sticky;top:10px;height:90vh;overflow:auto}
.fixture-native-toolbar-shell{min-width:240px!important;border-top:1px solid #dce6ef;white-space:nowrap}
.fixture-native-toolbar-surface{display:flex!important;justify-content:space-between;padding:12px!important}
/* Actual Confluence toggle is an empty icon-font anchor. Native compact styles
   can hide its wrapper and glyph; the skin must reveal only its control path. */
.expand-collapse-trigger::before{content:""!important}
.fixture-shell.collapsed .fixture-native-toolbar-surface{visibility:hidden;opacity:0}
.fixture-shell.collapsed .expand-collapse-trigger{display:none;visibility:hidden;opacity:0}
/* Native AUI menus are separate layers, not part of the compact page-tree rail.
   This viewport-wide layer reproduces the bottom strip if rail CSS forces flex. */
.aui-dropdown2{display:none;position:fixed;inset:auto 0 12px;z-index:50;box-sizing:border-box;width:100vw;padding:10px 20px;background:var(--ds-surface,#fff);border:1px solid #dce6ef;box-shadow:0 4px 12px #17355f22}
.aui-dropdown2:not([hidden]){display:block}.aui-dropdown2 ul{margin:0;padding:0;list-style:none}.aui-dropdown2 a{display:block;padding:7px;font:inherit;color:inherit}
.acs-side-bar ul{padding:0 10px;list-style:none}.acs-side-bar li{padding:5px 0}
.acs-side-bar a{display:flex;align-items:center;gap:0;font-size:13px}
.fixture-shell.collapsed #native-branch span,.fixture-shell.collapsed .fixture-native-label{display:none}
.fixture-shell.collapsed .plugin_pagetree_children_container{display:none}.fixture-content{min-width:0;padding:10px}.fixture-heading{font:12px Arial;color:#666;margin-bottom:12px}
.expand-collapse-trigger,#fixture-space-tools,#native-branch{border:1px solid #dce6ef;border-radius:6px;background:var(--ds-surface,#fff);color:var(--ds-text,#17385e);padding:7px;font:inherit;font-size:12px;max-width:100%}
#fixture-unrelated a{gap:7px;color:inherit;text-decoration:none}
</style>'''
handlers = '''<script>
document.getElementById('fixture-theme').onclick=function(){
  document.documentElement.dataset.colorMode=document.documentElement.dataset.colorMode==='dark'?'light':'dark';
};
let detachedHub=null;
document.getElementById('fixture-space').onclick=function(){
 const content=document.querySelector('.fixture-content .wiki-content');
 if(detachedHub){content.replaceChildren(detachedHub);detachedHub=null;this.textContent='Ordinary space page';}
 else{detachedHub=content.firstElementChild;detachedHub.remove();content.innerHTML='<h1>Space resources</h1><p>Native space page without a dashboard macro.</p>';this.textContent='Dashboard page';}
};
window.CREDIT_NAV_CONFIG={spaceKey:'wcs'};
</script><script>
document.querySelector('.expand-collapse-trigger').onclick=function(event){
  event.preventDefault();
  const collapsed=document.querySelector('.fixture-shell').classList.toggle('collapsed');
  document.querySelector('.acs-side-bar').classList.toggle('acs-side-bar-collapsed',collapsed);
  this.setAttribute('aria-expanded',String(!collapsed));
  this.setAttribute('data-tooltip',collapsed?'Expand sidebar':'Collapse sidebar');
  this.classList.toggle('aui-iconfont-chevron-double-right',collapsed);
  this.classList.toggle('aui-iconfont-chevron-double-left',!collapsed);
  this.replaceChildren();
};
document.getElementById('fixture-space-tools').onclick=function(){
  const menu=document.getElementById('space-tools-menu');menu.hidden=!menu.hidden;
  this.setAttribute('aria-expanded',String(!menu.hidden));
};
document.getElementById('native-branch').onclick=function(){
  const children=document.getElementById('native-children');children.hidden=!children.hidden;
  this.setAttribute('aria-expanded',String(!children.hidden));
};
</script>'''
s = (P / ('pages/'+page+'.html')).read_text()
s = s.replace('</head>', '<meta name="ajs-space-key" content="wcs">' + styles + '</head>', 1)
s = s.replace('<body class="credit-preview">', '<body id="com-atlassian-confluence" class="credit-preview"><button id="fixture-theme">Toggle theme</button> <button id="fixture-space">Ordinary space page</button><p class="fixture-heading">QA fixture only — simulated host and local stand-in Citi font families; no production sidebar or font is created</p><h1 id="title-heading">Native dashboard page title</h1><div class="fixture-shell">' + sidebar + '<div class="fixture-content ia-splitter-right"><div class="wiki-content">', 1)
s = s.replace('<script>window.CREDIT_CONFIG=', '</div></div></div>' + handlers + '<script>window.CREDIT_CONFIG=', 1)
s, replacements = re.subn(r'(page:\s*[\'\"][A-Za-z]+[\'\"],)', lambda match: match.group(1) + 'pageIds:' + json.dumps(ids) + ',', s, count=1)
if replacements != 1:
    raise ValueError('Overview preview settings could not be located; rebuild pages first.')
(P / ('qa/'+(sys.argv[2] if len(sys.argv)>2 else 'native-sidebar-fixture.html'))).write_text(s)
print('Built qa/native-sidebar-fixture.html (local fixture only).')
