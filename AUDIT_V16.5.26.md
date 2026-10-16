# AUDIT SIMRS PROTOTYPE V16.5.26

## Baseline dan cakupan
- Baseline kerja: ZIP V16.5.25_SIMRS_PROTOTYPE_RESPONSIVE_ZIGZAG_AUDITED.zip.
- Audit source mencakup HTML entrypoint, seluruh modul JavaScript, CSS, tema, Service Worker, daftar role/route, akun demo, dan seluruh skrip tes dalam paket.
- Tidak ada perubahan repository publik. README.md dipertahankan.

## Temuan pada baseline V16.5.25
1. Layout responsive hanya menambahkan guard overflow; banyak aturan `.topbar`, grid, dan navbar lama saling menimpa. `overflow-x:hidden` dapat menyembunyikan gejala tanpa memperbaiki lebar komponen.
2. Navbar Admin memiliki deklarasi desktop/mobile bertumpuk dan teks label berpotensi meluber pada ruang sempit.
3. Rute peta memakai SVG zig-zag statis dengan empat segmen, sementara jumlah node bisa berubah; garis tidak mengikuti koordinat node aktual.
4. Node zig-zag menggunakan margin-top berbeda dari koordinat figur sehingga garis, gedung, dan figur dapat tidak sejajar.
5. Figur sebelumnya hanya berupa bentuk CSS sederhana tanpa volume manusia yang jelas.
6. Peta Rawat Inap sebelumnya hanya menggunakan tahap utama; aktivitas penunjang yang ada ditampilkan di area terpisah sehingga peta tidak selalu mencerminkan tujuan aktual.
7. Viewport meta membatasi `maximum-scale=1`, menghambat zoom aksesibilitas.

## Perbaikan V16.5.26
- Tambahan layout terakhir dengan `min-width:0`, `max-width:100%`, grid mobile yang menyusut, modal terbatas viewport, dan navbar fixed yang berada di antara inset kiri/kanan.
- Navbar Admin memakai kontrol icon-only pada layar kecil; judul diberi kolom tengah yang dapat menyusut.
- Geometri peta kini dihitung berdasarkan jumlah node aktual; posisi tujuan selang-seling y=22% dan y=70%, dan polyline SVG dibuat dari titik pusat node.
- Rawat Jalan menggunakan renderer peta bersama. IGD memakai renderer yang sama. Rawat Inap menyertakan Lab/Radiologi/Farmasi hanya jika ada order/aktivitas.
- Figur diberi kepala bergradasi dan rambut, torso bervolume, lengan, kaki dan sepatu dengan bayangan.
- `maximum-scale=1` dihapus.
- Semua modul yang dimuat dari entrypoint lolos `node --check`; seluruh tes paket dan Stage 12 harus lulus sebelum rilis.

## Hasil tes otomatis
- Kawasan 3D smoke: 7/7.
- Integrasi perjalanan pasien: 8/8.
- Responsivitas dan zig-zag: 9/9.
- Read-only contract: 8/8.
- Aksesibilitas/performa statis: 9/9.
- 3D entrypoint: 9/9.
- Workflow contracts: lulus.
- Patient journey UI: 8/8.
- Startup smoke: lulus.
- Final audit Stage 12: 14/14.
- Sintaks JavaScript modul, tema, Service Worker, dan tes: lulus.

## Batasan yang dinyatakan
- Lingkungan ini tidak berhasil menjalankan Chromium headless hingga selesai, sehingga tidak ada klaim screenshot/visual manual Android yang lulus.
- Tes otomatis dan source audit tidak dapat menjamin setiap akun/perangkat bebas cacat visual. ZIP disiapkan setelah tes source-level lulus; uji akhir di HP nyata tetap direkomendasikan sebelum mengganti repository publik.
- Peta merupakan panduan status pelayanan tercatat, bukan GPS. Perpindahan harus didasarkan pada status SIMRS yang tersimpan/terkonfirmasi.
