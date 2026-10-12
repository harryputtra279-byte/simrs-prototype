/* =================================================================
   MODUL 07 — RAWAT INAP, REKAM MEDIS & MASTER OPERASIONAL
   Tanggung jawab: Admisi, ruang/bed, episode Rawat Inap, rekam medis, riwayat dokter, dan master operasional.
   Kontrak integrasi: dijalankan sebagai classic script berurutan setelah modul sebelumnya;
   gunakan Store/Session/helper bersama yang sudah didefinisikan. Jangan mengubah urutan pemuatan
   tanpa audit dependensi dan uji alur lintas unit.
   PENCARIAN KODE: modules/07-inpatient-medical-records.js
   ================================================================= */

"use strict"; // Pertahankan semantik strict-mode dari app.js monolitik.
/* INDEKS BANTUAN TAHAP 7
 * Modul: RAWAT INAP & REKAM MEDIS
 * Tanggung jawab: Admisi, ruang/bed, episode rawat inap, rekam medis, riwayat dokter.
 * Fungsi yang sering menjadi titik masuk (cari nama fungsi dengan Ctrl+F):
 * - renderRanap
 * - switchRanapTab
 * - renderRanapPasienTab
 * - ranapCardHtml
 * - renderRanapHandoverTab
 * - acceptHandoverRanap
 * - renderRanapBangsalTab
 * - bukaAdmisi
 * - renderAdmisiDetail
 * - renderRanapDetailBody
 * - bindRanapDetailEvents
 * - ranapRingkasanTabHtml
 * - ranapCpptTabHtml
 * - ranapVitalTabHtml
 * - ranapOrderTabHtml
 * - computeBillingRanap
 * - ranapPulangTabHtml
 * - submitCppt
 * - hitungNEWS2
 * - bandNEWS2
 * - submitVital
 * - submitOrder
 * - selesaikanPulang
 * - cetakResumeMedis
 * - setBedReadyRanap
 * - pindahBedRanap
 * - openAdmisiBaruSheet
 * - refreshAdmissionRules
 * - submitAdmisiBaru
 * - rujukRawatInap
 * - renderRiwayatDokterInline
 * - renderRiwayatDokter
 * - clinicalSummaryHtml
 * - getClinicalScopeUser
 * - hasAccessibleActiveAdmission
 * - ... dan 15 fungsi lain pada berkas ini.
 * Integrasi: fungsi global/Store dipertahankan untuk kompatibilitas classic script.
 * Catatan: jangan memindahkan fungsi lintas modul tanpa audit pemanggil dan uji alur.
 */

/* =================================================================
   MODULE: RAWAT INAP (admisi, bangsal/bed, CPPT, vital+NEWS2, instruksi, pulang)
   ================================================================= */
let ranapTab = 'pasien';
let ranapActiveAdmission = null;
let ranapDetailTab = 'cppt';
let admisiBaruState = {patientId:null, visitId:null};

function renderRanap(){
  setPageTitle('Rawat Inap');
  ranapTab = 'pasien'; ranapActiveAdmission = null;
  document.getElementById('main-content').innerHTML =
    pageIntro('Admisi, CPPT terintegrasi lintas profesi, tanda vital dengan skor kegawatan NEWS2, instruksi dokter, hingga resume medis pemulangan.')+
    '<div class="tabs"><button class="tab active" data-rtab="pasien">Pasien Dirawat</button>'+
    '<button class="tab" data-rtab="bangsal">Bangsal &amp; Tempat Tidur</button>'+
    '<button class="tab" data-rtab="handover">Handover Shift</button></div>'+
    '<div id="ranap-tab-area"></div>';
  document.querySelectorAll('[data-rtab]').forEach(t=> t.addEventListener('click', ()=> switchRanapTab(t.dataset.rtab)));
  renderRanapPasienTab();
}
function switchRanapTab(tab){
  ranapTab = tab; ranapActiveAdmission = null;
  document.querySelectorAll('[data-rtab]').forEach(t=> t.classList.toggle('active', t.dataset.rtab===tab));
  if(tab==='pasien') renderRanapPasienTab(); else if(tab==='bangsal') renderRanapBangsalTab(); else renderRanapHandoverTab();
}
function renderRanapPasienTab(){
  /* FIX V16.0.6: defensif terhadap data admisi lama/parsial agar satu record tidak mematikan daftar episode. */
  const area = document.getElementById('ranap-tab-area');
  if(!area)return;
  const actor=Session.currentUser||{};
  const data=Store.data||{};
  const admissions=Array.isArray(data.admissions)?data.admissions:[];
  const scopeIds=actor.role==='admin'||actor.role==='admisi_ranap'||actor.role==='dokter_ranap'?null:(Array.isArray(actor.wardIds)&&actor.wardIds.length?actor.wardIds:(actor.wardId?[actor.wardId]:[]));
  const aktif = admissions.filter(a=>a&&a.status==='dirawat'&&(!scopeIds||scopeIds.includes(a.wardId))).sort((a,b)=> new Date(a.tanggalMasuk||a.createdAt||0)-new Date(b.tanggalMasuk||b.createdAt||0));
  const pendingRef=(data.careRequests||[]).filter(function(r){return r.destination==='rawat-inap'&&['menunggu_konfirmasi','sedang_diproses'].includes(r.status);});
  area.innerHTML =
    (Session.currentUser && ['admisi_ranap','admin'].includes(Session.currentUser.role) ? '<div style="margin-bottom:14px"><button class="btn btn-primary btn-sm" id="btn-admisi-baru">+ Admisi Baru</button></div>' : '')+
    (pendingRef.length?'<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>Permintaan Admisi dari Unit Lain ('+pendingRef.length+')</h2></div><div class="panel-body">'+pendingRef.map(function(r){const p=getPatient(r.patientId);return '<div class="history-item"><strong>'+esc(p?p.nama:'Pasien')+'</strong><div class="hint">'+esc(r.sourceUnit)+' · '+esc(r.detail)+'</div><button class="btn btn-primary btn-sm" data-accept-ri="'+r.id+'">Terima &amp; Proses Admisi</button></div>';}).join('')+'</div></div>':'')+
    (aktif.length===0 ? '<div class="panel"><div class="panel-body"><div class="empty"><div class="big">🏨</div>Tidak ada pasien dirawat saat ini.</div></div></div>' : aktif.map(a=>ranapCardHtml(a)).join(''));
  const btnAdm=document.getElementById('btn-admisi-baru'); if(btnAdm) btnAdm.addEventListener('click', function(){ admisiBaruState={patientId:null,visitId:null}; openAdmisiBaruSheet(); });
  area.querySelectorAll('[data-accept-ri]').forEach(function(b){b.addEventListener('click',function(){acceptInpatientReferral(this.dataset.acceptRi);});});
  /* Klik/tap dan keyboard sama-sama membuka episode; tombol detail disediakan agar target jelas di HP. */
  area.querySelectorAll('[data-buka-admisi]').forEach(el=>{
    const openEpisode=function(){const id=el.dataset.bukaAdmisi;if(id)bukaAdmisi(id);};
    el.addEventListener('click',function(event){if(event.target.closest('button,a,input,textarea,select'))return;openEpisode();});
    el.addEventListener('keydown',function(event){if(event.key==='Enter'||event.key===' '){event.preventDefault();openEpisode();}});
  });
  area.querySelectorAll('[data-open-episode-detail]').forEach(function(btn){btn.addEventListener('click',function(event){event.stopPropagation();const id=this.dataset.openEpisodeDetail;if(id)bukaAdmisi(id);});});
}
function ranapCardHtml(a){
  /* FIX V16.0.6: field opsional dinormalisasi; kartu episode tetap dapat dibuka walau data vital/ruang/bed belum lengkap. */
  a=a||{};
  const p = getPatient(a.patientId)||{id:'-',nama:'Pasien belum terhubung'};
  const ward = (Store.data.wards||[]).find(w=>w.id===a.wardId)||{nama:'Ruang belum ditetapkan',kelas:'-'}, bed = (Store.data.beds||[]).find(b=>b.id===a.bedId)||{noKamar:'-',noBed:'-'};
  const vitalLog=Array.isArray(a.vitalLog)?a.vitalLog:[];
  const lastVital = vitalLog.length?vitalLog[vitalLog.length-1]:null;
  const band = lastVital ? bandNEWS2(lastVital.news2) : null;
  const news2Badge = lastVital ? '<span class="badge '+band.cls+'">NEWS2: '+lastVital.news2+' — '+band.label+'</span>' : '<span class="badge badge-slate">Belum ada vital</span>';
  const masukMs=new Date(a.tanggalMasuk||a.createdAt||Date.now()).getTime();
  const hari = Number.isFinite(masukMs)?Math.max(1,Math.ceil((Date.now()-masukMs)/86400000)):1;
  return '<div class="panel tr-click" data-buka-admisi="'+esc(a.id||'')+'" role="button" tabindex="0" aria-label="Buka episode Rawat Inap '+esc(p.nama)+'" style="cursor:pointer"><div class="panel-body">'+
    '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<div><strong>'+esc(p.nama)+'</strong> <span class="mono" style="color:var(--ink-soft)">('+p.id+')</span><br>'+
    '<span style="font-size:13px;color:var(--ink-soft)">'+esc(ward.nama)+' · Kamar '+esc(bed.noKamar||'-')+'/'+esc(bed.noBed||'-')+' · Kelas '+esc(a.kelasPerawatan||ward.kelas||'-')+' · Hari ke-'+hari+' · DPJP: '+esc((getUserById(a.dpjpUserId)||{}).nama||'-')+'</span><br><span class="hint">Sumber: '+esc(a.sumberAdmisi||'Admisi')+' · '+esc(a.jenisBayar||'-')+'</span><div style="margin-top:10px"><button type="button" class="btn btn-outline btn-sm" data-open-episode-detail="'+esc(a.id||'')+'">Buka episode →</button></div></div>'+
    news2Badge+'</div>'+
    '<div style="margin-top:6px;font-size:13.5px">'+esc(a.diagnosisMasuk)+'</div></div></div>';
}
function renderRanapHandoverTab(){
  const area=document.getElementById('ranap-tab-area');
  const actor=Session.currentUser||{};
  const duty=getCurrentInpatientDuty(actor.wardId);
  const activeIds=actor.role==='admin'||actor.role==='admisi_ranap'?null:(Array.isArray(actor.wardIds)&&actor.wardIds.length?actor.wardIds:(actor.wardId?[actor.wardId]:[]));
  const aktif=Store.data.admissions.filter(function(a){return a.status==='dirawat'&&(!activeIds||activeIds.includes(a.wardId));});
  area.innerHTML=pageIntro('Handover membantu pergantian tanggung jawab antar shift. Catatan ini adalah simulasi portfolio; keputusan klinis tetap mengikuti tenaga kesehatan yang berwenang.')+
    '<div class="panel"><div class="panel-head"><div><h2>🔄 '+esc(duty.shift.label)+'</h2><div class="hint">'+duty.shift.jamMulai+'–'+duty.shift.jamSelesai+' · Dokter jaga: '+esc(duty.doctor?duty.doctor.nama:'-')+' · Perawat: '+esc(duty.nurse?duty.nurse.nama:'-')+'</div></div></div><div class="panel-body">'+
    (aktif.length?aktif.map(function(a){
      const p=getPatient(a.patientId), h=a.handover||{};
      return '<div class="handover-card"><div><strong>'+esc(p?p.nama:'-')+'</strong> <span class="mono">'+esc(p?p.id:'')+'</span><div class="hint">'+esc(h.terakhirDari||'Belum ada handover')+' → '+esc(h.terakhirKe||duty.shift.label)+'</div><p style="margin:7px 0">'+esc(h.catatan||'Belum ada catatan handover.')+'</p></div><button class="btn btn-primary btn-sm" data-accept-handover="'+a.id+'">✓ Terima Handover</button></div>';
    }).join(''):'<div class="empty">Tidak ada pasien aktif untuk handover.</div>')+
    '</div></div>';
  area.querySelectorAll('[data-accept-handover]').forEach(function(btn){btn.addEventListener('click',function(){acceptHandoverRanap(this.dataset.acceptHandover);});});
}
function acceptHandoverRanap(admissionId){
  if(!Session.currentUser || !['perawat_ranap','admin'].includes(Session.currentUser.role)){showToast('Handover harus dikonfirmasi oleh perawat shift.','danger');return;}
  const a=Store.data.admissions.find(function(x){return x.id===admissionId;}); if(!a)return;
  const duty=getCurrentInpatientDuty(a.wardId);
  a.handover={status:'diterima',diterimaAt:nowISO(),diterimaOleh:duty.nurse?duty.nurse.id:(Session.currentUser||{}).id,terakhirDari:a.handover&&a.handover.terakhirKe||'Shift sebelumnya',terakhirKe:duty.shift.label,catatan:(a.handover&&a.handover.catatan)||'Handover diterima dan menjadi konteks shift aktif.'};
  a.perawatJagaUserId=duty.nurse?duty.nurse.id:null; a.dokterJagaUserId=duty.doctor?duty.doctor.id:null; a.updatedAt=nowISO();
  Store.save(); logAudit('handover_diterima',getPatient(a.patientId).nama+' — '+duty.shift.label); showToast('Handover pasien diterima untuk '+duty.shift.label,'success'); renderRanapHandoverTab();
}

function renderRanapBangsalTab(){
  const area = document.getElementById('ranap-tab-area');
  const actor=Session.currentUser||{};
  const assignedIds=Array.isArray(actor.wardIds)&&actor.wardIds.length?actor.wardIds:(actor.wardId?[actor.wardId]:[]);
  const visibleWards=actor.role==='admin'||actor.role==='admisi_ranap'?Store.data.wards:Store.data.wards.filter(function(w){return assignedIds.includes(w.id);});
  area.innerHTML = visibleWards.map(function(w){
    const bedsInWard = Store.data.beds.filter(b=>b.wardId===w.id);
    const terisi = bedsInWard.filter(b=>b.status==='terisi').length;
    return '<div class="panel"><div class="panel-head"><h2>'+esc(w.nama)+'</h2><span class="badge badge-slate">'+terisi+'/'+bedsInWard.length+' terisi</span></div>'+
      '<div class="panel-body"><p class="hint" style="margin-bottom:10px">Tarif kamar: '+formatRupiah(w.tarifPerHari)+' / hari</p>'+
      '<div style="display:flex;flex-wrap:wrap;gap:8px">'+
      bedsInWard.map(function(b){
        const adm = Store.data.admissions.find(a=>a.bedId===b.id && a.status==='dirawat');
        const meta = INPATIENT_BED_STATUS[b.status] || INPATIENT_BED_STATUS.kosong;
        const title = adm ? esc(getPatient(adm.patientId).nama) : meta.label;
        return '<span class="badge '+meta.cls+'" title="'+title+'">Kamar '+esc(b.noKamar)+' · '+esc(b.bedLabel||('Bed '+b.noBed))+(adm?' · '+esc(getPatient(adm.patientId).nama.split(' ')[0]):' · '+meta.label)+'</span>';
      }).join('')+'</div></div></div>';
  }).join('');
}

