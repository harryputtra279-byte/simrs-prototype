# CHANGELOG SIMRS PROTOTYPE V16.5.26

Baseline: V16.5.25 (paket dengan bug layout dan peta yang dilaporkan pengguna).

## Perbaikan
- Memperketat aturan lebar konten lintas peran agar kartu, formulir, topbar, modal, dan navbar menyusut sesuai viewport HP tanpa mengharuskan zoom out.
- Memperbaiki navbar Admin di layar sempit dengan menu aksi icon-only agar teks tidak keluar dari tombol.
- Mengganti pola jalur statis menjadi SVG dinamis dari titik tujuan aktual; koordinat node berselang-seling atas/bawah sampai tahap terakhir.
- Menyatukan renderer peta Rawat Jalan dengan renderer peta bersama untuk IGD dan Rawat Inap.
- Memperjelas figur manusia mini melalui gradien volume kepala, rambut, badan, lengan, kaki, dan sepatu.
- Peta Rawat Inap menggabungkan layanan penunjang hanya jika order/aktivitas benar-benar ada. Laboratorium dan Radiologi tidak ditambahkan bila tidak diminta; aturan kondisional IGD dan Rawat Jalan tetap dipertahankan.
- Menghapus batas `maximum-scale=1` agar zoom aksesibilitas browser tetap diizinkan.
- Menambahkan kontrak audit Stage 12 dan komentar/penanda pencarian kode pada perubahan utama.
- Versi runtime, aset, dan cache Service Worker dinaikkan ke V16.5.26.

## Tidak diubah
- README.md tidak diubah.
- Repository publik tidak diubah.
- Skema penyimpanan dan kredensial akun demo tidak diubah.
