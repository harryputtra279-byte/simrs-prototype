# AUDIT FINAL DESAIN 3D TERINTEGRASI — SIMRS PROTOTYPE

- Baseline sumber: `V16.5.19_SIMRS_PROTOTYPE_KAWASAN_3D_LOGIN_VISUAL_FIX.zip`
- Status: audit statis dan pemetaan kode selesai; belum mengubah kode aplikasi.
- Tujuan: menyiapkan redesain isometrik 3D menyeluruh dengan panel kerja praktis, tanpa merusak fungsi SIMRS.
- Keputusan desain yang disetujui: login 3D terpadu; dashboard sebagai pusat kawasan miniatur isometrik; seluruh halaman internal memakai bahasa visual 3D Glass UI, tetapi form/tabel tetap praktis; gedung besar tidak harus menjadi latar setiap halaman kerja.

## 1. Kesimpulan audit

Aplikasi memakai classic scripts global yang dimuat berurutan, satu shell navigasi, banyak renderer yang mengisi `#main-content`, CSS global dengan banyak lapisan override historis, dan mesin tema yang mengubah token pada `document.documentElement`. Karena itu, redesain harus dilakukan melalui lapisan komponen visual bersama plus penyesuaian renderer per area, bukan hanya mengganti background/login atau menambah CSS global.

Kegagalan utama versi sebelumnya yang perlu dicegah: perubahan yang terlihat hanya pada login, sementara dashboard dan halaman internal tetap mempertahankan struktur visual lama. Setiap renderer di bawah ini harus masuk ke matriks desain dan tes sebelum versi rilis dinyatakan selesai.

## 2. Arsitektur dan urutan pemuatan

1. `qrcode.lib.js` — pustaka QR lokal.
2. `theme-system.js` — katalog tema, paint/apply/preview/reset dan penyimpanan tema.
3. `modules/rawat-inap/core.js` — helper shift, lokasi, perjalanan admisi dan monitor perawat rawat inap.
4. `modules/01-core-store-master.js` — konstanta, Store, seed/migrasi, master data, akun demo, helper lintas modul.
5. `modules/02-navigation-auth-shell.js` — katalog route, role checks, shell, login, notifikasi, modal, dashboard admin.
6. `modules/03-patient-app.js` — dashboard pasien, booking/tiket, riwayat, perjalanan pasien, beranda per role.
7. `modules/04-registration-booking.js` — pendaftaran, check-in QR, booking, antrean, H-1, sesi dokter.
8. `modules/05-outpatient.js` — rawat jalan, poli, monitor dokter, pemeriksaan, resep dan care request.
9. `modules/06-diagnostics-pharmacy-cashier.js` — laboratorium, radiologi, farmasi dan kasir.
10. `modules/07-inpatient-medical-records.js` — rawat inap, admisi, bangsal/bed, rekam medis, master data.
11. `modules/08-queue-igd-bootstrap.js` — monitor antrean, IGD, audit sistem, bootstrap, offline banner.

Kontrak: jangan mengubah classic scripts menjadi ES modules, mengubah urutan, atau membungkusnya ke scope privat tanpa audit dependensi dan pengujian kompatibilitas khusus.

## 3. Peta cakupan UI untuk redesain

