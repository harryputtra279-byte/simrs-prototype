/* =================================================================
   MODUL 03 — APLIKASI PASIEN
   Tanggung jawab: Dashboard pasien, booking sisi pasien, tiket/barcode, riwayat, notifikasi, dan perjalanan layanan.
   Kontrak integrasi: dijalankan sebagai classic script berurutan setelah modul sebelumnya;
   gunakan Store/Session/helper bersama yang sudah didefinisikan. Jangan mengubah urutan pemuatan
   tanpa audit dependensi dan uji alur lintas unit.
   PENCARIAN KODE: modules/03-patient-app.js
   ================================================================= */

"use strict"; // Pertahankan semantik strict-mode dari app.js monolitik.
/* INDEKS BANTUAN TAHAP 7
 * Modul: APLIKASI PASIEN
 * Tanggung jawab: Dashboard pasien, booking, tiket/barcode, riwayat, notifikasi, dan perjalanan layanan.
 * Fungsi yang sering menjadi titik masuk (cari nama fungsi dengan Ctrl+F):
 * - getPatientActiveIgdVisit
 * - getPatientActiveVisit
 * - getPatientActiveJourney
 * - queueNumberValue
 * - getPatientQueueState
 * - maybeNotifyPatientQueue
 * - addDaysISODate
 * - patientBookingWindowValid
 * - patientBookingWindowHint
 * - patientBookingMaxDate
 * - patientBookings
 * - doctorMasterForSchedule
 * - patientDoctorOptions
 * - doctorLabelForSchedule
 * - patientScheduleList
 * - buildExecutiveTimeSlots
 * - renderPatientBooking
 * - refreshPoli
 * - refreshDoctors
 * - refreshTimes
 * - renderPatientBookingSaya
 * - renderPatientRiwayat
 * - renderPatientInfo
 * - renderPatientChat
 * - renderStaffPatientChat
 * - renderHospitalInformationAdmin
 * - submitPatientBooking
 * - renderPatientBookingList
 * - cancelPatientBooking
 * - getPatientBookingById
 * - bookingDoctorMaster
 * - openPatientBookingTicket
 * - downloadPatientTicket
 * - printPatientTicket
 * - getPatientActiveAdmission
 * - ... dan 22 fungsi lain pada berkas ini.
 * Integrasi: fungsi global/Store dipertahankan untuk kompatibilitas classic script.
 * Catatan: jangan memindahkan fungsi lintas modul tanpa audit pemanggil dan uji alur.
 */

/* =====================================================================
   PENCARIAN KODE: MODUL APLIKASI PASIEN — STATUS LAYANAN & PERJALANAN
   Tanggung jawab: merangkum kunjungan/episode aktif untuk tampilan pasien.
   Batasan: fungsi tampilan pasien tidak boleh membuat episode klinis baru.
   Integrasi: Rawat Jalan, IGD, Rawat Inap, dan status pelayanan terkait.
   Catatan: pertahankan ID pasien/kunjungan/admission saat merapikan bagian ini.
   ===================================================================== */
function getPatientActiveIgdVisit(patientId){
  const active=['menunggu_triase','menunggu_poli','dipanggil','observasi','menunggu_screening','screening','menunggu_dokter','diperiksa','menunggu_lab','menunggu_penunjang','menunggu_review','menunggu_farmasi','obat_siap','menunggu_bayar','menunggu_rujukan_igd','rujuk_ranap','proses_pulang'];
  return Store.data.visits.filter(function(v){return v.patientId===patientId&&v.unit==='igd'&&active.includes(v.status);}).sort(function(a,b){return new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt);})[0]||null;
}
function getPatientActiveVisit(patientId){
  const activeStatuses=['menunggu_triase','observasi','menunggu_screening','screening','menunggu_dokter','dipanggil','diperiksa','menunggu_lab','menunggu_penunjang','menunggu_review','menunggu_farmasi','menunggu_bayar','obat_siap','menunggu_rujukan_igd','rujuk_ranap'];
  const list=Store.data.visits.filter(function(v){
    if(v.patientId!==patientId || (v.unit||'rawat-jalan')!=='rawat-jalan' || ['dibatalkan','tidak_hadir'].includes(v.status)) return false;
    const resep=getResepByVisit(v.id);
    const resepMasihBerjalan=!!(resep && ['menunggu','disiapkan'].includes(resep.status));
    return activeStatuses.includes(v.status) || resepMasihBerjalan;
  });
  return list.sort(function(a,b){return new Date(b.updatedAt||b.createdAt||b.tanggal)-new Date(a.updatedAt||a.createdAt||a.tanggal);})[0] || null;
}

function getPatientActiveJourney(patientId){
  // Satu perjalanan utama per pasien. Prioritas mengikuti episode yang benar-benar aktif,
  // bukan tombol/menu terakhir yang dibuka pasien.
  const admission=getPatientActiveAdmission(patientId);
  if(admission) return {unit:'rawat-inap',episode:admission};
  const igd=getPatientActiveIgdVisit(patientId);
  if(igd) return {unit:'igd',episode:igd};
  const visit=getPatientActiveVisit(patientId);
  if(visit) return {unit:'rawat-jalan',episode:visit};
  return null;
}
function queueNumberValue(no){ const m=String(no||'').match(/(\d+)$/); return m?parseInt(m[1],10):null; }
function getPatientQueueState(visit){
  if(!visit) return null;
  const all=visitsToday().filter(function(v){return samePoli(v.poliId,visit.poliId) && v.unit==='rawat-jalan' && !['tidak_hadir','dibatalkan'].includes(v.status);});
  const mine=queueNumberValue(visit.noAntrian);
  const servedStatuses=['menunggu_lab','menunggu_penunjang','menunggu_review','menunggu_farmasi','menunggu_bayar','obat_siap','selesai'];
  const served=all.filter(function(v){ const n=queueNumberValue(v.noAntrian); return n!==null && mine!==null && n<mine && servedStatuses.includes(v.status); });
  const active=all.filter(function(v){return ['diperiksa','dipanggil'].includes(v.status);}).sort(function(a,b){
    const rank=function(v){return v.status==='diperiksa'?0:1;};
    return rank(a)-rank(b) || (queueNumberValue(a.noAntrian)||999999)-(queueNumberValue(b.noAntrian)||999999);
  })[0] || null;
  const activeNo=queueNumberValue(active && active.noAntrian);
  const aheadList=all.filter(function(v){
    const n=queueNumberValue(v.noAntrian);
    return n!==null && mine!==null && n<mine && !servedStatuses.includes(v.status) && v.id!==visit.id;
  });
  const ahead=aheadList.length;
  const waitingAfter=all.filter(function(v){
    const n=queueNumberValue(v.noAntrian);
    return n!==null && mine!==null && n>mine && !servedStatuses.includes(v.status);
  });
  const currentNo=activeNo!==null ? active.noAntrian : (aheadList[0]?aheadList.sort(function(a,b){return (queueNumberValue(a.noAntrian)||999999)-(queueNumberValue(b.noAntrian)||999999);})[0].noAntrian:'—');
  return {list:all,mine:mine,active:active,currentNo:currentNo,ahead:ahead,waitingBefore:aheadList.length,servedCount:served.length,waitingAfter:waitingAfter.length,total:all.length};
}
function maybeNotifyPatientQueue(){
  const u=Session.currentUser;
  if(!u || u.role!=='pasien' || !u.patientId) return;
  const activeJourney=getPatientActiveJourney(u.patientId);
  if(!activeJourney||activeJourney.unit!=='rawat-jalan') return;
  const v=activeJourney.episode; if(!v) return;
  const q=getPatientQueueState(v); if(!q) return;
  const ahead=q.ahead;
  if(ahead<=3 && ahead>=0 && !['selesai','menunggu_farmasi','menunggu_bayar','obat_siap'].includes(v.status)){
    const key='queue-alert-'+v.id+'-'+ahead;
    const sent=JSON.parse(localStorage.getItem('simrs_patient_alerts_v1')||'{}');
    if(!sent[key]){
      const poli=getPoli(v.poliId);
      const body=ahead===0 ? 'Nomor Anda sedang dipanggil. Silakan segera menuju '+poli.nama+'.' : 'Antrean Anda '+v.noAntrian+'. Tinggal '+ahead+' pasien lagi. Mohon segera menuju '+poli.nama+' agar tidak terlewat.';
      pushNotification('queue','⏰ Giliran Anda semakin dekat',body,u.patientId,u.id);
      sent[key]=Date.now(); localStorage.setItem('simrs_patient_alerts_v1',JSON.stringify(sent));
      if('Notification' in window && Notification.permission==='granted'){
        try{ new Notification('SIMRS — '+poli.nama,{body:body,tag:key}); }catch(e){}
      }
    }
  }
}
function addDaysISODate(dateStr, days){ const d=new Date(dateStr+'T00:00:00'); d.setDate(d.getDate()+days); return todayStr(d); }
function patientBookingWindowValid(tanggal, layanan, now){
  now=now instanceof Date?now:new Date();
  const today=todayStr(now), h3=addDaysISODate(today,3);
  if(!tanggal) return false;
  const isExecutive=layanan==='Poliklinik Eksekutif';
  // Pembukaan tanggal H+3 mengikuti pola Mobile JKN: mulai pukul 00.01 WIB.
  if(tanggal===h3 && (now.getHours()*60+now.getMinutes())<1) return false;
  if(isExecutive){
    if(tanggal<today || tanggal>h3) return false;
    // Booking eksekutif hari H masih dibuka sampai tepat pukul 12.00 WIB.
    if(tanggal===today && (now.getHours()*60+now.getMinutes())>12*60) return false;
    return true;
  }
  // Reguler: hanya H-1, H-2, dan H-3; hari H wajib melalui petugas loket.
  return tanggal>=addDaysISODate(today,1) && tanggal<=h3;
}
function patientBookingWindowHint(layanan){
  if(layanan==='Poliklinik Eksekutif') return 'Booking dibuka mulai 00.01 WIB pada H-3 sampai H-1. Hari H dapat dipesan online hingga pukul 12.00 WIB, hanya jika jadwal dokter dan kuota masih tersedia. Anda boleh memilih dokter.';
  return 'Booking online hanya untuk H-1, H-2, atau H-3 dan dibuka mulai 00.01 WIB pada H-3. Hari H wajib mendaftar langsung di loket; dokter ditentukan otomatis oleh sistem.';
}
function patientBookingMaxDate(now){
  now=now instanceof Date?now:new Date();
  return addDaysISODate(todayStr(now),3);
}
function patientBookings(patientId){
  return Store.data.bookings.filter(function(b){return b.patientId===patientId;}).sort(function(a,b){return b.tanggalKontrol.localeCompare(a.tanggalKontrol)||a.noAntrian.localeCompare(b.noAntrian);});
}
/* doctorMasterForSchedule() didefinisikan satu kali pada MODUL 01 sebagai helper bersama. */

function patientDoctorOptions(poliId,tanggal, layanan){
  const list=getDoctorSchedulesForDate(poliId,tanggal);
  const seen={};
  return list.filter(function(sc){
    const did=scheduleDoctorUserId(sc); if(!did || seen[did]) return false;
    seen[did]=true; return true;
  }).map(function(sc){
    const d=doctorMasterForSchedule(sc); if(!d) return '';
    return '<option value="'+esc(String(scheduleDoctorUserId(sc)))+'">'+esc(d.nama||'Dokter')+'</option>';
  }).join('');
}
function doctorLabelForSchedule(sc){
  const d=doctorMasterForSchedule(sc); return d ? (d.nama||'Dokter') : 'Dokter';
}
function patientScheduleList(poliId,tanggal,doctorId, layanan){
  if(!poliId || !tanggal || layanan!=='Poliklinik Eksekutif') return [];
  return getDoctorSchedulesForDate(poliId,tanggal).filter(function(sc){
    return scheduleMatchesDoctor(sc,doctorId);
  }).filter(function(sc){
    const load=queueLoadForSession(poliId,tanggal,sc.id);
    return load.total<sessionCapacity(sc);
  });
}
function buildExecutiveTimeSlots(poliId,tanggal,doctorId){
  const sessions=patientScheduleList(poliId,tanggal,doctorId,'Poliklinik Eksekutif');
  const slots=[];
  sessions.forEach(function(sc){
    const parts=String(sc.jamMulai||'00:00').split(':').map(Number);
    const end=String(sc.jamSelesai||'23:59').split(':').map(Number);
    let cur=parts[0]*60+parts[1], finish=end[0]*60+end[1];
    const step=15;
    while(cur<finish){
      const hh=String(Math.floor(cur/60)%24).padStart(2,'0'), mm=String(cur%60).padStart(2,'0');
      const time=hh+':'+mm, value=time+'|'+sc.id;
      const used=Store.data.bookings.some(function(b){return samePoli(b.poliId,poliId)&&b.tanggalKontrol===tanggal&&b.sessionId===sc.id&&b.appointmentTime===time&&!['dibatalkan','kadaluarsa','tidak_hadir'].includes(b.status);});
      const now=new Date(), currentTime=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
      const alreadyPassed=tanggal===todayStr() && time<=currentTime;
      if(!used&&!alreadyPassed&&!slots.some(function(x){return x.value===value;})) slots.push({value:value,label:time,session:sc});
      cur+=step;
    }
  });
  return slots;
}
/* =====================================================================
   PENCARIAN KODE: MODUL APLIKASI PASIEN — BOOKING RAWAT JALAN
   Tanggung jawab: formulir booking dan pilihan layanan/jadwal yang tersedia.
   Batasan: perubahan UI tidak boleh melewati validasi jadwal/penjamin.
   ===================================================================== */
