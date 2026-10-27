(function(){'use strict';const root=document.getElementById('credit-hub');if(!root)return;if(window.CREDIT_CONFIG?.page!=="deepdive"){root.textContent='This page needs its matching dashboard settings and scripts.';return;}
if(root.dataset.creditStarted)return;
if(window.CREDIT_PAGE_BUILD!=="3cf2603f3453:deepdive"||!window.CreditHub){root.textContent='Load the matching dashboard logic before this renderer.';return;}
root.dataset.creditStarted="deepdive";window.CreditHub.mount(root);
})();