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
