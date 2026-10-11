# SIMRS PROTOTYPE — V16.4.3

## Tahap 6 — Refaktor fisik modul, tanpa mengubah workflow

**Baseline langsung:** `V16.1.1_SIMRS_BASELINE_TAHAP1-5.zip`.

### Sasaran refaktor
- Memecah monolit `app.js` menjadi berkas JavaScript per kelompok tanggung jawab agar pencarian dan perbaikan manual lebih mudah.
- Mempertahankan seluruh pernyataan aplikasi baseline dan urutan eksekusinya; tidak menghapus fitur atau menulis ulang aturan bisnis dalam tahap pemisahan ini.
- Mempertahankan `style.css`, Glass UI, QR library, markup shell, dan helper Rawat Inap yang sudah terpisah.
- Menggunakan **classic scripts** berurutan, bukan ES modules, untuk menjaga kompatibilitas fungsi global dan handler inline yang sudah digunakan UI.
- Menambahkan header modul berisi nama, tanggung jawab, kontrak integrasi, serta lokasi pencarian.

### Peta modul dan urutan pemuatan

| Urutan | Berkas | Tanggung jawab utama |
|---:|---|---|
| 0 | `modules/rawat-inap/core.js` | Helper inti Rawat Inap yang sudah ada; dimuat sebelum kode aplikasi. |
| 1 | `modules/01-core-store-master.js` | Konstanta, seed/migrasi, Store, master fasilitas, akun demo, helper dasar. |
| 2 | `modules/02-navigation-auth-shell.js` | Navigasi, RBAC, login/sesi, toast/modal, helper tampilan. |
| 3 | `modules/03-patient-app.js` | Dashboard pasien, booking, barcode, riwayat, notifikasi, perjalanan layanan. |
| 4 | `modules/04-registration-booking.js` | Pendaftaran loket, booking antrean, check-in QR, pengingat H-1. |
| 5 | `modules/05-outpatient.js` | Rawat Jalan, monitor antrean, dokter/asisten, penyelesaian pemeriksaan. |
| 6 | `modules/06-diagnostics-pharmacy-cashier.js` | Laboratorium, Radiologi, Farmasi, Kasir dan alur penunjang/transaksi. |
| 7 | `modules/07-inpatient-medical-records.js` | Rawat Inap, admisi, ruang/bed, Rekam Medis, riwayat dan master operasional. |
| 8 | `modules/08-queue-igd-bootstrap.js` | Papan antrean, IGD, registrasi renderer, bootstrap aplikasi. |

### Kontrak integrasi yang wajib dijaga
- **Urutan skrip tidak boleh diacak.** Semua berkas dimuat sebagai classic scripts supaya binding global lama tetap tersedia tanpa konversi `import/export`.
- `Store`, `Session`, katalog poli, helper tanggal/format, notifikasi, audit, dan fungsi akses bersama harus didefinisikan sebelum modul yang menggunakannya.
- Identitas `patientId`, `visitId`, `admissionId`, `prescriptionId`, `careRequestId`, dan referensi tagihan tidak boleh diganti atau dibuat ulang ketika refaktor berikutnya.
- Dokter/asisten menyelesaikan pemeriksaan melalui workflow Rawat Jalan; resep harus tetap masuk ke Farmasi; order Lab/Radiologi harus kembali ke episode asal; Kasir harus mempertahankan jenis layanan/episode sumber.
- UI pasien hanya menampilkan perjalanan/status; tindakan klinis dan perubahan status layanan tetap dilakukan role petugas yang berwenang.
- `style.css` tidak diubah dalam refaktor ini agar Glass UI dan struktur visual tetap sama.
- Perubahan skema `localStorage` wajib melalui migrasi kompatibel dan tidak boleh menghapus data pengguna.

### Versi dan PWA
Versi runtime, query versi aset, dan cache Service Worker diperbarui menjadi `v16.4.2`. `sw.js` memasukkan seluruh berkas modul baru ke dalam App Shell agar bisa tersedia melalui cache PWA.

### Hasil pemeriksaan pada paket ini
- Pemeriksaan sintaks dilakukan untuk setiap modul JavaScript, `modules/rawat-inap/core.js`, dan `sw.js`.
- `manifest.json` diperiksa sebagai JSON valid.
- Nama dan urutan skrip di `index.html` dibandingkan dengan daftar cache di `sw.js`.
- Pemeriksaan statis dilakukan untuk memastikan blok kode baseline terbagi berurutan tanpa menghilangkan rentang sumber.
- **Uji browser end-to-end belum diklaim lulus.** Setelah pemasangan lokal, wajib menguji akun demo dan alur lintas unit sebelum mengganti repository utama.

### Batasan penting
Pemisahan ini adalah refaktor struktural, bukan sertifikasi SIMRS produksi. Modul-modul masih berbagi global aplikasi dan `localStorage` per browser/perangkat. Untuk produksi diperlukan backend/database terpusat, autentikasi dan otorisasi sisi server, audit terpusat, backup, serta validasi klinis dan keamanan.

---

## Riwayat perubahan versi sebelumnya (catatan historis)

## V16.0.9 — Tahap 5: Penataan kode aplikasi pasien

### Tujuan tahap
- Menambahkan penanda pencarian dan komentar untuk data/helper pasien, status perjalanan, booking, riwayat, notifikasi/chat, tiket/barcode, Rawat Inap, dashboard, dan izin notifikasi.
- Menjelaskan batas tanggung jawab UI pasien agar tidak mengambil alih perubahan status klinis yang harus dilakukan petugas.
- Mempertahankan implementasi fungsi yang ada; tahap ini berfokus pada dokumentasi/penataan komentar, bukan perubahan aturan workflow.
- Memperbarui versi aplikasi dan cache menjadi `v16.0.9`.

### Area pencarian kode
Cari `PENCARIAN KODE: MODUL APLIKASI PASIEN` di `app.js`.

### Batasan pengujian
Pemeriksaan statis tidak membuktikan seluruh alur interaktif. Sebelum rilis stabil, uji login akun pasien, booking, tiket/barcode, pembatalan sesuai penjamin, notifikasi, riwayat, antrean, resep/perjalanan farmasi, serta keterhubungan status Rawat Jalan, IGD, dan Rawat Inap. Data lokal pada browser uji perlu dicadangkan sebelum pengujian migrasi.

# SIMRS PROTOTYPE — V16.0.9

## V16.0.9 — Tahap 4: Penataan struktur kode IGD

### Tujuan tahap
- Menambahkan penanda pencarian kode untuk pendaftaran/episode IGD, triase, workspace dokter, perawat pelaksana, Beranda, dan Monitor.
- Memperjelas batas tanggung jawab tiap workspace melalui komentar, tanpa mengubah isi fungsi atau aturan workflow yang sudah ada.
- Menjaga versi aplikasi dan cache service worker selaras pada `v16.0.9`.
- Menjadikan V16.0.7 sebagai baseline langsung untuk tahap ini.

### Ruang lingkup dan batas perubahan
- Perubahan fungsional sengaja dihindari pada tahap penataan ini agar risiko merusak alur sebelumnya tetap rendah.
- Fungsi IGD belum dipindahkan ke berkas JavaScript terpisah karena masih memiliki dependensi silang dengan Store, kunjungan, notifikasi, audit, farmasi, kasir, laboratorium, radiologi, dan Rawat Inap.
- Penanda kode membantu pencarian; penanda tersebut bukan bukti bahwa seluruh alur IGD sudah lolos pengujian interaktif.

### Pencarian kode IGD
Cari penanda berikut di `app.js`:
- `MODUL: IGD — PENDAFTARAN`
- `MODUL: IGD — TRIASE`
- `MODUL: IGD — DOKTER`
- `MODUL: IGD — PERAWAT PELAKSANA`
- `MODUL: IGD — BERANDA`
- `MODUL: IGD — MONITOR`

