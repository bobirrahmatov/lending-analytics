/* Execute the generated native macros in declaration order, without portal
   globals or a navbar include. Geometry is covered by the real-chart checks. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');

const project = path.resolve(__dirname, '..');
const assets = path.join(project, 'attachments');
const runtime = path.join(project, 'excel/runtime');
const manifest = JSON.parse(fs.readFileSync(path.join(runtime, 'credit-manifest.json'), 'utf8'));
const attachmentPath = '/confluence/download/attachments/3845862527/';
const expectedIds = ['3977008171', '3977008237', '3977008198', '3977008221', '3977008265', '3977008280', '3977008303', '3977008325', '3977008340', '3977008348', '3977008352'];
const tick = () => new Promise(resolve => setTimeout(resolve, 25));

async function mountMacro(page, pageId) {
  const macro = fs.readFileSync(path.join(project, 'confluence-pages', page + '.html'), 'utf8');
  const dom = new JSDOM(`<!doctype html><html><head><meta name="ajs-space-key" content="wcs"></head><body>
    <header id="native-header"><button id="native-action">Native action</button></header>
    <aside class="acs-side-bar" style="width:286px"><button id="native-toggle">Collapse</button>
      <a href="/confluence/pages/viewpage.action?pageId=${pageId}">Current dashboard</a>
      <div id="native-unrelated"><a href="/confluence/pages/viewpage.action?pageId=999">Other space content</a></div>
    </aside><main id="native-content">${macro}</main></body></html>`, {
    url: 'https://confluence.example.test/confluence/pages/viewpage.action?pageId=' + pageId,
    runScripts: 'outside-only', pretendToBeVisual: true
  });
  const w = dom.window, d = w.document, root = d.getElementById('credit-hub');
  const errors = [], reads = new Map(), executed = [], mounts = [];
  const native = d.getElementById('native-header'), unrelated = d.getElementById('native-unrelated');
  const nativeHTML = native.innerHTML, unrelatedHTML = unrelated.outerHTML;
  const toggle = d.getElementById('native-toggle'), sidebar = d.querySelector('aside');
  const ownedPresentation = new Set(['--credit-resolved-space-font', '--credit-resolved-sidebar-background']);
  const nativeStyle = () => Array.from(sidebar.style).filter(name => !ownedPresentation.has(name)).map(name => [name, sidebar.style.getPropertyValue(name), sidebar.style.getPropertyPriority(name)]);
  const originalNativeStyle = nativeStyle();
  let nativeClicks = 0, overlaysCreated = 0;
  const nativeHandler = () => { nativeClicks++; };
  toggle.onclick = nativeHandler;
  w.TextDecoder = TextDecoder;
  w.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.addEventListener('error', event => errors.push(String(event.error || event.message)));
  const observer = new w.MutationObserver(changes => {
    for (const change of changes) for (const node of change.addedNodes) {
      if (node.nodeType === 1 && node.matches('.credit-loading-overlay')) overlaysCreated++;
    }
  });
  observer.observe(d.body, {childList: true});
  w.fetch = async (url, options) => {
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.cache, 'no-cache');
    const address = new URL(url, w.location.href);
    assert.equal(address.origin, w.location.origin);
    assert.equal(address.search, '');
    assert.equal(address.hash, '');
    assert.equal(path.posix.dirname(address.pathname) + '/', attachmentPath);
    const filename = path.posix.basename(address.pathname);
    reads.set(filename, (reads.get(filename) || 0) + 1);
    const bytes = fs.readFileSync(path.join(runtime, filename));
    return {ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)};
  };

  try {
    assert.equal(d.querySelector('#credit-ui > #credit-hub'), root, 'Macro owns its independent UI host');
    assert.equal(d.querySelectorAll('link[rel=stylesheet]').length, 1, 'Exactly one shared dashboard stylesheet');
    assert.equal(d.querySelector('link[rel=stylesheet]').getAttribute('href'), attachmentPath + 'credit-style.css');
    assert.equal(w.CreditUI, undefined, 'No preloaded UI dependency');
    assert.equal(w.CreditLoadingOverlay, undefined, 'No preloaded loading helper');

    // outside-only prevents jsdom from fetching/evaluating scripts automatically.
    // Execute the generated script tags exactly as an ordered HTML macro does.
    for (const script of d.querySelectorAll('#native-content script')) {
      const src = script.getAttribute('src');
      if (!src) { w.eval(script.textContent); continue; }
      const address = new URL(src, w.location.href);
      assert.equal(address.origin, w.location.origin);
      assert.equal(path.posix.dirname(address.pathname) + '/', attachmentPath);
      assert.equal(address.search, '');
      const filename = path.posix.basename(address.pathname);
      const code = fs.readFileSync(path.join(assets, filename), 'utf8');
      executed.push(filename);
      // Do not pretend jsdom validates chart geometry. All application bundles,
      // XLSX parsing, controls and loading code below are their actual assets.
      if (['highcharts.js', 'highcharts-accessibility.js'].includes(filename)) continue;
      if (filename === 'credit-' + page + 'Page.js') {
        assert.equal(w.CREDIT_CONFIG.mode, 'production', 'Settings precede the page logic');
        assert.equal(w.CREDIT_CONFIG.pageIds.portfolio, '3977008171', 'Native page map precedes the page logic');
        assert.equal(typeof w.CreditUI?.enhance, 'function', 'UI dependency precedes the page logic');
        assert.equal(typeof w.CreditLoadingOverlay?.create, 'function', 'Loading dependency precedes the page logic');
        if (page === 'portfolio') assert.equal(typeof w.XLSX?.read, 'function', 'Workbook parser precedes the page logic');
      }
      w.eval(code);
      if (filename === 'credit-' + page + 'Page.js') {
        const mount = w.CreditHub.mount;
        w.CreditHub.mount = (...args) => { const result = mount(...args); mounts.push(result); return result; };
      }
    }
    assert.equal(mounts.length, 1, 'Matching generated HTMLPage renderer starts the generated Page bundle once');
    await Promise.all(mounts);
    const settled = async () => {
      for (let attempt = 0; attempt < 200; attempt++) {
        await tick();
        if (!root.hasAttribute('aria-busy') && !root.querySelector('[aria-busy=true]')) break;
      }
      assert.equal(root.hasAttribute('inert'), false);
      assert.equal(root.hasAttribute('aria-busy'), false);
      assert.equal(root.querySelector('[aria-busy=true]'), null);
      assert.equal(root.querySelector('.ch-error,[role=alert]'), null, root.textContent.slice(-1000));
      assert.deepEqual(errors, []);
    };
    await settled();
    assert.equal(overlaysCreated, 1, 'Standalone startup creates one loading overlay');
    assert.equal(d.querySelector('.credit-loading-overlay'), null, 'Startup releases the overlay');
    assert.equal(d.body.style.overflow, '', 'Startup restores scrolling');
    assert.equal(root.dataset.creditStarted, page === 'lendinganalytics' ? 'lendingAnalytics' : page);
    assert.equal(executed.at(-1), 'credit-' + page + 'HTMLPage.js');
    assert.equal(d.querySelector('#wcspedia'), null);
    assert.equal(w.WCSUI, undefined);
    assert.equal(w.WCSHeaderLoading, undefined);
    assert.equal(w.WCSLoadingOverlay, undefined);
    assert.equal(w.CREDIT_DEMO, undefined, 'No embedded preview data bypasses production loading');

    const checkNative = () => {
      assert.equal(native.innerHTML, nativeHTML);
      assert.equal(unrelated.outerHTML, unrelatedHTML);
      assert.equal(toggle.onclick, nativeHandler);
      assert.deepEqual(nativeStyle(), originalNativeStyle, 'Native geometry and styling stay unchanged; only owned font/background variables are allowed');
      assert.equal(d.querySelectorAll('aside').length, 1);
    };
    checkNative(); toggle.click(); assert.equal(nativeClicks, 1);
    return {dom, w, root, reads, settled, checkNative, close() { observer.disconnect(); dom.window.close(); }};
  } catch (error) {
    observer.disconnect(); dom.window.close(); throw error;
  }
}

(async () => {
  const landing = await mountMacro('lendinganalytics', '3782729579');
  try {
    const hrefs = [...landing.root.querySelectorAll('a.la-page-link')].map(a => a.getAttribute('href'));
    assert.deepEqual(hrefs, expectedIds.map(id => '/confluence/pages/viewpage.action?pageId=' + id));
    assert.equal(landing.reads.size, 0, 'Landing loads no financial records');
  } finally { landing.close(); }

  const portfolio = await mountMacro('portfolio', '3977008171');
  try {
    const {root, w, reads, settled} = portfolio;
    for (const name of ['sources', 'monitoring', 'portfolio', 'activity', 'history', 'documents']) {
      assert.equal(reads.get(manifest.files[name].filename), 1, name + ' workbook read once');
    }
    root.querySelector('[data-portfolio-view=data]').click(); await settled();
    assert.equal(root._exportRows.length, manifest.files.portfolio.rows, 'Data register reconciles to the real workbook');
    const originalIds = Array.from(root._exportRows, row => row.facility_key);
    const readsBefore = JSON.stringify([...reads]);
    const drill = root.querySelector('#ch-table [data-ct-row-drill]');
    assert.ok(drill, 'Generated renderer binds keyboard-accessible table drilling');
    drill.click();
    const frame = root.querySelector('.cd-table-drill');
    assert.ok(frame, 'Row opens the same-widget detail');
    assert.equal(root.querySelector('dialog.ca-overlay'), null, 'Row does not open another dialog');
    frame.querySelector('[data-inline-reset]').click();
    assert.equal(root.querySelector('.cd-table-drill'), null, 'Back restores the register');
    const search = root.querySelector('#ch-search');
    search.value = 'STANDALONE_MACRO_NO_MATCH'; search.dispatchEvent(new w.Event('input'));
    assert.equal(root._exportRows.length, 0);
    root.querySelector('#ch-reset').click(); await settled();
    assert.deepEqual(Array.from(root._exportRows, row => row.facility_key), originalIds);
    assert.equal(root.querySelector('#ch-search').value, '');
    assert.equal(JSON.stringify([...reads]), readsBefore, 'Drill and Reset reuse the validated workbook set');
    portfolio.checkNative();
  } finally { portfolio.close(); }
  console.log('PASS standalone native macros: ordered generated page pairs, independent assets/overlay, 11 destinations, native host isolation, actual XLSX data, table drill and Reset.');
})().catch(error => { console.error(error); process.exitCode = 1; });
