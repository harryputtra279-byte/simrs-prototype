/* PENCARIAN KODE: TEST_KAWASAN_3D_SMOKE — integrasi pengganti halaman 3D mandiri. */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const nav=fs.readFileSync(path.join(root,'modules/02-navigation-auth-shell.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const checks=[
 ['judul SIMRS Prototype',nav.includes('SIMRS PROTOTYPE')],
 ['unit pelayanan menjadi hotspot gedung',nav.includes('simrs-campus-unit')&&nav.includes('data-nav="\'+u.route+\'"')],
 ['interaksi memakai tombol semantik',nav.includes('<button type="button" class="simrs-campus-unit ')],
 ['penanda pencarian kode',nav.includes('PENCARIAN KODE: NAVIGASI KAMPUS 3D TERINTEGRASI')],
 ['navigasi kampus memeriksa RBAC',nav.includes('isRouteAllowed(u.route,activeRole)')],
 ['dashboard menyediakan navigasi kampus',nav.includes('renderCampusNavigator()+')],
 ['login memiliki ilustrasi kampus 3D',nav.includes('simrs-login-campus')&&css.includes('.simrs-login-building-main')]
];let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`${checks.length}/${checks.length} checks passed`);
