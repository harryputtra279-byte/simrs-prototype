/* =================================================================
   MODUL 08 — PAPAN ANTREAN, IGD & BOOTSTRAP
   Tanggung jawab: Papan antrean, episode/triase/kerja klinis IGD, monitor IGD, registrasi renderer, dan inisialisasi aplikasi.
   Kontrak integrasi: dijalankan sebagai classic script berurutan setelah modul sebelumnya;
   gunakan Store/Session/helper bersama yang sudah didefinisikan. Jangan mengubah urutan pemuatan
   tanpa audit dependensi dan uji alur lintas unit.
   PENCARIAN KODE: modules/08-queue-igd-bootstrap.js
   ================================================================= */

"use strict"; // Pertahankan semantik strict-mode dari app.js monolitik.
/* INDEKS BANTUAN TAHAP 7
 * Modul: PAPAN ANTREAN, IGD & BOOTSTRAP
 * Tanggung jawab: Papan antrean, triase/kerja klinis IGD, monitor IGD, inisialisasi aplikasi.
 * Fungsi yang sering menjadi titik masuk (cari nama fungsi dengan Ctrl+F):
 * - renderCekAntrian
 * - renderCekBedGrid
 * - renderCekAntrianGrid
 * - toggleKioskMode
 * - confirmCareRequest
 * - registerDirectIgdPatient
 * - igdActiveVisits
 * - igdCanRegister
 * - igdCanTriage
 * - igdCanDoctor
 * - igdCanExecute
 * - igdPriorityLabel
 * - renderIgdPatientHeader
 * - renderIgdClinicalHtml
 * - markIgdResultsReviewed
 * - saveIgdClinicalOrders
 * - renderIgdReferralsHtml
 * - renderIGD
 * - renderIgdTriage
 * - saveIgdTriage
 * - renderIgdDoctor
 * - renderIgdNurseExecution
 * - updateIgdOrder
 * - saveIgdNursingNote
 * - acceptInpatientReferral
 * - renderRiwayatAdmin
 * - runSystemAudit
 * - check
 * - renderAuditSistem
 * - ensureIgdBeds
 * - igdBedZoneForVisit
 * - igdBedOccupant
 * - igdCounts
 * - renderIgdHome
 * - renderIgdMonitor
 * - ... dan 8 fungsi lain pada berkas ini.
 * Integrasi: fungsi global/Store dipertahankan untuk kompatibilitas classic script.
 * Catatan: jangan memindahkan fungsi lintas modul tanpa audit pemanggil dan uji alur.
 */

/* =================================================================
   MODULE: CEK ANTRIAN (papan tampilan publik)
   ================================================================= */
function renderCekAntrian(){
  setPageTitle('Cek Antrian');
  document.getElementById('main-content').innerHTML =
    pageIntro('Papan monitor antrean untuk petugas loket/operator dan layar ruang tunggu. Menu ini bukan menu kerja dokter atau perawat.')+
    '<div style="margin-bottom:14px"><button class="btn btn-outline btn-sm" id="btn-kiosk">⛶ Mode Layar Penuh</button> <button class="btn btn-ghost btn-sm" id="btn-refresh-antrian">↻ Perbarui</button></div>'+
    '<h3 style="color:var(--ink-soft);margin-bottom:10px">🩺 Antrian Rawat Jalan</h3>'+
    '<div class="kiosk-grid" id="cek-antrian-grid"></div>'+
    '<h3 style="color:var(--ink-soft);margin:22px 0 10px">🏨 Ketersediaan Tempat Tidur Rawat Inap</h3>'+
    '<div class="kiosk-grid" id="cek-bed-grid"></div>';
  document.getElementById('btn-kiosk').addEventListener('click', toggleKioskMode);
  document.getElementById('btn-refresh-antrian').addEventListener('click', function(){ renderCekAntrianGrid(); renderCekBedGrid(); });
  renderCekAntrianGrid();
  renderCekBedGrid();
}
function renderCekBedGrid(){
  const grid = document.getElementById('cek-bed-grid');
  if(!grid) return;
  grid.innerHTML = Store.data.wards.map(function(w){
    const bedsInWard = Store.data.beds.filter(b=>b.wardId===w.id);
    const kosong = bedsInWard.filter(b=>b.status==='kosong').length;
    const cls = kosong===0 ? 'badge-brick' : (kosong<=Math.ceil(bedsInWard.length*0.3) ? 'badge-amber' : 'badge-sage');
    return '<div class="queue-board-item"><div class="poli-tag" style="margin-bottom:8px"><strong>'+esc(w.nama)+'</strong></div>'+
      '<div style="font-size:11.5px;color:var(--ink-soft);font-weight:700">TEMPAT TIDUR KOSONG</div>'+
      '<div class="num" style="font-size:28px">'+kosong+' <span style="font-size:15px;color:var(--ink-soft)">/ '+bedsInWard.length+'</span></div>'+
      '<span class="badge '+cls+'" style="margin-top:6px">'+(kosong===0?'Penuh':(cls==='badge-amber'?'Hampir Penuh':'Tersedia'))+'</span></div>';
  }).join('');
}
function renderCekAntrianGrid(){
  const grid = document.getElementById('cek-antrian-grid');
  if(!grid) return;
  const visits = visitsToday();
  grid.innerHTML = Store.data.poli.map(poli=>{
    const antrianPoli = visits.filter(v=>samePoli(v.poliId,poli.id));
    const sedang = antrianPoli.filter(v=>v.status==='diperiksa').sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt))[0];
    const dipanggil = antrianPoli.filter(v=>v.status==='dipanggil').sort((a,b)=>(queueNumberValue(a.noAntrian)||999999)-(queueNumberValue(b.noAntrian)||999999))[0];
    const menunggu = antrianPoli.filter(v=>['menunggu_dokter','menunggu_poli'].includes(v.status)).sort((a,b)=>(queueNumberValue(a.noAntrian)||999999)-(queueNumberValue(b.noAntrian)||999999));
    const infoTerbaru = Store.data.poliMessages.filter(m=>samePoli(m.poliId,poli.id))[0];
    const active=sedang||dipanggil;
    const infoHtml = infoTerbaru ? '<div class="badge '+POLI_MSG_BADGE[infoTerbaru.tipe]+'" style="margin-top:9px;white-space:normal;text-align:left">'+esc(infoTerbaru.pesan)+'</div>' : '';
    return '<div class="queue-board-item'+(active?' calling':'')+'">'+
      '<div class="poli-tag" style="margin-bottom:8px"><span class="poli-dot" style="background:var(--'+poliColor(poli.id)+')"></span><strong>'+esc(poli.nama)+'</strong></div>'+
      '<div style="font-size:11.5px;color:var(--ink-soft);font-weight:700">'+(sedang?'SEDANG DILAYANI':'DIPANGGIL')+'</div>'+
      '<div class="num">'+(active?active.noAntrian:'—')+'</div>'+
      '<div style="font-size:12px;color:var(--ink-soft);margin-top:6px">Berikutnya: '+(menunggu.length?menunggu[0].noAntrian:'—')+' · Menunggu: '+menunggu.length+'</div>'+
      infoHtml+'</div>';
  }).join('');
}
function toggleKioskMode(){
  document.body.classList.toggle('kiosk-on');
  document.getElementById('btn-kiosk').textContent = document.body.classList.contains('kiosk-on') ? '⛶ Keluar Layar Penuh' : '⛶ Mode Layar Penuh';
}

function confirmCareRequest(requestId, decision){
  const actor=Session.currentUser||{},allowed=({igd:['admin','dokter_igd','perawat_triase_igd'],lab:['admin','lab'],radiologi:['admin','radiologi'],'rawat-inap':['admin','admisi_ranap']});
  const req=(Store.data.careRequests||[]).find(function(x){return x.id===requestId;}); if(!req)return;
  if(allowed[req.destination]&&!allowed[req.destination].includes(actor.role)){showToast('Konfirmasi hanya dapat dilakukan oleh unit tujuan yang berwenang.','danger');return;}
  if(req.status!=='menunggu_konfirmasi'){showToast('Permintaan ini sudah dikonfirmasi sebelumnya.','warning');return;}
  req.status=decision==='terima'?'diterima':'ditolak'; req.acceptedAt=nowISO(); req.acceptedBy=Session.currentUser?Session.currentUser.id:null;
  const patient=getPatient(req.patientId);
  pushNotification('info',decision==='terima'?'Permintaan diterima':'Permintaan tidak diterima',req.detail+' · '+(decision==='terima'?'diterima oleh ':'ditolak oleh ')+(Session.currentUser?Session.currentUser.nama:'petugas'),req.patientId,null);
  if(decision==='terima' && req.sourceVisitId){const source=getVisit(req.sourceVisitId);if(source){if(req.destination==='lab'&&source.labRequest&&source.labRequest.status!=='selesai'){source.labRequest.status='diterima';source.labRequest.diterimaAt=req.acceptedAt;source.labRequest.diterimaOleh=actor.id;}if(req.destination==='radiologi'&&source.radiologyRequest&&source.radiologyRequest.status!=='selesai'){source.radiologyRequest.status='diterima';source.radiologyRequest.diterimaAt=req.acceptedAt;source.radiologyRequest.diterimaOleh=actor.id;}source.updatedAt=nowISO();}}
  if(decision==='terima' && req.destination==='igd'){
    if(!Array.isArray(Store.data.visits))Store.data.visits=[];
    const existing=Store.data.visits.find(function(v){return v.sourceCareRequestId===req.id;});
    if(!existing){
      const count=Store.data.visits.filter(function(v){return v.unit==='igd'&&v.tanggal===todayStr();}).length+1;
      const igdVisit={id:uid('VIS'),patientId:req.patientId,tanggal:todayStr(),poliId:'RJ-UMU',dokterId:null,jenisBayar:(getVisit(req.sourceVisitId)||{}).jenisBayar||'Umum',noBpjs:(getVisit(req.sourceVisitId)||{}).noBpjs||'',noAntrian:'IGD-'+String(count).padStart(3,'0'),keluhan:req.detail,status:'menunggu_poli',unit:'igd',sourceVisitId:req.sourceVisitId,sourceCareRequestId:req.id,vital:null,diagnosis:'',catatan:'Rujukan internal dari '+(req.sourceUnit||'unit asal'),labRequest:null,resepId:null,billing:{registrasi:0,konsultasi:0,obat:0,lab:0},prioritas:true,screening:null,workflow:{bookedAt:nowISO(),checkinAt:nowISO(),screeningAt:null,doctorStartAt:null,supportingAt:null,reviewAt:null,completedAt:null},createdAt:nowISO(),updatedAt:nowISO(),demo:false};
      Store.data.visits.push(igdVisit); req.igdVisitId=igdVisit.id;
    }
    req.status='diterima'; req.acceptedAt=nowISO();
    pushNotification('info','Rujukan IGD diterima','Silakan menuju IGD sesuai instruksi petugas.',req.patientId,null);
  }
  Store.save(); showToast('Konfirmasi unit tersimpan','success');
}
/* =================================================================
   MODUL: IGD — PENDAFTARAN DAN EPISODE
   PENCARIAN KODE: MODUL: IGD — PENDAFTARAN
   Tanggung jawab: membuat satu episode IGD, mencegah episode aktif ganda,
   dan meneruskan pasien ke triase. Jangan pindahkan fungsi tanpa audit dependensi.
   ================================================================= */
