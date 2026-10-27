/* Native-space file-drop guard: only file gestures in a verified scope. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {JSDOM} = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '../attachments/credit-file-drop-guard.js'), 'utf8');

function fixture(config, metadata = '<meta name="ajs-space-id" content="3782729579"><meta name="ajs-space-key" content="LENDING">', attributes = '') {
  const dom = new JSDOM('<!doctype html><head>' + metadata + '</head><body><input id="upload" type="file"><script ' + attributes + '></script></body>', {runScripts: 'outside-only', url: 'https://example.test/confluence/pages/viewpage.action?pageId=3977008171'});
  const w = dom.window;
  if (config) w.CREDIT_FILE_DROP_CONFIG = config;
  Object.defineProperty(w.document, 'currentScript', {value: w.document.querySelector('script'), configurable: true});
  let listenerCount = 0;
  const originalAdd = w.addEventListener.bind(w);
  w.addEventListener = function (type, listener, options) {
    if (['dragenter', 'dragover', 'drop'].includes(type)) listenerCount++;
    return originalAdd(type, listener, options);
  };
  w.fetch = () => { throw Error('Guard must not request or upload anything'); };
  w.eval(source);
  const api = w.CreditFileDropGuard;
  w.eval(source);
  assert.equal(w.CreditFileDropGuard, api, 'Duplicate load retains the existing helper');
  assert.equal(listenerCount, 3, 'Listeners install only once');
  return {dom, w};
}

function dispatch(w, type, transfer) {
  const event = new w.Event(type, {bubbles: true, cancelable: true});
  if (transfer) Object.defineProperty(event, 'dataTransfer', {value: transfer});
  let reached = false;
  const observe = () => { reached = true; };
  w.document.addEventListener(type, observe);
  w.document.getElementById('upload').dispatchEvent(event);
  w.document.removeEventListener(type, observe);
  return {event, reached};
}

const fileTypes = () => ({types: ['Files'], items: [], files: [], dropEffect: 'copy'});
{
  const {dom, w} = fixture({spaceId: '3782729579'});
  assert.equal(w.CreditFileDropGuard.isActive(), true);
  for (const type of ['dragenter', 'dragover', 'drop']) {
    for (const transfer of [fileTypes(), {types: [], items: [{kind: 'file'}], files: []}, {types: [], items: [], files: [{}]}]) {
      const result = dispatch(w, type, transfer);
      assert.equal(result.event.defaultPrevented, true, type + ' cancels file upload/navigation');
      assert.equal(result.reached, false, type + ' stops later native upload handlers');
      assert.equal(transfer.dropEffect, 'none');
    }
  }
  for (const type of ['dragenter', 'dragover', 'drop']) {
    for (const transfer of [undefined, {types: ['text/plain'], items: [{kind: 'string'}], files: []}, {types: ['text/uri-list'], items: [{kind: 'string'}], files: []}]) {
      const result = dispatch(w, type, transfer);
      assert.equal(result.event.defaultPrevented, false, type + ' preserves text/link gestures');
      assert.equal(result.reached, true);
    }
  }
  for (const type of ['click', 'input', 'change', 'paste']) {
    const result = dispatch(w, type, fileTypes());
    assert.equal(result.event.defaultPrevented, false, type + ' remains available for deliberate upload/paste');
    assert.equal(result.reached, true);
  }
  w.document.querySelector('meta[name="ajs-space-id"]').content = '999';
  assert.equal(w.CreditFileDropGuard.isActive(), false, 'Native navigation out of scope disables guard');
  assert.equal(dispatch(w, 'drop', fileTypes()).event.defaultPrevented, false);
  dom.window.close();
}

for (const [config, metadata, expected] of [
  [{spaceId: '3782729579'}, '', false],
  [{spaceId: '3977008171'}, '<meta name="ajs-page-id" content="3977008171">', false],
  [{spaceId: '3782729579'}, '<meta name="ajs-space-id" content="999">', false],
  [{spaceKey: 'LENDING'}, '<meta name="ajs-space-key" content="LENDING">', true],
  [{spaceKey: 'LENDING'}, '<meta name="ajs-space-key" content="OTHER">', false],
  [{spaceId: '3782729579', spaceKey: 'LENDING'}, '<meta name="ajs-space-key" content="LENDING">', true],
  [{spaceId: '3782729579', spaceKey: 'LENDING'}, '<meta name="ajs-space-id" content="999"><meta name="ajs-space-key" content="LENDING">', false],
  [{spaceId: '3782729579', enabled: false}, '<meta name="ajs-space-id" content="3782729579">', false],
  [{}, '<meta name="ajs-space-id" content="3782729579">', false]
]) {
  const {dom, w} = fixture(config, metadata);
  assert.equal(w.CreditFileDropGuard.isActive(), expected, 'Exact native scope and explicit disablement');
  assert.equal(dispatch(w, 'drop', fileTypes()).event.defaultPrevented, expected);
  dom.window.close();
}

{
  const {dom, w} = fixture(undefined, '<meta name="ajs-space-key" content="LENDING">', 'data-credit-space-key="LENDING"');
  assert.equal(w.CreditFileDropGuard.isActive(), true, 'Script attributes configure a shared navBar include');
  w.CREDIT_FILE_DROP_CONFIG = {enabled: false};
  assert.equal(dispatch(w, 'drop', fileTypes()).event.defaultPrevented, false);
  dom.window.close();
}
{
  const {dom, w} = fixture({spaceId: '3782729579'}, '');
  w.AJS = {Meta: {get: key => key === 'space-id' ? 3782729579 : ''}};
  assert.equal(w.CreditFileDropGuard.isActive(), true, 'Native AJS metadata fallback accepts numeric space ID');
  w.AJS.Meta.get = () => { throw Error('Host metadata unavailable'); };
  assert.equal(dispatch(w, 'drop', fileTypes()).event.defaultPrevented, false, 'Unverified host scope remains untouched');
  dom.window.close();
}
{
  const {dom, w} = fixture({spaceId: '3782729579'});
  let notices = 0;
  w.WCSNotifications = {show: () => { notices++; throw Error('Optional notification unavailable'); }};
  assert.equal(dispatch(w, 'drop', fileTypes()).event.defaultPrevented, true);
  assert.equal(dispatch(w, 'drop', fileTypes()).event.defaultPrevented, true);
  assert.equal(notices, 1, 'Repeated drops do not flood notifications');
  dom.window.close();
}
console.log('PASS file-drop guard: exact native scope, file-only capture, normal text/link and file picker actions, dynamic navigation, fail-closed scope, idempotence.');
