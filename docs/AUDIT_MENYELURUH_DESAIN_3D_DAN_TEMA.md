# AUDIT MENYELURUH — SIMRS PROTOTYPE V16.5.19

Tanggal audit: 15 Oktober 2026  
Status: audit awal ditindaklanjuti dengan implementasi terukur pada V16.5.20; tes statis/kontrak dijalankan ulang. Browser E2E/perangkat nyata tetap belum terverifikasi.

## 1. Ruang lingkup dan metode

- Sumber audit: arsip `V16.5.19_SIMRS_PROTOTYPE_KAWASAN_3D_LOGIN_VISUAL_FIX.zip` yang tersedia dalam percakapan.
- Inventarisasi struktur berkas, entry point HTML, stylesheet global, theme engine, modul autentikasi/navigasi, Service Worker, dan kontrak uji.
- Menjalankan tes otomatis yang disertakan di paket.
- Ini bukan pengujian browser end-to-end atau inspeksi langsung situs GitHub Pages yang diterbitkan.

## 2. Temuan prioritas tinggi

### P1 — Visual 3D belum menjadi sistem desain antarmuka

`index.html` menyertakan `#simrs-campus-backdrop` sebagai SVG dekoratif global. CSS mengatur opacity rendah (`.18` global, `.48` saat login, dan `.13` di layar <=600px). Ini hanya lapisan ilustrasi di belakang UI, bukan layout 3D kawasan yang menjadi komposisi utama login/beranda. Karena itu, di ponsel visual dapat tampak sangat samar dan tidak memenuhi konsep yang disepakati.

### P1 — Login masih kartu formulir standar

`modules/02-navigation-auth-shell.js` merender `.login-wrap > .login-panel` dengan hero dan form biasa. Belum ada komposisi responsif yang secara eksplisit menggabungkan area kawasan/gedung dengan panel login. Daftar akun demo juga menjadi konten panjang pada layar login; desain baru perlu mempertahankan fungsi ini tetapi mengatur hierarki dan scroll dengan aman.

### P1 — Tombol/halaman 3D mandiri masih tertanam di modul

Di `modules/02-navigation-auth-shell.js`, ada tautan “Kawasan 3D” di topbar dan “Buka Kawasan 3D” pada login (sekitar baris 261, 444–446). Halaman `kawasan-3d.html` juga ada. Ini bertentangan dengan tujuan integrasi visual sebagai bagian dari UI utama. Penghapusan tidak boleh dilakukan sebelum fungsinya dipetakan dan visual yang menggantikan sudah diuji.

### P1 — Beranda belum memakai struktur gedung sebagai dashboard

Audit statis menunjukkan SVG global, tetapi belum ada bukti bahwa render beranda memakai model kawasan sebagai komponen utama/pintasan unit yang terhubung dengan izin peran. Perlu ditelusuri renderer beranda aktual dan aturan RBAC sebelum desain diterapkan.

## 3. Sistem tema — harus dipertahankan

`theme-system.js` memiliki katalog tema warna, batik, dan nature; preferensi aktif disimpan dengan key `simrs.theme.active`; tema diterapkan melalui fungsi `apply()` dan galeri tema punya aksi pratinjau/terapkan/reset. Kontrak workflow yang tersedia memeriksa tombol Pratinjau/Terapkan dan perilaku pemilihan.

Risiko untuk desain baru: warna SVG gedung/landskap pada `style.css` sekarang banyak berupa literal tetap (`#a9c8db`, `#7c9cb8`, `#a99aff`, `#6e91b5`, `#496a91`, dan warna jendela/pohon). Artinya, ilustrasi kawasan belum benar-benar ditokenisasi untuk menyesuaikan tema aktif. CSS baru perlu memakai custom properties/token yang dipasok theme engine, dengan fallback, tanpa mengubah key penyimpanan atau alur pilih/pratinjau/terapkan tema.

