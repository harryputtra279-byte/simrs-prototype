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
if (!html.includes('v16.5.17') || !core.includes("PROTOTYPE_VERSION = 'v16.5.17'") || !sw.includes("const SW_VERSION = 'v16.5.17'")) fail('Versi index/core service worker tidak seragam v16.5.17');
else pass('Versi runtime, aset, dan Service Worker seragam v16.5.17');

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

// V16.5.8 theme/login/building regressions.
const theme = read('theme-system.js');
const css = read('style.css');
const themeContracts = [
 ['Tema Aplikasi tersedia sebagai tab Master Data untuk Super User', inpatient.includes('Tema Aplikasi</button>') && inpatient.includes('SIMRS_THEME.renderMasterThemeTab()') && theme.includes('function isSuperUser()')],
 ['Galeri tema tidak lagi memakai tombol mengambang', !css.includes('#simrs-theme-open{position:fixed') && !theme.includes('simrs-theme-open')],
 ['Logo dan judul login memiliki glass styling sesuai markup aktual', css.includes('.login-emblem{') && css.includes('.login-hero h1{')],
 ['Daftar gedung tidak disaring hanya karena tidak memiliki bed kosong', inpatient.includes('MASTER BED V16.5.8') && inpatient.includes('return (Store.data.wards||[]).slice();}')],
];
for (const [name, ok] of themeContracts) { if (ok) pass(name); else fail(name); }

if (process.exitCode) process.exit(1);
console.log('Stage 8 static integration contracts: PASS');

// V16.5.0 targeted regression contracts for previously reported defects.
const igdV1650 = read('modules/08-queue-igd-bootstrap.js');
const ranapV1650 = read('modules/07-inpatient-medical-records.js');
const ancillaryV1650 = read('modules/06-diagnostics-pharmacy-cashier.js');
if (igdV1650.includes("jenis:'skrining_triase_igd'") && igdV1650.includes("jenis:'asesmen_igd'")) pass('V16.5.0: skrining dan asesmen IGD dicatat ke clinicalHistory episode'); else fail('V16.5.0: riwayat klinis IGD tidak lengkap');
if (igdV1650.includes('const existingAdm=Store.data.admissions.some') && igdV1650.includes('const existingReq=')) pass('V16.5.0: rujukan admisi IGD mencegah permintaan ganda'); else fail('V16.5.0: guard admisi IGD tidak ditemukan');
if (ranapV1650.includes("window.confirm('Konfirmasi admisi Rawat Inap?") && ranapV1650.includes("window.confirm('Konfirmasi penyelesaian pulang medis?")) pass('V16.5.0: admisi dan pemulangan meminta konfirmasi'); else fail('V16.5.0: konfirmasi tindakan kritis tidak lengkap');
if (ancillaryV1650.includes('data-result-file') && ancillaryV1650.includes('1024*1024') && ancillaryV1650.includes('application/pdf') && ancillaryV1650.includes('lampiran=attachment')) pass('V16.5.0: lampiran gambar/PDF divalidasi dan disimpan bersama hasil'); else fail('V16.5.0: alur lampiran hasil penunjang tidak lengkap');
if (igdV1650.includes('if(rx){rx.items.push') && igdV1650.includes("unit==='igd'")) pass('V16.5.0: resep IGD dapat berisi beberapa obat tanpa item duplikat'); else fail('V16.5.0: penambahan obat IGD belum terhubung');


// V16.5.1: multi-item prescription workflow and collapsed demo groups.
const authV1651 = read('modules/02-navigation-auth-shell.js');
if (authV1651.includes('<details class=\"login-demo-section\"') && !authV1651.includes("(index===0?'open':'')")) pass('V16.5.1: semua grup akun demo tertutup secara default');
else fail('V16.5.1: grup akun demo masih terbuka secara default');
if (igd.includes('function renderIgdMedicineRow(visitId,index)') && igd.includes('data-add-igd-med') && igd.includes('medItems.forEach') && igd.includes('medSeen.has(medId)')) pass('V16.5.1: dokter IGD dapat menyusun resep multiobat dengan validasi duplikasi');
else fail('V16.5.1: penyusun resep multiobat IGD belum lengkap');
if (inpatient.includes('function renderRanapMedicineRow(index)') && inpatient.includes('btn-add-ranap-medicine') && inpatient.includes('items:items') && inpatient.includes('data-ranap-rule')) pass('V16.5.1: dokter Rawat Inap dapat menyusun satu resep multiobat dari master obat');
else fail('V16.5.1: penyusun resep multiobat Rawat Inap belum lengkap');
if (ancillary.includes('function renderFarmasiRanapTab()') && ancillary.includes('resep.items.map') && ancillary.includes('function siapkanObatRanap')) pass('V16.5.1: resep multi-item tetap dapat diproses oleh antrean Farmasi Rawat Inap');
else fail('V16.5.1: pemrosesan resep multi-item di Farmasi Rawat Inap tidak ditemukan');
if (ancillary.includes('Antrean memakai record resep') && ancillary.includes('resep.visitId!==visitId') && ancillary.includes('resep.patientId!==visit.patientId')) pass('V16.5.1: antrean Farmasi IGD/RJ menampilkan tiap resep dan memvalidasi tautan pasien-kunjungan');
else fail('V16.5.1: antrean Farmasi belum mendukung resep lanjutan atau validasi keterkaitan');

