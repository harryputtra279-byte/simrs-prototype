/* =================================================================
   MODUL 05 — RAWAT JALAN & POLIKLINIK
   Tanggung jawab: Beranda poli, monitor antrean, dokter/asisten, dan penyelesaian pemeriksaan.
   Kontrak integrasi: dijalankan sebagai classic script berurutan setelah modul sebelumnya;
   gunakan Store/Session/helper bersama yang sudah didefinisikan. Jangan mengubah urutan pemuatan
   tanpa audit dependensi dan uji alur lintas unit.
   PENCARIAN KODE: modules/05-outpatient.js
   ================================================================= */

"use strict"; // Pertahankan semantik strict-mode dari app.js monolitik.
/* INDEKS BANTUAN TAHAP 7
 * Modul: RAWAT JALAN & POLIKLINIK
 * Tanggung jawab: Monitor antrean, dokter/asisten, pemeriksaan, dan penyelesaian layanan.
 * Fungsi yang sering menjadi titik masuk (cari nama fungsi dengan Ctrl+F):
 * - rawatJalanKpiHtml
 * - renderRawatJalanPatientJourney
 * - renderRawatJalanAlerts
 * - renderPoli
 * - populatePoliOptions
 * - rerenderHeader
 * - renderDoctorSessionDashboard
 * - refreshQueueControlPanel
 * - queueCandidates
 * - callNextPatient
 * - recallPatient
 * - pausePatient
 * - renderQueueControlPanel
 * - bindQueueControlPanel
 * - openScreening
 * - renderJadwalKontrolPoli
 * - renderJadwalKontrolSummary
 * - renderInfoPraktikPoli
 * - kirimInfoPraktik
 * - renderInfoPraktikFeed
 * - refreshPoliQueue
 * - toggleUrgent
 * - bukaPeriksa
 * - historyItemHtml
 * - renderFormPeriksa
 * - resepSectionHtml
 * - resepItemsTableHtml
 * - bindResepEvents
 * - bindResepRemoveEvents
 * - openRiwayatModal
 * - historyItemHtmlFull
 * - openFinalVisitCorrection
 * - simpanDraftPeriksa
 * - notifyCareUnit
 * - createCareRequest
 * - ... dan 1 fungsi lain pada berkas ini.
 * Integrasi: fungsi global/Store dipertahankan untuk kompatibilitas classic script.
 * Catatan: jangan memindahkan fungsi lintas modul tanpa audit pemanggil dan uji alur.
 */

/* =================================================================
   MODULE: POLI
   PENCARIAN KODE: MODUL: RAWAT JALAN | FUNGSI: POLI | FUNGSI: DOKTER
   Tanggung jawab: screening, antrean, pemeriksaan, diagnosis, resep, dan penyelesaian kunjungan.
   ================================================================= */
let poliState = { poliId:null, activeVisitId:null, resepItems:[] };

function rawatJalanKpiHtml(poliId){
  const m=clinicTodayMetrics(poliId), visits=m.queue.visits;
  const screening=visits.filter(v=>['menunggu_screening','screening'].includes(v.status)).length;
  const waitingDoctor=visits.filter(v=>v.status==='menunggu_dokter').length;
  const review=visits.filter(v=>v.status==='menunggu_review').length;
  const penunjang=visits.filter(v=>v.status==='menunggu_penunjang'||v.status==='menunggu_lab').length;
  const ph=pharmacyMetrics('rawat_jalan',poliId);
  const k=(ic,l,v,sub,cls)=>'<div class="rj-kpi '+(cls||'')+'"><span>'+ic+'</span><div><b>'+v+'</b><small>'+l+'</small><em>'+sub+'</em></div></div>';
  return '<div class="rj-kpi-grid">'+
    k('👥','Terdaftar',m.registered,'kunjungan hari ini')+
    k('🎫','Booking',m.bookings,'terjadwal')+
    k('🟡','Screening',screening,'belum selesai')+
    k('⏳','Menunggu Dokter',waitingDoctor,'siap dipanggil',waitingDoctor? 'warn':'')+
    k('🩺','Diperiksa',m.examined,'sedang berlangsung')+
    k('🧪','Penunjang',penunjang,'menunggu hasil/order')+
    k('🔎','Review',review,'hasil siap ditinjau',review?'warn':'')+
    k('✓','Selesai',m.completed,'kunjungan selesai')+
    k('💊','Farmasi',ph.pending,'resep · max '+ph.maxWait+' mnt',ph.maxWait>ph.sla?'danger':'')+
  '</div>';
}
function renderRawatJalanPatientJourney(poliId){
  const list=visitsToday(poliId).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const counts={booking:Store.data.bookings.filter(b=>samePoli(b.poliId,poliId)&&b.tanggalKontrol===todayStr()).length,checkin:list.filter(v=>v.workflow&&v.workflow.checkinAt).length,screening:list.filter(v=>['screening','menunggu_dokter'].includes(v.status)||v.screening).length,doctor:list.filter(v=>v.status==='diperiksa').length,penunjang:list.filter(v=>['menunggu_lab','menunggu_penunjang','menunggu_review'].includes(v.status)).length,done:list.filter(v=>v.status==='selesai').length};
  const steps=[['BOOKING',counts.booking,'slate'],['CHECK-IN',counts.checkin,'sage'],['SCREENING',counts.screening,'clinical'],['DOKTER',counts.doctor,'plum'],['PENUNJANG/REVIEW',counts.penunjang,'amber'],['SELESAI',counts.done,'slate']];
  return '<div class="panel rj-journey"><div class="panel-head"><div><h2>🧭 Patient Journey Hari Ini</h2><div class="hint">Satu perjalanan pasien dari registrasi sampai selesai, tanpa input identitas berulang.</div></div></div><div class="panel-body"><div class="rj-flow">'+steps.map((x,i)=>'<div class="rj-flow-step '+x[2]+'"><span>'+x[0]+'</span><strong>'+x[1]+'</strong>'+(i<steps.length-1?'<i>→</i>':'')+'</div>').join('')+'</div></div></div>';
}
function renderRawatJalanAlerts(poliId){
  const visits=visitsToday(poliId), av=getDoctorAvailability(poliId), now=Date.now();
  const late=visits.filter(v=>v.status==='menunggu_dokter' && v.workflow && v.workflow.screeningAt && now-new Date(v.workflow.screeningAt).getTime()>30*60000).length;
  const items=[];
  if(av.status==='delay') items.push('Dokter terlambat: '+(av.message||'silakan koordinasikan jadwal dokter.'));
  if(av.status==='cancel') items.push('Dokter tidak praktik: informasikan pasien dan lakukan penjadwalan ulang sesuai kewenangan.');
  if(late) items.push(late+' pasien menunggu dokter lebih dari 30 menit setelah screening.');
  const ph=pharmacyMetrics('rawat_jalan',poliId); if(ph.maxWait>ph.sla) items.push('Farmasi rawat jalan melewati parameter SLA pada resep pasien poli ini.');
  return '<div class="panel rj-alert-panel"><div class="panel-head"><h2>🔔 Perhatian Operasional</h2></div><div class="panel-body">'+(items.length?items.map(x=>'<div class="rj-alert">⚠ '+esc(x)+'</div>').join(''):'<div class="rj-ok">✓ Tidak ada alert kritis pada poli ini.</div>')+'</div></div>';
}
/* =================================================================
   MODUL: RAWAT JALAN — BERANDA, MONITOR, DAN ANTRIAN POLI
   PENCARIAN KODE: MODUL: RAWAT JALAN | SUBMODUL: MONITOR POLI
   Tanggung jawab: dashboard poli, monitor antrean, pemilihan poli, dan
   penyegaran status pelayanan. Nomor antrean harus tetap terikat pada poli,
   dokter, tanggal, dan sesi praktik sesuai data sumber.
   ================================================================= */
