(function(){'use strict';const root=document.getElementById('credit-hub');if(!root)return;if(window.CREDIT_CONFIG?.page!=="workload"){root.textContent='This page needs its matching dashboard settings and scripts.';return;}
if(root.dataset.creditStarted)return;
if(window.CREDIT_PAGE_BUILD!=="4ee77c5fc39f:workload"||!window.CreditHub){root.textContent='Load the matching dashboard logic before this renderer.';return;}
root.dataset.creditStarted="workload";window.CreditHub.mount(root);
})();