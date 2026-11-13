/**
 * Model RiwayatStatus (C09) — membaca riwayat perubahan status.
 * Menulis riwayat dilakukan oleh ubahStatus()/catatRiwayat() di models/laporan/status.js.
 * Pemilik: P3 (getRiwayatStatus untuk UC05). P5 membaca riwayat per fasilitas di models/fasilitas/riwayat.js.
 */

/** DTO Riwayat (lihat src/docs/API.md). Identitas pengubah tidak disertakan. */
export function toRiwayat(row) {
  return {
    id: row.id_riwayat,
    statusLama: row.status_lama,
    statusBaru: row.status_baru,
    deskripsi: row.deskripsi_perubahan,
    tanggal: row.tanggal_perubahan,
  };
}

/**
 * Laporan.getRiwayatStatus(): semua riwayat satu laporan, urut tanggal_perubahan naik (KF24, UC05 langkah 2).
 * @returns {Promise<object[]>} Riwayat[]
 */
export async function getRiwayatStatus(db, idLaporan) {
  const { rows } = await db.query(
    `SELECT id_riwayat, status_lama, status_baru, deskripsi_perubahan, tanggal_perubahan
     FROM riwayat_status
     WHERE id_laporan = $1
     ORDER BY tanggal_perubahan ASC, id_riwayat ASC`,
    [idLaporan],
  );

  return rows.map((r) => ({
    id: r.id_riwayat,
    statusLama: r.status_lama,
    statusBaru: r.status_baru,
    deskripsi: r.deskripsi_perubahan,
    tanggal: r.tanggal_perubahan,
  }));
}

/**
 * Algo-010 / Q-011 getPerubahan(): tanggal dan deskripsi satu entri riwayat.
 * @returns {Promise<{ id: number, tanggal: string, deskripsi: string }|null>} null jika tidak ada.
 */
export async function getPerubahan(db, idRiwayat) {
  const { rows } = await db.query(
    `SELECT id_riwayat, id_laporan, status_lama, status_baru, deskripsi_perubahan, tanggal_perubahan
     FROM riwayat_status WHERE id_riwayat = $1`,
    [idRiwayat],
  );

  return rows[0] ?? null;
}