| Area | Renderer/entry point utama | Rencana visual | Kontrak fungsional yang wajib dipertahankan |
|---|---|---|---|
| Login/sesi | `renderLogin`, `handleLogin`, `doLogin`, `render`, `renderShell` (Modul 02) | Komposisi miniatur isometrik dan panel autentikasi terpadu; tidak ada ikon/judul terpisah di luar komposisi | validasi kredensial demo, sesi, pesan error, pemulihan data, logout |
| Shell/navigation | `renderShell`, `bindShellEvents`, `openMoreSheet`, `openAccountSheet`, `openGlobalSearch` (Modul 02) | topbar/sidebar/bottom navigation berbasis glass; unit 3D tidak membuat route baru atau bypass role | `NAV_ITEMS`, `PRIMARY_NAV_BY_ROLE`, `ROLE_ROUTE_RULES`, `isRouteAllowed`, route default |
| Dashboard admin | `renderDashboard` (Modul 02) | pusat kawasan miniatur; pintasan bangunan memakai route yang sudah diizinkan; KPI operasional tetap berupa data yang benar | statistik, pencarian, navigasi, data sumber yang ada |
| Beranda per role | `renderBeranda`, `renderBerandaBody`, `berandaAdmin`, `berandaLoket`, `berandaDokter`, `berandaFarmasi`, `berandaKasir`, `berandaLab`, `berandaPerawat`; `renderInpatientBeranda` (Modul 03) | satu sistem desain, konten dan shortcut berbeda sesuai role | tidak menampilkan tindakan yang tidak sesuai kewenangan; aksi lama tetap terikat |
| Pasien | `renderPatientDashboard`, `renderPatientBooking`, `renderPatientBookingSaya`, `renderPatientRiwayat`, `renderPatientInfo`, `renderPatientChat`, `renderPatientRawatInap`, `openPatientBookingTicket` (Modul 03) | glass praktis; perjalanan pasien sebagai status data, bukan animasi yang menjadi sumber kebenaran | booking, tiket/barcode, riwayat, chat, perjalanan layanan, akses data milik pasien |
| Pendaftaran/check-in | `renderPendaftaran`, `renderCheckinScannerPanel`, `renderCheckinResult`, `renderBooking`, `renderBookingCheckinTab`, `renderBookingH1Tab` (Modul 04) | panel langkah kerja, pemindai/tombol fallback dan status jelas | identitas booking/visit, QR, check-in manual, jadwal/sesi, H-1, audit |
| Rawat jalan/poli | `renderPoli`, `renderDoctorSessionDashboard`, `renderQueueControlPanel`, `openScreening`, `renderFormPeriksa` (Modul 05) | dashboard klinis berlapis glass, antrean mudah dipindai; form pemeriksaan tidak ditutupi ornamen 3D | sesi per dokter/poli, panggil/ulang/jeda, screening, pemeriksaan, riwayat, resep |
| Lab/radiologi | `renderLab`, `renderLabList`, `renderRadiologi`, `renderAncillaryHome`, `renderAncillaryMonitor` (Modul 06) | workspace berbasis daftar order dan status; detail order di panel glass | referensi visit/admisi, unggahan lampiran, hasil, status tinjauan dan monitor |
| Farmasi | `renderFarmasi`, `renderFarmasiResepTab`, `renderFarmasiRanapTab`, `renderFarmasiSiapTab`, `renderFarmasiStokTab` (Modul 06) | antrean resep/penyiapan/penyerahan jelas; tidak menyembunyikan status atau aksi | relasi resep sumber, status siapkan/serahkan, farmasi RJ/RI/IGD, stok |
| Kasir | `renderKasir`, `renderKasirBayarTab`, `renderKasirRanapTab`, `renderKasirRiwayatTab` (Modul 06) | ringkasan tagihan dan tindakan pembayaran tetap dominan; modal responsif | tagihan sesuai visit/admisi, proses pembayaran, invoice dan riwayat |
| Rawat inap | `renderRanap`, `renderRanapPasienTab`, `renderRanapBangsalTab`, `renderRanapDetailBody`, `renderInpatientNurseMonitor` (Modul 07 dan core) | gedung/lantai/ruang dapat memakai isometri di dashboard; workspace admisi, CPPT, vital, order, obat dan pulang tetap praktis | admisi, bed, handover, shift, CPPT, NEWS2, order, resep, pindah bed, pulang |
| Rekam medis | `renderRekamMedis`, `tampilkanRekamMedis`, `renderRiwayatDokter` (Modul 07) | pencarian dan ringkasan klinis terstruktur dengan hierarki jelas | scope pasien/kunjungan sesuai role, riwayat dan dokumen sumber |
| Master data/RBAC | `renderMasterData`, `renderMasterDoctorsTab`, `renderMasterWardsTab`, `renderMasterFacilityTab`, `renderMasterRbacTab`, `renderMasterLogTab` (Modul 07) | tabel/form konsisten, visualisasi fasilitas boleh memakai peta isometrik | role rules, dokter, ruang/bed, fasilitas, staf, audit log, konfigurasi tema |
| IGD | `renderIGD`, `renderIgdTriage`, `renderIgdDoctor`, `renderIgdNurseExecution`, `renderIgdHome`, `renderIgdMonitor` (Modul 08) | dashboard 3D untuk gambaran unit; triase dan ruang klinis tetap berorientasi tindakan | triase/prioritas, instruksi dokter, eksekusi perawat, bed, rujukan, farmasi/penunjang/RI |
| Monitor publik/antrean | `renderCekAntrian`, `renderMonitorAntrean`, `openDoctorMonitor`, `renderCekBedGrid`, `renderCekAntrianGrid` (Modul 08) | tampilan monitor kontras tinggi dan dapat dibaca dari jarak jauh | tidak membocorkan data pasien; antrean per poli/sesi; status bed |
| Audit/bootstrap/offline | `renderAuditSistem`, `runSystemAudit`, `updateOfflineBanner`, `doInstallPrompt` (Modul 08) | halaman audit dan banner konsisten; jangan menutupi konten | startup aman, tidak menghapus data saat gagal, PWA/cache dan diagnostik |

## 4. Tema dan token

