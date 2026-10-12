# Audit Kesesuaian Alur Rumah Sakit — V16.5.1

Dokumen ini mencatat perbedaan yang masih perlu ditangani sebelum prototipe dianggap mendekati sistem operasional rumah sakit. Status `belum ada` berarti fitur belum boleh dianggap tersedia hanya karena ada tampilan atau data demo.

## Sudah diperbaiki pada V16.5.1

- Dokter IGD dan dokter Rawat Inap dapat menambahkan beberapa item obat dari master obat dalam satu resep.
- Setiap baris obat wajib memiliki pilihan master, jumlah positif, dan instruksi/aturan pakai; obat yang sama tidak boleh dimasukkan dua kali pada satu pengiriman formulir.
- Resep IGD terikat pada `visitId` + `patientId`; resep Rawat Inap terikat pada `admissionId` + `patientId`.
- Antrean Farmasi Rawat Jalan/IGD menggunakan record resep per resep (bukan asumsi satu resep per kunjungan), sehingga resep lanjutan tetap bisa diproses dan tautan pasien-kunjungan diverifikasi.
- Grup akun demo pada layar login tertutup saat pertama kali dibuka; pengguna membuka grup yang ingin diuji.

## Temuan audit dan prioritas lanjutan

### P0 — Wajib sebelum penggunaan klinis nyata

1. **Keamanan dan identitas pengguna:** kredensial akun demo dan sesi berada di sisi browser. Ini bukan autentikasi/otorisasi produksi; perlu backend, password hashing, kebijakan sesi, kontrol akses server, dan audit akses.
2. **Penyimpanan rekam medis:** data memakai `localStorage` sehingga tidak mendukung konsistensi multi-perangkat/pengguna, kontrol transaksi, backup/restore terkelola, atau audit yang tahan manipulasi. Perlu API dan basis data server dengan transaksi dan backup.
3. **Keamanan resep:** master obat prototipe belum menggantikan formularium resmi. Belum ada pemeriksaan alergi terstruktur, interaksi obat, duplikasi terapi lintas resep, kontraindikasi, penyesuaian dosis berbasis usia/berat/fungsi ginjal, atau validasi oleh apoteker. Jangan menggunakan katalog demo untuk keputusan terapi nyata.
4. **Instruksi obat terstruktur:** dosis, satuan dosis, rute, frekuensi, waktu pemberian, durasi, jumlah, dan instruksi khusus belum menjadi field terstruktur terpisah. Saat ini aturan pakai masih berupa teks; produksi perlu format terstruktur dan validasi sesuai kebijakan rumah sakit.
5. **Tanda tangan dan akuntabilitas klinis:** perlu identitas tenaga kesehatan terverifikasi, autentikasi ulang/penandatanganan elektronik sesuai kebijakan, timestamp server, serta riwayat perubahan yang tidak dapat dihapus oleh pengguna biasa.

### P1 — Penting untuk simulasi operasional yang realistis

1. **Stok farmasi:** perlu satuan dasar dan konversi kemasan, batch/lot, tanggal kedaluwarsa, stok karantina, retur, stok minimum, serta jejak siapa yang menyiapkan/menyerahkan obat. Prototipe baru menghitung stok sederhana per item.
2. **Pemberian obat Rawat Inap (eMAR):** status resep saat ini lebih sederhana daripada pencatatan per dosis. Sistem nyata perlu jadwal tiap dosis, waktu aktual, petugas pemberi, alasan tertunda/ditolak, dan penanganan dosis terlewat.
3. **Penjamin dan tagihan:** kalkulasi BPJS/asuransi pada demo adalah simulasi, bukan tarif/klaim resmi. Tarif, paket INA-CBG, aturan penjamin, deposit, koreksi transaksi, pembatalan, dan rekonsiliasi harus mengikuti aturan serta integrasi resmi.
4. **Laboratorium/radiologi:** lampiran hasil lokal dibatasi 1 MiB dan disimpan di browser. Produksi membutuhkan penyimpanan file terkelola, kontrol akses, ukuran/retensi yang sesuai, serta integrasi LIS/RIS/PACS (termasuk DICOM bila relevan).
5. **Alur IGD:** prioritas triase perlu protokol triase resmi, penilaian ulang dengan waktu dan alasan, jalur resusitasi, dokumentasi tindakan emergensi, serta pengawasan perpindahan status. Status demo tidak boleh menggantikan protokol klinis.
6. **Identitas pasien:** perlu verifikasi identitas lebih dari nama, pencegahan rekam medis ganda, koreksi data terotorisasi, dan rekonsiliasi identitas sebelum penggabungan kunjungan.

### P2 — Penyempurnaan mutu dan interoperabilitas

- Kode diagnosis/tindakan terstandar (mis. ICD yang berlaku), daftar istilah, dan validasi diagnosis.
- Integrasi SIMRS dengan antrean, BPJS/JKN, LIS/RIS/PACS, billing, dan sistem pelaporan melalui API terkontrol.
- Audit trail lintas modul untuk perubahan status, resep, stok, hasil penunjang, admisi, pemulangan, dan pembatalan.
- Uji aksesibilitas, penggunaan di tablet/ponsel, simulasi jaringan terputus, konflik edit oleh dua petugas, serta pengujian beban dan keamanan.

## Catatan verifikasi V16.5.1

Pemeriksaan otomatis yang tersedia adalah validasi sintaks, kontrak integrasi statis, dan startup smoke test. Ini bukan uji klinis atau bukti bahwa sistem siap dipakai di rumah sakit. Sebelum menyatakan alur benar-benar berfungsi, lakukan uji manual di browser: login dokter IGD → tambah beberapa obat → simpan → login Farmasi IGD → verifikasi seluruh item; ulangi untuk Rawat Inap; lalu uji reload, status, stok, riwayat, dan akun yang tidak berwenang.
