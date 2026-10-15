/* PENCARIAN KODE: TEST_INTEGRATED_CAMPUS_SMOKE — V16.5.20 */
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const nav=fs.readFileSync(path.join(root,'modules/02-navigation-auth-shell.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const checks=[
 ['login memiliki scene kawasan terintegrasi',nav.includes('simrs-login-scene')&&nav.includes('campus-isometric')],
 ['scene punya tiga bangunan layanan',nav.includes('campus-main-building')&&nav.includes('campus-clinic-building')&&nav.includes('campus-emergency-building')],
 ['dashboard memiliki hub unit',nav.includes('simrs-campus-hub')&&nav.includes('campus-hub-grid')],
 ['akses unit tetap memakai data-nav',nav.includes('class="campus-unit campus-unit-main" data-nav="dashboard"')],
 ['tema visual memakai token aktif',css.includes('var(--accent)')&&css.includes('var(--accent-2)')],
 ['mobile layout dan reduced motion tersedia',css.includes('@media(max-width:600px)')&&css.includes('prefers-reduced-motion:reduce')],
 ['tidak ada tautan ke halaman 3D mandiri',!nav.includes('href="kawasan-3d.html"')&&!nav.includes('Buka Kawasan 3D')]
];let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++}if(fail)process.exit(1);console.log(`LULUS ${checks.length}/${checks.length}`);