function bukaAdmisi(admissionId){
  ranapActiveAdmission = admissionId;
  ranapDetailTab = 'cppt';
  renderAdmisiDetail();
}
function renderAdmisiDetail(){
  const a = Store.data.admissions.find(x=>x.id===ranapActiveAdmission);
  if(!a) return;
  const p = getPatient(a.patientId), ward = Store.data.wards.find(w=>w.id===a.wardId), bed = Store.data.beds.find(b=>b.id===a.bedId);
  const hari = Math.max(1, Math.ceil((Date.now()-new Date(a.tanggalMasuk))/86400000));
  const area = document.getElementById('ranap-tab-area');
  area.innerHTML =
    '<button class="btn btn-ghost btn-sm" id="btn-kembali-ranap" style="margin-bottom:10px">← Kembali ke daftar pasien</button>'+
    '<div class="panel"><div class="panel-body">'+
    '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px">'+
    '<div><h2>'+esc(p.nama)+'</h2><span style="font-size:13px;color:var(--ink-soft)">No. RM '+p.id+' · '+calcUmur(p.tglLahir)+' th · '+esc(ward.nama)+' Kamar '+bed.noKamar+bed.noBed+' · Hari ke-'+hari+'</span></div>'+
    '<div>'+badgeStatus(a.status)+(a.status==='dirawat'?' <button class="btn btn-outline btn-sm" id="btn-pindah-bed">Pindah Bed</button>':'')+'</div></div>'+
    (p.alergi ? '<div class="allergy-flag" style="margin-top:10px">⚠ Alergi: '+esc(p.alergi)+'</div>' : '')+
    '<p style="margin-top:8px"><strong>Diagnosis masuk:</strong> '+esc(a.diagnosisMasuk)+' &middot; <strong>DPJP:</strong> '+esc((getUserById(a.dpjpUserId)||{}).nama||'-')+' &middot; <strong>Dokter jaga:</strong> '+esc((getCurrentInpatientDuty(a.wardId).doctor||{}).nama||'-')+' &middot; '+esc(a.jenisBayar)+'</p>'+
    '<div class="alert alert-info" style="margin-top:10px"><strong>Shift saat ini:</strong> '+esc(getCurrentInpatientDuty(a.wardId).shift.label)+' ('+getCurrentInpatientDuty(a.wardId).shift.jamMulai+'–'+getCurrentInpatientDuty(a.wardId).shift.jamSelesai+') · <strong>Perawat:</strong> '+esc((getCurrentInpatientDuty(a.wardId).nurse||{}).nama||'-')+'</div>'+
    '</div></div>'+
    '<section class="panel" style="margin:12px 0"><div class="panel-head"><h2>Riwayat Klinis Terhubung</h2><span class="badge badge-slate">No. RM '+esc(p.id)+'</span></div><div class="panel-body">'+(function(){const prior=(Store.data.visits||[]).filter(function(v){return v.patientId===a.patientId&&v.id!==a.visitId;}).sort(function(x,y){return new Date(y.updatedAt||y.createdAt)-new Date(x.updatedAt||x.createdAt);});const allergy=p.alergi||p.alergiObat||'Tidak tercatat pada profil';return '<p><strong>Alergi:</strong> '+esc(Array.isArray(allergy)?allergy.join(', '):allergy)+'</p>'+(prior.length?prior.slice(0,6).map(function(v){return '<div class="history-item"><strong>'+esc(v.unit==='igd'?'IGD':((getPoli(v.poliId)||{}).nama||'Rawat Jalan'))+' · '+esc(v.status||'Tercatat')+'</strong><div class="hint">Diagnosis: '+esc(v.diagnosis||v.catatan||'Belum tercatat')+' · Tindakan: '+esc(v.tindakan||v.rencana||'—')+'</div></div>';}).join(''):'<div class="hint">Belum ada kunjungan sebelumnya yang terhubung.</div>');})()+'</div></section>'+
    '<div class="tabs"><button class="tab '+(ranapDetailTab==='ringkasan'?'active':'')+'" data-dtab="ringkasan">Ringkasan</button><button class="tab '+(ranapDetailTab==='cppt'?'active':'')+'" data-dtab="cppt">CPPT</button>'+
    '<button class="tab '+(ranapDetailTab==='vital'?'active':'')+'" data-dtab="vital">Vital &amp; NEWS2</button>'+
    '<button class="tab '+(ranapDetailTab==='order'?'active':'')+'" data-dtab="order">Instruksi</button>'+
    '<button class="tab '+(ranapDetailTab==='pulang'?'active':'')+'" data-dtab="pulang">'+(a.status==='dirawat'?'Rencana Pulang':'Resume Medis')+'</button></div>'+
    '<div id="ranap-detail-body"></div>';
  document.getElementById('btn-kembali-ranap').addEventListener('click', function(){ ranapActiveAdmission=null; renderRanapPasienTab(); });
  area.querySelectorAll('[data-dtab]').forEach(t=> t.addEventListener('click', function(){ ranapDetailTab=this.dataset.dtab; renderAdmisiDetail(); }));
  renderRanapDetailBody(a);
}
function renderRanapDetailBody(a){
  const el = document.getElementById('ranap-detail-body');
  if(!el) return;
  if(ranapDetailTab==='ringkasan') el.innerHTML = ranapRingkasanTabHtml(a);
  else if(ranapDetailTab==='cppt') el.innerHTML = ranapCpptTabHtml(a);
  else if(ranapDetailTab==='vital') el.innerHTML = ranapVitalTabHtml(a);
  else if(ranapDetailTab==='order') el.innerHTML = ranapOrderTabHtml(a);
  else el.innerHTML = ranapPulangTabHtml(a);
  bindRanapDetailEvents(a);
}
/* =================================================================
   MODUL: RAWAT INAP — PENYUSUN RESEP MULTIOBAT
   PENCARIAN KODE: MODUL: RAWAT INAP | FUNGSI: renderRanapMedicineRow
   Tujuan: satu resep dapat berisi beberapa item dari master obat; setiap item
   memiliki jumlah dan instruksi sendiri. Validasi dilakukan kembali saat simpan.
   ================================================================= */
function renderRanapMedicineRow(index){
  return '<div class="resep-row" data-ranap-med-row style="margin-bottom:8px">'+
    '<select data-ranap-med name="ranap-med-'+index+'"><option value="">Pilih obat dari master</option>'+Store.data.medicines.map(function(m){return '<option value="'+esc(m.id)+'">'+esc(m.nama)+' · stok '+m.stok+'</option>';}).join('')+'</select>'+
    '<input type="number" data-ranap-qty min="1" step="1" value="1" aria-label="Jumlah obat" placeholder="Jumlah">'+
    '<input type="text" data-ranap-rule maxlength="240" aria-label="Dosis dan aturan pakai" placeholder="Dosis/aturan pakai, mis. 3x1 sesudah makan">'+
    (index>0?'<button type="button" class="btn btn-ghost btn-sm" data-remove-ranap-med aria-label="Hapus obat">Hapus</button>':'<span></span>')+'</div>';
}
function bindRanapDetailEvents(a){
  const c = document.getElementById('btn-tambah-cppt'); if(c) c.addEventListener('click', function(){ submitCppt(a.id); });
  const v = document.getElementById('btn-tambah-vital'); if(v) v.addEventListener('click', function(){ submitVital(a.id); });
  const o = document.getElementById('btn-tambah-order'); if(o) o.addEventListener('click', function(){ submitOrder(a.id); });
  /* PENCARIAN KODE: MODUL RAWAT INAP | SIMPAN RESEP TERPISAH */
  const saveRx=document.getElementById('btn-save-ranap-rx'); if(saveRx)saveRx.addEventListener('click',function(){submitRanapPrescription(a.id);});
  const addMed=document.getElementById('btn-add-ranap-medicine');
  if(addMed)addMed.addEventListener('click',function(){const list=document.getElementById('ord-obat-list');if(!list)return;if(list.querySelectorAll('[data-ranap-med-row]').length>=20){showToast('Maksimal 20 item per resep demo.','warning');return;}list.insertAdjacentHTML('beforeend',renderRanapMedicineRow(list.querySelectorAll('[data-ranap-med-row]').length));});
  const medList=document.getElementById('ord-obat-list');if(medList)medList.querySelectorAll('[data-remove-ranap-med]').forEach(function(btn){btn.addEventListener('click',function(){const row=this.closest('[data-ranap-med-row]');if(row)row.remove();});});
  const pl = document.getElementById('btn-selesaikan-pulang'); if(pl) pl.addEventListener('click', function(){ selesaikanPulang(a.id); });
  const pb = document.getElementById('btn-pindah-bed'); if(pb) pb.addEventListener('click', function(){ pindahBedRanap(a.id); });
  const ck = document.getElementById('btn-cetak-resume'); if(ck) ck.addEventListener('click', function(){ cetakResumeMedis(a.id); });
  document.querySelectorAll('[data-admin-obat]').forEach(function(btn){btn.addEventListener('click',function(){administrasikanObatRanap(this.dataset.adminObat);});});
  const jenisSel = document.getElementById('ord-jenis');
  if(jenisSel){
    jenisSel.addEventListener('change', function(){
      /* Resep obat kini memiliki kartu dan tombol simpan sendiri; bagian ini hanya mengatur biaya tindakan. */
      const biayaWrap = document.getElementById('ord-biaya-wrap');
      if(biayaWrap) biayaWrap.classList.toggle('hidden', this.value!=='tindakan');
    });
  }
}

function ranapRingkasanTabHtml(a){
  const ward=Store.data.wards.find(w=>w.id===a.wardId), bed=Store.data.beds.find(b=>b.id===a.bedId), p=getPatient(a.patientId);
  const b=computeBillingRanap(a), last=a.vitalLog[a.vitalLog.length-1], band=last?bandNEWS2(last.news2):null;
  const pendingOrders=a.orders.filter(o=>o.status==='aktif').length;
  const pendingRx=Store.data.prescriptions.filter(r=>r.admissionId===a.id && r.status!=='diambil').length;
  return '<div class="ops-kpi-grid">'+
    '<div class="ops-kpi"><div class="kpi-label">Status</div><div class="kpi-value" style="font-size:20px">'+esc(a.status)+'</div></div>'+
    '<div class="ops-kpi"><div class="kpi-label">Hari Rawat</div><div class="kpi-value">'+b.hari+'</div></div>'+ 
    '<div class="ops-kpi"><div class="kpi-label">Instruksi Aktif</div><div class="kpi-value">'+pendingOrders+'</div></div>'+ 
    '<div class="ops-kpi"><div class="kpi-label">Resep Belum Selesai</div><div class="kpi-value">'+pendingRx+'</div></div></div>'+ 
    '<div class="panel"><div class="panel-head"><h2>Patient Journey Rawat Inap</h2><div class="hint">'+esc((a.sumberAdmisi||'Admisi'))+' → Rawat Inap</div></div><div class="panel-body"><div class="journey-steps">'+inpatientJourneyForAdmission(a).map(function(j){
      const done = (j.key==='admission') || (j.key==='bed' && !!bed) || (j.key==='perawatan' && a.status==='dirawat') || (j.key==='lab' && a.orders.some(function(o){return o.jenis==='lab'&&o.status==='selesai';})) || (j.key==='radiologi' && a.orders.some(function(o){return o.jenis==='radiologi'&&o.status==='selesai';})) || (j.key==='farmasi' && a.orders.some(function(o){return o.jenis==='obat'&&o.resepId&&getResep(o.resepId)&&getResep(o.resepId).status==='diambil';})) || (j.key==='discharge' && a.status!=='dirawat') || (j.key==='billing' && a.billing.statusBayar==='lunas') || (j.key==='selesai' && a.status!=='dirawat' && a.billing.statusBayar==='lunas');
      return '<div class="journey-step '+(done?'done':'')+'"><span>'+j.icon+'</span><strong>'+j.label+'</strong>'+(j.sub?'<small>'+esc(j.sub)+'</small>':'')+'</div>';}).join('')+'</div></div></div>'+ 
    '<div class="panel"><div class="panel-head"><h2>Informasi Admisi</h2></div><div class="panel-body"><p><strong>Pasien:</strong> '+esc(p.nama)+' · '+p.id+'</p><p><strong>Sumber:</strong> '+esc(a.sumberAdmisi||'-')+' · <strong>Kelas:</strong> '+esc(a.kelasPerawatan||ward.kelas)+' · <strong>Perawatan:</strong> '+esc(a.tingkatPerawatan||'-')+'</p><p><strong>Ruang:</strong> '+esc(ward.nama)+' · Kamar '+bed.noKamar+bed.noBed+'</p><p><strong>Diagnosis masuk:</strong> '+esc(a.diagnosisMasuk)+'</p>'+(last?'<p><strong>NEWS2 terakhir:</strong> <span class="badge '+band.cls+'">'+last.news2+' — '+band.label+'</span></p>':'<p class="hint">Belum ada tanda vital.</p>')+'</div></div>';
}