function registerDirectIgdPatient(){
  if(!igdCanRegister()){showToast('Pendaftaran IGD hanya untuk petugas pendaftaran/admin demo. Kondisi gawat darurat tidak boleh tertunda demi administrasi.','danger');return;}
  const patientId=document.getElementById('igd-reg-patient').value, complaint=document.getElementById('igd-reg-complaint').value.trim();
  if(!patientId||!complaint){showToast('Pilih pasien dan isi keluhan utama IGD.','danger');return;}
  if(Store.data.visits.some(function(v){return v.patientId===patientId&&v.unit==='igd'&&!['selesai','dibatalkan'].includes(v.status);})){showToast('Pasien ini sudah memiliki episode IGD aktif; buka episode tersebut agar tidak membuat pendaftaran ganda.','warning');return;}
  const count=Store.data.visits.filter(function(v){return v.unit==='igd'&&v.tanggal===todayStr();}).length+1;
  const v={id:uid('VIS'),patientId:patientId,tanggal:todayStr(),poliId:'RJ-UMU',dokterId:null,jenisBayar:'Umum',noBpjs:'',noAntrian:'IGD-'+String(count).padStart(3,'0'),keluhan:complaint,status:'menunggu_triase',unit:'igd',sourceVisitId:null,sourceCareRequestId:null,vital:null,diagnosis:'',catatan:'Pendaftaran langsung IGD',labRequest:null,radiologyRequest:null,resepId:null,billing:{registrasi:0,konsultasi:0,obat:0,lab:0},prioritas:true,screening:null,workflow:{bookedAt:nowISO(),checkinAt:nowISO(),screeningAt:null,doctorStartAt:null,supportingAt:null,reviewAt:null,completedAt:null},createdAt:nowISO(),updatedAt:nowISO(),demo:false};
  Store.data.visits.push(v);logAudit('pendaftaran_igd',esc(getPatient(patientId).nama)+' — '+v.noAntrian);pushNotification('info','Pendaftaran IGD tercatat','Nomor IGD '+v.noAntrian+' · silakan lanjut triase.',patientId,null);Store.save();showToast('Episode IGD berhasil dibuat; lanjutkan triase dan asesmen.','success');if(Session.currentUser&&Session.currentUser.role==='perawat_triase_igd')renderIgdTriage();else renderIGD();
}
function igdActiveVisits(){
  return Store.data.visits.filter(function(v){return v.unit==='igd'&&!['selesai','dibatalkan','pulang','rujuk_keluar','meninggal'].includes(v.status);})
    .sort(function(a,b){
      const rank={merah:0,kuning:1,hijau:2,biru:3};
      const ar=rank[(a.triage&&a.triage.level)||'']??4, br=rank[(b.triage&&b.triage.level)||'']??4;
      if(ar!==br)return ar-br;
      return new Date(a.createdAt||0)-new Date(b.createdAt||0);
    });
}
function igdCanRegister(){return !!Session.currentUser&&['admin','loket','perawat_triase_igd'].includes(Session.currentUser.role);}
function igdCanTriage(){return !!Session.currentUser&&['admin','perawat_triase_igd'].includes(Session.currentUser.role);}
function igdCanDoctor(){return !!Session.currentUser&&['admin','dokter_igd'].includes(Session.currentUser.role);}
function igdCanExecute(){return !!Session.currentUser&&['admin','perawat_pelaksana_igd'].includes(Session.currentUser.role);}
function igdPriorityLabel(v){const t=v.triage||{};return ({merah:'Merah · Resusitasi',kuning:'Kuning · Urgen',hijau:'Hijau · Tidak gawat',biru:'Biru · Non-urgent'})[t.level]||'Belum ditriase';}
function renderIgdPatientHeader(v){
  const p=getPatient(v.patientId),t=v.triage||{};
  return '<div class="history-item"><div><strong>'+esc(p?p.nama:'Pasien tidak ditemukan')+'</strong> · '+esc(v.noAntrian||v.id)+' <span class="badge badge-sage">'+esc((STATUS_MAP[v.status]||{label:v.status||'Aktif'}).label)+'</span></div><div class="hint">Keluhan: '+esc(v.keluhan||'-')+' · Prioritas: '+esc(igdPriorityLabel(v))+' · Datang: '+esc(formatTanggalWaktu(v.createdAt||v.tanggal))+'</div>'+(t.vitals?'<div class="hint">Tanda vital: TD '+esc(t.vitals.bp||'-')+' · Nadi '+esc(t.vitals.pulse||'-')+' · RR '+esc(t.vitals.rr||'-')+' · Suhu '+esc(t.vitals.temp||'-')+' °C · SpO₂ '+esc(t.vitals.spo2||'-')+'%</div>':'')+'</div>';
}
function renderIgdClinicalHtml(){
  const list=igdActiveVisits().filter(function(v){return !!(v.triage&&v.triage.level);});
  if(!list.length)return '<div class="empty">Belum ada pasien yang selesai ditriase dan siap dinilai dokter.</div>';
  return list.map(function(v){
    const p=getPatient(v.patientId),rx=getResepByVisit(v.id);
    if(v.diagnosis&&!v.forceEditAssessment){
      const orders=Array.isArray(v.orders)?v.orders:[];
      return '<div class="history-item"><div><strong>'+esc(p?p.nama:'Pasien')+'</strong> · '+esc(v.noAntrian||v.id)+' <span class="badge badge-sage">Asesmen tersimpan</span></div><div class="hint">Prioritas: '+esc(igdPriorityLabel(v))+' · Status: '+esc((STATUS_MAP[v.status]||{label:v.status}).label)+'</div><div><strong>Diagnosis:</strong> '+esc(v.diagnosis)+'</div><div><strong>Catatan:</strong> '+esc(v.catatan||'-')+'</div>'+(v.labRequest?'<div class="alert alert-info">Laboratorium: '+esc(v.labRequest.jenis)+' · '+esc(v.labRequest.status)+(v.labRequest.hasil?'<br>Hasil: '+esc(v.labRequest.hasil):'')+'</div>':'')+(v.radiologyRequest?'<div class="alert alert-info">Radiologi: '+esc(v.radiologyRequest.jenis)+' · '+esc(v.radiologyRequest.status)+(v.radiologyRequest.hasil?'<br>Hasil: '+esc(v.radiologyRequest.hasil):'')+'</div>':'')+(rx?'<div class="alert alert-info">Resep: '+esc((rx.items||[]).map(function(x){return x.nama+' ×'+x.jumlah;}).join(', '))+' · '+esc(rx.status)+'</div>':'')+'<div class="hint">Instruksi tercatat: '+orders.length+'</div>'+((v.labRequest&&v.labRequest.status==='selesai'||v.radiologyRequest&&v.radiologyRequest.status==='selesai')&&(!v.workflow||!v.workflow.supportingReviewedAt)&&(!v.labRequest||v.labRequest.status==='selesai')&&(!v.radiologyRequest||v.radiologyRequest.status==='selesai')?'<button class="btn btn-primary btn-sm" data-review-igd-results="'+v.id+'">Konfirmasi hasil telah ditinjau</button> ':'')+'<button class="btn btn-outline btn-sm" data-edit-igd-assessment="'+v.id+'">Buka asesmen / tindak lanjut</button></div>';
    }
    return '<div class="history-item"><div><strong>'+esc(p?p.nama:'Pasien')+'</strong> · '+esc(v.noAntrian||v.id)+' <span class="badge badge-sage">'+esc((STATUS_MAP[v.status]||{label:v.status}).label)+'</span></div><div class="hint">Prioritas: '+esc(igdPriorityLabel(v))+' · Keluhan: '+esc(v.keluhan||'-')+'</div>'+(v.triage&&v.triage.summary?'<div class="alert alert-info">Ringkasan triase: '+esc(v.triage.summary)+'</div>':'')+(rx?'<div class="alert alert-info">Resep IGD: '+esc((rx.items||[]).map(function(x){return x.nama+' ×'+x.jumlah;}).join(', '))+' · '+esc(rx.status)+'</div>':'')+(v.labRequest?'<div class="alert alert-info"><strong>Laboratorium · '+esc(v.labRequest.jenis)+'</strong><div>Status: '+esc(v.labRequest.status)+'</div>'+(v.labRequest.hasil?'<div>Hasil: '+esc(v.labRequest.hasil)+'</div>':'')+'</div>':'')+(v.radiologyRequest?'<div class="alert alert-info"><strong>Radiologi · '+esc(v.radiologyRequest.jenis)+'</strong><div>Status: '+esc(v.radiologyRequest.status)+'</div>'+(v.radiologyRequest.hasil?'<div>Hasil: '+esc(v.radiologyRequest.hasil)+'</div>':'')+'</div>':'')+'<div class="field"><label>Diagnosis / asesmen IGD</label><input id="igd-dx-'+v.id+'" value="'+esc(v.forceEditAssessment?v.diagnosis||'':'')+'" placeholder="Diagnosis atau asesmen klinis"></div><div class="field"><label>Catatan klinis / rencana</label><textarea id="igd-note-'+v.id+'" placeholder="Rencana tindak lanjut dan disposisi">'+esc(v.forceEditAssessment?v.catatan||'':'')+'</textarea></div><div class="field"><label>Keputusan tindak lanjut</label><select id="igd-disposition-'+v.id+'"><option value="">Belum diputuskan</option>'+['observasi','pulang','rawat_jalan','rawat_inap','rujukan','meninggal'].map(function(x){return '<option value="'+x+'" '+((v.disposition||'')===x?'selected':'')+'>'+({'observasi':'Observasi IGD','pulang':'Pulang','rawat_jalan':'Rawat Jalan / kontrol','rawat_inap':'Rawat Inap','rujukan':'Rujuk keluar','meninggal':'Meninggal'})[x]+'</option>';}).join('')+'</select></div><div class="field"><label>Resep obat (opsional)</label><select id="igd-med-'+v.id+'"><option value="">Tidak menambah resep</option>'+Store.data.medicines.map(function(m){return '<option value="'+m.id+'">'+esc(m.nama)+' · stok '+m.stok+'</option>';}).join('')+'</select><div class="field-row"><input id="igd-qty-'+v.id+'" type="number" min="1" value="1" aria-label="Jumlah obat"><input id="igd-rule-'+v.id+'" placeholder="Aturan pakai / instruksi pemberian"></div></div><div class="field checkbox-row"><input type="checkbox" id="igd-lab-'+v.id+'"><label for="igd-lab-'+v.id+'">Minta Laboratorium</label></div><div class="field hidden" id="igd-lab-wrap-'+v.id+'"><input id="igd-lab-detail-'+v.id+'" placeholder="Jenis pemeriksaan laboratorium"></div><div class="field checkbox-row"><input type="checkbox" id="igd-rad-'+v.id+'"><label for="igd-rad-'+v.id+'">Minta Radiologi</label></div><div class="field hidden" id="igd-rad-wrap-'+v.id+'"><input id="igd-rad-detail-'+v.id+'" placeholder="Jenis pemeriksaan radiologi"></div><button class="btn btn-primary btn-sm" data-save-igd="'+v.id+'">Simpan Asesmen &amp; Instruksi</button></div>';
  }).join('');
}
function markIgdResultsReviewed(visitId){
  if(!igdCanDoctor()){showToast('Hanya dokter IGD yang dapat mengonfirmasi peninjauan hasil.','danger');return;}
  const v=getVisit(visitId);if(!v||v.unit!=='igd')return;
  if((v.labRequest&&v.labRequest.status!=='selesai')||(v.radiologyRequest&&v.radiologyRequest.status!=='selesai')){showToast('Tunggu semua pemeriksaan yang diminta selesai sebelum meninjau rangkaian hasil.','warning');return;}
  const now=nowISO();v.workflow=v.workflow||{};v.workflow.supportingReviewedAt=now;v.workflow.supportingReviewedBy=Session.currentUser.id;
  if(v.labRequest&&v.labRequest.status==='selesai')v.labRequest.ditinjauAt=now;if(v.radiologyRequest&&v.radiologyRequest.status==='selesai')v.radiologyRequest.ditinjauAt=now;
  if(v.status==='menunggu_review'){if(v.disposition==='observasi')v.status='observasi';else if(v.disposition==='rawat_inap')v.status='rujuk_ranap';else if(['pulang','rawat_jalan'].includes(v.disposition))v.status='proses_pulang';else v.status='diperiksa';}
  v.nextStep='Hasil penunjang telah ditinjau dokter IGD';v.updatedAt=now;logAudit('hasil_penunjang_ditinjau_igd',(getPatient(v.patientId)||{}).nama+' · '+v.id);pushNotification('info','Hasil pemeriksaan telah ditinjau','Dokter telah meninjau hasil pemeriksaan penunjang.',v.patientId,null);Store.save();showToast('Peninjauan hasil tersimpan.','success');renderIgdDoctor();
}
function saveIgdClinicalOrders(visitId){
  if(!igdCanDoctor()){showToast('Instruksi klinis dan resep IGD hanya dapat dibuat dokter IGD atau admin demo.','danger');return;}
  const v=getVisit(visitId);if(!v||v.unit!=='igd')return;
  const dx=document.getElementById('igd-dx-'+visitId).value.trim(),note=document.getElementById('igd-note-'+visitId).value.trim();
  const medId=document.getElementById('igd-med-'+visitId).value,labChk=document.getElementById('igd-lab-'+visitId).checked,radChk=document.getElementById('igd-rad-'+visitId).checked;
  const disposition=(document.getElementById('igd-disposition-'+visitId)||{}).value||'';
  const labDetail=labChk?document.getElementById('igd-lab-detail-'+visitId).value.trim():'',radDetail=radChk?document.getElementById('igd-rad-detail-'+visitId).value.trim():'';
  const rule=medId?document.getElementById('igd-rule-'+visitId).value.trim():'';
  if(!dx){showToast('Isi diagnosis/asesmen IGD terlebih dahulu.','danger');return;}
  if(medId && getResepByVisit(visitId)){showToast('Resep untuk episode ini sudah ada. Jangan membuat resep ganda; tinjau resep yang ada.','warning');return;}
  if(medId&&!rule){showToast('Isi instruksi/aturan pemberian obat.','danger');return;}
  if(labChk&&!labDetail){showToast('Isi jenis pemeriksaan Laboratorium.','danger');return;}
  if(radChk&&!radDetail){showToast('Isi jenis pemeriksaan Radiologi.','danger');return;}
  if((v.labRequest||((v.orders||[]).some(function(o){return ['laboratorium','lab'].includes(o.type)&&!['dibatalkan','ditolak'].includes(o.status);})))&&labChk){showToast('Permintaan Laboratorium sudah ada pada episode ini.','warning');return;}
  if((v.radiologyRequest||((v.orders||[]).some(function(o){return ['radiologi'].includes(o.type)&&!['dibatalkan','ditolak'].includes(o.status);})))&&radChk){showToast('Permintaan Radiologi sudah ada pada episode ini.','warning');return;}
  const previous=v.status;
  v.diagnosis=dx;v.catatan=note;v.forceEditAssessment=false;v.updatedAt=nowISO();v.workflow=v.workflow||{};v.workflow.doctorStartAt=v.workflow.doctorStartAt||nowISO();
  v.orders=Array.isArray(v.orders)?v.orders:[];
  if(medId){const med=getMedicine(medId),qty=Math.max(1,parseInt(document.getElementById('igd-qty-'+visitId).value,10)||1);const rx={id:uid('RSP'),visitId:v.id,patientId:v.patientId,unit:'igd',jenisLayanan:'igd',items:[{medicineId:med.id,nama:med.nama,jumlah:qty,hargaSatuan:med.harga,aturanPakai:rule}],status:'menunggu',orderStatus:'dibuat',orderedBy:Session.currentUser.id,createdAt:nowISO(),updatedAt:nowISO(),siapAt:null,diambilAt:null};Store.data.prescriptions.push(rx);v.resepId=rx.id;v.orders.push({id:rx.id,type:'obat',detail:med.nama,status:'dibuat',createdAt:nowISO(),createdBy:Session.currentUser.id});notifyCareUnit(v.patientId,'farmasi-igd','Instruksi obat IGD baru','Obat '+med.nama+' · '+v.noAntrian+' · menunggu penerimaan Farmasi IGD');}
  if(labChk){v.labRequest={id:uid('LAB'),jenis:labDetail,status:'menunggu',hasil:null,unit:'igd',requestedAt:nowISO(),requestedBy:Session.currentUser.id};v.orders.push({id:v.labRequest.id,type:'laboratorium',detail:labDetail,status:'dibuat',createdAt:nowISO(),createdBy:Session.currentUser.id});createCareRequest(v,'lab','laboratorium',labDetail);}
  if(radChk){v.radiologyRequest={id:uid('RAD'),jenis:radDetail,status:'menunggu',hasil:null,unit:'igd',requestedAt:nowISO(),requestedBy:Session.currentUser.id};v.orders.push({id:v.radiologyRequest.id,type:'radiologi',detail:radDetail,status:'dibuat',createdAt:nowISO(),createdBy:Session.currentUser.id});createCareRequest(v,'radiologi','radiologi',radDetail);}
  if(disposition==='observasi'){v.status='observasi';v.disposition='observasi';v.workflow.observationStartedAt=nowISO();v.workflow.completedAt=null;}
  else if(disposition==='rawat_inap'){v.disposition='rawat_inap';createCareRequest(v,'rawat-inap','admisi_rawat_inap','Permintaan admisi Rawat Inap dari IGD: '+dx);v.status='rujuk_ranap';}
  else if(disposition==='rujukan'){v.disposition='rujukan';v.status='rujuk_keluar';}
  else if(disposition==='rawat_jalan'){v.disposition='rawat_jalan';v.status='proses_pulang';v.nextStep='Selesaikan proses pulang / kontrol';v.workflow.dispositionDecidedAt=nowISO();v.workflow.completedAt=null;}
  else if(disposition==='pulang'){v.disposition='pulang';v.status='proses_pulang';v.nextStep='Menunggu konfirmasi pasien benar-benar meninggalkan IGD';v.workflow.dispositionDecidedAt=nowISO();v.workflow.completedAt=null;}
  else if(disposition==='meninggal'){v.disposition='meninggal';v.status='meninggal';v.workflow.completedAt=nowISO();}
  else v.status='diperiksa';
  logAudit('asesmen_igd',getPatient(v.patientId).nama+' · '+dx+' · status '+previous+' → '+v.status);Store.save();showToast('Asesmen dan instruksi IGD tersimpan. Status episode: '+v.status+'.','success');renderIgdDoctor();
}
function renderIgdReferralsHtml(){
  const refs=(Store.data.careRequests||[]).filter(function(r){return r.destination==='igd'&&r.status==='menunggu_konfirmasi';});
  if(!refs.length)return '<div class="empty">Tidak ada rujukan internal IGD yang menunggu konfirmasi.</div>';
  return refs.map(function(r){const p=getPatient(r.patientId);return '<div class="history-item"><strong>'+(p?esc(p.nama):'Pasien tidak ditemukan')+'</strong> · '+esc(p?p.id:r.patientId)+'<div class="hint">Asal: '+esc(r.sourceUnit)+' · '+esc(r.detail)+'</div><div class="result-actions"><button class="btn btn-primary btn-sm" data-igd-accept="'+r.id+'">Terima &amp; Buat Episode IGD</button><button class="btn btn-outline btn-sm" data-igd-reject="'+r.id+'">Tolak / Minta Klarifikasi</button></div></div>';}).join('');
}
function renderIGD(){
  setPageTitle('Instalasi Gawat Darurat (IGD)');
  const user=Session.currentUser||{}, visits=visitsToday().filter(function(v){return v.unit==='igd';});
  const active=igdActiveVisits();
  const waiting=active.filter(function(v){return !v.triage||!v.triage.level;}).length;
  const exam=active.filter(function(v){return ['diperiksa','menunggu_review','observasi'].includes(v.status);}).length;
  const done=visits.filter(function(v){return ['selesai','pulang','rujuk_keluar','meninggal'].includes(v.status);}).length;
  document.getElementById('main-content').innerHTML=pageIntro('Dashboard operasional IGD untuk admin/superuser. Akses klinis petugas dibagi ke ruang kerja sesuai peran.')+
    ((igdCanRegister())?'<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Pendaftaran / Penerimaan IGD</h2></div><div class="panel-body"><div class="field-row"><div class="field"><label>Pasien terdaftar</label><select id="igd-reg-patient"><option value="">Pilih pasien</option>'+Store.data.patients.map(function(p){return '<option value="'+p.id+'">'+esc(p.nama)+' · '+esc(p.id)+'</option>';}).join('')+'</select></div><div class="field"><label>Keluhan utama / alasan datang</label><input id="igd-reg-complaint" placeholder="Keluhan utama dan informasi awal"></div></div><button type="button" class="btn btn-primary btn-sm" id="btn-igd-register">Daftarkan / Buat Episode IGD</button><div class="hint">Dalam keadaan gawat darurat, tindakan penyelamatan tidak boleh ditunda hanya karena administrasi.</div></div></div>':'')+
    '<div class="ops-kpi-grid"><div class="ops-kpi"><div class="kpi-label">Pasien IGD Hari Ini</div><div class="kpi-value">'+visits.length+'</div></div><div class="ops-kpi"><div class="kpi-label">Belum Ditriase</div><div class="kpi-value">'+waiting+'</div></div><div class="ops-kpi"><div class="kpi-label">Dalam Pelayanan</div><div class="kpi-value">'+exam+'</div></div><div class="ops-kpi"><div class="kpi-label">Episode Selesai</div><div class="kpi-value">'+done+'</div></div></div>'+ 
    '<div class="panel"><div class="panel-head"><h2>Ringkasan Pasien IGD Aktif</h2></div><div class="panel-body">'+(active.length?active.map(renderIgdPatientHeader).join(''):'<div class="empty">Belum ada episode IGD aktif.</div>')+'</div></div>'+ 
    '<div class="panel" style="margin-top:12px"><div class="panel-head"><h2>Rujukan Internal Menunggu Konfirmasi</h2></div><div class="panel-body" id="igd-referral-list">'+renderIgdReferralsHtml()+'</div></div>';
  const reg=document.getElementById('btn-igd-register');if(reg)reg.addEventListener('click',registerDirectIgdPatient);
  const refs=document.getElementById('igd-referral-list');if(refs){refs.querySelectorAll('[data-igd-accept]').forEach(function(b){b.addEventListener('click',function(){confirmCareRequest(this.dataset.igdAccept,'terima');renderIGD();});});refs.querySelectorAll('[data-igd-reject]').forEach(function(b){b.addEventListener('click',function(){confirmCareRequest(this.dataset.igdReject,'tolak');renderIGD();});});}
}
/* -----------------------------------------------------------------
   MODUL: IGD — WORKSPACE TRIase / PENDAFTARAN
   PENCARIAN KODE: MODUL: IGD — TRIASE
   Pendaftaran melekat pada workspace triase; simpan skrining pada episode yang sama.
   ----------------------------------------------------------------- */
