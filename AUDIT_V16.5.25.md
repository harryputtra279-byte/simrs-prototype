# AUDIT DAN RELEASE — SIMRS PROTOTYPE V16.5.25

## Baseline
- Baseline resmi: `V16.5.24_SIMRS_PROTOTYPE_PATIENT_JOURNEY_FINAL.zip`
- Paket keluaran: SIMRS PROTOTYPE V16.5.25
- Repository publik tidak diubah.
- README.md tidak diubah.

## Temuan yang ditangani
1. Peta perjalanan sebelumnya menggunakan jalur horizontal dan tidak memperjelas pola zig-zag atas/bawah.
2. Figur pasien sebelumnya hanya diberi koordinat horizontal; kini koordinat vertikalnya mengikuti baris tahap aktif.
3. Fallback indeks pada peta bersama dan Rawat Jalan dapat memilih tahap pertama saat tidak ada tahap aktif maupun pending; kini fallback memilih tahap terakhir pada kondisi seluruh tahap selesai.
4. Layout responsif diberi lapisan tambahan untuk mencegah konten utama melampaui viewport, memungkinkan penyusutan komponen, membatasi modal, dan menjaga tabel padat memakai area gulirnya sendiri.
5. Navbar pasien dan staf diberi aturan flex untuk menyusut dengan lebar layar, serta area sentuh minimum pada perangkat kecil.
6. Versi runtime, referensi aset, dan cache Service Worker dinaikkan menjadi `v16.5.25`.
7. Ditambahkan tes kontrak Stage 11 untuk responsivitas dan pola zig-zag.

## Pemeriksaan otomatis
- Pemeriksaan sintaks JavaScript seluruh modul, `theme-system.js`, Service Worker, dan skrip tes: LULUS.
- Smoke test kawasan 3D: 7/7.
- Integrasi perjalanan pasien: 8/8.
- Kontrak responsif dan zig-zag: 9/9.
- Kontrak readonly: 8/8.
- Aksesibilitas/performa statis: 9/9.
- Entrypoint 3D: 9/9.
- Kontrak workflow lintas modul: LULUS.
- UI journey: 8/8.
- Startup smoke test: LULUS.
- Tidak ditemukan deklarasi fungsi global duplikat antar-modul menurut tes kontrak workflow.

## Batasan pengujian
- Pengujian di atas adalah pengujian sintaks, startup shim, dan kontrak statis/otomatis yang tersedia dalam paket.
- Belum dilakukan pengujian visual manual menggunakan browser Android/Chrome pada setiap akun dan ukuran layar. Karena itu, responsivitas visual nyata pada seluruh kombinasi role/perangkat belum bisa dinyatakan 100% terverifikasi.
- Jalur zig-zag adalah petunjuk visual berdasarkan tahap layanan tercatat, bukan navigasi GPS atau pelacakan posisi fisik.
- Perubahan CSS responsif adalah lapisan pengaman lintas halaman; halaman kompleks tertentu masih perlu pemeriksaan visual di perangkat nyata sebelum dipakai operasional.

## Perubahan yang tidak dilakukan
- Tidak ada upload atau perubahan repository publik.
- Tidak ada perubahan README.
- Tidak ada penggantian baseline selain melanjutkan dari V16.5.24.
