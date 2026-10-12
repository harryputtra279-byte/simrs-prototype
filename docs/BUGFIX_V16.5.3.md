# V16.5.3 — Gedung Rawat Inap dan Purple Glass UI

## Perubahan
- Pemilihan lokasi admisi tidak lagi menyaring gedung secara global berdasarkan jenis penjamin. Semua gedung yang memiliki bed kosong ditampilkan; kelas standar 1/2/3 untuk BPJS tetap divalidasi terhadap pilihan kelas.
- Master ruang menambahkan contoh ruang untuk `GED-K` (Gedung Khusus) di lantai 1–2. Gedung A, B, dan C tetap ada.
- Seluruh aplikasi mendapat lapisan tema purple-lavender glass: panel transparan, blur lebih kuat, border putih/ungu lebih tegas, aksen pink-ungu, serta kontrol input senada.
- Cache stylesheet dan service worker dinaikkan ke V16.5.3.

## Penanda pencarian
Cari `PENCARIAN KODE: MASTER BED` di `modules/07-inpatient-medical-records.js` dan `PENCARIAN KODE: UI THEME V16.5.3` di `style.css`.

## Catatan
Daftar ruang Gedung Khusus adalah data demo yang bisa disesuaikan dengan master RS. Kebijakan penjamin/kelas harus dikonfigurasi dan divalidasi bersama kebijakan rumah sakit sebelum penggunaan klinis nyata. Tema diterapkan lewat CSS tanpa mengubah struktur navigasi atau alur modul.