function renderPatientBooking(){
  setPageTitle('Rawat Jalan');
  const u=Session.currentUser, p=getPatient(u.patientId);
  if(!p){document.getElementById('main-content').innerHTML='<div class="empty">Data pasien tidak ditemukan.</div>';return;}
  const today=todayStr(), min=addDaysISODate(today,1), max=patientBookingMaxDate();
  document.getElementById('main-content').innerHTML=
    pageIntro('Pendaftaran pasien dibuat terpisah antara Poli Reguler/Spesialis dan Poli Eksekutif. QR/barcode yang diterbitkan membawa jenis layanan, poli, dokter, jadwal, dan nomor antrean untuk proses check-in.')+
    '<div class="panel"><div class="panel-head"><div><h2>📅 Pendaftaran Rawat Jalan</h2><div class="hint">Pilih alur layanan terlebih dahulu agar proses pendaftaran sesuai konteks pelayanan.</div></div></div><div class="panel-body">'+
    '<form id="patient-booking-form">'+
    '<div class="service-choice-grid patient-service-choice"><button type="button" class="service-choice active" data-pb-service="Poliklinik Spesialis"><strong>🩺 Poli Reguler</strong><span>Poliklinik Spesialis · antrean reguler</span></button><button type="button" class="service-choice" data-pb-service="Poliklinik Eksekutif"><strong>⭐ Poli Eksekutif</strong><span>Pilih dokter dan waktu/janji</span></button></div>'+ 
    '<div class="field"><label>Poli / Klinik</label><select id="pb-poli" required></select></div>'+ 
    '<div class="field"><label>Tanggal Kunjungan</label><input type="date" id="pb-tanggal" min="'+min+'" max="'+max+'" value="'+min+'" required><div class="hint" id="pb-window-hint"></div></div>'+ 
    '<div class="field hidden" id="pb-dokter-wrap"><label>Pilih Dokter</label><select id="pb-dokter"></select><div class="hint">Pilihan dokter hanya tersedia untuk Poli Eksekutif. Poli Reguler menggunakan alokasi dokter/sesi otomatis.</div></div>'+ 
    '<div class="field hidden" id="pb-waktu-wrap"><label>Waktu / Janji Eksekutif</label><select id="pb-waktu"><option value="">Pilih waktu tersedia</option></select><div class="hint">Waktu merupakan slot prototype berdasarkan sesi dokter yang masih memiliki kapasitas.</div></div>'+ 
    '<div class="field"><label>Penjamin</label><select id="pb-penjamin"><option value="BPJS">JKN / BPJS</option><option value="Umum">Umum</option><option value="Asuransi">Asuransi</option></select></div>'+ 
    '<div id="pb-asuransi" class="field hidden"><label>Nama Asuransi</label><input id="pb-asuransi-name" placeholder="Masukkan nama perusahaan asuransi"></div>'+ 
    '<div id="pb-service-note" class="alert alert-info"></div>'+ 
    '<button class="btn btn-primary btn-block" type="submit">Buat Pendaftaran &amp; Tiket</button></form></div></div>';
  const layananButtons=document.querySelectorAll('[data-pb-service]'), poli=document.getElementById('pb-poli'), tanggal=document.getElementById('pb-tanggal'), dokter=document.getElementById('pb-dokter'), dokterWrap=document.getElementById('pb-dokter-wrap'), waktuWrap=document.getElementById('pb-waktu-wrap'), waktu=document.getElementById('pb-waktu'), pen=document.getElementById('pb-penjamin'), as=document.getElementById('pb-asuransi'), hint=document.getElementById('pb-window-hint'), note=document.getElementById('pb-service-note');
  let layanan='Poliklinik Spesialis';
  function refreshPoli(){
    const options=Store.data.poli.filter(function(x){return x.official===true && (layanan==='Poliklinik Spesialis' ? (x.layanan==='Poliklinik Spesialis' || x.layanan==='Rawat Jalan') : x.layanan===layanan);}).sort(function(a,b){return a.nama.localeCompare(b.nama);});
    poli.innerHTML=options.map(function(x){return '<option value="'+esc(x.id)+'">'+esc(x.nama)+'</option>';}).join('');
    refreshDoctors();
  }
  function refreshDoctors(){
    const isEx=layanan==='Poliklinik Eksekutif';
    const currentToday=todayStr(), earliest=isEx?currentToday:addDaysISODate(currentToday,1), latest=patientBookingMaxDate();
    tanggal.min=earliest; tanggal.max=latest;
    if(!tanggal.value || tanggal.value<earliest || tanggal.value>latest) tanggal.value=earliest;
    dokterWrap.classList.toggle('hidden',!isEx);
    dokter.required=isEx;
    const list=getDoctorSchedulesForDate(poli.value,tanggal.value).filter(function(sc){
      const load=queueLoadForSession(poli.value,tanggal.value,sc.id);
      if(load.total>=sessionCapacity(sc)) return false;
      if(tanggal.value===todayStr()){
        const now=new Date(), currentTime=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
        if(String(sc.jamSelesai||'23:59')<=currentTime) return false;
      }
      return true;
    });
    const byDoctor={};
    list.forEach(function(sc){const did=scheduleDoctorUserId(sc);if(did&&!byDoctor[did])byDoctor[did]=sc;});
    const ids=Object.keys(byDoctor);
    if(isEx){
      dokter.innerHTML=ids.length?'<option value="">Pilih dokter</option>'+ids.map(function(did){const d=doctorMasterForSchedule(byDoctor[did]);return '<option value="'+esc(did)+'">'+esc(d?d.nama:did)+'</option>';}).join(''):'<option value="">Tidak ada jadwal dokter pada tanggal ini</option>';
    }else{
      dokter.innerHTML='<option value="AUTO">⚡ Sistem memilih dokter/sesi otomatis</option>';
    }
    if(!isEx) dokter.value='AUTO';
    waktuWrap.classList.toggle('hidden',!isEx);
    refreshTimes();
    hint.textContent=patientBookingWindowHint(layanan);
    note.innerHTML=isEx?'<strong>Alur Eksekutif:</strong> pasien memilih klinik, dokter, serta waktu/janji yang tersedia. Pendaftaran dan antrean Eksekutif dipisahkan dari Reguler.':'<strong>Alur Reguler:</strong> pasien memilih klinik dan tanggal. Dokter/sesi ditentukan otomatis oleh sistem berdasarkan jadwal dan kapasitas.';
  }
  function refreshTimes(){
    if(layanan!=='Poliklinik Eksekutif'){waktu.innerHTML='<option value="">Tidak diperlukan</option>';return;}
    const slots=buildExecutiveTimeSlots(poli.value,tanggal.value,dokter.value);
    waktu.innerHTML=slots.length?'<option value="">Pilih waktu tersedia</option>'+slots.map(function(x){return '<option value="'+esc(x.value)+'">'+esc(x.label)+' · sesi '+esc(x.session.jamMulai)+'–'+esc(x.session.jamSelesai)+'</option>';}).join(''):'<option value="">Tidak ada slot tersedia</option>';
  }
  layananButtons.forEach(function(btn){btn.addEventListener('click',function(){layanan=btn.dataset.pbService;layananButtons.forEach(function(x){x.classList.remove('active');});btn.classList.add('active');refreshPoli();});});
  poli.addEventListener('change',refreshDoctors); tanggal.addEventListener('change',refreshDoctors); dokter.addEventListener('change',refreshTimes); pen.addEventListener('change',function(){as.classList.toggle('hidden',pen.value!=='Asuransi');});
  refreshPoli();
  document.getElementById('patient-booking-form').addEventListener('submit',function(e){e.preventDefault();submitPatientBooking();});
}

/* PENCARIAN KODE: MODUL APLIKASI PASIEN — BOOKING SAYA
   Menampilkan booking milik pasien yang sedang login; jaga pemisahan data
   antarpasien dan pertahankan relasi bookingId, patientId, poli, serta jadwal. */
function renderPatientBookingSaya(){
  setPageTitle('Booking Saya');
  const u=Session.currentUser, p=getPatient(u.patientId);
  if(!p){document.getElementById('main-content').innerHTML='<div class="empty">Data pasien tidak ditemukan.</div>';return;}
  const list=patientBookings(p.id).slice(0,20);
  document.getElementById('main-content').innerHTML=
    pageIntro('Semua tiket booking Rawat Jalan Anda tersimpan di sini. Ketuk tiket kapan saja untuk menampilkan kembali QR/barcode tanpa perlu screenshot.')+
    '<section class="panel"><div class="panel-head"><div><h2>🎫 Booking Saya</h2><div class="hint">Tiket dapat dibuka kembali dan diunduh kapan saja.</div></div></div><div class="panel-body" id="patient-booking-list"></div></section>';
  renderPatientBookingList(p.id);
}

/* PENCARIAN KODE: MODUL APLIKASI PASIEN — RIWAYAT
   Hanya menampilkan ringkasan riwayat yang boleh dilihat pasien terkait.
   Jangan mengekspos catatan internal atau data pasien lain. */
function renderPatientRiwayat(){
  setPageTitle('Riwayat');
  const u=Session.currentUser, p=getPatient(u.patientId);
  if(!p){document.getElementById('main-content').innerHTML='<div class="empty">Data pasien tidak ditemukan.</div>';return;}
  const visits=patientVisits(p.id).filter(function(v){return v.diagnosis||v.catatan||v.vital||v.screening||v.status==='selesai';}).sort(function(a,b){return new Date(b.tanggal||b.createdAt)-new Date(a.tanggal||a.createdAt);});
  const admissions=(Store.data.admissions||[]).filter(function(a){return a.patientId===p.id;}).sort(function(a,b){return new Date(b.tanggalMasuk||b.createdAt)-new Date(a.tanggalMasuk||a.createdAt);});
  const rj=visits.filter(function(v){return (v.unit||'rawat-jalan')==='rawat-jalan';});
  const igd=visits.filter(function(v){return v.unit==='igd';});
  const card=function(v,unit){const poli=getPoli(v.poliId);return '<div class="history-item"><div class="when">'+formatTanggalIndo(v.tanggal||v.createdAt)+'</div><strong>'+esc(unit==='igd'?'Kunjungan IGD':(poli?poli.nama:'Rawat Jalan'))+'</strong><div class="hint">Status: '+esc((STATUS_MAP[v.status]||{label:v.status||'Tercatat'}).label)+'</div></div>';};
  document.getElementById('main-content').innerHTML=pageIntro('Riwayat pelayanan disusun berdasarkan jenis layanan. Episode tetap terpisah dan tertaut ke identitas pasien yang sama.')+
    '<div class="panel"><div class="panel-head"><h2>🩺 Rawat Jalan</h2><span class="badge">'+rj.length+'</span></div><div class="panel-body">'+(rj.length?rj.map(function(v){return card(v,'rawat-jalan');}).join(''):'<div class="empty">Belum ada riwayat Rawat Jalan.</div>')+'</div></div>'+
    '<div class="panel"><div class="panel-head"><h2>🏥 Rawat Inap</h2><span class="badge">'+admissions.length+'</span></div><div class="panel-body">'+(admissions.length?admissions.map(function(a){const w=(Store.data.wards||[]).find(function(x){return x.id===a.wardId;});return '<div class="history-item"><div class="when">'+formatTanggalIndo(a.tanggalMasuk||a.createdAt)+'</div><strong>'+(w?esc(w.nama):'Rawat Inap')+'</strong><div class="hint">Status: '+esc(a.status||'Tercatat')+' · Kelas '+esc(a.kelasPerawatan||'-')+'</div></div>';}).join(''):'<div class="empty">Belum ada riwayat Rawat Inap.</div>')+'</div></div>'+
    '<div class="panel"><div class="panel-head"><h2>🚑 IGD</h2><span class="badge">'+igd.length+'</span></div><div class="panel-body">'+(igd.length?igd.map(function(v){return card(v,'igd');}).join(''):'<div class="empty">Belum ada riwayat IGD.</div>')+'</div></div>';
}

let selectedStaffChatPatientId=null;
function renderPatientInfo(){
  setPageTitle('Informasi');
  const u=Session.currentUser, p=getPatient(u.patientId);
  const notices=(Store.data.hospitalAnnouncements||[]).filter(function(n){return n.active!==false;}).sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);});
  const activeVisit=getPatientActiveVisit(u.patientId), upcomingBooking=Store.data.bookings.filter(function(b){return b.patientId===u.patientId&&b.tanggalKontrol>=todayStr()&&['terjadwal','checked_in'].includes(b.status);}).sort(function(a,b){return a.tanggalKontrol.localeCompare(b.tanggalKontrol);})[0];
  const relevantPoliIds=new Set([activeVisit&&canonicalPoliId(activeVisit.poliId),upcomingBooking&&canonicalPoliId(upcomingBooking.poliId)].filter(Boolean));
  const practice=(Store.data.poliMessages||[]).filter(function(m){return relevantPoliIds.has(canonicalPoliId(m.poliId));}).slice().sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);});
  const relevant=(Store.data.notifications||[]).filter(function(n){return n.target===u.patientId&&['schedule','announcement','info','news','promotion'].includes(n.type);});
  document.getElementById('main-content').innerHTML=pageIntro('Informasi satu arah dari rumah sakit. Untuk membalas pesan atau mengatur tindak lanjut pelayanan, buka Chat Pelayanan.')+
    '<div class="panel"><div class="panel-head"><h2>📣 Pengumuman Rumah Sakit</h2></div><div class="panel-body">'+(notices.length?notices.map(function(n){return '<div class="history-item"><div class="when">'+formatTanggalWaktu(n.createdAt)+' · '+esc(n.kategori||'Informasi')+'</div><strong>'+esc(n.judul)+'</strong><div>'+esc(n.isi)+'</div></div>';}).join(''):'<div class="empty">Belum ada pengumuman terbaru.</div>')+'</div></div>'+
    '<div class="panel"><div class="panel-head"><h2>🩺 Informasi Jadwal & Pelayanan</h2></div><div class="panel-body">'+(relevant.length?relevant.map(function(n){return '<div class="history-item"><div class="when">'+formatTanggalWaktu(n.createdAt)+'</div><strong>'+esc(n.title)+'</strong><div>'+esc(n.body)+'</div></div>';}).join(''):'')+(practice.length?practice.slice(0,10).map(function(m){return '<div class="history-item"><div class="when">'+formatTanggalWaktu(m.createdAt)+' · '+esc(m.authorName||'Petugas')+' · '+esc((getPoli(m.poliId)||{nama:'Rumah Sakit'}).nama)+'</div><strong>'+esc(POLI_MSG_LABEL[m.tipe]||'Informasi praktik')+'</strong><div>'+esc(m.pesan)+'</div></div>';}).join(''):'')+((!relevant.length&&!practice.length)?'<div class="empty">Belum ada informasi jadwal untuk ditampilkan.</div>':'')+'</div></div>'+
    '<div class="panel"><div class="panel-body"><h2>💬 Butuh tindak lanjut?</h2><p>Gunakan Chat Pelayanan untuk pesan dua arah mengenai jadwal ulang, dokter pengganti, atau pertanyaan kunjungan.</p><button class="btn btn-primary" id="btn-open-patient-chat">Buka Chat Pelayanan</button></div></div>';
  const b=document.getElementById('btn-open-patient-chat'); if(b)b.addEventListener('click',function(){navigate('pasien-chat');});
}
/* PENCARIAN KODE: MODUL APLIKASI PASIEN — NOTIFIKASI & CHAT
   Tanggung jawab: komunikasi/status pelayanan yang ditujukan kepada pasien.
   Jangan menganggap pesan sebagai pengganti perubahan status klinis resmi. */
