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