Kriteria wajib tema:
- pilihan dan jumlah kategori tema yang ada tidak hilang;
- preview tidak menerapkan tema sampai pengguna menekan Terapkan;
- tema tersimpan tetap pulih setelah reload;
- login, beranda, panel Glass UI, gedung, modal, input, teks, dan status tetap memiliki kontras yang memadai;
- reset tema tetap berfungsi;
- perubahan tema tidak mengubah data SIMRS.

## 4. Pemeliharaan kode

- Modul utama terpisah dan `MODULE_MAP.json` tersedia; jangan meratakan atau menulis ulang modul.
- `modules/02-navigation-auth-shell.js` memuat tanggung jawab login, RBAC, shell/navigasi; ini lokasi penting untuk integrasi tetapi berisiko tinggi karena banyak alur bergantung padanya.
- `style.css` sudah panjang dan memiliki beberapa lapisan aturan versi/override. Sebelum menambah aturan baru, petakan cascade dan konflik selector; hindari menumpuk override yang tidak perlu.
- `theme-system.js` berisi bagian yang cukup padat/minified. Refactor format/komentar harus terpisah dari perubahan perilaku dan diuji dengan kontrak tema.
- Pertahankan penanda `PENCARIAN KODE`, tambahkan komentar yang menjelaskan tanggung jawab dan alasan aturan, bukan hanya label versi.

## 5. Risiko teknis dan pengamanan

1. Jangan mengubah schema/state/localStorage SIMRS untuk keperluan animasi visual.
2. Jangan membuat gedung dapat membuka modul yang tidak diizinkan untuk peran aktif; setiap pintasan harus melalui aturan navigasi/RBAC yang sama dengan menu biasa.
3. Gunakan CSS/SVG ringan terlebih dahulu; hindari library 3D eksternal sampai kebutuhan, performa, offline, dan ukuran paket dievaluasi.
4. Hormati `prefers-reduced-motion`, keyboard focus, layar kecil, mode kontras tinggi, dan fallback `backdrop-filter`.
5. Pastikan backdrop tidak menutup kontrol (`pointer-events:none` untuk dekorasi), tidak membuat konten tak terbaca, dan tidak menyebabkan scroll horizontal.
6. Service Worker dan query versi aset perlu diperbarui konsisten setelah perubahan; uji cache lama dan reload.
7. Jangan menghapus `kawasan-3d.html` sebelum seluruh dependensi, tautan, tes, dan strategi penggantinya diverifikasi.

## 6. Tes otomatis yang dijalankan

Semua tes berikut lulus pada arsip audit ini:

- `node tests/kawasan-3d-smoke.js` — lulus.
- `node tests/stage6-readonly-contract.js` — 10/10.
- `node tests/stage7-accessibility-performance.js` — 9/9.
- `node tests/stage8-3d-entrypoint.js` — 6/6 (tes ini mengonfirmasi tombol/entry point halaman mandiri masih ada, bukan bukti desain 3D sudah terintegrasi).
- `node tests/startup-smoke.js` — lulus.
- `node tests/stage8-workflow-contracts.js` — lulus.

Tes di atas bersifat statis/kontrak. Belum dijalankan: browser E2E, perangkat Android nyata, pengujian seluruh peran dengan klik aktual, screenshot per breakpoint, pemeriksaan kontras otomatis, serta uji update Service Worker di hosting.

## 7. Rencana implementasi yang disarankan setelah audit

Tahap A — baseline dan bukti visual:
1. Kunci salinan V16.5.19; hash dan struktur berkas dicatat.
2. Petakan renderer login, dashboard/beranda, topbar, sidebar/mobile navigation, semua role, dan theme engine.
3. Ambil baseline screenshot (desktop, tablet, Android portrait) sebelum perubahan.

Tahap B — sistem desain terpusat:
1. Definisikan design tokens 3D Glass UI berbasis CSS variables dan theme engine.
2. Bangun komponen kawasan isometrik ringan yang dapat dipakai ulang tanpa state bisnis sendiri.
3. Integrasikan kawasan pada login dan beranda; gedung/pintasan mengikuti RBAC.
4. Terapkan panel, kartu, tabel, formulir, modal, tombol, navigasi, status, dan empty/loading states dengan Glass UI konsisten.
5. Hapus tautan/halaman mandiri hanya setelah integrasi pengganti selesai dan kontrak diperbarui.

