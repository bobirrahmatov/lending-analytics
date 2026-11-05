(function () {
  'use strict';
  const root = document.getElementById('credit-hub');
  if (!root) return;
  if (window.CREDIT_CONFIG?.page !== 'FACILITY') {
    root.textContent = 'This page needs its matching dashboard settings and scripts.';
    return;
  }
  if (root.dataset.creditStarted) return;
  if (window.CREDIT_PAGE_BUILD !== '7b15a1a1d814:FACILITY' || !window.CreditHub) {
    root.textContent = 'Load the matching dashboard logic before this renderer.';
    return;
  }
  root.dataset.creditStarted = 'FACILITY';
  window.CreditHub.mount(root);
})();
