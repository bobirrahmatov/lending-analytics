/* Shared Lending Analytics loading layer. Based on the Covenants overlay and the
 * progress track in wealth/Old/sampleoverlay.html; no external libraries. */
(function (global) {
  'use strict';
  // Page bundles may load this dependency more than once. Keep one API and
  // ID sequence; dashboard mount owns the loading lifecycle.
  if (global.CreditLoadingOverlay?.version === 2 && typeof global.CreditLoadingOverlay.create === 'function' && typeof global.CreditLoadingOverlay.skeleton === 'function') return;
  let sequence = 0;
  function create({target, delayMs = 0}) {
    const doc = target.ownerDocument, pending = new Set();
    let overlay, message, bar, before, attributes, overflow, showTimer = null, queuedProgress = null;
    function show(text = 'Loading Lending Analytics…') {
      if (!overlay && delayMs > 0) {
        if (showTimer === null) showTimer = global.setTimeout(() => { showTimer = null; display(text); }, delayMs);
        return;
      }
      display(text);
    }
    function display(text) {
      if (!overlay) {
        const id = 'credit-loading-message-' + (++sequence);
        before = doc.activeElement;
        attributes = {busy:target.getAttribute('aria-busy'), inert:target.getAttribute('inert')};
        overflow = doc.body.style.overflow;
        target.setAttribute('aria-busy', 'true');
        target.setAttribute('inert', '');
        doc.body.style.overflow = 'hidden';
        overlay = doc.createElement('div');
        overlay.className = 'credit-loading-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', id);
        overlay.tabIndex = -1;
        overlay.innerHTML = '<div class="credit-loading-panel"><div class="credit-loading-logo" role="img" aria-label="Citi"></div>' +
          '<p class="credit-loading-title">Lending Analytics</p>' +
          '<p class="credit-loading-message" id="' + id + '" role="status" aria-live="polite" aria-atomic="true"></p>' +
          '<div class="credit-loading-track" role="progressbar" aria-label="Page loading progress"><div class="credit-loading-fill"></div></div></div>';
        message = overlay.querySelector('.credit-loading-message');
        bar = overlay.querySelector('.credit-loading-track');
        doc.body.append(overlay);
        doc.addEventListener('keydown', keepFocus, true);
        overlay.focus({preventScroll:true});
      }
      overlay.classList.add('is-indeterminate');
      bar.removeAttribute('aria-valuenow');
      bar.removeAttribute('aria-valuemin');
      bar.removeAttribute('aria-valuemax');
      message.textContent = text;
      bar.setAttribute('aria-valuetext', text);
      if (queuedProgress) { const step = queuedProgress; queuedProgress = null; progress(...step); }
    }
    function keepFocus(event) {
      if (event.key === 'Tab' && overlay) {
        event.preventDefault();
        event.stopPropagation();
        overlay.focus({preventScroll:true});
      }
    }
    // Progress counts completed loading steps, never fabricated network bytes.
    function progress(completed, total, text) {
      if (!overlay && showTimer !== null) { queuedProgress = [completed, total, text]; return; }
      if (!overlay || !Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return;
      const value = Math.max(0, Math.min(total, completed));
      overlay.classList.remove('is-indeterminate');
      overlay.style.setProperty('--credit-loading-progress', (value / total * 100) + '%');
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', String(total));
      bar.setAttribute('aria-valuenow', String(value));
      if (text) message.textContent = text;
      bar.setAttribute('aria-valuetext', value + ' of ' + total + ' loading steps complete. ' + message.textContent);
    }
    function adoptTarget(next) {
      if (!next || next === target) return;
      if (overlay) {
        for (const [name, previous] of [['aria-busy', attributes.busy], ['inert', attributes.inert]]) {
          if (previous == null) target.removeAttribute(name); else target.setAttribute(name, previous);
        }
        attributes = {busy:next.getAttribute('aria-busy'), inert:next.getAttribute('inert')};
        next.setAttribute('aria-busy','true');next.setAttribute('inert','');
      }
      target = next;
    }
    function paint() {
      return new Promise(resolve => {
        let settled=false,first,second;
        const done=()=>{if(settled)return;settled=true;global.clearTimeout(timer);global.cancelAnimationFrame(first);global.cancelAnimationFrame(second);resolve();};
        const timer=global.setTimeout(done,100);
        first=global.requestAnimationFrame(()=>{second=global.requestAnimationFrame(done);});
      });
    }
    function hide() {
      queuedProgress = null;
      if (showTimer !== null) { global.clearTimeout(showTimer); showTimer = null; }
      if (!overlay) return;
      const restoreFocus = doc.activeElement === overlay || overlay.contains(doc.activeElement);
      overlay.remove(); overlay = null;
      doc.removeEventListener('keydown', keepFocus, true);
      for (const [name, previous] of [['aria-busy', attributes.busy], ['inert', attributes.inert]]) {
        if (previous == null) target.removeAttribute(name); else target.setAttribute(name, previous);
      }
      if (doc.body.style.overflow === 'hidden') doc.body.style.overflow = overflow;
      if (restoreFocus && before?.isConnected && !before.closest('[inert]')) before.focus({preventScroll:true});
    }
    // Bound read-only startup/refresh waits. A timeout rejects; it never reports
    // success or retries a write whose result could still be uncertain.
    async function wait(promise, {timeoutMs = 60000} = {}) {
      let timer, rejectWait;
      const timeout = new Promise((_, reject) => {
        rejectWait = reject;
        timer = global.setTimeout(() => reject(new Error('Loading took too long. Check your connection, then try again.')), timeoutMs);
      });
      const cancel = () => rejectWait(new Error('Page loading was interrupted.'));
      pending.add(cancel);
      try { return await Promise.race([promise, timeout]); }
      finally { global.clearTimeout(timer); pending.delete(cancel); }
    }
    function destroy() {
      hide();
      for (const cancel of pending) cancel();
      global.removeEventListener('pagehide', destroy);
    }
    global.addEventListener('pagehide', destroy);
    return {show, progress, hide, wait, destroy, adoptTarget, paint};
  }
  function skeleton(label = 'Loading dashboard…') {
    const safe = String(label).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    return '<div class="credit-loading-skeleton" role="status"><span class="sr-only">'+safe+'</span><div aria-hidden="true">'+
      Array.from({length:3}, () => '<div class="credit-skeleton-card"><i></i><i></i><i></i></div>').join('')+'</div></div>';
  }
  global.CreditLoadingOverlay = {create, skeleton, version:2};
})(window);
