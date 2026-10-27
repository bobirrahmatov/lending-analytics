(function(){'use strict';const root=document.getElementById('credit-hub');if(!root)return;if(window.CREDIT_CONFIG?.page!=="CCM"){root.textContent='This page needs its matching dashboard settings and scripts.';return;}
if(root.dataset.creditStarted)return;
if(window.CREDIT_PAGE_BUILD!=="4ee77c5fc39f:CCM"||!window.CreditHub){root.textContent='Load the matching dashboard logic before this renderer.';return;}
root.dataset.creditStarted="CCM";window.CreditHub.mount(root);
})();