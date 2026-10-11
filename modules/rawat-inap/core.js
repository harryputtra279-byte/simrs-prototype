"use strict";
/* INDEKS BANTUAN TAHAP 7
 * Modul: CORE RAWAT INAP
 * Tanggung jawab: Helper inti dan kontrak data Rawat Inap yang dipakai modul aplikasi.
 * Fungsi yang sering menjadi titik masuk (cari nama fungsi dengan Ctrl+F):
 * - currentInpatientShift
 * - inpatientDutyAccounts
 * - getCurrentInpatientDuty
 * - inpatientLocationLabel
 * - inpatientJourneyForAdmission
 * - renderInpatientNurseMonitor
 * Integrasi: fungsi global/Store dipertahankan untuk kompatibilitas classic script.
 * Catatan: jangan memindahkan fungsi lintas modul tanpa audit pemanggil dan uji alur.
 */

/* =================================================================
   MODUL TERPISAH: RAWAT INAP — CORE / HELPER BERSAMA
   PENCARIAN KODE: MODUL: RAWAT INAP | FUNGSI: BED | FUNGSI: SHIFT | FUNGSI: PATIENT JOURNEY

   Tanggung jawab: konstanta status bed, tahapan perjalanan Rawat Inap, definisi shift,
   label lokasi, dan helper ringkasan perjalanan admisi.
   Dependensi runtime: Store dan getUserById disediakan oleh app.js dan baru dipakai
   ketika fungsi dipanggil setelah aplikasi selesai dimuat. File ini harus dimuat SEBELUM app.js.
   Jangan menambahkan akses DOM atau membaca Store saat file ini dievaluasi.
   ================================================================= */
/* =================================================================
   MODUL: RAWAT INAP — STATUS BED DAN PERJALANAN PASIEN
   PENCARIAN KODE: MODUL: RAWAT INAP | FUNGSI: BED | FUNGSI: PATIENT JOURNEY
   ================================================================= */
const INPATIENT_BED_STATUS = {
  kosong:{label:'Kosong',cls:'badge-sage'},
  terisi:{label:'Terisi',cls:'badge-brick'},
  dipesan:{label:'Dipesan',cls:'badge-amber'},
  persiapan:{label:'Persiapan / dibersihkan',cls:'badge-amber'},
  perbaikan:{label:'Perbaikan',cls:'badge-slate'}
};
const INPATIENT_JOURNEY = [
  {key:'admission',label:'Admisi',icon:'🏥'},
  {key:'bed',label:'Bed / Kamar',icon:'🛏️'},
  {key:'perawatan',label:'Perawatan',icon:'🩺'},
  {key:'penunjang',label:'Penunjang',icon:'🔬'},
  {key:'farmasi',label:'Farmasi',icon:'💊'},
  {key:'discharge',label:'Pulang',icon:'📋'},
  {key:'billing',label:'Kasir',icon:'🧾'},
  {key:'selesai',label:'Selesai',icon:'✓'}
];
const INPATIENT_SHIFTS = [
  {id:'PAGI',label:'Shift Pagi',jamMulai:'06:00',jamSelesai:'14:00',start:6,end:14},
  {id:'SORE',label:'Shift Sore',jamMulai:'14:00',jamSelesai:'22:00',start:14,end:22},
  {id:'MALAM',label:'Shift Malam',jamMulai:'22:00',jamSelesai:'06:00',start:22,end:6}
];
function currentInpatientShift(date){
  const h=(date||new Date()).getHours();
  return INPATIENT_SHIFTS.find(function(x){return x.id==='MALAM'? (h>=22||h<6) : (h>=x.start&&h<x.end);}) || INPATIENT_SHIFTS[0];
}
function inpatientDutyAccounts(wardId){
  const shift=currentInpatientShift();
  const doctors={PAGI:'U-RI-DOK-JAGA-PAGI',SORE:'U-RI-DOK-JAGA-SORE',MALAM:'U-RI-DOK-JAGA-MALAM'};
  const nurses={PAGI:'U-RI-PWT-PAGI',SORE:'U-RI-PWT-SORE',MALAM:'U-RI-PWT-MALAM'};
  const ward=(Store.data&&Store.data.wards||[]).find(function(w){return w.id===wardId;});
  const staffing=ward&&ward.shiftAssignments&&ward.shiftAssignments[shift.id];
  const account=(Store.data&&Store.data.users||[]).find(function(u){return u.role==='perawat_ranap'&&u.wardId===wardId&&u.shiftId===shift.id;});
  return {shift:staffing?Object.assign({},shift,{jamMulai:staffing.jamMulai,jamSelesai:staffing.jamSelesai,leaderName:staffing.ketuaShift}):shift,doctorUserId:doctors[shift.id],nurseUserId:wardId?(account?account.id:null):nurses[shift.id],staffing:staffing};
}
function getCurrentInpatientDuty(wardId){
  const d=inpatientDutyAccounts(wardId);
  const configured=d.staffing;
  const account=getUserById(d.nurseUserId);
  const nurse=account||(configured?{id:null,nama:(configured.perawat||[])[0]||configured.ketuaShift}:null);
  const doctor=getUserById(d.doctorUserId);
  return {shift:d.shift,doctor:doctor,nurse:nurse,shiftLeader:configured?configured.ketuaShift:(account&&account.isShiftLeader?account.nama:null),nurseNames:configured?configured.perawat:[]};
}

