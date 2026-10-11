/* =================================================================
   MODUL 04 — PENDAFTARAN & BOOKING RAWAT JALAN
   Tanggung jawab: Loket, pendaftaran, booking antrean, check-in QR, dan pengingat H-1.
   Kontrak integrasi: dijalankan sebagai classic script berurutan setelah modul sebelumnya;
   gunakan Store/Session/helper bersama yang sudah didefinisikan. Jangan mengubah urutan pemuatan
   tanpa audit dependensi dan uji alur lintas unit.
   PENCARIAN KODE: modules/04-registration-booking.js
   ================================================================= */

"use strict"; // Pertahankan semantik strict-mode dari app.js monolitik.
/* INDEKS BANTUAN TAHAP 7
 * Modul: PENDAFTARAN & BOOKING RAWAT JALAN
 * Tanggung jawab: Loket, pendaftaran, booking antrean, check-in QR, pengingat H-1.
 * Fungsi yang sering menjadi titik masuk (cari nama fungsi dengan Ctrl+F):
 * - renderPendaftaran
 * - refreshAntrianHariIni
 * - renderCheckInScannerPanel
 * - findBookingByScanValue
 * - renderCheckinResult
 * - confirmPatientCheckin
 * - startCheckinCamera
 * - stopCheckinCamera
 * - bindCheckinScanner
 * - switchPendaftaranTab
 * - formPasienBaru
 * - submitPatientBaru
 * - formCariPasien
 * - doSearchPatient
 * - pilihPasienUntukKunjungan
 * - refreshKjPoli
 * - refreshKjDoctors
 * - getDoctorSchedulesForDate
 * - getDoctorScheduleForUser
 * - getActiveDoctorSchedule
 * - doctorShortCode
 * - poliQueuePrefix
 * - sessionDurationMinutes
 * - sessionCapacity
 * - queueLoadForSession
 * - sessionSortValue
 * - scheduleDoctorUserId
 * - scheduleMatchesDoctor
 * - getSessionCandidates
 * - chooseQueueAllocation
 * - generateNoAntrian
 * - dateOffset
 * - getBooking
 * - expireOldBookings
 * - logAudit
 * - ... dan 36 fungsi lain pada berkas ini.
 * Integrasi: fungsi global/Store dipertahankan untuk kompatibilitas classic script.
 * Catatan: jangan memindahkan fungsi lintas modul tanpa audit pemanggil dan uji alur.
 */

/* =================================================================
   MODULE: PENDAFTARAN
   PENCARIAN KODE: MODUL: PENDAFTARAN | RAWAT JALAN | LOKET
   Tanggung jawab: pencarian identitas, pendaftaran, dan check-in; tidak membuat admisi Rawat Inap otomatis.
   ================================================================= */
let pendaftaranState = { pasienTerpilih:null, mode:'baru' };

/* =================================================================
   MODUL: RAWAT JALAN — PENDAFTARAN / BOOKING / CHECK-IN
   PENCARIAN KODE: MODUL: RAWAT JALAN | SUBMODUL: PENDAFTARAN
   Tanggung jawab: pencarian/registrasi pasien, booking poli, check-in,
   validasi penjamin, dan pembuatan kunjungan. Pertahankan ID pasien,
   booking, dan visit agar integrasi antrean, dokter, farmasi, dan kasir tetap utuh.
   Catatan refaktor: fungsi masih berada di app.js karena banyak handler inline
   menggunakan fungsi global; pemindahan fisik dilakukan setelah dependensi teruji.
   ================================================================= */
