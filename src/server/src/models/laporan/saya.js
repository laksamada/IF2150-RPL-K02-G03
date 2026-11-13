/**
 * Model Laporan — laporan milik pelapor + riwayatnya (UC05, KF12, KF13, KF24).
 * DPPL C01 Pelapor: bukaLaporan(), bukaRiwayatLaporan().
 * Pemilik: P3.
 */
import { getRiwayatStatus } from '../riwayatStatus/riwayat.js';
import { toLaporanPublik } from './publik.js';

// Catatan verifikasi = keputusan admin terakhir (dipakai untuk menampilkan alasan revisi/penolakan).
const SELECT_LAPORAN_SAYA = `
  SELECT l.id_laporan, l.kategori_kerusakan, l.deskripsi_laporan, l.foto_laporan, l.status_laporan,
         l.tanggal_laporan, l.diperbarui_pada, l.id_fasilitas, f.nama_fasilitas,
         lo.latitude, lo.longitude, lo.wilayah, lo.alamat,
         v.keputusan, v.catatan_alasan, v.waktu_verifikasi
    FROM laporan l
    LEFT JOIN lokasi lo ON lo.id_laporan = l.id_laporan
    LEFT JOIN fasilitas f ON f.id_fasilitas = l.id_fasilitas
    LEFT JOIN LATERAL (
      SELECT keputusan, catatan_alasan, waktu_verifikasi
        FROM verifikasi
       WHERE id_laporan = l.id_laporan
       ORDER BY waktu_verifikasi DESC, id_verifikasi DESC
       LIMIT 1
    ) v ON TRUE`;

/** DTO LaporanSaya = LaporanPublik + diperbaruiPada + catatanVerifikasi (lihat src/docs/API.md). */
export function toLaporanSaya(row) {
  return {
    ...toLaporanPublik(row),
    diperbaruiPada: row.diperbarui_pada,
    catatanVerifikasi: row.keputusan
      ? { keputusan: row.keputusan, catatan: row.catatan_alasan, waktu: row.waktu_verifikasi }
      : null,
  };
}

/** Daftar laporan milik idPelapor (semua status), terbaru dulu. */
export async function getDaftarLaporanSaya(db, idPelapor) {
  const { rows } = await db.query(
    `${SELECT_LAPORAN_SAYA}
      WHERE l.id_pelapor = $1
      ORDER BY l.tanggal_laporan DESC, l.id_laporan DESC`,
    [idPelapor],
  );
  return rows.map(toLaporanSaya);
}

/**
 * Detail laporan milik idPelapor + catatan verifikasi terakhir + riwayat (urut terawal -> terakhir).
 * null jika laporan bukan milik pelapor tersebut.
 */
export async function getDetailLaporanSaya(db, { idLaporan, idPelapor }) {
  const { rows } = await db.query(`${SELECT_LAPORAN_SAYA} WHERE l.id_laporan = $1 AND l.id_pelapor = $2`, [
    idLaporan,
    idPelapor,
  ]);
  if (rows.length === 0) return null;
  const riwayat = await getRiwayatStatus(db, idLaporan);
  return { ...toLaporanSaya(rows[0]), riwayat };
}
