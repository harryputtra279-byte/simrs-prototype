# SIMRS PROTOTYPE V16.5.27 — Responsive layout refinement

## Perubahan
- Tombol aksi pada kartu bed IGD membungkus teks secara alami, maksimal dua baris pada lebar kartu normal, dan tidak mendorong lebar kartu.
- Ringkasan rawat inap pasien mempertahankan dua kolom pada viewport kecil; satu kolom hanya digunakan pada viewport sangat sempit (di bawah 340 px).
- Kartu/grid ringkasan dibatasi pada lebar induk dan item grid diizinkan menyusut agar tidak overflow.
- Perubahan bersifat CSS-only; alur kerja dan handler JavaScript tidak diubah.

## Validasi
- Jalankan seluruh tes Node.js yang tersedia sebelum deploy.
- Pengujian visual di perangkat Android nyata tetap diperlukan; audit ini tidak mengklaim pengujian visual manual.