function renderPendaftaran(){
  setPageTitle('Pendaftaran');
  const isLoket = Session.currentUser && Session.currentUser.role==='loket';
  pendaftaranState = { pasienTerpilih:null, mode:'baru' };
  document.getElementById('main-content').innerHTML =
    pageIntro((Session.currentUser&&Session.currentUser.role==='loket') ? 'Loket adalah pintu utama registrasi dan check-in. Petugas memverifikasi pasien, menerima pasien lama/baru, memindai QR/barcode, lalu mengaktifkan kunjungan.' : 'Petugas Rawat Jalan menangani pendaftaran langsung ke poli dan pengambilan nomor antrean. Pilih layanan reguler atau eksekutif sebelum mendaftarkan pasien.')+
    (isLoket ? renderCheckInScannerPanel() : '<div class="alert alert-info"><strong>Mode Petugas Rawat Jalan:</strong> gunakan halaman ini untuk pendaftaran langsung. Check-in QR/barcode tetap menjadi tugas Loket.</div>')+
    '<div class="panel"><div class="panel-head"><h2>Data Pasien</h2>'+
      '<div class="tabs" style="border:none;margin:0"><button class="tab active" id="tab-baru" style="padding:4px 10px">Pasien Baru</button><button class="tab" id="tab-lama" style="padding:4px 10px">Pasien Lama</button></div>'+
    '</div><div class="panel-body" id="pendaftaran-pasien-area"></div></div>'+
    '<div id="pendaftaran-kunjungan-area"></div>'+
    '<div class="panel"><div class="panel-head"><h2>Antrian Hari Ini — Semua Poli</h2></div><div class="panel-body" id="antrian-hari-ini-area"></div></div>';
  document.getElementById('tab-baru').addEventListener('click', ()=> switchPendaftaranTab('baru'));
  document.getElementById('tab-lama').addEventListener('click', ()=> switchPendaftaranTab('lama'));
  switchPendaftaranTab('baru');
  refreshAntrianHariIni();
  bindCheckinScanner();
}
function refreshAntrianHariIni(){
  const el = document.getElementById('antrian-hari-ini-area');
  if(el) el.innerHTML = renderAntrianTable(visitsToday());
}
function renderCheckInScannerPanel(){
  return '<section class="panel checkin-panel"><div class="panel-head"><div><div class="ops-eyebrow">CHECK-IN PASIEN</div><h2>📷 Scan QR / Barcode Tiket</h2><div class="hint">Gunakan kamera sebagai cara utama. Input manual tetap tersedia sebagai cadangan bila kamera atau barcode bermasalah.</div></div><span class="badge badge-sage">Loket / Pendaftaran</span></div><div class="panel-body">'+
    '<div class="checkin-grid"><div><div class="scanner-frame"><video id="checkin-camera" playsinline muted></video><div id="checkin-camera-placeholder" class="scanner-placeholder">📷<br><span>Kamera belum aktif</span></div></div><div class="scanner-actions"><button type="button" class="btn btn-primary" id="btn-start-checkin-camera">📷 Buka Kamera</button><button type="button" class="btn btn-ghost hidden" id="btn-stop-checkin-camera">⏹ Hentikan Kamera</button></div><div id="checkin-camera-status" class="hint" style="margin-top:8px">Browser akan meminta izin kamera. Gunakan HTTPS (GitHub Pages) atau localhost.</div></div>'+
    '<div><div class="field"><label>⌨️ Input Manual Kode Booking / Check-in</label><input id="checkin-manual-code" type="text" autocomplete="off" placeholder="Contoh: CHKABC123 atau DEMO-P001-JAN"></div><button type="button" class="btn btn-outline btn-block" id="btn-checkin-manual">🔎 Cari Booking Manual</button><div class="hint" style="margin-top:8px">Cadangan jika kamera tidak tersedia. Bisa memakai kode pada tiket pasien.</div></div></div><div id="checkin-result" style="margin-top:16px"></div></div></section>';
}
let checkinScanner={stream:null,timer:null,detector:null};
function findBookingByScanValue(value){
  const q=String(value||'').trim(); if(!q)return null;
  const exact=Store.data.bookings.find(b=>[b.kodeCheckIn,b.id,b.noAntrian].some(x=>String(x||'').toLowerCase()===q.toLowerCase()));
  if(exact)return exact;
  return Store.data.bookings.find(b=>String(b.kodeCheckIn||'').toLowerCase().includes(q.toLowerCase()))||null;
}
function renderCheckinResult(booking){
  const el=document.getElementById('checkin-result'); if(!el)return;
  if(!booking){el.innerHTML='<div class="alert alert-warning"><strong>Booking tidak ditemukan.</strong><br>Periksa kembali kode QR/barcode atau gunakan input manual sesuai tiket.</div>';return;}
  const p=getPatient(booking.patientId), poli=getPoli(booking.poliId);
  if(!p||!poli){el.innerHTML='<div class="alert alert-warning">Data pasien/poli pada booking tidak lengkap.</div>';return;}
  const already=booking.status==='checked_in' || !!booking.visitId;
  el.innerHTML='<div class="checkin-result-card"><div class="checkin-result-head"><div><div class="ops-eyebrow">BOOKING DITEMUKAN</div><h3>'+esc(p.nama)+'</h3><div class="hint">RM '+esc(p.id)+' · '+esc(poli.nama)+' · '+esc(booking.noAntrian)+'</div></div><span class="badge '+(already?'badge-sage':'badge-amber')+'">'+(already?'SUDAH CHECK-IN':'BELUM CHECK-IN')+'</span></div><div class="checkin-detail-grid"><div><span>Jadwal</span><strong>'+formatTanggalIndo(booking.tanggalKontrol)+'</strong></div><div><span>Penjamin</span><strong>'+esc(booking.jenisBayar)+'</strong></div><div><span>Kode</span><strong class="mono">'+esc(booking.kodeCheckIn)+'</strong></div><div><span>Sumber</span><strong>'+esc(booking.sumber||'Aplikasi RS')+'</strong></div></div>'+
    (already?'<div class="alert alert-info" style="margin-top:12px">Pasien sudah dikonfirmasi hadir. Antrean aktif pada '+esc(poli.nama)+'.</div>':'<button type="button" class="btn btn-primary btn-block" style="margin-top:12px" id="btn-confirm-patient-checkin">✅ Konfirmasi Pasien Hadir / Check-in</button>')+'</div>';
  const btn=document.getElementById('btn-confirm-patient-checkin'); if(btn)btn.addEventListener('click',()=>confirmPatientCheckin(booking.id));
}
function confirmPatientCheckin(bookingId){
  const b=getBooking(bookingId); if(!b){showToast('Booking tidak ditemukan.','danger');return;}
  if(b.status==='dibatalkan'||b.status==='kadaluarsa'){showToast('Booking tidak dapat di-check-in karena statusnya '+bookingStatusLabel(b.status)+'.','danger');return;}
  if(b.visitId){b.status='checked_in';b.confirmedAt=b.confirmedAt||nowISO();b.updatedAt=nowISO();Store.save();renderCheckinResult(b);return;}
  const p=getPatient(b.patientId); const poli=getPoli(b.poliId); if(!p||!poli){showToast('Data booking tidak lengkap.','danger');return;}
  const visit={id:uid('VIS'),patientId:b.patientId,poliId:b.poliId,jenisLayanan:b.jenisLayanan||getPoli(b.poliId)?.layanan||'Rawat Jalan',unit:'rawat-jalan',tanggal:todayStr(),noAntrian:b.noAntrian,status:'menunggu_screening',prioritas:false,keluhan:'',dokterId:b.dokterId||null,sessionId:b.sessionId||null,allocationMode:b.allocationMode||'booking',workflow:{checkInAt:nowISO()},createdAt:nowISO(),updatedAt:nowISO()};
  Store.data.visits.push(visit); b.visitId=visit.id; b.status='checked_in'; b.confirmedAt=nowISO(); b.updatedAt=nowISO();
  Store.save(); logAudit('pasien_checkin',b.noAntrian+' — '+p.nama+' ke '+poli.nama); pushNotification('queue','Check-in berhasil',b.noAntrian+' — Anda sudah check-in di '+poli.nama+'. Silakan ikuti antrean.',b.patientId);
  renderCheckinResult(b); refreshAntrianHariIni(); showToast('Check-in berhasil. Pasien masuk antrean '+poli.nama+'.','success');
}
async function startCheckinCamera(){
  const video=document.getElementById('checkin-camera'), status=document.getElementById('checkin-camera-status');
  if(!video)return;
  if(!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia){if(status)status.textContent='Kamera tidak didukung browser ini. Gunakan input manual.';return;}
  try{
    stopCheckinCamera();
    checkinScanner.stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
    video.srcObject=checkinScanner.stream; await video.play();
    document.getElementById('checkin-camera-placeholder')?.classList.add('hidden');
    document.getElementById('btn-start-checkin-camera')?.classList.add('hidden'); document.getElementById('btn-stop-checkin-camera')?.classList.remove('hidden');
    if('BarcodeDetector' in window){
      checkinScanner.detector=new BarcodeDetector({formats:['qr_code','code_128','code_39','ean_13','ean_8','upc_a','upc_e']});
      status.textContent='Kamera aktif. Arahkan QR/barcode tiket ke kotak kamera.';
      checkinScanner.timer=setInterval(async()=>{if(!checkinScanner.detector||video.readyState<2)return;try{const codes=await checkinScanner.detector.detect(video);if(codes&&codes[0]?.rawValue){const b=findBookingByScanValue(codes[0].rawValue);renderCheckinResult(b);if(b){stopCheckinCamera();}}}catch(e){}},500);
    }else status.textContent='Kamera aktif, tetapi browser belum mendukung pembacaan barcode otomatis. Gunakan input manual sebagai cadangan.';
  }catch(e){if(status)status.textContent='Kamera tidak dapat dibuka ('+e.name+'). Gunakan input manual.';}
}
function stopCheckinCamera(){
  if(checkinScanner.timer){clearInterval(checkinScanner.timer);checkinScanner.timer=null;} if(checkinScanner.stream){checkinScanner.stream.getTracks().forEach(t=>t.stop());checkinScanner.stream=null;} checkinScanner.detector=null;
  const video=document.getElementById('checkin-camera'); if(video)video.srcObject=null;
  document.getElementById('btn-start-checkin-camera')?.classList.remove('hidden'); document.getElementById('btn-stop-checkin-camera')?.classList.add('hidden');
}
function bindCheckinScanner(){
  document.getElementById('btn-start-checkin-camera')?.addEventListener('click',startCheckinCamera);
  document.getElementById('btn-stop-checkin-camera')?.addEventListener('click',stopCheckinCamera);
  document.getElementById('btn-checkin-manual')?.addEventListener('click',()=>renderCheckinResult(findBookingByScanValue(document.getElementById('checkin-manual-code')?.value)));
  document.getElementById('checkin-manual-code')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();document.getElementById('btn-checkin-manual')?.click();}});
}
function switchPendaftaranTab(mode){
  pendaftaranState.mode = mode;
  document.getElementById('tab-baru').classList.toggle('active', mode==='baru');
  document.getElementById('tab-lama').classList.toggle('active', mode==='lama');
  const area = document.getElementById('pendaftaran-pasien-area');
  if(mode==='baru'){
    area.innerHTML = formPasienBaru();
    document.getElementById('form-pasien-baru').addEventListener('submit', submitPatientBaru);
  } else {
    area.innerHTML = formCariPasien();
    document.getElementById('form-cari-pasien').addEventListener('submit', function(e){
      e.preventDefault(); doSearchPatient(document.getElementById('cari-pasien-input').value.trim());
    });
  }
  document.getElementById('pendaftaran-kunjungan-area').innerHTML = '';
}
function formPasienBaru(){
  return '<form id="form-pasien-baru">'+
    '<div class="field-row"><div class="field"><label>NIK (16 digit)</label><input type="text" id="pb-nik" pattern="[0-9]{16}" maxlength="16" required></div>'+
    '<div class="field"><label>Nama Lengkap</label><input type="text" id="pb-nama" required></div></div>'+
    '<div class="field-row3"><div class="field"><label>Jenis Kelamin</label><select id="pb-jk"><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>'+
    '<div class="field"><label>Tanggal Lahir</label><input type="date" id="pb-tgl" required></div>'+
    '<div class="field"><label>Golongan Darah</label><select id="pb-gol"><option value="">-</option><option>A</option><option>B</option><option>AB</option><option>O</option></select></div></div>'+
    '<div class="field"><label>Alamat</label><input type="text" id="pb-alamat" required></div>'+
    '<div class="field-row"><div class="field"><label>No. HP</label><input type="text" id="pb-hp" required></div>'+
    '<div class="field"><label>Riwayat Alergi (jika ada)</label><input type="text" id="pb-alergi" placeholder="contoh: Penisilin"></div></div>'+
    '<button type="submit" class="btn btn-primary">Simpan &amp; Lanjutkan</button></form>';
}
function submitPatientBaru(e){
  e.preventDefault();
  const nik = document.getElementById('pb-nik').value.trim();
  if(!/^\d{16}$/.test(nik)){ showToast('NIK harus 16 digit angka', 'danger'); return; }
  Store.data.meta.rmCounter++;
  const id = 'RM-' + new Date().getFullYear() + '-' + String(Store.data.meta.rmCounter).padStart(4,'0');
  const patient = {
    id, nik, nama: document.getElementById('pb-nama').value.trim(),
    jenisKelamin: document.getElementById('pb-jk').value, tglLahir: document.getElementById('pb-tgl').value,
    golDarah: document.getElementById('pb-gol').value, alamat: document.getElementById('pb-alamat').value.trim(),
    noHp: document.getElementById('pb-hp').value.trim(), alergi: document.getElementById('pb-alergi').value.trim(),
    createdAt: nowISO()
  };
  Store.data.patients.push(patient); Store.save();
  logAudit('pasien_baru', patient.nama+' ('+patient.id+')');
  showToast('Pasien baru tersimpan: '+patient.id, 'success');
  pilihPasienUntukKunjungan(patient.id);
}
function formCariPasien(){
  return '<form id="form-cari-pasien" class="search-row"><input type="text" id="cari-pasien-input" placeholder="Cari berdasarkan NIK, No. RM, atau Nama...">'+
    '<button type="submit" class="btn btn-primary">Cari</button></form><div id="hasil-cari-pasien"></div>';
}
function doSearchPatient(q){
  const el = document.getElementById('hasil-cari-pasien');
  if(!q){ el.innerHTML=''; return; }
  const qLower = q.toLowerCase();
  const results = Store.data.patients.filter(p => p.nik.includes(q) || p.id.toLowerCase().includes(qLower) || p.nama.toLowerCase().includes(qLower));
  if(results.length===0){ el.innerHTML = '<div class="empty">Pasien tidak ditemukan. Silakan gunakan tab "Pasien Baru".</div>'; return; }
  el.innerHTML = '<div class="table-wrap"><table><thead><tr><th>No. RM</th><th>Nama</th><th>NIK</th><th>Tgl Lahir</th><th></th></tr></thead><tbody>'+
    results.map(p=>'<tr><td class="mono">'+p.id+'</td><td>'+esc(p.nama)+'</td><td class="mono">'+maskNik(p.nik)+'</td><td>'+formatTanggalIndo(p.tglLahir)+'</td>'+
      '<td><button class="btn btn-outline btn-sm" data-pick="'+p.id+'">Pilih</button></td></tr>').join('')+'</tbody></table></div>';
  el.querySelectorAll('[data-pick]').forEach(btn=> btn.addEventListener('click', ()=> pilihPasienUntukKunjungan(btn.dataset.pick)));
}
function pilihPasienUntukKunjungan(patientId){
  pendaftaranState.pasienTerpilih = patientId;
  const patient = getPatient(patientId);
  const area = document.getElementById('pendaftaran-kunjungan-area');
  area.innerHTML =
    '<div class="panel"><div class="panel-head"><div><h2>Buat Kunjungan — '+esc(patient.nama)+' <span class="mono" style="font-weight:400;color:var(--ink-soft);font-size:13px">('+patient.id+')</span></h2><div class="hint">Alur pendaftaran langsung mengikuti jenis layanan RS: Reguler/Spesialis atau Eksekutif.</div></div></div>'+
    '<div class="panel-body">'+
      (patient.alergi ? '<div class="allergy-flag">⚠ Riwayat alergi: '+esc(patient.alergi)+'</div>' : '')+
      '<form id="form-kunjungan"><div class="service-choice-grid"><button type="button" class="service-choice active" data-kj-service="Poliklinik Spesialis"><strong>🩺 Poli Reguler</strong><span>Poliklinik Spesialis · alur reguler</span></button><button type="button" class="service-choice" data-kj-service="Poliklinik Eksekutif"><strong>⭐ Poli Eksekutif</strong><span>Layanan eksekutif · jadwal khusus</span></button></div>'+
      '<div class="field-row"><div class="field"><label>Poli Tujuan</label><select id="kj-poli" required></select></div>'+
        '<div class="field hidden" id="kj-dokter-wrap"><label>Pilih Dokter / Sesi Praktik</label><select id="kj-dokter"></select><div class="hint">Pilihan dokter hanya untuk Poli Eksekutif. Poli Reguler menggunakan alokasi dokter/sesi otomatis.</div></div>'+
        '<div class="field"><label>Jenis Pembayaran</label><select id="kj-bayar" required><option value="Umum">Umum (Bayar Sendiri)</option><option value="BPJS">BPJS Kesehatan</option><option value="Asuransi">Asuransi Swasta</option></select></div>'+
      '</div><div id="kj-service-note" class="alert alert-info" style="margin-top:10px"></div><div class="field"><label>Keluhan Utama</label><textarea id="kj-keluhan" required placeholder="contoh: Demam sejak 2 hari, batuk pilek"></textarea></div>'+
      '<div class="field checkbox-row"><input type="checkbox" id="kj-prioritas"><label for="kj-prioritas" style="margin:0">🚩 Tandai prioritas / kondisi gawat darurat (didahulukan di antrian)</label></div>'+
      '<button type="submit" class="btn btn-primary">Daftarkan &amp; Ambil Nomor Antrian</button> <button type="button" class="btn btn-ghost" id="btn-batal-kunjungan">Batal</button></form>'+
      '<div id="tiket-area"></div></div></div>';
  document.getElementById('form-kunjungan').addEventListener('submit', submitKunjungan);
  const kjPoli=document.getElementById('kj-poli'), kjDok=document.getElementById('kj-dokter'), kjDokWrap=document.getElementById('kj-dokter-wrap');
  let kjService='Poliklinik Spesialis';
  function refreshKjPoli(){const options=Store.data.poli.filter(p=>p.official && (kjService==='Poliklinik Spesialis' ? (p.layanan==='Poliklinik Spesialis' || p.layanan==='Rawat Jalan') : p.layanan===kjService)).sort((a,b)=>a.nama.localeCompare(b.nama)); kjPoli.innerHTML=options.map(p=>'<option value="'+p.id+'">'+esc(p.nama)+'</option>').join(''); refreshKjDoctors();}
  function refreshKjDoctors(){const isEx=kjService==='Poliklinik Eksekutif'; kjDokWrap.classList.toggle('hidden',!isEx); kjDok.required=isEx; const list=getDoctorSchedulesForDate(kjPoli.value,todayStr()); if(isEx){kjDok.innerHTML='<option value="AUTO">⚡ Otomatis — sistem memilih sesi yang masih tersedia</option>'+list.map(sc=>{const d=Store.data.users.find(u=>u.doctorMasterId===sc.doctorId)||Store.data.users.find(u=>u.id===sc.doctorId)||doctorMasterById(sc.doctorId);return d?'<option value="'+(d.id||sc.doctorId)+'">'+esc(d.nama)+' · '+esc(sc.jamMulai)+'–'+esc(sc.jamSelesai)+' · '+esc(sc.ruang||'')+'</option>':'';}).join('');}else{kjDok.innerHTML='<option value="AUTO">⚡ Sistem memilih dokter/sesi otomatis</option>';} kjDok.value='AUTO'; const note=document.getElementById('kj-service-note'); if(note){note.innerHTML=isEx?'<strong>Alur Eksekutif:</strong> pasien masuk antrean khusus klinik eksekutif dan hanya dapat dialokasikan ke sesi dokter Eksekutif pada tanggal yang dipilih.':'<strong>Alur Reguler:</strong> pasien masuk antrean Poliklinik Spesialis dan sistem dapat mengalihkan alokasi ke sesi dokter berikutnya dalam poli yang sama bila kuota sesi sebelumnya penuh.';}}
  document.querySelectorAll('[data-kj-service]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-kj-service]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');kjService=btn.dataset.kjService;refreshKjPoli();}));
  kjPoli.addEventListener('change',refreshKjDoctors); refreshKjPoli();
  document.getElementById('btn-batal-kunjungan').addEventListener('click', ()=>{ area.innerHTML=''; pendaftaranState.pasienTerpilih=null; });
}
function getDoctorSchedulesForDate(poliId, dateStr){
  const d=dateStr||todayStr(); const day=new Date(d+'T12:00:00').getDay();
  return Store.data.doctorSchedules.filter(function(sc){return samePoli(sc.poliId,poliId)&&(sc.tanggal===d||(sc.tanggal==null&&sc.hari===day));}).sort(function(a,b){return String(a.jamMulai||'').localeCompare(String(b.jamMulai||''));});
}
function getDoctorScheduleForUser(poliId,doctorId,dateStr){return getDoctorSchedulesForDate(poliId,dateStr).find(function(sc){return sc.doctorId===doctorId || (doctorMasterById(sc.doctorId)&&doctorMasterById(sc.doctorId).linkedUserId===doctorId);})||null;}
function getActiveDoctorSchedule(poliId,atDate){
  const now=atDate||new Date(), list=getDoctorSchedulesForDate(poliId,todayStr(now)), mins=now.getHours()*60+now.getMinutes();
  return list.find(function(sc){const a=String(sc.jamMulai||'00:00').split(':').map(Number),b=String(sc.jamSelesai||'23:59').split(':').map(Number);return mins>=a[0]*60+a[1]&&mins<=b[0]*60+b[1];})||null;
}
function doctorShortCode(doctor){const m=String(doctor&&doctor.nama||'DOK').replace(/^drg?\.\s*/i,'').split(/\s+/);return (m[0]||'DOK').slice(0,3).toUpperCase();}
function poliQueuePrefix(poliId){
  const p=getPoli(poliId); if(p&&p.kode) return String(p.kode).toUpperCase();
  const id=String(poliId||'POLI').toUpperCase().replace(/^(SP|EX)-/,'');
  return id.replace(/[^A-Z0-9]+/g,'').slice(0,5)||'POLI';
}
function sessionDurationMinutes(sc){
  if(!sc||!sc.jamMulai||!sc.jamSelesai) return 0;
  const a=String(sc.jamMulai).split(':').map(Number), b=String(sc.jamSelesai).split(':').map(Number);
  let start=a[0]*60+a[1], end=b[0]*60+b[1]; if(end<start) end+=1440; return Math.max(0,end-start);
}
function sessionCapacity(sc){
  if(sc&&Number(sc.kuota)>0) return Math.max(1,Number(sc.kuota));
  const avg=Number((Store.data.meta.settings||{}).avgConsultMinutes)||12;
  return Math.max(1,Math.floor(sessionDurationMinutes(sc)/Math.max(5,avg)));
}
function queueLoadForSession(poliId,dateStr,sessionId){
  const visits=Store.data.visits.filter(v=>samePoli(v.poliId,poliId)&&v.tanggal===dateStr&&v.sessionId===sessionId&&!['dibatalkan','tidak_hadir'].includes(v.status)).length;
  const bookings=Store.data.bookings.filter(b=>samePoli(b.poliId,poliId)&&b.tanggalKontrol===dateStr&&b.sessionId===sessionId&&!['dibatalkan','kadaluarsa','tidak_hadir'].includes(b.status)).length;
  return {visits,bookings,total:Math.max(visits,bookings)};
}
function sessionSortValue(sc){ return String(sc&&sc.jamMulai||'99:99'); }
function scheduleDoctorUserId(sc){
  if(!sc) return null;
  const master=doctorMasterById(sc.doctorId);
  if(master&&master.linkedUserId) return master.linkedUserId;
  const direct=Store.data.users.find(function(u){return u.id===sc.doctorId;});
  return direct?direct.id:sc.doctorId||null;
}
function scheduleMatchesDoctor(sc,doctorId){
  if(!doctorId) return false;
  return sc.doctorId===doctorId || scheduleDoctorUserId(sc)===doctorId;
}
function getSessionCandidates(poliId,dateStr){ return getDoctorSchedulesForDate(poliId,dateStr).filter(Boolean).sort(function(a,b){return sessionSortValue(a).localeCompare(sessionSortValue(b));}); }
function chooseQueueAllocation(poliId,dateStr,preferredDoctorId){
  let list=getSessionCandidates(poliId,dateStr);
  if(!list.length) return {schedule:null,doctorId:preferredDoctorId||null,reason:'no_schedule'};
  // Untuk pendaftaran hari ini, sesi yang sudah selesai tidak boleh menerima
  // pasien baru. Sesi aktif dan sesi berikutnya tetap boleh dipilih.
  if(dateStr===todayStr()){
    const mins=new Date().getHours()*60+new Date().getMinutes();
    list=list.filter(function(sc){
      const a=String(sc.jamMulai||'00:00').split(':').map(Number), b=String(sc.jamSelesai||'23:59').split(':').map(Number);
      const end=b[0]*60+b[1]; return end>=mins;
    });
    if(!list.length) return {schedule:null,doctorId:null,reason:'closed'};
  }
  const preferred=preferredDoctorId?list.filter(function(sc){return scheduleMatchesDoctor(sc,preferredDoctorId);}):[];
  const pool=preferred.length?preferred:list;
  // Jika dokter pilihan masih punya kapasitas, hormati pilihan. Jika penuh,
  // sistem mencari sesi lain pada poli yang sama secara kronologis.
  for(const sc of pool){ const load=queueLoadForSession(poliId,dateStr,sc.id); if(load.total<sessionCapacity(sc)) return {schedule:sc,doctorId:scheduleDoctorUserId(sc),reason:preferred.length?'preferred':'auto'}; }
  if(preferred.length){
    for(const sc of list){ if(scheduleMatchesDoctor(sc,preferredDoctorId)) continue; const load=queueLoadForSession(poliId,dateStr,sc.id); if(load.total<sessionCapacity(sc)) return {schedule:sc,doctorId:scheduleDoctorUserId(sc),reason:'overflow'}; }
  }
  return {schedule:null,doctorId:null,reason:'full'};
}
function generateNoAntrian(poliId,dateStr){
  dateStr=dateStr||todayStr();
  const canonical=canonicalPoliId(poliId), key=canonical+'-'+dateStr;
  // Satu counter bersama untuk semua kanal simulasi: aplikasi RS, Mobile JKN simulasi, dan loket.
  // Pindai booking/kunjungan yang sudah tersimpan agar nomor dari kanal lain tidak tertimpa
  // ketika counter lokal tertinggal atau data eksternal disinkronkan saat aplikasi berjalan.
  let highest=Number(Store.data.meta.queueCounters[key]||0);
  (Store.data.bookings||[]).forEach(function(b){
    if(canonicalPoliId(b.poliId)===canonical && b.tanggalKontrol===dateStr){
      const n=queueNumberValue(b.noAntrian); if(n!==null) highest=Math.max(highest,n);
    }
  });
  (Store.data.visits||[]).forEach(function(v){
    if(canonicalPoliId(v.poliId)===canonical && (v.tanggal||todayStr())===dateStr){
      const n=queueNumberValue(v.noAntrian); if(n!==null) highest=Math.max(highest,n);
    }
  });
  const n=highest+1; Store.data.meta.queueCounters[key]=n;
  return poliQueuePrefix(poliId)+'-'+String(n).padStart(3,'0');
}
function dateOffset(n){ const d=new Date(); d.setDate(d.getDate()+n); return todayStr(d); }
function getBooking(id){ return Store.data.bookings.find(b=>b.id===id); }
function expireOldBookings(){
  const today = todayStr();
  let changed = false;
  Store.data.bookings.forEach(b=>{
    if(b.status==='terjadwal' && b.tanggalKontrol < today){ b.status = 'kadaluarsa'; changed = true; }
  });
  if(changed) Store.save();
}

