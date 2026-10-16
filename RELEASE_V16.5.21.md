# SIMRS PROTOTYPE V16.5.21 — Integrated 3D Campus & Glass UI

## Fokus rilis
Integrasi visual kawasan rumah sakit 3D isometrik ke halaman login dan dashboard operasional, disertai lapisan Glass UI bersama untuk halaman kerja internal.

## Perubahan
- Login: identitas SIMRS PROTOTYPE berada di dalam satu komposisi dengan ilustrasi kampus isometrik; tidak ada logo mandiri yang terpisah dari ilustrasi.
- Dashboard: navigasi kampus interaktif dengan shortcut unit pelayanan yang memakai route aplikasi yang sudah ada.
- RBAC: unit yang ditampilkan pada kampus dashboard disaring memakai `isRouteAllowed(route, role)`; navigasi tetap melalui handler `data-nav` yang sudah ada.
- Internal UI: penyatuan gaya panel, kartu, tabel, input, fokus keyboard, border glass, dan kedalaman visual melalui token tema.
- Tema: menggunakan token warna/surface yang ada; katalog, preview/apply, reset, dan penyimpanan tema tidak diganti.
- Responsif: aturan desktop/mobile, `prefers-reduced-motion`, dan `forced-colors` dipertahankan/diperluas.
- Halaman mandiri `kawasan-3d.html` dan tautan masuknya dihapus setelah pengganti terintegrasi ditambahkan.
- Service Worker dinaikkan ke `v16.5.21`; referensi cache ganda untuk `theme-system.js` dibersihkan.
- Peta modul dan regression checks diperbarui ke versi rilis ini.
- Komentar `PENCARIAN KODE` ditambahkan pada area integrasi visual baru.

## Dipertahankan
- Modul inti 01–08 dan urutan classic scripts.
- Alur pendaftaran, booking, check-in, kunjungan, antrean, resep, farmasi, penunjang, rawat inap, IGD, kasir, rekam medis, serta akun demo.
- Skema penyimpanan lokal, route yang ada, role/permission rules, dan sistem tema.

## Verifikasi yang dijalankan
- `node --check` untuk `theme-system.js`, seluruh `modules/*.js`, dan `modules/rawat-inap/core.js`.
- `tests/startup-smoke.js`.
- `tests/kawasan-3d-smoke.js` (diarahkan ulang ke kontrak kampus terintegrasi).
- `tests/stage6-readonly-contract.js`.
- `tests/stage7-accessibility-performance.js`.
- `tests/stage8-3d-entrypoint.js` (diarahkan ulang ke integrasi login/dashboard).
- `tests/stage8-workflow-contracts.js`.
- Semua pemeriksaan statis tersebut lulus.
- Semua aset dalam `APP_SHELL` diverifikasi tersedia; 18 entri, tidak ada file yang hilang.

## Batas pengujian
Ini adalah prototype berbasis frontend. Pengujian di atas adalah pemeriksaan syntax, startup, dan kontrak statis. Pengujian visual interaktif lintas browser/perangkat, Android nyata, deployment GitHub Pages live, serta validasi klinis/keamanan produksi belum dinyatakan lulus. Screenshot headless Chromium tidak berhasil dihasilkan dalam lingkungan kerja ini.