/* PENCARIAN KODE: MODUL RAWAT INAP | KARTU RESEP DI ATAS CPPT/ASESMEN */
function ranapPrescriptionComposerHtml(a){
  const canWrite=a.status==='dirawat'&&Session.currentUser&&['dokter_ranap','admin'].includes(Session.currentUser.role);
  if(!canWrite)return '';
  return '<div class="panel" style="margin-bottom:12px"><div class="panel-head"><h2>💊 Resep Obat Rawat Inap</h2><span class="badge badge-slate">Resep mandiri</span></div><div class="panel-body">'+
    '<div id="ord-obat-list">'+renderRanapMedicineRow(0)+'</div>'+ 
    '<button type="button" class="btn btn-outline btn-sm" id="btn-add-ranap-medicine">+ Tambah Obat</button>'+ 
    '<p class="hint">Pilih dari master obat. Satu resep dapat memuat hingga 20 item; isi jumlah serta dosis/aturan pakai setiap obat. Resep ini terikat ke episode Rawat Inap aktif.</p>'+ 
    '<button class="btn btn-primary btn-sm" id="btn-save-ranap-rx">Kirim Resep ke Farmasi Rawat Inap</button></div></div>';
}
function ranapCpptTabHtml(a){
  const canWrite = a.status==='dirawat' && Session.currentUser && ['dokter_ranap','perawat_ranap','admin'].includes(Session.currentUser.role);
  return ranapPrescriptionComposerHtml(a)+(canWrite ? '<div class="panel"><div class="panel-head"><h2>Tambah Catatan CPPT</h2></div><div class="panel-body">'+
    '<div class="field"><label>Subjektif (keluhan pasien)</label><textarea id="cppt-s" placeholder="Keluhan yang disampaikan pasien…"></textarea></div>'+
    '<div class="field"><label>Objektif (pemeriksaan)</label><textarea id="cppt-o" placeholder="Hasil pemeriksaan fisik/penunjang…"></textarea></div>'+
    '<div class="field"><label>Asesmen</label><textarea id="cppt-a" placeholder="Penilaian/diagnosis kerja…"></textarea></div>'+
    '<div class="field"><label>Planning</label><textarea id="cppt-p" placeholder="Rencana tindak lanjut…"></textarea></div>'+
    '<button class="btn btn-primary btn-sm" id="btn-tambah-cppt">Simpan Catatan</button></div></div>' : '')+
    '<div class="panel"><div class="panel-head"><h2>Riwayat CPPT</h2></div><div class="panel-body">'+
    (a.cppt.length===0 ? '<div class="empty">Belum ada catatan.</div>' :
    [...a.cppt].reverse().map(function(c){
      return '<div class="history-item"><div class="when">'+formatTanggalWaktu(c.waktu)+' &middot; '+esc(c.profesi)+' — '+esc(c.penulisNama)+'</div>'+
      '<div style="margin-top:4px;font-size:13.5px"><strong>S:</strong> '+esc(c.subjektif||'-')+'<br><strong>O:</strong> '+esc(c.objektif||'-')+'<br><strong>A:</strong> '+esc(c.asesmen||'-')+'<br><strong>P:</strong> '+esc(c.planning||'-')+'</div></div>';
    }).join(''))+'</div></div>';
}
function ranapVitalTabHtml(a){
  const canWrite = a.status==='dirawat' && Session.currentUser && ['dokter_ranap','perawat_ranap','admin'].includes(Session.currentUser.role);
  return (canWrite ? '<div class="panel"><div class="panel-head"><h2>Catat Tanda Vital</h2></div><div class="panel-body">'+
    '<div class="field-row3"><div class="field"><label>Respirasi (x/menit)</label><input type="number" id="vs-rr"></div>'+
    '<div class="field"><label>SpO2 (%)</label><input type="number" id="vs-spo2"></div>'+
    '<div class="field"><label>Suhu (°C)</label><input type="number" step="0.1" id="vs-suhu"></div></div>'+
    '<div class="field-row3"><div class="field"><label>Tekanan Darah Sistolik</label><input type="number" id="vs-sistolik"></div>'+
    '<div class="field"><label>Nadi (x/menit)</label><input type="number" id="vs-nadi"></div>'+
    '<div class="field"><label>Kesadaran</label><select id="vs-kesadaran"><option value="alert">Alert (sadar penuh)</option><option value="cvpu">Menurun (Confusion/Voice/Pain/Unresponsive)</option></select></div></div>'+
    '<div class="field checkbox-row"><input type="checkbox" id="vs-oksigen"><label for="vs-oksigen" style="margin:0">Menggunakan oksigen tambahan</label></div>'+
    '<button class="btn btn-primary btn-sm" id="btn-tambah-vital">Simpan &amp; Hitung NEWS2</button></div></div>' : '')+
    '<div class="panel"><div class="panel-head"><h2>Riwayat Tanda Vital &amp; Skor NEWS2</h2></div><div class="panel-body">'+
    (a.vitalLog.length===0 ? '<div class="empty">Belum ada catatan tanda vital.</div>' :
    '<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>TD/Nadi</th><th>RR/SpO2</th><th>Suhu</th><th>NEWS2</th><th>Dicatat oleh</th></tr></thead><tbody>'+
    [...a.vitalLog].reverse().map(function(v){
      const band = bandNEWS2(v.news2);
      return '<tr><td class="mono">'+formatTanggalWaktu(v.waktu)+'</td><td>'+v.sistolik+' / '+v.nadi+'</td><td>'+v.rr+' / '+v.spo2+'%</td><td>'+v.suhu+'°C</td>'+
        '<td><span class="badge '+band.cls+'">'+v.news2+' — '+band.label+'</span></td><td style="font-size:13px">'+esc(v.dicatatOleh)+'</td></tr>';
    }).join('')+'</tbody></table></div>')+'</div></div>';
}
function ranapOrderTabHtml(a){
  /* PENCARIAN KODE: MODUL RAWAT INAP | FUNGSI: ranapOrderTabHtml
     Resep obat adalah kartu mandiri, terpisah dari diagnosis/CPPT dan instruksi non-obat. */
  const canWrite = a.status==='dirawat' && Session.currentUser && ['dokter_ranap','admin'].includes(Session.currentUser.role);
  const canAdminMed = a.status==='dirawat' && Session.currentUser && ['perawat_ranap','admin'].includes(Session.currentUser.role);
  const medOrders = (Store.data.prescriptions||[]).filter(function(r){return r.admissionId===a.id;});
  const instructions=(canWrite?'<div class="panel" style="margin-top:12px"><div class="panel-head"><h2>Instruksi Klinis Non-Obat</h2></div><div class="panel-body">'+
    '<div class="field"><label>Jenis instruksi</label><select id="ord-jenis"><option value="tindakan">Tindakan</option><option value="diet">Diet</option><option value="lab">Pemeriksaan Lab</option><option value="radiologi">Pemeriksaan Radiologi</option></select></div>'+ 
    '<div class="field"><label>Detail instruksi</label><input type="text" id="ord-detail" placeholder="mis: Ganti perban, diet rendah garam"></div>'+ 
    '<div class="field" id="ord-biaya-wrap"><label>Estimasi Biaya Tindakan (Rp, opsional)</label><input type="number" id="ord-biaya" min="0" placeholder="0"></div>'+ 
    '<button class="btn btn-outline btn-sm" id="btn-tambah-order">Simpan Instruksi</button></div></div>':'');
  const history='<div class="panel" style="margin-top:12px"><div class="panel-head"><h2>Daftar Instruksi Dokter</h2></div><div class="panel-body">'+
    (a.orders.length===0?'<div class="empty">Belum ada instruksi.</div>':'<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Jenis</th><th>Detail</th><th>Dokter</th><th>Status</th></tr></thead><tbody>'+[...a.orders].reverse().map(function(o){let st;if(o.jenis==='obat'&&o.resepId){const r=getResep(o.resepId);st=r?badgeStatus(r.status==='disiapkan'?'obat_siap':'menunggu_farmasi'):badgeStatus('menunggu_farmasi');}else st=o.status==='aktif'?'<span class="badge badge-amber">Aktif</span>':'<span class="badge badge-slate">Selesai</span>';return '<tr><td class="mono">'+formatTanggalWaktu(o.waktu)+'</td><td>'+esc(o.jenis)+'</td><td>'+esc(o.detail)+(o.hasil?' · <strong>Hasil:</strong> '+esc(o.hasil):'')+(o.biaya?' · '+formatRupiah(o.biaya):'')+'</td><td>'+esc(o.dokterNama)+'</td><td>'+st+'</td></tr>';}).join('')+'</tbody></table></div>')+'</div></div>';
  const medicationStatus=medOrders.length?'<div class="panel" style="margin-top:12px"><div class="panel-head"><h2>Status Resep &amp; Pemberian Obat</h2></div><div class="panel-body">'+medOrders.map(function(r){const label=r.status==='menunggu'?'Menunggu Farmasi':r.status==='disiapkan'?(r.distribusiStatus==='diserahkan'?'Diserahkan ke Perawat':'Disiapkan Farmasi'):r.status==='dibatalkan'?'Dibatalkan':'Diberikan/Selesai';const btn=canAdminMed&&r.status==='disiapkan'&&r.distribusiStatus==='diserahkan'?'<button class="btn btn-success btn-sm" data-admin-obat="'+r.id+'">✓ Catat Diberikan</button>':'';return '<div class="history-item"><strong>'+esc((r.items||[]).map(function(it){return it.nama+' ×'+it.jumlah;}).join(', ')||'Resep tanpa item')+'</strong><div class="hint">'+esc(label)+' · '+formatTanggalWaktu(r.createdAt)+'</div><div class="hint">'+esc(r.orderedByName||'-')+'</div>'+btn+'</div>';}).join('')+'</div></div>':'';
  return instructions+history+medicationStatus;
}
/* PENCARIAN KODE: MODUL RAWAT INAP | FUNGSI: submitRanapPrescription
   Validasi role, episode aktif, master obat, jumlah, instruksi, dan duplikasi dilakukan sebelum penyimpanan. */
function submitRanapPrescription(admissionId){
  if(!Session.currentUser||!['dokter_ranap','admin'].includes(Session.currentUser.role)){showToast('Hanya dokter Rawat Inap yang dapat membuat resep.','danger');return;}
  const a=(Store.data.admissions||[]).find(function(x){return x.id===admissionId;});
  if(!a||a.status!=='dirawat'){showToast('Resep hanya dapat dibuat untuk episode Rawat Inap aktif.','danger');return;}
  const rows=Array.from(document.querySelectorAll('#ord-obat-list [data-ranap-med-row]')),items=[],seen=new Set();
  for(const row of rows){const medId=(row.querySelector('[data-ranap-med]')||{}).value||'',qty=parseInt((row.querySelector('[data-ranap-qty]')||{}).value,10)||0,rule=((row.querySelector('[data-ranap-rule]')||{}).value||'').trim();if(!medId&&!rule&&qty===1)continue;if(!medId||qty<1||!rule){showToast('Setiap item wajib memiliki obat, jumlah positif, dan dosis/aturan pakai.','danger');return;}if(seen.has(medId)){showToast('Obat duplikat ditemukan. Gabungkan jumlahnya dalam satu item.','warning');return;}seen.add(medId);const med=getMedicine(medId);if(!med){showToast('Obat tidak ditemukan pada master obat.','danger');return;}if(Number.isFinite(Number(med.stok))&&Number(med.stok)<qty){showToast('Jumlah melebihi stok master demo untuk '+med.nama+'.','warning');return;}items.push({medicineId:med.id,nama:med.nama,jumlah:qty,hargaSatuan:med.harga,aturanPakai:rule});}
  if(!items.length){showToast('Tambahkan minimal satu obat sebelum mengirim resep.','danger');return;}
  const pendingSame=(Store.data.prescriptions||[]).find(function(r){return r.admissionId===a.id&&r.status==='menunggu'&&(r.items||[]).some(function(it){return seen.has(it.medicineId);});});
  if(pendingSame){showToast('Ada obat yang sama pada resep Rawat Inap yang masih menunggu. Periksa resep sebelumnya agar tidak duplikat.','warning');return;}
  const now=nowISO(),doctor=Session.currentUser;
  const rx={id:uid('RSP'),visitId:null,admissionId:a.id,patientId:a.patientId,unit:'rawat-inap',jenisLayanan:'rawat_inap',items:items,status:'menunggu',orderStatus:'dibuat',orderedBy:doctor.id,orderedByName:doctor.nama,createdAt:now,updatedAt:now,siapAt:null,diambilAt:null};
  Store.data.prescriptions.push(rx);a.orders=Array.isArray(a.orders)?a.orders:[];a.orders.push({id:uid('ORD'),waktu:now,dokterNama:doctor.nama,jenis:'obat',detail:items.map(function(it){return it.nama+' ×'+it.jumlah+' — '+it.aturanPakai;}).join('; '),status:'aktif',resepId:rx.id});a.updatedAt=now;
  if(typeof logAudit==='function')logAudit('resep_ranap_dibuat',getPatient(a.patientId).nama+' · '+items.length+' item');if(typeof pushNotification==='function')pushNotification('info','Resep Rawat Inap baru','Resep multiobat menunggu verifikasi Farmasi Rawat Inap.',a.patientId,null);
  Store.save();showToast('Resep '+items.length+' item terkirim ke Farmasi Rawat Inap.','success');renderAdmisiDetail();
}

function computeBillingRanap(a){
  const ward = Store.data.wards.find(w=>w.id===a.wardId);
  const hari = a.billing.totalHari || Math.max(1, Math.ceil((Date.now()-new Date(a.tanggalMasuk))/86400000));
  const biayaKamar = hari*ward.tarifPerHari;
  const biayaObat = a.billing.biayaObat||0;
  const biayaTindakan = a.billing.biayaTindakan||0;
  const biayaPenunjang = a.billing.biayaPenunjang||0;
  const subtotal = biayaKamar+biayaObat+biayaTindakan+biayaPenunjang;
  let tanggungan = 0;
  if(a.jenisBayar==='BPJS') tanggungan = subtotal;
  else if(a.jenisBayar==='Asuransi') tanggungan = Math.round(subtotal*0.8);
  return {hari, biayaKamar, biayaObat, biayaTindakan, biayaPenunjang, subtotal, tanggungan, totalBayar: subtotal-tanggungan};
}
function ranapPulangTabHtml(a){
  const b = computeBillingRanap(a);
  const canDischarge = Session.currentUser && ['dokter_ranap','admin'].includes(Session.currentUser.role);
  if(a.status==='dirawat'){
    if(!canDischarge) return '<div class="panel"><div class="panel-body"><div class="alert alert-info">Rencana pulang medis hanya dapat dibuat oleh DPJP/Dokter Rawat Inap. Petugas lain dapat melihat statusnya.</div></div></div>';
    return '<div class="panel"><div class="panel-head"><h2>Rencana Pulang &amp; Resume Medis</h2></div><div class="panel-body">'+
      '<div class="alert alert-info">Estimasi tagihan sejauh ini ('+b.hari+' hari):<br>'+
      'Kamar '+formatRupiah(b.biayaKamar)+' + Obat '+formatRupiah(b.biayaObat)+' + Penunjang '+formatRupiah(b.biayaPenunjang)+' + Tindakan '+formatRupiah(b.biayaTindakan)+' = <strong>'+formatRupiah(b.subtotal)+'</strong>'+
      (a.jenisBayar!=='Umum' ? ' ('+a.jenisBayar+', akan disesuaikan saat pembayaran)' : '')+'</div>'+
      '<div class="field"><label>Diagnosis Akhir</label><input type="text" id="pl-diagnosis" value="'+esc(a.diagnosisMasuk)+'"></div>'+
      '<div class="field"><label>Ringkasan Perjalanan Penyakit</label><textarea id="pl-ringkasan" placeholder="Ringkasan kondisi selama dirawat…"></textarea></div>'+
      '<div class="field"><label>Obat Pulang</label><textarea id="pl-obat" placeholder="Daftar obat yang dibawa pulang…"></textarea></div>'+
      '<div class="field"><label>Instruksi Kontrol</label><input type="text" id="pl-kontrol" placeholder="mis: Kontrol poli umum 3 hari lagi"></div>'+
      '<div class="field"><label>Kondisi Pulang</label><select id="pl-kondisi"><option value="pulang">Pulang — membaik</option><option value="rujuk_keluar">Dirujuk ke fasilitas lain</option><option value="meninggal">Meninggal dunia</option></select></div>'+
      '<button class="btn btn-success" id="btn-selesaikan-pulang">Selesaikan &amp; Buat Resume Medis</button></div></div>';
  }
  const r = a.resumeMedis || {};
  return '<div class="panel"><div class="panel-head"><h2>Resume Medis</h2>'+badgeStatus(a.status)+'</div><div class="panel-body">'+
    '<p><strong>Diagnosis Akhir:</strong> '+esc(r.diagnosisAkhir||'-')+'</p><p><strong>Ringkasan:</strong> '+esc(r.ringkasan||'-')+'</p>'+
    '<p><strong>Obat Pulang:</strong> '+esc(r.obatPulang||'-')+'</p><p><strong>Instruksi Kontrol:</strong> '+esc(r.instruksiKontrol||'-')+'</p>'+
    '<div class="table-wrap" style="margin-top:10px"><table>'+
      '<tr><td>Biaya Kamar ('+b.hari+' hari)</td><td class="mono" style="text-align:right">'+formatRupiah(b.biayaKamar)+'</td></tr>'+
      '<tr><td>Biaya Obat</td><td class="mono" style="text-align:right">'+formatRupiah(b.biayaObat)+'</td></tr>'+
      '<tr><td>Biaya Penunjang</td><td class="mono" style="text-align:right">'+formatRupiah(b.biayaPenunjang)+'</td></tr>'+
      '<tr><td>Biaya Tindakan</td><td class="mono" style="text-align:right">'+formatRupiah(b.biayaTindakan)+'</td></tr>'+
      '<tr><td><strong>Total Tagihan</strong></td><td class="mono" style="text-align:right"><strong>'+formatRupiah(b.totalBayar)+'</strong></td></tr>'+
    '</table></div>'+
    '<div style="margin-top:10px">'+(a.billing.statusBayar==='lunas' ? '<span class="badge badge-sage">✓ Sudah Dibayar (Kasir)</span>' : '<span class="badge badge-amber">Menunggu Pembayaran di Kasir</span>')+'</div>'+
    '<button class="btn btn-outline btn-sm" style="margin-top:10px" id="btn-cetak-resume">🖶 Cetak Resume Medis</button></div></div>';
}

