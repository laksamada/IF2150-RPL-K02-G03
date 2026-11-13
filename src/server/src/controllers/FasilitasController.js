/**
 * FasilitasController (DPPL Tabel 2.3): fasilitas rusak berulang (UC06, KF14) dan riwayat fasilitas
 * (UC08, KF22, KF23). Dipakai PEMDA dan ADMIN (gap G10).
 * Pemilik: P5. Kontrak: src/docs/API.md#uc06
 */
import { pool } from '../db/pool.js';
import { Fasilitas } from '../models/index.js';
import { HttpError, paramId } from '../utils/http.js';

/** GET /api/fasilitas?q=&berulang=true -> { data: Fasilitas[], pesan? } */
export async function daftarFasilitas(req, res) {
  const keyword = typeof req.query.q === 'string' ? req.query.q : '';
  const hanyaBerulang = req.query.berulang === 'true';
  const hasil = await Fasilitas.cariFasilitas(pool, { keyword, hanyaBerulang });
  res.json(hasil);
}

/** GET /api/fasilitas/berulang?limit= -> { data: Fasilitas[] } kandidat evaluasi, jumlah terbanyak dulu */
export async function fasilitasBerulang(req, res) {
  const limit = Number(req.query.limit);
  const data = await Fasilitas.getFasilitasBerulang(pool, {
    limit: Number.isInteger(limit) && limit > 0 ? limit : undefined,
  });
  res.json({ data });
}

/** GET /api/fasilitas/:id -> { fasilitas, laporan: LaporanPrioritas[], riwayat } · 404 */
export async function detailFasilitas(req, res) {
  const id = paramId(req);
  const hasil = await Fasilitas.getDetailFasilitas(pool, id);
  if (!hasil) throw new HttpError(404, `Fasilitas #${id} tidak ditemukan`);
  res.json(hasil);
}
