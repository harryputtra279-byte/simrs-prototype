# Laporan Audit — V16.5.18

## Temuan utama pada V16.5.17
`index.html` tidak memuat string/link `kawasan-3d.html`. Halaman 3D hanya tersedia sebagai file terpisah dan Service Worker memasukkannya ke app shell, tetapi tidak ada kontrol pada UI utama yang membawa pengguna ke sana. Ini menjelaskan mengapa setelah ZIP diterapkan, fitur 3D tidak tampak dari aplikasi utama. Perubahan V16.5.17 sendiri sebagian besar berupa pembaruan versi/cache; tidak menambahkan pintu masuk UI.

## Perbaikan
1. Menambahkan tautan Kawasan 3D di layar login.
2. Menambahkan tautan Kawasan 3D di topbar setelah login.
3. Menjaga link relatif agar bekerja di root domain dan subpath GitHub Pages.
4. Menaikkan versi runtime, aset, dan Service Worker ke V16.5.18.
5. Menambahkan tes regresi khusus untuk memastikan tautan tidak hilang lagi.

## Pemeriksaan otomatis
- `tests/kawasan-3d-smoke.js`: lulus.
- `tests/stage6-readonly-contract.js`: 10/10 lulus.
- `tests/stage7-accessibility-performance.js`: 9/9 lulus.
- `tests/startup-smoke.js`: lulus.
- `tests/stage8-workflow-contracts.js`: lulus.
- `tests/stage8-3d-entrypoint.js`: 6/6 lulus.
- `node --check` untuk 18 berkas JavaScript dan skrip inline pada `index.html`/`kawasan-3d.html`: lulus.
- README identik dengan baseline V16.5.16.

## Batasan
Belum ada pengujian browser nyata, tes visual di Android, atau verifikasi bahwa deployment GitHub Pages pengguna sudah mengambil commit terbaru. Tes otomatis ini tidak membuktikan seluruh UI dan workflow bebas bug.
