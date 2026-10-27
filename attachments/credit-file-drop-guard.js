/* Optional independent space-wide include, loaded once. This prevents accidental browser
 * file-drop uploads/navigation; native permissions and explicit uploads remain.
 * Configure exact native space identity, never an attachment or parent page ID.
 */
(function (global) {
  'use strict';
  if (global.CreditFileDropGuard || !global.document) return;
  var doc = global.document, script = doc.currentScript, lastNotice = -Infinity, noticeTimer;
  var initial = {
    spaceId: script && script.getAttribute('data-credit-space-id') || '',
    spaceKey: script && script.getAttribute('data-credit-space-key') || '',
    enabled: !(script && script.getAttribute('data-credit-file-drop-enabled') === 'false')
  };

  function nativeMetadata(name) {
    var meta = doc.querySelector('meta[name="ajs-' + name + '"]');
    if (meta && meta.content) return String(meta.content);
    if (global.AJS && global.AJS.Meta && typeof global.AJS.Meta.get === 'function') {
      try { return String(global.AJS.Meta.get(name) || ''); }
      catch (_) { /* Missing native metadata leaves this identity unverified. */ }
    }
    return '';
  }

  function active() {
    var config = global.CREDIT_FILE_DROP_CONFIG || {};
    if (config.enabled === false || (config.enabled == null && !initial.enabled)) return false;
    var expectedId = String(config.spaceId == null ? initial.spaceId : config.spaceId);
    var expectedKey = String(config.spaceKey == null ? initial.spaceKey : config.spaceKey);
    if (!expectedId && !expectedKey) return false;
    // Re-read host metadata after native navigation. A numeric page ID is never
    // treated as proof of space identity, and a mismatch overrides another match.
    var id = nativeMetadata('space-id'), key = nativeMetadata('space-key');
    if (expectedId && id && expectedId !== id) return false;
    if (expectedKey && key && expectedKey !== key) return false;
    return !!((expectedId && id === expectedId) || (expectedKey && key === expectedKey));
  }

  function containsFiles(transfer) {
    if (!transfer) return false;
    // Browsers hide FileList contents before drop; types/items identify a file
    // gesture early enough to stop Confluence's native drop upload handlers.
    return Array.from(transfer.types || []).some(function (type) {
      return String(type).toLowerCase() === 'files';
    }) || Array.from(transfer.items || []).some(function (item) {
      return item.kind === 'file';
    }) || !!(transfer.files && transfer.files.length);
  }

  function blockFileDrop(event) {
    if (!containsFiles(event.dataTransfer) || !active()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try { event.dataTransfer.dropEffect = 'none'; }
    catch (_) { /* Some browsers expose a read-only transfer. */ }
    if (event.type !== 'drop' || Date.now() - lastNotice < 3000) return;
    lastNotice = Date.now();
    var notice = doc.getElementById('credit-file-drop-notice');
    if (!notice) {
      notice = doc.createElement('div');
      notice.id = 'credit-file-drop-notice';
      notice.setAttribute('role', 'status');
      notice.style.cssText = 'position:fixed;bottom:24px;right:24px;max-width:min(420px,calc(100vw - 48px));padding:14px 18px;border-radius:8px;background:var(--ds-background-neutral-bold,#17355f);color:var(--ds-text-inverse,#fff);box-shadow:0 4px 18px #0003;z-index:2147483647;font:inherit;font-size:14px;line-height:1.5;';
      doc.body.append(notice);
    }
    notice.textContent = 'File drag-and-drop is disabled here. Use Attachments to upload a file.';
    global.clearTimeout(noticeTimer);
    noticeTimer = global.setTimeout(function () { notice.remove(); }, 6000);
  }

  // Window capture precedes document/element upload handlers. No file-input,
  // paste, text/link drag, network, observer or attachment-write hooks are added.
  ['dragenter', 'dragover', 'drop'].forEach(function (type) {
    global.addEventListener(type, blockFileDrop, {capture: true, passive: false});
  });
  global.CreditFileDropGuard = Object.freeze({isActive: active});
})(window);
