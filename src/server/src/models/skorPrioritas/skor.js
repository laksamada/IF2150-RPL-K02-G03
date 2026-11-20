/**
 * Model SkorPrioritas (C08) — Algo-009 hitungSkor, Q-008, Q-009, Q-010 (KF16, KF17).
 * Pemilik: P4.
 *
 * Kontrak untuk pemanggil lain (P1 setelah gabung duplikat, P5 saat refresh daftar prioritas):
 *   await hitungSkor(db, idLaporan)  -> Promise<number|null>   (null jika laporan belum punya skor)
 *
 * Skor selalu dihitung server, tidak pernah diinput admin (gap G3).
 */
import { BOBOT_KATEGORI, KATEGORI } from '@silembur/shared';
import { getJumlahLaporan } from '../fasilitas/berulang.js';

/**
 * Bagian murni Algo-009 (tanpa DB), mudah diuji:
 *   skor = bobotKategori + 5*jumlahPelapor + 2*lamaMenunggu + 10*frekuensiBerulang
 * Kategori di luar tabel bobot memakai bobot "Lainnya" (cabang `else` Algo-009).
 */
export function hitungNilaiSkor({ kategori, jumlahPelapor, lamaMenunggu, frekuensiBerulang }) {
  const bobotKategori = BOBOT_KATEGORI[kategori] ?? BOBOT_KATEGORI[KATEGORI.LAINNYA];
  return bobotKategori + 5 * jumlahPelapor + 2 * lamaMenunggu + 10 * frekuensiBerulang;
}

/** Q-008: buat baris skor awal saat laporan disetujui (idempoten bila baris sudah ada). */
export async function buatSkorAwal(db, idLaporan) {
  await db.query(
    `INSERT INTO skor_prioritas (id_laporan, jumlah_pelapor, lama_menunggu, frekuensi_berulang, skor)
     VALUES ($1, 1, 0, 0, 0)
     ON CONFLICT (id_laporan) DO NOTHING`,
    [idLaporan],
  );
}

/**
 * Komponen masukan Algo-009 untuk satu laporan, dibaca dari kondisi basis data saat ini.
 *  - jumlahPelapor     = 1 + jumlah laporan yang digabung ke laporan ini (Q-009)
 *  - lamaMenunggu      = hari penuh sejak tanggal_laporan (dibulatkan ke bawah)
 *  - frekuensiBerulang = Fasilitas.getJumlahLaporan(id_fasilitas)
 * @returns {Promise<{ kategori, jumlahPelapor, lamaMenunggu, frekuensiBerulang } | null>} null jika laporan tidak ada.
 */
export async function getKomponenSkor(db, idLaporan) {
  const { rows } = await db.query(
    `SELECT l.kategori_kerusakan, l.id_fasilitas,
            GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - l.tanggal_laporan)) / 86400))::int AS lama_menunggu,
            (SELECT COUNT(*) FROM laporan a WHERE a.id_laporan_induk = l.id_laporan) AS jumlah_tergabung
       FROM laporan l
      WHERE l.id_laporan = $1`,
    [idLaporan],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    kategori: r.kategori_kerusakan,
    jumlahPelapor: 1 + Number(r.jumlah_tergabung),
    lamaMenunggu: Number(r.lama_menunggu),
    frekuensiBerulang: await getJumlahLaporan(db, r.id_fasilitas),
  };
}

/**
 * Algo-009 lengkap: hitung ulang skor dari kondisi terkini lalu simpan (Q-010 + dihitung_pada).
 * @returns {Promise<number|null>} skor baru, atau null jika laporan belum punya baris skor_prioritas.
 */
export async function hitungSkor(db, idLaporan) {
  const ada = await db.query('SELECT 1 FROM skor_prioritas WHERE id_laporan = $1', [idLaporan]);
  if (ada.rowCount === 0) return null;

  const komponen = await getKomponenSkor(db, idLaporan);
  if (!komponen) return null;
  const skor = hitungNilaiSkor(komponen);

  await db.query(
    `UPDATE skor_prioritas
        SET jumlah_pelapor = $1, lama_menunggu = $2, frekuensi_berulang = $3, skor = $4, dihitung_pada = NOW()
      WHERE id_laporan = $5`,
    [komponen.jumlahPelapor, komponen.lamaMenunggu, komponen.frekuensiBerulang, skor, idLaporan],
  );
  return skor;
}

/** getSkor(): baca skor tersimpan. */
export async function getSkor(db, idLaporan) {
  const { rows } = await db.query('SELECT skor FROM skor_prioritas WHERE id_laporan = $1', [idLaporan]);
  return rows[0]?.skor ?? null;
}
