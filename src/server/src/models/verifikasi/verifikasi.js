/**
 * Model Verifikasi (C07) — simpanVerifikasi, tahanLaporan, teruskanKePemerintah (Algo-002, Algo-008, Q-003).
 * Pemilik: P4.
 *
 * tahanLaporan() tidak butuh query: laporan yang tidak disetujui otomatis "tertahan" karena statusnya
 * (Ditolak / Perlu Revisi) tidak termasuk STATUS_PRIORITAS sehingga tidak tampil di daftar pemda (KF08).
 */
import { KEPUTUSAN, KEPUTUSAN_KE_STATUS, STATUS } from '@silembur/shared';
import { HttpError } from '../../utils/http.js';
import { ubahStatus } from '../laporan/status.js';
import { kirimNotifikasi } from '../notifikasi/kirim.js';
import { buatSkorAwal, hitungSkor } from '../skorPrioritas/skor.js';

/** Q-003: catat keputusan admin. @returns {Promise<number>} id_verifikasi */
export async function simpanVerifikasi(db, { idLaporan, idAdmin, keputusan, catatan }) {
  const { rows } = await db.query(
    `INSERT INTO verifikasi (id_laporan, id_admin, keputusan, catatan_alasan)
     VALUES ($1, $2, $3, $4) RETURNING id_verifikasi`,
    [idLaporan, idAdmin, keputusan, catatan ?? ''],
  );
  return rows[0].id_verifikasi;
}

/**
 * Algo-002 tetapkanKeputusan + Algo-008 teruskanKePemerintah, dalam satu transaksi:
 *   1. simpanVerifikasi
 *   2. ubahStatus sesuai KEPUTUSAN_KE_STATUS (Disetujui -> Terverifikasi, Ditolak, Revisi -> Perlu Revisi)
 *   3. jika Disetujui: buatSkorAwal (Q-008) lalu hitungSkor
 *   4. kirimNotifikasi ke pelapor berisi keputusan + catatan (KF07)
 * Laporan yang belum Terverifikasi otomatis "tertahan" karena tidak masuk STATUS_PRIORITAS (KF08).
 *
 * WAJIB dipanggil dengan `client` dari withTransaction().
 * @returns {Promise<{ skor: number|null }>}
 * @throws HttpError 404 bila laporan tidak ada, 409 bila status bukan "Menunggu Verifikasi".
 */
export async function tetapkanKeputusan(db, { idLaporan, idAdmin, keputusan, catatan }) {
  // Kunci baris: dua admin yang memutuskan bersamaan tidak bisa sama-sama lolos.
  const { rows } = await db.query(
    'SELECT id_pelapor, status_laporan FROM laporan WHERE id_laporan = $1 FOR UPDATE',
    [idLaporan],
  );
  if (rows.length === 0) throw new HttpError(404, `Laporan #${idLaporan} tidak ditemukan`);
  const { id_pelapor: idPelapor, status_laporan: statusSekarang } = rows[0];
  if (statusSekarang !== STATUS.MENUNGGU_VERIFIKASI) {
    throw new HttpError(
      409,
      `Laporan #${idLaporan} berstatus "${statusSekarang}"; hanya laporan "${STATUS.MENUNGGU_VERIFIKASI}" yang bisa diverifikasi`,
    );
  }

  const catatanBersih = (catatan ?? '').trim();
  await simpanVerifikasi(db, { idLaporan, idAdmin, keputusan, catatan: catatanBersih });
  await ubahStatus(db, {
    idLaporan,
    statusBaru: KEPUTUSAN_KE_STATUS[keputusan],
    deskripsi: catatanBersih ? `${keputusan}. Catatan: ${catatanBersih}` : `${keputusan}.`,
    idPengguna: idAdmin,
  });

  let skor = null;
  if (keputusan === KEPUTUSAN.DISETUJUI) {
    await buatSkorAwal(db, idLaporan);
    skor = await hitungSkor(db, idLaporan);
  }

  await kirimNotifikasi(db, {
    idLaporan,
    idPelapor,
    isiPesan: `Laporan #${idLaporan}: ${keputusan}.${catatanBersih ? ` ${catatanBersih}` : ''}`,
  });
  return { skor };
}
