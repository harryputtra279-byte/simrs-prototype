'use strict';
/*
 * SIMRS startup smoke test.
 * Uses a small DOM/localStorage shim to test the bootstrap contract without a browser.
 * This complements, but does not replace, a real Android/Chrome workflow test.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const mode = process.env.SIMRS_STORAGE_MODE || 'normal';
const storage = {};
if (mode === 'badjson') storage.simrs_db_v1 = '{broken-json';
if (mode === 'future') storage.simrs_db_v1 = JSON.stringify({ meta: { schemaVersion: 999 }, keep: 'must-not-be-overwritten' });

function makeElement(id) {
  return {
    id, innerHTML: '', textContent: '', value: '', firstChild: null,
    classList: { add() {}, remove() {}, toggle() {} },
    style: {}, dataset: {},
    addEventListener() {}, querySelectorAll() { return []; }, appendChild() {}, insertBefore() {},
    remove() {}, setAttribute() {}, focus() {}
  };
}
const elements = {};
const document = {
  getElementById(id) { return elements[id] || (elements[id] = makeElement(id)); },
  querySelectorAll() { return []; }, querySelector() { return makeElement('query'); },
  createElement(tag) { return makeElement(tag); }, addEventListener() {},
  body: makeElement('body'), documentElement: makeElement('html')
};
const localStorage = {
  getItem(key) { if (mode === 'blocked') throw new Error('localStorage blocked by test'); return Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null; },
  setItem(key, value) { if (mode === 'blocked') throw new Error('localStorage blocked by test'); storage[key] = String(value); },
  removeItem(key) { if (mode === 'blocked') throw new Error('localStorage blocked by test'); delete storage[key]; },
  clear() { Object.keys(storage).forEach(k => delete storage[k]); }
};
const location = { hash: '', reload() {} };
const navigator = { onLine: true };
const ctx = {
  console, document, localStorage, location, navigator, Date, Math, JSON, Array, Object, String,
  Number, Boolean, RegExp, Map, Set, Promise, Intl, URL, Uint8Array, ArrayBuffer, TextEncoder,
  TextDecoder, performance: { now: () => Date.now() }, setTimeout, clearTimeout,
  setInterval: () => 1, clearInterval() {}, requestAnimationFrame: () => 1,
  cancelAnimationFrame() {}, alert() {}, confirm() { return true; }, prompt() { return null; },
  crypto: require('crypto').webcrypto, window: null, globalThis: null, BroadcastChannel: undefined
};
ctx.window = ctx;
ctx.globalThis = ctx;
ctx.addEventListener = () => {};
vm.createContext(ctx);
const scripts = [
  'qrcode.lib.js', 'modules/rawat-inap/core.js', 'modules/01-core-store-master.js',
  'modules/02-navigation-auth-shell.js', 'modules/03-patient-app.js',
  'modules/04-registration-booking.js', 'modules/05-outpatient.js',
  'modules/06-diagnostics-pharmacy-cashier.js', 'modules/07-inpatient-medical-records.js',
  'modules/08-queue-igd-bootstrap.js'
];
for (const file of scripts) {
  try { vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx, { filename: file, timeout: 15000 }); }
  catch (err) { console.error('FAIL: script execution stopped at', file, err.stack || err); process.exit(1); }
}
const html = document.getElementById('app').innerHTML;
if (!html.includes('login-panel') || !html.includes('login-form')) {
  console.error('FAIL: login UI was not rendered in mode', mode);
  process.exit(1);
}
if (mode === 'normal') {
  const expectedGroups = ['rawat-jalan','rawat-inap','igd','penunjang','pasien'];
  for (const group of expectedGroups) {
    if (!html.includes('data-demo-group=\"' + group + '\"')) { console.error('FAIL: login group missing:', group); process.exit(1); }
  }
  const patientButtons = (html.match(/data-username=\"pasien\.demo(?:[1-9]|10)\"/g) || []);
  if (patientButtons.length !== 10) { console.error('FAIL: expected 10 patient demo accounts, found', patientButtons.length); process.exit(1); }
  const roomButtonCount = (html.match(/Perawat Ruang —/g) || []).length;
  if (roomButtonCount !== 3) { console.error('FAIL: expected exactly 3 room demo accounts, found', roomButtonCount); process.exit(1); }
  if (!html.includes('data-username=\"dokter.jaga.pagi\"') || !html.includes('data-username=\"dokter.jaga.sore\"') || !html.includes('data-username=\"dokter.jaga.malam\"')) { console.error('FAIL: inpatient doctor shift accounts missing'); process.exit(1); }
  console.log('PASS: five collapsible groups, 10 patient accounts, 3 room accounts, existing doctor shifts');
}
if (mode === 'blocked' && !ctx.__SIMRS_STORAGE_WARNING) {
  console.error('FAIL: blocked storage did not produce a warning'); process.exit(1);
}
if ((mode === 'badjson' || mode === 'future') && !ctx.__SIMRS_BOOT_WARNING) {
  console.error('FAIL: invalid/future stored data did not produce a recovery warning'); process.exit(1);
}
if ((mode === 'badjson' || mode === 'future') && !storage.simrs_db_v1_recovery_backup_v16_4_2) {
  console.error('FAIL: original data was not backed up before fallback'); process.exit(1);
}
console.log('PASS: login rendered; startup mode =', mode);