### Pengujian yang diperlukan
1. Pendaftaran pasien IGD membuat satu episode dan mencegah episode aktif ganda.
2. Perawat Triase dapat menyimpan triase pada episode yang sama.
3. Dokter IGD dapat menyimpan asesmen/instruksi sesuai kewenangan.
4. Perawat Pelaksana dapat memperbarui status instruksi sesuai urutan status yang diizinkan.
5. Beranda dan Monitor menampilkan data yang sama sumbernya.
6. Rujukan, resep/farmasi, kasir, laboratorium/radiologi, serta disposisi Rawat Inap tetap terhubung.
7. Role non-IGD tidak memperoleh akses ke workspace IGD.

### Status pemeriksaan
- Perubahan dilakukan pada komentar/penanda struktur serta nomor versi cache.
- Pemeriksaan sintaks dan integritas ZIP harus dijalankan sebelum distribusi.
- Pengujian browser menyeluruh belum dapat dianggap lulus hanya berdasarkan pemeriksaan statis.

---

# SIMRS PROTOTYPE — V16.0.9

## V16.0.7 — Tahap 3: Penataan kode Rawat Jalan

### Tujuan tahap
- Menambahkan batas modul dan penanda pencarian kode untuk alur Rawat Jalan tanpa memindahkan fungsi global secara berisiko.
- Menjelaskan tanggung jawab tiap area: Pendaftaran/Booking/Check-in, Beranda/Monitor/Antrean Poli, Dokter Poli/Asisten, integrasi resep ke Farmasi, dan integrasi tagihan ke Kasir.
- Menjaga hubungan ID pasien, booking, visit, resep, dan transaksi agar alur lintas layanan tidak terputus.
- Menyamakan versi internal aplikasi dan versi cache service worker menjadi `v16.0.7`.

### Catatan penting
- Ini adalah tahap penataan struktur dan dokumentasi kode, bukan pemindahan besar-besaran fungsi ke file terpisah. Banyak handler inline dan fungsi global masih saling bergantung; memindahkannya sebelum pemetaan dependensi dapat menyebabkan tombol/menu tidak bekerja.
- Pemisahan fisik berkas Rawat Jalan akan dilanjutkan bertahap setelah alur diuji, dengan menjaga Glass UI dan alur yang sudah ada.
- Pemeriksaan sintaks dan integritas arsip tidak menggantikan pengujian interaktif di browser untuk setiap akun demo.

### Pencarian kode
Cari penanda berikut di `app.js`:
- `MODUL: RAWAT JALAN — PENDAFTARAN / BOOKING / CHECK-IN`
- `MODUL: RAWAT JALAN — BERANDA, MONITOR, DAN ANTRIAN POLI`
- `MODUL: RAWAT JALAN — DOKTER POLI / ASISTEN`
- `MODUL: FARMASI — INTEGRASI RESEP RAWAT JALAN`
- `MODUL: KASIR — INTEGRASI PEMBAYARAN RAWAT JALAN`

---

# SIMRS PROTOTYPE — V16.0.4

## V16.0.4 — Audit struktur, akun per unit, dan integrasi akses Rawat Inap

### Hasil Tahap 1 — Audit awal

- Baseline yang diperiksa: V16.0.3.
- Aplikasi menggunakan satu berkas JavaScript utama (`app.js`) yang memuat banyak modul dan fungsi lintas unit. Pemisahan berkas fisik akan dilakukan hanya setelah dependensi dipetakan; untuk tahap ini, penanda modul dan komentar pencarian ditambahkan agar kode lebih mudah dirawat tanpa memutus fungsi global.
- Sumber data demo disimpan pada `Store` melalui `localStorage` (`simrs_db_v1`). Perubahan struktur data harus melewati `migrateData()` dan mempertahankan ID pasien, kunjungan, admisi, ruang, bed, dan resep yang sudah dipakai.
- Sebelum perbaikan, akun perawat Rawat Inap demo hanya mencakup ruang `W-K2` serta akun generik per shift. Karena daftar pasien dibatasi menurut `wardId`, pasien yang ditempatkan di ruang lain tidak muncul pada akun perawat tersebut.
- Pencarian Rekam Medis sebelumnya terutama menyusun daftar pasien dari kunjungan (`visits`), sehingga pasien yang baru memiliki episode admisi Rawat Inap aktif dapat tidak muncul jika belum memiliki kunjungan yang cocok.
- Nilai versi internal `PROTOTYPE_VERSION` di `app.js` tertinggal pada `v16.0.1` meskipun arsip telah mencapai V16.0.3. Nilai tersebut diselaraskan menjadi `v16.0.4`.

### Perubahan V16.0.4

- Akun demo disusun berdasarkan kelompok unit pada layar login: Pendaftaran Rawat Jalan, Petugas Rawat Jalan, Dokter/Perawat Rawat Jalan, Kasir/Farmasi Rawat Jalan; kelompok IGD dipisah menjadi Dokter, Triase/Petugas, serta Kasir/Farmasi; Rawat Inap dipisah menjadi Admisi, Dokter, Perawat per Ruang, serta Kasir/Farmasi.
- Dibuat akun demo perawat untuk setiap ruang Rawat Inap yang ada di master ruang. Nama pengguna mengikuti pola `perawat.<nama-ruang>` dan kata sandi demo `perawat123`. Setiap akun memiliki `wardId` spesifik dan tidak otomatis mendapat akses ke ruang lain.
- Akun perawat Rawat Inap generik lama (`perawat.ranap` dan akun shift generik) tidak lagi ditampilkan sebagai akun login demo; data pasien, admisi, penugasan ruang, dan riwayat tidak dihapus oleh perubahan ini.
- Akses Rekam Medis ditingkatkan agar episode Rawat Inap aktif menjadi dasar akses pasien: dokter Rawat Inap dapat mencari pasien yang sedang dirawat lintas ruang, sedangkan perawat hanya dapat mencari pasien aktif di ruang penugasannya. Riwayat kunjungan terdahulu pasien aktif dapat dibaca untuk kesinambungan perawatan.
- Ditambahkan penanda komentar pencarian kode, misalnya `MODUL: CORE`, `MODUL: RAWAT INAP`, `MODUL: LOGIN`, `FUNGSI: MASTER RUANG RAWAT INAP`, dan `PENCARIAN KODE`, tanpa memecah berkas utama secara berisiko.
- Versi Service Worker dan query aset diselaraskan ke V16.0.4.

### Pencarian kode cepat

Gunakan pencarian global di editor kode dengan kata kunci berikut:

| Area | Kata kunci pencarian |
|---|---|
| Inti aplikasi dan penyimpanan | `MODUL: CORE`, `FUNGSI: STORE`, `migrateData` |
| Akun dan kelompok demo | `MODUL: AKUN`, `FUNGSI: AKUN DEMO`, `chipsForDemo` |
| Master gedung/ruang/bed | `FUNGSI: MASTER RUANG RAWAT INAP`, `ensureInpatientStructure` |
| Admisi Rawat Inap | `FUNGSI: ADMISI`, `submitAdmisiBaru` |
| Beranda Rawat Inap | `renderInpatientBeranda` |
| Monitor per ruang | `renderInpatientNurseMonitor` |
| Rekam Medis dan akses pasien | `MODUL: REKAM MEDIS`, `accessiblePatients`, `hasAccessibleActiveAdmission` |
| Laboratorium dan Radiologi | `renderLab`, `renderRadiologi`, `careRequests` |
| Farmasi | `renderFarmasi`, `prescriptions` |
| Kasir | `renderKasir`, `billing` |

### Batas pengujian V16.0.4

- Pemeriksaan sintaks JavaScript dilakukan dengan `node --check` untuk `app.js` dan `sw.js`.
- `manifest.json` diperiksa sebagai JSON valid.
- Arsip dan struktur berkas akan diperiksa sebelum rilis.
- Pengujian browser interaktif penuh belum dapat dinyatakan lulus karena proses Chromium headless tidak menyelesaikan pemuatan halaman dalam batas waktu pengujian. Karena itu, jangan menganggap semua workflow lintas akun telah lulus end-to-end; skenario manual tetap perlu dijalankan pada browser.

