(function(){'use strict';const root=document.getElementById('credit-hub');if(!root)return;if(window.CREDIT_CONFIG?.page!=="COVENANTS"){root.textContent='This page needs its matching dashboard settings and scripts.';window.WCSHeaderLoading?.claim(root)?.destroy();return;}
if(root.dataset.creditStarted)return;
if(window.CREDIT_PAGE_BUILD!=="505a9eb80728:COVENANTS"||!window.CreditHub){root.textContent='Load the matching dashboard logic before this renderer.';window.WCSHeaderLoading?.claim(root)?.destroy();return;}
root.dataset.creditStarted="COVENANTS";window.CreditHub.mount(root);
})();