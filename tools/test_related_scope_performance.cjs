/* Differential checks retain the original joins while guarding against quadratic related-data scans. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks');
const context={window:{}};vm.createContext(context);vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../attachments/credit-portfolio-journey.js'),'utf8'),context);
const scope=context.window.CreditPortfolioJourneyModel.detailScope,present=v=>v!==null&&v!==undefined&&v!=='';
const identity=r=>['region','relationship_id','facility_id'].every(k=>present(r[k]))?JSON.stringify([r.region,r.relationship_id,r.facility_id]):null;
const domains={COVENANTS:'Covenants',CCM:'CCM',FACILITY:'Facility monitoring',CA:'CA expiration',INSURANCE:'Insurance',APPRAISALS:'Appraisals'};
// Deliberately simple pre-index reference, used only for small correctness fixtures.
function referenceLinks(rows,portfolio){
 const index=new Map();for(const p of portfolio){const key=identity(p);if(!key)continue;if(!index.has(key))index.set(key,[]);index.get(key).push(p);}
 const datesByKey=new Map(),casByKey=new Map();for(const r of rows){const key=identity(r);if(!datesByKey.has(key)){datesByKey.set(key,new Set());casByKey.set(key,new Set());}datesByKey.get(key).add(r.as_of_date);if(r.ca_id)casByKey.get(key).add(r.ca_id);}
 const facilities=new Map();const records=rows.map(r=>{const key=identity(r),same=(index.get(key)||[]).filter(p=>p.as_of_date===r.as_of_date&&/^\d{4}-\d{2}-\d{2}$/.test(r.as_of_date||''));let reason=!key?'Missing facility key':datesByKey.get(key).size>1?'Mixed source dates':casByKey.get(key).size>1?'Conflicting CA identifiers':!same.length?'No same-date portfolio match':same.length>1?'Ambiguous portfolio match':r.ca_id&&same[0].ca_id&&r.ca_id!==same[0].ca_id?'CA identifier mismatch':same[0].reporting_currency!=='USD'?'Non-USD exposure':'Matched';const p=reason==='Matched'?same[0]:null;if(p)facilities.set(key,p);return {...r,match_status:reason,tfa_usd:Number.isFinite(p?.tfa)?p.tfa:null,osuc_usd:Number.isFinite(p?.osuc)?p.osuc:null};});
 return {records,facilities:[...facilities.values()],matched:records.filter(r=>r.match_status==='Matched').length,total:records.length};
}
// Related datasets preserve their own grain and never broaden the selected facility cohort.
const datasetLabels={records:'Selected records',facilities:'Facilities',activity:'Activity events',previous_facilities:'Previous facilities',previous_monitoring:'Previous monitoring',previous_activity:'Previous activity',covenant_history:'Covenant history',documents:'Linked documents',sources:'Source coverage',...domains};
function referenceScope(rows,portfolio,monitoring,extra={}){
 const candidates=[...portfolio,...(extra.previous?.portfolio||[])],linked=referenceLinks(rows,candidates),dateKey=r=>JSON.stringify([identity(r),r.as_of_date]);
 // An event can refer to a covenant rather than a facility. Follow only published
 // covenant associations with all remaining identity fields and date intact.
 const associationSeeds=rows.filter(r=>!r.facility_id&&r.covenant_id&&r.relationship_id&&r.region&&/^\d{4}-\d{2}-\d{2}$/.test(r.as_of_date||'')).flatMap(r=>monitoring.filter(m=>identity(m)&&m.covenant_id===r.covenant_id&&m.relationship_id===r.relationship_id&&m.region===r.region&&m.as_of_date===r.as_of_date&&(!r.ca_id||!m.ca_id||r.ca_id===m.ca_id)));
 const seeds=[...rows.filter(r=>identity(r)),...associationSeeds],keys=new Map(seeds.map(r=>[dateKey(r),r]));
 if(associationSeeds.length)linked.facilities=referenceLinks(seeds,candidates).facilities;
 // Valid portfolio matches enrich the selected entities, but monitoring does not depend
 // on the availability of a balance extract. Conflicting CA IDs are always rejected.
 const cas=new Map();for(const r of seeds){const k=dateKey(r);if(!cas.has(k))cas.set(k,new Set());if(r.ca_id)cas.get(k).add(r.ca_id);}
 const exact=r=>{const seed=keys.get(dateKey(r)),ids=cas.get(dateKey(r));return /^\d{4}-\d{2}-\d{2}$/.test(r.as_of_date||'')&&seed&&ids.size<=1&&(!r.ca_id||!ids.size||ids.has(r.ca_id));};
 const related=monitoring.filter(exact),datasets={records:rows,facilities:linked.facilities};
 for(const category of Object.keys(domains)){const records=related.filter(r=>r.category===category);if(records.length)datasets[category]=records;}
 // A missing facility key may link an event only through a unique, explicit
 // covenant + relationship + region association. Never broaden by name or owner.
 const covKeys=new Set([...rows,...related].filter(r=>r.covenant_id&&r.relationship_id&&r.region).map(r=>JSON.stringify([r.region,r.relationship_id,r.covenant_id,r.as_of_date])));
 const eventMatch=r=>identity(r)?exact(r):r.covenant_id&&r.relationship_id&&r.region&&covKeys.has(JSON.stringify([r.region,r.relationship_id,r.covenant_id,r.as_of_date]))&&monitoring.filter(m=>m.covenant_id===r.covenant_id&&m.relationship_id===r.relationship_id&&m.region===r.region&&m.as_of_date===r.as_of_date).every(exact);
 const events=(extra.activity||[]).filter(eventMatch);if(events.length)datasets.activity=events;
 const entityKeys=new Set(seeds.map(identity)),currentDates=new Set(rows.map(r=>r.as_of_date).filter(Boolean)),cutoff=[...currentDates].sort()[0];
 const priorMatch=r=>identity(r)&&entityKeys.has(identity(r))&&/^\d{4}-\d{2}-\d{2}$/.test(r.as_of_date||'')&&r.as_of_date<cutoff&&seeds.some(s=>identity(s)===identity(r)&&(!r.ca_id||!s.ca_id||r.ca_id===s.ca_id));
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

const plain=value=>JSON.parse(JSON.stringify(value));
function compare(rows,portfolio,monitoring,extra,label){assert.deepEqual(plain(scope(rows,portfolio,monitoring,extra)),plain(referenceScope(rows,portfolio,monitoring,extra)),label);}
const facility=(i,date='2026-08-31')=>({region:'NAM',relationship_id:'R'+i,facility_id:'F'+i,ca_id:'CA'+i,as_of_date:date,reporting_currency:'USD',tfa:100,osuc:80,source_id:'portfolio'});
const f=facility(1),cov={...f,covenant_id:'C1',category:'COVENANTS',item_id:'item',source_id:'monitoring'},event={...cov,facility_id:null,event_id:'E1'};
compare([f],[f],[cov],{activity:[event,{...event,ca_id:'different'}, {...event,as_of_date:'2026-08-28'}],previous:{portfolio:[facility(1,'2026-08-28'),{...facility(1,'2026-08-28'),ca_id:'different'}]}},'Exact dates, CA compatibility, event fallback and previous snapshots');
compare([event,event,{...event,ca_id:null}],[f],[cov,{...cov,item_id:'duplicate'}, {...cov,facility_id:'F2',ca_id:'CA2'}],{activity:[event]},'Repeated covenant events retain association order without multiplying source records');
compare([f,{...f,ca_id:'conflict'}],[f,f],[cov,{...cov,facility_id:null}],{activity:[event]},'Conflicting selected CAs, ambiguous portfolio and missing keys stay unmatched');
compare([{...event,as_of_date:undefined}],[],[{...cov,as_of_date:null}],{activity:[{...event,as_of_date:undefined},{...event,as_of_date:null}]},'Missing date kinds preserve strict association matching');
let randomState=49827;const random=n=>{randomState=(randomState*1664525+1013904223)>>>0;return randomState%n;};
const values=[undefined,null,'','A','B','C'];
for(let trial=0;trial<350;trial++){
 const portfolio=Array.from({length:8},(_,i)=>({...facility(i%4,['2026-08-31','2026-08-28','invalid'][random(3)]),ca_id:values[random(values.length)],reporting_currency:random(4)?'USD':'EUR'}));
 const monitoring=Array.from({length:18},(_,i)=>({...portfolio[random(portfolio.length)],facility_id:random(5)?'F'+random(4):null,covenant_id:'C'+random(3),category:['COVENANTS','CCM','CA'][random(3)],item_id:'M'+i,ca_id:values[random(values.length)],source_id:'monitoring'}));
 const events=Array.from({length:9},(_,i)=>({...monitoring[random(monitoring.length)],facility_id:random(3)?null:'F'+random(4),event_id:'E'+i}));
 const rows=Array.from({length:1+random(8)},()=>[...portfolio,...monitoring,...events][random(portfolio.length+monitoring.length+events.length)]);
 const previous=monitoring.map(r=>({...r,as_of_date:random(5)?'2026-08-20':'invalid'}));
 compare(rows,portfolio,monitoring,{activity:events,previous:{portfolio,monitoring:previous,activity:events},covenantHistory:previous,documents:monitoring,sources:[{source_id:'monitoring'}],history:[{region:'NAM',tfa:200}],errors:trial%7?{}:{documents:'Unavailable'}},'Differential fixture '+trial);
}
const size=75000,counts={entity:0},guard=row=>{const value=row.facility_id;Object.defineProperty(row,'facility_id',{enumerable:true,get(){assert.ok(++counts.entity<size*100,'Related-data resolution must not rescan the selection per historical row');return value;}});return row;};
const current=Array.from({length:size},(_,i)=>guard(facility(i))),previous=current.map((r,i)=>guard(facility(i,'2026-08-28')));
let start=performance.now();const historical=scope(current,current,[],{previous:{portfolio:previous}}),historicalMs=Math.round(performance.now()-start);assert.equal(historical.datasets.previous_facilities.length,size);assert.equal(historical.datasets.facilities.length,size);assert.ok(counts.entity<size*100);
// A large shared covenant is a worst case for the former nested event filters.
const associations=Array.from({length:size},(_,i)=>({...facility(i),relationship_id:'R1',covenant_id:'C1',category:'COVENANTS'}));
const events=Array.from({length:size},(_,i)=>({region:'NAM',relationship_id:'R1',covenant_id:'C1',as_of_date:'2026-08-31',facility_id:null,event_id:'E'+i}));
start=performance.now();const repeated=scope(events,associations,associations,{activity:events}),eventsMs=Math.round(performance.now()-start);assert.equal(repeated.related.length,size);assert.equal(repeated.datasets.facilities.length,size);assert.equal(repeated.datasets.activity.length,size);assert.equal(repeated.datasets.records.length,size);
console.log('PASS related scope: 354 differential fixtures; exact dates/keys/CA and duplicates; 75,000 facilities + prior snapshots '+historicalMs+' ms ('+counts.entity+' entity reads); 75,000 repeated covenant events + associations '+eventsMs+' ms. Model-only timings, not browser or Confluence load time.');