function renderPatientChat(){
  setPageTitle('Chat Pelayanan');
  const u=Session.currentUser, p=getPatient(u.patientId); if(!p){document.getElementById('main-content').innerHTML='<div class="empty">Data pasien tidak ditemukan.</div>';return;}
  const msgs=(Store.data.patientChats||[]).filter(function(m){return m.patientId===p.id;}).sort(function(a,b){return new Date(a.createdAt)-new Date(b.createdAt);});
  document.getElementById('main-content').innerHTML=pageIntro('Chat dua arah untuk komunikasi terkait pelayanan. Hindari mengirim keadaan gawat darurat melalui chat; segera hubungi IGD atau layanan darurat.')+
    '<div class="panel"><div class="panel-head"><h2>💬 Chat Pelayanan</h2><span class="badge">'+msgs.length+' pesan</span></div><div class="panel-body"><div class="chat-thread">'+(msgs.length?msgs.map(function(m){return '<div class="history-item"><div class="when">'+formatTanggalWaktu(m.createdAt)+' · '+esc(m.authorName)+' · '+esc(m.authorRole)+(m.topic?' · '+esc(m.topic):'')+'</div><div>'+esc(m.message)+'</div></div>';}).join(''):'<div class="empty">Belum ada percakapan. Anda dapat mengirim pertanyaan atau permintaan tindak lanjut.</div>')+'</div><form id="patient-chat-form" style="margin-top:14px"><div class="field"><label>Kategori pesan</label><select id="patient-chat-topic"><option value="Pertanyaan umum">Pertanyaan umum</option><option value="Permintaan jadwal ulang">Permintaan jadwal ulang</option><option value="Permintaan dokter pengganti">Permintaan dokter pengganti</option><option value="Konfirmasi kunjungan">Konfirmasi kunjungan</option></select></div><div class="field"><label>Pesan untuk petugas rumah sakit</label><textarea id="patient-chat-message" rows="3" maxlength="1200" required placeholder="Tulis pesan atau permintaan tindak lanjut..."></textarea></div><button class="btn btn-primary btn-block" type="submit">Kirim Pesan</button></form></div></div>';
  document.getElementById('patient-chat-form').addEventListener('submit',function(e){e.preventDefault();const input=document.getElementById('patient-chat-message'), message=input.value.trim(), topic=document.getElementById('patient-chat-topic').value;if(!message)return;Store.data.patientChats.push({id:uid('CHAT'),patientId:p.id,authorUserId:u.id,authorName:p.nama,authorRole:'Pasien',topic:topic,message:message,createdAt:nowISO(),readByStaff:false});Store.save();logAudit('chat_pasien_kirim',p.nama+' · '+topic);renderPatientChat();showToast('Pesan terkirim ke inbox petugas.','success');});
}
function renderStaffPatientChat(){
  setPageTitle('Chat Pasien');
  const chats=Store.data.patientChats||[];
  const patientIds=Array.from(new Set(chats.map(function(m){return m.patientId;}).concat((Store.data.patients||[]).map(function(p){return p.id;}))));
  if(!selectedStaffChatPatientId||!patientIds.includes(selectedStaffChatPatientId))selectedStaffChatPatientId=patientIds[0]||null;
  const selected=selectedStaffChatPatientId;
  const patient=selected?getPatient(selected):null;
  const msgs=chats.filter(function(m){return m.patientId===selected;}).sort(function(a,b){return new Date(a.createdAt)-new Date(b.createdAt);});
  document.getElementById('main-content').innerHTML=pageIntro('Inbox komunikasi dua arah untuk petugas. Tindak lanjut jadwal atau dokter pengganti harus berdasarkan keputusan dan jadwal yang sudah dikonfirmasi rumah sakit.')+
    '<div class="panel"><div class="panel-head"><h2>📥 Inbox Chat Pelayanan</h2></div><div class="panel-body">'+(patientIds.length?'<div class="field"><label>Pilih percakapan pasien</label><select id="staff-chat-patient">'+patientIds.map(function(id){const p=getPatient(id);return '<option value="'+esc(id)+'" '+(id===selected?'selected':'')+'>'+esc(p?p.nama:id)+' · '+esc(id)+'</option>';}).join('')+'</select></div><div class="chat-thread">'+msgs.map(function(m){if(!m.readByStaff&&m.authorRole==='Pasien')m.readByStaff=true;return '<div class="history-item"><div class="when">'+formatTanggalWaktu(m.createdAt)+' · '+esc(m.authorName)+' · '+esc(m.authorRole)+'</div><div>'+esc(m.message)+'</div></div>';}).join('')+'</div><form id="staff-chat-form" style="margin-top:14px"><div class="field"><label>Balasan petugas</label><textarea id="staff-chat-message" rows="3" maxlength="1200" required placeholder="Tulis tindak lanjut pelayanan..."></textarea></div><button class="btn btn-primary" type="submit">Kirim Balasan</button></form>':'<div class="empty">Belum ada percakapan pasien.</div>')+'</div></div>';
  const sel=document.getElementById('staff-chat-patient');if(sel)sel.addEventListener('change',function(){selectedStaffChatPatientId=this.value;renderStaffPatientChat();});
  const form=document.getElementById('staff-chat-form');if(form)form.addEventListener('submit',function(e){e.preventDefault();const input=document.getElementById('staff-chat-message'),message=input.value.trim();if(!message||!selectedStaffChatPatientId)return;const u=Session.currentUser,p=getPatient(selectedStaffChatPatientId);Store.data.patientChats.push({id:uid('CHAT'),patientId:selectedStaffChatPatientId,authorUserId:u.id,authorName:u.nama,authorRole:roleLabel(u.role),topic:'Balasan petugas',message:message,createdAt:nowISO(),readByStaff:true});Store.save();pushNotification('chat-reply','Balasan Chat Pelayanan',message,selectedStaffChatPatientId,null);logAudit('chat_pasien_balasan',(p?p.nama:selectedStaffChatPatientId)+' · '+u.nama);renderStaffPatientChat();showToast('Balasan terkirim ke pasien.','success');});
}
function renderHospitalInformationAdmin(){
  setPageTitle('Informasi RS');
  const list=(Store.data.hospitalAnnouncements||[]).slice().sort(function(a,b){return new Date(b.createdAt)-new Date(a.createdAt);});
  document.getElementById('main-content').innerHTML=pageIntro('Buat pengumuman satu arah untuk aplikasi pasien. Jangan gunakan pengumuman umum untuk mengirim informasi klinis individual.')+
    '<div class="panel"><div class="panel-head"><h2>📣 Buat Pengumuman</h2></div><div class="panel-body"><form id="hospital-announcement-form"><div class="field"><label>Kategori</label><select id="ha-category"><option>Pengumuman</option><option>Jadwal Dokter</option><option>Berita</option><option>Promosi Layanan</option><option>Edukasi Kesehatan</option></select></div><div class="field"><label>Judul</label><input id="ha-title" maxlength="140" required></div><div class="field"><label>Isi informasi</label><textarea id="ha-body" rows="4" maxlength="3000" required></textarea></div><button class="btn btn-primary" type="submit">Terbitkan Informasi</button></form></div></div>'+
    '<div class="panel"><div class="panel-head"><h2>Informasi Terbit</h2></div><div class="panel-body">'+(list.length?list.map(function(n){return '<div class="history-item"><div class="when">'+formatTanggalWaktu(n.createdAt)+' · '+esc(n.kategori)+'</div><strong>'+esc(n.judul)+'</strong><div>'+esc(n.isi)+'</div></div>';}).join(''):'<div class="empty">Belum ada pengumuman.</div>')+'</div></div>';
  document.getElementById('hospital-announcement-form').addEventListener('submit',function(e){e.preventDefault();const kategori=document.getElementById('ha-category').value,judul=document.getElementById('ha-title').value.trim(),isi=document.getElementById('ha-body').value.trim();if(!judul||!isi)return;Store.data.hospitalAnnouncements.unshift({id:uid('INFO'),kategori: kategori,judul:judul,isi:isi,active:true,createdAt:nowISO(),authorId:Session.currentUser.id});Store.save();logAudit('pengumuman_diterbitkan',kategori+' · '+judul);renderHospitalInformationAdmin();showToast('Informasi berhasil diterbitkan.','success');});
}

/* PENCARIAN KODE: MODUL APLIKASI PASIEN — SIMPAN BOOKING
   Titik simpan booking pasien. Pertahankan validasi dan pencegahan duplikasi;
   perubahan harus tetap menghubungkan booking ke pasien, poli, jadwal, penjamin. */
function submitPatientBooking(){
  const u=Session.currentUser, patientId=u.patientId;
  const layanan=document.querySelector('[data-pb-service].active')?.dataset.pbService || 'Poliklinik Spesialis';
  const poliId=document.getElementById('pb-poli').value, tanggal=document.getElementById('pb-tanggal').value, doctorId=document.getElementById('pb-dokter').value, penjamin=document.getElementById('pb-penjamin').value;
  const waktuRaw=document.getElementById('pb-waktu')?.value||'', asuransi=(document.getElementById('pb-asuransi-name')?.value||'').trim();
  const poli=getPoli(poliId);
  const regularService = layanan==='Poliklinik Spesialis' && poli && (poli.layanan==='Poliklinik Spesialis' || poli.layanan==='Rawat Jalan');
  if(!poli || !(regularService || poli.layanan===layanan)){showToast('Poli tidak sesuai dengan jenis layanan yang dipilih.','danger');return;}
  if(!patientBookingWindowValid(tanggal,layanan)){showToast('Tanggal pendaftaran harus berada pada rentang pendaftaran yang tersedia.','danger');return;}
  if(layanan==='Poliklinik Eksekutif' && !doctorId){showToast('Dokter wajib dipilih untuk Poli Eksekutif.','warning');return;}
  if(penjamin==='Asuransi'&&!asuransi){showToast('Nama asuransi wajib diisi.','danger');return;}
  const existing=Store.data.bookings.find(function(b){return b.patientId===patientId&&samePoli(b.poliId,poliId)&&b.tanggalKontrol===tanggal&&['terjadwal','checked_in'].includes(b.status);});
  if(existing){showToast('Anda sudah memiliki booking aktif pada poli dan tanggal tersebut.','warning');return;}
  let allocation=null, appointmentTime=null;
  if(layanan==='Poliklinik Eksekutif'){
    if(!waktuRaw){showToast('Pilih waktu/janji Eksekutif terlebih dahulu.','warning');return;}
    const parts=waktuRaw.split('|'), sessionId=parts[1];
    const sc=Store.data.doctorSchedules.find(function(x){return x.id===sessionId;});
    if(!sc || !scheduleMatchesDoctor(sc,doctorId)){showToast('Sesi dokter yang dipilih tidak valid. Silakan pilih ulang dokter dan waktu.','danger');return;}
    const load=queueLoadForSession(poliId,tanggal,sc.id);
    if(load.total>=sessionCapacity(sc)){showToast('Sesi dokter tersebut sudah penuh. Silakan pilih waktu lain.','danger');return;}
    allocation={schedule:sc,doctorId:scheduleDoctorUserId(sc),reason:'executive_appointment'};
    appointmentTime=parts[0];
  }else{
    allocation=allocateVisitSession(poliId,tanggal,null);
    if(!allocation){showToast('Seluruh sesi dokter pada poli tersebut sudah penuh. Silakan pilih tanggal lain.','danger');return;}
  }
  const noAntrian=generateNoAntrian(poliId,tanggal);
  const booking={id:uid('BK'),patientId:patientId,poliId:poliId,tanggalKontrol:tanggal,jenisLayanan:layanan,jenisBayar:penjamin,sumber:'Aplikasi Pasien SIMRS PROTOTYPE — Demo',noBpjs:'',noAntrian:noAntrian,dokterId:allocation.doctorId,sessionId:allocation.schedule&&allocation.schedule.id||null,allocationMode:allocation.reason,appointmentTime:appointmentTime,kodeCheckIn:'CHK'+Date.now().toString(36).toUpperCase().slice(-8),status:'terjadwal',asuransiNama:penjamin==='Asuransi'?asuransi:'',confirmedAt:null,arrivalWindowStart:null,arrivalWindowEnd:null,suggestedArrivalAt:null,journeyVersion:1,createdAt:nowISO(),updatedAt:nowISO()};
  const aw=suggestedArrivalWindow(booking); if(aw){booking.arrivalWindowStart=aw.start;booking.arrivalWindowEnd=aw.end;booking.suggestedArrivalAt=aw.start;}
  Store.data.bookings.push(booking); Store.save();
  const doctor=doctorMasterById(booking.dokterId)||Store.data.users.find(function(x){return x.id===booking.dokterId;});
  pushNotification('booking','Pendaftaran Rawat Jalan berhasil',noAntrian+' — '+poli.nama+' · '+layanan+' pada '+formatTanggalIndo(tanggal),patientId,u.id);
  logAudit('patient_booking',noAntrian+' — '+getPatient(patientId).nama+' · '+poli.nama+' · '+layanan+' · '+(doctor?.nama||'Dokter')+(appointmentTime?' · '+appointmentTime:''));
  openPatientBookingTicket(booking.id,true);
  renderPatientBookingList(patientId);
}
function renderPatientBookingList(patientId){
  const el=document.getElementById('patient-booking-list'); if(!el)return;
  const list=patientBookings(patientId).slice(0,20);
  el.innerHTML=list.length?list.map(function(b){
    const p=getPoli(b.poliId), canCancel=b.status==='terjadwal' && ['Umum','Asuransi'].includes(b.jenisBayar) && b.tanggalKontrol>=todayStr();
    const cancelInfo=b.jenisBayar==='BPJS'&&b.status==='terjadwal'?'<div class="hint" style="margin-top:5px">🔒 Pembatalan JKN/BPJS melalui petugas RS</div>':'';
    return '<div class="queue-list-item patient-ticket-row-wrap"><button type="button" class="patient-ticket-row" onclick="openPatientBookingTicket(\''+b.id+'\')"><div><div class="no">'+esc(b.noAntrian)+'</div><div class="nm">'+esc(getPoli(b.poliId).nama)+'</div><div class="hint">'+esc(getPoli(b.poliId).layanan||'Rawat Jalan')+' · '+formatTanggalIndo(b.tanggalKontrol)+' · '+esc(b.jenisBayar)+'</div></div><div style="text-align:right"><span class="badge '+(b.status==='checked_in'?'badge-sage':b.status==='dibatalkan'?'badge-brick':'badge-amber')+'">'+bookingStatusLabel(b.status)+'</span><div class="hint" style="margin-top:6px">Tap untuk buka tiket</div></div></button>'+cancelInfo+(canCancel?'<div class="ticket-row-actions"><button type="button" class="btn btn-danger btn-sm" onclick="cancelPatientBooking(\''+b.id+'\')">✕ Batalkan Booking</button></div>':'')+'</div>';
  }).join(''):'<div class="empty"><div class="big">🎫</div>Belum ada booking.</div>';
}
function cancelPatientBooking(bookingId){
  const b=getPatientBookingById(bookingId);
  if(!b){showToast('Booking tidak ditemukan.','danger');return;}
  if(b.jenisBayar==='BPJS'){showToast('Booking JKN/BPJS tidak dapat dibatalkan dari aplikasi pasien. Hubungi petugas RS.','warning');return;}
  if(!['Umum','Asuransi'].includes(b.jenisBayar)){showToast('Pembatalan mandiri tidak tersedia untuk penjamin ini.','warning');return;}
  if(b.status!=='terjadwal'){showToast('Booking sudah diproses dan tidak dapat dibatalkan dari aplikasi pasien.','warning');return;}
  if(b.tanggalKontrol<todayStr()){showToast('Booking yang sudah lewat tidak dapat dibatalkan.','warning');return;}
  openModal('<div class="modal-head"><div><h2>Batalkan Booking</h2><div class="hint">'+esc(b.noAntrian)+' · '+esc(getPoli(b.poliId).nama)+'</div></div><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div><div class="modal-body"><p>Apakah Anda yakin ingin membatalkan booking ini?</p><div class="field"><label>Alasan (opsional)</label><textarea id="patient-cancel-reason" placeholder="Contoh: tidak dapat hadir"></textarea></div><div class="alert alert-info">Setelah dibatalkan, nomor antrean tersebut tetap tercatat sebagai pembatalan dan tidak dipakai ulang.</div><button class="btn btn-danger btn-block" id="btn-patient-confirm-cancel">Ya, Batalkan Booking</button></div>');
  document.getElementById('btn-patient-confirm-cancel').addEventListener('click',function(){
    const reason=(document.getElementById('patient-cancel-reason').value||'Tidak disebutkan').trim();
    b.status='dibatalkan'; b.cancelReason=reason; b.updatedAt=nowISO();
    Store.save(); logAudit('patient_booking_dibatalkan',b.noAntrian+' — '+reason); pushNotification('booking','Booking dibatalkan',b.noAntrian+' — '+getPatient(b.patientId).nama,b.patientId);
    closeModal(); renderPatientBookingList(b.patientId); showToast('Booking berhasil dibatalkan.','success');
  });
}

