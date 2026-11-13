/**
 * Skrip profiling (M9 B.2.1): menambah ±10.000 laporan FIKTIF agar Q-004 (GET /api/prioritas) bisa diukur
 * dengan EXPLAIN ANALYZE. BUKAN migrasi; jalankan hanya ke basis data pengembangan/profiling.
 * Pemilik: P5. Hasil pengukuran: scripts/PROFILING.md.
 *
 *   cd src/server
 *   DATABASE_URL=postgres://silembur:silembur@localhost:5432/silembur_profiling node scripts/isiDataBesar.js [jumlah]
 *
 * Data dibuat deterministik (PRNG ber-seed) sehingga pengukuran bisa diulang. Insert memakai parameter
 * dan dikirim per batch (unnest array) di dalam satu transaksi.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEMUA_KATEGORI, SEMUA_STATUS, STATUS } from '@silembur/shared';
import { KECAMATAN_BANDUNG } from '../src/adapters/wilayahBandung.js';
import { pool, withTransaction } from '../src/db/pool.js';

const UKURAN_BATCH = 1000;
const FOTO = {
  'Jalan Berlubang': 'seed/jalan-berlubang.png',
  'Lampu Jalan Mati': 'seed/lampu-jalan-mati.png',
  'Pohon Tumbang': 'seed/pohon-tumbang.png',
  Lainnya: 'seed/lainnya.png',
};
// Sebaran status mendekati kondisi nyata: sebagian besar laporan sudah lewat alur verifikasi.
const BOBOT_STATUS = {
  [STATUS.MENUNGGU_VERIFIKASI]: 15,
  [STATUS.PERLU_REVISI]: 5,
  [STATUS.DITOLAK]: 10,
  [STATUS.TERVERIFIKASI]: 20,
  [STATUS.DIPROSES]: 15,
  [STATUS.SELESAI]: 30,
  [STATUS.DIGABUNG]: 5,
};
const PUNYA_SKOR = new Set([STATUS.TERVERIFIKASI, STATUS.DIPROSES, STATUS.SELESAI]);

/** PRNG mulberry32 agar data sama setiap kali dijalankan. */
function buatAcak(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pilihBerbobot(acak, bobot) {
  const total = Object.values(bobot).reduce((a, b) => a + b, 0);
  let r = acak() * total;
  for (const [k, w] of Object.entries(bobot)) {
    r -= w;
    if (r < 0) return k;
  }
  return Object.keys(bobot).at(-1);
}

export async function isiDataBesar({ jumlah = 10_000, log = console.log } = {}) {
  const acak = buatAcak(20261111);
  const pilih = (arr) => arr[Math.floor(acak() * arr.length)];

  await withTransaction(async (db) => {
    const { rows: pelapor } = await db.query(`SELECT id_pengguna FROM pengguna WHERE peran = 'PELAPOR'`);
    if (pelapor.length === 0) throw new Error('Belum ada pengguna PELAPOR. Jalankan "npm run db:seed" dahulu.');
    const idPelapor = pelapor.map((p) => p.id_pengguna);

    // Satu fasilitas per (kecamatan, kategori) agar laporan tersebar ke 120 fasilitas.
    const fasilitas = [];
    for (const kec of KECAMATAN_BANDUNG) {
      for (const kategori of SEMUA_KATEGORI) {
        const { rows } = await db.query(
          `INSERT INTO fasilitas (nama_fasilitas, kategori, lokasi_fasilitas, latitude, longitude, wilayah)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_fasilitas`,
          [`[Profiling] ${kategori} ${kec.nama}`, kategori, `Jl. Profiling, ${kec.nama}`, kec.lat, kec.lng, kec.nama],
        );
        fasilitas.push({ id: rows[0].id_fasilitas, kategori, kec });
      }
    }

    let dibuat = 0;
    while (dibuat < jumlah) {
      const n = Math.min(UKURAN_BATCH, jumlah - dibuat);
      const kolom = { pelapor: [], fasilitas: [], foto: [], deskripsi: [], kategori: [], hari: [], status: [] };
      const lok = { lat: [], lng: [], wilayah: [], alamat: [] };
      for (let i = 0; i < n; i++) {
        const f = pilih(fasilitas);
        const status = pilihBerbobot(acak, BOBOT_STATUS);
        kolom.pelapor.push(pilih(idPelapor));
        kolom.fasilitas.push(f.id);
        kolom.foto.push(FOTO[f.kategori]);
        kolom.deskripsi.push(`Laporan fiktif profiling #${dibuat + i + 1}: ${f.kategori.toLowerCase()} di ${f.kec.nama}.`);
        kolom.kategori.push(f.kategori);
        kolom.hari.push(Math.round(acak() * 180 * 10) / 10);
        kolom.status.push(status);
        lok.lat.push(Number((f.kec.lat + (acak() - 0.5) * 0.01).toFixed(6)));
        lok.lng.push(Number((f.kec.lng + (acak() - 0.5) * 0.01).toFixed(6)));
        lok.wilayah.push(f.kec.nama);
        lok.alamat.push(`Jl. Profiling No. ${1 + Math.floor(acak() * 200)}, ${f.kec.nama}`);
      }

      const { rows } = await db.query(
        `INSERT INTO laporan (id_pelapor, id_fasilitas, foto_laporan, deskripsi_laporan, kategori_kerusakan,
                              tanggal_laporan, status_laporan, diperbarui_pada)
         SELECT p, f, ft, d, k, NOW() - make_interval(secs => h * 86400), s, NOW()
           FROM unnest($1::int[], $2::int[], $3::text[], $4::text[], $5::text[], $6::float8[], $7::text[])
                AS t(p, f, ft, d, k, h, s)
         RETURNING id_laporan, status_laporan, tanggal_laporan`,
        [kolom.pelapor, kolom.fasilitas, kolom.foto, kolom.deskripsi, kolom.kategori, kolom.hari, kolom.status],
      );
      const id = rows.map((r) => r.id_laporan);

      await db.query(
        `INSERT INTO lokasi (id_laporan, koordinat, latitude, longitude, wilayah, alamat, sumber)
         SELECT i, la::text || ',' || ln::text, la, ln, w, a, 'GPS'
           FROM unnest($1::int[], $2::numeric[], $3::numeric[], $4::text[], $5::text[]) AS t(i, la, ln, w, a)`,
        [id, lok.lat, lok.lng, lok.wilayah, lok.alamat],
      );

      await db.query(
        `INSERT INTO riwayat_status (id_laporan, status_lama, status_baru, deskripsi_perubahan, tanggal_perubahan)
         SELECT i, NULL, $2, 'Laporan berhasil diterima oleh sistem.', t
           FROM unnest($1::int[], $3::timestamptz[]) AS u(i, t)`,
        [id, STATUS.MENUNGGU_VERIFIKASI, rows.map((r) => r.tanggal_laporan)],
      );

      // Skor contoh (Algo-009 disederhanakan) untuk laporan yang sudah diteruskan ke pemda.
      const berskor = rows.filter((r) => PUNYA_SKOR.has(r.status_laporan));
      await db.query(
        `INSERT INTO skor_prioritas (id_laporan, jumlah_pelapor, lama_menunggu, frekuensi_berulang, skor)
         SELECT i, jp, lm, fb, sk FROM unnest($1::int[], $2::int[], $3::int[], $4::int[], $5::int[])
                AS t(i, jp, lm, fb, sk)`,
        [
          berskor.map((r) => r.id_laporan),
          berskor.map(() => 1 + Math.floor(acak() * 4)),
          berskor.map((r) => Math.floor((Date.now() - new Date(r.tanggal_laporan).getTime()) / 86_400_000)),
          berskor.map(() => Math.floor(acak() * 8)),
          berskor.map(() => 5 + Math.floor(acak() * 200)),
        ],
      );
      dibuat += n;
      log(`  ${dibuat}/${jumlah} laporan`);
    }

    // Q-007 untuk fasilitas profiling (sekali, berbasis himpunan).
    await db.query(
      `UPDATE fasilitas f
          SET jumlah_kerusakan_berulang = x.n, kandidat_evaluasi = x.n >= 3
         FROM (SELECT id_fasilitas, COUNT(*)::int AS n FROM laporan
                WHERE tanggal_laporan >= NOW() - INTERVAL '90 days' AND status_laporan <> ALL($1)
                GROUP BY id_fasilitas) x
        WHERE f.id_fasilitas = x.id_fasilitas AND f.nama_fasilitas LIKE '[Profiling]%'`,
      [[STATUS.DITOLAK, STATUS.DIGABUNG]],
    );
  });

  await pool.query('ANALYZE');
  const { rows } = await pool.query(
    `SELECT status_laporan, COUNT(*)::int AS n FROM laporan GROUP BY 1 ORDER BY array_position($1::text[], status_laporan)`,
    [[...SEMUA_STATUS]],
  );
  log('Sebaran status laporan sekarang:');
  for (const r of rows) log(`  ${r.status_laporan.padEnd(20)} ${r.n}`);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const jumlah = Number(process.argv[2]) || 10_000;
  isiDataBesar({ jumlah })
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
