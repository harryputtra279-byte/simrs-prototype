/* =================================================================
   MODUL 06 — LABORATORIUM, RADIOLOGI, FARMASI & KASIR
   Tanggung jawab: Order penunjang, hasil, penerimaan resep, perjalanan obat, dan tagihan/pembayaran.
   Kontrak integrasi: dijalankan sebagai classic script berurutan setelah modul sebelumnya;
   gunakan Store/Session/helper bersama yang sudah didefinisikan. Jangan mengubah urutan pemuatan
   tanpa audit dependensi dan uji alur lintas unit.
   PENCARIAN KODE: modules/06-diagnostics-pharmacy-cashier.js
   ================================================================= */

"use strict"; // Pertahankan semantik strict-mode dari app.js monolitik.
/* INDEKS BANTUAN TAHAP 7
 * Modul: LABORATORIUM, RADIOLOGI, FARMASI & KASIR
 * Tanggung jawab: Order penunjang, hasil, resep, pelayanan obat, tagihan/pembayaran.
 * Fungsi yang sering menjadi titik masuk (cari nama fungsi dengan Ctrl+F):
 * - ancillaryWorkItems
 * - renderAncillaryHome
 * - renderAncillaryMonitor
 * - renderLab
 * - renderLabList
 * - submitHasilLab
 * - renderLabRanapList
 * - submitHasilLabRanap
 * - renderRadiologi
 * - submitHasilRadiologiRJ
 * - submitHasilRadiologi
 * - renderFarmasi
 * - switchFarmasiTab
 * - renderFarmasiResepTab
 * - siapkanObat
 * - renderFarmasiRanapTab
 * - siapkanObatRanap
 * - serahkanObatKePerawatRanap
 * - administrasikanObatRanap
 * - renderFarmasiSiapTab
 * - serahkanObat
 * - renderFarmasiStokTab
 * - renderKasir
 * - switchKasirTab
 * - computeBilling
 * - renderKasirBayarTab
 * - openBayarModal
 * - prosesBayar
 * - renderKasirRanapTab
 * - openBayarRanapModal
 * - prosesBayarRanap
 * - openInvoiceModal
 * - renderKasirRiwayatTab
 * Integrasi: fungsi global/Store dipertahankan untuk kompatibilitas classic script.
 * Catatan: jangan memindahkan fungsi lintas modul tanpa audit pemanggil dan uji alur.
 */

/* =================================================================
   MODULE: LABORATORIUM
   PENCARIAN KODE: MODUL: LABORATORIUM | careRequests | renderLab
   Aturan integrasi: hasil harus kembali ke episode sumber dan tidak otomatis dianggap telah ditinjau dokter.
   ================================================================= */
