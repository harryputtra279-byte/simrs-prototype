/* PENCARIAN KODE: STAGE7_ACCESSIBILITY_PERFORMANCE_CONTRACTS — kampus 3D terintegrasi. */
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const nav=fs.readFileSync(path.join(root,'modules/02-navigation-auth-shell.js'),'utf8');
const checks=[
 ['menghormati preferensi reduced-motion',css.includes('prefers-reduced-motion:reduce')],
 ['menggunakan fallback warna dan surface tema',css.includes('--simrs-glass-surface')&&css.includes('var(--paper')],
 ['mengurangi efek pada tampilan mobile',css.includes('@media(max-width:760px)')&&css.includes('@media(max-width:420px)')],
 ['memiliki indikator fokus keyboard yang terlihat',css.includes(':focus-visible')],
 ['mendukung forced-colors',css.includes('forced-colors:active')],
 ['gedung berupa tombol keyboard-accessible',nav.includes('<button type="button" class="simrs-campus-unit ')],
 ['status dashboard tidak memutasi data pasien dari renderer kampus',!nav.slice(nav.indexOf('function renderCampusNavigator()'),nav.indexOf('function renderLogin()')).match(/Store\.save\s*\(/)],
 ['login dan dashboard memakai komposisi kampus terintegrasi',nav.includes('simrs-login-campus')&&nav.includes('renderCampusNavigator()+')],
 ['penanda pencarian kode untuk modul UI',nav.includes('PENCARIAN KODE: NAVIGASI KAMPUS 3D TERINTEGRASI')]
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}if(failed)process.exit(1);console.log(`LULUS ${checks.length}/${checks.length} kontrak statis Tahap 7.`);
