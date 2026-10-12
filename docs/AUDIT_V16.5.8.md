# Audit dan Perbaikan V16.5.8

## Temuan audit V16.5.7
- Entri tema ditambahkan melalui `MutationObserver` yang menghapus lalu membuat ulang kartu pada setiap mutasi. Pola ini dapat memicu mutasi berulang dan tidak menautkan menu secara andal ke renderer Master Data.
- Pendeteksian menu berdasarkan hash bukan integrasi langsung ke tab Master Data yang dirender aplikasi.
- CSS memiliki aturan tombol tema mengambang lama walaupun arah desainnya adalah submenu Master Data.
- Selector glass lama belum secara spesifik menata `.login-emblem` dan `.login-hero h1`, yaitu selector ikon dan judul yang benar-benar dipakai halaman login.
- Daftar gedung/ruangan rawat inap hanya memuat ruang yang mempunyai bed kosong dan sesuai kelas BPJS saat itu. Akibatnya gedung B/C bisa menghilang dari dropdown.
- Versi cache service worker dan query versi aset tidak konsisten dengan versi build terbaru.

## Perbaikan
- Menambahkan tab **Tema Aplikasi** pada Master Data khusus `admin`/`superuser`, dengan galeri tema, tombol pulihkan default, dan penyimpanan pilihan pada localStorage browser.
- Menghapus ketergantungan integrasi tema pada observer/hash dan tidak menyediakan tombol tema mengambang.
- Memulihkan gaya glass 3D pada ikon, judul, subjudul dan panel login berdasarkan selector markup aktual.
- Dropdown gedung/lantai/ruang menampilkan master lokasi tanpa bergantung pada status bed; pilihan bed tetap memfilter bed kosong dan memeriksa kecocokan kelas BPJS.
- Menyelaraskan versi aplikasi, query aset, service worker, dan peta modul ke V16.5.8.
- `README.md` dipertahankan tanpa perubahan.

## Pemeriksaan yang dijalankan
- `node --check` untuk semua skrip JavaScript utama.
- `tests/startup-smoke.js`.
- `tests/stage8-workflow-contracts.js`, termasuk kontrak tema, login glass, gedung rawat inap, integrasi antarunit, dan urutan skrip.
- Pemeriksaan integritas ZIP dan perbandingan hash `README.md` dengan V16.5.7.

## Batasan
Pengujian statis dan startup smoke bukan pengganti uji klik menyeluruh pada browser Android/desktop. Setelah deploy, perlu uji login Super User, tab Master Data → Tema Aplikasi, memilih tema, reload/persistensi, pemulihan default, akun non-admin, dan alur admisi bed.