function submitCppt(admissionId){
  if(!Session.currentUser || !['dokter_ranap','perawat_ranap','admin'].includes(Session.currentUser.role)){showToast('Role ini tidak dapat menulis CPPT Rawat Inap.','danger');return;}
  const a = Store.data.admissions.find(x=>x.id===admissionId);
  const u = Session.currentUser;
  const s = document.getElementById('cppt-s').value.trim(), o = document.getElementById('cppt-o').value.trim();
  const asm = document.getElementById('cppt-a').value.trim(), pl = document.getElementById('cppt-p').value.trim();
  if(!s && !o && !asm && !pl){ showToast('Isi minimal salah satu bagian SOAP', 'danger'); return; }
  a.cppt.push({id:uid('CPPT'), waktu:nowISO(), profesi:roleLabel(u.role), penulisNama:u.nama, subjektif:s, objektif:o, asesmen:asm, planning:pl});
  a.updatedAt = nowISO();
  Store.save();
  logAudit('cppt', esc(getPatient(a.patientId).nama)+' — catatan baru oleh '+u.nama);
  showToast('Catatan CPPT tersimpan', 'success');
  renderRanapDetailBody(a);
}
function hitungNEWS2(v){
  if([v.rr,v.spo2,v.suhu,v.sistolik,v.nadi].some(function(x){ return isNaN(x); })) return null;
  let score = 0;
  if(v.rr<=8) score+=3; else if(v.rr<=11) score+=1; else if(v.rr<=20) score+=0; else if(v.rr<=24) score+=2; else score+=3;
  if(v.spo2<=91) score+=3; else if(v.spo2<=93) score+=2; else if(v.spo2<=95) score+=1; else score+=0;
  if(v.oksigen) score+=2;
  if(v.sistolik<=90) score+=3; else if(v.sistolik<=100) score+=2; else if(v.sistolik<=110) score+=1; else if(v.sistolik<=219) score+=0; else score+=3;
  if(v.nadi<=40) score+=3; else if(v.nadi<=50) score+=1; else if(v.nadi<=90) score+=0; else if(v.nadi<=110) score+=1; else if(v.nadi<=130) score+=2; else score+=3;
  if(v.kesadaran==='cvpu') score+=3;
  if(v.suhu<=35.0) score+=3; else if(v.suhu<=36.0) score+=1; else if(v.suhu<=38.0) score+=0; else if(v.suhu<=39.0) score+=1; else score+=2;
  return score;
}
function bandNEWS2(score){
  if(score>=7) return {label:'Risiko Tinggi', cls:'badge-brick'};
  if(score>=5) return {label:'Risiko Sedang', cls:'badge-amber'};
  return {label:'Risiko Rendah', cls:'badge-sage'};
}
function submitVital(admissionId){
  if(!Session.currentUser || !['dokter_ranap','perawat_ranap','admin'].includes(Session.currentUser.role)){showToast('Role ini tidak dapat mencatat tanda vital.','danger');return;}
  const a = Store.data.admissions.find(x=>x.id===admissionId);
  const u = Session.currentUser;
  const v = {
    rr: parseFloat(document.getElementById('vs-rr').value), spo2: parseFloat(document.getElementById('vs-spo2').value),
    suhu: parseFloat(document.getElementById('vs-suhu').value), sistolik: parseFloat(document.getElementById('vs-sistolik').value),
    nadi: parseFloat(document.getElementById('vs-nadi').value), kesadaran: document.getElementById('vs-kesadaran').value,
    oksigen: document.getElementById('vs-oksigen').checked
  };
  const score = hitungNEWS2(v);
  if(score===null){ showToast('Lengkapi semua nilai tanda vital (angka)', 'danger'); return; }
  a.vitalLog.push({id:uid('VS'), waktu:nowISO(), dicatatOleh:u.nama, rr:v.rr, spo2:v.spo2, sistolik:v.sistolik, nadi:v.nadi, suhu:v.suhu, kesadaran:v.kesadaran, oksigen:v.oksigen, news2:score});
  a.updatedAt = nowISO();
  Store.save();
  const band = bandNEWS2(score);
  logAudit('vital_ranap', esc(getPatient(a.patientId).nama)+' — NEWS2: '+score+' ('+band.label+')');
  showToast('Tanda vital tersimpan — NEWS2: '+score+' ('+band.label+')', score>=7?'danger':(score>=5?'warning':'success'));
  renderRanapDetailBody(a);
}
function submitOrder(admissionId){
  if(!Session.currentUser || !['dokter_ranap','admin'].includes(Session.currentUser.role)){showToast('Hanya dokter rawat inap yang dapat membuat instruksi klinis.','danger');return;}
  const a = Store.data.admissions.find(x=>x.id===admissionId);
  const jenis = document.getElementById('ord-jenis').value;
  const dokterNama = Session.currentUser && Session.currentUser.role==='dokter_ranap' ? Session.currentUser.nama : (getUserById(a.dpjpUserId)||Session.currentUser).nama;
  const patNama = esc(getPatient(a.patientId).nama);

  if(jenis==='obat'){
    /* PENCARIAN KODE: MODUL: RAWAT INAP | SUBMODUL: SIMPAN RESEP MULTIOBAT */
    const rows=Array.from(document.querySelectorAll('#ord-obat-list [data-ranap-med-row]'));
    const items=[],seen=new Set();
    for(const row of rows){
      const medId=(row.querySelector('[data-ranap-med]')||{}).value||'';
      const qty=parseInt((row.querySelector('[data-ranap-qty]')||{}).value,10)||0;
      const rule=((row.querySelector('[data-ranap-rule]')||{}).value||'').trim();
      if(!medId&&!rule&&qty===1)continue;
      if(!medId||qty<=0||!rule){showToast('Setiap baris obat harus memiliki obat, jumlah positif, serta dosis/aturan pakai.','danger');return;}
      if(seen.has(medId)){showToast('Obat yang sama tercantum lebih dari sekali. Gabungkan jumlahnya pada satu baris.','warning');return;}
      seen.add(medId);const med=getMedicine(medId);if(!med){showToast('Obat tidak ditemukan pada master obat.','danger');return;}
      items.push({medicineId:med.id,nama:med.nama,jumlah:qty,hargaSatuan:med.harga,aturanPakai:rule});
    }
    if(!items.length){showToast('Tambahkan minimal satu obat dari master obat.','danger');return;}
    if(!a||a.status!=='dirawat'){showToast('Resep baru hanya dapat dibuat untuk admisi Rawat Inap yang masih aktif.','danger');return;}
    const resep={id:uid('RSP'),visitId:null,admissionId:a.id,patientId:a.patientId,unit:'rawat-inap',jenisLayanan:'rawat_inap',items:items,status:'menunggu',orderStatus:'dibuat',orderedBy:Session.currentUser.id,orderedByName:Session.currentUser.nama,createdAt:nowISO(),updatedAt:nowISO()};
    Store.data.prescriptions.push(resep);
    a.orders.push({id:uid('ORD'),waktu:nowISO(),dokterNama,jenis:'obat',detail:items.map(function(it){return it.nama+' ×'+it.jumlah+' — '+it.aturanPakai;}).join('; '),status:'aktif',resepId:resep.id});
    logAudit('instruksi_obat_ranap',patNama+' — '+items.length+' item resep ('+items.map(function(it){return it.nama+' ×'+it.jumlah;}).join(', ')+')');
    pushNotification('info','Resep Rawat Inap baru','Resep multiobat menunggu diproses Farmasi Rawat Inap.',a.patientId,null);
    showToast('Resep '+items.length+' item tersimpan dan dikirim ke Farmasi Rawat Inap.','success');
  } else {
    const detail = document.getElementById('ord-detail').value.trim();
    if(!detail){ showToast('Isi detail instruksi', 'danger'); return; }
    const biaya = jenis==='tindakan' ? (parseInt(document.getElementById('ord-biaya').value)||0) : 0;
    if(biaya>0){ a.billing.biayaTindakan = (a.billing.biayaTindakan||0) + biaya; }
    const status = (jenis==='lab'||jenis==='radiologi') ? 'menunggu' : (jenis==='tindakan'?'selesai':'aktif');
    const order={id:uid('ORD'), waktu:nowISO(), dokterNama, jenis, detail, status, biaya, hasil:null}; a.orders.push(order);
    if(jenis==='lab'||jenis==='radiologi'){
      if(!Array.isArray(Store.data.careRequests))Store.data.careRequests=[];
      const req={id:uid('REQ'),patientId:a.patientId,admissionId:a.id,orderId:order.id,sourceUnit:'rawat-inap',destination:jenis==='lab'?'lab':'radiologi',kind:jenis,detail:detail,status:'menunggu_konfirmasi',createdAt:nowISO(),createdBy:Session.currentUser?Session.currentUser.id:null,acceptedAt:null,acceptedBy:null,completedAt:null,result:null};
      Store.data.careRequests.unshift(req); pushNotification('info','Order penunjang Rawat Inap',detail+' · menunggu konfirmasi '+(jenis==='lab'?'Laboratorium':'Radiologi'),jenis==='lab'?'lab':'radiologi',null); pushNotification('info','Permintaan pemeriksaan tercatat',detail+' · mengikuti alur Rawat Inap',a.patientId,null);
    }
    logAudit('instruksi_ranap', patNama+' — '+jenis+': '+detail+(biaya?' ('+formatRupiah(biaya)+')':''));
    showToast((jenis==='lab'?'Order lab terkirim ke Laboratorium':jenis==='radiologi'?'Order radiologi terkirim ke Radiologi':'Instruksi tersimpan')+(biaya?' — biaya masuk tagihan':''), 'success');
  }
  a.updatedAt = nowISO();
  Store.save();
  renderRanapDetailBody(a);
}
function selesaikanPulang(admissionId){
  if(!Session.currentUser || !['dokter_ranap','admin'].includes(Session.currentUser.role)){showToast('Hanya dokter rawat inap yang dapat menyelesaikan pulang medis.','danger');return;}
  const a = Store.data.admissions.find(x=>x.id===admissionId);if(!a||a.status!=='dirawat'){showToast('Episode tidak aktif atau sudah dipulangkan.','warning');return;}
  if(!window.confirm('Konfirmasi penyelesaian pulang medis? Status pasien dan ketersediaan bed akan berubah.'))return;
  const diagnosisAkhir = document.getElementById('pl-diagnosis').value.trim();
  if(!diagnosisAkhir){ showToast('Isi diagnosis akhir', 'danger'); return; }
  const hari = Math.max(1, Math.ceil((Date.now()-new Date(a.tanggalMasuk))/86400000));
  a.status = document.getElementById('pl-kondisi').value;
  a.tanggalKeluar = nowISO();
  a.resumeMedis = {
    diagnosisAkhir, ringkasan: document.getElementById('pl-ringkasan').value.trim(),
    obatPulang: document.getElementById('pl-obat').value.trim(), instruksiKontrol: document.getElementById('pl-kontrol').value.trim()
  };
  a.billing.totalHari = hari;
  a.billing.statusBayar = 'belum_bayar';
  a.discharge = {status:'selesai_medis',rencanaTanggal:null,kondisi:a.status};
  const bed = Store.data.beds.find(b=>b.id===a.bedId);
  if(bed){ bed.status = 'persiapan'; bed.updatedAt=nowISO(); bed.note='Persiapan setelah pasien pulang'; }
  a.updatedAt = nowISO();
  Store.save();
  logAudit('pulang_ranap', esc(getPatient(a.patientId).nama)+' — '+a.status+', '+hari+' hari rawat, tagihan '+formatRupiah(computeBillingRanap(a).totalBayar));
  showToast('Pasien telah diselesaikan perawatannya — tagihan menunggu di Kasir', 'success');
  renderAdmisiDetail();
}
function cetakResumeMedis(admissionId){
  const a = Store.data.admissions.find(x=>x.id===admissionId);
  const p = getPatient(a.patientId), ward = Store.data.wards.find(w=>w.id===a.wardId), r = a.resumeMedis||{}, b = computeBillingRanap(a);
  printArea('<div style="font-family:monospace;max-width:420px;margin:0 auto"><h2 style="text-align:center">SIMRS PROTOTYPE</h2><p style="text-align:center">Resume Medis Rawat Inap</p><hr>'+
    '<p>Nama: '+esc(p.nama)+'<br>No. RM: '+p.id+'<br>Ruang: '+esc(ward.nama)+'<br>Masuk: '+formatTanggalIndo(a.tanggalMasuk)+'<br>Keluar: '+formatTanggalIndo(a.tanggalKeluar)+' ('+b.hari+' hari)</p><hr>'+
    '<p><strong>Diagnosis Masuk:</strong> '+esc(a.diagnosisMasuk)+'<br><strong>Diagnosis Akhir:</strong> '+esc(r.diagnosisAkhir)+'</p>'+
    '<p><strong>Ringkasan:</strong> '+esc(r.ringkasan)+'</p><p><strong>Obat Pulang:</strong> '+esc(r.obatPulang)+'</p><p><strong>Kontrol:</strong> '+esc(r.instruksiKontrol)+'</p><hr>'+
    '<p>Kamar: '+formatRupiah(b.biayaKamar)+'<br>Obat: '+formatRupiah(b.biayaObat)+'<br>Penunjang: '+formatRupiah(b.biayaPenunjang)+'<br>Tindakan: '+formatRupiah(b.biayaTindakan)+'<br><strong>Total: '+formatRupiah(b.totalBayar)+'</strong></p></div>');
}

function setBedReadyRanap(bedId){
  const b=Store.data.beds.find(function(x){return x.id===bedId;}); if(!b)return;
  if(b.status!=='persiapan'){showToast('Bed ini tidak sedang dalam status persiapan','warning');return;}
  b.status='kosong'; b.updatedAt=nowISO(); b.note='Siap ditempati'; Store.save(); logAudit('bed_ready',b.id+' — bed siap ditempati'); showToast('Bed sekarang siap ditempati','success'); renderRanapBangsalTab();
}