Tahap C — verifikasi regresi:
1. Uji tema: pilih, pratinjau, terapkan, reload, reset; uji tema terang/gelap dan variasi palet.
2. Uji login/logout dan akses peran.
3. Uji alur booking/check-in, dokter-resep-farmasi, lab/radiologi, kasir, IGD, rawat inap.
4. Uji desktop/mobile, keyboard, reduced motion, kontras, offline, cache Service Worker.
5. Bandingkan screenshot dengan baseline; dokumentasikan hasil dan isu yang belum selesai.

## 8. Kesimpulan

Paket V16.5.19 memiliki SVG kawasan dan theme engine yang berfungsi pada level kode, tetapi integrasi visual saat ini belum memenuhi desain yang disepakati. Temuan utama bukan alasan untuk menulis ulang SIMRS: diperlukan integrasi desain lintas halaman dengan token tema, komponen reusable, dan pengujian regresi. ## 9. Implementasi V16.5.20 dan hasil verifikasi

Perubahan yang diterapkan dari baseline V16.5.19:
- Login sekarang memakai komposisi dua kolom responsif: ilustrasi kawasan isometrik berisi gedung utama, poli, IGD, jalur kawasan, dan kartu informasi; panel autentikasi tetap menggunakan `handleLogin()` dan `chipsForDemo()` yang sama.
- Dashboard admin memperoleh `Kawasan Layanan Terintegrasi` dengan pintasan berbasis `data-nav`; tidak membuat mekanisme izin kedua, sehingga route tetap diperiksa oleh navigasi/RBAC yang ada.
- Tautan Kawasan 3D mandiri di login/topbar dihapus dan file `kawasan-3d.html` tidak lagi menjadi bagian aplikasi. Service Worker tidak lagi melakukan precache halaman itu.
- Token warna kawasan memakai `--accent`/`--accent-2` yang disetel oleh theme engine; katalog, key `simrs.theme.active`, preview/apply/reset, dan perilaku simpan tema dipertahankan.
- Versi aplikasi dan cache dinaikkan seragam menjadi `v16.5.20`; peta modul diperbarui. Modul SIMRS selain core version metadata dan shell visual tidak dirombak.
- CSS baru mencakup breakpoint kecil, fokus keyboard, reduced motion, forced-colors, dan fallback untuk `color-mix`.

### Tes yang dijalankan ulang

- `node --check modules/02-navigation-auth-shell.js` — lulus.
- `node --check theme-system.js` — lulus.
- `node tests/kawasan-3d-smoke.js` — 7/7.
- `node tests/stage6-readonly-contract.js` — 7/7.
- `node tests/stage7-accessibility-performance.js` — 7/7.
- `node tests/stage8-3d-entrypoint.js` — 5/5.
- `node tests/stage8-workflow-contracts.js` — lulus.
- `node tests/startup-smoke.js` — lulus.

### Batas yang belum dapat dinyatakan lulus

Chromium headless dicoba untuk mengambil screenshot, tetapi proses screenshot tidak selesai dalam batas waktu lingkungan ini. Karena itu belum ada bukti screenshot visual yang dapat disertakan. Belum diuji di Android nyata, belum diuji dengan TalkBack, belum dilakukan klik manual seluruh peran, dan belum diverifikasi pada GitHub Pages yang dipublikasikan. Tes kontrak memverifikasi struktur dan alur kode, bukan menjamin tidak ada cacat visual pada semua browser.

Kesimpulan: desain kawasan sudah diintegrasikan ke login dan dashboard admin pada tingkat kode, link/page mandiri dihapus, dan tes kontrak yang tersedia lulus. Rilis ini layak untuk uji coba lokal berikutnya, tetapi klaim final visual lintas perangkat masih menunggu pemeriksaan browser/perangkat nyata.