function renderPoli(){
  setPageTitle('Rawat Jalan');
  const u=Session.currentUser;
  poliState={poliId:canonicalPoliId((u.role==='dokter'||u.role==='perawat')&&u.poliId ? u.poliId : (Store.data.poli[0]&&Store.data.poli[0].id)),activeVisitId:null,resepItems:[]};
  const serviceChooser = u.role==='rawat_jalan'
    ? '<div class="poli-service-switch"><button type="button" class="poli-service-btn active" data-service="Poliklinik Spesialis">🩺 Poli Reguler</button><button type="button" class="poli-service-btn" data-service="Poliklinik Eksekutif">⭐ Poli Eksekutif</button></div>'
    : '';
  const poliSelector=(u.role==='admin'||u.role==='rawat_jalan')?'<div class="field" style="max-width:520px"><label>Unit / Poli</label><select id="poli-select"></select></div>':'';
  document.getElementById('main-content').innerHTML=
    pageIntro(u.role==='dokter'?'Workspace dokter untuk '+esc(getPoli(u.poliId).nama)+'.':'Command Center pelayanan Rawat Jalan — pilih kategori poli terlebih dahulu, lalu pilih klinik untuk pendaftaran langsung dan pengelolaan antrean.')+
    serviceChooser+poliSelector+'<div id="rj-doctor-session-dashboard"></div>'+(u.role==='dokter'?'':'<div id="rj-kpi-area"></div>')+'<div id="rj-queue-control-area"></div>'+(u.role==='dokter'?'':renderRawatJalanPatientJourney(poliState.poliId))+
    '<div class="rj-work-grid"><div><div class="panel"><div class="panel-head"><div><h2 id="poli-queue-title">Antrian Rawat Jalan</h2><div class="hint">Status pasien ditampilkan per tahap agar petugas tahu apa yang harus dikerjakan berikutnya.</div></div></div><div class="panel-body" id="poli-queue-area"></div></div></div><div id="poli-exam-area"><div class="panel"><div class="panel-body"><div class="empty"><div class="big">🩺</div>Pilih pasien yang siap diperiksa. Skrining awal dilakukan oleh perawat.</div></div></div></div></div>'+(u.role==='dokter'?'':renderRawatJalanAlerts(poliState.poliId))+
    (u.role==='dokter'?'':'<div class="grid grid-2"><div class="panel" id="poli-jadwal-panel"></div><div class="panel" id="poli-info-panel"></div></div>');
  const serviceButtons=document.querySelectorAll('[data-service]');
  const poliSelect=document.getElementById('poli-select');
  function populatePoliOptions(service){
    if(!poliSelect) return;
    const options=Store.data.poli.filter(p=>p.official && (!service || p.layanan===service)).sort((a,b)=>a.nama.localeCompare(b.nama));
    poliSelect.innerHTML=options.map(p=>'<option value="'+p.id+'">'+esc(p.nama)+' — '+esc(p.layanan||'Rawat Jalan')+'</option>').join('');
    if(options.some(p=>samePoli(p.id,poliState.poliId))) poliSelect.value=poliState.poliId;
    else if(options[0]){ poliState.poliId=options[0].id; poliSelect.value=options[0].id; }
    rerenderHeader(); refreshPoliQueue(); refreshQueueControlPanel(); renderJadwalKontrolPoli(); renderInfoPraktikPoli();
  }
  serviceButtons.forEach(btn=>btn.addEventListener('click',()=>{
    serviceButtons.forEach(x=>x.classList.remove('active')); btn.classList.add('active'); populatePoliOptions(btn.dataset.service);
  }));
  if(poliSelect){
    poliSelect.addEventListener('change',()=>{ poliState.poliId=canonicalPoliId(poliSelect.value); rerenderHeader(); refreshPoliQueue(); refreshQueueControlPanel(); renderJadwalKontrolPoli(); renderInfoPraktikPoli(); });
    populatePoliOptions(u.role==='rawat_jalan'?'Poliklinik Spesialis':null);
  }

  function rerenderHeader(){
    const k=document.getElementById('rj-kpi-area'); if(k) k.innerHTML=rawatJalanKpiHtml(poliState.poliId);
    const j=document.querySelector('.rj-journey'); if(j) j.outerHTML=renderRawatJalanPatientJourney(poliState.poliId);
    const a=document.querySelector('.rj-alert-panel'); if(a) a.outerHTML=renderRawatJalanAlerts(poliState.poliId);
  }
  window.__rjRerender=rerenderHeader;
  renderDoctorSessionDashboard();
  rerenderHeader(); refreshPoliQueue(); refreshQueueControlPanel(); renderJadwalKontrolPoli(); renderInfoPraktikPoli();
  // Pulihkan ruang pemeriksaan aktif setelah refresh: kunjungan tetap berstatus diperiksa,
  // bukan dibuat ulang atau ditandai selesai. Data diambil dari kunjungan tersimpan.
  const currentActive=visitsToday().find(function(v){return samePoli(v.poliId,poliState.poliId)&&v.unit==='rawat-jalan'&&v.status==='diperiksa'&&(!u||u.role!=='dokter'||v.dokterId===u.id);});
  if(currentActive){
    poliState.activeVisitId=currentActive.id;
    const currentRx=getResepByVisit(currentActive.id);
    poliState.resepItems=(currentRx&&['draft','menunggu'].includes(currentRx.status))?(currentRx.items||[]).map(function(it){return Object.assign({},it);}):[];
    renderFormPeriksa(currentActive);
  }
}

function renderDoctorSessionDashboard(){
  const el=document.getElementById('rj-doctor-session-dashboard'); if(!el)return;
  const u=Session.currentUser; if(!u||u.role!=='dokter'){el.innerHTML='';return;}
  const poliId=canonicalPoliId(u.poliId), sc=getDoctorScheduleForUser(poliId,u.id,todayStr());
  const mine=visitsToday().filter(v=>samePoli(v.poliId,poliId)&&v.dokterId===u.id&&v.unit==='rawat-jalan').sort((a,b)=>(queueNumberValue(a.noAntrian)||999999)-(queueNumberValue(b.noAntrian)||999999));
  const active=mine.find(v=>v.status==='diperiksa')||mine.find(v=>v.status==='dipanggil'); const waiting=mine.filter(v=>['menunggu_dokter','menunggu_poli','screening'].includes(v.status));
  el.innerHTML='<div class="doctor-session-dashboard panel"><div class="panel-head"><div><div class="ops-eyebrow">DASHBOARD SESI DOKTER</div><h2>📺 '+esc(getPoli(poliId).nama)+' · '+esc(u.nama)+'</h2><div class="hint">'+(sc?'Sesi '+esc(sc.shiftLabel||'')+' · '+esc(sc.jamMulai)+'–'+esc(sc.jamSelesai)+' · '+esc(sc.ruang||'Ruang Poli'):'Belum ada sesi terjadwal hari ini')+'</div></div><span class="badge '+(sc?'badge-sage':'badge-amber')+'">'+(sc?'TERJADWAL':'TIDAK TERJADWAL')+'</span></div><div class="panel-body"><div class="doctor-live-grid"><div><span class="kpi-label">SEDANG DIPANGGIL</span><strong class="doctor-live-number">'+esc(active?active.noAntrian:'—')+'</strong></div><div><span class="kpi-label">MENUNGGU</span><strong class="doctor-live-number small">'+waiting.length+'</strong></div><div><span class="kpi-label">ANTREAN SESI</span><strong class="doctor-live-number small">'+(mine.length?'001 → '+String(mine.length).padStart(3,'0'):'001 → —')+'</strong></div></div><div class="hint" style="margin-top:10px">Nomor antrean sekarang milik <strong>poli + tanggal</strong>. Dokter dan sesi hanya menentukan alokasi pelayanan. Contoh: Jantung <strong>JAN-001</strong> dapat dilayani dr. Rudi, lalu <strong>JAN-021</strong> oleh dr. Sany tanpa membuat nomor baru dari 001.</div></div></div>';
}

function refreshQueueControlPanel(){
  const el=document.getElementById('rj-queue-control-area'); if(!el)return;
  el.innerHTML=renderQueueControlPanel(poliState.poliId);
  bindQueueControlPanel();
}
function queueCandidates(poliId){
  const u=Session.currentUser;
  return visitsToday().filter(function(v){
    if(!(samePoli(v.poliId,poliId) && v.unit==='rawat-jalan' && v.status==='menunggu_dokter')) return false;
    if(u&&u.role==='dokter'){ const dm=Store.data.doctors.find(function(d){return d.linkedUserId===u.id;}); return v.dokterId===u.id || (dm&&v.dokterId===dm.id); }
    return true;
  }).sort(function(a,b){
    return (b.prioritas?1:0)-(a.prioritas?1:0)||(queueNumberValue(a.noAntrian)||999999)-(queueNumberValue(b.noAntrian)||999999);
  });
}
function callNextPatient(poliId){
  const u=Session.currentUser; if(!u||!['dokter','perawat','admin'].includes(u.role)){showToast('Kontrol antrean hanya dapat dilakukan oleh petugas berwenang.','danger');return;}
  const active=visitsToday().find(v=>samePoli(v.poliId,poliId)&&v.unit==='rawat-jalan'&&v.status==='diperiksa'&&(!u||u.role!=='dokter'||v.dokterId===u.id));
  if(active){showToast('Masih ada pasien yang sedang diperiksa ('+active.noAntrian+'). Selesaikan pasien tersebut terlebih dahulu.','warning');return;}
  const called=visitsToday().find(v=>samePoli(v.poliId,poliId)&&v.unit==='rawat-jalan'&&v.status==='dipanggil'&&(!u||u.role!=='dokter'||v.dokterId===u.id));
  if(called){showToast('Pasien '+called.noAntrian+' sudah dipanggil. Mulai atau tangani pasien tersebut sebelum memanggil nomor lain.','warning');return;}
  const next=queueCandidates(poliId)[0]; if(!next){showToast('Belum ada pasien yang siap dipanggil di poli ini. Selesaikan screening terlebih dahulu.','warning');return;}
  next.status='dipanggil'; next.queueCalledAt=nowISO(); next.queueCallCount=(next.queueCallCount||0)+1; next.updatedAt=nowISO();
  Store.save(); pushNotification('queue','🟢 SILAKAN MASUK',next.noAntrian+' — silakan menuju '+getPoli(next.poliId).nama,next.patientId); logAudit('panggil_berikutnya',next.noAntrian+' — '+getPatient(next.patientId).nama);
  refreshPoliQueue(); refreshQueueControlPanel(); if(window.__rjRerender)window.__rjRerender(); showToast(next.noAntrian+' dipanggil.','success');
}
function recallPatient(visitId){
  const v=getVisit(visitId); if(!v)return; if(!['dipanggil','diperiksa'].includes(v.status)){showToast('Pasien belum berstatus dipanggil.','warning');return;}
  v.status='dipanggil'; v.queueCallCount=(v.queueCallCount||0)+1; v.queueCalledAt=nowISO(); v.updatedAt=nowISO(); Store.save(); pushNotification('queue','🔔 Panggilan Ulang',v.noAntrian+' — silakan menuju '+getPoli(v.poliId).nama,v.patientId); logAudit('panggil_ulang',v.noAntrian+' — '+getPatient(v.patientId).nama); refreshPoliQueue(); refreshQueueControlPanel(); showToast('Panggilan ulang dikirim.','success');
}
function pausePatient(visitId){
  const v=getVisit(visitId); if(!v)return; v.status='menunggu_dokter'; v.queuePausedAt=nowISO(); v.updatedAt=nowISO(); Store.save(); logAudit('tunda_antrean',v.noAntrian+' — '+getPatient(v.patientId).nama); refreshPoliQueue(); refreshQueueControlPanel(); showToast(v.noAntrian+' ditunda dan kembali ke antrean.','success');
}
function renderQueueControlPanel(poliId){
  const u=Session.currentUser; if(!u||!['dokter','perawat','admin'].includes(u.role))return '';
  const user=Session.currentUser;
  const mine=function(v){return samePoli(v.poliId,poliId)&&v.unit==='rawat-jalan'&&(!user||user.role!=='dokter'||v.dokterId===user.id);};
  const active=visitsToday().filter(function(v){return mine(v)&&v.status==='diperiksa';}).sort((a,b)=>new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt))[0]||null;
  const called=visitsToday().filter(function(v){return mine(v)&&v.status==='dipanggil';}).sort((a,b)=>new Date(b.queueCalledAt||b.updatedAt||b.createdAt)-new Date(a.queueCalledAt||a.updatedAt||a.createdAt))[0]||null;
  const next=queueCandidates(poliId)[0]||null;
  const current=active||called;
  let body='<div class="queue-control-actions"><div class="ops-alert"><strong>'+(current?'Pasien aktif: '+esc(current.noAntrian):'Berikutnya: '+(next?esc(next.noAntrian):'—'))+'</strong><div>'+(current?esc(getPatient(current.patientId).nama)+(active?' · Sedang diperiksa':' · Menunggu mulai pemeriksaan'):(next?esc(getPatient(next.patientId).nama):'Belum ada pasien siap dipanggil.'))+'</div></div>';
  if(!active&&!called) body+='<button type="button" class="btn btn-primary" id="btn-queue-call-next">▶️ Panggil Berikutnya</button>';
  if(called) body+='<button type="button" class="btn btn-primary" id="btn-queue-open-called">🩺 Mulai Pemeriksaan</button><button type="button" class="btn btn-outline" id="btn-queue-recall">↩️ Panggil Ulang</button><button type="button" class="btn btn-ghost" id="btn-queue-pause">⏸️ Pasien Tidak Hadir / Tunda</button>';
  if(active) body+='<button type="button" class="btn btn-primary" id="btn-queue-finish-next">✅ Selesaikan Pemeriksaan</button>';
  return '<section class="panel queue-control-panel"><div class="panel-head"><div><div class="ops-eyebrow">ANTREAN POLI · '+esc(getPoli(poliId)?.nama||poliId)+'</div><h2>🔄 Kontrol Antrean</h2><div class="hint">Satu pasien aktif dalam satu waktu. Selesaikan pemeriksaan sebelum memanggil pasien berikutnya.</div></div><span class="badge '+(active?'badge-clinical':called?'badge-sage':'badge-slate')+'">'+(active?'Sedang Diperiksa':called?'Menunggu Mulai':'Siap')+'</span></div><div class="panel-body">'+body+'</div></section>';
}
function bindQueueControlPanel(){
  const call=document.getElementById('btn-queue-call-next'); if(call)call.addEventListener('click',()=>callNextPatient(poliState.poliId));
  const open=document.getElementById('btn-queue-open-called'); if(open){open.addEventListener('click',()=>{const u=Session.currentUser;const v=visitsToday().find(v=>samePoli(v.poliId,poliState.poliId)&&v.unit==='rawat-jalan'&&v.status==='dipanggil'&&(!u||u.role!=='dokter'||v.dokterId===u.id));if(v)bukaPeriksa(v.id);});}
  const recall=document.getElementById('btn-queue-recall'); if(recall){recall.addEventListener('click',()=>{const v=visitsToday().find(v=>samePoli(v.poliId,poliState.poliId)&&['dipanggil','diperiksa'].includes(v.status));if(v)recallPatient(v.id);});}
  const pause=document.getElementById('btn-queue-pause'); if(pause){pause.addEventListener('click',()=>{const v=visitsToday().find(v=>samePoli(v.poliId,poliState.poliId)&&['dipanggil','diperiksa'].includes(v.status));if(v)pausePatient(v.id);});}
  const finish=document.getElementById('btn-queue-finish-next'); if(finish)finish.addEventListener('click',function(){
    const active=visitsToday().find(v=>samePoli(v.poliId,poliState.poliId)&&v.status==='diperiksa'&&(!Session.currentUser||Session.currentUser.role!=='dokter'||v.dokterId===Session.currentUser.id));
    if(!active)return;
    const form=document.getElementById('form-periksa');
    if(form && poliState.activeVisitId===active.id){form.requestSubmit();return;}
    const p=getPatient(active.patientId);
    showToast('Draft pasien '+p.nama+' dipulihkan. Periksa formulir lalu selesaikan dari halaman pemeriksaan.','warning');
    poliState.activeVisitId=active.id;
    const rx=getResepByVisit(active.id);poliState.resepItems=(rx&&['draft','menunggu'].includes(rx.status))?(rx.items||[]).map(function(it){return Object.assign({},it);}):[];
    renderFormPeriksa(active);
  });
}