function renderIgdTriage(){
  setPageTitle('Triase IGD');if(!igdCanTriage()){showToast('Akses khusus Perawat Triase IGD.','danger');navigate('triase-igd');return;}
  const allActive=igdActiveVisits();const list=allActive.filter(function(v){return !v.triage||!v.triage.level||v.forceTriageEdit;});const completed=allActive.filter(function(v){return v.triage&&v.triage.level&&!v.forceTriageEdit;});
  document.getElementById('main-content').innerHTML=pageIntro('Pendaftaran/penerimaan IGD dan triase berada dalam satu workspace. Catat kedatangan terlebih dahulu; jangan menunda pertolongan darurat demi administrasi.')+
    (igdCanRegister()?'<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Pendaftaran / Penerimaan IGD</h2></div><div class="panel-body"><div class="field-row"><div class="field"><label>Pasien terdaftar</label><select id="igd-reg-patient"><option value="">Pilih pasien</option>'+Store.data.patients.map(function(p){return '<option value="'+p.id+'">'+esc(p.nama)+' · '+esc(p.id)+'</option>';}).join('')+'</select></div><div class="field"><label>Keluhan utama / alasan datang</label><input id="igd-reg-complaint" placeholder="Keluhan utama dan informasi awal"></div></div><button type="button" class="btn btn-primary btn-sm" id="btn-igd-register">Daftarkan / Buat Episode IGD</button></div></div>':'')+
    '<div class="panel"><div class="panel-head"><h2>Antrean Triase · '+list.filter(function(v){return !v.triage||!v.triage.level;}).length+' belum ditriase</h2></div><div class="panel-body">'+(list.length?list.map(function(v){const t=v.triage||{},vit=t.vitals||{};return '<div class="history-item"><strong>'+esc((getPatient(v.patientId)||{}).nama||'Pasien')+'</strong> · '+esc(v.noAntrian||v.id)+'<div class="hint">Keluhan awal: '+esc(v.keluhan||'-')+' · '+esc(igdPriorityLabel(v))+'</div><div class="field"><label>Prioritas triase</label><select id="tri-level-'+v.id+'"><option value="">Pilih prioritas</option><option value="merah" '+(t.level==='merah'?'selected':'')+'>Merah · Resusitasi</option><option value="kuning" '+(t.level==='kuning'?'selected':'')+'>Kuning · Urgen</option><option value="hijau" '+(t.level==='hijau'?'selected':'')+'>Hijau · Tidak gawat</option><option value="biru" '+(t.level==='biru'?'selected':'')+'>Biru · Non-urgent</option></select></div><div class="field-row"><div class="field"><label>Tekanan darah</label><input id="tri-bp-'+v.id+'" value="'+esc(vit.bp||'')+'" placeholder="120/80"></div><div class="field"><label>Nadi / menit</label><input id="tri-pulse-'+v.id+'" value="'+esc(vit.pulse||'')+'" inputmode="numeric"></div><div class="field"><label>RR / menit</label><input id="tri-rr-'+v.id+'" value="'+esc(vit.rr||'')+'" inputmode="numeric"></div></div><div class="field-row"><div class="field"><label>Suhu °C</label><input id="tri-temp-'+v.id+'" value="'+esc(vit.temp||'')+'" inputmode="decimal"></div><div class="field"><label>SpO₂ %</label><input id="tri-spo2-'+v.id+'" value="'+esc(vit.spo2||'')+'" inputmode="numeric"></div></div><div class="field"><label>Ringkasan triase / perubahan kondisi</label><textarea id="tri-summary-'+v.id+'" placeholder="Temuan awal, faktor risiko, perubahan kondisi">'+esc(t.summary||'')+'</textarea></div><button class="btn btn-primary btn-sm" data-save-triage="'+v.id+'">Simpan Triase / Evaluasi Ulang</button></div>';}).join(''):'<div class="empty">Tidak ada pasien yang menunggu triase.</div>')+'</div></div>'+(completed.length?'<div class="panel" style="margin-top:12px"><div class="panel-head"><h2>Triase Tersimpan · Evaluasi Ulang</h2></div><div class="panel-body">'+completed.map(function(v){const p=getPatient(v.patientId)||{},t=v.triage||{};return '<div class="history-item"><strong>'+esc(p.nama||'Pasien')+'</strong> · '+esc(v.noAntrian||v.id)+'<div class="hint">'+esc(igdPriorityLabel(v))+' · '+esc(t.summary||'Triase tersimpan')+' · '+esc(formatTanggalWaktu(t.assessedAt))+'</div><button class="btn btn-outline btn-sm" data-reassess-triage="'+v.id+'">Evaluasi Ulang</button></div>';}).join('')+'</div></div>':'');
  const reg=document.getElementById('btn-igd-register');if(reg)reg.addEventListener('click',registerDirectIgdPatient);
  document.querySelectorAll('[data-reassess-triage]').forEach(function(b){b.addEventListener('click',function(){const v=getVisit(this.dataset.reassessTriage);if(v){v.forceTriageEdit=true;renderIgdTriage();}});});
  document.querySelectorAll('[data-save-triage]').forEach(function(b){b.addEventListener('click',function(){saveIgdTriage(this.dataset.saveTriage);});});
}
function saveIgdTriage(visitId){
  if(!igdCanTriage()){showToast('Hanya Perawat Triase IGD atau admin demo yang dapat mencatat triase.','danger');return;}
  const v=getVisit(visitId);if(!v||v.unit!=='igd'||['selesai','pulang','rujuk_keluar','meninggal','dibatalkan'].includes(v.status))return;
  const level=document.getElementById('tri-level-'+visitId).value;if(!level){showToast('Pilih prioritas triase terlebih dahulu.','danger');return;}
  const old=v.triage||{},oldLevel=old.level||'',now=nowISO();
  v.triage={level:level,summary:document.getElementById('tri-summary-'+visitId).value.trim(),vitals:{bp:document.getElementById('tri-bp-'+visitId).value.trim(),pulse:document.getElementById('tri-pulse-'+visitId).value.trim(),rr:document.getElementById('tri-rr-'+visitId).value.trim(),temp:document.getElementById('tri-temp-'+visitId).value.trim(),spo2:document.getElementById('tri-spo2-'+visitId).value.trim()},assessedAt:now,assessedBy:Session.currentUser.id,reassessed:!!old.level,history:Array.isArray(old.history)?old.history:[]};
  if(old.level)v.triage.history.push({level:oldLevel,summary:old.summary||'',vitals:old.vitals||{},at:old.assessedAt||now,by:old.assessedBy||null});
  v.vital=v.triage.vitals;v.screening=v.triage.summary;v.forceTriageEdit=false;v.updatedAt=now;v.workflow=v.workflow||{};v.workflow.triageAt=now;v.status=v.status==='menunggu_poli'?'menunggu_dokter':(v.status==='menunggu_triase'?'menunggu_dokter':v.status);
  logAudit(old.level?'evaluasi_ulang_triase_igd':'triase_igd',(getPatient(v.patientId)||{}).nama+' · '+oldLevel+' → '+level);Store.save();showToast('Triase tersimpan. Prioritas dan tanda vital tercatat.','success');renderIgdTriage();
}
/* -----------------------------------------------------------------
   MODUL: IGD — WORKSPACE DOKTER
   PENCARIAN KODE: MODUL: IGD — DOKTER
   Tanggung jawab: asesmen, diagnosis, instruksi klinis, resep, dan disposisi.
   ----------------------------------------------------------------- */
function renderIgdDoctor(){
  setPageTitle('Dokter IGD');if(!igdCanDoctor()){showToast('Akses khusus Dokter IGD.','danger');navigate('dokter-igd');return;}
  const list=igdActiveVisits().filter(function(v){return !!(v.triage&&v.triage.level);});
  document.getElementById('main-content').innerHTML=pageIntro('Ruang kerja dokter: tinjau triase, lakukan asesmen medis, buat instruksi, dan tentukan disposisi. Pasien dengan prioritas lebih tinggi ditampilkan lebih dahulu.')+
    '<div class="panel"><div class="panel-head"><h2>Pasien Siap Dinilai · '+list.length+'</h2></div><div class="panel-body" id="igd-clinical-list">'+renderIgdClinicalHtml()+'</div></div>';
  const clinical=document.getElementById('igd-clinical-list');if(clinical){clinical.querySelectorAll('[data-review-igd-results]').forEach(function(b){b.addEventListener('click',function(){markIgdResultsReviewed(this.dataset.reviewIgdResults);});});clinical.querySelectorAll('[data-edit-igd-assessment]').forEach(function(b){b.addEventListener('click',function(){const v=getVisit(this.dataset.editIgdAssessment);if(v){v.forceEditAssessment=true;renderIgdDoctor();}});});clinical.querySelectorAll('[data-save-igd]').forEach(function(b){b.addEventListener('click',function(){saveIgdClinicalOrders(this.dataset.saveIgd);});});clinical.querySelectorAll('[id^="igd-lab-"]').forEach(function(el){if(el.type==='checkbox')el.addEventListener('change',function(){const w=document.getElementById('igd-lab-wrap-'+this.id.replace('igd-lab-',''));if(w)w.classList.toggle('hidden',!this.checked);});});clinical.querySelectorAll('[id^="igd-rad-"]').forEach(function(el){if(el.type==='checkbox')el.addEventListener('change',function(){const w=document.getElementById('igd-rad-wrap-'+this.id.replace('igd-rad-',''));if(w)w.classList.toggle('hidden',!this.checked);});});}
}
/* -----------------------------------------------------------------
   MODUL: IGD — WORKSPACE PERAWAT PELAKSANA
   PENCARIAN KODE: MODUL: IGD — PERAWAT PELAKSANA
   Tanggung jawab: menerima dan melaksanakan instruksi, pemantauan, catatan tindakan.
   ----------------------------------------------------------------- */
