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
