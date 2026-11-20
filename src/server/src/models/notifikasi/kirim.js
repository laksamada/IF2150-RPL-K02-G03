/**
 * Model Notifikasi (C10) — kirimNotifikasi (Algo-011, Q-012, KF07).
 * Pemilik: P4. (Membaca/menandai dibaca ada di notifikasi/inbox.js milik P3.)
 */

/**
 * Simpan notifikasi untuk pelapor. Tidak mengirim jika isiPesan kosong (Algo-011).
 * @returns {Promise<number|null>} id_notifikasi, atau null bila tidak dikirim.
 */
export async function kirimNotifikasi(db, { idLaporan, idPelapor, isiPesan }) {
  const pesan = (isiPesan ?? '').trim();
  if (!pesan) return null;
  // Q-012
  const { rows } = await db.query(
    `INSERT INTO notifikasi (id_laporan, id_pelapor, isi_pesan, waktu_kirim)
     VALUES ($1, $2, $3, NOW())
     RETURNING id_notifikasi`,
    [idLaporan, idPelapor, pesan],
  );
  return rows[0].id_notifikasi;
}
