/**
 * Model Fasilitas — kerusakan berulang (DPPL C06 getJumlahLaporan, C03 lihatFasilitasRusakBerulang;
 * Algo-007 + Q-006/Q-007, KF14).
 * Pemilik: P5. `getJumlahLaporan` juga dipakai P4 (skor) dan seed — kontraknya jangan diubah.
 */
import { ATURAN, STATUS } from '@silembur/shared';

/** Kolom DTO Fasilitas (src/docs/API.md). */
export const KOLOM_FASILITAS = `
  id_fasilitas AS id,
  nama_fasilitas AS nama,
  kategori,
  lokasi_fasilitas AS lokasi,
  latitude,
  longitude,
  wilayah,
  jumlah_kerusakan_berulang AS "jumlahKerusakanBerulang",
  kandidat_evaluasi AS "kandidatEvaluasi"`;

/**
 * Algo-007: hitung laporan pada fasilitas dalam PERIODE_BERULANG_HARI terakhir (tanpa Ditolak/Digabung, Q-006),
 * simpan ke fasilitas (Q-007) beserta penanda kandidat evaluasi (>= AMBANG_BERULANG).
 * @returns {Promise<number>} jumlah laporan
 */
export async function getJumlahLaporan(db, idFasilitas) {
  if (!idFasilitas) return 0;
  const { rows } = await db.query(
    `SELECT COUNT(*) AS jumlah FROM laporan
      WHERE id_fasilitas = $1
        AND tanggal_laporan >= NOW() - make_interval(days => $2)
        AND status_laporan <> ALL($3)`,
    [idFasilitas, ATURAN.PERIODE_BERULANG_HARI, [STATUS.DITOLAK, STATUS.DIGABUNG]],
  );
  const jumlah = Number(rows[0].jumlah);
  await db.query(
    `UPDATE fasilitas SET jumlah_kerusakan_berulang = $1, kandidat_evaluasi = $2 WHERE id_fasilitas = $3`,
    [jumlah, jumlah >= ATURAN.AMBANG_BERULANG, idFasilitas],
  );
  return jumlah;
}

/**
 * KF14 / UC06: fasilitas kandidat evaluasi, urut jumlah kerusakan berulang terbanyak.
 * @param {{ limit?: number }} opsi  tanpa limit = semua
 */
export async function getFasilitasBerulang(db, { limit } = {}) {
  const params = [];
  let batas = '';
  if (Number.isInteger(limit) && limit > 0) {
    params.push(limit);
    batas = 'LIMIT $1';
  }
  const { rows } = await db.query(
    `SELECT ${KOLOM_FASILITAS}
       FROM fasilitas
      WHERE kandidat_evaluasi = TRUE
      ORDER BY jumlah_kerusakan_berulang DESC, id_fasilitas ASC
      ${batas}`,
    params,
  );
  return rows;
}