function openScreening(visitId){
  const actor=Session.currentUser; if(!actor||actor.role!=='perawat'){showToast('Screening hanya dapat diisi oleh akun perawat.','danger');return;}
  const v=getVisit(visitId); if(!v)return; const p=getPatient(v.patientId); if(!p)return;
  const statusSebelumScreening=v.status; const oldScr=v.screening||{}; openModal('<div class="modal-head"><h2>🩺 Screening Awal — '+esc(p.nama)+'</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div><div class="modal-body"><p class="hint">Screening dapat dikoreksi sebelum/follow-up sesuai kewenangan. Perubahan dicatat dalam riwayat.</p><div class="field-row"><div class="field"><label>Tekanan Darah</label><input id="scr-td" placeholder="120/80" value="'+esc(oldScr.td||'')+'"></div><div class="field"><label>Nadi</label><input id="scr-nadi" type="number" placeholder="80" value="'+esc(oldScr.nadi||'')+'"></div></div><div class="field-row"><div class="field"><label>Suhu °C</label><input id="scr-suhu" type="number" step="0.1" placeholder="36.7" value="'+esc(oldScr.suhu||'')+'"></div><div class="field"><label>SpO₂ %</label><input id="scr-spo2" type="number" placeholder="98" value="'+esc(oldScr.spo2||'')+'"></div></div><div class="field-row"><div class="field"><label>Berat Badan kg</label><input id="scr-bb" type="number" step="0.1" value="'+esc(oldScr.bb||'')+'"></div><div class="field"><label>Tinggi Badan cm</label><input id="scr-tb" type="number" step="0.1" value="'+esc(oldScr.tb||'')+'"></div></div><div class="field"><label>Keluhan Utama / Screening</label><textarea id="scr-keluhan">'+esc(oldScr.keluhan||v.keluhan||'')+'</textarea></div><div class="field"><label>Alergi</label><input id="scr-alergi" value="'+esc(oldScr.alergi||p.alergi||'')+'" placeholder="Tidak diketahui / sebutkan bila ada"></div><button class="btn btn-primary btn-block" id="btn-save-screening">Simpan Koreksi Screening & Kirim ke Dokter</button></div>');
  document.getElementById('btn-save-screening').addEventListener('click',function(){
    const previous=v.screening?JSON.parse(JSON.stringify(v.screening)):null;
    const revisedAt=nowISO();
    if(previous){if(!Array.isArray(v.screeningRevisions))v.screeningRevisions=[];v.screeningRevisions.push({previous:previous,changedAt:revisedAt,changedBy:Session.currentUser.id||Session.currentUser.nama});}
    v.screening={td:document.getElementById('scr-td').value.trim(),nadi:document.getElementById('scr-nadi').value,suhu:document.getElementById('scr-suhu').value,spo2:document.getElementById('scr-spo2').value,bb:document.getElementById('scr-bb').value,tb:document.getElementById('scr-tb').value,keluhan:document.getElementById('scr-keluhan').value.trim(),alergi:document.getElementById('scr-alergi').value.trim(),by:Session.currentUser.nama,at:previous?(previous.at||revisedAt):revisedAt,updatedAt:revisedAt};
    v.workflow=v.workflow||{}; if(!v.workflow.screeningAt)v.workflow.screeningAt=v.screening.at||nowISO();
    const tahapSebelumnya=statusSebelumScreening;
    const screeningBaru=['menunggu_screening','screening','menunggu_dokter','dipanggil','menunggu_poli'].includes(tahapSebelumnya);
    if(screeningBaru)v.status='menunggu_dokter'; // Koreksi setelah dokter/antarunit dimulai tidak boleh memundurkan status kunjungan.
    v.updatedAt=nowISO();
    if(v.communication===undefined)v.communication=[]; v.communication.push({type:'screening',message:screeningBaru?'Screening disimpan dan data tersedia untuk dokter.':'Koreksi data screening dicatat tanpa mengubah tahap pelayanan.',createdAt:nowISO(),by:Session.currentUser.nama});
    Store.save(); logAudit(previous?'screening_dikoreksi':'screening_selesai',v.noAntrian+' — '+getPatient(v.patientId).nama);
    if(screeningBaru)pushNotification('queue','Pasien siap diperiksa',v.noAntrian+' — screening selesai dan pasien menunggu panggilan dokter.',v.patientId);
    closeModal(); refreshPoliQueue(); refreshQueueControlPanel(); if(window.__rjRerender)window.__rjRerender(); showToast(screeningBaru?'Screening tersimpan — pasien masuk antrean dokter':'Koreksi screening tersimpan tanpa mengubah tahap kunjungan','success');
  });
}

function renderJadwalKontrolPoli(){
  const panel = document.getElementById('poli-jadwal-panel');
  if(!panel) return;
  panel.innerHTML =
    '<div class="panel-head"><h2>📅 Jadwal Kontrol Poli Ini</h2></div><div class="panel-body">'+
    '<div class="field" style="max-width:220px"><label>Tanggal</label><input type="date" id="jkp-tanggal" value="'+todayStr()+'"></div>'+
    '<div id="jkp-summary"></div></div>';
  document.getElementById('jkp-tanggal').addEventListener('change', renderJadwalKontrolSummary);
  renderJadwalKontrolSummary();
}
function renderJadwalKontrolSummary(){
  const el = document.getElementById('jkp-summary');
  if(!el) return;
  const tglInput = document.getElementById('jkp-tanggal');
  const tgl = (tglInput && tglInput.value) || todayStr();
  const list = Store.data.bookings.filter(b=>samePoli(b.poliId,poliState.poliId) && b.tanggalKontrol===tgl);
  const bpjs = list.filter(b=>b.jenisBayar==='BPJS').length;
  const umum = list.filter(b=>b.jenisBayar==='Umum').length;
  const sudahCheckin = list.filter(b=>b.status==='checked_in').length;
  el.innerHTML =
    '<div class="grid grid-3" style="margin-bottom:12px">'+
      statCard('Total Booking', list.length, formatTanggalIndo(tgl))+
      statCard('BPJS / Umum', bpjs+' / '+umum, 'per jenis penjamin')+
      statCard('Sudah Check-in', sudahCheckin, 'dari '+list.length+' booking')+
    '</div>'+
    (list.length===0 ? '<div class="empty">Belum ada booking kontrol di tanggal ini.</div>' :
    '<div class="table-wrap"><table><thead><tr><th>No. Antrian</th><th>Pasien</th><th>Jenis</th><th>Status</th></tr></thead><tbody>'+
    list.sort((a,b)=>a.noAntrian.localeCompare(b.noAntrian)).map(b=>{
      const p = getPatient(b.patientId);
      return '<tr><td class="mono" style="font-weight:700">'+b.noAntrian+'</td><td>'+esc(p.nama)+'</td><td>'+esc(b.jenisBayar)+'</td><td>'+badgeStatus(b.status)+'</td></tr>';
    }).join('')+'</tbody></table></div>');
}