function getPatientBookingById(bookingId){
  const u=Session.currentUser;
  if(!u || u.role!=='pasien') return null;
  return Store.data.bookings.find(function(b){return b.id===bookingId && b.patientId===u.patientId;}) || null;
}
function bookingDoctorMaster(booking){
  if(!booking) return null;
  const sc=booking.sessionId?Store.data.doctorSchedules.find(function(x){return x.id===booking.sessionId;}):null;
  return (sc&&doctorMasterById(sc.doctorId)) || doctorMasterById(booking.dokterId) || Store.data.users.find(function(x){return x.id===booking.dokterId;}) || null;
}
/* PENCARIAN KODE: MODUL APLIKASI PASIEN — TIKET & BARCODE CHECK-IN
   Tiket harus mengarah ke booking yang benar. Check-in tetap dikonfirmasi
   petugas RS; tampilan barcode bukan bukti bahwa pasien sudah check-in. */
function openPatientBookingTicket(bookingId, fresh){
  const booking=getPatientBookingById(bookingId);
  if(!booking){showToast('Tiket tidak ditemukan.','danger');return;}
  const p=getPatient(booking.patientId), poli=getPoli(booking.poliId);
  const aw=suggestedArrivalWindow(booking);
  const dm=bookingDoctorMaster(booking);
  const status=bookingStatusLabel(booking.status);
  openModal('<div class="modal-head"><div><h2>🎫 Tiket Rawat Jalan</h2><div class="hint">'+PROTOTYPE_NAME+' · '+PROTOTYPE_MODE+'</div></div><button class="btn btn-ghost btn-icon" onclick="closeModal()">✕</button></div><div class="modal-body ticket-modal-compact">'+
    '<div class="patient-ticket ticket-download-target">'+
      '<span>NOMOR ANTREAN</span><strong>'+esc(booking.noAntrian)+'</strong><b>'+esc(poli.nama)+'</b>'+ 
      '<small>'+formatTanggalIndo(booking.tanggalKontrol)+' · '+esc(booking.jenisLayanan||poli.layanan)+' · '+esc(booking.jenisBayar)+'</small>'+ 
      (dm?'<small class="ticket-doctor">👨‍⚕️ '+esc(dm.nama)+(booking.appointmentTime?' · '+esc(booking.appointmentTime):'')+'</small>':'')+
      (aw?'<div class="ticket-arrival"><span>⏰ Estimasi kedatangan</span><strong>'+esc(aw.text)+'</strong><small>Estimasi prototype berdasarkan sesi dan posisi antrean.</small></div>':'')+
      '<div class="ticket-qr">'+renderQrSvg(booking.kodeCheckIn,150)+'</div>'+ 
      '<small class="ticket-code">Kode check-in: <span class="mono">'+esc(booking.kodeCheckIn)+'</span></small>'+ 
      '<span class="badge '+(booking.status==='checked_in'?'badge-sage':booking.status==='dibatalkan'?'badge-brick':'badge-amber')+'">'+esc(status)+'</span>'+ 
    '</div>'+ 
    '<div class="ticket-note">Tunjukkan QR/barcode ini saat check-in di loket.</div>'+ 
    '<div class="ticket-actions"><button class="btn btn-primary" onclick="downloadPatientTicket(\''+booking.id+'\')">⬇️ Download Tiket</button><button class="btn btn-outline" onclick="printPatientTicket(\''+booking.id+'\')">🖨️ Cetak / Simpan PDF</button></div>'+ 
    '<div class="ticket-rule-hint">'+(String(booking.poliId||'').startsWith('EX-')?'Eksekutif: dokter dan sesi mengikuti jadwal eksekutif yang dipilih.':'Reguler: nomor antrean mengikuti poli + tanggal dan dokter dialokasikan sesuai jadwal/kapasitas.')+'</div>'+ 
  '</div></div>');
}
function downloadPatientTicket(bookingId){
  const booking=getPatientBookingById(bookingId); if(!booking)return;
  const p=getPatient(booking.patientId), poli=getPoli(booking.poliId);
  const svg=renderQrSvg(booking.kodeCheckIn,230);
  const canvas=document.createElement('canvas'), ctx=canvas.getContext('2d'), scale=2;
  canvas.width=900*scale; canvas.height=1250*scale; ctx.scale(scale,scale);
  ctx.fillStyle='#f7faf9'; ctx.fillRect(0,0,900,1250);
  ctx.fillStyle='#ffffff'; ctx.strokeStyle='#d8e5e1'; ctx.lineWidth=2;
  if(ctx.roundRect) ctx.roundRect(45,45,810,1160,30); else ctx.rect(45,45,810,1160); ctx.fill(); ctx.stroke();
  ctx.fillStyle='#0e5c56'; ctx.font='700 30px Arial'; ctx.fillText('SIMRS PROTOTYPE',80,105);
  ctx.fillStyle='#687773'; ctx.font='18px Arial'; ctx.fillText('TIKET RAWAT JALAN',80,145);
  ctx.fillStyle='#263b37'; ctx.font='700 72px monospace'; ctx.fillText(booking.noAntrian,80,245);
  ctx.font='700 30px Arial'; ctx.fillText(poli.nama,80,300);
  ctx.font='20px Arial'; ctx.fillText(formatTanggalIndo(booking.tanggalKontrol)+' · '+(booking.jenisLayanan||poli.layanan),80,340);
  const dm=bookingDoctorMaster(booking); if(dm){ctx.fillText('Dokter: '+dm.nama,80,450);} if(booking.appointmentTime){ctx.fillText('Janji: '+booking.appointmentTime,80,485);}
  ctx.fillText('Pasien: '+p.nama,80,380);
  ctx.fillText('Penjamin: '+booking.jenisBayar,80,415);
  const img=new Image(); const blob=new Blob([svg],{type:'image/svg+xml'}); const url=URL.createObjectURL(blob);
  img.onload=function(){ctx.drawImage(img,335,475,230,230);URL.revokeObjectURL(url);ctx.fillStyle='#687773';ctx.font='18px monospace';ctx.textAlign='center';ctx.fillText(booking.kodeCheckIn,450,750);ctx.font='18px Arial';ctx.fillText('Tunjukkan QR/barcode ini saat check-in di loket.',450,805);ctx.fillText('Simpan tiket ini di ponsel Anda.',450,840);ctx.textAlign='left';const a=document.createElement('a');a.download='Tiket-'+booking.noAntrian+'-'+booking.tanggalKontrol+'.png';a.href=canvas.toDataURL('image/png');a.click();showToast('Tiket berhasil diunduh.','success');};
  img.onerror=function(){URL.revokeObjectURL(url);showToast('Tiket gagal diunduh. Silakan coba lagi.','danger');}; img.src=url;
}
function printPatientTicket(bookingId){
  const booking=getPatientBookingById(bookingId); if(!booking)return;
  const p=getPatient(booking.patientId), poli=getPoli(booking.poliId);
  printArea('<div style="max-width:420px;margin:30px auto;text-align:center;font-family:Arial,sans-serif"><h2>SIMRS PROTOTYPE</h2><h3>Tiket Rawat Jalan</h3><div style="font-size:64px;font-weight:800;font-family:monospace">'+esc(booking.noAntrian)+'</div><h3>'+esc(poli.nama)+'</h3><p>'+formatTanggalIndo(booking.tanggalKontrol)+' · '+esc(poli.layanan)+'</p><p>Pasien: '+esc(p.nama)+'</p><div style="margin:20px auto;width:190px">'+renderQrSvg(booking.kodeCheckIn,190)+'</div><p>'+esc(booking.kodeCheckIn)+'</p><p>Tunjukkan QR/barcode ini saat check-in di loket.</p></div>');
}

function getPatientActiveAdmission(patientId){
  // Episode RI tetap tampil sampai tagihan selesai; status selesai medis saja belum berarti seluruh perjalanan administrasi berakhir.
  return Store.data.admissions.filter(function(a){return a.patientId===patientId && (a.status==='dirawat' || (a.billing&&a.billing.statusBayar!=='lunas'));}).sort(function(a,b){return new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt);})[0]||null;
}
function patientInpatientJourney(a){
  if(!a) return '';
  const bed=Store.data.beds.find(function(b){return b.id===a.bedId;})||{};
  const ward=Store.data.wards.find(function(w){return w.id===a.wardId;})||{};
  const orders=Array.isArray(a.orders)?a.orders:[];
  const hasLab=orders.some(function(o){return o.jenis==='lab';});
  const hasRad=orders.some(function(o){return o.jenis==='radiologi';});
  const hasRx=Array.isArray(Store.data.prescriptions) && Store.data.prescriptions.some(function(r){return r.admissionId===a.id;});
  const labDone=hasLab && orders.some(function(o){return o.jenis==='lab'&&o.status==='selesai';});
  const radDone=hasRad && orders.some(function(o){return o.jenis==='radiologi'&&o.status==='selesai';});
  const rxDone=hasRx && Store.data.prescriptions.filter(function(r){return r.admissionId===a.id;}).every(function(r){return ['diambil','diberikan','selesai'].includes(r.status);});
  const hasEvaluation=Array.isArray(a.cppt)&&a.cppt.length>0;
  const dischargePlanned=a.discharge&&a.discharge.status==='direncanakan';
  const discharged=a.status!=='dirawat';
  const main=[
    {key:'admission',label:'Admisi',icon:'📝',state:'done',sub:a.sumberAdmisi||'Episode dibuat'},
    {key:'bed',label:'Gedung / Lantai / Ruang / Kamar / Bed',icon:'🛏️',state:a.bedId?'done':'active',sub:inpatientLocationLabel(ward,bed)},
    {key:'perawatan',label:'Perawatan',icon:'🏥',state:a.status==='dirawat'?'active':'done',sub:a.status==='dirawat'?'Sedang dirawat':'Episode selesai'},
    {key:'evaluasi',label:'Evaluasi',icon:'👨‍⚕️',state:hasEvaluation?'done':(a.status==='dirawat'?'active':'done'),sub:hasEvaluation?'CPPT/visit tercatat':'Menunggu evaluasi'},
    {key:'pulang',label:'Pulang',icon:'🏠',state:discharged?'done':(dischargePlanned?'active':'pending'),sub:discharged?'Selesai medis':(dischargePlanned?'Rencana pulang dibuat':'Belum direncanakan')},
    {key:'billing',label:'Kasir',icon:'🧾',state:a.billing&&a.billing.statusBayar==='lunas'?'done':(discharged?'active':'pending'),sub:a.billing&&a.billing.statusBayar==='lunas'?'Tagihan lunas':'Menunggu penyelesaian tagihan'}
  ];
  const supporting=[];
  if(hasLab) supporting.push({label:'Laboratorium',icon:'🧪',state:labDone?'done':'active',sub:labDone?'Hasil tersedia':'Order menunggu'});
  if(hasRad) supporting.push({label:'Radiologi',icon:'☢️',state:radDone?'done':'active',sub:radDone?'Hasil tersedia':'Order menunggu'});
  if(hasRx) supporting.push({label:'Farmasi',icon:'💊',state:rxDone?'done':'active',sub:rxDone?'Obat selesai diproses':'Instruksi obat aktif'});
  if(a.vitalLog&&a.vitalLog.length) supporting.push({label:'Monitoring',icon:'📈',state:'done',sub:'Tanda vital tercatat'});
  const step=function(x){return '<div class="inpatient-journey-step '+x.state+'"><span class="journey-icon">'+(x.state==='done'?'✓':x.icon)+'</span><div><strong>'+esc(x.label)+'</strong><small>'+esc(x.sub||'')+'</small></div></div>';};
  return '<section class="patient-journey-card"><div class="patient-journey-title"><div><div class="ops-eyebrow">ONE PATIENT · ONE EPISODE · ONE JOURNEY</div><h3>🧭 Perjalanan Rawat Inap</h3></div><span class="journey-legend"><i class="done">✓</i> selesai <i class="active">●</i> aktif <i class="pending">○</i> belum</span></div>'+
    renderPatientJourneyMapFromSteps(main,'Rawat inap · '+(main.find(function(x){return x.state==='active';})||main[main.length-1]).label)+'<div class="inpatient-main-journey">'+main.map(step).join('')+'</div>'+
    (supporting.length?'<div class="journey-support"><div class="hint journey-support-title">AKTIVITAS PENDUKUNG</div><div class="journey-support-grid">'+supporting.map(step).join('')+'</div></div>':'')+
    '<div class="journey-note">Ikon <strong>menyala</strong> menunjukkan tahap yang sedang aktif. Tahap Lab/Radiologi/Farmasi hanya muncul jika memang ada order atau aktivitas pada episode ini.</div></section>';
}