/* ---------------- keamanan: audit log, masking, sesi ---------------- */
function logAudit(aksi, detail){
  if(!Store.data.auditLog) Store.data.auditLog = [];
  const u = Session.currentUser;
  Store.data.auditLog.unshift({
    id: uid('LOG'), userName: u ? u.nama : 'Sistem', role: u ? roleLabel(u.role) : '-',
    aksi, detail: detail || '', createdAt: nowISO()
  });
  if(Store.data.auditLog.length > 500) Store.data.auditLog.length = 500;
  Store.save();
}
function maskNik(nik){
  if(!nik || nik.length < 8) return nik || '-';
  return nik.slice(0,4) + '••••••••' + nik.slice(-4);
}
function waLink(noHp, message){
  let digits = (noHp||'').replace(/\D/g,'');
  if(digits.startsWith('0')) digits = '62'+digits.slice(1);
  else if(!digits.startsWith('62')) digits = '62'+digits;
  return 'https://wa.me/'+digits+'?text='+encodeURIComponent(message);
}

const SESSION_TIMEOUT_MS = 15*60*1000;
const SESSION_WARNING_MS = 60*1000;
let _sessionWarnTimer = null, _sessionLogoutTimer = null;
function resetSessionTimer(){
  if(_sessionWarnTimer) clearTimeout(_sessionWarnTimer);
  if(_sessionLogoutTimer) clearTimeout(_sessionLogoutTimer);
  if(!Session.currentUser) return;
  _sessionWarnTimer = setTimeout(showSessionTimeoutWarning, SESSION_TIMEOUT_MS - SESSION_WARNING_MS);
  _sessionLogoutTimer = setTimeout(forceLogoutIdle, SESSION_TIMEOUT_MS);
}
function showSessionTimeoutWarning(){
  if(!Session.currentUser) return;
  openModal(
    '<div class="modal-head"><h2>⏱ Sesi Akan Berakhir</h2></div><div class="modal-body">'+
    '<p>Tidak ada aktivitas selama beberapa saat. Demi keamanan data pasien, sesi ini akan otomatis keluar dalam 1 menit.</p>'+
    '<button class="btn btn-primary btn-block" id="btn-stay-logged-in">Tetap Masuk</button></div>'
  );
  const btn = document.getElementById('btn-stay-logged-in');
  if(btn) btn.addEventListener('click', function(){ closeModal(); resetSessionTimer(); });
}
function forceLogoutIdle(){
  if(!Session.currentUser) return;
  logAudit('logout_otomatis', 'Sesi berakhir karena tidak ada aktivitas selama 15 menit');
  closeModal();
  Session.logout();
  location.hash = '';
  render();
  showToast('Sesi berakhir otomatis karena tidak ada aktivitas', 'warning');
}

