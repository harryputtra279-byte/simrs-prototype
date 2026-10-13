/* =================================================================
   MODUL 01 — CORE, STORE, MASTER DATA & AKUN DEMO
   Tanggung jawab: Konstanta, seed/migrasi data, penyimpanan lokal, master fasilitas, akun demo, dan helper dasar.
   Kontrak integrasi: dijalankan sebagai classic script berurutan setelah modul sebelumnya;
   gunakan Store/Session/helper bersama yang sudah didefinisikan. Jangan mengubah urutan pemuatan
   tanpa audit dependensi dan uji alur lintas unit.
   PENCARIAN KODE: modules/01-core-store-master.js
   ================================================================= */
"use strict";
/* INDEKS BANTUAN TAHAP 7
 * Modul: CORE, STORE, MASTER DATA & AKUN DEMO
 * Tanggung jawab: Konstanta, seed/migrasi data, penyimpanan lokal, master fasilitas, akun demo, helper dasar.
 * Fungsi yang sering menjadi titik masuk (cari nama fungsi dengan Ctrl+F):
 * - poliColor
 * - ensureOfficialDoctorMaster
 * - doctorMasterById
 * - doctorDisplayName
 * - doctorMasterForSchedule
 * - ensureOfficialCatalog
 * - uid
 * - esc
 * - pad
 * - todayStr
 * - nowISO
 * - daysAgoISO
 * - formatRupiah
 * - formatTanggalIndo
 * - formatJam
 * - formatTanggalWaktu
 * - calcUmur
 * - badgeStatus
 * - renderQrSvg
 * - seedData
 * - generatedNurseName
 * - makeRoomShiftAssignments
 * - ensureInpatientStructure
 * - ensureDivisionDemoUsers
 * - ensureInpatientDemoAccounts
 * - ensurePatientDemoAccounts
 * - migrateData
 * - canonicalPoliId
 * - samePoli
 * - getPoli
 * - getMedicine
 * - getPatient
 * - getVisit
 * - getUserById
 * - getResep
 * - ... dan 25 fungsi lain pada berkas ini.
 * Integrasi: fungsi global/Store dipertahankan untuk kompatibilitas classic script.
 * Catatan: jangan memindahkan fungsi lintas modul tanpa audit pemanggil dan uji alur.
 */

/* =================================================================
   SIMRS PROTOTYPE — INTI APLIKASI
   PENCARIAN KODE: MODUL: CORE | FUNGSI: KONSTANTA | FUNGSI: STORE
   Tanggung jawab: konstanta, utilitas, seed data, migrasi, dan penyimpanan lokal.
   Catatan arsitektur: aplikasi saat ini masih berupa satu bundle app.js;
   penanda modul membantu pencarian sebelum pemisahan berkas dilakukan bertahap.
   ================================================================= */
const BIAYA_REGISTRASI = 10000;
const BIAYA_LAB = 75000;
const LOW_STOCK_THRESHOLD = 15;
const PROTOTYPE_VERSION = 'v16.5.12';
const PROTOTYPE_NAME = 'SIMRS PROTOTYPE';
const PROTOTYPE_MODE = 'Portfolio / Demo';
const QUEUE_JOURNEY = [
  {key:'terjadwal',label:'Booking dibuat',icon:'📅'},
  {key:'checked_in',label:'Sudah check-in',icon:'✓'},
  {key:'menunggu_screening',label:'Menunggu verifikasi',icon:'🩺'},
  {key:'menunggu_dokter',label:'Menunggu dipanggil',icon:'⏳'},
  {key:'dipanggil',label:'Dipanggil',icon:'🔔'},
  {key:'diperiksa',label:'Sedang dilayani',icon:'👨‍⚕️'},
  {key:'selesai',label:'Pelayanan selesai',icon:'✓'}
];


/* =================================================================
   MODUL: RAWAT INAP — CORE DIPINDAHKAN KE BERKAS TERPISAH
   PENCARIAN KODE: MODUL: RAWAT INAP | FILE: modules/rawat-inap/core.js
   Catatan: konstanta dan helper status bed, shift, lokasi, serta perjalanan pasien
   didefinisikan pada file modul yang dimuat sebelum app.js. Fungsi workflow dan UI
   tetap di app.js untuk tahap ini agar dependensi dapat dipindahkan satu per satu.
   ================================================================= */

const POLI_COLOR = {UMU:'clinical', GIG:'slate', ANA:'sage', KDG:'plum', MAT:'amber', THT:'brick', JAN:'brick', KUL:'plum', PDL:'slate', SYA:'plum', PAR:'sage'};

function poliColor(id){ return POLI_COLOR[id] || 'clinical'; }


/* ================================================================
   KATALOG LAYANAN SIMRS PROTOTYPE — sumber nama layanan publik
   Dashboard memakai ID yang stabil; detail lantai/ruang tidak diasumsikan.
   ================================================================ */
const OFFICIAL_POLI_CATALOG = [
  ['RJ-UMU','Poli Umum','Rawat Jalan'],
  ['SP-GCU','Klinik General Check Up','Poliklinik Spesialis'],['SP-BPL','Klinik Bedah Plastik','Poliklinik Spesialis'],['SP-BUM','Klinik Bedah Umum','Poliklinik Spesialis'],['SP-BUR','Klinik Bedah Urologi','Poliklinik Spesialis'],['SP-BSR','Klinik Bedah Saraf','Poliklinik Spesialis'],['SP-BOR','Klinik Bedah Orthopedi','Poliklinik Spesialis'],['SP-BDI','Klinik Bedah Digestif','Poliklinik Spesialis'],['SP-PDL','Klinik Penyakit Dalam','Poliklinik Spesialis'],['SP-GER','Klinik Geriatri','Poliklinik Spesialis'],['SP-END','Klinik Endoskopi','Poliklinik Spesialis'],['SP-JAN','Klinik Jantung','Poliklinik Spesialis'],['SP-SAR','Klinik Saraf','Poliklinik Spesialis'],['SP-PAR','Klinik Paru','Poliklinik Spesialis'],['SP-HKB','Klinik Hamil/KB','Poliklinik Spesialis'],['SP-KDG','Klinik Kandungan','Poliklinik Spesialis'],['SP-AND','Klinik Andrologi','Poliklinik Spesialis'],['SP-PSI','Klinik Psikologi','Poliklinik Spesialis'],['SP-PSK','Klinik Psikiatri','Poliklinik Spesialis'],['SP-REH','Klinik Rehabilitasi Medik','Poliklinik Spesialis'],['SP-ANA','Klinik Anak','Poliklinik Spesialis'],['SP-TBK','Klinik Tumbuh Kembang','Poliklinik Spesialis'],['SP-GIG','Klinik Gigi dan Mulut','Poliklinik Spesialis'],['SP-THT','Klinik THT','Poliklinik Spesialis'],['SP-MAT','Klinik Mata','Poliklinik Spesialis'],['SP-KUL','Klinik Kulit dan Kelamin','Poliklinik Spesialis'],['SP-MRV','Klinik Mawar Merah/VCT','Poliklinik Spesialis'],['SP-GIZ','Klinik Gizi','Poliklinik Spesialis'],['SP-HOM','Pelayanan Homecare','Poliklinik Spesialis'],
  ['EX-EST','Klinik Estetika','Poliklinik Eksekutif'],['EX-KUL','Klinik Kulit dan Kelamin','Poliklinik Eksekutif'],['EX-BUM','Klinik Bedah Umum','Poliklinik Eksekutif'],['EX-BUR','Klinik Bedah Urologi','Poliklinik Eksekutif'],['EX-BSR','Klinik Bedah Saraf','Poliklinik Eksekutif'],['EX-BOR','Klinik Bedah Orthopedi','Poliklinik Eksekutif'],['EX-BDI','Klinik Bedah Digestif','Poliklinik Eksekutif'],['EX-BTKV','Klinik Bedah TKV','Poliklinik Eksekutif'],['EX-BONK','Klinik Bedah Onkologi','Poliklinik Eksekutif'],['EX-PDL','Klinik Penyakit Dalam','Poliklinik Eksekutif'],['EX-AKU','Klinik Akupuntur','Poliklinik Eksekutif'],['EX-JAN','Klinik Jantung','Poliklinik Eksekutif'],['EX-SAR','Klinik Saraf','Poliklinik Eksekutif'],['EX-PAR','Klinik Paru','Poliklinik Eksekutif'],['EX-HKB','Klinik Hamil/KB','Poliklinik Eksekutif'],['EX-KDG','Klinik Kandungan','Poliklinik Eksekutif'],['EX-AND','Klinik Andrologi','Poliklinik Eksekutif'],['EX-PSI','Klinik Psikologi','Poliklinik Eksekutif'],['EX-PSK','Klinik Psikiatri','Poliklinik Eksekutif'],['EX-REH','Klinik Rehabilitasi Medik','Poliklinik Eksekutif'],['EX-ANA','Klinik Anak','Poliklinik Eksekutif'],['EX-TBK','Klinik Tumbuh Kembang','Poliklinik Eksekutif'],['EX-GIG','Klinik Gigi dan Mulut','Poliklinik Eksekutif'],['EX-THT','Klinik THT','Poliklinik Eksekutif'],['EX-MAT','Klinik Mata','Poliklinik Eksekutif'],['EX-GIZ','Klinik Gizi','Poliklinik Eksekutif'],['EX-RAD','Klinik Radioterapi','Poliklinik Eksekutif']
];

const PROTOTYPE_FACILITY_STRUCTURE = [
  // PENCARIAN KODE: MASTER-GEDUNG-RAWAT-INAP-V16.5.4
  // Master fasilitas diselaraskan dengan buildingId pada INPATIENT_ROOM_SEED.
  {id:'GED-A',type:'gedung',nama:'Gedung A — Rawat Inap Utama',parentId:'GED-RAWAT-INAP',source:'baseline-prototype'},
  {id:'GED-B',type:'gedung',nama:'Gedung B — Rawat Inap Terpadu (BPJS)',parentId:'GED-RAWAT-INAP',source:'baseline-prototype'},
  {id:'GED-C',type:'gedung',nama:'Gedung C — Rawat Inap Khusus (BPJS)',parentId:'GED-RAWAT-INAP',source:'baseline-prototype'},
  {id:'GED-K',type:'gedung',nama:'Gedung Khusus — Perawatan Khusus',parentId:'GED-RAWAT-INAP',source:'baseline-prototype'},
  {id:'GED-RAWAT-JALAN',type:'gedung',nama:'Pelayanan Rawat Jalan',parentId:null,source:'baseline-prototype'},
  {id:'UNIT-POLI-SPESIALIS',type:'unit',nama:'Poliklinik Spesialis',parentId:'GED-RAWAT-JALAN',source:'baseline-prototype'},
  {id:'UNIT-POLI-EKSEKUTIF',type:'unit',nama:'Poliklinik Eksekutif',parentId:'GED-RAWAT-JALAN',source:'baseline-prototype'},
  {id:'GED-IGD',type:'unit',nama:'Instalasi Gawat Darurat (IGD)',parentId:null,source:'baseline-prototype'},
  {id:'IGD-ZONA-MERAH',type:'zona',nama:'Zona Merah',parentId:'GED-IGD',source:'baseline-prototype'},
  {id:'IGD-ZONA-KUNING',type:'zona',nama:'Zona Kuning',parentId:'GED-IGD',source:'baseline-prototype'},
  {id:'GED-RAWAT-INAP',type:'gedung',nama:'Pelayanan Rawat Inap',parentId:null,source:'baseline-prototype'},
  {id:'RI-TULIP',type:'unit',nama:'Rawat Inap Tulip',parentId:'GED-RAWAT-INAP',source:'baseline-prototype'},
  {id:'RI-TERATAI',type:'unit',nama:'Rawat Inap Teratai',parentId:'GED-RAWAT-INAP',source:'baseline-prototype'},
  {id:'RI-MAWAR-KUNING',type:'unit',nama:'Rawat Inap Mawar Kuning',parentId:'GED-RAWAT-INAP',source:'baseline-prototype'},
  {id:'RI-MAWAR-MP',type:'unit',nama:'Rawat Inap Mawar Merah Putih',parentId:'GED-RAWAT-INAP',source:'baseline-prototype'},
  {id:'RI-GDH',type:'unit',nama:'Rawat Inap Graha Delta Husada',parentId:'GED-RAWAT-INAP',source:'baseline-prototype'},
  {id:'RI-INTENSIF',type:'unit',nama:'Rawat Intensif Terpadu',parentId:'GED-RAWAT-INAP',source:'baseline-prototype'},
  {id:'RI-ICU',type:'unit',nama:'ICU',parentId:'RI-INTENSIF',source:'baseline-prototype'},
  {id:'RI-ICCU',type:'unit',nama:'ICCU',parentId:'RI-INTENSIF',source:'baseline-prototype'},
  {id:'RI-PICU',type:'unit',nama:'PICU',parentId:'RI-INTENSIF',source:'baseline-prototype'},
  {id:'RI-NICU',type:'unit',nama:'NICU',parentId:'RI-INTENSIF',source:'baseline-prototype'},
  {id:'RI-HCU',type:'unit',nama:'HCU',parentId:'RI-INTENSIF',source:'baseline-prototype'},
  {id:'RI-BERSALIN',type:'unit',nama:'Ruang Bersalin',parentId:'GED-RAWAT-INAP',source:'baseline-prototype'},
  {id:'FAR-RAJAL',type:'unit',nama:'Farmasi Rawat Jalan',parentId:null,source:'baseline-prototype'},
  {id:'FAR-RANAP',type:'unit',nama:'Farmasi Rawat Inap',parentId:null,source:'baseline-prototype'},
  {id:'LAB-PK',type:'unit',nama:'Laboratorium Patologi Klinik',parentId:null,source:'baseline-prototype'},
  {id:'LAB-PA',type:'unit',nama:'Laboratorium Patologi Anatomi',parentId:null,source:'baseline-prototype'},
  {id:'LAB-MIKRO',type:'unit',nama:'Laboratorium Mikrobiologi Klinik dan Biomolekuler',parentId:null,source:'baseline-prototype'},
  {id:'RAD',type:'unit',nama:'Radiologi',parentId:null,source:'baseline-prototype'},
  {id:'IPKT',type:'unit',nama:'Instalasi Pelayanan Kanker Terpadu (IPKT)',parentId:null,source:'baseline-prototype'},
  {id:'HD',type:'unit',nama:'Hemodialisis',parentId:null,source:'baseline-prototype'},
  {id:'KARDIO',type:'unit',nama:'Diagnostik dan Intervensi Kardiovaskuler',parentId:null,source:'baseline-prototype'},
  {id:'CSSD',type:'unit',nama:'Sterilisasi Sentral',parentId:null,source:'baseline-prototype'}
];


/* ================================================================
   MASTER DOKTER & JADWAL PROTOTYPE V13.8
   Data baseline demo dipakai sebagai contoh dan SELALU editable Admin.
   Status sumber sengaja diberi needs_confirmation karena data baseline
   sendiri menandai sebagian data dokter sebagai "Data Belum Diperbarui".
   ================================================================ */