/* PENCARIAN KODE: MODUL APLIKASI PASIEN — PERJALANAN RAWAT INAP
   Menampilkan status perjalanan episode rawat inap tanpa membuat atau
   mengubah status admisi/bed dari sisi pasien. */
function renderPatientRawatInap(){
  setPageTitle('Rawat Inap');
  const u=Session.currentUser, p=getPatient(u.patientId), a=getPatientActiveAdmission(u.patientId);
  if(!p){document.getElementById('main-content').innerHTML='<div class="empty">Data pasien tidak ditemukan.</div>';return;}
  if(!a){
    document.getElementById('main-content').innerHTML=pageIntro('Menu ini menampilkan perjalanan Rawat Inap pasien secara dinamis. Jika belum ada episode aktif, tidak ada data Rawat Inap yang ditampilkan.')+
      '<section class="panel"><div class="panel-body"><div class="empty"><div class="big">🏥</div><strong>Belum ada Rawat Inap aktif</strong><div class="hint">Perjalanan Rawat Inap akan muncul otomatis setelah proses admisi dibuat.</div></div></div></section>';
    return;
  }
  const duty=getCurrentInpatientDuty(a.wardId), dpjp=getUserById(a.dpjpUserId);
  const bed=Store.data.beds.find(function(b){return b.id===a.bedId;})||{}, ward=Store.data.wards.find(function(w){return w.id===a.wardId;})||{};
  const shift=duty.shift;
  document.getElementById('main-content').innerHTML=pageIntro('Informasi pasien dibuat ringkas: dokter yang menangani, petugas jaga saat ini, lokasi perawatan, dan perjalanan pelayanan.')+
    '<section class="panel"><div class="panel-head"><div><div class="ops-eyebrow">RAWAT INAP AKTIF</div><h2>🏥 '+esc(p.nama)+'</h2></div><span class="badge '+(a.status==='dirawat'?'badge-sage':'badge-slate')+'">'+esc(a.status)+'</span></div><div class="panel-body"><div class="patient-inpatient-grid">'+
      '<div><span>Dokter Penanggung Jawab</span><strong>'+esc(dpjp?dpjp.nama:'-')+'</strong><small>DPJP</small></div>'+
      '<div><span>Dokter Jaga</span><strong>'+esc(duty.doctor?duty.doctor.nama:'-')+'</strong><small>'+esc(shift.label)+' · '+shift.jamMulai+'–'+shift.jamSelesai+'</small></div>'+
      '<div><span>Petugas Keperawatan</span><strong>'+esc(duty.nurse?duty.nurse.nama:'-')+'</strong><small>'+esc(shift.label)+'</small></div>'+
      '<div><span>Lokasi Perawatan</span><strong>'+esc(ward.buildingName||'Gedung belum ditetapkan')+' · '+esc(ward.floorName||(ward.floorNumber?'Lantai '+ward.floorNumber:'Lantai belum ditetapkan'))+'</strong><small>'+esc(ward.nama||'Ruang belum ditetapkan')+' · Kamar '+esc(bed.noKamar||'-')+' · '+esc(bed.bedLabel||('Bed '+(bed.noBed||'-')))+' · Kelas '+esc(a.kelasPerawatan||ward.kelas||'-')+'</small></div>'+
    '</div></div></section>'+
    '<section class="panel"><div class="panel-head"><div><h2>🧭 Perjalanan Saya</h2><div class="hint">Status mengikuti aktivitas pelayanan yang tercatat pada episode Rawat Inap.</div></div></div><div class="panel-body">'+patientInpatientJourney(a)+'</div></section>'+
    '<section class="panel"><div class="panel-head"><div><h2>ℹ️ Informasi Perawatan</h2><div class="hint">Sumber admisi dan penjamin ditampilkan sebagai informasi perjalanan.</div></div></div><div class="panel-body"><p><strong>Sumber:</strong> '+esc(a.sumberAdmisi||'-')+'<br><strong>Penjamin:</strong> '+esc(a.jenisBayar||'-')+'<br><strong>Diagnosis masuk:</strong> '+esc(a.diagnosisMasuk||'-')+'</p><div class="alert alert-info">Data ini adalah simulasi portfolio. Keputusan medis tetap berada pada tenaga kesehatan yang berwenang.</div></div></section>';
}

/* =====================================================================
   PENCARIAN KODE: MODUL APLIKASI PASIEN — DASHBOARD
   Tanggung jawab: ringkasan booking, antrean, notifikasi, dan perjalanan.
   Batasan: dashboard hanya membaca status dari sumber data pelayanan.
   ===================================================================== */