function inpatientLocationLabel(ward,bed){
  ward=ward||{};bed=bed||{};
  return [ward.buildingName||'Gedung belum ditetapkan',ward.floorName||(ward.floorNumber?'Lantai '+ward.floorNumber:''),ward.nama||'Ruang belum ditetapkan','Kamar '+(bed.noKamar||'-'),bed.bedLabel||('Bed '+(bed.noBed||'-'))].filter(Boolean).join(' · ');
}
function inpatientJourneyForAdmission(a){
  const orders=Array.isArray(a.orders)?a.orders:[];
  const hasLab=orders.some(function(o){return o.jenis==='lab';});
  const hasRad=orders.some(function(o){return o.jenis==='radiologi';});
  const hasRx=Array.isArray(Store.data.prescriptions) && Store.data.prescriptions.some(function(r){return r.admissionId===a.id;});
  const source=a.sumberAdmisi||'Admisi';
  const sourceLabel=source==='IGD'?'IGD → Rawat Inap':source==='Rawat Jalan'?'Rawat Jalan → Admisi → Rawat Inap':source==='Rujukan'?'Rujukan → Admisi → Rawat Inap':'Transfer → Rawat Inap';
  const steps=[{key:'admission',label:'Admisi',sub:sourceLabel,icon:'🏥'},{key:'bed',label:'Bed / Kamar',icon:'🛏️'},{key:'perawatan',label:'Perawatan',icon:'🩺'}];
  if(hasLab) steps.push({key:'lab',label:'Laboratorium',icon:'🧪'});
  if(hasRad) steps.push({key:'radiologi',label:'Radiologi',icon:'☢️'});
  if(hasRx) steps.push({key:'farmasi',label:'Farmasi',icon:'💊'});
  steps.push({key:'discharge',label:'Pulang',icon:'📋'},{key:'billing',label:'Kasir',icon:'🧾'},{key:'selesai',label:'Selesai',icon:'✓'});
  return steps;
}


/* =================================================================
   MODUL: RAWAT INAP — MONITOR PER RUANG
   PENCARIAN KODE: MODUL: RAWAT INAP | FUNGSI: MONITOR RUANG
   Tanggung jawab: menampilkan status bed/pasien sesuai ruang yang ditugaskan.
   Hak akses: admin/admisi/dokter melihat cakupan sesuai peran; perawat hanya ruangnya.
   Dependensi runtime disediakan oleh app.js (Store, Session, esc, setPageTitle, getPatient).
   ================================================================= */