const OFFICIAL_DOCTOR_MASTER = [
  {id:'DOC-ANGELA',nama:'dr. ANGELA BETY RATNASARI, Sp.JP',spesialis:'Jantung dan Pembuluh Darah',poliIds:['SP-JAN','EX-JAN'],status:'needs_confirmation'},
  {id:'DOC-ADITYA-UMUM',nama:'dr. ADITYA BALADIKA',spesialis:'Dokter Umum',poliIds:['RJ-UMU'],status:'needs_confirmation'},
  {id:'DOC-ARIEF',nama:'dr. ARIEF BOWO KURNIAWAN Sp.JP (K)',spesialis:'Jantung dan Pembuluh Darah',poliIds:['SP-JAN','EX-JAN'],status:'needs_confirmation'},
  {id:'DOC-SANY',nama:'dr. SANY RAHMAWANSA SISWARDANA, M Biomed., Sp.JP.,(K) FIHA',spesialis:'Jantung dan Pembuluh Darah',poliIds:['SP-JAN','EX-JAN'],status:'needs_confirmation'},
  {id:'DOC-RADITYA',nama:'dr. RADITYA RIZKI MUHAMMAD, Sp.JP',spesialis:'Jantung dan Pembuluh Darah',poliIds:['SP-JAN','EX-JAN'],status:'needs_confirmation'},
  {id:'DOC-UMIRA',nama:'dr. UMIRA, Sp.JP (K)',spesialis:'Jantung dan Pembuluh Darah',poliIds:['SP-JAN','EX-JAN'],status:'needs_confirmation'},
  {id:'DOC-FARIZ',nama:'dr. AKHMAD FARIZ NURDIANSYAH, Sp.PD',spesialis:'Penyakit Dalam',poliIds:['SP-PDL','EX-PDL'],status:'needs_confirmation'},
  {id:'DOC-JOHANNES',nama:'dr. JOHANNES VINCENTIUS LUSIDA, Sp.PD',spesialis:'Penyakit Dalam',poliIds:['SP-PDL','EX-PDL'],status:'needs_confirmation'},
  {id:'DOC-DAVIQ',nama:'dr. MOCHAMMAD DAVIQ, Sp.PD',spesialis:'Penyakit Dalam',poliIds:['SP-PDL','EX-PDL'],status:'needs_confirmation'},
  {id:'DOC-PUGUH',nama:'dr. PUGUH WIDAGDO, Sp.PD',spesialis:'Penyakit Dalam',poliIds:['SP-PDL','EX-PDL'],status:'needs_confirmation'},
  {id:'DOC-RIDWAN',nama:'dr. RIDWAN PRASETYO, Sp.PD',spesialis:'Penyakit Dalam',poliIds:['SP-PDL','EX-PDL'],status:'needs_confirmation'},
  {id:'DOC-ADE',nama:'dr. RR. ADE RATNA AYU VITARIANI, Sp.A',spesialis:'Anak',poliIds:['SP-ANA','EX-ANA'],status:'needs_confirmation'},
  {id:'DOC-YUSTINA',nama:'dr. YUSTINA ROSANTI, Sp.A',spesialis:'Anak',poliIds:['SP-ANA','EX-ANA'],status:'needs_confirmation'},
  {id:'DOC-FITA',nama:'dr. FITA SOFIYAH., Sp. A',spesialis:'Anak',poliIds:['SP-ANA','EX-ANA'],status:'needs_confirmation'},
  {id:'DOC-BARNABAS',nama:'drg. BARNABAS HOWUK HANO BONARDO SIBARANI, Sp.KGA',spesialis:'Kedokteran Gigi Anak',poliIds:['SP-GIG','EX-GIG'],status:'needs_confirmation'},
  {id:'DOC-SHINTA',nama:'dr. SHINTA ARTA WIGUNA, Sp.M, M.Ked. Klin.',spesialis:'Mata',poliIds:['SP-MAT','EX-MAT'],status:'needs_confirmation'},
  {id:'DOC-AGNES',nama:'dr. AGNES WINDYASARI, Sp.T.H.T.B.K.L',spesialis:'THT',poliIds:['SP-THT','EX-THT'],status:'needs_confirmation'},
  {id:'DOC-PUJI',nama:'dr. PUJI KURNIAWAN, Sp.THT-KL',spesialis:'THT',poliIds:['SP-THT','EX-THT'],status:'needs_confirmation'},
  {id:'DOC-REZA',nama:'dr. REZA RAHMAN RAMADHANI, Sp.OT (K) Hip & Knee',spesialis:'Bedah Orthopedi dan Traumatologi',poliIds:['SP-BOR','EX-BOR'],status:'needs_confirmation'},
  {id:'DOC-ERFAN',nama:'dr. ERFAN NASRULLAH, Sp.OT., M.Ked.Klin',spesialis:'Bedah Orthopedi dan Traumatologi',poliIds:['SP-BOR','EX-BOR'],status:'needs_confirmation'},
  {id:'DOC-FARMI',nama:'dr. FAHMI MUHAMMAD, Sp.B',spesialis:'Bedah',poliIds:['SP-BUM','EX-BUM'],status:'needs_confirmation'},
  {id:'DOC-PRIJONO',nama:'dr. R. PRIJONO WIBOWO, Sp.OG (K)',spesialis:'Obstetri & Ginekologi',poliIds:['SP-HKB','SP-KDG','EX-KDG'],status:'needs_confirmation'},
  {id:'DOC-ANAOG',nama:'dr. ANA PUJI RAHAYU, Sp.OG.,M.Ked.Klin.',spesialis:'Obstetri & Ginekologi',poliIds:['EX-KDG'],status:'needs_confirmation'},
  {id:'DOC-ANDIVA',nama:'dr. ANDIVA SATRIO RINALDI, Sp.N., FINA',spesialis:'Saraf',poliIds:['SP-SAR','EX-SAR'],status:'needs_confirmation'},
  {id:'DOC-SARI',nama:'dr. SARI MANDAYANI, Sp.P',spesialis:'Pulmonologi (Paru)',poliIds:['SP-PAR','EX-PAR'],status:'needs_confirmation'},
  {id:'DOC-YOHANA',nama:'dr. YOHANA AVILLA DESTALIA, Sp.KJ',spesialis:'Kedokteran Jiwa/Psikiatri',poliIds:['SP-PSK','EX-PSK'],status:'needs_confirmation'},
  {id:'DOC-DIAN',nama:'Dr. dr. DIAN SAMUDRA, Sp.PD - KGH',spesialis:'Penyakit Dalam / Ginjal Hipertensi',poliIds:['EX-PDL'],status:'needs_confirmation'},
  {id:'DOC-ADITYA-URO',nama:'dr. ADITYA PRAMANTA, Sp.U.',spesialis:'Urologi',poliIds:['SP-BUR','EX-BUR'],status:'needs_confirmation'},
  {id:'DOC-ADITYA-ONK',nama:'dr. ADITYA HERLAMBANG, Sp.OG., Subsp.Onk., M.Ked.Klin',spesialis:'Ginekologi Onkologi',poliIds:['EX-EST'],status:'needs_confirmation'},
  {id:'DOC-ANDOHARMAN',nama:'dr. Andoharman Damanik, Sp.OG (K)',spesialis:'Obstetri & Ginekologi',poliIds:['SP-HKB','SP-KDG','EX-KDG'],status:'needs_confirmation'},
  {id:'DOC-ANDRE-ONK',nama:'dr. ANDRE KURNIAWAN NUR HUDA, SpB.Subsp.Onk.(K)FINACS',spesialis:'Bedah Onkologi',poliIds:['EX-BONK'],status:'needs_confirmation'},
  {id:'DOC-ARIEK',nama:'dr. ARIEK DESNANTIKA, Sp.BP-RE',spesialis:'Bedah Plastik Rekonstruksi dan Estetik',poliIds:['SP-BPL','EX-EST'],status:'needs_confirmation'}
];
const OFFICIAL_SCHEDULE_SEED = [
  ['SCH-A1','DOC-ANGELA','SP-JAN',1,'11:00','14:00'],['SCH-A2','DOC-ANGELA','SP-JAN',2,'08:00','11:00'],['SCH-A3','DOC-ANGELA','SP-JAN',3,'08:00','11:00'],['SCH-A4','DOC-ANGELA','SP-JAN',4,'11:00','14:00'],['SCH-A5','DOC-ANGELA','SP-JAN',5,'10:00','11:00'],
  ['SCH-AE1','DOC-ANGELA','EX-JAN',1,'08:30','10:00'],['SCH-AE2','DOC-ANGELA','EX-JAN',2,'11:00','13:00'],['SCH-AE3','DOC-ANGELA','EX-JAN',3,'11:30','13:00'],['SCH-AE4','DOC-ANGELA','EX-JAN',4,'08:30','10:00'],['SCH-AE5','DOC-ANGELA','EX-JAN',5,'13:00','14:00'],['SCH-AE6','DOC-ANGELA','EX-JAN',6,'11:00','13:00'],['SCH-AE7','DOC-ANGELA','EX-JAN',1,'18:00','19:00'],
  ['SCH-AR1','DOC-ARIEF','SP-JAN',2,'08:00','11:00'],['SCH-AR2','DOC-ARIEF','SP-JAN',4,'08:00','11:00'],['SCH-AR3','DOC-ARIEF','SP-JAN',5,'08:00','11:00'],['SCH-AR4','DOC-ARIEF','SP-JAN',6,'11:00','12:30'],['SCH-ARE1','DOC-ARIEF','EX-JAN',1,'09:00','10:00'],['SCH-ARE2','DOC-ARIEF','EX-JAN',3,'09:00','10:00'],['SCH-ARE3','DOC-ARIEF','EX-JAN',4,'16:00','17:00'],['SCH-ARE4','DOC-ARIEF','EX-JAN',6,'09:00','10:00'],
  ['SCH-S1','DOC-SANY','SP-JAN',1,'10:00','13:00'],['SCH-S2','DOC-SANY','SP-JAN',3,'08:00','12:00'],['SCH-S3','DOC-SANY','SP-JAN',4,'08:00','11:00'],['SCH-SE1','DOC-SANY','EX-JAN',2,'08:30','09:30'],['SCH-SE2','DOC-SANY','EX-JAN',3,'11:00','12:00'],['SCH-SE3','DOC-SANY','EX-JAN',6,'10:30','11:30'],
  ['SCH-RD1','DOC-RADITYA','SP-JAN',2,'11:00','14:00'],['SCH-RD2','DOC-RADITYA','SP-JAN',4,'11:00','14:00'],['SCH-RD3','DOC-RADITYA','SP-JAN',5,'08:00','11:00'],['SCH-RD4','DOC-RADITYA','SP-JAN',6,'08:00','11:00'],['SCH-RDE1','DOC-RADITYA','EX-JAN',1,'15:00','17:00'],['SCH-RDE2','DOC-RADITYA','EX-JAN',2,'15:00','16:00'],['SCH-RDE3','DOC-RADITYA','EX-JAN',4,'15:00','17:00'],['SCH-RDE4','DOC-RADITYA','EX-JAN',5,'18:00','20:00'],
  ['SCH-U1','DOC-UMIRA','SP-JAN',1,'08:00','11:00'],['SCH-U2','DOC-UMIRA','SP-JAN',3,'11:00','14:00'],['SCH-U3','DOC-UMIRA','SP-JAN',5,'08:00','11:00'],['SCH-U4','DOC-UMIRA','SP-JAN',6,'11:00','12:30'],['SCH-UE1','DOC-UMIRA','EX-JAN',1,'11:00','13:00'],['SCH-UE2','DOC-UMIRA','EX-JAN',2,'12:00','14:00'],['SCH-UE3','DOC-UMIRA','EX-JAN',4,'12:00','14:00'],['SCH-UE4','DOC-UMIRA','EX-JAN',5,'11:00','13:00'],['SCH-UE5','DOC-UMIRA','EX-JAN',6,'07:00','10:00'],
  ['SCH-JOH1','DOC-JOHANNES','SP-PDL',3,'08:00','10:00'],['SCH-JOHE1','DOC-JOHANNES','EX-PDL',1,'11:00','12:00'],['SCH-JOHE2','DOC-JOHANNES','EX-PDL',2,'11:00','12:00'],['SCH-JOHE3','DOC-JOHANNES','EX-PDL',3,'11:00','12:00'],['SCH-JOHE4','DOC-JOHANNES','EX-PDL',4,'11:00','12:00'],
  ['SCH-DAV1','DOC-DAVIQ','SP-PDL',1,'08:30','14:00'],['SCH-DAV2','DOC-DAVIQ','SP-PDL',2,'08:30','14:00'],['SCH-DAV3','DOC-DAVIQ','SP-PDL',3,'08:30','14:00'],['SCH-DAV4','DOC-DAVIQ','SP-PDL',4,'08:30','14:00'],['SCH-DAV5','DOC-DAVIQ','SP-PDL',5,'08:30','12:30'],['SCH-DAV6','DOC-DAVIQ','SP-PDL',6,'08:30','12:30'],['SCH-DAVE1','DOC-DAVIQ','EX-PDL',1,'16:00','18:00'],['SCH-DAVE2','DOC-DAVIQ','EX-PDL',3,'16:00','18:00'],['SCH-DAVE3','DOC-DAVIQ','EX-PDL',5,'16:00','18:00'],
  ['SCH-PUG1','DOC-PUGUH','SP-PDL',1,'10:00','12:00'],['SCH-PUG2','DOC-PUGUH','SP-PDL',3,'10:00','12:00'],['SCH-PUG3','DOC-PUGUH','SP-PDL',5,'10:00','11:00'],['SCH-PUGE1','DOC-PUGUH','EX-PDL',2,'08:00','09:30'],['SCH-PUGE2','DOC-PUGUH','EX-PDL',4,'08:00','09:30'],['SCH-PUGE3','DOC-PUGUH','EX-PDL',6,'08:00','09:30'],
  ['SCH-RID1','DOC-RIDWAN','SP-PDL',2,'08:00','10:00'],['SCH-RID2','DOC-RIDWAN','SP-PDL',3,'08:00','10:00'],['SCH-RID3','DOC-RIDWAN','SP-PDL',4,'08:00','10:00'],['SCH-RIDE1','DOC-RIDWAN','EX-PDL',1,'08:30','09:30'],['SCH-RIDE2','DOC-RIDWAN','EX-PDL',2,'10:00','11:00'],['SCH-RIDE3','DOC-RIDWAN','EX-PDL',3,'10:00','11:00'],['SCH-RIDE4','DOC-RIDWAN','EX-PDL',4,'10:00','11:00'],['SCH-RIDE5','DOC-RIDWAN','EX-PDL',5,'08:30','09:30'],
  ['SCH-ANA1','DOC-ADE','SP-ANA',1,'08:00','12:30'],['SCH-ANA2','DOC-ADE','SP-ANA',2,'08:00','12:30'],['SCH-ANA3','DOC-ADE','SP-ANA',3,'08:00','12:30'],['SCH-ANA4','DOC-ADE','SP-ANA',4,'08:00','12:30'],['SCH-ANA5','DOC-ADE','SP-ANA',5,'08:00','10:30'],['SCH-ANA6','DOC-ADE','SP-ANA',6,'08:00','12:00'],['SCH-ANAE1','DOC-ADE','EX-ANA',1,'18:00','19:00'],['SCH-ANAE2','DOC-ADE','EX-ANA',2,'12:00','13:00'],['SCH-ANAE3','DOC-ADE','EX-ANA',3,'18:00','19:00'],['SCH-ANAE4','DOC-ADE','EX-ANA',4,'12:00','13:00'],['SCH-ANAE5','DOC-ADE','EX-ANA',5,'18:00','19:00'],
  ['SCH-YUS1','DOC-YUSTINA','SP-ANA',1,'08:00','12:30'],['SCH-YUS2','DOC-YUSTINA','SP-ANA',2,'08:00','12:30'],['SCH-YUS3','DOC-YUSTINA','SP-ANA',3,'08:00','12:30'],['SCH-YUS4','DOC-YUSTINA','SP-ANA',4,'08:00','12:30'],['SCH-YUS5','DOC-YUSTINA','SP-ANA',5,'08:00','10:30'],['SCH-YUS6','DOC-YUSTINA','SP-ANA',6,'08:00','12:00'],['SCH-YUSE1','DOC-YUSTINA','EX-ANA',1,'07:30','09:00'],['SCH-YUSE2','DOC-YUSTINA','EX-ANA',2,'07:30','09:00'],['SCH-YUSE3','DOC-YUSTINA','EX-ANA',3,'07:30','09:00'],['SCH-YUSE4','DOC-YUSTINA','EX-ANA',4,'07:30','09:00'],['SCH-YUSE5','DOC-YUSTINA','EX-ANA',5,'07:30','09:00'],['SCH-YUSE6','DOC-YUSTINA','EX-ANA',6,'07:30','09:00'],
  ['SCH-MAT1','DOC-SHINTA','SP-MAT',1,'08:00','14:00'],['SCH-MAT3','DOC-SHINTA','SP-MAT',3,'08:00','14:00'],['SCH-MAT4','DOC-SHINTA','SP-MAT',4,'08:00','14:00'],['SCH-MAT5','DOC-SHINTA','SP-MAT',5,'08:00','11:00'],['SCH-MAT6','DOC-SHINTA','SP-MAT',6,'08:00','12:30'],['SCH-MATE1','DOC-SHINTA','EX-MAT',1,'09:00','11:30'],['SCH-MATE4','DOC-SHINTA','EX-MAT',4,'09:00','11:30'],
  ['SCH-THT1','DOC-AGNES','SP-THT',1,'08:00','12:00'],['SCH-THT2','DOC-AGNES','SP-THT',2,'08:00','12:00'],['SCH-THT3','DOC-AGNES','SP-THT',3,'08:00','12:00'],['SCH-THT4','DOC-AGNES','SP-THT',4,'08:00','09:00'],['SCH-THTX1','DOC-AGNES','SP-THT',4,'11:00','12:00'],['SCH-THTE3','DOC-AGNES','EX-THT',3,'13:00','15:00'],['SCH-THTE4','DOC-AGNES','EX-THT',4,'09:00','11:00'],['SCH-THTE5','DOC-AGNES','EX-THT',5,'13:00','15:00'],
  ['SCH-PUJI6','DOC-PUJI','SP-THT',6,'08:00','13:00'],
  ['SCH-REZA1','DOC-REZA','SP-BOR',1,'07:00','12:00'],['SCH-REZA4','DOC-REZA','SP-BOR',4,'07:00','14:30'],['SCH-REZAE2','DOC-REZA','EX-BOR',2,'07:00','08:00'],['SCH-REZAE3','DOC-REZA','EX-BOR',3,'07:00','08:00'],['SCH-REZAE5','DOC-REZA','EX-BOR',5,'07:00','08:00'],['SCH-REZAE6','DOC-REZA','EX-BOR',6,'07:00','08:00'],['SCH-REZAE5B','DOC-REZA','EX-BOR',5,'16:00','17:30'],
  ['SCH-ERF6','DOC-ERFAN','SP-BOR',6,'07:00','09:30'],['SCH-ERFE2','DOC-ERFAN','EX-BOR',2,'07:30','08:30'],['SCH-ERFE4','DOC-ERFAN','EX-BOR',4,'07:30','08:30'],['SCH-ERFE6','DOC-ERFAN','EX-BOR',6,'07:30','08:30'],
  ['SCH-FHM1','DOC-FARMI','SP-BUM',1,'08:00','12:00'],['SCH-FHM2','DOC-FARMI','SP-BUM',2,'08:00','12:00'],['SCH-FHM3','DOC-FARMI','SP-BUM',3,'08:00','12:00'],['SCH-FHM4','DOC-FARMI','SP-BUM',4,'08:00','12:00'],['SCH-FHM5','DOC-FARMI','SP-BUM',5,'08:00','11:00'],['SCH-FHM6','DOC-FARMI','SP-BUM',6,'08:00','12:30'],['SCH-FHME1','DOC-FARMI','EX-BUM',1,'12:00','13:00'],['SCH-FHME2','DOC-FARMI','EX-BUM',2,'12:00','13:00'],['SCH-FHME4','DOC-FARMI','EX-BUM',4,'12:00','13:00'],['SCH-FHME5','DOC-FARMI','EX-BUM',5,'12:30','13:30'],
  ['SCH-PRI1','DOC-PRIJONO','SP-HKB',5,'08:00','11:00'],['SCH-PRIK1','DOC-PRIJONO','SP-KDG',3,'08:00','12:30'],['SCH-PRIEX1','DOC-PRIJONO','EX-KDG',1,'10:00','11:00'],['SCH-PRIEX2','DOC-PRIJONO','EX-KDG',2,'08:00','10:00'],
  ['SCH-ANAOGE1','DOC-ANAOG','EX-KDG',1,'15:00','16:00'],['SCH-ANAOGE2','DOC-ANAOG','EX-KDG',2,'18:00','19:00'],['SCH-ANAOGE4','DOC-ANAOG','EX-KDG',4,'14:00','15:00'],['SCH-ANAOGE5','DOC-ANAOG','EX-KDG',5,'13:00','14:00'],
  ['SCH-AND1','DOC-ANDIVA','SP-SAR',2,'08:00','12:00'],['SCH-AND2','DOC-ANDIVA','SP-SAR',5,'08:00','10:00'],['SCH-ANDIEX1','DOC-ANDIVA','EX-SAR',1,'10:00','11:00'],['SCH-ANDIEX3','DOC-ANDIVA','EX-SAR',3,'11:00','12:00'],['SCH-ANDIEX4','DOC-ANDIVA','EX-SAR',4,'10:00','11:00'],
  ['SCH-SAR3','DOC-SARI','SP-PAR',3,'08:00','12:00'],['SCH-SAR4','DOC-SARI','SP-PAR',4,'08:00','12:00'],['SCH-SAR6','DOC-SARI','SP-PAR',6,'08:00','11:00'],['SCH-SARE1','DOC-SARI','EX-PAR',1,'09:00','10:00'],['SCH-SARE5','DOC-SARI','EX-PAR',5,'09:00','10:00'],
  ['SCH-YOH1','DOC-YOHANA','SP-PSK',1,'08:00','14:00'],['SCH-YOH3','DOC-YOHANA','SP-PSK',3,'08:00','14:00'],['SCH-YOH4','DOC-YOHANA','SP-PSK',4,'08:00','10:00'],['SCH-YOHE2','DOC-YOHANA','EX-PSK',2,'18:00','20:00'],['SCH-YOHE5','DOC-YOHANA','EX-PSK',5,'18:00','20:00']
];
function ensureOfficialDoctorMaster(data){
  if(!Array.isArray(data.doctors)) data.doctors=[];
  OFFICIAL_DOCTOR_MASTER.forEach(function(d){if(!data.doctors.some(function(x){return x.id===d.id;}))data.doctors.push(Object.assign({},d,{source:'SIMRS PROTOTYPE — Dokter Kami',editable:true,updatedAt:nowISO()}));});
  if(!Array.isArray(data.doctorSchedules)) data.doctorSchedules=[];
  OFFICIAL_SCHEDULE_SEED.forEach(function(x){if(!data.doctorSchedules.some(function(s){return s.id===x[0];}))data.doctorSchedules.push({id:x[0],doctorId:x[1],poliId:x[2],tanggal:null,hari:x[3],jamMulai:x[4],jamSelesai:x[5],ruang:'Belum dipetakan',shiftLabel:'Sesuai jadwal resmi',kuota:null,source:'SIMRS PROTOTYPE — publik',needsConfirmation:true,createdAt:nowISO(),updatedAt:nowISO()});});
  const extraOfficialSchedules = [
    ['SCH-FITA-SP1','DOC-FITA','SP-ANA',1,'08:00','12:30'],['SCH-FITA-SP2','DOC-FITA','SP-ANA',2,'08:00','12:30'],['SCH-FITA-SP3','DOC-FITA','SP-ANA',3,'08:00','12:30'],['SCH-FITA-SP4','DOC-FITA','SP-ANA',4,'08:00','12:30'],['SCH-FITA-SP5','DOC-FITA','SP-ANA',5,'08:00','10:30'],['SCH-FITA-SP6','DOC-FITA','SP-ANA',6,'08:00','12:00'],
    ['SCH-FITA-EX1','DOC-FITA','EX-ANA',1,'07:30','08:30'],['SCH-FITA-EX3','DOC-FITA','EX-ANA',3,'07:30','08:30'],['SCH-FITA-EX5','DOC-FITA','EX-ANA',5,'07:30','08:30'],
    ['SCH-BARN-SP2','DOC-BARNABAS','SP-GIG',2,'09:00','14:00'],['SCH-BARN-SP3','DOC-BARNABAS','SP-GIG',3,'11:00','14:00'],['SCH-BARN-SP4','DOC-BARNABAS','SP-GIG',4,'09:00','14:00'],
    ['SCH-BARN-EX2','DOC-BARNABAS','EX-GIG',2,'13:00','15:00'],['SCH-BARN-EX4','DOC-BARNABAS','EX-GIG',4,'13:00','15:00']
  ];
  extraOfficialSchedules.forEach(function(x){if(!data.doctorSchedules.some(function(sc){return sc.id===x[0];}))data.doctorSchedules.push({id:x[0],doctorId:x[1],poliId:x[2],tanggal:null,hari:x[3],jamMulai:x[4],jamSelesai:x[5],ruang:'Belum dipetakan',shiftLabel:'Sesuai jadwal resmi',kuota:null,source:'SIMRS PROTOTYPE — publik',needsConfirmation:true,createdAt:nowISO(),updatedAt:nowISO()});});
  // Demo operasional Poli Umum: diperlukan agar layanan reguler RJ-UMU juga memiliki pilihan dokter.
  // Ini data prototype, bukan klaim jadwal resmi rumah sakit.
  const demoGeneralSchedules = [1,2,3,4,5,6].map(function(day){return ['SCH-UMU-DEMO-'+day,'DOC-ADITYA-UMUM','RJ-UMU',day,'08:00','14:00'];});
  demoGeneralSchedules.forEach(function(x){if(!data.doctorSchedules.some(function(sc){return sc.id===x[0];}))data.doctorSchedules.push({id:x[0],doctorId:x[1],poliId:x[2],tanggal:null,hari:x[3],jamMulai:x[4],jamSelesai:x[5],ruang:'Poli Umum (Demo)',shiftLabel:'Demo Prototype',kuota:null,source:'SIMRS PROTOTYPE — demo',needsConfirmation:true,createdAt:nowISO(),updatedAt:nowISO()});});
  return data;
}
function doctorMasterById(id){return (Store.data&&Array.isArray(Store.data.doctors)?Store.data.doctors:[]).find(function(d){return d.id===id;})||null;}
function doctorDisplayName(id){const u=(Store.data.users||[]).find(function(x){return x.id===id;}); if(u)return u.nama; const d=doctorMasterById(id); return d?d.nama:id||'Dokter';}
function doctorMasterForSchedule(sc){
  // Satu resolver bersama untuk seluruh modul booking/pasien. Jadwal bisa menunjuk master dokter
  // atau akun pengguna lama; fallback menjaga kompatibilitas data jadwal yang sudah tersimpan.
  if(!sc) return null;
  const byMaster=doctorMasterById(sc.doctorId);
  if(byMaster) return byMaster;
  const userId=(typeof scheduleDoctorUserId==='function')?scheduleDoctorUserId(sc):sc.doctorId;
  return (Store.data.users||[]).find(function(u){return u.id===userId;})||null;
}

