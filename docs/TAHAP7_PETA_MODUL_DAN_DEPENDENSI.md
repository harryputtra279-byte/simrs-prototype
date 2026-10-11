# SIMRS PROTOTYPE — Peta Modul, Dependensi & Audit Akhir Tahap 8

## Prinsip struktur
- Pertahankan classic script dan urutan `index.html`; fungsi global lama masih menjadi kontrak integrasi.
- Jangan membungkus modul dalam IIFE atau mengubahnya menjadi ES module sebelum dependensi global dipetakan dan diuji.
- `style.css` dan Glass UI dipertahankan; perubahan visual tidak termasuk ruang lingkup Tahap 8.
- Setelah perubahan JavaScript, naikkan versi aset di `index.html`, `PROTOTYPE_VERSION`, serta `SW_VERSION`/`APP_SHELL` di `sw.js`.

## Urutan pemuatan
1. `qrcode.lib.js` — pustaka QR lokal.
2. `modules/rawat-inap/core.js` — helper inti Rawat Inap.
3. `modules/01-core-store-master.js` — konstanta, Store, seed, master data dan helper lintas modul.
4. `modules/02-navigation-auth-shell.js` — navigasi, sesi, akses dan kerangka UI.
5. `modules/03-patient-app.js` — tampilan/workflow pasien.
6. `modules/04-registration-booking.js` — pendaftaran, booking dan check-in.
7. `modules/05-outpatient.js` — Rawat Jalan/poli dan pembuatan order.
8. `modules/06-diagnostics-pharmacy-cashier.js` — Lab, Radiologi, Farmasi dan Kasir.
9. `modules/07-inpatient-medical-records.js` — Rawat Inap, admisi dan rekam medis.
10. `modules/08-queue-igd-bootstrap.js` — monitor antrean, IGD dan bootstrap.

## Perbaikan Tahap 8
- Menghapus deklarasi `renderIGD()` versi lama yang berada setelah implementasi lebih lengkap. Pada JavaScript classic script, deklarasi yang muncul belakangan menimpa implementasi sebelumnya; akibatnya panel klinis IGD dan beberapa handler tindak lanjut tidak tampil pada dashboard yang aktif.
- Menghapus renderer rujukan IGD duplikat yang ikut berada di blok lama.
- Menyatukan `doctorMasterForSchedule()` menjadi satu helper bersama pada Modul 01 dengan fallback ke akun pengguna lama, sehingga pilihan dokter tetap kompatibel dengan data jadwal lama tanpa deklarasi global ganda.
- Menambahkan `tests/stage8-workflow-contracts.js` dan `tools/verify-stage8.sh` untuk memeriksa sintaks, urutan skrip, aset, deklarasi fungsi global duplikat, versi cache, serta kontrak integrasi lintas unit.
- Menjaga `style.css`, library QR, bentuk ID pasien/kunjungan/admisi/resep/order, dan alur sumber data tetap ada.

## Kontrak antarunit yang wajib dijaga
- **Store/data:** jangan mengubah ID pasien, booking, visit, resep, care request, transaksi, admisi, order, atau bed tanpa migrasi kompatibel.
- **Sesi dan akses:** menu tersembunyi bukan satu-satunya kontrol; fungsi mutasi harus memeriksa role.
- **Pasien → booking → loket/check-in → Rawat Jalan:** booking dan check-in harus mempertahankan `patientId`, `bookingId`, `visitId`, jadwal dokter dan sesi antrean.
- **Dokter → Farmasi:** resep harus mengacu pada kunjungan atau admisi asal, dengan status yang dipahami unit Farmasi.
- **Dokter → Lab/Radiologi → dokter:** order dan hasil harus kembali ke episode sumber; hasil yang belum ditinjau tidak boleh dianggap telah ditinjau.
- **IGD → penunjang/Farmasi/Rawat Inap:** pertahankan referensi episode, request, order, pasien dan admisi; hindari episode ganda.
- **Kasir:** tagihan harus tetap terhubung ke kunjungan atau admisi yang benar.
- **PWA/cache:** seluruh berkas lokal harus ada di `APP_SHELL`, dan versi cache harus berubah bersama versi aplikasi.

## Cara mencari kode
Setiap modul memiliki komentar pembuka dan indeks fungsi. Gunakan Ctrl+F untuk nama fungsi atau kata `MODUL:`. Untuk dependensi lintas berkas, cari nama fungsi di seluruh folder `modules/`.

## Menjalankan pemeriksaan akhir
```bash
bash tools/verify-stage8.sh
```
Pemeriksaan mencakup `node --check`, kecocokan urutan script, keberadaan aset, keunikan deklarasi fungsi global, konsistensi versi V16.4.0, dan kontrak statis lintas unit.

## Batas validasi
Pemeriksaan statis lulus bukan bukti seluruh interaksi browser lulus. Uji login/logout per role, booking/check-in/antrean, pemeriksaan dan resep, hasil Lab/Radiologi, penyiapan/penyerahan obat, transaksi Kasir, rujukan IGD ke Rawat Inap, dan cache offline tetap perlu dilakukan secara interaktif. Paket ini adalah prototipe portfolio, bukan sistem klinis produksi.
