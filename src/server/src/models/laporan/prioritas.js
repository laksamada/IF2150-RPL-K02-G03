/**
 * Model Laporan — bagian prioritas pemerintah daerah (DPPL C04 getLaporanTerverifikasi, filterLaporan,
 * urutkanBerdasarkanPrioritas; Algo-003 + Q-004, Algo-005 sebagai ORDER BY skor DESC, gap G14).
 * Pemilik: P5.
 *
 * DTO yang dihasilkan: LaporanPrioritas (src/docs/API.md) — TANPA identitas pelapor (KNF02, gap G9).
 */
import { STATUS_PRIORITAS } from '@silembur/shared';
import { urlFoto } from '../../utils/http.js';

/** Kolom yang dipilih untuk LaporanPrioritas. Sengaja tidak menyentuh tabel pengguna / id_pelapor. */
const KOLOM = `
  l.id_laporan, l.kategori_kerusakan, l.deskripsi_laporan, l.foto_laporan, l.status_laporan, l.tanggal_laporan,
  lok.latitude, lok.longitude, lok.wilayah, lok.alamat,
  f.id_fasilitas, f.nama_fasilitas,
  sp.skor, sp.jumlah_pelapor, sp.lama_menunggu, sp.frekuensi_berulang`;

const FROM = `
  FROM laporan l
  JOIN lokasi lok ON lok.id_laporan = l.id_laporan
  LEFT JOIN fasilitas f ON f.id_fasilitas = l.id_fasilitas
  LEFT JOIN skor_prioritas sp ON sp.id_laporan = l.id_laporan`;

/** Baris SQL -> DTO LaporanPrioritas. `skor = null` bila laporan belum punya skor. */
export function toLaporanPrioritas(r) {
  return {
    id: r.id_laporan,
    kategori: r.kategori_kerusakan,
    deskripsi: r.deskripsi_laporan,
    foto: urlFoto(r.foto_laporan),
    status: r.status_laporan,
    tanggalLaporan: r.tanggal_laporan,
    lokasi: { latitude: r.latitude, longitude: r.longitude, wilayah: r.wilayah, alamat: r.alamat },
    fasilitas: r.id_fasilitas ? { id: r.id_fasilitas, nama: r.nama_fasilitas } : null,
    skor:
      r.skor === null || r.skor === undefined
        ? null
        : {
            nilai: r.skor,
            jumlahPelapor: r.jumlah_pelapor,
            lamaMenunggu: r.lama_menunggu,
            frekuensiBerulang: r.frekuensi_berulang,
          },
  };
}

/**
 * Algo-003 / Q-004 (+ pilihFilter, Algo-005 urutkanBerdasarkanPrioritas di SQL).
 * Tanpa filter status: Terverifikasi + Diproses (STATUS_PRIORITAS, gap G10).
 * @param {{ kategori?: string, wilayah?: string, status?: string }} filter
 */
export async function getLaporanTerverifikasi(db, { kategori, wilayah, status } = {}) {
  const params = [status ? [status] : [...STATUS_PRIORITAS]];
  const syarat = ['l.status_laporan = ANY($1)'];
  if (kategori) {
    params.push(kategori);
    syarat.push(`l.kategori_kerusakan = $${params.length}`);
  }
  if (wilayah) {
    params.push(wilayah);
    syarat.push(`lok.wilayah = $${params.length}`);
  }
  const { rows } = await db.query(
    `SELECT ${KOLOM} ${FROM}
      WHERE ${syarat.join(' AND ')}
      ORDER BY sp.skor DESC NULLS LAST, l.tanggal_laporan ASC, l.id_laporan ASC`,
    params,
  );
  return rows.map(toLaporanPrioritas);
}

/** Satu laporan sebagai LaporanPrioritas (status apa pun), null bila tidak ada. */
export async function getLaporanPrioritas(db, idLaporan) {
  const { rows } = await db.query(`SELECT ${KOLOM} ${FROM} WHERE l.id_laporan = $1`, [idLaporan]);
  return rows[0] ? toLaporanPrioritas(rows[0]) : null;
}

/** C06 getLaporan(): semua laporan yang menunjuk satu fasilitas, terbaru dulu. */
export async function getLaporanPerFasilitas(db, idFasilitas) {
  const { rows } = await db.query(
    `SELECT ${KOLOM} ${FROM}
      WHERE l.id_fasilitas = $1
      ORDER BY l.tanggal_laporan DESC, l.id_laporan DESC`,
    [idFasilitas],
  );
  return rows.map(toLaporanPrioritas);
}

/**
 * KF17: id laporan prioritas yang skornya dihitung lebih dari `menit` menit lalu
 * (dihitung ulang oleh controller memakai SkorPrioritas.hitungSkor).
 */
export async function getIdSkorKadaluarsa(db, { menit = 60 } = {}) {
  const { rows } = await db.query(
    `SELECT sp.id_laporan
       FROM skor_prioritas sp
       JOIN laporan l ON l.id_laporan = sp.id_laporan
      WHERE l.status_laporan = ANY($1)
        AND sp.dihitung_pada < NOW() - make_interval(mins => $2)
      ORDER BY sp.id_laporan`,
    [[...STATUS_PRIORITAS], menit],
  );
  return rows.map((r) => r.id_laporan);
}
