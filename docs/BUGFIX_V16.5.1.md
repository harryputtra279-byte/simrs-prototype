# SIMRS PROTOTYPE — Catatan Perbaikan V16.5.1

## Tujuan
Perbaikan lanjutan berbasis baseline `V16.5.0_SIMRS_WORKFLOW_FIXES.zip`. Baseline tidak diubah. `README.md` sengaja tidak disentuh.

## Perubahan

1. **Resep multiobat IGD** — dokter dapat menambahkan beberapa item dari master obat dalam satu resep, mengisi jumlah dan instruksi/aturan pakai per item, menghapus baris tambahan, dan mencegah obat yang sama terpilih dua kali dalam satu pengiriman. Resep tetap terhubung ke `visitId` dan `patientId`.
2. **Resep multiobat Rawat Inap** — dokter dapat menyusun beberapa item dalam satu resep. Resep terhubung ke `admissionId` dan `patientId`; antrean Farmasi Rawat Inap memproses daftar item dari resep yang sama.
3. **Antrean Farmasi IGD/Rawat Jalan** — antrean kini berangkat dari record resep, bukan asumsi satu resep per kunjungan. Resep lanjutan tetap dapat muncul setelah resep sebelumnya disiapkan; pemrosesan memvalidasi `visitId` dan `patientId`; migrasi juga melengkapi `patientId` pada resep lama bila datanya kosong dan kunjungan sumber tersedia.
4. **Akun demo** — semua grup unit pelayanan pada halaman login ditutup secara default. Pengguna memilih grup yang ingin dibuka.
5. **Versi/cache** — runtime, referensi aset, dan Service Worker dinaikkan ke `v16.5.1` agar browser tidak memakai cache versi sebelumnya.
6. **Dokumentasi pencarian kode** — fungsi penyusun resep diberi penanda `PENCARIAN KODE` dan komentar tanggung jawab agar mudah ditemukan dengan Ctrl+F.

## Pemeriksaan

- Validasi sintaks JavaScript untuk seluruh modul dan Service Worker.
- Kontrak regresi untuk urutan modul, aset, versi/cache, akun demo, resep multiobat, dan alur Farmasi Rawat Inap.
- Startup smoke test untuk penyimpanan normal, storage diblokir, JSON rusak, dan schema versi lebih baru.

## Catatan real-life / batas prototipe

- Ini tetap prototipe portofolio, bukan sistem klinis siap produksi. Master obat saat ini adalah katalog demo; belum menggantikan formularium rumah sakit, rekonsiliasi obat, pemeriksaan alergi/interaksi, validasi dosis berbasis usia/berat/fungsi ginjal, e-signature dokter, atau audit farmasi terintegrasi.
- Instruksi dosis/aturan pakai masih berupa teks bebas. Implementasi produksi sebaiknya memisahkan dosis, satuan, rute, frekuensi, durasi, jumlah, dan instruksi khusus menjadi field terstruktur serta memakai validasi klinis yang disahkan rumah sakit.
- Simulasi penyimpanan berbasis browser/localStorage tidak cocok untuk rekam medis produksi atau banyak pengguna serentak. Produksi membutuhkan backend, kontrol akses server, audit yang tidak mudah dimanipulasi, backup, dan pengujian keamanan.
- Tes kontrak dan smoke test tidak menggantikan uji manual di Chrome Android untuk login, klik Tambah Obat, kirim resep, penerimaan farmasi, perubahan status, dan reload halaman.
