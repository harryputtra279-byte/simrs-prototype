# Roadmap Kawasan 3D — SIMRS PROTOTYPE

Baseline sumber: V16.5.13. Perubahan ini merupakan versi turunan dan tidak menimpa baseline.

## Tahapan
1. Audit baseline dan pengamanan sumber.
2. Desain kawasan orisinal tanpa menyalin denah atau identitas arsitektur RSUD tertentu.
3. Model 3D/isometrik ringan sebagai modul terpisah.
4. Interaksi pemilihan gedung dan navigasi.
5. Rancangan timeline perjalanan pasien.
6. Integrasi dengan status kunjungan nyata dalam prototipe.
7. Optimasi HP, aksesibilitas, dan fallback 2D.
8. Uji regresi, integrasi, dokumentasi, dan rilis.

## Capaian paket ini
- Tahap 1: arsip baseline sumber dipertahankan sebagai input terpisah.
- Tahap 2: bentuk kawasan dan gedung merupakan komposisi konseptual orisinal.
- Tahap 3: prototipe isometrik ringan dibuat memakai SVG/CSS tanpa dependensi eksternal.
- Tahap 4: gedung dapat dipilih dengan mouse atau keyboard.
- Tahap 5: timeline perjalanan pasien statis untuk demonstrasi desain.

## Belum selesai
Tahap 6 belum terintegrasi ke Store/data kunjungan utama. Angka/status klinis tidak direkayasa; modul ini dengan jelas menandai sinkronisasi belum aktif. Tahap 7–8 perlu pengujian browser lintas perangkat dan uji regresi penuh.

## Penanda pencarian kode
- `PENCARIAN KODE: MODUL KAWASAN 3D`
- `PENCARIAN KODE: KAWASAN_3D_UNIT_DATA`
- `PENCARIAN KODE: KAWASAN_3D_SELECT`