function ancillaryWorkItems(kind){
  const field=kind==='lab'?'labRequest':'radiologyRequest',type=kind==='lab'?'lab':'radiologi',items=[];
  Store.data.visits.filter(function(v){return ['rawat-jalan','igd'].includes(v.unit||'rawat-jalan')&&v[field]&&!['dibatalkan','ditolak'].includes(v[field].status);}).forEach(function(v){items.push({source:'visit',visit:v,patientId:v.patientId,number:v.noAntrian||v.id,origin:v.unit==='igd'?'IGD':'Rawat Jalan',detail:v[field].jenis||'-',status:v[field].status,at:v[field].requestedAt||v.createdAt,request:v[field]});});
  Store.data.admissions.filter(function(a){return a.status==='dirawat'&&Array.isArray(a.orders);}).forEach(function(a){a.orders.filter(function(o){return o.jenis===type&&!['dibatalkan','ditolak'].includes(o.status);}).forEach(function(o){items.push({source:'admission',admission:a,order:o,patientId:a.patientId,number:a.noAdmisi||a.id,origin:'Rawat Inap',detail:o.detail||'-',status:o.status==='dibuat'?'menunggu':o.status,at:o.createdAt||a.createdAt,request:o});});});
  return items.sort(function(a,b){return new Date(a.at||0)-new Date(b.at||0);});
}
function renderAncillaryHome(kind){
  const isLab=kind==='lab',title=isLab?'Beranda Laboratorium':'Beranda Radiologi',unitLabel=isLab?'Laboratorium':'Radiologi',all=ancillaryWorkItems(kind);
  const waiting=all.filter(function(x){return ['menunggu','diterima','dibuat'].includes(x.status);}).length;
  const processing=all.filter(function(x){return ['diproses','dikerjakan'].includes(x.status);}).length;
  const results=all.filter(function(x){return x.status==='selesai';}).length;
  const pendingReview=all.filter(function(x){return x.source==='visit'&&x.status==='selesai'&&!(x.request.ditinjauAt);}).length;
  setPageTitle(title);
  document.getElementById('main-content').innerHTML=pageIntro('Dashboard operasional '+unitLabel+'. Angka menggabungkan permintaan Rawat Jalan, IGD, dan Rawat Inap yang tersimpan.')+
    '<div class="ops-kpi-grid"><div class="ops-kpi"><div class="kpi-label">Permintaan menunggu</div><div class="kpi-value">'+waiting+'</div></div><div class="ops-kpi"><div class="kpi-label">Sedang diproses</div><div class="kpi-value">'+processing+'</div></div><div class="ops-kpi"><div class="kpi-label">Hasil tersedia</div><div class="kpi-value">'+results+'</div></div><div class="ops-kpi"><div class="kpi-label">Hasil kunjungan belum ditinjau</div><div class="kpi-value">'+pendingReview+'</div></div></div>'+
    '<div class="panel"><div class="panel-head"><h2>Antrean unit saat ini</h2><button class="btn btn-outline btn-sm" data-nav="'+(isLab?'monitor-lab':'monitor-radiologi')+'">Buka Monitor</button></div><div class="panel-body">'+(all.length?all.map(function(x){const p=getPatient(x.patientId)||{};return '<div class="history-item"><strong>'+esc(p.nama||'Pasien')+'</strong> · '+esc(x.number)+'<div class="hint">Asal: '+esc(x.origin)+' · '+esc(x.detail)+' · Status: '+esc(x.status)+'</div></div>';}).join(''):'<div class="empty">Belum ada permintaan pemeriksaan.</div>')+'</div></div>';
}
function renderAncillaryMonitor(kind){
  const isLab=kind==='lab',title=isLab?'Monitor Laboratorium':'Monitor Radiologi',all=ancillaryWorkItems(kind);
  setPageTitle(title);
  document.getElementById('main-content').innerHTML='<div class="ops-hero"><div><div class="ops-eyebrow">MONITOR UNIT PENUNJANG</div><h2>'+title+'</h2><p>Antrean Rawat Jalan, IGD, dan Rawat Inap. Hasil tetap terhubung dengan episode atau admisi asal.</p></div><button class="btn btn-outline btn-sm" id="btn-refresh-ancillary">↻ Perbarui</button></div>'+
    '<div class="table-wrap"><table><thead><tr><th>Antrean</th><th>Asal</th><th>Permintaan</th><th>Status</th><th>Waktu</th></tr></thead><tbody>'+(all.length?all.map(function(x){return '<tr><td>'+esc(x.number)+'</td><td>'+esc(x.origin)+'</td><td>'+esc(x.detail)+'</td><td>'+esc(x.status==='selesai'?'Hasil tersedia':['diproses','dikerjakan'].includes(x.status)?'Sedang diproses':['diterima','dikonfirmasi'].includes(x.status)?'Diterima':'Menunggu')+'</td><td>'+esc(formatTanggalWaktu(x.at))+'</td></tr>';}).join(''):'<tr><td colspan="5">Tidak ada permintaan pemeriksaan.</td></tr>')+'</tbody></table></div>';
  const b=document.getElementById('btn-refresh-ancillary');if(b)b.addEventListener('click',function(){renderAncillaryMonitor(kind);});
}
function renderLab(){
  setPageTitle('Laboratorium');
  const visits=Store.data.visits.filter(v=>v.labRequest&&['menunggu','diterima','diproses'].includes(v.labRequest.status)&&['rawat-jalan','igd'].includes(v.unit||'rawat-jalan')).sort((a,b)=>new Date(a.labRequest.requestedAt||a.createdAt)-new Date(b.labRequest.requestedAt||b.createdAt));
  const admissions=Store.data.admissions.filter(function(a){return a.status==='dirawat'&&Array.isArray(a.orders)&&a.orders.some(function(o){return o.jenis==='lab'&&o.status==='menunggu';});});
  document.getElementById('main-content').innerHTML=pageIntro('Laboratorium menerima permintaan Rawat Jalan dan IGD serta order Rawat Inap. Setiap hasil dikembalikan ke episode pasien yang benar.')+
    '<div class="panel"><div class="panel-head"><h2>Rawat Jalan / IGD — Menunggu Pemeriksaan ('+visits.length+')</h2></div><div class="panel-body" id="lab-rajal-area"></div></div>'+
    '<div class="panel" style="margin-top:12px"><div class="panel-head"><h2>Rawat Inap — Menunggu Pemeriksaan ('+admissions.length+')</h2></div><div class="panel-body" id="lab-ranap-area"></div></div>';
  renderLabList(visits); renderLabRanapList(admissions);
}
function renderLabList(list){
  const area=document.getElementById('lab-rajal-area');
  if(!list.length){area.innerHTML='<div class="empty">Tidak ada permintaan Laboratorium Rawat Jalan / IGD.</div>';return;}
  area.innerHTML=list.map(function(v){const p=getPatient(v.patientId),poli=getPoli(v.poliId),asal=v.unit==='igd'?'IGD':poli.nama,req=(Store.data.careRequests||[]).find(function(r){return r.sourceVisitId===v.id&&r.destination==='lab'&&r.status==='menunggu_konfirmasi';});return '<div class="panel" style="margin-bottom:10px"><div class="panel-body"><strong>'+esc(p.nama)+'</strong> <span class="mono">('+p.id+')</span><div class="hint">Asal: '+esc(asal)+' · '+esc(v.labRequest.jenis)+'</div>'+(req?'<button class="btn btn-outline btn-sm" data-lab-accept="'+req.id+'">Konfirmasi Penerimaan Laboratorium</button>':'<span class="badge badge-sage">Permintaan diterima</span>')+'<div class="field"><label>Hasil Pemeriksaan</label><textarea id="hasil-'+v.id+'"></textarea><label>Lampiran gambar/PDF (maks. 1 MiB)</label><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" data-result-file id="hasil-file-'+v.id+'"></div><div class="result-actions"><button class="btn btn-primary btn-sm" data-submit-lab="'+v.id+'">Kirim Hasil ke Dokter</button></div></div></div>';}).join('');
  bindAncillaryFileInputs(area);
  area.querySelectorAll('[data-lab-accept]').forEach(function(btn){btn.addEventListener('click',function(){confirmCareRequest(this.dataset.labAccept,'terima');renderLab();});});
  area.querySelectorAll('[data-submit-lab]').forEach(function(btn){btn.addEventListener('click',function(){submitHasilLab(this.dataset.submitLab);});});
}
function submitHasilLab(visitId){
  if(!Session.currentUser||!['lab','admin'].includes(Session.currentUser.role)){showToast('Hasil Laboratorium hanya dapat disimpan petugas Laboratorium atau admin demo.','danger');return;}
  const el=document.getElementById('hasil-'+visitId),attachment=ancillaryAttachment('hasil-file-'+visitId),hasil=ancillaryResultText(el?el.value.trim():'',attachment); if(!hasil){showToast('Isi ringkasan hasil atau lampirkan file hasil.','danger');return;}
  const visit=getVisit(visitId); if(!visit||!visit.labRequest)return; const reqCheck=(Store.data.careRequests||[]).find(function(r){return r.sourceVisitId===visit.id&&r.destination==='lab'&&r.status!=='ditolak';});if(reqCheck&&reqCheck.status!=='diterima'){showToast('Laboratorium harus mengonfirmasi penerimaan sebelum mengirim hasil.','warning');return;}if(visit.labRequest.status==='selesai'){showToast('Hasil Laboratorium sudah disimpan.','warning');return;} visit.labRequest.hasil=hasil;visit.labRequest.lampiran=attachment; visit.labRequest.status='selesai'; visit.labRequest.resultReceivedAt=nowISO(); visit.workflow=visit.workflow||{}; visit.workflow.resultReceivedAt=nowISO(); visit.workflow.labReviewPending=true; const radPending=!!(visit.radiologyRequest&&visit.radiologyRequest.status!=='selesai'); if(radPending){visit.status='menunggu_penunjang';visit.nextStep='Menunggu hasil radiologi';}else if(visit.unit!=='igd'||!['observasi','proses_pulang','rujuk_ranap'].includes(visit.status)){visit.status='menunggu_review';visit.nextStep='Dokter meninjau hasil laboratorium';} visit.updatedAt=nowISO(); const req=(Store.data.careRequests||[]).find(function(r){return r.sourceVisitId===visit.id&&r.destination==='lab'&&r.status!=='ditolak';});if(req){req.status='selesai';req.completedAt=nowISO();req.result=hasil;} const ord=(visit.orders||[]).find(function(o){return o.id===visit.labRequest.id;});if(ord){ord.status='selesai';ord.hasil=hasil;ord.lampiran=attachment;ord.completedAt=nowISO();} pushNotification('info','Hasil laboratorium tersedia','Hasil pemeriksaan '+visit.labRequest.jenis+' telah dikirim kepada dokter.',visit.patientId,null); Store.save(); logAudit('hasil_lab',visit.noAntrian+' — '+esc(getPatient(visit.patientId).nama)); showToast('Hasil lab terkirim ke dokter','success'); renderLab();
}
function renderLabRanapList(list){
  const area=document.getElementById('lab-ranap-area'); if(!list.length){area.innerHTML='<div class="empty">Tidak ada order Lab Rawat Inap.</div>';return;}
  area.innerHTML=list.map(function(a){const p=getPatient(a.patientId),ward=Store.data.wards.find(function(w){return w.id===a.wardId;}),bed=Store.data.beds.find(function(b){return b.id===a.bedId;});return '<div class="panel" style="margin-bottom:10px"><div class="panel-body"><strong>'+esc(p.nama)+'</strong> <span class="mono">('+p.id+')</span><div class="hint">'+esc(ward?ward.nama:'-')+' · '+esc(bed?bed.noKamar+bed.noBed:'-')+'</div>'+a.orders.filter(function(o){return o.jenis==='lab'&&o.status==='menunggu';}).map(function(o){const req=(Store.data.careRequests||[]).find(function(r){return r.admissionId===a.id&&r.orderId===o.id&&r.destination==='lab'&&r.status==='menunggu_konfirmasi';});return '<div class="alert alert-info" style="margin-top:10px"><strong>Order:</strong> '+esc(o.detail)+(req?'<div><button class="btn btn-outline btn-sm" data-lab-accept="'+req.id+'">Konfirmasi Penerimaan</button></div>':'')+'<div class="field" style="margin-top:8px"><label>Hasil Pemeriksaan</label><textarea id="hasil-lab-ri-'+o.id+'"></textarea><label>Lampiran gambar/PDF (maks. 1 MiB)</label><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" data-result-file id="hasil-lab-ri-file-'+o.id+'"></div><div class="result-actions"><button class="btn btn-primary btn-sm" data-submit-lab-ri="'+o.id+'" data-adm="'+a.id+'">Kirim Hasil ke EMR</button></div></div>';}).join('')+'</div></div>';}).join('');
  bindAncillaryFileInputs(area);
  area.querySelectorAll('[data-lab-accept]').forEach(function(btn){btn.addEventListener('click',function(){confirmCareRequest(this.dataset.labAccept,'terima');renderLab();});});
  area.querySelectorAll('[data-submit-lab-ri]').forEach(function(btn){btn.addEventListener('click',function(){submitHasilLabRanap(this.dataset.adm,this.dataset.submitLabRi);});});
}
function submitHasilLabRanap(admissionId,orderId){
  if(!Session.currentUser||!['lab','admin'].includes(Session.currentUser.role)){showToast('Hasil Laboratorium hanya dapat disimpan petugas Laboratorium atau admin demo.','danger');return;}
  const a=Store.data.admissions.find(function(x){return x.id===admissionId;});if(!a)return;const o=a.orders.find(function(x){return x.id===orderId;});if(!o)return;const el=document.getElementById('hasil-lab-ri-'+orderId),attachment=ancillaryAttachment('hasil-lab-ri-file-'+orderId),hasil=ancillaryResultText(el?el.value.trim():'',attachment);if(!hasil){showToast('Isi ringkasan hasil atau lampirkan file hasil.','danger');return;}const reqCheck=(Store.data.careRequests||[]).find(function(r){return r.admissionId===a.id&&r.orderId===o.id;});if(reqCheck&&reqCheck.status!=='diterima'){showToast('Laboratorium harus mengonfirmasi penerimaan sebelum mengirim hasil.','warning');return;}if(o.status==='selesai'){showToast('Hasil Laboratorium sudah disimpan.','warning');return;}o.status='selesai';o.hasil=hasil;o.lampiran=attachment;o.selesaiAt=nowISO();o.dilakukanOleh=Session.currentUser?Session.currentUser.nama:'';const req=(Store.data.careRequests||[]).find(function(r){return r.admissionId===a.id&&r.orderId===o.id;});if(req){req.status='selesai';req.completedAt=nowISO();req.result=hasil;}pushNotification('info','Hasil laboratorium tersedia','Hasil pemeriksaan Rawat Inap telah dikirim kepada dokter.',a.patientId,null);a.billing.biayaPenunjang=(a.billing.biayaPenunjang||0)+50000;a.updatedAt=nowISO();Store.save();logAudit('hasil_lab_ranap',esc(getPatient(a.patientId).nama)+' — '+esc(o.detail));showToast('Hasil Lab Rawat Inap tersimpan ke EMR','success');renderLab();
}

