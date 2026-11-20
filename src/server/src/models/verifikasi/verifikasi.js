/**
 * Model Verifikasi (C07) — simpanVerifikasi, tahanLaporan, teruskanKePemerintah (Algo-002, Algo-008, Q-003).
 * Pemilik: P4.
 *
 * tahanLaporan() tidak butuh query: laporan yang tidak disetujui otomatis "tertahan" karena statusnya
 * (Ditolak / Perlu Revisi) tidak termasuk STATUS_PRIORITAS sehingga tidak tampil di daftar pemda (KF08).
 */
import { KEPUTUSAN, KEPUTUSAN_KE_STATUS, STATUS } from '@silembur/shared';
import { HttpError } from '../../utils/http.js';
import { getJumlahLaporan } from '../fasilitas/berulang.js';
import { ubahStatus } from '../laporan/status.js';
import { kirimNotifikasi } from '../notifikasi/kirim.js';
import { buatSkorAwal, hitungSkor } from '../skorPrioritas/skor.js';

/** Q-003: catat keputusan admin. @returns {Promise<number>} id_verifikasi */
export async function simpanVerifikasi(db, { idLaporan, idAdmin, keputusan, catatan }) {
  const { rows } = await db.query(
    `INSERT INTO verifikasi (id_laporan, id_admin, keputusan, catatan_alasan, waktu_verifikasi)
     VALUES ($1, $2, $3, $4, NOW())
     RETURNING id_verifikasi`,
    [idLaporan, idAdmin, keputusan, catatan ?? ''],
  );
  return rows[0].id_verifikasi;
}

/** Algo-008 teruskanKePemerintah(): buat skor awal (Q-008) lalu hitung skor (Algo-009). */
export async function teruskanKePemerintah(db, idLaporan) {
  await buatSkorAwal(db, idLaporan);
  return hitungSkor(db, idLaporan);
}

/**
 * Algo-002 tetapkanKeputusan + Algo-008 teruskanKePemerintah, dalam satu transaksi
 * (`db` WAJIB client dari withTransaction):
 *   1. pastikan laporan ada (404) dan masih "Menunggu Verifikasi" (409)
 *   2. simpanVerifikasi
 *   3. ubahStatus sesuai KEPUTUSAN_KE_STATUS (Disetujui -> Terverifikasi, Ditolak, Revisi -> Perlu Revisi)
 *   4. jika Disetujui: buatSkorAwal (Q-008) lalu hitungSkor; selain itu: Fasilitas.getJumlahLaporan (Algo-007)
 *   5. kirimNotifikasi ke pelapor berisi keputusan + catatan (KF07)
 * @returns {Promise<{ idLaporan: number, idVerifikasi: number, status: string, skor: number|null }>}
 */
export async function tetapkanKeputusan(db, { idLaporan, idAdmin, keputusan, catatan = '' }) {
  const statusBaru = KEPUTUSAN_KE_STATUS[keputusan];
  if (!statusBaru) throw new HttpError(400, 'Keputusan verifikasi tidak dikenal');
  const catatanBersih = (catatan ?? '').trim();
  if (keputusan !== KEPUTUSAN.DISETUJUI && !catatanBersih) {
    throw new HttpError(400, 'Catatan alasan wajib diisi untuk keputusan Ditolak atau Revisi');
  }

  const { rows } = await db.query(
    'SELECT id_pelapor, id_fasilitas, status_laporan FROM laporan WHERE id_laporan = $1 FOR UPDATE',
    [idLaporan],
  );
  if (rows.length === 0) throw new HttpError(404, `Laporan #${idLaporan} tidak ditemukan`);
  const { id_pelapor: idPelapor, id_fasilitas: idFasilitas, status_laporan: statusLama } = rows[0];
  if (statusLama !== STATUS.MENUNGGU_VERIFIKASI) {
    throw new HttpError(409, `Laporan #${idLaporan} tidak bisa diverifikasi karena berstatus "${statusLama}"`);
  }

  const idVerifikasi = await simpanVerifikasi(db, { idLaporan, idAdmin, keputusan, catatan: catatanBersih });

  await ubahStatus(db, {
    idLaporan,
    statusBaru,
    deskripsi: catatanBersih ? `${keputusan}. Catatan: ${catatanBersih}` : `${keputusan}.`,
    idPengguna: idAdmin,
  });

  // Disetujui menghitung ulang kerusakan berulang lewat hitungSkor; Ditolak/Revisi dihitung ulang di sini
  // agar laporan Ditolak langsung keluar dari hitungan fasilitas (KF14, Algo-007, gap G11).
  const skor = keputusan === KEPUTUSAN.DISETUJUI ? await teruskanKePemerintah(db, idLaporan) : null;
  if (keputusan !== KEPUTUSAN.DISETUJUI) await getJumlahLaporan(db, idFasilitas);

  await kirimNotifikasi(db, {
    idLaporan,
    idPelapor,
    isiPesan: `Laporan #${idLaporan}: ${keputusan}. ${catatanBersih}`,
  });

  return { idLaporan, idVerifikasi, status: statusBaru, skor };
}
