/* REGRESSION TEST — kampus 3D kini terintegrasi ke login/dashboard. */
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const nav = fs.readFileSync('modules/02-navigation-auth-shell.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
const sw = fs.readFileSync('sw.js', 'utf8');
const core = fs.readFileSync('modules/01-core-store-master.js', 'utf8');
const checks = [
  ['renderer kampus terintegrasi tersedia', nav.includes('function renderCampusNavigator()')],
  ['dashboard memuat navigasi kampus terintegrasi', nav.includes('renderCampusNavigator()+')],
  ['gedung menggunakan navigasi data-nav dan RBAC', nav.includes('isRouteAllowed(u.route,activeRole)') && nav.includes("data-nav=\"'+u.route+'\"")],
  ['login menyatukan identitas dengan ilustrasi kampus', nav.includes('simrs-login-brand') && nav.includes('simrs-login-campus')],
  ['login tidak lagi menawarkan halaman Kawasan 3D terpisah', !nav.includes('Buka Kawasan 3D') && !nav.includes('title="Buka visualisasi kawasan rumah sakit"')],
  ['Glass UI terintegrasi menggunakan token tema', css.includes('PENCARIAN KODE: V16.5.26') && css.includes('--simrs-glass-surface')],
  ['layout mobile dan reduced-motion tersedia', css.includes('@media(max-width:760px)') && css.includes('prefers-reduced-motion:reduce')],
  ['versi rilis seragam', html.includes('v16.5.26') && core.includes("PROTOTYPE_VERSION = 'v16.5.26'") && sw.includes("SW_VERSION = 'v16.5.26'")],
  ['service worker cache memakai versi rilis baru', sw.includes('style.css?v=16.5.26') && sw.includes('modules/02-navigation-auth-shell.js?v=16.5.26')]
];
let failed = 0;
for (const [name, ok] of checks) { console.log((ok ? 'PASS' : 'FAIL') + ' — ' + name); if (!ok) failed++; }
console.log(`${checks.length - failed}/${checks.length} checks passed`);
if (failed) process.exit(1);
