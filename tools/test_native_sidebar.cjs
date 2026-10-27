const fs = require('fs'), path = require('path'), assert = require('assert/strict'), {JSDOM} = require('jsdom');
const source = fs.readFileSync(path.resolve(__dirname, '../attachments/credit-native-sidebar.js'), 'utf8');
const dom = new JSDOM(`<head><style id="native-canvas-theme">#main{background-color:rgb(240,245,249)}</style></head><body class="citi-hide-sidebar"><aside class="acs-side-bar" style="width: 286px;">
<button id="toggle">Collapse sidebar</button><ul>
<li class="plugin_pagetree_current"><a id="portfolio" href="/confluence/pages/viewpage.action?pageId=101" aria-current="page" aria-describedby="help">Portfolio · WCS 101</a></li>
<li><a href="/confluence/pages/viewpage.action?pageId=102">Underwriter Summary</a></li>
<li><button id="branch" aria-expanded="false">Resources</button><ul id="children" hidden><li><span class="plugin_pagetree_children_span" id="childrenspan103-node"><a href="/confluence/display/wcs/Activity">Covenant activity</a></span></li></ul></li>
<li id="unrelated"><a href="/confluence/pages/viewpage.action?pageId=999" aria-label="Blogs"><span class="existing-icon"></span>Blogs · WCS 999</a><a href="https://external.test/confluence/pages/viewpage.action?pageId=101">External portfolio</a><a href="/confluence/pages/viewpage.action?pageId=101#section">Section</a><a role="button" href="/confluence/pages/viewpage.action?pageId=101" aria-expanded="false">Native branch</a></li>
</ul><div class="acs-side-bar-footer"><button id="space-tools" aria-controls="space-tools-menu" aria-expanded="false">Space tools</button><a href="/confluence/pages/viewpage.action?pageId=101">Footer</a><a href="#" role="button" class="expand-collapse-trigger aui-icon aui-icon-small aui-iconfont-chevron-double-left" aria-expanded="true" aria-label="Sidebar"></a></div>
<aui-dropdown-menu id="space-tools-menu" class="aui-dropdown2 aui-layer" role="menu" tabindex="-1" hidden><ul><li><a id="menu-portfolio" href="/confluence/pages/viewpage.action?pageId=101">Portfolio settings</a></li><li><a href="#configuration">Configure sidebar</a></li></ul></aui-dropdown-menu>
</aside><main id="main" class="ia-splitter-right" style="font-family: Arial, sans-serif;"><div class="wiki-content" style="font-family: Georgia, serif;"><div id="credit-ui" style="color: navy;"><div id="credit-hub"></div></div></div></main></body>`, {
  url: 'https://example.test/confluence/pages/viewpage.action?pageId=101', runScripts: 'outside-only', pretendToBeVisual: true
});
const w = dom.window, d = w.document;
const systemTheme = new w.EventTarget(), themeListeners = new Set();
const addThemeListener = systemTheme.addEventListener.bind(systemTheme), removeThemeListener = systemTheme.removeEventListener.bind(systemTheme);
systemTheme.media = '(prefers-color-scheme: dark)'; systemTheme.matches = false;
systemTheme.addEventListener = (type, listener, options) => { if (type === 'change') themeListeners.add(listener); addThemeListener(type, listener, options); };
systemTheme.removeEventListener = (type, listener, options) => { if (type === 'change') themeListeners.delete(listener); removeThemeListener(type, listener, options); };
w.matchMedia = query => { assert.equal(query, systemTheme.media); return systemTheme; };
w.CREDIT_CONFIG = {pageIds: {portfolio: '101', overview: '102', activity: '103'}};
w.fetch = () => { throw new Error('Sidebar must not request data or permissions.'); };
const sidebar = d.querySelector('aside'), toggle = d.querySelector('#toggle'), branch = d.querySelector('#branch');
const nativeToggle = d.querySelector('.expand-collapse-trigger'), spaceTools = d.querySelector('#space-tools'), menu = d.querySelector('#space-tools-menu');
let calls = 0;
toggle.onclick = () => { calls++; sidebar.classList.toggle('acs-side-bar-collapsed'); };
nativeToggle.onclick = event => { event.preventDefault(); const collapsed = sidebar.classList.toggle('acs-side-bar-collapsed'); nativeToggle.setAttribute('aria-expanded', String(!collapsed)); };
let menuCalls = 0;
spaceTools.onclick = () => { menuCalls++; menu.hidden = !menu.hidden; spaceTools.setAttribute('aria-expanded', String(!menu.hidden)); };
branch.onclick = () => { const children = d.querySelector('#children'); children.hidden = !children.hidden; branch.setAttribute('aria-expanded', String(!children.hidden)); };
const pageKeys = ['lendingAnalytics', 'deepdive', 'workload', 'COVENANTS', 'CA', 'FACILITY', 'CCM', 'INSURANCE', 'APPRAISALS', 'trends'];
pageKeys.forEach((key, i) => { const id = String(200 + i); w.CREDIT_CONFIG.pageIds[key] = id; const li = d.createElement('li'); li.innerHTML = '<a href="/confluence/pages/viewpage.action?pageId=' + id + '">' + key + '</a>'; sidebar.querySelector('ul').append(li); });
const toggleFn = toggle.onclick, branchFn = branch.onclick, originalHrefs = [...d.querySelectorAll('a')].map(a => a.getAttribute('href'));
const nativeToggleFn = nativeToggle.onclick, spaceToolsFn = spaceTools.onclick, menuHTML = menu.outerHTML;
const originalLabels = [...d.querySelectorAll('a')].map(a => a.textContent), unrelated = d.querySelector('#unrelated'), unrelatedHTML = unrelated.outerHTML;
const footerHTML = d.querySelector('.acs-side-bar-footer').outerHTML, sidebarStyle = sidebar.getAttribute('style');
const ui = d.querySelector('#credit-ui'), uiStyle = ui.getAttribute('style');
const ownedPresentation = new Set(['--credit-resolved-space-font', '--credit-resolved-sidebar-background']);
const nativeStyle = element => Array.from(element.style).filter(name => !ownedPresentation.has(name)).map(name => [name, element.style.getPropertyValue(name), element.style.getPropertyPriority(name)]);
const originalNativeStyle = nativeStyle(sidebar), originalUIStyle = nativeStyle(ui);
w.eval(source);
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
(async () => {
  await tick();
  assert.equal(toggle.onclick, toggleFn); assert.equal(branch.onclick, branchFn); assert.equal(calls, 0, 'No forced collapse');
  assert.equal(d.querySelectorAll('aside').length, 1); assert.equal(d.body.className, '', 'Native sidebar is revealed through the existing theme class');
  assert.deepEqual(nativeStyle(sidebar), originalNativeStyle, 'Only owned presentation variables change; native dimensions stay untouched');
  assert.deepEqual(nativeStyle(ui), originalUIStyle, 'Existing dashboard inline styling stays untouched');
  assert.equal(sidebar.style.getPropertyValue('--credit-resolved-space-font'), 'Georgia, serif');
  assert.equal(ui.style.getPropertyValue('--credit-resolved-space-font'), 'Georgia, serif', 'Dashboard uses the native space content font');
  assert.equal(sidebar.style.getPropertyValue('--credit-resolved-sidebar-background'), 'rgb(240, 245, 249)', 'Sidebar uses the native page canvas colour');
  assert.equal(themeListeners.size, 1, 'System theme changes have one listener');
  const nativeCanvasTheme = d.getElementById('native-canvas-theme');
  // A system-theme stylesheet changes without a root class/data/style attribute.
  // Replacing the rule text also invalidates JSDOM's computed-style cache.
  nativeCanvasTheme.textContent = '#main{background-color:rgb(37,42,49)}'; await tick();
  assert.equal(w.getComputedStyle(d.getElementById('main')).backgroundColor, 'rgb(37, 42, 49)');
  assert.equal(sidebar.style.getPropertyValue('--credit-resolved-sidebar-background'), 'rgb(240, 245, 249)', 'Stylesheet mutation alone does not provide an attribute-based refresh');
  systemTheme.matches = true; systemTheme.dispatchEvent(new w.Event('change')); await tick();
  assert.equal(sidebar.style.getPropertyValue('--credit-resolved-sidebar-background'), 'rgb(37, 42, 49)', 'Media-query change resolves the new native canvas colour');
  nativeCanvasTheme.textContent = '#main{background-color:rgb(240,245,249)}';
  systemTheme.matches = false; systemTheme.dispatchEvent(new w.Event('change')); await tick();
  assert.equal(sidebar.style.getPropertyValue('--credit-resolved-sidebar-background'), 'rgb(240, 245, 249)');
  assert.equal(unrelated.outerHTML, unrelatedHTML, 'Unconfigured, external, fragment and branch links are not decorated or rewritten');
  assert.ok(d.querySelector('.acs-side-bar-footer').classList.contains('credit-native-footer'));
  assert.equal(menu.outerHTML, menuHTML, 'Native dropdown content is never decorated, even when a menu link uses a configured dashboard URL');
  assert.ok(nativeToggle.classList.contains('credit-native-toggle-path'), 'Actual Confluence expand-collapse trigger stays available in the footer');
  assert.equal(nativeToggle.onclick, nativeToggleFn); assert.equal(spaceTools.onclick, spaceToolsFn);
  assert.equal(d.querySelectorAll('[data-credit-native-page-link]').length, 13);
  const paths = [...d.querySelectorAll('[data-credit-native-page-icon] path')].map(p => p.getAttribute('d'));
  assert.equal(new Set(paths).size, 13, 'Each configured dashboard has its own icon');
  assert.equal(d.querySelector('[data-credit-native-current=true]').textContent, originalLabels[0]);
  assert.deepEqual([...d.querySelectorAll('a')].map(a => a.textContent), originalLabels, 'All native titles stay unchanged');
  assert.equal(w.CreditSidebar.icon('entitlements'), '', 'No non-dashboard icon API');
  const existing = w.CreditSidebar; w.eval(source); assert.equal(w.CreditSidebar, existing, 'Repeated bundle loading is idempotent');
  toggle.click(); await tick();
  assert.equal(sidebar.dataset.creditNativeCompact, 'true');
  assert.equal(menu.classList.contains('credit-native-compact-path'), false, 'Native dropdown must never be forced into the compact rail');
  assert.equal(menu.hidden, true, 'Collapsing the sidebar does not open the native dropdown');
  assert.equal(menu.querySelector('[data-credit-native-page-link],.credit-native-compact-path'), null);
  assert.deepEqual([...d.querySelectorAll('[data-credit-native-page-icon] path')].map(p => p.getAttribute('d')), paths, 'Same identities in compact state');
  const first = d.querySelector('#portfolio'); first.dispatchEvent(new w.FocusEvent('focusin', {bubbles: true}));
  assert.equal(d.querySelector('[role=tooltip]').textContent, originalLabels[0]);
  assert.equal(first.getAttribute('aria-describedby'), 'help credit-native-sidebar-tooltip');
  d.dispatchEvent(new w.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
  assert.equal(d.querySelector('[role=tooltip]'), null); assert.equal(first.getAttribute('aria-describedby'), 'help');
  unrelated.querySelector('a').dispatchEvent(new w.FocusEvent('focusin', {bubbles: true}));
  assert.equal(d.querySelector('[role=tooltip]'), null, 'Unrelated native links have no dashboard tooltip');
  branch.click(); await tick(); assert.equal(d.querySelector('#children').hidden, false); assert.equal(branch.getAttribute('aria-expanded'), 'true');
  toggle.click(); await tick(); assert.equal(sidebar.dataset.creditNativeCompact, 'false'); assert.equal(calls, 2);
  spaceTools.click(); await tick();
  assert.equal(menu.hidden, false, 'Expanded native footer menu opens through its own handler');
  assert.equal(spaceTools.getAttribute('aria-expanded'), 'true'); assert.equal(menuCalls, 1);
  assert.equal(menu.querySelector('[data-credit-native-page-link],.credit-native-compact-path'), null, 'Opening the menu cannot turn its entries into sidebar links');
  spaceTools.click(); await tick(); assert.equal(menu.outerHTML, menuHTML, 'Native menu closes without dashboard markup or display mutations');
  nativeToggle.click(); await tick(); assert.equal(sidebar.dataset.creditNativeCompact, 'true'); assert.equal(nativeToggle.getAttribute('aria-expanded'), 'false');
  nativeToggle.click(); await tick(); assert.equal(sidebar.dataset.creditNativeCompact, 'false'); assert.equal(nativeToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(nativeToggle.onclick, nativeToggleFn); assert.equal(spaceTools.onclick, spaceToolsFn);
  assert.deepEqual([...d.querySelectorAll('a')].map(a => a.getAttribute('href')), originalHrefs);
  d.querySelector('.plugin_pagetree_current').classList.remove('plugin_pagetree_current'); first.removeAttribute('aria-current');
  d.querySelectorAll('a')[1].setAttribute('aria-current', 'page'); await tick();
  assert.equal(d.querySelector('[data-credit-native-current=true]').textContent, 'Underwriter Summary');
  // A native update may reuse an anchor. It must lose dashboard decoration if its destination changes.
  const retargeted = sidebar.querySelector('a[data-credit-native-page-link="trends"]'); retargeted.setAttribute('href', '/confluence/pages/viewpage.action?pageId=888'); await tick();
  assert.equal(retargeted.hasAttribute('data-credit-native-page-link'), false); assert.equal(retargeted.querySelector('svg'), null); assert.equal(retargeted.textContent, 'trends');
  retargeted.setAttribute('href', '/confluence/pages/viewpage.action?pageId=209'); await tick(); assert.equal(retargeted.dataset.creditNativePageLink, 'trends');
  // AUI may reparent existing links into a menu without changing their URL.
  const treeParent = retargeted.parentElement, treeNext = retargeted.nextSibling;
  menu.querySelector('ul').append(retargeted); await tick();
  assert.equal(retargeted.hasAttribute('data-credit-native-page-link'), false, 'Moving a decorated tree link into a menu restores the anchor');
  assert.equal(retargeted.querySelector('svg,.credit-native-page-label'), null);
  assert.equal(retargeted.textContent, 'trends'); assert.equal(retargeted.hasAttribute('aria-label'), false);
  assert.equal(menu.classList.contains('credit-native-compact-path'), false);
  assert.equal(menu.querySelector('.credit-native-compact-path,.credit-native-link-row'), null);
  treeParent.insertBefore(retargeted, treeNext); await tick();
  assert.equal(retargeted.dataset.creditNativePageLink, 'trends', 'Returning a link to the tree decorates it again');
  assert.equal(menu.outerHTML, menuHTML);
  // The legacy Trends route must not create an extra identity for Portfolio.
  w.CREDIT_CONFIG.pageIds.trends = '101'; w.CreditSidebar.refresh();
  assert.equal(first.dataset.creditNativePageLink, 'portfolio'); assert.equal(retargeted.hasAttribute('data-credit-native-page-link'), false);
  w.CREDIT_CONFIG.pageIds.trends = '209'; w.CreditSidebar.refresh();
  // Entering editor mode removes only dashboard-owned markup, and leaving restores it.
  const editor = d.createElement('form'); editor.id = 'editpageform'; d.body.append(editor); await tick();
  assert.equal(d.querySelector('.credit-native-page-icon'), null); assert.equal(unrelated.outerHTML, unrelatedHTML);
  editor.remove(); await tick(); assert.equal(d.querySelectorAll('[data-credit-native-page-link]').length, 13);
  // Removing the dashboard deactivates the adapter on ordinary space pages.
  const hub = d.querySelector('#credit-hub'); hub.remove(); await tick(); assert.equal(d.querySelector('.credit-native-page-icon'), null);
  d.body.append(hub); await tick(); assert.equal(d.querySelectorAll('[data-credit-native-page-link]').length, 13);
  // Space include runs without a dashboard; space identity must be verified.
  hub.remove(); await tick();
  w.CREDIT_NAV_CONFIG = {spaceKey: 'wcs'};
  w.eval(source); await tick(); assert.equal(d.querySelector('.credit-native-page-icon'), null, 'Unknown space stays untouched');
  const meta = d.createElement('meta'); meta.name = 'ajs-space-key'; meta.content = 'wcs'; d.head.append(meta); await tick();
  assert.equal(d.querySelectorAll('[data-credit-native-page-link]').length, 13, 'Header include skins ordinary space pages');
  assert.ok(sidebar.querySelector('.credit-native-compact-path'));
  // A dashboard-to-ordinary-page switch keeps the native content font even when
  // the macro is absent and the ancestor main element has a different family.
  const spaceContent = ui.parentElement;
  ui.append(hub); await tick(); ui.remove(); await tick();
  assert.equal(d.getElementById('credit-ui'), null);
  assert.equal(sidebar.style.getPropertyValue('--credit-resolved-space-font'), 'Georgia, serif', 'Ordinary wcs pages prefer .wiki-content over the ancestor #main font');
  assert.equal(d.querySelectorAll('[data-credit-native-page-link]').length, 13, 'Ordinary-page switch keeps the configured native links');
  spaceContent.append(ui); await tick();
  assert.equal(ui.style.getPropertyValue('--credit-resolved-space-font'), 'Georgia, serif', 'Returning to a dashboard restores its space typography');
  assert.equal(sidebar.style.getPropertyValue('--credit-resolved-space-font'), 'Georgia, serif');
  assert.equal(d.querySelectorAll('[data-credit-native-page-link]').length, 13, 'Returning does not duplicate navigation icons');
  meta.content = 'OTHER'; await tick(); assert.equal(d.querySelector('.credit-native-page-icon'), null, 'Other spaces stay untouched');
  assert.equal(d.querySelector('.credit-native-compact-path'), null, 'Owned rail paths are restored');
  assert.equal(d.body.className, 'citi-hide-sidebar', 'Host visibility restored outside the scope');
  meta.content = 'WCS'; await tick(); assert.equal(d.querySelectorAll('[data-credit-native-page-link]').length, 13);
  d.body.append(editor); await tick(); assert.equal(d.querySelector('.credit-native-page-icon'), null, 'Global include also skips editor');
  editor.remove(); await tick(); assert.equal(d.querySelectorAll('[data-credit-native-page-link]').length, 13);
  // Existing native controls move visually only; leaf placeholders can be hidden.
  const nativeRow = d.createElement('li');
  nativeRow.innerHTML = '<div class="plugin_pagetree_childtoggle_container"><button id="native-toggle">Expand</button></div><div class="plugin_pagetree_children_content"><span class="plugin_pagetree_children_span"><a href="/confluence/pages/viewpage.action?pageId=101">Portfolio copy</a></span></div>';
  sidebar.querySelector('ul').append(nativeRow); await tick();
  const nativeBranchToggle = nativeRow.querySelector('#native-toggle'), nativeParent = nativeBranchToggle.parentElement;
  assert.ok(nativeRow.classList.contains('credit-native-tree-row'));
  assert.equal(nativeParent.classList.contains('credit-native-leaf-marker'), false, 'Interactive tree control remains visible');
  nativeBranchToggle.remove(); await tick(); assert.ok(nativeParent.classList.contains('credit-native-leaf-marker'));
  nativeParent.append(nativeBranchToggle); await tick(); assert.equal(nativeParent.classList.contains('credit-native-leaf-marker'), false);
  assert.equal(nativeBranchToggle.parentElement, nativeParent, 'Original tree nodes are never reparented');
  const decoratedLink = nativeRow.querySelector('a[href]');
  const nativeIcon = d.createElement('span'); nativeIcon.className = 'aui-icon aui-iconfont-page-default';
  decoratedLink.querySelector('.credit-native-page-label').prepend(nativeIcon); await tick();
  assert.ok(nativeIcon.classList.contains('credit-native-replaced-icon'), 'Native page glyph is replaced, not duplicated');
  assert.equal(decoratedLink.querySelectorAll('.credit-native-page-icon').length, 1);
  const ownedPath = decoratedLink.querySelector('.credit-native-page-icon path');
  assert.equal(ownedPath.getAttribute('fill-rule'), 'evenodd', 'TailAdmin fill paths retain their rule');
  nativeRow.remove(); await tick();
  assert.equal(nativeIcon.className, 'aui-icon aui-iconfont-page-default', 'Decoration classes restore on removal');
  // A fixed outer shell may retain its width while its inner native rail collapses.
  const shell = d.createElement('div'); shell.className = 'ia-fixed-sidebar';
  sidebar.before(shell); shell.append(sidebar); w.CreditSidebar.refresh();
  sidebar.classList.add('acs-side-bar-collapsed'); await tick();
  assert.equal(shell.dataset.creditNativeCompact, 'true', 'Nested native collapsed state reaches the skin');
  const bottom = d.createElement('div'); bottom.className = 'acs-side-bar-bottom';
  bottom.innerHTML = '<div><a href="#configuration">Configure sidebar</a></div><div><button class="ia-toggle-button" aria-label="Expand sidebar"><span>Expand</span></button></div>';
  shell.append(bottom); await tick();
  assert.ok(bottom.classList.contains('credit-native-footer'));
  assert.ok(bottom.querySelector('a').classList.contains('credit-native-configure'));
  assert.ok(bottom.querySelector('button').classList.contains('credit-native-toggle-path'));
  assert.ok(bottom.querySelector('button').parentElement.classList.contains('credit-native-toggle-path'));
  sidebar.classList.remove('acs-side-bar-collapsed'); await tick();
  assert.equal(shell.dataset.creditNativeCompact, 'false');
  bottom.remove(); shell.before(sidebar); shell.remove(); await tick();
  w.CreditSidebar.destroy();
  assert.equal(themeListeners.size, 0, 'Destroy removes the system-theme listener');
  systemTheme.dispatchEvent(new w.Event('change')); await tick();
  assert.equal(d.querySelector('.credit-native-page-icon'), null); assert.equal(sidebar.hasAttribute('data-credit-native-compact'), false);
  assert.equal(d.querySelector('.acs-side-bar-footer').outerHTML, footerHTML, 'Footer is fully restored on teardown');
  assert.equal(menu.outerHTML, menuHTML, 'Native dropdown remains exactly restored on teardown');
  assert.equal(nativeToggle.onclick, nativeToggleFn); assert.equal(spaceTools.onclick, spaceToolsFn);
  assert.equal(sidebar.className, 'acs-side-bar'); assert.equal(toggle.onclick, toggleFn); assert.equal(branch.onclick, branchFn);
  assert.deepEqual([...d.querySelectorAll('a')].map(a => a.getAttribute('href')), originalHrefs);
  assert.deepEqual([...d.querySelectorAll('a')].map(a => a.textContent), originalLabels);
  assert.equal(d.body.className, 'citi-hide-sidebar'); assert.equal(sidebar.getAttribute('style'), sidebarStyle); assert.equal(unrelated.outerHTML, unrelatedHTML);
  assert.equal(ui.getAttribute('style'), uiStyle, 'Owned typography variables restore exactly on teardown');
  assert.equal(first.getAttribute('aria-describedby'), 'help'); assert.equal(first.hasAttribute('aria-label'), false);
  console.log('PASS native dashboard navigation: configured tree links only, native menus excluded during relocation, native titles/URLs/handlers/dimensions preserved, footer menu and real collapse trigger, compact icons and accessible tooltip, dynamic retargeting, alias identity, editor/page teardown. Local fixture only.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => dom.window.close());
