/**
 * Model SkorPrioritas (C08) — Algo-009 hitungSkor, Q-008, Q-009, Q-010 (KF16, KF17).
 * Pemilik: P4.
 *
 * Kontrak untuk pemanggil lain (P1 setelah gabung duplikat, P5 saat refresh daftar prioritas):
 *   await hitungSkor(db, idLaporan)  -> Promise<number|null>   (null jika laporan belum punya skor)
 *
 * Skor selalu dihitung server, tidak pernah diinput admin (gap G3).
 */
//import { belumDiimplementasi } from '../../utils/http.js';

import { BOBOT_KATEGORI } from '@silembur/shared';
import { getJumlahLaporan } from '../fasilitas/berulang.js';

/**
 * Bagian murni Algo-009 (tanpa DB), mudah diuji:
 *   skor = bobotKategori + 5*jumlahPelapor + 2*lamaMenunggu + 10*frekuensiBerulang
 * Kategori di luar tabel bobot memakai bobot "Lainnya" (cabang `else` Algo-009).
 */
export function hitungNilaiSkor({ kategori, jumlahPelapor, lamaMenunggu, frekuensiBerulang }) {
  const bobot = BOBOT_KATEGORI[kategori];
  if (bobot === undefined) throw new Error(`Kategori tidak dikenal: ${kategori}`);
  return bobot + 5 * jumlahPelapor + 2 * lamaMenunggu + 10 * frekuensiBerulang;
}


/** Q-008: buat baris skor awal saat laporan disetujui. */
export async function buatSkorAwal(db, idLaporan) {
  await db.query(
    'INSERT INTO skor_prioritas (id_laporan) VALUES ($1) ON CONFLICT (id_laporan) DO NOTHING',
    [idLaporan],
  );
}

/**
 * Komponen skor laporan saat ini TANPA menyimpan apa pun ke skor_prioritas
 * (dipakai hitungSkor dan pratinjau skor read-only di I-06, gap G3).
 * jumlahPelapor = 1 + laporan tergabung (Q-009); lamaMenunggu = hari penuh sejak tanggal_laporan;
 * frekuensiBerulang = getJumlahLaporan(fasilitas).
 * @returns {Promise<{kategori:string, jumlahPelapor:number, lamaMenunggu:number, frekuensiBerulang:number}|null>}
 */
export async function getKomponenSkor(db, idLaporan) {
  const { rows } = await db.query(
    `SELECT l.kategori_kerusakan, l.id_fasilitas,
            1 + (SELECT COUNT(*) FROM laporan t WHERE t.id_laporan_induk = l.id_laporan) AS jumlah_pelapor,
            GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NOW() - l.tanggal_laporan)) / 86400))::int AS lama_menunggu
       FROM laporan l
      WHERE l.id_laporan = $1`,
    [idLaporan],
  );
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    kategori: r.kategori_kerusakan,
    jumlahPelapor: Number(r.jumlah_pelapor),
    lamaMenunggu: Number(r.lama_menunggu),
    frekuensiBerulang: await getJumlahLaporan(db, r.id_fasilitas),
  };
}

/**
 * Algo-009 lengkap: jumlahPelapor = 1 + laporan tergabung (Q-009), lamaMenunggu = hari sejak tanggal_laporan,
 * frekuensiBerulang = getJumlahLaporan(fasilitas) (models/fasilitas/berulang.js), simpan (Q-010).
 * @returns {Promise<number|null>} null bila laporan belum punya baris skor_prioritas.
 */
export async function hitungSkor(db, idLaporan) {
  const ada = await db.query('SELECT 1 FROM skor_prioritas WHERE id_laporan = $1', [idLaporan]);
  if (ada.rowCount === 0) return null;

  const komponen = await getKomponenSkor(db, idLaporan);
  if (!komponen) return null;
  const nilai = hitungNilaiSkor(komponen);

  await db.query(
    `UPDATE skor_prioritas
        SET jumlah_pelapor = $2, lama_menunggu = $3, frekuensi_berulang = $4, skor = $5, dihitung_pada = NOW()
      WHERE id_laporan = $1`,
    [idLaporan, komponen.jumlahPelapor, komponen.lamaMenunggu, komponen.frekuensiBerulang, nilai],
  );
  return nilai;
}

/** getSkor(): baca skor tersimpan. */
export async function getSkor(db, idLaporan) {
  const { rows } = await db.query('SELECT skor FROM skor_prioritas WHERE id_laporan = $1', [idLaporan]);
  return rows[0]?.skor ?? null;
}
