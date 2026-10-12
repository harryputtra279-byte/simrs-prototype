# SIMRS PROTOTYPE — Catatan Perbaikan V16.5.0

## Baseline dan batas perubahan
- Baseline: `V16.4.3_SIMRS_LOGIN_GROUPING.zip` (dipertahankan terpisah, tidak ditimpa).
- README utama sengaja tidak diubah.
- Versi kerja: `V16.5.0`.

## Perubahan
1. Skrining triase IGD dan asesmen/diagnosis dokter dicatat sebagai entri `clinicalHistory` pada episode kunjungan, selain field utama yang sudah dipakai UI.
2. Permintaan admisi dari IGD memeriksa admisi aktif dan permintaan yang sudah ada agar tindakan simpan ulang tidak membuat permintaan baru.
3. Penerimaan rujukan admisi menolak rujukan yang sudah terkait admisi atau pasien yang sudah memiliki admisi aktif.
4. Form admisi dan penyelesaian pulang medis menampilkan konfirmasi eksplisit; penyelesaian pulang memvalidasi episode masih aktif.
5. Form hasil Laboratorium dan Radiologi untuk Rawat Jalan/IGD serta Rawat Inap mendukung lampiran JPG/PNG/WEBP/PDF maksimal 1 MiB per file. Lampiran disimpan sebagai data URL bersama hasil dalam penyimpanan demo lokal.
6. Resep IGD dapat menambahkan lebih dari satu jenis obat ke resep yang masih menunggu, tanpa menambahkan item obat yang sama dua kali.
7. Versi runtime, aset, dan cache Service Worker dinaikkan ke `v16.5.0` agar cache lama tidak menimpa file baru.

## Uji yang dijalankan
- Pemeriksaan sintaks Node.js untuk seluruh modul dan Service Worker.
- Kontrak integrasi Tahap 8.
- Startup/login smoke test pada mode normal, storage diblokir, JSON rusak, dan versi data masa depan.
- Kontrak regresi statis khusus perbaikan V16.5.0.

## Batasan yang harus diketahui
- Ini tetap prototipe berbasis browser/localStorage, bukan sistem produksi rumah sakit. Lampiran kecil disimpan pada perangkat/browser yang sama; bukan repositori dokumen terpusat. Batas 1 MiB sengaja dipakai untuk mengurangi risiko kuota localStorage.
- Pengujian otomatis bukan pengganti UAT klinis, uji multi-pengguna, keamanan, dan validasi oleh tenaga kesehatan.
- Untuk implementasi nyata diperlukan backend/API, database transaksi, autentikasi/otorisasi server, penyimpanan berkas terkelola, pencatatan audit yang tidak dapat diubah sembarangan, dan peninjauan tata kelola rekam medis.