**Status proyek:** prototype portfolio, bukan SIMRS produksi. Data demo disimpan lokal per browser/perangkat. Sinkronisasi lintas perangkat, keamanan produksi, autentikasi server, dan audit terpusat memerlukan backend dan database bersama.

---

## Perubahan V16.0.2 — Perbaikan penyimpanan IGD dan integrasi penunjang

- Mengembalikan pendaftaran/penerimaan IGD di workspace Perawat Triase, tanpa membuat menu pendaftaran IGD terpisah.
- Setelah triase berhasil disimpan, formulir tidak tetap menampilkan nilai pasien sebelumnya; data tersimpan dalam episode dan tersedia sebagai ringkasan triase serta evaluasi ulang.
- Setelah asesmen dokter tersimpan, tampilan beralih ke ringkasan asesmen sehingga kolom input tidak tertinggal sebagai formulir pasien sebelumnya. Asesmen dapat dibuka kembali untuk koreksi/tindak lanjut.
- Menyinkronkan status penerimaan permintaan IGD ke Laboratorium/Radiologi dengan catatan permintaan pada episode pasien. Hasil dikembalikan ke episode asal dan menghasilkan notifikasi pasien.
- Menambahkan Beranda operasional serta Monitor antrean untuk Laboratorium dan Radiologi, dengan antrean gabungan Rawat Jalan, IGD, dan Rawat Inap.
- Memastikan status permintaan penunjang disinkronkan saat diterima unit, dan status episode tidak dinyatakan siap ditinjau dokter sebelum semua pemeriksaan yang diminta selesai. Dokter IGD mendapat aksi eksplisit untuk mengonfirmasi peninjauan hasil.
- Memperbarui cache PWA ke V16.0.2 agar browser meminta aset terbaru.


## Perubahan V16.0.1 — Penyempurnaan Workflow IGD
- Baseline langsung: V16.0.0 (versi terakhir yang dibuat); alur Rawat Jalan dan fitur versi sebelumnya dipertahankan.
- Mengembalikan dan memperjelas Perjalanan Saya untuk episode IGD aktif, termasuk triase, tindakan, penunjang, farmasi, observasi, dan proses pindah/pulang sesuai status tersimpan.
- Menambahkan navbar Beranda IGD untuk akun klinis IGD serta farmasi/kasir yang ditugaskan ke IGD, berisi ringkasan pasien aktif, pasien baru, pelayanan, observasi, rencana admisi, perpindahan terkonfirmasi, kepulangan, dan keterisian bed.
- Menambahkan Monitor IGD berisi Zona Hijau, Zona Kuning, dan Zona Merah, masing-masing 20 bed (total 60). Status bed: kosong, terisi, persiapan/dibersihkan, dan perbaikan.
- Penempatan pasien ke bed dan konfirmasi pasien keluar dibatasi berdasarkan peran. Keputusan pulang belum mengakhiri episode sebelum pasien benar-benar keluar; perpindahan ke Rawat Inap mengakhiri episode IGD setelah admisi dikonfirmasi, sementara riwayat IGD tetap disimpan.
- Menu Riwayat terpisah di akun Dokter IGD dihilangkan untuk menghindari duplikasi dengan Rekam Medis; jejak audit tetap dipertahankan.
- Tema Glass UI, alur Rawat Jalan, serta aset dan fungsi lain yang tidak terkait perubahan ini dipertahankan.

> Batas pengujian V16.0.1: pemeriksaan sintaks, struktur berkas, konfigurasi PWA, dan pemeriksaan statis dilakukan. Pengujian browser interaktif end-to-end tidak berhasil dijalankan karena lingkungan browser memblokir navigasi; karena itu, pengujian tersebut tidak diklaim lulus.

# SIMRS PROTOTYPE — Portfolio / Demo

**Versi historis bagian ini:** V15.8.7  
**Baseline historis:** V15.8.5  
**Platform:** PWA / Web  
**Status:** Prototype portfolio, bukan SIMRS produksi

SIMRS PROTOTYPE adalah proyek portfolio untuk memperlihatkan kemampuan analisis kebutuhan, perancangan alur pelayanan rumah sakit, UI/UX, RBAC (hak akses berbasis peran), PWA, penyimpanan lokal, simulasi antrean, serta integrasi antar-modul pelayanan.

> **Penting:** aplikasi ini adalah prototype/demo. Bukan sistem resmi RSUD R.T. Notopuro, bukan pengganti SIMRS rumah sakit, dan bukan SOP resmi. Data demo bersifat fiktif. Implementasi produksi membutuhkan backend, database terpusat, autentikasi dan otorisasi server, audit terpusat, enkripsi, backup, monitoring, serta integrasi resmi.

## Perubahan V15.8.7 — Navbar dan Beranda Dokter

- Baseline langsung: V15.8.6.
- Navbar dokter memiliki lima menu: **Beranda, Poli, Monitor, Rekam Medis, Riwayat**. Menu Monitor tetap ditujukan untuk layar antrean di depan poli dan dibatasi pada poli yang ditugaskan ke akun dokter.
- Beranda dokter merangkum status kunjungan poli hari ini, Patient Journey, booking kontrol mendatang, serta informasi praktik terkini.
- Halaman Poli tetap menggabungkan dashboard sesi dokter, kontrol antrean, dan ruang pemeriksaan dalam satu halaman.
- Antrean dokter difokuskan pada pasien yang sudah selesai screening, dipanggil, sedang diperiksa, atau membutuhkan review. Tindakan screening awal hanya tersedia pada alur perawat.
- Tombol pasien yang sedang diperiksa menyediakan jalur untuk melanjutkan ruang pemeriksaan setelah kunjungan dipulihkan, tanpa membuat kunjungan tersebut selesai otomatis.
- Cache PWA dan versi aset dinaikkan ke V15.8.7.

> Batas pengujian V15.8.7: syntax JavaScript, JSON manifest, pemeriksaan statis, dan integritas ZIP diperiksa. Browser end-to-end interaktif penuh belum dapat diklaim lulus di lingkungan ini.

## 1. Baseline pengembangan

Baseline untuk versi ini adalah **V15.6.0 SIMRS Booking & Antrean Terpadu**, dengan lineage sebelumnya dari V15.5.0 Patient Journey Integration dan V15.4.0 Integrasi Antarunit. V15.7.0 menambahkan monitor terikat penugasan, master ruang/shift, dan standar navigasi petugas; V15.8.0 memulihkan menu Pelayanan superuser dan memperbaiki layout topbar responsif; V15.8.2 menyegarkan ikon, warna browser, dan border Glass 3D. V15.8.4 menindaklanjuti alur pemeriksaan bertab, autosave tanpa pop-up, serta penyimpanan draft resep terikat kunjungan. Pengujian interaktif tetap wajib sebelum dianggap final.

### Perubahan V15.8.6 — Penyederhanaan Ruang Kerja Dokter

- Baseline langsung V15.8.4 untuk rilis V15.8.5; gaya Glass 3D dan struktur modul utama dipertahankan.
- Kontrol antrean disederhanakan mengikuti status: **Panggil Berikutnya → Mulai Pemeriksaan → Selesaikan Pemeriksaan**. Tombol penyelesaian dari panel antrean mengarahkan ke konfirmasi pada formulir klinis yang sama; antrean berikutnya tidak dilepas diam-diam.
- Ketika halaman Rawat Jalan dibuka ulang setelah refresh, kunjungan yang masih `diperiksa` dan milik dokter aktif dipulihkan ke ruang pemeriksaan berdasarkan ID kunjungan. Draft tetap draft, bukan status selesai.
- Autosave draft mencakup tab aktif, data klinis, screening, pilihan rujukan, dan daftar resep. Perubahan tambah/hapus obat ikut disimpan. Status penyimpanan gagal ditampilkan secara eksplisit.
- Pada V15.8.5, lima tab pemeriksaan memakai lebar area kerja. V15.8.6 menyederhanakannya menjadi empat tab dokter dan memindahkan screening menjadi ringkasan baca-saja di panel kiri.
- Dokter/admin dapat mengoreksi catatan klinis kunjungan yang sudah selesai melalui tindakan khusus; nilai sebelumnya, nilai koreksi, akun, waktu, dan jenis koreksi disimpan dalam riwayat revisi. Resep yang sudah diproses farmasi tidak dapat diubah dari formulir koreksi klinis.
- Patient Journey hanya menampilkan tahap farmasi/pengambilan obat bila kunjungan memiliki resep berisi item. Resep yang sudah masuk antrean farmasi saat dokter masih memeriksa tidak membuat tahap Dokter tampak selesai atau tahap Farmasi tampak aktif bagi pasien sebelum finalisasi.
- Penyelesaian kasir hanya mengarahkan pasien ke pengambilan obat bila resep terkait masih aktif dan berisi item; resep kosong/dibatalkan tidak membuat tahap farmasi palsu.
- Cache PWA dan versi aset dinaikkan ke V15.8.5 agar browser mengambil file terbaru.

