/* Lending Analytics introduction. Native Confluence owns the title and sidebar. */
(function(w){'use strict';
 const areas=[
  ['portfolio','Portfolio & relationships','Understand the portfolio','Review exposure, new business and upcoming expirations. Explore the relationships behind the numbers.',[
   ['portfolio','Portfolio Overview'],['deepdive','Relationship Deep Dive']]],
  ['underwriting','Underwriting','Focus the work','See what needs attention, who owns it and where workload or aging is concentrated.',[
   ['overview','Underwriter Summary'],['workload','Underwriter Workload']]],
  ['monitoring','Credit monitoring','Follow the obligations','Explore due dates, exceptions and recorded changes across the credit-monitoring lifecycle.',[
   ['COVENANTS','Covenants'],['activity','Covenants Activity'],['CCM','CCM'],['CA','CA Expiration'],['FACILITY','Facility Maturity'],['INSURANCE','Insurances'],['APPRAISALS','Appraisals']]]
 ];
 const faqs=[
  ['Which dashboard should I start with?','Start with Portfolio Overview for exposure, new business and upcoming expirations. Use Underwriter Summary for monitoring priorities and Underwriter Workload for owner queues. Open Relationship Deep Dive or a monitoring page for a closer look.'],
  ['What changes when I drill into a chart or table?','Selecting a chart segment or table row narrows that widget. Page filters apply to the supported measures across the page. Use the breadcrumb or Back to return; Reset clears page filters and local selections.'],
  ['How current is the information?','Results reflect the reporting dates supplied by each source. An open dashboard keeps its loaded snapshot; reload the page to check for newly published data. Comparisons appear only when suitable historical records are available.'],
  ['How do I view and download supporting records?','Select Data or expand a chart to inspect its supporting table. Choose the relevant dataset and use search or column filters to narrow the records. Download data exports all matching rows from the selected dataset across every table page.']
 ];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function destination(key,c){if(c.mode==='demo')return './'+key.toLowerCase()+'.html';const id=String(c.pageIds?.[key]||'');return /^[1-9]\d*$/.test(id)?(c.contextPath||'/confluence').replace(/\/$/,'')+'/pages/viewpage.action?pageId='+id:null;}
 const arrow='<svg class="la-link-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16m-6-6 6 6-6 6"/></svg>';
 function link([key,title],c){const href=destination(key,c);return '<li>'+(href?'<a class="la-page-link" href="'+esc(href)+'"><span>'+esc(title)+'</span>'+arrow+'</a>':'<span class="la-page-label">'+esc(title)+'</span>')+'</li>';}
 function faqSection(){return '<section class="la-faq" aria-labelledby="la-faq-title"><h2 id="la-faq-title">Frequently asked questions</h2><div class="la-faq-list">'+faqs.map(([question,answer],i)=>'<div class="la-faq-item"><h3><button type="button" id="la-faq-question-'+i+'" aria-expanded="false" aria-controls="la-faq-answer-'+i+'"><span>'+esc(question)+'</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M5 12h14"/><path class="la-faq-vertical" d="M12 5v14"/></svg></button></h3><div class="la-faq-answer" id="la-faq-answer-'+i+'" role="region" aria-labelledby="la-faq-question-'+i+'" aria-hidden="true" inert><div><p>'+esc(answer)+'</p></div></div></div>').join('')+'</div></section>';}
 w.CreditHub={async mount(root){const config=w.CREDIT_CONFIG||{},loading=w.CreditLoadingOverlay?.create({target:root});
  try{loading?.show('Loading Lending Analytics…');await loading?.paint?.();
   const assets=(config.baseUrl||'../attachments/').replace(/\/?$/,'/'),image=assets+'lending-analytics-hero.jpg',heading=config.mode==='demo'?'h1':'h2';
   root.innerHTML='<main class="la-landing">'+
    '<div class="la-intro"><'+heading+'>From portfolio insight<br>to the next action.</'+heading+'><p>A connected view of lending exposure, underwriting priorities and credit monitoring. Start with the bigger picture, explore what needs attention and follow each result to its supporting records.</p></div>'+
    '<figure class="la-hero"><img src="'+esc(image)+'" alt="Abstract data streams connecting a city skyline" width="1916" height="1080" decoding="async" fetchpriority="high"></figure>'+
    '<section class="la-purpose" aria-labelledby="la-purpose-title"><h2 id="la-purpose-title">One place to understand<br>the lending picture.</h2><div><p>Lending Analytics brings facility, covenant and CCM information together for portfolio oversight and day-to-day credit work. It connects financial exposure with the obligations and people responsible for monitoring it.</p><p>Use the sidebar to move between views. Each page answers a specific question; the records behind a result retain their own source, reporting date and business context.</p></div></section>'+
    '<section class="la-areas" aria-label="Explore Lending Analytics">'+areas.map(([key,category,title,description,links])=>'<article class="la-area" aria-labelledby="la-area-'+key+'"><figure class="la-area-media"><img src="'+esc(assets+'lending-'+key+'.jpg')+'" alt="" width="640" height="480" loading="lazy" decoding="async"></figure><div class="la-area-copy"><p class="la-category">'+esc(category)+'</p><h2 id="la-area-'+key+'">'+esc(title)+'</h2><p class="la-area-description">'+esc(description)+'</p><ul class="la-links" aria-label="'+esc(category)+' dashboards">'+links.map(item=>link(item,config)).join('')+'</ul></div></article>').join('')+'</section>'+
    '<section class="la-journey" aria-labelledby="la-journey-title"><div><p class="la-eyebrow">From summary to detail</p><h2 id="la-journey-title">Explore without losing<br>your place.</h2></div><ol><li><strong>Set your scope</strong><span>Choose the available region, product or owner filters. Applied filters remain visible on the page.</span></li><li><strong>Follow a result</strong><span>Select a chart segment or table row to explore its detail. Use the breadcrumb to step back through your selection.</span></li><li><strong>See the supporting records</strong><span>Expand a chart for a focused analysis, then inspect its detailed table. Close returns you to the dashboard.</span></li></ol></section>'+faqSection()+'</main>';
   root.querySelectorAll('.la-hero img,.la-area-media img').forEach(img=>img.addEventListener('error',()=>{img.closest('figure').hidden=true;},{once:true}));
   root.querySelectorAll('.la-faq-item button').forEach(button=>button.addEventListener('click',()=>{
    const expanded=button.getAttribute('aria-expanded')!=='true',answer=root.querySelector('#'+button.getAttribute('aria-controls'));
    button.setAttribute('aria-expanded',String(expanded));answer.setAttribute('aria-hidden',String(!expanded));answer.inert=!expanded;
   }));
   w.CreditUI?.enhance(root);w.CreditSidebar?.refresh();await loading?.paint?.();
  }catch(e){root.innerHTML='<div class="ch-error" role="alert"><h2>Lending Analytics could not load</h2><p>'+esc(e.message)+'</p><button class="ch-btn" data-landing-retry>Retry</button></div>';root.querySelector('[data-landing-retry]').onclick=()=>w.CreditHub.mount(root);
  }finally{loading?.destroy();}
 }};
})(window);
