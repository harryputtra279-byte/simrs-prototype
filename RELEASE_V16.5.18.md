# SIMRS PROTOTYPE V16.5.18 — Hotfix akses Kawasan 3D

## Alasan rilis
Audit ulang V16.5.17 menemukan bahwa halaman `kawasan-3d.html` tersedia sebagai file terpisah, tetapi tidak ada tautan menuju halaman itu di UI utama (`index.html`/navigasi aplikasi). Karena itu, pengguna dapat menerapkan ZIP dengan benar namun tidak melihat pintu masuk fitur Kawasan 3D dari layar utama.

## Perbaikan
- Menambahkan tautan **Buka Kawasan 3D** pada layar login.
- Menambahkan tautan **Kawasan 3D** di topbar setelah login.
- Tautan menggunakan path relatif `kawasan-3d.html`, cocok untuk GitHub Pages pada subpath repository.
- Tidak mengubah alur autentikasi, hak akses rute klinis, data pasien, atau proses bisnis SIMRS.
- Menaikkan versi aset dan Service Worker ke V16.5.18 agar browser meminta aset baru.
- Menambahkan tes regresi `tests/stage8-3d-entrypoint.js`.
- README dipertahankan.

## Penerapan GitHub Pages
Unggah **isi ZIP** ke root repository (bukan folder ZIP/parent folder). Pastikan `index.html`, `kawasan-3d.html`, `modules/`, `style.css`, `sw.js`, dan aset pendukung berada langsung di root/struktur yang sesuai.

## Pengujian
Tes statis lulus: kawasan 3D, read-only Stage 6, aksesibilitas/performa Stage 7, startup, kontrak workflow, dan tes regresi pintu masuk Kawasan 3D. Pengujian browser end-to-end dan perangkat fisik belum dilakukan.
