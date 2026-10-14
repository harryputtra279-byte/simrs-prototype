/* PENCARIAN KODE: TEST_KAWASAN_3D_SMOKE — pemeriksaan kontrak statis sederhana. */
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'kawasan-3d.html'), 'utf8');
const checks = [
  ['judul modul', html.includes('SIMRS PROTOTYPE')],
  ['empat unit kawasan', ['data-id="rj"','data-id="ri"','data-id="igd"','data-id="diag"'].every(x=>html.includes(x))],
  ['interaksi keyboard', html.includes("e.key==='Enter'||e.key===' '" )],
  ['penanda pencarian kode', html.includes('PENCARIAN KODE: KAWASAN_3D_UNIT_DATA') && html.includes('PENCARIAN KODE: KAWASAN_3D_SELECT')],
  ['status integrasi jujur', html.includes('Terhubung lokal') && html.includes('tidak menulis perubahan')],
  ['timeline pasien', html.includes('Perjalanan layanan')],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok?'PASS':'FAIL'} ${name}`); if (!ok) failed=true; }
if (failed) process.exit(1);
