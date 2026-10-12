# Audit Alur Real-Life — V16.5.2

## Sudah diperbaiki pada versi ini
1. Resep Rawat Inap dipisahkan dari instruksi non-obat dan tetap terikat pada episode admisi.
2. Resep IGD ditampilkan sebagai kartu mandiri di atas diagnosis.
3. Pemilihan bed admisi dilakukan bertahap melalui master gedung, lantai, ruang, dan bed kosong.
4. Validasi role, episode aktif, master obat, jumlah, aturan pakai, duplikasi obat, dan stok master demo ditambahkan pada penyimpanan resep Rawat Inap.

## Perlu validasi kebijakan rumah sakit
- Penempatan gedung berdasarkan penjamin pada prototype (A vs B/C) bukan standar universal; sesuaikan dengan kebijakan dan kontrak RS.
- Ketersediaan bed di sistem nyata perlu status dibersihkan, isolasi, reservasi, dan validasi serentak di backend. Prototype lokal hanya mensimulasikan status dasar.
- Resep nyata perlu dosis terstruktur, satuan, rute, frekuensi, durasi, alergi, interaksi, formularium, substitusi, serta verifikasi farmasis.
- Administrasi obat rawat inap harus merekam jadwal, dosis yang benar-benar diberikan, petugas, waktu, penolakan/penundaan, dan alasan.
- Audit trail localStorage bukan pengganti log server yang tidak dapat diubah.
- Tidak ada klaim siap produksi; pengujian klinis dan keamanan perlu dilakukan sebelum penggunaan nyata.