const POLI_MSG_BADGE = {normal:'badge-sage', delay:'badge-amber', cancel:'badge-brick'};
const POLI_MSG_LABEL = {normal:'Normal', delay:'Tertunda', cancel:'Tidak Praktik'};
function renderInfoPraktikPoli(){
  const panel = document.getElementById('poli-info-panel');
  if(!panel) return;
  const u = Session.currentUser;
  const canPost = u.role==='dokter' || u.role==='admin';
  panel.innerHTML =
    '<div class="panel-head"><h2>💬 Info Praktik</h2></div><div class="panel-body">'+
    (canPost ?
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'+
        '<select id="ip-tipe" style="max-width:170px"><option value="normal">✅ Normal</option><option value="delay">⏱ Tertunda</option><option value="cancel">✕ Tidak Praktik</option></select>'+
        '<input type="text" id="ip-pesan" placeholder="Tulis info untuk pasien…" style="flex:1;min-width:160px">'+
        '<button class="btn btn-primary" id="btn-kirim-info">Kirim</button>'+
      '</div>' : '')+
    '<div id="ip-feed"></div></div>';
  if(canPost){
    document.getElementById('btn-kirim-info').addEventListener('click', kirimInfoPraktik);
  }
  renderInfoPraktikFeed();
}
function kirimInfoPraktik(){
  const tipe = document.getElementById('ip-tipe').value;
  const pesan = document.getElementById('ip-pesan').value.trim();
  if(!pesan){ showToast('Tulis pesan terlebih dahulu', 'danger'); return; }
  const u = Session.currentUser;
  Store.data.poliMessages.unshift({
    id: uid('MSG'), poliId: poliState.poliId, authorName: u.nama, authorRole: roleLabel(u.role),
    tipe, pesan, createdAt: nowISO()
  });
  Store.save();
  logAudit('info_praktik', esc(getPoli(poliState.poliId).nama)+': '+pesan);
  document.getElementById('ip-pesan').value = '';
  renderInfoPraktikFeed();
  showToast('Info praktik terkirim — tampil di papan Cek Antrian', 'success');
}
function renderInfoPraktikFeed(){
  const el = document.getElementById('ip-feed');
  if(!el) return;
  const list = Store.data.poliMessages.filter(m=>samePoli(m.poliId,poliState.poliId)).slice(0,10);
  if(list.length===0){ el.innerHTML = '<div class="empty">Belum ada info praktik untuk poli ini.</div>'; return; }
  el.innerHTML = list.map(m=>
    '<div class="history-item"><div class="when">'+formatTanggalWaktu(m.createdAt)+' &middot; '+esc(m.authorName)+' ('+esc(m.authorRole)+') '+
    '<span class="badge '+POLI_MSG_BADGE[m.tipe]+'" style="margin-left:6px">'+POLI_MSG_LABEL[m.tipe]+'</span></div>'+
    '<div style="margin-top:3px">'+esc(m.pesan)+'</div></div>'
  ).join('');
}
function refreshPoliQueue(){
  const poli=getPoli(poliState.poliId), u=Session.currentUser;
  const title=document.getElementById('poli-queue-title'); if(title) title.textContent='Antrian — '+poli.nama;
  let allowed;
  if(u.role==='dokter') allowed=['menunggu_dokter','dipanggil','diperiksa','menunggu_review'];
  else if(u.role==='rawat_jalan') allowed=['menunggu_screening','screening','menunggu_dokter','dipanggil','menunggu_review','menunggu_lab','menunggu_penunjang','diperiksa'];
  else allowed=['menunggu_screening','screening','menunggu_dokter','dipanggil','diperiksa','menunggu_review','menunggu_lab','menunggu_penunjang'];
  const list=visitsToday().filter(v=>samePoli(v.poliId,poliState.poliId)&&allowed.includes(v.status)).sort((a,b)=>(b.prioritas?1:0)-(a.prioritas?1:0)||new Date(a.createdAt)-new Date(b.createdAt));
  const area=document.getElementById('poli-queue-area'); if(!area)return;
  if(!list.length){area.innerHTML='<div class="empty"><div class="big">✓</div>Tidak ada pasien pada tahap yang perlu ditangani.</div>';return;}
  area.innerHTML=list.map(v=>{
    const p=getPatient(v.patientId), age=v.workflow&&v.workflow.screeningAt?Math.max(0,Math.round((Date.now()-new Date(v.workflow.screeningAt).getTime())/60000)):Math.max(0,Math.round((Date.now()-new Date(v.createdAt).getTime())/60000));
    let action='';
    if(['perawat'].includes(u.role) && ['menunggu_screening','screening'].includes(v.status)) action='<button class="btn btn-primary btn-sm" data-screening="'+v.id+'">🩺 Screening</button>';
    else if(u.role==='dokter' && ['menunggu_dokter','dipanggil','diperiksa','menunggu_review'].includes(v.status)) action='<button class="btn btn-primary btn-sm" data-openvisit="'+v.id+'">'+(v.status==='diperiksa'?'↩ Lanjutkan':'Buka Pemeriksaan')+'</button>';
    else if(u.role==='admin' && ['menunggu_screening','screening'].includes(v.status)) action='<span class="badge badge-amber">Screening hanya oleh perawat</span>';
    return '<div class="rj-queue-item '+(v.prioritas?'urgent':'')+'"><div><div class="rj-q-top"><span class="rj-q-no">'+esc(v.noAntrian)+'</span>'+badgeStatus(v.status)+'</div>'+(u.role==='dokter' && ['menunggu_dokter','dipanggil','diperiksa','menunggu_review'].includes(v.status)?'<button type="button" class="btn btn-ghost btn-sm" style="padding:0;font-weight:700" data-openvisit="'+v.id+'">'+esc(p.nama)+'</button>':'<strong>'+esc(p.nama)+'</strong>')+'<div class="hint">RM '+esc(p.id)+' · '+age+' menit dalam tahap aktif'+(v.prioritas?' · 🚩 prioritas':'')+'</div></div><div class="rj-q-actions">'+action+'<button class="btn btn-ghost btn-sm" data-history="'+v.patientId+'">Riwayat</button></div></div>';
  }).join('');
  area.querySelectorAll('[data-screening]').forEach(b=>b.addEventListener('click',()=>openScreening(b.dataset.screening)));
  area.querySelectorAll('[data-openvisit]').forEach(b=>b.addEventListener('click',()=>bukaPeriksa(b.dataset.openvisit)));
  area.querySelectorAll('[data-history]').forEach(b=>b.addEventListener('click',()=>openRiwayatModal(b.dataset.history)));
}
function toggleUrgent(visitId){
  const v = getVisit(visitId);
  if(!v) return;
  v.prioritas = !v.prioritas;
  Store.save();
  logAudit(v.prioritas?'tandai_prioritas':'batal_prioritas', v.noAntrian+' — '+esc(getPatient(v.patientId).nama));
  refreshPoliQueue();
}
function bukaPeriksa(visitId){
  poliState.activeVisitId=visitId;
  const visit=getVisit(visitId);
  if(!visit)return;
  if(Session.currentUser.role==='dokter') visit.dokterId=Session.currentUser.id;
  if(!['menunggu_dokter','dipanggil','diperiksa','menunggu_review'].includes(visit.status)){ showToast('Pasien belum siap untuk pemeriksaan. Skrining awal ditangani perawat.','warning'); return; }
  if(visit.status==='menunggu_review')visit.reviewPending=true;
  const wasAlreadyInExam=visit.status==='diperiksa';
  visit.status='diperiksa'; visit.workflow=visit.workflow||{}; if(!wasAlreadyInExam&&!visit.workflow.doctorStartAt)visit.workflow.doctorStartAt=nowISO(); visit.updatedAt=nowISO();
  Store.save(); refreshPoliQueue(); if(window.__rjRerender)window.__rjRerender(); const existingRx=getResepByVisit(visit.id); poliState.resepItems=(existingRx && ['draft','menunggu'].includes(existingRx.status)) ? (existingRx.items||[]).map(function(it){return Object.assign({},it);}) : []; renderFormPeriksa(visit);
}
function historyItemHtml(v){
  const poli = getPoli(v.poliId);
  return '<div class="history-item"><div class="when">'+formatTanggalWaktu(v.createdAt)+' &middot; '+esc(poli.nama)+'</div>'+
    '<div><strong>'+esc(v.diagnosis||'-')+'</strong></div><div style="font-size:13px;color:var(--ink-soft)">'+esc(v.catatan||'')+'</div></div>';
}
/* =================================================================
   MODUL: RAWAT JALAN — DOKTER POLI / ASISTEN
   PENCARIAN KODE: MODUL: RAWAT JALAN | SUBMODUL: PEMERIKSAAN DOKTER
   Tanggung jawab: memanggil pasien, mencatat pemeriksaan, diagnosis,
   tindakan, permintaan penunjang, dan resep. Semua perubahan harus terkait
   ke visitId yang sama; jangan membuat kunjungan baru saat menyimpan pemeriksaan.
   ================================================================= */