let _loginAttempts = {};
function allocateVisitSession(poliId,dateStr,preferredDoctorId){
  const result=chooseQueueAllocation(poliId,dateStr,preferredDoctorId||null);
  if(result.reason==='full') return null;
  return result;
}

function submitKunjungan(e){
  e.preventDefault();
  const poliId = document.getElementById('kj-poli').value;
  const doctorRaw = document.getElementById('kj-dokter') ? document.getElementById('kj-dokter').value : '';
  const doctorId = doctorRaw && doctorRaw!=='AUTO' ? doctorRaw : null;
  const jenisBayar = document.getElementById('kj-bayar').value;
  const layananId = getPoli(poliId)?.layanan || 'Rawat Jalan';
  const keluhan = document.getElementById('kj-keluhan').value.trim();
  const prioritas = document.getElementById('kj-prioritas').checked;
  const noBpjs = document.getElementById('kj-nobpjs') ? document.getElementById('kj-nobpjs').value.trim() : '';
  const patientId = pendaftaranState.pasienTerpilih;
  const poli = getPoli(poliId);
  const allocation = allocateVisitSession(poliId,todayStr(),doctorId);
  if(!allocation){ showToast('Seluruh sesi dokter pada poli ini sudah mencapai kapasitas. Silakan pilih poli/tanggal lain atau gunakan jalur yang ditetapkan petugas.','danger'); return; }
  const schedule = allocation.schedule;
  const effectiveDoctorId = allocation.doctorId;
  const noAntrian = generateNoAntrian(poliId,todayStr());
  const visit = {
    id: uid('KJ'), patientId, tanggal: todayStr(), poliId, jenisLayanan:layananId, dokterId:effectiveDoctorId, sessionId:schedule&&schedule.id||null, allocationMode:allocation.reason, jenisBayar, noBpjs, noAntrian, keluhan,
    status:'menunggu_screening', vital:null, diagnosis:'', catatan:'', labRequest:null, resepId:null, prioritas, screening:null, nextStep:null, communication:[], supportingOrders:[], workflow:{bookedAt:nowISO(),checkinAt:null,screeningAt:null,doctorStartAt:null,supportingAt:null,reviewAt:null,completedAt:null},
    billing:{registrasi:BIAYA_REGISTRASI, konsultasi:0, obat:0, lab:0}, createdAt: nowISO(), updatedAt: nowISO()
  };
  Store.data.visits.push(visit); Store.save();
  logAudit(prioritas?'pendaftaran_prioritas':'pendaftaran', noAntrian+' — '+esc(getPatient(patientId).nama)+' ke '+poli.nama);
  showToast('Kunjungan dibuat — nomor antrian '+noAntrian, 'success');
  const patient = getPatient(patientId);
  document.getElementById('tiket-area').innerHTML =
    '<div class="ticket" style="margin-top:16px"><div class="lbl">NOMOR ANTRIAN — '+esc(poli.nama).toUpperCase()+'</div>'+
    '<div class="num">'+noAntrian+'</div><div class="meta">'+esc(patient.nama)+' &middot; '+formatTanggalWaktu(visit.createdAt)+'</div></div>'+
    '<div style="margin-top:12px;display:flex;gap:8px"><button class="btn btn-outline" id="btn-cetak-tiket">🖶 Cetak Tiket</button>'+
    '<button class="btn btn-ghost" id="btn-daftar-lagi">Daftarkan Pasien Lain</button></div>';
  document.getElementById('btn-cetak-tiket').addEventListener('click', ()=> cetakTiket(visit.id));
  document.getElementById('btn-daftar-lagi').addEventListener('click', renderPendaftaran);
  refreshAntrianHariIni();
}
function cetakTiket(visitId){
  const v = getVisit(visitId), p = getPatient(v.patientId), poli = getPoli(v.poliId);
  printArea('<div style="text-align:center;font-family:monospace;max-width:300px;margin:0 auto"><h2>SIMRS PROTOTYPE</h2><p>Nomor Antrian</p>'+
    '<div style="font-size:48px;font-weight:700;margin:14px 0">'+v.noAntrian+'</div><p>'+esc(poli.nama)+'</p><hr>'+
    '<p style="text-align:left">Nama: '+esc(p.nama)+'<br>No. RM: '+p.id+'<br>Tanggal: '+formatTanggalWaktu(v.createdAt)+'<br>Pembayaran: '+esc(v.jenisBayar)+'</p></div>');
}