function ensureOfficialCatalog(data){
  if(!Array.isArray(data.poli)) data.poli=[];
  OFFICIAL_POLI_CATALOG.forEach(function(x){
    if(!data.poli.some(function(p){return p.id===x[0];})) data.poli.push({id:x[0],nama:x[1],biaya:0,layanan:x[2],official:true});
  });
  if(!Array.isArray(data.facilities)) data.facilities=[];
  PROTOTYPE_FACILITY_STRUCTURE.forEach(function(x){
    if(!data.facilities.some(function(f){return f.id===x.id;})) data.facilities.push(Object.assign({},x));
  });
  return data;
}

function uid(prefix){
  return prefix + '-' + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2,6);
}
function esc(str){
  if(str===undefined || str===null) return '';
  return String(str).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}
function pad(n){ return n<10 ? '0'+n : ''+n; }
function todayStr(d){ d = d || new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function nowISO(){ return new Date().toISOString(); }
function daysAgoISO(n){ const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString(); }
function formatRupiah(n){
  n = Math.round(n||0);
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
const BULAN_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function formatTanggalIndo(dateStr){
  if(!dateStr) return '-';
  const d = new Date(dateStr);
  if(isNaN(d)) return dateStr;
  return d.getDate()+' '+BULAN_ID[d.getMonth()]+' '+d.getFullYear();
}
function formatJam(iso){
  if(!iso) return '-';
  const d = new Date(iso);
  if(isNaN(d)) return '-';
  return pad(d.getHours())+':'+pad(d.getMinutes());
}
function formatTanggalWaktu(iso){
  if(!iso) return '-';
  return formatTanggalIndo(iso) + ', ' + formatJam(iso);
}
function calcUmur(tglLahir){
  if(!tglLahir) return '-';
  const bl = new Date(tglLahir), now = new Date();
  let umur = now.getFullYear() - bl.getFullYear();
  const m = now.getMonth() - bl.getMonth();
  if(m < 0 || (m===0 && now.getDate() < bl.getDate())) umur--;
  return umur;
}

const STATUS_MAP = {
  menunggu_screening:{label:'Menunggu Screening', cls:'badge-amber'},
  screening:        {label:'Screening',            cls:'badge-clinical'},
  menunggu_dokter:  {label:'Menunggu Dokter',      cls:'badge-amber'},
  dipanggil:        {label:'Silakan Masuk',         cls:'badge-sage'},
  menunggu_review:  {label:'Menunggu Review',      cls:'badge-plum'},
  menunggu_penunjang:{label:'Menunggu Penunjang',  cls:'badge-plum'},
  menunggu_poli:   {label:'Menunggu Poli',        cls:'badge-amber'},
  menunggu_triase: {label:'Menunggu Triase IGD',   cls:'badge-amber'},
  observasi:       {label:'Observasi IGD',         cls:'badge-clinical'},
  diperiksa:       {label:'Sedang Diperiksa',      cls:'badge-clinical'},
  menunggu_lab:    {label:'Menunggu Hasil Lab',    cls:'badge-plum'},
  menunggu_farmasi:{label:'Menunggu Farmasi',      cls:'badge-amber'},
  menunggu_bayar:  {label:'Menunggu Pembayaran',   cls:'badge-amber'},
  obat_siap:       {label:'Obat Siap Diambil',     cls:'badge-sage'},
  selesai:         {label:'Selesai',               cls:'badge-slate'},
  terjadwal:       {label:'Terjadwal',              cls:'badge-slate'},
  checked_in:      {label:'Sudah Check-in',         cls:'badge-sage'},
  dibatalkan:      {label:'Dibatalkan',              cls:'badge-brick'},
  tidak_hadir:     {label:'Tidak Hadir',             cls:'badge-brick'},
  rescheduled:     {label:'Dijadwalkan Ulang',       cls:'badge-amber'},
  kadaluarsa:      {label:'Lewat Jadwal',           cls:'badge-brick'},
  dirawat:         {label:'Dirawat',                cls:'badge-clinical'},
  pulang:          {label:'Pulang',                 cls:'badge-sage'},
  proses_pulang:   {label:'Proses Pulang',          cls:'badge-amber'},
  meninggal:       {label:'Meninggal',              cls:'badge-brick'},
  rujuk_keluar:    {label:'Rujuk Keluar',           cls:'badge-slate'},
  rujuk_ranap:     {label:'Dirujuk Rawat Inap',     cls:'badge-plum'}
};
function badgeStatus(status){
  const s = STATUS_MAP[status] || {label:status, cls:'badge-slate'};
  return '<span class="badge '+s.cls+'">'+s.label+'</span>';
}

function renderQrSvg(text, size){
  size = size || 160;
  try{
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const count = qr.getModuleCount();
    const cell = size / count;
    let rects = '';
    for(let r=0;r<count;r++){
      for(let c=0;c<count;c++){
        if(qr.isDark(r,c)) rects += '<rect x="'+(c*cell).toFixed(2)+'" y="'+(r*cell).toFixed(2)+'" width="'+(cell+0.5).toFixed(2)+'" height="'+(cell+0.5).toFixed(2)+'"/>';
      }
    }
    return '<svg viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'" style="background:#fff;border-radius:14px;box-shadow:var(--shadow-float)" xmlns="http://www.w3.org/2000/svg"><rect width="'+size+'" height="'+size+'" fill="#fff"/><g fill="#182430">'+rects+'</g></svg>';
  }catch(err){
    return '<div class="hint">(Pratinjau QR tidak tersedia, kode tetap valid untuk check-in)</div>';
  }
}

/* ---------------- seed data ---------------- */
function seedData(){
  const poli = [
    {id:'UMU', nama:'Poli Umum', biaya:35000},
    {id:'GIG', nama:'Poli Gigi', biaya:50000},
    {id:'ANA', nama:'Poli Anak', biaya:50000},
    {id:'KDG', nama:'Poli Kandungan', biaya:75000},
    {id:'MAT', nama:'Poli Mata', biaya:60000},
    {id:'THT', nama:'Poli THT', biaya:60000},
    {id:'JAN', nama:'Poli Jantung', biaya:100000},
    {id:'KUL', nama:'Poli Kulit & Kelamin', biaya:65000},
    {id:'PDL', nama:'Poli Penyakit Dalam', biaya:90000},
    {id:'SYA', nama:'Poli Syaraf', biaya:95000},
    {id:'PAR', nama:'Poli Paru', biaya:90000}
  ];
  const users = [
    {id:'U-ADM', username:'admin', password:'admin123', nama:'Siti Rahayu', role:'admin'},
    {id:'U-LOK', username:'loket', password:'loket123', nama:'Budi Santoso', role:'loket'},
    {id:'U-DOK1', username:'dokter.umum', password:'dokter123', nama:'dr. ADITYA BALADIKA', role:'dokter', unit:'rawat-jalan', poliId:'RJ-UMU', doctorMasterId:'DOC-ADITYA-UMUM'},
    {id:'U-DOK2', username:'dokter.anak', password:'dokter123', nama:'dr. FITA SOFIYAH., Sp. A', role:'dokter', unit:'rawat-jalan', poliId:'SP-ANA', doctorMasterId:'DOC-FITA'},
    {id:'U-DOK3', username:'dokter.gigi', password:'dokter123', nama:'drg. BARNABAS HOWUK HANO BONARDO SIBARANI, Sp.KGA', role:'dokter', unit:'rawat-jalan', poliId:'SP-GIG', doctorMasterId:'DOC-BARNABAS'},
    {id:'U-DOK4', username:'dokter.jantung', password:'dokter123', nama:'dr. ANGELA BETY RATNASARI, Sp.JP', role:'dokter', unit:'rawat-jalan', poliId:'SP-JAN', doctorMasterId:'DOC-ANGELA'},
    {id:'U-FAR', username:'farmasi', password:'farmasi123', nama:'Apt. Dewi Lestari', role:'farmasi', unit:'rawat-jalan'},
    {id:'U-KAS', username:'kasir', password:'kasir123', nama:'Rina Marlina', role:'kasir', unit:'rawat-jalan'},
    {id:'U-LAB', username:'lab', password:'lab123', nama:'Agus Setiawan', role:'lab'},
    {id:'U-RAD', username:'radiologi', password:'rad123', nama:'Bambang Prasetyo', role:'radiologi'},
    {id:'U-PWT', username:'perawat', password:'perawat123', nama:'Ns. Lestari Handayani, S.Kep', role:'perawat'}
  ];
  const medicines = [
    {id:'OBT001', nama:'Paracetamol 500mg', kategori:'Analgesik', satuan:'Tablet', harga:500, stok:250},
    {id:'OBT002', nama:'Amoxicillin 500mg', kategori:'Antibiotik', satuan:'Kapsul', harga:1200, stok:180},
    {id:'OBT003', nama:'Vitamin C 500mg', kategori:'Vitamin', satuan:'Tablet', harga:800, stok:300},
    {id:'OBT004', nama:'Antasida Doen', kategori:'Lambung', satuan:'Tablet', harga:600, stok:150},
    {id:'OBT005', nama:'CTM 4mg', kategori:'Antihistamin', satuan:'Tablet', harga:300, stok:8},
    {id:'OBT006', nama:'Ibuprofen 400mg', kategori:'Analgesik', satuan:'Tablet', harga:900, stok:200},
    {id:'OBT007', nama:'Omeprazole 20mg', kategori:'Lambung', satuan:'Kapsul', harga:1500, stok:120},
    {id:'OBT008', nama:'Salbutamol Inhaler', kategori:'Pernapasan', satuan:'Botol', harga:35000, stok:15},
    {id:'OBT009', nama:'Salep Gentamicin', kategori:'Topikal', satuan:'Tube', harga:12000, stok:40},
    {id:'OBT010', nama:'Amlodipine 5mg', kategori:'Jantung', satuan:'Tablet', harga:1100, stok:5},
    {id:'OBT011', nama:'Cetirizine 10mg', kategori:'Antihistamin', satuan:'Tablet', harga:700, stok:90},
    {id:'OBT012', nama:'Asam Mefenamat 500mg', kategori:'Analgesik', satuan:'Tablet', harga:650, stok:110}
  ];
  const patients = [
    {id:'RM-2026-0001', nik:'3201012001900001', nama:'Ahmad Fauzi', jenisKelamin:'L', tglLahir:'1990-01-20', alamat:'Jl. Merdeka No. 10, Bandung', noHp:'081234567890', golDarah:'O', alergi:'', createdAt:daysAgoISO(40)},
    {id:'RM-2026-0002', nik:'3201025503850002', nama:'Siti Nurhaliza', jenisKelamin:'P', tglLahir:'1985-03-15', alamat:'Jl. Asia Afrika No. 22, Bandung', noHp:'081298765432', golDarah:'A', alergi:'Penisilin', createdAt:daysAgoISO(30)},
    {id:'RM-2026-0003', nik:'3201031207180003', nama:'Putri Ayu Lestari', jenisKelamin:'P', tglLahir:'2018-07-12', alamat:'Jl. Dago No. 5, Bandung', noHp:'081211112222', golDarah:'B', alergi:'', createdAt:daysAgoISO(20)}
  ];
  const visits = [
    {id:uid('KJ'), patientId:'RM-2026-0001', tanggal:todayStr(new Date(Date.now()-12*86400000)), poliId:'UMU', dokterId:'U-DOK1',
      jenisBayar:'Umum', noBpjs:'', noAntrian:'UMU-014', keluhan:'Demam dan sakit kepala',
      status:'selesai', unit:'rawat-jalan', vital:{td:'120/80', nadi:'82', suhu:'37.8', rr:'20', bb:'68', tb:'170'},
      diagnosis:'ISPA (Infeksi Saluran Pernapasan Atas)', catatan:'Istirahat cukup, kontrol jika demam berlanjut 3 hari.',
      labRequest:null, resepId:null, billing:{registrasi:BIAYA_REGISTRASI, konsultasi:35000, obat:1600, lab:0},
      createdAt:daysAgoISO(12), updatedAt:daysAgoISO(12)}
  ];
  const prescriptions = [
    {id:uid('RSP'), visitId:visits[0].id, jenisLayanan:'rawat-jalan', unit:'rawat-jalan', items:[{medicineId:'OBT001', nama:'Paracetamol 500mg', jumlah:10, hargaSatuan:500, aturanPakai:'3x1 sesudah makan'}], status:'disiapkan', createdAt:daysAgoISO(12)}
  ];
  visits[0].resepId = prescriptions[0].id;
  const transactions = [
    {id:uid('TRX'), visitId:visits[0].id, rincian:[{label:'Biaya Registrasi', jumlah:BIAYA_REGISTRASI},{label:'Konsultasi Poli Umum', jumlah:35000},{label:'Obat', jumlah:1600}], total:46600, metode:'Tunai', createdAt:daysAgoISO(12)}
  ];
  const bookingTanggal = todayStr(new Date(Date.now()+86400000));
  const bookings = [
    {id:'BK-DEMO-0001', patientId:'RM-2026-0002', poliId:'JAN', tanggalKontrol:bookingTanggal, jenisBayar:'BPJS',
      sumber:'JKN Mobile (Simulasi)', noBpjs:'0001234567890', noAntrian:'JAN-001', kodeCheckIn:'DEMOJKN0001',
      status:'terjadwal', visitId:null, reminded:false, remindedAt:null, createdAt:nowISO()},
    {id:'BK-DEMO-0002', patientId:'RM-2026-0001', poliId:'JAN', tanggalKontrol:bookingTanggal, jenisBayar:'Umum',
      sumber:'Aplikasi RS', noBpjs:'', noAntrian:'JAN-002', kodeCheckIn:'DEMOUMU0002',
      status:'terjadwal', visitId:null, reminded:false, remindedAt:null, createdAt:nowISO()}
  ];
  const poliMessages = [
    {id:uid('MSG'), poliId:'JAN', authorName:'dr. Rudi Hartono, Sp.JP', authorRole:'Dokter', tipe:'normal', pesan:'Praktik berjalan sesuai jadwal hari ini.', createdAt:nowISO()}
  ];
  const auditLog = [
    {id:uid('LOG'), userName:'Sistem', role:'-', aksi:'inisialisasi', detail:'Data awal sistem dibuat', createdAt:nowISO()}
  ];

  const wards = [
    {id:'W-K3', nama:'Mawar Kuning', kelas:'3', tarifPerHari:150000},
    {id:'W-K3-MMP', nama:'Mawar Merah Putih', kelas:'3', tarifPerHari:150000},
    {id:'W-K2', nama:'Teratai', kelas:'2', tarifPerHari:300000},
    {id:'W-K1', nama:'Tulip', kelas:'1', tarifPerHari:500000},
    {id:'W-VIP', nama:'Graha Delta Husada — VIP', kelas:'VIP', tarifPerHari:900000},
    {id:'W-ICU', nama:'ICU', kelas:'ICU', tarifPerHari:1500000},
    {id:'W-ICCU', nama:'ICCU', kelas:'ICCU', tarifPerHari:1500000},
    {id:'W-HCU', nama:'HCU', kelas:'HCU', tarifPerHari:1200000},
    {id:'W-PICU', nama:'PICU', kelas:'PICU', tarifPerHari:1200000},
    {id:'W-NICU', nama:'NICU', kelas:'NICU', tarifPerHari:1200000},
    {id:'W-ISO', nama:'Ruang Isolasi', kelas:'ISOLASI', tarifPerHari:600000},
    {id:'W-BERSALIN', nama:'Ruang Bersalin', kelas:'BERSALIN', tarifPerHari:600000}
  ];
  const bedCounts = {'W-K3':4, 'W-K3-MMP':4, 'W-K2':4, 'W-K1':3, 'W-VIP':2, 'W-ICU':2, 'W-ICCU':2, 'W-HCU':2, 'W-PICU':2, 'W-NICU':2, 'W-ISO':2, 'W-BERSALIN':2};
  const beds = [];
  wards.forEach(function(w){
    const n = bedCounts[w.id] || 2;
    for(let i=1;i<=n;i++){
      beds.push({id:w.id+'-B'+String(i).padStart(2,'0'), wardId:w.id, noKamar:String(Math.ceil(i/2)).padStart(2,'0'), noBed:(i%2===1?'A':'B'), status:'kosong', updatedAt:nowISO(), reservedFor:null, note:''});
    }
  });
  const demoBed = beds.find(function(b){return b.wardId==='W-K2' && b.noKamar==='01' && b.noBed==='A';});
  if(demoBed) demoBed.status = 'terisi'; // Bed demo selalu dicari berdasarkan ward + nomor, bukan indeks array.
  const admissions = [
    {id:'ADM-DEMO-0001', patientId:'RM-2026-0002', visitId:null, bedId:demoBed ? demoBed.id : 'W-K2-B01', wardId:'W-K2',
      dpjpUserId:'U-DOK1', sumberAdmisi:'Rawat Jalan', noRujukan:'RJ-DEMO-2026-0001', kelasPerawatan:'2', tingkatPerawatan:'Bangsal', diagnosisMasuk:'Observasi febris + dehidrasi ringan', jenisBayar:'BPJS', noBpjs:'0009876543210',
      status:'dirawat', tanggalMasuk:daysAgoISO(2),
      cppt:[
        {id:uid('CPPT'), waktu:daysAgoISO(2), profesi:'Dokter', penulisNama:'dr. Andi Wijaya', subjektif:'Demam naik turun 3 hari, mual (-), nafsu makan menurun.', objektif:'TD 110/70, N 92x, S 38.4°C, RR 20x. Turgor kulit sedikit menurun.', asesmen:'Febris ec susp. infeksi virus + dehidrasi ringan', planning:'IVFD RL 20 tpm, Paracetamol infus k/p, cek DL & elektrolit, observasi 24 jam'}
      ],
      vitalLog:[
        {id:uid('VS'), waktu:daysAgoISO(2), dicatatOleh:'Ns. Lestari Handayani, S.Kep', rr:20, spo2:98, sistolik:110, nadi:92, suhu:38.4, kesadaran:'alert', oksigen:false, news2:1}
      ],
      orders:[
        {id:uid('ORD'), waktu:daysAgoISO(2), dokterNama:'dr. Andi Wijaya', jenis:'obat', detail:'Paracetamol infus 3x1 gr k/p demam', status:'aktif'},
        {id:uid('ORD'), waktu:daysAgoISO(2), dokterNama:'dr. Andi Wijaya', jenis:'diet', detail:'Diet lunak, minum ad libitum', status:'aktif'}
      ],
      resumeMedis:null,
      billing:{biayaObat:0, biayaTindakan:0, biayaPenunjang:0, statusBayar:'belum_bayar'}, discharge:{status:'belum_direncanakan',rencanaTanggal:null,kondisi:null},
      createdAt:daysAgoISO(2), updatedAt:daysAgoISO(1)}
  ];

  const seed = {
    poli, users, medicines, patients, visits, prescriptions, transactions, bookings, poliMessages, auditLog,
    wards, beds, admissions,
    doctorSchedules: [],
    notifications: [],
    hospitalAnnouncements: [],
    patientChats: [],
    facilities: [
      {id:'GED-RAWAT-JALAN', type:'gedung', nama:'Gedung Rawat Jalan', parentId:null},
      {id:'GED-RAWAT-INAP', type:'gedung', nama:'Gedung Rawat Inap', parentId:null},
      {id:'GED-IGD', type:'gedung', nama:'Gedung IGD', parentId:null},
      {id:'GED-DIAGNOSTIK', type:'gedung', nama:'Gedung Diagnostik Terpadu', parentId:null}
    ],
    meta:{ rmCounter:3, queueCounters:{ ['JAN-'+bookingTanggal]: 2 }, schemaVersion: DB_SCHEMA_VERSION,
      settings:{avgWaitMinutes:8, doctorQuotaDefault:30, alertQueueThreshold:10, lowStockThreshold:LOW_STOCK_THRESHOLD, pharmacyOutpatientSlaMinutes:30, pharmacyInpatientSlaMinutes:60, pharmacyIgdSlaMinutes:15} }
  };
  ensureInpatientStructure(seed);
  return ensureOfficialCatalog(seed);
}

/* ---------------- persistence ---------------- */
const DB_SCHEMA_VERSION = 23;

const INPATIENT_ROOM_SEED = [
  ['GED-A',1,'Cendana'],['GED-A',1,'Mahoni'],['GED-A',1,'Meranti'],
  ['GED-A',2,'Kenanga'],['GED-A',2,'Kamboja'],['GED-A',2,'Flamboyan'],
  ['GED-A',3,'Bougenville'],['GED-A',3,'Teratai'],['GED-A',3,'Seroja'],
  ['GED-A',4,'Cemara'],['GED-A',4,'Pinus'],['GED-A',4,'Akasia'],
  ['GED-B',1,'Nusa'],['GED-B',1,'Samudra'],['GED-B',1,'Puspa'],
  ['GED-B',2,'Harmoni'],['GED-B',2,'Kirana'],['GED-B',2,'Sejahtera'],
  ['GED-B',3,'Cakrawala'],['GED-B',3,'Mentari'],['GED-B',3,'Purnama'],
  ['GED-B',4,'Wijaya'],['GED-B',4,'Nirmala'],['GED-B',4,'Pratama'],
  ['GED-C',1,'Adikara'],['GED-C',1,'Paramita'],['GED-C',1,'Srikandi'],
  ['GED-C',2,'Wening'],['GED-C',2,'Larasati'],['GED-C',2,'Candrakirana'],
  ['GED-C',3,'Bimasena'],['GED-C',3,'Arunika'],['GED-C',3,'Maheswari'],
  ['GED-C',4,'Dharmawangsa'],['GED-C',4,'Jayendra'],['GED-C',4,'Satyawira'],
  ['GED-K',1,'Anggrek Khusus'],['GED-K',1,'Melati Khusus'],['GED-K',2,'Intensif Khusus']
];
const INPATIENT_NURSE_FIRST_NAMES=['Ayu','Dimas','Sinta','Fajar','Rina','Maya','Dewi','Budi','Nadia','Rizky','Putri','Aditya','Lestari','Bagas','Intan','Rafi','Citra','Agung','Nabila','Dedi','Wulan','Yoga','Nisa','Farhan','Anisa','Galih','Indah','Arif','Yuni','Reza','Vina','Dian','Bayu','Lia','Taufik','Sari','Naufal','Rosa','Andika','Fitri'];
const INPATIENT_NURSE_LAST_NAMES=['Pratama','Lestari','Nugroho','Saputra','Anggraini','Kurniawan','Permata','Wibowo','Puspitasari','Setiawan','Ramadhan','Maharani','Santoso','Wijaya','Handayani','Firmansyah','Utami','Prakoso','Suryani','Hidayat','Susanto','Oktaviani','Putra','Safitri','Maulana','Kartika','Fauzi','Amalia','Wirawan','Kusuma','Rahmawati','Prameswari','Hartono','Yuliana','Permadi','Siregar','Wulandari','Syahputra','Damayanti','Febriani'];
function generatedNurseName(roomIndex,shiftIndex,slotIndex){const fi=(roomIndex*7+shiftIndex*11+slotIndex*13)%INPATIENT_NURSE_FIRST_NAMES.length;const li=(roomIndex*11+shiftIndex*5+slotIndex*17)%INPATIENT_NURSE_LAST_NAMES.length;return 'Ns. '+INPATIENT_NURSE_FIRST_NAMES[fi]+' '+INPATIENT_NURSE_LAST_NAMES[li]+', S.Kep';}
function makeRoomShiftAssignments(roomIndex){const out={};[['PAGI','06:00','14:00'],['SORE','14:00','22:00'],['MALAM','22:00','06:00']].forEach(function(x,si){const leader=generatedNurseName(roomIndex,si,0),member=generatedNurseName(roomIndex,si,1);out[x[0]]={jamMulai:x[1],jamSelesai:x[2],ketuaShift:leader,perawat:[leader,member]};});return out;}
/* =================================================================
   MODUL: RAWAT INAP — MASTER RUANG, GEDUNG, LANTAI, KAMAR, DAN BED
   PENCARIAN KODE: FUNGSI: MASTER RUANG RAWAT INAP
   Aturan: ID ruang/bed yang sudah dipakai episode aktif harus dipertahankan.
   Jangan mengganti ID penempatan tanpa migrasi data yang eksplisit.
   ================================================================= */
function ensureInpatientStructure(data){
  if(!data || typeof data!=='object') return data;
  if(!Array.isArray(data.wards)) data.wards=[];
  if(!Array.isArray(data.beds)) data.beds=[];
  if(!Array.isArray(data.admissions)) data.admissions=[];
  const legacyRoomIds=['W-K3','W-K3-MMP','W-K2','W-K1'];
  const roomIdFor=function(building,floor,name){
    const index=INPATIENT_ROOM_SEED.findIndex(x=>x[0]===building&&x[1]===floor&&x[2]===name);
    const legacy=legacyRoomIds[index];
    return legacy || ('WARD-'+building+'-L'+floor+'-'+name.toUpperCase().replace(/[^A-Z0-9]+/g,'-'));
  };
  const roomSeeds=INPATIENT_ROOM_SEED.map(function(x){const kelas=(x[0]==='GED-B'||x[0]==='GED-C')?(x[1]<=2?'3':x[1]===3?'2':'1'):(x[0]==='GED-K'?'Khusus':'3');return {id:roomIdFor(x[0],x[1],x[2]),buildingId:x[0],buildingName:({ 'GED-A':'Gedung A — Rawat Inap Utama','GED-B':'Gedung B — Rawat Inap Terpadu (BPJS)','GED-C':'Gedung C — Rawat Inap Khusus (BPJS)','GED-K':'Gedung Khusus — Perawatan Khusus'})[x[0]],floorNumber:x[1],floorName:'Lantai '+x[1],nama:x[2],kelas:kelas,penjaminDiizinkan:(x[0]==='GED-B'||x[0]==='GED-C')?['BPJS']:['Umum','Asuransi','KSO','BPJS'],tarifPerHari:150000,category:'reguler',locationManaged:true};});
  // Map the previous four general wards to the first four real structured rooms so existing admissions keep their ward IDs.
  const legacyNameMap={'W-K3':'Cendana','W-K3-MMP':'Mahoni','W-K2':'Meranti','W-K1':'Kenanga'};
  roomSeeds.forEach(function(seed,roomIndex){
    let ward=data.wards.find(function(w){return w.id===seed.id;});
    if(!ward){ward=Object.assign({},seed);data.wards.push(ward);} else if(!ward.locationManaged){Object.assign(ward,seed);}
    ward.kelas=seed.kelas;ward.buildingName=seed.buildingName;ward.buildingId=seed.buildingId;ward.penjaminDiizinkan=seed.penjaminDiizinkan;ward.kamarLabels=Array.isArray(ward.kamarLabels)&&ward.kamarLabels.length===10?ward.kamarLabels:['A','B','C','D','E','F','G','H','I','J'];
    ward.bedLabels=Array.isArray(ward.bedLabels)&&ward.bedLabels.length===3?ward.bedLabels:['Bed 1','Bed 2','Bed 3'];
    ward.headNurseName=ward.headNurseName||generatedNurseName(roomIndex,1,2);
    ward.headNurseUserId=ward.headNurseUserId||null;
    if(!ward.shiftAssignments) ward.shiftAssignments=makeRoomShiftAssignments(roomIndex);
    if(ward.id==='W-K2'&&!(ward.shiftAssignments.PAGI||{}).ketuaShiftUserId){ward.shiftAssignments.PAGI={jamMulai:'06:00',jamSelesai:'14:00',ketuaShift:'Ns. Ayu Lestari, S.Kep',perawat:['Ns. Ayu Lestari, S.Kep','Ns. Dimas Saputra, S.Kep'],ketuaShiftUserId:'U-RI-PWT-PAGI',perawatUserIds:['U-RI-PWT-PAGI','U-RI-PWT']};ward.shiftAssignments.SORE={jamMulai:'14:00',jamSelesai:'22:00',ketuaShift:'Ns. Fajar Nugroho, S.Kep',perawat:['Ns. Fajar Nugroho, S.Kep','Ns. Sinta Maharani, S.Kep'],ketuaShiftUserId:'U-RI-PWT-SORE',perawatUserIds:['U-RI-PWT-SORE','U-RJ-PWT-02']};ward.shiftAssignments.MALAM={jamMulai:'22:00',jamSelesai:'06:00',ketuaShift:'Ns. Rina Lestari, S.Kep',perawat:['Ns. Rina Lestari, S.Kep','Ns. Lestari Handayani, S.Kep'],ketuaShiftUserId:'U-RI-PWT-MALAM',perawatUserIds:['U-RI-PWT-MALAM','U-RJ-PWT-01']};}
  });
  // Two VVIP rooms, one on each of Gedung A's fifth and sixth floors, 20 single-bed rooms each.
  const vipSeeds=[{id:'W-VIP',buildingId:'GED-A',buildingName:'Gedung A — Rawat Inap Utama',floorNumber:5,floorName:'Lantai 5 — VVIP',nama:'VVIP Arunika',kelas:'VVIP',tarifPerHari:1500000,category:'vvip',kamarCount:20},{id:'WARD-GED-A-L6-VVIP-MAHARDIKA',buildingId:'GED-A',buildingName:'Gedung A — Rawat Inap Utama',floorNumber:6,floorName:'Lantai 6 — VVIP',nama:'VVIP Mahardika',kelas:'VVIP',tarifPerHari:1500000,category:'vvip',kamarCount:20}];
  vipSeeds.forEach(function(seed,vipIndex){let w=data.wards.find(function(x){return x.id===seed.id;});if(!w){w=Object.assign({},seed);data.wards.push(w);}else if(!w.locationManaged){Object.assign(w,seed);}w.locationManaged=true;w.headNurseName=w.headNurseName||generatedNurseName(36+vipIndex,2,2);w.headNurseUserId=w.headNurseUserId||null;w.kamarLabels=Array.isArray(w.kamarLabels)&&w.kamarLabels.length===20?w.kamarLabels:Array.from({length:20},function(_,i){return String(i+1).padStart(2,'0');});w.bedLabels=Array.isArray(w.bedLabels)&&w.bedLabels.length===1?w.bedLabels:['Bed 1'];w.facilities=Array.isArray(w.facilities)&&w.facilities.length?w.facilities:['Tempat tidur elektrik','Kamar mandi pribadi','Sofa pendamping','Televisi','AC','Panel medis','Tombol panggil perawat','Titik oksigen sesuai standar'];if(!w.shiftAssignments)w.shiftAssignments=makeRoomShiftAssignments(36+vipIndex);});
  // Ensure the room/bed layout is exact while preserving admission occupancy and stable legacy IDs.
  const structuredIds=new Set(roomSeeds.map(x=>x.id).concat(vipSeeds.map(x=>x.id)));
  const activeAdmissionByBed=new Map(data.admissions.filter(a=>a.status==='dirawat').map(a=>[a.bedId,a]));
  const oldBedsById=new Map(data.beds.map(b=>[b.id,b]));
  const nextBeds=data.beds.filter(b=>!structuredIds.has(b.wardId));
  roomSeeds.concat(vipSeeds).forEach(function(w){
    const room=data.wards.find(function(x){return x.id===w.id;});
    const kamarLabels=room.kamarLabels;
    const bedLabels=room.bedLabels;
    const count=room.category==='vvip'?20:10;
    const perRoom=room.category==='vvip'?1:3;
    for(let ki=0;ki<count;ki++){
      for(let bi=0;bi<perRoom;bi++){
        const seq=ki*perRoom+bi+1;
        const id=seq<=30 && legacyRoomIds.concat(['W-VIP']).includes(room.id) ? room.id+'-B'+String(seq).padStart(2,'0') : room.id+'-K'+String(ki+1).padStart(2,'0')+'-B'+String(bi+1);
        const old=oldBedsById.get(id), admission=activeAdmissionByBed.get(id);
        nextBeds.push({id:id,wardId:room.id,noKamar:String(kamarLabels[ki]||ki+1),noBed:String(bedLabels[bi]||('Bed '+(bi+1))).replace(/^Bed\s*/i,''),bedLabel:String(bedLabels[bi]||('Bed '+(bi+1))),status:admission?'terisi':(old&&['persiapan','perbaikan','dipesan'].includes(old.status)?old.status:(old&&old.status==='terisi'?'kosong':'kosong')),updatedAt:old&&old.updatedAt||nowISO(),reservedFor:admission?admission.patientId:(old&&old.reservedFor||null),note:old&&old.note||'',buildingId:room.buildingId,buildingName:room.buildingName,floorNumber:room.floorNumber,roomName:room.nama,category:room.category});
      }
    }
  });
  data.beds=nextBeds;
  // Keep old active admissions attached to their stable bed IDs and correct structured ward.
  data.admissions.forEach(function(a){const b=data.beds.find(function(x){return x.id===a.bedId;});if(b){a.wardId=b.wardId;} });
  data.wards.forEach(function(w){if(!w.locationManaged && !w.buildingName){w.buildingName='Unit Khusus';w.floorNumber=null;w.category='khusus';}});
  return data;
}

/* =================================================================
   MODUL: AKUN DEMO DAN KELOMPOK UNIT
   PENCARIAN KODE: MODUL: AKUN | FUNGSI: AKUN DEMO | RBAC
   Akun demo dikelompokkan per unit; akun perawat Rawat Inap dibuat per ruang.
   ================================================================= */
function ensureDivisionDemoUsers(data){
  if(!Array.isArray(data.users)) data.users=[];
  const retiredGenericAccounts=['U-RJ-DOK','U-FAR','U-KAS','U-PWT'];
  const retiredGenericNames=['dokter.rajal','farmasi','kasir','perawat'];
  // Akun perawat Rawat Inap lama yang tidak menunjukkan ruang dihapus dari daftar login demo.
  // Data klinis, admisi, penugasan ruang, dan riwayat audit tidak ikut dihapus.
  const retiredGenericInpatientNurses=['U-RI-PWT','U-RI-PWT-PAGI','U-RI-PWT-SORE','U-RI-PWT-MALAM'];
  const retiredGenericInpatientNames=['perawat.ranap','perawat.ranap.pagi','perawat.ranap.sore','perawat.ranap.malam'];
  data.users=data.users.filter(function(u){return !retiredGenericAccounts.includes(u.id)&&!retiredGenericNames.includes(u.username)&&!retiredGenericInpatientNurses.includes(u.id)&&!retiredGenericInpatientNames.includes(u.username);});
  const demoUsers = [
    {id:'U-LOK', username:'loket', password:'loket123', nama:'Petugas Loket SIMRS PROTOTYPE', role:'loket', unit:'rawat-jalan'},
    {id:'U-RJ-ADM', username:'rawatjalan', password:'rawatjalan123', nama:'Budi Santoso', role:'rawat_jalan', unit:'rawat-jalan'},
    {id:'U-RJ-DOK-01', username:'dokter.umum', password:'dokter123', nama:'dr. ADITYA BALADIKA', role:'dokter', unit:'rawat-jalan', poliId:'RJ-UMU', doctorMasterId:'DOC-ADITYA-UMUM'},
    {id:'U-RJ-DOK-02', username:'dokter.anak', password:'dokter123', nama:'dr. FITA SOFIYAH., Sp. A', role:'dokter', unit:'rawat-jalan', poliId:'SP-ANA', doctorMasterId:'DOC-FITA'},
    {id:'U-RJ-DOK-03', username:'dokter.gigi', password:'dokter123', nama:'drg. BARNABAS HOWUK HANO BONARDO SIBARANI, Sp.KGA', role:'dokter', unit:'rawat-jalan', poliId:'SP-GIG', doctorMasterId:'DOC-BARNABAS'},
    {id:'U-RJ-DOK-04', username:'dokter.jantung', password:'dokter123', nama:'dr. ANGELA BETY RATNASARI, Sp.JP', role:'dokter', unit:'rawat-jalan', poliId:'SP-JAN', doctorMasterId:'DOC-ANGELA'},
    {id:'U-DOK6', username:'dokter.sany', password:'dokter123', nama:'dr. SANY RAHMAWANSA SISWARDANA, M Biomed., Sp.JP.,(K) FIHA', role:'dokter', unit:'rawat-jalan', poliId:'SP-JAN', doctorMasterId:'DOC-SANY'},
    {id:'U-RJ-DOK-05', username:'dokter.penyakitdalam', password:'dokter123', nama:'dr. PUGUH WIDAGDO, Sp.PD', role:'dokter', unit:'rawat-jalan', poliId:'SP-PDL', doctorMasterId:'DOC-PUGUH'},
    {id:'U-RJ-PWT-01', username:'asisten.umum', password:'perawat123', nama:'Ns. Lestari Handayani, S.Kep', role:'perawat', unit:'rawat-jalan', poliId:'UMU'},
    {id:'U-RJ-PWT-02', username:'asisten.anak', password:'perawat123', nama:'Ns. Sinta Maharani, S.Kep', role:'perawat', unit:'rawat-jalan', poliId:'ANA'},
    {id:'U-RJ-PWT-03', username:'asisten.gigi', password:'perawat123', nama:'Ns. Dedi Kurniawan, S.Kep', role:'perawat', unit:'rawat-jalan', poliId:'GIG'},
    {id:'U-RJ-PWT-04', username:'asisten.jantung', password:'perawat123', nama:'Ns. Rina Lestari, S.Kep', role:'perawat', unit:'rawat-jalan', poliId:'JAN'},
    {id:'U-RJ-PWT-05', username:'asisten.penyakitdalam', password:'perawat123', nama:'Ns. Fajar Nugroho, S.Kep', role:'perawat', unit:'rawat-jalan', poliId:'PDL'},
    {id:'U-RJ-FAR', username:'farmasi.rajal', password:'farmasi123', nama:'Apt. Dewi Lestari', role:'farmasi', unit:'rawat-jalan'},
    {id:'U-RJ-KAS', username:'kasir.rajal', password:'kasir123', nama:'Rina Marlina', role:'kasir', unit:'rawat-jalan'},
    {id:'U-IGD-DOK', username:'dokter.igd', password:'dokter123', nama:'dr. ADITYA BALADIKA', role:'dokter_igd', unit:'igd', doctorMasterId:'DOC-ADITYA-UMUM'},
    {id:'U-IGD-PWT', username:'perawat.igd', password:'perawat123', nama:'Ns. Lestari Handayani', role:'perawat_pelaksana_igd', unit:'igd'},
    {id:'U-IGD-TRI', username:'triase.igd', password:'triase123', nama:'Ns. Maya Kurniawati, S.Kep', role:'perawat_triase_igd', unit:'igd', tugas:'Triase dan asesmen awal IGD'},
    {id:'U-IGD-FAR', username:'farmasi.igd', password:'farmasi123', nama:'Apt. Sari Wulandari', role:'farmasi', unit:'igd'},
    {id:'U-IGD-KAS', username:'kasir.igd', password:'kasir123', nama:'Rina Pratama', role:'kasir', unit:'igd'},
    {id:'U-RI-DOK', username:'dokter.ranap', password:'dokter123', nama:'dr. YUSTINA ROSANTI, Sp.A', role:'dokter_ranap', unit:'rawat-inap', doctorMasterId:'DOC-YUSTINA'},
    {id:'U-RI-DOK-JAGA-PAGI', username:'dokter.jaga.pagi', password:'dokter123', nama:'dr. Andika Prasetyo', role:'dokter_ranap', unit:'rawat-inap', shiftId:'PAGI'},
    {id:'U-RI-DOK-JAGA-SORE', username:'dokter.jaga.sore', password:'dokter123', nama:'dr. Sinta Maharani', role:'dokter_ranap', unit:'rawat-inap', shiftId:'SORE'},
    {id:'U-RI-DOK-JAGA-MALAM', username:'dokter.jaga.malam', password:'dokter123', nama:'dr. Raka Wijaya', role:'dokter_ranap', unit:'rawat-inap', shiftId:'MALAM'},
    {id:'U-RI-PWT', username:'perawat.ranap', password:'perawat123', nama:'Ns. Dimas Saputra', role:'perawat_ranap', unit:'rawat-inap', wardId:'W-K2'},
    {id:'U-RI-PWT-PAGI', username:'perawat.ranap.pagi', password:'perawat123', nama:'Ns. Ayu Lestari, S.Kep', role:'perawat_ranap', unit:'rawat-inap', wardId:'W-K2', shiftId:'PAGI', isShiftLeader:true},
    {id:'U-RI-PWT-SORE', username:'perawat.ranap.sore', password:'perawat123', nama:'Ns. Fajar Nugroho, S.Kep', role:'perawat_ranap', unit:'rawat-inap', wardId:'W-K2', shiftId:'SORE', isShiftLeader:true},
    {id:'U-RI-PWT-MALAM', username:'perawat.ranap.malam', password:'perawat123', nama:'Ns. Rina Lestari, S.Kep', role:'perawat_ranap', unit:'rawat-inap', wardId:'W-K2', shiftId:'MALAM', isShiftLeader:true},
    {id:'U-RI-FAR', username:'farmasi.ranap', password:'farmasi123', nama:'Apt. Nanda Putri', role:'farmasi', unit:'rawat-inap'},
    {id:'U-RI-ADM', username:'admisi.ranap', password:'admisi123', nama:'Petugas Admisi Rawat Inap', role:'admisi_ranap', unit:'rawat-inap'},
    {id:'U-RI-KAS', username:'kasir.ranap', password:'kasir123', nama:'Rina Permata', role:'kasir', unit:'rawat-inap'},
  ];
  demoUsers.forEach(function(u){
    const old=data.users.find(x=>x.id===u.id || x.username===u.username);
    if(old){ Object.assign(old,u); }
    else data.users.push(Object.assign({},u));
  });
  // AKUN RAWAT INAP PER RUANG: satu akun demo per nama ruang, bukan akun generik lintas ruang.
  // Nama login dibentuk dari ID ruang yang stabil agar mudah dicari di kode dan di layar login.
  // Hak akses tetap dibatasi melalui wardId; penugasan ruangan tidak ditentukan dari nama akun saja.
  const inpatientWards=(data.wards||[]).filter(function(w){return w.locationManaged||w.category==='vvip';});
  const makeRoomSlug=function(value){return String(value||'ruang').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'');};
  inpatientWards.forEach(function(ward){
    const slug=makeRoomSlug(ward.nama||ward.id);
    const username='perawat.'+slug;
    const id='U-RI-RUANG-'+String(ward.id).toUpperCase().replace(/[^A-Z0-9]+/g,'-');
    const roomUser={id:id,username:username,password:'perawat123',nama:'Petugas Perawat — '+(ward.nama||ward.id),role:'perawat_ranap',unit:'rawat-inap',wardId:ward.id,roomAccount:true};
    const old=data.users.find(function(x){return x.id===id||x.username===username;});
    if(old) Object.assign(old,roomUser); else data.users.push(roomUser);
  });
  const links = {'DOC-ADITYA-UMUM':'U-RJ-DOK-01','DOC-FITA':'U-RJ-DOK-02','DOC-BARNABAS':'U-RJ-DOK-03','DOC-ANGELA':'U-RJ-DOK-04','DOC-SANY':'U-DOK6','DOC-PUGUH':'U-RJ-DOK-05','DOC-YUSTINA':'U-RI-DOK'};
  Object.keys(links).forEach(function(docId){const d=data.doctors&&data.doctors.find(function(x){return x.id===docId;}); if(d){d.linkedUserId=links[docId];}});
  // Pastikan akun dokter memakai nama master resmi, bukan nama demo lama.
  data.users.forEach(function(u){if(u.doctorMasterId){const d=data.doctors.find(function(x){return x.id===u.doctorMasterId;});if(d){u.nama=d.nama;if(u.role==='dokter'&&u.unit==='rawat-jalan')u.poliId=u.poliId||d.poliIds[0];else if(['dokter_ranap','dokter_igd'].includes(u.role))delete u.poliId;}}});
  ensurePatientDemoAccounts(data);
  ensureInpatientDemoAccounts(data);
  // Jangan memberikan ruang default secara diam-diam: akun perawat tanpa wardId harus diperbaiki admin.
  // Dokter Rawat Inap yang tidak memiliki wardId dapat mengakses lintas ruang sesuai peran klinis.
  return data;
}

/* ---------------- Demo Rawat Inap V14.3 ----------------
   Lima akun pasien tambahan khusus Rawat Inap. Setiap akun mewakili
   skenario berbeda agar recruiter dapat menguji journey end-to-end.
*/
function ensureInpatientDemoAccounts(data){
  // V15.5: akun pasien demo Rawat Inap lama tidak lagi menjadi akun login.
  // Bersihkan hanya record seeded khusus demo RI lama; akun staf dan data layanan lain tetap dipertahankan.
  const oldIds=['RM-DEMO-RI001','RM-DEMO-RI002','RM-DEMO-RI003','RM-DEMO-RI004','RM-DEMO-RI005'];
  const oldUserIds=['U-PAS-RI-01','U-PAS-RI-02','U-PAS-RI-03','U-PAS-RI-04','U-PAS-RI-05'];
  const oldNames=['pasien.ri1','pasien.ri2','pasien.ri3','pasien.ri4','pasien.ri5'];
  const oldAdmissionIds=['ADM-DEMO-RI-01','ADM-DEMO-RI-02','ADM-DEMO-RI-03','ADM-DEMO-RI-04','ADM-DEMO-RI-05'];
  const oldVisitIds=['VIS-DEMO-P001','VIS-DEMO-P002','VIS-DEMO-P003','VIS-DEMO-P004','VIS-DEMO-P005'];
  data.users=(data.users||[]).filter(function(u){return !oldUserIds.includes(u.id)&&!oldNames.includes(u.username);});
  data.patients=(data.patients||[]).filter(function(p){return !oldIds.includes(p.id);});
  data.bookings=(data.bookings||[]).filter(function(b){return !oldIds.includes(b.patientId);});
  data.visits=(data.visits||[]).filter(function(v){return !oldIds.includes(v.patientId)&&!oldVisitIds.includes(v.id);});
  data.admissions=(data.admissions||[]).filter(function(a){return !oldIds.includes(a.patientId)&&!oldAdmissionIds.includes(a.id);});
  data.prescriptions=(data.prescriptions||[]).filter(function(r){return !oldAdmissionIds.includes(r.admissionId)&&!oldVisitIds.includes(r.visitId)&&!oldIds.includes(r.patientId);});
  (data.beds||[]).forEach(function(b){if(oldIds.includes(b.reservedFor)){b.status='kosong';b.reservedFor=null;b.note='';b.updatedAt=nowISO();}});
}

/* ---------------- 5 akun demo pasien ----------------
   Setiap akun memiliki data pasien + tiket booking contoh agar alur
   Dashboard Pasien, buka ulang QR/barcode, dan Download Tiket dapat diuji
   tanpa harus membuat booking baru terlebih dahulu.
   Semua identitas di bawah adalah data fiktif untuk demo.
*/
function ensurePatientDemoAccounts(data){
  if(!Array.isArray(data.patients)) data.patients=[];
  if(!Array.isArray(data.users)) data.users=[];
  if(!Array.isArray(data.bookings)) data.bookings=[];
  if(!Array.isArray(data.visits)) data.visits=[];
  if(!Array.isArray(data.admissions)) data.admissions=[];
  if(!Array.isArray(data.prescriptions)) data.prescriptions=[];
  if(!Array.isArray(data.transactions)) data.transactions=[];
  const legacyPatientIds=['RM-DEMO-P001','RM-DEMO-P002','RM-DEMO-P003','RM-DEMO-P004','RM-DEMO-P005'];
  const legacyUserIds=['U-PAS-001','U-PAS-002','U-PAS-003','U-PAS-004','U-PAS-005'];
  const legacyUsernames=['pasien.demo','pasien.demo1','pasien.demo2','pasien.demo3','pasien.demo4','pasien.demo5'];
  const legacyVisitIds=['VIS-DEMO-P001','VIS-DEMO-P002','VIS-DEMO-P003','VIS-DEMO-P004','VIS-DEMO-P005'];
  const legacyAdmissionIds=['ADM-DEMO-RI-01','ADM-DEMO-RI-02','ADM-DEMO-RI-03','ADM-DEMO-RI-04','ADM-DEMO-RI-05'];
  data.users=data.users.filter(function(u){return !legacyUserIds.includes(u.id)&&!legacyUsernames.includes(u.username);});
  data.patients=data.patients.filter(function(p){return !legacyPatientIds.includes(p.id);});
  data.bookings=data.bookings.filter(function(b){return !legacyPatientIds.includes(b.patientId);});
  data.visits=data.visits.filter(function(v){return !legacyPatientIds.includes(v.patientId)&&!legacyVisitIds.includes(v.id);});
  data.admissions=data.admissions.filter(function(a){return !legacyPatientIds.includes(a.patientId)&&!legacyAdmissionIds.includes(a.id);});
  data.prescriptions=data.prescriptions.filter(function(r){return !legacyPatientIds.includes(r.patientId)&&!legacyVisitIds.includes(r.visitId)&&!legacyAdmissionIds.includes(r.admissionId);});
  data.transactions=data.transactions.filter(function(t){if(legacyVisitIds.includes(t.visitId)||legacyAdmissionIds.includes(t.admissionId))return false;const v=data.visits.find(function(x){return x.id===t.visitId;});const a=data.admissions.find(function(x){return x.id===t.admissionId;});return !(v&&legacyPatientIds.includes(v.patientId))&&!(a&&legacyPatientIds.includes(a.patientId));});
  (data.beds||[]).forEach(function(b){if(legacyPatientIds.includes(b.reservedFor)){b.status='kosong';b.reservedFor=null;b.note='';b.updatedAt=nowISO();}});
  const demos=[
    {n:1,nama:'Aditya Pratama',jk:'L',lahir:'1994-03-12'},
    {n:2,nama:'Siti Rahmawati',jk:'P',lahir:'1992-07-24'},
    {n:3,nama:'Budi Santoso',jk:'L',lahir:'1989-01-15'},
    {n:4,nama:'Nur Aisyah Putri',jk:'P',lahir:'1996-10-08'},
    {n:5,nama:'Rizky Ramadhan',jk:'L',lahir:'1993-05-19'},
    {n:6,nama:'Dewi Anggraini',jk:'P',lahir:'1990-12-02'},
    {n:7,nama:'Fajar Setiawan',jk:'L',lahir:'1995-08-17'},
    {n:8,nama:'Rina Oktaviani',jk:'P',lahir:'1991-04-27'},
    {n:9,nama:'Dimas Saputra',jk:'L',lahir:'1997-02-11'},
    {n:10,nama:'Maya Puspitasari',jk:'P',lahir:'1994-09-30'}
  ];
  demos.forEach(function(d){
    const pid='RM-DEMO-NP'+String(d.n).padStart(3,'0'), uid='U-PAS-DEMO-'+String(d.n).padStart(2,'0'), username='pasien.demo'+d.n;
    if(!data.patients.some(function(x){return x.id===pid;})) data.patients.push({id:pid,nik:'DEMO-PAS-'+String(d.n).padStart(3,'0'),nama:d.nama,jenisKelamin:d.jk,tglLahir:d.lahir,alamat:'Data Demo — bukan data pasien nyata',noHp:'08'+String(1200000000+d.n),golDarah:'-',alergi:'',createdAt:nowISO(),demo:true});
    const user={id:uid,username:username,password:'pasien123',nama:d.nama,role:'pasien',unit:'pasien',patientId:pid,demoPatientNumber:d.n};
    const old=data.users.find(function(x){return x.id===uid||x.username===username;});
    if(old) Object.assign(old,user); else data.users.push(user);
  });
  // No booking, visit, admission, prescription, or history is seeded for these accounts.
  return data;
}

function migrateData(data){
  if(!data || typeof data!=='object') return seedData();
  if(!data.meta) data.meta = {};
  data.meta.prototypeVersion=PROTOTYPE_VERSION; data.meta.prototypeName=PROTOTYPE_NAME; data.meta.prototypeMode=PROTOTYPE_MODE;
  if(!data.meta.queueCounters) data.meta.queueCounters = {};
  if(!Array.isArray(data.auditLog)) data.auditLog = [];
  if(!Array.isArray(data.bookings)) data.bookings = [];
  if(!Array.isArray(data.poliMessages)) data.poliMessages = [];
  if(!Array.isArray(data.hospitalAnnouncements)) data.hospitalAnnouncements = [];
  if(!Array.isArray(data.patientChats)) data.patientChats = [];
  if(!Array.isArray(data.wards)) data.wards = [];
  if(!Array.isArray(data.beds)) data.beds = [];
  if(!Array.isArray(data.admissions)) data.admissions = [];
  ensureInpatientStructure(data);
  // Pastikan demo pasien v12 (termasuk kunjungan Live Queue) ikut tersedia saat
  // pengguna membuka data lama dari v11 yang masih tersimpan di localStorage.
  ensurePatientDemoAccounts(data);
  data.bookings.forEach(function(b){
    if(!b.status) b.status='terjadwal';
    if(b.reminded===undefined) b.reminded=false;
    if(b.remindedAt===undefined) b.remindedAt=null;
    if(b.visitId===undefined) b.visitId=null;
    if(b.createdAt===undefined) b.createdAt=nowISO();
    if(b.updatedAt===undefined) b.updatedAt=b.createdAt;
    if(b.cancelReason===undefined) b.cancelReason='';
    if(b.rescheduledFrom===undefined) b.rescheduledFrom=null;
    if(b.arrivalWindowStart===undefined) b.arrivalWindowStart=null;
    if(b.arrivalWindowEnd===undefined) b.arrivalWindowEnd=null;
    if(b.suggestedArrivalAt===undefined) b.suggestedArrivalAt=null;
    if(b.journeyVersion===undefined) b.journeyVersion=1;
  });
  // Pastikan counter antrean tidak pernah menghasilkan nomor duplikat,
  // termasuk ketika sumber booking berasal dari JKN Mobile dan aplikasi RS.
  if(Array.isArray(data.bookings)) data.bookings.forEach(function(b){ if(b.jenisLayanan===undefined){const pp=data.poli.find(function(p){return p.id===b.poliId;});b.jenisLayanan=pp&&pp.layanan||'Rawat Jalan';} });
  if(Array.isArray(data.bookings)) data.bookings.forEach(function(b){
    if(!b.arrivalWindowStart || !b.arrivalWindowEnd){ const aw=suggestedArrivalWindow(b); if(aw){b.arrivalWindowStart=aw.start;b.arrivalWindowEnd=aw.end;b.suggestedArrivalAt=aw.start;} }
    if(!b.journeyVersion)b.journeyVersion=1;
  });
  if(Array.isArray(data.visits)) data.visits.forEach(function(v){ if(v.jenisLayanan===undefined){const pp=data.poli.find(function(p){return p.id===v.poliId;});v.jenisLayanan=pp&&pp.layanan||'Rawat Jalan';} });
  if(Array.isArray(data.visits)) data.visits.forEach(function(v){
    if(v.unit==='rawat-jalan' && v.status==='screening' && v.screening && v.workflow && v.workflow.screeningAt){
      v.status='menunggu_dokter';
      v.updatedAt=v.updatedAt||nowISO();
    }
    const n=queueNumberValue(v.noAntrian), key=v.poliId+'-'+(v.tanggal||todayStr());
    if(n!==null) data.meta.queueCounters[key]=Math.max(data.meta.queueCounters[key]||0,n);
  });
  data.bookings.forEach(function(b){
    const n=queueNumberValue(b.noAntrian), key=b.poliId+'-'+b.tanggalKontrol;
    if(n!==null) data.meta.queueCounters[key]=Math.max(data.meta.queueCounters[key]||0,n);
  });
  data.meta.schemaVersion = DB_SCHEMA_VERSION;
  data.meta.settings = Object.assign({
    avgWaitMinutes: 8,
    doctorQuotaDefault: 30,
    alertQueueThreshold: 10,
    lowStockThreshold: LOW_STOCK_THRESHOLD
  }, data.meta.settings||{});
  if(!Array.isArray(data.careRequests)) data.careRequests=[];
  if(!Array.isArray(data.prescriptions)) data.prescriptions=[];
  data.prescriptions.forEach(function(r){ if(r.unit===undefined) r.unit=r.admissionId?'rawat-inap':'rawat-jalan'; if(r.updatedAt===undefined) r.updatedAt=r.createdAt||nowISO(); if(r.siapAt===undefined) r.siapAt=null; if(r.diambilAt===undefined) r.diambilAt=null; if(r.jenisLayanan===undefined) r.jenisLayanan=r.admissionId?'rawat_inap':'rawat_jalan'; });
  data.prescriptions.forEach(function(r){if(!r.admissionId){const v=r.visitId?data.visits.find(function(x){return x.id===r.visitId;}):data.visits.find(function(x){return x.resepId===r.id;});if(v&&v.unit==='igd'){r.unit='igd';r.jenisLayanan='igd';r.patientId=r.patientId||v.patientId;}}});
  if(Array.isArray(data.visits)) data.visits.forEach(function(v){
    if(v.unit===undefined) v.unit='rawat-jalan';
    if(!v.workflow) v.workflow={bookedAt:v.createdAt||null, checkinAt:null, screeningAt:null, doctorStartAt:null, supportingAt:null, reviewAt:null, completedAt:null};
    if(v.screening===undefined) v.screening=null;
    if(v.nextStep===undefined) v.nextStep=null;
    if(v.communication===undefined) v.communication=[];
    if(v.supportingOrders===undefined) v.supportingOrders=[];
    if(v.status==='menunggu_poli' && !v.workflow.screeningAt) v.status='menunggu_screening';
  });
  if(Array.isArray(data.admissions)) data.admissions.forEach(function(a){ if(a.unit===undefined) a.unit='rawat-inap'; });
  if(Array.isArray(data.admissions)) data.admissions.forEach(function(a){ if(a.sumberAdmisi===undefined) a.sumberAdmisi=a.visitId?'Rawat Jalan':'Rujukan/Admisi'; if(a.kelasPerawatan===undefined){const w=data.wards&&data.wards.find(x=>x.id===a.wardId);a.kelasPerawatan=w?w.kelas:'3';} if(a.tingkatPerawatan===undefined)a.tingkatPerawatan='Bangsal'; if(!a.discharge)a.discharge={status:'belum_direncanakan',rencanaTanggal:null,kondisi:null}; if(a.billing&&a.billing.biayaPenunjang===undefined)a.billing.biayaPenunjang=0; });
  if(Array.isArray(data.users) && !data.users.some(function(u){return u.id==='U-RAD';})) data.users.push({id:'U-RAD',username:'radiologi',password:'rad123',nama:'Bambang Prasetyo',role:'radiologi'});
  if(Array.isArray(data.prescriptions)) data.prescriptions.forEach(function(r){ if(r.admissionId && r.status==='disiapkan' && !r.distribusiStatus) r.distribusiStatus='menunggu_serah'; });
  if(!Array.isArray(data.doctorSchedules)) data.doctorSchedules = [];
  const demoSchedules = [
    {id:'SCH-JAN-ANGELA-PAGI', doctorId:'DOC-ANGELA', poliId:'SP-JAN', tanggal:null, hari:1, jamMulai:'08:00', jamSelesai:'12:00', ruang:'Ruang 14', shiftLabel:'Pagi', kuota:null},
    {id:'SCH-JAN-SANY-SORE', doctorId:'DOC-SANY', poliId:'SP-JAN', tanggal:null, hari:1, jamMulai:'13:00', jamSelesai:'20:00', ruang:'Ruang 14', shiftLabel:'Sore', kuota:null}
  ];
  demoSchedules.forEach(function(sc){ if(!data.doctorSchedules.some(function(x){return x.id===sc.id;})) data.doctorSchedules.push(Object.assign({createdAt:nowISO(),updatedAt:nowISO()},sc)); });
  data.doctorSchedules.forEach(function(sc){if(sc.id==='SCH-JAN-RUDI-PAGI'){sc.id='SCH-JAN-ANGELA-PAGI';sc.doctorId='DOC-ANGELA';sc.poliId='SP-JAN';} if(sc.id==='SCH-JAN-SANY-SORE'){sc.doctorId='DOC-SANY';sc.poliId='SP-JAN';}});
  if(!Array.isArray(data.notifications)) data.notifications = [];
  data.notifications.forEach(function(n){ if(n.read===undefined) n.read=false; if(n.target===undefined) n.target=null; if(n.targetUserId===undefined) n.targetUserId=null; });
  if(!Array.isArray(data.facilities)) data.facilities = [];
  ensureOfficialCatalog(data);
  ensureOfficialDoctorMaster(data);
  // Normalisasi seluruh referensi poli lama/baru ke ID kanonik.
  // Ini mencegah data booking, kunjungan, user, jadwal dan pesan terpecah
  // hanya karena satu bagian memakai alias lama seperti UMU/JAN.
  data.users.forEach(function(u){ if(u.poliId) u.poliId=canonicalPoliId(u.poliId); if(u.username==='farmasi' && !u.unit) u.unit='rawat-jalan'; if(u.username==='kasir' && !u.unit) u.unit='rawat-jalan'; });
  data.bookings.forEach(function(b){ if(b.poliId) b.poliId=canonicalPoliId(b.poliId); });
  data.visits.forEach(function(v){ if(v.poliId) v.poliId=canonicalPoliId(v.poliId); });
  data.doctorSchedules.forEach(function(sc){ if(sc.poliId) sc.poliId=canonicalPoliId(sc.poliId); });
  if(Array.isArray(data.poliMessages)) data.poliMessages.forEach(function(m){ if(m.poliId) m.poliId=canonicalPoliId(m.poliId); });
  // V13.4: counter antrean sekarang milik POLI + TANGGAL, bukan dokter/sesi.
  // Nomor lama tetap dipertahankan agar tiket historis tidak berubah, tetapi
  // nomor baru selalu mengikuti counter poli/tanggal yang sama.
  data.meta.queueCounters={};
  data.visits.forEach(function(v){ const n=queueNumberValue(v.noAntrian), key=canonicalPoliId(v.poliId)+'-'+(v.tanggal||todayStr()); if(n!==null) data.meta.queueCounters[key]=Math.max(data.meta.queueCounters[key]||0,n); });
  data.bookings.forEach(function(b){ const n=queueNumberValue(b.noAntrian), key=canonicalPoliId(b.poliId)+'-'+b.tanggalKontrol; if(n!==null) data.meta.queueCounters[key]=Math.max(data.meta.queueCounters[key]||0,n); });
  // Backfill alokasi sesi/dokter untuk data lama bila nomor sudah memiliki
  // jadwal yang dapat ditentukan. Data lama tidak dipaksa pindah dokter.
  data.bookings.forEach(function(b){ if(b.dokterId===undefined) b.dokterId=null; if(b.sessionId===undefined) b.sessionId=null; });
  data.visits.forEach(function(v){ if(v.dokterId===undefined) v.dokterId=null; if(v.sessionId===undefined) v.sessionId=null; });
  ensureDivisionDemoUsers(data);
  data.users.forEach(function(u){if(u.doctorMasterId){const d=data.doctors.find(function(x){return x.id===u.doctorMasterId;});if(d){u.nama=d.nama;}}});
  data.meta.settings = Object.assign({pharmacyOutpatientSlaMinutes:30, pharmacyInpatientSlaMinutes:60, pharmacyIgdSlaMinutes:15}, data.meta.settings||{});
  return data;
}

let liveChannel=null;
try{ if(window.BroadcastChannel) liveChannel=new BroadcastChannel('simrs-live-v16'); }catch(e){ liveChannel=null; }
const Store = {
  data:null,
  load(){
    // STARTUP GUARD: localStorage dapat ditolak browser (mode file:///privasi),
    // dan data lama yang rusak dapat membuat migrasi gagal sebelum UI dirender.
    let raw = null;
    let canPersist = true;
    try { raw = localStorage.getItem('simrs_db_v1'); }
    catch(err) {
      canPersist = false;
      window.__SIMRS_STORAGE_WARNING = 'Penyimpanan browser tidak dapat dibaca. SIMRS dibuka dalam mode sementara; gunakan alamat server lokal/HTTPS agar data dapat disimpan.';
      console.warn('SIMRS storage read unavailable:', err);
    }

    let loaded = null;
    if(raw){
      try { loaded = JSON.parse(raw); }
      catch(err) {
        canPersist = false; // Jangan menimpa otomatis data lama yang tidak dapat dibaca.
        window.__SIMRS_BOOT_WARNING = 'Data lokal tidak dapat dibaca. Data lama tidak ditimpa otomatis; aplikasi dibuka menggunakan data demo sementara.';
        try { if(raw) localStorage.setItem('simrs_db_v1_recovery_backup_v16_4_2', raw); } catch(backupErr) {}
        console.warn('SIMRS stored data is invalid JSON:', err);
      }
    }

    if(loaded && loaded.meta && Number(loaded.meta.schemaVersion) <= DB_SCHEMA_VERSION){
      try { this.data = migrateData(loaded); }
      catch(err) {
        canPersist = false; // Pertahankan salinan lokal asli untuk pemeriksaan manual.
        window.__SIMRS_BOOT_WARNING = 'Migrasi data lokal gagal. Data lama dipertahankan dan aplikasi dibuka dengan data demo sementara.';
        try { if(raw) localStorage.setItem('simrs_db_v1_recovery_backup_v16_4_2', raw); } catch(backupErr) {}
        console.error('SIMRS data migration failed:', err);
        this.data = migrateData(seedData());
      }
    } else if(loaded && loaded.meta && Number(loaded.meta.schemaVersion) > DB_SCHEMA_VERSION){
      canPersist = false;
      window.__SIMRS_BOOT_WARNING = 'Data lokal berasal dari versi yang lebih baru. Data tersebut tidak ditimpa; aplikasi dibuka dengan data demo sementara.';
      try { if(raw) localStorage.setItem('simrs_db_v1_recovery_backup_v16_4_2', raw); } catch(backupErr) {}
      this.data = migrateData(seedData());
    } else {
      this.data = migrateData(seedData());
    }

    if(canPersist) this.save();
    return this.data;
  },
  save(){
    try {
      localStorage.setItem('simrs_db_v1', JSON.stringify(this.data));
      try { if(liveChannel) liveChannel.postMessage({type:'db-updated',at:Date.now()}); } catch(e){}
      return true;
    } catch(err) {
      window.__SIMRS_STORAGE_WARNING = 'Penyimpanan browser tidak tersedia. Perubahan hanya tersimpan sementara di memori perangkat ini; jangan tutup halaman sebelum menyalin data penting.';
      console.warn('SIMRS data could not be persisted:', err);
      return false;
    }
  }
};

const Session = {
  currentUser:null,
  load(){
    try {
      const raw = localStorage.getItem('simrs_session_v1');
      if(raw){ try { this.currentUser = JSON.parse(raw); } catch(e) { this.currentUser = null; } }
    } catch(err) {
      this.currentUser = null;
      window.__SIMRS_STORAGE_WARNING = window.__SIMRS_STORAGE_WARNING || 'Sesi login tidak dapat dibaca dari penyimpanan browser. Silakan masuk kembali.';
      console.warn('SIMRS session read unavailable:', err);
    }
  },
  login(user){
    this.currentUser = user;
    try { localStorage.setItem('simrs_session_v1', JSON.stringify(user)); }
    catch(err) { window.__SIMRS_STORAGE_WARNING = window.__SIMRS_STORAGE_WARNING || 'Sesi login tidak dapat disimpan oleh browser.'; console.warn('SIMRS session could not be persisted:', err); }
  },
  logout(){
    this.currentUser = null;
    try { localStorage.removeItem('simrs_session_v1'); }
    catch(err) { window.__SIMRS_STORAGE_WARNING = window.__SIMRS_STORAGE_WARNING || 'Browser tidak mengizinkan penghapusan sesi tersimpan.'; console.warn('SIMRS session could not be cleared:', err); }
  }
};

/* ---------------- getters ---------------- */
// Normalisasi ID poli agar akun demo lama (UMU/JAN/...) tetap terhubung
// dengan katalog resmi (RJ-UMU/SP-JAN/...). Semua modul antrean memakai helper ini.
const POLI_ALIAS = {UMU:'RJ-UMU',GIG:'SP-GIG',ANA:'SP-ANA',KDG:'SP-KDG',MAT:'SP-MAT',THT:'SP-THT',JAN:'SP-JAN',KUL:'SP-KUL',PDL:'SP-PDL',SYA:'SP-SAR',PAR:'SP-PAR'};
function canonicalPoliId(id){ return POLI_ALIAS[id] || id; }
function samePoli(a,b){ return canonicalPoliId(a)===canonicalPoliId(b); }
function getPoli(id){
  const cid=canonicalPoliId(id);
  return (Store.data && Array.isArray(Store.data.poli)) ? Store.data.poli.find(p=>p.id===cid) : null;
}

function getMedicine(id){ return Store.data.medicines.find(m=>m.id===id); }
/* =====================================================================
   PENCARIAN KODE: MODUL APLIKASI PASIEN — DATA & HELPER
   Helper pembacaan pasien/kunjungan digunakan bersama oleh UI pasien dan
   staf. Jangan mengubah struktur ID tanpa migrasi data dan uji integrasi.
   ===================================================================== */
function getPatient(id){ return Store.data.patients.find(p=>p.id===id); }
function getVisit(id){ return Store.data.visits.find(v=>v.id===id); }
function getUserById(id){ return Store.data.users.find(u=>u.id===id); }
function getResep(id){ return Store.data.prescriptions.find(r=>r.id===id); }
function getResepByVisit(visitId){
  const visit=getVisit(visitId);
  return (visit && visit.resepId ? getResep(visit.resepId) : null) || Store.data.prescriptions.find(r=>r.visitId===visitId) || null;
}
function linkPrescriptionToVisit(resep, visit){
  if(!resep || !visit) return false;
  let changed=false;
  if(!resep.visitId){resep.visitId=visit.id;changed=true;}
  if(!resep.patientId && visit.patientId){resep.patientId=visit.patientId;changed=true;}
  if(!visit.resepId){visit.resepId=resep.id;changed=true;}
  if(!resep.unit){resep.unit=resep.admissionId?'rawat-inap':(visit.unit||'rawat-jalan');changed=true;}
  if(!resep.jenisLayanan){resep.jenisLayanan=resep.admissionId?'rawat-inap':(visit.unit||'rawat-jalan');changed=true;}
  return changed;
}
function reconcileOutpatientPrescriptions(){
  let changed=false;
  (Store.data.prescriptions||[]).forEach(function(resep){
    if(resep.admissionId || (resep.unit && !['rawat-jalan','rawat_jalan'].includes(resep.unit))) return;
    const visit=resep.visitId?getVisit(resep.visitId):Store.data.visits.find(function(v){return v.resepId===resep.id;});
    if(!visit) return;
    if(linkPrescriptionToVisit(resep,visit)) changed=true;
    const unit=visit.unit||'rawat-jalan';
    if(unit==='rawat-jalan' && resep.status==='menunggu' && visit.status!=='dibatalkan' && !['menunggu_lab','menunggu_penunjang','menunggu_review','menunggu_rujukan_igd','rujuk_ranap'].includes(visit.status)){
      if(visit.status!=='menunggu_farmasi' || visit.nextStep!=='Farmasi Rawat Jalan'){
        visit.status='menunggu_farmasi'; visit.nextStep='Farmasi Rawat Jalan'; visit.updatedAt=nowISO(); changed=true;
      }
    }
    if(unit==='rawat-jalan' && resep.status==='disiapkan' && !['menunggu_bayar','obat_siap','selesai','menunggu_lab','menunggu_penunjang','menunggu_review','menunggu_rujukan_igd','rujuk_ranap'].includes(visit.status)){
      visit.status='menunggu_bayar'; visit.nextStep='Billing / Kasir Rawat Jalan'; visit.updatedAt=nowISO(); changed=true;
    }
  });
  if(changed) Store.save();
  return changed;
}
function visitsToday(){ const t = todayStr(); return Store.data.visits.filter(v=>v.tanggal===t); }
function patientVisits(patientId){
  return Store.data.visits.filter(v=>v.patientId===patientId).sort((a,b)=> new Date(b.createdAt) - new Date(a.createdAt));
}

/* ---------------- operational monitoring helpers ---------------- */
function getTodayBookings(poliId){
  return Store.data.bookings.filter(function(b){ return b.tanggalKontrol===todayStr() && (!poliId || samePoli(b.poliId,poliId)); });
}
function getTodayVisits(poliId){
  return visitsToday().filter(function(v){ return !poliId || samePoli(v.poliId,poliId); });
}
function getDoctorForPoli(poliId){
  return Store.data.users.find(function(u){ return u.role==='dokter' && samePoli(u.poliId,poliId); });
}
function getDoctorAvailability(poliId){
  const doctor = getDoctorForPoli(poliId);
  if(!doctor) return {status:'none', label:'Belum ada dokter', doctor:null};
  const messages = Store.data.poliMessages.filter(function(m){ return samePoli(m.poliId,poliId); });
  const latest = messages.length ? messages[0] : null;
  if(latest && latest.tipe==='cancel') return {status:'cancel', label:'Tidak Praktik', doctor:doctor, message:latest.pesan};
  if(latest && latest.tipe==='delay') return {status:'delay', label:'Terlambat', doctor:doctor, message:latest.pesan};
  return {status:'available', label:'Tersedia', doctor:doctor, message:latest ? latest.pesan : ''};
}
function queueMetrics(poliId){
  const visits = getTodayVisits(poliId);
  const waiting = visits.filter(function(v){ return v.status==='menunggu_poli'; }).sort(function(a,b){ return (b.prioritas?1:0)-(a.prioritas?1:0) || new Date(a.createdAt)-new Date(b.createdAt); });
  const current = visits.filter(function(v){ return v.status==='diperiksa'; }).sort(function(a,b){ return new Date(b.updatedAt||b.createdAt)-new Date(a.updatedAt||a.createdAt); })[0] || null;
  const completed = visits.filter(function(v){ return v.status==='selesai'; }).length;
  const avg = (Store.data.meta.settings && Store.data.meta.settings.avgWaitMinutes) || 8;
  const estimate = waiting.length * avg;
  return {visits:visits, waiting:waiting, current:current, completed:completed, estimate:estimate};
}
function clinicTodayMetrics(poliId){
  const bookings=getTodayBookings(poliId);
  const visits=getTodayVisits(poliId);
  const q=queueMetrics(poliId);
  return {registered:visits.length + bookings.filter(function(b){return !b.visitId && ['terjadwal','checked_in'].includes(b.status);}).length, bookings:bookings.length, waiting:q.waiting.length, examined:visits.filter(function(v){return v.status==='diperiksa';}).length, completed:visits.filter(function(v){return v.status==='selesai';}).length, queue:q};
}
function pharmacyWaitMinutes(resep){
  if(!resep || !resep.createdAt) return null;
  const end=resep.diambilAt || resep.siapAt || (resep.status==='disiapkan' ? resep.updatedAt : null);
  if(!end) return Math.max(0, Math.round((Date.now()-new Date(resep.createdAt).getTime())/60000));
  return Math.max(0, Math.round((new Date(end).getTime()-new Date(resep.createdAt).getTime())/60000));
}
function pharmacyMetrics(kind, poliId){
  const isInpatient=kind==='rawat_inap' || kind==='rawat-inap';
  const isIgd=kind==='igd';
  const settings=(Store.data&&Store.data.meta&&Store.data.meta.settings)||{};
  const sla=isInpatient?(settings.pharmacyInpatientSlaMinutes||60):(isIgd?(settings.pharmacyIgdSlaMinutes||15):(settings.pharmacyOutpatientSlaMinutes||30));
  let list=[];
  if(isInpatient){ list=Store.data.prescriptions.filter(function(r){return !!r.admissionId && ['menunggu','disiapkan'].includes(r.status) && (r.distribusiStatus!=='diberikan');}); }
  else { list=Store.data.prescriptions.filter(function(r){
    const v=getVisit(r.visitId || (Store.data.visits.find(function(x){return x.resepId===r.id;})||{}).id);
    const unit=(r.unit || r.jenisLayanan || (v&&v.unit) || 'rawat-jalan').replace('_','-');
    const expected=isIgd?'igd':'rawat-jalan';
    return !!v && unit===expected && (!poliId || samePoli(v.poliId,poliId)) && ['menunggu','disiapkan'].includes(r.status) && !r.admissionId;
  }); }
  const waits=list.map(pharmacyWaitMinutes).filter(function(x){return x!==null;});
  const maxWait=waits.length?Math.max.apply(null,waits):0;
  return {pending:list.filter(function(r){return r.status==='menunggu';}).length,maxWait:maxWait,sla:sla,overSla:list.filter(function(r){const w=pharmacyWaitMinutes(r); return r.status==='menunggu' && w!==null && w>sla;}).length};
}
function alternativeDoctors(poliId){
  const current = getDoctorForPoli(poliId);
  if(!current) return [];
  return Store.data.users.filter(function(u){ return u.role==='dokter' && u.id!==current.id && samePoli(u.poliId,poliId); });
}
function totalCapacityForPoliDate(poliId,dateStr){
  const sessions=getSessionCandidates(poliId,dateStr);
  if(!sessions.length) return ((Store.data.meta.settings&&Store.data.meta.settings.doctorQuotaDefault)||30);
  return sessions.reduce(function(sum,sc){return sum+sessionCapacity(sc);},0);
}
function quotaForPoli(poliId, dateStr){
  const d = dateStr || todayStr();
  const custom = Store.data.doctorSchedules.find(function(s){ return samePoli(s.poliId,poliId) && s.tanggal===d; });
  return custom && custom.kuota ? custom.kuota : ((Store.data.meta.settings && Store.data.meta.settings.doctorQuotaDefault) || 30);
}
function journeyIndex(status){
  const map={terjadwal:0,checked_in:1,menunggu_screening:2,menunggu_dokter:3,menunggu_poli:3,dipanggil:4,diperiksa:5,menunggu_lab:5,menunggu_farmasi:5,menunggu_bayar:5,obat_siap:5,selesai:6,dibatalkan:-1,tidak_hadir:-1,rescheduled:0,kadaluarsa:-1};
  return map[status]===undefined?3:map[status];
}
function journeyHtml(status, compact){
  const idx=journeyIndex(status);
  if(idx<0) return '<div class="alert alert-warning">'+(status==='dibatalkan'?'Booking dibatalkan.':status==='tidak_hadir'?'Pasien ditandai tidak hadir.':'Status booking sudah tidak aktif.')+'</div>';
  const cls=compact?' journey-compact':'';
  return '<div class="journey'+cls+'">'+QUEUE_JOURNEY.map(function(s,i){return '<div class="journey-step '+(i<idx?'done ':'')+(i===idx?'active':'')+'"><span>'+s.icon+'</span><div><strong>'+esc(s.label)+'</strong></div></div>';}).join('')+'</div>';
}
function suggestedArrivalWindow(booking){
  if(!booking) return null;
  const settings=(Store.data&&Store.data.meta&&Store.data.meta.settings)||{};
  const avg=Math.max(5,parseInt(settings.avgWaitMinutes||8,10));
  const sc=booking.sessionId?Store.data.doctorSchedules.find(function(x){return x.id===booking.sessionId;}):null;
  let startMinutes=null;
  if(booking.appointmentTime){ const m=String(booking.appointmentTime).match(/(\d{1,2}):(\d{2})/); if(m) startMinutes=parseInt(m[1],10)*60+parseInt(m[2],10); }
  if(startMinutes===null && sc && sc.jamMulai){ const m=String(sc.jamMulai).split(':'); startMinutes=parseInt(m[0],10)*60+parseInt(m[1],10); }
  if(startMinutes===null) startMinutes=8*60;
  const n=Math.max(1,queueNumberValue(booking.noAntrian)||1);
  const offset=Math.min(180,(n-1)*avg);
  const s=startMinutes+offset;
  const e=s+avg;
  function fmt(x){const h=Math.floor(x/60)%24,m=x%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
  return {start:fmt(s),end:fmt(e),text:fmt(s)+'–'+fmt(e),base:fmt(startMinutes),avgWait:avg};
}
function queueRuleExplanation(booking){
  if(!booking) return '';
  const isEx=(booking.jenisLayanan||'').toLowerCase().includes('eksekutif') || String(booking.poliId||'').startsWith('EX-');
  const q=queueNumberValue(booking.noAntrian);
  const cap=booking.sessionId?sessionCapacity(Store.data.doctorSchedules.find(function(x){return x.id===booking.sessionId;})||{}):null;
  return '<div class="alert alert-info"><strong>Aturan antrean prototype:</strong> '+(isEx?'Eksekutif memakai konteks klinik, dokter, sesi, dan appointment sendiri; tidak digabung dengan Reguler.':'Reguler memakai urutan nomor per poli + tanggal, lalu sistem mengalokasikan dokter/sesi berdasarkan jadwal dan kapasitas.')+(q!==null?' Nomor Anda <strong>'+esc(booking.noAntrian)+'</strong> tetap menjadi identitas antrean pada kunjungan ini.':'')+(cap?' Kapasitas sesi saat ini '+cap+' pasien.':'')+'</div>';
}
function bookingStatusLabel(status){
  return ({terjadwal:'BOOKED',checked_in:'CHECK-IN',dibatalkan:'DIBATALKAN',tidak_hadir:'TIDAK HADIR',rescheduled:'DIJADWALKAN ULANG',kadaluarsa:'KADALUARSA'})[status] || status;
}
function pushNotification(type, title, body, target, targetUserId){
  if(!Array.isArray(Store.data.notifications)) Store.data.notifications=[];
  Store.data.notifications.unshift({id:uid('NTF'), type:type||'info', title:title||'', body:body||'', target:target||null, targetUserId:targetUserId||null, read:false, createdAt:nowISO()});
  if(Store.data.notifications.length>100) Store.data.notifications.length=100;
}

/* =================================================================
   ROUTER, SHELL, LOGIN, TOAST/MODAL HELPERS
   ================================================================= */
let installPromptEvent = null;
const MODULE_RENDERERS = {};

function operationalContextLabel(ctx){
  return ({'rawat-jalan':'Rawat Jalan / Poli','igd':'IGD','rawat-inap':'Rawat Inap'}[ctx] || 'SIMRS');
}
function routeContext(route){
  // Konteks unit harus diperiksa sebelum pemeriksaan "rawat-jalan"
  // karena nama rute farmasi/kasir juga mengandung kata rawat-jalan.
  if(['igd','triase-igd','dokter-igd','perawat-pelaksana-igd','farmasi-igd','kasir-igd','monitor-igd'].includes(route)) return 'igd';
  if(route==='ranap' || route==='farmasi-rawat-inap' || route==='kasir-rawat-inap') return 'rawat-inap';
  if(route==='poli' || route==='farmasi-rawat-jalan' || route==='kasir-rawat-jalan' || route==='booking' || route==='pendaftaran') return 'rawat-jalan';
  return null;
}