`theme-system.js` mendefinisikan katalog tema dan fungsi inti `paint`, `apply`, `currentTheme`, `isSuperUser`, serta panel tema. Tema aktif disimpan pada `localStorage` dengan key `simrs.theme.active`. `paint()` menetapkan token antara lain `--accent`, `--accent-2`, `--paper`, `--clinical`, `--clinical-dark`, `--simrs-glass-border`, `--simrs-glass-border-hot`, dan `--simrs-glass-surface`; atribut `data-theme-kind`, `data-theme-pattern`, dan `data-theme-id` menjadi penanda tema.

Aturan implementasi berikutnya:
- jangan mengganti ID atau mengurangi katalog tema;
- jangan menggabungkan pemilihan kartu dengan aksi Terapkan jika saat ini preview dan apply terpisah;
- jangan menghapus reset atau persistensi;
- elemen 3D harus menggunakan token/atribut tema, bukan warna hard-coded yang mengunci palet;
- uji kontras teks/status untuk tema terang, gelap, batik, dan nature;
- uji pembatalan preview agar tema tersimpan tidak berubah tanpa tindakan Terapkan.

## 5. CSS dan risiko cascade

`style.css` memiliki banyak lapisan aturan historis sampai blok V16.5.13 dan seterusnya, termasuk beberapa aturan login, theme panel, glass UI, layout mobile, dan pengurangan motion. Risiko utama adalah override baru menambah konflik dan membuat perubahan hanya terlihat di satu breakpoint.

Strategi yang disarankan:
1. petakan selector/komponen bersama sebelum menambah CSS;
2. kelompokkan token, shell, login, dashboard, komponen operasional, dan responsive rules secara eksplisit;
3. tambahkan `PENCARIAN KODE` di setiap blok baru/perubahan besar;
4. hindari selector global agresif atau `!important` baru kecuali ada bukti konflik yang terdokumentasi;
5. pastikan panel operasional tidak mewarisi perspektif/transform 3D yang mengganggu input, sticky header, modal, atau scrolling;
6. hormati `prefers-reduced-motion`, forced-colors, fokus keyboard dan ukuran sentuh.

## 6. Login, gedung, dan dashboard 3D

Baseline mempunyai `#simrs-campus-backdrop` berupa SVG inline dekoratif, dengan opacity berbeda pada login/mobile dan warna gedung yang sebagian hard-coded. `renderLogin()` berada di Modul 02 dan membentuk `.login-wrap`, `.login-panel`, `.login-hero` dan kelompok akun demo. Shell menambahkan tautan `Kawasan 3D` pada topbar; baseline juga memiliki `kawasan-3d.html` mandiri.

Keputusan desain yang sudah disetujui untuk implementasi selanjutnya:
- identitas/logo/nama aplikasi menjadi bagian dari satu komposisi login 3D; hapus identitas duplikat yang terpisah;
- dashboard admin menempatkan miniatur isometrik sebagai pusat navigasi dan menghubungkan bangunan ke route yang sudah diizinkan;
- semua halaman kerja menerapkan bahasa visual 3D Glass UI tetapi tidak memaksa miniatur besar terus terlihat;
- kawasan visual bukan sumber data klinis dan bukan pengganti validasi akses;
- setiap shortcut bangunan wajib memakai route/handler yang sudah ada dan lolos `isRouteAllowed`;
- jangan hapus halaman/entrypoint 3D atau tautannya sampai pengganti terintegrasi selesai dan tes migrasi/route disiapkan.

## 7. Data, RBAC, dan alur lintas unit

Store/migrasi dan banyak fungsi lintas modul berada di global scope. Perubahan visual tidak boleh mengganti struktur/ID data atau membuat handler baru yang melewati fungsi otoritatif.

Kontrak wajib:
- pasien → booking → loket/QR check-in → visit → antrean poli;
- dokter → resep → farmasi → status perjalanan pasien;
- dokter → order lab/radiologi → hasil → peninjauan oleh klinisi;
- IGD → triase → dokter → eksekusi perawat → penunjang/farmasi/rujukan rawat inap;
- admisi → penempatan bed → shift/CPPT/vital/order/obat → perpindahan/pulang;
- visit/admisi → billing → kasir → invoice/riwayat;
- pasien hanya dapat melihat/mengubah data yang diizinkan; menu tersembunyi saja tidak cukup, pemeriksaan role pada fungsi mutasi tetap penting.

`MODULE_MAP.json` saat ini masih mencantumkan versi lama v16.5.8 meskipun aset utama memakai V16.5.19. Ini bukan bukti runtime rusak, tetapi dokumentasi perlu diperbarui saat rilis berikutnya agar tidak membingungkan pemeliharaan.

## 8. PWA, cache, dan aset