- Baseline langsung dari V15.8.5; integrasi antrean, draft, resep/farmasi, dan patient journey dipertahankan.
- Formulir screening hanya dapat dibuka oleh akun perawat (admin berwenang tetap dapat membantu); dokter melihat ringkasan screening baca-saja.
- Akun dokter memiliki empat tab: Pemeriksaan, Diagnosis, Resep, dan Riwayat. Data screening/vital tidak lagi diisi ulang di formulir dokter.
- Tata letak ruang kerja dokter memakai panel ringkasan di kiri (profil, screening, alergi, penjamin/metode pembayaran bila tercatat) dan formulir dokter di kanan; pada layar sempit berubah menjadi satu kolom.
- Penyimpanan draft dan finalisasi tidak mengosongkan keluhan atau tanda vital yang telah diinput oleh perawat ketika field tersebut tidak tersedia di halaman dokter.
- Versi aset dan cache PWA dinaikkan ke V15.8.6.

> Catatan pengujian V15.8.6: syntax dan integritas arsip diperiksa. Pengujian browser interaktif penuh belum tersedia di lingkungan ini; alur klik, pemulihan refresh, hak akses, serta regresi farmasi/patient journey masih harus diuji manual sebelum build dianggap tervalidasi penuh.

> Batas pengujian rilis: pemeriksaan sintaks JavaScript dan pemeriksaan integritas ZIP dijalankan. Browser headless di lingkungan kerja diblokir oleh kebijakan lingkungan, sehingga skenario interaktif penuh (termasuk refresh di tengah pemeriksaan, seluruh role, dan alur end-to-end) belum dapat diklaim lulus. Jalankan Audit Sistem dan skenario manual sebelum menggunakan build ini untuk demo.

Aturan pengembangan proyek:

1. Versi terbaru yang sudah dikirim dan disepakati menjadi baseline berikutnya.
2. Perubahan baru selalu dibuat dari baseline terakhir, bukan dari versi lama.
3. Fitur yang sudah benar harus dipertahankan.
4. Setiap perubahan harus melalui pemeriksaan syntax, UI, navigasi, role/RBAC, alur utama, dan regresi fitur sebelum ZIP diberikan.
5. README hanya diperbarui setelah fungsi aplikasi cukup stabil untuk didokumentasikan.

## Riwayat V15.6.0 — Aturan Booking & Antrean Bersama

- Booking Rawat Jalan Reguler online dibatasi pada H-1, H-2, dan H-3. Untuk tanggal kunjungan H+3, pemesanan mulai dibuka pukul 00.01 WIB pada hari H-3. Booking hari H untuk pasien reguler ditolak oleh validasi dan diarahkan untuk datang ke loket RS.
- Booking Rawat Jalan Eksekutif mengikuti pembukaan H-3 pukul 00.01 WIB, bisa memilih dokter, dan dapat dipesan pada hari H sampai pukul 12.00 WIB. Booking hanya dapat berhasil jika jadwal dokter dan slot/kuota masih tersedia; slot eksekutif yang jamnya sudah lewat tidak ditawarkan untuk booking hari H.
- Pasien Reguler tidak dapat memilih dokter. Sistem mengalokasikan dokter/sesi secara otomatis mengikuti jadwal dan kapasitas yang tersedia.
- Nomor antrean baru dihitung dari counter bersama per poli + tanggal, dengan pemindaian nomor booking dan kunjungan yang sudah tersimpan agar kanal simulasi Aplikasi RS, Mobile JKN, dan loket tidak membuat urutan lokal yang saling tumpang tindih.
- Akun demo staf ditambah dengan Petugas Triase IGD (`triase.igd`, sandi demo `triase123`). IGD tetap dimulai oleh petugas atau rujukan internal, bukan pendaftaran mandiri dari akun pasien.
- Warna hanya pada ujung gradasi ungu paling kanan yang dicerahkan menjadi ungu-magenta glossy (`#D946EF`). Stop biru kiri dan biru/indigo tengah serta layout lain dipertahankan.
- Audit internal ditambah untuk aturan booking, nomor antrean lintas kanal simulasi, dan pembatasan pendaftaran IGD.

> **Batas integrasi antrean:** nomor antrean bersama ini berlaku untuk data yang ada di database simulasi lokal. Kesamaan nomor dengan Mobile JKN nyata tidak bisa dijamin sampai tersedia backend dan koneksi/API resmi rumah sakit yang menyinkronkan booking lintas kanal. LocalStorage di browser tidak cukup untuk sinkronisasi perangkat berbeda.

## Perubahan V15.5.0 — Pengalaman Pasien & Akun Demo Bersih

- Navbar pasien tepat lima menu: Beranda, Rawat Jalan, Informasi, Booking Saya, dan Riwayat. Rawat Inap dan Monitor tidak lagi menjadi menu tersendiri di navbar pasien; fungsi rawat inap tetap ditampilkan pada Perjalanan Saya.
- Beranda memuat Profil Pasien dan satu komponen Perjalanan Saya untuk episode aktif. Prioritas perjalanan: Rawat Inap yang masih dirawat, lalu IGD aktif, lalu Rawat Jalan aktif. Tanpa episode aktif, tidak dibuat perjalanan palsu.
- Perjalanan Rawat Jalan memuat nomor antrean, poli, dokter jika sudah dialokasikan, jam kunjungan, estimasi waktu, dan alur tahapan. Estimasi ditandai sebagai perkiraan.
- Riwayat dipisahkan menjadi Rawat Jalan, Rawat Inap, dan IGD.
- Informasi pasien satu arah; Chat Pelayanan dua arah dengan inbox staf. Admin dapat menerbitkan pengumuman umum. Perubahan booking atau penugasan dokter tetap harus disimpan oleh petugas berwenang pada alur operasional, tidak otomatis berubah hanya karena percakapan chat.
- Lima akun demo Rawat Jalan dan lima akun demo Rawat Inap lama diganti menjadi sepuluh akun pasien fiktif bernomor 1–10. Setiap akun baru mulai tanpa booking, kunjungan, admisi, resep, atau riwayat. Satu akun terhubung ke identitas pasien yang sama pada episode layanan berikutnya.
- Cache PWA dan query aset dinaikkan mengikuti versi rilis masing-masing.

> Batas prototype: data disimpan di localStorage per browser/perangkat. Chat, pengumuman, dan pembaruan data belum tersinkron ke perangkat lain tanpa backend bersama.

## Perbaikan V15.4.0 — Integrasi Resep → Farmasi → Perjalanan Saya