function pindahBedRanap(admissionId){
  if(!Session.currentUser || !['admisi_ranap','perawat_ranap','admin'].includes(Session.currentUser.role)){showToast('Pemindahan bed hanya dapat dilakukan oleh Admisi/Perawat Rawat Inap.','danger');return;}
  const a=Store.data.admissions.find(x=>x.id===admissionId); if(!a||a.status!=='dirawat') return;
  const current=Store.data.beds.find(b=>b.id===a.bedId);
  const available=Store.data.beds.filter(b=>b.status==='kosong' && b.id!==a.bedId);
  if(!available.length){showToast('Tidak ada bed kosong untuk pemindahan','warning');return;}
  openModal('<div class="modal-head"><h2>Pindah Kamar / Bed</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div><div class="modal-body">'+
    '<p class="hint">Bed saat ini: '+esc(current?current.noKamar+current.noBed:'-')+'</p><div class="field"><label>Bed tujuan</label><select id="transfer-bed">'+available.map(function(b){const w=Store.data.wards.find(x=>x.id===b.wardId);return '<option value="'+b.id+'">'+esc(w.nama)+' · Kamar '+b.noKamar+b.noBed+' · Kelas '+esc(w.kelas)+'</option>';}).join('')+'</select></div><button class="btn btn-primary btn-block" id="btn-transfer-bed">Konfirmasi Pemindahan</button></div>');
  document.getElementById('btn-transfer-bed').addEventListener('click',function(){const target=Store.data.beds.find(b=>b.id===document.getElementById('transfer-bed').value);if(!target)return; if(current)current.status='kosong';target.status='terisi';a.bedId=target.id;a.wardId=target.wardId;a.updatedAt=nowISO();a.cppt.push({id:uid('CPPT'),waktu:nowISO(),profesi:roleLabel(Session.currentUser.role),penulisNama:Session.currentUser.nama,subjektif:'-',objektif:'-',asesmen:'Transfer kamar/bed',planning:'Pasien dipindahkan ke '+target.noKamar+target.noBed});Store.save();logAudit('transfer_bed',getPatient(a.patientId).nama+' → '+target.noKamar+target.noBed);closeModal();showToast('Pasien berhasil dipindahkan','success');renderAdmisiDetail();});
}

function openAdmisiBaruSheet(){
  const bedKosong = Store.data.beds.filter(b=>b.status==='kosong');
  // ADMISI: DPJP harus berasal dari kelompok dokter Rawat Inap, bukan dokter poli Rawat Jalan.
  const dokterList = Store.data.users.filter(u=>u.role==='dokter_ranap');
  // Jika daftar dokter kosong, UI tetap akan memperlihatkan masalah master akun secara eksplisit melalui pilihan kosong.
  openModal(
    '<div class="modal-head"><h2>Admisi Rawat Inap Baru</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body">'+
    (admisiBaruState.patientId ? '<p class="hint">Pasien: <strong>'+esc(getPatient(admisiBaruState.patientId).nama)+'</strong></p>' :
      '<div class="field"><label>Cari Pasien</label><div class="search-row"><input type="text" id="ab-cari" placeholder="NIK/No. RM/Nama…"><button type="button" class="btn btn-outline" id="ab-btn-cari">Cari</button></div><div id="ab-hasil"></div><div id="ab-terpilih" class="hint"></div></div>')+
    '<div class="field-row"><div class="field"><label>Kelas BPJS</label><select id="ab-kelas"><option value="3">Kelas III</option><option value="2">Kelas II</option><option value="1">Kelas I</option></select></div><div class="field"><label>Gedung</label><select id="ab-gedung"><option value="">Pilih gedung</option></select></div></div><div class="field-row"><div class="field"><label>Lantai</label><select id="ab-lantai"><option value="">Pilih lantai</option></select></div><div class="field"><label>Ruang</label><select id="ab-ruang"><option value="">Pilih ruang</option></select></div></div><div class="field"><label>Bed tersedia</label><select id="ab-bed"><option value="">Pilih gedung, lantai, dan ruang terlebih dahulu</option></select><div id="ab-bed-hint" class="hint" style="margin-top:5px">Pilih lokasi secara bertahap: gedung → lantai → ruang → bed.</div></div>'+
    '<div class="field-row"><div class="field"><label>Sumber Admisi</label><select id="ab-sumber"><option>IGD</option><option>Rawat Jalan</option><option>Rujukan</option><option>Transfer Internal</option></select><div id="ab-sumber-hint" class="hint" style="margin-top:5px">IGD dapat langsung menjadi sumber admisi bila dokter memutuskan rawat inap.</div></div><div class="field"><label>Tingkat Perawatan</label><select id="ab-tingkat"><option>Bangsal</option><option>Intensif</option><option>Bersalin</option></select></div></div>'+
    '<div class="field"><label>DPJP (Dokter Penanggung Jawab)</label><select id="ab-dpjp">'+dokterList.map(function(d){ return '<option value="'+d.id+'">'+esc(d.nama)+'</option>'; }).join('')+'</select></div>'+
    '<div class="field-row"><div class="field"><label>Jenis Pembayaran / Penjamin</label><select id="ab-bayar"><option value="Umum">Umum</option><option value="BPJS">BPJS</option><option value="Asuransi">Asuransi</option><option value="KSO">KSO</option></select></div>'+
    '<div class="field"><label>No. Kartu / Dokumen Penjamin</label><input type="text" id="ab-nokartu" placeholder="BPJS: nomor kartu / rujukan / SEP simulasi"></div></div>'+
    '<div class="field"><label>No. Rujukan / Surat Permintaan Rawat Inap <span class="hint">(wajib untuk BPJS dari Rawat Jalan/Rujukan pada prototype)</span></label><input type="text" id="ab-rujukan" placeholder="Contoh: RJ/2026/000123"></div>'+
    '<div class="field"><label>Diagnosis Masuk</label><input type="text" id="ab-diagnosis" placeholder="mis: Observasi febris + dehidrasi ringan"></div>'+
    '<button class="btn btn-primary btn-block" id="btn-simpan-admisi" '+(bedKosong.length===0?'disabled':'')+'>Admisikan Pasien</button>'+
    '</div>'
  );
  if(!admisiBaruState.patientId){
    document.getElementById('ab-btn-cari').addEventListener('click', function(){
      const q = document.getElementById('ab-cari').value.trim(), qLower=q.toLowerCase();
      const el = document.getElementById('ab-hasil');
      if(!q){ el.innerHTML=''; return; }
      const results = Store.data.patients.filter(function(p){ return p.nik.includes(q) || p.id.toLowerCase().includes(qLower) || p.nama.toLowerCase().includes(qLower); });
      el.innerHTML = results.length===0 ? '<div class="hint">Tidak ditemukan.</div>' :
        '<div class="chip-row" style="margin-top:6px">'+results.map(function(p){ return '<button type="button" class="chip" data-pid="'+p.id+'">'+esc(p.nama)+'</button>'; }).join('')+'</div>';
      el.querySelectorAll('[data-pid]').forEach(function(b){
        b.addEventListener('click', function(){ admisiBaruState.patientId=this.dataset.pid; document.getElementById('ab-terpilih').innerHTML='Terpilih: <strong>'+esc(getPatient(admisiBaruState.patientId).nama)+'</strong>'; el.innerHTML=''; });
      });
    });
  }
  document.getElementById('btn-simpan-admisi').addEventListener('click', submitAdmisiBaru);
  const srcSel=document.getElementById('ab-sumber'), paySel=document.getElementById('ab-bayar'), bedSel=document.getElementById('ab-bed');
  const buildingSel=document.getElementById('ab-gedung'),floorSel=document.getElementById('ab-lantai'),roomSel=document.getElementById('ab-ruang');
  /* PENCARIAN KODE: MODUL RAWAT INAP | PEMILIHAN BED HIERARKIS GEDUNG-LANTAI-RUANG-BED */
  function eligibleWards(){/* PENCARIAN KODE: MASTER BED — tampilkan semua gedung; aturan penjamin/kelas divalidasi terpisah sesuai konfigurasi RS. */const wanted=document.getElementById('ab-kelas').value;return (Store.data.wards||[]).filter(function(w){if(paySel.value==='BPJS'&&['1','2','3'].includes(String(w.kelas))&&String(w.kelas)!==String(wanted))return false;return (Store.data.beds||[]).some(function(b){return b.wardId===w.id&&b.status==='kosong';});});}
  function refill(select,items,placeholder,valueFn,labelFn){const previous=select.value;select.innerHTML='<option value="">'+placeholder+'</option>'+items.map(function(x){return '<option value="'+esc(valueFn(x))+'">'+esc(labelFn(x))+'</option>';}).join('');if(items.some(function(x){return String(valueFn(x))===previous;}))select.value=previous;}
  function refreshBedHierarchy(){const wards=eligibleWards();const buildingMap=new Map();wards.forEach(function(w){buildingMap.set(w.buildingId,{id:w.buildingId,name:w.buildingName||w.buildingId});});const buildings=Array.from(buildingMap.values()).sort(function(a,b){return a.name.localeCompare(b.name);});refill(buildingSel,buildings,'Pilih gedung',function(x){return x.id;},function(x){return x.name;});
    const building=buildingSel.value;const floors=Array.from(new Map(wards.filter(function(w){return w.buildingId===building;}).map(function(w){return [String(w.floorNumber||1),{id:String(w.floorNumber||1),name:w.floorName||('Lantai '+(w.floorNumber||1))}];})).values()).sort(function(a,b){return Number(a.id)-Number(b.id);});refill(floorSel,floors,'Pilih lantai',function(x){return x.id;},function(x){return x.name;});
    const floor=floorSel.value;const rooms=wards.filter(function(w){return w.buildingId===building&&String(w.floorNumber||1)===floor;}).sort(function(a,b){return String(a.nama).localeCompare(String(b.nama));});refill(roomSel,rooms,'Pilih ruang',function(x){return x.id;},function(x){return x.nama+' · Kelas '+(x.kelas||'-');});
    const wardId=roomSel.value;const beds=(Store.data.beds||[]).filter(function(b){return b.status==='kosong'&&b.wardId===wardId;}).sort(function(a,b){return String(a.noKamar).localeCompare(String(b.noKamar),undefined,{numeric:true})||String(a.noBed).localeCompare(String(b.noBed),undefined,{numeric:true});});refill(bedSel,beds,'Pilih bed tersedia',function(x){return x.id;},function(b){const w=Store.data.wards.find(function(x){return x.id===b.wardId;});return 'Kamar '+b.noKamar+' · '+(b.bedLabel||('Bed '+b.noBed))+' · '+formatRupiah((w||{}).tarifPerHari||0)+'/hari';});
    document.getElementById('btn-simpan-admisi').disabled=!bedSel.value;document.getElementById('ab-bed-hint').textContent=beds.length?('Tersedia '+beds.length+' bed di '+(rooms.find(function(w){return w.id===wardId;})||{}).nama+'.'): 'Pilih gedung, lantai, dan ruang untuk melihat bed kosong.';
  }
  function refreshAdmissionRules(){const src=srcSel.value,pay=paySel.value,isBpjs=pay==='BPJS',directIgd=src==='IGD';document.getElementById('ab-kelas').disabled=!isBpjs;document.getElementById('ab-sumber-hint').textContent=directIgd?'IGD dapat langsung menjadi sumber admisi bila dokter memutuskan rawat inap.':'Untuk BPJS dari Rawat Jalan/Rujukan, nomor rujukan atau surat permintaan rawat inap harus dicatat.';document.getElementById('ab-rujukan').required=isBpjs&&!directIgd;refreshBedHierarchy();}
  buildingSel.addEventListener('change',function(){floorSel.value='';roomSel.value='';bedSel.value='';refreshBedHierarchy();});floorSel.addEventListener('change',function(){roomSel.value='';bedSel.value='';refreshBedHierarchy();});roomSel.addEventListener('change',function(){bedSel.value='';refreshBedHierarchy();});bedSel.addEventListener('change',function(){document.getElementById('btn-simpan-admisi').disabled=!bedSel.value;});
  srcSel.addEventListener('change',refreshAdmissionRules);paySel.addEventListener('change',refreshAdmissionRules);document.getElementById('ab-kelas').addEventListener('change',refreshAdmissionRules);refreshAdmissionRules();
}
/* MODUL: RAWAT INAP — SIMPAN ADMISI. Validasi pasien, penjamin, kelas, bed, dan duplikasi sebelum menulis data. */
function submitAdmisiBaru(){
  if(!Session.currentUser||!['admin','admisi_ranap'].includes(Session.currentUser.role)){showToast('Konfirmasi admisi hanya dapat dilakukan petugas Admisi Rawat Inap atau admin demo.','danger');return;}
  if(!admisiBaruState.patientId){ showToast('Pilih pasien terlebih dahulu', 'danger'); return; }
  if(!window.confirm('Konfirmasi admisi Rawat Inap? Pastikan identitas pasien, diagnosis, sumber rujukan, kelas, dan bed sudah benar.'))return;
  const bedId = document.getElementById('ab-bed').value;
  if(!bedId){ showToast('Tidak ada tempat tidur tersedia', 'danger'); return; }
  const diagnosisMasuk = document.getElementById('ab-diagnosis').value.trim();
  const sumberAdmisi = document.getElementById('ab-sumber').value;
  const jenisBayar = document.getElementById('ab-bayar').value;
  const noKartu = document.getElementById('ab-nokartu').value.trim();
  const noRujukan = document.getElementById('ab-rujukan').value.trim();
  if(!diagnosisMasuk){ showToast('Isi diagnosis masuk', 'danger'); return; }
  if(jenisBayar==='BPJS' && sumberAdmisi!=='IGD' && !noRujukan){ showToast('BPJS dari Rawat Jalan/Rujukan membutuhkan nomor rujukan atau surat permintaan rawat inap.', 'danger'); return; }
  const bed = Store.data.beds.find(b=>b.id===bedId);
  const ward = bed ? Store.data.wards.find(w=>w.id===bed.wardId) : null;
  if(!bed || !ward){ showToast('Bed atau ruangan tidak valid', 'danger'); return; }
  const kelasDipilih=String(document.getElementById('ab-kelas').value); if(jenisBayar==='BPJS'&&['1','2','3'].includes(String(ward.kelas))&&String(ward.kelas)!==kelasDipilih){showToast('Kelas bed tidak sesuai kelas perawatan yang dipilih.','danger');return;} /* Penjamin tidak dikunci ke gedung secara global; ikuti master kebijakan RS. */ if(bed.status!=='kosong'){showToast('Bed sudah tidak tersedia. Pilih bed kosong lain.','danger');return;} if(Store.data.admissions.some(function(a){return a.patientId===admisiBaruState.patientId&&a.status==='dirawat';})){showToast('Pasien sudah memiliki episode Rawat Inap aktif. Hindari admisi ganda.','danger');return;}
  const admission = {
    id: uid('ADM'), patientId: admisiBaruState.patientId, visitId: admisiBaruState.visitId, bedId, wardId:bed.wardId,
    dpjpUserId: document.getElementById('ab-dpjp').value, diagnosisMasuk,
    sumberAdmisi, jenisBayar, noBpjs:noKartu, noRujukan,
    kelasPerawatan:ward.kelas, tingkatPerawatan:document.getElementById('ab-tingkat').value,
    status:'dirawat', tanggalMasuk: nowISO(), cppt:[], vitalLog:[], orders:[], resumeMedis:null,
    billing:{biayaObat:0, biayaTindakan:0, biayaPenunjang:0, statusBayar:'belum_bayar'}, discharge:{status:'belum_direncanakan',rencanaTanggal:null,kondisi:null}, createdAt: nowISO(), updatedAt: nowISO()
  };
  Store.data.admissions.push(admission);
  const sourceReferral=(Store.data.careRequests||[]).find(function(r){return r.destination==='rawat-inap'&&r.patientId===admission.patientId&&r.sourceVisitId===admission.visitId&&r.status==='sedang_diproses';});
  if(sourceReferral){sourceReferral.status='selesai';sourceReferral.admissionId=admission.id;sourceReferral.completedAt=nowISO();pushNotification('info','Perjalanan Rawat Inap aktif','Admisi Rawat Inap telah dikonfirmasi. Perjalanan pasien sekarang mengikuti episode Rawat Inap.',admission.patientId,null);}
  bed.status = 'terisi';
  if(admisiBaruState.visitId){
    const srcVisit=Store.data.visits.find(function(v){return v.id===admisiBaruState.visitId;});
    if(srcVisit){
      srcVisit.admissionId=admission.id;srcVisit.nextStep='Episode IGD berakhir; perjalanan dilanjutkan pada Rawat Inap';srcVisit.updatedAt=nowISO();
      if(srcVisit.unit==='igd'){srcVisit.status='selesai';srcVisit.disposition='rawat_inap';srcVisit.workflow=srcVisit.workflow||{};srcVisit.workflow.transferredToInpatientAt=nowISO();srcVisit.workflow.completedAt=nowISO();}
      else srcVisit.status='dirawat';
    }
  }
  Store.save();
  logAudit('admisi_baru', esc(getPatient(admisiBaruState.patientId).nama)+' — '+diagnosisMasuk);
  closeModal();
  showToast('Pasien berhasil diadmisikan', 'success');
  admisiBaruState = {patientId:null, visitId:null};
  if(currentRoute()==='ranap') renderRanapPasienTab();
}
function rujukRawatInap(visitId){
  if(!Session.currentUser||!['dokter','admin'].includes(Session.currentUser.role)){showToast('Permintaan Rawat Inap hanya dapat dibuat dokter penanggung jawab.','danger');return;}
  const visit=getVisit(visitId);if(!visit)return;
  visit.diagnosis=(document.getElementById('px-diagnosis').value||'').trim()||visit.diagnosis;
  visit.catatan=(document.getElementById('px-catatan').value||'').trim()||visit.catatan;
  visit.billing.konsultasi=getPoli(visit.poliId).biaya;
  if(!Array.isArray(visit.referrals))visit.referrals=[];
  const existing=(Store.data.careRequests||[]).find(function(r){return r.sourceVisitId===visit.id&&r.destination==='rawat-inap'&&!['ditolak','dibatalkan'].includes(r.status);});
  if(!existing){const req=createCareRequest(visit,'rawat-inap','admisi_rawat_inap','Permintaan Rawat Inap dari '+getPoli(visit.poliId).nama+' · diagnosis: '+(visit.diagnosis||'belum diisi'));visit.referrals.push(req);}
  visit.status='rujuk_ranap';visit.nextStep='Menunggu konfirmasi Admisi Rawat Inap';visit.updatedAt=nowISO();Store.save();
  logAudit('rujuk_ranap',visit.noAntrian+' — '+esc(getPatient(visit.patientId).nama));
  poliState.activeVisitId=null;refreshPoliQueue();refreshQueueControlPanel();
  document.getElementById('poli-exam-area').innerHTML='<div class="panel"><div class="panel-body"><div class="empty"><div class="big">🏥</div>Permintaan Rawat Inap telah dikirim ke Admisi. Perjalanan Rawat Inap aktif setelah admisi dikonfirmasi.</div></div></div>';
  showToast('Permintaan dikirim ke Admisi Rawat Inap; menunggu konfirmasi unit tujuan.','success');
}
/* =================================================================
   MODULE: RIWAYAT PEMERIKSAAN DOKTER
   ================================================================= */
