/**
 * Model Laporan — sisi admin untuk verifikasi (UC02, KF06).
 * Pemilik: P4.
 * Admin BOLEH melihat identitas pelapor (dibutuhkan untuk verifikasi & notifikasi).
 * Fungsi di file ini hanya dipakai controller /admin/* (KNF02).
 */
import { STATUS } from '@silembur/shared';
import { urlFoto } from '../../utils/http.js';
import { getKomponenSkor, hitungNilaiSkor } from '../skorPrioritas/skor.js';

const KOLOM_ADMIN = `
  l.id_laporan, l.id_fasilitas, l.id_laporan_induk, l.foto_laporan, l.deskripsi_laporan,
  l.kategori_kerusakan, l.tanggal_laporan, l.status_laporan,
  lo.latitude, lo.longitude, lo.wilayah, lo.alamat,
  p.id_pengguna AS pelapor_id, p.nama AS pelapor_nama, p.email AS pelapor_email,
  sp.skor, f.nama_fasilitas`;

const FROM_ADMIN = `
  FROM laporan l
  JOIN pengguna p ON p.id_pengguna = l.id_pelapor
  LEFT JOIN lokasi lo ON lo.id_laporan = l.id_laporan
  LEFT JOIN skor_prioritas sp ON sp.id_laporan = l.id_laporan
  LEFT JOIN fasilitas f ON f.id_fasilitas = l.id_fasilitas`;

/** DTO LaporanAdmin (src/docs/API.md). */
function keLaporanAdmin(r) {
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

/** Escape karakter wildcard LIKE agar kata kunci dicari apa adanya. */
const escapeLike = (teks) => teks.replace(/[\\%_]/g, (c) => `\\${c}`);

/**
 * getLaporanMenungguVerifikasi(): daftar laporan per status (default "Menunggu Verifikasi"), terlama dulu
 * (antrean verifikasi). keyword dicari di deskripsi, alamat, wilayah, kategori, dan nama fasilitas.
 */
export async function getLaporanUntukAdmin(db, { status, keyword } = {}) {
  const params = [status || STATUS.MENUNGGU_VERIFIKASI];
  let syaratCari = '';
  const kata = keyword?.trim();
  if (kata) {
    params.push(`%${escapeLike(kata)}%`);
    syaratCari = `AND (l.deskripsi_laporan ILIKE $2 OR lo.alamat ILIKE $2 OR lo.wilayah ILIKE $2
                       OR l.kategori_kerusakan ILIKE $2 OR f.nama_fasilitas ILIKE $2)`;
  }
  const { rows } = await db.query(
    `SELECT ${KOLOM_ADMIN} ${FROM_ADMIN}
      WHERE l.status_laporan = $1 ${syaratCari}
      ORDER BY l.tanggal_laporan ASC, l.id_laporan ASC`,
    params,
  );
  return rows.map(keLaporanAdmin);
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
  const laporan = await getLaporanAdmin(db, idLaporan);
  if (!laporan) return null;

  const komponen = await getKomponenSkor(db, idLaporan);
  const pratinjauSkor = {
    nilai: hitungNilaiSkor(komponen),
    jumlahPelapor: komponen.jumlahPelapor,
    lamaMenunggu: komponen.lamaMenunggu,
    frekuensiBerulang: komponen.frekuensiBerulang,
  };

  const riwayat = await db.query(
    `SELECT id_riwayat, status_lama, status_baru, deskripsi_perubahan, tanggal_perubahan
       FROM riwayat_status
      WHERE id_laporan = $1
      ORDER BY tanggal_perubahan ASC, id_riwayat ASC`,
    [idLaporan],
  );
  const verifikasi = await db.query(
    `SELECT v.keputusan, v.catatan_alasan, v.waktu_verifikasi, a.nama AS nama_admin
       FROM verifikasi v
       JOIN pengguna a ON a.id_pengguna = v.id_admin
      WHERE v.id_laporan = $1
      ORDER BY v.waktu_verifikasi ASC, v.id_verifikasi ASC`,
    [idLaporan],
  );

  return {
    ...laporan,
    pratinjauSkor,
    riwayat: riwayat.rows.map((r) => ({
      id: r.id_riwayat,
      statusLama: r.status_lama,
      statusBaru: r.status_baru,
      deskripsi: r.deskripsi_perubahan,
      tanggal: r.tanggal_perubahan,
    })),
    verifikasi: verifikasi.rows.map((v) => ({
      keputusan: v.keputusan,
      catatan: v.catatan_alasan,
      waktu: v.waktu_verifikasi,
      admin: v.nama_admin,
    })),
  };
}

/** Jumlah laporan "Menunggu Verifikasi" untuk badge notifikasi admin (UC02 langkah 1). */
export async function hitungLaporanBaru(db) {
  const { rows } = await db.query('SELECT COUNT(*) AS jumlah FROM laporan WHERE status_laporan = $1', [
    STATUS.MENUNGGU_VERIFIKASI,
  ]);
  return Number(rows[0].jumlah);
}
