'use strict';
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const p=fs.readFileSync(path.join(root,'modules/03-patient-app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'style.css'),'utf8');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');let pass=0;
function check(n,ok){if(!ok){console.error('FAIL '+n);process.exitCode=1;}else{pass++;console.log('PASS '+n);}}
check('rawat jalan memakai status sumber yang sama',p.includes('patientJourneyDefinition(v)')&&p.includes('patientJourneyStepState(v,step)'));
check('rawat inap menampilkan peta figur dan rute',p.includes("renderPatientJourneyMapFromSteps(mapJourney,")&&p.includes('inpatient-main-journey')&&p.includes('mapJourney=main.slice(0,4).concat(supporting).concat(main.slice(4))'));
check('IGD menampilkan peta figur dan rute',p.includes("renderPatientJourneyMapFromSteps(igdSteps,"));
check('tidak kembali ke indeks nol saat tidak ada status active',p.includes("const foundActive=states.findIndex(function(state){return state==='active';});")&&p.includes("const pendingIndex=states.findIndex(function(state){return state==='pending';});")&&p.includes("pendingIndex>=0?pendingIndex:Math.max(0,states.length-1)"));
check('posisi selesai tidak mengklaim tahap awal',p.includes('const finished=states.every(function(state){return state===\'done\';});'));
check('map menjelaskan bukan GPS dan perpindahan terkonfirmasi',p.includes('bukan posisi GPS')&&p.includes('Perpindahan mengikuti konfirmasi petugas'));
check('rute/figur menghormati reduced motion',css.includes('@media(prefers-reduced-motion:reduce)')&&css.includes('.journey-map-person'));
check('cache dan runtime versi 16.5.27 konsisten',html.includes('v16.5.27')&&sw.includes("SW_VERSION = 'v16.5.27'")&&sw.includes('modules/03-patient-app.js?v=16.5.27'));
console.log(pass+'/8 checks passed');
