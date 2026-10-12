# V16.5.4 — Audit & Fix Notes

## Perubahan
- Menambahkan Gedung A, B, C, dan Gedung Khusus secara eksplisit ke master fasilitas dengan ID yang diselaraskan ke `INPATIENT_ROOM_SEED`.
- Menambahkan lapisan konsolidasi CSS glass ungu/lavender/pink untuk kartu, jendela, tombol ikon, dan menu; border dibuat lebih tebal dan bayangan bertingkat.
- Menambahkan komentar `PENCARIAN KODE` untuk menemukan bagian master gedung dan konsolidasi tema.
- README.md sengaja tidak diubah.

## Batasan pemeriksaan
Perubahan master memastikan entri gedung ada dalam `data.facilities`, tetapi dropdown tetap harus diuji langsung pada alur admisi karena pilihan yang ditampilkan dapat bergantung pada fungsi pemfilteran ruang/bed dan penjamin. CSS menggunakan selector generik yang tidak mengubah struktur DOM. Pengujian visual lintas semua layar perlu verifikasi manual di browser.
