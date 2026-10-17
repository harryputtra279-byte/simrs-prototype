/* PENCARIAN KODE: STAGE 11 — KONTRAK RESPONSIVE DAN PETA ZIG-ZAG */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const patient=fs.readFileSync(path.join(root,'modules/03-patient-app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const checks=[
 ['viewport mencegah overflow horizontal global',/body\s*\{[^}]*overflow-x:\s*(?:hidden|clip)/s.test(css)],
 ['layout utama dan konten mengizinkan penyusutan',/#app,\s*\.app-shell,\s*\.main-area,\s*#main-content\s*\{[^}]*min-width:\s*0/s.test(css)],
 ['modal dibatasi terhadap lebar viewport',/\.modal,\s*\.modal-content,\s*\.modal-dialog,\s*\.bottom-sheet\s*\{[^}]*max-width:\s*calc\(100vw/s.test(css)],
 ['navbar pasien dan staf memakai flex item yang bisa menyusut',/\.bottom-tabbar \.tab-item,\s*\.patient-bottom-nav \.tab-item\s*\{[^}]*min-width:\s*0/s.test(css)],
 ['media query mobile mengatur konten',/@media\s*\(max-width:\s*760px\)/.test(css)],
 ['peta punya node bergantian atas-bawah',patient.includes('const y=(i%2===0)?22:70;')&&css.includes('.journey-route-svg')],
 ['figur memakai koordinat vertikal tahap aktif',/--journey-person-y:/.test(patient)&&patient.includes('buildPatientJourneyGeometry')],
 ['peta memberi keterangan bukan GPS',/bukan pelacakan GPS|bukan posisi GPS/.test(patient)],
 ['runtime dinaikkan konsisten ke v16.5.27',/16\.5\.27/.test(html)&&/16\.5\.27/.test(sw)]
];
let failed=0;
for(const [label,ok] of checks){console.log((ok?'PASS ':'FAIL ')+label);if(!ok)failed++;}
console.log(`${checks.length-failed}/${checks.length} checks passed`);
process.exitCode=failed?1:0;
