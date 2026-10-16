# Changelog V16.5.25

- Baseline: V16.5.24.
- Audit awal menemukan layout peta sebelumnya memakai jalur horizontal, belum zig-zag atas/bawah.
- Figur pasien kini menerima koordinat baris vertikal sesuai indeks tahap aktif.
- Ditambahkan lapisan CSS responsif untuk penyusutan konten, batas modal, tabel dengan area gulir, navbar, dan layout mobile lintas peran.
- Versi runtime, cache aset, dan Service Worker dinaikkan ke v16.5.25.
- Ditambahkan tes kontrak Stage 11 untuk responsivitas dan peta zig-zag.
- Catatan: pengujian kontrak statis dan syntax tidak menggantikan pengujian visual langsung di browser Android pada semua akun.

- Koreksi fallback saat semua tahap selesai: figur memilih tahap terakhir, bukan kembali ke titik awal.
- Semua skrip tes otomatis pada paket lulus setelah perubahan.