function renderRiwayatDokterInline(u){
  const list=Store.data.visits.filter(function(v){return v.dokterId===u.id && (v.diagnosis || v.catatan || v.vital || v.screening);})
    .sort(function(a,b){return new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt);}).slice(0,30);
  return list.length ? '<div class="hint" style="margin-bottom:10px">Menampilkan maksimal 30 pemeriksaan terbaru. Catatan klinis lengkap tetap dibuka melalui pencarian Rekam Medis.</div>'+list.map(function(v){const p=getPatient(v.patientId);return '<div class="history-item"><div class="when">'+formatTanggalWaktu(v.updatedAt||v.createdAt)+' · '+esc(getPoli(v.poliId).nama)+' · '+esc(v.noAntrian||'-')+' · '+badgeStatus(v.status)+'</div><div><strong>'+esc(p?p.nama:'Pasien')+'</strong> <span class="hint">· RM '+esc(p?p.id:'-')+'</span></div>'+clinicalSummaryHtml(v)+'</div>';}).join('') : '<div class="empty">Belum ada pemeriksaan yang dicatat oleh akun dokter ini.</div>';
}

function renderRiwayatDokter(){
  setPageTitle('Riwayat Pemeriksaan');
  const u=Session.currentUser;
  const list=Store.data.visits.filter(function(v){
    return v.dokterId===u.id && (v.diagnosis || v.catatan || v.vital || v.screening);
  }).sort(function(a,b){return new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt);});
  // Variabel ini wajib didefinisikan sebelum template dirender. Versi sebelumnya
  // merujuk medOrders/canAdminMed tanpa deklarasi sehingga menu Riwayat dokter
  // berhenti dengan ReferenceError dan tampak seperti tombol tidak berfungsi.
  const medOrders = [];
  const canAdminMed = false;
  document.getElementById('main-content').innerHTML=
    pageIntro('Riwayat pemeriksaan khusus dokter yang sedang login. '+(u.poliId?'Hanya pemeriksaan pada '+esc(getPoli(u.poliId).nama)+' yang ditangani akun ini. ':'')+'Data klinis tetap melekat pada nomor rekam medis pasien dan dapat dibuka melalui Rekam Medis.')+
    '<div class="panel"><div class="panel-head"><div><h2>🩺 Riwayat Pemeriksaan Saya</h2><div class="hint">'+list.length+' kunjungan memiliki data klinis yang sudah dicatat.</div></div></div><div class="panel-body">'+
    (list.length ? list.map(function(v){return '<div class="history-item"><div class="when">'+formatTanggalWaktu(v.updatedAt||v.createdAt)+' · '+esc(getPoli(v.poliId).nama)+' · '+esc(v.noAntrian||'-')+' · '+badgeStatus(v.status)+'</div><div><strong>'+esc(getPatient(v.patientId).nama)+'</strong> <span class="hint">· RM '+esc(getPatient(v.patientId).id)+'</span></div>'+clinicalSummaryHtml(v)+'</div>';}).join('') : '<div class="empty"><div class="big">🩺</div>Belum ada pemeriksaan yang tercatat oleh dokter ini.</div>')+
    '</div></div>'+
    (medOrders.length ? '<div class="panel" style="margin-top:10px"><div class="panel-head"><h2>💊 Status Pemberian Obat</h2></div><div class="panel-body">'+medOrders.map(function(r){var label=r.status==='menunggu'?'Menunggu Farmasi':r.status==='disiapkan'?(r.distribusiStatus==='diserahkan'?'Diserahkan ke Perawat':'Disiapkan Farmasi'):'Diberikan'; var btn=canAdminMed&&r.status==='disiapkan'&&r.distribusiStatus==='diserahkan'?'<button class="btn btn-success btn-sm" data-admin-obat="'+r.id+'">✓ Catat Diberikan</button>':''; return '<div class="history-item"><strong>'+esc((r.items&&r.items[0]&&r.items[0].nama)||'Obat')+'</strong> · '+esc(label)+'<div class="hint">'+(r.diberikanOleh?'Diberikan oleh '+esc(r.diberikanOleh):'')+'</div>'+btn+'</div>';}).join('')+'</div></div>' : '')+
    '</div></div>';
}
function clinicalSummaryHtml(v){
  const vital=v.vital||v.screening||{};
  const parts=[];
  if(v.diagnosis) parts.push('<div><strong>Diagnosis:</strong> '+esc(v.diagnosis)+'</div>');
  if(v.catatan) parts.push('<div><strong>Catatan/Tindakan:</strong> '+esc(v.catatan)+'</div>');
  if(vital.td||vital.nadi||vital.suhu||vital.rr||vital.bb||vital.tb) parts.push('<div><strong>Tanda vital:</strong> TD '+esc(vital.td||'-')+' · Nadi '+esc(vital.nadi||'-')+' · Suhu '+esc(vital.suhu||'-')+' °C · RR '+esc(vital.rr||'-')+' · BB '+esc(vital.bb||'-')+' kg · TB '+esc(vital.tb||'-')+' cm</div>');
  const resep=v.resepId?getResep(v.resepId):null;
  if(resep) parts.push('<div><strong>Resep:</strong> '+resep.items.map(function(i){return esc(i.nama)+' ×'+i.jumlah+' ('+esc(i.aturanPakai||'-')+')';}).join(', ')+'</div>');
  return parts.join('') || '<div class="hint">Data klinis belum lengkap.</div>';
}

/* =================================================================
   MODULE: REKAM MEDIS
   PENCARIAN KODE: MODUL: REKAM MEDIS | accessiblePatients | tampilkanRekamMedis
   Aturan: akses mengikuti relasi pelayanan aktif dan penugasan unit/ruang.
   ================================================================= */
function getClinicalScopeUser(){ return Session.currentUser || {}; }
function hasAccessibleActiveAdmission(patientId,u){
  if(!u||!['dokter_ranap','perawat_ranap'].includes(u.role)) return false;
  const wardIds=Array.isArray(u.wardIds)&&u.wardIds.length?u.wardIds:(u.wardId?[u.wardId]:[]);
  return (Store.data.admissions||[]).some(function(a){
    if(a.patientId!==patientId||a.status!=='dirawat') return false;
    return u.role==='dokter_ranap'||wardIds.includes(a.wardId);
  });
}
function visitAccessibleToUser(v,u){
  if(!u) return false;
  if(u.role==='admin') return true;
  if(['dokter','perawat'].includes(u.role)) return v.unit==='rawat-jalan' && u.poliId && samePoli(v.poliId,u.poliId);
  if(['dokter_igd','perawat_igd'].includes(u.role)) return v.unit==='igd';
  // Saat merawat pasien Rawat Inap aktif, dokter/perawat terkait boleh membaca riwayat kunjungan
  // sebelumnya pasien tersebut untuk kesinambungan klinis. Perawat tetap harus ditugaskan ke ruangnya.
  if(['dokter_ranap','perawat_ranap'].includes(u.role)) return v.unit==='rawat-inap'||hasAccessibleActiveAdmission(v.patientId,u);
  return false;
}
function accessiblePatientVisits(patientId,u){
  return patientVisits(patientId).filter(function(v){ return visitAccessibleToUser(v,u); });
}
/* MODUL: REKAM MEDIS — CAKUPAN PASIEN SESUAI HAK AKSES. Jangan menampilkan pasien di luar unit/ruang yang diizinkan. */
function accessiblePatients(u){
  if(!u || u.role==='admin') return Store.data.patients;
  const ids=new Set(Store.data.visits.filter(function(v){return visitAccessibleToUser(v,u);}).map(function(v){return v.patientId;}));
  // Episode Rawat Inap aktif juga merupakan relasi pelayanan yang sah meski pasien belum punya visit Rawat Inap.
  // Dokter Rawat Inap dapat melihat pasien aktif lintas ruang; perawat hanya pasien di wardId/wardIds penugasan.
  (Store.data.admissions||[]).forEach(function(a){if(a.status==='dirawat'&&((u.role==='dokter_ranap')||(u.role==='perawat_ranap'&&((u.wardIds||[]).includes(a.wardId)||u.wardId===a.wardId))))ids.add(a.patientId);});
  return Store.data.patients.filter(function(p){return ids.has(p.id);});
}
function renderRekamMedis(){
  setPageTitle('Rekam Medis');
  const u=getClinicalScopeUser();
  document.getElementById('main-content').innerHTML =
    pageIntro('Pencarian rekam medis dibatasi sesuai hak akses akun. Dokter/perawat hanya dapat melihat pasien dalam unit/poli yang menjadi tanggung jawabnya.')+
    '<div class="panel"><div class="panel-body">'+
    '<form id="form-cari-rm" class="search-row"><input type="text" id="cari-rm-input" placeholder="Cari berdasarkan NIK, No. RM, atau Nama...">'+
    '<button type="submit" class="btn btn-primary">Cari</button></form><div id="hasil-cari-rm"></div></div></div>'+
    (u.role==='dokter' ? '<details class="panel" style="margin-top:12px"><summary class="panel-head" style="cursor:pointer"><strong>🕘 Riwayat Pemeriksaan Saya</strong><span class="hint">Daftar pemeriksaan yang pernah dicatat akun dokter ini</span></summary><div class="panel-body">'+renderRiwayatDokterInline(u)+'</div></details>' : '')+
    '<div id="detail-rm-area"></div>';
  document.getElementById('form-cari-rm').addEventListener('submit', function(e){
    e.preventDefault(); doSearchRekamMedis(document.getElementById('cari-rm-input').value.trim());
  });
}
function doSearchRekamMedis(q){
  const el = document.getElementById('hasil-cari-rm');
  document.getElementById('detail-rm-area').innerHTML = '';
  if(!q){ el.innerHTML=''; return; }
  const qLower = q.toLowerCase();
  const results = accessiblePatients(Session.currentUser).filter(p => p.nik.includes(q) || p.id.toLowerCase().includes(qLower) || p.nama.toLowerCase().includes(qLower));
  if(results.length===0){ el.innerHTML = '<div class="empty">Pasien tidak ditemukan atau tidak termasuk kewenangan akun ini.</div>'; return; }
  el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>No. RM</th><th>Nama</th><th>NIK</th><th></th></tr></thead><tbody>'+
    results.map(p=>'<tr><td class="mono">'+p.id+'</td><td>'+esc(p.nama)+'</td><td class="mono">'+maskNik(p.nik)+'</td>'+
      '<td><button class="btn btn-outline btn-sm" data-lihat-rm="'+p.id+'">Lihat Rekam Medis</button></td></tr>').join('')+'</tbody></table></div>';
  el.querySelectorAll('[data-lihat-rm]').forEach(btn=> btn.addEventListener('click', ()=> tampilkanRekamMedis(btn.dataset.lihatRm)));
}
function tampilkanRekamMedis(patientId){
  const p = getPatient(patientId), u=Session.currentUser;
  if(!p || !accessiblePatients(u).some(function(x){return x.id===patientId;})){ showToast('Akses rekam medis ditolak untuk akun ini.','danger'); return; }
  const riwayat = accessiblePatientVisits(patientId,u);
  // MODUL: REKAM MEDIS — EPISODE RAWAT INAP AKTIF.
  // Episode tetap bersumber dari tabel admissions; jangan membuat salinan episode sebagai visit baru.
  const activeAdmissions=(Store.data.admissions||[]).filter(function(a){
    if(a.patientId!==patientId||a.status!=='dirawat') return false;
    if(u.role==='admin'||u.role==='dokter_ranap') return true;
    const wards=Array.isArray(u.wardIds)&&u.wardIds.length?u.wardIds:(u.wardId?[u.wardId]:[]);
    return u.role==='perawat_ranap'&&wards.includes(a.wardId);
  });
  const admissionHtml=activeAdmissions.length?'<section class="panel" style="margin-top:12px"><div class="panel-head"><h3>Episode Rawat Inap Aktif</h3><span class="badge">'+activeAdmissions.length+'</span></div><div class="panel-body">'+activeAdmissions.map(function(a){
    const w=Store.data.wards.find(function(x){return x.id===a.wardId;})||{},b=Store.data.beds.find(function(x){return x.id===a.bedId;})||{};
    const cppt=(a.cppt||[]).slice(-5).reverse();
    const orders=(a.orders||[]).slice(-8).reverse();
    return '<div class="history-item"><strong>'+esc(w.nama||'Ruang belum ditetapkan')+' · Kamar '+esc(b.noKamar||'-')+' · '+esc(b.bedLabel||('Bed '+(b.noBed||'-')))+'</strong><div class="hint">Masuk '+formatTanggalWaktu(a.tanggalMasuk||a.createdAt)+' · Penjamin '+esc(a.jenisBayar||'-')+' · Kelas '+esc(a.kelasPerawatan||w.kelas||'-')+'</div><div><strong>Diagnosis masuk:</strong> '+esc(a.diagnosisMasuk||'Belum dicatat')+'</div><div><strong>DPJP:</strong> '+esc((getUserById(a.dpjpUserId)||{}).nama||'Belum ditetapkan')+'</div>'+
      (cppt.length?'<div style="margin-top:8px"><strong>Catatan perawatan terbaru</strong>'+cppt.map(function(c){return '<div class="hint">'+formatTanggalWaktu(c.waktu||c.createdAt)+' · '+esc(c.profesi||'Petugas')+' — '+esc(c.asesmen||c.catatan||c.planning||'Catatan klinis')+'</div>';}).join('')+'</div>':'<div class="hint" style="margin-top:8px">Belum ada CPPT pada episode aktif.</div>')+
      (orders.length?'<div style="margin-top:8px"><strong>Instruksi dan penunjang</strong>'+orders.map(function(o){return '<div class="hint">'+esc(o.jenis||'Instruksi')+' · '+esc(o.detail||'-')+' · Status: '+esc(o.status||'dibuat')+(o.hasil?' · Hasil: '+esc(o.hasil):'')+'</div>';}).join('')+'</div>':'')+'</div>';
  }).join('')+'</div></section>':'';
  document.getElementById('detail-rm-area').innerHTML =
    '<div class="panel"><div class="panel-head"><h2>'+esc(p.nama)+'</h2></div><div class="panel-body">'+
    '<div class="grid grid-4" style="margin-bottom:16px">'+
      statCard('No. RM', p.id, '')+statCard('Usia', calcUmur(p.tglLahir)+' th', p.jenisKelamin==='L'?'Laki-laki':'Perempuan')+
      statCard('Golongan Darah', p.golDarah||'-', '')+statCard('Kunjungan Terakses', riwayat.length, '')+
    '</div>'+
    (p.alergi ? '<div class="allergy-flag">⚠ Riwayat alergi: '+esc(p.alergi)+'</div>' : '')+
    '<p style="font-size:13.5px;color:var(--ink-soft)">'+esc(p.alamat)+' &middot; '+esc(p.noHp)+'</p>'+
    '<h3 style="margin:16px 0 10px">Riwayat Kunjungan dalam Kewenangan Akun</h3>'+
    (riwayat.length===0 ? '<div class="empty">Belum ada riwayat kunjungan terdahulu yang dapat diakses.</div>' : riwayat.map(v=>historyItemHtmlFull(v)).join(''))+
    '</div></div>'+admissionHtml;
}

