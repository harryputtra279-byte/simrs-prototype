# SIMRS PROTOTYPE V16.5.23 — 3D Glass Navigation & Patient Journey

## Fokus
Mempertegas desain Samsung Glass 3D pada ikon navigasi dan hamburger, serta menambahkan peta perjalanan pasien 3D mini di atas timeline yang sudah ada.

## Perubahan
- Ikon sidebar dan bottom navigation memakai wadah glass berlapis dengan keadaan aktif yang jelas.
- Tombol hamburger menu pelayanan admin memiliki wadah 3D glass; handler menu yang ada dipertahankan.
- Perjalanan rawat jalan menampilkan peta miniatur layanan dengan bangunan relevan dari definisi journey episode, jalur progres, karakter pasien kecil, serta timeline di bawah peta.
- Posisi karakter diturunkan dari status episode yang sudah ada; tidak memakai GPS dan tidak membuat status klinis baru.
- Gerak karakter hanya terjadi saat posisi berubah karena render/status berubah; preferensi reduced-motion dihormati.
- Versi aset dan cache dinaikkan ke v16.5.23.

## Dipertahankan
Modul inti, urutan classic scripts, route/RBAC, akun demo, alur SIMRS, struktur data lokal, tema, PWA, dan handler navigasi.

## Validasi
Pemeriksaan syntax JS dan tes kontrak yang tersedia dijalankan setelah paket dibangun. Ini bukan pengganti pengujian visual browser/Android atau deployment GitHub Pages live.
