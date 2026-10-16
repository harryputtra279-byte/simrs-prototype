/* PENCARIAN KODE: STAGE6_READONLY_CONTRACT — kontrak navigasi kampus terintegrasi. */
const fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const nav=fs.readFileSync(path.join(root,'modules/02-navigation-auth-shell.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const checks=[
 ['renderer kampus terintegrasi tersedia',nav.includes('function renderCampusNavigator()')],
 ['dashboard memakai renderer kampus',nav.includes('renderCampusNavigator()+')],
 ['navigasi unit memeriksa hak akses role',nav.includes('isRouteAllowed(u.route,activeRole)')],
 ['kartu gedung memakai data-nav',nav.includes('class="simrs-campus-unit ')&&nav.includes('data-nav="\'+u.route+\'"')],
 ['navigasi alternatif dapat diakses keyboard',nav.includes('aria-label="Buka ')],
 ['komponen memakai key database hanya untuk alur SIMRS yang ada',fs.readFileSync(path.join(root,'modules/01-core-store-master.js'),'utf8').includes('simrs_db_v1')],
 ['tidak ada perubahan localStorage di renderer kampus',!nav.slice(nav.indexOf('function renderCampusNavigator()'),nav.indexOf('function renderLogin()')).match(/localStorage\.(setItem|removeItem|clear)\s*\(/)],
 ['penanda pencarian kode tersedia',nav.includes('PENCARIAN KODE: NAVIGASI KAMPUS 3D TERINTEGRASI')&&css.includes('PENCARIAN KODE: V16.5.23')]
];let failed=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`LULUS ${checks.length}/${checks.length} kontrak statis.`);
