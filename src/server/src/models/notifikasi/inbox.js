/**
 * Model Notifikasi (C10) — kotak masuk pelapor: terimaNotifikasi() (I-02 O-0201).
 * Pemilik: P3.
 */

function keNotifikasi(row) {
  return {
    id: row.id_notifikasi,
    idLaporan: row.id_laporan,
    isiPesan: row.isi_pesan,
    dibaca: row.dibaca,
    waktuKirim: row.waktu_kirim,
  };
}

/**
 * Daftar notifikasi milik pelapor, terbaru dulu, beserta jumlah belum dibaca.
 * @returns {Promise<{ data: object[], belumDibaca: number }>}
 */
export async function getNotifikasiPelapor(db, idPelapor) {
  const { rows } = await db.query(
    `SELECT id_notifikasi, id_laporan, isi_pesan, dibaca, waktu_kirim
     FROM notifikasi
     WHERE id_pelapor = $1
     ORDER BY waktu_kirim DESC, id_notifikasi DESC`,
    [idPelapor],
  );

  // Kontrak API.md: GET /notifikasi -> { data: Notifikasi[], belumDibaca }, dipakai lonceng Beranda & layar Notifikasi.
  return { data: rows.map(keNotifikasi), belumDibaca: rows.filter((r) => !r.dibaca).length };
}

/** Tandai satu notifikasi milik pelapor sebagai dibaca. false jika bukan miliknya. */
export async function tandaiDibaca(db, { idNotifikasi, idPelapor }) {
  const { rows } = await db.query(
    `UPDATE notifikasi
     SET dibaca = TRUE
     WHERE id_notifikasi = $1 AND id_pelapor = $2
     RETURNING id_notifikasi`,
    [idNotifikasi, idPelapor],
  );

  return rows.length > 0;
}
