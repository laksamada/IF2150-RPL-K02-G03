/**
 * NotifikasiController — kotak masuk notifikasi pelapor (I-02 O-0201, KF07 sisi penerima).
 * Pendukung LaporanController/VerifikasiController. Pemilik: P3. Kontrak: src/docs/API.md#notifikasi
 */
import { pool } from '../db/pool.js';
import { Notifikasi } from '../models/index.js';
import { HttpError, paramId } from '../utils/http.js';

/** GET /api/notifikasi -> { data: Notifikasi[], belumDibaca } */
export async function daftarNotifikasi(req, res) {
  res.json(await Notifikasi.getNotifikasiPelapor(pool, req.pengguna.id));
}

/** PATCH /api/notifikasi/:id/dibaca -> 204 */
export async function tandaiDibaca(req, res) {
  const berhasil = await Notifikasi.tandaiDibaca(pool, { idNotifikasi: paramId(req), idPelapor: req.pengguna.id });
  if (!berhasil) throw new HttpError(404, 'Notifikasi tidak ditemukan');
  res.status(204).end();
}
