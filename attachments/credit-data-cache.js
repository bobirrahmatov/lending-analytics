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
