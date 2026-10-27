/* Lending Analytics parent page. Content-only, same WCSpedia startup lifecycle.
 * Native Confluence owns the header, title, sidebar and page permissions. */
(function(w){'use strict';
 const groups=[
  ['Understand the portfolio','Exposure, new business and relationship performance.',[
   ['portfolio','Portfolio','See exposure, approvals, expirations and monitoring priorities.'],
   ['deepdive','Relationship deep dive','Inspect a relationship and its facilities, exposure and monitoring.']]],
  ['Manage actions','Prioritize the work and understand who owns it.',[
   ['overview','Underwriters Summary','See action priorities, critical items and accountable-owner workload across monitoring areas.'],
   ['workload','Underwriter workload','Compare workloads, action aging and ownership.']]],
  ['Explore monitoring','Follow a specific obligation from summary to supporting records.',[
   ['COVENANTS','Covenants','Due obligations, aging and covenant activity.'],
   ['CA','CA expiration','Credit approvals approaching or past expiry.'],
   ['FACILITY','Facility maturity','Facilities approaching or past maturity.'],
   ['CCM','CCM','Criticized and classified memos and reviews.'],
   ['INSURANCE','Insurance','Insurance requirements and outstanding certificates.'],
   ['APPRAISALS','Appraisals','Appraisal requirements and upcoming reviews.']]]
 ];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function destination(key,config){if(config.mode==='demo')return './'+key.toLowerCase()+'.html';const id=String(config.pageIds?.[key]||'');return /^[1-9]\d*$/.test(id)?(config.contextPath||'/confluence').replace(/\/$/,'')+'/pages/viewpage.action?pageId='+id:null;}
 function link([key,title,description],config){const href=destination(key,config),icon=w.WCSCreditSidebar?.icon?.(key)||'';
  return '<'+(href?'a href="'+esc(href)+'"':'div aria-disabled="true"')+' class="la-destination">'+icon+'<span><strong>'+esc(title)+'</strong><span>'+esc(description)+'</span>'+(!href?'<small>Page link is not configured</small>':'')+'</span>'+(href?'<svg class="la-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>':'')+'</'+(href?'a':'div')+'>';}
 w.CreditHub={async mount(root){const config=w.CREDIT_CONFIG||{},loading=w.WCSHeaderLoading?.claim(root)||w.WCSLoadingOverlay?.create({target:root});
  try{loading?.show('Loading Lending Analytics…');await loading?.paint?.();
   root.innerHTML='<main class="la-landing"><nav class="ch-breadcrumbs" aria-label="Breadcrumb"><span aria-current="page">Lending Analytics</span></nav><div class="la-intro"><p class="la-eyebrow">Wealth Credit Services</p><h1'+(config.mode!=='demo'?' class="ch-native-title"':'')+'>Lending Analytics</h1><p>Understand the portfolio. Prioritize actions. Explore the records behind every result.</p></div>'+(config.mode==='demo'?'<div class="ch-demo"><strong>Illustrative preview</strong><span>Dashboard figures use sample records.</span></div>':'')+'<div class="la-areas">'+groups.map(([title,description,items])=>'<section class="ch-card la-area"><h2>'+esc(title)+'</h2><p>'+esc(description)+'</p><div class="la-links">'+items.map(item=>link(item,config)).join('')+'</div></section>').join('')+'</div><section class="la-more" aria-label="Covenant activity">'+link(['activity','Covenant activity','Track deferred, waived and deleted covenant events.'],config)+'</section></main>';
   w.WCSUI?.enhance(root);w.WCSCreditSidebar?.refresh();await loading?.paint?.();
  }catch(e){root.innerHTML='<div class="ch-error" role="alert"><h2>Lending Analytics could not load</h2><p>'+esc(e.message)+'</p><button class="ch-btn" data-landing-retry>Retry</button></div>';root.querySelector('[data-landing-retry]').onclick=()=>w.CreditHub.mount(root);
  }finally{loading?.destroy();}
 }};
})(window);
