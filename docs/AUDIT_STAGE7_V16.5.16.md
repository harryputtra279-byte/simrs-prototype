# Audit Tahap 7 — V16.5.16

## Tujuan
Mengurangi biaya efek visual dan meningkatkan aksesibilitas halaman kawasan 3D tanpa mengubah workflow bisnis SIMRS atau kontrak data.

## Perubahan yang diperiksa
1. **Performa:** mode `html.low-resource` menonaktifkan blur/transisi mahal saat `navigator.deviceMemory <= 2` atau `navigator.connection.saveData` aktif. Kedua API tidak wajib tersedia; kegagalan pemeriksaan tidak menghentikan halaman.
2. **Gerakan:** CSS `prefers-reduced-motion` menghormati preferensi sistem.
3. **Fallback visual:** panel tetap terbaca ketika `backdrop-filter` tidak didukung; mode `forced-colors` diberi batas yang terlihat.
4. **Keyboard:** gedung dapat dipilih dengan Enter/Space dan status pilihan dicerminkan melalui `aria-pressed`; kontrol form mempunyai fokus yang jelas.
5. **Responsif:** target kontrol minimal 42px; tata letak layar sangat kecil disesuaikan tanpa mengubah urutan modul aplikasi utama.
6. **Data:** adapter masih hanya membaca `simrs_db_v1`; tidak ada operasi `setItem`, `removeItem`, atau `clear` pada halaman kawasan.
7. **Dependensi:** halaman kawasan tidak menambahkan script/style eksternal.
8. **Versi/cache:** `index.html`, `PROTOTYPE_VERSION`, dan `SW_VERSION` disamakan menjadi `v16.5.16`; app shell tetap menyertakan `kawasan-3d.html`.

## Batas audit
Kontrak statis tidak dapat membuktikan performa frame-rate, pembacaan layar, perilaku sentuh, atau cache update di semua browser. Lakukan pengujian manual di Android kelas rendah, desktop, keyboard saja, reduced-motion, dan offline/online sebelum rilis final.
