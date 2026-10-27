/* Lending Analytics introduction. Native Confluence owns the title and sidebar. */
(function(w){'use strict';
 const areas=[
  ['01','Understand the portfolio','Review exposure, new business, approaching expirations and the relationships behind the numbers.',[
   ['portfolio','Portfolio Overview'],['deepdive','Relationship Deep Dive']]],
  ['02','Focus the work','See which obligations need attention, who owns them and where workload or aging is concentrated.',[
   ['overview','Underwriter Summary'],['workload','Underwriter Workload']]],
  ['03','Follow the obligations','Explore due dates, exceptions and recorded changes across the credit-monitoring lifecycle.',[
   ['COVENANTS','Covenants'],['activity','Covenants Activity'],['CCM','CCM'],['CA','CA Expiration'],['FACILITY','Facility Maturity'],['INSURANCE','Insurances'],['APPRAISALS','Appraisals']]]
 ];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function destination(key,c){if(c.mode==='demo')return './'+key.toLowerCase()+'.html';const id=String(c.pageIds?.[key]||'');return /^[1-9]\d*$/.test(id)?(c.contextPath||'/confluence').replace(/\/$/,'')+'/pages/viewpage.action?pageId='+id:null;}
 function link([key,title],c){const href=destination(key,c);return href?'<a class="la-page-link" href="'+esc(href)+'">'+esc(title)+'<span aria-hidden="true">↗</span></a>':'<span class="la-page-label">'+esc(title)+'</span>';}
 w.CreditHub={async mount(root){const config=w.CREDIT_CONFIG||{},loading=w.WCSHeaderLoading?.claim(root)||w.WCSLoadingOverlay?.create({target:root});
  try{loading?.show('Loading Lending Analytics…');await loading?.paint?.();
   const image=(config.baseUrl||'../attachments/').replace(/\/?$/,'/')+'lending-analytics-hero.jpg';
   root.innerHTML='<main class="la-landing"><nav class="ch-breadcrumbs" aria-label="Breadcrumb"><span aria-current="page">Lending Analytics</span></nav>'+
    '<div class="la-intro"><p class="la-eyebrow">Wealth Credit Services</p><h1'+(config.mode!=='demo'?' class="ch-native-title"':'')+'>Lending Analytics</h1><h2>From portfolio insight<br>to the next action.</h2><p>A connected view of lending exposure, underwriting priorities and credit monitoring. Start with the bigger picture, explore what needs attention and follow each result to its supporting records.</p></div>'+
    '<figure class="la-hero"><img src="'+esc(image)+'" alt="The interior of a Citi wealth centre" width="2048" height="1366" decoding="async" fetchpriority="high"></figure>'+
    '<section class="la-purpose" aria-labelledby="la-purpose-title"><h2 id="la-purpose-title">One place to understand<br>the lending picture.</h2><div><p>Lending Analytics brings facility, covenant and CCM information together for portfolio oversight and day-to-day credit work. It connects financial exposure with the obligations and people responsible for monitoring it.</p><p>Use the sidebar to move between views. Each page answers a specific question; the records behind a result retain their own source, reporting date and business context.</p></div></section>'+
    '<section class="la-areas" aria-label="Explore Lending Analytics">'+areas.map(([number,title,description,links])=>'<section class="la-area"><span class="la-number" aria-hidden="true">'+number+'</span><h2>'+esc(title)+'</h2><p>'+esc(description)+'</p><div class="la-links">'+links.map(item=>link(item,config)).join('')+'</div></section>').join('')+'</section>'+
    '<section class="la-journey" aria-labelledby="la-journey-title"><div><p class="la-eyebrow">From summary to detail</p><h2 id="la-journey-title">Explore without losing<br>your place.</h2></div><ol><li><strong>Set your scope</strong><span>Choose the available region, product or owner filters. Applied filters remain visible on the page.</span></li><li><strong>Follow a result</strong><span>Select a chart segment or table row to explore its detail. Use the breadcrumb to step back through your selection.</span></li><li><strong>See the supporting records</strong><span>Expand a chart for a focused analysis, then inspect its detailed table. Close returns you to the dashboard.</span></li></ol></section></main>';
   const hero=root.querySelector('.la-hero img');hero.addEventListener('error',()=>hero.closest('figure').hidden=true,{once:true});
   w.WCSUI?.enhance(root);w.WCSCreditSidebar?.refresh();await loading?.paint?.();
  }catch(e){root.innerHTML='<div class="ch-error" role="alert"><h2>Lending Analytics could not load</h2><p>'+esc(e.message)+'</p><button class="ch-btn" data-landing-retry>Retry</button></div>';root.querySelector('[data-landing-retry]').onclick=()=>w.CreditHub.mount(root);
  }finally{loading?.destroy();}
 }};
})(window);