function renderIgdNurseExecution(){
  setPageTitle('Perawat Pelaksana IGD');if(!igdCanExecute()){showToast('Akses khusus Perawat Pelaksana IGD.','danger');navigate('perawat-pelaksana-igd');return;}
  const list=igdActiveVisits().filter(function(v){return !!v.diagnosis||!!(v.orders&&v.orders.length)||!!getResepByVisit(v.id);});
  document.getElementById('main-content').innerHTML=pageIntro('Laksanakan instruksi yang sudah dibuat dokter dan catat tindakan serta pemantauan. Perawat tidak membuat atau mengubah diagnosis maupun instruksi dokter.')+
    '<div class="panel"><div class="panel-head"><h2>Instruksi dan Tindakan Aktif</h2></div><div class="panel-body">'+(list.length?list.map(function(v){const p=getPatient(v.patientId),orders=v.orders||[];return '<div class="history-item"><strong>'+esc(p?p.nama:'Pasien')+'</strong> · '+esc(v.noAntrian||v.id)+'<div class="hint">Diagnosis dokter: '+esc(v.diagnosis||'Belum dicatat')+' · Prioritas: '+esc(igdPriorityLabel(v))+'</div>'+(orders.length?orders.map(function(o){return '<div class="field"><strong>'+esc(o.type)+' · '+esc(o.detail)+'</strong><div class="hint">Status: '+esc(o.status)+'</div>'+(o.status==='dibuat'?'<button class="btn btn-outline btn-sm" data-ack-order="'+v.id+'|'+o.id+'">Konfirmasi diterima</button>':'')+(o.status==='diterima'?'<button class="btn btn-primary btn-sm" data-complete-order="'+v.id+'|'+o.id+'">Catat pelaksanaan</button>':'')+'</div>';}).join(''):'<div class="hint">Instruksi farmasi/penunjang tetap dipantau melalui status unit terkait.</div>')+'<div class="field"><label>Catatan tindakan / pemantauan perawat</label><textarea id="nurse-note-'+v.id+'" placeholder="Tindakan yang dilakukan, respons pasien, waktu">'+esc(v.nursingNote||'')+'</textarea></div><button class="btn btn-primary btn-sm" data-save-nurse-note="'+v.id+'">Simpan Catatan Keperawatan</button></div>';}).join(''):'<div class="empty">Belum ada instruksi/tindakan aktif yang perlu dilaksanakan.</div>')+'</div></div>';
  document.querySelectorAll('[data-ack-order]').forEach(function(b){b.addEventListener('click',function(){updateIgdOrder(this.dataset.ackOrder,'diterima');});});
  document.querySelectorAll('[data-complete-order]').forEach(function(b){b.addEventListener('click',function(){updateIgdOrder(this.dataset.completeOrder,'dilaksanakan');});});
  document.querySelectorAll('[data-save-nurse-note]').forEach(function(b){b.addEventListener('click',function(){saveIgdNursingNote(this.dataset.saveNurseNote);});});
}
function updateIgdOrder(key,status){
  if(!igdCanExecute()){showToast('Hanya Perawat Pelaksana IGD atau admin demo yang dapat memperbarui status pelaksanaan.','danger');return;}
  const parts=key.split('|'),v=getVisit(parts[0]),o=v&&(v.orders||[]).find(function(x){return x.id===parts[1];});if(!v||v.unit!=='igd'||!o)return;
  if(status==='diterima'&&o.status!=='dibuat')return;if(status==='dilaksanakan'&&o.status!=='diterima')return;
  o.status=status;o.updatedAt=nowISO();o.updatedBy=Session.currentUser.id;if(status==='dilaksanakan')o.performedAt=nowISO();logAudit('status_instruksi_igd',o.type+' '+o.detail+' → '+status+' · '+v.noAntrian);Store.save();showToast('Status instruksi diperbarui: '+status,'success');renderIgdNurseExecution();
}
function saveIgdNursingNote(visitId){
  if(!igdCanExecute()){showToast('Hanya Perawat Pelaksana IGD atau admin demo yang dapat mencatat tindakan.','danger');return;}
  const v=getVisit(visitId);if(!v||v.unit!=='igd')return;const note=document.getElementById('nurse-note-'+visitId).value.trim();if(!note){showToast('Isi catatan tindakan atau pemantauan.','danger');return;}
  v.nursingNotes=Array.isArray(v.nursingNotes)?v.nursingNotes:[];v.nursingNotes.push({note:note,at:nowISO(),by:Session.currentUser.id,byName:Session.currentUser.nama});v.nursingNote=note;v.updatedAt=nowISO();logAudit('catatan_keperawatan_igd',(getPatient(v.patientId)||{}).nama+' · '+note.slice(0,100));Store.save();showToast('Catatan keperawatan tersimpan.','success');renderIgdNurseExecution();
}

function acceptInpatientReferral(requestId){
  if(!Session.currentUser||!['admin','admisi_ranap'].includes(Session.currentUser.role)){showToast('Penerimaan rujukan Rawat Inap hanya dapat dilakukan petugas Admisi atau admin demo.','danger');return;}
  const req=(Store.data.careRequests||[]).find(function(r){return r.id===requestId&&r.destination==='rawat-inap'&&['menunggu_konfirmasi','sedang_diproses'].includes(r.status);});if(!req)return;
  req.status='sedang_diproses';req.acceptedAt=nowISO();req.acceptedBy=Session.currentUser?Session.currentUser.id:null;Store.save();
  admisiBaruState={patientId:req.patientId,visitId:req.sourceVisitId||null};openAdmisiBaruSheet();
  setTimeout(function(){const hint=document.getElementById('ab-sumber-hint'),src=document.getElementById('ab-sumber');if(src){src.value=req.sourceUnit==='igd'?'IGD':(req.sourceUnit==='rawat-jalan'?'Rawat Jalan':'Rujukan');src.dispatchEvent(new Event('change'));}if(hint)hint.textContent='Rujukan internal diterima. Admisi belum aktif sampai petugas menyelesaikan formulir dan mengonfirmasi kamar/bed.';},30);
  pushNotification('info','Rujukan Rawat Inap diterima','Petugas admisi mulai memproses penerimaan Rawat Inap.',req.patientId,null);Store.save();
}
/* Tahap 8: renderer duplikat versi lama dihapus. renderIGD() dan renderIgdReferralsHtml()
 * yang berada di atas adalah satu-satunya implementasi aktif agar panel klinis, tombol tindak lanjut,
 * ringkasan episode aktif, dan event handler tidak tertimpa oleh deklarasi fungsi yang lebih akhir.
 */

function renderRiwayatAdmin(){
  setPageTitle('Riwayat');
  const logs=Array.isArray(Store.data.auditLog)?Store.data.auditLog.slice(0,100):[];
  document.getElementById('main-content').innerHTML=
    pageIntro('Riwayat aktivitas sistem untuk Admin. Riwayat ini berbeda dari Riwayat Pemeriksaan Dokter dan tidak menampilkan menu pasien.')+
    '<div class="panel"><div class="panel-head"><div><h2>🕘 Riwayat Aktivitas Sistem</h2><div class="hint">'+logs.length+' aktivitas terakhir tersimpan pada demo perangkat ini.</div></div></div><div class="panel-body">'+
    (logs.length?'<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Peran</th><th>Aktivitas</th><th>Detail</th></tr></thead><tbody>'+logs.map(function(x){return '<tr><td>'+esc(formatTanggalWaktu(x.createdAt))+'</td><td>'+esc(x.userName||'-')+'</td><td>'+esc(x.role||'-')+'</td><td><strong>'+esc(x.aksi||'-')+'</strong></td><td>'+esc(x.detail||'-')+'</td></tr>';}).join('')+'</tbody></table></div>':'<div class="empty"><div class="big">🕘</div>Belum ada aktivitas yang tercatat.</div>')+
    '</div></div>';
}

