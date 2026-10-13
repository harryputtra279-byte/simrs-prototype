# Audit & Perbaikan V16.5.12

## Baseline
- Dibangun dari `V16.5.11_SIMRS_DYNAMIC_THEME_BATIK_GLASS.zip`.
- `README.md` sengaja tidak diubah.
- Tidak menghapus modul atau mengganti alur unit lain yang tidak terkait.

## Perubahan
1. **Pendaftaran manual IGD** — pada workspace penerimaan IGD dan workspace triase, petugas yang berwenang dapat memilih `Daftarkan pasien baru secara manual`. Form mendukung nama wajib, NIK opsional, jenis kelamin, tanggal lahir, telepon, dan alamat. Pasien tanpa identitas lengkap tetap mengikuti SOP penanganan darurat dan verifikasi identitas RS. Cek NIK duplikat dan episode IGD aktif ditambahkan.
2. **Tema Batik Glassmorphism** — total 20 tema motif Nusantara.
3. **Tema Nature Glassmorphism** — kategori baru berisi 20 tema.
4. **Modal tema** — klik di luar dialog dan tombol Escape menutup jendela; menutup modal mengembalikan pratinjau yang belum disimpan ke tema aktif.
5. **Kode dan cache** — komentar `PENCARIAN KODE`, gaya responsif, dan cache runtime dinaikkan ke V16.5.12.

## Validasi yang dilakukan
- Pemeriksaan sintaks JavaScript untuk semua berkas JS dengan Node.js bila tersedia.
- Pemeriksaan struktur ZIP dan daftar file.
- Pemeriksaan kontrak statis untuk kategori 60/20/20, field pasien manual, backdrop-dismiss, dan README tidak berubah.
- Belum merupakan validasi klinis atau uji klik lintas browser/Android. Sebelum penggunaan nyata, alur registrasi IGD harus ditinjau oleh petugas klinis/administrasi rumah sakit dan disesuaikan dengan SOP yang berlaku.