/* =================================================================
   MODULE: BOOKING ANTRIAN (BPJS/JKN Mobile simulasi + umum + check-in QR)
   PENCARIAN KODE: MODUL: BOOKING | FUNGSI: ANTREAN | QR CHECK-IN
   Aturan: nomor antrean dan kunjungan tetap terhubung pada identitas pasien yang sama.
   ================================================================= */
let bookingTab = 'jkn';
let bookingSearchPatientId = null;

function renderBooking(){
  setPageTitle('Booking Antrian');
  expireOldBookings();
  bookingTab = 'jkn';
  document.getElementById('main-content').innerHTML =
    pageIntro('Booking kontrol lanjutan hingga 3 hari ke depan — dari sinkronisasi BPJS/JKN Mobile maupun booking mandiri pasien umum — memakai satu urutan nomor antrian yang sama, lalu check-in barcode/QR di hari kunjungan.')+
    '<div class="tabs booking-tabs-grid"><button class="tab active" data-btab="jkn">BPJS / JKN Mobile</button>'+
    '<button class="tab" data-btab="umum">Pasien Umum</button>'+
    '<button class="tab" data-btab="checkin">Check-in Hari Ini</button>'+
    '<button class="tab" data-btab="h1">Pengingat H-1</button></div>'+
    '<div id="booking-tab-area"></div>';
  document.querySelectorAll('[data-btab]').forEach(t=> t.addEventListener('click', ()=> switchBookingTab(t.dataset.btab)));
  renderBookingJknTab();
}
function switchBookingTab(tab){
  bookingTab = tab;
  document.querySelectorAll('[data-btab]').forEach(t=> t.classList.toggle('active', t.dataset.btab===tab));
  if(tab==='jkn') renderBookingJknTab();
  else if(tab==='umum') renderBookingUmumTab();
  else if(tab==='checkin') renderBookingCheckinTab();
  else renderBookingH1Tab();
}
function bookingFormHtml(jenisBayar){
  const isBpjs = jenisBayar==='BPJS';
  return '<form id="form-booking">'+
    '<div class="field"><label>Pasien</label>'+
      '<div class="search-row"><input type="text" id="bk-cari" placeholder="Cari NIK / No. RM / Nama pasien terdaftar…"><button type="button" class="btn btn-outline" id="bk-btn-cari">Cari</button></div>'+
      '<div id="bk-hasil-cari"></div><div id="bk-pasien-terpilih" class="hint"></div>'+
    '</div>'+
    '<div class="service-choice-grid"><button type="button" class="service-choice active" data-bk-service="Poliklinik Spesialis"><strong>🩺 Poli Reguler</strong><span>Poliklinik Spesialis</span></button><button type="button" class="service-choice" data-bk-service="Poliklinik Eksekutif"><strong>⭐ Poli Eksekutif</strong><span>Jadwal & ketentuan khusus</span></button></div>'+
    '<div class="field-row">'+
      '<div class="field"><label>Poli Tujuan</label><select id="bk-poli" required></select></div>'+
      '<div class="field hidden" id="bk-dokter-wrap"><label>Dokter / Sesi Praktik</label><select id="bk-dokter"></select><div class="hint">Pilihan dokter hanya untuk Poli Eksekutif. Poli Reguler menggunakan alokasi dokter/sesi otomatis.</div></div>'+
      '<div class="field"><label>Tanggal Kontrol</label><input type="date" id="bk-tanggal" min="'+dateOffset(0)+'" max="'+dateOffset(7)+'" value="'+dateOffset(1)+'" required></div>'+
    '</div><div id="bk-service-note" class="alert alert-info"></div>'+
    (isBpjs ? '<div class="field"><label>No. Kartu BPJS</label><input type="text" id="bk-nobpjs" placeholder="0001234567890" required></div>' : '')+
    '<button type="submit" class="btn btn-primary" disabled id="btn-submit-booking">'+(isBpjs?'Simulasikan Booking Masuk':'Buat Booking')+'</button>'+
    '</form><div id="bk-confirm"></div>';
}
function bindBookingListActions(){
  document.querySelectorAll('[data-reschedule]').forEach(function(b){ b.addEventListener('click',function(){ rescheduleBooking(this.dataset.reschedule); }); });
  document.querySelectorAll('[data-cancel-booking]').forEach(function(b){ b.addEventListener('click',function(){ cancelBooking(this.dataset.cancelBooking); }); });
  document.querySelectorAll('[data-view-booking]').forEach(function(b){ b.addEventListener('click',function(){ const x=getBooking(this.dataset.viewBooking); if(!x)return; openModal('<div class="modal-head"><h2>Detail Booking '+esc(x.noAntrian)+'</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div><div class="modal-body"><p><strong>Pasien:</strong> '+esc(getPatient(x.patientId).nama)+'<br><strong>Poli:</strong> '+esc(getPoli(x.poliId).nama)+'<br><strong>Layanan:</strong> '+esc(x.jenisLayanan||getPoli(x.poliId).layanan||'Rawat Jalan')+'<br><strong>Tanggal:</strong> '+formatTanggalIndo(x.tanggalKontrol)+'<br><strong>Status:</strong> '+bookingStatusLabel(x.status)+'</p></div>'); }); });
}
function renderBookingJknTab(){
  bookingSearchPatientId = null;
  document.getElementById('booking-tab-area').innerHTML =
    '<div class="alert alert-info">Di lingkungan produksi, data ini akan masuk otomatis lewat API Antrean Online BPJS Kesehatan saat pasien booking dari aplikasi Mobile JKN. Form ini mensimulasikan data yang diterima dari sana untuk keperluan uji alur.</div>'+
    '<div class="panel"><div class="panel-head"><h2>Simulasi Booking Masuk — BPJS / JKN Mobile</h2></div><div class="panel-body">'+bookingFormHtml('BPJS')+'</div></div>'+
    '<div class="panel"><div class="panel-head"><h2>Booking BPJS Terjadwal</h2></div><div class="panel-body" id="bk-list-area">'+renderBookingListHtml('BPJS')+'</div></div>';
  bindBookingFormEvents('BPJS');
  bindBookingListActions();
}
function renderBookingUmumTab(){
  bookingSearchPatientId = null;
  document.getElementById('booking-tab-area').innerHTML =
    '<div class="alert alert-info">Booking mandiri untuk pasien umum, maksimal 3 hari sebelum tanggal kunjungan. Nomor antrian melanjutkan urutan yang sama dengan booking BPJS pada poli &amp; tanggal yang sama — bukan antrian terpisah.</div>'+
    '<div class="panel"><div class="panel-head"><h2>Buat Booking — Pasien Umum</h2></div><div class="panel-body">'+bookingFormHtml('Umum')+'</div></div>'+
    '<div class="panel"><div class="panel-head"><h2>Booking Umum Terjadwal</h2></div><div class="panel-body" id="bk-list-area">'+renderBookingListHtml('Umum')+'</div></div>';
  bindBookingFormEvents('Umum');
  bindBookingListActions();
}
function bindBookingFormEvents(jenisBayar){
  document.getElementById('bk-btn-cari').addEventListener('click', function(){
    const q = document.getElementById('bk-cari').value.trim();
    const qLower = q.toLowerCase();
    const el = document.getElementById('bk-hasil-cari');
    if(!q){ el.innerHTML=''; return; }
    const results = Store.data.patients.filter(p => p.nik.includes(q) || p.id.toLowerCase().includes(qLower) || p.nama.toLowerCase().includes(qLower));
    el.innerHTML = results.length===0 ? '<div class="hint">Pasien tidak ditemukan — daftarkan dulu lewat menu Pendaftaran.</div>' :
      '<div class="chip-row" style="margin-top:8px">'+results.map(p=>'<button type="button" class="chip" data-pid="'+p.id+'">'+esc(p.nama)+' ('+p.id+')</button>').join('')+'</div>';
    el.querySelectorAll('[data-pid]').forEach(b=>{
      b.addEventListener('click', function(){
        bookingSearchPatientId = this.dataset.pid;
        const p = getPatient(bookingSearchPatientId);
        document.getElementById('bk-pasien-terpilih').innerHTML = 'Terpilih: <strong>'+esc(p.nama)+'</strong> ('+p.id+')'+(p.alergi?' &middot; Alergi: '+esc(p.alergi):'');
        document.getElementById('bk-hasil-cari').innerHTML = '';
        document.getElementById('btn-submit-booking').disabled = false;
      });
    });
  });
  const bkPoli=document.getElementById('bk-poli'), bkDate=document.getElementById('bk-tanggal'), bkDok=document.getElementById('bk-dokter'), bkDokWrap=document.getElementById('bk-dokter-wrap');
  let bkService='Poliklinik Spesialis';
  function refreshBkPoli(){const opts=Store.data.poli.filter(p=>p.official&&p.layanan===bkService).sort((a,b)=>a.nama.localeCompare(b.nama));bkPoli.innerHTML=opts.map(p=>'<option value="'+p.id+'">'+esc(p.nama)+'</option>').join('');refreshBkDoctors();}
  function refreshBkDoctors(){const isEx=bkService==='Poliklinik Eksekutif';bkDokWrap.classList.toggle('hidden',!isEx);bkDok.required=isEx;const list=getDoctorSchedulesForDate(bkPoli.value,bkDate.value);if(isEx){bkDok.innerHTML='<option value="AUTO">⚡ Otomatis — sistem memilih dokter/sesi yang masih tersedia</option>'+list.map(sc=>{const d=Store.data.users.find(u=>u.doctorMasterId===sc.doctorId)||Store.data.users.find(u=>u.id===sc.doctorId)||doctorMasterById(sc.doctorId);return d?'<option value="'+(d.id||sc.doctorId)+'">'+esc(d.nama)+' · '+esc(sc.jamMulai)+'–'+esc(sc.jamSelesai)+' · '+esc(sc.ruang||'')+'</option>':'';}).join('');}else{bkDok.innerHTML='<option value="AUTO">⚡ Sistem memilih dokter/sesi otomatis</option>';}bkDok.value='AUTO';const note=document.getElementById('bk-service-note');if(note)note.innerHTML=isEx?'<strong>Eksekutif:</strong> booking dibatasi H-1 atau hari H sesuai jendela sesi dokter; pasien tidak digabung dengan antrean Reguler.':'<strong>Reguler:</strong> booking masuk antrean Poliklinik Spesialis dan dokter/sesi ditentukan otomatis berdasarkan jadwal dan kapasitas.';}
  document.querySelectorAll('[data-bk-service]').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('[data-bk-service]').forEach(x=>x.classList.remove('active'));btn.classList.add('active');bkService=btn.dataset.bkService;refreshBkPoli();}));
  bkPoli.addEventListener('change',refreshBkDoctors); bkDate.addEventListener('change',refreshBkDoctors); refreshBkPoli();
  document.getElementById('form-booking').addEventListener('submit', function(e){ e.preventDefault(); submitBooking(jenisBayar); });
}
function isExecutivePoli(poliId){ const p=getPoli(poliId); return !!(p&&p.layanan==='Poliklinik Eksekutif'); }
function executiveBookingAllowed(poliId,dateStr,doctorId){
  if(!isExecutivePoli(poliId)) return {ok:true};
  const today=todayStr(), tomorrow=dateOffset(1);
  if(dateStr!==today && dateStr!==tomorrow) return {ok:false,message:'Booking Poliklinik Eksekutif mengikuti ketentuan H-1 atau sampai 1 jam sebelum praktik dimulai.'};
  const sessions=getSessionCandidates(poliId,dateStr).filter(function(sc){return !doctorId||sc.doctorId===doctorId;});
  if(!sessions.length) return {ok:false,message:'Belum ada jadwal dokter Eksekutif pada tanggal tersebut.'};
  if(dateStr===tomorrow) return {ok:true};
  const now=new Date(), mins=now.getHours()*60+now.getMinutes();
  const allowed=sessions.some(function(sc){const a=String(sc.jamMulai).split(':').map(Number);return mins < (a[0]*60+a[1]-60);});
  return allowed?{ok:true}:{ok:false,message:'Batas booking Eksekutif untuk sesi dokter yang dipilih sudah lewat. Silakan pilih sesi/dokter lain.'};
}
function submitBooking(jenisBayar){
  if(!bookingSearchPatientId){ showToast('Pilih pasien terlebih dahulu', 'danger'); return; }
  const poliId = document.getElementById('bk-poli').value;
  const tanggalKontrol = document.getElementById('bk-tanggal').value;
  const dokterId = document.getElementById('bk-dokter') ? document.getElementById('bk-dokter').value : null;
  const noBpjs = jenisBayar==='BPJS' ? document.getElementById('bk-nobpjs').value.trim() : '';
  if(jenisBayar==='BPJS' && !noBpjs){ showToast('Isi nomor kartu BPJS', 'danger'); return; }
  if(!tanggalKontrol){ showToast('Pilih tanggal kontrol', 'danger'); return; }
  const execWindow=executiveBookingAllowed(poliId,tanggalKontrol,(dokterId&&dokterId!=='AUTO')?dokterId:null);
  if(!execWindow.ok){ showToast(execWindow.message,'danger'); return; }
  const kuota = totalCapacityForPoliDate(poliId, tanggalKontrol);
  const terjadwal = Store.data.bookings.filter(function(b){ return samePoli(b.poliId,poliId) && b.tanggalKontrol===tanggalKontrol && ['terjadwal','checked_in'].includes(b.status); }).length;
  if(terjadwal >= kuota){ showToast('Seluruh kapasitas sesi dokter pada poli dan tanggal tersebut sudah penuh ('+kuota+' pasien)', 'danger'); return; }
  const preferredDoctorId = isExecutivePoli(poliId) && dokterId && dokterId!=='AUTO' ? dokterId : null;
  const allocation=allocateVisitSession(poliId,tanggalKontrol,preferredDoctorId);
  if(!allocation){showToast('Seluruh sesi dokter pada poli ini sudah penuh untuk tanggal tersebut. Silakan pilih tanggal lain.','danger');return;}
  const schedule = allocation.schedule;
  const assignedDoctorId = allocation.doctorId;
  const noAntrian = generateNoAntrian(poliId,tanggalKontrol);
  const booking = {
    id: uid('BK'), patientId: bookingSearchPatientId, poliId, jenisLayanan:getPoli(poliId)?.layanan||'Rawat Jalan', tanggalKontrol, jenisBayar,
    sumber: jenisBayar==='BPJS' ? 'JKN Mobile (Simulasi)' : 'Aplikasi RS',
    dokterId:assignedDoctorId, sessionId:schedule&&schedule.id||null, allocationMode:allocation.reason,
    noBpjs, noAntrian, kodeCheckIn: uid('CHK').toUpperCase(), status:'terjadwal', visitId:null,
    reminded:false, remindedAt:null, createdAt: nowISO(), updatedAt: nowISO(), cancelReason:'', rescheduledFrom:null
  };
  Store.data.bookings.push(booking);
  pushNotification('booking','Booking baru',booking.noAntrian+' — '+getPatient(booking.patientId).nama,booking.patientId);
  Store.save();
  logAudit('booking_'+jenisBayar.toLowerCase(), noAntrian+' — '+esc(getPatient(bookingSearchPatientId).nama)+' ('+formatTanggalIndo(tanggalKontrol)+')');
  showToast('Booking dibuat — nomor antrian '+noAntrian, 'success');
  const patient = getPatient(bookingSearchPatientId), poli = getPoli(poliId);
  const arrival=suggestedArrivalWindow(booking);
  document.getElementById('bk-confirm').innerHTML =
    '<div class="ticket ticket-compact" style="margin-top:16px"><div class="lbl">BOOKING TERKONFIRMASI — '+esc(poli.nama).toUpperCase()+'</div>'+
    '<div class="num">'+noAntrian+'</div><div class="meta">'+esc(patient.nama)+' · '+formatTanggalIndo(tanggalKontrol)+' · '+jenisBayar+'</div>'+
    (arrival?'<div class="ticket-arrival"><span>⏰ Estimasi kedatangan</span><strong>'+esc(arrival.text)+'</strong><small>Estimasi prototype.</small></div>':'')+
    '<div class="ticket-qr">'+renderQrSvg(booking.kodeCheckIn,130)+'</div><div class="ticket-code">Kode: <span class="mono">'+booking.kodeCheckIn+'</span></div></div>'+
    '<div class="hint ticket-note">Tunjukkan QR ini atau kode check-in saat datang ke loket.</div>';
  document.getElementById('bk-list-area').innerHTML = renderBookingListHtml(jenisBayar);
}
function renderBookingListHtml(jenisBayar){
  const list = Store.data.bookings.filter(function(b){ return b.jenisBayar===jenisBayar; }).sort(function(a,b){ return b.tanggalKontrol.localeCompare(a.tanggalKontrol) || a.noAntrian.localeCompare(b.noAntrian); });
  if(list.length===0) return '<div class="empty">Belum ada booking.</div>';
  return '<div class="table-wrap"><table><thead><tr><th>No. Antrian</th><th>Pasien</th><th>Poli</th><th>Tanggal Kontrol</th><th>Status</th><th>Aksi</th></tr></thead><tbody>'+
    list.map(function(b){
      const p=getPatient(b.patientId), poli=getPoli(b.poliId);
      const canManage = b.status==='terjadwal' && b.tanggalKontrol>=todayStr();
      return '<tr><td class="mono" style="font-weight:700">'+b.noAntrian+'</td><td>'+esc(p.nama)+'</td><td>'+esc(poli.nama)+'</td>'+
        '<td>'+formatTanggalIndo(b.tanggalKontrol)+'</td><td>'+badgeStatus(b.status)+'<div class="booking-state-label">'+bookingStatusLabel(b.status)+'</div></td>'+
        '<td><div class="chip-row">'+
          (canManage?'<button class="btn btn-outline btn-sm" data-reschedule="'+b.id+'">🔄 Ubah</button><button class="btn btn-danger btn-sm" data-cancel-booking="'+b.id+'">Batal</button>':'')+
          (b.status==='checked_in'?'<button class="btn btn-ghost btn-sm" data-view-booking="'+b.id+'">Detail</button>':'')+
        '</div></td></tr>';
    }).join('')+'</tbody></table></div>';
}
function refreshBookingListAfterAction(){
  const area=document.getElementById('bk-list-area');
  if(area) area.innerHTML=renderBookingListHtml(bookingTab==='jkn'?'BPJS':'Umum');
}
function cancelBooking(bookingId){
  const b=getBooking(bookingId);
  if(!b || b.status!=='terjadwal'){ showToast('Booking tidak dapat dibatalkan','danger'); return; }
  openModal('<div class="modal-head"><h2>Batalkan Booking</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body"><p>Batalkan booking <strong>'+esc(b.noAntrian)+'</strong> untuk '+esc(getPatient(b.patientId).nama)+'?</p>'+
    '<div class="field"><label>Alasan pembatalan</label><textarea id="cancel-booking-reason" placeholder="Contoh: pasien meminta perubahan jadwal"></textarea></div>'+
    '<button class="btn btn-danger btn-block" id="btn-confirm-cancel">Batalkan Booking</button></div>');
  document.getElementById('btn-confirm-cancel').addEventListener('click',function(){
    const reason=(document.getElementById('cancel-booking-reason').value||'Tidak disebutkan').trim();
    b.status='dibatalkan'; b.cancelReason=reason; b.updatedAt=nowISO();
    Store.save(); logAudit('booking_dibatalkan',b.noAntrian+' — '+reason); pushNotification('booking','Booking dibatalkan',b.noAntrian+' — '+getPatient(b.patientId).nama,b.patientId);
    closeModal(); refreshBookingListAfterAction(); showToast('Booking dibatalkan','success');
  });
}
function rescheduleBooking(bookingId){
  const b=getBooking(bookingId);
  if(!b || b.status!=='terjadwal'){ showToast('Booking tidak dapat diubah','danger'); return; }
  const poliOptions=Store.data.poli.map(function(p){ return '<option value="'+p.id+'" '+(p.id===b.poliId?'selected':'')+'>'+esc(p.nama)+'</option>'; }).join('');
  openModal('<div class="modal-head"><h2>🔄 Ubah Jadwal Booking</h2><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div>'+
    '<div class="modal-body"><div class="field"><label>Poli</label><select id="rs-poli">'+poliOptions+'</select></div>'+
    '<div class="field"><label>Tanggal baru</label><input type="date" id="rs-tanggal" min="'+todayStr()+'" value="'+esc(b.tanggalKontrol)+'"></div>'+
    '<button class="btn btn-primary btn-block" id="btn-confirm-reschedule">Simpan Jadwal Baru</button></div>');
  document.getElementById('btn-confirm-reschedule').addEventListener('click',function(){
    const poliId=document.getElementById('rs-poli').value, tanggal=document.getElementById('rs-tanggal').value;
    if(!tanggal){ showToast('Pilih tanggal baru','danger'); return; }
    const oldQueue=b.noAntrian, oldDate=b.tanggalKontrol;
    const allocation=allocateVisitSession(poliId,tanggal,b.dokterId||null);
    if(!allocation){showToast('Tidak ada sesi dokter yang masih memiliki kapasitas pada tanggal tersebut.','danger');return;}
    b.poliId=poliId; b.tanggalKontrol=tanggal; b.noAntrian=generateNoAntrian(poliId,tanggal); b.dokterId=allocation.doctorId; b.sessionId=allocation.schedule&&allocation.schedule.id||null; b.allocationMode=allocation.reason; b.status='terjadwal'; b.rescheduledFrom=oldQueue; b.updatedAt=nowISO();
    Store.save(); logAudit('booking_reschedule',oldQueue+' → '+b.noAntrian+' ('+formatTanggalIndo(tanggal)+')'); pushNotification('booking','Jadwal diperbarui',b.noAntrian+' — '+getPatient(b.patientId).nama,b.patientId);
    closeModal(); refreshBookingListAfterAction(); showToast('Booking berhasil dijadwalkan ulang','success');
  });
}
function markBookingNoShow(bookingId){
  const b=getBooking(bookingId);
  if(!b || b.status!=='terjadwal' || b.tanggalKontrol!==todayStr()){ showToast('Hanya booking hari ini yang dapat ditandai tidak hadir','danger'); return; }
  b.status='tidak_hadir'; b.updatedAt=nowISO(); Store.save(); logAudit('booking_tidak_hadir',b.noAntrian+' — '+getPatient(b.patientId).nama);
  showToast('Booking ditandai tidak hadir','warning');
}

