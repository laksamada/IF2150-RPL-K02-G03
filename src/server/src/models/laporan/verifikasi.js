 /*
 * Pemilik: P4.
 * Admin BOLEH melihat identitas pelapor (dibutuhkan untuk verifikasi & notifikasi).
 * Fungsi di file ini hanya dipakai controller /admin/* (KNF02).
 */
import { STATUS } from '@silembur/shared';
import { urlFoto } from '../../utils/http.js';
import { getKomponenSkor, hitungNilaiSkor } from '../skorPrioritas/skor.js';

const SELECT_ADMIN = `
  SELECT l.id_laporan, l.id_fasilitas, l.id_laporan_induk, l.foto_laporan, l.deskripsi_laporan,
         l.kategori_kerusakan, l.tanggal_laporan, l.status_laporan,
         lo.latitude, lo.longitude, lo.wilayah, lo.alamat,
         p.id_pengguna AS pelapor_id, p.nama AS pelapor_nama, p.email AS pelapor_email,
         f.nama_fasilitas, sp.skor
    FROM laporan l
    JOIN pengguna p ON p.id_pengguna = l.id_pelapor
    LEFT JOIN lokasi lo ON lo.id_laporan = l.id_laporan
    LEFT JOIN fasilitas f ON f.id_fasilitas = l.id_fasilitas
    LEFT JOIN skor_prioritas sp ON sp.id_laporan = l.id_laporan`;

function toLaporanAdmin(r) {
  return {
    id: r.id_laporan,
    kategori: r.kategori_kerusakan,
    deskripsi: r.deskripsi_laporan,
    foto: urlFoto(r.foto_laporan),
    status: r.status_laporan,
    tanggalLaporan: r.tanggal_laporan,
    lokasi:
      r.latitude === null || r.latitude === undefined
        ? null
        : { latitude: r.latitude, longitude: r.longitude, wilayah: r.wilayah, alamat: r.alamat },
    fasilitas: r.id_fasilitas ? { id: r.id_fasilitas, nama: r.nama_fasilitas } : null,
    pelapor: { id: r.pelapor_id, nama: r.pelapor_nama, email: r.pelapor_email },
    skor: r.skor ?? null,
    idLaporanInduk: r.id_laporan_induk,
  };
}

export async function getLaporanAdminById(db, idLaporan) {
  const { rows } = await db.query(`${SELECT_ADMIN} WHERE l.id_laporan = $1`, [idLaporan]);
  return rows[0] ? toLaporanAdmin(rows[0]) : null;
}
import { belumDiimplementasi } from '../../utils/http.js';

/** getLaporanMenungguVerifikasi(): daftar laporan per status (default "Menunggu Verifikasi"), terlama dulu. */
export async function getLaporanUntukAdmin(db, { status, keyword }) {
  const params = [status || STATUS.MENUNGGU_VERIFIKASI];
  let kondisi = 'l.status_laporan = $1';
  if (keyword) {
    // Escape wildcard LIKE agar kata kunci dicari apa adanya.
    params.push(`%${keyword.replace(/[\\%_]/g, '\\$&')}%`);
    kondisi += ' AND (l.deskripsi_laporan ILIKE $2 OR lo.alamat ILIKE $2)';
  }
  const { rows } = await db.query(
    `${SELECT_ADMIN} WHERE ${kondisi} ORDER BY l.tanggal_laporan ASC, l.id_laporan ASC`,
    params,
  );
  return rows.map(toLaporanAdmin);
  throw belumDiimplementasi('P4', 'getLaporanMenungguVerifikasi (KF06)');
}

/** Satu laporan sebagai DTO LaporanAdmin, null jika tidak ada. */
export async function getLaporanAdmin(db, idLaporan) {
  const { rows } = await db.query(`SELECT ${KOLOM_ADMIN} ${FROM_ADMIN} WHERE l.id_laporan = $1`, [idLaporan]);
  return rows[0] ? keLaporanAdmin(rows[0]) : null;
}

/**
 * Detail lengkap untuk I-06: LaporanAdmin + pratinjauSkor (hitungNilaiSkor dengan nilai saat ini, tidak disimpan;
 * gap G3) + riwayat status (terawal -> terakhir) + histori verifikasi. null jika laporan tidak ada.
 */
export async function getDetailLaporanAdmin(db, idLaporan) {
  const laporan = await getLaporanAdminById(db, idLaporan);
  if (!laporan) return null;

  const { kategori, ...komponen } = await getKomponenSkor(db, idLaporan);
  const pratinjauSkor = { nilai: hitungNilaiSkor({ kategori, ...komponen }), ...komponen };

  const riwayat = (
    await db.query(
      `SELECT id_riwayat AS id, status_lama AS "statusLama", status_baru AS "statusBaru",
              deskripsi_perubahan AS deskripsi, tanggal_perubahan AS tanggal
         FROM riwayat_status
        WHERE id_laporan = $1
        ORDER BY tanggal_perubahan ASC, id_riwayat ASC`,
      [idLaporan],
    )
  ).rows;

  const verifikasi = (
    await db.query(
      `SELECT v.keputusan, v.catatan_alasan AS catatan, v.waktu_verifikasi AS waktu, a.nama AS admin
         FROM verifikasi v
         JOIN pengguna a ON a.id_pengguna = v.id_admin
        WHERE v.id_laporan = $1
        ORDER BY v.waktu_verifikasi DESC, v.id_verifikasi DESC`,
      [idLaporan],
    )
  ).rows;

  return { ...laporan, pratinjauSkor, riwayat, verifikasi };
  throw belumDiimplementasi('P4', 'getDetailLaporan admin (I-06)');
}

/** Jumlah laporan "Menunggu Verifikasi" untuk badge notifikasi admin (UC02 langkah 1). */
export async function hitungLaporanBaru(db) {
  const { rows } = await db.query('SELECT COUNT(*) AS jumlah FROM laporan WHERE status_laporan = $1', [
    STATUS.MENUNGGU_VERIFIKASI,
  ]);
  return Number(rows[0].jumlah);
  throw belumDiimplementasi('P4', 'hitungLaporanBaru (badge admin)');
}