function renderPatientDashboard(){
  setPageTitle('Dashboard Pasien');
  reconcileOutpatientPrescriptions();
  const u=Session.currentUser, p=getPatient(u.patientId), activeJourney=getPatientActiveJourney(u.patientId), a=activeJourney&&activeJourney.unit==='rawat-inap'?activeJourney.episode:null, igdV=activeJourney&&activeJourney.unit==='igd'?activeJourney.episode:null, v=activeJourney&&activeJourney.unit==='rawat-jalan'?activeJourney.episode:null;
  if(!p){ document.getElementById('main-content').innerHTML='<div class="empty">Data pasien tidak ditemukan.</div>'; return; }
  const upcoming=Store.data.bookings.filter(function(b){return b.patientId===u.patientId && b.tanggalKontrol>=todayStr() && ['terjadwal','checked_in'].includes(b.status);}).sort(function(a,b){return a.tanggalKontrol.localeCompare(b.tanggalKontrol)||a.noAntrian.localeCompare(b.noAntrian);})[0];
  const permission=('Notification' in window)?Notification.permission:'unsupported';
  let liveHtml='';
  if(v){
    const poli=getPoli(v.poliId), q=getPatientQueueState(v), statusInfo=STATUS_MAP[v.status]||{label:v.status,cls:'badge-slate'};
    const called=v.status==='dipanggil'||v.status==='diperiksa'||q.ahead===0;
    const alertText=called?'🟢 SILAKAN MASUK — nomor Anda sedang dipanggil.':q.ahead<=3?'🟡 BERSIAP — tinggal '+q.ahead+' pasien lagi sebelum giliran Anda.':'🔵 MENUNGGU — aplikasi akan memberi tahu saat tersisa 3 pasien.';
    const liveClass=called?'patient-live-green':q.ahead<=3?'patient-live-warn':'patient-live-blue';
    liveHtml='<section class="panel patient-live-queue '+liveClass+'"><div class="panel-head"><div><div class="ops-eyebrow">LIVE QUEUE MONITOR</div><h2>🎫 '+esc(poli.nama)+'</h2><div class="hint">Antrean diperbarui otomatis dari status pelayanan poli.</div></div><span class="badge '+statusInfo.cls+'">'+statusInfo.label+'</span></div><div class="patient-live-grid">'+
      '<div class="patient-live-card primary"><span>Nomor Anda</span><strong>'+esc(v.noAntrian)+'</strong><small>Posisi antrean Anda</small></div>'+
      '<div class="patient-live-card"><span>Sedang Dilayani</span><strong>'+esc(q.currentNo)+'</strong><small>Nomor yang sedang dipanggil/diperiksa</small></div>'+
      '<div class="patient-live-card"><span>Sudah Dilayani</span><strong>'+q.servedCount+'</strong><small>Pasien sebelum nomor Anda</small></div>'+
      '<div class="patient-live-card"><span>Belum Dilayani</span><strong>'+q.ahead+'</strong><small>Pasien sebelum giliran Anda</small></div>'+
      '<div class="patient-live-card"><span>Setelah Anda</span><strong>'+q.waitingAfter+'</strong><small>Antrean setelah nomor Anda</small></div>'+
      '<div class="patient-live-card"><span>Perkiraan Tunggu</span><strong>± '+Math.max(0,q.ahead*8)+' mnt</strong><small>Estimasi dinamis</small></div>'+
      '</div><div class="patient-live-status"><strong>'+alertText+'</strong><span>Notifikasi otomatis tetap aktif pada ambang 3 pasien sebelum giliran.</span></div></section>';
  } else {
    liveHtml='<section class="panel patient-live-queue patient-live-blue"><div class="panel-head"><div><div class="ops-eyebrow">LIVE QUEUE MONITOR</div><h2>📍 Menunggu Check-in</h2><div class="hint">Setelah pasien datang dan QR/barcode diverifikasi di loket, posisi antrean akan tampil otomatis di sini.</div></div></div><div class="patient-live-status"><strong>🔵 Tiket Anda sudah tersimpan.</strong><span>Silakan lakukan check-in di rumah sakit sesuai jadwal kunjungan.</span></div></section>';
  }
  const ticketHtml=upcoming?'<button type="button" class="patient-ticket patient-ticket-clickable" onclick="openPatientBookingTicket(\''+upcoming.id+'\')"><span>Jadwal Berikutnya · Tap untuk buka tiket</span><strong>'+esc(upcoming.noAntrian)+'</strong><b>'+esc(getPoli(upcoming.poliId).nama)+'</b><small>'+formatTanggalIndo(upcoming.tanggalKontrol)+' · '+esc(upcoming.jenisBayar)+'</small><span class="ticket-reopen-hint">🎫 QR/barcode dapat dibuka kembali kapan saja</span></button>':'<div class="empty"><div class="big">🎫</div>Belum ada booking aktif.</div>';
  let journeyHtml='';
  if(a){
    const bed=Store.data.beds.find(function(b){return b.id===a.bedId;})||{}, ward=Store.data.wards.find(function(w){return w.id===a.wardId;})||{}, dpjp=getUserById(a.dpjpUserId);
    journeyHtml='<section class="panel"><div class="panel-head"><div><div class="ops-eyebrow">PERJALANAN SAYA</div><h2>🏥 PERJALANAN RAWAT INAP</h2><div class="hint">Rawat inap aktif · '+esc(a.status)+'</div></div><span class="badge badge-sage">Aktif</span></div><div class="panel-body"><div class="patient-inpatient-grid"><div><span>Gedung / Lantai</span><strong>'+esc(ward.buildingName||'Gedung belum ditetapkan')+'</strong><small>'+esc(ward.floorName||(ward.floorNumber?'Lantai '+ward.floorNumber:'Lantai belum ditetapkan'))+'</small></div><div><span>Ruang / Kamar / Bed</span><strong>'+esc(ward.nama||'Ruang belum ditetapkan')+'</strong><small>Kamar '+esc(bed.noKamar||'-')+' · '+esc(bed.bedLabel||('Bed '+(bed.noBed||'-')) )+'</small></div><div><span>Dokter penanggung jawab</span><strong>'+esc(dpjp?dpjp.nama:'-')+'</strong></div></div>'+patientInpatientJourney(a)+'</div></section>';
  }else if(igdV){
    const st=(STATUS_MAP[igdV.status]||{label:igdV.status}).label;
    const triageLabel=igdV.triage&&igdV.triage.level?({'merah':'Zona Merah','kuning':'Zona Kuning','hijau':'Zona Hijau','biru':'Zona Hijau'}[igdV.triage.level]||'Prioritas belum ditetapkan'):'Menunggu penilaian triase';
    const igdSteps=[{label:'Kedatangan / Rujukan',state:'done',sub:'Episode IGD tercatat'},{label:'Triase',state:igdV.triage&&igdV.triage.level?'done':'active',sub:triageLabel},{label:'Pemeriksaan dan penanganan',state:['menunggu_dokter','dipanggil','diperiksa','observasi','menunggu_lab','menunggu_penunjang','menunggu_review','menunggu_farmasi','obat_siap','menunggu_bayar'].includes(igdV.status)?'active':(igdV.diagnosis?'done':'pending'),sub:st}];
    if(igdV.labRequest)igdSteps.push({label:'Laboratorium',state:igdV.labRequest.status==='selesai'?'done':igdV.labRequest.status==='menunggu'?'active':'active',sub:igdV.labRequest.status==='selesai'?'Hasil tersedia':igdV.labRequest.status==='diterima'?'Permintaan diterima unit':'Pemeriksaan diproses'});
    if(igdV.radiologyRequest)igdSteps.push({label:'Radiologi',state:igdV.radiologyRequest.status==='selesai'?'done':'active',sub:igdV.radiologyRequest.status==='selesai'?'Hasil tersedia':igdV.radiologyRequest.status==='diterima'?'Permintaan diterima unit':'Pemeriksaan diproses'});
    const igdRx=getResepByVisit(igdV.id);if(igdRx&&Array.isArray(igdRx.items)&&igdRx.items.length)igdSteps.push({label:'Farmasi IGD',state:['diberikan','diambil','selesai'].includes(igdRx.status)?'done':'active',sub:({'menunggu':'Menunggu farmasi','disiapkan':'Obat disiapkan','diambil':'Obat diambil','diberikan':'Obat diberikan','selesai':'Selesai'})[igdRx.status]||igdRx.status});
    if(igdV.disposition==='observasi'||igdV.status==='observasi')igdSteps.push({label:'Observasi dan evaluasi ulang',state:'active',sub:'Episode IGD tetap aktif'});
    if(igdV.disposition==='rawat_inap'||igdV.status==='rujuk_ranap')igdSteps.push({label:'Perpindahan ke rawat inap',state:'active',sub:'Menunggu admisi, perpindahan, dan serah terima dikonfirmasi'});
    journeyHtml='<section class="panel"><div class="panel-head"><div><div class="ops-eyebrow">PERJALANAN SAYA</div><h2>🚑 PERJALANAN IGD</h2><div class="hint">Episode IGD aktif · '+esc(igdV.noAntrian||igdV.id)+' · '+esc(triageLabel)+'</div></div><span class="badge badge-sage">IGD Aktif</span></div><div class="panel-body">'+renderPatientJourneyMapFromSteps(igdSteps,'IGD · '+((igdSteps.find(function(x){return x.state==='active';})||igdSteps[igdSteps.length-1]).label))+'<div class="patient-flow">'+igdSteps.map(function(x){return '<div class="patient-flow-step '+x.state+'"><span>'+(x.state==='done'?'✓':x.state==='active'?'●':'○')+'</span><div><strong>'+esc(x.label)+'</strong><small>'+esc(x.sub||'')+'</small></div></div>';}).join('')+'</div><div class="hint">Status mengikuti pembaruan petugas. Informasi klinis internal tidak ditampilkan pada aplikasi pasien.</div></div></section>';
  }else if(v){
    const poli=getPoli(v.poliId), q=getPatientQueueState(v), schedule=(Store.data.doctorSchedules||[]).find(function(sc){return sc.id===v.sessionId;})||null, doctor=doctorMasterById(v.dokterId)||Store.data.users.find(function(x){return x.id===v.dokterId;})||null;
    const booking=Store.data.bookings.find(function(b){return b.visitId===v.id||b.id===v.bookingId;})||null;
    const jam=(v.appointmentTime||(booking&&booking.appointmentTime)||(schedule&&schedule.jamMulai)||'Belum ditentukan');
    const waitMinutes=Math.max(0,(q?q.ahead:0)*Number((Store.data.meta.settings||{}).avgWaitMinutes||8));
    const estimate=new Date(Date.now()+waitMinutes*60000).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    const estimateText=['selesai','menunggu_farmasi','menunggu_bayar','obat_siap'].includes(v.status)?'Tahap poli selesai':(q&&q.ahead===0&&['dipanggil','diperiksa'].includes(v.status)?'Sedang dilayani':estimate);
    journeyHtml='<section class="panel"><div class="panel-head"><div><div class="ops-eyebrow">PERJALANAN SAYA</div><h2>🩺 PERJALANAN RAWAT JALAN</h2><div class="hint">Status: '+esc((STATUS_MAP[v.status]||{label:v.status}).label)+'</div></div><span class="badge badge-sage">Aktif</span></div><div class="panel-body"><div class="ops-kpi-grid"><div class="ops-kpi"><div class="kpi-label">NOMOR ANTREAN</div><div class="kpi-value">'+esc(v.noAntrian||'—')+'</div></div><div class="ops-kpi"><div class="kpi-label">POLI</div><div class="kpi-value" style="font-size:16px">'+esc(poli?poli.nama:'-')+'</div></div><div class="ops-kpi"><div class="kpi-label">DOKTER</div><div class="kpi-value" style="font-size:14px">'+esc(doctor?doctor.nama:'Mengikuti alokasi poli')+'</div></div><div class="ops-kpi"><div class="kpi-label">JAM KUNJUNGAN</div><div class="kpi-value">'+esc(jam)+'</div></div><div class="ops-kpi"><div class="kpi-label">ESTIMASI DILAYANI</div><div class="kpi-value">'+esc(estimateText)+'</div></div></div><div class="hint">Estimasi antrean merupakan perkiraan dan dapat berubah mengikuti pelayanan aktual.</div><div class="patient-flow">'+patientFlow(v)+'</div></div></section>';
  }
  const inpatientJourney='';
  const igdJourney='';
  document.getElementById('main-content').innerHTML=
    '<div class="patient-hero ops-hero"><div><div class="ops-eyebrow">PATIENT EXPERIENCE</div><h2>Halo, '+esc(p.nama)+'</h2><p>RM '+esc(p.id)+' · Dashboard hanya menampilkan informasi pelayanan milik Anda.</p></div><div><span class="badge badge-sage">Privasi Aktif</span></div></div>'+
    '<section class="panel"><div class="panel-head"><div><h2>👤 Profil Pasien</h2><div class="hint">Identitas akun yang terhubung ke seluruh pelayanan rumah sakit.</div></div></div><div class="panel-body"><div class="patient-inpatient-grid"><div><span>Nama</span><strong>'+esc(p.nama)+'</strong></div><div><span>Nomor Rekam Medis</span><strong>'+esc(p.id)+'</strong></div><div><span>Jenis Kelamin</span><strong>'+esc(p.jenisKelamin==='L'?'Laki-laki':p.jenisKelamin==='P'?'Perempuan':'Belum diisi')+'</strong></div><div><span>Tanggal Lahir</span><strong>'+esc(p.tglLahir||'Belum diisi')+'</strong></div></div></div></section>'+
    journeyHtml+
    '<div class="ops-grid-main"><section class="panel"><div class="panel-head"><div><h2>🎫 Tiket Aktif</h2><div class="hint">Tiket dapat dibuka kembali tanpa screenshot.</div></div></div><div class="panel-body">'+ticketHtml+'</div></section>'+
    (v?'<section class="panel"><div class="panel-head"><div><h2>🔔 Notifikasi Antrean</h2><div class="hint">Pasien diberi tahu saat antrean mendekati nomor Anda.</div></div></div><div class="panel-body"><div class="ops-alert '+(getPatientQueueState(v).ahead<=3?'warning':'')+'"><span class="ops-alert-icon">🔔</span><div><strong>Notifikasi 3 pasien sebelum giliran</strong><div>Ketika nomor Anda dipanggil, indikator akan berubah menjadi hijau agar Anda segera masuk ke poli.</div></div></div><div style="margin-top:12px"><button class="btn btn-primary" id="btn-patient-notif">'+(permission==='granted'?'✓ Notifikasi HP Aktif':'🔔 Aktifkan Notifikasi HP')+'</button></div></div></section>':'')+'</div>'; 
  const nb=document.getElementById('btn-patient-notif'); if(nb) nb.addEventListener('click',enablePatientNotifications);
  maybeNotifyPatientQueue();
  if(window.__patientPoll) clearInterval(window.__patientPoll);
  window.__patientPoll=setInterval(function(){ if(Session.currentUser && Session.currentUser.role==='pasien' && currentRoute()==='pasien-dashboard'){ maybeNotifyPatientQueue(); renderPatientDashboard(); } },15000);


}
function kpiPatient(icon,label,value,sub){ return '<div class="ops-kpi"><div class="ops-kpi-icon">'+icon+'</div><div><div class="ops-kpi-label">'+label+'</div><div class="ops-kpi-value">'+value+'</div><div class="ops-kpi-sub">'+sub+'</div></div></div>'; }
function patientJourneyDefinition(v){
  // Patient Journey bersifat dinamis: unit yang tidak dibutuhkan pasien tidak ditampilkan.
  // Jalur aktual ditentukan oleh tindakan/permintaan dokter, bukan sekadar poli.
  const hasLab=!!(v && v.labRequest);
  const hasRad=!!(v && v.radiologyRequest);
  const rx=v?getResepByVisit(v.id):null;
  const hasRx=!!(v && rx && Array.isArray(rx.items) && rx.items.length>0 && ['menunggu','disiapkan','diambil','diberikan','selesai'].includes(rx.status));
  const steps=[
    {key:'booking',label:'Pendaftaran',icon:'📅'},
    {key:'checkin',label:'Check-in',icon:'✓'},
    {key:'screening',label:'Verifikasi',icon:'🩺'},
    {key:'doctor',label:'Dokter',icon:'👨‍⚕️'}
  ];
  if(hasLab){
    steps.push({key:'lab',label:'Laboratorium',icon:'🧪'});
    steps.push({key:'review',label:'Review Dokter',icon:'📋'});
  }
  if(hasRad){steps.push({key:'radiology',label:'Radiologi',icon:'☢️'});steps.push({key:'review_rad',label:'Review Hasil Radiologi',icon:'📋'});}
  if((v.referrals||[]).some(function(r){return r.destination==='igd';}) || v.status==='menunggu_rujukan_igd') steps.push({key:'igd_referral',label:'Konfirmasi Rujukan IGD',icon:'🚑'});
  if((v.referrals||[]).some(function(r){return r.destination==='rawat-inap';}) || v.status==='rujuk_ranap') steps.push({key:'rawat_inap_referral',label:'Konfirmasi Admisi Rawat Inap',icon:'🏥'});
  if(hasRx){
    steps.push({key:'pharmacy_prepare',label:'Farmasi',sub:'Siapkan obat',icon:'💊'});
  }
  steps.push({key:'payment',label:'Kasir',icon:'💳'});
  if(hasRx){
    steps.push({key:'pharmacy_pickup',label:'Pengambilan Obat',sub:'Ambil obat di farmasi',icon:'💊'});
  }
  steps.push({key:'done',label:'Selesai',icon:'✓'});
  return steps;
}
function patientJourneyIndex(v,steps){
  if(!v) return 0;
  const rx=getResepByVisit(v.id);
  let status=v.status;
  // Status episode adalah sumber kebenaran. Resep yang tersimpan tidak boleh membuat
  // tahap dokter tampak selesai ketika visit masih berstatus diperiksa.
  if(status!=='diperiksa' && rx && rx.status==='menunggu' && !['dibatalkan','menunggu_lab','menunggu_penunjang','menunggu_review','menunggu_rujukan_igd'].includes(status)) status='menunggu_farmasi';
  if(status!=='diperiksa' && rx && rx.status==='disiapkan' && !['obat_siap','selesai','menunggu_lab','menunggu_penunjang','menunggu_review','menunggu_rujukan_igd'].includes(status)) status='menunggu_bayar';
  const key= status==='terjadwal' ? 'booking' :
    status==='checked_in' ? 'checkin' :
    ['menunggu_screening','screening'].includes(status) ? 'screening' :
    ['menunggu_dokter','dipanggil','diperiksa'].includes(status) ? 'doctor' :
    status==='menunggu_lab' ? 'lab' :
    status==='menunggu_penunjang' ? 'radiology' :
    status==='menunggu_rujukan_igd' ? 'igd_referral' :
    status==='menunggu_review' ? (v.radiologyRequest&&v.radiologyRequest.status==='selesai'?'review_rad':'review') :
    status==='menunggu_farmasi' ? 'pharmacy_prepare' :
    status==='menunggu_bayar' ? 'payment' :
    status==='obat_siap' ? 'pharmacy_pickup' :
    status==='selesai' ? 'done' : 'checkin';
  const idx=steps.findIndex(function(x){return x.key===key;});
  return idx>=0?idx:Math.min(steps.length-1,1);
}
function patientJourneyStepState(v, step){
  if(!v)return 'pending';
  const rx=getResepByVisit(v.id),status=v.status||'';
  const active=['menunggu_screening','screening','menunggu_dokter','dipanggil','diperiksa','menunggu_lab','menunggu_penunjang','menunggu_review','menunggu_farmasi','menunggu_bayar','obat_siap','menunggu_rujukan_igd'].includes(status);
  if(step.key==='booking')return v.workflow&&v.workflow.bookedAt?'done':'done';
  if(step.key==='checkin')return (v.workflow&&v.workflow.checkinAt)||v.status!=='terjadwal'?'done':'active';
  if(step.key==='screening')return (v.workflow&&v.workflow.screeningAt)?'done':(['menunggu_screening','screening'].includes(status)?'active':(active?'done':'done'));
  if(step.key==='doctor')return status==='diperiksa'? 'active' : (['menunggu_lab','menunggu_penunjang','menunggu_review','menunggu_farmasi','menunggu_bayar','obat_siap','selesai','menunggu_rujukan_igd'].includes(status)?'done':(['menunggu_dokter','dipanggil'].includes(status)?'active':'pending'));
  if(step.key==='lab')return !v.labRequest?'pending':(v.labRequest.status==='selesai'?'done':'active');
  if(step.key==='radiology')return !v.radiologyRequest?'pending':(v.radiologyRequest.status==='selesai'?'done':'active');
  if(step.key==='review')return !v.labRequest?'pending':(v.labRequest.status!=='selesai'?'pending':((v.workflow&&v.workflow.reviewAt)?'done':'active'));
  if(step.key==='review_rad')return !v.radiologyRequest?'pending':(v.radiologyRequest.status!=='selesai'?'pending':((v.workflow&&v.workflow.reviewAt)?'done':'active'));
  if(step.key==='rawat_inap_referral'){const req=(Store.data.careRequests||[]).find(function(r){return r.sourceVisitId===v.id&&r.destination==='rawat-inap';});return req&&req.status==='selesai'?'done':(req&&['menunggu_konfirmasi','sedang_diproses'].includes(req.status)?'active':(status==='rujuk_ranap'?'active':'pending'));}
  if(step.key==='igd_referral'){
    const req=(Store.data.careRequests||[]).find(function(r){return r.sourceVisitId===v.id&&r.destination==='igd';});
    return req&&req.status==='diterima'?'done':(req&&req.status==='menunggu_konfirmasi'?'active':(status==='menunggu_rujukan_igd'?'active':'pending'));
  }
  if(step.key==='pharmacy_prepare')return !rx||!Array.isArray(rx.items)||!rx.items.length?'pending':(status==='diperiksa'?'pending':(['diambil','diberikan','selesai'].includes(rx.status)?'done':(rx.status==='menunggu'?'active':(rx.status==='disiapkan'?'done':'pending'))));
  if(step.key==='payment')return status==='menunggu_bayar'?'active':(['obat_siap','selesai'].includes(status)?'done':'pending');
  if(step.key==='pharmacy_pickup')return !rx||!Array.isArray(rx.items)||!rx.items.length?'pending':(rx.status==='diambil'?'done':(status==='obat_siap'?'active':'pending'));
  if(step.key==='done')return status==='selesai'?'done':'pending';
  return 'pending';
}
/* PENCARIAN KODE: MODUL APLIKASI PASIEN — DEFINISI ALUR PERJALANAN
   Menyusun tahapan yang ditampilkan kepada pasien. Urutan tampilan harus
   selaras dengan status sumber; jangan menandai tahap selesai hanya karena
   sebuah tombol/tampilan dibuka. */
