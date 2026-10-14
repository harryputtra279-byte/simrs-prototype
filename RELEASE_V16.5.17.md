# SIMRS PROTOTYPE — V16.5.17 Release Candidate

## Tujuan rilis
Tahap 8 adalah pemeriksaan integrasi akhir dan pengemasan rilis untuk rangkaian visualisasi kawasan 3D. Rilis ini dibangun dari V16.5.16 Tahap 7; tidak mengganti ulang modul bisnis SIMRS.

## Prinsip perubahan
- Mempertahankan alur bisnis, struktur modul, dan data demo yang sudah ada.
- Menyamakan label versi aplikasi, core runtime, halaman kawasan 3D, cache Service Worker, serta cache-busting aset ke V16.5.17.
- Memperbarui cache-busting aset agar browser tidak mencampur aset lama dan baru setelah rilis.
- Menyediakan peta modul dan komentar `PENCARIAN KODE` yang sudah ada untuk memudahkan pemeliharaan manual.
- README portofolio tetap tidak diubah.

## Validasi yang dijalankan
Jalankan dari folder hasil ekstraksi:

```bash
bash tools/verify-stage8.sh
node tests/stage7-accessibility-performance.js
node tests/kawasan-3d-smoke.js
node tests/stage6-readonly-contract.js
for mode in normal blocked badjson future; do SIMRS_STORAGE_MODE="$mode" node tests/startup-smoke.js; done
unzip -t V16.5.17_SIMRS_PROTOTYPE_KAWASAN_3D_RELEASE.zip
```

Kontrak otomatis di atas memeriksa sintaks, struktur dan dependensi modul, aset lokal, sinkronisasi versi, sejumlah alur kerja, aksesibilitas statis, dan skenario startup/storage. Log `blocked` dan `badjson` dapat memuat peringatan yang memang disimulasikan; yang penting proses tes berakhir dengan status lulus.

## Batasan yang diketahui
- Pemeriksaan otomatis bersifat statis/simulasi Node.js, bukan pengganti pengujian browser nyata.
- Belum dilakukan uji lintas browser, perangkat Android fisik, TalkBack, pemutakhiran Service Worker langsung, atau uji pengguna rumah sakit.
- Data aplikasi prototipe tersimpan pada `localStorage` browser per perangkat/origin. Belum ada backend terpusat, sinkronisasi lintas perangkat, atau kontrol keamanan produksi.
- Jangan gunakan untuk data pasien nyata atau operasional klinis.

## Langkah penerapan yang disarankan
1. Simpan ZIP V16.5.16 sebagai cadangan.
2. Ekstrak rilis ini ke direktori uji terpisah.
3. Jalankan melalui localhost/HTTPS, bukan hanya `file://`.
4. Uji login setiap peran demo, booking/check-in, dokter→resep→farmasi, lab/radiologi, kasir, IGD, rawat inap, tema, dan halaman kawasan 3D.
5. Uji pembaruan PWA: tutup aplikasi, buka kembali, lalu pastikan aset versi baru terambil.
6. Baru setelah uji manual lulus, terapkan ke repository hosting.