function renderBookingCheckinTab(){
  const today = todayStr();
  const list = Store.data.bookings.filter(b=>b.tanggalKontrol===today && b.status==='terjadwal').sort((a,b)=>a.noAntrian.localeCompare(b.noAntrian));
  document.getElementById('booking-tab-area').innerHTML =
    '<div style="margin-bottom:14px"><button class="btn btn-primary" id="btn-open-scan">📷 Scan QR Pasien</button></div>'+
    '<div class="panel"><div class="panel-head"><h2>Jadwal Kontrol Hari Ini ('+list.length+')</h2></div><div class="panel-body" id="bk-checkin-list"></div></div>';
  document.getElementById('btn-open-scan').addEventListener('click', openScanSheet);
  renderCheckinList(list);
}
function renderCheckinList(list){
  const el = document.getElementById('bk-checkin-list');
  if(!el) return;
  if(list.length===0){ el.innerHTML = '<div class="empty"><div class="big">—</div>Tidak ada jadwal kontrol untuk hari ini.</div>'; return; }
  el.innerHTML = list.map(b=>{
    const p = getPatient(b.patientId), poli = getPoli(b.poliId);
    return '<div class="queue-list-item" style="cursor:default">'+
      '<div><div class="no">'+b.noAntrian+'</div><div class="nm">'+esc(p.nama)+' · '+esc(poli.nama)+'</div></div>'+
      '<div style="display:flex;align-items:center;gap:8px">'+
        '<span class="badge '+(b.jenisBayar==='BPJS'?'badge-slate':'badge-amber')+'">'+b.jenisBayar+'</span>'+
        '<button class="btn btn-success btn-sm" data-checkin="'+b.id+'">Check-in</button>'+
        '<button class="btn btn-outline btn-sm" data-noshow="'+b.id+'">Tidak Hadir</button>'+
      '</div></div>';
  }).join('');
  el.querySelectorAll('[data-checkin]').forEach(btn=> btn.addEventListener('click', ()=> doCheckIn(btn.dataset.checkin)));
  el.querySelectorAll('[data-noshow]').forEach(btn=> btn.addEventListener('click', ()=> markBookingNoShow(btn.dataset.noshow)));
}
function doCheckIn(bookingId){
  const booking = getBooking(bookingId);
  if(!booking || booking.status!=='terjadwal'){ showToast('Booking tidak valid atau sudah diproses', 'danger'); return; }
  const visit = {
    id: uid('KJ'), patientId: booking.patientId, tanggal: todayStr(), poliId: booking.poliId, jenisLayanan:booking.jenisLayanan||getPoli(booking.poliId)?.layanan||'Rawat Jalan', dokterId:booking.dokterId||null, sessionId:booking.sessionId||null,
    jenisBayar: booking.jenisBayar, noBpjs: booking.noBpjs||'', noAntrian: booking.noAntrian,
    keluhan:'Kontrol terjadwal ('+booking.sumber+')', status:'menunggu_screening', vital:null, diagnosis:'', catatan:'',
    labRequest:null, resepId:null, billing:{registrasi:BIAYA_REGISTRASI, konsultasi:0, obat:0, lab:0},
    bookingId: booking.id, unit:'rawat-jalan', workflow:{bookedAt:booking.createdAt||null,checkinAt:null,screeningAt:null,doctorStartAt:null,supportingAt:null,reviewAt:null,completedAt:null}, createdAt: nowISO(), updatedAt: nowISO()
  };
  Store.data.visits.push(visit);
  booking.status = 'checked_in';
  booking.visitId = visit.id;
  visit.workflow.checkinAt = nowISO();
  booking.updatedAt = nowISO();
  pushNotification('queue','Check-in berhasil',booking.noAntrian+' — '+getPatient(booking.patientId).nama,booking.patientId);
  Store.save();
  logAudit('checkin', booking.noAntrian+' — '+esc(getPatient(booking.patientId).nama));
  showToast('Check-in berhasil — '+esc(getPatient(booking.patientId).nama)+' masuk antrian '+booking.noAntrian, 'success');
  const list = Store.data.bookings.filter(b=>b.tanggalKontrol===todayStr() && b.status==='terjadwal').sort((a,b)=>a.noAntrian.localeCompare(b.noAntrian));
  renderCheckinList(list);
  const heading = document.querySelector('#booking-tab-area .panel-head h2');
  if(heading) heading.textContent = 'Jadwal Kontrol Hari Ini ('+list.length+')';
}