- Relasi resep dan kunjungan diperiksa dua arah (`visit.resepId` dan `resep.visitId`) agar data lama yang salah satu tautannya kosong dapat dipulihkan.
- Antrean Farmasi Rawat Jalan dibaca dari resep berstatus `menunggu` yang terhubung ke kunjungan, bukan hanya dari status kunjungan hari ini. Resep yang masih menunggu tidak hilang hanya karena tanggal kunjungan bukan hari ini.
- Jika resep masih `menunggu` tetapi kunjungan salah tercatat sebagai `menunggu_bayar`, status dikembalikan ke `menunggu_farmasi` agar pasien tidak melewati proses farmasi.
- Perjalanan Saya mencari resep lewat relasi kunjungan maupun ID resep; tahap Farmasi dan Pengambilan Obat ditampilkan sesuai statusnya.
- Setelah farmasi menyiapkan obat, resep tetap terhubung ke kunjungan dan alur berlanjut ke kasir; setelah pembayaran, pasien muncul di daftar Obat Siap Diambil. Saat obat diserahkan, status resep menjadi `diambil`.
- UI dan style.css tidak dirombak.

> Catatan teknis: data prototype masih disimpan di `localStorage` browser/perangkat. Sinkronisasi antarperangkat atau antar-browser memerlukan backend/database bersama dan tidak bisa dijamin hanya dengan GitHub Pages statis.

## 2. Perubahan V14.6.2 — Patient Journey & Mobile Responsive Fix

Perubahan dibuat langsung dari baseline **V14.6.1**:

- Alur resep Rawat Jalan sekarang tetap menampilkan tahap **Pengambilan Obat — Ambil obat di farmasi** ketika kunjungan sudah berstatus `obat_siap`.
- Patient Journey memiliki fallback berdasarkan status `menunggu_farmasi` / `obat_siap` sehingga data lama yang belum memiliki `resepId` tidak kehilangan tahap pengambilan obat.
- Form Screening Perawat diperketat agar modal, field, dan konten tidak melewati viewport pada layar kecil.
- Form Pemeriksaan/Diagnosis Dokter diperketat agar area tombol dan input tidak menyebabkan horizontal overflow.
- Pengujian responsif dilakukan pada viewport **360×800, 390×844, dan 412×915**.
- Pengujian alur resep dilakukan untuk memastikan status bergerak dari **Farmasi → Kasir → Pengambilan Obat** dan tahap pengambilan obat tampil pada Patient Journey.
- Service Worker/cache dinaikkan ke **V14.6.2** agar browser mengambil aset aplikasi terbaru.

## 3. Perubahan V14.6.0 — UI Navbar Admin & Menu Sekunder

### Navbar Admin Super User

Navbar utama Admin sekarang terdiri dari **tepat lima menu** dan tidak lagi memiliki tombol `Lainnya` di bottom navbar:

**Dashboard | Rawat Jalan | Pendaftaran | Rawat Inap | Beranda**

Posisi dirancang dengan prinsip:

- Dashboard di sisi kiri.
- Beranda di sisi kanan.
- Pendaftaran berada di bagian tengah.
- Rawat Jalan dan Rawat Inap menjadi dua menu pelayanan utama di antara keduanya.

### Menu sekunder Admin

Menu yang sebelumnya berada di `Lainnya` tidak dihapus. Aksesnya dipindahkan ke **tombol `☰ Menu` di kiri atas topbar Admin**.

Tombol tersebut membuka folder glass berisi modul sekunder, antara lain:

- Booking
- IGD
- Laboratorium
- Radiologi
- Farmasi Rawat Jalan
- Farmasi Rawat Inap
- Farmasi IGD
- Kasir Rawat Jalan
- Kasir Rawat Inap
- Kasir IGD
- Rekam Medis
- Riwayat Aktivitas Sistem
- Master Data
- Audit Sistem
- Cek Antrian
- Monitor

`Pendaftaran` sengaja tidak lagi berada di folder tersebut karena sudah menjadi menu utama Admin.

### Prinsip UI

Menu utama digunakan untuk fungsi yang paling sering dipakai, sedangkan modul sekunder tetap tersedia melalui tombol Menu. Dengan demikian navbar tidak penuh, tetapi fungsi Admin tetap lengkap.

## 4. Modul yang tersedia

### Rawat Jalan

- Pendaftaran pasien
- Booking / antrean
- Klinik reguler dan eksekutif
- Alokasi dokter otomatis untuk klinik reguler
- Pemilihan dokter hanya untuk klinik eksekutif
- QR/barcode tiket antrean
- Check-in pasien
- Monitor antrean
- Rekam medis
- Riwayat pemeriksaan dokter

### Rawat Inap

- Admisi
- Sumber admisi: IGD, Rawat Jalan, Rujukan, Transfer Internal
- Kelas perawatan
- Bed management
- Status bed
- Transfer pasien
- CPPT
- Tanda vital dan simulasi NEWS2
- DPJP dan dokter jaga
- Perawat berdasarkan shift
- Handover shift
- Laboratorium dan Radiologi berdasarkan order
- Farmasi dan simulasi eMAR
- Rencana pulang
- Resume medis
- Billing dan pelepasan bed
- Patient Journey Rawat Inap

### Penunjang

- Laboratorium
- Radiologi
- Pengiriman hasil pemeriksaan
- Integrasi hasil dengan perjalanan pasien

### Administrasi

- Pendaftaran
- Booking
- Kasir Rawat Jalan
- Kasir Rawat Inap
- Kasir IGD
- Master Data
- Audit Sistem
- Monitor antrean

## 5. Navigasi berdasarkan role

### Admin Super User

**Dashboard | Rawat Jalan | Pendaftaran | Rawat Inap | Beranda**

Modul sekunder dibuka melalui **☰ Menu** di kiri atas.

### Petugas Rawat Jalan

**Pendaftaran | Booking | Poli | Monitor**

### Dokter Rawat Jalan

**Poli | Rekam Medis | Riwayat | Monitor**

### Dokter IGD

**IGD | Rekam Medis | Riwayat | Monitor**

### Dokter Rawat Inap

**Rawat Inap | Rekam Medis | Riwayat | Monitor**

### Perawat Rawat Jalan

**Beranda | Poli | Rekam Medis | Monitor**

### Perawat IGD

**IGD | Rekam Medis | Monitor**

### Perawat Rawat Inap

**Rawat Inap | Rekam Medis | Monitor**

### Laboratorium

**Beranda | Laboratorium**

### Radiologi

**Beranda | Radiologi**

### Farmasi / Kasir

Menu utama menyesuaikan unit kerja akun, sehingga modul yang tidak relevan tidak dipaksakan masuk ke `Lainnya`.

### Pasien

**Beranda | Rawat Jalan | Informasi | Booking Saya | Riwayat**

## 6. Akun demo per unit

Seluruh akun berikut hanya untuk pengujian prototype. Login cepat tersedia pada halaman masuk; password demo bukan kredensial produksi.

### Administrasi dan Rawat Jalan

| Unit / peran | Username | Password |
|---|---|---|
| Admin Super User | `admin` | `admin123` |
| Petugas Loket | `loket` | `loket123` |
| Petugas Rawat Jalan | `rawatjalan` | `rawatjalan123` |
| Dokter Poli Umum | `dokter.umum` | `dokter123` |
| Dokter Poli Anak | `dokter.anak` | `dokter123` |
| Dokter Poli Gigi | `dokter.gigi` | `dokter123` |
| Dokter Poli Jantung | `dokter.jantung` | `dokter123` |
| Dokter Poli Penyakit Dalam | `dokter.penyakitdalam` | `dokter123` |
| Perawat/Asisten Poli Umum | `asisten.umum` | `perawat123` |
| Perawat/Asisten Poli Anak | `asisten.anak` | `perawat123` |
| Perawat/Asisten Poli Gigi | `asisten.gigi` | `perawat123` |
| Perawat/Asisten Poli Jantung | `asisten.jantung` | `perawat123` |
| Perawat/Asisten Poli Penyakit Dalam | `asisten.penyakitdalam` | `perawat123` |

### IGD

| Unit / peran | Username | Password |
|---|---|---|
| Petugas Triase IGD | `triase.igd` | `triase123` |
| Dokter IGD | `dokter.igd` | `dokter123` |
| Perawat IGD | `perawat.igd` | `perawat123` |
| Farmasi IGD | `farmasi.igd` | `farmasi123` |
| Kasir IGD | `kasir.igd` | `kasir123` |

