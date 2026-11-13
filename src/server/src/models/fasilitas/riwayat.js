/**
 * Model Fasilitas — pencarian & riwayat fasilitas (DPPL C06 cariFasilitas, getDetailFasilitas, getLaporan;
 * UC08, KF22, KF23).
 * Pemilik: P5. Tanpa identitas pelapor (KNF02, gap G9).
 */
import { PESAN } from '@silembur/shared';
import { getLaporanPerFasilitas } from '../laporan/prioritas.js';
import { KOLOM_FASILITAS } from './berulang.js';

/**
 * Cari fasilitas berdasarkan nama, lokasi, atau wilayah (ILIKE).
 * Bila keyword diisi tetapi tidak ada hasil -> pesan = PESAN.FASILITAS_TIDAK_DITEMUKAN (UC08 alternatif 1).
 * @param {{ keyword?: string, hanyaBerulang?: boolean }} filter
 * @returns {Promise<{ data: object[], pesan?: string }>}
 */
export async function cariFasilitas(db, { keyword, hanyaBerulang = false } = {}) {
  const kata = keyword?.trim() ?? '';
  const params = [];
  const syarat = [];
  if (kata) {
    // Karakter wildcard LIKE dari pengguna di-escape agar dicari apa adanya.
    params.push(`%${kata.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    syarat.push('(nama_fasilitas ILIKE $1 OR lokasi_fasilitas ILIKE $1 OR wilayah ILIKE $1)');
  }
  if (hanyaBerulang) syarat.push('kandidat_evaluasi = TRUE');

  const { rows } = await db.query(
    `SELECT ${KOLOM_FASILITAS}
       FROM fasilitas
      ${syarat.length ? `WHERE ${syarat.join(' AND ')}` : ''}
      ORDER BY kandidat_evaluasi DESC, jumlah_kerusakan_berulang DESC, nama_fasilitas ASC`,
    params,
  );
  const hasil = { data: rows };
  if (kata && rows.length === 0) hasil.pesan = PESAN.FASILITAS_TIDAK_DITEMUKAN;
  return hasil;
}

/**
 * Detail fasilitas + laporan yang menunjuknya + riwayat status semua laporan itu, terbaru dulu (KF23).
 * @returns {Promise<{ fasilitas, laporan, riwayat } | null>} null bila fasilitas tidak ada.
 */
export async function getDetailFasilitas(db, idFasilitas) {
  const { rows } = await db.query(`SELECT ${KOLOM_FASILITAS} FROM fasilitas WHERE id_fasilitas = $1`, [idFasilitas]);
  if (rows.length === 0) return null;

  const laporan = await getLaporanPerFasilitas(db, idFasilitas);
  const riwayat = await db.query(
    `SELECT rs.id_riwayat AS id,
            rs.id_laporan AS "idLaporan",
            rs.status_lama AS "statusLama",
            rs.status_baru AS "statusBaru",
            rs.deskripsi_perubahan AS deskripsi,
            rs.tanggal_perubahan AS tanggal
       FROM riwayat_status rs
       JOIN laporan l ON l.id_laporan = rs.id_laporan
      WHERE l.id_fasilitas = $1
      ORDER BY rs.tanggal_perubahan DESC, rs.id_riwayat DESC`,
    [idFasilitas],
  );
  return { fasilitas: rows[0], laporan, riwayat: riwayat.rows };
}
