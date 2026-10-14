# Changelog — V16.5.16 SIMRS PROTOTYPE

**Basis:** `V16.5.15_SIMRS_PROTOTYPE_KAWASAN_3D_STAGE6_AUDITED.zip`.

## Tahap 7 — performa dan aksesibilitas
- Menambahkan mode visual ringan untuk perangkat yang melaporkan memori rendah atau penghemat data aktif. API perangkat bersifat opsional dan dibungkus `try/catch`.
- Menghormati `prefers-reduced-motion`; transisi dan animasi CSS dinonaktifkan saat pengguna meminta pengurangan gerakan.
- Menambahkan fallback kaca tanpa `backdrop-filter`, fokus keyboard yang terlihat, serta dukungan dasar `forced-colors`.
- Memperbaiki ukuran target kontrol dan tata letak pada layar sangat kecil; menjaga navigasi dan alur data SIMRS tetap tidak berubah.
- Menegaskan state aksesibel `aria-pressed` pada gedung terpilih. Pilihan gedung hanya memengaruhi tampilan.
- Mempertahankan adapter kawasan 3D bersifat read-only; tidak menambah dependensi eksternal.
- Memperbarui versi aplikasi, core version, dan cache Service Worker ke `v16.5.16`.
- README portfolio tidak diubah.

## Validasi
Jalankan `node tests/stage7-accessibility-performance.js`, `node tests/kawasan-3d-smoke.js`, `node tests/stage6-readonly-contract.js`, `node tests/startup-smoke.js`, dan `node tests/stage8-workflow-contracts.js`.

Tes kontrak bersifat statis. Uji browser lintas ukuran layar, VoiceOver/TalkBack, offline-cache update, dan perangkat Android berdaya rendah tetap perlu dilakukan sebelum menyatakan rilis bebas bug.