IGD tidak menyediakan pendaftaran mandiri dari akun pasien. Episode IGD dimulai melalui petugas/triase atau penerimaan rujukan internal sesuai alur prototype.

### Rawat Inap

| Unit / peran | Username | Password |
|---|---|---|
| Admisi Rawat Inap | `admisi.ranap` | `admisi123` |
| Dokter Rawat Inap / DPJP | `dokter.ranap` | `dokter123` |
| Dokter Jaga Shift Pagi | `dokter.jaga.pagi` | `dokter123` |
| Dokter Jaga Shift Sore | `dokter.jaga.sore` | `dokter123` |
| Dokter Jaga Shift Malam | `dokter.jaga.malam` | `dokter123` |
| Perawat Rawat Inap | `perawat.<nama-ruang>` | `perawat123` |

Akun perawat Rawat Inap dibuat otomatis berdasarkan nama ruang di master data. Pilih akun ruang yang sesuai dari kelompok **RAWAT INAP — PERAWAT PER RUANG** pada layar login.
| Farmasi Rawat Inap | `farmasi.ranap` | `farmasi123` |
| Kasir Rawat Inap | `kasir.ranap` | `kasir123` |

### Penunjang dan layanan unit

| Unit / peran | Username | Password |
|---|---|---|
| Laboratorium | `lab` | `lab123` |
| Radiologi | `radiologi` | `rad123` |
| Farmasi Rawat Jalan | `farmasi.rajal` | `farmasi123` |
| Kasir Rawat Jalan | `kasir.rajal` | `kasir123` |

### Pasien demo

| Akun | Username | Password |
|---|---|---|
| Pasien 1–10 | `pasien.demo1` s.d. `pasien.demo10` | `pasien123` |

Sepuluh akun pasien menggunakan data fiktif dan mulai tanpa booking, nomor antrean, kunjungan, admisi, resep, atau riwayat. Akun yang sama dapat digunakan untuk mencoba alur Rawat Jalan dan kemudian episode layanan lain. Nomor 1–10 hanya label akun demo, bukan nomor antrean.

## 7. Teknologi

- HTML5
- CSS3
- JavaScript ES6+
- Progressive Web App (PWA)
- Service Worker
- localStorage
- BroadcastChannel
- QR generator lokal
- Browser Barcode Detection API sebagai opsi kamera

Prototype sengaja dibuat tanpa framework frontend besar agar source mudah dibaca, dipelajari, dan dipresentasikan sebagai portfolio.

## 8. Arsitektur prototype

```text
PWA / Browser
      │
      ├── UI / Role-based Navigation
      ├── Business Logic
      ├── Queue & Booking Simulation
      ├── Patient Journey
      └── localStorage
```

Untuk implementasi produksi, arsitektur yang disarankan:

```text
Web / PWA / Mobile
        ↓
API Gateway / Backend
        ↓
Authentication + Authorization
        ↓
Business Logic
        ↓
Database Terpusat
        ↓
Audit Log + Backup + Monitoring
```

## 8. Penyimpanan dan keamanan prototype

Prototype masih menggunakan `localStorage`, sehingga data hanya berada di browser/perangkat yang digunakan. Tidak ada sinkronisasi database pusat.

Jangan memasukkan:

- data pasien nyata
- NIK nyata
- password produksi
- API key
- private key
- kredensial rumah sakit

ke repository publik.

Untuk produksi diperlukan autentikasi server-side, RBAC server-side, session management, enkripsi, audit trail terpusat, backup, pemulihan bencana, logging, monitoring, serta kontrol akses database.

## 9. Batasan klinis

NEWS2 pada prototype hanya digunakan untuk simulasi monitoring dan **bukan alat diagnosis atau keputusan klinis**.

CPPT, resep, farmasi, laboratorium, radiologi, billing, BPJS, tarif, formularium, bed, DPJP, discharge, dan seluruh aturan pelayanan masih merupakan simulasi yang harus dikonfigurasi serta divalidasi terhadap kebijakan resmi ketika masuk tahap produksi.

## 10. Cara menjalankan

Dengan server lokal:

```bash
python3 -m http.server 8080
```

atau:

```bash
npx serve .
```

Kemudian buka alamat localhost yang diberikan server.

Untuk fitur PWA dan akses kamera, gunakan HTTPS atau localhost.

## 11. Tujuan portfolio

Proyek ini dibuat untuk menunjukkan kemampuan dalam:

- analisis kebutuhan sistem
- analisis alur bisnis rumah sakit
- desain UI/UX
- RBAC dan pemisahan role
- sistem antrean
- booking dan check-in QR/barcode
- Rawat Jalan
- Rawat Inap
- Patient Journey
- integrasi Farmasi, Laboratorium, Radiologi, dan Kasir
- PWA
- penyimpanan lokal
- dokumentasi teknis
- pengujian dan self-test
- perancangan sistem yang dapat dikembangkan menuju arsitektur backend terpusat

## 12. Status versi

| Versi | Fokus |
|---|---|
| V14.5.2 | Rawat Jalan, UI Penunjang, alokasi dokter klinik reguler |
| V14.6.1 | Penyempurnaan UI tombol hasil Lab/Radiologi dan posisi tombol Menu Admin |
| **V14.6.0** | **UI Navbar Admin dan pemindahan Menu Lainnya ke tombol kiri atas** |

**Baseline aktif untuk pengembangan berikutnya: V14.6.1**

---

**SIMRS PROTOTYPE — Portfolio / Demo**  
Dibuat sebagai proyek portfolio Sistem Informasi untuk menunjukkan kemampuan analisis, desain, implementasi frontend, business logic, RBAC, PWA, dan pengujian alur aplikasi.

## V15.4.0 — Integrasi alur antarunit (prototype)

- Memperkuat tautan resep ↔ kunjungan/admisi dan memisahkan antrean farmasi Rawat Jalan, Rawat Inap, dan IGD.
- Menambahkan permintaan/rujukan antarunit dengan status konfirmasi, termasuk rujukan Rawat Jalan ke IGD dan permintaan admisi dari IGD.
- Menambahkan order Radiologi Rawat Jalan/IGD; order Rawat Inap tetap terikat ke admisi. Hasil dikembalikan ke episode sumber dan diberi notifikasi in-app.
- Menambahkan alur asesmen/instruksi dasar IGD serta pendaftaran/penerimaan IGD pada prototype.
- Mempertahankan UI utama V15.3.0; pembaruan cache PWA dinaikkan ke v15.4.0.

**Batasan penting:** ini adalah prototype portofolio berbasis penyimpanan lokal per browser/perangkat, bukan SIMRS produksi dan belum sinkron antarperangkat. Status/antrean/notifikasi lintas perangkat membutuhkan backend bersama, kontrol akses server, audit trail yang kuat, validasi klinis, serta uji penerimaan pengguna rumah sakit. Tidak boleh dipakai untuk keputusan klinis nyata.

## Validasi V15.4.0 yang dilakukan pada paket ini

- Pemeriksaan sintaks JavaScript pada `app.js` dan `sw.js`.
- Simulasi logika antrean resep untuk memastikan Rawat Jalan, Rawat Inap, dan IGD terpisah.
- Simulasi perjalanan paralel Laboratorium + Radiologi + Farmasi agar satu permintaan tidak dianggap selesai hanya karena status unit lain berubah.
- Simulasi rujukan internal IGD: episode IGD dibuat setelah unit IGD menerima rujukan.
- Simulasi Farmasi IGD: resep → persiapan → pencatatan pemberian; stok tidak berkurang dua kali dan episode IGD tidak otomatis ditutup.
- Simulasi item obat duplikat untuk memastikan jumlah total yang disiapkan dibatasi stok gabungan dan inventori tidak menjadi negatif.
- Smoke test render markup untuk layar IGD (tanpa dan dengan kunjungan aktif), Laboratorium, dan Radiologi menggunakan DOM stub.

