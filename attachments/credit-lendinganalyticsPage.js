(function(){
const root=document.getElementById('credit-hub');if(!root)return;if(window.CREDIT_CONFIG?.page!=="lendingAnalytics"){root.textContent='This page needs its matching dashboard settings and scripts.';return;}
/* Dashboard icons on Confluence's existing navigation. Native URLs, titles,
 * tree controls, dimensions and collapse preferences stay native. The optional
 * space include also styles ordinary reader pages in the configured space. */
(function (w, d) {
  'use strict';
  if (w.CreditSidebar) { w.CreditSidebar.refresh(); return; }
  var host = null, observer = null, resizeObserver = null, queued = false, destroyed = false, ownsHostClass = false, revealOwned = false;
  var decorations = new Map();
  var links = new Map(), tooltip = null, tooltipLink = null, previousDescription = null;
  var iconPaths = {
    lendingAnalytics: 'M3 21h18 M4 9l8-6 8 6H4z M6 11v7 M12 11v7 M18 11v7',
    portfolio: 'M3 8h18v12H3z M8 8V4h8v4 M3 12h18 M10 12v3h4v-3',
    trends: 'M3 3v18h18 M6 15l4-5 4 2 6-7 M16 5h4v4',
    deepdive: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14 M15 15l6 6 M7 11V8 M10 11V6 M13 11V9',
    overview: 'M4 4h16v16H4z M7 8h2 M12 8h5 M7 12h2 M12 12h5 M7 16h2 M12 16h5',
    workload: 'M9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6 M3 20v-3a6 6 0 0 1 12 0v3 M17 4a3 3 0 0 1 0 6 M18 14a5 5 0 0 1 3 4v2',
    COVENANTS: 'M5 3h10l4 4v14H5z M14 3v5h5 M8 13l2 2 5-5 M8 18h8',
    CA: 'M12 3l8 4v5c0 5-8 9-8 9S4 17 4 12V7z M8 12l3 3 5-6',
    FACILITY: 'M4 21V4h10v17 M14 10h6v11 M2 21h20 M7 8h4 M7 12h4 M7 16h4 M17 14h1 M17 18h1',
    CCM: 'M3 12h4l3-7 4 14 3-7h4 M4 5V3h16v2 M4 19v2h16v-2',
    INSURANCE: 'M3 12a9 9 0 0 1 18 0H3z M12 3v16a2 2 0 0 0 4 0 M12 4c-3 2-4 5-4 8 M12 4c3 2 4 5 4 8',
    APPRAISALS: 'M3 21h18 M5 18l7-14 7 14H5z M9 14h6 M12 10v4',
    activity: 'M4 7h13l-3-3 M20 17H7l3 3 M4 7v6 M20 17v-6 M9 10l3 3-3 3'
  };
  function configuredPages() {
    var pages = w.CREDIT_CONFIG?.pageIds || w.CREDIT_PAGE_IDS || {}, result = new Map();
    Object.keys(iconPaths).forEach(function (key) {
      var id = String(pages[key] || '');
      // The Portfolio identity wins when the legacy Trends route shares its ID.
      if (/^[1-9]\d*$/.test(id) && !result.has(id)) result.set(id, key);
    });
    return result;
  }
  function pageId(a) {
    try {
      var url = new URL(a.getAttribute('href'), w.location.href);
      if (url.origin !== w.location.origin || url.hash) return null;
      if (/\/pages\/viewpage\.action$/.test(url.pathname)) {
        var id = url.searchParams.get('pageId') || '';
        return /^[1-9]\d*$/.test(id) ? id : null;
      }
      var pathId = (url.pathname.match(/\/spaces\/[^/]+\/pages\/([1-9]\d*)(?:\/|$)/) || [])[1];
      if (pathId) return pathId;
      if (url.pathname.includes('/display/')) return (a.closest('.plugin_pagetree_children_span')?.id.match(/^childrenspan([1-9]\d*)-/) || [])[1] || null;
    } catch (_) {}
    return null;
  }
  function active() {
    if (!w.location) return false;
    if (d.querySelector('#editpageform,#content-editor,body.contenteditor') || /\/(?:admin|spaces\/edit|pages\/(?:edit|create)|login)/.test(w.location.pathname) || /[?&](?:pageVersion=|preview=)/.test(w.location.search)) return false;
    var configured = String(w.CREDIT_NAV_CONFIG?.spaceKey || w.CREDIT_CONFIG?.spaceKey || 'wcs').toLowerCase();
    var meta = d.querySelector('meta[name="ajs-space-key"]')?.content || d.querySelector('meta[name="confluence-space-key"]')?.content;
    var route = (w.location.pathname.match(/\/(?:display|spaces)\/([^/]+)/) || [])[1];
    var space = String(meta || route || '').toLowerCase();
    if (space && space !== configured) return false;
    return !!d.getElementById('credit-hub') || !!(w.CREDIT_NAV_CONFIG?.spaceKey && space === configured);
  }
  // Only add presentation classes to existing native nodes. Track ownership so
  // rerenders, retargeted links and editor transitions can restore them exactly.
  function decorateTree() {
    var desired = new Map();
    function mark(el, name) { if (!el) return; if (!desired.has(el)) desired.set(el, new Set()); desired.get(el).add(name); }
    links.forEach(function (_, a) {
      for (var parent = a.parentElement; parent && parent !== host; parent = parent.parentElement) mark(parent, 'credit-native-compact-path');
      var content = a.closest('.plugin_pagetree_children_content'), row = content?.parentElement;
      if (!row) return;
      var toggle = Array.from(row.children).find(function (el) { return el.classList.contains('plugin_pagetree_childtoggle_container'); });
      if (toggle) {
        mark(row, 'credit-native-tree-row');
        if (!toggle.querySelector('a,button,[role=button],[data-type=toggle]')) mark(toggle, 'credit-native-leaf-marker');
      }
    });
    decorations.forEach(function (names, el) {
      names.forEach(function (name) { if (!desired.get(el)?.has(name)) { el.classList.remove(name); names.delete(name); } });
      if (!names.size) decorations.delete(el);
    });
    desired.forEach(function (names, el) {
      names.forEach(function (name) {
        if (el.classList.contains(name)) return;
        el.classList.add(name); if (!decorations.has(el)) decorations.set(el, new Set()); decorations.get(el).add(name);
      });
    });
  }
  function restoreAttribute(element, name, value) {
    if (value === null) element.removeAttribute(name); else element.setAttribute(name, value);
  }
  function hideTooltip() {
    if (tooltipLink) restoreAttribute(tooltipLink, 'aria-describedby', previousDescription);
    tooltip?.remove(); tooltip = null; tooltipLink = null; previousDescription = null;
  }
  function restoreLink(a, record) {
    if (tooltipLink === a) hideTooltip();
    record.icon.remove();
    if (record.label.parentNode === a) record.label.replaceWith(...Array.from(record.label.childNodes));
    if (record.ariaLabel === null && a.getAttribute('aria-label') === record.generatedLabel) a.removeAttribute('aria-label');
    restoreAttribute(a, 'data-credit-native-page-link', record.pageMarker);
    restoreAttribute(a, 'data-credit-native-current', record.currentMarker);
    links.delete(a);
  }
  function enhance() {
    var pages = configuredPages();
    links.forEach(function (record, a) {
      if (!host.contains(a) || pages.get(pageId(a)) !== record.key || record.icon.parentNode !== a || record.label.parentNode !== a) restoreLink(a, record);
    });
    host.querySelectorAll('a[href]').forEach(function (a) {
      if (a.matches('[role=button],[aria-expanded],.plugin_pagetree_childtoggle,[data-type=toggle]') || a.closest('.acs-side-bar-footer')) return;
      var key = pages.get(pageId(a));
      if (!key) return;
      if (!links.has(a)) {
        var icon = d.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('width', '16'); icon.setAttribute('height', '16');
        icon.setAttribute('aria-hidden', 'true'); icon.setAttribute('focusable', 'false'); icon.setAttribute('class', 'credit-native-page-icon');
        icon.setAttribute('data-credit-native-page-icon', key);
        var path = d.createElementNS(icon.namespaceURI, 'path'); path.setAttribute('d', iconPaths[key]); icon.append(path);
        var label = d.createElement('span'); label.className = 'credit-native-page-label';
        var record = {key: key, icon: icon, label: label, ariaLabel: a.getAttribute('aria-label'), generatedLabel: a.textContent.trim(), pageMarker: a.getAttribute('data-credit-native-page-link'), currentMarker: a.getAttribute('data-credit-native-current')};
        while (a.firstChild) label.append(a.firstChild);
        a.append(label); a.prepend(icon); links.set(a, record);
        a.setAttribute('data-credit-native-page-link', key);
        if (record.ariaLabel === null) a.setAttribute('aria-label', record.generatedLabel);
      }
      var row = a.closest('li');
      var selected = a.matches('[aria-current="page"]') || !!a.closest('.plugin_pagetree_children_span.plugin_pagetree_current') || !!row && row.matches('.plugin_pagetree_current');
      if (a.getAttribute('data-credit-native-current') !== String(selected)) a.setAttribute('data-credit-native-current', String(selected));
    });
    decorateTree();
  }
  function showTooltip(event) {
    var a = event.target.closest?.('a[data-credit-native-page-link]');
    if (!host || host.getAttribute('data-credit-native-compact') !== 'true' || !a || !links.has(a)) return;
    if (tooltipLink === a) return;
    hideTooltip();
    tooltip = d.createElement('div'); tooltip.id = 'credit-native-sidebar-tooltip'; tooltip.className = 'credit-native-sidebar-tooltip';
    tooltip.setAttribute('role', 'tooltip'); tooltip.textContent = a.getAttribute('aria-label') || a.textContent.trim(); d.body.append(tooltip);
    tooltipLink = a; previousDescription = a.getAttribute('aria-describedby');
    a.setAttribute('aria-describedby', [previousDescription, tooltip.id].filter(Boolean).join(' '));
    var box = a.getBoundingClientRect(), tip = tooltip.getBoundingClientRect();
    tooltip.style.left = Math.max(8, Math.min(box.right + 12, w.innerWidth - tip.width - 8)) + 'px';
    tooltip.style.top = Math.max(8, Math.min(box.top + (box.height - tip.height) / 2, w.innerHeight - tip.height - 8)) + 'px';
  }
  function leaveTooltip(event) { if (tooltipLink && !tooltipLink.contains(event.relatedTarget) && !tooltip?.contains(event.relatedTarget)) hideTooltip(); }
  function escapeTooltip(event) { if (event.key === 'Escape') hideTooltip(); }
  function compactState() {
    if (!host) return;
    var width = host.getBoundingClientRect().width;
    var compact = host.matches('.ia-splitter-left-collapsed,.acs-side-bar-collapsed') || !!host.closest('.ia-splitter-left-collapsed') || (width > 0 && width <= 96);
    if (host.getAttribute('data-credit-native-compact') !== String(compact)) { host.setAttribute('data-credit-native-compact', String(compact)); hideTooltip(); }
  }
  function reset() {
    hideTooltip(); resizeObserver?.disconnect(); resizeObserver = null;
    if (host) {
      host.removeEventListener('mouseover', showTooltip); host.removeEventListener('focusin', showTooltip);
      host.removeEventListener('mouseout', leaveTooltip); host.removeEventListener('focusout', leaveTooltip);
      host.removeAttribute('data-credit-native-compact');
      if (ownsHostClass) host.classList.remove('credit-native-navigation');
    }
    links.forEach(function (record, a) { restoreLink(a, record); });
    decorations.forEach(function (names, el) { names.forEach(function (name) { el.classList.remove(name); }); }); decorations.clear();
    if (revealOwned) { d.body.classList.add('citi-hide-sidebar'); revealOwned = false; }
    host = null; ownsHostClass = false;
  }
  function refresh() {
    if (destroyed || !d.body) return;
    if (!active()) { reset(); return; }
    var native = d.querySelector('.ia-fixed-sidebar,.acs-side-bar,#sidebar');
    if (!native) { reset(); return; }
    if (host !== native) {
      reset(); host = native; ownsHostClass = !host.classList.contains('credit-native-navigation'); host.classList.add('credit-native-navigation');
      host.addEventListener('mouseover', showTooltip); host.addEventListener('focusin', showTooltip);
      host.addEventListener('mouseout', leaveTooltip); host.addEventListener('focusout', leaveTooltip);
      if (w.ResizeObserver) { resizeObserver = new w.ResizeObserver(compactState); resizeObserver.observe(host); }
    }
    if (d.body.classList.contains('citi-hide-sidebar')) { revealOwned = true; d.body.classList.remove('citi-hide-sidebar'); }
    enhance(); compactState();
  }
  function schedule() { if (!queued && !destroyed) { queued = true; Promise.resolve().then(function () { queued = false; refresh(); }); } }
  function start() {
    refresh(); if (observer || !d.body || destroyed) return;
    observer = new w.MutationObserver(function (changes) {
      if (changes.some(function (change) {
        if (change.type === 'attributes') {
          if (change.target.matches('meta[name="ajs-space-key"],meta[name="confluence-space-key"]')) return true;
          if (change.attributeName === 'class' && (change.oldValue || '') === (change.target.getAttribute('class') || '')) return false;
          return !!host && (host.contains(change.target) || change.target.contains(host));
        }
        if (host?.contains(change.target)) return true;
        return Array.from(change.addedNodes).concat(Array.from(change.removedNodes)).some(function (node) {
          return node.nodeType === 1 && (node === host || node.contains(host) || node.matches('#credit-hub,#editpageform,#content-editor,.ia-fixed-sidebar,.acs-side-bar,#sidebar,meta[name="ajs-space-key"],meta[name="confluence-space-key"]') || node.querySelector('#credit-hub,#editpageform,#content-editor,.ia-fixed-sidebar,.acs-side-bar,#sidebar,meta[name="ajs-space-key"],meta[name="confluence-space-key"]'));
        });
      })) schedule();
    });
    observer.observe(d.documentElement, {childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['class', 'aria-current', 'href', 'content']});
  }
  function destroy() {
    destroyed = true; observer?.disconnect(); observer = null; reset();
    d.removeEventListener('DOMContentLoaded', start); w.removeEventListener('hashchange', schedule); w.removeEventListener('resize', compactState);
    w.removeEventListener('scroll', hideTooltip, true); d.removeEventListener('keydown', escapeTooltip);
  }
  w.CreditSidebar = {refresh: refresh, destroy: destroy, icon: function (key) {
    return iconPaths[key] ? '<svg class="la-page-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="' + iconPaths[key] + '"/></svg>' : '';
  }};
  d.addEventListener('DOMContentLoaded', start); w.addEventListener('hashchange', schedule); w.addEventListener('resize', compactState);
  w.addEventListener('scroll', hideTooltip, true); d.addEventListener('keydown', escapeTooltip);
  if (d.body) start();
})(window, document);

;
/* Lending Analytics introduction. Native Confluence owns the title and sidebar. */
(function(w){'use strict';
 const areas=[
  ['portfolio','Portfolio & relationships','Understand the portfolio','Review exposure, new business and upcoming expirations. Explore the relationships behind the numbers.',[
   ['portfolio','Portfolio Overview'],['deepdive','Relationship Deep Dive']]],
  ['underwriting','Underwriting','Focus the work','See what needs attention, who owns it and where workload or aging is concentrated.',[
   ['overview','Underwriter Summary'],['workload','Underwriter Workload']]],
  ['monitoring','Credit monitoring','Follow the obligations','Explore due dates, exceptions and recorded changes across the credit-monitoring lifecycle.',[
   ['COVENANTS','Covenants'],['activity','Covenants Activity'],['CCM','CCM'],['CA','CA Expiration'],['FACILITY','Facility Maturity'],['INSURANCE','Insurances'],['APPRAISALS','Appraisals']]]
 ];
 const faqs=[
  ['Which dashboard should I start with?','Start with Portfolio Overview for exposure, new business and upcoming expirations. Use Underwriter Summary for monitoring priorities and Underwriter Workload for owner queues. Open Relationship Deep Dive or a monitoring page for a closer look.'],
  ['What changes when I drill into a chart or table?','Selecting a chart segment or table row narrows that widget. Page filters apply to the supported measures across the page. Use the breadcrumb or Back to return; Reset clears page filters and local selections.'],
  ['How current is the information?','Results reflect the reporting dates supplied by each source. An open dashboard keeps its loaded snapshot; reload the page to check for newly published data. Comparisons appear only when suitable historical records are available.'],
  ['How do I view and download supporting records?','Select Data or expand a chart to inspect its supporting table. Choose the relevant dataset and use search or column filters to narrow the records. Download data exports all matching rows from the selected dataset across every table page.']
 ];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function destination(key,c){if(c.mode==='demo')return './'+key.toLowerCase()+'.html';const id=String(c.pageIds?.[key]||'');return /^[1-9]\d*$/.test(id)?(c.contextPath||'/confluence').replace(/\/$/,'')+'/pages/viewpage.action?pageId='+id:null;}
 const arrow='<svg class="la-link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
 function link([key,title],c){const href=destination(key,c);return '<li>'+(href?'<a class="la-page-link" href="'+esc(href)+'"><span>'+esc(title)+'</span>'+arrow+'</a>':'<span class="la-page-label">'+esc(title)+'</span>')+'</li>';}
 function faqSection(){return '<section class="la-faq" aria-labelledby="la-faq-title"><h2 id="la-faq-title">Frequently asked questions</h2><div class="la-faq-list">'+faqs.map(([question,answer],i)=>'<div class="la-faq-item"><h3><button type="button" id="la-faq-question-'+i+'" aria-expanded="false" aria-controls="la-faq-answer-'+i+'"><span>'+esc(question)+'</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 12h14"/><path class="la-faq-vertical" d="M12 5v14"/></svg></button></h3><div class="la-faq-answer" id="la-faq-answer-'+i+'" role="region" aria-labelledby="la-faq-question-'+i+'" aria-hidden="true" inert><div><p>'+esc(answer)+'</p></div></div></div>').join('')+'</div></section>';}
 w.CreditHub={async mount(root){const config=w.CREDIT_CONFIG||{},loading=w.CreditLoadingOverlay?.create({target:root});
  try{loading?.show('Loading Lending Analytics…');await loading?.paint?.();
   const assets=(config.baseUrl||'../attachments/').replace(/\/?$/,'/'),image=assets+'lending-analytics-hero.jpg',heading=config.mode==='demo'?'h1':'h2';
   root.innerHTML='<main class="la-landing">'+
    '<div class="la-intro"><'+heading+'>From portfolio insight<br>to the next action.</'+heading+'><p>A connected view of lending exposure, underwriting priorities and credit monitoring. Start with the bigger picture, explore what needs attention and follow each result to its supporting records.</p></div>'+
    '<figure class="la-hero"><img src="'+esc(image)+'" alt="Abstract data streams connecting a city skyline" width="1916" height="1080" decoding="async" fetchpriority="high"></figure>'+
    '<section class="la-purpose" aria-labelledby="la-purpose-title"><h2 id="la-purpose-title">One place to understand<br>the lending picture.</h2><div><p>Lending Analytics brings facility, covenant and CCM information together for portfolio oversight and day-to-day credit work. It connects financial exposure with the obligations and people responsible for monitoring it.</p><p>Use the sidebar to move between views. Each page answers a specific question; the records behind a result retain their own source, reporting date and business context.</p></div></section>'+
    '<section class="la-areas" aria-label="Explore Lending Analytics">'+areas.map(([key,category,title,description,links])=>'<article class="la-area" aria-labelledby="la-area-'+key+'"><figure class="la-area-media"><img src="'+esc(assets+'lending-'+key+'.jpg')+'" alt="" width="640" height="480" loading="lazy" decoding="async"></figure><div class="la-area-copy"><p class="la-category">'+esc(category)+'</p><h2 id="la-area-'+key+'">'+esc(title)+'</h2><p class="la-area-description">'+esc(description)+'</p><ul class="la-links" aria-label="'+esc(category)+' dashboards">'+links.map(item=>link(item,config)).join('')+'</ul></div></article>').join('')+'</section>'+
    '<section class="la-journey" aria-labelledby="la-journey-title"><div><p class="la-eyebrow">From summary to detail</p><h2 id="la-journey-title">Explore without losing<br>your place.</h2></div><ol><li><strong>Set your scope</strong><span>Choose the available region, product or owner filters. Applied filters remain visible on the page.</span></li><li><strong>Follow a result</strong><span>Select a chart segment or table row to explore its detail. Use the breadcrumb to step back through your selection.</span></li><li><strong>See the supporting records</strong><span>Expand a chart for a focused analysis, then inspect its detailed table. Close returns you to the dashboard.</span></li></ol></section>'+faqSection()+'</main>';
   root.querySelectorAll('.la-hero img,.la-area-media img').forEach(img=>img.addEventListener('error',()=>{img.closest('figure').hidden=true;},{once:true}));
   root.querySelectorAll('.la-faq-item button').forEach(button=>button.addEventListener('click',()=>{
    const expanded=button.getAttribute('aria-expanded')!=='true',answer=root.querySelector('#'+button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded',String(expanded));answer.setAttribute('aria-hidden',String(!expanded));answer.inert=!expanded;
   }));
   w.CreditUI?.enhance(root);w.CreditSidebar?.refresh();await loading?.paint?.();
  }catch(e){root.innerHTML='<div class="ch-error" role="alert"><h2>Lending Analytics could not load</h2><p>'+esc(e.message)+'</p><button class="ch-btn" data-landing-retry>Retry</button></div>';root.querySelector('[data-landing-retry]').onclick=()=>w.CreditHub.mount(root);
  }finally{loading?.destroy();}
 }};
})(window);

window.CREDIT_PAGE_BUILD="c8fce535ff91:lendingAnalytics";
})();
