/* Shared WCSpedia controls; only presentation preferences are persisted. */
(function(global){'use strict';
const paths={grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',chart:'<path d="M4 20h17M7 16V9m6 7V4m6 12v-5"/>',trend:'<path d="m3 17 6-6 4 3 8-10M15 4h6v6"/>',search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',document:'<path d="M5 3h10l4 4v14H5zM14 3v5h5M8 12h8M8 16h6"/>',users:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M17 5a3 3 0 0 1 0 6M18 15a5 5 0 0 1 3 6"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18M8 15h3"/>',shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8 12l3 3 5-6"/>',building:'<path d="M4 21V5h11v16M15 11h5v10M8 9h3M8 13h3M8 17h3M2 21h20"/>',activity:'<path d="M2 12h5l3-8 4 16 3-8h5"/>',check:'<path d="m5 12 4 4L19 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>',up:'<path d="m6 14 6-6 6 6"/>',down:'<path d="m6 10 6 6 6-6"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',panel:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>',filter:'<path d="M3 6h18M6 12h12M9 18h6"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',wallet:'<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M16 11h5v5h-5zM3 8h18"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>'};
const icon=name=>name==='close'&&global.WCSUI?.icon?global.WCSUI.icon('close'):'<svg class="cw-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.grid)+'</svg>';
// Shared inline SVG tiles for dashboard and expanded-analysis cards.
global.CreditIcons={icon,metric:(name,index)=>'<span class="cw-metric-icon cw-metric-'+index%4+'">'+icon(name)+'</span>'};
// Native top-layer analysis shell. Panels remain under the dashboard root so
// scoped styles, delegated controls and record exports keep the same context.
global.CreditAnalysisOverlay=function({root,panel,title,onClose}){
 const dialog=document.createElement('dialog');dialog.className='wcs-ui-dialog ca-overlay';
 dialog.setAttribute('aria-label',title||'Chart analysis');
 const bar=document.createElement('div');bar.className='ca-overlay-bar';
 const label=document.createElement('span');label.className='ca-overlay-label';label.textContent='Expanded view';
 const actions=document.createElement('div');actions.className='ca-overlay-actions';
 const download=document.createElement('button');download.type='button';download.className='ch-btn cw-primary ca-overlay-download';download.textContent='Download data';
 const close=document.createElement('button');close.type='button';close.className='ch-btn ca-overlay-close wcs-ui-close';close.setAttribute('aria-label','Close analysis');close.innerHTML=icon('close');
 const body=document.createElement('div');body.className='ca-overlay-body';
 actions.append(download,close);bar.append(label,actions);body.append(panel);dialog.append(bar,body);root.append(dialog);
 const doc=document.documentElement,overflow=doc.style.overflow,scroll=global.scrollY;
 global.WCSUI?.closePopover();
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
 return {dialog,body,dispose(){if(removed)return;removed=true;observer.disconnect();global.WCSUI?.closePopover();if(typeof dialog.close==='function')dialog.close();dialog.remove();doc.style.overflow=overflow;global.scrollTo({top:scroll,behavior:'instant'});}};
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
  global.WCSUI?.enhance(root);
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
 let host=document.getElementById('wcspedia');if(!host){host=document.createElement('div');host.id='wcspedia';host.className='credit-ui-host';root.before(host);host.append(root);}
 const UI=global.WCSUI;if(!UI)throw Error('Shared WCSpedia controls did not load.');
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
  filterDrawer=UI.dialog({placement:'right',title:tab==='portfolio'?'Portfolio filters':'Dashboard filters',description:'Refine your view. Changes take effect when you apply.',closeLabel:'Close filters',body:'<div class="wcs-ui-drawer-scroll">'+groups.filter(([key])=>fields.some(f=>f.group===key)).map(([key,title,note])=>'<section class="cw-filter-section"><h3>'+title+'</h3><p>'+note+'</p>'+fields.filter(f=>f.group===key).map(fieldHTML).join('')+'</section>').join('')+'</div><div class="cw-filter-preview" role="status" aria-live="polite"></div><div class="wcs-ui-drawer-footer"><button class="button secondary" data-filter-reset>Reset</button><div class="cw-filter-actions"><button class="button secondary" data-filter-cancel>Cancel</button><button class="button" data-filter-apply>Apply filters</button></div></div>',onClose:()=>{filterDrawer=null;filterButton.setAttribute('aria-expanded','false');}});
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
