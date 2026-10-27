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
const label=k=>({tfa_usd:'TFA (USD)',osuc_usd:'OSUC (USD)',banker_name:'Banker name',covenant_ids:'Covenant numbers',owner_name:'Underwriter',owner_id:'Underwriter ID',owner_role:'Underwriter role',source_aging_bucket:'Source aging category',days45_date:'45 days past due date',ca_id:'CA number',covenant_id:'Covenant number',facility_id:'Facility number',as_of_date:'As of date',event_date:'Maker date',event_type:'Covenant compliance'}[k]||k.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase()));
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
   xAxis:{categories:groups.map(v=>global.CreditDates?.label(v)||v),lineColor:'#dce4ec',tickLength:0,labels:{style:{fontSize:'11px',color:'#5b6c7e'}}},yAxis:{title:{text:null},allowDecimals:false,gridLineColor:'#e4eaf2',gridLineDashStyle:'Dash'},legend:{enabled:series.length>1,itemStyle:{fontWeight:'normal',fontSize:'11px'}},tooltip:{pointFormatter:function(){return esc(global.CreditDates?.label(this.name||groups[this.index]||'')||(this.name||groups[this.index]||''))+': <b>'+num(this.y)+'</b> '+esc(this.series.name);}},
   plotOptions:{series:{animation:false,borderWidth:0,cursor:'pointer',point:{events:{click:function(){openRecords(id,this.options.custom?.rows||rows,(this.name||groups[this.index]||'Selected group')+' · '+this.series.name);}}}},pie:{innerSize:'72%',borderWidth:5,borderColor:'#fff',dataLabels:{enabled:false}},bar:{borderRadius:3,maxPointWidth:24,dataLabels:{enabled:true,inside:false,formatter:function(){return this.y?num(this.y):null;},style:{textOutline:'none',fontWeight:'normal'}}},column:{borderRadius:3,maxPointWidth:40,groupPadding:.14,pointPadding:.06,dataLabels:{enabled:true,inside:false,formatter:function(){return this.y?num(this.y):null;},style:{textOutline:'none',fontWeight:'normal'}}}},series});
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
   withRows(['Past-due facilities',pdFacilities.length,'Review overdue obligations and accountable underwriters'],facilitySet.groups.filter(g=>g.record.past_due).flatMap(g=>g.rows)),
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
