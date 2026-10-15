/* PENCARIAN KODE: STAGE7_ACCESSIBILITY_PERFORMANCE_CONTRACTS
 * Kontrak statis untuk fallback visual, aksesibilitas dasar, dan integrasi read-only.
 * Tes ini bukan pengganti pengujian browser atau perangkat nyata.
 */
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'kawasan-3d.html'),'utf8');
const checks=[
 ['menghormati preferensi reduced-motion',html.includes('prefers-reduced-motion:reduce')],
 ['menyediakan fallback bila backdrop-filter tidak didukung',html.includes('not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px)))')],
 ['mengurangi efek pada perangkat low-resource/saveData',html.includes('low-resource')&&html.includes('navigator.connection')&&html.includes('saveData')],
 ['memiliki indikator fokus keyboard yang terlihat',html.includes('button:focus-visible,select:focus-visible')],
 ['mendukung forced-colors',html.includes('forced-colors:active')],
 ['unit SVG memiliki label aksesibel dan kontrol keyboard',html.includes('role="button"')&&html.includes("e.key==='Enter'||e.key===' '" )],
 ['status kawasan tetap read-only',html.includes("const DB_KEY='simrs_db_v1'")&&!/localStorage\.(setItem|removeItem|clear)\s*\(/.test(html)],
 ['tidak menggunakan dependensi eksternal pada halaman kawasan',!/<script[^>]+src=["']https?:\/\//i.test(html)&&!/<link[^>]+href=["']https?:\/\//i.test(html)],
 ['penanda pencarian kode untuk modul tahap 7',html.includes('PENCARIAN KODE: STAGE6_LIFECYCLE')&&html.includes('PENCARIAN KODE: SIMRS_READ_ONLY_ADAPTER')]
];
let failed=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
if(failed)process.exit(1);console.log(`LULUS ${checks.length}/${checks.length} kontrak statis Tahap 7.`);