/* =================================================================
   MODULE: RADIOLOGI
   PENCARIAN KODE: MODUL: RADIOLOGI | careRequests | renderRadiologi
   Aturan integrasi: permintaan, penerimaan, hasil, dan peninjauan mengikuti episode sumber.
   ================================================================= */
function renderRadiologi(){
  setPageTitle('Radiologi');
  const visits=Store.data.visits.filter(function(v){return ['rawat-jalan','igd'].includes(v.unit||'rawat-jalan')&&v.radiologyRequest&&['menunggu','diterima','diproses'].includes(v.radiologyRequest.status);});
  const admissions=Store.data.admissions.filter(function(a){return a.status==='dirawat'&&Array.isArray(a.orders)&&a.orders.some(function(o){return o.jenis==='radiologi'&&o.status==='menunggu';});});
  document.getElementById('main-content').innerHTML=pageIntro('Radiologi menerima permintaan Rawat Jalan dan Rawat Inap. Setiap permintaan terikat ke kunjungan/admisi sumber; hasil dikirim kembali ke rekam medis.')+
    '<div class="panel"><div class="panel-head"><h2>Rawat Jalan / IGD — Menunggu ('+visits.length+')</h2></div><div class="panel-body" id="radiologi-rajal-area"></div></div>'+ 
    '<div class="panel" style="margin-top:12px"><div class="panel-head"><h2>Rawat Inap — Menunggu ('+admissions.length+')</h2></div><div class="panel-body" id="radiologi-list-area"></div></div>';
  const rj=document.getElementById('radiologi-rajal-area');
  rj.innerHTML=visits.length?visits.map(function(v){const p=getPatient(v.patientId),req=(Store.data.careRequests||[]).find(function(r){return r.sourceVisitId===v.id&&r.destination==='radiologi'&&r.kind==='radiologi'&&r.status!=='ditolak';});return '<div class="history-item"><strong>'+esc(p?p.nama:'Pasien')+'</strong> · '+esc(v.noAntrian||v.id)+'<div class="hint">'+esc(v.radiologyRequest.jenis)+' · '+esc(v.status)+'</div>'+(req&&req.status==='menunggu_konfirmasi'?'<button class="btn btn-outline btn-sm" data-rad-accept="'+req.id+'">Konfirmasi Penerimaan</button>':'')+'<div class="field"><label>Hasil Radiologi</label><textarea id="hasil-rad-rj-'+v.id+'"></textarea><label>Lampiran gambar/PDF (maks. 1 MiB)</label><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" data-result-file id="hasil-rad-rj-file-'+v.id+'"></div><button class="btn btn-primary btn-sm" data-rad-rj-submit="'+v.id+'">Simpan Hasil &amp; Kirim ke Dokter</button></div>';}).join(''):'<div class="empty">Tidak ada permintaan radiologi Rawat Jalan.</div>';
  bindAncillaryFileInputs(rj);
  rj.querySelectorAll('[data-rad-accept]').forEach(function(b){b.addEventListener('click',function(){confirmCareRequest(this.dataset.radAccept,'terima');renderRadiologi();});});
  rj.querySelectorAll('[data-rad-rj-submit]').forEach(function(b){b.addEventListener('click',function(){submitHasilRadiologiRJ(this.dataset.radRjSubmit);});});
  const area=document.getElementById('radiologi-list-area');
  if(!admissions.length){area.innerHTML='<div class="empty">Tidak ada order Radiologi Rawat Inap.</div>';return;}
  area.innerHTML=admissions.map(function(a){const p=getPatient(a.patientId),ward=Store.data.wards.find(function(w){return w.id===a.wardId;}),bed=Store.data.beds.find(function(b){return b.id===a.bedId;});return '<div class="panel" style="margin-bottom:10px"><div class="panel-body"><strong>'+esc(p?p.nama:'Pasien')+'</strong> <span class="mono">('+esc(a.patientId)+')</span><div class="hint">'+esc(ward?ward.nama:'-')+' · '+esc(bed?bed.noKamar+bed.noBed:'-')+'</div>'+a.orders.filter(function(o){return o.jenis==='radiologi'&&o.status==='menunggu';}).map(function(o){return '<div class="alert alert-info" style="margin-top:10px"><strong>Order:</strong> '+esc(o.detail)+'<div class="field" style="margin-top:8px"><label>Hasil Pemeriksaan</label><textarea id="hasil-rad-'+o.id+'"></textarea><label>Lampiran gambar/PDF (maks. 1 MiB)</label><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" data-result-file id="hasil-rad-file-'+o.id+'"></div><button class="btn btn-primary btn-sm" data-submit-rad="'+o.id+'" data-adm="'+a.id+'">Kirim Hasil ke EMR</button></div>';}).join('')+'</div></div>';}).join('');
  bindAncillaryFileInputs(area);
  area.querySelectorAll('[data-rad-accept]').forEach(function(btn){btn.addEventListener('click',function(){confirmCareRequest(this.dataset.radAccept,'terima');renderRadiologi();});});
  area.querySelectorAll('[data-submit-rad]').forEach(function(btn){btn.addEventListener('click',function(){submitHasilRadiologi(this.dataset.adm,this.dataset.submitRad);});});
}
function submitHasilRadiologiRJ(visitId){
  if(!Session.currentUser||!['radiologi','admin'].includes(Session.currentUser.role)){showToast('Hasil Radiologi hanya dapat disimpan petugas Radiologi atau admin demo.','danger');return;}
  const v=getVisit(visitId);if(!v||!v.radiologyRequest)return;
  const el=document.getElementById('hasil-rad-rj-'+visitId),attachment=ancillaryAttachment('hasil-rad-rj-file-'+visitId),hasil=ancillaryResultText(el?el.value.trim():'',attachment);if(!hasil){showToast('Isi ringkasan hasil atau lampirkan file hasil.','danger');return;}const reqCheck=(Store.data.careRequests||[]).find(function(r){return r.sourceVisitId===v.id&&r.destination==='radiologi'&&r.status!=='ditolak';});if(reqCheck&&reqCheck.status!=='diterima'){showToast('Radiologi harus mengonfirmasi penerimaan sebelum mengirim hasil.','warning');return;}if(v.radiologyRequest.status==='selesai'){showToast('Hasil Radiologi sudah disimpan.','warning');return;}
  v.radiologyRequest.hasil=hasil;v.radiologyRequest.lampiran=attachment;v.radiologyRequest.status='selesai';v.radiologyRequest.selesaiAt=nowISO();v.radiologyRequest.dilakukanOleh=Session.currentUser?Session.currentUser.nama:'';v.workflow=v.workflow||{};v.workflow.resultReceivedAt=nowISO();v.workflow.radiologyReviewPending=true;const labPending=!!(v.labRequest&&v.labRequest.status!=='selesai');if(labPending){v.status='menunggu_lab';v.nextStep='Menunggu hasil laboratorium';}else if(v.unit!=='igd'||!['observasi','proses_pulang','rujuk_ranap'].includes(v.status)){v.status='menunggu_review';v.nextStep='Dokter meninjau hasil radiologi';}v.updatedAt=nowISO();
  const req=(Store.data.careRequests||[]).find(function(r){return r.sourceVisitId===v.id&&r.destination==='radiologi'&&r.kind==='radiologi'&&r.status!=='ditolak';});if(req){req.status='selesai';req.completedAt=nowISO();req.result=hasil;}const ord=(v.orders||[]).find(function(o){return o.id===v.radiologyRequest.id;});if(ord){ord.status='selesai';ord.hasil=hasil;ord.lampiran=attachment;ord.completedAt=nowISO();}
  pushNotification('info','Hasil radiologi tersedia','Hasil pemeriksaan '+v.radiologyRequest.jenis+' telah dikirim kepada dokter.',v.patientId,null);Store.save();logAudit('hasil_radiologi_rj',esc(getPatient(v.patientId).nama)+' — '+esc(v.radiologyRequest.jenis));showToast('Hasil radiologi Rawat Jalan tersimpan dan dikirim ke dokter','success');renderRadiologi();
}

