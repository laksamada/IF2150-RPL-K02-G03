/**
 * LaporanController (bagian UC05) — laporan milik pelapor + riwayat penanganan.
 * Pemilik: P3. Kontrak: src/docs/API.md#uc05
 */
import { pool } from '../../db/pool.js';
import { Laporan } from '../../models/index.js';
import { HttpError, paramId } from '../../utils/http.js';

/** GET /api/laporan/saya -> { data: LaporanSaya[] } */
export async function daftarSaya(req, res) {
  const data = await Laporan.getDaftarLaporanSaya(pool, req.pengguna.id);
  res.json({ data });
}

/** GET /api/laporan/saya/:id -> { laporan: LaporanSaya & { riwayat, catatanVerifikasi } } ; 404 bila bukan miliknya */
export async function detailSaya(req, res) {
  const laporan = await Laporan.getDetailLaporanSaya(pool, { idLaporan: paramId(req), idPelapor: req.pengguna.id });
  if (!laporan) throw new HttpError(404, 'Laporan tidak ditemukan');
  res.json({ laporan });
}