let monitorClockTimer=null;
/* MODUL: RAWAT INAP — MONITOR PER RUANG. Perawat dibatasi oleh wardId/wardIds. */
function renderInpatientNurseMonitor(){
  /* FIX V16.0.6: normalisasi koleksi agar monitor tidak blank bila data lokal lama belum memiliki semua array. */
  const u=Session.currentUser||{};
  const data=(Store&&Store.data)||{};
  const allWards=Array.isArray(data.wards)?data.wards:[];
  const beds=Array.isArray(data.beds)?data.beds:[];
  const admissions=Array.isArray(data.admissions)?data.admissions:[];
  const admin=u.role==='admin',allWardView=['admin','admisi_ranap','dokter_ranap'].includes(u.role);
  const assignedIds=Array.isArray(u.wardIds)&&u.wardIds.length?u.wardIds:(u.wardId?[u.wardId]:[]);
  let wards=allWards.filter(function(w){return allWardView?(w.locationManaged||w.category==='khusus'||String(w.id||'').startsWith('WARD-')):assignedIds.includes(w.id);});
  /* Jika master ruang lama belum memiliki locationManaged, admin/dokter/admisi tetap dapat melihat ruang yang ada. */
  if(allWardView&&!wards.length) wards=allWards;
  const root=document.getElementById('main-content');
  if(!root)return;
  setPageTitle('Monitor Ruang Rawat Inap');
  if(!allWardView&&!assignedIds.length){root.innerHTML='<div class="panel"><div class="panel-body"><div class="empty">Akun belum memiliki penugasan ruang rawat inap. Administrator perlu menetapkan ruang sebelum monitor digunakan.</div></div></div>';return;}
  if(!wards.length){root.innerHTML='<div class="panel"><div class="panel-body"><div class="empty"><strong>Master ruang Rawat Inap belum tersedia.</strong><div class="hint">Periksa data master ruang dan bed pada pengaturan atau pulihkan data demo. Monitor tidak akan dibiarkan kosong tanpa keterangan.</div></div></div></div>';return;}
  root.innerHTML='<div class="public-monitor inpatient-room-monitor"><div class="monitor-head"><div><div class="ops-eyebrow">SIMRS PROTOTYPE · MONITOR RAWAT INAP</div><h1>'+(allWardView?'MONITOR RAWAT INAP':esc((wards[0]||{}).nama||'RUANG RAWAT INAP').toUpperCase())+'</h1><div>'+(allWardView?'Seluruh ruang menurut gedung, lantai, dan ruang':'Penugasan: '+esc((wards[0]||{}).buildingName||'Gedung')+' · '+esc((wards[0]||{}).floorNumber?((wards[0]||{}).floorName||('Lantai '+wards[0].floorNumber)):'') )+'</div></div><div class="monitor-clock" id="monitor-clock"></div></div>'+wards.map(function(w){const roomBeds=beds.filter(function(b){return b.wardId===w.id;});const occupied=roomBeds.filter(function(b){return b.status==='terisi';}).length;return '<section class="monitor-next inpatient-room-section"><h2>'+esc(w.nama||'Ruang tanpa nama')+' <span class="badge badge-slate">'+esc(w.buildingName||'Unit khusus')+(w.floorNumber?' · Lantai '+w.floorNumber:'')+'</span></h2><div class="hint">Kepala ruang: '+esc(w.headNurseName||'Belum ditetapkan')+' · '+occupied+'/'+roomBeds.length+' bed terisi</div><div class="inpatient-bed-grid">'+(roomBeds.length?roomBeds.map(function(b){const adm=admissions.find(function(a){return a.bedId===b.id&&a.status==='dirawat';});const patient=adm?(getPatient(adm.patientId)||null):null;const meta=INPATIENT_BED_STATUS[b.status]||INPATIENT_BED_STATUS.kosong;const location='Kamar '+esc(b.noKamar||'-')+' · '+esc(b.bedLabel||('Bed '+(b.noBed||'-')));return '<div class="inpatient-bed-card"><div><strong>'+location+'</strong><span class="badge '+meta.cls+'">'+(adm?'Terisi':meta.label)+'</span></div><div class="inpatient-bed-patient">'+(patient?'<strong>'+esc(patient.nama||'Pasien')+'</strong><small>No. RM '+esc(patient.id||'-')+'</small><small>Status: '+esc(adm.status||'dirawat')+'</small>':(b.status==='kosong'?'Belum ditempati':esc(meta.label)))+'</div></div>';}).join(''):'<div class="empty">Belum ada data bed untuk ruang ini.</div>')+'</div></section>';}).join('')+'</div>';
  if(monitorClockTimer)clearInterval(monitorClockTimer);
  const clock=document.getElementById('monitor-clock');
  if(clock){const tick=function(){clock.textContent=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});};tick();monitorClockTimer=setInterval(tick,1000);}
}
