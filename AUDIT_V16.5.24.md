# Audit & Release Notes — SIMRS PROTOTYPE V16.5.24

## Scope
Perbaikan integrasi tampilan Perjalanan Saya di aplikasi pasien berdasarkan audit V16.5.23. Repository publik tidak diubah.

## Temuan audit sebelum perbaikan
1. Rawat jalan memiliki peta miniatur, figur, rute, dan timeline melalui `patientFlow(v)`.
2. Rawat inap menampilkan timeline mandiri tanpa peta/figur/rute.
3. IGD menampilkan daftar tahap mandiri tanpa peta/figur/rute.
4. Penentuan indeks aktif memakai `Math.max(0, findIndex(...))`, sehingga jika tidak ada tahap aktif, indeks -1 dipaksa menjadi 0 dan figur dapat kembali ke awal.
5. Tes sebelumnya terutama kontrak statis; tidak membuktikan browser Android atau seluruh transisi layanan secara visual.

## Perbaikan
- Menambahkan renderer peta perjalanan bersama untuk tahap Rawat Inap dan IGD; mempertahankan alur dan timeline yang sudah ada.
- Memperbaiki fallback indeks pada Rawat Jalan agar memilih tahap pending atau tahap terakhir, bukan selalu kembali ke indeks nol.
- Menandai perjalanan selesai saat seluruh tahap sudah done.
- Menambahkan tes kontrak integrasi baru `tests/stage10-patient-journey-integration.js`.
- Menyamakan versi runtime, aset, dan Service Worker menjadi v16.5.24 untuk menghindari cache source lama.
- Mempertahankan perbaikan tombol hamburger dan panel akses cepat dari paket sebelumnya.

## Hasil pengujian
- `node --check modules/03-patient-app.js`: lulus.
- Seluruh skrip `tests/*.js`: lulus pada lingkungan Node/DOM shim yang tersedia.
- Tes stage 10 perjalanan pasien: 8/8 lulus.
- Kontrak kawasan 3D: 7/7 lulus.
- Kontrak readonly: 8/8 lulus.
- Aksesibilitas/performa statis: 9/9 lulus.
- Kontrak entrypoint 3D: 9/9 lulus.
- Kontrak workflow stage 8: lulus.
- Tes startup normal: lulus.

## Batasan yang belum diklaim
- Belum dilakukan pengujian visual manual pada browser Android/Chrome.
- Renderer peta miniatur adalah representasi urutan titik layanan; bukan navigasi indoor/GPS nyata.
- Simulasi localStorage statis tidak menjamin sinkronisasi server atau real-time multi-perangkat. Status klinis harus berasal dari pembaruan petugas yang tercatat.
- Status dan perpindahan harus tetap diuji pada data demo per episode sebelum dipublikasikan.