function renderPatientJourneyMapFromSteps(steps, currentLabel){
  if(!Array.isArray(steps)||!steps.length)return '';
  const states=steps.map(function(step){return step.state==='done'?'done':step.state==='active'?'active':'pending';});
  const found=states.findIndex(function(state){return state==='active';});
  const pendingIndex=states.findIndex(function(state){return state==='pending';});
  const activeIndex=found>=0?found:(pendingIndex>=0?pendingIndex:Math.max(0,states.length-1));
  const current=steps[activeIndex]||steps[steps.length-1];
  const progress=steps.length>1?activeIndex/(steps.length-1)*100:0;
  const nodes=steps.map(function(step,i){const state=states[i];return '<div class="journey-map-node '+state+'" data-journey-key="'+esc(step.key||step.label)+'"><span class="journey-map-building" aria-hidden="true"><i></i><i></i><i></i><b>'+(state==='done'?'✓':esc(step.icon||'•'))+'</b></span><strong>'+esc(step.label)+'</strong></div>';}).join('');
  const finished=states.every(function(state){return state==='done';});
  return '<section class="patient-journey-map" aria-label="Peta perjalanan layanan pasien"><div class="journey-map-head"><div><span class="simrs-eyebrow">PETA PERJALANAN</span><h3>Lokasi layanan Anda</h3></div><span class="journey-map-current">'+esc(currentLabel||current.sub||current.label)+'</span></div><div class="journey-map-scene" style="--journey-count:'+steps.length+'"><div class="journey-map-ground" aria-hidden="true"></div><div class="journey-map-route" style="--journey-progress:'+progress+'%" aria-hidden="true"></div><div class="journey-map-nodes">'+nodes+'</div><div class="journey-map-person '+(finished?'is-finished':'')+'" style="--journey-person-x:'+progress+'%;--journey-person-y:'+(activeIndex%2===0?'30%':'69%')+'" aria-label="Posisi pasien pada tahap '+esc(current.label)+'"><span aria-hidden="true">●</span><b aria-hidden="true">●</b><i aria-hidden="true">▰</i></div></div><p class="journey-map-note">Figur menunjukkan tahap pelayanan yang tercatat, bukan posisi GPS. Perpindahan mengikuti konfirmasi petugas.</p></section>';
}

function patientFlow(v){
  const steps=patientJourneyDefinition(v);
  const states=steps.map(function(step){return patientJourneyStepState(v,step);});
  const foundActive=states.findIndex(function(state){return state==='active';});
  const pendingIndex=states.findIndex(function(state){return state==='pending';});
  const activeIndex=foundActive>=0?foundActive:(pendingIndex>=0?pendingIndex:Math.max(0,states.length-1));
  const activeStep=steps[activeIndex]||steps[steps.length-1]||null;
  const routePct=steps.length>1?(activeIndex/(steps.length-1))*100:0;
  const journeyFinished=states.length>0&&states.every(function(state){return state==='done';});
  const mapNodes=steps.map(function(step,i){
    const state=states[i],cls=state==='done'?'done':state==='active'?'active':'pending';
    return '<div class="journey-map-node '+cls+'" data-journey-key="'+esc(step.key)+'"><span class="journey-map-building" aria-hidden="true"><i></i><i></i><i></i><b>'+(state==='done'?'✓':step.icon)+'</b></span><strong>'+esc(step.label)+'</strong></div>';
  }).join('');
  const sub=activeStep&&activeStep.sub?activeStep.sub:(activeStep?activeStep.label:'Menunggu pembaruan');
  const map='<section class="patient-journey-map" aria-label="Peta perjalanan layanan pasien"><div class="journey-map-head"><div><span class="simrs-eyebrow">PETA PERJALANAN</span><h3>Lokasi layanan Anda</h3></div><span class="journey-map-current">'+esc(sub)+'</span></div><div class="journey-map-scene"><div class="journey-map-ground" aria-hidden="true"></div><div class="journey-map-route" style="--journey-progress:'+routePct+'%" aria-hidden="true"></div><div class="journey-map-nodes">'+mapNodes+'</div><div class="journey-map-person '+(journeyFinished||activeStep&&activeStep.key==='done'?'is-finished':'')+'" style="--journey-person-x:'+routePct+'%;--journey-person-y:'+(activeIndex%2===0?'30%':'69%')+'" aria-label="Posisi pasien pada tahap '+esc(activeStep?activeStep.label:'layanan')+'"><span aria-hidden="true">●</span><b aria-hidden="true">●</b><i aria-hidden="true">▰</i></div></div><p class="journey-map-note">Peta mengikuti status layanan yang tercatat, bukan pelacakan GPS. Lokasi berikutnya hanya ditampilkan bila terkait dengan episode ini.</p></section>';
  const timeline=steps.map(function(step,i){
    const state=states[i],isDone=state==='done',isActive=state==='active';
    const sub=step.sub?'<small>'+esc(step.sub)+'</small>':'<small>'+esc(step.key.toUpperCase())+'</small>';
    return '<div class="patient-flow-step '+(isDone?'done ':'')+(isActive?'active ':'')+' '+(state==='pending'?'pending':'')+'"><span>'+(isDone?'✓':step.icon)+'</span><div><strong>'+esc(step.label)+'</strong>'+sub+'</div></div>';
  }).join('');
  return map+'<div class="patient-flow-timeline" aria-label="Timeline status layanan">'+timeline+'</div>';
}
/* PENCARIAN KODE: MODUL APLIKASI PASIEN — IZIN NOTIFIKASI
   Mengelola kesiapan notifikasi di browser. Penolakan izin tidak boleh
   menghentikan booking, check-in, atau alur pelayanan inti. */
function enablePatientNotifications(){
  if(!('Notification' in window)){ showToast('Browser ini tidak mendukung notifikasi sistem','warning'); return; }
  Notification.requestPermission().then(function(permission){ if(permission==='granted'){ showToast('Notifikasi HP aktif','success'); maybeNotifyPatientQueue(); renderPatientDashboard(); } else showToast('Izin notifikasi belum diberikan','warning'); });
}

function greetingWaktu(){ const h=new Date().getHours(); return h<11?'Selamat pagi':h<15?'Selamat siang':h<18?'Selamat sore':'Selamat malam'; }
/* MODUL: RAWAT INAP — BERANDA OPERASIONAL. Data berasal dari Store.data.admissions dan Store.data.beds. */
function renderInpatientBeranda(){
  const u=Session.currentUser||{}, all=['admin','admisi_ranap','dokter_ranap'].includes(u.role), ids=Array.isArray(u.wardIds)&&u.wardIds.length?u.wardIds:(u.wardId?[u.wardId]:[]);
  const list=(Store.data.admissions||[]).filter(function(a){return a.status==='dirawat'&&(all||ids.includes(a.wardId));});
  setPageTitle('Beranda Rawat Inap');
  document.getElementById('main-content').innerHTML='<div class="ops-hero"><div><div class="ops-eyebrow">SIMRS PROTOTYPE · RAWAT INAP</div><h2>Beranda Rawat Inap</h2><p>Ringkasan pasien aktif sesuai penugasan dan penempatan ruang.</p></div><div class="ops-hero-actions"><button class="btn btn-outline btn-sm" data-nav="monitor-antrean">Monitor</button><button class="btn btn-primary btn-sm" data-nav="ranap">Ruang Perawatan</button></div></div><div class="stats-grid">'+statCard('Pasien Aktif',list.length,'episode rawat inap')+statCard('Bed Terisi',Store.data.beds.filter(function(b){return b.status==='terisi'&&(all||ids.includes(b.wardId));}).length,'bed yang digunakan')+statCard('Order Aktif',list.reduce(function(n,a){return n+(a.orders||[]).filter(function(o){return !['selesai','dibatalkan','ditolak'].includes(o.status);}).length;},0),'instruksi belum selesai')+'</div><section class="panel"><div class="panel-head"><h2>Pasien aktif</h2></div><div class="panel-body">'+(list.length?list.map(function(a){const p=getPatient(a.patientId)||{},w=Store.data.wards.find(function(x){return x.id===a.wardId;})||{},b=Store.data.beds.find(function(x){return x.id===a.bedId;})||{};return '<div class="history-item"><strong>'+esc(p.nama||'Pasien')+'</strong><div class="hint">'+esc(p.id||'-')+' · '+esc(w.buildingName||'-')+' · '+esc(w.floorName||'')+' · '+esc(w.nama||'-')+' · Kamar '+esc(b.noKamar||'-')+' · Bed '+esc(b.noBed||'-')+'</div><div class="hint">Penjamin '+esc(a.jenisBayar||'-')+' · Kelas '+esc(a.kelasPerawatan||w.kelas||'-')+' · DPJP '+esc((getUserById(a.dpjpUserId)||{}).nama||'-')+'</div><button class="btn btn-outline btn-sm" data-ipd-open="'+a.id+'">Buka episode</button></div>';}).join(''):'<div class="empty">Belum ada pasien aktif pada ruang lingkup akun ini.</div>')+'</div></section>';
  document.querySelectorAll('[data-ipd-open]').forEach(function(b){b.addEventListener('click',function(){const id=b.dataset.ipdOpen;navigate('ranap');setTimeout(function(){bukaAdmisi(id);},50);});});bindContentNavigation();
}
function renderBeranda(){
  if(Session.currentUser&&['dokter_ranap','perawat_ranap','admisi_ranap'].includes(Session.currentUser.role)){renderInpatientBeranda();return;}
  if(Session.currentUser&&(['dokter_igd','perawat_triase_igd','perawat_pelaksana_igd','perawat_igd'].includes(Session.currentUser.role)||(Session.currentUser.unit==='igd'&&['farmasi','kasir'].includes(Session.currentUser.role)))){renderIgdHome();return;}
  if(Session.currentUser&&Session.currentUser.role==='lab'){renderAncillaryHome('lab');return;}
  if(Session.currentUser&&Session.currentUser.role==='radiologi'){renderAncillaryHome('radiologi');return;}
  const u = Session.currentUser;
  setPageTitle('Beranda');
  document.getElementById('main-content').innerHTML =
    '<div class="hello-bar"><div><h1>'+greetingWaktu()+', '+esc((u.nama||'').split(' ')[0])+'</h1>'+
    '<p style="color:var(--ink-soft);font-size:13px;margin-top:2px">'+formatTanggalIndo(todayStr())+(u.poliId?' · '+esc(getPoli(u.poliId).nama):'')+'</p></div></div>'+
    '<div id="beranda-body"></div>';
  renderBerandaBody();
}
function renderBerandaBody(){
  const u = Session.currentUser;
  const el = document.getElementById('beranda-body');
  if(!el) return;
  if(u.role==='admin') el.innerHTML = berandaAdmin();
  else if(u.role==='loket') el.innerHTML = berandaLoket();
  else if(u.role==='dokter') el.innerHTML = berandaDokter();
  else if(u.role==='farmasi') el.innerHTML = berandaFarmasi();
  else if(u.role==='kasir') el.innerHTML = berandaKasir();
  else if(u.role==='lab') el.innerHTML = berandaLab();
  else if(u.role==='perawat') el.innerHTML = berandaPerawat();
  if(u.role==='dokter'){
    poliState.poliId=canonicalPoliId(u.poliId);
    renderJadwalKontrolPoli();
    renderInfoPraktikPoli();
  }
  bindBerandaActionEvents();
}
function bindContentNavigation(){
  document.querySelectorAll('#main-content [data-nav]').forEach(function(c){if(c.dataset.navBound==='1')return;c.dataset.navBound='1';c.addEventListener('click',function(){navigate(c.dataset.nav);});});
}
function bindBerandaActionEvents(){
  bindContentNavigation();
  document.querySelectorAll('[data-action="global-search"]').forEach(c=> c.addEventListener('click', openGlobalSearch));
}
function berandaAdmin(){
  const today=todayStr();
  const visits=visitsToday();
  const activeRI=Store.data.admissions.filter(function(a){return a.status==='dirawat';});
  const activeOrders=activeRI.reduce(function(n,a){return n+(Array.isArray(a.orders)?a.orders.filter(function(o){return ['lab','radiologi'].includes(o.jenis)&&o.status==='menunggu';}).length:0);},0);
  const labPending=visits.filter(function(v){return v.status==='menunggu_lab';}).length + Store.data.admissions.reduce(function(n,a){return n+(Array.isArray(a.orders)?a.orders.filter(function(o){return o.jenis==='lab'&&o.status==='menunggu';}).length:0);},0);
  const radPending=Store.data.admissions.reduce(function(n,a){return n+(Array.isArray(a.orders)?a.orders.filter(function(o){return o.jenis==='radiologi'&&o.status==='menunggu';}).length:0);},0);
  const pharmacyPending=pharmacyMetrics('rawat-jalan').pending+pharmacyMetrics('rawat-inap').pending;
  const beds=Store.data.beds||[];
  const recent=(Store.data.audit||[]).slice(-5).reverse();
  return '<div class="ops-hero"><div><div class="ops-eyebrow">ADMIN OPERATIONAL OVERVIEW</div><h2>Ringkasan Operasional</h2><p>'+formatTanggalIndo(today)+' · Pantau layanan utama dari satu halaman.</p></div><div class="ops-hero-actions"><button class="btn btn-primary btn-sm" data-nav="dashboard">▦ Buka Dashboard</button></div></div>'+
    '<div class="ops-kpi-grid">'+
      statCard('Rawat Jalan',visits.length,'kunjungan hari ini')+
      statCard('Rawat Inap',activeRI.length,'pasien sedang dirawat')+
      statCard('Bed Tersedia',beds.filter(function(b){return b.status==='kosong';}).length,beds.length+' total')+
      statCard('IGD',Store.data.visits.filter(function(v){return v.unit==='igd'&&v.tanggal===today;}).length,'kunjungan hari ini')+
      statCard('Laboratorium',labPending,'order menunggu')+
      statCard('Radiologi',radPending,'order menunggu')+
      statCard('Farmasi',pharmacyPending,'order/resep menunggu')+
      statCard('Aktivitas',recent.length,'audit terbaru')+
    '</div>'+
    '<div class="ops-grid-main"><section class="panel ops-panel"><div class="panel-head"><div><h2>⚡ Akses Cepat</h2><div class="hint">Modul yang paling sering digunakan Admin.</div></div></div><div class="panel-body"><div class="action-grid admin-quick-grid">'+
      '<div class="action-card" data-nav="pendaftaran"><span class="ic">📝</span><span class="lbl">Pendaftaran</span></div>'+
      '<div class="action-card" data-nav="booking"><span class="ic">📅</span><span class="lbl">Booking</span></div>'+
      '<div class="action-card" data-nav="poli"><span class="ic">🩺</span><span class="lbl">Rawat Jalan</span></div>'+
      '<div class="action-card" data-nav="igd"><span class="ic">🚑</span><span class="lbl">IGD</span></div>'+
      '<div class="action-card" data-nav="ranap"><span class="ic">🏥</span><span class="lbl">Rawat Inap</span></div>'+
      '<div class="action-card" data-nav="lab"><span class="ic">🧪</span><span class="lbl">Laboratorium</span></div>'+
      '<div class="action-card" data-nav="radiologi"><span class="ic">☢️</span><span class="lbl">Radiologi</span></div>'+
      '<div class="action-card" data-nav="farmasi-rawat-jalan"><span class="ic">💊</span><span class="lbl">Farmasi RJ</span></div>'+
      '<div class="action-card" data-nav="farmasi-rawat-inap"><span class="ic">💊</span><span class="lbl">Farmasi RI</span></div>'+
      '<div class="action-card" data-nav="farmasi-igd"><span class="ic">💊</span><span class="lbl">Farmasi IGD</span></div>'+
      '<div class="action-card" data-nav="kasir-rawat-jalan"><span class="ic">🧾</span><span class="lbl">Kasir RJ</span></div>'+
      '<div class="action-card" data-nav="kasir-rawat-inap"><span class="ic">🧾</span><span class="lbl">Kasir RI</span></div>'+
      '<div class="action-card" data-nav="kasir-igd"><span class="ic">🧾</span><span class="lbl">Kasir IGD</span></div>'+
      '<div class="action-card" data-nav="rekam-medis"><span class="ic">📋</span><span class="lbl">Rekam Medis</span></div>'+
      '<div class="action-card" data-nav="cek-antrian"><span class="ic">📺</span><span class="lbl">Papan Antrian</span></div>'+
      '<div class="action-card" data-nav="monitor-antrean"><span class="ic">🖥️</span><span class="lbl">Monitor</span></div>'+
      '<div class="action-card" data-nav="informasi-rs"><span class="ic">ℹ️</span><span class="lbl">Informasi RS</span></div>'+
      '<div class="action-card" data-nav="master-data"><span class="ic">⚙️</span><span class="lbl">Master Data</span></div>'+
      '<div class="action-card" data-nav="audit-sistem"><span class="ic">🔍</span><span class="lbl">Audit Sistem</span></div>'+
    '</div></div></section><section class="panel ops-panel"><div class="panel-head"><div><h2>🕘 Aktivitas Terbaru</h2><div class="hint">Ringkasan aktivitas sistem, bukan catatan klinis.</div></div></div><div class="panel-body">'+
      (recent.length?recent.map(function(x){return '<div class="history-item"><strong>'+esc(x.action||x.type||'Aktivitas')+'</strong><div class="hint">'+esc(x.at?formatTanggalWaktu(x.at):'Waktu tidak tersedia')+' · '+esc(x.userName||x.user||'Sistem')+'</div></div>';}).join(''):'<div class="empty">Belum ada aktivitas terbaru.</div>')+
    '</div></section></div>';
}