function renderFormPeriksa(visit){
  const patient = getPatient(visit.patientId);
  const riwayat = patientVisits(patient.id).filter(v=>v.id!==visit.id && v.status==='selesai');
  const vital = visit.vital || {};
  const screeningBlock = visit.screening ? '<div class="alert alert-info"><strong>Screening Awal</strong><br>TD '+esc(visit.screening.td||'-')+' · Nadi '+esc(visit.screening.nadi||'-')+' · Suhu '+esc(visit.screening.suhu||'-')+' °C · SpO₂ '+esc(visit.screening.spo2||'-')+'% · BB '+esc(visit.screening.bb||'-')+' kg · TB '+esc(visit.screening.tb||'-')+' cm<br><span class="hint">Dicatat oleh '+esc(visit.screening.by||'-')+' · '+formatTanggalWaktu(visit.screening.at)+'</span></div>' : '';
  const hasilLabBlock = (visit.labRequest && visit.labRequest.hasil) ?
    '<div class="alert alert-info"><div><strong>Hasil Laboratorium — '+esc(visit.labRequest.jenis)+'</strong><br>'+esc(visit.labRequest.hasil)+'</div></div>' : '';

  const nextStepValue=visit.nextStep||'selesai';

  document.getElementById('poli-exam-area').innerHTML =
    '<div class="panel"><div class="panel-head"><h2>Pemeriksaan Pasien</h2><div style="display:flex;gap:6px">'+(visit.prioritas?'<span class="badge badge-brick">🚩 Prioritas</span>':'')+badgeStatus(visit.status)+'</div></div><div class="panel-body">'+
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">'+
        '<div><strong>'+esc(patient.nama)+'</strong> · '+(patient.jenisKelamin==='L'?'Laki-laki':'Perempuan')+' · '+calcUmur(patient.tglLahir)+' tahun<br>'+
        '<span style="color:var(--ink-soft);font-size:13px">No. RM '+patient.id+' &middot; No. Antrian '+visit.noAntrian+'</span></div>'+
        '<button class="btn btn-outline btn-sm" id="btn-lihat-riwayat">📁 Riwayat Rekam Medis</button>'+
      '</div>'+
      screeningBlock+
      (patient.alergi ? '<div class="allergy-flag">⚠ Riwayat alergi: '+esc(patient.alergi)+'</div>' : '')+
      (riwayat.length ? '<details style="margin-bottom:14px"><summary style="cursor:pointer;font-size:13.5px;color:var(--clinical);font-weight:600">Lihat '+riwayat.length+' kunjungan sebelumnya dari semua poli (diagnosis &amp; obat)</summary>'+
        '<div style="margin-top:10px">'+riwayat.map(v=>historyItemHtmlFull(v)).join('')+'</div></details>' : '')+
      hasilLabBlock+
      '<form id="form-periksa">'+
      '<div class="field"><label>Pemeriksaan Dokter / Temuan Klinis</label><textarea id="px-catatan" placeholder="Catat anamnesis tambahan, pemeriksaan fisik dokter, dan temuan klinis. Data screening perawat tersedia di panel kiri.">'+esc(visit.catatan)+'</textarea></div>'+
      '<div class="field"><label>Diagnosis</label><input type="text" id="px-diagnosis" value="'+esc(visit.diagnosis)+'"></div>'+
      '<div class="field"><label>Rencana / Next Step</label><select id="px-next-step"><option value="selesai" '+(nextStepValue==='selesai'?'selected':'')+'>Selesai / Pulang</option><option value="farmasi" '+(nextStepValue==='farmasi'?'selected':'')+'>Resep → Farmasi Rawat Jalan</option><option value="kontrol" '+(nextStepValue==='kontrol'?'selected':'')+'>Jadwal Kontrol</option><option value="penunjang" '+(nextStepValue==='penunjang'?'selected':'')+'>Pemeriksaan Penunjang</option><option value="ranap" '+(nextStepValue==='ranap'?'selected':'')+'>Admisi Rawat Inap</option><option value="rujuk" '+(nextStepValue==='rujuk'?'selected':'')+'>Rujuk Keluar</option></select></div>'+
      '<div class="field checkbox-row"><input type="checkbox" id="px-rujuk-lab" '+(visit.labRequest?'checked disabled':'')+'><label for="px-rujuk-lab" style="margin:0">Permintaan Laboratorium</label></div>'+
      '<div class="field hidden" id="px-lab-jenis-wrap"><label>Jenis Pemeriksaan Laboratorium</label><input type="text" id="px-lab-jenis" placeholder="contoh: Darah Lengkap"></div>'+
      '<div class="field checkbox-row"><input type="checkbox" id="px-rujuk-rad" '+(visit.radiologyRequest?'checked disabled':'')+'><label for="px-rujuk-rad" style="margin:0">Permintaan Radiologi</label></div>'+
      '<div class="field hidden" id="px-rad-jenis-wrap"><label>Jenis Pemeriksaan Radiologi</label><input type="text" id="px-rad-jenis" placeholder="contoh: Foto Thorax"></div>'+
      '<div class="field checkbox-row"><input type="checkbox" id="px-rujuk-igd" '+((visit.referrals||[]).some(function(r){return r.destination==='igd'&&r.status!=='ditolak'&&r.status!=='dibatalkan';})?'checked disabled':'')+'><label for="px-rujuk-igd" style="margin:0">Rujukan ke IGD (berdasarkan keputusan klinis)</label></div>'+
      '<div class="field hidden" id="px-igd-alasan-wrap"><label>Alasan / ringkasan rujukan IGD</label><textarea id="px-igd-alasan" placeholder="Ringkasan klinis untuk serah terima ke IGD"></textarea></div>'+
      '<div id="px-resep-section">'+resepSectionHtml()+'</div>'+
      '<div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn btn-outline" id="btn-simpan-draft-periksa">💾 Simpan Data Pemeriksaan</button><button type="submit" class="btn btn-primary">✅ Selesaikan Pemeriksaan</button>'+
      '<button type="button" class="btn btn-outline" id="btn-rujuk-ranap">🏥 Admisi Rawat Inap</button></div>'+
      '</form>'+
    '</div></div>';

  // Susun form menjadi satu halaman pemeriksaan bertab; elemen dan ID field dipertahankan agar alur simpan lama tetap terhubung.
  (function buildExamTabs(){
    const form=document.getElementById('form-periksa'); if(!form)return;
    const parent=form.parentElement;
    const nav=document.createElement('div'); nav.className='tabs exam-tabs'; nav.setAttribute('role','tablist');
    nav.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 10px;width:100%;box-sizing:border-box;align-items:stretch';
    const names=[['dokter','Pemeriksaan'],['diagnosis','Diagnosis'],['resep','Resep'],['riwayat','Riwayat']];
    const panes={};
    const previousTab=visit.examDraft&&visit.examDraft.activeTab; const savedTab=(previousTab&&names.some(function(x){return x[0]===previousTab;}))?previousTab:(previousTab==='screening'?'dokter':'dokter');
    names.forEach(function(pair,i){
      const b=document.createElement('button'); b.type='button'; b.className='tab'+(pair[0]===savedTab?' active':''); b.dataset.examtab=pair[0]; b.textContent=pair[1]; b.setAttribute('role','tab'); b.setAttribute('aria-selected',pair[0]===savedTab?'true':'false'); nav.appendChild(b);
      const pane=document.createElement('section'); pane.dataset.exampane=pair[0]; pane.style.display=pair[0]===savedTab?'block':'none'; pane.style.padding='8px 0'; panes[pair[0]]=pane;
    });
    parent.insertBefore(nav,form);
    const draftStatus=form.querySelector('#exam-draft-status');
    if(draftStatus) form.removeChild(draftStatus);
    names.slice().reverse().forEach(function(pair){form.insertBefore(panes[pair[0]],form.firstChild);});
    const history=Array.from(parent.children).find(function(el){return el.tagName==='DETAILS';}); if(history)panes.riwayat.appendChild(history);
    const result=Array.from(parent.children).find(function(el){return el.classList&&el.classList.contains('alert')&&/Hasil Laboratorium/.test(el.textContent);}); if(result)panes.dokter.appendChild(result);
    const fieldToPane={
      'px-catatan':'dokter',
      'px-diagnosis':'diagnosis','px-next-step':'diagnosis','px-rujuk-lab':'diagnosis','px-lab-jenis':'diagnosis','px-rujuk-rad':'diagnosis','px-rad-jenis':'diagnosis','px-rujuk-igd':'diagnosis','px-igd-alasan':'diagnosis',
      'px-resep-section':'resep','btn-simpan-draft-periksa':'dokter','btn-rujuk-ranap':'diagnosis'
    };
    Array.from(form.children).forEach(function(el){
      if(el.matches('[data-exampane]'))return;
      if(el.id==='exam-draft-status')return;
      const field=el.querySelector('input,textarea,select,button');
      const id=field&&field.id; let pane=fieldToPane[id]||null;
      if(!pane && el.id==='px-resep-section')pane='resep';
      if(el.tagName==='BUTTON' || (el.querySelector && el.querySelector('#btn-simpan-draft-periksa')))pane=pane||'dokter';
      if(pane)panes[pane].appendChild(el);
    });
    // Indikator draft dan workspace dua kolom: ringkasan pasien di kiri, formulir dokter di kanan.
    const status=document.createElement('div'); status.id='exam-draft-status'; status.className='hint'; status.setAttribute('aria-live','polite'); status.style.margin='8px 0'; status.textContent='Draft otomatis aktif — perubahan disimpan setelah jeda singkat.'; nav.insertAdjacentElement('afterend',status);
    const workspace=document.createElement('div'); workspace.className='doctor-workspace';
    const sidebar=document.createElement('aside'); sidebar.className='doctor-summary'; sidebar.setAttribute('aria-label','Ringkasan pasien');
    const main=document.createElement('section'); main.className='doctor-workspace-main'; main.setAttribute('aria-label','Ruang kerja dokter');
    parent.insertBefore(workspace,parent.firstChild); workspace.appendChild(sidebar); workspace.appendChild(main);
    const initialHeader=Array.from(parent.children).find(function(el){return el!==workspace&&el.querySelector&&el.querySelector('#btn-lihat-riwayat');});
    const screeningSummary=Array.from(parent.children).find(function(el){return el!==workspace&&el.classList&&el.classList.contains('alert')&&/Screening Awal/.test(el.textContent);});
    const allergySummary=Array.from(parent.children).find(function(el){return el!==workspace&&el.classList&&el.classList.contains('allergy-flag');});
    if(initialHeader)sidebar.appendChild(initialHeader);
    if(screeningSummary){screeningSummary.innerHTML=screeningSummary.innerHTML+'<div class=\"hint\" style=\"margin-top:6px\">Ringkasan baca-saja dari screening perawat.</div>';sidebar.appendChild(screeningSummary);}
    if(allergySummary)sidebar.appendChild(allergySummary);
    const payer=document.createElement('div'); payer.className='doctor-payer-summary'; payer.innerHTML='<strong>Penjamin &amp; pembayaran</strong><div>Penjamin: '+esc(visit.jenisBayar||visit.penjamin||'-')+'</div><div>Metode pembayaran: '+esc((visit.billing&&visit.billing.metodeBayar)||'Belum dicatat')+'</div><div class=\"hint\">Informasi saja — transaksi tetap dikelola kasir.</div>'; sidebar.appendChild(payer);
    main.appendChild(nav); main.appendChild(status); main.appendChild(form);
    nav.querySelectorAll('[data-examtab]').forEach(function(btn){btn.addEventListener('click',function(){
      nav.querySelectorAll('[data-examtab]').forEach(function(b){b.classList.toggle('active',b===btn);b.setAttribute('aria-selected',b===btn?'true':'false');});
      Object.keys(panes).forEach(function(key){panes[key].style.display=key===btn.dataset.examtab?'block':'none';}); visit.examDraft=visit.examDraft||{};visit.examDraft.activeTab=btn.dataset.examtab;try{Store.save();}catch(e){}
    });});
  })();
  document.getElementById('btn-lihat-riwayat').addEventListener('click', ()=> openRiwayatModal(patient.id));
  document.getElementById('btn-rujuk-ranap').addEventListener('click', function(){ rujukRawatInap(visit.id); });
  const rujukChk = document.getElementById('px-rujuk-lab');
  const labWrap = document.getElementById('px-lab-jenis-wrap');
  const examDraft=visit.examDraft||{};
  if(rujukChk&&!rujukChk.disabled)rujukChk.checked=!!examDraft.rujukLab;
  if(document.getElementById('px-lab-jenis')&&!visit.labRequest)document.getElementById('px-lab-jenis').value=examDraft.labJenis||'';
  if(document.getElementById('px-rujuk-rad')&&!document.getElementById('px-rujuk-rad').disabled)document.getElementById('px-rujuk-rad').checked=!!examDraft.rujukRad;
  if(document.getElementById('px-rad-jenis')&&!visit.radiologyRequest)document.getElementById('px-rad-jenis').value=examDraft.radJenis||'';
  if(document.getElementById('px-rujuk-igd')&&!document.getElementById('px-rujuk-igd').disabled)document.getElementById('px-rujuk-igd').checked=!!examDraft.rujukIgd;
  if(document.getElementById('px-igd-alasan'))document.getElementById('px-igd-alasan').value=examDraft.igdAlasan||'';
  if(visit.labRequest){ labWrap.classList.remove('hidden'); document.getElementById('px-lab-jenis').value = visit.labRequest.jenis; document.getElementById('px-lab-jenis').disabled = true; }
  const radChk=document.getElementById('px-rujuk-rad'), radWrap=document.getElementById('px-rad-jenis-wrap'), igdChk=document.getElementById('px-rujuk-igd'), igdWrap=document.getElementById('px-igd-alasan-wrap');
  if(visit.radiologyRequest){radWrap.classList.remove('hidden');document.getElementById('px-rad-jenis').value=visit.radiologyRequest.jenis;document.getElementById('px-rad-jenis').disabled=true;}
  if(igdChk && igdChk.checked){igdWrap.classList.remove('hidden');}
  if(radChk)radChk.addEventListener('change',function(){radWrap.classList.toggle('hidden',!this.checked);});
  if(igdChk)igdChk.addEventListener('change',function(){igdWrap.classList.toggle('hidden',!this.checked);});
  if(rujukChk&&!rujukChk.disabled)labWrap.classList.toggle('hidden',!rujukChk.checked);
  if(radChk&&!radChk.disabled)radWrap.classList.toggle('hidden',!radChk.checked);
  if(igdChk)igdWrap.classList.toggle('hidden',!igdChk.checked);
  rujukChk.addEventListener('change', function(){
    labWrap.classList.toggle('hidden', !this.checked);
    document.getElementById('px-resep-section').classList.toggle('hidden', this.checked);
  });
  bindResepEvents();
  document.getElementById('btn-simpan-draft-periksa').addEventListener('click', function(){ simpanDraftPeriksa(visit.id); logAudit('simpan_draft_pemeriksaan',visit.noAntrian+' — '+getPatient(visit.patientId).nama); const st=document.getElementById('exam-draft-status'); if(st)st.textContent='Data pemeriksaan tersimpan · '+new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); });
  let examDraftTimer=null;
  document.getElementById('form-periksa').querySelectorAll('input,textarea,select').forEach(function(field){if(field.type==='button'||field.type==='submit')return;field.addEventListener('input',function(){clearTimeout(examDraftTimer);const status=document.getElementById('exam-draft-status');if(status)status.textContent='Perubahan belum tersimpan…';examDraftTimer=setTimeout(function(){if(poliState.activeVisitId===visit.id)simpanDraftPeriksa(visit.id);},900);});field.addEventListener('change',function(){clearTimeout(examDraftTimer);examDraftTimer=setTimeout(function(){if(poliState.activeVisitId===visit.id)simpanDraftPeriksa(visit.id);},250);});});
  document.getElementById('form-periksa').addEventListener('submit', function(e){ e.preventDefault();
    openModal('<div class="modal-head"><h2>Konfirmasi Penyelesaian</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div><div class="modal-body"><p>Apakah pemeriksaan pasien <strong>'+esc(patient.nama)+'</strong> dengan nomor <strong>'+esc(visit.noAntrian)+'</strong> sudah selesai?</p><div class="alert alert-info">Setelah dikonfirmasi, hasil pemeriksaan disimpan dan status pasien diperbarui. Pasien berikutnya dapat dipanggil setelah ini.</div><button class="btn btn-primary btn-block" id="btn-confirm-finish-next">Ya, Selesaikan Pemeriksaan</button></div>');
    document.getElementById('btn-confirm-finish-next').addEventListener('click', function(){ closeModal(); selesaiPeriksa(visit.id); });
  });
}
function resepSectionHtml(){
  return '<div class="field"><label>Resep Obat</label>'+
    '<div class="resep-row"><select id="rsp-obat">'+Store.data.medicines.map(m=>'<option value="'+m.id+'">'+esc(m.nama)+' (stok '+m.stok+')</option>').join('')+'</select>'+
    '<input type="number" id="rsp-jumlah" placeholder="Jml" min="1" value="1">'+
    '<input type="text" id="rsp-aturan" placeholder="Aturan pakai, contoh: 3x1 sesudah makan">'+
    '<button type="button" class="btn btn-outline btn-sm" id="btn-tambah-resep">+ Tambah</button></div>'+
    '<div id="resep-items-table">'+resepItemsTableHtml()+'</div></div>';
}
function resepItemsTableHtml(){
  if(poliState.resepItems.length===0) return '<div style="font-size:13px;color:var(--ink-soft)">Belum ada obat ditambahkan.</div>';
  return '<div class="table-wrap"><table><thead><tr><th>Obat</th><th>Jml</th><th>Aturan Pakai</th><th></th></tr></thead><tbody>'+
    poliState.resepItems.map((it,idx)=>'<tr><td>'+esc(it.nama)+'</td><td class="mono">'+it.jumlah+'</td><td>'+esc(it.aturanPakai)+'</td>'+
      '<td><button type="button" class="btn btn-ghost btn-sm" data-remove="'+idx+'">✕</button></td></tr>').join('')+'</tbody></table></div>';
}
function bindResepEvents(){
  const btn = document.getElementById('btn-tambah-resep');
  if(btn) btn.addEventListener('click', function(){
    const medId = document.getElementById('rsp-obat').value;
    const jumlah = parseInt(document.getElementById('rsp-jumlah').value)||0;
    const aturan = document.getElementById('rsp-aturan').value.trim();
    if(jumlah<=0 || !aturan){ showToast('Lengkapi jumlah dan aturan pakai obat', 'danger'); return; }
    const med = getMedicine(medId);
    poliState.resepItems.push({medicineId:medId, nama:med.nama, jumlah, hargaSatuan:med.harga, aturanPakai:aturan});
    document.getElementById('resep-items-table').innerHTML = resepItemsTableHtml();
    bindResepRemoveEvents();
    document.getElementById('rsp-jumlah').value=1; document.getElementById('rsp-aturan').value=''; if(poliState.activeVisitId)simpanDraftPeriksa(poliState.activeVisitId);
  });
  bindResepRemoveEvents();
}
function bindResepRemoveEvents(){
  document.querySelectorAll('[data-remove]').forEach(b=>{
    b.addEventListener('click', function(){
      poliState.resepItems.splice(parseInt(this.dataset.remove),1);
      document.getElementById('resep-items-table').innerHTML = resepItemsTableHtml();
      bindResepRemoveEvents(); if(poliState.activeVisitId)simpanDraftPeriksa(poliState.activeVisitId);
    });
  });
}
function openRiwayatModal(patientId){
  const patient = getPatient(patientId);
  const riwayat = patientVisits(patientId);
  openModal(
    '<div class="modal-head"><h2>Rekam Medis — '+esc(patient.nama)+'</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body"><p style="font-size:13px;color:var(--ink-soft)">No. RM '+patient.id+' &middot; NIK '+maskNik(patient.nik)+' &middot; '+calcUmur(patient.tglLahir)+' tahun'+(patient.alergi?' &middot; Alergi: '+esc(patient.alergi):'')+'</p>'+
    (riwayat.length===0 ? '<div class="empty">Belum ada riwayat kunjungan.</div>' : riwayat.map(v=>historyItemHtmlFull(v)).join(''))+'</div>'
  );
}
function historyItemHtmlFull(v){
  const poli = getPoli(v.poliId);
  const resep = v.resepId ? getResep(v.resepId) : null;
  const vital=Object.assign({},v.screening||{},v.vital||{});
  return '<div class="history-item"><div class="when">'+formatTanggalWaktu(v.updatedAt||v.createdAt)+' &middot; '+esc(poli.nama)+' &middot; '+badgeStatus(v.status)+'</div>'+
    '<div style="margin-top:4px"><strong>Dokter:</strong> '+esc((getUserById(v.dokterId)||{}).nama||'-')+'</div>'+
    '<div><strong>Keluhan:</strong> '+esc(v.keluhan||'-')+'</div>'+
    '<div><strong>Diagnosis:</strong> '+esc(v.diagnosis||'-')+'</div>'+
    (v.catatan ? '<div><strong>Catatan/Tindakan:</strong> '+esc(v.catatan)+'</div>' : '')+
    ((vital.td||vital.nadi||vital.suhu||vital.rr||vital.bb||vital.tb) ? '<div><strong>Tanda vital:</strong> TD '+esc(vital.td||'-')+' · Nadi '+esc(vital.nadi||'-')+' · Suhu '+esc(vital.suhu||'-')+' °C · RR '+esc(vital.rr||'-')+' · BB '+esc(vital.bb||'-')+' kg · TB '+esc(vital.tb||'-')+' cm</div>' : '')+
    (resep ? '<div><strong>Resep:</strong> '+(resep.items||[]).map(i=>esc(i.nama)+' ×'+i.jumlah+' ('+esc(i.aturanPakai||'-')+')').join(', ')+'</div>' : '')+
    ((Session.currentUser&&['dokter','admin'].includes(Session.currentUser.role)&&Array.isArray(v.examRevisions)&&v.examRevisions.length)?'<details style="margin-top:8px"><summary>Riwayat koreksi ('+v.examRevisions.length+')</summary><div class="hint">'+v.examRevisions.slice().reverse().map(function(r){const prev=r.previous||{};return '<div style="padding:6px 0;border-bottom:1px solid var(--line)"><strong>'+esc(r.stage||'perubahan draft')+'</strong><br>'+esc(r.changedBy||'-')+' · '+esc(r.changedAt?formatTanggalWaktu(r.changedAt):'-')+(prev.diagnosis?'<br>Diagnosis sebelumnya: '+esc(prev.diagnosis):'')+(r.correctedTo&&r.correctedTo.diagnosis?'<br>Diagnosis koreksi: '+esc(r.correctedTo.diagnosis):'')+'</div>';}).join('')+'</div></details>':'')+
    ((Session.currentUser&&['dokter','admin'].includes(Session.currentUser.role)&&v.status==='selesai')?'<div style="margin-top:8px"><button type="button" class="btn btn-outline btn-sm" onclick="openFinalVisitCorrection(\''+v.id+'\')">✏️ Koreksi Catatan Klinis</button></div>':'')+'</div>';
}
function openFinalVisitCorrection(visitId){
  const v=getVisit(visitId),u=Session.currentUser;if(!v||v.status!=='selesai'||!u||!['dokter','admin'].includes(u.role)){showToast('Koreksi hanya tersedia bagi dokter/admin pada kunjungan yang sudah selesai.','danger');return;}
  const vital=v.vital||{};
  openModal('<div class="modal-head"><h2>Koreksi Catatan Klinis</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div><div class="modal-body"><div class="alert alert-warning">Koreksi akan menyimpan nilai sebelumnya dalam riwayat audit. Resep yang sudah diproses tidak dapat diubah dari formulir ini.</div><div class="field"><label>Keluhan</label><textarea id="corr-keluhan">'+esc(v.keluhan||'')+'</textarea></div><div class="field-row"><div class="field"><label>Tekanan darah</label><input id="corr-td" value="'+esc(vital.td||'')+'"></div><div class="field"><label>Nadi</label><input id="corr-nadi" value="'+esc(vital.nadi||'')+'"></div></div><div class="field-row"><div class="field"><label>Suhu °C</label><input id="corr-suhu" value="'+esc(vital.suhu||'')+'"></div><div class="field"><label>Respirasi</label><input id="corr-rr" value="'+esc(vital.rr||'')+'"></div></div><div class="field-row"><div class="field"><label>Berat badan</label><input id="corr-bb" value="'+esc(vital.bb||'')+'"></div><div class="field"><label>Tinggi badan</label><input id="corr-tb" value="'+esc(vital.tb||'')+'"></div></div><div class="field"><label>Diagnosis</label><input id="corr-dx" value="'+esc(v.diagnosis||'')+'" required></div><div class="field"><label>Catatan / Tindakan</label><textarea id="corr-catatan">'+esc(v.catatan||'')+'</textarea></div><button class="btn btn-primary btn-block" id="btn-save-clinical-correction">Simpan Koreksi dengan Riwayat</button></div>');
  document.getElementById('btn-save-clinical-correction').addEventListener('click',function(){
    const dx=document.getElementById('corr-dx').value.trim();if(!dx){showToast('Diagnosis wajib diisi.','danger');return;}
    const previous={keluhan:v.keluhan||'',vital:JSON.parse(JSON.stringify(v.vital||{})),diagnosis:v.diagnosis||'',catatan:v.catatan||''};
    const next={keluhan:document.getElementById('corr-keluhan').value.trim(),vital:{td:document.getElementById('corr-td').value.trim(),nadi:document.getElementById('corr-nadi').value.trim(),suhu:document.getElementById('corr-suhu').value.trim(),rr:document.getElementById('corr-rr').value.trim(),bb:document.getElementById('corr-bb').value.trim(),tb:document.getElementById('corr-tb').value.trim()},diagnosis:dx,catatan:document.getElementById('corr-catatan').value.trim()};
    if(!Array.isArray(v.examRevisions))v.examRevisions=[];v.examRevisions.push({previous:previous,correctedTo:JSON.parse(JSON.stringify(next)),changedAt:nowISO(),changedBy:u.id||u.nama,stage:'koreksi-final'});
    v.keluhan=next.keluhan;v.vital=next.vital;v.diagnosis=next.diagnosis;v.catatan=next.catatan;v.lastClinicalCorrectionAt=nowISO();v.lastClinicalCorrectionBy=u.id||u.nama;v.updatedAt=nowISO();
    try{Store.save();logAudit('koreksi_catatan_klinis',v.noAntrian+' · '+getPatient(v.patientId).nama);closeModal();showToast('Koreksi tersimpan dan riwayat sebelumnya dipertahankan.','success');if(window.__rjRerender)window.__rjRerender();}catch(e){showToast('Gagal menyimpan koreksi. Data belum dapat dipastikan tersimpan.','danger');}
  });
}
function simpanDraftPeriksa(visitId){
  const visit=getVisit(visitId); if(!visit)return;
  const kel=document.getElementById('px-keluhan'), td=document.getElementById('px-td'), nadi=document.getElementById('px-nadi'), suhu=document.getElementById('px-suhu'), rr=document.getElementById('px-rr'), bb=document.getElementById('px-bb'), tb=document.getElementById('px-tb'), dx=document.getElementById('px-diagnosis'), cat=document.getElementById('px-catatan'), next=document.getElementById('px-next-step');
  const before={keluhan:visit.keluhan||'',vital:JSON.parse(JSON.stringify(visit.vital||{})),diagnosis:visit.diagnosis||'',catatan:visit.catatan||'',nextStep:visit.nextStep||'selesai'};
  if(kel)visit.keluhan=kel.value.trim();
  if(td||nadi||suhu||rr||bb||tb)visit.vital={td:td?td.value.trim():'',nadi:nadi?nadi.value:'',suhu:suhu?suhu.value:'',rr:rr?rr.value:'',bb:bb?bb.value:'',tb:tb?tb.value:''};
  visit.diagnosis=dx?dx.value.trim():visit.diagnosis;
  visit.catatan=cat?cat.value.trim():visit.catatan;
  visit.nextStep=next?next.value:visit.nextStep;
  if(JSON.stringify(before)!==JSON.stringify({keluhan:visit.keluhan,vital:visit.vital,diagnosis:visit.diagnosis,catatan:visit.catatan,nextStep:visit.nextStep})){
    if(!Array.isArray(visit.examRevisions))visit.examRevisions=[];
    visit.examRevisions.push({previous:before,changedAt:nowISO(),changedBy:Session.currentUser?(Session.currentUser.id||Session.currentUser.nama):null,stage:'draft'});
  }
  visit.examDraft=visit.examDraft||{};
  visit.examDraft.activeTab=(document.querySelector('.exam-tabs [data-examtab].active')||{}).dataset?.examtab||visit.examDraft.activeTab||'dokter';
  visit.examDraft.rujukLab=!!(document.getElementById('px-rujuk-lab')&&document.getElementById('px-rujuk-lab').checked);
  visit.examDraft.labJenis=(document.getElementById('px-lab-jenis')||{}).value||'';
  visit.examDraft.rujukRad=!!(document.getElementById('px-rujuk-rad')&&document.getElementById('px-rujuk-rad').checked);
  visit.examDraft.radJenis=(document.getElementById('px-rad-jenis')||{}).value||'';
  visit.examDraft.rujukIgd=!!(document.getElementById('px-rujuk-igd')&&document.getElementById('px-rujuk-igd').checked);
  visit.examDraft.igdAlasan=(document.getElementById('px-igd-alasan')||{}).value||'';
  // Menyimpan resep membuat satu item antrean farmasi yang terhubung ke ID kunjungan.
  // Status pemeriksaan dokter tetap 'diperiksa' sampai tombol finalisasi dipilih.
  if(Array.isArray(poliState.resepItems) && poliState.resepItems.length){
    let rx=getResepByVisit(visit.id);
    if(rx && ['diambil','diberikan','selesai','disiapkan'].includes(rx.status)){
      // Resep yang sudah diproses tidak boleh ditimpa dari editor pemeriksaan.
    }else if(rx){
      rx.items=poliState.resepItems.map(function(it){return Object.assign({},it);});
      const firstQueue=!['menunggu'].includes(rx.status); rx.status='menunggu'; rx.updatedAt=nowISO(); visit.resepId=rx.id;
      if(firstQueue)notifyCareUnit(visit.patientId,'farmasi-rawat-jalan','Resep Rawat Jalan masuk antrean','Resep tersimpan dari '+getPoli(visit.poliId).nama+' · antrean '+visit.noAntrian);
    }else{
      rx={id:uid('RSP'),visitId:visit.id,patientId:visit.patientId,unit:'rawat-jalan',jenisLayanan:'rawat-jalan',items:poliState.resepItems.map(function(it){return Object.assign({},it);}),status:'menunggu',createdAt:nowISO(),updatedAt:nowISO(),siapAt:null,diambilAt:null};
      Store.data.prescriptions.push(rx); visit.resepId=rx.id;
      notifyCareUnit(visit.patientId,'farmasi-rawat-jalan','Resep Rawat Jalan masuk antrean','Resep tersimpan dari '+getPoli(visit.poliId).nama+' · antrean '+visit.noAntrian);
    }
    visit.billing=visit.billing||{registrasi:BIAYA_REGISTRASI,konsultasi:0,obat:0,lab:0};
    visit.billing.obat=poliState.resepItems.reduce(function(sum,it){return sum+(Number(it.jumlah)||0)*(Number(it.hargaSatuan)||0);},0);
  }else{
    const existingEmptyRx=getResepByVisit(visit.id);
    if(existingEmptyRx&&['draft','menunggu'].includes(existingEmptyRx.status)){
      existingEmptyRx.items=[];existingEmptyRx.status='dibatalkan';existingEmptyRx.updatedAt=nowISO();existingEmptyRx.cancelReason='Resep dikosongkan sebelum finalisasi oleh petugas pemeriksa';
      visit.resepId=existingEmptyRx.id;
    }
    visit.billing=visit.billing||{registrasi:BIAYA_REGISTRASI,konsultasi:0,obat:0,lab:0};visit.billing.obat=0;
  }
  // Screening dikelola akun perawat; halaman dokter hanya menampilkan ringkasan baca-saja.
  visit.examDraftSavedAt=nowISO(); visit.examDraftSavedBy=Session.currentUser?(Session.currentUser.id||Session.currentUser.nama):null;
  visit.queueReadyToAdvance=false; // Draft tersimpan bukan berarti pemeriksaan selesai.
  visit.updatedAt=nowISO();
  try{Store.save();const persisted=JSON.parse(localStorage.getItem('simrs_db_v1')||'null');const persistedVisit=persisted&&Array.isArray(persisted.visits)?persisted.visits.find(function(v){return v.id===visitId;}):null;if(!persistedVisit){throw new Error('Kunjungan tidak ditemukan setelah penyimpanan');}}catch(saveError){const failed=document.getElementById('exam-draft-status');if(failed)failed.textContent='GAGAL MENYIMPAN. Data belum terkonfirmasi tersimpan; salin catatan sebelum menutup halaman.';console.error('SIMRS draft save failed',saveError);return;}
  const draftStatus=document.getElementById('exam-draft-status');
  if(draftStatus) draftStatus.textContent='Tersimpan · '+new Date().toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  refreshPoliQueue();
}
function notifyCareUnit(patientId, unit, title, body){
  const p=getPatient(patientId); if(!p)return;
  pushNotification('info',title,body,unit,null);
  pushNotification('info',title,body,p.id,null);
}
function createCareRequest(visit, destination, kind, detail){
  if(!Array.isArray(Store.data.careRequests))Store.data.careRequests=[];
  const request={id:uid('REQ'),patientId:visit.patientId,sourceVisitId:visit.id,sourceUnit:visit.unit||'rawat-jalan',destination:destination,kind:kind,detail:detail,status:'menunggu_konfirmasi',createdAt:nowISO(),createdBy:Session.currentUser?Session.currentUser.id:null,acceptedAt:null,acceptedBy:null,completedAt:null,result:null};
  Store.data.careRequests.unshift(request);
  if(!Array.isArray(visit.careRequestIds))visit.careRequestIds=[];
  visit.careRequestIds.push(request.id);
  notifyCareUnit(visit.patientId,destination,'Permintaan pelayanan baru',detail+' · menunggu konfirmasi '+({lab:'Laboratorium',radiologi:'Radiologi',igd:'IGD',rawat_inap:'Admisi Rawat Inap'}[destination]||destination));
  return request;
}
function selesaiPeriksa(visitId){
  const visit = getVisit(visitId); if(!visit)return;
  if(visit.status!=='diperiksa'){showToast('Kunjungan tidak lagi berstatus sedang diperiksa; cegah penyelesaian ganda.','warning');return;}
  // Simpan seluruh nilai tab yang masih terbuka sebelum membaca data final agar klik cepat tidak kehilangan perubahan.
  simpanDraftPeriksa(visitId);
  const keluhanInput=document.getElementById('px-keluhan'); if(keluhanInput)visit.keluhan=keluhanInput.value.trim();
  const tdInput=document.getElementById('px-td'), nadiInput=document.getElementById('px-nadi'), suhuInput=document.getElementById('px-suhu'), rrInput=document.getElementById('px-rr'), bbInput=document.getElementById('px-bb'), tbInput=document.getElementById('px-tb');
  if(tdInput||nadiInput||suhuInput||rrInput||bbInput||tbInput)visit.vital={td:tdInput?tdInput.value.trim():'',nadi:nadiInput?nadiInput.value:'',suhu:suhuInput?suhuInput.value:'',rr:rrInput?rrInput.value:'',bb:bbInput?bbInput.value:'',tb:tbInput?tbInput.value:''};
  visit.diagnosis = document.getElementById('px-diagnosis').value.trim();
  visit.nextStep = document.getElementById('px-next-step') ? document.getElementById('px-next-step').value : visit.nextStep;
  visit.catatan = document.getElementById('px-catatan').value.trim();
  if(!visit.diagnosis){showToast('Diagnosis wajib diisi sebelum pemeriksaan dapat difinalisasi. Draft tetap tersimpan.','danger');simpanDraftPeriksa(visitId);return;}
  if(visit.examDraftSavedAt){if(!Array.isArray(visit.examRevisions))visit.examRevisions=[];visit.examRevisions.push({changedAt:nowISO(),changedBy:Session.currentUser?(Session.currentUser.id||Session.currentUser.nama):null,stage:'finalisasi',diagnosis:visit.diagnosis});}
  if(visit.reviewPending){visit.workflow=visit.workflow||{};visit.workflow.reviewAt=nowISO();visit.reviewPending=false;}
  visit.billing.konsultasi = getPoli(visit.poliId).biaya;

  const rujukLab = document.getElementById('px-rujuk-lab').checked && !visit.labRequest;
  const rujukRad = document.getElementById('px-rujuk-rad') && document.getElementById('px-rujuk-rad').checked && !visit.radiologyRequest;
  const rujukIgd = document.getElementById('px-rujuk-igd') && document.getElementById('px-rujuk-igd').checked && !(visit.referrals||[]).some(function(r){return r.destination==='igd'&&r.status!=='ditolak'&&r.status!=='dibatalkan';});
  if(rujukLab){
    const jenis=document.getElementById('px-lab-jenis').value.trim();
    if(!jenis){showToast('Isi jenis pemeriksaan laboratorium','danger');return;}
    visit.labRequest={id:uid('LAB'),jenis:jenis,status:'menunggu',hasil:null,requestedAt:nowISO(),requestedBy:Session.currentUser?Session.currentUser.id:null,unit:'rawat-jalan'};
    visit.billing.lab=BIAYA_LAB;
    createCareRequest(visit,'lab','laboratorium',jenis);
  }
  if(rujukRad){
    const jenisRad=document.getElementById('px-rad-jenis').value.trim();
    if(!jenisRad){showToast('Isi jenis pemeriksaan radiologi','danger');return;}
    visit.radiologyRequest={id:uid('RAD'),jenis:jenisRad,status:'menunggu',hasil:null,requestedAt:nowISO(),requestedBy:Session.currentUser?Session.currentUser.id:null,unit:'rawat-jalan'};
    createCareRequest(visit,'radiologi','radiologi',jenisRad);
  }
  if(rujukIgd){
    const alasan=(document.getElementById('px-igd-alasan').value||'').trim();
    if(!alasan){showToast('Isi ringkasan klinis rujukan IGD','danger');return;}
    if(!Array.isArray(visit.referrals))visit.referrals=[];
    const ref=createCareRequest(visit,'igd','rujukan_igd',alasan); visit.referrals.push(ref);
    visit.nextStep='Menunggu konfirmasi penerimaan IGD';
  }
  if(poliState.resepItems.length>0){
    let resep=visit.resepId?getResep(visit.resepId):getResepByVisit(visit.id);
    if(resep && !['draft','menunggu'].includes(resep.status)){
      showToast('Resep kunjungan ini sudah diproses farmasi. Gunakan prosedur revisi resep, bukan membuat resep baru otomatis.','danger');return;
    }
    if(resep){
      const wasDraft=resep.status==='draft'; resep.items=[...poliState.resepItems.map(function(it){return Object.assign({},it);})]; resep.status='menunggu'; resep.updatedAt=nowISO(); if(wasDraft)notifyCareUnit(visit.patientId,'farmasi-rawat-jalan','Resep Rawat Jalan masuk antrean','Resep dari '+getPoli(visit.poliId).nama+' · antrean '+visit.noAntrian);
    }else{
      resep={id:uid('RSP'),visitId:visit.id,patientId:visit.patientId,unit:'rawat-jalan',items:[...poliState.resepItems.map(function(it){return Object.assign({},it);})],status:'menunggu',jenisLayanan:'rawat-jalan',createdAt:nowISO(),updatedAt:nowISO(),siapAt:null,diambilAt:null};
      Store.data.prescriptions.push(resep); visit.resepId=resep.id;
      notifyCareUnit(visit.patientId,'farmasi-rawat-jalan','Resep Rawat Jalan masuk antrean','Resep dari '+getPoli(visit.poliId).nama+' · antrean '+visit.noAntrian);
    }
    visit.resepId=resep.id;
    visit.billing.obat=resep.items.reduce((sum,it)=>sum+it.jumlah*it.hargaSatuan,0);
  }
  if(rujukLab){visit.status='menunggu_lab';visit.nextStep='Laboratorium Rawat Jalan — menunggu konfirmasi/pemeriksaan';visit.workflow.supportingAt=nowISO();}
  else if(rujukRad){visit.status='menunggu_penunjang';visit.nextStep='Radiologi Rawat Jalan — menunggu konfirmasi/pemeriksaan';visit.workflow.supportingAt=nowISO();}
  else if(rujukIgd){visit.status='menunggu_rujukan_igd';}
  else if(poliState.resepItems.length>0){visit.status='menunggu_farmasi';visit.nextStep='Farmasi Rawat Jalan';}
  else {visit.status='menunggu_bayar';visit.nextStep='Loket/Kasir Rawat Jalan sesuai ketentuan';}
  visit.updatedAt = nowISO();
  visit.queueReadyToAdvance = false;
  visit.workflow = visit.workflow || {}; visit.workflow.completedAt = nowISO();
  Store.save();
  logAudit('selesai_periksa',visit.noAntrian+' — '+esc(getPatient(visit.patientId).nama)+' · Dx: '+esc(visit.diagnosis));
  showToast('Pemeriksaan dan instruksi antarunit tersimpan sesuai pilihan','success');
  visit.updatedAt = nowISO();
  visit.queueReadyToAdvance = false;
  visit.workflow = visit.workflow || {}; visit.workflow.completedAt = nowISO();
  Store.save();
  poliState.activeVisitId = null;
  poliState.resepItems = [];
  refreshPoliQueue(); refreshQueueControlPanel(); if(window.__rjRerender)window.__rjRerender();
  document.getElementById('poli-exam-area').innerHTML = '<div class="panel"><div class="panel-body"><div class="empty"><div class="big">🩺</div>Pemeriksaan '+esc(visit.noAntrian)+' selesai. Panggil pasien berikutnya jika siap.</div></div></div>';
  showToast('Pemeriksaan '+visit.noAntrian+' selesai. Antrean berikutnya siap dipanggil secara manual.','success');
}

