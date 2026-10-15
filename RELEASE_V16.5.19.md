# SIMRS PROTOTYPE V16.5.19 — Login Campus Visual Fix

## Tujuan
Memperbaiki akar masalah visual: pada versi sebelumnya kawasan 3D hanya tersedia di halaman terpisah dan tidak tampil pada latar login.

## Perubahan
- Menambahkan ilustrasi kawasan rumah sakit isometrik inline SVG sebagai latar dekoratif global.
- Memastikan latar tampil pada login dan tetap menjadi identitas visual di belakang aplikasi.
- Ilustrasi tidak menerima input, tidak mengubah data, dan tidak menjadi sumber status klinis.
- Mempertahankan `kawasan-3d.html` sebagai halaman visualisasi interaktif tersendiri.
- CSS memiliki komentar modul dan penanda `PENCARIAN KODE`.
- Menghormati `prefers-reduced-motion`; SVG statis tanpa animasi berat.
- Memperbarui versi aset dan cache ke V16.5.19.

## Batas audit
Tes statis bukan pengganti uji browser nyata. Verifikasi visual pada GitHub Pages dan perangkat Android tetap diperlukan.
