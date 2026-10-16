/* PENCARIAN KODE: STAGE 12 — AUDIT RELEASE V16.5.26 */
'use strict';
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
const p=fs.readFileSync(path.join(root,'modules/03-patient-app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const core=fs.readFileSync(path.join(root,'modules/01-core-store-master.js'),'utf8');
const checks=[
 ['versi HTML, runtime, dan cache seragam V16.5.26',html.includes('v16.5.26')&&sw.includes("SW_VERSION = 'v16.5.26'")&&core.includes("PROTOTYPE_VERSION = 'v16.5.26'")],
 ['pola tujuan ditetapkan bergantian atas-bawah',p.includes('const y=(i%2===0)?22:70;')],
 ['rute SVG dihitung dari jumlah titik aktual',p.includes('buildPatientJourneyGeometry')&&p.includes('journey-route-svg')&&p.includes('const points=pts.map')],
 ['karakter manusia mempunyai kepala, badan, anggota gerak 3D',css.includes('.journey-map-person span::before')&&css.includes('.journey-map-person::before')&&css.includes('.journey-map-person i')&&css.includes('radial-gradient(circle at 30% 22%')],
 ['radiologi Rawat Jalan hanya ditambahkan saat ada permintaan',p.includes('if(hasRad){steps.push({key:\'radiology\'')],
 ['laboratorium Rawat Jalan hanya ditambahkan saat ada permintaan',p.includes('if(hasLab){')&&p.includes("steps.push({key:'lab'")],
 ['radiologi IGD hanya muncul bila order tersedia',p.includes("if(igdV.radiologyRequest&&!['dibatalkan','ditolak'].includes(igdV.radiologyRequest.status))igdSteps.push({label:'Radiologi'")],
 ['radiologi Rawat Inap hanya muncul bila ada order',p.includes("if(hasRad) supporting.push({label:'Radiologi'")],
 ['permintaan radiologi dibatalkan/ditolak tidak ditampilkan di rute',p.includes("!['dibatalkan','ditolak'].includes(v.radiologyRequest.status)")&&p.includes("!['dibatalkan','ditolak'].includes(igdV.radiologyRequest.status)")],
 ['peta Rawat Inap menggabungkan layanan pendukung yang benar-benar ada',p.includes('mapJourney=main.slice(0,4).concat(supporting).concat(main.slice(4))')],
 ['zoom browser tidak dibatasi dengan maximum-scale',!html.includes('maximum-scale=1')],
 ['layout mobile membatasi konten dan navbar pada viewport',css.includes('max-width:100vw!important')&&css.includes('left:8px!important; right:8px!important')],
 ['nama tombol Admin disembunyikan pada ruang sempit, tidak meluber',css.includes('.admin-topbar .admin-menu-label { display:none!important;')],
 ['penanda komentar modul perbaikan tersedia',p.includes('PENCARIAN KODE: PETA PERJALANAN — GEOMETRI ZIG-ZAG DINAMIS')&&css.includes('PENCARIAN KODE: V16.5.26 AUDIT LAYOUT SEMUA ROLE + FIGUR 3D')]
];
let failed=0; for(const [label,ok] of checks){console.log((ok?'PASS ':'FAIL ')+label);if(!ok)failed++;}
console.log(`${checks.length-failed}/${checks.length} checks passed`);process.exitCode=failed?1:0;