function berandaLoket(){
  const visits = visitsToday();
  const besok = dateOffset(1);
  const bookingBesok = Store.data.bookings.filter(b=>b.tanggalKontrol===besok && b.status==='terjadwal');
  const belumIngat = bookingBesok.filter(b=>!b.reminded).length;
  return '<div class="grid grid-3">'+
      statCard('Pasien Terdaftar', visits.length, 'hari ini')+
      statCard('Booking Besok', bookingBesok.length, belumIngat+' belum diingatkan')+
      statCard('Sedang Berjalan', visits.filter(v=>v.status!=='selesai').length, 'antrian aktif')+
    '</div>'+
    '<div class="action-grid">'+
      '<div class="action-card" data-nav="pendaftaran"><span class="ic">📝</span><span class="lbl">Daftarkan Pasien</span></div>'+
      '<div class="action-card" data-nav="booking"><span class="ic">📅</span><span class="lbl">Booking Antrian</span></div>'+
      '<div class="action-card" data-action="global-search"><span class="ic">🔍</span><span class="lbl">Cari Pasien</span></div>'+
      '<div class="action-card" data-nav="cek-antrian"><span class="ic">📺</span><span class="lbl">Cek Antrian</span></div>'+
    '</div>'+
    '<div class="panel"><div class="panel-head"><h2>Antrian Hari Ini</h2></div><div class="panel-body">'+renderAntrianTable(visits)+'</div></div>';
}
function berandaDokter(){
  const u = Session.currentUser;
  const poli = getPoli(u.poliId);
  const visits = visitsToday().filter(v=>samePoli(v.poliId,u.poliId) && v.unit==='rawat-jalan');
  const menunggu = visits.filter(v=>['menunggu_dokter','dipanggil'].includes(v.status)).sort((a,b)=> (b.prioritas?1:0)-(a.prioritas?1:0) || (queueNumberValue(a.noAntrian)||999999)-(queueNumberValue(b.noAntrian)||999999));
  const aktif = visits.find(v=>v.status==='diperiksa' && v.dokterId===u.id);
  const urgentCount = menunggu.filter(v=>v.prioritas).length;
  const hasilLabSiap = visits.filter(v=>v.labRequest && v.labRequest.status==='selesai' && ['diperiksa','menunggu_review'].includes(v.status)).length;
  return '<div class="panel"><div class="panel-head"><div><div class="ops-eyebrow">BERANDA DOKTER</div><h2>Ringkasan Praktik — '+esc(poli.nama)+'</h2><div class="hint">'+formatTanggalIndo(todayStr())+' · Informasi umum ada di sini; ruang Poli difokuskan pada pemeriksaan pasien.</div></div><span class="badge badge-sage">Dokter Rawat Jalan</span></div><div class="panel-body">'+
    '<div class="grid grid-3">'+statCard('Siap Diperiksa',menunggu.length,urgentCount?urgentCount+' prioritas':'menunggu panggilan')+statCard('Sedang Diperiksa',aktif?1:0,aktif?aktif.noAntrian:'tidak ada kunjungan aktif')+statCard('Hasil Penunjang Siap',hasilLabSiap,'perlu ditinjau')+'</div>'+
    '<div class="action-grid"><div class="action-card" data-nav="poli"><span class="ic">🩺</span><span class="lbl">Buka Ruang Poli</span></div><div class="action-card" data-nav="monitor-antrean"><span class="ic">🖥️</span><span class="lbl">Monitor Antrean</span></div><div class="action-card" data-nav="rekam-medis"><span class="ic">📋</span><span class="lbl">Cari Rekam Medis</span></div></div></div></div>'+
    '<div class="panel"><div class="panel-head"><div><h2>📊 Ringkasan Pelayanan Poli</h2><div class="hint">Sembilan indikator operasional berdasarkan data kunjungan dan farmasi poli ini.</div></div></div><div class="panel-body"><div id="doctor-beranda-kpi">'+rawatJalanKpiHtml(u.poliId)+'</div></div></div>'+
    '<div id="doctor-beranda-journey">'+renderRawatJalanPatientJourney(u.poliId)+'</div>'+
    '<div class="grid grid-2"><div class="panel" id="poli-jadwal-panel"></div><div class="panel" id="poli-info-panel"></div></div>';
}
function berandaFarmasi(){
  const visits = visitsToday();
  const stokMenipis = Store.data.medicines.filter(m=>m.stok<LOW_STOCK_THRESHOLD).length;
  const resepRanap = Store.data.prescriptions.filter(r=>r.admissionId && r.status==='menunggu').length;
  return '<div class="grid grid-4">'+
      statCard('Resep Rawat Jalan', visits.filter(v=>v.status==='menunggu_farmasi').length, 'perlu disiapkan')+
      statCard('Resep Rawat Inap', resepRanap, 'perlu disiapkan')+
      statCard('Siap Diambil', visits.filter(v=>v.status==='obat_siap').length, 'menunggu pasien')+
      statCard('Stok Menipis', stokMenipis, stokMenipis>0 ? 'perlu restock' : 'aman')+
    '</div>'+
    '<div class="action-grid">'+
      '<div class="action-card" data-nav="farmasi"><span class="ic">💊</span><span class="lbl">Antrian Resep</span></div>'+
      '<div class="action-card" data-action="global-search"><span class="ic">🔍</span><span class="lbl">Cari Pasien</span></div>'+
      '<div class="action-card" data-nav="cek-antrian"><span class="ic">📺</span><span class="lbl">Cek Antrian</span></div>'+
    '</div>';
}
function berandaKasir(){
  const today = todayStr();
  const trxHariIni = Store.data.transactions.filter(t=>todayStr(new Date(t.createdAt))===today);
  const tagihanRanap = Store.data.admissions.filter(a=>a.status!=='dirawat' && a.billing.statusBayar==='belum_bayar').length;
  return '<div class="grid grid-4">'+
      statCard('Menunggu Bayar (Rawat Jalan)', visitsToday().filter(v=>v.status==='menunggu_bayar').length, 'tagihan aktif')+
      statCard('Menunggu Bayar (Rawat Inap)', tagihanRanap, 'pasien sudah pulang')+
      statCard('Pendapatan Hari Ini', formatRupiah(trxHariIni.reduce((s,t)=>s+t.total,0)), trxHariIni.length+' transaksi')+
      statCard('Booking Besok', Store.data.bookings.filter(b=>b.tanggalKontrol===dateOffset(1)).length, 'perlu disiapkan')+
    '</div>'+
    '<div class="action-grid">'+
      '<div class="action-card" data-nav="kasir"><span class="ic">🧾</span><span class="lbl">Proses Bayar</span></div>'+
      '<div class="action-card" data-action="global-search"><span class="ic">🔍</span><span class="lbl">Cari Pasien</span></div>'+
      '<div class="action-card" data-nav="cek-antrian"><span class="ic">📺</span><span class="lbl">Cek Antrian</span></div>'+
    '</div>';
}
function berandaLab(){
  return '<div class="grid grid-3">'+
      statCard('Menunggu Pemeriksaan', visitsToday().filter(v=>v.status==='menunggu_lab').length, 'rujukan masuk')+
    '</div>'+
    '<div class="action-grid">'+
      '<div class="action-card" data-nav="lab"><span class="ic">🧪</span><span class="lbl">Antrian Lab</span></div>'+
      '<div class="action-card" data-action="global-search"><span class="ic">🔍</span><span class="lbl">Cari Pasien</span></div>'+
      '<div class="action-card" data-nav="cek-antrian"><span class="ic">📺</span><span class="lbl">Cek Antrian</span></div>'+
    '</div>';
}
function berandaPerawat(){
  const u = Session.currentUser || {};
  // Asisten/perawat Rawat Jalan memiliki workspace screening sendiri.
  if(u.unit==='rawat-jalan' && u.poliId){
    const poliId=canonicalPoliId(u.poliId);
    const visits=visitsToday().filter(v=>samePoli(v.poliId,poliId));
    const screening=visits.filter(v=>['menunggu_screening','screening'].includes(v.status));
    const siapDokter=visits.filter(v=>v.status==='menunggu_dokter');
    return '<h3 style="color:var(--ink-soft);margin-bottom:10px">🩺 Asisten Poli — '+esc(getPoli(poliId)?.nama||'Rawat Jalan')+'</h3>'+
      '<div class="grid grid-3">'+
        statCard('Menunggu Screening', screening.length, 'perlu ditangani')+
        statCard('Menunggu Dokter', siapDokter.length, 'screening selesai')+
        statCard('Selesai Hari Ini', visits.filter(v=>v.status==='selesai').length, 'kunjungan')+
      '</div>'+
      '<div class="action-grid">'+
        '<div class="action-card" data-nav="poli"><span class="ic">🩺</span><span class="lbl">Screening & Antrian Poli</span></div>'+
        '<div class="action-card" data-nav="rekam-medis"><span class="ic">📋</span><span class="lbl">Rekam Medis</span></div>'+
        '<div class="action-card" data-nav="poli"><span class="ic">🩺</span><span class="lbl">Buka Poli</span></div>'+
      '</div>'+
      '<div class="panel"><div class="panel-head"><h2>Pasien yang Perlu Ditangani</h2></div><div class="panel-body">'+
        (screening.length ? screening.map(v=>{const p=getPatient(v.patientId);return '<div class="rj-queue-item"><div><div class="rj-q-top"><span class="rj-q-no">'+esc(v.noAntrian)+'</span>'+badgeStatus(v.status)+'</div><strong>'+esc(p?.nama||'-')+'</strong></div><button class="btn btn-primary btn-sm" data-nav="poli">Buka Screening</button></div>';}).join('') : '<div class="empty">Tidak ada pasien yang menunggu screening.</div>')+
      '</div></div>';
  }
  const aktif = Store.data.admissions.filter(a=>a.status==='dirawat');
  const perluPerhatian = aktif.filter(a=>{ const v=a.vitalLog[a.vitalLog.length-1]; return v && v.news2>=5; }).length;
  const bedKosong = Store.data.beds.filter(b=>b.status==='kosong').length;
  return '<div class="grid grid-3">'+statCard('Pasien Dirawat',aktif.length,'seluruh bangsal')+statCard('Perlu Perhatian',perluPerhatian,'skor NEWS2 ≥5')+statCard('Bed Kosong',bedKosong,'dari '+Store.data.beds.length+' total')+'</div>'+
    '<div class="action-grid"><div class="action-card" data-nav="poli"><span class="ic">🩺</span><span class="lbl">Poli Saya</span></div><div class="action-card" data-nav="rekam-medis"><span class="ic">📋</span><span class="lbl">Rekam Medis</span></div><div class="action-card" data-nav="riwayat-dokter"><span class="ic">🕘</span><span class="lbl">Riwayat</span></div></div>';
}

