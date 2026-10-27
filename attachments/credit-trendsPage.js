(function(){
const root=document.getElementById('credit-hub');if(!root)return;if(window.CREDIT_CONFIG?.page!=="trends"){root.textContent='This page needs its matching dashboard settings and scripts.';return;}
/* Dashboard icons on Confluence's existing navigation. Native URLs, titles,
 * tree controls, visibility, dimensions and collapse preferences stay native. */
(function (w, d) {
  'use strict';
  if (w.CreditSidebar) return;
  var host = null, observer = null, resizeObserver = null, queued = false, destroyed = false, ownsHostClass = false;
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
    host = null; ownsHostClass = false;
  }
  function refresh() {
    if (destroyed || !d.body) return;
    if (!d.getElementById('credit-hub') || d.querySelector('#editpageform,#content-editor,body.contenteditor')) { reset(); return; }
    var native = d.querySelector('.ia-fixed-sidebar,.acs-side-bar,#sidebar');
    if (!native) { reset(); return; }
    if (host !== native) {
      reset(); host = native; ownsHostClass = !host.classList.contains('credit-native-navigation'); host.classList.add('credit-native-navigation');
      host.addEventListener('mouseover', showTooltip); host.addEventListener('focusin', showTooltip);
      host.addEventListener('mouseout', leaveTooltip); host.addEventListener('focusout', leaveTooltip);
      if (w.ResizeObserver) { resizeObserver = new w.ResizeObserver(compactState); resizeObserver.observe(host); }
    }
    enhance(); compactState();
  }
  function schedule() { if (!queued && !destroyed) { queued = true; Promise.resolve().then(function () { queued = false; refresh(); }); } }
  function start() {
    refresh(); if (observer || !d.body || destroyed) return;
    observer = new w.MutationObserver(function (changes) {
      if (changes.some(function (change) {
        if (change.type === 'attributes') {
          if (change.attributeName === 'class' && (change.oldValue || '') === (change.target.getAttribute('class') || '')) return false;
          return !!host && (host.contains(change.target) || change.target.contains(host));
        }
        if (host?.contains(change.target)) return true;
        return Array.from(change.addedNodes).concat(Array.from(change.removedNodes)).some(function (node) {
          return node.nodeType === 1 && (node === host || node.contains(host) || node.matches('#credit-hub,#editpageform,#content-editor,.ia-fixed-sidebar,.acs-side-bar,#sidebar') || node.querySelector('#credit-hub,#editpageform,#content-editor,.ia-fixed-sidebar,.acs-side-bar,#sidebar'));
        });
      })) schedule();
    });
    observer.observe(d.body, {childList: true, subtree: true, attributes: true, attributeOldValue: true, attributeFilter: ['class', 'aria-current', 'href']});
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
/* Prepared workbook adapter. Calculation and joining remain in the canonical
 * credit modules; this reader only preserves typed, validated source values. */
(function(w){'use strict';
 const MAX_ROWS=200000,MAX_COLUMNS=256,REQUIRED_METADATA=['schema_version','bundle_id','dataset','rows','is_demo'];
 const validName=value=>typeof value==='string'&&/^[a-z][a-z0-9_]*$/.test(value)&&!['constructor','prototype','__proto__'].includes(value);
 const validColumn=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_]*$/.test(value)&&!['constructor','prototype','__proto__'].includes(value);
 const blank=cell=>!cell||cell.t==='z'||cell.v===undefined||cell.v===null||cell.v==='';
 const error=(message,sheet,address)=>Error('Workbook '+sheet+(address?'!'+address:'')+': '+message);
 function dimensions(sheet,name,xlsx){
  if(!sheet||!sheet['!ref'])throw error('sheet is missing or empty',name);
  const range=xlsx.utils.decode_range(sheet['!fullref']||sheet['!ref']);
  if(range.s.r!==0||range.s.c!==0||range.e.c>=MAX_COLUMNS||range.e.r>MAX_ROWS)throw error('sheet must start at A1 and stay within '+MAX_ROWS+' data rows / '+MAX_COLUMNS+' columns',name);
  if(sheet['!merges']?.length)throw error('merged cells are not supported',name);
  return range;
 }
 function scalar(cell,sheet,address){
  if(cell?.f!==undefined||cell?.F!==undefined)throw error('formulas are not allowed; publish prepared values',sheet,address);
  if(cell?.t==='e')throw error('Excel error value',sheet,address);
  if(blank(cell))return null;
  if(!['s','str','n','b','d'].includes(cell.t))throw error('unsupported cell type',sheet,address);
  return cell.v;
 }
 function calendarDate(cell,value,workbook,xlsx,sheet,address){
  if(typeof value==='string'){
   if(/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value)return value;
   throw error('date must be YYYY-MM-DD or an Excel calendar date',sheet,address);
  }
  if(typeof value==='number'&&Number.isInteger(value)&&xlsx.SSF.is_date(cell.z||'')){
   const date1904=workbook.Workbook?.WBProps?.date1904===true||workbook.Workbook?.WBProps?.date1904===1;
   const d=xlsx.SSF.parse_date_code(value,{date1904});
   if(d&&d.y>=1900&&d.y<=9999){
    const iso=String(d.y).padStart(4,'0')+'-'+String(d.m).padStart(2,'0')+'-'+String(d.d).padStart(2,'0');
    if(!Number.isNaN(Date.parse(iso))&&new Date(iso).toISOString().slice(0,10)===iso)return iso;
   }
  }
  throw error('date has an invalid value or missing date format',sheet,address);
 }
 function typedValue(cell,type,workbook,xlsx,address){
  const value=scalar(cell,'Data',address);if(value===null)return null;
  if(type==='date')return calendarDate(cell,value,workbook,xlsx,'Data',address);
  if(type==='text'&&typeof value!=='string')throw error('text field must use an Excel text cell; preserve identifier leading zeros','Data',address);
  if(type==='boolean'&&typeof value!=='boolean')throw error('boolean field must use TRUE or FALSE','Data',address);
  if((type==='number'||type==='integer')&&(typeof value!=='number'||!Number.isFinite(value)||(type==='integer'&&!Number.isInteger(value))))throw error('numeric field must contain a finite '+type,'Data',address);
  // Extension fields are preserved without guessing identifiers from numbers.
  if(!type&&typeof value==='number'&&xlsx.SSF.is_date(cell.z||''))return calendarDate(cell,value,workbook,xlsx,'Data',address);
  if(!type&&(!['string','number','boolean'].includes(typeof value)||(typeof value==='number'&&!Number.isFinite(value))))throw error('extension field must contain a scalar value','Data',address);
  return value;
 }
 async function parse(buffer,{dataset,fields}={}){
  const xlsx=w.XLSX;if(!xlsx?.read||!xlsx?.utils||!xlsx?.SSF)throw Error('The local Excel reader is unavailable');
  if(!validName(dataset)||!Array.isArray(fields)||!fields.length)throw Error('Workbook schema is unavailable for '+String(dataset));
  const bytes=new Uint8Array(buffer);
  if(bytes.byteLength>=10000000)throw Error('Attachment must be smaller than 10 MB');
  if(bytes.length<4||bytes[0]!==0x50||bytes[1]!==0x4b||bytes[2]!==3||bytes[3]!==4)throw Error('Attachment is not an XLSX workbook. Check sign-in and filename.');
  const started=Date.now();
  await new Promise(resolve=>setTimeout(resolve,0));
  let workbook;try{workbook=xlsx.read(bytes,{type:'array',cellDates:false,cellNF:true,cellText:false,cellStyles:false,cellFormula:true,bookVBA:false,sheetRows:MAX_ROWS+2});}catch{throw Error('Attachment is not a readable XLSX workbook');}
  if(Date.now()-started>30000)throw Error('Workbook processing timed out');
  const metaSheet=workbook.Sheets.Metadata,metaRange=dimensions(metaSheet,'Metadata',xlsx),metadata=Object.create(null);
  if(metaRange.e.c!==1||scalar(metaSheet.A1,'Metadata','A1')!=='key'||scalar(metaSheet.B1,'Metadata','B1')!=='value')throw error('use key and value headers in A1:B1','Metadata');
  for(let row=1;row<=metaRange.e.r;row++){
   const a='A'+(row+1),b='B'+(row+1),key=scalar(metaSheet[a],'Metadata',a),value=scalar(metaSheet[b],'Metadata',b);
   if(key===null&&value===null)continue;
   if(!validName(key)||Object.hasOwn(metadata,key))throw error('invalid or duplicate metadata key','Metadata',a);
   metadata[key]=value;
  }
  for(const key of REQUIRED_METADATA)if(!Object.hasOwn(metadata,key))throw error('missing '+key,'Metadata');
  if(metadata.schema_version!==2||typeof metadata.bundle_id!=='string'||!metadata.bundle_id.trim()||metadata.dataset!==dataset||!Number.isSafeInteger(metadata.rows)||metadata.rows<0||metadata.rows>MAX_ROWS||typeof metadata.is_demo!=='boolean')throw error('invalid schema, release, dataset, row count or sample identity','Metadata');
  const sheet=workbook.Sheets.Data,range=dimensions(sheet,'Data',xlsx),headers=[],known=new Map(fields.map(([name,type])=>[name,type]));
  for(let col=0;col<=range.e.c;col++){
   const address=xlsx.utils.encode_cell({r:0,c:col}),header=scalar(sheet[address],'Data',address);
   if(!validColumn(header)||headers.includes(header))throw error('invalid, empty or duplicate column header','Data',address);
   headers.push(header);
  }
  for(const field of known.keys())if(!headers.includes(field))throw error('missing column '+field,'Data');
  const rows=[];
  for(let row=1;row<=range.e.r;row++){
   const record=Object.create(null);let present=false;
   for(let col=0;col<headers.length;col++){
    const address=xlsx.utils.encode_cell({r:row,c:col}),value=typedValue(sheet[address],known.get(headers[col]),workbook,xlsx,address);
    record[headers[col]]=value;if(value!==null)present=true;
   }
   if(present)rows.push(record);
   if(row%1000===0){await new Promise(resolve=>setTimeout(resolve,0));if(Date.now()-started>30000)throw Error('Workbook processing timed out');}
  }
  if(rows.length!==metadata.rows)throw error('row count does not match Metadata','Data');
  if(Date.now()-started>30000)throw Error('Workbook processing timed out');
  return {...metadata,rows};
 }
 w.CreditExcel={parse};
})(window);

;
/* PAL-style, page-lifetime caches. No records in localStorage/IndexedDB.
 * Validated release arrays are immutable inputs; replacing an array invalidates
 * every derived index/result naturally. Weak keys do not retain old releases. */
(function(w){'use strict';
 const stores=new WeakMap();
 function store(rows){let s=stores.get(rows);if(!s){s={indexes:new Map(),results:new Map(),metrics:new Map()};stores.set(rows,s);}return s;}
 function index(rows,field){const s=store(rows);if(s.indexes.has(field))return s.indexes.get(field);const map=new Map();for(const row of rows){const key=row[field];if(!map.has(key))map.set(key,[]);map.get(key).push(row);}s.indexes.set(field,map);return map;}
 function remember(map,key,value,limit=24){if(map.size>=limit)map.delete(map.keys().next().value);map.set(key,value);return value;}
 function select(rows,criteria){const entries=Object.entries(criteria).filter(([,v])=>v!==''&&v!==null&&v!==undefined).sort(([a],[b])=>a.localeCompare(b));if(!entries.length)return rows;
  const s=store(rows),key=JSON.stringify(entries);if(s.results.has(key))return s.results.get(key);
  let candidates=rows;for(const [field,value] of entries){const matches=index(rows,field).get(value)||[];if(matches.length<candidates.length)candidates=matches;}
  return remember(s.results,key,candidates.filter(r=>entries.every(([f,v])=>r[f]===v)));
 }
 function sum(rows,field){const s=store(rows);if(s.metrics.has(field))return s.metrics.get(field);let value=0;for(const r of rows)if(Number.isFinite(r[field]))value+=r[field];return remember(s.metrics,field,value);}
 function verifySources(name,rows,sources){const map=new Map(sources.map(s=>[s.source_id,s])),counts=new Map();for(const r of rows){const s=map.get(r.source_id);if(!s||s.as_of_date!==r.as_of_date||s.domain!==(name==='monitoring'?r.category:name.toUpperCase()))throw Error(name+' source/date/domain mismatch');counts.set(r.source_id,(counts.get(r.source_id)||0)+1);}for(const s of sources)if((name==='monitoring'?['COVENANTS','CA','FACILITY','CCM','INSURANCE','APPRAISALS'].includes(s.domain):s.domain===name.toUpperCase())&&(counts.get(s.source_id)||0)!==s.record_count)throw Error(name+' source count mismatch: '+s.source_id);}
 // Browser HTTP cache is revalidated by Confluence on every new page load.
 // No cache-first fallback can bypass current attachment permissions.
 async function readBuffer(url){
  if(w.location?.href&&typeof URL!=='undefined'&&new URL(url,w.location.href).origin!==w.location.origin)throw Error('Attachment must be on the same Confluence origin');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{
  const response=await w.fetch(url,{credentials:'same-origin',cache:'no-cache',signal:controller.signal});if(!response.ok)throw Error('Attachment unavailable ('+response.status+')');
  if(Number(response.headers?.get('content-length'))>=10000000)throw Error('Attachment must be smaller than 10 MB');
  const buffer=await response.arrayBuffer();if(buffer.byteLength>=10000000)throw Error('Attachment must be smaller than 10 MB');
  return buffer;
 }finally{clearTimeout(timer);}}
 async function readJSON(url){const buffer=await readBuffer(url);try{return JSON.parse(new TextDecoder().decode(buffer).replace(/^\uFEFF/,''));}catch{throw Error('Attachment is not valid JSON. Check sign-in and filename.');}}
 function createLoader({manifest,attachment,validate,read,contracts,allowDemo=false}){const cache=new Map();
  async function fetchRows(name){const entry=manifest.files[name];if(!entry)throw Error('Missing '+name+' attachment in manifest');
   if(entry.parts&&entry.filename)throw Error('Ambiguous file descriptor: '+name);
   const parts=entry.parts||[entry];if(!Array.isArray(parts)||!parts.length||parts.length>512)throw Error('Invalid attachment parts: '+name);
   const names=new Set();let expected=0;for(const part of parts){if(!/^[A-Za-z0-9_.-]+$/.test(part.filename)||names.has(part.filename)||!Number.isSafeInteger(part.rows)||part.rows<0)throw Error('Invalid attachment part: '+name);names.add(part.filename);expected+=part.rows;}
   if(expected!==entry.rows)throw Error('Part counts do not match '+name);
   const results=new Array(parts.length);let cursor=0;
   // Two requests at a time; avoid unbounded memory/network pressure.
   async function worker(){while(cursor<parts.length){const i=cursor++,part=parts[i],url=attachment(part.filename),excel=/\.xlsx$/i.test(part.filename);
    if(!excel&&!/\.json$/i.test(part.filename))throw Error('Unsupported attachment format for '+name);
    let p;if(read)p=await read(url);else if(excel){if(!w.CreditExcel)throw Error('The local Excel reader is unavailable');p=await w.CreditExcel.parse(await readBuffer(url),{dataset:name,fields:contracts?.[name]});}else p=await readJSON(url);
    if(p.schema_version!==2||p.bundle_id!==manifest.bundle_id)throw Error('Mixed release detected for '+name);
    if((manifest.is_demo===true||p.is_demo===true)&&!allowDemo)throw Error('Illustrative data cannot be loaded in production');
    if(excel&&p.is_demo!==(manifest.is_demo===true))throw Error('Workbook sample identity does not match manifest for '+name);
    if(!excel&&typeof p.is_demo==='boolean'&&typeof manifest.is_demo==='boolean'&&p.is_demo!==manifest.is_demo)throw Error('Attachment sample identity does not match manifest for '+name);
    if(!Array.isArray(p.rows)||p.rows.length!==part.rows)throw Error('Row count mismatch for '+name);results[i]=p.rows;}}
   await Promise.all(Array.from({length:Math.min(2,parts.length)},worker));
   // Validate the combined set: duplicate primary keys across parts must fail.
   return validate(name,results.flat());
  }
  return {load(name){if(cache.has(name))return cache.get(name);const request=fetchRows(name).catch(e=>{if(cache.get(name)===request)cache.delete(name);throw e;});cache.set(name,request);return request;},invalidate(name){cache.delete(name);}};
 }
 w.CreditDataCache={index,select,sum,verifySources,readBuffer,readJSON,createLoader};
})(window);

;
/* Shared dashboard controls; only presentation preferences are persisted. */
(function(global){'use strict';
const paths={grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',chart:'<path d="M4 20h17M7 16V9m6 7V4m6 12v-5"/>',trend:'<path d="m3 17 6-6 4 3 8-10M15 4h6v6"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',document:'<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 6"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18M8 15h3"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',building:'<path d="M4 21V5h11v16M15 11h5v10M8 9h3M8 13h3M8 17h3M2 21h20"/>',activity:'<path d="M2 12h5l3-8 4 16 3-8h5"/>',check:'<path d="m5 12 4 4L19 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',up:'<path d="m6 14 6-6 6 6"/>',down:'<path d="m6 10 6 6 6-6"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',filter:'<path d="M3 6h18M6 12h12M9 18h6"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M16 11h5v5h-5zM3 8h18"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>'};
const icon=name=>name==='close'&&global.CreditUI?.icon?global.CreditUI.icon('close'):'<svg class="cw-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.grid)+'</svg>';
// Shared inline SVG tiles for dashboard and expanded-analysis cards.
global.CreditIcons={icon,metric:(name,index)=>'<span class="cw-metric-icon cw-metric-'+index%4+'">'+icon(name)+'</span>'};
// Native top-layer analysis shell. Panels remain under the dashboard root so
// scoped styles, delegated controls and record exports keep the same context.
global.CreditAnalysisOverlay=function({root,panel,title,onClose}){
 const dialog=document.createElement('dialog');dialog.className='credit-ui-dialog ca-overlay';
 dialog.setAttribute('aria-label',title||'Chart analysis');
 const bar=document.createElement('div');bar.className='ca-overlay-bar';
 const label=document.createElement('span');label.className='ca-overlay-label';label.textContent='Expanded view';
 const actions=document.createElement('div');actions.className='ca-overlay-actions';
 const download=document.createElement('button');download.type='button';download.className='ch-btn cw-primary ca-overlay-download';download.textContent='Download data';
 const close=document.createElement('button');close.type='button';close.className='ch-btn ca-overlay-close credit-ui-close';close.setAttribute('aria-label','Close analysis');close.innerHTML=icon('close');
 const body=document.createElement('div');body.className='ca-overlay-body';
 actions.append(download,close);bar.append(label,actions);body.append(panel);dialog.append(bar,body);root.append(dialog);
 const doc=document.documentElement,overflow=doc.style.overflow,scroll=global.scrollY;
 global.CreditUI?.closePopover();
 // The fallback retains readable content in test/legacy DOMs; supported browsers
 // use showModal to cover host navigation and make the background inert.
 if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
 doc.style.overflow='hidden';
 const source=root.querySelector('#ch-download');
 const sync=()=>{download.disabled=!source||source.disabled;download.title=source?.title||'Download selected data';};
 sync();const observer=new MutationObserver(sync);if(source)observer.observe(source,{attributes:true,attributeFilter:['disabled','title']});
 download.onclick=()=>source?.click();close.onclick=()=>onClose();
 dialog.addEventListener('cancel',event=>{event.preventDefault();onClose();});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)onClose();});
 let removed=false;
 return {dialog,body,dispose(){if(removed)return;removed=true;observer.disconnect();global.CreditUI?.closePopover();if(typeof dialog.close==='function')dialog.close();dialog.remove();doc.style.overflow=overflow;global.scrollTo({top:scroll,behavior:'instant'});}};
};
// One accessible side-label treatment for every Highcharts pie in the dashboard.
global.CreditDonut=function(chart,{esc,format,label='Total',onSelect}={}){
 if(!chart?.renderTo||!chart.series?.[0])return;
 const el=chart.renderTo;if(el.closest('.cw-donut-plot'))return;
 const points=chart.series[0].data.map(p=>({name:p.name,y:p.y,color:p.color,custom:p.options.custom})),total=points.reduce((n,p)=>n+(Number.isFinite(p.y)?p.y:0),0);
 const wrap=document.createElement('div'),plot=document.createElement('div'),center=document.createElement('div'),list=document.createElement('div');
 wrap.className='cw-donut-layout';plot.className='cw-donut-plot';center.className='cw-donut-center';center.setAttribute('aria-hidden','true');list.className='cw-donut-list';list.setAttribute('aria-label',label+' breakdown');
 el.before(wrap);wrap.append(plot,list);plot.append(el,center);
 center.innerHTML='<strong>'+esc(format(total))+'</strong><span>'+esc(label)+'</span>';
 list.innerHTML=points.map((p,i)=>'<'+(onSelect?'button type="button"':'div')+' class="cw-donut-row" data-donut-point="'+i+'"><span class="pal-legend-dot" style="background:'+p.color+'" aria-hidden="true"></span><span class="cw-donut-name">'+esc(p.name)+'</span><strong>'+esc(format(p.y))+'</strong><small>'+esc(total?(100*p.y/total).toFixed(1)+'%':'—')+'</small></'+(onSelect?'button':'div')+'>').join('');
 if(onSelect)list.querySelectorAll('button').forEach(b=>b.onclick=()=>onSelect(points[+b.dataset.donutPoint]));
 chart.update({legend:{enabled:false},plotOptions:{pie:{innerSize:'72%',borderWidth:5,borderColor:'#fff',borderRadius:6,dataLabels:{enabled:false}}}},false);chart.reflow();chart.redraw(false);
};
// Lightweight segmented selection and consistent table toolbar placement.
global.CreditControls=(()=>{
 const selector='.pal-segments,.cov-segments,.pal-subtabs',pending=new Map(),runs=new WeakMap();
 function key(group){return [...group.querySelectorAll('button')].map(b=>JSON.stringify(b.dataset)+b.textContent).join('|');}
 function position(group,button,animate=false){
  if(!button)return;group.classList.add('cc-segmented');let marker=group.querySelector(':scope>.cc-segment-marker');
  if(!marker){marker=document.createElement('span');marker.className='cc-segment-marker';marker.setAttribute('aria-hidden','true');group.prepend(marker);}
  const a=button.getBoundingClientRect(),b=group.getBoundingClientRect();if(!a.width)return;
  marker.style.transition=animate?'':'none';marker.style.width=a.width+'px';marker.style.height=a.height+'px';marker.style.transform='translate('+(a.left-b.left+group.scrollLeft)+'px,'+(a.top-b.top+group.scrollTop)+'px)';
 }
 function enhance(root){
  global.CreditUI?.enhance(root);
  root.querySelectorAll(selector).forEach(g=>{
   const button=g.querySelector('button[aria-pressed=true],button[aria-selected=true]'),saved=pending.get(key(g));
   position(g,button);
   if(saved){const marker=g.querySelector('.cc-segment-marker');if(marker){Object.assign(marker.style,saved);marker.getBoundingClientRect();position(g,button,true);}pending.delete(key(g));}
  });
  if(root.dataset.ccBound)return;root.dataset.ccBound='true';
  root.addEventListener('click',e=>{const button=e.target.closest('button'),group=button?.closest(selector);if(group&&!button.disabled&&button.matches('[aria-pressed=true],[aria-selected=true]'))position(group,button,true);});
  if(global.ResizeObserver){let width;const observer=new ResizeObserver(entries=>{const next=entries[0].contentRect.width;if(next===width)return;width=next;root.querySelectorAll(selector).forEach(g=>position(g,g.querySelector('button[aria-pressed=true],button[aria-selected=true]')));});observer.observe(root);}
 }
 function run(button,fn){
  const group=button.closest(selector),request={};let markerState,groupKey;
  if(group){runs.set(group,request);group.setAttribute('aria-busy','true');groupKey=key(group);const marker=group.querySelector('.cc-segment-marker');if(marker){const style=getComputedStyle(marker);markerState={transform:style.transform,width:style.width,height:style.height};pending.set(groupKey,markerState);}position(group,button,true);}
  // Keep the newest intent while rendering. Same-turn clicks coalesce; a later
  // click can supersede a render already in flight without losing its selection.
  return Promise.resolve().then(()=>!group||runs.get(group)===request?fn():undefined).finally(()=>{if(group&&runs.get(group)===request){runs.delete(group);group.removeAttribute('aria-busy');if(pending.get(groupKey)===markerState)pending.delete(groupKey);}});
 }
 function tableToolbar(root){
  const cards=[...(root.matches?.('#ch-register,.cd-source-card,.ct-table-card')?[root]:[]),...root.querySelectorAll('#ch-register,.cd-source-card,.ct-table-card')];
  for(const card of new Set(cards)){if(card.classList.contains('pj-inline-active')||card.classList.contains('cd-inline-active'))continue;
   const head=card.querySelector(':scope>.ch-toolbar,:scope>.ch-card-head');if(!head)continue;
   const own=selector=>[...card.querySelectorAll(selector)].filter(el=>el.closest('.ch-card')===card);
   const search=own('.ct-global-search,.ch-register-search,.cd-search-label').at(-1),tabs=own('.cov-detail-tabs,.cd-table-tabs,.pal-segments').filter(el=>el.querySelector('button')&&!(el.matches('.cov-detail-tabs')&&el.querySelector('.pal-segments'))),info=own('[data-source-method],[data-monitor-method],[data-pal-method],.cd-section-method')[0];
   if(!search&&!tabs.length)return;
   let actions=head.querySelector(':scope>.cc-table-actions');if(!actions){actions=document.createElement('div');actions.className='cc-table-actions';head.append(actions);}
   let groups=actions.querySelector('.cc-table-tabs-wrap');if(!groups){groups=document.createElement('div');groups.className='cc-table-tabs-wrap';actions.prepend(groups);}tabs.forEach(el=>{el.classList.toggle('cc-short-tabs',el.querySelectorAll('button').length<=2);if(el.parentElement!==groups)groups.append(el);});if(!tabs.length)groups.remove();
   if(search){actions.querySelectorAll('.ct-global-search,.ch-register-search,.cd-search-label').forEach(el=>{if(el!==search)el.remove();});if(search.parentElement!==actions||search.nextElementSibling!==(info||null))actions.append(search);}if(info&&(info.parentElement!==actions||info!==actions.lastElementChild))actions.append(info);
   head.classList.add('cc-unified-table-head');
   own('.ch-register-controls,.cd-record-toolbar').forEach(el=>el.classList.toggle('cc-empty-controls',!el.querySelector('button,input,select')));
   head.querySelectorAll(':scope>.ch-actions').forEach(el=>{if(!el.children.length)el.remove();});
  }
 }

 return {enhance,run,tableToolbar};
})();

global.CreditWorkspace=function({root,nav,esc,reflow:reflowCharts,filters}){
 let host=document.getElementById('credit-ui');if(!host){host=document.createElement('div');host.id='credit-ui';host.className='credit-ui-host';root.before(host);host.append(root);}
 const UI=global.CreditUI;if(!UI)throw Error('Dashboard controls did not load.');
 // Published page composition is shared by every reader; no browser-only preferences.
 let tab='',widgets=[],grid=null;
 const $=s=>root.querySelector(s);root.classList.add('cw-app');
 // Match the vertical regions only while these companion cards share a visible grid row.
 function reflow(){
  if(!root.isConnected)return;
  const headers=[...document.querySelectorAll('#header,#navBar,#navHeader')].filter(el=>['fixed','sticky'].includes(getComputedStyle(el).position)).map(el=>el.getBoundingClientRect()).filter(r=>r.height>0&&r.top>=0&&r.top<100&&r.bottom<240);root.style.setProperty('--credit-drill-sticky-top',Math.max(12,...headers.map(r=>r.bottom+8))+'px');
  const pair=['relationshipChart','monitoringPriorityChart'].map(id=>root.querySelector('[data-widget="'+id+'"]'));
  const regions=['.ch-card-head','.ch-chart-summary','.pal-monitor-insight'];
  for(const card of pair)for(const selector of regions)card?.querySelector(selector)?.style.removeProperty('min-height');
  if(pair.every(card=>card&&!card.hidden&&card.parentElement===grid)&&Math.abs(pair[0].getBoundingClientRect().top-pair[1].getBoundingClientRect().top)<1){
   for(const selector of regions){const parts=pair.map(card=>card.querySelector(selector));if(parts.every(Boolean)){const height=Math.ceil(Math.max(...parts.map(el=>el.getBoundingClientRect().height)));parts.forEach(el=>{el.style.boxSizing='border-box';el.style.minHeight=height+'px';});}}
  }
  reflowCharts();
 }
 // Confluence owns navigation and its geometry. Reflow charts when native sidebar widths change.
 let lastWidth=0;const resize=new ResizeObserver(entries=>{const width=entries[0].contentRect.width;if(width!==lastWidth){lastWidth=width;requestAnimationFrame(reflow);}});resize.observe(root);
 // Reflow every chart when a local drill changes the available card widths.
 let drillLayoutPending=false;
 const drillLayoutObserver=new MutationObserver(changes=>{
  if(!changes.some(m=>m.type==='attributes'&&m.target.matches('.cw-widget,.cd-analysis-grid>.ch-card')&&(m.oldValue||'').split(' ').filter(x=>/^(pj|cd)-inline-active$/.test(x)).join()!==[...m.target.classList].filter(x=>/^(pj|cd)-inline-active$/.test(x)).join()))return;
  if(drillLayoutPending)return;drillLayoutPending=true;requestAnimationFrame(()=>{drillLayoutPending=false;reflow();global.Highcharts?.charts?.filter(c=>c?.renderTo?.isConnected&&root.contains(c.renderTo)).forEach(c=>c.reflow());});
 });
 drillLayoutObserver.observe(root,{subtree:true,attributes:true,attributeFilter:['class'],attributeOldValue:true});
 const scopeLabel=document.createElement('div');scopeLabel.className='cw-applied-filters';scopeLabel.hidden=true;scopeLabel.setAttribute('aria-label','Applied filters');$('.ch-demo')?.after(scopeLabel);if(!scopeLabel.isConnected)$('.ch-top').after(scopeLabel);scopeLabel.after($('#ch-drill'));const actions=$('.ch-actions');$('#ch-customize').hidden=true;$('#ch-customize').disabled=true;

 const filterButton=document.createElement('button');filterButton.className='ch-btn';filterButton.innerHTML=icon('filter')+'<span>Filters</span>';filterButton.setAttribute('aria-haspopup','dialog');filterButton.setAttribute('aria-expanded','false');actions.prepend(filterButton);const view=$('#ch-portfolio-view');if(view)filterButton.before(view);const reset=$('#ch-reset');reset.textContent='Reset';reset.title='Reset filters and drill-down';filterButton.after(reset);$('.ch-filters').hidden=true;
 let filterDrawer=null;
 function openFilters(){
  if(filterDrawer)return;
  const fields=filters.fields(),draft=Object.fromEntries(fields.map(f=>[f.key,f.value]));
  const fieldHTML=f=>'<div class="form-group"><label for="cw-filter-'+f.key+'">'+esc(f.label)+'</label><select id="cw-filter-'+f.key+'" data-filter-key="'+f.key+'" aria-label="'+esc(f.label)+'" '+(f.disabled?'disabled':'')+'>'+f.options.map(([v,t])=>'<option value="'+esc(v)+'" '+(v===f.value?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select>'+(f.disabled?'<small class="cw-field-note">Not supplied in this snapshot.</small>':'')+'</div>';
  const groups=[['shared',tab==='portfolio'?'Portfolio scope':'Dashboard scope',tab==='portfolio'?'Applies to portfolio and monitoring charts.':'Applies to this dashboard’s metrics, charts and records.'],['portfolio','Facility attributes','Applies to facility metrics, charts and downloads. Monitoring cards keep their own source population.']];
  filterButton.setAttribute('aria-expanded','true');
  filterDrawer=UI.dialog({placement:'right',title:tab==='portfolio'?'Portfolio filters':'Dashboard filters',description:'Refine your view. Changes take effect when you apply.',closeLabel:'Close filters',body:'<div class="credit-ui-drawer-scroll">'+groups.filter(([key])=>fields.some(f=>f.group===key)).map(([key,title,note])=>'<section class="cw-filter-section"><h3>'+title+'</h3><p>'+note+'</p>'+fields.filter(f=>f.group===key).map(fieldHTML).join('')+'</section>').join('')+'</div><div class="cw-filter-preview" role="status" aria-live="polite"></div><div class="credit-ui-drawer-footer"><button class="button secondary" data-filter-reset>Reset</button><div class="cw-filter-actions"><button class="button secondary" data-filter-cancel>Cancel</button><button class="button" data-filter-apply>Apply filters</button></div></div>',onClose:()=>{filterDrawer=null;filterButton.setAttribute('aria-expanded','false');}});
  filterDrawer.element.classList.add('cw-filter-drawer','cw-dashboard-drawer');
  function preview(){const count=filters.count(draft);filterDrawer.body.querySelector('.cw-filter-preview').textContent=count===null?'Apply to update this dashboard.':count.toLocaleString()+' matching facilities'+(count===0?' · Try a broader selection.':'');}
  filterDrawer.body.querySelectorAll('[data-filter-key]').forEach(field=>field.onchange=()=>{draft[field.dataset.filterKey]=field.value;preview();});
  filterDrawer.body.querySelector('[data-filter-reset]').onclick=()=>{fields.forEach(f=>draft[f.key]='');filterDrawer.body.querySelectorAll('[data-filter-key]').forEach(f=>f.value='');UI.enhance(filterDrawer.body);preview();};
  filterDrawer.body.querySelector('[data-filter-cancel]').onclick=()=>filterDrawer.close();
  filterDrawer.body.querySelector('[data-filter-apply]').onclick=()=>{filterDrawer.close();filters.apply(draft);};preview();
 }
 filterButton.onclick=openFilters;
 function paintFilters(){
  const selected=filters.fields().filter(f=>f.value&&!f.disabled);scopeLabel.hidden=!selected.length;
  scopeLabel.innerHTML='<span class="cw-filter-caption">Applied filters</span>'+selected.map(f=>{const value=f.options.find(([v])=>v===f.value)?.[1]||f.value;return '<button class="cw-filter-chip" data-remove-filter="'+f.key+'" aria-label="Remove '+esc(f.label)+': '+esc(value)+'"><span>'+esc(f.label)+': <strong>'+esc(value)+'</strong></span>'+icon('close')+'</button>';}).join('')+'<button class="cw-clear-filters">Clear all</button>';
  scopeLabel.querySelectorAll('[data-remove-filter]').forEach(b=>b.onclick=async()=>{const key=b.dataset.removeFilter;await filters.apply({[key]:''});(scopeLabel.querySelector('[data-remove-filter]')||filterButton).focus();});
  scopeLabel.querySelector('.cw-clear-filters').onclick=async()=>{await filters.apply(Object.fromEntries(filters.fields().map(f=>[f.key,''])));filterButton.focus();};
  filterButton.querySelector('span').textContent='Filters'+(selected.length?' · '+selected.length:'');
 }

 function paint(){if(!grid)return;grid.dataset.preset='balanced';for(const w of widgets){w.el.hidden=false;w.el.classList.toggle('cw-widget-wide',w.full);}requestAnimationFrame(reflow);}
 function apply(nextTab,targets){UI.closePopover();if(targets&&nextTab===tab&&grid?.isConnected){for(const w of widgets){if([...targets].some(id=>w.el.id===id||w.el.querySelector('[id="'+id+'"]'))){w.title=w.el.querySelector('h2')?.textContent||w.title;}}if(targets.has('relationshipChart')||targets.has('monitoringPriorityChart'))requestAnimationFrame(reflow);return;}tab=nextTab;root.dataset.view=tab;paintFilters();
 widgets=[];grid=null;const content=$('#ch-content');content.querySelectorAll(':scope > .cw-widget-grid').forEach(g=>g.replaceWith(...g.children));content.querySelectorAll('.cw-widget-menu').forEach(b=>b.remove());const deep=content.querySelector('#pal-deep-content');if(deep)deep.replaceWith(...deep.children);content.querySelectorAll(':scope > .ch-grid').forEach(row=>row.replaceWith(...row.children));const candidates=[...content.children].filter(el=>el.classList.contains('ch-card')&&!el.classList.contains('pal-relationship-picker')&&!el.classList.contains('pal-deep-empty'));
 if(candidates.length){grid=document.createElement('div');grid.className='cw-widget-grid';candidates[0].before(grid);const used=new Set();candidates.forEach((el,index)=>{const title=el.querySelector('h2')?.textContent||'Relationship selection';let id=el.querySelector('.ch-chart[id]')?.id||el.id||title.toLowerCase().replace(/[^a-z0-9]+/g,'-');if(used.has(id))id+='-'+index;used.add(id);const full=el.id==='ch-register'||!!el.querySelector('.pal-trends-table')||el.classList.contains('pal-relationship-picker');el.dataset.widget=id;el.classList.add('cw-widget');if(el.querySelector('.ch-chart')||['pal-pipeline','pal-snapshot'].includes(el.id))el.classList.add('cw-framed-card');const w={id,title,el,index,full};widgets.push(w);grid.append(el);});[...content.children].filter(el=>el.classList.contains('pal-section-head')).forEach(el=>{el.classList.add('cw-ranking-controls');const target=grid.querySelector('[data-widget=relationshipChart] .ch-card-head');if(target)target.after(el);else grid.before(el);});}
 content.querySelectorAll('.pal-metric,.ch-kpi').forEach((el,i)=>{if(el.querySelector('.cw-metric-icon'))return;const marker=document.createElement('span');marker.className='cw-metric-icon cw-metric-'+i%4;marker.innerHTML=icon(['wallet','chart','shield','trend'][i%4]);el.prepend(marker);});
 content.querySelectorAll('.pal-detail').forEach(b=>b.innerHTML='View data '+icon('arrow'));root.querySelectorAll('select:not([aria-label])').forEach(f=>{const label=[...(f.closest('label')?.childNodes||[])].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();if(label)f.setAttribute('aria-label',label);});paint();UI.enhance(root);
 }
 return{apply};
};
})(window);

;
/* Shared column controls for registers, chart records and analytical tables. */
(function(global){'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=v=>v==null||v===''||v==='—'?'':String(v).trim();
const value=(r,c)=>c.get?c.get(r):r[c.key];
const display=(r,c)=>text(c.format?c.format(value(r,c)):value(r,c));
const token=v=>text(v);
function scalar(v){if(v==null||text(v)==='')return null;if(typeof v==='number')return Number.isFinite(v)?v:null;const s=text(v);if(/^\d{4}-\d{2}-\d{2}$/.test(s))return Date.parse(s);const m=s.replace(/,/g,'').match(/^\$?(-?\d+(?:\.\d+)?)\s*([kmb%]?)$/i);return m?Number(m[1])*({k:1e3,m:1e6,b:1e9,'%':1}[m[2].toLowerCase()]||1):null;}
const staticRestorers=new WeakMap();
const createState=()=>({filters:{},sortKey:'',sortDir:1,query:'',page:0,pageSize:10});
const isActive=f=>!!f&&(!!f.query||Array.isArray(f.values)||!!f.min||!!f.max);
function select(rows,columns,state){const result=rows.filter(r=>(!state.query||columns.some(c=>(text(value(r,c))+' '+display(r,c)).toLowerCase().includes(state.query.toLowerCase())))&&columns.every(c=>{const f=state.filters[c.key];if(!isActive(f))return true;const v=value(r,c),d=display(r,c);if(f.query&&!((text(v)+' '+d).toLowerCase().includes(f.query.toLowerCase())))return false;if(Array.isArray(f.values)&&!f.values.includes(token(v)))return false;const raw=scalar(v),n=raw===null?null:raw*(c.rangeScale||1);if(f.min!==undefined&&f.min!==''&&(n===null||n<scalar(f.min)))return false;if(f.max!==undefined&&f.max!==''&&(n===null||n>scalar(f.max)))return false;return true;}));const c=columns.find(c=>c.key===state.sortKey);if(c)result.sort((a,b)=>{const x=value(a,c),y=value(b,c);if(!text(x))return !text(y)?0:1;if(!text(y))return -1;const nx=scalar(x),ny=scalar(y);return (nx!==null&&ny!==null?nx-ny:text(x).localeCompare(text(y),undefined,{numeric:true,sensitivity:'base'}))*state.sortDir;});return result;}
const svg=path=>'<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">'+path+'</svg>';
const filterIcon=svg('<path d="M3 4h14l-5.5 6v5l-3 1v-6z"/>'),sortIcon=svg('<path d="M6 15V4m-3 3 3-3 3 3m5-2v11m-3-3 3 3 3-3"/>');
function filterSummary(c,f,rows){const parts=[];if(f.query)parts.push(f.query);if(Array.isArray(f.values)){if(f.values.length===1){const row=rows.find(r=>token(value(r,c))===f.values[0]);parts.push(row?display(row,c)||'(Blank)':f.values[0]||'(Blank)');}else parts.push(f.values.length+' values');}if(f.min)parts.push('≥ '+f.min);if(f.max)parts.push('≤ '+f.max);return parts.join(' · ');}
// Presentation only: raw records, sorting, filtering and exports keep their original values.
const normalized=v=>String(v||'').replace(/[_–-]/g,' ').toLowerCase();
function statusTone(value){
 const s=normalized(value);if(/\bnot (past due|overdue|expired)\b/.test(s))return null;const past=/\b(past due|overdue|expired|critical|breach|breached)\b/.test(s),coming=/\b(coming due|upcoming|expiring)\b/.test(s);
 if(past&&coming)return null;
 if(past)return 'red';if(coming)return 'green';
 if(/^(open|pending|watch|at risk|due today|special mention|substandard|doubtful|loss)$/.test(s.trim()))return 'amber';
 return null;
}
function tone(pill,color){pill.classList.remove('ct-tone-green','ct-tone-red','ct-tone-amber');pill.classList.add('ct-tone-'+color);}
function styleNumbers(table,columns){
 const headings=columns||[...table.querySelectorAll('thead tr:first-child th')].map(h=>({label:h.querySelector('.ct-sort')?.textContent||h.textContent}));
 const labels=headings.map(c=>normalized((c.key||'')+' '+(c.label||''))),statusIndex=labels.findIndex(l=>/\b(status|state)\b/.test(l));
 const title=table.closest('section.ch-card')?.querySelector('h2,h3')?.textContent,detailTitle=table.closest('.cd-detail-page')?.querySelector('.cd-detail-heading h2')?.textContent;
 table.querySelectorAll('tbody tr,tfoot tr').forEach(row=>[...row.cells].forEach((cell,i)=>{
  if(cell.colSpan>1||cell.querySelector('input,select'))return;
  const c=headings[i]||{},label=labels[i]||'',raw=cell.textContent.trim();
  if(!raw)return;
  const status=/\b(status|state|classification)\b/.test(label)?statusTone(raw):null;
  // Currency content wins over date/bps headings in snapshot and spread tables.
  // Classify each cell: comparison columns can mix balances and record counts.
  const amount=!raw.includes('%')&&(/[\$€£¥]/.test(raw)||/\b(?:amount|balance|tfa|osuc|outstanding|exposure|commitment|revenue|income|cost|os|unused|limit)\b/.test(label)||c.rangeUnit==='USD millions');
  const category=!amount&&!status&&(/\b(?:category|product|measure|area)\b/.test(label)||(i===0&&(scalar(raw)===null||/\b(?:ids?|identifiers?|numbers?|codes?|name)\b/.test(label))));
  cell.classList.toggle('ct-amount-cell',amount);cell.classList.toggle('ct-category-cell',category);
  if(status){const pill=cell.querySelector('.ch-badge,.ct-status-pill')||document.createElement('span');pill.classList.add('ct-status-pill');tone(pill,status);if(!pill.parentElement){while(cell.firstChild)pill.append(cell.firstChild);cell.append(pill);}return;}
  if(/[\$€£¥]/.test(raw)||/\b(?:ids?|identifiers?|numbers?|codes?|date|year|bps|spread)\b/.test(label))return;
  const delta=/^[+−–-]?\d[\d,]*(?:\.\d+)?%?(?:\s*\([+−–-]?\d[\d,]*(?:\.\d+)?\))?$/.test(raw)&&(/[+−–-]/.test(raw[0])||/variance|change|increase|decrease|growth/.test(label));
  if(amount)return;
  const count=!amount&&/^\d[\d,]*(?:\.\d+)?$/.test(raw)&&!/%|rate|ratio|margin|return/.test(label);
  if(!delta&&!count)return;
  const existing=cell.querySelector('.ct-number-pill,.pal-trend-delta,.cov-variance'),pill=existing||document.createElement('span');
  pill.classList.add('ct-number-pill',delta?'ct-number-delta':'ct-number-count');
  const n=Number.parseFloat(raw.replace(/,/g,'').replace(/[−–]/g,'-'));
  tone(pill,delta?(n>0?'green':n<0?'red':'amber'):(statusTone(label)||statusTone(row.cells[statusIndex]?.textContent)||statusTone(row.cells[0]?.textContent)||statusTone(title)||statusTone(detailTitle)||'amber'));
  if(!existing){while(cell.firstChild)pill.append(cell.firstChild);cell.append(pill);}
 }));
}
function enhanceNumbers(root){root.querySelectorAll('table.credit-data-table').forEach(table=>styleNumbers(table));}
function decorate({table,rows,columns,state,onChange,matched,local=false,onSearch}){
 styleNumbers(table,columns);table.dataset.creditTable='managed';table.closest('section.ch-card')?.classList.add('ct-table-card');
 const head=table.tHead||table.createTHead();head.innerHTML='<tr>'+columns.map((c,i)=>'<th scope="col" aria-sort="'+(state.sortKey===c.key?(state.sortDir===1?'ascending':'descending'):'none')+'"><div class="ct-heading"><button type="button" class="ct-sort" data-ct-sort="'+i+'" aria-label="Sort by '+esc(c.label)+'">'+esc(c.label)+(state.sortKey===c.key?svg('<path d="M10 16V4m-4 4 4-4 4 4"/>'):sortIcon)+'</button><button type="button" class="ct-filter '+(isActive(state.filters[c.key])?'is-active':'')+'" data-ct-filter="'+i+'" aria-label="Filter '+esc(c.label)+'" aria-haspopup="dialog" aria-expanded="false">'+filterIcon+'</button></div></th>').join('')+'</tr><tr class="ct-search-row">'+columns.map((c,i)=>'<th><input type="search" data-ct-search="'+i+'" aria-label="Search '+esc(c.label)+' column" placeholder="Search '+esc(c.label)+'…" value="'+esc(state.filters[c.key]?.query||'')+'"></th>').join('')+'</tr>';
 const wrap=table.closest('.credit-data-table-scroll')||table.parentElement;
 let bar=wrap.previousElementSibling;if(!bar?.classList.contains('ct-status')){bar=document.createElement('div');bar.className='ct-status';wrap.before(bar);}
 if(onSearch)table.closest('section.ch-card')?.querySelector('.cc-table-actions [data-ct-global]')?.closest('label').remove();
 const tableMethod=onSearch?(bar.querySelector('.cd-section-method')||table.closest('section.ch-card')?.querySelector(':scope>.ch-card-head .cd-section-method,:scope>.ch-toolbar .cd-section-method')):null;
 const viewTabs=bar.querySelector('[data-table-view-tabs]');const filtered=columns.filter(c=>isActive(state.filters[c.key]));bar.hidden=!onSearch&&!filtered.length&&!state.sortKey&&!state.query;bar.innerHTML='<span class="ct-table-scope">'+(local?'Table filters only':'')+'</span><div class="ct-chips">'+filtered.map(c=>'<button type="button" data-ct-clear="'+esc(c.key)+'">'+esc(c.label)+': '+esc(filterSummary(c,state.filters[c.key],rows))+' <span aria-hidden="true">×</span><span class="ct-sr"> — remove filter</span></button>').join('')+(filtered.length||state.sortKey||state.query?'<button type="button" data-ct-reset>Reset table</button>':'')+'</div>'+(onSearch?'<label class="ct-global-search">'+svg('<circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/>')+'<input type="search" data-ct-global aria-label="Search table" placeholder="Search this table…" value="'+esc(state.query)+'"></label>':'');if(viewTabs){bar.prepend(viewTabs);bar.hidden=false;}if(tableMethod)bar.append(tableMethod);
 if(onSearch)bar.querySelector('[data-ct-global]').oninput=e=>{const pos=e.target.selectionStart;onSearch(e.target.value);const next=(table.closest('section.ch-card')||bar).querySelector('[data-ct-global]');next?.focus({preventScroll:true});next?.setSelectionRange(pos,pos);};
 const focusHost=wrap.parentElement;const refresh=(index,kind,start)=>{onChange();const next=focusHost?.querySelector('[data-ct-'+kind+'="'+index+'"]');next?.focus({preventScroll:true});if(kind==='search'&&start!=null)next?.setSelectionRange(start,start);};
 head.querySelectorAll('[data-ct-sort]').forEach(b=>b.onclick=()=>{const i=+b.dataset.ctSort,c=columns[i];state.sortDir=state.sortKey===c.key?-state.sortDir:1;state.sortKey=c.key;refresh(i,'sort');});
 head.querySelectorAll('[data-ct-search]').forEach(input=>input.oninput=()=>{const i=+input.dataset.ctSearch,c=columns[i];state.filters[c.key]={...state.filters[c.key],query:input.value};const parent=table.closest('[data-ct-host]')||wrap.parentElement,start=input.selectionStart;onChange();const next=parent.querySelector('[data-ct-search="'+i+'"]');next?.focus({preventScroll:true});next?.setSelectionRange(start,start);});
 head.querySelectorAll('[data-ct-filter]').forEach(b=>b.onclick=()=>openFilter(b,columns[+b.dataset.ctFilter],rows,state,onChange));
 bar.querySelectorAll('[data-ct-clear]').forEach(b=>b.onclick=()=>{delete state.filters[b.dataset.ctClear];onChange();});bar.querySelector('[data-ct-reset]')?.addEventListener('click',()=>{state.filters={};state.sortKey='';state.sortDir=1;state.query='';onChange();});
 global.CreditControls?.tableToolbar(table.closest('section.ch-card')||wrap.parentElement);
 global.CreditUI?.enhance?.(table.closest('section.ch-card')||wrap.parentElement);
}
function openFilter(anchor,c,rows,state,onChange){
 const existing=state.filters[c.key]||{},choices=new Map();rows.forEach(r=>choices.set(token(value(r,c)),display(r,c)||'(Blank)'));
 const keys=[...choices.keys()].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));let selected=new Set(existing.values??keys);const nonblank=keys.filter(Boolean),date=nonblank.length>0&&nonblank.every(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)),numeric=nonblank.length>0&&nonblank.every(x=>scalar(x)!==null),type=date?'date':'number';
 const body='<div class="ct-pop-title"><strong>'+esc(c.label)+'</strong><button type="button" data-close class="credit-ui-close" aria-label="Close column filter">'+global.CreditIcons.icon('close')+'</button></div><p>Match selected values'+(numeric?' and an optional range':'')+'.</p>'+(numeric&&c.rangeUnit?'<p>Range: '+esc(c.rangeUnit)+'</p>':'')+(numeric?'<div class="ct-range"><label>'+(date?'From':'Minimum')+'<input data-min type="'+type+'" step="any" value="'+esc(existing.min||'')+'"></label><label>'+(date?'To':'Maximum')+'<input data-max type="'+type+'" step="any" value="'+esc(existing.max||'')+'"></label></div>':'')+'<label class="ct-find">Find a value<input type="search" data-find placeholder="Search values…"></label><div class="ct-value-actions"><button type="button" data-all>Select all</button><button type="button" data-none>Select none</button><span data-selected></span></div><div class="ct-values"></div><p class="ct-error" role="alert"></p><div class="ct-pop-footer"><button type="button" class="ch-btn" data-clear>Clear column</button><button type="button" class="ch-btn cw-primary" data-apply>Apply filter</button></div>';
 anchor.setAttribute('aria-expanded','true');global.CreditUI.popover({anchor,body,role:'dialog',label:'Filter '+c.label,className:'ct-filter-popover',onClose:()=>anchor.setAttribute('aria-expanded','false'),onMount(handle){const el=handle.element,$=s=>el.querySelector(s);const draw=()=>{const found=keys.filter(k=>choices.get(k).toLowerCase().includes($('[data-find]').value.toLowerCase()));$('.ct-values').innerHTML=found.length?found.slice(0,200).map(k=>'<label><input type="checkbox" data-value="'+esc(k)+'" '+(selected.has(k)?'checked':'')+'><span>'+esc(choices.get(k))+'</span></label>').join('')+(found.length>200?'<p>Showing 200 values. Search to narrow the list.</p>':''):'<p>No matching values.</p>';$('[data-selected]').textContent=selected.size+' selected';$('.ct-values').querySelectorAll('input').forEach(i=>i.onchange=()=>{i.checked?selected.add(i.dataset.value):selected.delete(i.dataset.value);$('[data-selected]').textContent=selected.size+' selected';});};$('[data-find]').oninput=draw;$('[data-all]').onclick=()=>{selected=new Set(keys);draw();};$('[data-none]').onclick=()=>{selected.clear();draw();};$('[data-close]').onclick=()=>handle.close();$('[data-clear]').onclick=()=>{handle.close();delete state.filters[c.key];onChange();};$('[data-apply]').onclick=()=>{const min=$('[data-min]')?.value||'',max=$('[data-max]')?.value||'';if((min&&scalar(min)===null)||(max&&scalar(max)===null)||(min&&max&&scalar(min)>scalar(max))||[...el.querySelectorAll('.ct-range input')].some(i=>!i.validity.valid)){$('.ct-error').textContent='Enter a valid range with the minimum before the maximum.';return;}state.filters[c.key]={...existing,min,max,values:selected.size===keys.length?null:[...selected]};handle.close();onChange();};draw();}});
}
// Every caller supplies the actual source cohort; displayed cell text is never a join key.
function rowLabel(row){
 if(Array.isArray(row))return String(row[0]??'Selected group');
 const candidates=[['event_id','Event'],['covenant_id','Covenant'],['facility_id','Facility'],['relationship_id','Relationship'],['owner_name','Owner'],['source_id','Source'],['history_id','Snapshot'],['item_id','Record']];
 const found=candidates.find(([key])=>text(row?.[key]));return found?found[1]+' '+row[found[0]]:'Selected record';
}
function bindRows({table,rows,resolve=row=>[row],label=rowLabel,onSelect}){
 if(!table?.tBodies[0])return;
 [...table.tBodies[0].rows].forEach((tr,index)=>{
  const row=rows[index],cohort=row===undefined?null:resolve(row,index);if(!Array.isArray(cohort)||!cohort.length||!tr.cells.length||tr.cells[0].colSpan>1)return;
  const title=label(row,index),select=trigger=>{if(global.getSelection?.()?.toString())return;global.CreditUI?.closePopover?.();if(onSelect)onSelect(cohort,title,trigger);else table.dispatchEvent(new CustomEvent('credit:table-drill',{bubbles:true,detail:{rows:cohort,label:title,table,trigger}}));};
  tr.dataset.ctDrill='';tr.classList.add('ct-drill-row');
  const first=tr.cells[0];let button=first.querySelector('button.ch-row-link');
  if(!button&&!first.querySelector('a,button,input,select,textarea')){button=document.createElement('button');button.type='button';button.className='ch-row-link';while(first.firstChild)button.append(first.firstChild);first.append(button);}
  if(button){button.type='button';button.dataset.ctRowDrill='';button.setAttribute('aria-label','Drill into '+title);button.title='Drill into '+title;button.onclick=e=>{e.stopPropagation();select(button);};}
  tr.onclick=e=>{if(e.target.closest('a,button,input,select,textarea,label,[role=button]'))return;select(button||tr);};
 });
}
function pageNumbers(page,pages){if(pages<=7)return Array.from({length:pages},(_,i)=>i);const keep=new Set([0,1,2,pages-3,pages-2,pages-1]);for(let n=Math.max(0,page-1);n<=Math.min(pages-1,page+1);n++)keep.add(n);const result=[];for(const n of [...keep].sort((a,b)=>a-b)){if(result.length&&n-result.at(-1)>1)result.push('gap');result.push(n);}return result;}
function pagination({host,total,page,pageSize,onChange}){
 let footer=[...host.children].find(el=>el.classList.contains('ch-pagination'));if(total<=10){footer?.remove();return;}if(!footer){footer=document.createElement('div');footer.className='ch-pagination';host.append(footer);}
 const pages=Math.max(1,Math.ceil(total/pageSize));page=Math.max(0,Math.min(page,pages-1));
 footer.innerHTML='<label class="ch-page-size">Show per page<select aria-label="Rows per page" data-ct-size>'+[10,25,50].map(n=>'<option value="'+n+'" '+(pageSize===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label><span role="status">'+(total?page*pageSize+1:0)+'–'+Math.min((page+1)*pageSize,total)+' of '+total.toLocaleString()+' · Page '+(page+1)+' of '+pages+'</span><nav class="ct-pagination-nav" aria-label="Table pages"><button type="button" class="ch-btn" data-ct-prev '+(!page?'disabled':'')+'>Previous</button><span class="ct-page-numbers">'+pageNumbers(page,pages).map(n=>n==='gap'?'<span class="ct-page-gap" aria-hidden="true">…</span>':'<button type="button" class="ch-btn" data-ct-page="'+n+'" aria-label="Go to page '+(n+1)+'"'+(n===page?' aria-current="page"':'')+'>'+(n+1)+'</button>').join('')+'</span><button type="button" class="ch-btn" data-ct-next '+(page+1>=pages?'disabled':'')+'>Next</button></nav>';
 const update=(nextPage,nextSize,focus)=>{onChange(nextPage,nextSize);const next=host.querySelector(focus+':not(:disabled)')||host.querySelector('[data-ct-prev]:not(:disabled),[data-ct-next]:not(:disabled)');if(focus==='[data-ct-size]'){const select=host.querySelector(focus);(select?.nextElementSibling?.querySelector('button')||select)?.focus({preventScroll:true});}else next?.focus({preventScroll:true});};
 footer.querySelectorAll('[data-ct-page]').forEach(b=>b.onclick=()=>update(Number(b.dataset.ctPage),pageSize,'[data-ct-page="'+b.dataset.ctPage+'"]'));
 footer.querySelector('[data-ct-prev]').onclick=()=>update(page-1,pageSize,'[data-ct-prev]');footer.querySelector('[data-ct-next]').onclick=()=>update(page+1,pageSize,'[data-ct-next]');footer.querySelector('[data-ct-size]').onchange=e=>update(0,Number(e.target.value),'[data-ct-size]');global.CreditUI?.enhance?.(footer);
}
function enhanceStatic(root){enhanceNumbers(root);root.querySelectorAll('table.credit-data-table:not([data-credit-table])').forEach(table=>{if(table.closest('#ch-table,.cd-records')||table.closest('[data-table-mode=summary]'))return;const heads=[...table.querySelectorAll('thead tr:first-child th')];if(!heads.length||!table.tBodies[0])return;const originalHead=[...table.tHead.childNodes],originalBody=[...table.tBodies[0].childNodes],card=table.closest('section.ch-card'),hadCardClass=card?.classList.contains('ct-table-card');const original=[...table.tBodies[0].rows].filter(r=>r.cells.length===heads.length&&!r.querySelector('[colspan]'));const columns=heads.map((h,i)=>({key:String(i),label:h.textContent.trim(),get:r=>r.values[i]})),rows=original.map(node=>({node,values:[...node.cells].map(c=>c.textContent.trim())})),state=createState();table.dataset.creditTable='static';const host=table.closest('.credit-data-table-scroll')?.parentElement||table.parentElement;const hadHostAttribute=host.hasAttribute('data-ct-host');host.dataset.ctHost='';staticRestorers.set(table,()=>{const actions=card?.querySelector('.cc-table-actions');if(actions){const method=actions.querySelector('.cd-section-method');if(method)card.querySelector('.ch-card-head,.ch-toolbar')?.append(method);actions.remove();}card?.querySelector('.cc-unified-table-head')?.classList.remove('cc-unified-table-head');table.tHead.replaceChildren(...originalHead);table.tBodies[0].replaceChildren(...originalBody);delete table.dataset.creditTable;const wrap=table.closest('.credit-data-table-scroll')||table.parentElement;if(wrap.previousElementSibling?.classList.contains('ct-status')){const method=wrap.previousElementSibling.querySelector('.cd-section-method');if(method)card?.querySelector('.ch-card-head,.ch-toolbar')?.append(method);wrap.previousElementSibling.remove();}[...host.children].filter(el=>el.classList.contains('ch-pagination')).forEach(el=>el.remove());if(!hadCardClass)card?.classList.remove('ct-table-card');if(!hadHostAttribute)delete host.dataset.ctHost;});const render=()=>{const result=select(rows,columns,state);state.page=Math.min(state.page,Math.max(0,Math.ceil(result.length/state.pageSize)-1));table.tBodies[0].replaceChildren(...result.slice(state.page*state.pageSize,(state.page+1)*state.pageSize).map(r=>r.node));if(!result.length){const tr=table.tBodies[0].insertRow(),cell=tr.insertCell();cell.colSpan=columns.length;cell.className='ch-empty';cell.textContent='No matching rows. Clear search or column filters to broaden the view.';}decorate({table,rows,columns,state,onChange:()=>{state.page=0;render();},onSearch:query=>{state.query=query;state.page=0;render();},matched:result.length,local:true});pagination({host,total:result.length,page:state.page,pageSize:state.pageSize,onChange:(page,size)=>{state.page=page;state.pageSize=size;render();}});};render();});}
function releaseStatic(root){root.querySelectorAll('table[data-credit-table]').forEach(table=>{staticRestorers.get(table)?.();staticRestorers.delete(table);});}
global.CreditTables={bindRows,rowLabel,createState,select,decorate,styleNumbers,enhanceNumbers,enhanceStatic,releaseStatic,pagination,pageNumbers,scalar};
})(window);

;
/* Shared chart workspace: one chart instance, page-level detail, and dashboard drawers. */
(function(global){'use strict';
const svg=path=>'<svg class="cw-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
const expandIcon=svg('<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/>');
const infoIcon=svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>');
const metricNames={tfa:'Total facility amount',total_os:'Outstanding',unused_commitment:'Unused commitment',unused_uncommitted:'Unused uncommitted'};
const methods={
 'pal-snapshot':['Facilities and Relationships count distinct source identifiers. CAs expired counts distinct relationships flagged pal_ca_expired; Facilities expired counts distinct facilities flagged pal_facility_expired.','All four counts use the filtered portfolio. The expired populations are subsets of the portfolio; these rows must not be added together.'],
 monitoringPriorityChart:['Count obligations across Covenants, CA expiration, Facility maturity, CCM, Insurance and Appraisals using their published flags. Critical actions are action_required AND critical; other actions are action_required AND NOT critical; upcoming items are coming_due AND NOT action_required. Each record enters at most one segment.','This is an operational queue, not a portfolio risk score or a health percentage. Critical is included in the action total. Shared region, owner, team lead and product filters apply. Portfolio-only filters (management status, commitment, PSE, subprogram and facility type) do not apply. Source dates differ by domain. No records in a scope does not establish that a domain is healthy. Critical thresholds follow the published rules; the current proposed-1 rules require business confirmation.'],
 'pal-pipeline':['Facilities pending closure, using the selected prepared first-approval period and PAL pipeline eligibility. Days since first approval determine the aging band.','NAM and LATAM only. Pending closure counts and TFA are drawn from the same filtered source records as the main table.'],
 'ch-mix':['Count actionable monitoring obligations by risk category. One relationship may have multiple obligations.', 'Counts reflect action_required flags within the shared filters. Selecting a category opens that category’s page.'],
 'ch-work':['Count actionable obligations by accountable owner, sort descending and display the top eight on Monitoring overview or top ten on other monitoring pages.', 'A count represents obligations, not unique relationships. Selecting an owner applies that owner filter.'],
 'ch-regional':['Count actionable monitoring obligations by source region.', 'Regions use the supplied source assignment. Selecting a region applies that region filter.'],
 'ch-critical':['Count actionable obligations carrying the published critical flag, grouped by category.', 'Proposed escalation rules: covenants ≥31 days; facilities ≥60; appraisals ≥90; insurance awaiting certificate; CCM substandard. These rules require business-owner validation before production.'],
 'ch-team':['Count actionable obligations by accountable team lead.', 'Each obligation is assigned to one team. Selecting a team applies that team filter.'],
 'ch-aging':['Group CCM actionable records by classification; group all supplied CA and insurance records by status; group actionable covenant, facility and appraisal records by prepared aging bucket.', 'Days past due use each record’s source as-of date and the approved deferred date when supplied, otherwise the contractual due date. Selecting a segment filters the register.'],
 'ch-amonth':['Count supplied covenant activity events by maker month, sorted chronologically, for the latest three available months.', 'Events are not distinct covenants: one covenant can have several deferred, waived or deleted events. Selecting a month filters the register.'],
 'ch-aregion':['Count supplied covenant activity events by source region, for the latest three available months.', 'Events are not distinct covenants. Selecting a region applies the shared region filter.'],
 newDealsChart:['Count distinct facilities using the selected prepared period flags. YTD starts January 1; QTD starts the calendar quarter; MTD starts the month; This week starts Monday. All periods end on the source report date. Comparisons use the preceding year/month through the same calendar day (clamped), preceding quarter through the same elapsed day (capped), or previous Monday through the matching weekday.','Non-PSE facilities. Origination date takes precedence; renewal is the fallback. Both periods use facilities supplied in the current portfolio snapshot, not an independent historical universe. Week comparisons cap at Friday for weekend-dated reports.'],
 facilityTrendChart:['Distinct relationships for CAs; distinct facility IDs for facilities, grouped by eligible expiry month. The series use different counting units and must not be added together.','Reporting month and the next two calendar months. Prepared PAL eligibility fields retain the original CA-review and facility-maturity rules.'],
 creditClassificationChart:['Count eligible facility records by product. Eligibility uses the first approval date and the selected YTD, QTD, MTD or Monday-based week through the source report date.','NAM, LATAM and EMEA. Product colors remain consistent when filtering.'],
 relationshipChart:['Sum the selected exposure measure by relationship, sort descending, then retain the selected top 5, 10 or 20. Values are USD; display values are abbreviated in millions.','Blue bars use the USD axis; purple diamond markers use the separate ROTCE percentage axis for the same ranked relationships. The dashed reference is the 12% ROTCE target. Missing ROTCE remains unavailable, not zero. Relationships are categories, so markers are not connected by a line.'],
 rotceChart:['Use the first supplied non-null ROTCE for each ranked relationship. It is a source ratio, not a weighted average of facilities. Missing values remain missing.','The dashed target is 12%. All bars use Citi Blue; the reference line provides the comparison without red/green status coloring. Source ROTCE periods are retained and may differ.'],
 covenantMonitoringChart:['Count covenant obligations in the same 1–30, 31–45, 46–60, 61–90 and over 90 day bands for both views. Past due includes source past-due records; coming due includes all records with status COMING_DUE (or legacy pal_due30), without a 30-day cutoff. Exact source_aging_bucket categories take precedence for both views; otherwise use days_past_due for past due and days until effective_due_date relative to as_of_date for coming due. Coarse legacy categories require dated aging; they are not arbitrarily split. Due today is included in the first band. Missing aging is shown separately, never as zero.','Uses the monitoring dataset. Facility attribute filters do not apply; region, owner, team lead and product filters do.'],
 ccmRegionalChart:['Count CCM records by region and source CCM status: past due, coming due and open. The status is independent of the credit classification.','Uses the monitoring dataset and each record’s source date. Facility attribute filters do not apply; shared scope filters do.'],
 sblSpreadCount:['Count eligible SBL facilities by region and prepared spread bucket: ≤70, >70–125, or >125 basis points.','Eligible facilities have positive Direct OS. Records without a prepared spread bucket contribute to no plotted bucket.'],
 sblSpreadOS:['Sum Direct OS for eligible SBL facilities by region and prepared spread bucket: ≤70, >70–125, or >125 basis points.','Values are USD. Records without a prepared spread bucket contribute to no plotted bucket.'],
 palTrendChart:['Sum the selected exposure measure by snapshot date and product. Each point uses that date’s supplied records; missing observations remain gaps.','Historical balances are not cumulative flows. Region, product, PSE and commitment selections apply; staff filters are unavailable.']
};
global.CreditDrillTable=function(table,rowsForCell,onSelect){
 if(!table)return;const headers=[...table.tHead.rows[0].cells].map(c=>c.textContent);
 [...table.tBodies[0].rows].forEach((row,i)=>[...row.cells].forEach((cell,j)=>{if(cell.querySelector('button,a,input'))return;const rows=rowsForCell(i,j,headers[j]);if(!Array.isArray(rows))return;const button=document.createElement('button');button.type='button';button.className='ch-row-link cd-drill-value';button.setAttribute('aria-label','View '+headers[j]+' records for '+row.cells[0].textContent);while(cell.firstChild)button.append(cell.firstChild);button.onclick=()=>onSelect(rows,row.cells[0].textContent+' · '+headers[j]);cell.append(button);}));
};
global.CreditChartDetails=function({root,esc,getCharts,getRows,getContext,getAnalysis,getCustomDefinition,getCustomMethod,renderCustomAnalysis,renderRelated,onChartDrill,onExpand}){
 let active=null,resumeId=null,drawer=null,drilled=null;
 const $=s=>root.querySelector(s);
 const backIcon=svg('<path d="m12 5-7 7 7 7M5 12h14"/>');
 function backToDashboard(){closeDrill();restore();}

 function chartFor(id){return getCharts().find(c=>c.renderTo.id===id);}
 function values(id){const chart=chartFor(id);return (chart?.series||[]).filter(s=>!s.options.isInternal).flatMap(s=>s.data.map((p,i)=>({series:s.name,category:p.name||chart.xAxis[0]?.categories?.[i]||String(i+1),value:p.y??null})));}
 function meta(id){const card=$('#'+id)?.closest('.ch-card');return {title:card?.querySelector('h2')?.textContent||getCustomDefinition?.(id)?.title||'Chart analysis',description:card?.querySelector('.ch-card-sub')?.textContent||getCustomDefinition?.(id)?.note||'',card};}
 function methodology(id,section=null){
  if(drawer)drawer.close();const m=meta(id),context=getContext();if(section){m.title=section.title;m.description=section.note||section.title;}
  const explanation=[...(section?.explanation||getCustomMethod?.(id)||(id.startsWith('metric-')?['Sum the selected balance across the filtered portfolio. Average per relationship divides by distinct relationship IDs. Largest facility is the maximum supplied facility balance.','Top-10 concentration is the selected balance of the ten largest relationships divided by the full filtered balance. Region/product/underwriter breakdowns retain the same scope. Amounts are USD.']:methods[id])||['Chart values are the exact aggregates rendered for the current dashboard scope. The chart description identifies the population and grouping.', 'The expanded values table preserves series labels, categories and raw numeric values. Use the dashboard register for individual records.'])];
  if(context.portfolioScope&&!section)explanation[1]+=' Portfolio clicks drill only within the selected chart. Expand opens focused analysis with its own Charts / Data controls and a return path. Shared page filters remain unchanged; related monitoring requires explicit navigation and exact same-date facility links.';
  const controls=[...(m.card?.querySelectorAll('[data-pal-setting]')||[])].map(f=>(f.getAttribute('aria-label')||f.dataset.palSetting)+': '+f.selectedOptions?.[0]?.textContent);
  controls.push(...[...(m.card?.querySelectorAll('[data-pal-period][aria-pressed=true]')||[])].map(b=>b.parentElement.getAttribute('aria-label')+': '+b.textContent));
  const dates=[...new Set((getRows(id)||[]).map(r=>r.as_of_date).filter(Boolean))].sort();
  const summaryNotes={monitoringPriorityChart:'Actions required includes critical actions. Upcoming excludes every action-required item to prevent double counting. Category share divides its actionable obligations by all actions in the shared monitoring scope.',facilityTrendChart:'Headline counts deduplicate relationships and facilities across the full three-month horizon. A relationship can appear in more than one monthly bar, so monthly CA counts need not sum to the distinct headline. CA relationships and facilities are different counting units.',creditClassificationChart:'Headline figures count eligible facility records and sum their TFA. Both use the selected approval period and shared filters.',relationshipChart:'The amount is the selected exposure summed across the ranked relationships. Its share divides that amount by the same exposure summed across the entire filtered portfolio. A zero denominator is shown as unavailable.',rotceChart:'Below target counts ranked relationships with a supplied ROTCE below 12%. Coverage shows how many ranked relationships have a non-null ROTCE; missing ratios are not counted as below target.',covenantMonitoringChart:'The obligation count uses the selected past-due or coming-due population. The relationship figure deduplicates relationship IDs within that population.',ccmRegionalChart:'CCM records counts the filtered CCM population. Past due counts only records with the source CCM status PAST_DUE.'};
  const summarySection=!section&&m.card?.querySelector('.ch-chart-summary')?'<section><h3>Summary figures</h3><p>'+esc(summaryNotes[id]||'Items shown totals the displayed groups. Largest-group share divides the largest displayed group by that displayed total. For top-owner charts this describes the ranked subset, not all portfolio obligations. A zero denominator is shown as unavailable.')+'</p></section>':'';

  drawer=global.CreditUI.dialog({placement:'right',title:'Methodology',description:m.title,closeLabel:'Close methodology',body:'<div class="credit-ui-drawer-scroll cd-methodology"><section><h3>What this view shows</h3><p>'+esc(m.description)+'</p></section><section><h3>Calculation</h3><p>'+esc(explanation[0])+'</p></section><section><h3>Scope & interpretation</h3><p>'+esc(explanation[1])+'</p><p>'+esc(context.filters||'All available records in this dashboard scope.')+'</p>'+(controls.length?'<p>'+esc(controls.join(' · '))+'</p>':'')+'</section>'+summarySection+'<section><h3>Source dates</h3><p>'+esc(dates.length?dates.join(' · '):context.date)+'</p><p>Last updated follows the latest source report date. It is not a live refresh timestamp.</p></section><section><h3>Data quality</h3><p>'+esc(context.demo?'Illustrative data only. These records demonstrate the dashboard and are not live portfolio results.':'Prepared source snapshot. Missing values are not imputed; records retain their source dates.')+'</p><p>Chart controls and applied filters determine the current view. Exported source records retain their identifiers and source dates.</p></section></div><div class="credit-ui-drawer-footer"><button class="button" data-method-done>Done</button></div>',onClose:()=>{drawer=null;}});
  drawer.element.classList.add('cw-dashboard-drawer');drawer.body.querySelector('[data-method-done]').onclick=()=>drawer.close();
 }
 function metricRule(label,id=''){
  if(label==='Accountable owners'&&id==='monitoringPriorityChart')return 'Count distinct non-empty owner_id values across all supplied monitoring records in the shared scope, including records without actionable obligations.';
  if(label==='Avg per Relationship')return id.startsWith('metric-')?'Selected balance divided by the number of relationship groups in scope. A zero group count displays unavailable.':'Selected covenant obligation count divided by distinct non-empty relationship_id values. A zero denominator displays unavailable.';
  const rules={
   'Total facility amount':'Sum the supplied tfa across eligible facilities. This is a USD balance, not a count or a new-deal flow.',
   'TFA':'Sum the supplied tfa for the selected relationship.',
   'Outstanding':'Sum the supplied total_os balance across eligible facilities.',
   'Unused commitment':'Sum the supplied unused_commitment balance across eligible facilities.',
   'Unused uncommitted':'Sum the supplied unused_uncommitted balance across eligible facilities.',
   'OSUC':'Sum the supplied osuc balance for the selected relationship.',
   'ROTCE':'Use a consistent supplied ROTCE for the selected relationship; multiply by 100 for display. Conflicting ratios or missing values are unavailable; never average facility ratios.',
   'Largest Facility':'Maximum supplied selected balance among eligible facilities. An empty population displays unavailable.',
   'Top 10 Concentration':'Sum the selected balance for the ten largest relationship groups, divided by the selected balance of the full filtered portfolio. A zero denominator displays unavailable.',
   'New deals':'Count distinct facility_id values eligible for the selected prepared new-deal period.',
   'Total TFA':'Sum tfa across the eligible records for this analysis and selected period; display USD millions.',
   'Avg Deal Size':'Sum eligible tfa divided by eligible facility record count. An empty population displays unavailable.',
   'Product Programs':'Count distinct non-empty product values in the eligible population.',
   'Pending facilities':'Count distinct facility_id values in the selected pending-closure population.',
   'Over 90 days':'Count pending-closure records whose prepared pal_pipeline_bucket is >90 days since first approval.',
   'Total New Facilities':'Count eligible facility records using first approval date and the selected prepared approval period.',
   'Regions Active':'Count distinct non-empty region values among eligible approvals.',
   'Underwriters Involved':'Count distinct non-empty owner_id values among eligible approvals.',
   'CAs Expiring (3m)':'Count distinct relationship_id values with pal_ca_month in the reporting month or next two months. Deduplicate across the full horizon.',
   'CAs Expired':'Count distinct relationship_id values flagged pal_ca_expired in the filtered portfolio.',
   'Facilities Expiring (3m)':'Count distinct facility_id values with pal_facility_month in the reporting month or next two months.',
   'Facilities Expired':'Count distinct facility_id values flagged pal_facility_expired in the filtered portfolio.',
   'Total Relationships':'Count relationship groups in the selected top-N exposure population.',
   'Selected Exposure':'Sum the selected exposure measure across facilities belonging to the ranked relationships.',
   'Total Facilities':'Count distinct non-empty facility_id values in the selected population.',
   'Facilities':'Count distinct region + relationship + facility keys for the selected relationship.',
   'Avg ROTCE':'Arithmetic mean of the first supplied non-null ROTCE per ranked relationship. Missing ratios are excluded; multiply by 100 for display.',
   'At / above target (≥12%)':'Count ranked relationships with a supplied ROTCE of at least 0.12.',
   '8% to <12%':'Count ranked relationships with ROTCE at least 0.08 and less than 0.12.',
   'Below 8%':'Count ranked relationships with a supplied ROTCE below 0.08.',
   'Total Covenants':'Count covenant obligations in the selected past-due or coming-due population. Multiple obligations can belong to one facility.',
   'Unique Relationships':'Count distinct non-empty relationship_id values in the selected population.',
   'Unique Facilities':'Count distinct non-empty facility_id values in the selected population.',
   'Avg Days Past Due':'Sum numeric days_past_due values divided by the number of records with numeric days_past_due. Missing values are excluded.',
   'Total CCMs':'Count supplied CCM records in the shared monitoring scope.',
   'Unique Clients':'Count distinct non-empty relationship_id values among supplied CCM records.',
   'Past Due CCMs':'Count CCM records with ccm_status equal to PAST_DUE.',
   'vs Last Month':'Unavailable because a comparable prior-month CCM snapshot was not supplied. No change is inferred.',
   'Actions required':'Count monitoring obligations with action_required = true. Critical actions are included in this count.',
   'Critical actions':'Count obligations with action_required = true AND critical = true.',
   'Upcoming items':'Count obligations with coming_due = true AND action_required = false, avoiding overlap with actions.',
   'Critical items':'Count actionable obligations carrying critical = true in this category.',
   'Actionable items':'Count obligations with action_required = true in the current scope.',
   'Active owners':'Count distinct owner IDs with at least one actionable obligation.',
   'Average per active owner':'Actionable obligation count divided by owners with at least one actionable obligation. Zero owners displays unavailable.',
   'Owners with >30 items':'Group actionable obligations by owner_id and count owners whose total exceeds 30.',
   'Coming due · 3 months':'Count supplied category records flagged coming_due, including any that also carry action_required. This is not a disjoint segment.',
   'Accountable owners':'Count distinct non-empty owner_id values among actionable obligations.',
   'Insurance issues':'Count insurance records flagged action_required.',
   'Awaiting certificate':'Count all supplied insurance records with status AWAITING_CERTIFICATE.',
   'Pending review':'Count all supplied insurance records with status PENDING_REVIEW.',
   'Specialists':'Count distinct owner_id values among actionable insurance records.',
   'Open CCMs':'Count supplied CCM records flagged action_required.',
   'Substandard':'Count actionable CCM records classified SUBSTANDARD.',
   'Special mention':'Count actionable CCM records classified SPECIAL_MENTION.',
   '≥200 days past due':'Count actionable appraisal records whose prepared aging_bucket is 200+.',
   'Supporting records':'Count supporting source rows supplied for the current analysis or selected point.',
   'Plotted values':'Count plotted series/category/value rows, including null points.',
   'Data series':'Count chart series excluding internal Highcharts series.',
   'Chart groups':'Count distinct category labels among plotted points.',
   'Missing values':'Count plotted points with a null value; zero is a known value, not missing.'
  };
  if(/ events$/i.test(label))return 'Count '+label.replace(/ events$/i,'').toUpperCase()+' event_type records within the latest three available maker months. Events are not distinct covenants.';
  return rules[label]||'Count records flagged action_required in the named monitoring category within the current shared filters. Multiple obligations may belong to one relationship or facility.';
 }
 function addKpiMethods(){
  root.querySelectorAll('#ch-content .pal-metric,#ch-content .ch-kpi').forEach(card=>{
   if(card.parentElement.classList.contains('cd-kpi-shell'))return;
   const label=card.dataset.title||card.querySelector('.ch-kpi-label,h2')?.textContent.trim()||'Portfolio metric',key=card.dataset.palRows;
   const shell=document.createElement('div');shell.className='cd-kpi-shell';card.before(shell);shell.append(card);
   const button=document.createElement('button');button.className='cw-icon-btn cd-section-method cd-kpi-method';button.setAttribute('aria-label','Methodology for '+label);button.innerHTML=infoIcon;shell.append(button);
   button.onclick=()=>methodology(key?'metric-'+key:'kpi-'+root.dataset.view,{title:label,note:'Summary metric · current dashboard scope',explanation:[metricRule(label),key?'The current and prior snapshots use the same filters. Change = current minus previous weekday balance; percentage change = change divided by the absolute prior balance. Saturdays and Sundays are skipped, not local holidays. A complete comparison-ready snapshot with numeric balances is required. A zero prior balance shows New balance (or 0.0% if both are zero); missing comparable snapshots show unavailable.':'Uses the current page population and shared filters. Counts are obligations unless explicitly described as distinct IDs; missing source values are not imputed.']});
  });
  root.querySelectorAll('#ch-content .ch-insight').forEach((card,index)=>{
   if(card.querySelector('.cd-section-method'))return;
   const title=card.querySelector('strong')?.textContent||'Monitoring insight',rules=['Count obligations with both action_required and critical flags in the shared scope.','Count action_required obligations and distinct non-empty owner_id values among those obligations.','Group actionable obligations by owner_name, rank descending, sum the five largest groups and divide by all actionable obligations. A zero denominator displays unavailable.'];
   const button=document.createElement('button');button.className='cw-icon-btn cd-section-method';button.setAttribute('aria-label','Methodology for '+title);button.innerHTML=infoIcon;card.append(button);button.onclick=()=>methodology('ch-mix',{title,note:'Monitoring overview insight',explanation:[rules[index]||rules[0],'Counts represent obligations, not unique facilities. Shared dashboard filters apply. Critical items are a subset of all actions.']});
  });
 }
 // PAL's chart-specific insight sections, rendered with Highcharts and shared dashboard tables.
 function renderAnalysis(){
  const a=active;if(!a)return;if(renderCustomAnalysis?.(a))return;const context=getAnalysis?.()||{},settings=context.settings||{},source=getRows(a.id)||[],portfolio=context.portfolio||source;
  const total=(rs,k)=>rs.reduce((n,r)=>n+(typeof r[k]==='number'?r[k]:0),0),distinct=(rs,k)=>new Set(rs.map(r=>r[k]).filter(v=>v!==null&&v!==undefined&&v!=='')).size;
  const n=v=>Number(v).toLocaleString('en-US',{maximumFractionDigits:1}),usd=v=>'$'+(v/1e6).toLocaleString('en-US',{maximumFractionDigits:1})+'m',percent=v=>v==null?'—':(v*100).toFixed(1)+'%';
  const groups=(rs,key)=>[...new Set(rs.map(r=>r[key]||'Not supplied'))].map(name=>({name,rows:rs.filter(r=>(r[key]||'Not supplied')===name)}));
  const mean=(rs,k)=>{const known=rs.filter(r=>typeof r[k]==='number');return known.length?total(known,k)/known.length:null;};
  const colors=['#255BE3','#00AF68','#FFCD00','#8E319C','#FF5C0B','#73C2FC','#D71671','#97D700'];let blocks=[],plans=[],metrics=[],filters=null,allRecords=source,sectionMethods=[],insights=[],tableDrills=[];
  const insight=(label,value,rule)=>insights.push({label,value,rule});
  const sectionButton=(title,note,calculation)=>{const index=sectionMethods.push({title,note,explanation:[calculation,methods[a.id]?.join(' ')||'Uses the current chart population and applied filters. Missing values are not imputed.']})-1;return '<button class="cw-icon-btn cd-section-method" data-section-method="'+index+'" title="Methodology" aria-label="Methodology for '+esc(title)+'">'+infoIcon+'</button>';};
  const tableCalculation=(title,headers,note)=>{let rule='Rows are grouped by '+headers[0]+'. Counts and totals use the eligible source records for this analysis; USD values are displayed in millions.';if(title==='Period-over-Period Performance')rule='Compare distinct facility counts and summed TFA for the current and prior prepared period. Change is current minus prior, an absolute difference, not a percentage.';else if(title.includes('Top 10 Facilities'))rule='Sort eligible facilities by TFA descending and display the first ten. Each row retains the original facility identifiers and approval date.';else if(title==='Top Relationships Details')rule='One row per ranked relationship. Sum each exposure across its facilities; facility counts deduplicate facility IDs. ROTCE is the first supplied non-null relationship ratio; missing ratios remain unavailable.';else if(title==='Chart breakdown')rule='Exact plotted series, categories and values, in chart order. This table does not reaggregate or impute values.';else if(title==='Monitoring coverage & priorities')rule='One row per monitoring area. Critical = action_required AND critical; other actions = action_required AND NOT critical; upcoming = coming_due AND NOT action_required. No obligation enters more than one segment.';else if(title.includes('Covenant'))rule='Count eligible covenant obligations within each displayed grouping and aging band. Population includes all supplied covenants in scope; Total includes only the selected past-due or coming-due cohort. Both views use 1–30, 31–45, 46–60, 61–90 and over 90 day bands. Exact source_aging_bucket values take precedence. Otherwise past due uses days_past_due and coming due uses days until the effective due date at the source reporting date. Coarse legacy categories are not arbitrarily split. Due today belongs to the first band; missing aging remains separate.';if(headers.includes('Avg per Facility'))rule+=' Average per facility is summed TFA divided by the number of eligible facility records in that region.';if(title.includes('Underwriter')&&!title.includes('Covenant'))rule+=' Rank owners by '+(title.includes('New Deals')?'eligible record count':'the selected balance')+' descending and retain the first ten.';return rule+(note?' '+note:'');};
  const cohortRow=(cells,rows,cellRows={})=>Object.defineProperties(cells,{_rows:{value:rows},_cellRows:{value:cellRows}});
  const table=(title,headers,rows,note='',mode='summary')=>{const index=tableDrills.push({title,headers,rows})-1;blocks.push('<section data-summary-drill="'+index+'" data-table-mode="'+mode+'" class="ch-card cd-insight-card cd-insight-table'+(headers.length>5||/Details|by Underwriter|Period-over-Period/.test(title)?' cd-wide':'')+'"><div class="ch-card-head"><div><h3>'+esc(title)+'</h3><p class="ch-card-sub">'+esc(note)+'</p></div>'+sectionButton(title,note,tableCalculation(title,headers,note))+'</div><div class="credit-data-table-scroll"><table class="credit-data-table"><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+(!rows.length?'<p class="ch-empty">No eligible records in this selection.</p>':'')+'</div></section>')};
  const chartBlock=(title,type,pts,note='',money=false)=>{const id='cd-insight-'+plans.length;blocks.push('<section class="ch-card cd-insight-card cd-insight-visual"><div class="ch-card-head"><div><h3>'+esc(title)+'</h3><p class="ch-card-sub">'+esc(note)+'</p></div>'+sectionButton(title,note,(title.includes('ROTCE')?'Display the supplied relationship ROTCE multiplied by 100 as percentage points. Missing ratios are excluded.':money?'Sum the selected USD balance for each displayed group. Values are shown in millions.':'Count eligible records for each displayed group.')+(title.includes('Top 10')?(title.includes('ROTCE')?' Keep supplied ratios below 8%, sort ascending and retain the first ten.':' Sort the grouped values descending and retain the first ten.'):'')+(type==='pie'?' Slice share is the group value divided by the sum of displayed group values.':'')+(note?' '+note:''))+'</div><div id="'+id+'" class="cd-insight-chart"></div></section>');plans.push({id,title,type,pts,money});};
  const breakdown=(rs,key,measure)=>groups(rs,key).sort((a,b)=>a.name.localeCompare(b.name)).map((g,i)=>({name:g.name,y:measure?total(g.rows,measure):g.rows.length,color:colors[(key==='product'?Math.max(0,(context.products||groups(portfolio,'product').map(g=>g.name).sort()).indexOf(g.name)):i)%colors.length],custom:{rows:g.rows}}));
  const regional=rs=>table('Regional Distribution',['Region','Facilities','Total TFA','Avg per Facility'],groups(rs,'region').map(g=>cohortRow([g.name,n(g.rows.length),usd(total(g.rows,'tfa')),g.rows.length?usd(total(g.rows,'tfa')/g.rows.length):'—'],g.rows)));
  const owners=rs=>groups(rs,'owner_name').sort((x,y)=>y.rows.length-x.rows.length).slice(0,10);
  const ranked=groups(source,'relationship_id').map(g=>({relationship_name:g.rows[0].relationship_name||g.name,region:[...new Set(g.rows.map(r=>r.region))].join(', '),rows:g.rows,exposure:total(g.rows,settings.measure||'direct_os'),rotce:g.rows.find(r=>typeof r.rotce==='number')?.rotce??null}));
  if(a.id==='palTrendChart'){
   const dates=[...new Set(source.map(r=>r.as_of_date))].sort(),latest=dates.at(-1),current=source.filter(r=>r.as_of_date===latest),field=settings.trend||'osuc',name=field==='osuc'?'OSUC':field==='tfa'?'TFA':'Outstanding';
   metrics=[['Latest '+name,usd(total(current,field))],['Latest snapshot',latest||'Unavailable'],['Products',n(distinct(current,'product'))],['Reporting dates',n(dates.length)]];
   chartBlock('Latest snapshot by region','pie',breakdown(current,'region',field),'Only '+(latest||'the latest date')+' · '+name,true);
   chartBlock('Latest snapshot by product','bar',breakdown(current,'product',field),'Only '+(latest||'the latest date')+' · '+name,true);
   table('Snapshot reconciliation',['Snapshot',name,'Products','Regions'],dates.map(date=>{const rs=source.filter(r=>r.as_of_date===date);return cohortRow([date,usd(total(rs,field)),n(distinct(rs,'product')),n(distinct(rs,'region'))],rs);}),'Each date is a separate stock balance. Never sum the date rows.');
   insight('Reporting basis','Separate snapshots','Balances are stocks at each reporting date, not flows over time.');
   insight('Compare like for like','Same scope at each date','Region, product, PSE and commitment filters apply to all snapshots. Missing observations remain gaps.');
  }else if(a.id==='palDeepRegion'||a.id==='palDeepProduct'){
   metrics=[['TFA',usd(total(source,'tfa'))],['OSUC',usd(total(source,'osuc'))],['Outstanding',usd(total(source,'total_os'))],['Facilities',n(distinct(source,'facility_key'))]];
   chartBlock('Exposure by product','pie',breakdown(source,'product','tfa'),'Selected relationship · TFA in USD',true);
   chartBlock('Facility exposure','bar',source.map(r=>({name:r.facility_id,y:r.osuc,custom:{rows:[r]}})),'Selected relationship · OSUC in USD',true);
   regional(source);
   insight('Utilization',total(source,'tfa')?percent(total(source,'total_os')/total(source,'tfa')):'—','Total outstanding divided by TFA.');
   insight('Banker coverage',n(source.filter(r=>r.banker_name).length)+' / '+n(source.length),'Facility records with an explicitly supplied banker; underwriter is not substituted.');
   insight('Relationship',source[0]?.relationship_name||'Unavailable','The selected relationship name from the supplied facility records.');
  }else if(a.id.startsWith('metric-')){
   const field=a.id.slice(7),amount=total(source,field),rels=groups(source,'relationship_id').map(g=>({name:g.rows[0].relationship_name||g.name,y:total(g.rows,field),custom:{rows:g.rows}})).sort((a,b)=>b.y-a.y),top=rels.slice(0,10),name=metricNames[field];
   metrics=[[name,usd(amount)],['Avg per Relationship',rels.length?usd(amount/rels.length):'—'],['Largest Facility',source.length?usd(Math.max(...source.map(r=>r[field]||0))):'—'],['Top 10 Concentration',amount?percent(top.reduce((sum,p)=>sum+p.y,0)/amount):'—']];
   chartBlock('Top 10 Relationships by '+name,'bar',top,'Selected balance by relationship · USD',true);
   insight('Largest relationship',rels[0]?.name||'Unavailable','Group source records by relationship_id, sum the selected balance, then rank descending.');
   insight('Largest relationship share',amount&&rels.length?percent(rels[0].y/amount):'—','Largest relationship balance divided by the full filtered balance. A zero denominator is unavailable.');
   insight('Balance coverage',n(source.filter(r=>typeof r[field]==='number').length)+' / '+n(source.length),'Records with a numeric '+field+' divided by all selected source records; no missing balances are imputed.');
   table('Regional Distribution',['Region','Facilities','Relationships',name,'Share'],groups(source,'region').map(g=>cohortRow([g.name,n(distinct(g.rows,'facility_id')),n(distinct(g.rows,'relationship_id')),usd(total(g.rows,field)),amount?percent(total(g.rows,field)/amount):'—'],g.rows)));
   chartBlock(name+' by Product Program','pie',breakdown(source,'product',field),'Selected balance · USD',true);
   table(name+' by Underwriter (Top 10)',['Underwriter','Region','Facilities',name],groups(source,'owner_name').sort((a,b)=>total(b.rows,field)-total(a.rows,field)).slice(0,10).map(g=>cohortRow([g.name,[...new Set(g.rows.map(r=>r.region))].join(', '),n(distinct(g.rows,'facility_id')),usd(total(g.rows,field))],g.rows)));
  }else if(a.id==='monitoringPriorityChart'){
   const names={COVENANTS:'Covenants',CA:'CA expiration',FACILITY:'Facility maturity',CCM:'CCM',INSURANCE:'Insurance',APPRAISALS:'Appraisals'},population=context.monitoring||source,actions=source.filter(r=>r.action_required),critical=actions.filter(r=>r.critical),upcoming=source.filter(r=>!r.action_required&&r.coming_due);
   metrics=[['Actions required',n(actions.length)],['Critical actions',n(critical.length)],['Upcoming items',n(upcoming.length)],['Accountable owners',n(distinct(source,'owner_id'))]];
   table('Monitoring coverage & priorities',['Area','Critical','Other actions','Upcoming','Source dates'],Object.entries(names).map(([key,name])=>{const rs=population.filter(r=>r.category===key),ds=[...new Set(rs.map(r=>r.as_of_date).filter(Boolean))].sort();const critical=rs.filter(r=>r.action_required&&r.critical),other=rs.filter(r=>r.action_required&&!r.critical),upcoming=rs.filter(r=>!r.action_required&&r.coming_due);return cohortRow([name,n(critical.length),n(other.length),n(upcoming.length),ds.length?ds.join(', '):'No records in current scope'],rs,{1:critical,2:other,3:upcoming});}),'Flags use each source’s own reporting date. Segments are mutually exclusive; counts represent obligations, not unique facilities.');
   chartBlock('Actionable items by region','bar',breakdown(actions,'region'),'Actions required in the shared monitoring scope.');
   chartBlock('Accountable owners (Top 10)','bar',owners(actions).map(g=>({name:g.name,y:g.rows.length,custom:{rows:g.rows}})),'Owners ranked by actionable obligations, across all six monitoring areas.');
   const leading=groups(actions,'category').sort((x,y)=>y.rows.length-x.rows.length)[0];
   insight('Critical share of actions',actions.length?percent(critical.length/actions.length):'—','Critical action count divided by all action_required obligations.');
   insight('Largest action queue',leading?(names[leading.name]||leading.name)+' · '+n(leading.rows.length):'No actions','Group actionable obligations by category and choose the largest count.');
   insight('Upcoming workload',n(upcoming.length),'Count coming_due records excluding action_required records to avoid overlap.');
   filters=[['All monitoring priorities',source],['Actions required',actions],['Critical actions',critical],['Upcoming',upcoming]];
  }else if(a.id==='newDealsChart'){
   const period=settings.dealPeriod||'ytd',rs=source.filter(r=>r['pal_new_'+period]),prior=source.filter(r=>r['pal_prior_'+period]);
   metrics=[['New deals',n(distinct(rs,'facility_id'))],['Total TFA',usd(total(rs,'tfa'))],['Avg Deal Size',rs.length?usd(total(rs,'tfa')/rs.length):'—'],['Product Programs',n(distinct(rs,'product'))]];
   table('Period-over-Period Performance',['Measure','Current period','Prior comparable period','Change'],[['Facilities',n(distinct(rs,'facility_id')),n(distinct(prior,'facility_id')),n(distinct(rs,'facility_id')-distinct(prior,'facility_id'))],['TFA',usd(total(rs,'tfa')),usd(total(prior,'tfa')),usd(total(rs,'tfa')-total(prior,'tfa'))]].map(cells=>cohortRow(cells,[...new Set([...rs,...prior])],{1:rs,2:prior,3:[...new Set([...rs,...prior])]})),'Same prepared comparison windows as the portfolio chart.');
   insight('Change in deal count',n(distinct(rs,'facility_id')-distinct(prior,'facility_id')),'Distinct current-period facilities minus distinct prior-comparable-period facilities. Absolute change, not a growth rate.');
   insight('Prior comparable TFA',usd(total(prior,'tfa')),'Sum TFA for records marked eligible for the prepared prior comparable period. Both cohorts come from the supplied snapshot.');
   insight('Date fallback used',n(rs.filter(r=>!r.origination_date&&r.renewal_date).length),'Count eligible new-deal records without origination_date that use renewal_date instead.');
   regional(rs);
   const dated=rs.map(r=>{const date=r.origination_date||r.renewal_date;let bucket=date||'Date not supplied';if(date&&['ytd','qtd'].includes(period))bucket=date.slice(0,7);else if(date&&period==='mtd'){const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));bucket=d.toISOString().slice(0,10);}return{...r,analysis_date:bucket};});
   chartBlock(period==='mtd'?'Weekly Trend':period==='wtd'?'Daily Trend':'Monthly Trend','column',breakdown(dated,'analysis_date').sort((x,y)=>x.name.localeCompare(y.name)),'Deal count by origination date; renewal is the fallback.');
   chartBlock('Product Distribution by TFA','pie',breakdown(rs,'product','tfa'),'Facility amounts · USD',true);chartBlock('Product Distribution by Deals Count','pie',breakdown(rs,'product'));
   table('New Deals by Underwriter (Top 10)',['Underwriter','Region','New Deals','Total TFA'],owners(rs).map(g=>cohortRow([g.name,[...new Set(g.rows.map(r=>r.region))].join(', '),n(g.rows.length),usd(total(g.rows,'tfa'))],g.rows)));
  }else if(a.id==='pal-pipeline'){
   metrics=[['Pending facilities',n(distinct(source,'facility_id'))],['Total TFA',usd(total(source,'tfa'))],['Over 90 days',n(source.filter(r=>r.pal_pipeline_bucket==='>90').length)],['Avg Deal Size',source.length?usd(total(source,'tfa')/source.length):'—']];regional(source);
   const aged=source.filter(r=>r.pal_pipeline_bucket==='>90');
   insight('TFA awaiting closure >90 days',usd(total(aged,'tfa')),'Sum tfa for pending facilities in prepared pal_pipeline_bucket >90.');
   insight('Older pipeline share',source.length?percent(aged.length/source.length):'—','Pending record count in the >90-day band divided by all pending records.');
   insight('Regions represented',n(distinct(source,'region')),'Distinct non-empty region values within the eligible pending population.');
   chartBlock('Aging Distribution','column',breakdown(source,'pal_pipeline_bucket'),'Days since first approval.');
   chartBlock('Product Program Distribution · Facilities','pie',breakdown(source,'product'));
   chartBlock('Product Program Distribution · TFA','pie',breakdown(source,'product','tfa'),'Pending TFA · USD',true);
   chartBlock('Facility Type Distribution','pie',breakdown(source,'facility_type'));
   chartBlock('Deals by Underwriter','bar',owners(source).map(g=>({name:g.name,y:g.rows.length,custom:{rows:g.rows}})));
   chartBlock('Top Relationships','bar',groups(source,'relationship_id').map(g=>({name:g.rows[0].relationship_name||g.name,y:total(g.rows,'tfa'),custom:{rows:g.rows}})).sort((a,b)=>b.y-a.y).slice(0,10),'Pending TFA · USD',true);
  }else if(a.id==='creditClassificationChart'){
   metrics=[['Total New Facilities',n(source.length)],['Total TFA',usd(total(source,'tfa'))],['Regions Active',n(distinct(source,'region'))],['Underwriters Involved',n(distinct(source,'owner_id'))]];regional(source);
   chartBlock('Top 10 Underwriters by Deal Count','bar',owners(source).map(g=>({name:g.name,y:g.rows.length,custom:{rows:g.rows}})));
   const approvalMonths=source.map(r=>({...r,approval_month:r.facility_first_approval_date?.slice(0,7)||'Date not supplied'}));
   chartBlock('Approval Volume by Month','column',breakdown(approvalMonths,'approval_month').sort((x,y)=>x.name.localeCompare(y.name)).map(p=>({...p,color:'#255BE3'})),'Count eligible approvals by first approval month; undated records remain visible.');
   const leadProduct=groups(source,'product').sort((x,y)=>y.rows.length-x.rows.length)[0],leadOwner=owners(source)[0];
   insight('Largest product cohort',leadProduct?leadProduct.name+' · '+n(leadProduct.rows.length):'No approvals','Group eligible approvals by product and choose the group with the largest record count.');
   insight('Leading underwriter',leadOwner?leadOwner.name+' · '+n(leadOwner.rows.length):'No approvals','Group eligible approvals by owner_name and choose the largest record count. Not supplied is retained as a group.');
   insight('Approval date coverage',n(source.filter(r=>r.facility_first_approval_date).length)+' / '+n(source.length),'Eligible records with a supplied first approval date compared with all eligible approval records.');
   table('Top 10 Facilities by TFA Approved',['Facility ID','Relationship','Region','Underwriter','Product','Approval Date','TFA Approved'],[...source].sort((x,y)=>y.tfa-x.tfa).slice(0,10).map(r=>cohortRow([r.facility_id,r.relationship_name,r.region,r.owner_name,r.product,r.facility_first_approval_date,usd(r.tfa)],[r])));
  }else if(a.id==='facilityTrendChart'){
   const ca=portfolio.filter(r=>r.pal_ca_month),expiredCA=portfolio.filter(r=>r.pal_ca_expired),fac=portfolio.filter(r=>r.pal_facility_month),expired=portfolio.filter(r=>r.pal_facility_expired);
   metrics=[['CAs Expiring (3m)',n(distinct(ca,'relationship_id'))],['CAs Expired',n(distinct(expiredCA,'relationship_id'))],['Facilities Expiring (3m)',n(distinct(fac,'facility_id'))],['Facilities Expired',n(distinct(expired,'facility_id'))]];
   insight('Expired facility TFA',usd(total(expired,'tfa')),'Sum tfa for filtered portfolio records flagged pal_facility_expired. This is facility capacity, not a loss estimate.');
   insight('Expiring facility TFA',usd(total(fac,'tfa')),'Sum tfa for filtered facilities with a prepared pal_facility_month in the three-month horizon.');
   insight('Expired maturity date coverage',n(expired.filter(r=>Number.isFinite(Date.parse(r.maturity_date))).length)+' / '+n(expired.length),'Expired facility records with a valid maturity_date compared with all expired facility records.');
   const aging=expired.map(r=>{const days=Math.round((Date.parse(r.as_of_date)-Date.parse(r.maturity_date))/86400000);return{...r,analysis_age:!Number.isFinite(days)?'Date not supplied':days<=30?'1–30 days':days<=60?'31–60 days':days<=90?'61–90 days':'>90 days'};});
   chartBlock('Expired Facilities by Aging','column',(aging.length?['1–30 days','31–60 days','61–90 days','>90 days',...(aging.some(r=>r.analysis_age==='Date not supplied')?['Date not supplied']:[])].map(name=>({name,y:aging.filter(r=>r.analysis_age===name).length,color:name==='Date not supplied'?'#94A3B8':'#255BE3',custom:{rows:aging.filter(r=>r.analysis_age===name)}})):[]),'Days since maturity at the source reporting date.');chartBlock('Expired Facilities by Product Program','pie',breakdown(expired,'product'));
   filters=[['Expiring CAs',ca],['Expired CAs',expiredCA],['Expiring facilities',fac],['Expired facilities',expired]];
   allRecords=portfolio.filter(r=>r.pal_ca_month||r.pal_ca_expired||r.pal_facility_month||r.pal_facility_expired);if(!a.selection)a.records=allRecords;a.source=true;
  }else if(a.id==='relationshipChart'||a.id==='rotceChart'){
   const known=ranked.filter(r=>r.rotce!==null),avg=mean(known,'rotce');
   metrics=a.id==='rotceChart'?[['Avg ROTCE',percent(avg)],['At / above target (≥12%)',n(known.filter(r=>r.rotce>=.12).length)],['8% to <12%',n(known.filter(r=>r.rotce>=.08&&r.rotce<.12).length)],['Below 8%',n(known.filter(r=>r.rotce<.08).length)]]:[['Total Relationships',n(ranked.length)],['Selected Exposure',usd(total(ranked,'exposure'))],['Total Facilities',n(distinct(source,'facility_id'))],['Avg ROTCE',percent(avg)]];
   const low=known.filter(r=>r.rotce<.12),exposure=total(ranked,'exposure');
   insight('ROTCE coverage',n(known.length)+' / '+n(ranked.length),'Count ranked relationships with a supplied non-null ROTCE compared with all ranked relationships.');
   insight('Exposure below 12% target',usd(total(low,'exposure')),'Sum selected exposure for ranked relationships with a supplied ROTCE below 12%; missing ratios are excluded.');
   insight('Below-target exposure share',exposure?percent(total(low,'exposure')/exposure):'—','Selected exposure for known below-12% relationships divided by all ranked exposure, including relationships with missing ratios. A zero denominator displays unavailable.');
   table('Regional Distribution',['Region','Relationships','Selected Exposure','Avg ROTCE'],groups(ranked,'region').map(g=>cohortRow([g.name,n(g.rows.length),usd(total(g.rows,'exposure')),percent(mean(g.rows,'rotce'))],g.rows.flatMap(r=>r.rows))),'Arithmetic mean of supplied relationship ratios. Missing ROTCE is excluded; multi-region relationships retain their combined region label.');
   chartBlock('Below 8% ROTCE (Top 10)','bar',[...known].filter(r=>r.rotce<.08).sort((x,y)=>x.rotce-y.rotce).slice(0,10).map(r=>({name:r.relationship_name,y:r.rotce*100,custom:{rows:r.rows}})),'PAL low-return band · percentage points. Main chart retains the 12% target.');
   if(a.id!=='rotceChart')chartBlock('Product Level Breakdown','pie',breakdown(source,'product',settings.measure||'direct_os'),'Selected exposure across ranked relationships · USD',true);
   table('Top Relationships Details',['Relationship','Region','Facilities','Selected Exposure','Direct OS','Total OS','OSUC','ROTCE'],ranked.map(r=>cohortRow([r.relationship_name,r.region,n(distinct(r.rows,'facility_id')),usd(r.exposure),usd(total(r.rows,'direct_os')),usd(total(r.rows,'total_os')),usd(total(r.rows,'osuc')),percent(r.rotce)],r.rows)),'Same relationship population and order as the portfolio chart.','detail');
  }else if(a.id==='covenantMonitoringChart'){
   const past=settings.covenants!=='coming',population=(context.monitoring||source).filter(r=>r.category==='COVENANTS'),aging=global.CreditCovenantAging,bucket=r=>aging.bucket(r,past)||'Aging not supplied',bands=[...aging.bands,...(source.some(r=>bucket(r)==='Aging not supplied')?['Aging not supplied']:[])];
   metrics=[['Total Covenants',n(source.length)],['Unique Relationships',n(distinct(source,'relationship_id'))],['Unique Facilities',n(distinct(source,'facility_id'))],[past?'Avg Days Past Due':'Avg per Relationship',past?(mean(source,'days_past_due')===null?'—':n(mean(source,'days_past_due'))+' days'):(distinct(source,'relationship_id')?n(source.length/distinct(source,'relationship_id')):'—')]];
   const lead=owners(source)[0];
   insight('Largest owner queue',lead?lead.name+' · '+n(lead.rows.length):'No obligations','Group selected covenant obligations by owner_name and choose the largest count.');
   insight(past?'Over 90 days past due':'Due beyond 90 days',n(source.filter(r=>bucket(r)==='>90').length),'Count selected covenant obligations in the over-90-day aging band, using the same categories as the chart.');
   insight('Aging coverage',n(source.filter(r=>bucket(r)!=='Aging not supplied').length)+' / '+n(source.length),'Records with a recognized aging category or valid date-derived aging compared with all selected obligations. Missing values are shown separately.');
   const bucketValues=rs=>bands.map(name=>n(rs.filter(r=>bucket(r)===name).length));
   table(past?'Past Due Covenants by Region':'Coming Due Covenants by Region',['Region','Population',...bands,'Total'],groups(population,'region').map(g=>{const rs=source.filter(r=>(r.region||'Not supplied')===g.name);return cohortRow([g.name,n(g.rows.length),...bucketValues(rs),n(rs.length)],rs,{1:g.rows,...Object.fromEntries(bands.map((band,i)=>[i+2,rs.filter(r=>bucket(r)===band)]))});}),'Population includes all supplied covenants in the shared scope. Aging uses each record’s source date.');
   chartBlock('Covenants by Product Program','pie',breakdown(source,'product'));
   table('Covenant Details by Relationship & Underwriter',['Relationship','Underwriter',...bands,'Total'],groups(source,'relationship_id').flatMap(g=>groups(g.rows,'owner_name').map(o=>cohortRow([g.rows[0].relationship_name||g.name,o.name,...bucketValues(o.rows),n(o.rows.length)],o.rows,Object.fromEntries(bands.map((band,i)=>[i+2,o.rows.filter(r=>bucket(r)===band)]))))),'','detail');
  }else if(a.id==='ccmRegionalChart'){
   metrics=[['Total CCMs',n(source.length)],['Unique Clients',n(distinct(source,'relationship_id'))],['Past Due CCMs',n(source.filter(r=>r.ccm_status==='PAST_DUE').length)],['vs Last Month','Unavailable']];
   insight('Past-due share',source.length?percent(source.filter(r=>r.ccm_status==='PAST_DUE').length/source.length):'—','CCM records with PAST_DUE status divided by all supplied CCM records in scope.');
   insight('Coming due',n(source.filter(r=>r.ccm_status==='COMING_DUE').length),'Count CCM records whose supplied ccm_status is COMING_DUE.');
   insight('Historical comparison','Not available','No comparable prior-month CCM snapshot is supplied; no historical trend is inferred.');
   const statuses=['PAST_DUE','COMING_DUE','OPEN'];table('Regional Distribution',['Region','Past Due','Coming Due','Open','Total'],groups(source,'region').map(g=>cohortRow([g.name,...statuses.map(k=>n(g.rows.filter(r=>r.ccm_status===k).length)),n(g.rows.length)],g.rows,Object.fromEntries(statuses.map((status,i)=>[i+1,g.rows.filter(r=>r.ccm_status===status)])))));
   chartBlock('Status Distribution Comparison','column',breakdown(source,'ccm_status'),'Current snapshot only. Prior-month CCM records were not supplied; no historical comparison is inferred.');filters=statuses.map(k=>[k.replaceAll('_',' '),source.filter(r=>r.ccm_status===k)]);
  }
  if(!metrics.length){const c=chartFor(a.id),points=values(a.id);metrics=[[a.source?'Supporting records':'Plotted values',n(a.records.length)],['Data series',n((c?.series||[]).filter(s=>!s.options.isInternal).length)],['Chart groups',n(new Set(points.map(p=>p.category)).size)],['Missing values',n(points.filter(p=>p.value===null).length)]];}

  if(!blocks.length)table('Chart breakdown',['Series','Category','Value'],values(a.id).map(p=>cohortRow([p.series,p.category,p.value==null?'—':n(p.value)],[p])),'Exact plotted values in chart units.');
  a.panel.classList.add('cd-pal-analysis');a.panel.querySelector('.cd-analysis-kpis').innerHTML=metrics.map(([label,value],i)=>{const kind=a.id.startsWith('metric-')?[i===3?'chart':i===2?'building':'wallet',i===3?'Concentration':'Exposure']:/TFA|Exposure/.test(label)?['wallet','Exposure']:/Size/.test(label)?['chart','Exposure']:/Product/.test(label)?['grid','Coverage']:/ROTCE|target|8%|Month/.test(label)?['trend','Performance']:/Region|Product|Underwriter|Clients|Relationships|dates/.test(label)?['users','Coverage']:/Expired|Due|Days/.test(label)?['calendar','Monitoring']:['chart','Volume'];return '<div class="cd-analysis-metric"><div class="cd-metric-heading">'+(global.CreditIcons?.metric(kind[0],i)||'')+'<div><small>'+kind[1]+'</small><span>'+esc(label)+'</span></div></div><strong>'+esc(value)+'</strong>'+sectionButton(label,'Summary metric · current analysis',metricRule(label,a.id))+'</div>';}).join('');
  const analysisGrid=a.panel.querySelector('.cd-analysis-grid'),slot=a.panel.querySelector('.cd-chart-slot'),kpiGrid=a.panel.querySelector('.cd-analysis-kpis');analysisGrid.innerHTML=blocks.join('');
  const detailCards=[...analysisGrid.children];
  if(!insights.length){const pts=values(a.id);insight('Visible groups',n(new Set(pts.map(p=>p.category)).size),'Count distinct category labels among the plotted series.');insight('Known plotted values',n(pts.filter(p=>p.value!==null).length)+' / '+n(pts.length),'Count non-null plotted values compared with all plotted points. Zero is a known value.');insight('Explore the records','Select a chart point','Selecting a point scopes the supporting records and download to that point. Show all chart data restores the full analysis population.');}
  const takeaways=document.createElement('section');takeaways.className='ch-card cd-insight-card cd-takeaways';
  takeaways.innerHTML='<div class="ch-card-head"><div><h3>In this selection</h3><p class="ch-card-sub">A closer look at the current scope</p></div>'+sectionButton('In this selection','Calculated insights for the current analysis',insights.map(x=>x.label+': '+x.rule).join(' '))+'</div><dl>'+insights.map(x=>'<div><dt>'+esc(x.label)+'</dt><dd>'+esc(x.value)+'</dd></div>').join('')+'</dl><p class="cd-takeaway-note">Updates with your filters and period selection.</p>';
  // PAL order: KPI row, principal analysis, supporting breakdowns, detailed tables.
  // Equal-width chart pairs; reserve the full row for wide registers.
  a.panel.querySelector('.cd-detail-heading').after(kpiGrid);
  const metricPage=a.id.startsWith('metric-');
  const primary=metricPage?detailCards.find(c=>c.classList.contains('cd-insight-visual')):slot;
  const remaining=detailCards.filter(c=>c!==primary);
  analysisGrid.replaceChildren(...(metricPage?[slot]:[]),primary,takeaways,...remaining);
  primary.style.setProperty('--cd-span','6');takeaways.style.setProperty('--cd-span','6');
  const full=remaining.filter(c=>c.classList.contains('cd-wide')||c.querySelectorAll('thead th').length>4),compact=remaining.filter(c=>!full.includes(c));
  // A single remaining chart pairs with a regional table rather than stretching full-width.
  if(compact.length===1&&compact[0].classList.contains('cd-insight-visual')&&full.length){const candidate=full.find(c=>/Region/.test(c.querySelector('h3')?.textContent||''))||full.find(c=>c.querySelectorAll('thead th').length<=4);if(candidate){full.splice(full.indexOf(candidate),1);candidate.classList.remove('cd-wide');compact.unshift(candidate);}}
  // Pair charts first so companion visuals have the same column width.
  const visuals=compact.filter(c=>c.classList.contains('cd-insight-visual'));
  const tables=compact.filter(c=>!c.classList.contains('cd-insight-visual'));
  const paired=[...visuals,...tables];
  paired.forEach(c=>c.style.setProperty('--cd-span','6'));
  const last=paired.at(-1);if(paired.length%2&&last?.classList.contains('cd-insight-table'))last.style.setProperty('--cd-span','12');
  full.forEach(c=>c.style.setProperty('--cd-span','12'));
  analysisGrid.append(...paired,...full);

  a.panel.querySelectorAll('[data-summary-drill]').forEach(card=>{
   const spec=tableDrills[+card.dataset.summaryDrill],table=card.querySelector('table');
   // Source arrays are captured with the aggregate. Display labels are never join keys.
   global.CreditTables.bindRows({table,rows:spec.rows,resolve:r=>r._rows,label:r=>String(r[0])});
   global.CreditDrillTable(table,(i,j)=>j===0?null:spec.rows[i]._cellRows[j]??spec.rows[i]._rows,(rs,label)=>drillTable(rs,label,table,document.activeElement));
  });
  a.panel.querySelectorAll('[data-section-method]').forEach(button=>button.onclick=()=>methodology(a.id,sectionMethods[+button.dataset.sectionMethod]));
  if(filters){const bar=a.panel.querySelector('.cd-source-filters');bar.innerHTML=filters.map(([name],i)=>'<button type="button" data-source-filter="'+i+'" aria-pressed="false">'+esc(name)+'</button>').join('');bar.querySelectorAll('button').forEach(b=>b.onclick=()=>{a.records=filters[+b.dataset.sourceFilter][1];a.query='';a.tableState=global.CreditTables.createState();a.page=0;a.panel.querySelector('.cd-search-label input').value='';bar.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));a.panel.querySelector('.cd-record-note').textContent=filters[+b.dataset.sourceFilter][0];sourceTable();});bar.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const buttons=[...bar.querySelectorAll('button')],i=buttons.indexOf(e.target);if(i<0)return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();buttons[next].click();};}
  a.allRecords=allRecords;
  a.detailCharts=[];for(const p of plans){const el=a.panel.querySelector('#'+p.id);if(!p.pts.length||!global.Highcharts){el.innerHTML='<p class="ch-empty">'+(!p.pts.length?'No eligible records in this selection.':'Chart library unavailable.')+'</p>';continue;}const detailChart=global.Highcharts.chart(el,{chart:{type:p.type,height:320,backgroundColor:'transparent',animation:false,style:{fontFamily:getComputedStyle(root).fontFamily}},title:{text:null},credits:{enabled:false},accessibility:{description:p.title},legend:{enabled:p.type==='pie',align:'right',verticalAlign:'middle',layout:'vertical',itemStyle:{fontWeight:'normal',fontSize:'11px'}},xAxis:{categories:p.pts.map(p=>p.name),tickLength:0,lineColor:'#e1e8ef'},yAxis:{title:{text:null},allowDecimals:p.money||p.title.includes('ROTCE'),gridLineDashStyle:'Dash',labels:{formatter:function(){return p.money?usd(this.value):n(this.value);}}},tooltip:{pointFormatter:function(){return esc(this.name)+': <b>'+esc(p.money?usd(this.y):n(this.y))+'</b>';}},plotOptions:{series:{color:'#255BE3',animation:false,borderWidth:0,maxPointWidth:22,cursor:'pointer',point:{events:{click:function(){drillInPlace(a.id,this.options.custom?.rows||[],this.name||p.title,el);}}}},pie:{innerSize:'68%',showInLegend:true,dataLabels:{enabled:false},borderWidth:2,borderColor:'#fff'}},series:[{name:p.title,data:p.pts}],responsive:{rules:[{condition:{maxWidth:440},chartOptions:{legend:{align:'center',verticalAlign:'bottom',layout:'horizontal'}}}]}});a.detailCharts.push(detailChart);if(p.type==='pie')global.CreditDonut?.(detailChart,{esc,format:p.money?usd:n,label:p.money?'Total · USD':a.id==='covenantMonitoringChart'?'Total covenants':a.id==='ccmRegionalChart'?'Total CCMs':'Total facilities',onSelect:point=>drillInPlace(a.id,point.custom?.rows||[],point.name,el)});}
 }

 function alignExpandedSummary(a){
  const grid=a.panel.querySelector('.cd-analysis-grid,.cd-explorer-grid'),kpis=a.panel.querySelector('.cd-analysis-kpis,.cd-explorer-kpis');if(!grid||!kpis)return;
  const insight=a.panel.querySelector('.cd-expanded-summary')||grid.querySelector(':scope>.mon-insights,:scope>.cd-takeaways,:scope>.cd-attention-summary,:scope>.cd-explorer-insights');if(!insight)return;
  // Summaries are plain text; calculation controls belong to charts, KPIs and tables.
  const details=insight.querySelector('dl'),note=insight.querySelector('.cd-takeaway-note,.cd-explorer-note,.cd-summary-note');
  insight.className='cd-expanded-summary';insight.removeAttribute('style');insight.setAttribute('aria-label','Analysis summary');
  const caption=document.createElement('strong');caption.className='cd-summary-caption';caption.textContent='In this selection';if(note)note.className='cd-summary-note';
  insight.replaceChildren(...[caption,details,note].filter(Boolean));kpis.before(insight);
  grid.classList.remove('cd-summary-first-row','cd-three-summary-layout','cd-aging-layout');
  const visuals=[...grid.children].filter(c=>!c.hidden&&(c.matches('.cd-chart-slot,.cov-chart-card,.cd-insight-visual,.cd-explorer-breakdown')||c.querySelector('.ch-chart')));
  visuals.forEach(c=>{c.classList.remove('cd-first-row-card','cd-summary-leading','cd-attention-chart','cd-aging-region');c.style.setProperty('--cd-span','6');c.dataset.bentoSpan='6';});
  if(grid.classList.contains('cd-explorer-grid'))grid.classList.add('cd-explorer-single');
  grid.classList.add('cd-summary-above');
 }

 // Only bottom detail views are tabbed; analytical summaries stay in the chart grid.
 function tableViews(a){
  const records=a.panel.querySelector('.cd-source-card'),tables=[...a.panel.querySelectorAll('.cd-insight-table[data-table-mode=detail]')];
  if(!tables.length)return;
  const host=document.createElement('div');host.className='cd-table-views';records.before(host);
  const panels=[...tables,records],tabs=document.createElement('div');tabs.className='pal-segments cd-table-tabs';tabs.dataset.tableViewTabs='';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Expanded table views');
  const label=panel=>{const title=panel.querySelector('h3,h2')?.textContent||'Data';if(panel===records)return 'Supporting records';if(/Region/.test(title))return 'Region';if(title==='Covenant Details by Relationship & Underwriter')return 'Relationship & Underwriter';if(/Period-over-Period/.test(title))return 'Period comparison';if(/Top 10 Facilities/.test(title))return 'Top facilities';if(/Underwriter/.test(title))return 'Underwriter';if(/Relationships Details/.test(title))return 'Relationships';return title;};
  panels.forEach((panel,i)=>{panel.id=panel.id||'cd-table-panel-'+i;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','cd-table-tab-'+i);panel.dataset.tableView=String(i);panel.style.removeProperty('--cd-span');host.append(panel);});
  tabs.innerHTML=panels.map((panel,i)=>'<button type="button" role="tab" id="cd-table-tab-'+i+'" data-table-view="'+i+'" aria-controls="'+panel.id+'" aria-selected="false" tabindex="-1">'+esc(label(panel))+'</button>').join('');
  const buttons=[...tabs.children];
  a.selectTableView=(value,focus=false)=>{const index=value==='records'?panels.length-1:Number(value),panel=panels[index];if(!panel)return;panels.forEach((p,i)=>{p.hidden=i!==index;});buttons.forEach((b,i)=>{b.setAttribute('aria-selected',String(i===index));b.setAttribute('aria-pressed',String(i===index));b.tabIndex=i===index?0:-1;});(panel===records?panel.querySelector('.cd-record-toolbar'):panel.querySelector('.ct-status')).prepend(tabs);a.tableView=index;global.CreditControls?.tableToolbar(a.panel);global.CreditControls?.enhance(a.panel);if(focus)buttons[index].focus({preventScroll:true});};
  buttons.forEach((b,i)=>b.onclick=()=>a.selectTableView(i,true));
  tabs.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;const i=buttons.indexOf(e.target);if(i<0)return;e.preventDefault();a.selectTableView(e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length,true);};
  a.selectTableView('records');
 }

 function restore(keep=false){
  clearInline();
  if(!active)return;const a=active;active=null;resumeId=keep?a.id:null;
  (a.detailCharts||[]).forEach(c=>c.destroy());global.CreditTables.releaseStatic(a.card);a.placeholder.replaceWith(a.card);a.card.classList.remove('cd-expanded-card');if(a.synthetic)a.card.remove();a.overlay?.dispose();a.panel.remove();a.hidden.forEach(([el,was])=>el.hidden=was);root.classList.remove('cd-detail-active');$('.ch-skip').setAttribute('href','#ch-content');
  const chart=chartFor(a.id);if(chart){chart.renderTo.style.height=a.elementHeight;chart.setSize(null,a.height,false);}$('#ch-download').disabled=!(root._exportRows||[]).length;$('#ch-download').title=root.dataset.view==='portfolio'?'Download the filtered portfolio as CSV':'Download the filtered register as CSV';
  if(!keep){a.trigger?.focus({preventScroll:true});window.scrollTo({top:a.scroll,behavior:'instant'});}
 }
 function sourceTable(a=active){
  if(!a)return;const records=a.relatedRecords??a.records,scope=records.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(a.query)));let rs=scope;$('#ch-download').title='Download '+(a.source?'supporting records':'chart values')+' for this chart as CSV';
  const labels={status:'Status',action_required:'Action required',critical:'Critical',coming_due:'Coming due',relationship_name:'Relationship',facility_id:'Facility',item_id:'Item',as_of_date:'Source date',region:'Region',product:'Product',owner_name:'Owner',tfa:'TFA (USD)',direct_os:'Direct OS (USD)',rotce:'ROTCE',days_past_due:'Days past due',source_aging_bucket:'Source aging category',ccm_status:'CCM status',facility_first_approval_date:'First approval',origination_date:'Origination',renewal_date:'Renewal',maturity_date:'Maturity',ca_expiration_date:'CA expiration',effective_due_date:'Effective due date',classification:'Classification',covenant_id:'Covenant',team_lead:'Team lead',series:'Series',category:'Category',value:'Value'};const formatted=(k,v)=>v==null?'—':typeof v==='boolean'?(v?'Yes':'No'):k==='rotce'?(v*100).toFixed(1)+'%':typeof v==='number'?v.toLocaleString('en-US',{maximumFractionDigits:2}):v;
  let keys=a.source?['relationship_name','facility_id','item_id','category','status','action_required','critical','coming_due','as_of_date','region','product','owner_name','tfa','direct_os','rotce','days_past_due','source_aging_bucket','ccm_status','facility_first_approval_date','origination_date','renewal_date','maturity_date','ca_expiration_date','effective_due_date','classification','covenant_id','team_lead'].filter(k=>records.some(r=>Object.hasOwn(r,k))):['series','category','value'];
  if(a.source)keys=[...new Set([...keys,...['relationship_id','banker_name','osuc','total_os','next_month_end','expired_bucket','deficiency_bucket','event_id','event_type','event_date','source_id'].filter(k=>records.some(r=>Object.hasOwn(r,k)))])];
  if(a.id.startsWith('cov-')||a.id.startsWith('metric-cov-')||records.some(r=>r.event_type))keys=global.CreditCovenantsData.columns(records).map(c=>c[0]);
  if(a.drill)keys=[...new Set([...keys,...records.flatMap(Object.keys)])];
  if(!a.drill)keys=keys.filter(k=>records.some(r=>r[k]!==null&&r[k]!==undefined&&r[k]!==''));
  const columns=keys.map(key=>({key,label:labels[key]||global.CreditCovenantsData?.label(key)||key,rangeScale:key==='rotce'?100:1,rangeUnit:key==='rotce'?'percent':'',format:v=>formatted(key,v)}));a.tableState??=global.CreditTables.createState();rs=global.CreditTables.select(scope,columns,a.tableState);a.exportRows=rs;$('#ch-download').disabled=!rs.length;
  a.pageSize??=10;a.page=Math.min(a.page,Math.max(0,Math.ceil(rs.length/a.pageSize)-1));
  const area=a.panel.querySelector('.cd-records');area.innerHTML='<div class="ch-table-wrap credit-data-table-scroll"><table class="credit-data-table"><thead><tr>'+keys.map(k=>'<th>'+esc(labels[k]||global.CreditCovenantsData?.label(k)||k)+'</th>').join('')+'</tr></thead><tbody>'+rs.slice(a.page*a.pageSize,(a.page+1)*a.pageSize).map(r=>'<tr>'+keys.map((k,j)=>'<td>'+(!a.drill&&j===0?'<button type="button" class="ch-row-link" data-source-record="'+rs.indexOf(r)+'">'+esc(formatted(k,r[k]))+'</button>':esc(formatted(k,r[k])))+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+(!rs.length?'<p class="ch-empty">No matching records in this selection.</p>':'')+'</div>';
  global.CreditTables.bindRows({table:area.querySelector('table'),rows:rs.slice(a.page*a.pageSize,(a.page+1)*a.pageSize)});
  global.CreditTables.decorate({table:area.querySelector('table'),rows:scope,columns,state:a.tableState,onChange:()=>{a.page=0;sourceTable(a);},matched:rs.length});
  global.CreditTables.pagination({host:area,total:rs.length,page:a.page,pageSize:a.pageSize,onChange:(next,size)=>{a.page=next;a.pageSize=size;sourceTable(a);}});
 }
 // A drill-down narrows the exact selected cohort; records are an explicit drill-through view.
 const drillDimensions=[
  ['category','Monitoring area',r=>r.category,r=>({CA:'CA expiration',FACILITY:'Facility maturity',COVENANTS:'Covenants',APPRAISALS:'Appraisals',INSURANCE:'Insurance',CCM:'CCM',ACTIVITY:'Activity'}[r.category]||r.category)],['region','Region',r=>r.region,r=>r.region],
  ['team_lead','Team',r=>r.team_lead,r=>r.team_lead],['owner','Owner',r=>r.owner_id||r.owner_name,r=>r.owner_name||r.owner_id],
  ['product','Product',r=>r.product,r=>r.product],['status','Status',r=>r.status,r=>r.status],
  ['relationship','Relationship',r=>r.relationship_id,r=>[r.relationship_id,r.relationship_name].filter(Boolean).join(' – ')],
  ['facility','Facility',r=>r.facility_id?JSON.stringify([r.region||'',r.relationship_id||'',r.facility_id]):null,r=>[r.facility_id,r.relationship_id].filter(Boolean).join(' · ')]
 ];
 function drillGroups(rows,dimension){const groups=new Map();rows.forEach(row=>{const value=dimension[2](row),key=value==null||value===''?'__missing__':String(value);if(!groups.has(key))groups.set(key,{key,name:key==='__missing__'?'Not supplied':String(dimension[3](row)||value),rows:[]});groups.get(key).rows.push(row);});return [...groups.values()].sort((a,b)=>b.rows.length-a.rows.length||a.name.localeCompare(b.name));}
 // Both inline and overlay drill views use the same chart policy and click path.
 function drillChart(host,rows,dimension,shown,trail,onSelect,height){
  const points=shown.map(g=>({name:g.name,y:g.rows.length,custom:{group:g,rows:g.rows}}));
  const type=global.CreditPortfolioJourneyModel?.drillChartType({groups:shown.map(g=>({...g,y:g.rows.length})),total:rows.length,measure:'records',depth:trail.length-1})||'bar',pie=type==='pie';
  host.dataset.drillChartType=pie?'donut':'bar';
  const chart=global.Highcharts.chart(host,{chart:{type,height:pie?320:height,backgroundColor:'transparent',animation:false,style:{fontFamily:getComputedStyle(root).fontFamily}},title:{text:null},credits:{enabled:false},legend:{enabled:false},accessibility:{description:'Drill down by '+dimension[1]+'. Select a '+(pie?'slice':'bar')+' to continue. Use the breadcrumbs to return.'},xAxis:{categories:shown.map(g=>g.name),tickLength:0},yAxis:{title:{text:'Source rows'},allowDecimals:false,gridLineDashStyle:'Dash'},tooltip:{pointFormat:'<b>{point.y}</b> source rows'},colors:['#255BE3','#73bfff','#00af75','#8a329e','#ffbf00','#dc7052'],plotOptions:{series:{animation:false,cursor:'pointer',borderWidth:0,maxPointWidth:22,point:{events:{click:function(){onSelect(this.options.custom.group);}}}},bar:{borderRadius:3},pie:{innerSize:'68%',dataLabels:{enabled:false},borderWidth:3,borderColor:'#fff'}},series:[{name:'Source rows',color:pie?undefined:'#255BE3',colorByPoint:pie,data:points}]});
  if(pie)global.CreditDonut?.(chart,{esc,format:n=>n.toLocaleString('en-US'),label:'Source rows',onSelect:p=>onSelect(p.custom.group)});
  return chart;
 }
 function drillMode(a,mode){a.mode=mode;a.panel.querySelector('[data-drill-analysis]').hidden=mode!=='analysis';a.panel.querySelector('.cd-source-card').hidden=false;a.panel.querySelectorAll('[data-drill-mode]').forEach(b=>{const selected=b.dataset.drillMode===mode;b.setAttribute('aria-selected',String(selected));b.setAttribute('aria-pressed',String(selected));b.tabIndex=selected?0:-1;});const exportRows=a.exportRows;$('#ch-download').disabled=!exportRows.length;$('#ch-download').title='Download '+exportRows.length+' matching source records';if(mode==='analysis')a.explorerChart?.reflow();global.CreditControls?.enhance(a.panel);a.panel.querySelector('.cd-explorer-navigation').scrollIntoView({block:'nearest',behavior:'instant'});}
 function renderDrillAnalysis(a,preferred){
  a.explorerChart?.destroy();a.explorerChart=null;
  const host=a.panel.querySelector('[data-drill-analysis]'),rows=a.records,used=new Set(a.trail.map(x=>x.dimension).filter(Boolean));
  const dimensions=drillDimensions.filter(d=>!used.has(d[0])&&drillGroups(rows,d).length>1),dimension=dimensions.find(d=>d[0]===preferred)||dimensions[0];
  const groups=dimension?drillGroups(rows,dimension):[],shown=groups.length>10?[...groups.slice(0,10),{name:'Other groups ('+(groups.length-10)+')',key:'__other__',rows:groups.slice(10).flatMap(x=>x.rows),other:true}]:groups;
  const distinct=key=>new Set(rows.map(key).filter(v=>v!=null&&v!=='')).size;
  const relationships=distinct(r=>r.relationship_id),facilities=distinct(r=>r.facility_id?JSON.stringify([r.region||'',r.relationship_id||'',r.facility_id]):null),hasCritical=rows.some(r=>typeof r.critical==='boolean'),critical=rows.filter(r=>r.critical===true).length,owners=distinct(r=>r.owner_id||r.owner_name);
  const fmt=n=>n.toLocaleString('en-US');
  a.panel.querySelector('[data-drill-scope]').textContent=a.trail.map(x=>x.label).join(' › ')+' · '+fmt(rows.length)+' source rows';
  a.panel.querySelector('[data-drill-breadcrumbs]').innerHTML=a.trail.map((x,i)=>'<button type="button" data-drill-level="'+i+'" '+(i===a.trail.length-1?'aria-current="step" disabled':'')+'>'+esc(x.label)+'</button>').join('<span aria-hidden="true">›</span>');
  const metrics=[['Source rows',rows.length],['Relationship IDs',relationships],['Facility keys',facilities],[hasCritical?'Critical source rows':'Accountable owners',hasCritical?critical:owners]];
  host.innerHTML='<div class="cd-explorer-kpis ch-kpis">'+metrics.map(([label,value],i)=>'<section class="ch-card cd-analysis-metric cd-explorer-kpi"><button class="cw-icon-btn cd-section-method" data-explorer-method aria-label="Methodology for '+esc(label)+'">'+infoIcon+'</button><div>'+global.CreditIcons.metric(['document','users','building','shield'][i],i)+'<h3>'+esc(label)+'</h3></div><strong>'+fmt(value)+'</strong></section>').join('')+'</div><div class="cd-explorer-grid"><section class="ch-card cw-framed-card cd-explorer-breakdown"><div class="ch-card-head"><div><h2>'+(dimension?'Breakdown by '+esc(dimension[1].toLowerCase()):rows.length?'Selected record context':'No records in this selection')+'</h2><p class="ch-card-sub">'+(dimension?'Select a group to narrow this population.':'Open the records view for supplied fields and identifiers.')+'</p></div>'+(dimension?'<label class="cd-explorer-dimension">Break down by<select aria-label="Break down by">'+dimensions.map(d=>'<option value="'+d[0]+'" '+(d===dimension?'selected':'')+'>'+esc(d[1])+'</option>').join('')+'</select></label>':'')+'</div>'+(dimension?'<div class="ch-chart" id="cd-explorer-chart"></div>':'<dl class="cd-explorer-context">'+drillDimensions.filter(d=>rows.some(r=>d[2](r))).map(d=>'<div><dt>'+esc(d[1])+'</dt><dd>'+esc(drillGroups(rows,d)[0]?.name||'Not supplied')+'</dd></div>').join('')+'</dl>')+'</section><section class="ch-card cw-framed-card cd-explorer-insights"><div class="ch-card-head"><h2>In this selection</h2><button class="cw-icon-btn cd-section-method" data-explorer-method aria-label="Methodology for drill-down analysis">'+infoIcon+'</button></div><dl><div><dt>'+(dimension?'Largest '+esc(dimension[1].toLowerCase())+' group':'Current scope')+'</dt><dd>'+esc(groups[0]?.name||a.trail.at(-1).label)+'</dd>'+(groups[0]?'<p>'+fmt(groups[0].rows.length)+' rows · '+(100*groups[0].rows.length/rows.length).toFixed(1)+'% of this selection'+(groups.filter(x=>x.rows.length===groups[0].rows.length).length>1?' · tied for largest':'')+'</p>':'')+'</div><div><dt>Relationship / facility linkage</dt><dd>'+fmt(rows.filter(r=>!r.relationship_id||!r.facility_id).length)+' rows missing a key</dd></div></dl><p class="cd-explorer-note">Counts are source rows. Covenant–facility links may repeat the same obligation. Amounts are retained in records and are not summed across duplicate links.</p></section></div>';
  const enter=group=>{if(group.rows.length>=rows.length)return;a.trail.push({label:(dimension?dimension[1]+': ':'')+group.name,rows:group.rows,dimension:group.other?null:dimension[0],preferred:group.other?dimension[0]:null});a.records=group.rows;resetDrillRecords(a);renderDrillAnalysis(a,group.other?dimension[0]:null);drillMode(a,'analysis');};
  host.querySelector('[aria-label="Break down by"]')?.addEventListener('change',e=>{a.trail.at(-1).preferred=e.target.value;renderDrillAnalysis(a,e.target.value);});
  host.querySelectorAll('[data-explorer-method]').forEach(button=>button.onclick=()=>methodology(a.id,{title:'Drill-down analysis',note:a.trail.map(x=>x.label).join(' › '),explanation:['Every level filters only the exact source rows attached to the original selection. Group counts partition that population; missing dimension values form Not supplied. The chart shows the ten largest groups plus Other groups when necessary; clicking Other groups exposes the remaining groups. Changing the breakdown dimension changes grouping, not scope. Breadcrumbs restore an earlier population.','Source rows are not necessarily unique obligations. Relationship IDs are distinct non-empty IDs. Facility keys are distinct region + relationship + facility ID combinations; missing facility IDs are excluded. Critical counts use only explicit true flags; when critical flags are absent, the fourth metric counts distinct owner IDs, falling back to owner names. Missing keys counts rows lacking either relationship or facility ID. No balances or variances are inferred.','View records opens the complete current cohort with search, filters, sorting and pagination. Download in Breakdown exports the whole selected cohort; in Records it exports all rows matching table filters across all pages.']}));
  if(dimension&&global.Highcharts)a.explorerChart=drillChart(host.querySelector('#cd-explorer-chart'),rows,dimension,shown,a.trail,enter,Math.max(300,shown.length*30+70));
  else if(dimension)host.querySelector('#cd-explorer-chart').innerHTML='<p class="ch-empty">Chart library unavailable. Use Records to inspect this population.</p>';
  a.relatedRecords=null;
  const relatedHost=a.panel.querySelector('.cd-source-card');
  renderRelated?.({rows,host,dataHost:relatedHost,profile:!dimension,onDataset:records=>{a.relatedRecords=records;a.query='';a.page=0;a.tableState=global.CreditTables.createState();a.panel.querySelector('[aria-label="Search drill-down records"]').value='';sourceTable(a);drillMode(a,'records');}});
  if(relatedHost.querySelector('.pj-leaf-datasets')){global.CreditControls?.tableToolbar(relatedHost);const bar=relatedHost.querySelector('.pj-leaf-datasets');if(!bar.querySelector('.pal-segments'))bar.remove();}
  alignExpandedSummary(a);
  a.panel.querySelectorAll('[data-drill-level]').forEach(b=>b.onclick=()=>{a.trail=a.trail.slice(0,Number(b.dataset.drillLevel)+1);a.records=a.trail.at(-1).rows;resetDrillRecords(a);renderDrillAnalysis(a,a.trail.at(-1).preferred);drillMode(a,'analysis');});global.CreditUI.enhance(host);
 }
 function resetDrillRecords(a){a.relatedRecords=null;a.query='';a.page=0;a.tableState=global.CreditTables.createState();a.panel.querySelector('[aria-label="Search drill-down records"]').value='';sourceTable(a);}

 const inlineDrills=new Map();let inlineFocus=null;
 // Table frames retain the exact DOM and controls underneath, including pagination.
 function restoreInlineFrame(a,restorePosition=false){
  a.chart?.destroy();a.controls?.remove();a.host.remove();a.original.forEach(([el,hidden])=>el.hidden=hidden);a.card.className=a.className;a.card.style.minHeight=a.minHeight;
  if(a.parentInline){inlineDrills.set(a.card,a.parentInline);inlineFocus=a.parentInline;}else{inlineDrills.delete(a.card);if(inlineFocus===a)inlineFocus=null;}
  (getCharts().find(c=>c.renderTo===a.element)||active?.detailCharts?.find(c=>c.renderTo===a.element))?.reflow();a.parentInline?.chart?.reflow();
  if(a.tableOrigin){$('#ch-download').disabled=a.downloadDisabled;$('#ch-download').title=a.downloadTitle;}
  if(restorePosition){(a.trigger||a.card.querySelector('[data-chart-expand]'))?.focus({preventScroll:true});if(a.scrollHost)a.scrollHost.scrollTop=a.originScroll;else window.scrollTo({top:a.originScroll,behavior:'instant'});}
 }
 function clearInline(card,restorePosition=false){
  const cards=card?[card]:[...inlineDrills.keys()];for(const target of cards){while(inlineDrills.has(target))restoreInlineFrame(inlineDrills.get(target),restorePosition);}
  if(!inlineFocus&&!drilled){$('#ch-download').disabled=!(active?.exportRows||root._exportRows||[]).length;$('#ch-download').title='Download dashboard records';}
 }
 function clearTableDrills(panel){for(const card of [...inlineDrills.keys()])if(!panel||panel.contains(card))while(inlineDrills.get(card)?.tableOrigin)restoreInlineFrame(inlineDrills.get(card));}
 function drillTable(records,selection,element,trigger){
  const card=element?.closest('.ch-card');if(!card||!records.length)return false;
  const current=inlineDrills.get(card);if(current?.terminal&&records.length===current.records.length&&records.every(r=>current.records.includes(r))){current.controls.querySelector('[data-inline-mode="chart"]').click();return true;}
  global.CreditUI.closePopover();const head=card.querySelector(':scope>.ch-card-head,:scope>.ch-toolbar'),host=document.createElement('div');host.className='cd-inline-drill cd-table-drill';
  const original=[...card.children].filter(el=>el!==head).map(el=>[el,el.hidden]);
  if(head)for(const el of head.children){if(el.matches('.ch-actions,.cc-table-actions,.cd-drill-actions,.pj-drill-actions,.cd-chart-controls,.pal-segments,button,label'))original.push([el,el.hidden]);}
  const scrollHost=card.closest('.ca-overlay-body'),a={id:'table-records',tableOrigin:true,card,element,head,host,original,parentInline:inlineDrills.get(card),trigger:trigger||document.activeElement,scrollHost,originScroll:scrollHost?scrollHost.scrollTop:window.scrollY,className:card.className,minHeight:card.style.minHeight,plotHeight:320,records,trail:[{label:selection||'Selected records',rows:records}],mode:'chart',downloadTitle:$('#ch-download').title,downloadDisabled:$('#ch-download').disabled};
  original.forEach(([el])=>el.hidden=true);card.style.minHeight='0px';card.classList.add('cd-inline-active');card.append(host);inlineDrills.set(card,a);drawInline(a);host.querySelector('nav')?.setAttribute('tabindex','-1');host.querySelector('nav')?.focus({preventScroll:true});card.scrollIntoView({block:'start',behavior:'instant'});return true;
 }
 function inlineExport(a){inlineFocus=a;const rows=a.mode==='records'||a.terminal?a.exportRows:a.records;$('#ch-download').disabled=!rows?.length;$('#ch-download').title='Download '+(rows?.length||0)+' source rows from '+a.trail.at(-1).label;}
 function drawInline(a){
  a.relatedRecords=null;a.chart?.destroy();a.controls?.remove();a.chart=null;if(a.mode!=='records'&&!a.className.split(' ').includes('ct-table-card'))a.card.classList.remove('ct-table-card');const rows=a.records,used=new Set(a.trail.map(x=>x.dimension).filter(Boolean)),dimension=drillDimensions.find(d=>!used.has(d[0])&&drillGroups(rows,d).length>1),groups=dimension?drillGroups(rows,dimension):[],shown=groups.length>10?[...groups.slice(0,10),{name:'Other groups ('+(groups.length-10)+')',rows:groups.slice(10).flatMap(g=>g.rows),other:true}]:groups;
  a.host.innerHTML='<div class="cd-inline-toolbar"><nav aria-label="'+(a.tableOrigin?'Table drill-down path':'Chart drill-down path')+'"><button type="button" data-inline-reset>'+(a.tableOrigin?'Back to table':'All')+'</button>'+a.trail.map((x,i)=>'<span aria-hidden="true">›</span><button type="button" data-inline-level="'+i+'" '+(i===a.trail.length-1?'disabled aria-current="step"':'')+'>'+esc(x.label.replace(/^(Region|Relationship|Facility|Product|Owner|Team): /,'').split(' – ')[0])+'</button>').join('')+'</nav><div class="ch-actions"><div class="pal-segments" role="tablist" aria-label="Selected chart view"><button type="button" role="tab" data-inline-mode="chart">Chart</button><button type="button" role="tab" data-inline-mode="records" data-inline-view>Data</button></div><button class="cw-icon-btn cd-section-method" data-inline-method aria-label="Methodology for chart drill-down">'+infoIcon+'</button></div></div><p class="cd-inline-scope" role="status">'+rows.length.toLocaleString('en-US')+' source rows'+(dimension?' · By '+esc(dimension[1].toLowerCase()):'')+'</p><div data-inline-chart></div><div class="cd-inline-records" '+(a.mode==='records'?'':'hidden')+'><label class="ct-global-search"><input type="search" aria-label="Search inline records" placeholder="Search these records…"></label><div class="cd-records"></div></div>';
  a.terminal=!dimension;a.panel=a.host;a.query='';a.page=0;a.tableState=global.CreditTables.createState();a.source=true;a.drill=true;a.pageSize=10;
  const plot=a.host.querySelector('[data-inline-chart]'),table=a.host.querySelector('.cd-inline-records');plot.hidden=a.mode==='records';
  const showRecords=()=>{sourceTable(a);inlineExport(a);};
  const controls=a.host.querySelector('.ch-actions');controls.classList.add('cd-drill-actions');a.controls=controls;const search=table.querySelector('.ct-global-search');controls.insertBefore(search,controls.querySelector('[data-inline-method]'));search.hidden=a.mode!=='records';(a.head||a.card.querySelector('.ch-card-head,.ch-toolbar')).append(controls);a.host.querySelector('.cd-inline-toolbar').append(a.host.querySelector('.cd-inline-scope'));
  const setView=mode=>{a.mode=mode;(plot.closest('.cw-donut-layout')||plot).hidden=mode==='records';table.hidden=mode!=='records'&&!!dimension;search.hidden=mode!=='records'&&!!dimension;controls.querySelectorAll('[data-inline-mode]').forEach(b=>{const selected=b.dataset.inlineMode===mode;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});if(mode==='records'||!dimension)showRecords();else{if(!a.className.split(' ').includes('ct-table-card'))a.card.classList.remove('ct-table-card');a.chart?.reflow();inlineExport(a);}global.CreditControls?.enhance(controls);if(a.host.querySelector('.cd-inline-toolbar').getBoundingClientRect().bottom<0)a.card.scrollIntoView({block:'start',behavior:'instant'});};
  controls.querySelectorAll('[data-inline-mode]').forEach(b=>{b.onclick=()=>setView(b.dataset.inlineMode);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();setView(e.key==='Home'?'chart':e.key==='End'?'records':a.mode==='chart'?'records':'chart');controls.querySelector('[data-inline-mode="'+a.mode+'"]').focus();};});
  controls.querySelector('input').oninput=e=>{a.query=e.target.value.trim().toLowerCase();a.page=0;showRecords();};
  a.host.querySelector('[data-inline-reset]').onclick=()=>a.tableOrigin?restoreInlineFrame(a,true):clearInline(a.card,true);
  a.host.querySelectorAll('[data-inline-level]').forEach(b=>b.onclick=()=>{a.trail=a.trail.slice(0,Number(b.dataset.inlineLevel)+1);a.records=a.trail.at(-1).rows;a.mode='chart';drawInline(a);});
  a.controls.querySelector('[data-inline-method]').onclick=()=>methodology(a.id,{title:'Chart drill-down',note:a.trail.map(x=>x.label).join(' › '),explanation:['Each click narrows only the exact source cohort from the selected bar or slice. The next varying dimension is chosen in order: monitoring area, region, team, owner, product, status, relationship, facility. Group counts represent source rows, not summed exposure. Missing values remain a separate group.','The first breakdown uses bars. Deeper breakdowns with two to six mutually exclusive groups use a donut; larger breakdowns stay as bars. The chart shows ten groups plus Other groups when necessary; clicking Other continues through every remaining group. Breadcrumbs restore earlier populations; All restores the original chart. Records opens the selected source rows inside this same card, with filters, pagination and full-cohort export. Source rows can repeat a covenant across facility links; no balances are summed or inferred.']});
  const enter=g=>{if(g.rows.length>=rows.length)return;a.trail.push({label:dimension[1]+': '+g.name,rows:g.rows,dimension:g.other?null:dimension[0]});a.records=g.rows;a.mode='chart';drawInline(a);};
  if(dimension&&global.Highcharts)a.chart=drillChart(plot,rows,dimension,shown,a.trail,enter,Math.max(250,Math.min(390,a.plotHeight)));
  else if(dimension){plot.innerHTML=shown.map((g,i)=>'<button class="ch-btn" data-inline-group="'+i+'">'+esc(g.name)+' · '+g.rows.length+'</button>').join('');plot.querySelectorAll('[data-inline-group]').forEach(b=>b.onclick=()=>enter(shown[Number(b.dataset.inlineGroup)]));}
  else plot.innerHTML='<dl class="cd-explorer-context">'+drillDimensions.filter(d=>rows.some(r=>d[2](r))).map(d=>'<div><dt>'+esc(d[1])+'</dt><dd>'+esc(drillGroups(rows,d)[0]?.name||'Not supplied')+'</dd></div>').join('')+'</dl>';
  a.relatedRecords=null;
  renderRelated?.({rows,host:plot,dataHost:table,profile:!dimension,onDataset:(records,key)=>{a.relatedRecords=records;a.relatedDataset=key;a.query='';a.page=0;a.tableState=global.CreditTables.createState();search.querySelector('input').value='';setView('records');}});
  // Populate related datasets first, then render the active table exactly once.
  setView(a.mode);global.CreditUI.enhance(a.host);
 }
 function drillInPlace(id,records,selection,element){
  if(onChartDrill?.(id,records,selection,element))return;
  const el=element||$('#'+id),card=el?.closest('.ch-card');if(!card)return drill(id,records,selection);
  global.CreditUI.closePopover();clearInline();const originalHeight=card.getBoundingClientRect().height,plotHeight=el.getBoundingClientRect().height;const head=card.querySelector('.ch-card-head'),host=document.createElement('div');host.className='cd-inline-drill';
  const original=[...card.children].filter(x=>x!==head).map(x=>[x,x.hidden]);const controls=head?.querySelectorAll('.cd-chart-controls,:scope>.cw-icon-btn');controls?.forEach(control=>original.push([control,control.hidden]));original.forEach(([x])=>x.hidden=true);
  const a={id,card,element:el,host,original,originScroll:active?active.overlay.body.scrollTop:window.scrollY,className:card.className,minHeight:card.style.minHeight,plotHeight:plotHeight||320,records:records||[],trail:[{label:selection||'Selected group',rows:records||[]}],mode:'chart'};
  card.style.minHeight='0px';card.classList.add('cd-inline-active');card.append(host);inlineDrills.set(card,a);drawInline(a);a.card.scrollIntoView({block:'start',behavior:'instant'});
 }

 function closeDrill(){
  if(!drilled)return;for(const card of [...inlineDrills.keys()])if(drilled.panel.contains(card))clearInline(card);const d=drilled;drilled=null;d.explorerChart?.destroy();d.overlay?.dispose();d.panel.remove();d.hidden.forEach(([el,was])=>el.hidden=was);if(active)active.overlay.body.scrollTop=d.parentScroll;root.classList.toggle('cd-detail-active',!!active);$('.ch-skip').setAttribute('href',active?'#cd-chart-analysis':'#ch-content');
  $('#ch-download').disabled=!(active?.exportRows||root._exportRows||[]).length;$('#ch-download').title=d.downloadTitle;if(inlineFocus)inlineExport(inlineFocus);d.trigger?.focus({preventScroll:true});window.scrollTo({top:d.scroll,behavior:'instant'});
 }
 function drill(id,records,selection,title){
  closeDrill();global.CreditUI.closePopover();const m=meta(id),panel=document.createElement('section');panel.className='cd-detail-page cd-drill-page';panel.id='cd-record-drill';panel.setAttribute('aria-label','Selection explorer');
  const trigger=document.activeElement,scroll=window.scrollY,parentScroll=active?.overlay.body.scrollTop||0;const rows=records??getRows(id)??[],hidden=[...root.querySelectorAll('#cd-chart-analysis')].map(el=>[el,el.hidden]);hidden.forEach(([el])=>el.hidden=true);
  const a={id,panel,hidden,records:rows,source:true,drill:true,query:'',page:0,pageSize:10,trigger,scroll,parentScroll,downloadTitle:$('#ch-download').title,mode:'analysis',trail:[{label:selection||title||m.title||'Selected population',rows}]};drilled=a;
  panel.innerHTML='<div class="cd-detail-heading"><div><span class="cd-eyebrow">EXPLORE SELECTION</span><h2 tabindex="-1">'+esc(title||m.title)+'</h2><p data-drill-scope aria-live="polite"></p></div><div class="cd-detail-actions"><button type="button" class="ch-btn cd-back-dashboard" data-close-drill>'+backIcon+'Back to dashboard</button></div></div><div class="cd-explorer-navigation"><nav data-drill-breadcrumbs aria-label="Drill-down path"></nav><div class="pal-segments" role="tablist" aria-label="Selection view"><button type="button" role="tab" data-drill-mode="analysis" aria-controls="cd-explorer-analysis">Chart</button><button type="button" role="tab" data-drill-mode="records" aria-controls="cd-explorer-records">Data</button></div></div><div id="cd-explorer-analysis" data-drill-analysis></div><section id="cd-explorer-records" class="ch-card cd-source-card cw-framed-card"><div class="ch-toolbar"><div><h2>Supporting records</h2><p class="cd-record-note">'+esc(selection||'Selected population')+'</p></div><div class="ch-actions"><label class="cd-search-label ct-global-search"><input type="search" aria-label="Search drill-down records" placeholder="Search all records…"></label><button class="cw-icon-btn cd-section-method" data-drill-method aria-label="Methodology for drill-down records">'+infoIcon+'</button></div></div><div class="cd-records"></div></section>';
  a.overlay=global.CreditAnalysisOverlay({root,panel,title:title||m.title,onClose:backToDashboard});panel.dataset.nested=String(!!active);root.classList.add('cd-detail-active');$('.ch-skip').setAttribute('href','#cd-record-drill');panel.querySelector('[data-close-drill]').onclick=active?closeDrill:backToDashboard;if(active)panel.querySelector('[data-close-drill]').innerHTML=backIcon+'Back to analysis';panel.querySelector('input').oninput=e=>{a.query=e.target.value.trim().toLowerCase();a.page=0;sourceTable(a);};panel.querySelector('[data-drill-method]').onclick=()=>methodology(id,{title:'Drill-down records',note:selection||title||m.title,explanation:['All source records attached to the clicked bar, slice, summary count or table group, within the current filters. The table preserves supplied fields and identifiers. Records are not limited to the first page.','Dataset tabs separate selected records, same-date related monitoring and facilities, activity, available previous snapshots and source coverage. Exact keys, compatible CA identifiers and reporting dates govern linkage. Missing identifiers are never guessed. Search and column filters refine only the active dataset. Download includes every matching row across all pages. Back preserves dashboard filters.']});sourceTable(a);renderDrillAnalysis(a);panel.querySelectorAll('[data-drill-mode]').forEach(b=>{b.onclick=()=>drillMode(a,b.dataset.drillMode);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const mode=e.key==='Home'?'analysis':e.key==='End'?'records':a.mode==='analysis'?'records':'analysis';drillMode(a,mode);panel.querySelector('[data-drill-mode="'+mode+'"]').focus();};});drillMode(a,'analysis');global.CreditUI.enhance(panel);panel.querySelector('.cd-detail-heading h2').focus({preventScroll:true});
 }
 function drillMetric(key){const id='metric-'+key;if(getCustomDefinition?.(id)||metricNames[key]){openMetric(key);return;}drill(id,getRows(id)??getRows(key)??[],null,key);}

 function open(id,selectedRows,selection){
  if(onExpand?.(id,selectedRows,selection))return;
  clearInline();
  if(active?.id===id){active.records=selectedRows||active.allRecords||getRows(id)||values(id);active.source=!!(selectedRows||getRows(id));active.selection=selection||'';active.query='';active.tableState=global.CreditTables.createState();active.page=0;active.panel.querySelector('.cd-search-label input').value='';active.panel.querySelectorAll('[data-source-filter]').forEach(b=>b.setAttribute('aria-pressed','false'));active.panel.querySelector('.cd-record-note').textContent=selection?'Selected point: '+selection:'All supporting records for this chart';sourceTable();active.selectTableView?.('records');return;}
  if(active)restore();const m=meta(id);if(!m.card)return;global.CreditUI.closePopover();
  const chart=chartFor(id),placeholder=document.createComment('Chart position'),panel=document.createElement('section');panel.className='cd-detail-page';panel.id='cd-chart-analysis';panel.setAttribute('aria-label',m.title+' expanded analysis');m.card.before(placeholder);
  const hidden=[];
  panel.innerHTML='<div class="cd-detail-heading"><div><span class="cd-eyebrow">EXPANDED CHART</span><h2 tabindex="-1">'+esc(m.title)+'</h2><p>Current filters and chart controls are retained.</p></div><button type="button" class="ch-btn cd-back-dashboard" data-close-chart>'+backIcon+'Back to dashboard</button></div><div class="cd-analysis-kpis"></div><div class="cd-chart-slot"></div><div class="cd-analysis-grid"></div><section class="ch-card cd-source-card"><div class="ch-toolbar"><div><h2>'+(getRows(id)?'Supporting records':'Chart values')+'</h2><p class="cd-record-note">'+esc(selection?'Selected point: '+selection:'All supporting records for this chart')+'</p></div><div class="ch-actions"><button class="cw-icon-btn cd-section-method" data-source-method aria-label="Methodology for supporting records">'+infoIcon+'</button></div></div><div class="cd-record-toolbar"><div class="cd-source-filters pal-segments" role="group" aria-label="Supporting record category"></div><label class="cd-search-label ct-global-search"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg><input type="search" aria-label="Search expanded chart data" placeholder="Search records…"></label></div><div class="cd-records"></div></section>';
  panel.querySelector('.cd-chart-slot').append(m.card);m.card.classList.add('cd-expanded-card');root.classList.add('cd-detail-active');$('.ch-skip').setAttribute('href','#cd-chart-analysis');
  active={id,card:m.card,placeholder,panel,hidden,height:chart?.chartHeight,elementHeight:chart?.renderTo.style.height,scroll:window.scrollY,trigger:m.card.querySelector('[data-chart-expand]'),records:selectedRows||getRows(id)||values(id),source:!!(selectedRows||getRows(id)),selection:selection||'',query:'',page:0};
  active.overlay=global.CreditAnalysisOverlay({root,panel,title:m.title,onClose:backToDashboard});
  panel.querySelector('[data-source-method]').onclick=()=>methodology(id,{title:'Supporting records',note:panel.querySelector('.cd-record-note').textContent,explanation:['Original source records behind the selected chart or clicked point. Search checks all supplied fields; tables default to 10 rows per page, with 25 and 50 also available. Download includes every matching row across all pages, not just the visible page.','Show all chart data resets point selection to the analysis population. Source-cohort buttons select the named subset. Dates and identifiers remain those of the underlying records; numeric formatting does not change exported values.']});
  panel.querySelector('[data-close-chart]').onclick=()=>restore();panel.querySelector('.cd-search-label input').oninput=e=>{active.query=e.target.value.trim().toLowerCase();active.page=0;sourceTable();};renderAnalysis();alignExpandedSummary(active);global.CreditTables.enhanceStatic(panel);sourceTable();tableViews(active);
  if(chart){const height=320;chart.renderTo.style.height=height+'px';chart.setSize(null,height,false);}
  global.CreditControls?.tableToolbar(panel);global.CreditControls?.enhance(panel);panel.querySelector('.cd-detail-heading h2').focus({preventScroll:true});
 }
 function openMetric(key){
  if(onExpand?.('metric-'+key,getRows('metric-'+key)||getRows(key),metricNames[key]))return;
  const custom=getCustomDefinition?.('metric-'+key);if(!metricNames[key]&&!custom)return;const id='metric-'+key;if(active?.id===id){open(id);return;}if(active)restore();
  const card=document.createElement('section');card.className='ch-card';card.id=id;card.innerHTML='<div class="ch-card-head"><h2>'+esc(custom?.title||metricNames[key])+'</h2></div>';$('#ch-content').append(card);open(id);active.synthetic=true;active.trigger=root.querySelector('[data-pal-rows="'+key+'"]');active.panel.classList.add('cd-metric-page');
 }
 function apply(targets){
  if(!targets)addKpiMethods();
  root.querySelectorAll('#ch-content .ch-chart[id],#ch-content #pal-pipeline,#ch-content [data-expandable-table]').forEach(el=>{
   const card=el.closest('.ch-card'),head=card?.querySelector('.ch-card-head');if(!head)return;const id=el.id;if(targets&&!targets.has(id))return;
   head.querySelector('[data-pal-detail]')?.remove();
   head.querySelector('[data-cov-method],[data-monitor-method]')?.remove();
   const controls=head.querySelector('.cd-chart-controls')||document.createElement('div');controls.className='cd-chart-controls';controls.querySelectorAll('[data-chart-method],[data-chart-expand]').forEach(b=>b.remove());
   card.querySelectorAll(':scope > .pal-select,:scope > .pal-segments,.cw-ranking-controls .pal-select').forEach(label=>controls.append(label));
   card.querySelector('.cw-ranking-controls')?.remove();
   controls.insertAdjacentHTML('beforeend','<button class="cw-icon-btn" data-chart-method="'+id+'" title="Methodology" aria-label="Methodology for '+esc(meta(id).title)+'">'+infoIcon+'</button><button class="cw-icon-btn" data-chart-expand="'+id+'" title="Expand chart" aria-label="Expand '+esc(meta(id).title)+'">'+expandIcon+'</button>');
   const more=head.querySelector('.cw-widget-menu');if(more)controls.append(more);head.append(controls);
   controls.querySelector('[data-chart-method]').onclick=()=>methodology(id);controls.querySelector('[data-chart-expand]').onclick=()=>open(id);
  });
  root.querySelectorAll('#ch-content .ch-card').forEach((card,index)=>{
   if(!card.querySelector('table')||card.querySelector('[data-chart-method],[data-cov-method],[data-monitor-method],.cd-section-method'))return;
   const head=card.querySelector('.ch-card-head,.ch-toolbar');if(!head)return;
   const id=card.id||(card.id='cd-table-'+index),title=card.querySelector('h2')?.textContent||'Data table';
   const button=document.createElement('button');button.className='cw-icon-btn cd-section-method';button.setAttribute('aria-label','Methodology for '+title);button.innerHTML=infoIcon;head.append(button);
   button.onclick=()=>methodology(id,(getCustomMethod?.(id)||methods[id])?null:{title,note:card.querySelector('.ch-card-sub')?.textContent||title,explanation:[title.includes('Spread')?'Group eligible SBL facilities with positive Direct OS by region and prepared spread bucket. Count facilities or sum Direct OS as indicated; mean spread is the sum of spread weights divided by supplied spread OS.':title.includes('Trend')?'Sum the selected exposure by product and snapshot. Variances compare the latest snapshot with the corresponding available prior month, quarter or year; absent comparable snapshots show unavailable.':'Display the supplied records or grouped values described by the column headers within the current dashboard filters. Counts represent records unless a column explicitly identifies distinct relationships or facilities.','Column headings define units. Search and page filters restrict the visible population; pagination changes only which rows are displayed. Missing values remain unavailable.']});
  });
  if(resumeId){const id=resumeId;resumeId=null;if(id.startsWith('metric-'))openMetric(id.slice(7));else open(id);}
 }
 return {apply,open,openMetric,drill,drillInPlace,drillTable,clearTableDrills,tableExportRows:()=>inlineFocus?.tableOrigin&&inlineFocus.host.isConnected?(inlineFocus.mode==='records'||inlineFocus.terminal?inlineFocus.exportRows:inlineFocus.records):null,drillMetric,methodology,beforeRender(){clearInline();if(drawer)drawer.close();closeDrill();restore(true);},exportRows:()=>inlineFocus?.tableOrigin&&inlineFocus.host.isConnected?(inlineFocus.mode==='records'||inlineFocus.terminal?inlineFocus.exportRows:inlineFocus.records):drilled?drilled.exportRows:inlineFocus?.host.isConnected?(inlineFocus.mode==='records'||inlineFocus.terminal?inlineFocus.exportRows:inlineFocus.records):active?active.exportRows:null,close(){clearInline();closeDrill();restore();}};
};
})(window);

;
/* Portfolio interaction contracts. Overview scope, local drill and analysis are separate. */
(function(global){'use strict';
const present=v=>v!==null&&v!==undefined&&v!=='';
const identity=r=>['region','relationship_id','facility_id'].every(k=>present(r[k]))?JSON.stringify([r.region,r.relationship_id,r.facility_id]):null;
const distinct=(rows,key)=>new Set(rows.map(r=>typeof key==='function'?key(r):r[key]).filter(present)).size;
const amounts=new Set(['tfa','osuc','total_os','direct_os','unused_commitment','unused_uncommitted','contingent_os','pse_os']);
const titles={creditClassificationChart:'New Facilities Approved',newDealsChart:'New deals','pal-pipeline':'Deals Pending Closure',facilityTrendChart:'CAs & Facilities Expiring',relationshipChart:'Relationship performance',monitoringPriorityChart:'Monitoring priorities',covenantMonitoringChart:'Covenants',ccmRegionalChart:'CCM',sblSpreadOS:'SBL spread · Direct OS',sblSpreadCount:'SBL spread · Facilities',facilities:'Facilities',relationships:'Relationships',caexpired:'Relationships with expired CAs',expired:'Expired facilities',tfa:'Total facility amount',total_os:'Outstanding',unused_commitment:'Unused commitment',unused_uncommitted:'Unused uncommitted'};
const domains={COVENANTS:'Covenants',CCM:'CCM',FACILITY:'Facility monitoring',CA:'CA expiration',INSURANCE:'Insurance',APPRAISALS:'Appraisals'};
const labels={ca_id:'CA number',team_lead:'Team lead',owner_role:'Owner role',ca_expiration_date:'CA expiration',facility_first_approval_date:'First approval',origination_date:'Origination',renewal_date:'Renewal',maturity_date:'Facility maturity',effective_due_date:'Effective due date',due_date:'Due date',days_past_due:'Days past due',aging_bucket:'Aging band',pal_ca_month:'CA expiry month',pal_facility_month:'Facility maturity month',pal_pipeline_bucket:'Days since approval',analysis_date:'Approval month',analysis_aging:'Aging band',analysis_maturity_age:'Days since maturity',region:'Region',product:'Product',owner_id:'Underwriter / specialist',relationship_id:'Relationship',facility_id:'Facility',category:'Monitoring area',status:'Status',as_of_date:'Source date',tfa:'TFA (USD)',osuc:'OSUC (USD)',total_os:'Outstanding (USD)',direct_os:'Direct OS (USD)',banker_name:'Banker',owner_name:'Underwriter / specialist',relationship_name:'Relationship name',covenant_id:'Covenant number',ccm_status:'CCM status',source_aging_bucket:'Aging band',item_id:'Association / record ID',match_status:'Facility match',tfa_usd:'Linked TFA (USD)',osuc_usd:'Linked OSUC (USD)'};
function contract(id,rows,selection='',settings={}){
 id=id.replace(/^metric-/,'');if(id==='pipeline'||id.startsWith('pipe'))id='pal-pipeline';
 const monitoring=rows.some(r=>r.item_id),history=id==='pal-trends'||id==='palTrendChart';
 let unit=monitoring?'Source associations / records':'Facilities',measure='facilities',path=['region','relationship_id','facility_id'];
 if(monitoring){unit=rows.every(r=>r.category==='COVENANTS')?'Covenant associations':rows.every(r=>r.category==='CCM')?'CCM records':'Monitoring records';measure='records';path=id==='monitoringPriorityChart'?['category','region','owner_id','relationship_id']:id==='ccmRegionalChart'?['owner_id','relationship_id']:['region','relationship_id'];}
 if(amounts.has(id)){measure=id;unit=titles[id]||id;path=['product','region','relationship_id','facility_id'];}
 if(id==='relationshipChart'){measure=settings.measure||'direct_os';unit='Selected exposure';path=['relationship_id','facility_id'];}
 if(id==='sblSpreadOS'){measure='direct_os';unit='Direct OS';path=['relationship_id','facility_id'];}
 if(id==='sblSpreadMean'){measure='spread';unit='Weighted spread · bps';path=['relationship_id','facility_id'];}
 if(id==='sblSpreadCount')path=['relationship_id','facility_id'];
 if(id==='pal-pipeline'){path=['product','relationship_id','facility_id'];if(/(?:^| · )TFA$/.test(selection)){measure='tfa';unit='Pending TFA';}}
 if(id==='caexpired'||id==='relationships'||id==='facilityTrendChart'&&/CAs|CA relationships/i.test(selection)){measure='relationships';unit='Distinct relationships';}
 if(history){measure=settings.trend||'osuc';unit='Snapshot balance';path=['as_of_date','product','region'];}
 if(id==='covenantMonitoringChart'&&!selection)path=['analysis_aging','region','relationship_id'];
 if(id==='ccmRegionalChart'&&!selection)path=['region','ccm_status','owner_id','relationship_id'];
 if(id==='expired')path=['analysis_maturity_age','region','relationship_id','facility_id'];
 const title=history?'Portfolio trends':id==='covenantMonitoringChart'?(settings.covenants==='coming'?'Coming Due Covenants':'Past Due Covenants'):titles[id]||selection||'Selected population';
 const period=id==='creditClassificationChart'?settings.approvalPeriod:id==='newDealsChart'?settings.dealPeriod:id==='pal-pipeline'?settings.pendingPeriod:null;
 return {id,title,measure,unit,path,monitoring,history,context:period?'Period: '+period.toUpperCase():id==='relationshipChart'?'Rank measure: '+(settings.measure||'direct_os')+' · Top '+(settings.top||10):''};
}
function value(rows,c){
 if(c.measure==='records')return rows.length;
 if(c.measure==='rotce'){const vs=[...new Set(rows.map(r=>r.rotce).filter(Number.isFinite))];return distinct(rows,'relationship_id')===1&&distinct(rows,'rotce_period')===1&&vs.length===1?vs[0]:null;}
 if(c.measure==='spread'){const known=rows.filter(r=>Number.isFinite(r.pal_spread_weight)&&r.pal_spread_os>0),den=known.reduce((n,r)=>n+r.pal_spread_os,0);return den?known.reduce((n,r)=>n+r.pal_spread_weight,0)/den:null;}
 if(c.measure==='relationships')return distinct(rows,'relationship_id');
 if(c.measure==='facilities')return distinct(rows,identity);
 // A partial or multi-date balance must not masquerade as a complete amount.
 if(distinct(rows,'as_of_date')>1)return null;
 const unique=c.history?rows:[...new Map(rows.map(r=>[r.facility_key||identity(r),r])).values()];
 return unique.every(r=>Number.isFinite(r[c.measure]))?unique.reduce((n,r)=>n+r[c.measure],0):null;
}
function groups(rows,key,c){const map=new Map();for(const r of rows){const raw=key==='analysis_aging'?global.CreditCovenantAging?.bucket(r,r.status==='PAST_DUE'):key==='analysis_maturity_age'?global.CreditCovenantAging?.bucket({days_past_due:Math.round((Date.parse(r.as_of_date)-Date.parse(r.maturity_date))/86400000)},true):r[key];const k=present(raw)?String(raw):'__missing__';if(!map.has(k))map.set(k,[]);map.get(k).push(r);}return [...map].map(([keyValue,rs])=>({key:keyValue,name:keyValue==='__missing__'?'Not supplied':key==='relationship_id'?[keyValue,rs[0].relationship_name].filter(present).join(' — '):key==='owner_id'?(rs[0].owner_name||keyValue):domains[keyValue]||keyValue,rows:rs,y:value(rs,c)}));}
// A donut is a part-to-whole view, not a decorative substitute for a ranking.
// The first local breakdown stays a bar. Later levels use a donut only when
// all 2–6 categories reconcile to the same positive, additive parent measure.
function drillChartType({groups,total,measure='records',depth=0,ordered=false,requested='auto'}){
 if(requested==='line')return 'line';
 if(ordered||requested!=='pie'&&depth<1||!['records','facilities','relationships',...amounts].includes(measure))return 'bar';
 if(groups.length<2||groups.length>6||groups.some(g=>g.other||!Number.isFinite(g.y)||g.y<0)||!Number.isFinite(total)||total<=0)return 'bar';
 const sum=groups.reduce((n,g)=>n+g.y,0),tolerance=Math.max(1,Math.abs(total))*1e-9;
 return Math.abs(sum-total)<=tolerance?'pie':'bar';
}
function links(rows,portfolio){
 const index=new Map();for(const p of portfolio){const key=identity(p);if(!key)continue;if(!index.has(key))index.set(key,new Map());const dates=index.get(key);if(!dates.has(p.as_of_date))dates.set(p.as_of_date,[]);dates.get(p.as_of_date).push(p);}
 const datesByKey=new Map(),casByKey=new Map();for(const r of rows){const key=identity(r);if(!datesByKey.has(key)){datesByKey.set(key,new Set());casByKey.set(key,new Set());}datesByKey.get(key).add(r.as_of_date);if(r.ca_id)casByKey.get(key).add(r.ca_id);}
 const facilities=new Map();const records=rows.map(r=>{const key=identity(r),same=/^\d{4}-\d{2}-\d{2}$/.test(r.as_of_date||'')?(index.get(key)?.get(r.as_of_date)||[]):[];let reason=!key?'Missing facility key':datesByKey.get(key).size>1?'Mixed source dates':casByKey.get(key).size>1?'Conflicting CA identifiers':!same.length?'No same-date portfolio match':same.length>1?'Ambiguous portfolio match':r.ca_id&&same[0].ca_id&&r.ca_id!==same[0].ca_id?'CA identifier mismatch':same[0].reporting_currency!=='USD'?'Non-USD exposure':'Matched';const p=reason==='Matched'?same[0]:null;if(p)facilities.set(key,p);return {...r,match_status:reason,tfa_usd:Number.isFinite(p?.tfa)?p.tfa:null,osuc_usd:Number.isFinite(p?.osuc)?p.osuc:null};});
 return {records,facilities:[...facilities.values()],matched:records.filter(r=>r.match_status==='Matched').length,total:records.length};
}
// Related datasets preserve their own grain and never broaden the selected facility cohort.
const datasetLabels={records:'Selected records',facilities:'Facilities',activity:'Activity events',previous_facilities:'Previous facilities',previous_monitoring:'Previous monitoring',previous_activity:'Previous activity',covenant_history:'Covenant history',documents:'Linked documents',sources:'Source coverage',...domains};
function detailScope(rows,portfolio,monitoring,extra={}){
 const candidates=[...portfolio,...(extra.previous?.portfolio||[])],linked=links(rows,candidates),identities=new WeakMap(),datedKeys=new WeakMap();
 const entityKey=r=>{if(!identities.has(r))identities.set(r,identity(r));return identities.get(r);},dateKey=r=>{if(!datedKeys.has(r))datedKeys.set(r,JSON.stringify([entityKey(r),r.as_of_date]));return datedKeys.get(r);},covenantKey=r=>JSON.stringify([r.region,r.relationship_id,r.covenant_id,r.as_of_date]),associationKey=r=>JSON.stringify([r.region,r.relationship_id,r.covenant_id,typeof r.as_of_date,r.as_of_date]);
 const associations=new Map();for(const [index,r] of monitoring.entries()){if(!r.covenant_id||!r.relationship_id||!r.region)continue;const key=associationKey(r);if(!associations.has(key))associations.set(key,{all:[],valid:[],byCA:new Map(),missing:[],usedCA:new Set(),usedMissing:false,usedAll:false});const group=associations.get(key);group.all.push(r);if(!entityKey(r))continue;const entry={row:r,index};group.valid.push(entry);if(!r.ca_id)group.missing.push(entry);else{if(!group.byCA.has(r.ca_id))group.byCA.set(r.ca_id,[]);group.byCA.get(r.ca_id).push(entry);}}
 // An event can refer to a covenant rather than a facility. Follow only published
 // covenant associations with all remaining identity fields and date intact.
 // Consume each association at most once, in first-match source order. Repeated
 // events must not turn one covenant's facility associations into a quadratic join.
 const associationSeeds=[],seenAssociations=new Set();const addAssociation=entry=>{if(!seenAssociations.has(entry.row)){seenAssociations.add(entry.row);associationSeeds.push(entry.row);}};
 for(const r of rows){if(r.facility_id||!r.covenant_id||!r.relationship_id||!r.region||!/^\d{4}-\d{2}-\d{2}$/.test(r.as_of_date||''))continue;const group=associations.get(associationKey(r));if(!group||group.usedAll)continue;if(!r.ca_id){group.valid.forEach(addAssociation);group.usedAll=true;continue;}if(group.usedCA.has(r.ca_id))continue;group.usedCA.add(r.ca_id);const matching=group.byCA.get(r.ca_id)||[],missing=group.usedMissing?[]:group.missing;group.usedMissing=true;let i=0,j=0;while(i<matching.length||j<missing.length)addAssociation(j>=missing.length||i<matching.length&&matching[i].index<missing[j].index?matching[i++]:missing[j++]);}
 const seeds=[...rows.filter(r=>entityKey(r)),...associationSeeds];
 if(associationSeeds.length)linked.facilities=links(seeds,candidates).facilities;
 // Valid portfolio matches enrich the selected entities, but monitoring does not depend
 // on the availability of a balance extract. Conflicting CA IDs are always rejected.
 const cas=new Map(),entityCas=new Map();for(const r of seeds){const k=dateKey(r),entity=entityKey(r);if(!cas.has(k))cas.set(k,new Set());if(r.ca_id)cas.get(k).add(r.ca_id);if(!entityCas.has(entity))entityCas.set(entity,new Set());entityCas.get(entity).add(r.ca_id||null);}
 const exact=r=>{const ids=cas.get(dateKey(r));return /^\d{4}-\d{2}-\d{2}$/.test(r.as_of_date||'')&&ids&&ids.size<=1&&(!r.ca_id||!ids.size||ids.has(r.ca_id));};
 const related=monitoring.filter(exact),datasets={records:rows,facilities:linked.facilities};
 for(const category of Object.keys(domains)){const records=related.filter(r=>r.category===category);if(records.length)datasets[category]=records;}
 // A missing facility key may link an event only through a unique, explicit
 // covenant + relationship + region association. Never broaden by name or owner.
 const covKeys=new Set([...rows,...related].filter(r=>r.covenant_id&&r.relationship_id&&r.region).map(covenantKey)),eventCoverage=new Map();
 const eventMatch=r=>{if(entityKey(r))return exact(r);if(!r.covenant_id||!r.relationship_id||!r.region||!covKeys.has(covenantKey(r)))return false;const key=associationKey(r);if(!eventCoverage.has(key))eventCoverage.set(key,(associations.get(key)?.all||[]).every(exact));return eventCoverage.get(key);};
 const events=(extra.activity||[]).filter(eventMatch);if(events.length)datasets.activity=events;
 const currentDates=new Set(rows.map(r=>r.as_of_date).filter(Boolean)),cutoff=[...currentDates].sort()[0];
 const priorMatch=r=>{const ids=entityCas.get(entityKey(r));return ids&&/^\d{4}-\d{2}-\d{2}$/.test(r.as_of_date||'')&&r.as_of_date<cutoff&&(!r.ca_id||ids.has(null)||ids.has(r.ca_id));};
 for(const [key,name] of [['portfolio','previous_facilities'],['monitoring','previous_monitoring'],['activity','previous_activity']]){const rs=(extra.previous?.[key]||[]).filter(priorMatch);if(rs.length)datasets[name]=rs;}
 const history=(extra.covenantHistory||[]).filter(priorMatch);if(history.length)datasets.covenant_history=history;
 const docs=(extra.documents||[]).filter(exact);if(docs.length)datasets.documents=docs;
 const sourceIds=new Set(Object.values(datasets).flat().map(r=>r.source_id).filter(Boolean));
 const coverage=[...(extra.sources||[]),...(extra.previous?.sources||[])].filter(r=>sourceIds.has(r.source_id)).map(r=>({...r,context:'Published source control; not a filtered population count'}));
 for(const [name,error] of Object.entries(extra.errors||{}))coverage.push({source_name:datasetLabels[name]||name,coverage:'UNAVAILABLE',quality_note:error});
 if((extra.history||[]).length&&!extra.history.some(identity))coverage.push({source_name:'Portfolio history',coverage:'AGGREGATE_ONLY',quality_note:'Product/region snapshots have no facility identifiers; they cannot be attributed to this entity.'});
 if(coverage.length)datasets.sources=coverage;
 return {linked,datasets,related};
}
global.CreditPortfolioJourneyModel={contract,value,groups,links,identity,detailScope,drillChartType};
global.CreditPortfolioJourney=function({root,esc,getRows,getData,getScope,getSettings,methodology,getCharts}){
 const $=s=>root.querySelector(s),stack=[],inline=new Map();let sequence=0,inlineFocus=null;
 const info=()=>global.CreditIcons.icon('info');
 const format=(v,c)=>v===null?'Unavailable':c.measure==='rotce'?(v*100).toFixed(1)+'%':c.measure==='spread'?v.toFixed(1)+' bps':amounts.has(c.measure)?'$'+(v/1e6).toLocaleString('en-US',{maximumFractionDigits:2})+'m':Number(v).toLocaleString('en-US');
 const number=v=>Number(v).toLocaleString('en-US');
 const textValue=(key,v)=>!present(v)?'Not supplied':typeof v==='boolean'?(v?'Yes':'No'):typeof v==='number'?key==='rotce'?(v*100).toFixed(1)+'%':v.toLocaleString('en-US',{maximumFractionDigits:2}):String(v);
 const methodButton='<button type="button" class="cw-icon-btn cd-section-method" data-pj-method aria-label="Methodology">'+info()+'</button>';
 function explain(a){methodology(a.c.id,{title:a.title||a.c.title,note:a.trail.map(x=>x.label).join(' › '),explanation:[a.c.unit+': '+(a.c.measure==='rotce'?'use the supplied consistent relationship ROTCE for its explicit source period; never sum or average facility ratios.':a.c.measure==='spread'?'sum of supplied spread × Direct OS weights divided by the supplied eligible Direct OS denominator. This is a weighted ratio, not an additive total.':amounts.has(a.c.measure)?'sum the selected prepared USD balance once per facility snapshot. Missing values and mixed reporting dates are unavailable.':a.c.measure==='relationships'?'count distinct non-empty relationship IDs. A relationship can occur in several groups; grouped counts are not additive.':a.c.measure==='facilities'?'count distinct region + relationship ID + facility ID keys.':'count supplied source associations / records. A covenant number can repeat across facility links; this is not a unique covenant count.'),'Only this chart or analysis is narrowed. Page filters remain unchanged. Facility attributes do not filter monitoring cards. Linked exposure requires exact identifiers, one same-date USD portfolio match and consistent CA IDs. Related monitoring retains each source status and reporting date. Events without a facility ID can follow published covenant + relationship + region + date associations; unrelated facilities are never inferred from a name. Table filters affect only Data and its export. Source fields omitted by ETL cannot be reconstructed.','Linked monitoring uses exact same-date facility keys across all supplied statuses; this is a broader status scope than a selected aging band. No linked records does not establish absence of exceptions. Narrowed-selection comparisons are unavailable unless a comparable source population is supplied.','Source coverage: '+(getData().sources||[]).filter(r=>Object.hasOwn(domains,r.domain)).map(r=>domains[r.domain]+' '+r.as_of_date+' ('+r.coverage+')').join(' · ')]});}
 function next(a){for(const key of a.c.path){if(a.used.includes(key))continue;const gs=groups(a.rows,key,a.c);if(gs.length>1)return {key,groups:gs};}return null;}
 function navigation(a,host){host.innerHTML='<nav aria-label="Local analysis path">'+(a.inline||a.trail.length>1?'<button type="button" data-pj-reset>'+ (a.inline?'All':'Reset selection')+'</button>':'')+a.trail.map((t,i)=>(i||a.inline||a.trail.length>1?'<span aria-hidden="true">›</span>':'')+'<button type="button" data-pj-level="'+i+'" '+(i===a.trail.length-1?'aria-current="step" disabled':'')+' title="'+esc(t.label)+'">'+esc(a.inline?t.label.replace(/^(Region|Relationship|Facility|Product|Underwriter \/ specialist): /,'').split(' — ')[0]:t.label)+'</button>').join('')+'</nav>';const reset=host.querySelector('[data-pj-reset]');if(reset)reset.onclick=()=>a.inline?clearInline(a.card,true):restoreFrame(a,0);host.querySelectorAll('[data-pj-level]').forEach(b=>b.onclick=()=>restoreFrame(a,Number(b.dataset.pjLevel)));}
 function restoreFrame(a,i){a.trail=a.trail.slice(0,i+1);const t=a.trail.at(-1);a.rows=t.rows;a.used=t.used.slice();a.c=t.c||a.c;a.tableStates={};a.mode='charts';a.inline?drawInline(a):drawWorkspace(a);}
 function enter(a,g,key){if(g.rows.length===a.rows.length&&a.used.includes(key)&&!g.other)return;a.used=g.other?a.used:[...a.used,key];a.rows=g.rows;a.trail.push({label:(labels[key]||key)+': '+g.name,rows:g.rows,used:a.used.slice(),c:a.c});a.tableStates={};a.mode='charts';a.inline?drawInline(a):drawWorkspace(a);const focus=a.inline?a.host:a.panel.querySelector('h2');focus.tabIndex=-1;focus.focus({preventScroll:true});}
 function plot(host,rows,c,key,onSelect,owner,kind='auto'){
 const chronological=['as_of_date','pal_ca_month','pal_facility_month','analysis_date'].includes(key),aging=key==='analysis_aging'||key==='analysis_maturity_age'||key==='pal_pipeline_bucket';let gs=groups(rows,key,c).sort((a,b)=>chronological?a.name.localeCompare(b.name):aging?(parseInt(a.name.replace('>',''))||999)-(parseInt(b.name.replace('>',''))||999):(b.y??-Infinity)-(a.y??-Infinity)||a.name.localeCompare(b.name));if(gs.length>20){const rest=gs.slice(20).flatMap(g=>g.rows);gs=[...gs.slice(0,20),{name:'Other groups ('+(gs.length-20)+')',rows:rest,y:value(rest,c),other:true}];}
 // Bound rendering cost; Other retains every remaining record and the same drill dimension.
 host.classList.add('pj-plot');host.style.height=320+'px';
 if(!gs.length){host.innerHTML='<p class="ch-empty">No records in this selection.</p>';return;}
 if(!global.Highcharts){host.innerHTML=gs.map((g,i)=>'<button type="button" class="ch-btn" data-pj-group="'+i+'">'+esc(g.name)+' · '+esc(format(g.y,c))+'</button>').join('');host.querySelectorAll('[data-pj-group]').forEach(b=>b.onclick=()=>onSelect(gs[+b.dataset.pjGroup]));return;}
 const type=drillChartType({groups:gs,total:value(rows,c),measure:c.measure,depth:owner.trail.length-1,ordered:chronological||aging,requested:owner.inline?'auto':owner.trail.length>1&&kind!=='line'?'auto':kind}),pie=type==='pie';host.dataset.drillChartType=pie?'donut':type;
 const chart=global.Highcharts.chart(host,{chart:{type,height:parseInt(host.style.height),backgroundColor:'transparent',animation:{duration:160},scrollablePlotArea:gs.length>10?{minHeight:gs.length*30+80}:undefined,style:{fontFamily:getComputedStyle(root).fontFamily}},title:{text:null},credits:{enabled:false},legend:{enabled:false},accessibility:{description:c.unit+' by '+(labels[key]||key)+'. Select a segment to inspect this group.'},xAxis:{categories:gs.map(g=>g.name),tickLength:0,labels:{style:{width:'150px',textOverflow:'ellipsis',fontSize:'11px'}}},yAxis:{title:{text:c.unit+(amounts.has(c.measure)?' · USD':'')},allowDecimals:amounts.has(c.measure),gridLineDashStyle:'Dash'},tooltip:{pointFormatter:function(){return esc(this.name)+': <b>'+esc(format(this.y,c))+'</b>';}},plotOptions:{pie:{innerSize:'68%',dataLabels:{enabled:false},borderWidth:3,borderColor:'#fff'},series:{animation:{duration:160},borderWidth:0,maxPointWidth:22,cursor:'pointer',point:{events:{click:function(){onSelect(this.options.custom.group);}}}}},colors:['#255BE3','#73bfff','#00af75','#8a329e','#ffbf00','#dc7052'],series:[{name:c.unit,color:pie?undefined:'#255BE3',colorByPoint:pie,data:gs.map(g=>({name:g.name,y:g.y,custom:{group:g,rows:g.rows}}))}]});owner.charts.push(chart);const missing=gs.filter(g=>g.y===null);if(missing.length){const actions=document.createElement('div');actions.className='pj-unavailable-groups';host.after(actions);for(const g of missing){const b=document.createElement('button');b.type='button';b.className='ch-btn';b.textContent='Inspect '+g.name+' · amount unavailable';b.onclick=()=>onSelect(g);actions.append(b);}}if(pie)global.CreditDonut?.(chart,{esc,format:v=>format(v,c),label:c.unit,onSelect:p=>onSelect(p.custom.group)});
 }
 function clearInline(card,restorePosition=false){const list=card?[inline.get(card)].filter(Boolean):[...inline.values()];for(const a of list){root.dispatchEvent(new CustomEvent('credit:table-reset',{detail:{panel:a.card}}));a.charts.forEach(c=>c.destroy());a.host.remove();a.controls?.remove();a.hidden.forEach(([el,hidden])=>el.hidden=hidden);a.card.style.minHeight=a.minHeight;a.card.className=a.className;inline.delete(a.card);if(inlineFocus===a)inlineFocus=null;getCharts().find(c=>c.renderTo===a.element)?.reflow();if(restorePosition){a.card.querySelector('[data-chart-expand]')?.focus({preventScroll:true});global.scrollTo({top:a.originScroll,behavior:'instant'});}}syncExport();}
 function inlineTable(a){const records=a.leaf?.datasets[a.dataset]||a.rows,state=a.tableState??=global.CreditTables.createState(),keys=[...new Set(['relationship_id','relationship_name','facility_id','region','product','owner_name','banker_name','tfa','osuc','status','as_of_date',...records.flatMap(Object.keys)])].filter(k=>records.some(r=>Object.hasOwn(r,k))).filter(k=>!k.startsWith('pal_')&&k!=='demo_scenario'),columns=keys.map(key=>({key,label:labels[key]||key.replaceAll('_',' '),format:v=>textValue(key,v)})),rows=global.CreditTables.select(records,columns,state);a.exportRows=rows;state.page=Math.min(state.page,Math.max(0,Math.ceil(rows.length/state.pageSize)-1));const area=a.host.querySelector('.cd-records'),shown=rows.slice(state.page*state.pageSize,(state.page+1)*state.pageSize);
 area.innerHTML='<div class="credit-data-table-scroll"><table class="credit-data-table"><thead></thead><tbody>'+shown.map(r=>'<tr>'+keys.map(k=>'<td>'+esc(textValue(k,r[k]))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
 global.CreditTables.bindRows({table:area.querySelector('table'),rows:shown});
 global.CreditTables.decorate({table:area.querySelector('table'),rows:records,columns,state,onChange:()=>{state.page=0;inlineTable(a);},matched:rows.length,local:true});global.CreditTables.pagination({host:area,total:rows.length,page:state.page,pageSize:state.pageSize,onChange:(page,size)=>{state.page=page;state.pageSize=size;inlineTable(a);}});syncExport();}
 // Summary rows keep the exact dataset array used by the supporting table.
 function bindDatasetRows(table,datasets,select){
  const rows=Object.entries(datasets).map(([key,records])=>({key,records})),keys=new Map(rows.map(r=>[r.records,r.key]));
  global.CreditTables.bindRows({table,rows,resolve:r=>r.records,label:r=>domains[r.key]||datasetLabels[r.key]||r.key,onSelect:records=>select(keys.get(records))});
 }
 function renderLeaf(a,host,dataHost=a.host.querySelector('[data-pj-inline-data]'),profile=true){
 const scope=getScope(),data=getData();a.leaf=detailScope(a.rows,data.portfolio||[],scope.monitoring||[],{activity:scope.activity||[],previous:scope.previous||{},covenantHistory:scope.covenantHistory||[],sources:data.sources,documents:scope.documents,history:data.history,errors:data.relatedSourceErrors});
 const facilities=a.leaf.linked.facilities,records=[...a.rows,...facilities],label=k=>labels[k]||k.replaceAll('_',' ').replace(/\b[a-z]/g,c=>c.toUpperCase());
 const fields=keys=>'<dl class="pj-inline-facts">'+keys.filter(k=>records.some(r=>present(r[k]))).map(k=>{const vs=[...new Set(records.map(r=>r[k]).filter(present))];return '<div><dt>'+esc(label(k))+'</dt><dd>'+esc(vs.map(v=>textValue(k,v)).join(' · '))+'</dd></div>';}).join('')+'</dl>';
 const section=(title,html)=>'<section class="pj-leaf-section"><h3>'+esc(title)+'</h3>'+html+'</section>';
 const rels=[...new Set(a.rows.map(r=>r.relationship_id).filter(present))],ids=[...new Set(a.rows.map(r=>r.facility_id).filter(present))];
 const heading=ids.length===1?'Facility '+ids[0]:rels.length===1?'Relationship '+rels[0]:'Selected records';
 let html='<div class="pj-leaf"><h2 class="pj-leaf-heading">'+esc(heading)+'</h2>'+section('Relationship & ownership',fields(['relationship_id','relationship_name','facility_id','ca_id','region','product','banker_name','owner_name','team_lead','owner_role']));
 if(facilities.length){
  html+=section('Facility balances · USD','<div class="credit-data-table-scroll"><table class="credit-data-table" data-table-mode="summary" data-pj-facilities><thead><tr><th>Facility</th><th>TFA</th><th>OSUC</th><th>Outstanding</th><th>Source date</th></tr></thead><tbody>'+facilities.map(r=>'<tr><td>'+esc(r.facility_id)+'</td>'+['tfa','osuc','total_os'].map(k=>'<td>'+esc(Number.isFinite(r[k])?'$'+textValue(k,r[k]):'Unavailable')+'</td>').join('')+'<td>'+esc(r.as_of_date)+'</td></tr>').join('')+'</tbody></table></div>');
 }
 const dates=['as_of_date','facility_first_approval_date','origination_date','renewal_date','maturity_date','ca_expiry_date','ca_expiration_date','due_date','effective_due_date','deferred_date','status','ccm_status','days_past_due','source_aging_bucket'];
 if(dates.some(k=>records.some(r=>present(r[k]))))html+=section('Dates & status',fields(dates));
 if(!a.c.history&&a.leaf.linked.matched<a.leaf.linked.total)html+='<p class="pj-leaf-note">'+esc(a.leaf.linked.total-a.leaf.linked.matched)+' selected records have no direct, unambiguous same-date facility match. Explicit covenant associations may provide related facilities; original records remain available in Data.</p>';
 const categories=Object.keys(domains).filter(k=>a.leaf.datasets[k]);
 if(categories.length)html+=section('Related monitoring','<p class="pj-leaf-note">Selected facilities · same reporting date · all supplied statuses</p><div class="credit-data-table-scroll"><table class="credit-data-table" data-table-mode="summary" data-pj-related-table><thead><tr><th>Area</th><th>Source records</th><th>Past due</th><th>Coming due</th></tr></thead><tbody>'+categories.map(k=>{const rs=a.leaf.datasets[k];return '<tr><td><button type="button" class="ch-row-link" data-pj-related="'+k+'">'+esc(domains[k])+'</button></td><td>'+rs.length+'</td><td>'+rs.filter(r=>r.status==='PAST_DUE').length+'</td><td>'+rs.filter(r=>r.coming_due&&!r.action_required).length+'</td></tr>';}).join('')+'</tbody></table></div>');
 else if(!a.c.history)html+='<p class="pj-leaf-note">No same-date monitoring records are linked in the available page scope.</p>';
 if(profile){host.innerHTML=html+'</div>';global.CreditTables.bindRows({table:host.querySelector('[data-pj-facilities]'),rows:facilities});}
 dataHost.querySelector('.pj-leaf-datasets')?.remove();const bar=document.createElement('div');bar.className='pj-leaf-datasets';bar.innerHTML='<h3>Supporting records</h3><div class="pal-segments" aria-label="Supporting datasets">'+Object.entries(a.leaf.datasets).filter(([key,rs])=>key==='records'||rs.length).map(([key,rs])=>'<button type="button" data-pj-dataset="'+key+'" aria-pressed="'+(key==='records')+'">'+esc(datasetLabels[key]||key)+' · '+rs.length+'</button>').join('')+'</div>';dataHost.prepend(bar);global.CreditTables.enhanceNumbers(host);
 }
 function drawInline(a){a.charts.forEach(c=>c.destroy());a.charts=[];a.controls?.remove();a.tableState=global.CreditTables.createState();inlineFocus=a;const n=next(a);a.terminal=!n;a.leaf=null;a.dataset='records';
 a.host.innerHTML='<div class="pj-drill-context"><div class="pj-local-nav"></div><div class="pj-inline-summary"><strong>'+esc(format(value(a.rows,a.c),a.c))+'</strong><span>'+esc(a.c.unit)+(n?' · by '+esc(labels[n.key]||n.key):'')+'</span></div></div><div data-pj-plot></div><div data-pj-inline-data hidden><div class="cd-records"></div></div>';
 navigation(a,a.host.querySelector('.pj-local-nav'));
 const controls=document.createElement('div');controls.className='pj-drill-actions';controls.innerHTML='<div class="pal-segments" role="tablist" aria-label="Selected chart view"><button type="button" role="tab" data-pj-inline-view="charts" aria-selected="true">Chart</button><button type="button" role="tab" data-pj-inline-view="data" data-pj-data-toggle aria-selected="false" tabindex="-1">Data</button></div><label class="ct-global-search" hidden>'+global.CreditIcons.icon('search')+'<input type="search" aria-label="Search selected records" placeholder="Search selected records…"></label>'+methodButton;a.controls=controls;
 const head=a.card.querySelector('.ch-card-head'),existing=head.querySelector('.cd-chart-controls');(existing||head).prepend(controls);controls.querySelector('[data-pj-method]').onclick=()=>explain(a);
 const plotHost=a.host.querySelector('[data-pj-plot]');renderLeaf(a,plotHost,a.host.querySelector('[data-pj-inline-data]'),!n);if(n)plot(plotHost,a.rows,a.c,n.key,g=>enter(a,g,n.key),a);
 const setView=mode=>{a.mode=mode;controls.querySelectorAll('[data-pj-inline-view]').forEach(b=>{const selected=b.dataset.pjInlineView===mode;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});(plotHost.closest('.cw-donut-layout')||plotHost).hidden=mode==='data';a.host.querySelector('[data-pj-inline-data]').hidden=mode!=='data'&&!!n;controls.querySelector('label').hidden=mode!=='data'&&!!n;if(mode==='data'||!n)inlineTable(a);else a.charts.forEach(c=>c.reflow());inlineFocus=a;syncExport();global.CreditControls?.enhance(controls);if(a.host.querySelector('.pj-drill-context').getBoundingClientRect().bottom<0)a.card.scrollIntoView({block:'start',behavior:'instant'});};
 a.host.querySelectorAll('[data-pj-dataset]').forEach(b=>b.onclick=()=>{a.dataset=b.dataset.pjDataset;a.tableState=global.CreditTables.createState();controls.querySelector('input').value='';a.host.querySelectorAll('[data-pj-dataset]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.pjDataset===a.dataset)));setView('data');});
 bindDatasetRows(a.host.querySelector('[data-pj-related-table]'),Object.fromEntries(Object.entries(a.leaf.datasets).filter(([key])=>Object.hasOwn(domains,key))),key=>a.host.querySelector('[data-pj-dataset="'+key+'"]').click());
 controls.querySelectorAll('[data-pj-inline-view]').forEach(b=>{b.onclick=()=>setView(b.dataset.pjInlineView);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();setView(e.key==='Home'?'charts':e.key==='End'?'data':a.mode==='data'?'charts':'data');controls.querySelector('[data-pj-inline-view="'+a.mode+'"]').focus();};});controls.querySelector('input').oninput=e=>{a.tableState.query=e.target.value;a.tableState.page=0;inlineTable(a);};setView(a.mode);syncExport();global.CreditUI.enhance(a.card);global.CreditControls?.enhance(controls);if(a.host.querySelector('.pj-drill-context').getBoundingClientRect().bottom<0)a.card.scrollIntoView({block:'start',behavior:'instant'});}
 function click(id,rows,selection,element){const el=element||$('#'+id),card=el?.closest('.ch-card');if(!card||card.closest('.cd-detail-page'))return false;const c=contract(id,rows||[],selection,getSettings());clearInline();const originalHeight=card.getBoundingClientRect().height,host=document.createElement('div');host.className='cd-inline-drill pj-inline';const head=card.querySelector('.ch-card-head'),hidden=[...card.children].filter(e=>e!==head).map(el=>[el,el.hidden]);head?.querySelectorAll('.pal-segments,[data-pal-setting],[data-chart-method]').forEach(el=>hidden.push([el,el.hidden]));hidden.forEach(([el])=>el.hidden=true);
 const a={inline:true,c,id,card,element:el,host,hidden,originScroll:global.scrollY,className:card.className,minHeight:card.style.minHeight,charts:[],rows:rows||[],used:[],mode:'charts',trail:[{label:selection||c.title,rows:rows||[],used:[],c}]};card.style.minHeight='0px';card.classList.add('pj-inline-active');card.append(host);inline.set(card,a);drawInline(a);a.card.scrollIntoView({block:'start',behavior:'instant'});return true;}

 function syncExport(){const a=stack.at(-1)||inlineFocus,rows=a?((a.mode==='data'||!a.inline||a.terminal)?a.exportRows:a.rows):null;$('#ch-download').disabled=!(rows??root._exportRows??[]).length;$('#ch-download').title=a?'Download '+(rows?.length||0)+' matching records for '+(a.title||a.c.title):'Download dashboard records';}
 function back(){const a=stack.pop();if(!a)return;root.dispatchEvent(new CustomEvent('credit:table-reset',{detail:{panel:a.panel}}));a.charts.forEach(c=>c.destroy());if(!stack.length)a.overlay?.dispose();a.panel.remove();a.hidden.forEach(([el,hidden])=>el.hidden=hidden);if(stack.length){stack.at(-1).overlay.body.scrollTop=a.parentScroll;stack.at(-1).overlay.dialog.setAttribute('aria-label',stack.at(-1).title);}root.classList.toggle('cd-detail-active',stack.length>0);$('.ch-skip')?.setAttribute('href',stack.length?'#'+stack.at(-1).panel.id:'#ch-content');syncExport();a.trigger?.isConnected&&a.trigger.focus({preventScroll:true});global.scrollTo({top:a.scroll,behavior:'instant'});stack.at(-1)?.charts.forEach(c=>c.reflow());}
 function open(id,records,selection,options={}){
 const rows=records??getRows(id)??[];const c=options.c||contract(id,rows,selection||'',getSettings());
 const parent=stack.at(-1),panel=document.createElement('section');panel.id='pj-analysis-'+(++sequence);panel.className='cd-detail-page pj-workspace';panel.setAttribute('aria-label',c.title+' analysis');
 const trigger=document.activeElement,scroll=global.scrollY,parentScroll=parent?.overlay.body.scrollTop||0;const hidden=(parent?[parent.panel]:[]).map(el=>[el,el.hidden]);hidden.forEach(([el])=>el.hidden=true);
 const a={c,title:options.title||c.title,rows,panel,hidden,trigger,scroll,parentScroll,used:options.used||[],mode:'charts',dataset:'records',tableStates:{},charts:[],trail:[{label:selection||c.title,rows,used:options.used||[],c}]};stack.push(a);if(parent){a.overlay=parent.overlay;a.overlay.body.append(panel);a.overlay.body.scrollTop=0;a.overlay.dialog.setAttribute('aria-label',a.title);}else a.overlay=global.CreditAnalysisOverlay({root,panel,title:a.title,onClose:()=>{while(stack.length)back();}});panel.dataset.nested=String(!!parent);root.classList.add('cd-detail-active');$('.ch-skip')?.setAttribute('href','#'+panel.id);drawWorkspace(a);panel.querySelector('h2').focus({preventScroll:true});return true;
 }
 function drawWorkspace(a){
 a.charts.forEach(c=>c.destroy());a.charts=[];
 const parent=stack[stack.indexOf(a)-1],scope=getScope(),sourceDates=[...new Set(a.rows.map(r=>r.as_of_date).filter(Boolean))].sort(),latest=sourceDates.at(-1);
 const linked=a.c.monitoring?links(a.rows,getData().portfolio||[]):null;
 const facilityRows=linked?linked.facilities:a.c.history?[]:[...new Map(a.rows.filter(r=>r.facility_id).map(r=>[JSON.stringify([identity(r),r.as_of_date]),r])).values()];
 const relIds=[...new Set(a.rows.map(r=>r.relationship_id).filter(Boolean))];
 const relatedScope=detailScope(a.rows,getData().portfolio||[],scope.monitoring||[],{activity:scope.activity,previous:scope.previous,covenantHistory:scope.covenantHistory,sources:getData().sources,documents:scope.documents,history:getData().history,errors:getData().relatedSourceErrors});a.datasets=relatedScope.datasets;if(linked)a.datasets.records=linked.records;const relatedRows=a.c.history||relIds.length!==1?[]:relatedScope.related;
 if(!a.datasets[a.dataset])a.dataset='records';
 const balance=(key)=>facilityRows.length?format(value(facilityRows,{measure:key}),{measure:key}):a.rows.length?'Unavailable':'$0m';
 let metrics=[[a.c.unit,format(value(a.rows,a.c),a.c)],['Relationships',number(distinct(a.rows,'relationship_id'))],['Facilities',number(distinct(a.rows,identity))]];
 if(a.c.history)metrics=[['Latest snapshot balance',format(value(a.rows.filter(r=>r.as_of_date===latest),a.c),a.c)],['Reporting dates',number(sourceDates.length)],['Products',number(distinct(a.rows,'product'))],['Regions',number(distinct(a.rows,'region'))]];
 else if(linked)metrics.push(['Linked TFA',balance('tfa')],['Linked OSUC',balance('osuc')]);
 else if(a.c.measure==='tfa')metrics.push(['OSUC',balance('osuc')]);else metrics.push(['TFA',balance('tfa')]);
 if(!a.c.monitoring&&!a.c.history&&['facilities','relationships'].includes(a.c.measure))metrics=a.c.measure==='relationships'?[['Relationships',number(relIds.length)],['Facilities',number(distinct(a.rows,identity))],['TFA',balance('tfa')],['OSUC',balance('osuc')]]:facilityRows.length===1?[['Facilities','1'],['TFA',balance('tfa')],['OSUC',balance('osuc')],['Outstanding',balance('total_os')]]:[['Facilities',number(distinct(a.rows,identity))],['Relationships',number(relIds.length)],['TFA',balance('tfa')],['OSUC',balance('osuc')]];
 if(a.c.id==='relationshipChart'&&relIds.length===1)metrics.push(['ROTCE',format(value(a.rows,{measure:'rotce'}),{measure:'rotce'})]);
 const scopeLabel=[scope.filters||'All page records',a.c.context].filter(Boolean).join(' · ');
 a.panel.innerHTML='<div class="cd-detail-heading"><div><span class="cd-eyebrow">PORTFOLIO / EXPANDED CHART</span><h2 tabindex="-1">'+esc(a.title)+'</h2><p>'+esc(sourceDates.length?'As of '+sourceDates.join(' · '):'Reporting date unavailable')+'</p></div><div class="ch-actions"><div class="pal-segments" role="tablist" aria-label="Analysis view"><button type="button" role="tab" data-pj-view="charts">Overview</button><button type="button" role="tab" data-pj-view="data">Data</button></div>'+methodButton+'<button type="button" class="ch-btn" data-pj-back>← '+esc(parent?'Back to '+parent.title:'Back to Portfolio')+'</button></div></div><div class="pj-context"><div class="pj-context-line"><span>'+esc(scopeLabel)+'</span>'+(linked?'<span class="pj-coverage">Facility links '+linked.matched+' / '+linked.total+'</span>':'')+'</div>'+(parent?'<p class="pj-parent-context">From: '+esc([parent.title,...parent.trail.map(t=>t.label).filter(label=>label!==parent.title)].join(' · '))+'</p>':'')+'<div class="pj-local-nav"></div></div><div data-pj-charts><div class="ch-kpis pj-kpis">'+metrics.map(([name,v],i)=>'<div class="ch-card pal-metric"><div class="pal-metric-heading">'+global.CreditIcons.metric(['document','users','building','wallet','wallet'][i],i)+'<h3>'+esc(name)+'</h3></div><div class="pj-metric-value">'+esc(v)+'</div>'+methodButton+'</div>').join('')+'</div><div class="pj-analysis-grid"></div></div><section data-pj-data class="ch-card cd-source-card cw-framed-card"><div class="ch-toolbar"><div><h2>Supporting records</h2><p class="ch-card-sub">'+esc(a.c.monitoring?'Source associations and linked facility balances.':'Records in the selected scope.')+'</p></div><div class="ch-actions"><div class="pal-segments" data-pj-datasets></div><label class="ct-global-search"><input type="search" aria-label="Search analysis records" placeholder="Search all records…"></label>'+methodButton+'</div></div><div class="cd-records"></div></section>';
 a.panel.querySelector('[data-pj-back]').onclick=back;navigation(a,a.panel.querySelector('.pj-local-nav'));a.panel.querySelectorAll('[data-pj-method]').forEach(b=>b.onclick=()=>explain(a));
 const grid=a.panel.querySelector('.pj-analysis-grid'),plans=[];
 const add=(title,key,rows=a.rows,c=a.c,kind='bar')=>{if(groups(rows,key,c).length>1&&!plans.some(p=>p.key===key&&p.c.measure===c.measure))plans.push({title,key,rows,c,kind});};
 if(a.c.history){
  add('Balance by reporting date','as_of_date',a.rows,a.c,'line');
  const current=a.rows.filter(r=>r.as_of_date===latest);add('Regional exposure · '+latest,'region',current);add('Product mix · '+latest,'product',current,a.c,'pie');
 }else if(a.c.id==='facilityTrendChart'){
  add('CAs by expiry month','pal_ca_month',a.rows.filter(r=>r.pal_ca_month),{...a.c,measure:'relationships',unit:'Distinct CA relationships'});
  add('Facilities by maturity month','pal_facility_month',a.rows.filter(r=>r.pal_facility_month),{...a.c,measure:'facilities',unit:'Facilities'});
 }else if(a.c.id==='relationshipChart'){
  add('Exposure by relationship','relationship_id');add('ROTCE by relationship','relationship_id',a.rows,{...a.c,measure:'rotce',unit:'ROTCE · %'});add('Facility exposure','facility_id');
 }else if(a.c.id==='newDealsChart'||a.c.id==='creditClassificationChart'){
  const dated=a.rows.map(r=>({...r,analysis_date:(a.c.id==='creditClassificationChart'?r.facility_first_approval_date:r.origination_date||r.renewal_date)?.slice(0,7)||'Not supplied'}));
  add(a.c.id==='newDealsChart'?'Deals by month':'Approvals by month','analysis_date',dated,a.c,'line');add('Product program mix','product',a.rows,a.c,'pie');
 }else if(a.c.id==='pal-pipeline'){
  add('Days awaiting closure','pal_pipeline_bucket');add('Pending facilities by product','product',a.rows,a.c,'pie');
 }else if(a.c.monitoring){
  if(a.c.id==='ccmRegionalChart'||a.rows.every(r=>r.category==='CCM'))add('CCM status','ccm_status');
  else if(a.rows.every(r=>r.category==='COVENANTS'))add('Covenant aging','analysis_aging',a.rows,a.c,'pie');
  else add('Monitoring workload','category');
  add('Regional distribution','region');add('Accountable underwriters','owner_id');
 }else{add('Exposure by product program','product',a.rows,a.c,'pie');add('Regional exposure','region');}
 // Continue through the explicit contract without making a one-slice chart.
 const n=next(a);if(n)add(a.c.unit+' by '+(labels[n.key]||n.key),n.key);
 add(a.c.monitoring?a.c.unit+' by relationship':'Exposure by relationship','relationship_id');add('Facility exposure','facility_id');
 for(const plan of plans.slice(0,2)){
  const card=document.createElement('section');card.className='ch-card cw-framed-card pj-analysis-card';card.innerHTML='<div class="ch-card-head"><div><h3>'+esc(plan.title)+'</h3><p class="ch-card-sub">'+esc(plan.c.unit)+(amounts.has(plan.c.measure)?' · USD':'')+'</p></div>'+methodButton+'</div><div class="pj-chart"></div>';grid.append(card);
  card.querySelector('[data-pj-method]').onclick=()=>explain({...a,c:plan.c});plot(card.querySelector('.pj-chart'),plan.rows,plan.c,plan.key,g=>enter(a,g,plan.key),a,plan.kind);
 }
 // At entity level use a content-sized record profile, not two empty chart cards.
 if(relIds.length===1||!plans.length){
  const profile=document.createElement('section');profile.className='ch-card cw-framed-card pj-profile';
  const keys=['relationship_id','relationship_name','facility_id','covenant_id','owner_name','banker_name','status','region','product'];
  profile.innerHTML='<div class="ch-card-head"><h3>'+esc(relIds.length===1?[relIds[0],a.rows.find(r=>r.relationship_name)?.relationship_name].filter(Boolean).join(' — '):'Selection details')+'</h3>'+methodButton+'</div><dl class="pj-entity-facts">'+keys.filter(k=>k!=='relationship_id'&&k!=='relationship_name').map(key=>{const vals=[...new Set(a.rows.map(r=>r[key]).filter(present))];return vals.length?'<div><dt>'+esc(labels[key]||key)+'</dt><dd>'+esc(vals.length>3?number(vals.length)+' distinct':vals.join(' · '))+'</dd></div>':'';}).join('')+'</dl>';
  grid.append(profile);profile.querySelector('[data-pj-method]').onclick=()=>explain(a);
  if(facilityRows.length){
   const card=document.createElement('section');card.className='ch-card cw-framed-card pj-facility-summary';card.innerHTML='<div class="ch-card-head"><h3>Facility balances</h3>'+methodButton+'</div><div class="credit-data-table-scroll"><table class="credit-data-table" data-table-mode="summary"><thead><tr><th>Facility</th><th>TFA · USD</th><th>OSUC · USD</th><th>Outstanding · USD</th></tr></thead><tbody>'+facilityRows.slice(0,10).map(r=>'<tr><td>'+esc(r.facility_id)+'</td>'+['tfa','osuc','total_os'].map(k=>'<td>'+esc(format(Number.isFinite(r[k])?r[k]:null,{measure:k}))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'+(facilityRows.length>10?'<p class="pj-scope-note">First 10 facilities · all facilities are available in Data.</p>':'');grid.append(card);card.querySelector('[data-pj-method]').onclick=()=>explain(a);global.CreditTables.bindRows({table:card.querySelector('table'),rows:facilityRows.slice(0,10)});
  }
 }
 // Insights are compact, calculated facts. Calculation caveats live in Methodology.
 const primary=plans[0],ranked=primary?groups(primary.rows,primary.key,primary.c).filter(g=>g.y!==null).sort((x,y)=>y.y-x.y):[],top=ranked[0];
 const facts=[];
 if(top&&primary.key!=='as_of_date'&&primary.key!=='analysis_date'){
  facts.push(['Largest '+(labels[primary.key]||primary.key).toLowerCase(),top.name,format(top.y,primary.c)+(ranked.filter(g=>g.y===top.y).length>1?' · tied':'')]);
  const total=value(primary.rows,primary.c);if(total>0&&primary.c.measure!=='relationships'&&primary.c.measure!=='rotce'&&primary.c.measure!=='spread')facts.push(['Share of selection',(top.y/total*100).toFixed(1)+'%',primary.c.unit]);
 }
 if(linked&&linked.matched<linked.total)facts.push(['Unlinked source records',number(linked.total-linked.matched),'Excluded from linked exposure']);
 if(a.c.history&&sourceDates.length>1)facts.push(['Reporting range',sourceDates[0]+' – '+latest,number(sourceDates.length)+' snapshots']);
 if(facts.length){const strip=document.createElement('div');strip.className='pj-insight-strip';strip.innerHTML=facts.map(([label,v,detail])=>'<div><span>'+esc(label)+'</span><strong>'+esc(v)+'</strong><small>'+esc(detail)+'</small></div>').join('');grid.append(strip);}
 // Related-domain context is useful for one relationship; do not blanket the page
 // with disabled buttons, verbose source-contract text or zero-count destinations.
 const categories=Object.keys(domains).filter(category=>relatedRows.some(r=>r.category===category));
 if(categories.length){
  const card=document.createElement('section');card.className='ch-card cw-framed-card pj-linked-monitoring';
  card.innerHTML='<div class="ch-card-head"><div><h3>Linked monitoring</h3><p class="ch-card-sub">Same-date facilities · all supplied statuses</p></div>'+methodButton+'</div><div class="credit-data-table-scroll"><table class="credit-data-table" data-table-mode="summary"><thead><tr><th>Area</th><th>Source records</th><th>Actions required</th><th>Coming due</th></tr></thead><tbody>'+categories.map(category=>{const rows=relatedRows.filter(r=>r.category===category);return '<tr><td><button type="button" class="ch-row-link" data-pj-domain="'+category+'">'+esc(domains[category])+'</button></td><td>'+number(rows.length)+'</td><td>'+number(rows.filter(r=>r.action_required).length)+'</td><td>'+number(rows.filter(r=>r.coming_due&&!r.action_required).length)+'</td></tr>';}).join('')+'</tbody></table></div>';grid.append(card);
  card.querySelector('[data-pj-method]').onclick=()=>explain(a);bindDatasetRows(card.querySelector('table'),Object.fromEntries(categories.map(key=>[key,a.datasets[key]])),key=>{a.panel.querySelector('[data-pj-dataset="'+key+'"]').click();setMode(a,'data');});
 }
 if(!grid.children.length)grid.innerHTML='<p class="ch-empty">No records match this selection.</p>';
 a.panel.querySelector('[data-pj-datasets]').innerHTML=Object.keys(a.datasets).map(key=>'<button type="button" data-pj-dataset="'+key+'" aria-pressed="'+(a.dataset===key)+'">'+esc(datasetLabels[key]||key)+'</button>').join('');
 a.panel.querySelectorAll('[data-pj-dataset]').forEach(b=>b.onclick=()=>{a.dataset=b.dataset.pjDataset;renderTable(a);a.panel.querySelectorAll('[data-pj-dataset]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.pjDataset===a.dataset)));global.CreditControls?.enhance(a.panel);});
 a.panel.querySelector('input[type=search]').oninput=e=>{const t=tableState(a);t.query=e.target.value;t.page=0;renderTable(a);};
 a.panel.querySelectorAll('[data-pj-view]').forEach(b=>{b.onclick=()=>setMode(a,b.dataset.pjView);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();setMode(a,e.key==='Home'?'charts':e.key==='End'?'data':a.mode==='charts'?'data':'charts');a.panel.querySelector('[data-pj-view="'+a.mode+'"]').focus();};});
 renderTable(a);setMode(a,a.mode);global.CreditTables.enhanceNumbers(a.panel);a.panel.querySelectorAll('[data-pj-method]').forEach(b=>b.setAttribute('aria-label','Methodology for '+(b.closest('.ch-card')?.querySelector('h2,h3')?.textContent||a.title)));global.CreditUI.enhance(a.panel);global.CreditControls?.enhance(a.panel);
 }
 function tableState(a){return a.tableStates[a.dataset]??=global.CreditTables.createState();}
 function renderTable(a){const records=a.datasets[a.dataset]||[],state=tableState(a),preferred=['relationship_id','relationship_name','facility_id','covenant_id','category','status','ccm_status','source_aging_bucket','region','product','banker_name','owner_name','as_of_date','match_status','tfa','osuc','tfa_usd','osuc_usd'];const keys=[...new Set([...preferred,...records.flatMap(Object.keys)])].filter(k=>!k.startsWith('pal_')&&k!=='demo_scenario'&&records.some(r=>present(r[k])));const columns=keys.map(key=>({key,label:({relationship_id:'Relationship ID',facility_id:'Facility ID',owner_id:'Underwriter / specialist ID'})[key]||labels[key]||key.replaceAll('_',' '),format:v=>textValue(key,v)}));const rows=global.CreditTables.select(records,columns,state);a.exportRows=rows;state.page=Math.min(state.page,Math.max(0,Math.ceil(rows.length/state.pageSize)-1));const shown=rows.slice(state.page*state.pageSize,(state.page+1)*state.pageSize),area=a.panel.querySelector('.cd-records');a.panel.querySelector('input[type=search]').value=state.query;
 area.innerHTML='<div class="credit-data-table-scroll"><table class="credit-data-table"><thead></thead><tbody>'+shown.map((r,i)=>'<tr>'+keys.map(key=>'<td>'+(present(r[key])&&['relationship_id','facility_id'].includes(key)?'<button type="button" class="ch-row-link" data-pj-entity="'+key+'" data-pj-row="'+i+'">'+esc(textValue(key,r[key]))+'</button>':esc(textValue(key,r[key])))+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+(!rows.length?'<p class="ch-empty">No matching records. Clear the table filters to broaden this view.</p>':'')+'</div>';
 global.CreditTables.bindRows({table:area.querySelector('table'),rows:shown});
 area.querySelectorAll('[data-pj-entity]').forEach(button=>button.onclick=()=>button.closest('table').dispatchEvent(new CustomEvent('credit:table-drill',{bubbles:true,detail:{rows:[shown[+button.dataset.pjRow]],label:global.CreditTables.rowLabel(shown[+button.dataset.pjRow]),table:button.closest('table'),trigger:button}})));
 global.CreditTables.decorate({table:area.querySelector('table'),rows:records,columns,state,onChange:()=>{state.page=0;renderTable(a);},matched:rows.length,local:true});global.CreditTables.pagination({host:area,total:rows.length,page:state.page,pageSize:state.pageSize,onChange:(page,size)=>{state.page=page;state.pageSize=size;renderTable(a);}});syncExport();}
 function setMode(a,mode){a.mode=mode;a.panel.querySelector('[data-pj-charts]').hidden=mode!=='charts';a.panel.querySelector('[data-pj-data]').hidden=false;a.panel.querySelectorAll('[data-pj-view]').forEach(b=>{const on=b.dataset.pjView===mode;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});if(mode==='charts')a.charts.forEach(c=>c.reflow());syncExport();global.CreditControls?.enhance(a.panel);}
 function relatedDetail({rows,host,dataHost,profile=true,onDataset}){
 const a={rows,c:contract('related-records',rows),host};renderLeaf(a,host,dataHost,profile);
 const select=key=>{dataHost.querySelectorAll('[data-pj-dataset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pjDataset===key)));onDataset(a.leaf.datasets[key]||[],key);};
 dataHost.querySelectorAll('[data-pj-dataset]').forEach(b=>b.onclick=()=>select(b.dataset.pjDataset));
 if(profile)bindDatasetRows(host.querySelector('[data-pj-related-table]'),Object.fromEntries(Object.entries(a.leaf.datasets).filter(([key])=>Object.hasOwn(domains,key))),select);
 global.CreditControls?.enhance(dataHost);return a.leaf;
 }
 return {click,open,back,clearInline,relatedDetail,reset(){clearInline();while(stack.length)back();},exportRows:()=>{const a=stack.at(-1)||inlineFocus;return a?((a.mode==='data'||!a.inline||a.terminal)?a.exportRows:a.rows):null;}};
};
})(window);

;
/* PAL chart presentation. Business eligibility/buckets are produced by local Access. */
(function(global){'use strict';
const MONITOR_AREAS={COVENANTS:'Covenants',CA:'CA expiration',FACILITY:'Facility maturity',CCM:'CCM',INSURANCE:'Insurance',APPRAISALS:'Appraisals'};
const COLORS=['#255BE3','#00AF68','#FFCD00','#8E319C','#FF5C0B','#73C2FC','#D71671','#97D700'];
// Shared display buckets for portfolio charts, expanded tables and record exports.
// Exact source-file bands take precedence; coarse legacy bands need dated aging.
global.CreditCovenantAging={
 bands:['1–30','31–45','46–60','61–90','>90'],
 daysUntil(r){
  if(r.effective_due_date&&r.as_of_date){const due=Date.parse(r.effective_due_date+'T00:00:00Z'),asof=Date.parse(r.as_of_date+'T00:00:00Z');if(Number.isFinite(due)&&Number.isFinite(asof))return Math.round((due-asof)/86400000);}
  return typeof r.days_past_due==='number'&&r.days_past_due<0?-r.days_past_due:null;
 },
 normalize(value){
  const v=String(value??'').trim().toLowerCase().replace(/[–—]/g,'-').replace(/\bdays?\b/g,'').replace(/\s+/g,'');
  if(['0-30','1-30'].includes(v))return '1–30';
  if(['31-45','46-60','61-90'].includes(v))return v.replace('-','–');
  if(['>90','90+','91+','91-199','200+','over90'].includes(v))return '>90';
  return null;
 },
 bucket(r,past){
  const supplied=this.normalize(r.source_aging_bucket);if(supplied)return supplied;
  const days=past?(typeof r.days_past_due==='number'?r.days_past_due:null):this.daysUntil(r);
  if(days!==null&&(past?days>0:days>=0))return days<=30?'1–30':days<=45?'31–45':days<=60?'46–60':days<=90?'61–90':'>90';
  return past?this.normalize(r.pal_covenant_bucket):null;
 },
 isComing(r){return r.category==='COVENANTS'&&(r.status==='COMING_DUE'||r.pal_due30===true);}
};
global.CreditPAL=function(ctx){
 const {root,esc,num,money,pct,sum,unique,filtered,register,kpis,showRows}=ctx;
 const $=s=>root.querySelector(s);
 const methods={'pal-trends':['PAL trend table: aggregate selected exposure by product and report date; show the latest four supplied dates and a total row. Region/product filters and the table exposure, PSE and commitment controls apply.','MoM/QoQ/YoY compare the latest snapshot against the last available snapshot in the calendar month 1/3/12 months earlier. Missing baselines and zero denominators are unavailable, never zero growth. Daily snapshots are not mislabelled as monthly changes. Owner/team and facility attributes are not in aggregate history.'], 'pal-deep-presence':['Selected relationship ID, grouped by booking region. TFA and facilities use the filtered portfolio; all supplied underwriters and team leads are listed.','No cross-relationship name matching is used. Balances are USD.'], 'pal-deep-performance':['CA expiry counts distinct non-empty CA IDs flagged expired; denominator is all supplied distinct CA IDs. Facility expiry uses distinct region + relationship + facility keys.','Covenant and CCM indicators count source obligations flagged past due, divided by the supplied relationship population for that domain. These are monitoring indicators, not default rates.']};
 function method(id,title){return '<button class="cw-icon-btn cd-section-method" data-pal-method="'+id+'" aria-label="Methodology for '+esc(title)+'">'+(global.CreditIcons?.icon('info')||'ⓘ')+'</button>';}

 const settings={approvalPeriod:'mtd',dealPeriod:'ytd',pendingPeriod:'ytd',top:10,measure:'direct_os',covenants:'past',trend:'osuc',pse:'',commitment:'',relationship:'',extraOpen:false,deepTab:'metrics',management:'',subprogram:'',portfolioPse:'',portfolioCommitment:'',facilityType:''};
 const measures={direct_os:'Direct OS',contingent_os:'Contingent OS',pse_os:'PSE OS',osuc:'OSUC',unused_commitment:'Unused commitment',tfa:'TFA'};
 let details={};const tableRows=new Map();
 const summaryRow=(cells,rows,label,drills={})=>Object.defineProperties(cells,{_rows:{value:rows},_label:{value:label},_drills:{value:drills}});
 const by=(rows,key)=>[...new Set(rows.map(r=>r[key]).filter(v=>v!==null&&v!==''))];
 const format=(v,kind)=>kind==='money'?money(v):kind==='pct'?pct(v):num(v);
 function select(key,label,options){return '<label class="pal-select"><span class="pal-control-label">'+esc(label)+'</span><select aria-label="'+esc(label)+'" data-pal-setting="'+key+'">'+options.map(([v,t])=>'<option value="'+esc(v)+'" '+(String(settings[key])===String(v)?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>';}
 const periods=[['ytd','YTD'],['qtd','QTD'],['mtd','MTD'],['wtd','This week']];
 const priorLabels={ytd:'Prior year to date',qtd:'Prior quarter to date',mtd:'Prior month to date',wtd:'Prior week to date'};
 function segments(key,label,options=periods){return '<div class="pal-segments" role="group" aria-label="'+esc(label)+'">'+options.map(([v,t])=>'<button type="button" data-pal-period="'+key+'" data-value="'+v+'" aria-pressed="'+(settings[key]===v)+'">'+t+'</button>').join('')+'</div>';}
 function previousWeekday(report){const day=new Date(report+'T00:00:00Z');do{day.setUTCDate(day.getUTCDate()-1);}while([0,6].includes(day.getUTCDay()));return day.toISOString().slice(0,10);}
 function variance(rows,key,report){
  const dates=by(ctx.data().portfolio||[],'as_of_date');
  if(dates.length!==1)return '<span class="pal-variance unavailable">Comparable date unavailable</span>';
  const date=previousWeekday(report),cohort=!!ctx.hasDrill?.()||!!ctx.state().owner_id||!!ctx.state().team_lead||filterFields().some(f=>f.value),comparison=global.CreditSnapshots?.compare(ctx.data(),['PORTFOLIO']),useFacilities=!!comparison?.ready,snapshot=useFacilities?(comparison?.prior||[]):(ctx.data().history||[]).filter(r=>r.as_of_date===date);
  const ready=(useFacilities||snapshot.length>0)&&snapshot.every(r=>(useFacilities||r.comparison_ready===true)&&(!cohort||r.facility_id&&r.relationship_id&&r.region)&&typeof r[key]==='number'&&Number.isFinite(r[key]));
  if(!ready)return '<span class="pal-variance unavailable" title="A complete prepared snapshot for '+date+' is required.">Prior weekday unavailable</span>';
  const previous=sum(filterRows(filtered(snapshot)),key),current=sum(rows,key),delta=current-previous,sign=delta>0?'+':delta<0?'−':'';
  const change=previous===0?(current===0?'0.0%':'New balance'):sign+(Math.abs(delta/previous)*100).toFixed(1)+'%';
  return '<span class="pal-variance '+(delta<0?'decrease':delta>0?'increase':'unchanged')+'" title="'+esc('Change from '+date+': '+delta.toLocaleString('en-US',{style:'currency',currency:'USD'})+'; prior balance '+previous.toLocaleString('en-US',{style:'currency',currency:'USD'}))+'">'+change+' <span>('+sign+money(Math.abs(delta))+')</span></span>';
 }
 function card(id,title,sub,controls=''){return '<section class="ch-card pal-card"><div class="ch-card-head"><div><h2>'+esc(title)+'</h2><p class="ch-card-sub">'+esc(sub)+'</p></div><button class="pal-detail" data-pal-detail="'+id+'" aria-label="View '+esc(title)+' data">View data ↗</button></div>'+controls+'<div id="'+id+'" class="ch-chart"></div></section>';}
 function trendTabs(key,label,options){return '<div class="pal-trend-control"><span class="pal-control-label">'+esc(label)+'</span><div class="pal-segments" role="group" aria-label="'+esc(label)+'">'+options.map(([v,t])=>'<button type="button" data-pal-tab="'+key+'" data-value="'+esc(v)+'" aria-pressed="'+(String(settings[key])===String(v))+'">'+esc(t)+'</button>').join('')+'</div></div>';}
 function simpleTable(headers,rows,key){if(key)tableRows.set(key,rows);return '<div class="credit-data-table-scroll"><table class="credit-data-table"'+(key?' data-pal-table="'+key+'"':'')+'><thead><tr>'+headers.map((h,i)=>'<th scope="col" class="'+(i?'num':'')+'">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((v,i)=>'<td class="'+(i?'num':'')+'">'+v+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';}
 function chart(id,type,cats,series,rows,{stacked=false,kind='count',target=null,onPoint=null,height=310,axes=null,paired=false}={}){
  details[id]=rows;if(ctx.shouldDraw&&!ctx.shouldDraw(id))return;const el=$('#'+id);el.style.height=height+'px';if(!rows.length){el.innerHTML='<p class="ch-empty">No eligible records in this selection.</p>';return;}if(!global.Highcharts){el.innerHTML='<p class="ch-empty">Chart library unavailable. Use View data.</p>';return;}
  const c=global.Highcharts.chart(el,{chart:{type,height,...(paired?{marginTop:65,marginBottom:75}:{}),alignTicks:!axes,backgroundColor:'transparent',animation:false,style:{fontFamily:getComputedStyle(root).fontFamily},spacing:[16,16,8,6]},title:{text:null},credits:{enabled:false},colors:COLORS,accessibility:{description:ctx.state().tab==='portfolio'?'Select a chart point to explore that population locally; other charts remain unchanged.':'Select a chart point to inspect its source records.'},xAxis:{categories:cats,lineColor:'#E1E8EF',tickLength:0,labels:{style:{color:'#697586',fontSize:'11px'}}},yAxis:axes||{reversedStacks:false,title:{text:null},gridLineColor:'#E8ECF2',gridLineDashStyle:'Dash',allowDecimals:kind!=='count',labels:{formatter:function(){return format(this.value,kind);},style:{color:'#697586',fontSize:'10px'}},plotLines:target===null?[]:[{value:target,color:'#0F1632',width:1,dashStyle:'Dash',zIndex:5,label:{text:'12% target',style:{fontSize:'10px',color:'#0F1632'}}}]},legend:{enabled:id!=='creditClassificationChart'&&(type==='pie'||series.length>1),align:'center',verticalAlign:'bottom',itemStyle:{fontWeight:'normal',fontSize:'11px',color:'#697586'},symbolRadius:2},tooltip:{useHTML:false,formatter:function(){const p=this.point;if(id==='monitoringPriorityChart')return '<b>'+esc(cats[p.index])+'</b><br>'+esc(this.series.name)+': '+num(this.y)+'<br>Source dates: '+esc(p.custom.dates.join(', ')||'No records in current scope');if(id==='relationshipChart')return '<b>'+esc(cats[p.index]||p.name||'')+'</b><br>'+esc(measures[settings.measure])+': '+money(p.custom.exposure)+'<br>ROTCE: '+(p.custom.rotce===null?'Unavailable':pct(p.custom.rotce))+'<br>Target: 12%';return '<b>'+esc(p.name||cats[p.index]||'')+'</b><br>'+esc(this.series.name)+': '+format(this.y,kind)+(p.custom?.count!==undefined?'<br>Facilities: '+num(p.custom.count):'');}},plotOptions:{series:{animation:false,stacking:stacked?'normal':undefined,borderWidth:0,cursor:'pointer',point:{events:{click:function(){if(onPoint)onPoint(this);else ctx.openChart(id,this.options.custom?.rows||rows,(this.name||cats[this.index]||'Selected group')+' · '+this.series.name);}}}},column:id==='facilityTrendChart'?{borderRadius:3,groupPadding:.28,pointPadding:.04}:{borderRadius:3,maxPointWidth:34},bar:{borderRadius:3,maxPointWidth:20,...(paired?{pointWidth:16}:{})},pie:{innerSize:'68%',dataLabels:{enabled:false},showInLegend:true,borderWidth:2,borderColor:'#fff'}},series,responsive:{rules:[{condition:{maxWidth:420},chartOptions:{chart:{spacing:[12,4,4,0]},legend:{itemStyle:{fontSize:'10px'}}}}]}});ctx.addChart(c);if(type==='pie')global.CreditDonut?.(c,{esc,format:v=>format(v,kind),label:kind==='money'?'Total · USD':'Total '+(id==='covenantMonitoringChart'?'covenants':'facilities'),onSelect:p=>ctx.openChart(id,p.custom?.rows||rows,p.name)});
 }
 function points(rows,key,measure=null){return by(rows,key).sort().map((v,i)=>{const rs=global.CreditDataCache.index(rows,key).get(v)||[];return{name:v,y:measure?sum(rs,measure):rs.length,color:COLORS[(key==='product'?by(ctx.data().portfolio||rows,key).sort().indexOf(v):i)%COLORS.length],custom:{rows:rs,count:rs.length}};});}
 function wire(){root.querySelectorAll('[data-pal-tab]').forEach(b=>{b.onclick=()=>{const key=b.dataset.palTab;if(String(settings[key])===b.dataset.value)return;settings[key]=b.dataset.value;const update=()=>ctx.render(['pal-trends']);Promise.resolve(global.CreditControls?global.CreditControls.run(b,update):update()).then(()=>[...root.querySelectorAll('[data-pal-tab]')].find(x=>x.dataset.palTab===key&&x.dataset.value===b.dataset.value)?.focus({preventScroll:true}));};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const bs=[...b.parentElement.querySelectorAll('button')],i=bs.indexOf(b),next=e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length;bs[next].focus();bs[next].click();};});root.querySelectorAll('[data-pal-method]').forEach(b=>b.onclick=()=>ctx.methodology(b.dataset.palMethod));root.querySelectorAll('[data-pal-period]').forEach(el=>{el.onclick=()=>{const key=el.dataset.palPeriod,value=el.dataset.value;if(settings[key]===value)return;settings[key]=value;const ids={dealPeriod:['newDealsChart'],approvalPeriod:['creditClassificationChart'],pendingPeriod:['pal-pipeline'],covenants:['covenantMonitoringChart']};Promise.resolve(global.CreditControls?global.CreditControls.run(el,()=>ctx.render(ids[key])):ctx.render(ids[key])).then(()=>root.querySelector('[data-pal-period="'+key+'"][data-value="'+value+'"]')?.focus({preventScroll:true}));};el.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const buttons=[...el.parentElement.querySelectorAll('button')],i=buttons.indexOf(el);buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length].focus();};});root.querySelectorAll('[data-pal-setting]').forEach(el=>el.onchange=()=>{settings[el.dataset.palSetting]=el.value;if(el.dataset.palSetting==='relationship'){settings.deepTab='facilities';ctx.resetTable?.();}settings.extraOpen=!!$('.pal-extra-filters')?.open;ctx.render(['trend','pse','commitment'].includes(el.dataset.palSetting)?['pal-trends']:['top','measure'].includes(el.dataset.palSetting)?['relationshipChart']:undefined);});root.querySelectorAll('[data-pal-detail]').forEach(el=>el.onclick=()=>showRows(el.closest('section').querySelector('h2').textContent,details[el.dataset.palDetail]||[]));const pipeline=root.querySelector('#pal-pipeline table');if(pipeline)global.CreditDrillTable?.(pipeline,(i,j)=>j?i===4?(details.pipeline||[]):(details.pipeline||[]).filter(r=>r.pal_pipeline_bucket===['1-30','31-60','61-90','>90'][i]):null,(rs,label)=>showRows('Pending closure · '+label,rs));root.querySelectorAll('[data-pal-rows]').forEach(el=>el.onclick=()=>['tfa','total_os','unused_commitment','unused_uncommitted'].includes(el.dataset.palRows)&&ctx.openMetric?ctx.openMetric(el.dataset.palRows):showRows(el.dataset.title,details[el.dataset.palRows]||[]));wireSummaryJourneys();}
 function filterRows(rows,values=settings){return global.CreditDataCache.select(rows,{management_status:values.management,product_subprogram:values.subprogram,pse:values.portfolioPse?values.portfolioPse==='true':'',commitment:values.portfolioCommitment,facility_type:values.facilityType});}
 function wireSummaryJourneys(){
  root.querySelectorAll('table[data-pal-table]').forEach(table=>{
   const specs=tableRows.get(table.dataset.palTable)||[],headers=[...table.tHead.rows[0].cells].map(c=>c.textContent);
   global.CreditTables?.bindRows({table,rows:specs,resolve:r=>r._rows,label:r=>r._label});
   [...table.tBodies[0].rows].forEach((row,i)=>{
    const spec=specs[i];if(!spec)return;
    [...row.cells].forEach((cell,j)=>{const drill=spec._drills[j];if(!drill||cell.textContent==='—'||cell.querySelector('button'))return;
     const b=document.createElement('button');b.type='button';b.className='ch-row-link';b.setAttribute('aria-label','Analyze '+spec._label+' · '+headers[j]);while(cell.firstChild)b.append(cell.firstChild);cell.append(b);
     b.onclick=()=>ctx.openChart(drill.id,drill.rows,spec._label+' · '+headers[j]);
    });
   });
  });
 }
 function filterFields(){const rows=ctx.data().portfolio||[];return [
  ['management','Management status',[['','All management statuses'],...by(rows,'management_status').sort().map(v=>[v,v])]],
  ['subprogram','Subprogram',[['','All subprograms'],...by(rows,'product_subprogram').sort().map(v=>[v,v])]],
  ['portfolioPse','PSE',[['','All facilities'],['true','PSE'],['false','Non-PSE']]],
  ['portfolioCommitment','Commitment',[['','All commitments'],['COMMITTED','Committed'],['UNCOMMITTED','Uncommitted']]],
  ['facilityType','Facility type',[['','All facility types'],...by(rows,'facility_type').sort().map(v=>[v,v])]]
 ].map(([key,label,options])=>({key,label,options,value:settings[key],group:'portfolio',disabled:options.length===1}));}
 function headline(id,items){if(ctx.shouldDraw&&!ctx.shouldDraw(id))return;const el=$('#'+id),summary=document.createElement('div');summary.className='ch-chart-summary';summary.innerHTML=items.map(([value,label])=>'<div><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></div>').join('');el.before(summary);}
 function snapshot(rows){
  const counts=[['Facilities',unique(rows,'facility_id'),'facilities'],['Relationships',unique(rows,'relationship_id'),'relationships'],['CAs expired',unique(rows.filter(r=>r.pal_ca_expired),'relationship_id'),'caexpired'],['Facilities expired',unique(rows.filter(r=>r.pal_facility_expired),'facility_id'),'expired']];
  tableRows.set('coverage',counts.map(([name,count,key])=>summaryRow([],key==='caexpired'?rows.filter(r=>r.pal_ca_expired):key==='expired'?rows.filter(r=>r.pal_facility_expired):rows,name)));
  return '<section class="ch-card pal-table-card" id="pal-snapshot" data-table-mode="summary"><div class="ch-card-head"><div><h2>Portfolio coverage</h2><p class="ch-card-sub">Current portfolio · select a count to inspect</p></div></div><div class="credit-data-table-scroll"><table class="credit-data-table" data-pal-table="coverage"><thead><tr><th scope="col">Measure</th><th scope="col" class="num">Count</th></tr></thead><tbody>'+counts.map(([name,count,key],i)=>'<tr><th scope="row"><span class="pal-snapshot-label"><i style="background:'+COLORS[i]+'" aria-hidden="true"></i>'+name+'</span></th><td class="num"><button class="ch-row-link" data-pal-rows="'+key+'" data-title="'+name+'" aria-label="View '+name.toLowerCase()+' records">'+num(count)+(global.CreditIcons?.icon('arrow')||'↗')+'</button></td></tr>').join('')+'</tbody></table></div></section>';
 }
 function overview(rows){
  rows=filterRows(rows);
  details={};const monitor=ctx.monitoringRows?ctx.monitoringRows():filtered(ctx.data().monitoring),report=rows[0]?.as_of_date||ctx.data().portfolio[0]?.as_of_date,month=report?.slice(0,7);
  const approved=rows.filter(r=>r['pal_approved_'+settings.approvalPeriod]),pending=rows.filter(r=>r['pal_pending_'+settings.pendingPeriod]),sbl=rows.filter(r=>r.product==='Securities Based Lending');
  const rels=[...global.CreditDataCache.index(rows,'relationship_id')].filter(([id])=>id!==null&&id!=='').map(([id,rs])=>{return{id,name:rs[0].relationship_name,rows:rs,value:sum(rs,settings.measure),rotce:rs.find(r=>typeof r.rotce==='number')?.rotce??null};}).sort((a,b)=>b.value-a.value).slice(0,+settings.top);
  const cov=monitor.filter(r=>r.category==='COVENANTS'),ccm=monitor.filter(r=>r.category==='CCM');
  $('#ch-filter-status').textContent=rows.length+' portfolio records in selected scope';
  details.facilities=details.relationships=rows;details.caexpired=rows.filter(r=>r.pal_ca_expired);details.expired=rows.filter(r=>r.pal_facility_expired);
  let html='<div class="pal-metrics">'+[['Total facility amount','tfa','Portfolio limit'],['Outstanding','total_os','Drawn exposure'],['Unused commitment','unused_commitment','Committed capacity'],['Unused uncommitted','unused_uncommitted','Uncommitted capacity']].map(([t,k,eyebrow])=>'<button class="ch-card pal-metric" data-pal-rows="'+k+'" data-title="'+t+'"><span class="pal-metric-heading"><small>'+eyebrow+'</small><span>'+t+'</span></span><span class="pal-metric-label">Balance · USD</span><span class="pal-metric-value"><strong>'+money(sum(rows,k))+'</strong>'+variance(rows,k,report)+'</span><small class="pal-metric-date">'+(report?'vs '+esc(previousWeekday(report))+' · previous weekday':'No snapshot')+'</small></button>').join('')+'</div>';for(const k of ['tfa','total_os','unused_commitment','unused_uncommitted'])details[k]=rows;
  if(ctx.state().product==='Securities Based Lending')html+=sblHTML(sbl);
  const currentDeals=rows.filter(r=>r['pal_new_'+settings.dealPeriod]),priorDeals=rows.filter(r=>r['pal_prior_'+settings.dealPeriod]),priorLabel=priorLabels[settings.dealPeriod];
  html+=card('facilityTrendChart','CAs & Facilities Expiring','Reporting month + next two months · distinct relationships / facilities')+card('creditClassificationChart','New Facilities Approved','First approval date · NAM, LATAM and EMEA',segments('approvalPeriod','Approval period'))+snapshot(rows);
  html+=card('newDealsChart','New deals','Non-PSE · origination date, with renewal fallback',segments('dealPeriod','New deals period')).replace('<div id="newDealsChart"',
   '<div class="pal-deal-totals"><div><span>Current period</span><strong>'+num(unique(currentDeals,'facility_id'))+' <small>facilities</small></strong><span>'+money(sum(currentDeals,'tfa'))+' TFA</span></div><div><span>'+priorLabel+'</span><strong>'+num(unique(priorDeals,'facility_id'))+' <small>facilities</small></strong><span>'+money(sum(priorDeals,'tfa'))+' TFA</span></div></div><div id="newDealsChart"');
  html+='<section class="ch-card pal-table-card" id="pal-pipeline" data-table-mode="summary"><div class="ch-card-head"><div><h2>Deals Pending Closure</h2><p class="ch-card-sub">NAM / LATAM · '+periods.find(p=>p[0]===settings.pendingPeriod)[1]+' first approvals · '+num(pending.length)+' facilities</p></div><button class="pal-detail" data-pal-detail="pipeline">View data ↗</button></div>'+segments('pendingPeriod','Pending closure approval period')+simpleTable(['Days since approval','Facilities','TFA'],['1-30','31-60','61-90','>90'].map(b=>{const rs=pending.filter(r=>r.pal_pipeline_bucket===b);details['pipe'+b]=rs;return summaryRow(['<button class="ch-row-link" data-pal-rows="pipe'+b+'" data-title="Pending closure '+b+' days">'+esc(b)+' days</button>',num(rs.length),money(sum(rs,'tfa'))],rs,'Pending closure '+b+' days');}).concat([summaryRow(['Total',num(pending.length),money(sum(pending,'tfa'))],pending,'All pending closures')]),'pipeline')+'</section>';details['pal-pipeline']=details.pipeline=pending;
  html+='<div class="pal-section-head"><div><h2>Relationship performance</h2><p class="ch-card-sub">Exposure bars and ROTCE markers use the same ranked relationships.</p></div><div class="ch-actions">'+select('measure','Rank by',Object.entries(measures))+select('top','Top relationships',[[5,'Top 5'],[10,'Top 10'],[20,'Top 20']])+'</div></div>'+card('relationshipChart','Top Relationships & ROTCE',measures[settings.measure]+' · USD bars / ROTCE markers · '+(by(rows,'rotce_period').length>1?'Mixed source periods':rows.find(r=>r.rotce_period)?.rotce_period||'ROTCE period unavailable'));
  html+=card('monitoringPriorityChart','Monitoring priorities','Six monitoring areas · shared filters');
  html+='<div class="ch-grid equal">'+card('covenantMonitoringChart',settings.covenants==='past'?'Past Due Covenants':'Coming Due Covenants','1–30, 31–45, 46–60, 61–90 and over 90 days',segments('covenants','Covenant view',[['past','Past due'],['coming','Coming due']]))+card('ccmRegionalChart','Criticized/Classified Memos & Reviews','Source CCM status by region · source dates retained')+'</div>';
  html+=trendTable(trendRows());ctx.commitContent?ctx.commitContent(html):$('#ch-content').innerHTML=html;
  root._exportRows=rows;
  $('#ch-download').disabled=!rows.length;
  $('#ch-download').title='Download the filtered portfolio as CSV';
  const dealProducts=by([...currentDeals,...priorDeals],'product').sort();
  chart('newDealsChart','bar',dealProducts,[{name:'Current period',color:COLORS[0],data:dealProducts.map(product=>{const rs=currentDeals.filter(r=>r.product===product);return{y:unique(rs,'facility_id'),custom:{rows:rs,count:unique(rs,'facility_id')}};})},{name:priorLabel,color:COLORS[5],data:dealProducts.map(product=>{const rs=priorDeals.filter(r=>r.product===product);return{y:unique(rs,'facility_id'),custom:{rows:rs,count:unique(rs,'facility_id')}};})}],rows.filter(r=>r['pal_new_'+settings.dealPeriod]||r['pal_prior_'+settings.dealPeriod]),{kind:'count',height:280});
  if(ctx.state().product==='Securities Based Lending')sblCharts(sbl);
  const base=new Date((month||'2026-01')+'-01T00:00:00Z');const months=[0,1,2].map(i=>new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+i,1)).toISOString().slice(0,7));
  chart('facilityTrendChart','column',months,[{name:'CAs coming due',color:COLORS[0],data:months.map(m=>{const rs=rows.filter(r=>r.pal_ca_month===m);return{y:unique(rs,'relationship_id'),custom:{rows:rs}};})},{name:'Facilities expiring',color:COLORS[1],data:months.map(m=>{const rs=rows.filter(r=>r.pal_facility_month===m);return{y:unique(rs,'facility_id'),custom:{rows:rs}};})}],rows.filter(r=>r.pal_ca_month||r.pal_facility_month));
  headline('facilityTrendChart',[[num(unique(rows.filter(r=>months.includes(r.pal_ca_month)),'relationship_id')),'Distinct CA relationships · 3 months'],[num(unique(rows.filter(r=>months.includes(r.pal_facility_month)),'facility_id')),'Distinct facilities · 3 months']]);
  headline('creditClassificationChart',[[num(approved.length),'Approved facilities'],[money(sum(approved,'tfa')),'Approved TFA · USD']]);
  chart('creditClassificationChart','pie',[],[{name:'New facilities',data:points(approved,'product')}],approved);
  headline('relationshipChart',[[money(rels.reduce((n,r)=>n+r.value,0)),'Top '+settings.top+' · '+measures[settings.measure]],[sum(rows,settings.measure)?pct(rels.reduce((n,r)=>n+r.value,0)/sum(rows,settings.measure)):'—','Share of selected exposure'],[num(rels.filter(r=>r.rotce!==null&&r.rotce<.12).length),'Below 12% target'],[num(rels.filter(r=>r.rotce!==null).length)+' / '+num(rels.length),'Relationships with ROTCE']]);
  const names=rels.map((r,i)=>(i+1)+'. '+r.name),tall=Math.max(400,rels.length*26+140);
  const source=r=>({rows:r.rows,count:r.rows.length,exposure:r.value,rotce:r.rotce});
  chart('relationshipChart','bar',names,[{name:measures[settings.measure]+' · USD',type:'bar',color:COLORS[0],yAxis:0,data:rels.map(r=>({y:r.value,custom:source(r)}))},{name:'ROTCE · %',type:'scatter',color:COLORS[3],yAxis:1,marker:{symbol:'diamond',radius:6,lineColor:'#fff',lineWidth:1.5},data:rels.map(r=>({y:r.rotce,custom:source(r)}))}],rels.flatMap(r=>r.rows),{kind:'money',height:tall,paired:true,axes:[{title:{text:measures[settings.measure]+' · USD',style:{color:COLORS[0],fontSize:'11px'}},min:0,tickAmount:6,gridLineColor:'#E8ECF2',gridLineDashStyle:'Dash',labels:{formatter:function(){return money(this.value);},style:{color:COLORS[0],fontSize:'10px'}}},{title:{text:'ROTCE · %',style:{color:COLORS[3],fontSize:'11px'}},opposite:true,tickInterval:.05,min:Math.min(0,...rels.map(r=>r.rotce??0)),max:Math.max(.2,...rels.map(r=>r.rotce??0)),gridLineWidth:0,labels:{formatter:function(){return pct(this.value);},style:{color:COLORS[3],fontSize:'10px'}},plotLines:[{value:.12,color:COLORS[3],width:1,dashStyle:'Dash',zIndex:5,label:{text:'12% target',rotation:0,y:-7,x:5,style:{color:COLORS[3],fontSize:'10px'}}}]}]});
  const performanceNote=document.createElement('div');performanceNote.className='pal-monitor-insight';
  const knownReturns=rels.filter(r=>r.rotce!==null),belowTarget=knownReturns.filter(r=>r.rotce<.12);
  performanceNote.innerHTML='<strong>'+esc(knownReturns.length?num(belowTarget.length)+' of '+num(knownReturns.length)+' reported relationships are below the 12% ROTCE target.':'No reported ROTCE in the selected relationships.')+'</strong><span>'+esc('Ranked by '+measures[settings.measure]+' · '+num(rels.length-knownReturns.length)+' without ROTCE · Snapshot '+(report||'unavailable'))+'</span>';
  if(!ctx.shouldDraw||ctx.shouldDraw('relationshipChart'))$('#relationshipChart').after(performanceNote);
  const attention=monitor.filter(r=>r.action_required||r.coming_due),actions=monitor.filter(r=>r.action_required),critical=actions.filter(r=>r.critical),upcoming=monitor.filter(r=>!r.action_required&&r.coming_due);
  const domains=Object.keys(MONITOR_AREAS).sort((a,b)=>actions.filter(r=>r.category===b).length-actions.filter(r=>r.category===a).length);
  headline('monitoringPriorityChart',[[num(actions.length),'Actions required'],[num(critical.length),'Critical · included in actions'],[num(upcoming.length),'Upcoming · not yet actionable']]);
  chart('monitoringPriorityChart','bar',domains.map(k=>MONITOR_AREAS[k]),[['Critical actions','#FF5C0B',r=>r.action_required&&r.critical],['Other actions',COLORS[0],r=>r.action_required&&!r.critical],['Upcoming',COLORS[5],r=>!r.action_required&&r.coming_due]].map(([name,color,fn])=>({name,color,data:domains.map(category=>{const rs=attention.filter(r=>r.category===category&&fn(r));return{y:rs.length,custom:{rows:rs,dates:by(monitor.filter(r=>r.category===category),'as_of_date').sort()}};})})),attention,{stacked:true,height:tall,paired:true,onPoint:p=>ctx.openChart('monitoringPriorityChart',p.options.custom.rows,MONITOR_AREAS[domains[p.index]]+' · '+p.series.name)});
  const topArea=domains[0],topActions=actions.filter(r=>r.category===topArea).length;
  const note=document.createElement('div');note.className='pal-monitor-insight';note.innerHTML='<strong>'+esc(actions.length?MONITOR_AREAS[topArea]+': '+num(topActions)+' actions · '+pct(topActions/actions.length)+' of the action queue.':'No action flags in the supplied scope.')+'</strong><span>Obligations, not unique facilities.</span>';
  if(!ctx.shouldDraw||ctx.shouldDraw('monitoringPriorityChart'))$('#monitoringPriorityChart').after(note);
  const past=settings.covenants==='past',aging=global.CreditCovenantAging,cv=past?cov.filter(r=>r.status==='PAST_DUE'||r.pal_covenant_bucket):cov.filter(r=>aging.isComing(r));
  headline('covenantMonitoringChart',[[num(cv.length),past?'Past-due obligations':'Coming-due obligations'],[num(unique(cv,'relationship_id')),'Relationships']]);
  headline('ccmRegionalChart',[[num(ccm.length),'CCM records'],[num(ccm.filter(r=>r.ccm_status==='PAST_DUE').length),'Past due']]);
  const bucket=r=>aging.bucket(r,past)||'Aging not supplied',cp=[...aging.bands,...(cv.some(r=>bucket(r)==='Aging not supplied')?['Aging not supplied']:[])].map((name,i)=>{const rs=cv.filter(r=>bucket(r)===name);return{name,y:rs.length,color:COLORS[i],custom:{rows:rs}};});chart('covenantMonitoringChart','pie',[],[{name:'Covenants',data:cp}],cv);
  const regions=['APAC','EMEA','NAM','LATAM'].filter(r=>ccm.some(x=>x.region===r));chart('ccmRegionalChart','column',regions,['PAST_DUE','COMING_DUE','OPEN'].map((status,i)=>({name:status.replaceAll('_',' '),color:['#FF3C28','#FFCD00','#255BE3'][i],data:regions.map(region=>{const rs=ccm.filter(r=>r.region===region&&r.ccm_status===status);return{y:rs.length,custom:{rows:rs}};})})),ccm,{stacked:true});
  wire();
 }
 function sblHTML(rows){
  const sftRows=[true,false].map(v=>{const rs=rows.filter(r=>r.sft===v),label=v?'SBL SFT':'SBL non-SFT',fields=['tfa','total_os','unused_commitment','unused_uncommitted'],drills=Object.fromEntries(fields.map((field,i)=>[i+1,{id:'metric-'+field,rows:rs}]));drills[5]={id:'sblSpreadCount',rows:rs};return summaryRow([label,...fields.map(k=>money(sum(rs,k))),num(rs.length)],rs,label,drills);});
  return '<section class="ch-card" data-table-mode="summary"><div class="ch-card-head"><div><h2>Securities Based Lending SFT Facility View</h2><p class="ch-card-sub">SFT and non-SFT facilities · selected SBL portfolio</p></div></div>'+simpleTable(['Facility view','TFA','Outstanding','Unused commitment','Unused uncommitted','Facilities'],sftRows,'sft')+'</section>'+spreadTables(rows)+'<div class="ch-grid equal">'+card('sblSpreadCount','Spread distribution — Facilities','SBL with Direct OS > 0 · source spread in bps')+card('sblSpreadOS','Spread distribution — Loan Outstanding','Direct OS by region and spread bucket')+'</div>';
 }
 function spreadTables(rows){
  const regions=['NAM','LATAM','EMEA','APAC'],eligible=rows.filter(r=>r.direct_os>0&&regions.includes(r.region));
  return [null,'direct_os'].map(measure=>{
   const specs=[...regions,'Total'].map(region=>{const rs=region==='Total'?eligible:eligible.filter(r=>r.region===region),value=a=>measure?money(sum(a,measure)):num(a.length),den=sum(rs,'pal_spread_os'),cohorts=[rs,rs.filter(r=>r.pal_pricing_exception),...['<=70','70-125','>125'].map(b=>rs.filter(r=>r.pal_spread_bucket===b))],id=measure?'metric-direct_os':'sblSpreadCount',drills=Object.fromEntries(cohorts.map((rows,i)=>[i+1,{id,rows}]));drills[6]={id:'sblSpreadMean',rows:rs};return summaryRow([region,...cohorts.map(value),den?(sum(rs,'pal_spread_weight')/den).toFixed(1)+' bps':'—'],rs,region,drills);});
   return '<section class="ch-card" data-table-mode="summary"><div class="ch-card-head"><h2>Spread Analysis — '+(measure?'Loan Outstanding':'Facilities Count')+'</h2></div>'+simpleTable(['Region','With loan OS','Pricing exceptions','≤70 bps','>70–125 bps','>125 bps','Mean spread'],specs,measure?'spread-os':'spread-count')+'</section>';
  }).join('');
 }
 function sblCharts(rows){const regions=by(rows,'region');for(const [id,measure]of [['sblSpreadCount',null],['sblSpreadOS','direct_os']])chart(id,'column',regions,['<=70','70-125','>125'].map((b,i)=>({name:b+' bps',color:COLORS[i],data:regions.map(region=>{const rs=rows.filter(r=>r.region===region&&r.pal_spread_bucket===b);return{y:measure?sum(rs,measure):rs.length,custom:{rows:rs}};})})),rows.filter(r=>r.direct_os>0),{stacked:true,kind:measure?'money':'count'});}
 function trendRows(){const st=ctx.state(),data=ctx.data();return (data.history||[]).filter(r=>(!st.region||r.region===st.region)&&(!st.product||r.product===st.product)&&(!settings.pse||String(r.pse)===settings.pse)&&(!settings.commitment||r.commitment===settings.commitment));}
 function trendTable(rows){
  const dates=by(rows,'as_of_date').sort(),recent=dates.slice(-4),latest=dates.at(-1),products=by(rows,'product').sort((a,b)=>sum(rows.filter(r=>r.product===b&&r.as_of_date===latest),settings.trend)-sum(rows.filter(r=>r.product===a&&r.as_of_date===latest),settings.trend));
  const compare=(rs,months)=>{if(!latest)return '—';const d=new Date(latest+'T00:00:00Z'),month=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-months,1)).toISOString().slice(0,7),prev=dates.filter(x=>x.startsWith(month)).at(-1);if(!prev)return '—';const nowRows=rs.filter(r=>r.as_of_date===latest),oldRows=rs.filter(r=>r.as_of_date===prev),old=sum(oldRows,settings.trend);if(!nowRows.length||!oldRows.length||!old)return '—';const delta=(sum(nowRows,settings.trend)-old)/old;return '<span class="pal-trend-delta '+(delta<0?'decrease':'increase')+'">'+(delta>0?'+':'')+pct(delta)+'</span>';};
  const cells=rs=>[...recent.map(d=>rs.some(r=>r.as_of_date===d)?money(sum(rs.filter(r=>r.as_of_date===d),settings.trend)):'—'),compare(rs,1),compare(rs,3),compare(rs,12)];
  const summary=(rs,label)=>{const drills={};recent.forEach((date,i)=>{drills[i+1]={id:'pal-trends',rows:rs.filter(r=>r.as_of_date===date)};});[1,3,12].forEach((months,i)=>{if(!latest)return;const d=new Date(latest+'T00:00:00Z'),month=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()-months,1)).toISOString().slice(0,7),previous=dates.filter(x=>x.startsWith(month)).at(-1);drills[recent.length+i+1]={id:'pal-trends',rows:rs.filter(r=>r.as_of_date===latest||r.as_of_date===previous)};});return summaryRow([esc(label),...cells(rs)],rs,label,drills);};
  const date=d=>new Date(d+'T00:00:00Z').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'});
  const unavailable=ctx.hasDrill?.()||ctx.state().owner_id||ctx.state().team_lead||settings.management||settings.subprogram||settings.facilityType;
  details['pal-trends']=unavailable?[]:rows;
  return '<section id="pal-trends" class="ch-card pal-table-card cw-framed-card" data-table-mode="summary"><div class="ch-card-head"><div><h2>Trend Analysis by Region & Product</h2><p class="ch-card-sub">Period-over-period growth and current portfolio values · USD</p></div><div class="ch-actions pal-trend-controls">'+trendTabs('trend','Exposure',[['tfa','TFA'],['osuc','OSUC'],['total_os','Outstanding']])+trendTabs('pse','PSE',[['','All'],['true','PSE'],['false','Non-PSE']])+trendTabs('commitment','Commitment',[['','All'],['COMMITTED','Committed'],['UNCOMMITTED','Uncommitted']])+method('pal-trends','Trend Analysis by Region & Product')+'</div></div><div class="pal-trends-table">'+(unavailable?'<p class="ch-empty">Historical aggregates do not contain the selected facility IDs, owner, team or facility attributes. Clear those filters to compare regional/product history.</p>':!rows.length?'<p class="ch-empty">No historical snapshots match these filters.</p>':simpleTable(['Product category',...recent.map(date),'MoM variance','QoQ variance','YoY variance'],products.map(p=>summary(rows.filter(r=>r.product===p),p)).concat([summary(rows,'Total')]),'trends'))+'</div></section>';
 }
 function trends(rows){$('#ch-content').innerHTML=trendTable(rows);wire();}
 function deepdive(rows){
  details={};const relationships=by(rows,'relationship_id').map(id=>[id,rows.find(r=>r.relationship_id===id).relationship_name]);if(settings.relationship&&!relationships.some(([id])=>id===settings.relationship))settings.relationship='';
  const rs=settings.relationship?rows.filter(r=>r.relationship_id===settings.relationship):[],monitor=filtered(ctx.data().monitoring).filter(r=>r.relationship_id===settings.relationship),cov=monitor.filter(r=>r.category==='COVENANTS'),ccm=monitor.filter(r=>r.category==='CCM');
  const suggestions=[...relationships].sort((a,b)=>(a[0]==='R0033'?-1:b[0]==='R0033'?1:0)).slice(0,3);
  const picker='<section class="ch-card pal-relationship-picker">'+select('relationship','Relationship',[['','Search and select a relationship'],...relationships.map(([id,name])=>[id,id+(name?' – '+name:'')])]).replace('data-pal-setting="relationship"','data-searchable data-pal-setting="relationship"')+'</section>';
  const cmp=global.CreditSnapshots?.compare(ctx.data(),['PORTFOLIO'])||{ready:false,prior:[],reason:'Previous release unavailable'},prev=filtered(cmp.prior).filter(r=>r.relationship_id===settings.relationship),facilities=xs=>new Set(xs.map(r=>JSON.stringify([r.region,r.relationship_id,r.facility_id]))).size;
  const note=key=>{if(!cmp.ready)return cmp.reason;const now=key==='count'?facilities(rs):sum(rs,key),old=key==='count'?facilities(prev):sum(prev,key);const d=global.CreditCovenantRisk.delta(now,old,true),sign=d.change>0?'+':d.change<0?'−':'';return (key==='count'?d.text:(d.percent===null?'New balance':sign+Math.abs(d.percent).toFixed(1)+'%')+' ('+sign+money(Math.abs(d.change))+')')+' '+cmp.label;};
  let html=picker;
  if(rs.length){
   const rotces=[...new Set(rs.map(r=>r.rotce).filter(v=>typeof v==='number'))],rotce=rotces.length===1?rotces[0]:null;
   html+='<div class="pal-relationship-banner"><div><h2>'+esc(rs[0].relationship_name)+'</h2><span>Relationship ID '+esc(settings.relationship)+'</span></div><span>'+esc(by(rs,'region').join(' · '))+' · '+num(facilities(rs))+' facilities</span></div>';
   html+=kpis([{title:'Total facility amount',value:money(sum(rs,'tfa')),note:note('tfa')},{title:'OSUC',value:money(sum(rs,'osuc')),note:note('osuc')},{title:'Outstanding',value:money(sum(rs,'total_os')),note:note('total_os')},{title:'Facilities',value:num(facilities(rs)),note:note('count')},{title:'ROTCE',value:rotce===null?'—':pct(rotce),note:rotces.length>1?'Mixed supplied ROTCE values':rs.find(r=>r.rotce_period)?.rotce_period||'Source period unavailable'}]);
   html+='<section id="pal-deep-presence" class="ch-card pal-card cw-framed-card"><div class="ch-card-head"><div><h2>Exposure by Region</h2><p class="ch-card-sub">TFA and OSUC · USD · '+by(rs,'region').length+' regions</p></div></div><div id="palDeepRegion" class="ch-chart"></div><div class="pal-region-owners">'+by(rs,'region').map(region=>{const rr=rs.filter(r=>r.region===region);return '<div><strong>'+esc(region)+'</strong><span>'+esc(by(rr,'owner_name').join(', ')||'Underwriter not supplied')+'</span><small>'+facilities(rr)+' '+(facilities(rr)===1?'facility':'facilities')+'</small></div>';}).join('')+'</div></section>';
   html+=card('palDeepProduct','Exposure by Product','Total facility amount · USD · selected relationship');

   const cas=unique(rs,'ca_id'),expiredCas=unique(rs.filter(r=>r.pal_ca_expired),'ca_id'),indicators=[['CAs expired',expiredCas,cas,'caexpired',rs.filter(r=>r.pal_ca_expired)],['Facilities expired',facilities(rs.filter(r=>r.pal_facility_expired)),facilities(rs),'expired',rs.filter(r=>r.pal_facility_expired)],['Past due covenants',cov.filter(r=>r.status==='PAST_DUE').length,cov.length,'deep-cov',cov.filter(r=>r.status==='PAST_DUE')],['Past due CCMs',ccm.filter(r=>r.ccm_status==='PAST_DUE').length,ccm.length,'deep-ccm',ccm.filter(r=>r.ccm_status==='PAST_DUE')]];
   html+='<section id="pal-deep-performance" class="ch-card pal-card cw-framed-card"><div class="ch-card-head"><div><h2>Performance Indicators</h2><p class="ch-card-sub">Exceptions within the supplied relationship population</p></div>'+method('pal-deep-performance','Performance Indicators')+'</div><div class="pal-performance-list pal-risk-tiles">'+indicators.map(([title,n,total,key,records])=>{details[key]=records;return '<button data-pal-rows="'+key+'" data-title="'+title+'"><span>'+title+'</span><strong>'+num(n)+' <small>/ '+num(total)+'</small></strong><span class="pal-risk-status '+(n?'has-exceptions':total?'no-exceptions':'no-population')+'">'+(n?'Review required':total?'No exceptions':'Not supplied')+'</span><small>'+ (total?pct(n/total)+' of population':'No supplied population')+'</small></button>';}).join('')+'</div></section>';
   const isCov=settings.deepTab==='covenants',cols=isCov?[['region','Region'],['covenant_id','Covenant'],['relationship_id','Relationship ID'],['facility_id','Facility ID'],['owner_name','Underwriter'],['status','Status','badge'],['effective_due_date','Effective due'],['source_aging_bucket','Aging'],['days_past_due','Days past due','n']]:[['region','Region'],['facility_id','Facility ID'],['product','Product program'],['product_subprogram','Sub-product'],['management_status','Management'],['sft','SFT'],['maturity_date','Maturity'],['tfa','TFA','m'],['direct_os','Direct OS','m'],['contingent_os','Contingent OS','m'],['pse_os','PSE OS','m'],['total_unused','Total unused','m'],['osuc','OSUC','m'],['owner_name','Underwriter'],['banker_name','Banker']];
   const records=isCov?cov:rs.map(r=>({...r,total_unused:(r.unused_commitment||0)+(r.unused_uncommitted||0)}));
   details['ch-register']=records;
   methods['ch-register']=['Facility details reproduce PAL region, facility, product, management, SFT, maturity and balance columns. Total unused equals unused commitment plus unused uncommitted.','Covenants retains each source covenant–facility association, exact relationship ID and original due/aging fields. Search and filters apply before pagination.'];
   html+=register(isCov?'Relationship covenants':'Facility details',records,cols);
  }else html+='<section class="ch-card cw-framed-card pal-deep-empty" aria-labelledby="pal-deep-empty-title"><div class="pal-deep-empty-content"><svg class="pal-deep-illustration" viewBox="0 0 160 140" fill="none" aria-hidden="true"><ellipse cx="85" cy="125" rx="47" ry="7" fill="currentColor" opacity=".05"/><rect x="30" y="18" width="72" height="91" rx="13" stroke="currentColor" opacity=".14"/><rect x="43" y="25" width="72" height="91" rx="13" fill="white" stroke="currentColor" opacity=".28"/><rect x="56" y="32" width="72" height="91" rx="13" fill="white" stroke="currentColor" opacity=".5"/><circle cx="90" cy="67" r="11" stroke="currentColor" stroke-width="2"/><path d="M73 99v-5a17 17 0 0 1 34 0v5M115 48h5m-2.5-2.5v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><h2 id="pal-deep-empty-title">'+(relationships.length?'Explore a relationship':'No relationships in this scope')+'</h2><p>'+(relationships.length?'Search by name or relationship ID to see balances, regional coverage, risk indicators and linked facility and covenant records.':'Adjust the page filters to include a relationship. This view uses the facilities in the prepared portfolio snapshot.')+'</p>'+(suggestions.length?'<button type="button" class="ch-btn cw-primary" data-deep-open="'+esc(suggestions[0][0])+'">Open '+esc(suggestions[0][0])+global.CreditIcons.icon('arrow')+'</button><div class="pal-deep-suggestions"><span>Or try a relationship</span>'+suggestions.map(([id,name])=>'<button type="button" data-deep-open="'+esc(id)+'"><strong>'+esc(id)+'</strong><span>'+esc(name)+'</span></button>').join('')+'</div>':'')+'</div></section>';
  ctx.commitContent?ctx.commitContent(html):$('#ch-content').innerHTML=html;
  if(rs.length){
   methods.palDeepRegion=['Sum TFA and OSUC independently by booking region for the selected relationship ID. These balances overlap and are not stacked or added together.','Uses current page filters and supplied facility records. Underwriters are the source owner names; missing values are not inferred.'];methods.palDeepProduct=['Sum facility TFA by product program for the selected relationship ID. Slice share is product TFA divided by selected relationship TFA.','Product totals reconcile to the TFA KPI. Selection and shared filters apply to chart data, drill-through records and export.'];
   const regions=by(rs,'region');chart('palDeepRegion','bar',regions,[['tfa','TFA',COLORS[0]],['osuc','OSUC','#73C2FC']].map(([key,name,color])=>({name,color,data:regions.map(region=>{const rr=rs.filter(r=>r.region===region);return {y:sum(rr,key),custom:{rows:rr,count:facilities(rr)}};})})),rs,{kind:'money',height:260});
   chart('palDeepProduct','pie',[],[{name:'TFA',data:points(rs,'product','tfa')}],rs,{kind:'money',height:310});
  }
  if(rs.length){const toolbar=$('#ch-register .ch-register-controls');toolbar.prepend(Object.assign(document.createElement('div'),{className:'pal-segments',role:'group',innerHTML:[['facilities','Facility details'],['covenants','Covenants']].map(([v,t])=>'<button data-deep-tab="'+v+'" aria-pressed="'+((settings.deepTab==='covenants'?'covenants':'facilities')===v)+'">'+t+'</button>').join('')}));$('#ch-register .ch-toolbar').insertAdjacentHTML('beforeend',method('ch-register','Relationship records'));}
  if(rs.length)root.querySelectorAll('.ch-kpi-note').forEach(el=>{if(el.querySelector('.cov-variance'))return;const text=el.textContent,match=text.match(/^([+−-]?\d[^]*?) (vs .+)$/);if(!match)return;const pill=document.createElement('span');pill.className='cov-variance '+(/^[−-]/.test(match[1])?'decrease':/^\+/.test(match[1])?'increase':'unchanged');pill.textContent=match[1];const date=document.createElement('small');date.className='cov-comparison-note';date.textContent=match[2];el.replaceChildren(pill,date);});
  wire();root.querySelectorAll('[data-deep-tab]').forEach(b=>b.onclick=()=>{settings.deepTab=b.dataset.deepTab;const run=()=>{ctx.resetTable?.();return ctx.render(['ch-register']);};global.CreditControls?global.CreditControls.run(b,run):run();});
  const choose=id=>{settings.relationship=id;settings.deepTab='facilities';ctx.resetTable?.();return ctx.render();};
  root.querySelectorAll('[data-deep-open]').forEach(b=>b.onclick=()=>choose(b.dataset.deepOpen));
  root.querySelector('[data-deep-clear]')?.addEventListener('click',()=>choose(''));

 }
 return{overview,trends,deepdive,settings,getMethod:id=>methods[id],getRows:id=>Object.hasOwn(details,id.replace(/^metric-/,''))?details[id.replace(/^metric-/,'')]:null,getAnalysis:()=>({settings:{...settings},products:by(ctx.data().portfolio||[],'product').sort(),portfolio:filterRows(filtered(ctx.data().portfolio||[])),monitoring:ctx.monitoringRows?ctx.monitoringRows():filtered(ctx.data().monitoring||[])}),filterFields,filterRows,reset(){for(const k of ['management','subprogram','portfolioPse','portfolioCommitment','facilityType','pse','commitment','relationship'])settings[k]='';}};
};
})(window);

;
/* Covenant comparisons and exact-grain facility attribution. No estimated history. */
(function(global){'use strict';
const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const previousWeekday=s=>{if(!validDate(s))return null;const d=new Date(s+'T00:00:00Z');do{d.setUTCDate(d.getUTCDate()-1);}while([0,6].includes(d.getUTCDay()));return d.toISOString().slice(0,10);};
const banker=r=>String(r?.banker_name||r?.Banker_Name||r?.['Banker Name']||r?.Banker||r?.['Relationship Manager']||'').trim();
const sameScope=(r,f)=>['region','owner_id','team_lead','product'].every(k=>!f[k]||r[k]===f[k]);
function validateHistory(payload){
 if(!payload||!Array.isArray(payload.rows)||!Array.isArray(payload.snapshots))throw Error('Invalid covenant history payload');
 const dates=new Set();for(const s of payload.snapshots){
  if(s.complete!==true||!Array.isArray(s.sources)||!s.sources.length||!validDate(s.as_of_date)||dates.has(s.as_of_date))throw Error('Invalid or duplicate covenant snapshot');dates.add(s.as_of_date);
  const ids=new Set();for(const c of s.sources){if(!c.source_id||ids.has(c.source_id)||!['ALL_OBLIGATIONS','EXCEPTIONS_ONLY'].includes(c.coverage)||!Number.isInteger(c.record_count)||c.record_count<0)throw Error('Invalid covenant source control');ids.add(c.source_id);}
  const rows=payload.rows.filter(r=>r.as_of_date===s.as_of_date),keys=new Set();for(const r of rows){if(r.category!=='COVENANTS'||!ids.has(r.source_id)||!r.item_id||keys.has(r.item_id)||!r.status)throw Error('Invalid covenant history row');keys.add(r.item_id);}
  for(const c of s.sources)if(rows.filter(r=>r.source_id===c.source_id).length!==c.record_count)throw Error('Covenant snapshot count mismatch');
 }
 if(payload.snapshots.some(s=>s.portfolio_sources)&&!Array.isArray(payload.portfolio_rows))throw Error('Historical portfolio rows missing');
 if(payload.portfolio_rows){
  if(!Array.isArray(payload.portfolio_rows))throw Error('Invalid historical portfolio');
  for(const snap of payload.snapshots){if(snap.portfolio_sources){const ps=payload.portfolio_rows.filter(r=>r.as_of_date===snap.as_of_date);if(!portfolioReconciles(ps,snap.portfolio_sources,snap.as_of_date))throw Error('Historical portfolio reconciliation failed');}}
  if(payload.portfolio_rows.some(r=>!payload.snapshots.some(s=>s.as_of_date===r.as_of_date&&s.portfolio_sources)))throw Error('Uncontrolled historical portfolio');
 }
 if(payload.rows.some(r=>!dates.has(r.as_of_date)))throw Error('Uncontrolled covenant history date');return payload;
}
function comparison(current,sources,history,filters={}){
 const controls=sources.filter(s=>s.domain==='COVENANTS'),dates=[...new Set(controls.map(s=>s.as_of_date))];
 const fail=reason=>({ready:false,reason,prior:[]});
 if(new Set(controls.map(s=>s.source_id)).size!==controls.length)return fail('Duplicate source controls');
 if(!controls.length||dates.length!==1||!validDate(dates[0]))return fail('Comparable source date unavailable');
 const asOf=dates[0],priorDate=previousWeekday(asOf),snapshot=history?.snapshots?.find(s=>s.as_of_date===priorDate);
 if(!snapshot?.complete)return fail('Previous weekday snapshot unavailable');
 const ids=controls.map(s=>s.source_id).sort();
 if(ids.join('|')!==snapshot.sources.map(s=>s.source_id).sort().join('|')||controls.some(c=>snapshot.sources.find(s=>s.source_id===c.source_id)?.coverage!==c.coverage))return fail('Source coverage changed');
 if(controls.some(c=>current.filter(r=>r.source_id===c.source_id&&r.as_of_date===asOf).length!==c.record_count)||current.some(r=>r.as_of_date!==asOf||!ids.includes(r.source_id))||new Set(current.map(r=>r.item_id)).size!==current.length)return fail('Current source reconciliation failed');
 return {ready:true,asOf,priorDate,prior:history.rows.filter(r=>r.as_of_date===priorDate&&sameScope(r,filters)).map((r,i)=>global.CreditCovenantsData.normalize(r,i))};
}
function delta(current,prior,ready=true){if(!ready||!Number.isFinite(current)||!Number.isFinite(prior))return {ready:false,text:'Comparison unavailable'};const change=current-prior;return{ready:true,current,prior,change,percent:prior?change/Math.abs(prior)*100:null,text:prior===0?(current===0?'No change':'New ('+(change>0?'+':'')+change.toLocaleString('en-US')+')'):(change===0?'0.0% (0)':(change>0?'+':'−')+Math.abs(change/prior*100).toFixed(1)+'% ('+(change>0?'+':'−')+Math.abs(change).toLocaleString('en-US',{maximumFractionDigits:1})+')')};}
const present=v=>v!=null&&String(v).trim()!=='';
const facilityKey=r=>['region','relationship_id','facility_id'].every(k=>present(r[k]))?JSON.stringify([r.region,r.relationship_id,r.facility_id]):null;
function facilities(rows,portfolio){
 const groups=new Map();let missing=0;
 for(const r of rows){const key=facilityKey(r);if(!key){missing++;continue;}if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 const byKey=new Map();for(const p of portfolio){const k=facilityKey(p);if(k){if(!byKey.has(k))byKey.set(k,[]);byKey.get(k).push(p);}}
 const result=[];for(const [key,rs]of groups){const r=rs[0],dates=[...new Set(rs.map(x=>x.as_of_date))],cas=[...new Set(rs.map(x=>x.ca_id).filter(present))];
  const candidates=(byKey.get(key)||[]).filter(p=>dates.length===1&&validDate(dates[0])&&p.as_of_date===dates[0]);
  let reason=dates.length!==1?'Mixed covenant dates':!candidates.length?'No same-date portfolio match':candidates.length>1?'Ambiguous portfolio match':cas.length>1?'Multiple covenant CA identifiers':cas.length&&candidates[0].ca_id&&cas[0]!==candidates[0].ca_id?'CA identifier mismatch':'Matched';
  const p=reason==='Matched'?candidates[0]:null,usd=p?.reporting_currency==='USD',known=k=>usd&&typeof p[k]==='number'&&Number.isFinite(p[k])?p[k]:null;
  const overdue=rs.filter(x=>x.status==='PAST_DUE'),over90=overdue.filter(x=>global.CreditCovenantsData.age(x)==='>90');
  const rec={facility_id:r.facility_id,relationship_id:r.relationship_id,relationship_name:(r.relationship_name&&r.relationship_name!==r.relationship_id?r.relationship_name:p?.relationship_name)||r.relationship_name,region:r.region,ca_id:cas.join(', '),product:p?.product||[...new Set(rs.map(x=>x.product).filter(present))].sort().join(', '),owner_name:[...new Set(rs.map(x=>x.owner_name))].join(', '),banker_name:[...new Set([banker(p),...rs.map(banker)].filter(Boolean))].join(', ')||null,covenant_ids:[...new Set(rs.map(x=>x.covenant_id).filter(present))].join(', '),covenant_numbers:new Set(rs.map(x=>x.covenant_id).filter(present)).size,as_of_date:dates.join(', '),covenants:rs.length,past_due:overdue.length,coming_due:rs.filter(x=>x.status==='COMING_DUE').length,over_90:over90.length,match_status:reason,tfa_usd:known('tfa'),osuc_usd:known('osuc'),outstanding_usd:known('total_os'),direct_os_usd:known('direct_os'),portfolio_classification:p?.classification||null,portfolio_risk_category:p?.risk_category||null,portfolio_facility_type:p?.facility_type||null,portfolio_management_status:p?.management_status||null,portfolio_commitment:p?.commitment||null,portfolio_rotce:p?.rotce??null,portfolio_pricing_exception:p?.pricing_exception||null,contingent_os_usd:known('contingent_os'),unused_commitment_usd:known('unused_commitment'),maturity_date:p?.maturity_date||null,portfolio_source_id:p?.source_id||null,portfolio_facility_key:p?.facility_key||null,reporting_currency:p?.reporting_currency||null,risk_state:over90.length?'Over 90 days':overdue.length?'Other past due':rs.some(x=>x.status==='COMING_DUE')?'Coming due only':'Other status'};
  result.push({record:rec,rows:rs,portfolio:p});
 }
 const records=result.map(g=>g.record),lookup=new Map(result.map(g=>[facilityKey(g.rows[0]),g.record]));
 const links=rows.map(r=>{const f=lookup.get(facilityKey(r));return {...r,relationship_name:(r.relationship_name&&r.relationship_name!==r.relationship_id?r.relationship_name:f?.relationship_name)||r.relationship_name,banker_name:f?.banker_name||banker(r)||null,tfa_usd:f?.tfa_usd??null,osuc_usd:f?.osuc_usd??null,match_status:f?.match_status||'Missing facility key',portfolio_facility_key:f?.portfolio_facility_key||null,reporting_currency:f?.reporting_currency||null};});
 return{groups:result,missing,records,links};
}
function portfolioReconciles(rows,controls,date){
 if(!Array.isArray(controls)||!controls.length||new Set(controls.map(s=>s.source_id)).size!==controls.length)return false;
 const ids=new Set(controls.map(s=>s.source_id)),keys=new Set();
 if(rows.some(r=>{if(r.as_of_date!==date||!ids.has(r.source_id)||!r.facility_key||keys.has(r.facility_key))return true;keys.add(r.facility_key);return false;}))return false;
 return controls.every(s=>(!s.as_of_date||s.as_of_date===date)&&['ALL_OBLIGATIONS','EXCEPTIONS_ONLY'].includes(s.coverage)&&Number.isInteger(s.record_count)&&s.record_count===rows.filter(r=>r.source_id===s.source_id).length);
}
function amounts(facilitySet){
 const seen=new Set(),eligible=facilitySet.groups.filter(g=>{if(!g.portfolio)return false;const k=g.portfolio.facility_key||facilityKey(g.record);if(seen.has(k))return false;seen.add(k);return true;});
 const metric=field=>{const known=eligible.filter(g=>Number.isFinite(g.record[field])),total=known.reduce((n,g)=>n+g.record[field],0),complete=!facilitySet.missing&&facilitySet.records.every(r=>Number.isFinite(r[field]));return{value:known.length||!facilitySet.records.length&&!facilitySet.missing?total:null,complete,known:known.length,facilities:facilitySet.records.length,missingLinks:facilitySet.missing};};
 return {tfa:metric('tfa_usd'),osuc:metric('osuc_usd')};
}
function exposureComparison(currentRows,portfolio,sources,history,cmp){
 const current=amounts(facilities(currentRows,portfolio)),fail=reason=>({ready:false,reason,current,prior:null});
 if(!cmp.ready)return fail(cmp.reason);
 const snap=history?.snapshots.find(s=>s.as_of_date===cmp.priorDate),priorPortfolio=(history?.portfolio_rows||[]).filter(r=>r.as_of_date===cmp.priorDate),controls=sources.filter(s=>s.domain==='PORTFOLIO');
 if(!snap?.portfolio_sources)return fail('Previous weekday facility balances unavailable');
 if(!portfolioReconciles(portfolio,controls,cmp.asOf)||!portfolioReconciles(priorPortfolio,snap.portfolio_sources,cmp.priorDate))return fail('Portfolio source reconciliation unavailable');
 if(controls.map(c=>c.source_id+':'+c.coverage).sort().join('|')!==snap.portfolio_sources.map(c=>c.source_id+':'+c.coverage).sort().join('|'))return fail('Portfolio coverage changed');
 const prior=amounts(facilities(cmp.prior,priorPortfolio));
 return {ready:true,current,prior,priorDate:cmp.priorDate,reason:'Incomplete facility linkage or USD balances'};
}
global.CreditCovenantRisk={amounts,exposureComparison,portfolioReconciles,banker,previousWeekday,validateHistory,comparison,delta,facilityKey,facilities};
})(window);

;
/* A prior release is data, never an estimated percentage. */
(function(g){'use strict';
const weekday=d=>g.CreditCovenantRisk.previousWeekday(d);
const scope=(rs,f)=>rs.filter(r=>['region','owner_id','team_lead','product'].every(k=>!f[k]||r[k]===f[k]));
function validate(p,validateRows){
 if(!p||!p.datasets)throw Error('Previous release datasets missing');
 for(const k of ['monitoring','portfolio','activity','sources'])validateRows(k,p.datasets[k]);
 const d=p.datasets,map=new Map(d.sources.map(s=>[s.source_id,s]));
 for(const [kind,domain] of [['monitoring',null],['portfolio','PORTFOLIO'],['activity','ACTIVITY']]){
  for(const r of d[kind]){const s=map.get(r.source_id);if(!s||s.as_of_date!==r.as_of_date||s.domain!==(domain||r.category))throw Error('Previous source/date/domain mismatch');}
  for(const s of d.sources.filter(s=>domain?s.domain===domain:!['PORTFOLIO','ACTIVITY'].includes(s.domain)))if(d[kind].filter(r=>r.source_id===s.source_id).length!==s.record_count)throw Error('Previous source count mismatch');
 }
 return p;
}
function compare(data,domains,filters={}){
 const fail=reason=>({ready:false,reason,prior:[],priorPortfolio:[],priorSources:[],label:'Prior weekday unavailable'}),p=data.previous?.datasets;
 if(!p)return fail(data.previousError||'Previous release unavailable');
 const controls=data.sources.filter(s=>domains.includes(s.domain)),previous=p.sources.filter(s=>domains.includes(s.domain));
 if(!controls.length||controls.length!==previous.length||new Set(controls.map(s=>s.source_id)).size!==controls.length)return fail('Source coverage changed');
 for(const c of controls){const old=previous.find(s=>s.source_id===c.source_id);if(!old||old.coverage!==c.coverage||old.domain!==c.domain)return fail('Source coverage changed');if(old.as_of_date!==weekday(c.as_of_date))return fail('Previous weekday missing for '+c.source_id);}
 const rs=domains.includes('ACTIVITY')?p.activity:domains.includes('PORTFOLIO')?p.portfolio:p.monitoring.filter(r=>domains.includes(r.category));
 const ds=[...new Set(previous.map(s=>s.as_of_date))].sort();
 return {ready:true,prior:scope(rs,filters),priorPortfolio:p.portfolio,priorSources:p.sources,label:ds.length===1?'vs '+ds[0]:'vs previous source weekdays',reason:''};
}
function covenantHistory(data){const p=data.previous?.datasets;if(!p)return null;const controls=p.sources.filter(s=>s.domain==='COVENANTS'),dates=[...new Set(controls.map(s=>s.as_of_date))];if(dates.length!==1)return null;const date=dates[0],port=p.sources.filter(s=>s.domain==='PORTFOLIO');return{rows:p.monitoring.filter(r=>r.category==='COVENANTS'),portfolio_rows:p.portfolio.filter(r=>r.as_of_date===date),snapshots:[{as_of_date:date,complete:true,sources:controls,...(port.length&&port.every(s=>s.as_of_date===date)?{portfolio_sources:port}:{})}]};}
g.CreditSnapshots={validate,compare,scope,covenantHistory};
})(window);

;
/* Shared portfolio-style monitoring and activity analysis. */
(function(g){'use strict';
const names={CA:'CA expiration',FACILITY:'Facility maturity',CCM:'CCM',INSURANCE:'Insurance',APPRAISALS:'Appraisals',COVENANTS:'Covenants'},colors=['#255BE3','#73C2FC','#00AF68','#E5A824','#8E319C','#FF5C0B'];
const count=(rs,k)=>new Set(rs.map(r=>r[k]).filter(Boolean)).size,actions=r=>r.action_required===true;
const nice=s=>names[s]||(['NAM','LATAM','EMEA','APAC','USD','CCM'].includes(s)?s:null)||(/^[A-Z_]+$/.test(String(s))?String(s).replaceAll('_',' ').toLowerCase().replace(/^./,c=>c.toUpperCase()):String(s||'Not supplied'));
const group=(rs,key)=>{const m=new Map();for(const r of rs){const k=typeof key==='function'?key(r):r[key]||'Not supplied';if(!m.has(k))m.set(k,[]);m.get(k).push(r);}return [...m].map(([name,rows])=>({name,rows,y:rows.length})).sort((a,b)=>b.y-a.y||String(a.name).localeCompare(String(b.name)));};
const age=r=>{if(!r.action_required)return 'Not past due';const n=r.days_past_due;return !Number.isFinite(n)||n<=0?'Aging not supplied':n<=30?'1–30':n<=45?'31–45':n<=60?'46–60':n<=90?'61–90':'>90';};
const deferredBand=r=>{const n=r.cumulative_deferred_days;return !Number.isFinite(n)||n<0?'Not supplied':n===0?'0 days':n<=30?'1–30 days':n<=60?'31–60 days':n<=90?'61–90 days':'>90 days';};
const activityRule='Covenant Compliance supplies the activity type. Maker Date supplies the activity month; it is not the deferred deadline. Deferred events record a deferral, not completion or clearance. Covenant Deferred Date is the supplied deferred deadline; it does not alone establish approval. Cumulative Deferred Days is used only when explicitly supplied. Events may repeat a covenant.';
const aging=rs=>['1–30','31–45','46–60','61–90','>90','Aging not supplied'].map(name=>({name,rows:rs.filter(r=>age(r)===name)})).map(p=>({...p,y:p.rows.length}));
const rule='Counts are source obligations, not unique facilities. The same relationship may have several obligations. Shared filters apply to both dates. Daily variance compares the exact previous weekday per source, with identical source coverage. Missing history stays unavailable.';
g.CreditMonitoring=function(ctx){
 const {root,esc,register,num}=ctx,$=s=>root.querySelector(s);let registry={},current=[],comparison={},page='';
 const money=v=>Number.isFinite(v)?'$'+(v/1e6).toLocaleString('en-US',{maximumFractionDigits:2})+'m':'—';
 function change(now,old){const d=g.CreditCovenantRisk.delta(now,old,comparison.ready);return '<span class="cov-variance '+(d.ready?(d.change===0?'unchanged':d.change>0?'increase':'decrease'):'unavailable')+'">'+esc(d.ready?d.text:comparison.reason||'Comparison unavailable')+'</span><small class="cov-comparison-note">'+esc(d.ready?comparison.label:'No estimated change')+'</small>';}
 function define(id,title,rows,prior,method){registry[id]={id,title,rows,prior,rule:method+' '+(page==='activity'?rule.replace('Counts are source obligations, not unique facilities. The same relationship may have several obligations.','Counts are source events, not distinct covenants or facilities. The same covenant may have several events.'):rule)};return registry[id];}
 function method(id,title){return '<button class="cw-icon-btn cd-section-method" data-monitor-method="'+id+'" aria-label="Methodology for '+esc(title)+'">'+g.CreditIcons.icon('info')+'</button>';}
 function metric(id,title,rs,ps,index,measure=rs=>rs.length,methodology='Count the indicated source records.'){
  define('metric-'+id,title,rs,ps,methodology);const v=measure(rs),old=measure(ps);
  return '<div class="cd-kpi-shell"><button class="pal-metric cov-kpi" data-monitor-open="'+id+'"><div class="pal-metric-heading">'+g.CreditIcons.metric(['document','shield','calendar','users'][index%4],index)+'<div><span>'+esc(page==='activity'?'Recorded activity':'Current scope')+'</span><h2>'+esc(title)+'</h2></div></div><span class="cov-value-label">'+(page==='activity'?'Recorded volume':'Selected population')+'</span><div class="cov-kpi-line"><strong class="ch-kpi-value">'+esc(Number.isFinite(v)?num(v):'—')+'</strong><div class="cov-kpi-variance">'+change(v,old)+'</div></div></button>'+method('metric-'+id,title)+'</div>';
 }
 function card(id,title,rs,ps,methodology,sub=''){
  define(id,title,rs,ps,methodology);return '<section class="ch-card pal-card cov-chart-card"><div class="ch-card-head"><div><h2>'+esc(title)+'</h2><p class="ch-card-sub">'+esc(sub)+'</p></div>'+method(id,title)+'</div><div class="cov-chart-variance"><span>Population</span>'+change(rs.length,ps.length)+'</div><div class="ch-chart" id="'+id+'"></div></section>';
 }
 function draw(id,type,pts,series,collector){const el=$('#'+id),def=registry[id];if(!el)return;if(!def.rows.length||!g.Highcharts){el.innerHTML='<p class="ch-empty">'+(!def.rows.length?'No records in this scope.':'Chart library unavailable.')+'</p>';return;}
  if(type!=='pie')el.classList.add('cov-fluid-plot');
  const data=pts.map((p,i)=>({name:nice(p.name),y:p.y,color:type==='pie'?colors[i%colors.length]:colors[0],custom:{rows:p.rows}}));
  const c=g.Highcharts.chart(el,{chart:{type,height:type==='pie'?240:320,...(type==='pie'?{spacing:[0,0,0,0],margin:0}:{}),backgroundColor:'transparent',animation:false,style:{fontFamily:getComputedStyle(root).fontFamily}},title:{text:null},credits:{enabled:false},accessibility:{description:def.title},legend:{enabled:!!series},xAxis:{categories:pts.map(p=>nice(p.name)),tickLength:0,lineColor:'#dbe5ed'},yAxis:{title:{text:null},allowDecimals:false,gridLineDashStyle:'Dash'},tooltip:{shared:!!series},plotOptions:{series:{animation:false,borderWidth:0,stacking:series&&type!=='line'&&!series.some(s=>s.custom?.comparison)?'normal':undefined,maxPointWidth:28,cursor:'pointer',point:{events:{click:function(){ctx.openChart(def.parent||id,this.options.custom?.rows||def.rows,(this.name||nice(pts[this.index]?.name)||def.title)+' · '+this.series.name,el);}}}},pie:{size:'95%',innerSize:'72%',borderWidth:5,borderColor:'#fff',dataLabels:{enabled:false}},bar:{borderRadius:3},column:{borderRadius:3},areaspline:{fillOpacity:.12,marker:{enabled:false}},line:{marker:{enabled:true,radius:3}}},series:series||[{name:page==='activity'?'Events':'Obligations',data}]});
  if(collector)collector.push(c);else ctx.addChart(c);
  if(type==='pie')g.CreditDonut(c,{esc,format:num,label:page==='activity'?'Total events':'Total obligations',onSelect:p=>ctx.openChart(def.parent||id,p.custom.rows,p.name,el)});
  else if(g.ResizeObserver){let last=0;const ob=new ResizeObserver(()=>{const h=Math.max(300,Math.round(el.getBoundingClientRect().height));if(h!==last){last=h;c.setSize(null,h,false);}});ob.observe(el);const destroy=c.destroy.bind(c);c.destroy=()=>{ob.disconnect();destroy();};}
 }
 function wire(host){host.querySelectorAll('[data-monitor-method]').forEach(b=>b.onclick=()=>ctx.methodology(b.dataset.monitorMethod));host.querySelectorAll('[data-monitor-open]').forEach(b=>b.onclick=()=>ctx.openMetric(b.dataset.monitorOpen));}
 function main(tab,rs){page=tab;registry={};current=rs;const domains=tab==='activity'?['ACTIVITY']:names[tab]?[tab]:Object.keys(names);comparison=g.CreditSnapshots.compare(ctx.data(),domains,ctx.filters());const old=comparison.prior;const all=names[tab]?rs.filter(r=>r.category===tab):rs,prior=names[tab]?old.filter(r=>r.category===tab):old,a=all.filter(actions),pa=prior.filter(actions);let specs=[],plans=[];
  if(tab==='overview')specs=Object.entries({COVENANTS:'Past due covenants',CA:'CA actions',FACILITY:'Past due facilities',CCM:'Open CCMs',INSURANCE:'Insurance issues',APPRAISALS:'Past due appraisals'}).map(([k,title])=>[title,all.filter(r=>r.category===k&&actions(r)),prior.filter(r=>r.category===k&&actions(r))]);
  else if(tab==='activity')specs=[...['DEFERRED','WAIVED','DELETED'].map(k=>[nice(k)+' events',all.filter(r=>r.event_type===k),prior.filter(r=>r.event_type===k)]),['Relationships',all,prior,rs=>count(rs,'relationship_id'),'Count distinct relationship IDs in the event population.']];
  else if(tab==='workload')specs=[['Actionable items',a,pa],['Active owners',a,pa,rs=>count(rs,'owner_id'),'Count distinct accountable owner IDs with actions.'],['Average per owner',a,pa,rs=>count(rs,'owner_id')?rs.length/count(rs,'owner_id'):null,'Actions divided by distinct accountable owner IDs.'],['Critical actions',a.filter(r=>r.critical),pa.filter(r=>r.critical)]];
  else if(tab==='INSURANCE')specs=[['Insurance issues',a,pa],['Awaiting certificate',all.filter(r=>r.status==='AWAITING_CERTIFICATE'),prior.filter(r=>r.status==='AWAITING_CERTIFICATE')],['Pending review',all.filter(r=>r.status==='PENDING_REVIEW'),prior.filter(r=>r.status==='PENDING_REVIEW')],['Specialists',a,pa,rs=>count(rs,'owner_id'),'Count distinct specialist IDs with actions.']];
  else if(tab==='CCM')specs=[['Open CCMs',a,pa],['Substandard',a.filter(r=>r.classification==='SUBSTANDARD'),pa.filter(r=>r.classification==='SUBSTANDARD')],['Special mention',a.filter(r=>r.classification==='SPECIAL_MENTION'),pa.filter(r=>r.classification==='SPECIAL_MENTION')],['Relationships',all,prior,rs=>count(rs,'relationship_id'),'Count distinct relationship IDs across the supplied CCM population.']];
  else specs=[['Actions required',a,pa],['Critical items',a.filter(r=>r.critical),pa.filter(r=>r.critical)],['Coming due',all.filter(r=>r.coming_due),prior.filter(r=>r.coming_due)],['Accountable owners',a,pa,rs=>count(rs,'owner_id'),'Count distinct owner IDs with at least one action.']];
  let html='<div class="ch-kpis cov-kpis mon-kpis">'+specs.map(([t,r,p,m,rule],i)=>metric('mon-'+tab+'-'+i,t,r,p,i,m,rule)).join('')+'</div>';
  const month=r=>r.effective_due_date?.slice(0,7)||'Date not supplied';
  const horizon=r=>{const days=Date.parse(r.effective_due_date)-Date.parse(r.as_of_date);if(!Number.isFinite(days))return 'Date not supplied';const n=Math.round(days/86400000);return n<0?'Date/status conflict':n<=30?'1–30':n<=45?'31–45':n<=60?'46–60':n<=90?'61–90':'>90';};
  const risk=r=>r.critical?'Critical':r.action_required?'Other actions':r.coming_due?'Upcoming':'Other records';
  const add=(title,type,r,p,key,methodology,span,mode=null,sub='')=>{
   const id='mon-'+tab+'-chart-'+plans.length,pts=key==='aging'?aging(r):group(r,key);
   if(key===horizon){const order=['1–30','31–45','46–60','61–90','>90','Date not supplied','Date/status conflict'];pts.sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name));}
   if(key===month||key==='month')pts.sort((a,b)=>String(a.name).localeCompare(String(b.name)));
   plans.push({id,type,pts,mode,rows:r,prior:p,key});
   return card(id,title,r,p,methodology,sub).replace('<section class=', '<section data-bento-span="'+span+'" class=');
  };
  html+='<div class="ch-grid mon-bento">';
  if(tab==='overview'){
   html+=add('Action distribution','pie',a,pa,'category','Actionable obligations grouped by monitoring area. Each source obligation is counted once.',6);
   const topOwners=new Set(group(a,'owner_id').slice(0,8).map(p=>p.name));
   html+=add('Underwriter & specialist workload','bar',a.filter(r=>topOwners.has(r.owner_id)),pa.filter(r=>topOwners.has(r.owner_id)),'owner_name','Top eight accountable owner IDs ranked by current actionable obligations. The comparison uses the same selected owners.',6,null,'Top eight accountable owners');
   html+=add('Regional distribution','pie',a,pa,'region','Actionable obligations by source region.',6);
   html+=add('Critical items by category','bar',a.filter(r=>r.critical),pa.filter(r=>r.critical),'category','Actionable obligations carrying the supplied critical flag, grouped by monitoring area.',6);
  }else if(tab==='workload'){
   html+=add('Workload by owner','bar',a,pa,'owner_name','Open actions ranked by owner, separated into critical and other work. This is workload, not staff utilization.',8,risk);
   html+=add('Regional workload','pie',a,pa,'region','Share of all actionable work by region.',4);
   html+=add('Team workload movement','column',a,pa,'team_lead','Current and previous-weekday action counts by team lead.',5,'comparison');
   html+=add('Action aging','bar',a,pa,'aging','Positive supplied days past due use 1–30, 31–45, 46–60, 61–90 and >90. Unknown or non-positive ages remain separate. Over-90 share divides actions over 90 days by all actions; critical aged actions are the intersection with the supplied critical flag.',6);
   html+=add('Action priorities by monitoring area','bar',a,pa,'category','Actions by monitoring area, split into mutually exclusive critical and other actions using the supplied critical flag. Each source obligation is counted once. The insight ranks areas by critical action count and divides the leading count by all critical actions; ties are reported.',6,risk,'Critical and other actions');
  }else if(tab==='CA'){
   html+=add('Upcoming authorization deadlines','column',all.filter(r=>r.coming_due),prior.filter(r=>r.coming_due),horizon,'Coming-due CAs by days from source report date to effective due date: 1–30 (including today), 31–45, 46–60, 61–90, >90. Missing dates and date/status conflicts stay visible.',8);
   html+=add('Authorization status','pie',all,prior,'status','All supplied CA obligations by status, including pending authorizations.',4);
   html+=add('Owner action queue','bar',a,pa,'owner_name','Actionable CA obligations by accountable owner.',5);
   html+=add('Regional action movement','column',a,pa,'region','Current and prior-weekday CA actions by region.',7,'comparison');
  }else if(tab==='FACILITY'){
   html+=add('Upcoming facility maturities','column',all.filter(r=>r.coming_due),prior.filter(r=>r.coming_due),horizon,'Coming-due facility obligations by remaining days to effective maturity. Today belongs to 1–30. Includes missing dates and status/date conflicts. Counts are obligations, not balances.',8);
   html+=add('Past due aging','pie',a,pa,'aging','Past-due obligations in the five portfolio aging bands; missing ages remain separate.',4);
   html+=add('Product maturity pressure','column',a,pa,'product','Actionable facility obligations by product, split into critical and other actions.',7,risk);
   html+=add('Owner follow-up queue','bar',a,pa,'owner_name','Actionable facility obligations ranked by owner.',5);
  }else if(tab==='CCM'){
   html+=add('Classification by region','bar',a,pa,'region','Open CCM records by region, stacked by supplied credit classification. Classification is not a forecast default probability.',7,'classification');
   html+=add('Credit classification','pie',all,prior,'classification','All supplied CCM records by classification.',5);
   html+=add('Approval due calendar','column',a,pa,month,'Open CCM obligations grouped by supplied approval due month; undated items remain explicit.',8);
   html+=add('Underwriter queue','bar',a,pa,'owner_name','Open CCM records by accountable underwriter.',4);
  }else if(tab==='INSURANCE'){
   html+=add('Insurance exception drivers','bar',a,pa,r=>r.deficiency_bucket||r.expired_bucket||r.status,'Actionable records grouped by deficiency bucket, falling back to expired bucket then status. Each record belongs to one group.',8);
   html+=add('Certificate status','pie',all,prior,'status','Supplied insurance records by certificate/review status.',4);
   html+=add('Regional exception mix','column',a,pa,'region','Insurance actions by region, stacked by supplied status.',5,'status');
   html+=add('Specialist workload movement','bar',a,pa,'owner_name','Current and prior-weekday action counts by specialist.',7,'comparison');
  }else if(tab==='APPRAISALS'){
   html+=add('Aging by product','column',a,pa,'product','Actionable appraisal obligations by product and exact aging band. Unknown ages remain separate.',8,age);
   html+=add('Appraisal aging','pie',a,pa,'aging','Positive past-due days grouped into the five portfolio aging bands.',4);
   html+=add('Upcoming appraisal deadlines','column',all.filter(r=>r.coming_due),prior.filter(r=>r.coming_due),horizon,'Coming-due appraisals by days until effective due date; today belongs to 1–30. Missing and conflicting dates remain explicit.',7);
   html+=add('Appraisal owner queue','bar',a,pa,'owner_name','Actionable appraisals ranked by accountable owner.',5);
  }else if(tab==='activity'){
   html+=add('Covenant activity by month','column',all,prior,'month',activityRule,8,'event_type');
   html+=add('Activity mix','pie',all,prior,'event_type','Recorded event types in the selected source population.',4);
   html+=add('Activity by owner','bar',all,prior,'owner_name','Recorded events by accountable owner.',4);
   html+=add('Regional activity by month','column',all,prior,'month','Monthly event counts, stacked by region. Each event belongs to one maker month.',8,'region');
  }
  html+='</div>';
  let cols=tab==='activity'?[['covenant_id','Covenant number'],['relationship_name','Relationship'],['event_type','Activity'],['event_date','Maker date'],['owner_name','Owner'],['region','Region']]:[['relationship_name','Relationship'],['relationship_id','Relationship ID'],['facility_id','Facility ID'],['ca_id','CA ID'],['owner_name','Owner'],['region','Region'],['product','Product'],['status','Status'],['effective_due_date','Due date'],['days_past_due','Days past due','n']];
  if(tab==='INSURANCE')cols=[['relationship_name','Relationship'],['facility_id','Facility'],['status','Status','badge'],['owner_name','Specialist'],['expired_bucket','Expired bucket'],['deficiency_bucket','Deficiency bucket'],['team_lead','Team lead'],['relationship_id','Relationship ID'],['region','Region'],['product','Product']];
  if(tab==='CCM')cols=[['relationship_name','Client'],['relationship_id','CARE ID'],['classification','Classification','badge'],['owner_name','Underwriter'],['next_month_end','Next month end'],['effective_due_date','Approval due'],['ccm_status','CCM status','badge'],['region','Region'],['facility_id','Facility ID']];
  if(tab==='activity')cols.push(['deferred_date','Covenant deferred date'],['cumulative_deferred_days','Cumulative deferred days','n'],['due_date','Original due date'],['remarks','Covenant remarks'],['relationship_id','Relationship ID'],['facility_id','Facility ID'],['event_id','Event ID']);
  const registerTitle=tab==='overview'?'Action register':tab==='activity'?'Activity records':(names[tab]||nice(tab))+' records',registerRows=tab==='overview'?a:all,registerPrior=tab==='overview'?pa:prior;
  if(tab==='overview')cols.splice(1,0,['category','Category','badge']);
  html+=register(registerTitle,registerRows,cols);$('#ch-content').innerHTML=html;
  for(const p of plans){let series;
   if(p.mode==='comparison'){
    const oldGroups=group(p.prior,p.key),currentGroups=p.pts;
    p.pts=[...new Set([...currentGroups.map(x=>x.name),...oldGroups.map(x=>x.name)])].map(name=>({name,y:0,rows:[]}));
    series=[['Current',currentGroups,colors[0]],['Previous weekday',oldGroups,colors[1]]].map(([name,groups,color])=>({name,color,custom:{comparison:true},data:p.pts.map(pt=>({y:comparison.ready||name==='Current'?(groups.find(x=>x.name===pt.name)?.y||0):null,custom:{rows:groups.find(x=>x.name===pt.name)?.rows||[],historical:name!=='Current'}}))}));
   }else if(p.mode){series=group(p.rows,p.mode).map((s,i)=>({name:nice(s.name),color:tab==='workload'&&p.key==='category'?(s.name==='Critical'?'#D64545':'#255BE3'):colors[i%colors.length],data:p.pts.map(pt=>{const rows=pt.rows.filter(r=>(typeof p.mode==='function'?p.mode(r):r[p.mode]||'Not supplied')===s.name);return {y:rows.length,custom:{rows}};})}));}
   draw(p.id,p.type,p.pts,series);
   const lead=[...p.pts].sort((a,b)=>b.y-a.y)[0],def=registry[p.id];
   const cue=document.createElement('p');cue.className='mon-chart-insight';
   if(tab==='workload'&&p.key==='aging'){const oldAge=def.rows.filter(r=>age(r)==='>90'),critical=oldAge.filter(r=>r.critical).length,unknown=def.rows.filter(r=>age(r)==='Aging not supplied').length;cue.textContent=def.rows.length?num(oldAge.length)+' actions are over 90 days ('+(100*oldAge.length/def.rows.length).toFixed(1)+'% of the queue); '+num(critical)+' are critical. '+num(unknown)+' actions have no positive supplied age. Prioritize the oldest critical items and confirm missing ages.':'No actionable records in the selected scope.';}
   else if(tab==='workload'&&p.key==='category'){const critical=def.rows.filter(r=>r.critical),leaders=group(critical,'category'),top=leaders[0],ties=leaders.filter(x=>x.y===top?.y);cue.textContent=top?(ties.length>1?ties.map(x=>nice(x.name)).join(', ')+' jointly lead with ':nice(top.name)+' leads with ')+num(top.y)+' critical actions'+(ties.length>1?' each':'')+' ('+(100*top.y/critical.length).toFixed(1)+'% of all critical work'+(ties.length>1?' each':'')+'). '+num(critical.length)+' of '+num(def.rows.length)+' actions are critical. Select a segment to identify accountable owners.':def.rows.length?'No actions are flagged critical in this scope. Select an area to inspect its open work.':'No actionable records in the selected scope.';}
   else if(p.mode==='comparison'){const delta=def.rows.length-def.prior.length;cue.textContent=comparison.ready?(delta>0?'+':'')+delta+' actions versus the previous weekday. Inspect a current bar to see the responsible records.':'A matching previous-weekday release is required to assess movement.';}
   else if(lead&&def.rows.length)cue.textContent=nice(lead.name)+': '+num(lead.y)+' of '+num(def.rows.length)+' '+(tab==='activity'?'events':'obligations')+' ('+(100*lead.y/def.rows.length).toFixed(1)+'%). Select a segment to inspect its owners and records.';
   else cue.textContent='No eligible records in the selected scope.';
   $('#'+p.id).closest('section').append(cue);
  }
  define('ch-register',registerTitle,registerRows,registerPrior,'One row per source obligation/event. Search, column filters and download retain the raw identifiers; pagination only changes the visible slice.');
  const head=$('#ch-register .ch-toolbar');if(head)head.insertAdjacentHTML('beforeend',method('ch-register','Source records'));wire(root);
 }
 function expanded(a){const d=registry[a.id];if(!d||!/^mon-|^metric-mon-/.test(a.id))return false;const rs=d.rows,ps=d.prior,activity=page==='activity';a.allRecords=rs;a.panel.classList.add('cd-pal-analysis');a.panel.querySelector('.cd-chart-slot').hidden=true;
  const specs=activity?[['Events',rs,ps],['Relationships',rs,ps,x=>count(x,'relationship_id'),'Count distinct supplied relationship IDs.'],['Owners',rs,ps,x=>count(x,'owner_id'),'Count distinct accountable owner IDs.'],['Maker months',rs,ps,x=>count(x,'month'),'Count distinct maker months represented in the selected records.']]:[['Obligations',rs,ps],['Actions required',rs.filter(actions),ps.filter(actions)],['Relationships',rs,ps,x=>count(x,'relationship_id'),'Count distinct non-empty relationship IDs.'],['Facilities',rs,ps,x=>g.CreditCovenantRisk.facilities(x,[]).records.length,'Count distinct region + relationship + facility identifiers; missing keys excluded.']];
  a.panel.querySelector('.cd-analysis-kpis').innerHTML=specs.map(([title,r,p,m,rule],i)=>metric(a.id+'-kpi-'+i,title,r,p,i,m,rule)).join('');
  const dueMonth=r=>r.effective_due_date?.slice(0,7)||'Date not supplied';
  const plans=activity?[['Covenant activity by month','column','month',6,'event_type'],['Event mix','pie','event_type',4],['Cumulative deferred days','bar',deferredBand,6,null,'DEFERRED'],['Accountable owners','bar','owner_name',6]]
   :page==='CA'?[['Authorization due calendar','column',dueMonth,8],['Authorization status','pie','status',4],['Owner accountability','bar','owner_name',5],['Regional authorization coverage','column','region',7]]
   :page==='FACILITY'?[['Facility maturity calendar','column',dueMonth,8],['Product maturity mix','pie','product',4],['Maturity aging','bar',age,7],['Owner follow-up','bar','owner_name',5]]
   :page==='APPRAISALS'?[['Appraisal aging profile','bar',age,8],['Appraisal product coverage','pie','product',4],['Appraisal due calendar','column',dueMonth,7],['Appraisal owner queue','bar','owner_name',5]]
   :page==='CCM'?[['Credit classification','bar','classification',7],['Region distribution','pie','region',5],['Approval calendar','column',dueMonth,8],['Accountable owners','bar','owner_name',4]]
   :page==='INSURANCE'?[['Exception drivers','bar',r=>r.deficiency_bucket||r.expired_bucket||r.status,8],['Status mix','pie','status',4],['Regional volume','column','region',5],['Specialist workload','bar','owner_name',7]]
   :page==='workload'?[['Accountable owners','bar','owner_name',8],['Region distribution','pie','region',4],['Team distribution','column','team_lead',5],['Product concentration','bar','product',7]]
   :[['Monitoring domains','bar','category',8,'status'],['Region distribution','pie','region',4],['Action aging profile','bar',age,7],['Team accountability','column','team_lead',5]];
  const grid=a.panel.querySelector('.cd-analysis-grid');grid.innerHTML=plans.map(([title,type,key,span,split,eventType],i)=>{const selected=eventType?rs.filter(r=>r.event_type===eventType):rs,previous=eventType?ps.filter(r=>r.event_type===eventType):ps;const id=a.id+'-detail-'+i,html=card(id,title,selected,previous,(activity?activityRule+' ':'')+'Count the selected '+(activity?'events':'obligations')+' by '+(key===dueMonth?'effective due month. Dates are source deadlines, not forecasts; missing dates remain explicit':key===age?'supplied positive days past due in 1–30, 31–45, 46–60, 61–90 and >90 bands. Non-actionable and missing-aging records remain separate':key===deferredBand?'supplied cumulative deferred days, for DEFERRED events only. Zero remains zero; missing or invalid durations remain separate. Durations are not summed or inferred from Maker Date':key==='month'?'Maker Date month, stacked by Covenant Compliance; these are recorded events, not clearance rates':typeof key==='function'?'deficiency bucket, then expired bucket, then status':key)+'. All groups are included.');registry[id].parent=a.id;return html.replace('<section class=', '<section data-bento-span="'+span+'" class=');}).join('');
  const lead=group(rs,'owner_id')[0],missing=rs.filter(r=>!r.facility_id||!r.relationship_id).length;
  const insightId=a.id+'-insight';define(insightId,'In this selection',rs,ps,'Largest owner share = largest owner count / total selected records. Missing linkage counts records without relationship or facility ID.');grid.insertAdjacentHTML('beforeend','<section class="ch-card cd-insight-card mon-insights"><div class="ch-card-head"><h2>In this selection</h2>'+method(insightId,'In this selection')+'</div><dl><div><dt>Largest owner share</dt><dd>'+esc(rs.length?(100*(lead?.y||0)/rs.length).toFixed(1)+'%':'—')+'</dd></div><div><dt>Missing facility / relationship keys</dt><dd>'+num(missing)+'</dd></div></dl></section>');
  grid.querySelectorAll(':scope>.cov-chart-card').forEach(c=>c.classList.add('cd-insight-card','cd-insight-visual'));
  a.detailCharts=[];plans.forEach(([t,type,key,span,split,eventType],i)=>{const selected=eventType?rs.filter(r=>r.event_type===eventType):rs,pts=group(selected,key);if(key===deferredBand){const order=['0 days','1–30 days','31–60 days','61–90 days','>90 days','Not supplied'];pts.sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name));}if(key==='month'||key===dueMonth)pts.sort((a,b)=>String(a.name).localeCompare(b.name));if(key===age){const order=['1–30','31–45','46–60','61–90','>90','Aging not supplied','Not past due'];pts.sort((a,b)=>order.indexOf(a.name)-order.indexOf(b.name));}const series=split?group(selected,split).map((s,j)=>({name:nice(s.name),color:colors[j%colors.length],data:pts.map(p=>{const rows=p.rows.filter(r=>(r[split]||'Not supplied')===s.name);return{y:rows.length,custom:{rows}};})})):null;draw(a.id+'-detail-'+i,type,pts,series,a.detailCharts);});wire(a.panel);return true;
 }
 return {main,expanded,getRows:id=>registry[id]?.rows,getDefinition:id=>registry[id],getMethod:id=>registry[id]?[registry[id].rule,'The supporting table contains the exact source cohort. Select a plotted point to inspect its records.']:null};
};
})(window);

;
/* Covenants domain: legacy field parity, shared aging and dashboard presentation. */
(function(global){'use strict';
const FIELDS={
 as_of_date:['As Of Date','As_Of_Date','Report_Date','Report Date'],region:['Region'],
 banker_name:['Banker Name','Banker_Name','Banker','Relationship Manager'],
 product:['Product_Program','Product Program','Product Program Name','Product_Program_Name'],
 product_program_name:['Product Program Name','Product_Program_Name','Product_Program'],
 originating_unit:['origination_unit','Originating Unit','Origination_Unit','Origination Unit'],
 team_lead:['Investment Finance Underwriting Team Lead','Underwriting Team Lead','Underwriting_Team_Lead'],owner_name:['Underwriter','Lead_Underwriter','Lead Underwriter'],
 lead_underwriter:['Investment Finance Lead Underwriter','Lead_Underwriter','Lead Underwriter','Underwriter'],product_underwriter:['Investment Finance Product Underwriter','Product Underwriter','Product_Underwriter'],
 ou_expense_code:['OU Expense Code','OU_Expense_Code'],cu_expense_code:['CU Expense Code','CU_Expense_Code'],
 relationship_id:['Relationship ID','Relationship_ID'],relationship_name:['Relationship Name','Relationship_Name','Borrowers_Name','Client_Name'],
 borrower_name:['borrowers_name','Borrowers Name','Borrowers_Name','Borrower Name'],ca_id:['CA Number','CA_Number'],facility_id:['Facility Number','Facility_Number'],
 facility_type:['Facility Type','Facility_Type'],covenant_id:['Covenant Number','Covenant_Number'],
 frequency:['Periodicity / Frequency','Periodic_Frequency','Periodicity','Frequency'],due_date:['Covenant Due Date','Covenant_Due_Date'],
 deferred_date:['Covenant Deferred Date','Covenant_Deferred_Date'],days_past_due:['No of Days Past Due','No_of_Days_Past_Due','Days_Past_Due','Days Past Due'],
 status:['Coming Due / Past Due','Coming_Due_Past_Due'],source_aging_bucket:['Past Due Category','Past_Due_Category'],
 description:['Covenant Description','Covenant_Description'],remarks:['Covenant Remarks','Covenant_Remarks'],
 days45_date:['day45_date','45 Days Past Due Date','45_Days_Past_Due_Date'],control_unit:['Control Unit','Control_Unit'],
 event_date:['Maker Date','Maker_Date'],event_type:['Covenant Compliance','Covenant_Compliance'],
 cumulative_deferred_days:['Cumulative Deferred Days','Cumulative_Deferred_Days'],modified_in_reporting_month:['Modified in Reporting Month','Modified_in_Reporting_Month']
};
const label=k=>({tfa_usd:'TFA (USD)',osuc_usd:'OSUC (USD)',banker_name:'Banker name',covenant_ids:'Covenant numbers',owner_name:'Underwriter',source_aging_bucket:'Source aging category',days45_date:'45 days past due date',ca_id:'CA number',covenant_id:'Covenant number',facility_id:'Facility number',as_of_date:'As of date',event_date:'Maker date',event_type:'Covenant compliance'}[k]||k.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase()));
const key=s=>String(s).replace(/[^a-z0-9]/gi,'').toLowerCase();
function pick(row,names){for(const name of names){const found=Object.keys(row).find(k=>key(k)===key(name));if(found&&row[found]!=null&&String(row[found]).trim()!=='')return row[found];}return null;}
function number(v){if(v==null||String(v).trim()==='')return null;const n=Number(String(v).replaceAll(',',''));return Number.isFinite(n)?n:null;}
function date(v,dayFirst=false){
 if(v==null||v==='')return null;
 if(typeof v==='number'){if(!Number.isFinite(v)||v<0||v>2958465)return null;return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);}
 if(v instanceof Date)return Number.isNaN(+v)?null:v.toISOString().slice(0,10);
 const str=String(v).trim(),iso=str.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/),us=str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 const parts=iso?[iso[1],iso[2],iso[3]]:us?[us[3],us[dayFirst?2:1].padStart(2,'0'),us[dayFirst?1:2].padStart(2,'0')]:null;if(!parts)return null;
 const value=parts.join('-'),stamp=Date.parse(value+'T00:00:00Z');return Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)===value?value:null;
}
function eventType(v){const s=String(v||'').toLowerCase();return s.includes('defer')?'DEFERRED':s.includes('waiv')?'WAIVED':/delet|deactiv|inactiv/.test(s)?'DELETED':String(v||'UNKNOWN').toUpperCase();}
function normalize(raw,index=0,activity=false){
 const dayFirst=raw.date_format==='DD/MM/YYYY'||Object.hasOwn(raw,'Report_Date');
 const r={...raw};for(const [name,aliases]of Object.entries(FIELDS))r[name]=r[name]??pick(raw,aliases);
 for(const name of ['as_of_date','due_date','deferred_date','days45_date','event_date'])r[name]=date(r[name],dayFirst);
 r.days_past_due=number(r.days_past_due);r.cumulative_deferred_days=number(r.cumulative_deferred_days);
 r.region=String(r.region||'UNSPECIFIED').toUpperCase();r.owner_name=r.owner_name||'Unassigned';r.owner_id=r.owner_id||r.owner_name;
 r.lead_underwriter=r.lead_underwriter||r.owner_name;r.product=r.product||'Not supplied';r.team_lead=r.team_lead||'Unassigned';
 r.relationship_id=r.relationship_id||r.relationship_name||'';r.relationship_name=r.relationship_name||r.relationship_id||'Not supplied';
 if(activity){r.event_type=eventType(r.event_type);r.event_id=r.event_id||'ACT:'+index;r.month=r.event_date?.slice(0,7)||null;}
 else{r.category='COVENANTS';r.item_id=r.item_id||'COV:'+index;r.status=String(r.status||'UNKNOWN').trim().toUpperCase().replace(/[\s-]+/g,'_');
  // A deferred date is not an approval. Only prepared approved dates override contractual dates.
  r.effective_due_date=date(r.effective_due_date,dayFirst)||(r.deferral_approved===true?r.deferred_date:null)||r.due_date;
  r.action_required=r.status==='PAST_DUE';r.coming_due=r.status==='COMING_DUE';r.critical=r.critical??(r.action_required&&r.days_past_due!==null&&r.days_past_due>=31);
 }
 return r;
}
const group=(rows,k)=>{const m=new Map();for(const r of rows){const name=typeof k==='function'?k(r):r[k]||'Not supplied';if(!m.has(name))m.set(name,[]);m.get(name).push(r);}return [...m].map(([name,rows])=>({name,rows,y:rows.length})).sort((a,b)=>b.y-a.y||String(a.name).localeCompare(String(b.name)));};
const distinct=(rs,k)=>new Set(rs.map(r=>r[k]).filter(Boolean)).size;
const past=r=>r.status==='PAST_DUE';const coming=r=>global.CreditCovenantAging.isComing(r);
const age=r=>global.CreditCovenantAging.bucket(r,past(r))||'Aging not supplied';
const region=r=>['NAM','LATAM','AMERICAS','AMER'].includes(r.region)?'Americas':r.region;
function activityWindow(rows,type){const eligible=rows.filter(r=>r.event_type===type&&r.month),months=[...new Set(eligible.map(r=>r.month))].sort().slice(-3);return {months,rows:eligible.filter(r=>months.includes(r.month))};}
function activityChange(rows,months=[...new Set(rows.map(r=>r.month).filter(Boolean))].sort()){
 const last=months.at(-1),prev=months.at(-2),dates=[...new Set(rows.map(r=>r.as_of_date).filter(Boolean))];
 const fail={ready:false,current:null,prior:null,note:'Comparable activity period unavailable'};
 if(!last||!prev||dates.length!==1||new Date(Date.UTC(+prev.slice(0,4),+prev.slice(5,7),1)).toISOString().slice(0,7)!==last)return fail;
 const asOf=dates[0];if(asOf.slice(0,7)<last)return fail;
 const currentEnd=new Date(Date.UTC(+last.slice(0,4),+last.slice(5,7),0)).getUTCDate();
 const elapsed=asOf.slice(0,7)===last?Number(asOf.slice(8)):currentEnd,partial=elapsed<currentEnd;
 const priorEnd=new Date(Date.UTC(+prev.slice(0,4),+prev.slice(5,7),0)).getUTCDate();
 const count=(month,day)=>rows.filter(r=>r.month===month&&r.event_date&&Number(r.event_date.slice(8))<=day).length;
 return {ready:true,current:count(last,elapsed),prior:count(prev,partial?Math.min(elapsed,priorEnd):priorEnd),note:(partial?'MTD through day '+elapsed:'Completed month totals')+' · '+last+' vs '+prev};
}
function columns(rows){
 const preferred=['relationship_name','relationship_id','covenant_id','ca_id','facility_id','region','owner_name','team_lead','product','status','source_aging_bucket','days_past_due','due_date','effective_due_date','deferred_date','frequency','description','remarks','event_date','event_type'];
 const aliases=new Map();for(const [canonical,names]of Object.entries(FIELDS))for(const name of names)aliases.set(name,canonical);
 const keys=[...new Set([...preferred,...Object.keys(FIELDS),...rows.flatMap(Object.keys)])];
 return keys.filter(k=>rows.some(r=>r[k]!=null&&r[k]!==''))
  .filter(k=>!aliases.has(k)||aliases.get(k)===k||!rows.some(r=>r[aliases.get(k)]!=null))
  .map(k=>[k,label(k)]);
}
global.CreditCovenantsData={normalize,fields:FIELDS,label,group,distinct,age,past,coming,activityWindow,activityChange,eventType,columns};
const colors=['#255BE3','#73C2FC','#00AF68','#E5A824','#8E319C','#FF5C0B','#D71671','#97D700'];
const agingRule='Use the shared portfolio bands: 1–30, 31–45, 46–60, 61–90 and >90 days. Exact source aging categories take precedence; otherwise past due uses supplied days past due, and coming due uses effective due date minus source as-of date. Coarse categories are not split without days. Missing aging stays separate; due today belongs to 1–30.';
const scopeRule='Unless labelled Facilities, counts are source covenant rows, not unique facilities. Shared region, product, underwriter and team-lead filters apply. Coming due includes all explicitly supplied COMING_DUE rows, including >90 days, matching the portfolio. This replaces the legacy three-month cutoff. Unknown statuses stay in All source records.';
global.CreditCovenants=function(ctx){
 const {root,esc,num,register}=ctx,$=s=>root.querySelector(s);let scope=[],events=[],registry={},comparison={ready:false,prior:[],reason:'Previous weekday snapshot unavailable'},facilitySet={records:[],groups:[],missing:0};const Risk=global.CreditCovenantRisk;
 const settings={view:'past',activity:'DEFERRED',detail:'links'};
 // Display aggregates keep their exact source cohort outside enumerable/exported fields.
 const tableRows=new WeakMap(),withRows=(row,rows)=>(tableRows.set(row,rows),row);
 const getTableRows=row=>row&&typeof row==='object'?tableRows.get(row)??null:null;
 const icon=n=>global.CreditIcons.icon(n);
 const segments=(name,options)=>'<div class="pal-segments" role="group" aria-label="'+esc(name==='view'?'Covenant status':name==='activity'?'Activity type':'Covenant detail view')+'">'+options.map(([v,t])=>'<button data-cov-setting="'+name+'" data-value="'+v+'" aria-pressed="'+(settings[name]===v)+'">'+esc(t)+'</button>').join('')+'</div>';
 const statusTabs=()=>segments('view',[['past','Past due'],['coming','Coming due']]);
 const cohort=()=>scope.filter(settings.view==='past'?past:coming);
 function priorFor(id){
  if(id.includes('activity'))return [];
  if(id.endsWith('-action-rel')||id.includes('cov-action')||(['cov-aging','cov-regional','cov-severity'].some(k=>id.startsWith(k))&&settings.view==='past'))return comparison.prior.filter(past);
  if(id.includes('cov-coming')||(['cov-aging','cov-regional','cov-severity'].some(k=>id.startsWith(k))&&settings.view==='coming'))return comparison.prior.filter(coming);
  if(id.includes('cov-total'))return comparison.prior.filter(r=>past(r)||coming(r));
  return comparison.prior;
 }
 const money=v=>Number.isFinite(v)?'$'+(v/1e6).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})+'m':'—';
 function variance(current,prior,ready=comparison.ready,note='',reason=comparison.reason,monetary=false){
  if(ready&&(!Number.isFinite(current)||!Number.isFinite(prior)))reason='Comparable measure unavailable';
  const d=Risk.delta(current,prior,ready),context=note||('vs '+(comparison.priorDate||'previous weekday'));
  if(d.ready&&monetary)d.text=d.text.replace(/\([^)]*\)/, '('+(d.change>0?'+':d.change<0?'−':'')+money(Math.abs(d.change))+')');
  return '<span class="cov-variance '+(!d.ready?'unavailable':d.change>0?'increase':d.change<0?'decrease':'unchanged')+'" title="'+esc(d.ready?'Current '+current+'; prior '+prior+'. '+context:reason||'Comparable data unavailable')+'">'+esc(d.ready?d.text:reason||'Comparison unavailable')+'</span><small class="cov-comparison-note">'+esc(d.ready?context:'No estimated change')+'</small>';
 }
 function chartVariance(id,rs){
  if(id.includes('activity')){const d=activityChange(rs);return '<div class="cov-chart-variance">'+variance(d.current,d.prior,d.ready,d.note,d.note)+'</div>';}
  const facilityMeasure=/^(?:cov-facility(?:$|-facility-)|metric-cov-(?:tfa|osuc)-facility-)/.test(id);
  const count=facilityMeasure?Risk.facilities(rs,[]).records.length:rs.length,prior=facilityMeasure?Risk.facilities(priorFor(id),[]).records.length:priorFor(id).length;
  return '<div class="cov-chart-variance"><span>'+(facilityMeasure?'Facilities':'Covenant population')+'</span>'+variance(count,prior)+'</div>';
 }
 function definition(id,title,rows,rule,note=''){registry[id]={id,title,rows,rule,note};return registry[id];}
 function methodButton(id,title){return '<button class="cw-icon-btn cd-section-method" data-cov-method="'+id+'" aria-label="Methodology for '+esc(title)+'">'+icon('info')+'</button>';}
 function tableCard(id,title,headers,rows,rule,note='',mode='summary'){
  definition(id,title,scope,rule,note);registry[id].table={headers,rows};
  return '<section '+(mode==='summary'?'data-expandable-table ':'')+'id="'+id+'" data-table-mode="'+mode+'" class="ch-card pal-table-card cov-table-card cw-framed-card'+(mode==='detail'?' cd-insight-card cd-insight-table cd-wide':'')+'"><div class="ch-card-head"><div><h2>'+esc(title)+'</h2>'+(note?'<p class="ch-card-sub">'+esc(note)+'</p>':'')+'</div>'+methodButton(id,title)+'</div><div class="credit-data-table-scroll"><table class="credit-data-table"><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table>'+(!rows.length?'<p class="ch-empty">No records in this scope.</p>':'')+'</div></section>';
 }
 function chartCard(id,title,rows,rule,note='',controls=''){
  definition(id,title,rows,rule,note);
  return '<section class="ch-card pal-card cov-chart-card"><div class="ch-card-head"><div><h2>'+esc(title)+'</h2><p class="ch-card-sub">'+esc(note)+'</p></div>'+methodButton(id,title)+'</div>'+controls+chartVariance(id,rows)+'<div class="ch-chart" id="'+id+'"></div></section>';
 }
 function kpi(id,title,value,note,index,rule,priorValue,ready=comparison.ready,varianceReason=comparison.reason,monetary=false){definition('metric-'+id,title,scope,rule,note);return '<div class="cd-kpi-shell"><button class="pal-metric cov-kpi" data-cov-open="'+id+'"><div class="pal-metric-heading">'+global.CreditIcons.metric(['document','shield','calendar','users'][index%4],index)+'<div><span>'+esc(note)+'</span><h2>'+esc(title)+'</h2></div></div><span class="cov-value-label">'+(monetary?'Balance · USD':id==='cov-relationships'?'Relationship count':'Selected population')+'</span><div class="cov-kpi-line"><strong class="ch-kpi-value">'+esc(monetary?money(value):String(value))+'</strong><div class="cov-kpi-variance">'+variance((typeof value==='number'?value:Number(String(value).replaceAll(',',''))),priorValue,ready,'',varianceReason,monetary)+'</div></div></button>'+methodButton('metric-'+id,title)+'</div>';}
 const exposureRule='Link covenant source records to portfolio by exact region, relationship ID and facility ID at the same reporting date, checking CA consistency. A covenant number alone is never a join or deduplication key. Sum each matched portfolio facility once even if it has multiple covenant rows. TFA and OSUC are the separate prepared USD measures; OSUC is not total outstanding. Bankers come only from explicit banker fields, never from the underwriter field. Daily change compares independently linked current and prior weekday cohorts; it requires fully reconciled source controls and complete USD linkage on both dates. Missing balances and partial coverage never become zero.';
 function amountKpi(id,key,index,rs=scope,cmp=comparison){
  const data=ctx.data?.()||{},x=Risk.exposureComparison(rs,data.portfolio||[],data.sources||[],data.covenantHistory,cmp),m=x.current[key],prior=x.prior?.[key],ready=x.ready&&m.complete&&prior?.complete;
  const note=m.known+' / '+m.facilities+' facilities linked'+(m.missingLinks?' · '+m.missingLinks+' links missing identifiers':'');
  return kpi(id,(m.complete?'':'Linked ') + (key==='tfa'?'Total facility amount · TFA':'Exposure · OSUC'),m.value,note,index,exposureRule,prior?.value,ready,x.reason,true);
 }
 function cohortKpi(id,title,rs,priorRows,value,priorValue,note,index,rule){
  const data=ctx.data?.()||{},cmp={...comparison,prior:priorRows},x=Risk.exposureComparison(rs,data.portfolio||[],data.sources||[],data.covenantHistory,cmp),f=Risk.facilities(rs,data.portfolio||[]),pf=Risk.facilities(priorRows,[]);
  const html=kpi(id,title,value,note,index,rule+' '+exposureRule,priorValue),def=registry['metric-'+id];def.rows=rs;
  def.exposureSummary=[{label:'Facilities',current:f.records.length,prior:pf.records.length,ready:comparison.ready},{label:'Relationships',current:distinct(rs,'relationship_id'),prior:distinct(priorRows,'relationship_id'),ready:comparison.ready},...['tfa','osuc'].map(key=>({label:key.toUpperCase(),current:x.current[key].value,prior:x.prior?.[key]?.value,ready:x.ready&&x.current[key].complete&&x.prior?.[key]?.complete,money:true}))];
  def.exposureCoverage=x.current.tfa.known+' / '+x.current.tfa.facilities+' facilities linked to the same-date portfolio. '+(comparison.ready?comparison.label:x.reason||comparison.reason);
  return html;
 }
 const linkCols=[['covenant_id','Covenant number'],['relationship_name','Relationship name'],['relationship_id','Relationship ID'],['facility_id','Facility ID'],['banker_name','Banker name'],['tfa_usd','TFA (USD)','n'],['osuc_usd','OSUC (USD)','n'],['owner_name','Underwriter'],['region','Region'],['status','Status'],['due_date','Due date'],['match_status','Portfolio match']];
 const facilityCols=[['facility_id','Facility ID'],['relationship_name','Relationship name'],['relationship_id','Relationship ID'],['banker_name','Banker name'],['tfa_usd','TFA (USD)','n'],['osuc_usd','OSUC (USD)','n'],['covenant_ids','Covenant numbers'],['covenants','Source links','n'],['past_due','Past due links','n'],['coming_due','Coming due links','n'],['owner_name','Underwriter'],['region','Region'],['match_status','Portfolio match']];
 function openRecords(id,rows,label){ctx.openChart(registry[id]?.parent||id,id.includes('activity')?rows:Risk.facilities(rows,ctx.data?.().portfolio||[]).links,label,$('#'+id));}
 function draw(id,type,rows,groups,series,charts){if(ctx.shouldDraw&&!ctx.shouldDraw(id))return;const el=$('#'+id);if(!el)return;const title=registry[id]?.title||id;
  if(!rows.length||!global.Highcharts){el.innerHTML='<p class="ch-empty">'+(!rows.length?'No records in this scope.':'Chart library unavailable.')+'</p>';return;}
  el.style.height='320px';if(type!=='pie')el.classList.add('cov-fluid-plot');
  const c=global.Highcharts.chart(el,{chart:{type,height:320,backgroundColor:'transparent',animation:false,style:{fontFamily:getComputedStyle(root).fontFamily},spacing:[16,16,12,8]},title:{text:null},credits:{enabled:false},accessibility:{description:title+'. Select a point to inspect supporting records.'},colors,
   xAxis:{categories:groups,lineColor:'#dce4ec',tickLength:0,labels:{style:{fontSize:'11px',color:'#5b6c7e'}}},yAxis:{title:{text:null},allowDecimals:false,gridLineColor:'#e4eaf2',gridLineDashStyle:'Dash'},legend:{enabled:series.length>1,itemStyle:{fontWeight:'normal',fontSize:'11px'}},tooltip:{pointFormatter:function(){return esc(this.name||groups[this.index]||'')+': <b>'+num(this.y)+'</b> '+esc(this.series.name);}},
   plotOptions:{series:{animation:false,borderWidth:0,stacking:series.length>1?'normal':undefined,cursor:'pointer',point:{events:{click:function(){openRecords(id,this.options.custom?.rows||rows,(this.name||groups[this.index]||'Selected group')+' · '+this.series.name);}}}},pie:{innerSize:'72%',borderWidth:5,borderColor:'#fff',dataLabels:{enabled:false}},bar:{borderRadius:3,maxPointWidth:24},column:{borderRadius:3,maxPointWidth:40}},series});
  if(charts)charts.push(c);else ctx.addChart(c);
  if(type!=='pie'&&global.ResizeObserver){let frame;const observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(!el.isConnected)return;const w=Math.floor(el.clientWidth),h=Math.floor(el.clientHeight);if(w>0&&h>0&&(c.chartWidth!==w||c.chartHeight!==h))c.setSize(w,h,false);});});observer.observe(el);const destroy=c.destroy;c.destroy=function(){observer.disconnect();cancelAnimationFrame(frame);return destroy.apply(this,arguments);};}

  if(type==='pie')global.CreditDonut(c,{esc,format:num,label:series[0]?.name==='Facilities'?'Total facilities':id.includes('activity')?'Total events':'Total covenants',onSelect:p=>openRecords(id,p.custom.rows,p.name)});
 }
 function points(rows,k,limit){return group(rows,k).slice(0,limit??Infinity).map((g,i)=>({...g,color:colors[i%colors.length],custom:{rows:g.rows}}));}
 function bands(rows){const labels=[...global.CreditCovenantAging.bands];if(rows.some(r=>age(r)==='Aging not supplied'))labels.push('Aging not supplied');return labels;}
 function agingPoints(rows){return bands(rows).map((name,i)=>{const selected=rows.filter(r=>age(r)===name);return {name,y:selected.length,color:colors[i%colors.length],custom:{rows:selected}};});}
 function regionalRows(rows){return group(scope,'region').map(g=>withRows([g.name,g.rows.length,...bands(rows).map(b=>rows.filter(r=>r.region===g.name&&age(r)===b).length),rows.filter(r=>r.region===g.name).length],g.rows));}
 function groupedRows(rows){return group(rows,r=>JSON.stringify([r.relationship_id,r.lead_underwriter||r.owner_name,r.region])).map(g=>withRows({relationship_name:g.rows[0].relationship_name,relationship_id:g.rows[0].relationship_id,owner_name:g.rows[0].lead_underwriter||g.rows[0].owner_name,region:g.rows[0].region,...Object.fromEntries(bands(rows).map(b=>[b,g.rows.filter(r=>age(r)===b).length])),total:g.rows.length},g.rows)).sort((a,b)=>b['>90']-a['>90']||b.total-a.total);}
 const detailCols=columns;
 function main(rows,activity){scope=rows.filter(r=>r.category==='COVENANTS').map((r,i)=>normalize(r,i));events=activity.map((r,i)=>normalize(r,i,true));registry={};const data=ctx.data?.()||{};comparison=Risk.comparison((data.monitoring||rows).filter(r=>r.category==='COVENANTS'),data.sources||[],data.covenantHistory,ctx.filters?.()||{});if(data.covenantHistoryError)comparison.reason='Covenant history failed validation';facilitySet=Risk.facilities(scope,data.portfolio||[]);facilitySet.groups.forEach(g=>withRows(g.record,g.rows));const selected=cohort(),isPast=settings.view==='past',status=isPast?'Past Due':'Coming Due',pd=scope.filter(past),cd=scope.filter(coming),active=scope.filter(r=>past(r)||coming(r));const aw=activityWindow(events,settings.activity);
  const activePrior=comparison.prior.filter(r=>past(r)||coming(r));
  const kpis='<div class="ch-kpis cov-kpis mon-kpis">'+[
   cohortKpi('cov-total','Total Covenants',active,activePrior,num(active.length),activePrior.length,'Past due + coming due',0,'Count active source covenant associations, not unique covenant numbers. '+scopeRule),
   cohortKpi('cov-action','Action Needed',pd,comparison.prior.filter(past),num(pd.length),comparison.prior.filter(past).length,'Past due obligations',1,'Count source rows explicitly marked PAST_DUE.'),
   cohortKpi('cov-coming','Coming Due',cd,comparison.prior.filter(coming),num(cd.length),comparison.prior.filter(coming).length,'All supplied coming-due bands',2,agingRule),
   cohortKpi('cov-relationships','Distinct Relationships',scope,comparison.prior,num(distinct(scope,'relationship_id')),distinct(comparison.prior,'relationship_id'),'Across the filtered source file',3,'Count distinct non-empty relationship IDs; names only when source ID is absent.')].join('')+'</div>';
  const headers=['Region','Population',...bands(selected),'Total'];
  let html=kpis+'<div class="ch-grid equal">'+chartCard('cov-aging',status+' Covenants',selected,agingRule,selected.length+' obligations · '+distinct(selected,'relationship_id')+' relationships',statusTabs())+tableCard('cov-regional',status+' Covenants by Region',headers,regionalRows(selected),'Population counts every supplied covenant in the region; aging and Total count the selected status only. '+agingRule)+'</div>';
  html+='<div class="ch-grid equal">'+chartCard('cov-activity',settings.activity[0]+settings.activity.slice(1).toLowerCase()+' Covenants',aw.rows,'Count activity events by Maker Date for the last three months present in the selected event type and filtered scope. NAM and LATAM roll up to Americas. Deactivated/inactive events join Deleted. Events are not distinct covenants.',aw.months.join(' · ')||'No dated events',segments('activity',[['DEFERRED','Deferred'],['WAIVED','Waived'],['DELETED','Deleted']]))+tableCard('cov-activity-region','Activity by Region',['Region',...aw.months,'Total','Latest change'],group(aw.rows,region).map(g=>{const counts=aw.months.map(m=>g.rows.filter(r=>r.month===m).length),change=activityChange(g.rows,aw.months),d=Risk.delta(change.current,change.prior,change.ready);return withRows([g.name,...counts,g.rows.length,d.ready?d.text:'—'],g.rows);}),'Count selected events by month and region. Latest change compares consecutive months; for an incomplete latest reporting month, both periods stop at the same elapsed day (clamped to the prior month end). Mixed or missing report dates are unavailable. Event counts are not clearance rates.')+'</div>';
  html+='<div class="ch-grid equal">'+chartCard('cov-severity','Aging Severity by Region',selected,agingRule,status+' · five aging bands')+chartCard('cov-products','Covenants by Product Program',scope,'Count all filtered source rows by Product Program, including rows outside active statuses. The denominator is the same filtered source file.',scope.length+' source rows · '+distinct(scope,'product')+' programs')+'</div>';
  const fr=facilitySet.records,linked=fr.filter(r=>r.match_status==='Matched'),pdFacilities=fr.filter(r=>r.past_due),coverage=fr.length?(100*linked.length/fr.length).toFixed(1)+'%':'—';
  html+='<div class="ch-grid equal">'+chartCard('cov-facility','Facility Covenant Risk',scope,'Count distinct region + relationship + facility IDs. Assign each facility to its highest observed covenant state: >90 past due, other past due, coming due only, other. Each facility appears once. Balances require one same-date portfolio match with consistent CA; ambiguous matches are excluded. USD amounts are summed once per linked facility.',fr.length+' facilities · '+coverage+' linked to same-date portfolio'+(data.covenantPortfolioError?' · Portfolio feed unavailable':''))+tableCard('cov-risk-watch','Risk Watchlist',['Priority','Count','Management focus'],[
   withRows(['Past-due facilities',pdFacilities.length,'Review overdue obligations and accountable owners'],facilitySet.groups.filter(g=>g.record.past_due).flatMap(g=>g.rows)),
   withRows(['Facilities over 90 days',fr.filter(r=>r.over_90).length,'Prioritize prolonged covenant exceptions'],facilitySet.groups.filter(g=>g.record.over_90).flatMap(g=>g.rows)),
   withRows(['Unmatched facilities',fr.length-linked.length,'Resolve dates, keys or ambiguous portfolio matches'],facilitySet.groups.filter(g=>g.record.match_status!=='Matched').flatMap(g=>g.rows)),
   withRows(['Missing facility keys',facilitySet.missing,'Complete region / relationship / facility identifiers'],scope.filter(r=>!Risk.facilityKey(r))),
   withRows(['Unclassified aging',scope.filter(r=>!global.CreditCovenantAging.bucket(r,past(r))).length,'Repair dates or exact source aging categories'],scope.filter(r=>!global.CreditCovenantAging.bucket(r,past(r))))
  ],'Facility priorities use unique composite keys; missing facility keys and unclassified aging count covenant rows. These measures overlap and must not be added. An overdue covenant is not proof of a contractual breach or default.').replace('data-expandable-table ','')+'</div>';
  const links=settings.detail==='links',grouped=settings.detail==='grouped',all=settings.detail==='all',activityView=settings.detail==='events',facilityView=settings.detail==='facilities',sourceView=settings.detail==='sources',detailRows=links?facilitySet.links:grouped?groupedRows(selected):facilityView?facilitySet.records:sourceView?(data.sources||[]).filter(r=>['COVENANTS','PORTFOLIO','ACTIVITY'].includes(r.domain)):activityView?events:all?scope:selected;
  const cols=links?linkCols:facilityView?[...facilityCols,...detailCols(detailRows).filter(c=>!facilityCols.some(f=>f[0]===c[0]))]:grouped?[['relationship_name','Relationship'],['relationship_id','Relationship ID'],['owner_name','Underwriter'],['region','Region'],...bands(selected).map(b=>[b,b,'n']),['total','Total','n']]:detailCols(detailRows);
  html+=register('Covenant details',detailRows,cols).replace('Select a row for source and record details',links?'Each source link is retained. Facility balances repeat across links; use the KPI or Facility level view for totals.':'Select a row for source and record details');ctx.commitContent?ctx.commitContent(html):$('#ch-content').innerHTML=html;
  const toolbar=$('#ch-register .ch-register-controls');if(!toolbar.querySelector('.cov-detail-tabs'))toolbar.prepend(Object.assign(document.createElement('div'),{className:'cov-detail-tabs',innerHTML:statusTabs()+segments('detail',[['links','Covenant–facility links'],['grouped','Relationship & Underwriter'],['records','Covenant records'],['all','All source records'],['events','Activity records'],['facilities','Facility level'],['sources','Source coverage']])}));
  definition('ch-register','Covenant details',detailRows,links?exposureRule+' Detail balances repeat on each source link and must not be added across rows.':facilityView?'One row per region / relationship / facility. Same-date exact portfolio join; ambiguous and missing matches remain explicit. USD balances are counted once per matched facility, not once per covenant.':sourceView?'Source controls show supplied domain, report date, coverage and reconciliation counts. EXCEPTIONS_ONLY does not represent the entire performing book.':grouped?'Group selected obligations by relationship ID, lead underwriter (underwriter fallback) and region; count each aging band, including unclassified aging, and total. '+agingRule:'Equivalent source headers use one canonical column; original source fields remain in CSV downloads and row details; activity records include every supplied event type, not only the three charted types.');
  draw('cov-aging','pie',selected,[],[{name:status+' covenants',data:agingPoints(selected)}]);
  if(registry['cov-activity-region'])registry['cov-activity-region'].rows=aw.rows;wireTableDrills(root);
  const reg=group(selected,'region').map(g=>g.name);draw('cov-severity','column',selected,reg,bands(selected).map((b,i)=>({name:b,color:colors[i],data:reg.map(name=>{const rs=selected.filter(r=>r.region===name&&age(r)===b);return {y:rs.length,custom:{rows:rs}};})})));
  draw('cov-products','pie',scope,[],[{name:'Covenants',data:points(scope,'product')}]);
  draw('cov-activity','column',aw.rows,aw.months,group(aw.rows,region).map((g,i)=>({name:g.name,color:colors[i],data:aw.months.map(m=>{const rs=g.rows.filter(r=>r.month===m);return {y:rs.length,custom:{rows:rs}};})})));
  const states=['Over 90 days','Other past due','Coming due only','Other status'];draw('cov-facility','column',scope,states,[{name:'Facilities',data:states.map((name,i)=>({name,y:facilitySet.groups.filter(g=>g.record.risk_state===name).length,color:colors[i],custom:{rows:facilitySet.groups.filter(g=>g.record.risk_state===name).flatMap(g=>g.rows)}}))}]);
  registry['cov-regional'].rows=selected;registry['cov-activity-region'].rows=aw.rows;wire(root);
 }
 function wireTableDrills(host){host.querySelectorAll('.cov-table-card').forEach(card=>{const def=registry[card.id],spec=def?.table;if(!spec)return;const source=def.rows,table=card.querySelector('table');
 // Bind original row objects before enhancement; sorting and paging retain those nodes.
 global.CreditTables.bindRows?.({table,rows:spec.rows,resolve:getTableRows,label:row=>String(row[0]??def.title)});
 global.CreditDrillTable?.(table,(i,j,h)=>{if(j===0||!['Population','Total','Past due','Coming due','Count','NAM','LATAM','EMEA','APAC',...bands(source)].includes(h)&&!/^\d{4}-\d{2}$/.test(h))return null;let rs=getTableRows(spec.rows[i]);if(!rs)return null;
 if(card.id==='cov-regional'&&h!=='Population')rs=rs.filter(settings.view==='past'?past:coming);
 if(h==='Past due')rs=rs.filter(past);if(h==='Coming due')rs=rs.filter(coming);if(['NAM','LATAM','EMEA','APAC'].includes(h))rs=rs.filter(r=>r.region===h);if(bands(source).includes(h))rs=rs.filter(r=>age(r)===h);if(/^\d{4}-\d{2}$/.test(h))rs=rs.filter(r=>r.month===h);return rs;
 },(rs,label)=>openRecords(card.id,rs,label));});}
 function wire(host){wireTableDrills(host);host.querySelectorAll('[data-cov-setting]').forEach(b=>{b.onclick=()=>{const key=b.dataset.covSetting;if(settings[key]===b.dataset.value)return;settings[key]=b.dataset.value;const run=()=>{if(key!=='activity')ctx.resetTable();return ctx.render(key==='view'?['cov-aging','cov-regional','cov-severity','ch-register']:key==='activity'?['cov-activity','cov-activity-region']:['ch-register']);};global.CreditControls?global.CreditControls.run(b,run):run();};b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const bs=[...b.parentElement.querySelectorAll('button')],i=bs.indexOf(b),next=e.key==='Home'?0:e.key==='End'?bs.length-1:(i+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length;bs[next].focus();bs[next].click();};});host.querySelectorAll('[data-cov-open]').forEach(b=>b.onclick=()=>ctx.openMetric(b.dataset.covOpen));host.querySelectorAll('[data-cov-method]').forEach(b=>b.onclick=()=>ctx.methodology(b.dataset.covMethod));}
 function expanded(a){
  const def=registry[a.id];if(!def||!a.id.match(/^(cov-|metric-cov-)/))return false;
  const rows=def.rows,facilityAnalysis=['cov-facility','metric-cov-tfa','metric-cov-osuc'].includes(a.id),activityView=['cov-activity','cov-activity-region'].includes(a.id),isComing=a.id==='metric-cov-coming'||(['cov-aging','cov-regional','cov-severity'].includes(a.id)&&settings.view==='coming'),selectedStatus=isComing?'Coming Due':'Past Due';
  a.allRecords=activityView?rows:Risk.facilities(rows,ctx.data?.().portfolio||[]).links;a.panel.classList.add('cd-pal-analysis');a.panel.querySelector('.cd-chart-slot').hidden=true;
  const aged=rows.filter(r=>past(r)&&Number.isFinite(r.days_past_due)&&r.days_past_due>0);
  const metrics=activityView?[
   ['Events',rows.length,'Selected activity · '+distinct(rows,'month')+' months','Count event rows, not distinct covenants.'],
   ['Relationships',distinct(rows,'relationship_id'),'Distinct relationship IDs','Count distinct non-empty relationship IDs among visible events.'],
   ['Months',distinct(rows,'month'),'Visible maker months','Count distinct Maker Date months in this activity window.'],
   ['Latest month',rows.filter(r=>r.month===[...new Set(rows.map(r=>r.month))].sort().at(-1)).length,'Most recent visible month','Count events in the last visible Maker Date month.']
  ]:[
   ['Covenants',rows.length,'Selected analysis population','Count source rows in this analysis. '+def.rule],
   ['Relationships',distinct(rows,'relationship_id'),'Distinct relationship IDs','Count distinct non-empty relationship IDs in the analysis population.'],
   ['Facilities',Risk.facilities(rows,[]).records.length,'Distinct facility identifiers','Count distinct region + relationship + facility keys; missing keys are excluded and reported in Risk Watchlist.'],
   [isComing?'Due within 30 days':'Over 90 days',rows.filter(r=>(isComing?coming(r):past(r))&&age(r)===(isComing?'1–30':'>90')).length,'Shared portfolio aging bands',agingRule]
  ];
  if(['cov-aging','cov-regional','cov-severity','metric-cov-action'].includes(a.id)&&!isComing)metrics[3]=['Average days past due',aged.length?(aged.reduce((n,r)=>n+r.days_past_due,0)/aged.length).toFixed(1):'—','Known positive source ages only','Sum positive supplied days past due / number of past-due rows with a known positive age. Missing days and zero are excluded from both numerator and denominator.'];
  if(a.id==='metric-cov-relationships')metrics[3]=['Covenants / relationship',distinct(rows,'relationship_id')?(rows.filter(r=>r.relationship_id).length/distinct(rows,'relationship_id')).toFixed(1):'—','Average across identified relationships','Count covenant rows with a relationship ID divided by distinct relationship IDs; records without an identifier are excluded.'];
  if(facilityAnalysis){const fs=Risk.facilities(rows,ctx.data?.().portfolio||[]).records;metrics.splice(0,4,
   ['Facilities',fs.length,'Distinct composite facility identifiers',exposureRule],
   ['Relationships',distinct(rows,'relationship_id'),'Distinct linked relationship IDs',exposureRule]);}
  const priorRows=priorFor(a.id),priorAged=priorRows.filter(r=>past(r)&&Number.isFinite(r.days_past_due)&&r.days_past_due>0);
  const previousMetric=title=>title==='Past-due facilities'?Risk.facilities(priorRows,[]).records.filter(r=>r.past_due).length:title==='Covenants'?priorRows.length:title==='Relationships'?distinct(priorRows,'relationship_id'):title==='Facilities'?Risk.facilities(priorRows,[]).records.length:title==='Due within 30 days'?priorRows.filter(r=>age(r)==='1–30').length:title==='Over 90 days'?priorRows.filter(r=>past(r)&&age(r)==='>90').length:title==='Average days past due'?(priorAged.length?Number((priorAged.reduce((n,r)=>n+r.days_past_due,0)/priorAged.length).toFixed(1)):null):title==='Covenants / relationship'?(distinct(priorRows,'relationship_id')?Number((priorRows.filter(r=>r.relationship_id).length/distinct(priorRows,'relationship_id')).toFixed(1)):null):null;
  a.panel.querySelector('.cd-analysis-kpis').innerHTML=metrics.map(([title,value,note,rule],i)=>kpi(a.id+'-kpi-'+i,title,typeof value==='number'?num(value):value,note,i,rule,previousMetric(title),!activityView&&comparison.ready&&!title.startsWith('Linked '),title.startsWith('Linked ')?'Comparable facility balance history unavailable':comparison.reason)).join('');
  if(facilityAnalysis)a.panel.querySelector('.cd-analysis-kpis').innerHTML=amountKpi(a.id+'-tfa','tfa',0,rows)+amountKpi(a.id+'-osuc','osuc',1,rows)+a.panel.querySelector('.cd-analysis-kpis').innerHTML;
  a.panel.querySelectorAll('.cd-analysis-kpis [data-cov-open]').forEach(b=>{const def=registry['metric-'+b.dataset.covOpen],title=def.title;def.rows=title==='Latest month'?rows.filter(r=>r.month===[...new Set(rows.map(r=>r.month))].sort().at(-1)):title==='Over 90 days'?rows.filter(r=>past(r)&&age(r)==='>90'):title==='Due within 30 days'?rows.filter(r=>age(r)==='1–30'):title==='Average days past due'?aged:title==='Covenants / relationship'?rows.filter(r=>r.relationship_id):rows;});
  let blocks=[],plans=[],summaries=[];
  const addChart=(suffix,title,type,rs,keyOrSeries,note='',rule='')=>{const id=a.id+'-'+suffix;let data,categories=[];
   if(typeof keyOrSeries==='string'||typeof keyOrSeries==='function'){data=[{name:activityView?'Events':'Covenants',data:points(rs,keyOrSeries,type==='bar'?5:undefined)}];if(keyOrSeries==='status')data[0].data.forEach(p=>{p.color=p.name==='PAST_DUE'?'#D64545':p.name==='COMING_DUE'?'#00AF68':p.color;p.name=p.name==='PAST_DUE'?'Past due':p.name==='COMING_DUE'?'Coming due':p.name;});if(keyOrSeries==='relationship_id')data[0].data.forEach(p=>p.name=p.rows[0].relationship_name);categories=data[0].data.map(p=>p.name);}
   else{data=keyOrSeries.series;categories=keyOrSeries.categories||[];}
   blocks.push(chartCard(id,title,rs,rule||'Count selected rows by the named grouping; bars show the five largest groups, donuts retain all supplied groups.',note));registry[id].parent=a.id;plans.push({id,type,rows:rs,categories,series:data});
  };
  const addAging=()=>{const regs=group(rows,'region').map(g=>g.name);addChart('regional-aging','Aging Severity by Region','column',rows,{categories:regs,series:bands(rows).map((b,i)=>({name:b,color:colors[i],data:regs.map(name=>{const rs=rows.filter(r=>r.region===name&&age(r)===b);return{y:rs.length,custom:{rows:rs}};})}))},selectedStatus,agingRule);addChart('aging-mix',selectedStatus+' Aging Mix','pie',rows,{series:[{name:'Covenants',data:agingPoints(rows)}]},'Same bands as portfolio',agingRule);};
  if(facilityAnalysis){const fs=Risk.facilities(rows,ctx.data?.().portfolio||[]),states=['Over 90 days','Other past due','Coming due only','Other status'];addChart('facility-states','Facilities by Covenant Risk','column',rows,{categories:states,series:[{name:'Facilities',data:states.map(name=>({y:fs.groups.filter(g=>g.record.risk_state===name).length,custom:{rows:fs.groups.filter(g=>g.record.risk_state===name).flatMap(g=>g.rows)}}))}]},'One highest-priority state per facility',def.rule);addChart('facility-products','Covenant-linked Facilities by Product','pie',rows,{series:[{name:'Facilities',data:group(fs.groups,g=>g.record.product).map((g,i)=>({name:g.name,y:g.y,color:colors[i],custom:{rows:g.rows.flatMap(x=>x.rows)}}))}]},'Distinct composite facility identifiers',def.rule);const keys=facilityCols.map(c=>c[0]);blocks.push(tableCard(a.id+'-facility-details','Facility Risk Details',keys.map(label),fs.groups.map(g=>withRows(keys.map(k=>g.record[k]),g.rows)),'One row per region / relationship / facility. Portfolio balances and classification require an unambiguous same-date join and consistent CA. Missing and non-USD amounts remain unavailable; they are not zero.','','detail'));}
  else if(activityView){const months=[...new Set(rows.map(r=>r.month))].sort();addChart('regions','Activity by Region','pie',rows,r=>region(r));addChart('trend',settings.activity[0]+settings.activity.slice(1).toLowerCase()+' activity by month','column',rows,{categories:months,series:group(rows,region).map((g,i)=>({name:g.name,color:colors[i],data:months.map(m=>{const rs=g.rows.filter(r=>r.month===m);return {y:rs.length,custom:{rows:rs}};})}))},'Recorded events · Maker Date month',def.rule+' Covenant Compliance identifies the event type. A deferral is not completion or clearance; Maker Date is not the deferred deadline.');}
  else if(a.id==='metric-cov-relationships'){
   addChart('action-rel','Action Needed by Relationship · Top 5','bar',rows.filter(past),'relationship_id');addChart('volume-rel','By Relationship Volume · Top 5','bar',rows,'relationship_id');
   summaries.push(tableCard(a.id+'-relationship-summary','Top Relationships by Covenant Count',['Relationship','Region','Total','Past due','Coming due'],group(rows,'relationship_id').slice(0,10).map(g=>withRows([g.rows[0].relationship_name,[...new Set(g.rows.map(r=>r.region))].join(', '),g.y,g.rows.filter(past).length,g.rows.filter(coming).length],g.rows)),'Rank relationship IDs by source row count. Past due and coming due are subsets; totals include unknown statuses.'));
  }else if(a.id==='metric-cov-total'){
   addChart('status','Past Due vs Coming Due','pie',rows,'status');const regs=group(rows,'region').map(g=>g.name);addChart('status-region','Past Due vs Coming Due by Region','bar',rows,{categories:regs,series:['PAST_DUE','COMING_DUE'].map((status,i)=>({name:status==='PAST_DUE'?'Past due':'Coming due',color:status==='PAST_DUE'?'#D64545':'#00AF68',data:regs.map(name=>{const rs=rows.filter(r=>r.region===name&&r.status===status);return{y:rs.length,custom:{rows:rs}};})}))},'Explicit source statuses',scopeRule);
  }else if(a.id==='cov-products'){
   addChart('product-mix','Covenants by Product Program','pie',rows,'product');addChart('product-region','Covenants by Region','bar',rows,'region');
   summaries.push(tableCard(a.id+'-program-detail','Product Program Detail',['Program','Total','Past due','Coming due','NAM','LATAM','EMEA','APAC'],group(rows,'product').map(g=>withRows([g.name,g.y,g.rows.filter(past).length,g.rows.filter(coming).length,...['NAM','LATAM','EMEA','APAC'].map(v=>g.rows.filter(r=>r.region===v).length)],g.rows)),'Counts across all supplied rows by product, source status and source region. Other regions remain in Total.'));
  }else addAging();
  if(!activityView){
   const linked=Risk.facilities(rows,ctx.data?.().portfolio||[]).links;
   blocks.push(tableCard(a.id+'-facility-links','Covenant–Facility Links',linkCols.map(c=>c[1]),linked.map(r=>withRows(linkCols.map(c=>r[c[0]]),[r])),exposureRule+' Balances repeat per association; never sum this link table.','','detail'));
   if(a.id!=='cov-products')addChart('products','Covenants by Product Program','pie',rows,'product');
   addChart('underwriters','Covenants by Underwriter · Top 5','bar',rows,'lead_underwriter','Largest accountable workloads');
   if(a.id==='metric-cov-action'||isComing||a.id==='cov-products')addChart('frequency','Covenants by Frequency','pie',rows,'frequency','Source periodicity; missing values shown explicitly');
   if(a.id==='metric-cov-action')addChart('action-region','Action Needed by Region','bar',rows,'region','Source past-due obligations');
   if(isComing){const dates=group(rows,'effective_due_date').sort((a,b)=>a.name.localeCompare(b.name));addChart('timeline','Upcoming Due Timeline','column',rows,{categories:dates.map(g=>g.name),series:[{name:'Covenants',data:dates.map(g=>({y:g.y,custom:{rows:g.rows}}))}]},'Effective dates within the source coming-due population','Count coming-due records by supplied effective due date; no date is invented.');}
   if(isComing||a.id==='metric-cov-action'){const priority=isComing?rows.filter(r=>r.effective_due_date).sort((a,b)=>a.effective_due_date.localeCompare(b.effective_due_date)):aged.slice().sort((a,b)=>b.days_past_due-a.days_past_due);blocks.push(tableCard(a.id+'-priority-records',isComing?'Next Covenants Due':'Most Overdue Covenants',['Relationship','Covenant','Underwriter','Region',isComing?'Due date':'Days past due'],priority.slice(0,10).map(r=>withRows([r.relationship_name,r.covenant_id,r.owner_name,r.region,isComing?r.effective_due_date:r.days_past_due],[r])),isComing?'First ten coming-due rows ordered by supplied effective due date. Missing dates are excluded from this shortlist and retained in supporting records.':'First ten past-due rows ordered by positive supplied days past due, descending. Missing days remain in supporting records.','','detail'));}
   const gr=groupedRows(rows);blocks.push(tableCard(a.id+'-details','Covenant Details by Relationship & Underwriter',['Relationship','Relationship ID','Underwriter','Region',...bands(rows),'Total'],gr.map(r=>withRows([r.relationship_name,r.relationship_id,r.owner_name,r.region,...bands(rows).map(b=>r[b]),r.total],getTableRows(r))),'Group covenant rows by relationship, lead underwriter and region. '+agingRule,'','detail'));
  }
  blocks.push(...summaries);
  definition(a.id+'-attention','What needs attention',rows,'Rank '+(activityView?'regions':'underwriters')+' by source row count. Share = largest group / analysis population. Missing aging counts rows without an exact shared band; activity totals count events, not distinct covenants.');
  const leader=group(rows,activityView?region:'owner_name')[0],share=leader&&rows.length?(100*leader.y/rows.length).toFixed(1)+'%':'—';
  blocks.push('<section class="ch-card cd-insight-card cd-takeaways cd-wide"><div class="ch-card-head"><h2>What needs attention</h2>'+methodButton(a.id+'-attention','What needs attention')+'</div><dl><div><dt>Largest '+(activityView?'region':'underwriter')+'</dt><dd>'+esc(leader?.name||'No records')+'</dd></div><div><dt>Share of this analysis</dt><dd>'+esc(share)+'</dd></div><div><dt>'+(activityView?'Events retained':'Aging not supplied')+'</dt><dd>'+num(activityView?rows.length:rows.filter(r=>!global.CreditCovenantAging.bucket(r,past(r))).length)+'</dd></div></dl><p class="cd-takeaway-note">'+esc(activityView?'Events may repeat the same covenant. They are not a clearance rate.':'Concentration uses source row counts. A missing age does not mean zero days overdue.')+'</p></section>');
  const grid=a.panel.querySelector('.cd-analysis-grid');grid.innerHTML=blocks.join('');grid.querySelectorAll(':scope>.ch-card').forEach(c=>{c.classList.add('cd-insight-card');if(c.querySelector('.ch-chart'))c.classList.add('cd-insight-visual');});
  a.detailCharts=[];for(const p of plans)draw(p.id,p.type,p.rows,p.categories,p.series,a.detailCharts);
  // Keep the primary analytical pair first; shared expansion owns the compact summary.
  const leading=grid.querySelector(activityView?'.ch-card:has([id$="-trend"])':'.ch-card:has([id$="-regional-aging"])');
  const companion=grid.querySelector(activityView?'.ch-card:has([id$="-regions"])':'.ch-card:has([id$="-aging-mix"])');
  if(leading&&companion)grid.prepend(leading,companion);

  grid.querySelector('.ch-card:has([id$="-timeline"])')?.classList.add('cd-wide');
  a.panel.querySelectorAll('.cov-table-card').forEach(card=>{if(registry[card.id])registry[card.id].rows=rows;});wire(a.panel);return true;
 }
 function exposureNote(id){const def=registry[id];if(!def?.exposureSummary)return '';return ' Facility context: '+def.exposureSummary.map(m=>{const d=Risk.delta(m.current,m.prior,m.ready),current=m.money?money(m.current):num(m.current),change=d.ready?(m.money?(d.percent===null?'New balance':(d.change>0?'+':d.change<0?'−':'')+Math.abs(d.percent).toFixed(1)+'%')+' ('+(d.change>0?'+':d.change<0?'−':'')+money(Math.abs(d.change))+')':d.text):'comparison unavailable';return m.label+' '+current+'; '+change;}).join('. ')+'. '+def.exposureCoverage;}
 return {main,expanded,settings,getTableRows,reset(){settings.view='past';settings.activity='DEFERRED';settings.detail='links';},getRows:id=>{const rs=registry[id]?.rows;return rs&&/^(cov-|metric-cov-)/.test(id)&&!id.includes('activity')?Risk.facilities(rs,ctx.data?.().portfolio||[]).links:rs;},getDefinition:id=>registry[id],getMethod:id=>registry[id]?[registry[id].rule+exposureNote(id)+' Daily variance = current minus the previous weekday snapshot; percent change divides by the prior value. Monday compares with Friday. Identical source coverage and active filters are required. Missing history is unavailable; activity charts compare consecutive Maker Date month totals instead. Incomplete latest months compare the same elapsed day in the previous month (clamped to month end). These are event counts, not daily changes or clearance rates.',scopeRule]:null,detailCols};
};
})(window);

;
(function(global){'use strict';
const contracts={"monitoring":[["item_id","text",true],["category","text",true],["source_id","text",true],["source_record_id","text",true],["as_of_date","date",true],["region","text",true],["owner_id","text",true],["owner_name","text",true],["team_lead","text",true],["product","text",true],["relationship_id","text",true],["relationship_name","text",true],["owner_role","text",true],["ca_id","text",false],["facility_id","text",false],["covenant_id","text",false],["status","text",true],["due_date","date",false],["deferred_date","date",false],["deferral_approved","boolean",true],["effective_due_date","date",false],["days_past_due","integer",false],["aging_bucket","text",true],["action_required","boolean",true],["critical","boolean",true],["coming_due","boolean",true],["classification","text",false],["next_month_end","date",false],["expired_bucket","text",false],["deficiency_bucket","text",false],["description","text",false],["remarks","text",false],["origination_unit","text",false],["control_unit","text",false],["ou_expense_code","text",false],["cu_expense_code","text",false],["borrowers_name","text",false],["product_underwriter","text",false],["facility_type","text",false],["frequency","text",false],["source_aging_bucket","text",false],["day45_date","date",false],["pal_covenant_bucket","text",false],["pal_due30","boolean",true],["ccm_status","text",false]],"portfolio":[["facility_key","text",true],["source_id","text",true],["source_record_id","text",true],["as_of_date","date",true],["region","text",true],["owner_id","text",true],["owner_name","text",true],["team_lead","text",true],["product","text",true],["relationship_id","text",true],["relationship_name","text",true],["facility_id","text",true],["parent_facility_id","text",false],["ca_id","text",false],["commitment","text",true],["pse","boolean",true],["sft","boolean",true],["classification","text",true],["tfa","number",true],["direct_os","number",true],["contingent_os","number",true],["pse_os","number",true],["osuc","number",true],["total_os","number",true],["unused_commitment","number",true],["total_undrawn","number",true],["rotce","number",false],["maturity_date","date",false],["maturity_basis","text",true],["ca_expiration_date","date",false],["origination_date","date",false],["renewal_date","date",false],["ytd_new","boolean",true],["mtd_new","boolean",true],["product_subprogram","text",false],["management_status","text",false],["facility_type","text",false],["risk_category","text",false],["control_unit","text",false],["product_underwriter","text",false],["facility_first_approval_date","date",false],["ca_review","text",false],["loan_spread","number",false],["pricing_exception","text",false],["total_comm_exposure","number",false],["reporting_currency","text",true],["unused_uncommitted","number",true],["pal_ca_expired","boolean",true],["pal_ca_month","text",false],["pal_facility_expired","boolean",true],["pal_facility_month","text",false],["pal_approval_period","text",false],["pal_pipeline_bucket","text",false],["pal_spread_bucket","text",false],["pal_spread_weight","number",false],["pal_spread_os","number",true],["pal_pricing_exception","boolean",true],["pal_prior_ytd","boolean",true],["pal_prior_mtd","boolean",true],["pal_new_ytd","boolean",true],["pal_approved_ytd","boolean",true],["pal_pending_ytd","boolean",true],["pal_new_qtd","boolean",true],["pal_approved_qtd","boolean",true],["pal_pending_qtd","boolean",true],["pal_new_mtd","boolean",true],["pal_approved_mtd","boolean",true],["pal_pending_mtd","boolean",true],["pal_new_wtd","boolean",true],["pal_approved_wtd","boolean",true],["pal_pending_wtd","boolean",true],["pal_prior_qtd","boolean",true],["pal_prior_wtd","boolean",true],["rotce_period","text",false]],"history":[["history_id","text",true],["as_of_date","date",true],["region","text",true],["product","text",true],["commitment","text",true],["pse","boolean",true],["tfa","number",true],["total_os","number",true],["osuc","number",true],["facility_count","integer",true],["facility_key","text",false],["owner_id","text",false],["owner_name","text",false],["team_lead","text",false],["management_status","text",false],["product_subprogram","text",false],["facility_type","text",false],["unused_commitment","number",false],["unused_uncommitted","number",false],["comparison_ready","boolean",false]],"activity":[["event_id","text",true],["source_id","text",true],["source_record_id","text",true],["as_of_date","date",true],["region","text",true],["owner_id","text",true],["owner_name","text",true],["team_lead","text",true],["product","text",true],["relationship_id","text",true],["relationship_name","text",true],["covenant_id","text",true],["event_date","date",true],["month","text",true],["event_type","text",true]],"sources":[["source_id","text",true],["domain","text",true],["source_name","text",true],["source_file","text",true],["as_of_date","date",true],["coverage","text",true],["record_count","integer",true],["source_owner","text",true],["quality_note","text",false]],"documents":[["document_id","text",true],["category","text",true],["title","text",true],["url","text",true],["as_of_date","date",false]]};
const categories={COVENANTS:{label:'Covenants',color:'#005BFF',metric:'Past due covenants'},CA:{label:'CA expiration',color:'#F5A524',metric:'CA actions'},FACILITY:{label:'Facility maturity',color:'#4487F7',metric:'Past due facilities'},CCM:{label:'CCM',color:'#87B7FF',metric:'Open CCMs'},INSURANCE:{label:'Insurance',color:'#6488BF',metric:'Insurance issues'},APPRAISALS:{label:'Appraisals',color:'#173E88',metric:'Past due appraisals'}};
const nav=[['portfolio','Portfolio Overview','Portfolio'],['deepdive','Relationship Deep Dive','Deep dive'],['overview','Underwriter Summary','Summary'],['workload','Underwriter Workload','Workload'],...Object.entries(categories).map(([k,v])=>[k,({CA:'CA Expiration',FACILITY:'Facility Maturity',INSURANCE:'Insurances'})[k]||v.label,v.label]),['activity','Covenants Activity','Activity']];
const palette=['#005BFF','#F5A524','#173E88','#87B7FF','#6488BF','#A7B6CC'];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=x=>Number.isFinite(x)?x.toLocaleString('en-US',{maximumFractionDigits:0}):'—';
const money=x=>Number.isFinite(x)?'$'+(x/1e6).toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1})+'m':'—';
const pct=x=>Number.isFinite(x)?(100*x).toFixed(1)+'%':'—';
const sum=(a,k)=>global.CreditDataCache?global.CreditDataCache.sum(a,k):a.reduce((s,r)=>s+(Number.isFinite(r[k])?r[k]:0),0);
const unique=(a,k)=>new Set(a.map(r=>r[k]).filter(Boolean)).size;
const label=x=>String(x??'—').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase()).toLowerCase().replace(/^\w/,c=>c.toUpperCase());
const date=x=>x||'—';
const icon=(i)=>'<span class="ch-icon" aria-hidden="true"><svg viewBox="0 0 24 24">'+(['<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>','<path d="M4 20v-6m8 6V4m8 16V9"/>','<path d="M5 3h14v18H5zM8 8h8M8 12h8M8 16h5"/>'][i%3])+'</svg></span>';
function group(rows,key,metric){const m=new Map();rows.forEach(r=>{const k=r[key]||'UNASSIGNED';m.set(k,(m.get(k)||0)+(metric?r[metric]||0:1));});return [...m].sort((a,b)=>b[1]-a[1]);}
function validateRows(name,rows){
if(!Array.isArray(rows))throw Error(name+': missing rows array');
const dates=new Map();function validDate(v){if(!dates.has(v))dates.set(v,typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v);return dates.get(v);}
for(const [i,r]of rows.entries()){for(const [field,type,required]of contracts[name]){if(!Object.hasOwn(r,field))throw Error(name+': missing '+field+' at row '+(i+1));const v=r[field];if(v===null){if(required)throw Error(name+': required '+field+' is null');continue;}if(required&&v==='')throw Error(name+': required '+field+' is blank');let ok=type==='text'?typeof v==='string':type==='boolean'?typeof v==='boolean':type==='integer'?Number.isInteger(v):type==='number'?typeof v==='number'&&Number.isFinite(v):validDate(v);if(!ok)throw Error(name+': invalid '+field+' at row '+(i+1));}}
if(!Array.isArray(rows))throw Error(name+': missing rows array');const keys={monitoring:'item_id',portfolio:'facility_key',history:'history_id',activity:'event_id',sources:'source_id',documents:'document_id'};const seen=new Set();rows.forEach((r,i)=>{if(!r||typeof r!=='object'||!r[keys[name]]||seen.has(r[keys[name]]))throw Error(name+': missing or duplicate key at row '+(i+1));seen.add(r[keys[name]]);if(name==='monitoring'){if(!categories[r.category])throw Error('Unknown monitoring category');if(r.category==='CCM'&&!['PAST_DUE','COMING_DUE','OPEN'].includes(r.ccm_status))throw Error('Missing or invalid source CCM status');for(const f of ['action_required','critical','coming_due'])if(typeof r[f]!=='boolean')throw Error('Invalid '+f);if(!r.source_id||!/^\d{4}-\d{2}-\d{2}$/.test(r.as_of_date))throw Error('Missing source/date');}if(['portfolio','history'].includes(name))for(const f of ['tfa','total_os','osuc'])if(typeof r[f]!=='number'||!Number.isFinite(r[f]))throw Error('Invalid numeric '+f);});return rows;}
global.CreditHub={validateRows,async mount(root){
let workspace,chartDetails,portfolioJourney,partialTargets=null,pendingTargets;const config=global.CREDIT_CONFIG||{};let charts=[],data={},manifest,releaseLoader,loadCache={},serial=0,overlay,startupCancelled=false,activeRows=[],activeColumns=[],page=0,pageSize=10,search='',drill=null;let portfolioView='charts',portfolioDataKind='facilities';const tableState=global.CreditTables.createState();const state={tab:nav.some(n=>n[0]===config.page)?config.page:'portfolio',region:'',owner_id:'',team_lead:'',product:''};
const $=s=>root.querySelector(s);const $$=s=>[...root.querySelectorAll(s)];
const query=new URLSearchParams(location.search);
for(const field of ['region','owner_id','team_lead','product'])state[field]=query.get('credit_'+field)||'';
const incomingDrill=query.get('credit_drill');if(['action_required','critical'].includes(incomingDrill))drill={key:incomingDrill,value:true};
function navigatePage(target,nextDrill){
 if(target===state.tab){if(nextDrill)drill=nextDrill;page=0;search='';render();return;}
 let href=config.mode==='demo'?'./'+target.toLowerCase()+'.html':null;
 const id=String(config.pageIds?.[target]||'');
 if(config.mode!=='demo'&&/^[1-9]\d*$/.test(id))href=(config.contextPath||'/confluence')+'/pages/viewpage.action?pageId='+id;
 if(!href){const d=global.CreditUI.dialog({title:'Page link not configured',description:'Open '+(nav.find(n=>n[0]===target)?.[1]||target)+' from the native Confluence page tree. Its page ID must be added to the shared dashboard configuration to enable this shortcut.',body:'<p>The current dashboard and filters are unchanged.</p>'});d.element.classList.add('credit-ui-surface');return;}
 const url=new URL(href,location.href);if(url.origin!==location.origin)return;
 for(const field of ['region','owner_id','team_lead','product'])if(state[field])url.searchParams.set('credit_'+field,state[field]);
 if(nextDrill&&['action_required','critical'].includes(nextDrill.key))url.searchParams.set('credit_drill',nextDrill.key);
 location.assign(url.href);
}

function attachment(name){if(!/^[a-zA-Z0-9_.-]+$/.test(name))throw Error('Invalid attachment filename');return(config.baseUrl||'./attachments/').replace(/\/?$/,'/')+encodeURIComponent(name);}
const readJSON=url=>global.CreditDataCache.readJSON(url);
async function load(name){if(data[name])return data[name];if(loadCache[name])return loadCache[name];loadCache[name]=(async()=>{
 const rows=config.mode==='demo'?validateRows(name,global.CREDIT_DEMO?.datasets[name]):await releaseLoader.load(name);
 if(data.sources&&['portfolio','activity'].includes(name))global.CreditDataCache.verifySources(name,rows,data.sources);
 data[name]=rows;return rows;
})();try{return await loadCache[name];}catch(e){delete loadCache[name];delete data[name];releaseLoader?.invalidate(name);throw e;}}
async function loadPrevious(){
 if(data.previous!==undefined)return;
 try{let p;if(config.mode==='demo')p=global.CREDIT_DEMO?.previous;else {const f=manifest.files.previous;if(f){p=await readJSON(attachment(f.filename));if(p.is_demo===true&&config.allowSampleData!==true)throw Error('Illustrative previous data cannot be loaded in production');if(typeof p.is_demo==='boolean'&&typeof manifest.is_demo==='boolean'&&p.is_demo!==manifest.is_demo)throw Error('Previous sample identity differs from the release');if(p.schema_version!==2||p.bundle_id!==manifest.bundle_id||p.rows?.length!==f.rows)throw Error('Previous release identity/count mismatch');}}
  data.previous=p?global.CreditSnapshots.validate(p,validateRows):null;
 }catch(e){data.previous=null;data.previousError=e.message;}
}
async function loadCovenantHistory(){
 if(data.covenantHistory!==undefined)return;
 try{let p;if(config.mode==='demo')p=global.CREDIT_DEMO?.covenant_history;
 else {const f=manifest.files.covenant_history;if(f){p=await readJSON(attachment(f.filename));if(p.is_demo===true&&config.allowSampleData!==true)throw Error('Sample history requires explicit sample configuration');if(typeof p.is_demo==='boolean'&&typeof manifest.is_demo==='boolean'&&p.is_demo!==manifest.is_demo)throw Error('Covenant history sample identity differs from the release');if(p.schema_version!==2||p.bundle_id!==manifest.bundle_id||p.rows?.length!==f.rows)throw Error('Covenant history release mismatch');}}
 p=p||global.CreditSnapshots.covenantHistory(data);
 if(p){global.CreditCovenantRisk.validateHistory(p);for(const snapshot of p.snapshots){validateRows('monitoring',p.rows.filter(r=>r.as_of_date===snapshot.as_of_date));if(snapshot.portfolio_sources)validateRows('portfolio',(p.portfolio_rows||[]).filter(r=>r.as_of_date===snapshot.as_of_date));}}
 data.covenantHistory=p||null;
 }catch(e){data.covenantHistory=null;data.covenantHistoryError=e.message;}
}
// Optional enrichment sources are validated independently. Missing enrichment must
// never prevent a monitoring page from displaying its primary source population.
let relatedSourcesLoad;
function loadRelatedSources(){
 // Optional failures are remembered for this loaded release. Filter/tab/reset
 // actions reuse the result rather than retrying an unavailable attachment.
 if(relatedSourcesLoad)return relatedSourcesLoad;
 relatedSourcesLoad=(async()=>{
 data.relatedSourceErrors??={};
 await Promise.all(['portfolio','activity','history','documents'].map(async name=>{
  if(data[name]!==undefined)return;
  try{await load(name);delete data.relatedSourceErrors[name];}catch(e){data.relatedSourceErrors[name]=e.message;}
 }));
 await loadCovenantHistory();
 if(data.covenantHistoryError)data.relatedSourceErrors.covenant_history=data.covenantHistoryError;
 if(data.previousError)data.relatedSourceErrors.previous=data.previousError;
 if(data.historyError)data.relatedSourceErrors.history=data.historyError;
 if(data.covenantPortfolioError)data.relatedSourceErrors.portfolio=data.covenantPortfolioError;
 })();return relatedSourcesLoad;
}
// Stable facility identity is used for explicit entity navigation, not global click filters.
const facilityIdentity=r=>r.facility_id&&r.relationship_id&&r.region?JSON.stringify([r.region,r.relationship_id,r.facility_id]):null;
function sharedFiltered(rows,values=state){return global.CreditDataCache.select(rows,Object.fromEntries(['region','owner_id','team_lead','product'].map(k=>[k,values[k]])));}
function filtered(rows){return sharedFiltered(rows);}
function portfolioMonitoring(){return sharedFiltered(data.monitoring||[]);}
function resetPortfolioTable(){page=0;search='';drill=null;Object.keys(tableState).forEach(k=>delete tableState[k]);Object.assign(tableState,global.CreditTables.createState());}
function portfolioSelect(id,records,selection,element){
 if(state.tab!=='portfolio'||!portfolioJourney||element?.closest('.cd-detail-page'))return false;
 if(id==='portfolio-summary'||id==='ch-register'||id.startsWith('metric-'))return portfolioJourney.open(id,records,selection);
 return portfolioJourney.click(id,records,selection,element);
}
function portfolioData(){
 const facilities=pal.filterRows(filtered(data.portfolio||[])),monitoring=portfolioMonitoring(),selection=null;
 const selected=facilities;if(portfolioDataKind==='selected')portfolioDataKind='facilities';
 const rows=portfolioDataKind==='monitoring'?monitoring:portfolioDataKind==='selected'?selected:facilities;
 const common=[['relationship_name','Relationship'],['relationship_id','Relationship ID'],['facility_id','Facility ID'],['region','Region'],['product','Product'],['owner_name','Underwriter / specialist'],['team_lead','Team lead']];
 const facilityCols=[...common,['tfa','TFA · USD','m'],['total_os','Outstanding · USD','m'],['osuc','OSUC · USD','m'],['commitment','Commitment'],['as_of_date','Source date']];
 const known=new Set(common.map(c=>c[0])),fields=[...new Set(rows.flatMap(r=>Object.keys(r)))].filter(k=>!known.has(k));
 const columns=portfolioDataKind==='facilities'?facilityCols:[...common,...fields.map(k=>[k,label(k),['tfa','total_os','osuc'].includes(k)?'m':typeof rows.find(r=>r[k]!=null)?.[k]==='number'?'n':undefined])];
 $('#ch-content').innerHTML=register('Portfolio data',rows,columns);
 const toolbar=$('#ch-register .ch-toolbar');toolbar.querySelector('p').textContent=num(facilities.length)+(facilities.length===1?' facility · ':' facilities · ')+num(unique(facilities,'relationship_id'))+(unique(facilities,'relationship_id')===1?' relationship · ':' relationships · ')+num(monitoring.length)+' linked monitoring records.'+(selection&&selected.some(r=>!keys.has(facilityIdentity(r)))?' '+num(selected.filter(r=>!keys.has(facilityIdentity(r))).length)+' selected source rows have no matching portfolio facility; retained under Selected records.':'')+' Select a row to inspect its related records.';
 const controls=document.createElement('div');controls.className='ch-actions';controls.innerHTML='<div class="pal-segments" role="tablist" aria-label="Portfolio dataset">'+[['facilities','Facilities'],['monitoring','Monitoring records'],...(selection?[['selected','Selected records']]:[])].map(([key,name])=>'<button type="button" role="tab" aria-selected="'+(portfolioDataKind===key)+'" class="'+(portfolioDataKind===key?'active':'')+'" data-portfolio-dataset="'+key+'">'+name+'</button>').join('')+'</div><button class="cw-icon-btn cd-section-method" data-portfolio-method aria-label="Methodology for portfolio data">'+global.CreditIcons.icon('info')+'</button>';toolbar.append(controls);
 controls.querySelectorAll('[data-portfolio-dataset]').forEach(b=>b.onclick=()=>{portfolioDataKind=b.dataset.portfolioDataset;resetPortfolioTable();render().then(()=>root.querySelector('[data-portfolio-dataset="'+portfolioDataKind+'"]')?.focus({preventScroll:true}));});controls.querySelector('[data-portfolio-method]').onclick=portfolioMethod;wirePortfolioTabs(controls);
 $('#ch-register').classList.add('cw-framed-card');
}
function wirePortfolioTabs(host){host.querySelectorAll('[role=tab]').forEach(b=>b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const buttons=[...b.parentElement.querySelectorAll('[role=tab]')],i=buttons.indexOf(b),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].focus();buttons[next].click();});}
function portfolioMethod(){chartDetails.methodology('portfolio-scope',{title:'Portfolio data and linked domains',explanation:['Facilities and monitoring records are separate datasets. Page filters apply to supported fields. Facility attributes affect facility records only; they do not remove monitoring records without links.','Chart clicks drill locally. Expand opens the same focused analysis workspace, with Charts / Data and a contextual return. Related records require exact entity keys and matching reporting dates. Table search and column filters affect the table and its export only.']});}

const updatingCards=new Map();
function commitContent(html){
 if(!partialTargets){$('#ch-content').innerHTML=html;return;}
 const template=document.createElement('template');template.innerHTML=html;
 for(const id of partialTargets){const next=template.content.querySelector('#'+id)?.closest('section.ch-card'),old=root.querySelector('#'+id)?.closest('section.ch-card');if(next&&old){updatingCards.set(old,{minHeight:old.style.minHeight,boxSizing:old.style.boxSizing});old.style.boxSizing='border-box';old.style.minHeight=old.getBoundingClientRect().height+'px';const ranking=[...old.querySelectorAll('.cd-chart-controls .pal-select')].filter(label=>!next.querySelector('[data-pal-setting="'+label.querySelector('[data-pal-setting]')?.dataset.palSetting+'"]'));old.innerHTML=next.innerHTML;ranking.forEach(label=>old.querySelector('.ch-card-head').after(label));}}
}
function shouldDraw(id){return !partialTargets||partialTargets.has(id);}
function clearCharts(){charts=charts.filter(c=>{if(!partialTargets||partialTargets.has(c.renderTo?.id)){c.destroy();return false;}return true;});}
function badge(s,bad=false){return '<span class="ch-badge '+(bad?'bad':'')+'">'+esc(label(s))+'</span>';}
function kpis(items){return '<div class="ch-kpis cov-kpis mon-kpis">'+items.map((k,i)=>'<'+(k.action?'button':'div')+' class="ch-kpi pal-metric cov-kpi" '+(k.action?'data-kpi="'+esc(k.action)+'"':'')+'><div class="pal-metric-heading">'+global.CreditIcons.metric(['wallet','shield','chart','building','trend'][i%5],i)+'<div><span>Selected scope</span><h2>'+esc(k.title)+'</h2></div></div><strong class="ch-kpi-value">'+esc(k.value)+'</strong><span class="ch-kpi-note">'+esc(k.note||'')+'</span></'+(k.action?'button':'div')+'>').join('')+'</div>';}
function card(title,sub,id,tall=false){return '<section class="ch-card"><div class="ch-card-head"><div><h2>'+esc(title)+'</h2><p class="ch-card-sub">'+esc(sub)+'</p></div></div><div class="ch-chart '+(tall?'tall':'')+'" id="'+id+'"></div></section>';}
function drillTo(key,value,target){if(target&&target!==state.tab){navigatePage(target,{key,value});return;}drill={key,value};page=0;search='';render();}
function chart(id,type,groups,opts={}){const el=$('#'+id);const total=groups.reduce((n,g)=>n+g[1],0),largest=[...groups].sort((a,b)=>b[1]-a[1])[0];if(groups.length){const summary=document.createElement('div');summary.className='ch-chart-summary';summary.innerHTML='<div><strong>'+esc(opts.money?money(total):num(total))+'</strong><span>'+(opts.money?'Amount shown · USD':'Items shown')+'</span></div><div><strong>'+esc(total?pct(largest[1]/total):'—')+'</strong><span>'+esc(categories[largest[0]]?.label||(largest[0].includes('_')?label(largest[0]):largest[0]))+' · largest group</span></div>';el.before(summary);}if(!groups.length){el.innerHTML='<div class="ch-empty">No records in this selection.</div>';return;}if(!global.Highcharts){el.innerHTML='<div class="ch-empty">Charts unavailable. The register below remains available.</div>';return;}const pts=groups.map(([name,y],i)=>({name,y,color:opts.color||({NAM:'#005BFF',LATAM:'#F5A524',EMEA:'#87B7FF',APAC:'#4487F7',IPB:'#F5A524',SARG:'#F5A524'})[name]||categories[name]?.color||Object.values(categories).find(c=>c.label===name)?.color||palette[i%palette.length],custom:{value:name}}));const c=global.Highcharts.chart(el,{chart:{type,backgroundColor:'transparent',style:{fontFamily:getComputedStyle(root).fontFamily},animation:false,spacing:[12,8,8,0]},title:{text:null},credits:{enabled:false},accessibility:{enabled:true,description:opts.description||'Select a point to filter the register.'},legend:{enabled:type==='pie',align:'right',verticalAlign:'middle',layout:'vertical',itemStyle:{fontSize:'11px',fontWeight:'normal',color:'#697586'}},xAxis:{categories:groups.map(x=>x[0]),lineColor:'#E1E8EF',tickLength:0,labels:{style:{fontSize:'10px',color:'#697586'}}},yAxis:{title:{text:null},allowDecimals:false,gridLineColor:'#E8ECF2',gridLineDashStyle:'Dash',labels:{style:{fontSize:'10px',color:'#697586'}}},tooltip:{useHTML:false,pointFormatter:function(){return this.name+': <b>'+(opts.money?money(this.y):num(this.y))+'</b>'; }},plotOptions:{series:{animation:false,cursor:opts.onClick?'pointer':'default',borderWidth:0,point:{events:{click:function(){opts.onClick?.(this.options.custom.value);}}},dataLabels:{enabled:type==='bar',format:opts.money?undefined:'{point.y}',style:{fontSize:'10px',fontWeight:'normal',textOutline:'none',color:'#697586'}}},pie:{innerSize:'72%',dataLabels:{enabled:false},showInLegend:true,borderWidth:3,borderColor:'#fff'},bar:{borderRadius:4,pointWidth:18}},series:[{name:opts.seriesName||'Items',data:pts,color:opts.color}],responsive:{rules:[{condition:{maxWidth:380},chartOptions:{legend:{align:'center',verticalAlign:'bottom',layout:'horizontal'}}}]}});charts.push(c);if(type==='pie')global.CreditDonut?.(c,{esc,format:opts.money?money:num,label:opts.money?'Total · USD':'Total items',onSelect:opts.onClick?p=>opts.onClick(p.custom.value):null});}
function lineChart(id,rows,measure){const dates=[...new Set(rows.map(r=>r.as_of_date))].sort();if(!global.Highcharts||!dates.length){$('#'+id).innerHTML='<div class="ch-empty">No trend observations.</div>';return;}charts.push(global.Highcharts.chart($('#'+id),{chart:{type:'areaspline',backgroundColor:'transparent',style:{fontFamily:getComputedStyle(root).fontFamily},animation:false},title:{text:null},credits:{enabled:false},legend:{enabled:false},xAxis:{categories:dates,labels:{style:{fontSize:'10px'}}},yAxis:{title:{text:'USD millions'},gridLineColor:'#E8ECF2',gridLineDashStyle:'Dash'},tooltip:{valuePrefix:'$',valueSuffix:'m',valueDecimals:1},plotOptions:{areaspline:{fillOpacity:.06},series:{animation:false,cursor:'pointer',point:{events:{click:function(){drillTo('as_of_date',this.category);}}}}},series:[{name:label(measure),color:'#005BFF',data:dates.map(d=>sum(rows.filter(r=>r.as_of_date===d),measure)/1e6)}]}));}
function register(title,rows,cols){activeRows=rows;activeColumns=cols;return '<section class="ch-card" id="ch-register"><div class="ch-toolbar"><div><h2>'+esc(title)+'</h2><p class="ch-card-sub">'+(drill?'Filtered by '+esc(label(drill.key))+': '+esc(drill.value):'Select a row for source and record details')+'</p></div></div><div class="ch-register-controls"><label class="ch-register-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input id="ch-search" type="search" aria-label="Search register" placeholder="Search this register…" value="'+esc(search)+'"></label><span id="ch-register-count" role="status"></span></div><div id="ch-table"></div></section>';}
function labelValue(v){return label(v);}
function table(){if(!$('#ch-table'))return;let rows=activeRows.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(search.toLowerCase())));if(drill)rows=rows.filter(r=>String(r[drill.key])===String(drill.value));const columnScope=rows,columns=activeColumns.map(([key,label,f])=>({key,label,rangeScale:f==='m'?1e-6:f==='pct'?100:1,rangeUnit:f==='m'?'USD millions':f==='pct'?'percent':'',format:v=>f==='m'?money(v):f==='n'?num(v):f==='pct'?pct(v):f==='badge'?labelValue(v):v}));rows=global.CreditTables.select(rows,columns,tableState);page=Math.min(page,Math.max(0,Math.ceil(rows.length/pageSize)-1));const shown=rows.slice(page*pageSize,page*pageSize+pageSize);$('#ch-table').innerHTML='<div class="ch-table-wrap credit-data-table-scroll"><table class="credit-data-table"><thead></thead><tbody>'+shown.map((r,i)=>'<tr>'+activeColumns.map(([k,t,f],j)=>{const v=r[k];let out=f==='m'?money(v):f==='n'?num(v):f==='pct'?pct(v):String(v??'—');return '<td class="'+(f==='n'||f==='m'?'num':'')+'">'+(j===0?'<button class="ch-row-link" data-row="'+i+'">'+esc(out)+'</button>':f==='badge'?badge(v,(k==='status'&&r.action_required)||v==='SUBSTANDARD'):esc(out))+'</td>';}).join('')+'</tr>').join('')+'</tbody></table>'+(!shown.length?'<div class="ch-empty">No matching records. Clear filters or search to broaden the view.</div>':'')+'</div>';
if(state.tab==='deepdive'&&activeColumns.some(c=>c[2]==='m'))$('#ch-table table').insertAdjacentHTML('beforeend','<tfoot><tr>'+activeColumns.map(([k,t,f],i)=>'<td class="'+(f==='m'?'num':'')+'">'+(i===0?'Total matching':f==='m'?esc(money(sum(rows,k))):'')+'</td>').join('')+'</tr></tfoot>');
global.CreditTables.bindRows({table:$('#ch-table table'),rows:shown,resolve:r=>covenants.getTableRows(r)??[r]});root._exportRows=rows;$('#ch-download').disabled=!rows.length;$('#ch-download').title='Download the filtered register as CSV';$('#ch-register-count').textContent=num(rows.length)+' matching records';global.CreditTables.pagination({host:$('#ch-table'),total:rows.length,page,pageSize,onChange:(next,size)=>{page=next;pageSize=size;table();}});global.CreditTables.decorate({table:$('#ch-table table'),rows:columnScope,columns,state:tableState,onChange:()=>{page=0;table();},matched:rows.length});global.CreditUI.enhance($('#ch-table'));
}
function showRows(title,records){if(state.tab==='portfolio'&&portfolioJourney){const key=Object.entries({tfa:'Total facility amount',total_os:'Outstanding',unused_commitment:'Unused commitment',unused_uncommitted:'Unused uncommitted',facilities:'Facilities',relationships:'Relationships',caexpired:'CAs expired',expired:'Facilities expired'}).find(([,name])=>name===title)?.[0]||(/Pending closure/i.test(title)?'pal-pipeline':'portfolio-summary');portfolioJourney.open(key,records,title);return;}chartDetails.drill('source-records',records,title,title);}

const pal=global.CreditPAL({root,esc,num,money,pct,sum,unique,filtered,monitoringRows:portfolioMonitoring,hasDrill:()=>false,register,kpis,showRows,navigatePage,resetTable(){page=0;search='';drill=null;Object.keys(tableState).forEach(k=>delete tableState[k]);Object.assign(tableState,global.CreditTables.createState());},methodology:id=>chartDetails.methodology(id),openMetric:key=>{if(!portfolioSelect('metric-'+key,pal.getRows('metric-'+key)||[],{tfa:'Total facility amount',total_os:'Outstanding',unused_commitment:'Unused commitment',unused_uncommitted:'Unused uncommitted'}[key]))chartDetails.drillMetric(key);},openChart:(...args)=>{if(!portfolioSelect(...args))chartDetails.drillInPlace(...args);},data:()=>data,state:()=>state,render,commitContent,shouldDraw,addChart:c=>charts.push(c)});

const covenants=global.CreditCovenants({root,esc,num,register,render,commitContent,shouldDraw,data:()=>data,filters:()=>state,resetTable(){page=0;search='';drill=null;Object.keys(tableState).forEach(k=>delete tableState[k]);Object.assign(tableState,global.CreditTables.createState());},openMetric:key=>chartDetails.drillMetric(key),openChart:(...args)=>chartDetails.drillInPlace(...args),methodology:id=>chartDetails.methodology(id),addChart:c=>charts.push(c)});

const monitoringViews=global.CreditMonitoring({root,esc,num,register,data:()=>data,filters:()=>state,openMetric:key=>chartDetails.drillMetric(key),openChart:(...args)=>chartDetails.drillInPlace(...args),methodology:id=>chartDetails.methodology(id),addChart:c=>charts.push(c)});

// One filter model drives the drawer, applied chips, counts and rendered records.
const filterModel={
 fields(){return ['region','owner_id','team_lead','product'].map(key=>{const field=$('#ch-'+key);return {key,label:{region:'Region',owner_id:'Underwriter / specialist',team_lead:'Team lead',product:'Product'}[key],value:state[key],options:[...field.options].map(o=>[o.value,o.textContent]),disabled:field.disabled,group:'shared'};}).concat(state.tab==='portfolio'?pal.filterFields():[]);},
 apply(values){for(const f of this.fields()){const value=values[f.key]??f.value;if(f.options.some(([v])=>v===value)){if(f.group==='shared')state[f.key]=value;else pal.settings[f.key]=value;}}drill=null;search='';page=0;syncFilters();return render();},
 count(values){if(state.tab!=='portfolio')return null;return pal.filterRows((data.portfolio||[]).filter(r=>['region','owner_id','team_lead','product'].every(k=>!values[k]||r[k]===values[k])),values).length;}
};

const monitorCols=[['relationship_name','Relationship'],['ca_id','CA ID'],['owner_name','Owner'],['team_lead','Team lead'],['region','Region'],['status','Status','badge'],['effective_due_date','Due date'],['days_past_due','Days PD','n']];
function scopeDates(rows){const ds=[...new Set(rows.map(r=>r.as_of_date))].sort();return ds.length?ds.length===1?'As of '+ds[0]:'Source dates '+ds[0]+' – '+ds.at(-1):'No records in scope';}
function refreshOptions(rows){for(const k of ['region','owner_id','team_lead','product']){const sel=$('#ch-'+k);const labels={region:'All regions',owner_id:'All owners',team_lead:'All team leads',product:'All products'};const m=new Map(rows.filter(r=>r[k]).map(r=>[r[k],k==='owner_id'?r.owner_name:r[k]]));if(state[k]&&!m.has(state[k]))m.set(state[k],state[k]+' (no records in this view)');sel.innerHTML='<option value="">'+labels[k]+'</option>'+[...m].sort((a,b)=>String(a[1]).localeCompare(String(b[1]))).map(([v,l])=>'<option value="'+esc(v)+'">'+esc(l)+'</option>').join('');sel.value=state[k];}}
function syncFilters(){for(const k of ['region','owner_id','team_lead','product'])$('#ch-'+k).value=state[k];}
function pageBreadcrumb(){
 const id=String(config.pageIds?.lendingAnalytics||''),context=(config.contextPath||'/confluence').replace(/\/$/,'');
 const href=config.mode==='demo'?'./lendinganalytics.html':/^[1-9]\d*$/.test(id)?context+'/pages/viewpage.action?pageId='+id:null;
 const parent=href?'<a href="'+esc(href)+'">Lending Analytics</a>':'<span>Lending Analytics</span>';
 return '<nav class="ch-breadcrumbs" aria-label="Breadcrumb">'+parent+'<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg><span data-breadcrumb-current aria-current="page"></span></nav>';
}
function updateNav(){const view=$('#ch-portfolio-view');if(view){view.hidden=state.tab!=='portfolio';view.querySelectorAll('[data-portfolio-view]').forEach(b=>{b.classList.toggle('active',b.dataset.portfolioView===portfolioView);b.setAttribute('aria-selected',String(b.dataset.portfolioView===portfolioView));});} $$('[data-count-for]').forEach(b=>{b.textContent=categories[b.dataset.countFor]?filtered(data.monitoring).filter(r=>r.category===b.dataset.countFor&&r.action_required).length:'';});$('#ch-title').textContent=nav.find(x=>x[0]===state.tab)[1];$('[data-breadcrumb-current]').textContent=$('#ch-title').textContent;for(const k of ['owner_id','team_lead'])$('#ch-'+k).disabled=state.tab==='trends';}
async function render(targets){
 // Keep the existing view alive while sources load. Merge every dirty widget
 // into the winning request; a full Reset always takes precedence over partials.
 const requested=Array.isArray(targets)&&!root.querySelector('.cd-detail-page')?new Set(targets):null;
 if(pendingTargets===undefined)pendingTargets=requested;
 else if(requested===null)pendingTargets=null;
 else if(pendingTargets)for(const id of requested)pendingTargets.add(id);
 const turn=++serial;$('#ch-content').setAttribute('aria-busy','true');
 try{
  await loadPrevious();let rows;const tab=state.tab;
  if(['portfolio','deepdive'].includes(tab)){
   rows=filtered(await load('portfolio'));
   if(tab==='portfolio')try{await load('history');}catch(e){data.history=[];data.historyError=e.message;}
  }else if(tab==='trends')rows=(await load('history')).filter(r=>(!state.region||r.region===state.region)&&(!state.product||r.product===state.product));
  else if(tab==='activity')rows=filtered(await load('activity'));
  else{
   rows=filtered(data.monitoring);
   if(tab==='COVENANTS'){
    await load('activity');await loadCovenantHistory();
    try{await load('portfolio');}catch(e){data.portfolio=[];data.covenantPortfolioError=e.message;}
   }
  }
  await loadRelatedSources();if(turn!==serial||startupCancelled)return;
  // Only the current request may dispose charts or change the rendered view.
  // No asynchronous work follows this commit boundary.
  partialTargets=pendingTargets;pendingTargets=undefined;
  portfolioJourney?.reset();chartDetails?.beforeRender();clearCharts();
  if(!partialTargets||partialTargets.has('ch-register')){root._exportRows=[];$('#ch-download').disabled=true;}
  updateNav();
  refreshOptions(['portfolio','deepdive'].includes(tab)?data.portfolio:tab==='trends'?data.history:tab==='activity'?data.activity:tab==='COVENANTS'?[...data.monitoring.filter(r=>r.category==='COVENANTS'),...(data.activity||[])]:data.monitoring);
  const sourceRows=['portfolio','deepdive'].includes(tab)?data.portfolio:tab==='trends'?data.history:tab==='activity'?data.activity:categories[tab]?data.monitoring.filter(r=>r.category===tab):data.monitoring;
  const latest=[...new Set((sourceRows||[]).map(r=>r.as_of_date).filter(Boolean))].sort().at(-1);
  $('#ch-last-updated').textContent=latest?new Date(latest+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'Not supplied';
  $('#ch-subtitle').textContent=scopeDates(categories[tab]?rows.filter(r=>r.category===tab):rows);
  $('#ch-filter-status').textContent=rows.length+' records in selected scope';
  $('#ch-drill').innerHTML=drill?'<button class="ch-chip" data-clear-drill>'+esc(label(drill.key))+': '+esc(drill.value)+' ×</button>':'';
  if(tab==='overview'||tab==='workload')monitoringViews.main(tab,rows);
  else if(tab==='COVENANTS')covenants.main(rows,filtered(data.activity||[]));
  else if(categories[tab])monitoringViews.main(tab,rows);
  else if(tab==='portfolio'){if(portfolioView==='data')portfolioData();else pal.overview(rows);}
  else if(tab==='deepdive')pal.deepdive(rows);
  else if(tab==='trends')pal.trends(rows);
  else if(tab==='activity')monitoringViews.main(tab,rows);
  else throw Error('Unknown dashboard page');
  if(!partialTargets||partialTargets.has('ch-register'))table();
  wireContent();workspace?.apply(state.tab,partialTargets);chartDetails?.apply(partialTargets);
  global.CreditTables.enhanceStatic(root);global.CreditUI.enhance(root);global.CreditControls?.enhance(root);global.CreditControls?.tableToolbar(root);
 }catch(e){
  if(turn===serial&&!startupCancelled){pendingTargets=undefined;partialTargets=null;clearCharts();$('#ch-content').innerHTML='<div class="ch-error"><h2>Data could not be loaded</h2><p>'+esc(e.message)+'</p><button class="ch-btn" data-retry>Retry</button></div>';$('#ch-content [data-retry]').onclick=()=>render();}
 }finally{
  if(turn===serial){for(const [card,style] of updatingCards)Object.assign(card.style,style);updatingCards.clear();$('#ch-content')?.removeAttribute('aria-busy');partialTargets=null;}
 }
}
function wireContent(){const s=$('#ch-search');if(s)s.oninput=()=>{search=s.value;page=0;table();};$$('[data-export]').forEach(b=>b.onclick=exportCSV);$('[data-clear-drill]')?.addEventListener('click',()=>{drill=null;page=0;render();});$$('[data-kpi]').forEach(b=>b.onclick=()=>{const k=b.dataset.kpi;if(categories[k]){navigatePage(k,{key:'action_required',value:true});return;}else{const map={action:['action_required',true],critical:['critical',true],coming:['coming_due',true],cert:['status','AWAITING_CERTIFICATE'],review:['status','PENDING_REVIEW'],substandard:['classification','SUBSTANDARD'],special:['classification','SPECIAL_MENTION'],'200':['aging_bucket','200+']};const q=map[k]||['event_type',k];drill={key:q[0],value:q[1]};}page=0;search='';render().then(()=>$('#ch-register')?.scrollIntoView({block:'nearest'}));});}
function exportCSV(){const rs=chartDetails?.tableExportRows()??portfolioJourney?.exportRows()??chartDetails?.exportRows()??root._exportRows??[];if(!rs.length)return;const keys=[...new Set(rs.flatMap(Object.keys))];const cell=v=>'"'+(typeof v==='string'?v.replace(/^(\s*[=+@\-]|[\t\r])/,"'$&"):String(v??'')).replaceAll('"','""')+'"';const str='\uFEFF'+[keys,...rs.map(r=>keys.map(k=>r[k]))].map(row=>row.map(cell).join(',')).join('\r\n');const u=URL.createObjectURL(new Blob([str],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='credit-'+state.tab+'-'+manifest.bundle_id+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
try{
if(config.mode!=='demo'&&new URL(config.baseUrl,location.href).origin!==location.origin)throw Error('Production attachment base must be on the same Confluence origin');
root.replaceChildren();overlay=global.CreditLoadingOverlay?.create({target:root});overlay?.show('Loading Lending Analytics…');await overlay?.paint?.();
async function initialize(){
manifest=config.mode==='demo'?global.CREDIT_DEMO?.manifest:await readJSON(attachment('credit-manifest.json'));if(!manifest||manifest.schema_version!==2||!manifest.bundle_id||!manifest.files)throw Error('Unsupported or missing release manifest');if(config.mode!=='demo'&&manifest.is_demo&&config.allowSampleData!==true)throw Error('Illustrative data cannot be loaded in production mode. Publish an approved Access export.');releaseLoader=global.CreditDataCache.createLoader({manifest,attachment,validate:validateRows,contracts,allowDemo:config.allowSampleData===true});await Promise.all([load('monitoring'),load('sources')]);global.CreditDataCache.verifySources('monitoring',data.monitoring,data.sources);if(startupCancelled)return;
root.innerHTML='<a class="ch-skip" href="#ch-content">Skip to dashboard</a><div class="ch-layout"><main class="ch-main">'+pageBreadcrumb()+'<div class="ch-top"><div><h1 id="ch-title"'+(config.mode!=='demo'?' class="ch-native-title"':'')+'></h1><p class="ch-subtitle" id="ch-subtitle"></p></div><div class="ch-actions"><button class="ch-btn" id="ch-customize">▦ Customize layout</button><button class="ch-btn cw-primary" id="ch-download"><svg class="cw-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>Download data</button><div class="ch-updated"><span>Last updated</span><strong id="ch-last-updated">—</strong></div></div></div><section class="ch-filters" aria-label="Global filters"><div class="ch-filter-grid">'+[['region','Region'],['owner_id','Underwriter / specialist'],['team_lead','Team lead'],['product','Product']].map(([k,t])=>'<label>'+t+'<select id="ch-'+k+'"><option value="">All '+(k==='owner_id'?'owners':t.toLowerCase()+'s')+'</option>'+[...new Map(data.monitoring.map(r=>[r[k],k==='owner_id'?r.owner_name:r[k]])).entries()].sort((a,b)=>a[1].localeCompare(b[1])).map(([v,l])=>'<option value="'+esc(v)+'">'+esc(l)+'</option>').join('')+'</select></label>').join('')+'<button class="ch-btn ch-reset" id="ch-reset">Reset filters</button></div><div class="ch-filter-foot"><span id="ch-filter-status"></span><span id="ch-drill"></span><span>Select chart points to inspect supporting records</span></div></section><div id="ch-content" tabindex="-1"></div><footer class="ch-footer"><span>Wealth Credit Services · Internal use</span><span>Source dates retained for every record</span></footer></main></div>';
for(const k of ['region','owner_id','team_lead','product'])$('#ch-'+k).onchange=e=>{state[k]=e.target.value;drill=null;page=0;render();};$('#ch-reset').onclick=()=>{for(const k of ['region','owner_id','team_lead','product'])state[k]='';pal.reset();covenants.reset();resetPortfolioTable();pageSize=10;syncFilters();render();};const viewSwitch=document.createElement('div');viewSwitch.id='ch-portfolio-view';viewSwitch.className='pal-segments';viewSwitch.setAttribute('role','tablist');viewSwitch.setAttribute('aria-label','Portfolio view');viewSwitch.innerHTML='<button type="button" role="tab" data-portfolio-view="charts">Charts</button><button type="button" role="tab" data-portfolio-view="data">Data</button>';$('#ch-download').before(viewSwitch);viewSwitch.querySelectorAll('button').forEach(b=>b.onclick=()=>{portfolioView=b.dataset.portfolioView;chartDetails.close();resetPortfolioTable();render();});wirePortfolioTabs(viewSwitch);$('#ch-download').onclick=exportCSV;chartDetails=global.CreditChartDetails({root,esc,getCharts:()=>charts,getRows:id=>covenants.getRows(id)??monitoringViews.getRows(id)??pal.getRows(id),getCustomDefinition:id=>covenants.getDefinition(id)??monitoringViews.getDefinition(id),getCustomMethod:id=>covenants.getMethod(id)??monitoringViews.getMethod(id)??pal.getMethod(id),renderCustomAnalysis:a=>covenants.expanded(a)||monitoringViews.expanded(a),getAnalysis:()=>pal.getAnalysis(),renderRelated:opts=>portfolioJourney?.relatedDetail(opts),onChartDrill:portfolioSelect,onExpand:()=>{portfolioJourney?.clearInline();return false;},getContext:()=>({portfolioScope:state.tab==='portfolio',demo:manifest.is_demo,date:$('#ch-last-updated').textContent,filters:filterModel.fields().filter(f=>f.value&&!f.disabled).map(f=>f.label+': '+(f.options.find(([v])=>v===f.value)?.[1]||f.value)).join(' · ')})});workspace=global.CreditWorkspace({root,nav,esc,filters:filterModel,reflow:()=>charts.forEach(c=>c.reflow())});portfolioJourney=global.CreditPortfolioJourney?.({root,esc,getRows:id=>pal.getRows(id),getData:()=>data,getSettings:()=>pal.settings,getCharts:()=>charts,methodology:(...args)=>chartDetails.methodology(...args),getScope:()=>({...pal.getAnalysis(),activity:filtered(data.activity||[]),documents:filtered(data.documents||[]),previous:Object.fromEntries(['portfolio','monitoring','activity','sources'].map(k=>[k,k==='sources'?(data.previous?.datasets[k]||[]):filtered(data.previous?.datasets[k]||[])])),covenantHistory:filtered(data.covenantHistory?.rows||[]),filters:filterModel.fields().filter(f=>f.value&&!f.disabled).map(f=>f.label+': '+(f.options.find(([v])=>v===f.value)?.[1]||f.value)).join(' · ')})});root.addEventListener('credit:table-reset',event=>chartDetails.clearTableDrills(event.detail?.panel));root.addEventListener('credit:table-drill',event=>{const {rows,label,table,trigger}=event.detail||{};if(!Array.isArray(rows)||!table||!root.contains(table))return;event.stopPropagation();chartDetails.drillTable(rows,label,table,trigger);});await render();
}
if(overlay)await overlay.wait(initialize(),{timeoutMs:60000});else await initialize();
}catch(e){startupCancelled=true;++serial;root.innerHTML='<div class="ch-error" role="alert"><h2>Dashboard unavailable</h2><p>'+esc(e.message)+'</p><p>Check the configured attachment page, release manifest and your Confluence access.</p><button class="ch-btn" onclick="location.reload()">Reload</button></div>';}finally{await overlay?.paint?.();overlay?.destroy();}
}};
})(window);

window.CREDIT_PAGE_BUILD="e33f0e6d3431:trends";
})();