let _scanStream = null, _scanRAF = null;
function openScanSheet(){
  document.getElementById('modal-root').innerHTML =
    '<div class="sheet-overlay" id="modal-overlay"><div class="bottom-sheet">'+
      '<div class="sheet-handle"></div>'+
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:0 4px 10px"><h2>Scan QR Check-in</h2><button class="btn btn-ghost btn-icon" id="btn-close-scan">✕</button></div>'+
      '<div id="scan-status" class="alert alert-info">Mengaktifkan kamera…</div>'+
      '<video id="scan-video" autoplay playsinline muted style="width:100%;border-radius:16px;background:#000;max-height:300px;object-fit:cover"></video>'+
      '<div class="field" style="margin-top:14px"><label>Atau masukkan kode manual</label>'+
        '<div style="display:flex;gap:8px"><input type="text" id="scan-manual-code" placeholder="Kode check-in"><button type="button" class="btn btn-primary" id="btn-scan-manual-submit">Cek</button></div></div>'+
    '</div></div>';
  document.getElementById('modal-overlay').addEventListener('click', function(e){ if(e.target.id==='modal-overlay') stopScanAndClose(); });
  document.getElementById('btn-close-scan').addEventListener('click', stopScanAndClose);
  document.getElementById('btn-scan-manual-submit').addEventListener('click', function(){
    attemptCheckInByCode(document.getElementById('scan-manual-code').value.trim());
  });
  startCameraScan();
}
async function startCameraScan(){
  const statusEl = document.getElementById('scan-status');
  if(!('BarcodeDetector' in window)){
    statusEl.className = 'alert alert-warning';
    statusEl.textContent = 'Kamera scan tidak didukung browser ini. Gunakan input kode manual di bawah.';
    const v = document.getElementById('scan-video'); if(v) v.classList.add('hidden');
    return;
  }
  try{
    _scanStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});
    const video = document.getElementById('scan-video');
    if(!video){ _scanStream.getTracks().forEach(t=>t.stop()); return; }
    video.srcObject = _scanStream;
    statusEl.textContent = 'Arahkan kamera ke QR pasien…';
    const detector = new BarcodeDetector({formats:['qr_code']});
    const loop = async function(){
      if(!document.getElementById('scan-video')) return;
      try{
        const codes = await detector.detect(video);
        if(codes.length){ const val = codes[0].rawValue; stopScanAndClose(); attemptCheckInByCode(val); return; }
      }catch(e){}
      _scanRAF = requestAnimationFrame(loop);
    };
    _scanRAF = requestAnimationFrame(loop);
  }catch(err){
    statusEl.className = 'alert alert-danger';
    statusEl.textContent = 'Tidak bisa mengakses kamera ('+err.message+'). Gunakan input kode manual.';
  }
}
function stopScanAndClose(){
  if(_scanRAF) cancelAnimationFrame(_scanRAF);
  if(_scanStream) _scanStream.getTracks().forEach(t=>t.stop());
  _scanStream = null; _scanRAF = null;
  closeModal();
}
function attemptCheckInByCode(code){
  if(!code){ showToast('Masukkan atau scan kode terlebih dahulu', 'danger'); return; }
  const booking = Store.data.bookings.find(b=>b.kodeCheckIn===code.toUpperCase().trim() && b.status==='terjadwal');
  if(!booking){ showToast('Kode tidak ditemukan atau sudah check-in', 'danger'); return; }
  if(booking.tanggalKontrol !== todayStr()){ showToast('Jadwal booking ini untuk '+formatTanggalIndo(booking.tanggalKontrol)+', bukan hari ini', 'danger'); return; }
  doCheckIn(booking.id);
}