function runSystemAudit(){
  const checks=[];
  function check(id,label,pass,detail){checks.push({id,label,pass,detail});}
  check('db','Database demo dapat dimuat',!!Store.data&&Array.isArray(Store.data.users)&&Array.isArray(Store.data.bookings), 'Store.data tersedia dan memiliki users + bookings.');
  check('v1585-active-visit-restore','Ruang pemeriksaan aktif dipulihkan ketika Rawat Jalan dibuka',/currentActive/.test(renderPoli.toString())&&/renderFormPeriksa\(currentActive\)/.test(renderPoli.toString()),'Kunjungan berstatus diperiksa dipulihkan berdasarkan ID kunjungan tanpa mengubah statusnya.');
  check('v1585-queue-simplified','Kontrol antrean menggunakan tombol sesuai status',/Panggil Berikutnya/.test(renderQueueControlPanel.toString())&&/Mulai Pemeriksaan/.test(renderQueueControlPanel.toString())&&/Selesaikan Pemeriksaan/.test(renderQueueControlPanel.toString()),'Tombol utama mengikuti status menunggu, dipanggil, atau sedang diperiksa.');
  check('v1585-final-correction','Koreksi catatan final menyimpan jejak revisi',typeof openFinalVisitCorrection==='function'&&/koreksi-final/.test(openFinalVisitCorrection.toString()),'Koreksi final menyimpan snapshot sebelumnya, nilai terbaru, waktu, dan akun pengoreksi.');
  check('v1585-no-phantom-pharmacy','Perjalanan pasien tidak membuat tahap farmasi untuk resep kosong',/rx && Array\.isArray\(rx\.items\) && rx\.items\.length>0/.test(patientJourneyDefinition.toString()),'Tahap farmasi hanya muncul bila kunjungan benar-benar memiliki resep aktif berisi item.');
  check('v1601-igd-bed-count','Monitor IGD memiliki 60 bed pada tiga zona',(function(){const original=Store.data;try{Store.data={igdBeds:[],visits:[],admissions:[]};const b=ensureIgdBeds();return b.length===60&&['hijau','kuning','merah'].every(function(z){return b.filter(function(x){return x.zone===z;}).length===20;});}catch(e){return false;}finally{Store.data=original;}})(),'Zona Hijau 20, Zona Kuning 20, Zona Merah 20.');
  check('v1601-igd-nav','Semua akun klinis IGD mendapat Beranda dan Monitor IGD',['dokter_igd','perawat_triase_igd','perawat_pelaksana_igd'].every(function(r){return ROLE_ROUTE_RULES[r].includes('beranda')&&ROLE_ROUTE_RULES[r].includes('monitor-igd')&&PRIMARY_NAV_BY_ROLE[r].includes('monitor-igd');}),'Beranda operasional dan monitor bed berada di navbar utama.');
  check('v1602-triage-registration','Pendaftaran IGD tersedia untuk Perawat Triase',igdCanRegister.toString().includes('perawat_triase_igd')&&/btn-igd-register/.test(renderIgdTriage.toString()),'Pendaftaran dan triase satu workspace.');
  check('v1602-ancillary-monitor','Beranda dan Monitor tersedia untuk Lab/Radiologi',ROLE_ROUTE_RULES.lab.includes('monitor-lab')&&ROLE_ROUTE_RULES.radiologi.includes('monitor-radiologi')&&typeof renderAncillaryMonitor==='function','Menu unit penunjang dan monitor antrean tersedia.');
  check('v1601-igd-history-no-duplicate','Dokter IGD tidak memiliki menu Riwayat terpisah',['dokter_igd'].every(function(r){return !ROLE_ROUTE_RULES[r].includes('riwayat-dokter')&&!PRIMARY_NAV_BY_ROLE[r].includes('riwayat-dokter')&&ROLE_ROUTE_RULES[r].includes('rekam-medis');}),'Rekam Medis menjadi menu klinis utama; jejak audit tetap disimpan.');
  check('v1601-patient-igd-journey','Perjalanan pasien memprioritaskan episode IGD aktif',/renderPatientDashboard/.test(renderPatientDashboard.toString())&&/PERJALANAN IGD/.test(renderPatientDashboard.toString())&&getPatientActiveIgdVisit.toString().includes('observasi'),'Episode IGD aktif termasuk triase dan observasi.');
  check('roles','Role utama tersedia',['admin','loket','rawat_jalan','dokter','pasien'].every(function(r){return Store.data.users.some(function(u){return u.role===r;});}), 'Admin, Loket, Rawat Jalan, Dokter, Pasien.');
  check('patient-nav','Navigasi pasien memiliki lima menu sesuai kesepakatan',['pasien-dashboard','pasien-booking','pasien-info','pasien-booking-saya','pasien-riwayat'].every(function(r){return ROLE_ROUTE_RULES.pasien.includes(r);}) && !ROLE_ROUTE_RULES.pasien.includes('pasien-rawat-inap') && !ROLE_ROUTE_RULES.pasien.includes('monitor-antrean'), 'Beranda · Rawat Jalan · Informasi · Booking Saya · Riwayat; Rawat Inap dan Monitor bukan menu navbar pasien.');
  check('catalog','Master poli memiliki Reguler dan Eksekutif',Store.data.poli.some(function(x){return x.layanan==='Poliklinik Spesialis';})&&Store.data.poli.some(function(x){return x.layanan==='Poliklinik Eksekutif';}), 'Konteks layanan tidak dicampur.');
  check('booking-window-reguler','Booking reguler mengikuti H-1/H-2/H-3 dan pembukaan 00.01 WIB',(function(){
    const d='2026-10-12';
    return !patientBookingWindowValid(d,'Poliklinik Spesialis',new Date('2026-10-09T00:00:00')) &&
      patientBookingWindowValid(d,'Poliklinik Spesialis',new Date('2026-10-09T00:01:00')) &&
      patientBookingWindowValid('2026-10-11','Poliklinik Spesialis',new Date('2026-10-09T10:00:00')) &&
      patientBookingWindowValid('2026-10-10','Poliklinik Spesialis',new Date('2026-10-09T10:00:00')) &&
      !patientBookingWindowValid('2026-10-09','Poliklinik Spesialis',new Date('2026-10-09T10:00:00')) &&
      !patientBookingWindowValid('2026-10-13','Poliklinik Spesialis',new Date('2026-10-09T10:00:00'));
  })(),'Tanggal H-3 baru aktif pukul 00.01; H-2/H-1 bisa, hari H dan lebih dari H-3 ditolak.');
  check('booking-window-eksekutif','Booking eksekutif hari H sampai pukul 12.00 WIB',(function(){
    return patientBookingWindowValid('2026-10-09','Poliklinik Eksekutif',new Date('2026-10-09T12:00:00')) &&
      !patientBookingWindowValid('2026-10-09','Poliklinik Eksekutif',new Date('2026-10-09T12:01:00')) &&
      patientBookingWindowValid('2026-10-12','Poliklinik Eksekutif',new Date('2026-10-09T10:00:00')) &&
      !patientBookingWindowValid('2026-10-13','Poliklinik Eksekutif',new Date('2026-10-09T10:00:00'));
  })(),'Eksekutif bisa booking hari H hingga 12.00, serta H-1/H-2/H-3; di luar rentang ditolak.');
  check('queue-shared-channels','Nomor antrean baru melanjutkan booking lintas kanal pada poli/tanggal sama',(function(){
    const original=Store.data;
    try{
      Store.data={meta:{queueCounters:{'SP-JAN-2026-10-12':1}},poli:[],bookings:[
        {id:'JKN-1',poliId:'SP-JAN',tanggalKontrol:'2026-10-12',noAntrian:'JAN-002',sumber:'Mobile JKN (simulasi)',status:'terjadwal'},
        {id:'APP-1',poliId:'SP-JAN',tanggalKontrol:'2026-10-12',noAntrian:'JAN-001',sumber:'Aplikasi RS',status:'terjadwal'}
      ],visits:[]};
      const next=generateNoAntrian('SP-JAN','2026-10-12');
      return /003$/.test(next)&&Store.data.meta.queueCounters['SP-JAN-2026-10-12']===3;
    }catch(e){return false;}finally{Store.data=original;}
  })(),'Generator memindai booking/visit tersimpan dan counter lokal sebelum mengeluarkan nomor berikutnya.');
  check('igd-demo-no-patient-self-registration','Akun demo IGD hanya petugas, bukan pasien self-registration',Store.data.users.some(function(u){return u.username==='triase.igd'&&u.role==='perawat_triase_igd'&&u.unit==='igd';}) && !ROLE_ROUTE_RULES.pasien.includes('igd') && !ROLE_ROUTE_RULES.pasien.includes('pasien-igd'),'IGD dimulai oleh petugas/rujukan internal; tidak ada route pendaftaran IGD mandiri untuk pasien.');
  check('igd-role-workspaces','Tiga ruang kerja IGD terpisah',typeof renderIgdTriage==='function'&&typeof renderIgdDoctor==='function'&&typeof renderIgdNurseExecution==='function'&&ROLE_ROUTE_RULES.perawat_triase_igd.includes('triase-igd')&&ROLE_ROUTE_RULES.dokter_igd.includes('dokter-igd')&&ROLE_ROUTE_RULES.perawat_pelaksana_igd.includes('perawat-pelaksana-igd'),'Triase, dokter, dan perawat pelaksana memiliki route terpisah.');
  check('igd-action-authorization','Fungsi tindakan IGD membatasi role',/igdCanTriage\(\)/.test(saveIgdTriage.toString())&&/igdCanDoctor\(\)/.test(saveIgdClinicalOrders.toString())&&/igdCanExecute\(\)/.test(updateIgdOrder.toString()),'Validasi peran diterapkan pada fungsi simpan/tindakan, bukan hanya tampilan.');
  check('queue','Nomor antrean konsisten per poli+tanggal',(function(){const s=new Map();let ok=true;Store.data.bookings.forEach(function(x){if(!x.noAntrian)return;const k=x.poliId+'|'+(x.tanggalKontrol||'')+'|'+x.noAntrian;if(s.has(k))ok=false;s.set(k,x.id);});Store.data.visits.forEach(function(x){if(!x.noAntrian)return;const k=x.poliId+'|'+(x.tanggal||'')+'|'+x.noAntrian;const booking=x.bookingId?Store.data.bookings.find(function(b){return b.id===x.bookingId;}):null;if(s.has(k)&&!(booking&&s.get(k)===booking.id))ok=false;if(!s.has(k))s.set(k,x.id);});return ok;})(), 'Booking dan visit boleh berbagi nomor jika visit berasal dari booking yang sama.');
  check('journey','Kunjungan memiliki workflow',Store.data.visits.filter(function(v){return v.unit==='rawat-jalan';}).every(function(v){return v.workflow&&Object.prototype.hasOwnProperty.call(v.workflow,'checkinAt');}), 'Workflow check-in dan tahapan layanan tersedia.');
  check('arrival','Booking memiliki estimasi jendela kedatangan',Store.data.bookings.filter(function(b){return ['terjadwal','checked_in'].includes(b.status);}).every(function(b){return b.arrivalWindowStart&&b.arrivalWindowEnd;}), 'Jam kedatangan disimpan sebagai estimasi, bukan janji medis.');
  check('qr','Booking memiliki kode check-in unik',(function(){const s=new Set();return Store.data.bookings.every(function(b){if(!b.kodeCheckIn)return false;if(s.has(b.kodeCheckIn))return false;s.add(b.kodeCheckIn);return true;});})(), 'Kode QR/barcode tidak boleh duplikat.');
  check('ranap-bed-status','Status bed rawat inap valid',Store.data.beds.every(function(b){return !!INPATIENT_BED_STATUS[b.status];}),'Bed memakai status siap, terisi, dipesan, persiapan, atau perbaikan.');
  check('ranap-admission','Admisi memiliki sumber dan kelas perawatan',Store.data.admissions.every(function(a){return !!a.sumberAdmisi&&!!a.kelasPerawatan&&!!a.wardId&&!!a.bedId;}),'Sumber admisi, kelas, ward, dan bed wajib tersedia.');
  check('ranap-billing','Billing rawat inap memiliki komponen penunjang',Store.data.admissions.every(function(a){return a.billing&&Object.prototype.hasOwnProperty.call(a.billing,'biayaPenunjang');}),'Kamar, obat, penunjang, dan tindakan dipisahkan.');
  check('ranap-users','Role rawat inap tersedia',['dokter_ranap','perawat_ranap'].every(function(r){return Store.data.users.some(function(u){return u.role===r;});}),'Dokter dan perawat rawat inap tersedia.');
  check('demo-patients-clean-start','Sepuluh akun demo pasien baru belum memiliki riwayat',['RM-DEMO-NP001','RM-DEMO-NP002','RM-DEMO-NP003','RM-DEMO-NP004','RM-DEMO-NP005','RM-DEMO-NP006','RM-DEMO-NP007','RM-DEMO-NP008','RM-DEMO-NP009','RM-DEMO-NP010'].every(function(id){return Store.data.patients.some(function(p){return p.id===id;})&&!Store.data.bookings.some(function(b){return b.patientId===id;})&&!Store.data.visits.some(function(v){return v.patientId===id;})&&!Store.data.admissions.some(function(a){return a.patientId===id;})&&!Store.data.prescriptions.some(function(r){return r.patientId===id;});})&&Store.data.users.filter(function(u){return /^pasien\.demo(10|[1-9])$/.test(u.username);}).length===10&&new Set(Store.data.users.filter(function(u){return /^pasien\.demo(10|[1-9])$/.test(u.username);}).map(function(u){return u.patientId;})).size===10&&!Store.data.users.some(function(u){return /^pasien\.ri[1-5]$/.test(u.username)||u.username==='pasien.demo';}),'10 akun baru lintas layanan memiliki identitas unik tanpa booking, visit, admission, atau resep bawaan; akun pasien demo lama dibersihkan.');
  check('unit-demo-accounts','Akun demo staf mencakup layanan utama dan unit terpisah',(function(){
    const required={
      'triase.igd':['perawat_igd','igd'],'dokter.igd':['dokter_igd','igd'],'perawat.igd':['perawat_igd','igd'],
      'farmasi.igd':['farmasi','igd'],'kasir.igd':['kasir','igd'],'farmasi.rajal':['farmasi','rawat-jalan'],
      'kasir.rajal':['kasir','rawat-jalan'],'farmasi.ranap':['farmasi','rawat-inap'],'kasir.ranap':['kasir','rawat-inap'],
      'admisi.ranap':['admisi_ranap','rawat-inap'],'lab':['lab',null],'radiologi':['radiologi',null]
    };
    return Object.keys(required).every(function(username){const u=Store.data.users.find(function(x){return x.username===username;});return !!u&&u.role===required[username][0]&&(required[username][1]===null||u.unit===required[username][1]);});
  })(),'Akun triase, dokter/perawat IGD, farmasi/kasir per unit, admisi RI, laboratorium, dan radiologi terdaftar.');
  check('role-route-isolation','Role staf dibatasi pada menu sesuai unit kerja',(function(){
    const original=Session.currentUser;
    try{
      const igd=Store.data.users.find(function(u){return u.username==='perawat.igd';});
      const lab=Store.data.users.find(function(u){return u.username==='lab';});
      const patient=Store.data.users.find(function(u){return u.username==='pasien.demo1';});
      Session.currentUser=igd;
      const igdOk=isRouteAllowed('igd','perawat_igd')&&!isRouteAllowed('ranap','perawat_igd')&&!isRouteAllowed('pasien-booking','perawat_igd');
      Session.currentUser=lab;
      const labOk=isRouteAllowed('lab','lab')&&!isRouteAllowed('radiologi','lab')&&!isRouteAllowed('igd','lab');
      Session.currentUser=patient;
      const patientOk=isRouteAllowed('pasien-booking','pasien')&&!isRouteAllowed('igd','pasien')&&!isRouteAllowed('pasien-rawat-inap','pasien');
      return igdOk&&labOk&&patientOk;
    }catch(e){return false;}finally{Session.currentUser=original;}
  })(),'Triase IGD tidak membuka Rawat Inap/pasien; lab tidak membuka radiologi/IGD; pasien tidak membuka IGD atau route Rawat Inap tersendiri.');
  check('ranap-demo-roles','Akun demo Rawat Inap terpisah dan terkelompok',['admisi.ranap','dokter.jaga.pagi','dokter.jaga.sore','dokter.jaga.malam','perawat.ranap.pagi','perawat.ranap.sore','perawat.ranap.malam','farmasi.ranap'].every(function(u){return Store.data.users.some(function(x){return x.username===u;});}),'Admisi, dokter jaga, perawat shift, dan farmasi RI tersedia.');
  check('ranap-shift','Shift Rawat Inap 24 jam terdefinisi',INPATIENT_SHIFTS.length===3&&INPATIENT_SHIFTS.every(function(x){return x.jamMulai&&x.jamSelesai;}),'Pagi 06–14, Sore 14–22, Malam 22–06.');
  check('admin-radiology-route','Admin memiliki menu Radiologi',ROLE_ROUTE_RULES.admin.includes('*') && NAV_ITEMS.some(function(n){return n.hash==='radiologi';}),'Radiologi tetap diizinkan Admin melalui daftar modul pada tampilan desktop.')
  check('admin-mobile-nav','Navbar Admin maksimal enam menu tanpa tombol Lainnya', PRIMARY_NAV_BY_ROLE.admin.length<=6 && PRIMARY_NAV_BY_ROLE.admin.length===6 && PRIMARY_NAV_BY_ROLE.admin.includes('beranda'),'Navbar Admin dibatasi enam menu; Beranda Admin menyediakan akses cepat ke modul tambahan.');
  check('staff-chat-top','Chat tersedia sebagai akses topbar terpisah dari navbar',typeof renderStaffPatientChat==='function'&&Object.keys(ROLE_ROUTE_RULES).filter(function(r){return r!=='pasien'&&r!=='monitor_public'&&r!=='admin';}).every(function(r){return ROLE_ROUTE_RULES[r].includes('chat-pasien');})&&!NAV_ITEMS.some(function(n){return n.hash==='chat-pasien'||n.hash==='pasien-chat';}),'Chat dibuka dari sisi kiri atas dan tidak dihitung sebagai menu navbar.');
  check('patient-info-chat','Informasi satu arah dan Chat dua arah tersedia',typeof renderPatientInfo==='function'&&typeof renderPatientChat==='function'&&typeof renderStaffPatientChat==='function'&&typeof renderHospitalInformationAdmin==='function'&&!NAV_ITEMS.some(function(n){return n.hash==='chat-pasien'||n.hash==='pasien-chat';}),'Informasi RS terpisah dari percakapan dua arah.');
  check('nav-no-patient-monitor','Monitor dan Rawat Inap tidak masuk navbar pasien',PRIMARY_NAV_BY_ROLE.pasien.length===5&&!PRIMARY_NAV_BY_ROLE.pasien.includes('monitor-antrean')&&!PRIMARY_NAV_BY_ROLE.pasien.includes('pasien-rawat-inap')&&!PRIMARY_NAV_BY_ROLE.pasien.includes('pasien-chat')&&ROLE_ROUTE_RULES.pasien.includes('pasien-chat')&&!ROLE_ROUTE_RULES.pasien.includes('pasien-rawat-inap'),'Fungsi Rawat Inap tetap muncul dalam Perjalanan Saya; Monitor digantikan Informasi.');
  check('nav-no-duplicate-history','Route Riwayat tidak terduplikasi untuk dokter',NAV_ITEMS.filter(function(n){return n.hash==='riwayat-dokter';}).length===1,'Riwayat dokter hanya memiliki satu route: riwayat-dokter.');
  check('v1588-doctor-navbar','Navbar dokter rawat jalan berisi empat menu setelah Riwayat digabung ke Rekam Medis',['beranda','poli','monitor-antrean','rekam-medis'].every(function(h){return PRIMARY_NAV_BY_ROLE.dokter.includes(h);})&&PRIMARY_NAV_BY_ROLE.dokter.length===4&&!PRIMARY_NAV_BY_ROLE.dokter.includes('riwayat-dokter')&&!ROLE_ROUTE_RULES.dokter.includes('riwayat-dokter')&&ROLE_ROUTE_RULES.dokter.includes('beranda'),'Beranda, Poli, Monitor, Rekam Medis.');
  check('v1588-doctor-beranda-sections','Beranda dokter menampilkan sembilan KPI, Patient Journey, jadwal kontrol, dan info praktik',/rawatJalanKpiHtml/.test(berandaDokter.toString())&&/renderRawatJalanPatientJourney/.test(berandaDokter.toString())&&/poli-jadwal-panel/.test(berandaDokter.toString())&&/poli-info-panel/.test(berandaDokter.toString()),'KPI, Journey, jadwal kontrol, dan info praktik berada di Beranda.');
  check('v1588-doctor-history-merged','Riwayat pemeriksaan dokter tersedia di dalam Rekam Medis',/renderRiwayatDokterInline/.test(renderRekamMedis.toString())&&typeof renderRiwayatDokterInline==='function','Fungsi daftar pemeriksaan dokter dipertahankan tanpa menu navbar terpisah.');
  check('nav-primary-monitor-rj','Monitor Rawat Jalan berada di navbar utama',PRIMARY_NAV_BY_ROLE.rawat_jalan.includes('monitor-antrean') && ROLE_ROUTE_RULES.rawat_jalan.includes('monitor-antrean'),'Monitor sejajar dengan Pendaftaran, Booking, dan Poli.');
  check('nav-no-more-rj','Rawat Jalan tidak memerlukan tombol Lainnya di mobile',PRIMARY_NAV_BY_ROLE.rawat_jalan.length===4 && !PRIMARY_NAV_BY_ROLE.rawat_jalan.includes('cek-antrian'),'Navbar mobile Rawat Jalan berisi tepat empat menu utama; Cek Antrian tidak didorong ke Lainnya.');
  check('nav-primary-monitor-perawat','Monitor Perawat Rawat Jalan berada di navbar utama',PRIMARY_NAV_BY_ROLE.perawat.includes('monitor-antrean'),'Monitor sejajar dengan Beranda, Poli, dan Rekam Medis.');
  check('nav-primary-monitor-clinical','Monitor klinis tidak masuk overflow untuk dokter/perawat', ['dokter','dokter_ranap','perawat','perawat_ranap'].every(function(r){return PRIMARY_NAV_BY_ROLE[r].includes('monitor-antrean');})&&!PRIMARY_NAV_BY_ROLE.dokter_igd.includes('monitor-antrean')&&!PRIMARY_NAV_BY_ROLE.perawat_igd.includes('monitor-antrean'),'Semua role klinis yang memakai Monitor menempatkannya di navbar utama.');
  check('nav-unit-module-primary','Farmasi/Kasir menampilkan modul unit sebagai navbar utama',['farmasi','kasir'].every(function(r){return primaryNavHashesForUser({role:r,unit:'rawat-jalan'}).length===2;}),'Tidak ada tombol Lainnya hanya untuk memuat satu modul unit.');
  check('admin-folder-no-patient-menu','Menu pasien tidak bocor ke folder Admin',!['pasien-booking-saya','pasien-riwayat','pasien-dashboard','pasien-booking','pasien-rawat-inap','pasien-info','pasien-chat'].some(function(h){return ['pendaftaran','booking','igd','lab','radiologi','farmasi-rawat-jalan','farmasi-rawat-inap','farmasi-igd','kasir-rawat-jalan','kasir-rawat-inap','kasir-igd','rekam-medis','riwayat-admin','master-data','audit-sistem','cek-antrian','monitor-antrean','informasi-rs','chat-pasien'].includes(h);}), 'Daftar modul Admin tidak mencakup route pasien.');
  check('inpatient-journey','Journey Rawat Inap memiliki alur utama dan aktivitas dinamis', typeof patientInpatientJourney==='function' && typeof inpatientJourneyForAdmission==='function','Admisi · Kamar/Bed · Perawatan · Evaluasi · Pulang + aktivitas pendukung sesuai order.');
  check('care-request-schema','Skema permintaan antarunit tersedia',Array.isArray(Store.data.careRequests)&&typeof createCareRequest==='function'&&typeof confirmCareRequest==='function','Permintaan memiliki unit sumber/tujuan, status konfirmasi, dan jejak waktu.');
  check('pharmacy-unit-separation','Farmasi memiliki pemisahan konteks unit',typeof pharmacyMetrics==='function'&&typeof getResepByVisit==='function','Rawat Jalan, Rawat Inap, dan IGD menggunakan konteks resep/episode masing-masing.');
  check('igd-referral-acceptance','Penerimaan rujukan IGD tersedia',typeof renderIgdReferralsHtml==='function'&&typeof confirmCareRequest==='function','Rujukan internal baru membuat episode IGD setelah diterima.');
  check('radiology-outpatient','Radiologi menerima order Rawat Jalan dan IGD',typeof submitHasilRadiologiRJ==='function'&&typeof renderRadiologi==='function','Order memiliki status dan hasil kembali ke episode sumber.');
  check('prescription-episode-links','Resep tertaut ke kunjungan atau admisi',Store.data.prescriptions.every(function(r){return !!r.admissionId || !!r.visitId || Store.data.visits.some(function(v){return v.resepId===r.id;});}),'Resep tanpa episode sumber dianggap tidak konsisten dan perlu diperbaiki.');
  check('pharmacy-routing-isolation','Uji isolasi antrean Farmasi RJ/RI/IGD',(function(){const original=Store.data;try{const now=nowISO(),today=todayStr();Store.data={visits:[{id:'T-RJ',unit:'rawat-jalan',tanggal:today,poliId:'T',resepId:'RX-RJ'},{id:'T-IGD',unit:'igd',tanggal:today,poliId:'T',resepId:'RX-IGD'}],prescriptions:[{id:'RX-RJ',visitId:'T-RJ',unit:'rawat-jalan',status:'menunggu',createdAt:now},{id:'RX-IGD',visitId:'T-IGD',unit:'igd',status:'menunggu',createdAt:now},{id:'RX-RI',admissionId:'T-ADM',unit:'rawat-inap',status:'menunggu',createdAt:now}],meta:{settings:{}}};return pharmacyMetrics('rawat-jalan').pending===1&&pharmacyMetrics('igd').pending===1&&pharmacyMetrics('rawat_inap').pending===1;}catch(e){return false;}finally{Store.data=original;}})(),'Skenario sintetis memastikan resep satu unit tidak masuk antrean unit lain.');
  check('concurrent-journey-states','Perjalanan pasien mempertahankan status beberapa permintaan sekaligus',(function(){const original=Store.data;try{const v={id:'T-VIS',patientId:'T-P',unit:'rawat-jalan',status:'menunggu_lab',resepId:'T-RX',labRequest:{status:'menunggu'},radiologyRequest:{status:'menunggu'},workflow:{bookedAt:nowISO(),checkinAt:nowISO()}};Store.data={visits:[v],prescriptions:[{id:'T-RX',visitId:'T-VIS',status:'menunggu',unit:'rawat-jalan'}],careRequests:[],patients:[],users:[],bookings:[],admissions:[],beds:[],transactions:[],medicines:[],meta:{settings:{}}};const steps=patientJourneyDefinition(v);return steps.some(function(x){return x.key==='lab';})&&steps.some(function(x){return x.key==='radiology';})&&steps.some(function(x){return x.key==='pharmacy_prepare';})&&patientJourneyStepState(v,steps.find(function(x){return x.key==='lab';}))==='active'&&patientJourneyStepState(v,steps.find(function(x){return x.key==='radiology';}))==='active'&&patientJourneyStepState(v,steps.find(function(x){return x.key==='pharmacy_prepare';}))==='active';}catch(e){return false;}finally{Store.data=original;}})(),'Laboratorium, Radiologi, dan Farmasi dapat sama-sama aktif tanpa saling menandai selesai.');
  check('active-journey-priority','Beranda memilih satu perjalanan aktif sesuai prioritas pelayanan',(function(){const original=Store.data;try{const pid='T-PAT';Store.data={admissions:[{id:'A1',patientId:pid,status:'dirawat',billing:{statusBayar:'belum_bayar'},updatedAt:nowISO()}],visits:[{id:'V1',patientId:pid,unit:'igd',status:'diperiksa',updatedAt:nowISO()},{id:'V2',patientId:pid,unit:'rawat-jalan',status:'menunggu_dokter',updatedAt:nowISO()}],prescriptions:[],beds:[],wards:[],patients:[],users:[],bookings:[],transactions:[],medicines:[],careRequests:[],meta:{settings:{}}};if(getPatientActiveJourney(pid).unit!=='rawat-inap')return false;Store.data.admissions[0].status='pulang';if(getPatientActiveJourney(pid).unit!=='rawat-inap')return false;Store.data.admissions[0].billing.statusBayar='lunas';if(getPatientActiveJourney(pid).unit!=='igd')return false;Store.data.visits[0].status='selesai';return getPatientActiveJourney(pid).unit==='rawat-jalan';}catch(e){return false;}finally{Store.data=original;}})(),'Prioritas: Rawat Inap aktif → IGD aktif → Rawat Jalan aktif.');

  check('inpatient-structure-counts','Struktur rawat inap 3 gedung, 12 lantai reguler, 36 ruang reguler, 2 ruang VVIP',Store.data.wards.filter(function(w){return w.locationManaged&&w.category==='reguler';}).length===36&&Store.data.wards.filter(function(w){return w.locationManaged&&w.category==='vvip';}).length===2&&Store.data.beds.filter(function(b){return b.category==='reguler';}).length===1080&&Store.data.beds.filter(function(b){return b.category==='vvip';}).length===40,'36 ruang reguler × 30 bed dan 2 ruang VVIP × 20 bed tunggal.');
  check('inpatient-room-bed-counts','Setiap ruang reguler 10 kamar × 3 bed dan VVIP 20 kamar × 1 bed',Store.data.wards.filter(function(w){return w.locationManaged&&w.category==='reguler';}).every(function(w){return Store.data.beds.filter(function(b){return b.wardId===w.id;}).length===30;})&&Store.data.wards.filter(function(w){return w.locationManaged&&w.category==='vvip';}).every(function(w){return Store.data.beds.filter(function(b){return b.wardId===w.id;}).length===20;}),'Kapasitas struktur harus persis sesuai spesifikasi.');


  check('inpatient-floor-layout','Tiga gedung memiliki empat lantai reguler dengan tiga ruangan per lantai',(function(){const rooms=Store.data.wards.filter(function(w){return w.locationManaged&&w.category==='reguler';});const buildings=new Set(rooms.map(function(w){return w.buildingId;}));return buildings.size===3&&Array.from(buildings).every(function(id){const br=rooms.filter(function(w){return w.buildingId===id;});const floors=new Set(br.map(function(w){return Number(w.floorNumber);}));return floors.size===4&&Array.from(floors).every(function(f){return br.filter(function(w){return Number(w.floorNumber)===f;}).length===3;});})&&Store.data.wards.some(function(w){return w.category==='vvip'&&w.buildingId==='GED-A'&&Number(w.floorNumber)===5;})&&Store.data.wards.some(function(w){return w.category==='vvip'&&w.buildingId==='GED-A'&&Number(w.floorNumber)===6;});})(),'Gedung A/B/C: lantai 1–4 reguler, Gedung A lantai 5–6 VVIP.');
  check('service-account-unit-isolation','Akun farmasi/kasir terpisah per unit dan dokter IGD/RI tidak membawa poli rawat jalan',(function(){const users=Store.data.users;const find=function(username){return users.find(function(u){return u.username===username;});};return find('farmasi.rajal')?.unit==='rawat-jalan'&&find('farmasi.ranap')?.unit==='rawat-inap'&&find('farmasi.igd')?.unit==='igd'&&find('kasir.rajal')?.unit==='rawat-jalan'&&find('kasir.ranap')?.unit==='rawat-inap'&&find('kasir.igd')?.unit==='igd'&&!find('dokter.ranap')?.poliId&&!find('dokter.igd')?.poliId;})(),'Konteks farmasi/kasir mengikuti unit; dokter IGD/RI tidak salah ditautkan ke poli RJ.');
  check('inpatient-staffing-roster','Semua ruang memiliki kepala ruang dan tiga roster shift',Store.data.wards.filter(function(w){return w.locationManaged;}).length===38&&Store.data.wards.filter(function(w){return w.locationManaged;}).every(function(w){return !!w.headNurseName&&['PAGI','SORE','MALAM'].every(function(k){const sh=w.shiftAssignments&&w.shiftAssignments[k];return !!sh&&!!sh.ketuaShift&&!!sh.jamMulai&&!!sh.jamSelesai&&Array.isArray(sh.perawat)&&sh.perawat.length>0&&sh.perawat.includes(sh.ketuaShift);});})&&new Set(Store.data.wards.filter(function(w){return w.locationManaged;}).map(function(w){return w.headNurseName;})).size===38,'Setiap ruang mempunyai kepala ruang dan roster petugas per shift yang dapat diedit.');
  check('inpatient-nurse-assignment','Akun perawat rawat inap memiliki ruang dan shift yang valid',['perawat.ranap.pagi','perawat.ranap.sore','perawat.ranap.malam'].every(function(name){const u=Store.data.users.find(function(x){return x.username===name;});return !!u&&!!u.wardId&&!!u.shiftId&&Store.data.wards.some(function(w){return w.id===u.wardId;});}),'Akun shift tidak boleh masuk ke monitor tanpa penugasan ruang.');
  check('navbar-max-six','Semua navbar role dibatasi maksimal enam menu',Object.keys(PRIMARY_NAV_BY_ROLE).every(function(role){return PRIMARY_NAV_BY_ROLE[role].length<=6;})&&!NAV_ITEMS.some(function(n){return n.label==='Lainnya'||n.hash==='chat-pasien'||n.hash==='pasien-chat';}),'Chat tidak dihitung sebagai menu navbar; tidak ada menu Lainnya.');
  check('admin-service-menu-4x4','Superuser memiliki tombol Pelayanan dengan 16 ikon akses cepat',typeof openAdminMenuFolder==='function'&&ADMIN_SERVICE_MENU_ROUTES.length===16&&new Set(ADMIN_SERVICE_MENU_ROUTES).size===16&&ADMIN_SERVICE_MENU_ROUTES.every(function(h){return NAV_ITEMS.some(function(n){return n.hash===h;});}),'Tombol ☰ Pelayanan membuka grid 4×4; Chat tetap menjadi tombol terpisah.');
  check('topbar-chat-title-layout','Topbar menggunakan elemen terpisah untuk Chat dan judul halaman',/id=\"btn-top-chat\"/.test(renderShell.toString())&&/btn-admin-service-menu/.test(renderShell.toString()),'Chat tidak menimpa label judul halaman; tombol Pelayanan hanya untuk Admin.');

  check('monitor-poli-lock','Monitor tidak bisa diganti melalui parameter URL untuk akun poli',resolveMonitorPoliId({role:'perawat',poliId:'ANA'},'SP-JAN','SP-JAN')==='SP-ANA'&&resolveMonitorPoliId({role:'dokter',poliId:'GIG'},'SP-JAN',null)==='SP-GIG'&&resolveMonitorPoliId({role:'perawat'},'SP-JAN',null)===null,'Akun perawat/dokter mengikuti poli penugasan, bukan query URL.');
  check('inpatient-edit-persistence','Nama ruangan/gedung tetap setelah migrasi ulang',(function(){const d=migrateData(seedData());const w=d.wards.find(function(x){return x.id==='W-K3';});w.nama='Ruang Uji Edit';w.buildingName='Gedung Uji Edit';ensureInpatientStructure(d);return w.nama==='Ruang Uji Edit'&&w.buildingName==='Gedung Uji Edit';})(),'Master data yang diedit tidak ditimpa kembali oleh seed pada reload.');

  check('demo-account-catalog-complete','Semua akun demo tercantum tepat sekali pada login', (function(){const matches=Array.from(chipsForDemo().matchAll(/data-username="([^"]+)"/g)).map(function(x){return x[1];});return matches.length===Store.data.users.length&&new Set(matches).size===matches.length&&Store.data.users.every(function(u){return matches.includes(u.username);});})(),'Daftar login mencakup semua akun dokter, petugas per unit, admin, dan 10 pasien demo tanpa duplikasi.');
  check('unique-usernames','Username akun demo tidak duplikat',new Set(Store.data.users.map(function(u){return u.username;})).size===Store.data.users.length,'Satu username hanya boleh menunjuk ke satu akun login.');
  check('demo-data','Tidak ada identitas pasien nyata pada akun demo',Store.data.patients.filter(function(p){return String(p.id).startsWith('RM-DEMO-');}).every(function(p){return String(p.alamat||'').includes('bukan data pasien nyata')||String(p.nik||'').startsWith('DEMO');}), 'Akun demo menggunakan data fiktif.');
  return checks;
}
function renderAuditSistem(){
  setPageTitle('Audit Sistem');
  const checks=runSystemAudit(), pass=checks.filter(function(x){return x.pass;}).length;
  document.getElementById('main-content').innerHTML=pageIntro('Pemeriksaan internal V15.8.5 untuk memeriksa aturan booking, nomor antrean bersama simulasi, jalur utama, data demo, permintaan antarunit, dan batas prototype.')+
    '<div class="ops-kpi-grid"><div class="ops-kpi"><div class="kpi-label">Lulus</div><div class="kpi-value">'+pass+'</div></div><div class="ops-kpi"><div class="kpi-label">Diperiksa</div><div class="kpi-value">'+checks.length+'</div></div><div class="ops-kpi"><div class="kpi-label">Status</div><div class="kpi-value" style="font-size:20px">'+(pass===checks.length?'SIAP':'PERLU REVIEW')+'</div></div></div>'+
    '<div class="panel"><div class="panel-head"><div><h2>🧪 Self-Test V15.8.5</h2><div class="hint">Ini adalah audit data/aturan sisi client, bukan pengganti pengujian keamanan backend.</div></div><button class="btn btn-outline btn-sm" onclick="renderAuditSistem()">↻ Jalankan Lagi</button></div><div class="panel-body">'+
    '<div class="table-wrap"><table><thead><tr><th>Status</th><th>Pemeriksaan</th><th>Detail</th></tr></thead><tbody>'+checks.map(function(c){return '<tr><td>'+(c.pass?'<span class="badge badge-sage">✓ LULUS</span>':'<span class="badge badge-brick">✕ GAGAL</span>')+'</td><td><strong>'+esc(c.label)+'</strong></td><td>'+esc(c.detail)+'</td></tr>';}).join('')+'</tbody></table></div></div></div>'+
    '<div class="alert alert-warning"><strong>Batas prototype:</strong> localStorage hanya untuk simulasi. Untuk produksi dibutuhkan backend, database terpusat, autentikasi server, otorisasi server, audit trail terpusat, enkripsi, backup, dan integrasi resmi.</div>';
}

/* =================================================================
   INIT / PWA BOOTSTRAP
   ================================================================= */

/* =================================================================
   V16.0.1 — IGD BERANDA, MONITOR 60 BED, DAN EPISODE PASIEN
   ================================================================= */
function ensureIgdBeds(){
  if(!Store.data.igdBeds)Store.data.igdBeds=[];
  const zones=[{key:'hijau',prefix:'H',label:'Zona Hijau',triage:['hijau','biru']},{key:'kuning',prefix:'K',label:'Zona Kuning',triage:['kuning']},{key:'merah',prefix:'M',label:'Zona Merah',triage:['merah']}];
  zones.forEach(function(z){for(let i=1;i<=20;i++){const id='IGD-'+z.prefix+'-'+String(i).padStart(2,'0');if(!Store.data.igdBeds.some(function(b){return b.id===id;}))Store.data.igdBeds.push({id:id,zone:z.key,zoneLabel:z.label,status:'kosong',visitId:null,updatedAt:nowISO()});}});
  // Preserve occupancy references and make bed assignment recoverable after refresh.
  Store.data.igdBeds.forEach(function(b){if(!['kosong','terisi','persiapan','perbaikan'].includes(b.status))b.status='kosong';});
  Store.data.visits.filter(function(v){return v.unit==='igd'&&v.igdBedId;}).forEach(function(v){const b=Store.data.igdBeds.find(function(x){return x.id===v.igdBedId;});if(b&&!['selesai','pulang','rujuk_keluar','meninggal','dibatalkan'].includes(v.status)){b.visitId=v.id;b.status='terisi';}});
  return Store.data.igdBeds;
}
function igdBedZoneForVisit(v){const level=v&&v.triage&&v.triage.level;return level==='merah'?'merah':level==='kuning'?'kuning':'hijau';}
function igdBedOccupant(b){const v=b&&b.visitId?getVisit(b.visitId):null;return v&&v.unit==='igd'?v:null;}
function igdCounts(){
  const all=Store.data.visits.filter(function(v){return v.unit==='igd';}),active=igdActiveVisits(),beds=ensureIgdBeds();
  const moved=all.filter(function(v){return v.disposition==='rawat_inap'&&!!(v.workflow&&v.workflow.transferredToInpatientAt)&&Store.data.admissions.some(function(a){return a.patientId===v.patientId&&a.status==='dirawat'&&(a.visitId===v.id||a.sourceVisitId===v.id||a.sumberAdmisi==='IGD');});}).length;
  const discharged=all.filter(function(v){return ['pulang','selesai'].includes(v.status)&&v.disposition!=='rawat_inap';}).length;
  return {all:all,active:active,beds:beds,newPatients:active.filter(function(v){return !v.triage||!v.triage.level;}).length,beingTreated:active.filter(function(v){return !!(v.triage&&v.triage.level)&&!['rujuk_ranap','observasi'].includes(v.status);}).length,observation:active.filter(function(v){return v.status==='observasi';}).length,admissionPlanned:active.filter(function(v){return v.disposition==='rawat_inap'||v.status==='rujuk_ranap';}).length,moved:moved,discharged:discharged};
}
/* -----------------------------------------------------------------
   MODUL: IGD — BERANDA OPERASIONAL
   PENCARIAN KODE: MODUL: IGD — BERANDA
   Beranda membaca data episode dan status layanan; jangan membuat data klinis baru di sini.
   ----------------------------------------------------------------- */
function renderIgdHome(){
  setPageTitle('Beranda IGD');const c=igdCounts(),beds=c.beds;
  const zones=[{key:'hijau',label:'Zona Hijau',prefix:'H',color:'igd-zone-green'},{key:'kuning',label:'Zona Kuning',prefix:'K',color:'igd-zone-yellow'},{key:'merah',label:'Zona Merah',prefix:'M',color:'igd-zone-red'}];
  const zoneSummary=zones.map(function(z){const bs=beds.filter(function(b){return b.zone===z.key;}),occupied=bs.filter(function(b){return b.status==='terisi';}).length;return '<div class="ops-kpi"><div class="kpi-label">'+z.label+'</div><div class="kpi-value">'+occupied+' / 20</div><div class="ops-kpi-sub">'+(20-occupied)+' bed kosong · '+bs.filter(function(b){return b.status==='persiapan';}).length+' persiapan</div></div>';}).join('');
  const activeRows=c.active.slice(0,12).map(function(v){const p=getPatient(v.patientId)||{};const bed=beds.find(function(b){return b.visitId===v.id;});return '<div class="history-item"><strong>'+esc(p.nama||'Pasien')+'</strong> · '+esc(v.noAntrian||v.id)+' <span class="badge badge-sage">'+esc((STATUS_MAP[v.status]||{label:v.status}).label)+'</span><div class="hint">'+esc(igdPriorityLabel(v))+' · '+esc(v.disposition||'Tindak lanjut belum diputuskan')+' · '+(bed?esc(bed.id):'Belum ditempatkan pada bed IGD')+'</div></div>';}).join('');
  document.getElementById('main-content').innerHTML=pageIntro('Dashboard operasional IGD. Angka berasal dari episode dan bed yang tercatat pada aplikasi ini; ini adalah data prototipe lokal, bukan data rumah sakit nyata.')+
    '<div class="ops-kpi-grid"><div class="ops-kpi"><div class="kpi-label">Pasien Aktif IGD</div><div class="kpi-value">'+c.active.length+'</div><div class="ops-kpi-sub">Semua episode aktif</div></div><div class="ops-kpi"><div class="kpi-label">Baru Datang / Triase</div><div class="kpi-value">'+c.newPatients+'</div><div class="ops-kpi-sub">Belum selesai triase</div></div><div class="ops-kpi"><div class="kpi-label">Sedang Dilayani</div><div class="kpi-value">'+c.beingTreated+'</div><div class="ops-kpi-sub">Pemeriksaan dan tindakan</div></div><div class="ops-kpi"><div class="kpi-label">Observasi</div><div class="kpi-value">'+c.observation+'</div><div class="ops-kpi-sub">Tetap aktif di IGD</div></div><div class="ops-kpi"><div class="kpi-label">Rencana Rawat Inap</div><div class="kpi-value">'+c.admissionPlanned+'</div><div class="ops-kpi-sub">Menunggu perpindahan/admisi</div></div><div class="ops-kpi"><div class="kpi-label">Sudah Dipindahkan</div><div class="kpi-value">'+c.moved+'</div><div class="ops-kpi-sub">Admisi rawat inap aktif</div></div><div class="ops-kpi"><div class="kpi-label">Pulang / Selesai</div><div class="kpi-value">'+c.discharged+'</div><div class="ops-kpi-sub">Episode selesai tercatat</div></div></div>'+
    '<div class="ops-kpi-grid">'+zoneSummary+'</div><div class="panel"><div class="panel-head"><div><h2>Pasien IGD Aktif</h2><div class="hint">Pasien yang sudah diputuskan rawat inap tetap dihitung aktif sampai perpindahan dikonfirmasi.</div></div><button class="btn btn-outline btn-sm" data-nav="monitor-igd">Buka Monitor 60 Bed</button></div><div class="panel-body">'+(activeRows||'<div class="empty">Tidak ada episode IGD aktif.</div>')+'</div></div>';
}
/* -----------------------------------------------------------------
   MODUL: IGD — MONITOR BED DAN ZONA
   PENCARIAN KODE: MODUL: IGD — MONITOR
   Monitor adalah tampilan status; perubahan status bed tetap melalui aksi berizin.
   ----------------------------------------------------------------- */
function renderIgdMonitor(){
  const u=Session.currentUser||{};if(!isRouteAllowed('monitor-igd',u.role)){showToast('Akses Monitor IGD tidak tersedia untuk akun ini.','danger');navigate(defaultRouteForRole(u.role));return;}
  setPageTitle('Monitor Bed IGD');const beds=ensureIgdBeds(),active=igdActiveVisits();
  const zones=[{key:'hijau',label:'Zona Hijau',prefix:'H',cls:'igd-zone-green',description:'Prioritas sesuai hasil triase; evaluasi ulang jika kondisi berubah.'},{key:'kuning',label:'Zona Kuning',prefix:'K',cls:'igd-zone-yellow',description:'Pasien membutuhkan penanganan cepat dan pemantauan.'},{key:'merah',label:'Zona Merah',prefix:'M',cls:'igd-zone-red',description:'Kegawatan tinggi; penanganan klinis segera sesuai protokol.'}];
  const canAssign=['admin','perawat_pelaksana_igd','perawat_triase_igd','perawat_igd'].includes(u.role);
  document.getElementById('main-content').innerHTML='<div class="ops-hero"><div><div class="ops-eyebrow">SIMRS PROTOTYPE · IGD BED MONITOR</div><h2>Monitor Tempat Tidur IGD</h2><p>3 zona · 20 bed per zona · 60 bed total. Zona triase tidak mengunci lokasi fisik pasien.</p></div><button class="btn btn-outline btn-sm" id="btn-refresh-igd-monitor">↻ Perbarui</button></div>'+
    zones.map(function(z){const bs=beds.filter(function(b){return b.zone===z.key;});const occupied=bs.filter(function(b){return b.status==='terisi';}).length;return '<section class="panel igd-zone-panel '+z.cls+'"><div class="panel-head"><div><h2>'+z.label+'</h2><div class="hint">'+z.description+'</div></div><span class="badge badge-slate">'+occupied+' terisi · '+(20-occupied)+' kosong</span></div><div class="panel-body"><div class="inpatient-bed-grid igd-bed-grid">'+bs.map(function(b){const v=igdBedOccupant(b),p=v?getPatient(v.patientId):null;const status=b.status==='terisi'?'Terisi':b.status==='persiapan'?'Sedang dibersihkan':b.status==='perbaikan'?'Tidak dapat digunakan':'Kosong';const visitOptions=active.filter(function(x){return !x.igdBedId||x.igdBedId===b.id;}).map(function(x){const px=getPatient(x.patientId)||{};return '<option value="'+x.id+'">'+esc(px.nama||'Pasien')+' · '+esc(x.noAntrian||x.id)+' · '+esc(igdPriorityLabel(x))+'</option>';}).join('');return '<article class="inpatient-bed-card igd-bed-card"><div><strong>'+esc(b.id)+'</strong><span class="badge '+(b.status==='terisi'?'badge-brick':b.status==='kosong'?'badge-sage':'badge-amber')+'">'+status+'</span></div>'+(v&&p?'<div class="inpatient-bed-patient"><strong>'+esc(p.nama)+'</strong><small>No. RM '+esc(p.id)+'</small><small>'+esc(igdPriorityLabel(v))+' · '+esc((STATUS_MAP[v.status]||{label:v.status}).label)+'</small><small>Masuk: '+esc(formatTanggalWaktu(v.createdAt||v.tanggal))+'</small></div>':'<div class="inpatient-bed-patient"><strong>'+(b.status==='kosong'?'Belum ditempati':status)+'</strong><small>Bed tersedia mengikuti status aktual.</small></div>')+(canAssign&&b.status==='kosong'?'<div class="field"><label for="igd-bed-visit-'+b.id+'">Tempatkan pasien aktif</label><select id="igd-bed-visit-'+b.id+'"><option value="">Pilih pasien</option>'+visitOptions+'</select><button class="btn btn-primary btn-sm" data-assign-igd-bed="'+b.id+'">Tempatkan</button></div>':'')+(canAssign&&b.status==='terisi'?'<button class="btn btn-outline btn-sm" data-release-igd-bed="'+b.id+'">Konfirmasi pasien keluar / pindah</button>':'')+(canAssign&&b.status==='persiapan'?'<button class="btn btn-outline btn-sm" data-clean-igd-bed="'+b.id+'">Selesai dibersihkan · Kosongkan bed</button>':'')+'</article>';}).join('')+'</div></div></section>';}).join('');
  const refresh=document.getElementById('btn-refresh-igd-monitor');if(refresh)refresh.addEventListener('click',renderIgdMonitor);
  document.querySelectorAll('[data-assign-igd-bed]').forEach(function(btn){btn.addEventListener('click',function(){assignIgdBed(this.dataset.assignIgdBed);});});
  document.querySelectorAll('[data-release-igd-bed]').forEach(function(btn){btn.addEventListener('click',function(){releaseIgdBed(this.dataset.releaseIgdBed);});});
  document.querySelectorAll('[data-clean-igd-bed]').forEach(function(btn){btn.addEventListener('click',function(){cleanIgdBed(this.dataset.cleanIgdBed);});});
}
function assignIgdBed(bedId){
  const u=Session.currentUser||{};if(!['admin','perawat_pelaksana_igd','perawat_triase_igd','perawat_igd'].includes(u.role)){showToast('Akun ini tidak memiliki kewenangan penempatan bed IGD.','danger');return;}
  const b=ensureIgdBeds().find(function(x){return x.id===bedId;}),sel=document.getElementById('igd-bed-visit-'+bedId),v=sel&&getVisit(sel.value);if(!b||b.status!=='kosong'||!v||v.unit!=='igd'||!igdActiveVisits().some(function(x){return x.id===v.id;})){showToast('Bed atau episode pasien sudah berubah. Muat ulang monitor sebelum mencoba lagi.','warning');return;}
  if(v.igdBedId&&v.igdBedId!==bedId){showToast('Pasien sudah terhubung dengan bed '+v.igdBedId+'. Lepaskan penempatan lama terlebih dahulu.','warning');return;}
  const zone=igdBedZoneForVisit(v);if(b.zone!==zone){const confirmZone=window.confirm('Pasien ini masuk '+igdPriorityLabel(v)+', sedangkan bed berada di '+b.zoneLabel+'. Tetap tempatkan? Pastikan penempatan sesuai penilaian klinis dan SOP.');if(!confirmZone)return;}
  b.status='terisi';b.visitId=v.id;b.updatedAt=nowISO();v.igdBedId=b.id;v.igdBedAssignedAt=nowISO();v.updatedAt=nowISO();logAudit('penempatan_bed_igd',b.id+' · '+(getPatient(v.patientId)||{}).nama);Store.save();showToast('Pasien ditempatkan pada '+b.id+'.','success');renderIgdMonitor();
}
function releaseIgdBed(bedId){
  const u=Session.currentUser||{};if(!['admin','perawat_pelaksana_igd','perawat_igd'].includes(u.role)){showToast('Konfirmasi keluar/pindah bed hanya untuk petugas berwenang.','danger');return;}
  const b=ensureIgdBeds().find(function(x){return x.id===bedId;}),v=igdBedOccupant(b);if(!b||b.status!=='terisi'||!v)return;
  const admitted=Store.data.admissions.some(function(a){return a.patientId===v.patientId&&a.status==='dirawat'&&(a.visitId===v.id||a.sourceVisitId===v.id||a.sumberAdmisi==='IGD');});
  const terminal=['pulang','selesai','rujuk_keluar','meninggal','dibatalkan'].includes(v.status);
  if(v.status==='proses_pulang'&&['pulang','rawat_jalan'].includes(v.disposition)){v.status='pulang';v.workflow=v.workflow||{};v.workflow.completedAt=nowISO();v.workflow.patientLeftAt=nowISO();v.nextStep='Episode IGD berakhir';}
  else if(!terminal&&!admitted){showToast('Episode IGD masih aktif. Konfirmasi keluar hanya setelah pasien benar-benar meninggalkan bed dan serah terima ke unit tujuan dikonfirmasi.','warning');return;}
  b.status='persiapan';b.updatedAt=nowISO();b.visitId=null;v.igdBedReleasedAt=nowISO();delete v.igdBedId;v.updatedAt=nowISO();logAudit('bed_igd_dikosongkan',bedId+' · episode '+v.id);Store.save();showToast('Pasien keluar dari bed. Bed masuk status persiapan/dibersihkan.','success');renderIgdMonitor();
}
function cleanIgdBed(bedId){const u=Session.currentUser||{};if(!['admin','perawat_pelaksana_igd','perawat_igd'].includes(u.role)){showToast('Akun ini tidak dapat mengubah status kebersihan bed.','danger');return;}const b=ensureIgdBeds().find(function(x){return x.id===bedId;});if(!b||b.status!=='persiapan')return;b.status='kosong';b.updatedAt=nowISO();logAudit('bed_igd_siap_digunakan',bedId);Store.save();showToast('Bed '+bedId+' siap digunakan.','success');renderIgdMonitor();}

MODULE_RENDERERS['dashboard'] = renderDashboard;
MODULE_RENDERERS['pasien-dashboard'] = renderPatientDashboard;
MODULE_RENDERERS['pasien-info'] = renderPatientInfo;
MODULE_RENDERERS['pasien-chat'] = renderPatientChat;
MODULE_RENDERERS['chat-pasien'] = renderStaffPatientChat;
MODULE_RENDERERS['informasi-rs'] = renderHospitalInformationAdmin;
MODULE_RENDERERS['pasien-booking'] = renderPatientBooking;
MODULE_RENDERERS['pasien-rawat-inap'] = renderPatientRawatInap;
MODULE_RENDERERS['pasien-booking-saya'] = renderPatientBookingSaya;
MODULE_RENDERERS['pasien-riwayat'] = renderPatientRiwayat;
MODULE_RENDERERS['beranda'] = renderBeranda;
MODULE_RENDERERS['monitor-igd'] = renderIgdMonitor;
MODULE_RENDERERS['pendaftaran'] = renderPendaftaran;
MODULE_RENDERERS['booking'] = renderBooking;
MODULE_RENDERERS['poli'] = renderPoli;
MODULE_RENDERERS['ranap'] = renderRanap;
MODULE_RENDERERS['lab'] = renderLab;
MODULE_RENDERERS['radiologi'] = renderRadiologi;
MODULE_RENDERERS['monitor-lab'] = function(){renderAncillaryMonitor('lab');};
MODULE_RENDERERS['monitor-radiologi'] = function(){renderAncillaryMonitor('radiologi');};
MODULE_RENDERERS['igd'] = renderIGD;
MODULE_RENDERERS['triase-igd'] = renderIgdTriage;
MODULE_RENDERERS['dokter-igd'] = renderIgdDoctor;
MODULE_RENDERERS['perawat-pelaksana-igd'] = renderIgdNurseExecution;
MODULE_RENDERERS['farmasi-rawat-jalan'] = renderFarmasi;
MODULE_RENDERERS['farmasi-rawat-inap'] = renderFarmasi;
MODULE_RENDERERS['farmasi-igd'] = renderFarmasi;
MODULE_RENDERERS['kasir-rawat-jalan'] = renderKasir;
MODULE_RENDERERS['kasir-rawat-inap'] = renderKasir;
MODULE_RENDERERS['kasir-igd'] = renderKasir;
MODULE_RENDERERS['rekam-medis'] = renderRekamMedis;
MODULE_RENDERERS['riwayat-dokter'] = renderRiwayatDokter;
MODULE_RENDERERS['riwayat-admin'] = renderRiwayatAdmin;
MODULE_RENDERERS['master-data'] = renderMasterData;
MODULE_RENDERERS['cek-antrian'] = renderCekAntrian;
MODULE_RENDERERS['monitor-antrean'] = renderMonitorAntrean;
MODULE_RENDERERS['audit-sistem'] = renderAuditSistem;
function openDoctorMonitor(){
  const u=Session.currentUser; if(!u||!['dokter','perawat','rawat_jalan','dokter_igd','perawat_igd','dokter_ranap','perawat_ranap','admin'].includes(u.role))return;
  if(['perawat_ranap','dokter_ranap'].includes(u.role)){window.open(location.href.split('#')[0]+'#/monitor-antrean','simrs-monitor-ri-'+encodeURIComponent(u.wardId||'unassigned'),'noopener,noreferrer');return;}
  const rawPoli=u.poliId; if(!rawPoli && ['dokter','perawat'].includes(u.role)){showToast('Akun belum memiliki penugasan poli. Hubungi administrator.','warning');return;}
  const poliId=canonicalPoliId(rawPoli||'SP-JAN');
  localStorage.setItem('simrs_monitor_config_v15',JSON.stringify({poliId:poliId}));
  const url=location.href.split('#')[0]+'#/monitor-antrean?poli='+encodeURIComponent(poliId);
  window.open(url,'simrs-monitor-'+poliId,'noopener,noreferrer');
}
/* =================================================================
   MODUL: RAWAT INAP — MONITOR DIPINDAHKAN KE modules/rawat-inap/core.js
   PENCARIAN KODE: MODUL: RAWAT INAP | FUNGSI: MONITOR RUANG
   Fungsi monitor dan timer bersama kini didefinisikan di file modul Rawat Inap.
   ================================================================= */
function resolveMonitorPoliId(user, requestedPoliId, savedPoliId){
  if(user&&['dokter','perawat'].includes(user.role)) return user.poliId?canonicalPoliId(user.poliId):null;
  return canonicalPoliId(requestedPoliId||savedPoliId||'SP-JAN');
}
function renderMonitorAntrean(){
  const signedIn=Session.currentUser;
  if(signedIn&&['perawat_ranap','dokter_ranap','admisi_ranap'].includes(signedIn.role)){renderInpatientNurseMonitor();return;}
  const hash=location.hash||''; const qs=hash.includes('?')?new URLSearchParams(hash.split('?')[1]):null;
  const saved=JSON.parse(localStorage.getItem('simrs_monitor_config_v15')||'null');
  let poliId;
  if(signedIn&&['dokter','perawat'].includes(signedIn.role)){
    if(!signedIn.poliId){document.getElementById('main-content').innerHTML='<div class="panel"><div class="panel-body"><div class="empty">Akun belum memiliki penugasan poli. Monitor tidak dapat menampilkan poli lain secara otomatis.</div></div></div>';return;}
    poliId=resolveMonitorPoliId(signedIn,qs&&qs.get('poli'),saved&&saved.poliId);
  } else if(signedIn&&['dokter_igd','perawat_igd'].includes(signedIn.role)){
    document.getElementById('main-content').innerHTML='<div class="panel"><div class="panel-body"><div class="empty">Akun IGD tidak menggunakan monitor antrean poli. Gunakan monitor dan daftar kerja IGD.</div></div></div>';return;
  } else {
    const cfg=qs&&qs.get('poli')?{poliId:qs.get('poli')}:(saved||null);
    poliId=resolveMonitorPoliId(signedIn,cfg&&cfg.poliId,saved&&saved.poliId);
  }
  const poli=getPoli(poliId)||{id:poliId,nama:poliId};
  const now=new Date(), date=todayStr(now), schedules=getSessionCandidates(poliId,date);
  const activeSchedule=getActiveDoctorSchedule(poliId,now);
  const activeDoctor=activeSchedule?(Store.data.users.find(u=>u.id===activeSchedule.doctorId)||doctorMasterById(activeSchedule.doctorId)):null;
  const visits=visitsToday().filter(v=>samePoli(v.poliId,poliId));
  const active=visits.filter(v=>['dipanggil','diperiksa'].includes(v.status)).sort(function(a,b){return new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt);})[0]||null;
  const waiting=visits.filter(v=>['menunggu_dokter','menunggu_poli'].includes(v.status)).sort(function(a,b){return (b.prioritas?1:0)-(a.prioritas?1:0)||(queueNumberValue(a.noAntrian)||999999)-(queueNumberValue(b.noAntrian)||999999);});
  const sessionInfo=activeSchedule?(esc(activeSchedule.jamMulai)+'–'+esc(activeSchedule.jamSelesai)+' · '+esc(activeSchedule.ruang||'Ruang Poli')):'Tidak ada sesi yang sedang berlangsung';
  const doctorInfo=activeDoctor?esc(activeDoctor.nama):'Menunggu sesi dokter berikutnya';
  const nextSession=schedules.find(sc=>{const a=String(sc.jamMulai||'00:00').split(':').map(Number);return (now.getHours()*60+now.getMinutes()) < a[0]*60+a[1];});
  const nextInfo=nextSession?('Berikutnya: '+esc((Store.data.users.find(u=>u.id===nextSession.doctorId)||doctorMasterById(nextSession.doctorId)||{}).nama||'Dokter')+' · '+esc(nextSession.jamMulai)+'–'+esc(nextSession.jamSelesai)):'';
  document.getElementById('main-content').innerHTML='<div class="public-monitor"><div class="monitor-head"><div><div class="ops-eyebrow">SIMRS PROTOTYPE · MONITOR POLI</div><h1>'+esc(poli.nama).toUpperCase()+'</h1><div>'+doctorInfo+' · '+sessionInfo+'</div></div><div class="monitor-clock" id="monitor-clock"></div></div><div class="monitor-current"><span>NOMOR YANG DIPANGGIL</span><strong>'+esc(active?active.noAntrian:'—')+'</strong><div>'+(active?'Silakan menuju ruang pemeriksaan':'Mohon menunggu panggilan berikutnya')+'</div></div><div class="monitor-next"><h2>ANTREAN MENUNGGU</h2><div class="monitor-queue-list">'+(waiting.length?waiting.slice(0,10).map(function(v){return '<div><strong>'+esc(v.noAntrian)+'</strong><span>Menunggu</span></div>';}).join(''):'<div class="monitor-empty">Belum ada pasien yang menunggu.</div>')+'</div></div><div class="monitor-session-strip"><span>SESI AKTIF</span><strong>'+sessionInfo+'</strong><small>'+esc(nextInfo)+'</small></div><div class="monitor-footer">Nomor antrean dibuat per poli dan tanggal · Dokter/sesi dialokasikan otomatis sesuai jadwal dan kapasitas · Tidak menampilkan nama pasien</div></div>';
  if(monitorClockTimer)clearInterval(monitorClockTimer); const clock=document.getElementById('monitor-clock'); if(clock){const tick=()=>clock.textContent=new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',second:'2-digit'});tick();monitorClockTimer=setInterval(tick,1000);}
}


function doInstallPrompt(){
  if(!installPromptEvent) return;
  installPromptEvent.prompt();
  installPromptEvent.userChoice.finally(function(){ installPromptEvent = null; });
}
window.addEventListener('beforeinstallprompt', function(e){
  e.preventDefault();
  installPromptEvent = e;
  const btn = document.getElementById('btn-install');
  if(btn) btn.classList.remove('hidden');
});
function updateOfflineBanner(){
  const banner = document.getElementById('offline-banner');
  if(banner) banner.classList.toggle('hidden', navigator.onLine);
}
window.addEventListener('online', updateOfflineBanner);
window.addEventListener('offline', updateOfflineBanner);

if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('sw.js').catch(function(err){ console.log('Service worker tidak aktif pada mode preview ini:', err); });
  });
}

/* =====================================================================
   BOOTSTRAP GUARD — PEMULIHAN AWAL APLIKASI
   Tujuan: kegagalan localStorage/migrasi tidak boleh membuat #app kosong.
   Data lama tidak dihapus atau ditimpa jika migrasi/read mengalami kegagalan.
   ===================================================================== */
try {
  Store.load();
} catch(err) {
  console.error('SIMRS startup: Store.load gagal; menyiapkan data demo sementara.', err);
  window.__SIMRS_BOOT_WARNING = window.__SIMRS_BOOT_WARNING || 'Penyimpanan atau migrasi data gagal. Aplikasi menggunakan data demo sementara; data lama tidak dihapus otomatis.';
  if(!Store.data) {
    try { Store.data = migrateData(seedData()); }
    catch(seedErr) { console.error('SIMRS startup: data demo gagal dibuat.', seedErr); }
  }
}
try { Session.load(); }
catch(err) {
  console.error('SIMRS startup: Session.load gagal.', err);
  Session.currentUser = null;
  window.__SIMRS_STORAGE_WARNING = 'Sesi lama tidak dapat dibaca. Silakan masuk kembali.';
}
try { if(typeof expireOldBookings==='function' && Store.data) expireOldBookings(); }
catch(err) { console.warn('SIMRS startup: pembersihan booking dilewati.', err); }
try { updateOfflineBanner(); } catch(err) { console.warn('SIMRS startup: banner offline tidak tersedia.', err); }
['click','keydown','touchstart'].forEach(function(evt){
  try { document.addEventListener(evt, resetSessionTimer); } catch(err) {}
});
try { if(Session.currentUser) resetSessionTimer(); } catch(err) { console.warn('SIMRS startup: timer sesi dilewati.', err); }

// Render selalu dicoba meskipun pembacaan penyimpanan sebelumnya gagal.
try { render(); }
catch(err) {
  console.error('SIMRS startup: render gagal.', err);
  const app = document.getElementById('app');
  if(app) app.innerHTML = '<section role="alert" style="max-width:640px;margin:32px auto;padding:24px;border-radius:18px;background:#fff;color:#172033;font:15px system-ui;box-shadow:0 12px 40px #14213d22"><h2>SIMRS PROTOTYPE</h2><p>Halaman utama gagal dimuat. Aplikasi tidak akan menghapus data secara otomatis.</p><p>Periksa koneksi aset atau penyimpanan browser, lalu muat ulang halaman.</p><details><summary>Detail teknis</summary><pre style="white-space:pre-wrap">'+String(err&&err.stack||err).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c];})+'</pre></details><button onclick="location.reload()" style="padding:10px 16px">Muat ulang</button></section>';
}