`index.html` menggunakan query versi `16.5.19` untuk CSS dan modul. `sw.js` menggunakan `SW_VERSION = 'v16.5.19'` dan APP_SHELL dengan aset versi tersebut. Cache-first dengan pembaruan latar belakang berarti seluruh perubahan harus menaikkan versi konsisten di `index.html`, `sw.js`, serta metadata versi aplikasi; jika tidak, pengguna bisa melihat UI campuran atau versi lama.

Pemeriksaan versi statis pada baseline: `index.html` menyebut 16.5.19 pada 14 lokasi yang cocok; `sw.js` menyebut 16.5.19 pada 13 lokasi yang cocok. Duplikasi referensi `theme-system.js` dalam APP_SHELL perlu dibersihkan hanya bila rencana perubahan cache mengizinkan dan dengan tes regresi offline.

## 9. Pengujian yang dijalankan pada audit

Semua file JavaScript utama lolos `node --check`.

Tes kontrak yang dijalankan:
- `tests/kawasan-3d-smoke.js` — lulus;
- `tests/stage6-readonly-contract.js` — 10/10 lulus;
- `tests/stage7-accessibility-performance.js` — 9/9 lulus;
- `tests/stage8-3d-entrypoint.js` — 6/6 lulus;
- `tests/stage8-workflow-contracts.js` — kontrak yang tercantum lulus;
- `tests/startup-smoke.js` — lulus, login dirender dan startup mode normal.

Catatan interpretasi: tes `stage8-3d-entrypoint.js` mengharapkan tautan dan halaman 3D mandiri masih tersedia. Ini menguji baseline lama, bukan membuktikan desain 3D sudah terintegrasi. Tes tersebut perlu direvisi ketika integrasi menggantikan entry point mandiri. Semua tes di atas merupakan pemeriksaan statis/kontrak atau smoke test Node; belum merupakan bukti browser E2E.

## 10. Matriks validasi sebelum rilis berikutnya

### Visual per viewport
- Android lebar 360/390/412 px, portrait dan landscape;
- tablet sekitar 768 px;
- desktop 1280 px atau lebih;
- login, dashboard admin, beranda role, minimal satu renderer tiap modul, modal, tabel panjang, tema terang/gelap/batik/nature;
- fokus keyboard, reduced motion, kontras status, scrolling horizontal/vertikal.

### Fungsional per role
- admin/superuser: login, dashboard gedung, semua unit, master data, RBAC, tema;
- loket: cari/buat pasien, booking, QR dan manual check-in;
- dokter/perawat rawat jalan: antrean per sesi, screening, pemeriksaan, resep;
- farmasi: resep RJ/RI/IGD, siapkan, serahkan, status perjalanan;
- lab/radiologi: order, input hasil, lampiran, status ditinjau;
- kasir: billing yang terhubung ke visit/admisi dan pembayaran;
- IGD: triase, dokter, perawat, bed, penunjang, farmasi, rujukan;
- rawat inap: admisi, bed, shift, CPPT, vital, order, obat, pindah bed dan pulang;
- pasien: booking, tiket QR, check-in, antrean, riwayat, perjalanan, aturan pembatalan;
- PWA: update versi, reload setelah aktivasi service worker, fallback offline dan data localStorage tetap ada.

### Gerbang rilis
1. syntax check semua JS;
2. seluruh tes kontrak yang diperbarui lulus;
3. periksa duplikasi deklarasi global dan urutan script;
4. verifikasi semua aset APP_SHELL ada;
5. periksa versi pada HTML, JS, SW dan dokumentasi;
6. jalankan browser smoke pada login dan satu halaman tiap kelompok;
7. uji seluruh role dan alur lintas unit;
8. inspeksi ZIP setelah ekstraksi;
9. nyatakan secara eksplisit tes yang belum dapat dijalankan.

## 11. Hal yang belum bisa diklaim

Audit ini menyelesaikan pemetaan statis arsitektur, renderer, kontrak tema, cache, dan rencana tes. Lingkungan ini belum menghasilkan bukti screenshot browser/Android untuk setiap halaman, tidak menguji publikasi GitHub Pages live, dan tidak menggantikan uji manual dengan akun demo. Karena itu audit tidak mengklaim bahwa seluruh tampilan sudah benar secara visual atau bahwa aplikasi siap untuk penggunaan klinis produksi.

## 12. Keputusan akhir audit

Audit statis selesai dan ruang lingkup implementasi jelas. Tidak ada kode aplikasi yang diubah selama audit ini. Implementasi berikutnya harus memakai baseline V16.5.19, memperlakukan V16.5.20 sebagai paket percobaan yang sebelumnya gagal memenuhi cakupan visual yang disepakati, menjaga baseline tetap utuh, lalu mengerjakan integrasi secara bertahap dengan tes visual/fungsional per halaman dan per role.
