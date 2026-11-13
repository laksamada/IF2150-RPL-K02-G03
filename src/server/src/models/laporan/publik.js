/**
 * Model Laporan — tampilan publik tanpa identitas pelapor (UC04, KF10, KF11, KNF02).
 * Pemilik: P3.
 *
 * ATURAN KNF02: query di file ini TIDAK BOLEH memilih kolom pengguna (nama/email/id_pelapor),
 * dan respons wajib lewat toLaporanPublik(). Ada test yang memeriksa ini.
 */
import { STATUS, STATUS_PUBLIK } from '@silembur/shared';
import { urlFoto } from '../../utils/http.js';

/** Kelompok tab I-02 (O-0203) -> status laporan yang termasuk di dalamnya. */
export const KELOMPOK_STATUS_PUBLIK = Object.freeze({
  menunggu: [STATUS.MENUNGGU_VERIFIKASI],
  diproses: [STATUS.TERVERIFIKASI, STATUS.DIPROSES],
  selesai: [STATUS.SELESAI],
});

// Sengaja tanpa JOIN ke tabel pengguna (KNF02).
const KOLOM_PUBLIK = `
  l.id_laporan, l.kategori_kerusakan, l.deskripsi_laporan, l.foto_laporan, l.status_laporan,
  l.tanggal_laporan, l.id_fasilitas, f.nama_fasilitas,
  lo.latitude, lo.longitude, lo.wilayah, lo.alamat`;

const FROM_PUBLIK = `
  FROM laporan l
  LEFT JOIN lokasi lo ON lo.id_laporan = l.id_laporan
  LEFT JOIN fasilitas f ON f.id_fasilitas = l.id_fasilitas`;

/**
 * Daftar laporan publik (status di STATUS_PUBLIK), terbaru dulu (KF10, UC04 alt 1).
 * @param {{ kelompok?: 'menunggu'|'diproses'|'selesai', status?: string, wilayah?: string,
 *           kategori?: string, limit?: number, offset?: number }} filter
 * @returns {Promise<object[]>} LaporanPublik[]
 */
export async function getDaftarLaporanPublik(db, filter = {}) {
  const { kelompok, status, wilayah, kategori, limit = 20, offset = 0 } = filter;

  let daftarStatus = STATUS_PUBLIK;
  if (kelompok) daftarStatus = KELOMPOK_STATUS_PUBLIK[kelompok] ?? [];
  if (status) daftarStatus = daftarStatus.filter((s) => s === status);

  const params = [daftarStatus];
  const kondisi = ['l.status_laporan = ANY($1)'];
  if (wilayah) {
    params.push(wilayah);
    kondisi.push(`lo.wilayah = $${params.length}`);
  }
  if (kategori) {
    params.push(kategori);
    kondisi.push(`l.kategori_kerusakan = $${params.length}`);
  }
  params.push(limit, offset);

  const { rows } = await db.query(
    `SELECT ${KOLOM_PUBLIK} ${FROM_PUBLIK}
      WHERE ${kondisi.join(' AND ')}
      ORDER BY l.tanggal_laporan DESC, l.id_laporan DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  return rows.map(toLaporanPublik);
}

/** Detail satu laporan publik: foto, lokasi, deskripsi, status (KF11). null jika tidak ada/tidak publik. */
export async function getDetailLaporanPublik(db, idLaporan) {
  const { rows } = await db.query(
    `SELECT ${KOLOM_PUBLIK} ${FROM_PUBLIK}
      WHERE l.id_laporan = $1 AND l.status_laporan = ANY($2)`,
    [idLaporan, STATUS_PUBLIK],
  );
  return rows[0] ? toLaporanPublik(rows[0]) : null;
}

/**
 * Ringkasan jumlah laporan untuk kartu I-02 (O-0202).
 *  masuk    = laporan publik yang dibuat bulan ini
 *  diproses = Terverifikasi + Diproses
 *  selesai  = Selesai
 * @returns {Promise<{ masuk: number, diproses: number, selesai: number }>}
 */
export async function getRingkasanLaporan(db) {
  const { rows } = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status_laporan = ANY($1)
                          AND tanggal_laporan >= date_trunc('month', NOW())) AS masuk,
       COUNT(*) FILTER (WHERE status_laporan = ANY($2)) AS diproses,
       COUNT(*) FILTER (WHERE status_laporan = ANY($3)) AS selesai
     FROM laporan`,
    [STATUS_PUBLIK, KELOMPOK_STATUS_PUBLIK.diproses, KELOMPOK_STATUS_PUBLIK.selesai],
  );
  const { masuk, diproses, selesai } = rows[0];
  return { masuk, diproses, selesai };
}

/** DTO publik: hanya field yang aman ditampilkan. Bentuk lihat src/docs/API.md#laporanpublik */
export function toLaporanPublik(row) {
  return {
    id: row.id_laporan,
    kategori: row.kategori_kerusakan,
    deskripsi: row.deskripsi_laporan,
    foto: urlFoto(row.foto_laporan),
    status: row.status_laporan,
    tanggalLaporan: row.tanggal_laporan,
    lokasi:
      row.latitude === null || row.latitude === undefined
        ? null
        : { latitude: row.latitude, longitude: row.longitude, wilayah: row.wilayah, alamat: row.alamat },
    fasilitas: row.id_fasilitas ? { id: row.id_fasilitas, nama: row.nama_fasilitas } : null,
  };
}
