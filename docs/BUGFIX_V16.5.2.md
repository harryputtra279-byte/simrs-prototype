# V16.5.2 — Resep Mandiri dan Pemilihan Bed Hierarkis

## Perubahan
- Resep dokter Rawat Inap menjadi kartu mandiri di bagian atas area instruksi; tidak dicampur dengan instruksi non-obat.
- Form resep Rawat Inap mendukung beberapa item dari master obat, validasi episode aktif, jumlah, aturan pakai, duplikasi obat, dan stok master demo.
- Resep tetap terhubung ke `patientId` dan `admissionId`, lalu masuk antrean Farmasi Rawat Inap.
- Kartu resep IGD dipindahkan ke atas diagnosis dan ditampilkan sebagai panel terpisah.
- Pemilihan bed admisi memakai urutan Gedung → Lantai → Ruang → Bed tersedia. Data lokasi dibaca dari master ruang/bed; tidak membuat struktur gedung statis baru.
- Aturan eligibilitas penjamin yang telah ada tetap dipertahankan (prototype: Gedung B/C untuk BPJS, Gedung A untuk penjamin lain). Perlu disesuaikan dengan kebijakan RS nyata sebelum produksi.
- Versi cache/service worker dinaikkan ke 16.5.2. `README.md` tidak diubah.

## Penanda pencarian kode
- `PENCARIAN KODE: MODUL RAWAT INAP | FUNGSI: ranapOrderTabHtml`
- `PENCARIAN KODE: MODUL RAWAT INAP | FUNGSI: submitRanapPrescription`
- `PENCARIAN KODE: MODUL RAWAT INAP | PEMILIHAN BED HIERARKIS GEDUNG-LANTAI-RUANG-BED`
- `PENCARIAN KODE: MODUL: IGD | SUBMODUL: SIMPAN RESEP MULTIOBAT`

## Pemeriksaan dan batasan
- Perlu menjalankan uji browser manual untuk peran dokter IGD, dokter Rawat Inap, petugas farmasi, dan admisi.
- Prototipe menggunakan localStorage/browser lokal; belum merupakan sistem klinis produksi atau penyimpanan terpusat.
- Pemeriksaan alergi, interaksi obat, formularium resmi, dan dosis klinis tidak boleh dianggap tervalidasi hanya oleh pemeriksaan kode.
