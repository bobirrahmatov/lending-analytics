const fs = require('fs'), path = require('path'), assert = require('assert/strict'), {JSDOM} = require('jsdom');
const source = fs.readFileSync(path.resolve(__dirname, '../attachments/credit-native-sidebar.js'), 'utf8');
const dom = new JSDOM(`<body class="citi-hide-sidebar"><aside class="acs-side-bar" style="width: 286px">
<button id="toggle">Collapse sidebar</button><ul>
<li class="plugin_pagetree_current"><a id="portfolio" href="/confluence/pages/viewpage.action?pageId=101" aria-current="page" aria-describedby="help">Portfolio · WCS 101</a></li>
<li><a href="/confluence/pages/viewpage.action?pageId=102">Underwriter Summary</a></li>
<li><button id="branch" aria-expanded="false">Resources</button><ul id="children" hidden><li><span class="plugin_pagetree_children_span" id="childrenspan103-node"><a href="/confluence/display/wcs/Activity">Covenant activity</a></span></li></ul></li>
<li id="unrelated"><a href="/confluence/pages/viewpage.action?pageId=999" aria-label="Blogs"><span class="existing-icon"></span>Blogs · WCS 999</a><a href="https://external.test/confluence/pages/viewpage.action?pageId=101">External portfolio</a><a href="/confluence/pages/viewpage.action?pageId=101#section">Section</a><a role="button" href="/confluence/pages/viewpage.action?pageId=101" aria-expanded="false">Native branch</a></li>
</ul><div class="acs-side-bar-footer"><a href="/confluence/pages/viewpage.action?pageId=101">Footer</a></div></aside><div id="credit-hub"></div></body>`, {
  url: 'https://example.test/confluence/pages/viewpage.action?pageId=101', runScripts: 'outside-only', pretendToBeVisual: true
});
const w = dom.window, d = w.document;
w.CREDIT_CONFIG = {pageIds: {portfolio: '101', overview: '102', activity: '103'}};
w.fetch = () => { throw new Error('Sidebar must not request data or permissions.'); };
const sidebar = d.querySelector('aside'), toggle = d.querySelector('#toggle'), branch = d.querySelector('#branch');
let calls = 0;
toggle.onclick = () => { calls++; sidebar.classList.toggle('acs-side-bar-collapsed'); };
branch.onclick = () => { const children = d.querySelector('#children'); children.hidden = !children.hidden; branch.setAttribute('aria-expanded', String(!children.hidden)); };
const pageKeys = ['lendingAnalytics', 'deepdive', 'workload', 'COVENANTS', 'CA', 'FACILITY', 'CCM', 'INSURANCE', 'APPRAISALS', 'trends'];
pageKeys.forEach((key, i) => { const id = String(200 + i); w.CREDIT_CONFIG.pageIds[key] = id; const li = d.createElement('li'); li.innerHTML = '<a href="/confluence/pages/viewpage.action?pageId=' + id + '">' + key + '</a>'; sidebar.querySelector('ul').append(li); });
const toggleFn = toggle.onclick, branchFn = branch.onclick, originalHrefs = [...d.querySelectorAll('a')].map(a => a.getAttribute('href'));
const originalLabels = [...d.querySelectorAll('a')].map(a => a.textContent), unrelated = d.querySelector('#unrelated'), unrelatedHTML = unrelated.outerHTML;
const footerHTML = d.querySelector('.acs-side-bar-footer').outerHTML, sidebarStyle = sidebar.getAttribute('style');
w.eval(source);
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
(async () => {
  await tick();
  assert.equal(toggle.onclick, toggleFn); assert.equal(branch.onclick, branchFn); assert.equal(calls, 0, 'No forced collapse');
  assert.equal(d.querySelectorAll('aside').length, 1); assert.equal(d.body.className, '', 'Native sidebar is revealed through the existing theme class');
  assert.equal(sidebar.getAttribute('style'), sidebarStyle, 'Native dimensions stay untouched');
  assert.equal(unrelated.outerHTML, unrelatedHTML, 'Unconfigured, external, fragment and branch links are not decorated or rewritten');
  assert.ok(d.querySelector('.acs-side-bar-footer').classList.contains('credit-native-footer'));
  assert.equal(d.querySelectorAll('[data-credit-native-page-link]').length, 13);
  const paths = [...d.querySelectorAll('[data-credit-native-page-icon] path')].map(p => p.getAttribute('d'));
  assert.equal(new Set(paths).size, 13, 'Each configured dashboard has its own icon');
  assert.equal(d.querySelector('[data-credit-native-current=true]').textContent, originalLabels[0]);
  assert.deepEqual([...d.querySelectorAll('a')].map(a => a.textContent), originalLabels, 'All native titles stay unchanged');
  assert.equal(w.CreditSidebar.icon('entitlements'), '', 'No non-dashboard icon API');
  const existing = w.CreditSidebar; w.eval(source); assert.equal(w.CreditSidebar, existing, 'Repeated bundle loading is idempotent');
  toggle.click(); await tick();
  assert.equal(sidebar.dataset.creditNativeCompact, 'true');
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
  assert.deepEqual([...d.querySelectorAll('a')].map(a => a.getAttribute('href')), originalHrefs);
  d.querySelector('.plugin_pagetree_current').classList.remove('plugin_pagetree_current'); first.removeAttribute('aria-current');
  d.querySelectorAll('a')[1].setAttribute('aria-current', 'page'); await tick();
  assert.equal(d.querySelector('[data-credit-native-current=true]').textContent, 'Underwriter Summary');
  // A native update may reuse an anchor. It must lose dashboard decoration if its destination changes.
  const retargeted = sidebar.querySelector('a[data-credit-native-page-link="trends"]'); retargeted.setAttribute('href', '/confluence/pages/viewpage.action?pageId=888'); await tick();
  assert.equal(retargeted.hasAttribute('data-credit-native-page-link'), false); assert.equal(retargeted.querySelector('svg'), null); assert.equal(retargeted.textContent, 'trends');
  retargeted.setAttribute('href', '/confluence/pages/viewpage.action?pageId=209'); await tick(); assert.equal(retargeted.dataset.creditNativePageLink, 'trends');
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
  const nativeToggle = nativeRow.querySelector('#native-toggle'), nativeParent = nativeToggle.parentElement;
  assert.ok(nativeRow.classList.contains('credit-native-tree-row'));
  assert.equal(nativeParent.classList.contains('credit-native-leaf-marker'), false, 'Interactive tree control remains visible');
  nativeToggle.remove(); await tick(); assert.ok(nativeParent.classList.contains('credit-native-leaf-marker'));
  nativeParent.append(nativeToggle); await tick(); assert.equal(nativeParent.classList.contains('credit-native-leaf-marker'), false);
  assert.equal(nativeToggle.parentElement, nativeParent, 'Original tree nodes are never reparented');
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
  assert.equal(d.querySelector('.credit-native-page-icon'), null); assert.equal(sidebar.hasAttribute('data-credit-native-compact'), false);
  assert.equal(d.querySelector('.acs-side-bar-footer').outerHTML, footerHTML, 'Footer is fully restored on teardown');
  assert.equal(sidebar.className, 'acs-side-bar'); assert.equal(toggle.onclick, toggleFn); assert.equal(branch.onclick, branchFn);
  assert.deepEqual([...d.querySelectorAll('a')].map(a => a.getAttribute('href')), originalHrefs);
  assert.deepEqual([...d.querySelectorAll('a')].map(a => a.textContent), originalLabels);
  assert.equal(d.body.className, 'citi-hide-sidebar'); assert.equal(sidebar.getAttribute('style'), sidebarStyle); assert.equal(unrelated.outerHTML, unrelatedHTML);
  assert.equal(first.getAttribute('aria-describedby'), 'help'); assert.equal(first.hasAttribute('aria-label'), false);
  console.log('PASS native dashboard navigation: configured links only, native titles/URLs/handlers/dimensions preserved, compact icons and accessible tooltip, dynamic retargeting, alias identity, editor/page teardown. Local fixture only.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => dom.window.close());
