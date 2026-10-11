'use strict';
/*
 * SIMRS PROTOTYPE — Stage 8 regression contracts
 * These are static integration guards, not a substitute for interactive clinical workflow testing.
 */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const fail = message => { console.error('FAIL:', message); process.exitCode = 1; };
const pass = message => console.log('OK:', message);

const html = read('index.html');
const map = JSON.parse(read('MODULE_MAP.json'));
const sw = read('sw.js');
const core = read('modules/01-core-store-master.js');
const patient = read('modules/03-patient-app.js');
const registration = read('modules/04-registration-booking.js');
const outpatient = read('modules/05-outpatient.js');
const ancillary = read('modules/06-diagnostics-pharmacy-cashier.js');
const inpatient = read('modules/07-inpatient-medical-records.js');
const igd = read('modules/08-queue-igd-bootstrap.js');

// Script load order must match the documented contract exactly.
const scripts = [...html.matchAll(/<script src="([^"]+)"/g)]
  .map(m => m[1].split('?')[0]).filter(src => src !== 'qrcode.lib.js');
if (JSON.stringify(scripts) !== JSON.stringify(map.script_order)) fail('Urutan script index.html tidak sama dengan MODULE_MAP.json');
else pass('Urutan pemuatan modul cocok dengan peta dependensi');

// Ensure every referenced local app-shell asset exists.
const assets = [...html.matchAll(/(?:src|href)="([^"?#]+)(?:\?[^\"]*)?"/g)]
  .map(m => m[1]).filter(src => src.startsWith('modules/') || ['style.css','qrcode.lib.js','manifest.json','icon-192.png','icon-512.png','icon-512-maskable.png','apple-touch-icon.png'].includes(src));
for (const asset of new Set(assets)) if (!fs.existsSync(path.join(root, asset))) fail('Aset tidak ditemukan: ' + asset);
if (!process.exitCode) pass('Semua aset lokal yang direferensikan tersedia');

// Global function declarations across classic scripts must not silently override one another.
const functionLocations = new Map();
for (const file of [...map.script_order]) {
  const src = read(file);
  const lines = src.split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = line.match(/^function\s+([A-Za-z_$][\w$]*)\s*\(/);
    if (!match) return;
    const name = match[1];
    if (!functionLocations.has(name)) functionLocations.set(name, []);
    functionLocations.get(name).push(`${file}:${index + 1}`);
  });
}
const duplicates = [...functionLocations.entries()].filter(([, locations]) => locations.length > 1);
if (duplicates.length) duplicates.forEach(([name, locations]) => fail(`Deklarasi fungsi global duplikat ${name}: ${locations.join(', ')}`));
else pass('Tidak ditemukan deklarasi fungsi global duplikat antar-modul');

// Version and cache consistency.
if (!html.includes('v16.4.3') || !core.includes("PROTOTYPE_VERSION = 'v16.4.3'") || !sw.includes("const SW_VERSION = 'v16.4.3'")) fail('Versi index/core/service worker tidak seragam v16.4.3');
else pass('Versi runtime, aset, dan Service Worker seragam v16.4.3');

// Login demo grouping must remain presentational and expose the five agreed service units.
const auth = read('modules/02-navigation-auth-shell.js');
const groupingContracts = [
  ['Pelayanan Rawat Jalan', auth.includes("id:'rawat-jalan'")],
  ['Pelayanan Rawat Inap', auth.includes("id:'rawat-inap'")],
  ['Pelayanan IGD', auth.includes("id:'igd'")],
  ['Pelayanan Penunjang', auth.includes("id:'penunjang'")],
  ['Akun Pasien', auth.includes("id:'pasien'")],
  ['panel login menggunakan details buka-tutup', auth.includes('<details class=\"login-demo-section\"') && auth.includes('<summary class=\"login-demo-summary\"')],
  ['password demo dibaca dari data akun, bukan diganti', auth.includes('esc(u.password)') && auth.includes('data-password=')],
  ['tiga akun ruang dipilih tanpa mengubah data users', auth.includes(".filter(function(u){ return u.role==='perawat_ranap' && u.roomAccount; })") && auth.includes('.slice(0,3)')]
];
for (const [name, ok] of groupingContracts) { if (ok) pass('Login grouping: ' + name); else fail('Login grouping missing: ' + name); }


// Startup safety contract: storage/migration failures must not prevent login render.
if (core.includes('STARTUP GUARD') && core.includes('simrs_db_v1_recovery_backup_v16_4_2') && igd.includes('BOOTSTRAP GUARD') && igd.includes('try { render(); }')) pass('Login startup has storage/migration recovery guards');
else fail('Login startup recovery guard missing');

// Cross-unit workflow contracts: identity linkage and handlers must remain available.
const contracts = [
  ['helper dokter jadwal tunggal', core.includes('function doctorMasterForSchedule(sc)') && !patient.includes('function doctorMasterForSchedule(sc)')],
  ['pasien dapat membuat booking', patient.includes('function submitPatientBooking()') && patient.includes('Store.data.bookings.push')],
  ['check-in booking tetap ada', registration.includes('function confirmPatientCheckin(bookingId)') && registration.includes('function doCheckIn(bookingId)')],
  ['dokter Rawat Jalan membuat resep', outpatient.includes('function bindResepEvents()') && outpatient.includes('function createCareRequest(visit, destination, kind, detail)')],
  ['resep Rawat Jalan terhubung ke kunjungan', core.includes('function linkPrescriptionToVisit(resep, visit)') && core.includes('function reconcileOutpatientPrescriptions()')],
  ['Laboratorium menerima dan mengembalikan hasil ke episode sumber', ancillary.includes('function submitHasilLab(visitId)') && ancillary.includes('function submitHasilLabRanap(admissionId,orderId)')],
  ['Radiologi menerima hasil Rawat Jalan dan Rawat Inap', ancillary.includes('function submitHasilRadiologiRJ(visitId)') && ancillary.includes('function submitHasilRadiologi(admissionId,orderId)')],
  ['Farmasi punya alur resep RJ dan RI', ancillary.includes('function siapkanObat(') && ancillary.includes('function siapkanObatRanap(') && ancillary.includes('function administrasikanObatRanap(')],
  ['Kasir memproses tagihan RJ dan RI', ancillary.includes('function prosesBayar(visitId') && ancillary.includes('function prosesBayarRanap(admissionId')],
  ['Rawat Inap menerima rujukan dan admisi', inpatient.includes('function submitAdmisiBaru()') && inpatient.includes('function submitOrder(admissionId)')],
  ['IGD memiliki satu dashboard dan panel klinis aktif', (igd.match(/^function renderIGD\(/gm) || []).length === 1 && igd.includes("id=\"igd-clinical-list\"") && igd.includes("data-save-igd")],
  ['IGD memiliki satu renderer rujukan', (igd.match(/^function renderIgdReferralsHtml\(/gm) || []).length === 1],
  ['IGD menghubungkan order ke penunjang dan Rawat Inap', igd.includes("createCareRequest(v,'lab'") && igd.includes("createCareRequest(v,'radiologi'") && igd.includes("createCareRequest(v,'rawat-inap'")],
];
for (const [name, ok] of contracts) { if (ok) pass(name); else fail(name); }

if (process.exitCode) process.exit(1);
console.log('Stage 8 static integration contracts: PASS');
