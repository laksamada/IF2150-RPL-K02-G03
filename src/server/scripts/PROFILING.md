# Profiling Q-004 — daftar prioritas pemda (UC03, M9 B.2.1)

Pemilik: P5. Indeks hasil profiling: `src/db/migrations/501_indeks_prioritas.sql`.

## Cara mengulang

Profiling dilakukan di basis data terpisah agar DB dev/demo tetap bersih.

```bash
# dari src/server
psql -h localhost -U postgres -c "CREATE DATABASE silembur_profiling OWNER silembur"
export DATABASE_URL=postgres://silembur:silembur@localhost:5432/silembur_profiling
node src/db/migrate.js            # SEBELUM: sementara keluarkan 501_*.sql dari folder migrations
node src/db/seed.js
node scripts/isiDataBesar.js      # +10.000 laporan fiktif (deterministik), lalu ANALYZE
# ukur EXPLAIN ANALYZE Q-004 + curl -w "%{time_total}" (lihat di bawah)
node src/db/migrate.js            # SESUDAH: menjalankan 501_indeks_prioritas.sql, lalu ANALYZE dan ukur ulang
psql -h localhost -U postgres -c "DROP DATABASE silembur_profiling"
```

## Lingkungan & data

- PostgreSQL 18.0 lokal (macOS, Apple Silicon), Node.js v26, server Express di port terpisah.
- Data: seed + `isiDataBesar.js` = **10.016 laporan** (Menunggu 1.522, Perlu Revisi 515, Ditolak 1.001,
  Terverifikasi 1.965, Diproses 1.564, Selesai 2.964, Digabung 485), 10.016 lokasi, 6.493 skor, 128 fasilitas,
  30 kecamatan × 4 kategori.
- Query yang diukur = SQL `getLaporanTerverifikasi` (models/laporan/prioritas.js): `laporan JOIN lokasi
  LEFT JOIN fasilitas LEFT JOIN skor_prioritas WHERE status_laporan = ANY('{Terverifikasi,Diproses}') [AND kategori] [AND wilayah]
  ORDER BY skor DESC NULLS LAST`.
- Angka = median 30 kali `EXPLAIN (ANALYZE)` (buffer sudah hangat); waktu endpoint = median 20 kali
  `curl -w "%{time_total}"` dengan token pemda.

## Hasil EXPLAIN ANALYZE

| Kasus Q-004 | Baris | Sebelum (eksekusi) | Rencana sebelum | Sesudah (eksekusi) | Rencana sesudah |
| :--- | ---: | ---: | :--- | ---: | :--- |
| kategori + wilayah (Jalan Berlubang, Coblong) | 26 | 0,834 ms | Seq Scan `laporan` (buang 9.102 baris) + Seq Scan `lokasi` (buang 9.663 baris), Hash Join | **0,187 ms** | Bitmap Index Scan `idx_laporan_status_kategori` + Bitmap Index Scan `idx_lokasi_wilayah`, Hash Join |
| wilayah saja (Coblong) | 130 | 0,991 ms | Seq Scan `laporan` + Seq Scan `lokasi` | **0,455 ms** | Bitmap Index Scan pada kedua indeks |
| kategori saja | 914 | 1,906 ms | Seq Scan `laporan`, `lokasi`, `skor_prioritas` | **1,534 ms** | Bitmap Index Scan `idx_laporan_status_kategori`; `lokasi` tetap Seq Scan (perlu semua baris) |
| tanpa filter (tampilan awal I-08) | 3.529 | 3,858 ms | Seq Scan semua tabel, Sort quicksort 1 MB | 3,619 ms | Bitmap Index Scan `laporan`; sisanya Seq Scan (35% tabel terpilih, wajar) |
| KF17 cari skor kedaluwarsa (> 1 jam) | 0 | 0,201 ms | Seq Scan `skor_prioritas` (6.493 baris) | **0,003 ms** | Index Scan `idx_skor_prioritas_dihitung` |

Planning time stabil ±0,09 ms di semua kasus.

Kesimpulan: kasus yang diminta (filter kategori + wilayah) **4,5× lebih cepat** (0,83 → 0,19 ms) karena dua Seq Scan
berubah menjadi Bitmap Index Scan. Indeks `skor_prioritas (skor DESC)` yang sempat diuji **tidak pernah dipakai**
planner (pengurutan dilakukan setelah filter + join, pada ≤ 3.529 baris, quicksort di memori), sehingga tidak
dimasukkan ke migrasi 501.

## Waktu respons endpoint (`curl -w "%{time_total}"`)

| Endpoint | Data | Sebelum (median / maks) | Sesudah (median / maks) |
| :--- | ---: | ---: | ---: |
| `GET /api/prioritas?kategori=Jalan Berlubang&wilayah=Coblong` | 26 | 2,6 / 3,1 ms | **1,6 / 2,0 ms** |
| `GET /api/prioritas?wilayah=Coblong` | 130 | 3,0 / 3,4 ms | **2,2 / 2,4 ms** |
| `GET /api/prioritas` | 3.529 | 15,2 / 16,6 ms | 15,4 / 17,0 ms (didominasi serialisasi JSON ±3.500 laporan) |
| `GET /api/fasilitas/berulang` | 121 | 1,0 / 1,2 ms | 0,9 / 1,3 ms |

Semua jauh di bawah target KNF03 (< 4 detik) dan batas timeout mobile 5 detik.

## Temuan lain: hitung ulang skor KF17

`GET /api/prioritas` menghitung ulang skor yang `dihitung_pada`-nya lebih dari 1 jam (satu transaksi per laporan,
memakai `SkorPrioritas.hitungSkor`). Kasus terburuk — semua 3.529 skor prioritas kedaluwarsa sekaligus — membuat
satu permintaan **1,09 detik**; permintaan berikutnya kembali **17,6 ms** karena `dihitung_pada` sudah diperbarui.
Masih di bawah KNF03, tetapi tumbuh linear terhadap jumlah laporan aktif. Bila data jauh lebih besar, opsi
lanjutan: hitung ulang berbasis himpunan (satu `UPDATE ... FROM`) atau dijadwalkan di latar belakang.