/* ---------------- Pengingat H-1 ---------------- */
function renderBookingH1Tab(){
  const besok = dateOffset(1);
  const list = Store.data.bookings.filter(b=>b.tanggalKontrol===besok && b.status==='terjadwal').sort((a,b)=>a.noAntrian.localeCompare(b.noAntrian));
  const notifSupported = 'Notification' in window;
  const notifStatus = notifSupported ? Notification.permission : 'unsupported';
  document.getElementById('booking-tab-area').innerHTML =
    '<div class="alert alert-info">Daftar pasien dengan jadwal kontrol besok ('+formatTanggalIndo(besok)+'). Aplikasi statis ini tidak bisa mengirim notifikasi ke HP pasien saat aplikasi tertutup — gunakan tombol WhatsApp untuk mengingatkan langsung, atau aktifkan notifikasi di perangkat staf sebagai pengingat internal.</div>'+
    (notifSupported ?
      '<div style="margin-bottom:14px"><button class="btn btn-outline btn-sm" id="btn-enable-notif">🔔 '+(notifStatus==='granted'?'Notifikasi Aktif':'Aktifkan Notifikasi Pengingat')+'</button></div>' : '')+
    '<div class="panel"><div class="panel-head"><h2>Pengingat H-1 ('+list.length+')</h2></div><div class="panel-body" id="h1-list"></div></div>';
  const notifBtn = document.getElementById('btn-enable-notif');
  if(notifBtn) notifBtn.addEventListener('click', function(){
    if(Notification.permission==='granted'){ checkAndNotifyH1(true); return; }
    Notification.requestPermission().then(function(perm){
      if(perm==='granted'){ showToast('Notifikasi diaktifkan', 'success'); checkAndNotifyH1(true); renderBookingH1Tab(); }
      else showToast('Izin notifikasi ditolak browser', 'warning');
    });
  });
  renderH1List(list);
}
function renderH1List(list){
  const el = document.getElementById('h1-list');
  if(!el) return;
  if(list.length===0){ el.innerHTML = '<div class="empty"><div class="big">—</div>Tidak ada jadwal kontrol besok.</div>'; return; }
  el.innerHTML = list.map(b=>{
    const p = getPatient(b.patientId), poli = getPoli(b.poliId);
    const pesan = 'Halo '+p.nama+', mengingatkan jadwal kontrol Anda besok ('+formatTanggalIndo(b.tanggalKontrol)+') di '+poli.nama+' SIMRS PROTOTYPE, nomor antrian '+b.noAntrian+'. Mohon datang tepat waktu. Terima kasih.';
    return '<div class="queue-list-item" style="cursor:default"><div><div class="no">'+b.noAntrian+'</div><div class="nm">'+esc(p.nama)+' · '+esc(poli.nama)+
      (b.reminded ? ' · <span style="color:var(--sage)">✓ sudah diingatkan</span>' : '')+'</div></div>'+
      '<a class="btn btn-success btn-sm" href="'+waLink(p.noHp, pesan)+'" target="_blank" rel="noopener" data-remind="'+b.id+'">📱 WhatsApp</a></div>';
  }).join('');
  el.querySelectorAll('[data-remind]').forEach(a=> a.addEventListener('click', function(){ tandaiDiingatkan(this.dataset.remind); }));
}
function tandaiDiingatkan(bookingId){
  const b = getBooking(bookingId);
  if(!b) return;
  b.reminded = true; b.remindedAt = nowISO();
  Store.save();
  logAudit('pengingat_h1', b.noAntrian+' — '+esc(getPatient(b.patientId).nama)+' diingatkan via WhatsApp');
  setTimeout(function(){ if(bookingTab==='h1') renderBookingH1Tab(); }, 400);
}
function checkAndNotifyH1(manual){
  if(!('Notification' in window) || Notification.permission!=='granted') return;
  const besok = dateOffset(1);
  const belum = Store.data.bookings.filter(b=>b.tanggalKontrol===besok && b.status==='terjadwal' && !b.reminded);
  if(belum.length===0){ if(manual) showToast('Tidak ada pasien besok yang belum diingatkan', 'success'); return; }
  new Notification('Pengingat Kontrol H-1', {
    body: belum.length+' pasien punya jadwal kontrol besok dan belum diingatkan.',
    icon: 'icon-192.png'
  });
}

