/* REGRESSION TEST — akses Kawasan 3D harus terlihat dari UI utama.
   Jalankan: node tests/stage8-3d-entrypoint.js */
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const nav = fs.readFileSync('modules/02-navigation-auth-shell.js', 'utf8');
const page = fs.readFileSync('kawasan-3d.html', 'utf8');
const checks = [
  ['halaman 3D ada di root', fs.existsSync('kawasan-3d.html')],
  ['tautan Kawasan 3D tersedia pada layar login', nav.includes('Buka Kawasan 3D') && nav.includes('href="kawasan-3d.html"')],
  ['tautan Kawasan 3D tersedia setelah login', nav.includes('title="Buka visualisasi kawasan rumah sakit"')],
  ['halaman 3D memiliki label versi rilis', page.includes('V16.5.18')],
  ['Service Worker menyertakan halaman 3D', fs.readFileSync('sw.js','utf8').includes("'./kawasan-3d.html'")],
  ['versi rilis seragam', html.includes('v16.5.18') && fs.readFileSync('modules/01-core-store-master.js','utf8').includes("PROTOTYPE_VERSION = 'v16.5.18'") && fs.readFileSync('sw.js','utf8').includes("SW_VERSION = 'v16.5.18'")]
];
let failed = 0;
for (const [name, ok] of checks) {
  console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name);
  if (!ok) failed++;
}
console.log(`${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exit(1);