Pengujian ini merupakan validasi sintaks dan logika terisolasi, **bukan** pengujian penerimaan klinis, keamanan produksi, atau validasi UI penuh pada perangkat nyata. Sebelum dipakai sebagai demonstrasi langsung kepada rumah sakit, lakukan uji manual semua akun demo dan skenario lintas unit pada browser/perangkat sasaran.


## V15.7.0 — Monitor per unit, struktur ruang rawat inap, dan navbar petugas

- Monitor rawat jalan untuk dokter/perawat yang login mengunci poli berdasarkan penugasan akun; parameter URL tidak dapat mengganti poli akun.
- Monitor rawat inap mengikuti `wardId`/`wardIds` akun dan menampilkan semua kamar/bed dalam ruang yang ditugaskan, termasuk bed kosong dan status bed.
- Struktur awal: 3 gedung, masing-masing 4 lantai reguler dengan 3 ruang per lantai (36 ruang reguler; 10 kamar × 3 bed), ditambah Gedung A lantai 5 dan 6 sebagai dua ruang VVIP (20 kamar × 1 bed).
- Master Data memiliki tab Ruangan & Shift untuk mengedit nama gedung, lantai, ruangan, label kamar/bed, fasilitas, kepala ruang, ketua shift, nama perawat, dan jam shift. Setiap ruang mendapat roster awal berbeda; ruang demo Meranti menghubungkan ketua shift dengan akun perawat demo yang relevan.
- Chat dipindahkan ke tombol topbar kiri untuk semua akun; Chat tidak menjadi item navbar. Navbar maksimal enam item dan tidak menampilkan menu Lainnya.
- Akun IGD tidak menggunakan monitor antrean poli.
- Batasan tetap: penyimpanan localStorage adalah simulasi lokal dan tidak menyediakan sinkronisasi lintas perangkat atau autentikasi backend produksi.


### Validasi V15.7.0

- Audit logika internal mencakup 54 pemeriksaan pada source yang dibundel.
- Browser smoke test memeriksa navbar/chat pada akun Admin, dokter, triase IGD, laboratorium, radiologi, farmasi, kasir, loket, pasien; monitor poli; monitor ruang rawat inap; penyimpanan edit master ruang/shift; dan akses cepat Admin.
- Uji migrasi dari struktur V15.6.0 menjaga jumlah booking, kunjungan, admisi, resep, serta referensi bed admisi aktif.
- Seluruh hasil adalah pengujian prototype client-side; belum menggantikan UAT rumah sakit, pengujian backend, dan integrasi sistem eksternal.


## V15.8.0 — Pelayanan superuser dan topbar responsif

- Mengembalikan tombol hamburger **Pelayanan** di kiri atas akun superuser. Tombol membuka 16 ikon akses cepat dalam grid 4×4; Chat tetap terpisah.
- Menghapus label identitas versi yang sebelumnya dapat bertumpuk dengan judul halaman pada topbar.
- Mengatur ulang topbar sebagai grid responsif supaya Chat tidak menutupi judul pada akun petugas maupun pasien. Pada layar sempit, tombol Chat dan Pelayanan menjadi ikon ringkas.
- Menambah self-test untuk jumlah ikon menu Pelayanan dan pemisahan tombol Chat/judul halaman.
- Data tetap disimpan di localStorage per browser/perangkat; perubahan master data tersimpan lokal dan tidak otomatis pindah antar browser; fitur ekspor/impor yang ada saat ini hanya untuk master dokter, jadwal, dan poli.

## V15.8.0 — Pelayanan superuser dan topbar responsif

- Mengembalikan tombol hamburger **Pelayanan** di kiri atas akun superuser. Tombol membuka 16 ikon akses cepat dalam grid 4×4; Chat tetap terpisah.
- Menghapus label identitas versi pada topbar yang dapat bertumpuk dengan judul halaman.
- Mengatur ulang topbar sebagai grid responsif supaya Chat tidak menutupi judul pada akun petugas maupun pasien. Pada layar sempit, tombol Chat dan Pelayanan menjadi ikon ringkas.
- Menambah pemeriksaan statis untuk jumlah ikon menu Pelayanan dan pemisahan tombol Chat/judul halaman.
- Data tetap disimpan di `localStorage` per browser/perangkat; fitur ekspor/impor yang tersedia saat ini hanya mencakup master dokter, jadwal, dan poli; data ruangan/shift belum tersinkron otomatis lintas browser.
- Validasi browser penuh belum dapat dilakukan di lingkungan build; lihat `TEST_REPORT_V15.8.0.md` untuk batas pengujian.


## V15.8.4 — Perbaikan keterhubungan kunjungan, pemeriksaan, dan farmasi (working copy)

- Form screening memuat kembali nilai sebelumnya agar dapat dikoreksi. Koreksi screening sebelumnya disimpan pada `screeningRevisions`.
- Draft pemeriksaan tidak lagi mewajibkan diagnosis; draft tidak menandai antrean siap maju. Perubahan klinis dicatat pada `examRevisions`.
- Form pemeriksaan memiliki autosave draft dengan indikator status, selain tombol simpan manual.
- Finalisasi ditolak jika diagnosis kosong atau kunjungan tidak lagi berstatus `diperiksa`.
- Pengiriman resep memakai resep yang sudah terhubung ke kunjungan jika masih berstatus menunggu, untuk mencegah duplikasi resep saat submit ulang. Resep yang sudah diproses farmasi tidak otomatis ditimpa.

## V15.8.2 — Penyegaran UI dan ikon

- Ikon aplikasi, favicon, ikon PWA, dan Apple Touch Icon diseragamkan: simbol medis putih di atas latar biru glossy dengan aksen violet/magenta.
- Warna browser/PWA diperbarui ke Brighter Blue (`#4A8BFF`).
- Menu Pelayanan mempertahankan bidang putih polos; efek Glass 3D diterapkan pada border biru-ke-ungu dan bayangan halus.
- Kartu menu dan sejumlah panel yang sebelumnya terlihat polos mendapat border Glass 3D yang ringan, tanpa mengubah teks maupun alur kerja.
- Versi file dan cache service worker dinaikkan ke V15.8.2.
- Identitas tetap SIMRS PROTOTYPE; bukan logo resmi rumah sakit.


## V15.8.2 — Penyempurnaan UI Glass 3D
- Menyempurnakan border dengan highlight kaca yang lebih cerah, kedalaman bayangan, dan aksen violet yang tetap halus.
- Bidang menu Pelayanan tetap putih polos; perubahan dibatasi pada border, highlight, dan bayangan.
- Menambahkan fokus keyboard yang terlihat pada tombol/kartu menu tanpa mengubah rute atau alur bisnis.
- Versi aset runtime dan cache PWA dinaikkan ke V15.8.2.
- Tidak ada perubahan skema data atau penggantian alur pelayanan pada rilis ini.


## V15.8.4 — Halaman pemeriksaan bertab dan draft resep
- Halaman pemeriksaan dokter disusun menjadi tab Screening, Pemeriksaan Dokter, Diagnosis, Resep, dan Riwayat.
- Nama pasien pada antrean dokter dapat membuka kunjungan terkait.
- Simpan draft menggunakan indikator inline dan tidak menampilkan pop-up berulang.
- Saat resep disimpan, resep masuk antrean Farmasi Rawat Jalan dengan ID kunjungan yang sama. Status tahap dokter pada Perjalanan Pasien tetap aktif sampai dokter melakukan finalisasi pemeriksaan.
- Resep pending dimuat kembali ketika halaman pemeriksaan dibuka ulang.
- Penyimpanan draft menangani kegagalan localStorage dengan indikator gagal simpan.
- Batasan: data masih tersimpan di localStorage perangkat; sinkronisasi antarperangkat memerlukan backend.


### Catatan pengujian V15.8.4

V15.8.4 masih working copy pengembangan dan belum dinyatakan rilis bebas bug. Penyimpanan lokal menggunakan localStorage pada perangkat/browser yang sama; belum ada sinkronisasi backend lintas perangkat. Alur klinis harus divalidasi dengan uji interaktif sebelum digunakan sebagai rilis portfolio.


