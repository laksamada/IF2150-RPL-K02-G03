-- 501_indeks_prioritas.sql — indeks hasil profiling Q-004 (GET /api/prioritas, UC03). Pemilik: P5.
-- Dasar: EXPLAIN ANALYZE dengan ±10.000 laporan fiktif (scripts/isiDataBesar.js); detail di scripts/PROFILING.md.
-- Sebelum indeks: filter status+kategori dan filter wilayah memakai Seq Scan pada laporan & lokasi.
-- Indeks skor_prioritas (skor DESC) sempat diuji tetapi tidak dipakai planner (pengurutan terjadi setelah
-- filter + join pada ratusan baris), sehingga tidak dibuat.

-- Filter status (Terverifikasi/Diproses) + kategori kerusakan pada Q-004 (KF18, KF19).
CREATE INDEX idx_laporan_status_kategori ON laporan (status_laporan, kategori_kerusakan);

-- Filter wilayah (dropdown O-0801) pada Q-004; juga dipakai daftar laporan publik per wilayah.
CREATE INDEX idx_lokasi_wilayah ON lokasi (wilayah);

-- KF17: pencarian skor yang sudah lebih dari 1 jam sebelum daftar prioritas dimuat.
CREATE INDEX idx_skor_prioritas_dihitung ON skor_prioritas (dihitung_pada);