function submitHasilRadiologi(admissionId,orderId){
  if(!Session.currentUser||!['radiologi','admin'].includes(Session.currentUser.role)){showToast('Hasil Radiologi hanya dapat disimpan petugas Radiologi atau admin demo.','danger');return;}
  const a=Store.data.admissions.find(function(x){return x.id===admissionId;}); if(!a)return;
  const o=a.orders.find(function(x){return x.id===orderId;}); if(!o)return;
  const el=document.getElementById('hasil-rad-'+orderId),attachment=ancillaryAttachment('hasil-rad-file-'+orderId),hasil=ancillaryResultText(el?el.value.trim():'',attachment); if(!hasil){showToast('Isi ringkasan hasil atau lampirkan file hasil.','danger');return;}const reqCheck=(Store.data.careRequests||[]).find(function(r){return r.admissionId===a.id&&r.orderId===o.id;});if(reqCheck&&reqCheck.status!=='diterima'){showToast('Radiologi harus mengonfirmasi penerimaan sebelum mengirim hasil.','warning');return;}if(o.status==='selesai'){showToast('Hasil Radiologi sudah disimpan.','warning');return;}
  o.status='selesai'; o.hasil=hasil;o.lampiran=attachment; o.selesaiAt=nowISO(); o.dilakukanOleh=Session.currentUser?Session.currentUser.nama:''; const req=(Store.data.careRequests||[]).find(function(r){return r.admissionId===a.id&&r.orderId===o.id;});if(req){req.status='selesai';req.completedAt=nowISO();req.result=hasil;}pushNotification('info','Hasil radiologi tersedia','Hasil radiologi Rawat Inap telah dikirim kepada dokter.',a.patientId,null);
  a.billing.biayaPenunjang=(a.billing.biayaPenunjang||0)+75000; a.updatedAt=nowISO(); Store.save();
  logAudit('hasil_radiologi',esc(getPatient(a.patientId).nama)+' — '+esc(o.detail)); showToast('Hasil radiologi tersimpan ke EMR','success'); renderRadiologi();
}

/* =================================================================
   MODULE: FARMASI
   PENCARIAN KODE: MODUL: FARMASI | prescriptions | renderFarmasi
   Aturan integrasi: resep tetap terikat pada visitId atau admissionId dan konteks unitnya.
   ================================================================= */
/* Lampiran hasil penunjang untuk prototipe lokal. Batas 1 MiB menjaga localStorage tidak cepat penuh. */
function bindAncillaryFileInputs(root){
  (root||document).querySelectorAll('[data-result-file]').forEach(function(input){
    if(input.dataset.bound==='1')return;input.dataset.bound='1';
    input.addEventListener('change',function(){
      const file=this.files&&this.files[0];this.dataset.attachment='';
      if(!file)return;
      const allowed=['image/jpeg','image/png','image/webp','application/pdf'];
      if(!allowed.includes(file.type)){this.value='';showToast('Lampiran hanya boleh JPG, PNG, WEBP, atau PDF.','danger');return;}
      if(file.size>1024*1024){this.value='';showToast('Ukuran lampiran maksimal 1 MiB untuk penyimpanan demo lokal.','danger');return;}
      const reader=new FileReader(),el=this;reader.onerror=function(){el.value='';showToast('Lampiran gagal dibaca. Coba pilih file kembali.','danger');};
      reader.onload=function(){el.dataset.attachment=JSON.stringify({name:file.name,type:file.type,size:file.size,dataUrl:String(reader.result)});showToast('Lampiran siap disimpan bersama hasil.','success');};reader.readAsDataURL(file);
    });
  });
}
function ancillaryAttachment(inputId){
  const el=document.getElementById(inputId);if(!el||!el.dataset.attachment)return null;
  try{return JSON.parse(el.dataset.attachment);}catch(e){return null;}
}
function ancillaryResultText(text,attachment){return text||(attachment?'Lampiran hasil: '+attachment.name:'');}
function ancillaryAttachmentLink(attachment){if(!attachment||!attachment.dataUrl)return '';return '<a class="btn btn-outline btn-sm" href="'+esc(attachment.dataUrl)+'" target="_blank" rel="noopener" download="'+esc(attachment.name||'hasil-penunjang')+'">Buka lampiran: '+esc(attachment.name||'hasil penunjang')+'</a>';}

let farmasiTab = 'resep';
/* =================================================================
   MODUL: FARMASI — INTEGRASI RESEP RAWAT JALAN
   PENCARIAN KODE: MODUL: RAWAT JALAN | SUBMODUL: RESEP KE FARMASI
   Tanggung jawab integrasi Rawat Jalan: resep tersimpan harus membuat/
   memperbarui antrean farmasi berdasarkan visitId dan patientId yang sama.
   UI Farmasi tetap shared untuk konteks Rawat Jalan, IGD, dan Rawat Inap.
   ================================================================= */