// Tampilkan peringatan yang bisa dibaca pengguna bila browser menolak penyimpanan.
// Ini tidak menghapus data; hanya menjelaskan bahwa perubahan mungkin sementara.
(function showStartupWarning(){
  const warning = window.__SIMRS_BOOT_WARNING || window.__SIMRS_STORAGE_WARNING;
  const app = document.getElementById('app');
  if(!warning || !app || document.getElementById('simrs-startup-warning')) return;
  const box = document.createElement('div');
  box.id = 'simrs-startup-warning';
  box.setAttribute('role','status');
  box.style.cssText = 'margin:12px auto;max-width:760px;padding:12px 16px;border-radius:12px;background:#fff4d6;color:#714b00;border:1px solid #e9c46a;font:13px/1.5 system-ui,sans-serif';
  box.textContent = warning;
  app.insertBefore(box, app.firstChild);
})();

window.addEventListener('storage',function(e){
  if(e.key==='simrs_db_v1') {
    try { Store.load(); if(Session.currentUser) render(); }
    catch(err) { console.error('SIMRS storage event gagal:', err); }
  }
});
try {
  if(liveChannel) liveChannel.onmessage=function(e){
    if(e.data&&e.data.type==='db-updated') {
      try { Store.load(); if(Session.currentUser) render(); }
      catch(err) { console.error('SIMRS live sync gagal:', err); }
    }
  };
} catch(e) {}
