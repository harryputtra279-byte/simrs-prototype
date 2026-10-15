# SIMRS PROTOTYPE V16.5.20 — Integrated 3D Glass UI

## Perubahan
- Kawasan isometrik 3D menjadi komposisi utama pada layar login, menyatu dengan panel masuk.
- Dashboard admin memiliki hub unit layanan dengan pintasan `data-nav` yang mengikuti mekanisme navigasi dan RBAC yang sudah ada.
- Tombol/link dan halaman kawasan 3D mandiri dihapus dari alur aplikasi; aset cache Service Worker diperbarui.
- Warna ilustrasi dan komponen Glass UI mengikuti token tema aktif dari `theme-system.js`.
- Katalog tema, key `simrs.theme.active`, preview/apply/reset, login, akun demo, dan schema data SIMRS tidak sengaja diubah.
- CSS responsif, fokus keyboard, forced-colors, dan reduced-motion ditambahkan untuk komponen baru.

## Batas verifikasi
Tes otomatis statis/kontrak tersedia di `tests/`. Browser E2E, perangkat Android nyata, dan inspeksi situs GitHub Pages live belum dijalankan di lingkungan ini; karena itu rilis ini tidak mengklaim pengujian visual nyata pada perangkat.