function renderFarmasi(){
  const ctx = routeContext(currentRoute()) || (Session.currentUser && Session.currentUser.unit) || 'rawat-jalan';
  setPageTitle('Farmasi ' + operationalContextLabel(ctx));
  farmasiTab = 'resep';
  document.getElementById('main-content').innerHTML =
    pageIntro(ctx==='rawat-inap' ? 'Kelola pemenuhan instruksi obat pasien rawat inap dan distribusi obat ke unit perawatan.' : ctx==='igd' ? 'Kelola resep dan kebutuhan obat IGD secara terpisah dari rawat jalan dan rawat inap.' : 'Kelola resep pasien rawat jalan/poli, siapkan obat, serahkan ke pasien, dan pantau waktu tunggu farmasi.')+
    '<div class="ops-alert" style="margin-bottom:12px"><strong>Unit Aktif:</strong> '+operationalContextLabel(ctx)+' — modul farmasi dipisahkan per layanan.</div>'+
    '<div class="tabs"><button class="tab active" data-ftab="resep">Antrian Resep</button>'+
    (ctx==='rawat-inap' ? '<button class="tab" data-ftab="ranap">Instruksi Obat Rawat Inap</button>' : '')+
    '<button class="tab" data-ftab="siap">Obat Siap Diambil</button>'+
    '<button class="tab" data-ftab="stok">Stok Obat</button></div>'+
    '<div id="farmasi-tab-area"></div>';
  document.querySelectorAll('[data-ftab]').forEach(t=> t.addEventListener('click', ()=> switchFarmasiTab(t.dataset.ftab)));
  renderFarmasiResepTab();
}
function switchFarmasiTab(tab){
  farmasiTab = tab;
  document.querySelectorAll('[data-ftab]').forEach(t=> t.classList.toggle('active', t.dataset.ftab===tab));
  if(tab==='resep') renderFarmasiResepTab();
  else if(tab==='ranap') renderFarmasiRanapTab();
  else if(tab==='siap') renderFarmasiSiapTab();
  else renderFarmasiStokTab();
}
function renderFarmasiResepTab(){
  const ctx = routeContext(currentRoute()) || 'rawat-jalan';
  reconcileOutpatientPrescriptions();
  const list = Store.data.visits.filter(function(v){
    const unit=v.unit||'rawat-jalan', resep=getResepByVisit(v.id);
    const matchesUnit=ctx==='igd'?unit==='igd':ctx==='rawat-inap'?false:unit==='rawat-jalan';
    return matchesUnit && resep && resep.status==='menunggu' && !resep.admissionId && v.status!=='dibatalkan';
  }).sort((a,b)=>new Date(a.createdAt||a.tanggal)-new Date(b.createdAt||b.tanggal));
  const area = document.getElementById('farmasi-tab-area');
  if(list.length===0){ area.innerHTML = '<div class="panel"><div class="panel-body"><div class="empty"><div class="big">✓</div>Tidak ada resep yang menunggu diracik.</div></div></div>'; return; }
  area.innerHTML = list.map(v=>{
    const p = getPatient(v.patientId), poli = getPoli(v.poliId), resep = getResepByVisit(v.id), asal = v.unit==='igd'?'IGD':poli.nama;
    if(!p || !resep) return '';
    return '<div class="panel" style="margin-bottom:10px"><div class="panel-body">'+
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">'+
        '<div><strong>'+esc(p.nama)+'</strong> <span class="mono" style="color:var(--ink-soft)">('+p.id+')</span><br>'+
        '<span style="font-size:13px;color:var(--ink-soft)">Dari '+esc(asal)+' &middot; No. Antrian '+v.noAntrian+'</span></div>'+badgeStatus('menunggu_farmasi')+
      '</div>'+
      '<div class="table-wrap"><table><thead><tr><th>Obat</th><th>Diminta</th><th>Stok Tersedia</th><th>Disiapkan</th><th>Aturan Pakai</th></tr></thead><tbody>'+
      resep.items.map((it,idx)=>{
        const med = getMedicine(it.medicineId), cukup = med.stok >= it.jumlah;
        return '<tr><td>'+esc(it.nama)+'</td><td class="mono">'+it.jumlah+'</td>'+
          '<td class="mono" style="color:'+(cukup?'var(--sage)':'var(--brick)')+';font-weight:700">'+med.stok+'</td>'+
          '<td><input type="number" min="0" max="'+med.stok+'" value="'+Math.min(it.jumlah,med.stok)+'" style="width:80px" id="siap-'+resep.id+'-'+idx+'"></td>'+
          '<td>'+esc(it.aturanPakai)+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      (resep.items.some(it=>getMedicine(it.medicineId).stok < it.jumlah) ? '<div class="alert alert-warning" style="margin-top:10px">⚠ Ada obat dengan stok tidak mencukupi. Jumlah "Disiapkan" otomatis dibatasi sesuai stok — sesuaikan bila perlu.</div>' : '')+
      '<button class="btn btn-primary btn-sm" style="margin-top:8px" data-siapkan="'+resep.id+'" data-visit="'+v.id+'">Siapkan Obat</button>'+
    '</div></div>';
  }).join('');
  area.querySelectorAll('[data-siapkan]').forEach(btn=> btn.addEventListener('click', ()=> siapkanObat(btn.dataset.siapkan, btn.dataset.visit)));
}
function siapkanObat(resepId, visitId){
  if(!Session.currentUser||!['farmasi','admin'].includes(Session.currentUser.role)){showToast('Pemrosesan resep hanya dapat dilakukan petugas Farmasi atau admin demo.','danger');return;}
  const resep = getResep(resepId), visit = getVisit(visitId);
  if(!resep || !visit || getResepByVisit(visitId)?.id!==resepId){showToast('Resep dan kunjungan pasien tidak terhubung. Muat ulang antrean farmasi.','danger');return;}
  if(resep.status!=='menunggu'){showToast('Resep ini sudah diproses; cegah stok terpotong dua kali.','warning');return;}
  let totalObat=0;const reservedByMedicine={};
  for(let idx=0;idx<resep.items.length;idx++){
    const it=resep.items[idx],input=document.getElementById('siap-'+resepId+'-'+idx),med=getMedicine(it.medicineId);
    if(!med){showToast('Master obat tidak ditemukan: '+it.nama,'danger');return;}
    const available=Math.max(0,(parseInt(med.stok,10)||0)-(reservedByMedicine[it.medicineId]||0));
    const jumlahSiap=Math.max(0,Math.min(parseInt(input&&input.value,10)||0,available,parseInt(it.jumlah,10)||0));
    if(jumlahSiap<=0){showToast('Jumlah obat yang disiapkan harus lebih dari nol dan tidak boleh melebihi stok gabungan.','danger');return;}
    it.jumlahDisiapkan=jumlahSiap;reservedByMedicine[it.medicineId]=(reservedByMedicine[it.medicineId]||0)+jumlahSiap;totalObat+=jumlahSiap*(Number(it.hargaSatuan)||0);
  }
  resep.items.forEach(function(it){getMedicine(it.medicineId).stok-=it.jumlahDisiapkan;});
  resep.status = 'disiapkan';
  resep.unit=resep.unit||'rawat-jalan'; resep.jenisLayanan=resep.jenisLayanan||'rawat-jalan';
  resep.siapAt = nowISO(); resep.updatedAt = resep.siapAt;
  visit.resepId=resep.id; resep.visitId=visit.id;
  visit.billing=visit.billing||{registrasi:BIAYA_REGISTRASI,konsultasi:0,obat:0,lab:0};
  visit.billing.obat = totalObat;
  const unit=(visit.unit||resep.unit||'rawat-jalan').replace('_','-');
  if(unit==='igd'){
    visit.status='obat_siap'; visit.nextStep='Farmasi IGD — menunggu penyerahan/pemberian sesuai instruksi';
    resep.unit='igd'; resep.jenisLayanan='igd';
    pushNotification('info','Obat IGD siap diproses','Obat untuk kunjungan IGD Anda siap diproses sesuai instruksi.',visit.patientId,null);
  }else{
    visit.status='menunggu_bayar'; visit.nextStep='Kasir Rawat Jalan — sesuai ketentuan pembayaran';
    pushNotification('info','Resep Rawat Jalan disiapkan','Silakan ikuti petunjuk pembayaran dan pengambilan obat dari petugas.',visit.patientId,null);
  }
  visit.updatedAt=nowISO(); Store.save();
  logAudit('obat_disiapkan',visit.noAntrian+' — '+esc(getPatient(visit.patientId).nama));
  showToast(unit==='igd'?'Obat IGD disiapkan — ikuti alur pemberian IGD':'Obat disiapkan — pasien diarahkan sesuai alur Rawat Jalan','success');
  renderFarmasiResepTab();
}
function renderFarmasiRanapTab(){
  const list = Store.data.prescriptions.filter(r=>r.admissionId && (r.status==='menunggu' || (r.status==='disiapkan' && r.distribusiStatus==='menunggu_serah')));
  const area = document.getElementById('farmasi-tab-area');
  if(list.length===0){ area.innerHTML = '<div class="panel"><div class="panel-body"><div class="empty"><div class="big">✓</div>Tidak ada instruksi obat rawat inap yang menunggu.</div></div></div>'; return; }
  area.innerHTML = list.map(function(resep){
    const a = Store.data.admissions.find(x=>x.id===resep.admissionId);
    const p = getPatient(a.patientId), ward = Store.data.wards.find(w=>w.id===a.wardId), bed = Store.data.beds.find(x=>x.id===a.bedId);
    return '<div class="panel" style="margin-bottom:10px"><div class="panel-body">'+
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">'+
      '<div><strong>'+esc(p.nama)+'</strong> <span class="mono" style="color:var(--ink-soft)">('+p.id+')</span><br>'+
      '<span style="font-size:13px;color:var(--ink-soft)">'+esc(ward.nama)+' Kamar '+bed.noKamar+bed.noBed+' · Rawat Inap</span></div>'+badgeStatus('menunggu_farmasi')+'</div>'+
      '<div class="table-wrap"><table><thead><tr><th>Obat</th><th>Diminta</th><th>Stok Tersedia</th><th>Disiapkan</th><th>Aturan Pakai</th></tr></thead><tbody>'+
      resep.items.map(function(it,idx){
        const med = getMedicine(it.medicineId), cukup = med.stok >= it.jumlah;
        return '<tr><td>'+esc(it.nama)+'</td><td class="mono">'+it.jumlah+'</td>'+
          '<td class="mono" style="color:'+(cukup?'var(--sage)':'var(--brick)')+';font-weight:700">'+med.stok+'</td>'+
          '<td><input type="number" min="0" max="'+med.stok+'" value="'+Math.min(it.jumlah,med.stok)+'" style="width:80px" id="siapr-'+resep.id+'-'+idx+'"></td>'+
          '<td>'+esc(it.aturanPakai)+'</td></tr>';
      }).join('')+'</tbody></table></div>'+
      '<button class="btn btn-primary btn-sm" style="margin-top:8px" data-siapkan-ranap="'+resep.id+'">Siapkan Obat</button>'+
    '</div></div>';
  }).join('');
  area.querySelectorAll('[data-siapkan-ranap]').forEach(function(btn){ btn.addEventListener('click', function(){ const id=this.dataset.siapkanRanap; const r=getResep(id); if(r && r.status==='menunggu') siapkanObatRanap(id); else serahkanObatKePerawatRanap(id); }); });
}
function siapkanObatRanap(resepId){
  if(!Session.currentUser||!['farmasi','admin'].includes(Session.currentUser.role)){showToast('Pemrosesan instruksi obat hanya dapat dilakukan petugas Farmasi atau admin demo.','danger');return;}
  const resep = getResep(resepId);
  const a = Store.data.admissions.find(x=>x.id===resep.admissionId);
  let total = 0;
  resep.items.forEach(function(it,idx){
    const input = document.getElementById('siapr-'+resepId+'-'+idx);
    const jumlahSiap = Math.max(0, Math.min(parseInt(input.value)||0, getMedicine(it.medicineId).stok));
    getMedicine(it.medicineId).stok -= jumlahSiap;
    it.jumlahDisiapkan = jumlahSiap;
    total += jumlahSiap*it.hargaSatuan;
  });
  resep.status = 'disiapkan'; resep.jenisLayanan='rawat_inap'; resep.siapAt=nowISO(); resep.updatedAt=resep.siapAt; resep.distribusiStatus='menunggu_serah';
  a.billing.biayaObat = (a.billing.biayaObat||0) + total;
  a.updatedAt = nowISO();
  Store.save();
  logAudit('obat_ranap_disiapkan', esc(getPatient(a.patientId).nama)+' — '+formatRupiah(total));
  showToast('Obat rawat inap disiapkan, biaya masuk tagihan', 'success');
  renderFarmasiRanapTab();
}
function serahkanObatKePerawatRanap(resepId){
  if(!Session.currentUser||!['farmasi','admin'].includes(Session.currentUser.role)){showToast('Distribusi obat hanya dapat dicatat petugas Farmasi atau admin demo.','danger');return;}
  const resep=getResep(resepId); if(!resep)return;
  const a=Store.data.admissions.find(function(x){return x.id===resep.admissionId;}); if(!a)return;
  resep.distribusiStatus='diserahkan'; resep.diserahkanAt=nowISO(); resep.diserahkanOleh=Session.currentUser?Session.currentUser.nama:''; resep.updatedAt=nowISO();
  a.updatedAt=nowISO(); Store.save(); logAudit('serah_obat_ranap',esc(getPatient(a.patientId).nama)+' — obat diserahkan ke unit/perawat'); showToast('Obat diserahkan ke perawat ruang','success'); renderFarmasiRanapTab();
}
function administrasikanObatRanap(resepId){
  if(!Session.currentUser||!['perawat_ranap','admin'].includes(Session.currentUser.role)){showToast('Pencatatan pemberian obat Rawat Inap hanya dapat dilakukan perawat berwenang atau admin demo.','danger');return;}
  const resep=getResep(resepId); if(!resep)return;
  const a=Store.data.admissions.find(function(x){return x.id===resep.admissionId;}); if(!a||a.status!=='dirawat')return;
  resep.status='diambil'; resep.distribusiStatus='diberikan'; resep.diambilAt=nowISO(); resep.diberikanAt=nowISO(); resep.diberikanOleh=Session.currentUser?Session.currentUser.nama:''; resep.updatedAt=nowISO();
  const order=a.orders.find(function(o){return o.resepId===resep.id;}); if(order){order.status='selesai'; order.selesaiAt=nowISO();}
  a.updatedAt=nowISO(); Store.save(); logAudit('pemberian_obat_ranap',esc(getPatient(a.patientId).nama)+' — obat diberikan oleh '+esc(Session.currentUser?Session.currentUser.nama:'')); showToast('Pemberian obat tercatat di eMAR simulasi','success'); renderRanapDetailBody(a);
}

function renderFarmasiSiapTab(){
  const ctx = routeContext(currentRoute()) || 'rawat-jalan';
  const list = Store.data.visits.filter(v=>v.status==='obat_siap' && (ctx==='igd' ? v.unit==='igd' : (v.unit||'rawat-jalan')===ctx) && !!getResepByVisit(v.id)).sort((a,b)=>new Date(a.createdAt||a.tanggal)-new Date(b.createdAt||b.tanggal));
  const area = document.getElementById('farmasi-tab-area');
  if(list.length===0){ area.innerHTML = '<div class="panel"><div class="panel-body"><div class="empty"><div class="big">—</div>Belum ada obat yang menunggu diambil.</div></div></div>'; return; }
  area.innerHTML = '<div class="panel"><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>No. Antrian</th><th>Pasien</th><th>Poli</th><th></th></tr></thead><tbody>'+
    list.map(v=>{ const p = getPatient(v.patientId), poli = getPoli(v.poliId);
      return '<tr><td class="mono" style="font-weight:700">'+v.noAntrian+'</td><td>'+esc(p.nama)+'</td><td>'+esc(poli.nama)+'</td>'+
        '<td><button class="btn btn-success btn-sm" data-serahkan="'+v.id+'">'+(ctx==='igd'?'Catat Pemberian / Penyerahan':'Serahkan Obat')+'</button></td></tr>'; }).join('')+
    '</tbody></table></div></div></div>';
  area.querySelectorAll('[data-serahkan]').forEach(btn=> btn.addEventListener('click', ()=> serahkanObat(btn.dataset.serahkan)));
}
function serahkanObat(visitId){
  if(!Session.currentUser||!['farmasi','admin'].includes(Session.currentUser.role)){showToast('Penyerahan/pemberian obat hanya dapat dicatat petugas Farmasi atau admin demo.','danger');return;}
  const visit=getVisit(visitId);if(!visit){showToast('Kunjungan pasien tidak ditemukan.','danger');return;}
  const resep=getResepByVisit(visitId);if(!resep){showToast('Resep pasien tidak ditemukan; obat tidak dapat diserahkan.','danger');return;}
  if(resep.status!=='disiapkan'){showToast('Resep bukan dalam status siap diserahkan.','warning');return;}
  visit.updatedAt=nowISO();resep.diambilAt=visit.updatedAt;resep.updatedAt=visit.updatedAt;
  const unit=(visit.unit||resep.unit||'rawat-jalan').replace('_','-');
  if(unit==='igd'){
    resep.status='diberikan';resep.diberikanAt=visit.updatedAt;resep.diberikanOleh=Session.currentUser?Session.currentUser.nama:'';
    visit.status='diperiksa';visit.nextStep='Lanjutkan observasi dan keputusan klinis IGD';
    pushNotification('info','Pemberian obat IGD tercatat','Petugas telah mencatat pemenuhan obat pada episode IGD.',visit.patientId,null);
  }else{
    resep.status='diambil';visit.status='selesai';visit.nextStep='Pelayanan Rawat Jalan selesai';
    pushNotification('info','Obat diserahkan','Obat Rawat Jalan telah diserahkan oleh petugas farmasi.',visit.patientId,null);
  }
  Store.save();logAudit('obat_diserahkan',visit.noAntrian+' — '+esc(getPatient(visit.patientId).nama));
  showToast(unit==='igd'?'Pemberian obat IGD tercatat; episode IGD tetap aktif':'Obat Rawat Jalan diserahkan; kunjungan selesai','success');renderFarmasiSiapTab();
}
function renderFarmasiStokTab(){
  const area = document.getElementById('farmasi-tab-area');
  area.innerHTML =
    '<div class="panel"><div class="panel-head"><h2>Tambah Obat Baru</h2></div><div class="panel-body">'+
      '<form id="form-obat-baru" class="field-row3">'+
        '<div class="field"><label>Nama Obat</label><input type="text" id="ob-nama" required></div>'+
        '<div class="field"><label>Kategori</label><input type="text" id="ob-kategori" required></div>'+
        '<div class="field"><label>Satuan</label><input type="text" id="ob-satuan" placeholder="Tablet/Kapsul/Botol" required></div>'+
        '<div class="field"><label>Harga (Rp)</label><input type="number" id="ob-harga" min="0" required></div>'+
        '<div class="field"><label>Stok Awal</label><input type="number" id="ob-stok" min="0" required></div>'+
        '<div class="field" style="display:flex;align-items:flex-end"><button type="submit" class="btn btn-primary btn-block">Tambah</button></div>'+
      '</form></div></div>'+
    '<div class="panel"><div class="panel-head"><h2>Daftar Stok Obat</h2></div><div class="panel-body"><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Kategori</th><th>Satuan</th><th>Harga</th><th>Stok</th><th></th></tr></thead><tbody>'+
      Store.data.medicines.map(m=>'<tr><td>'+esc(m.nama)+'</td><td>'+esc(m.kategori)+'</td><td>'+esc(m.satuan)+'</td><td class="mono">'+formatRupiah(m.harga)+'</td>'+
        '<td class="mono" style="font-weight:700;color:'+(m.stok<LOW_STOCK_THRESHOLD?'var(--brick)':'var(--ink)')+'">'+m.stok+'</td>'+
        '<td><button class="btn btn-outline btn-sm" data-restock="'+m.id+'">+ Stok</button></td></tr>').join('')+
    '</tbody></table></div></div></div>';
  document.getElementById('form-obat-baru').addEventListener('submit', function(e){
    e.preventDefault();
    const namaObat = document.getElementById('ob-nama').value.trim();
    Store.data.medicines.push({id: uid('OBT'), nama: namaObat, kategori: document.getElementById('ob-kategori').value.trim(),
      satuan: document.getElementById('ob-satuan').value.trim(), harga: parseInt(document.getElementById('ob-harga').value)||0, stok: parseInt(document.getElementById('ob-stok').value)||0});
    Store.save();
    logAudit('obat_baru', namaObat);
    showToast('Obat baru ditambahkan', 'success'); renderFarmasiStokTab();
  });
  area.querySelectorAll('[data-restock]').forEach(btn=>{
    btn.addEventListener('click', function(){
      const med = getMedicine(this.dataset.restock);
      const jumlah = prompt('Tambah stok untuk "'+med.nama+'" (stok saat ini: '+med.stok+'). Masukkan jumlah tambahan:');
      const n = parseInt(jumlah);
      if(jumlah!==null && !isNaN(n) && n>0){ med.stok += n; Store.save(); showToast('Stok diperbarui', 'success'); renderFarmasiStokTab(); }
    });
  });
}

/* =================================================================
   MODULE: KASIR
   PENCARIAN KODE: MODUL: KASIR | billing | renderKasir
   Aturan integrasi: transaksi Rawat Jalan, Rawat Inap, dan IGD tidak boleh tertukar konteks.
   ================================================================= */
let kasirTab = 'bayar';
/* =================================================================
   MODUL: KASIR — INTEGRASI PEMBAYARAN RAWAT JALAN
   PENCARIAN KODE: MODUL: RAWAT JALAN | SUBMODUL: KASIR
   Tanggung jawab integrasi: transaksi Rawat Jalan tidak boleh tercampur
   dengan IGD/Rawat Inap; sumber tagihan ditentukan dari visit/admission.
   ================================================================= */
function renderKasir(){
  const ctx = routeContext(currentRoute()) || (Session.currentUser && Session.currentUser.unit) || 'rawat-jalan';
  setPageTitle('Kasir ' + operationalContextLabel(ctx));
  kasirTab = 'bayar';
  document.getElementById('main-content').innerHTML =
    pageIntro(ctx==='rawat-inap' ? 'Kelola tagihan dan pembayaran pasien rawat inap.' : ctx==='igd' ? 'Kelola pembayaran layanan IGD secara terpisah.' : 'Kelola pembayaran pasien rawat jalan/poli secara terpisah.')+
    '<div class="ops-alert" style="margin-bottom:12px"><strong>Unit Aktif:</strong> '+operationalContextLabel(ctx)+' — modul kasir dipisahkan per layanan.</div>'+
    '<div class="tabs"><button class="tab active" data-ktab="bayar">Pembayaran '+(ctx==='rawat-inap'?'Rawat Inap':ctx==='igd'?'IGD':'Rawat Jalan')+'</button>'+
    (ctx==='rawat-inap' ? '<button class="tab" data-ktab="ranap">Tagihan Rawat Inap</button>' : '')+
    '<button class="tab" data-ktab="riwayat">Riwayat Transaksi</button></div>'+
    '<div id="kasir-tab-area"></div>';
  document.querySelectorAll('[data-ktab]').forEach(t=> t.addEventListener('click', ()=> switchKasirTab(t.dataset.ktab)));
  renderKasirBayarTab();
}
function switchKasirTab(tab){
  kasirTab = tab;
  document.querySelectorAll('[data-ktab]').forEach(t=> t.classList.toggle('active', t.dataset.ktab===tab));
  if(tab==='bayar') renderKasirBayarTab();
  else if(tab==='ranap') renderKasirRanapTab();
  else renderKasirRiwayatTab();
}
function computeBilling(visit){
  const registrasi = visit.billing.registrasi||0, konsultasi = visit.billing.konsultasi||0, obat = visit.billing.obat||0, lab = visit.billing.lab||0;
  const subtotal = registrasi + konsultasi + obat + lab;
  let tanggungan = 0;
  if(visit.jenisBayar==='BPJS') tanggungan = subtotal;
  else if(visit.jenisBayar==='Asuransi') tanggungan = Math.round(subtotal*0.8);
  return {registrasi, konsultasi, obat, lab, subtotal, tanggungan, totalBayar: subtotal - tanggungan};
}
function renderKasirBayarTab(){
  const ctx = routeContext(currentRoute()) || 'rawat-jalan';
  const list = visitsToday().filter(v=>v.status==='menunggu_bayar' && (ctx==='igd' ? v.unit==='igd' : (v.unit||'rawat-jalan')==='rawat-jalan')).sort((a,b)=>new Date(a.createdAt)-new Date(b.createdAt));
  const area = document.getElementById('kasir-tab-area');
  if(list.length===0){ area.innerHTML = '<div class="panel"><div class="panel-body"><div class="empty"><div class="big">✓</div>Tidak ada tagihan yang menunggu.</div></div></div>'; return; }
  area.innerHTML = list.map(v=>{
    const p = getPatient(v.patientId), poli = getPoli(v.poliId), b = computeBilling(v);
    return '<div class="panel" style="margin-bottom:10px"><div class="panel-body">'+
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">'+
        '<div><strong>'+esc(p.nama)+'</strong> <span class="mono" style="color:var(--ink-soft)">('+p.id+')</span><br>'+
        '<span style="font-size:13px;color:var(--ink-soft)">'+esc(poli.nama)+' &middot; No. Antrian '+v.noAntrian+' &middot; '+esc(v.jenisBayar)+'</span></div>'+
        '<div class="val mono" style="font-size:20px">'+formatRupiah(b.totalBayar)+'</div>'+
      '</div><button class="btn btn-primary btn-sm" data-bayar="'+v.id+'">Buka Rincian &amp; Proses Bayar</button></div></div>';
  }).join('');
  area.querySelectorAll('[data-bayar]').forEach(btn=> btn.addEventListener('click', ()=> openBayarModal(btn.dataset.bayar)));
}
function openBayarModal(visitId){
  const v = getVisit(visitId), p = getPatient(v.patientId), poli = getPoli(v.poliId), b = computeBilling(v);
  const rincianRows = [['Biaya Registrasi', b.registrasi], ['Konsultasi '+poli.nama, b.konsultasi]];
  if(b.obat) rincianRows.push(['Obat / Farmasi', b.obat]);
  if(b.lab) rincianRows.push(['Pemeriksaan Laboratorium', b.lab]);
  const isBpjsFull = v.jenisBayar==='BPJS';
  openModal(
    '<div class="modal-head"><h2>Rincian Pembayaran</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body"><p style="font-size:13.5px;color:var(--ink-soft)">'+esc(p.nama)+' &middot; No. RM '+p.id+' &middot; '+esc(v.jenisBayar)+'</p>'+
    '<div class="table-wrap"><table>'+
      rincianRows.map(r=>'<tr><td>'+r[0]+'</td><td class="mono" style="text-align:right">'+formatRupiah(r[1])+'</td></tr>').join('')+
      '<tr><td><strong>Subtotal</strong></td><td class="mono" style="text-align:right"><strong>'+formatRupiah(b.subtotal)+'</strong></td></tr>'+
      (b.tanggungan>0 ? '<tr><td>Ditanggung '+esc(v.jenisBayar)+'</td><td class="mono" style="text-align:right;color:var(--sage)">- '+formatRupiah(b.tanggungan)+'</td></tr>' : '')+
      '<tr><td><strong>Total Dibayar Pasien</strong></td><td class="mono" style="text-align:right;font-size:18px"><strong>'+formatRupiah(b.totalBayar)+'</strong></td></tr></table></div>'+
    (v.jenisBayar==='Asuransi' ? '<p class="hint" style="margin-top:8px">*Simulasi tanggungan asuransi 80% — sesuaikan dengan ketentuan polis masing-masing penjamin untuk kebutuhan produksi.</p>' : '')+
    (isBpjsFull ?
      '<button class="btn btn-success btn-block" style="margin-top:14px" id="btn-proses-bayar" data-metode="BPJS">Verifikasi &amp; Selesaikan (Ditanggung BPJS)</button>' :
      '<div class="field" style="margin-top:14px"><label>Metode Pembayaran</label><select id="metode-bayar"><option>Tunai</option><option>Debit</option><option>QRIS</option></select></div>'+
      '<button class="btn btn-primary btn-block" id="btn-proses-bayar">Proses Pembayaran</button>')+
    '</div>'
  );
  document.getElementById('btn-proses-bayar').addEventListener('click', function(){
    const metode = this.dataset.metode || document.getElementById('metode-bayar').value;
    prosesBayar(visitId, metode, rincianRows, b.totalBayar);
  });
}
function prosesBayar(visitId, metode, rincianRows, total){
  const visit = getVisit(visitId);
  const trx = {id:uid('TRX'), visitId, rincian: rincianRows.map(r=>({label:r[0], jumlah:r[1]})), total, metode, createdAt: nowISO()};
  Store.data.transactions.push(trx);
  const rxForVisit=getResepByVisit(visit.id);
  visit.status = (rxForVisit && Array.isArray(rxForVisit.items) && rxForVisit.items.length>0 && ['menunggu','disiapkan'].includes(rxForVisit.status)) ? 'obat_siap' : 'selesai';
  visit.updatedAt = nowISO();
  Store.save();
  logAudit('pembayaran', visit.noAntrian+' — '+esc(getPatient(visit.patientId).nama)+' · '+formatRupiah(total)+' · '+metode);
  closeModal();
  showToast('Pembayaran berhasil diproses', 'success');
  renderKasirBayarTab();
  openInvoiceModal(trx.id);
}
function renderKasirRanapTab(){
  const ctx = routeContext(currentRoute()) || 'rawat-inap';
  const list = ctx==='rawat-inap' ? Store.data.admissions.filter(a=> a.status!=='dirawat' && a.billing.statusBayar==='belum_bayar') : [];
  const area = document.getElementById('kasir-tab-area');
  if(list.length===0){ area.innerHTML = '<div class="panel"><div class="panel-body"><div class="empty"><div class="big">✓</div>Tidak ada tagihan rawat inap yang menunggu.</div></div></div>'; return; }
  area.innerHTML = list.map(function(a){
    const p = getPatient(a.patientId), ward = Store.data.wards.find(w=>w.id===a.wardId), b = computeBillingRanap(a);
    return '<div class="panel" style="margin-bottom:10px"><div class="panel-body">'+
      '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px">'+
      '<div><strong>'+esc(p.nama)+'</strong> <span class="mono" style="color:var(--ink-soft)">('+p.id+')</span><br>'+
      '<span style="font-size:13px;color:var(--ink-soft)">'+esc(ward.nama)+' · '+b.hari+' hari · '+esc(a.jenisBayar)+'</span></div>'+
      '<div class="val mono" style="font-size:20px">'+formatRupiah(b.totalBayar)+'</div></div>'+
      '<button class="btn btn-primary btn-sm" data-bayar-ranap="'+a.id+'">Buka Rincian &amp; Proses Bayar</button></div></div>';
  }).join('');
  area.querySelectorAll('[data-bayar-ranap]').forEach(function(btn){ btn.addEventListener('click', function(){ openBayarRanapModal(this.dataset.bayarRanap); }); });
}
function openBayarRanapModal(admissionId){
  const a = Store.data.admissions.find(x=>x.id===admissionId);
  const p = getPatient(a.patientId), ward = Store.data.wards.find(w=>w.id===a.wardId), b = computeBillingRanap(a);
  const rincianRows = [['Biaya Kamar ('+ward.nama+', '+b.hari+' hari)', b.biayaKamar]];
  if(b.biayaObat) rincianRows.push(['Obat / Farmasi', b.biayaObat]);
  if(b.biayaTindakan) rincianRows.push(['Tindakan', b.biayaTindakan]);
  const isBpjsFull = a.jenisBayar==='BPJS';
  openModal(
    '<div class="modal-head"><h2>Rincian Tagihan Rawat Inap</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body"><p style="font-size:13.5px;color:var(--ink-soft)">'+esc(p.nama)+' &middot; No. RM '+p.id+' &middot; '+esc(a.jenisBayar)+'</p>'+
    '<div class="table-wrap"><table>'+
      rincianRows.map(r=>'<tr><td>'+r[0]+'</td><td class="mono" style="text-align:right">'+formatRupiah(r[1])+'</td></tr>').join('')+
      '<tr><td><strong>Subtotal</strong></td><td class="mono" style="text-align:right"><strong>'+formatRupiah(b.subtotal)+'</strong></td></tr>'+
      (b.tanggungan>0 ? '<tr><td>Ditanggung '+esc(a.jenisBayar)+'</td><td class="mono" style="text-align:right;color:var(--sage)">- '+formatRupiah(b.tanggungan)+'</td></tr>' : '')+
      '<tr><td><strong>Total Dibayar Pasien</strong></td><td class="mono" style="text-align:right;font-size:18px"><strong>'+formatRupiah(b.totalBayar)+'</strong></td></tr></table></div>'+
    (a.jenisBayar==='Asuransi' ? '<p class="hint" style="margin-top:8px">*Simulasi tanggungan asuransi 80%.</p>' : '')+
    (isBpjsFull ?
      '<button class="btn btn-success btn-block" style="margin-top:14px" id="btn-proses-bayar-ranap" data-metode="BPJS">Verifikasi &amp; Selesaikan (Ditanggung BPJS)</button>' :
      '<div class="field" style="margin-top:14px"><label>Metode Pembayaran</label><select id="metode-bayar-ranap"><option>Tunai</option><option>Debit</option><option>QRIS</option></select></div>'+
      '<button class="btn btn-primary btn-block" id="btn-proses-bayar-ranap">Proses Pembayaran</button>')+
    '</div>'
  );
  document.getElementById('btn-proses-bayar-ranap').addEventListener('click', function(){
    const metode = this.dataset.metode || document.getElementById('metode-bayar-ranap').value;
    prosesBayarRanap(admissionId, metode, rincianRows, b.totalBayar);
  });
}
function prosesBayarRanap(admissionId, metode, rincianRows, total){
  const a = Store.data.admissions.find(x=>x.id===admissionId);
  const trx = {id:uid('TRX'), visitId:null, admissionId, rincian: rincianRows.map(r=>({label:r[0], jumlah:r[1]})), total, metode, createdAt: nowISO()};
  Store.data.transactions.push(trx);
  a.billing.statusBayar = 'lunas';
  a.billing.metodeBayar = metode;
  a.updatedAt = nowISO();
  Store.save();
  logAudit('pembayaran_ranap', esc(getPatient(a.patientId).nama)+' · '+formatRupiah(total)+' · '+metode);
  closeModal();
  showToast('Pembayaran rawat inap berhasil diproses', 'success');
  renderKasirRanapTab();
  openInvoiceModal(trx.id);
}
function openInvoiceModal(trxId){
  const trx = Store.data.transactions.find(t=>t.id===trxId);
  const p = trx.visitId ? getPatient(getVisit(trx.visitId).patientId) : getPatient(Store.data.admissions.find(a=>a.id===trx.admissionId).patientId);
  const bodyHtml = '<div id="invoice-content"><h3 style="text-align:center">SIMRS PROTOTYPE</h3><p style="text-align:center;color:var(--ink-soft);font-size:13px">Kwitansi Pembayaran'+(trx.admissionId?' — Rawat Inap':'')+'</p><hr>'+
    '<p>No. Transaksi: <span class="mono">'+trx.id+'</span><br>Pasien: '+esc(p.nama)+' ('+p.id+')<br>Tanggal: '+formatTanggalWaktu(trx.createdAt)+'<br>Metode: '+esc(trx.metode)+'</p>'+
    '<div class="table-wrap"><table>'+trx.rincian.map(r=>'<tr><td>'+r.label+'</td><td class="mono" style="text-align:right">'+formatRupiah(r.jumlah)+'</td></tr>').join('')+
    '<tr><td><strong>Total</strong></td><td class="mono" style="text-align:right"><strong>'+formatRupiah(trx.total)+'</strong></td></tr></table></div></div>';
  openModal('<div class="modal-head"><h2>Kwitansi</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body">'+bodyHtml+'<div style="margin-top:14px;display:flex;gap:8px"><button class="btn btn-outline" id="btn-cetak-invoice">🖶 Cetak</button><button class="btn btn-primary" onclick="closeModal()">Selesai</button></div></div>');
  document.getElementById('btn-cetak-invoice').addEventListener('click', function(){ printArea(document.getElementById('invoice-content').innerHTML); });
}
function renderKasirRiwayatTab(){
  const today = todayStr();
  const trxToday = Store.data.transactions.filter(t=>todayStr(new Date(t.createdAt))===today).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  const total = trxToday.reduce((s,t)=>s+t.total,0);
  const area = document.getElementById('kasir-tab-area');
  area.innerHTML = '<div class="stat" style="max-width:260px;margin-bottom:14px"><div class="lbl">Total Pendapatan Hari Ini</div><div class="val">'+formatRupiah(total)+'</div><div class="sub">'+trxToday.length+' transaksi</div></div>'+
    '<div class="panel"><div class="panel-body">'+(trxToday.length===0 ? '<div class="empty">Belum ada transaksi hari ini.</div>' :
    '<div class="table-wrap"><table><thead><tr><th>No. Transaksi</th><th>Pasien</th><th>Jenis</th><th>Jam</th><th>Metode</th><th>Total</th><th></th></tr></thead><tbody>'+
    trxToday.map(t=>{
      const p = t.visitId ? getPatient(getVisit(t.visitId).patientId) : getPatient(Store.data.admissions.find(a=>a.id===t.admissionId).patientId);
      return '<tr><td class="mono">'+t.id+'</td><td>'+esc(p.nama)+'</td><td>'+(t.admissionId?'🏨 Rawat Inap':'🩺 Rawat Jalan')+'</td><td class="mono">'+formatJam(t.createdAt)+'</td><td>'+esc(t.metode)+'</td>'+
        '<td class="mono">'+formatRupiah(t.total)+'</td><td><button class="btn btn-ghost btn-sm" data-lihat-invoice="'+t.id+'">Lihat</button></td></tr>'; }).join('')+
    '</tbody></table></div>')+'</div></div>';
  area.querySelectorAll('[data-lihat-invoice]').forEach(btn=> btn.addEventListener('click', ()=> openInvoiceModal(btn.dataset.lihatInvoice)));
}