/* =================================================================
   MODULE: MASTER DATA
   PENCARIAN KODE: MODUL: MASTER DATA | RUANGAN | SHIFT | HAK AKSES
   Aturan: perubahan master harus mempertahankan ID yang sudah dipakai episode dan transaksi.
   ================================================================= */
let masterTab = 'poli';
function renderMasterData(){
  setPageTitle('Master Data');
  masterTab = 'poli';
  document.getElementById('main-content').innerHTML =
    pageIntro('Kelola data induk, struktur fasilitas, staf, hak akses, dan jejak aktivitas sistem.')+
    '<div class="tabs"><button class="tab active" data-mtab="poli">Poli</button><button class="tab" data-mtab="doctors">Dokter & Jadwal</button><button class="tab" data-mtab="staff">Staf & Pengguna</button>'+
    '<button class="tab" data-mtab="facility">Fasilitas</button><button class="tab" data-mtab="wards">Ruangan &amp; Shift</button><button class="tab" data-mtab="rbac">Hak Akses</button><button class="tab" data-mtab="log">Audit Log</button></div>'+
    '<div id="master-tab-area"></div>';
  document.querySelectorAll('[data-mtab]').forEach(function(t){ t.addEventListener('click',function(){ switchMasterTab(t.dataset.mtab); }); });
  renderMasterPoliTab();
}
function switchMasterTab(tab){
  masterTab = tab;
  document.querySelectorAll('[data-mtab]').forEach(function(t){ t.classList.toggle('active',t.dataset.mtab===tab); });
  if(tab==='poli') renderMasterPoliTab();
  else if(tab==='doctors') renderMasterDoctorsTab();
  else if(tab==='staff') renderMasterStaffTab();
  else if(tab==='facility') renderMasterFacilityTab();
  else if(tab==='wards') renderMasterWardsTab();
  else if(tab==='rbac') renderMasterRbacTab();
  else renderMasterLogTab();
}

function renderMasterDoctorsTab(){
  const el=document.getElementById('master-tab-area');
  const days=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const docs=Store.data.doctors||[];
  el.innerHTML='<div class="alert alert-info"><strong>Master editable.</strong> Baseline diambil dari halaman publik “Dokter Kami” SIMRS PROTOTYPE. Karena situs resmi juga menandai sebagian entri “Data Belum Diperbarui”, setiap jadwal diberi status verifikasi. Perubahan di sini tersimpan di perangkat/browser ini; gunakan Ekspor/Impor untuk memindahkan master tanpa mengubah kode GitHub.</div>'+
  '<div class="panel"><div class="panel-head"><h2>Tambah Dokter</h2></div><div class="panel-body"><form id="form-doctor-master" class="field-row3"><div class="field"><label>Nama Dokter</label><input id="dm-nama" required></div><div class="field"><label>Spesialisasi</label><input id="dm-spesialis" required></div><div class="field"><label>Poli</label><select id="dm-poli">'+Store.data.poli.map(function(p){return '<option value="'+p.id+'">'+esc(p.nama)+' — '+esc(p.layanan||'')+'</option>';}).join('')+'</select></div><div style="grid-column:1/-1"><button class="btn btn-primary">Tambah Dokter</button></div></form></div></div>'+
  '<div class="panel"><div class="panel-head"><div><h2>Jadwal Praktik</h2><div class="hint">'+docs.length+' dokter master · '+(Store.data.doctorSchedules||[]).length+' slot jadwal</div></div><div class="chip-row"><button class="btn btn-outline btn-sm" id="btn-export-master">⬇️ Ekspor Master JSON</button><button class="btn btn-outline btn-sm" id="btn-import-master">⬆️ Impor Master JSON</button><input id="master-file" type="file" accept="application/json" class="hidden"></div></div><div class="panel-body">'+
  '<form id="form-schedule-master" class="field-row3"><div class="field"><label>Dokter</label><select id="sc-dokter">'+docs.map(function(d){return '<option value="'+d.id+'">'+esc(d.nama)+'</option>';}).join('')+'</select></div><div class="field"><label>Poli/Layanan</label><select id="sc-poli">'+Store.data.poli.map(function(p){return '<option value="'+p.id+'">'+esc(p.nama)+' — '+esc(p.layanan||'')+'</option>';}).join('')+'</select></div><div class="field"><label>Hari</label><select id="sc-hari">'+days.map(function(d,i){return '<option value="'+i+'">'+d+'</option>';}).join('')+'</select></div><div class="field"><label>Mulai</label><input id="sc-mulai" type="time" required value="08:00"></div><div class="field"><label>Selesai</label><input id="sc-selesai" type="time" required value="12:00"></div><div class="field"><label>Ruang</label><input id="sc-ruang" value="Belum dipetakan"></div><div class="field"><label>Kuota (opsional)</label><input id="sc-kuota" type="number" min="0" placeholder="Otomatis dari durasi"></div><div style="grid-column:1/-1"><button class="btn btn-primary">Tambah Jadwal</button></div></form>'+
  '<div class="table-wrap" style="margin-top:18px"><table><thead><tr><th>Dokter</th><th>Layanan</th><th>Hari</th><th>Jam</th><th>Ruang</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+ (Store.data.doctorSchedules||[]).slice().sort(function(a,b){return String(a.poliId).localeCompare(String(b.poliId))||Number(a.hari)-Number(b.hari)||String(a.jamMulai).localeCompare(String(b.jamMulai));}).map(function(sc){const d=doctorMasterById(sc.doctorId)||Store.data.users.find(function(u){return u.id===sc.doctorId;});const p=getPoli(sc.poliId);return '<tr><td><strong>'+esc(d?d.nama:sc.doctorId)+'</strong><div class="hint">'+esc(d&&d.spesialis||'')+'</div></td><td>'+esc(p?p.nama:sc.poliId)+'<div class="hint">'+esc(p&&p.layanan||'')+'</div></td><td>'+days[Number(sc.hari)||0]+'</td><td class="mono">'+esc(sc.jamMulai)+'–'+esc(sc.jamSelesai)+'</td><td>'+esc(sc.ruang||'Belum dipetakan')+'</td><td><span class="badge '+(sc.needsConfirmation?'badge-amber':'badge-sage')+'">'+(sc.needsConfirmation?'Perlu verifikasi':'Terverifikasi')+'</span></td><td><button class="btn btn-outline btn-sm" data-edit-doc="'+(d?d.id:'')+'">Edit Dokter</button> <button class="btn btn-danger btn-sm" data-del-sc="'+sc.id+'">Hapus</button></td></tr>';}).join('')+'</tbody></table></div></div></div>';
  document.getElementById('form-doctor-master').addEventListener('submit',function(e){e.preventDefault();const d={id:'DOC-'+Date.now().toString(36),nama:document.getElementById('dm-nama').value.trim(),spesialis:document.getElementById('dm-spesialis').value.trim(),poliIds:[document.getElementById('dm-poli').value],status:'needs_confirmation',source:'Admin',editable:true,updatedAt:nowISO()};if(!d.nama||!d.spesialis)return;Store.data.doctors.push(d);Store.save();logAudit('dokter_master_baru',d.nama);renderMasterDoctorsTab();showToast('Dokter master ditambahkan','success');});
  document.getElementById('form-schedule-master').addEventListener('submit',function(e){e.preventDefault();const s={id:'SCH-'+Date.now().toString(36),doctorId:document.getElementById('sc-dokter').value,poliId:canonicalPoliId(document.getElementById('sc-poli').value),tanggal:null,hari:Number(document.getElementById('sc-hari').value),jamMulai:document.getElementById('sc-mulai').value,jamSelesai:document.getElementById('sc-selesai').value,ruang:document.getElementById('sc-ruang').value.trim()||'Belum dipetakan',shiftLabel:'Manual Admin',kuota:Number(document.getElementById('sc-kuota').value)||null,source:'Admin',needsConfirmation:false,createdAt:nowISO(),updatedAt:nowISO()};Store.data.doctorSchedules.push(s);Store.save();logAudit('jadwal_dokter_baru',doctorDisplayName(s.doctorId)+' — '+getPoli(s.poliId).nama);renderMasterDoctorsTab();showToast('Jadwal ditambahkan','success');});
  el.querySelectorAll('[data-edit-doc]').forEach(function(b){b.addEventListener('click',function(){const d=doctorMasterById(b.dataset.editDoc);if(!d)return;const nama=prompt('Nama dokter',d.nama);if(nama===null)return;const sp=prompt('Spesialisasi',d.spesialis||'');if(sp===null)return;d.nama=nama.trim()||d.nama;d.spesialis=sp.trim()||d.spesialis;d.updatedAt=nowISO();Store.save();logAudit('dokter_master_edit',d.nama);renderMasterDoctorsTab();showToast('Master dokter diperbarui','success');});});
  el.querySelectorAll('[data-del-sc]').forEach(function(b){b.addEventListener('click',function(){if(!confirm('Hapus jadwal ini?'))return;Store.data.doctorSchedules=Store.data.doctorSchedules.filter(function(s){return s.id!==b.dataset.delSc;});Store.save();logAudit('jadwal_dokter_hapus',b.dataset.delSc);renderMasterDoctorsTab();});});
  document.getElementById('btn-export-master').addEventListener('click',function(){const payload={version:'14.0',exportedAt:nowISO(),doctors:Store.data.doctors||[],doctorSchedules:Store.data.doctorSchedules||[],poli:Store.data.poli||[]};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='master-simrs-prototype-v14.0.json';a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},500);});
  document.getElementById('btn-import-master').addEventListener('click',function(){document.getElementById('master-file').click();});
  document.getElementById('master-file').addEventListener('change',function(e){const f=e.target.files[0];if(!f)return;const rd=new FileReader();rd.onload=function(){try{const x=JSON.parse(rd.result);if(!Array.isArray(x.doctors)||!Array.isArray(x.doctorSchedules))throw new Error('Format master tidak valid');Store.data.doctors=x.doctors;Store.data.doctorSchedules=x.doctorSchedules;Store.save();logAudit('master_dokter_impor','Master dokter dan jadwal diperbarui dari JSON');renderMasterDoctorsTab();showToast('Master berhasil diimpor','success');}catch(err){showToast('Import gagal: '+err.message,'danger');}};rd.readAsText(f);});
}