if (core.includes('if(!resep.patientId && visit.patientId)')) pass('V16.5.1: migrasi resep lama melengkapi tautan pasien bila ID pasien belum tersimpan');
else fail('V16.5.1: tautan pasien pada resep lama belum dipulihkan');

// V16.5.2: dedicated inpatient prescription card and hierarchical bed picker.
if (inpatient.includes('function submitRanapPrescription(admissionId)') && inpatient.includes('btn-save-ranap-rx') && inpatient.includes('Resep Obat Rawat Inap') && inpatient.includes("unit:'rawat-inap'")) pass('V16.5.2: resep Rawat Inap memiliki kartu dan penyimpanan mandiri ke farmasi');
else fail('V16.5.2: kartu resep mandiri Rawat Inap belum lengkap');
if (inpatient.includes('ab-gedung') && inpatient.includes('ab-lantai') && inpatient.includes('ab-ruang') && inpatient.includes('ab-bed') && inpatient.includes('refreshBedHierarchy')) pass('V16.5.2: pemilihan bed bertahap gedung-lantai-ruang-bed');
else fail('V16.5.2: pemilihan bed hierarkis belum lengkap');
if (igd.includes('Resep Obat IGD</h3>') && igd.indexOf('Resep Obat IGD</h3>') < igd.indexOf('Diagnosis / asesmen IGD')) pass('V16.5.2: kartu resep IGD diletakkan sebelum diagnosis');
else fail('V16.5.2: urutan kartu resep IGD tidak sesuai');

if (inpatient.includes('return ranapPrescriptionComposerHtml(a)+(canWrite') && inpatient.includes('Kirim Resep ke Farmasi Rawat Inap')) pass('V16.5.2: kartu resep Rawat Inap tampil pada layar klinis utama sebelum CPPT/asesmen');
else fail('V16.5.2: kartu resep Rawat Inap tidak tampil pada layar klinis utama');

// V16.5.13: tema harus memiliki alur pilih -> pratinjau -> terapkan.
const themeV16510 = read('theme-system.js');
for (const [name, ok] of [
 ['Tombol Pratinjau tersedia', themeV16510.includes('id="simrs-theme-preview"') && themeV16510.includes("paint(t);root.querySelector('#simrs-theme-selected-label').textContent='Pratinjau aktif:")],
 ['Tombol Terapkan Tema tersedia', themeV16510.includes('id="simrs-theme-apply"') && themeV16510.includes('apply(t);root.querySelector')],
 ['Memilih kartu tidak langsung menerapkan tema', themeV16510.includes("b.onclick=()=>{root.dataset.selectedTheme=t.id")],
 ['Cache dinaikkan ke 16.5.17', read('sw.js').includes('v16.5.17')],
]) { if (ok) pass(name); else fail(name); }

// V16.5.13: manual IGD registration, outside-dismiss modal, and 20/20 theme categories.
const themeV16512 = read('theme-system.js');
if (igd.includes('Daftarkan pasien baru secara manual') && igd.includes('igd-reg-new-name') && igd.includes('identityStatus')) pass('V16.5.13: registrasi pasien baru manual tersedia pada alur IGD');
else fail('V16.5.13: form pasien baru manual IGD belum lengkap');
if (themeV16512.includes('const NATURE_THEMES=') && (themeV16512.match(/"nature": true/g)||[]).length===20) pass('V16.5.13: 20 tema Nature Glassmorphism');
else fail('V16.5.13: jumlah tema Nature tidak 20');
if ((themeV16512.match(/"pattern":/g)||[]).length===20) pass('V16.5.13: 20 tema Batik Glassmorphism');
else fail('V16.5.13: jumlah tema Batik tidak 20');
if (themeV16512.includes('outsideDismissBound') && themeV16512.includes("e.key==='Escape'")) pass('V16.5.13: modal tema mendukung klik luar dan tombol Escape');
else fail('V16.5.13: mekanisme tutup modal belum lengkap');