## Perubahan V16.0.0 — Pemisahan Workflow IGD

- Baseline pengembangan: arsip V15.8.8; alur rawat jalan dan Glass UI dipertahankan.
- Ruang kerja dipisahkan untuk Perawat Triase IGD, Dokter IGD, dan Perawat Pelaksana IGD dengan role dan route masing-masing.
- Triase menyimpan prioritas, tanda vital, ringkasan, petugas, waktu, dan riwayat evaluasi ulang. Daftar triase diprioritaskan berdasarkan level kegawatan.
- Dokter IGD melihat pasien yang sudah ditriase, menyimpan diagnosis/asesmen, membuat instruksi, serta mencatat disposisi. Observasi tetap aktif; keputusan pulang/rujukan/rawat inap menggunakan status terpisah.
- Perawat pelaksana memiliki daftar instruksi, konfirmasi penerimaan, pencatatan pelaksanaan, dan catatan keperawatan terpisah.
- Hak akses diperiksa pada tampilan dan fungsi penyimpanan.
- ZIP rilis tidak menyertakan laporan pengujian, berkas audit sementara, atau berkas pengembangan.

Akun demo IGD: `triase.igd` / `triase123`; `dokter.igd` / `dokter123`; `perawat.igd` / `perawat123`.


## Batas pengujian V16.0.2

Pemeriksaan sintaks JavaScript, service worker, validitas JSON, struktur alur, hak akses menu, serta integritas arsip dilakukan. Browser headless tersedia tetapi tidak berhasil menyelesaikan pemuatan halaman dalam batas waktu lingkungan ini, sehingga interaksi end-to-end tidak diklaim lulus. Uji langsung melalui browser tetap diperlukan sebelum prototipe digunakan sebagai simulasi menyeluruh.


## V16.0.5 — Tahap 2: Pemisahan Awal Modul Rawat Inap

### Perubahan struktur
- Helper inti Rawat Inap dan fungsi monitor ruang dipindahkan ke `modules/rawat-inap/core.js`.
- `app.js` tetap menjadi pengatur workflow/UI yang belum dipindahkan pada tahap ini. Pemisahan berikutnya dilakukan setelah dependensi tiap fungsi ditinjau.
- `index.html` memuat `modules/rawat-inap/core.js` sebelum `app.js`, sehingga konstanta/helper tersedia saat workflow mulai dijalankan.
- Service worker memasukkan file modul ke app shell dan menggunakan versi cache `v16.0.5`.

### Kata kunci pencarian kode
- `MODUL: RAWAT INAP` — penanda kelompok Rawat Inap.
- `FUNGSI: BED` — status bed.
- `FUNGSI: SHIFT` — definisi dan penentuan shift.
- `FUNGSI: PATIENT JOURNEY` — tahapan perjalanan pasien Rawat Inap.
- `renderInpatientBeranda` — dashboard Rawat Inap (masih di `app.js`).
- `openAdmisiBaruSheet` / `submitAdmisiBaru` — form dan penyimpanan admisi (masih di `app.js`).
- `accessiblePatients` — pembatasan daftar pasien menurut peran (masih di `app.js`).
- `renderInpatientNurseMonitor` — monitor ruang Rawat Inap (di `modules/rawat-inap/core.js`).

### Batas perubahan
Tahap ini hanya memindahkan konstanta dan helper yang tidak mengakses DOM saat file dievaluasi. Alur penyimpanan admisi, daftar kerja, hak akses, dan rendering belum diubah agar risiko regresi tetap rendah. Pengujian browser end-to-end masih perlu dilakukan.


### Fungsi Rawat Inap yang sudah dipisahkan pada Tahap 2
- Konstanta status bed dan tahapan perjalanan pasien.
- Definisi shift serta helper penugasan dan lokasi.
- Ringkasan perjalanan admisi.
- `renderInpatientNurseMonitor` dan `monitorClockTimer`.

Fungsi admisi dan daftar kerja (termasuk `submitAdmisiBaru` dan `accessiblePatients`) sengaja tetap berada di `app.js` sampai pemeriksaan dependensi dan pengujian alur selesai; fungsi tersebut menjadi target pemisahan berikutnya dalam Tahap 2.


## V16.0.6 — Perbaikan Bug Rawat Inap

- Memperkuat Monitor Rawat Inap agar tetap menampilkan keterangan yang jelas ketika master ruang/bed belum lengkap atau data lokal memakai struktur lama.
- Membuat daftar episode Rawat Inap lebih tahan terhadap data admisi lama/parsial, termasuk `vitalLog` yang belum tersedia.
- Menambahkan interaksi buka episode yang dapat digunakan lewat sentuhan/klik maupun keyboard, beserta tombol **Buka episode** yang eksplisit.
- Memperbarui versi cache service worker dan parameter aset menjadi `v16.0.6` agar browser tidak terus memakai berkas V16.0.5 dari cache.
- Pengujian yang dilakukan: pemeriksaan sintaks JavaScript, validasi manifest, pemeriksaan struktur HTML/urutan pemuatan modul, dan validasi arsip ZIP. Pengujian interaktif penuh lintas akun belum dapat dinyatakan lulus hanya dari pemeriksaan statis.


## Tahap 7 — Peta fungsi dan verifikasi statis (V16.4.2)

- Setiap modul JavaScript kini memiliki indeks fungsi utama di bagian atas untuk membantu pencarian manual menggunakan Ctrl+F.
- `docs/TAHAP7_PETA_MODUL_DAN_DEPENDENSI.md` menjelaskan urutan skrip, kontrak integrasi antarunit, dan checklist pengujian.
- `tools/verify-stage7.sh` menjalankan pemeriksaan sintaks, urutan pemuatan, keberadaan aset, dan keselarasan versi.
- Logika workflow dan CSS tidak sengaja diubah dalam tahap dokumentasi/pemetaan ini.
- Pemeriksaan statis bukan pengganti uji browser end-to-end; alur lintas unit tetap harus diuji sebelum digunakan sebagai rilis yang dianggap stabil.


## Hotfix V16.4.2 — Login / asset cache consistency
- Menyamakan query-string cache busting pada `index.html` dengan versi Service Worker dan runtime.
- Mengubah fallback Service Worker agar file JS/CSS yang gagal dimuat tidak diganti dengan `index.html` (yang dapat memicu SyntaxError dan membuat UI kosong).
- Cache Service Worker dinaikkan ke `v16.4.2` agar browser meminta ulang aset versi terbaru.
- Tetap perlu menguji login dan workflow pada browser perangkat target; hotfix ini tidak mengklaim seluruh alur telah lulus pengujian interaktif.


## Perbaikan startup V16.4.2
- Startup kini menangani kegagalan akses localStorage dan kegagalan migrasi tanpa menghentikan render login.
- Data lokal yang gagal dibaca/migrasi tidak ditimpa otomatis; aplikasi menggunakan data demo sementara dan menampilkan peringatan.
- Simpan sesi/data ditangani dengan aman jika browser tidak mengizinkan localStorage.


## V16.4.3 — Pengelompokan akun demo per unit

- Halaman login mengelompokkan akun demo ke lima panel buka/tutup: Pelayanan Rawat Jalan, Pelayanan Rawat Inap, Pelayanan IGD, Pelayanan Penunjang, dan Akun Pasien.
- Akses administrator dipertahankan terpisah karena bukan unit pelayanan klinis.
- Setiap akun memiliki keterangan fungsi; pemilihan akun demo tetap memakai username/password yang ada di `Store.data.users`.
- Tidak ada perubahan pada seed kredensial, role, unit, poli, ward, shift, atau aturan otorisasi.
- Bagian rawat inap menampilkan tiga akun ruang demo, tiga akun perawat per shift, serta akun DPJP dan dokter jaga pagi/sore/malam yang telah tersedia.
- CSS tambahan hanya mengatur presentasi login; Glass UI dan alur pelayanan lainnya dipertahankan.