function renderMasterWardsTab(){
  const el=document.getElementById('master-tab-area');
  const shiftOrder=['PAGI','SORE','MALAM'];
  const managed=Store.data.wards.filter(function(w){return w.locationManaged;}).sort(function(a,b){return String(a.buildingId).localeCompare(String(b.buildingId))||Number(a.floorNumber)-Number(b.floorNumber)||String(a.nama).localeCompare(String(b.nama));});
  el.innerHTML='<div class="alert alert-info"><strong>Master rawat inap editable.</strong> Data gedung, lantai, ruang, label kamar/bed, kepala ruang, ketua shift, anggota perawat, dan jam shift tersimpan di browser ini. Data akun perawat tetap perlu dipetakan ke penugasan yang sesuai.</div>'+managed.map(function(w){return '<div class="panel ward-master-card" data-ward-card="'+w.id+'"><div class="panel-head"><div><h2>'+esc(w.nama)+'</h2><div class="hint">'+esc(w.buildingName)+' · '+esc(w.floorName||('Lantai '+w.floorNumber))+' · '+(w.category==='vvip'?'VVIP · 20 kamar × 1 bed':'Reguler · 10 kamar × 3 bed')+'</div></div><span class="badge badge-slate">'+Store.data.beds.filter(function(b){return b.wardId===w.id;}).length+' bed</span></div><div class="panel-body"><div class="field-row3"><div class="field"><label>Nama gedung</label><input data-field="buildingName" value="'+esc(w.buildingName||'')+'"></div><div class="field"><label>Nomor lantai</label><input data-field="floorNumber" type="number" min="1" max="20" value="'+esc(w.floorNumber||1)+'"></div><div class="field"><label>Nama lantai</label><input data-field="floorName" value="'+esc(w.floorName||('Lantai '+(w.floorNumber||1)))+'"></div><div class="field"><label>Nama ruangan</label><input data-field="nama" value="'+esc(w.nama||'')+'" required></div><div class="field"><label>Kepala ruangan</label><input data-field="headNurseName" value="'+esc(w.headNurseName||'')+'"></div><div class="field"><label>Tarif per hari (simulasi)</label><input data-field="tarifPerHari" type="number" min="0" value="'+esc(w.tarifPerHari||0)+'"></div><div class="field"><label>Label kamar (pisahkan koma)</label><input data-field="kamarLabels" value="'+esc((w.kamarLabels||[]).join(', '))+'"></div><div class="field"><label>Label bed (pisahkan koma)</label><input data-field="bedLabels" value="'+esc((w.bedLabels||[]).join(', '))+'"></div><div class="field"><label>Fasilitas (pisahkan koma)</label><input data-field="facilities" value="'+esc((w.facilities||[]).join(', '))+'"></div></div><h3 style="margin:16px 0 8px">Jadwal dan tim shift</h3><div class="field-row3">'+shiftOrder.map(function(k){const sh=(w.shiftAssignments||{})[k]||{};return '<div class="panel" style="margin:0"><div class="panel-body"><strong>'+({PAGI:'Pagi',SORE:'Sore',MALAM:'Malam'})[k]+'</strong><div class="field"><label>Mulai</label><input data-shift="'+k+'" data-shift-field="jamMulai" type="time" value="'+esc(sh.jamMulai||({PAGI:'06:00',SORE:'14:00',MALAM:'22:00'})[k])+'"></div><div class="field"><label>Selesai</label><input data-shift="'+k+'" data-shift-field="jamSelesai" type="time" value="'+esc(sh.jamSelesai||({PAGI:'14:00',SORE:'22:00',MALAM:'06:00'})[k])+'"></div><div class="field"><label>Ketua shift</label><input data-shift="'+k+'" data-shift-field="ketuaShift" value="'+esc(sh.ketuaShift||'')+'"></div><div class="field"><label>Nama perawat (pisahkan titik koma)</label><input data-shift="'+k+'" data-shift-field="perawat" value="'+esc((sh.perawat||[]).join('; '))+'"></div></div></div>';}).join('')+'</div><div style="margin-top:14px"><button class="btn btn-primary" data-save-ward="'+w.id+'">Simpan perubahan ruang</button></div></div></div>';}).join('');
  el.querySelectorAll('[data-save-ward]').forEach(function(btn){btn.addEventListener('click',function(){const card=el.querySelector('[data-ward-card="'+btn.dataset.saveWard+'"]');const w=Store.data.wards.find(function(x){return x.id===btn.dataset.saveWard;});if(!card||!w)return;const val=function(k){const x=card.querySelector('[data-field="'+k+'"]');return x?x.value.trim():'';};const building=val('buildingName'),name=val('nama'),floor=Number(val('floorNumber')),floorName=val('floorName');if(!building||!name||!floorName||!Number.isInteger(floor)||floor<1){showToast('Nama gedung, ruangan, dan lantai wajib valid.','danger');return;}const previousBuildingId=w.buildingId,previousFloor=Number(w.floorNumber);Store.data.wards.filter(function(x){return x.locationManaged&&x.buildingId===previousBuildingId;}).forEach(function(x){x.buildingName=building;});if(floor===previousFloor)Store.data.wards.filter(function(x){return x.locationManaged&&x.buildingId===previousBuildingId&&Number(x.floorNumber)===previousFloor;}).forEach(function(x){x.floorName=floorName;});w.buildingName=building;w.floorNumber=floor;w.floorName=floorName;w.nama=name;w.tarifPerHari=Math.max(0,Number(val('tarifPerHari'))||0);w.headNurseName=val('headNurseName');const kamar=val('kamarLabels').split(',').map(function(x){return x.trim();}).filter(Boolean);const beds=val('bedLabels').split(',').map(function(x){return x.trim();}).filter(Boolean);const kamarCount=w.category==='vvip'?20:10,bedCount=w.category==='vvip'?1:3;if(kamar.length!==kamarCount||new Set(kamar).size!==kamarCount){showToast('Jumlah label kamar harus tepat '+kamarCount+' dan tidak boleh duplikat.','danger');return;}if(beds.length!==bedCount||new Set(beds).size!==bedCount){showToast('Jumlah label bed harus tepat '+bedCount+' dan tidak boleh duplikat.','danger');return;}w.kamarLabels=kamar;w.bedLabels=beds;w.facilities=val('facilities').split(',').map(function(x){return x.trim();}).filter(Boolean);w.shiftAssignments=w.shiftAssignments||{};for(const k of ['PAGI','SORE','MALAM']){const field=function(f){const x=card.querySelector('[data-shift="'+k+'"][data-shift-field="'+f+'"]');return x?x.value.trim():'';};if(!field('jamMulai')||!field('jamSelesai')||!field('ketuaShift')||!field('perawat')){showToast('Lengkapi jam, ketua, dan nama perawat untuk semua shift.','danger');return;}}['PAGI','SORE','MALAM'].forEach(function(k){const sh=w.shiftAssignments[k]||{};const field=function(f){const x=card.querySelector('[data-shift="'+k+'"][data-shift-field="'+f+'"]');return x?x.value.trim():'';};const staff=field('perawat').split(';').map(function(x){return x.trim();}).filter(Boolean);if(!field('jamMulai')||!field('jamSelesai')||!field('ketuaShift')||!staff.length)return;const previousShift=w.shiftAssignments[k]||{};const linkedLeader=(Store.data.users||[]).find(function(u){return u.id===previousShift.ketuaShiftUserId;});if(linkedLeader)linkedLeader.nama=field('ketuaShift');(previousShift.perawatUserIds||[]).forEach(function(id,i){const linked=(Store.data.users||[]).find(function(u){return u.id===id;});if(linked&&staff[i])linked.nama=staff[i];});w.shiftAssignments[k]={jamMulai:field('jamMulai'),jamSelesai:field('jamSelesai'),ketuaShift:field('ketuaShift'),perawat:staff,ketuaShiftUserId:previousShift.ketuaShiftUserId||null,perawatUserIds:previousShift.perawatUserIds||[]};});Store.data.beds.filter(function(b){return b.wardId===w.id;}).forEach(function(b){const idx=(w.category==='vvip'?Number(b.noKamar)-1:'ABCDEFGHIJ'.indexOf(String(b.noKamar)));const bi=(w.category==='vvip'?0:Number(String(b.noBed).replace(/\D/g,''))-1);b.noKamar=w.kamarLabels[Math.max(0,idx)]||b.noKamar;b.bedLabel=w.bedLabels[Math.max(0,bi)]||b.bedLabel;b.noBed=String(Math.max(1,bi+1));b.buildingName=w.buildingName;b.floorNumber=w.floorNumber;b.floorName=w.floorName;b.roomName=w.nama;});Store.save();logAudit('master_ruang_shift_edit',w.nama+' · '+w.buildingName+' lantai '+w.floorNumber);showToast('Master ruang dan shift berhasil disimpan.','success');renderMasterWardsTab();});});
}

function renderMasterFacilityTab(){
  const el=document.getElementById('master-tab-area');
  const typeLabel={gedung:'Gedung',lantai:'Lantai',unit:'Unit/Instalasi',ruang:'Ruang',kamar:'Kamar',bed:'Bed'};
  el.innerHTML='<div class="alert alert-info">Struktur fasilitas dibuat bertingkat agar nanti mudah dipetakan ke struktur nyata SIMRS PROTOTYPE. Data yang belum diverifikasi resmi sengaja dibuat sebagai placeholder dan tidak dianggap sebagai denah rumah sakit.</div>'+
    '<div class="panel"><div class="panel-head"><h2>Tambah Node Fasilitas</h2></div><div class="panel-body"><form id="form-facility" class="field-row3">'+
    '<div class="field"><label>Jenis</label><select id="fc-type">'+Object.keys(typeLabel).map(function(k){return '<option value="'+k+'">'+typeLabel[k]+'</option>';}).join('')+'</select></div>'+
    '<div class="field"><label>Nama</label><input id="fc-nama" required placeholder="Contoh: Ruang Mawar"></div>'+
    '<div class="field"><label>Induk (opsional)</label><select id="fc-parent"><option value="">Tidak ada</option>'+Store.data.facilities.map(function(f){return '<option value="'+f.id+'">'+esc(typeLabel[f.type]||f.type)+' — '+esc(f.nama)+'</option>';}).join('')+'</select></div>'+
    '<div style="grid-column:1/-1"><button class="btn btn-primary">Tambah</button></div></form></div></div>'+
    '<div class="panel"><div class="panel-head"><h2>Struktur Fasilitas</h2></div><div class="panel-body"><div class="facility-tree">'+
    Store.data.facilities.map(function(f){return '<div class="facility-node"><span class="facility-type">'+(typeLabel[f.type]||f.type)+'</span><strong>'+esc(f.nama)+'</strong><span class="hint">'+(f.parentId?'Induk: '+esc((Store.data.facilities.find(function(x){return x.id===f.parentId;})||{}).nama||f.parentId):'Root')+'</span></div>';}).join('')+
    '</div></div></div>';
  document.getElementById('form-facility').addEventListener('submit',function(e){
    e.preventDefault();
    const f={id:'FAC-'+Date.now().toString(36),type:document.getElementById('fc-type').value,nama:document.getElementById('fc-nama').value.trim(),parentId:document.getElementById('fc-parent').value||null};
    if(!f.nama){showToast('Nama fasilitas wajib diisi','danger');return;}
    Store.data.facilities.push(f); Store.save(); logAudit('fasilitas_baru',f.type+' — '+f.nama); showToast('Fasilitas ditambahkan','success'); renderMasterFacilityTab();
  });
}
function renderMasterRbacTab(){
  const matrix=[
    ['Dashboard','admin','—','—','—','—','—','—'],
    ['Pendaftaran','✓','✓','—','—','—','—','—'],
    ['Booking Antrian','✓','✓','—','—','—','—','—'],
    ['Poli','✓','—','✓','—','—','—','—'],
    ['Rawat Inap','✓','—','✓','—','—','—','✓'],
    ['Laboratorium','✓','—','—','—','✓','—','—'],
    ['Farmasi','✓','—','—','✓','—','—','—'],
    ['Kasir','✓','—','—','—','—','✓','—'],
    ['Rekam Medis','✓','—','✓','—','—','—','—'],
    ['Master Data','✓','—','—','—','—','—','—']
  ];
  const roles=['Admin','Loket','Dokter','Farmasi','Lab','Kasir','Perawat'];
  document.getElementById('master-tab-area').innerHTML='<div class="alert alert-info">RBAC (Role-Based Access Control) membatasi modul berdasarkan peran. Ini masih demo sisi client; autentikasi produksi harus dipindahkan ke backend dengan sesi/token aman.</div>'+
    '<div class="panel"><div class="panel-head"><h2>Matriks Hak Akses</h2></div><div class="panel-body"><div class="table-wrap"><table class="rbac-table"><thead><tr><th>Modul</th>'+roles.map(function(r){return '<th>'+r+'</th>';}).join('')+'</tr></thead><tbody>'+
    matrix.map(function(row){return '<tr>'+row.map(function(v,i){return '<td class="'+(i===0?'rbac-module':'')+'">'+(i===0?esc(v):v)+'</td>';}).join('')+'</tr>';}).join('')+
    '</tbody></table></div></div></div>';
}
function renderMasterLogTab(){
  const list = (Store.data.auditLog||[]).slice(0,150);
  document.getElementById('master-tab-area').innerHTML =
    '<div class="alert alert-info">Riwayat aktivitas untuk akuntabilitas data pasien — siapa melakukan apa dan kapan. Tersimpan di perangkat ini (150 terbaru ditampilkan).</div>'+
    '<div class="panel"><div class="panel-head"><h2>Log Aktivitas</h2></div><div class="panel-body">'+
    (list.length===0 ? '<div class="empty">Belum ada aktivitas tercatat.</div>' :
    '<div class="table-wrap"><table><thead><tr><th>Waktu</th><th>Pengguna</th><th>Peran</th><th>Aksi</th><th>Detail</th></tr></thead><tbody>'+
    list.map(l=>'<tr><td class="mono">'+formatTanggalWaktu(l.createdAt)+'</td><td>'+esc(l.userName)+'</td><td>'+esc(l.role)+'</td><td>'+esc(l.aksi)+'</td>'+
      '<td style="font-size:13px;color:var(--ink-soft)">'+esc(l.detail)+'</td></tr>').join('')+'</tbody></table></div>')+
    '</div></div>';
}
function renderMasterPoliTab(){
  const area = document.getElementById('master-tab-area');
  area.innerHTML =
    '<div class="panel"><div class="panel-head"><h2>Tambah Poli</h2></div><div class="panel-body">'+
      '<form id="form-poli-baru" class="field-row3">'+
        '<div class="field"><label>Kode Poli</label><input type="text" id="pl-kode" maxlength="4" style="text-transform:uppercase" required></div>'+
        '<div class="field"><label>Nama Poli</label><input type="text" id="pl-nama" required></div>'+
        '<div class="field"><label>Biaya Konsultasi (Rp)</label><input type="number" id="pl-biaya" min="0" required></div>'+
        '<div class="field" style="grid-column:1/-1"><button type="submit" class="btn btn-primary">Tambah Poli</button></div>'+
      '</form></div></div>'+
    '<div class="panel"><div class="panel-head"><h2>Daftar Poli</h2></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>Kode</th><th>Nama Poli</th><th>Biaya Konsultasi</th><th>Dokter</th></tr></thead><tbody>'+
      Store.data.poli.map(p=>{
        const dokter = Store.data.users.filter(u=>u.role==='dokter' && samePoli(u.poliId,p.id));
        return '<tr><td class="mono"><span class="poli-tag"><span class="poli-dot" style="background:var(--'+poliColor(p.id)+')"></span>'+p.id+'</span></td><td>'+esc(p.nama)+'</td>'+
        '<td class="mono">'+formatRupiah(p.biaya)+'</td><td style="font-size:13px">'+(dokter.length?dokter.map(d=>esc(d.nama)).join(', '):'<span style="color:var(--ink-soft)">Belum ada</span>')+'</td></tr>';
      }).join('')+'</tbody></table></div></div></div>';
  document.getElementById('form-poli-baru').addEventListener('submit', function(e){
    e.preventDefault();
    const kode = document.getElementById('pl-kode').value.trim().toUpperCase();
    if(!kode || Store.data.poli.some(p=>p.id===kode)){ showToast('Kode poli kosong atau sudah dipakai', 'danger'); return; }
    const namaPoli = document.getElementById('pl-nama').value.trim();
    Store.data.poli.push({id:kode, nama:namaPoli, biaya: parseInt(document.getElementById('pl-biaya').value)||0});
    Store.save();
    logAudit('poli_baru', kode+' — '+namaPoli);
    showToast('Poli baru ditambahkan', 'success'); renderMasterPoliTab();
  });
}
function renderMasterStaffTab(){
  document.getElementById('master-tab-area').innerHTML =
    '<div class="panel"><div class="panel-head"><h2>Daftar Staf &amp; Pengguna</h2></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Unit / Poli</th><th>Ruang</th><th>Shift</th></tr></thead><tbody>'+
    Store.data.users.map(u=>{const w=(Store.data.wards||[]).find(function(x){return x.id===u.wardId;});return '<tr><td>'+esc(u.nama)+'</td><td class="mono">'+esc(u.username)+'</td><td>'+roleLabel(u.role)+(u.isShiftLeader?' · Ketua Shift':'')+'</td><td>'+(u.poliId?esc((getPoli(u.poliId)||{}).nama||u.poliId):esc(u.unit||'-'))+'</td><td>'+esc(w?w.nama:(u.wardId||'-'))+'</td><td>'+esc(u.shiftId||'-')+'</td></tr>';}).join('')+
    '</tbody></table></div><p class="hint" style="margin-top:10px">Akun demo memakai password bawaan. Pada versi produksi, autentikasi dan izin wajib ditegakkan di backend. Penugasan ruang/shift perawat dikelola melalui tab Ruangan &amp; Shift.</p></div></div>';
}

