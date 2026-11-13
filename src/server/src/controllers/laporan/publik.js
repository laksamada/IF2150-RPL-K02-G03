/**
 * LaporanController (bagian UC04) — laporan publik tanpa identitas pelapor.
 * Pemilik: P3. Kontrak: src/docs/API.md#uc04
 */
import { z } from 'zod';
import { SEMUA_KATEGORI } from '@silembur/shared';
import { pool } from '../../db/pool.js';
import { periksa } from '../../middleware/validasi.js';
import { Laporan } from '../../models/index.js';
import { KELOMPOK_STATUS_PUBLIK } from '../../models/laporan/publik.js';
import { HttpError, paramId } from '../../utils/http.js';

// String kosong dari query (?wilayah=) dianggap tidak diisi.
const kosongJadiUndefined = (v) => (v === '' ? undefined : v);

export const skemaFilterPublik = z.object({
  kelompok: z.preprocess(kosongJadiUndefined, z.enum(Object.keys(KELOMPOK_STATUS_PUBLIK)).optional()),
  wilayah: z.preprocess(kosongJadiUndefined, z.string().trim().max(100).optional()),
  kategori: z.preprocess(kosongJadiUndefined, z.enum(SEMUA_KATEGORI).optional()),
  limit: z.preprocess(kosongJadiUndefined, z.coerce.number().int().min(1).max(100).default(20)),
  offset: z.preprocess(kosongJadiUndefined, z.coerce.number().int().min(0).default(0)),
});

/** GET /api/laporan/publik?kelompok=&wilayah=&kategori=&limit=&offset= -> { data: LaporanPublik[] } */
export async function daftarPublik(req, res) {
  const filter = periksa(skemaFilterPublik, req.query);
  const data = await Laporan.getDaftarLaporanPublik(pool, filter);
  res.json({ data });
}

/** GET /api/laporan/publik/:id -> { laporan: LaporanPublik } ; 404 bila tidak ada */
export async function detailPublik(req, res) {
  const laporan = await Laporan.getDetailLaporanPublik(pool, paramId(req));
  if (!laporan) throw new HttpError(404, 'Laporan tidak ditemukan');
  res.json({ laporan });
}

/** GET /api/laporan/ringkasan -> { masuk, diproses, selesai } */
export async function ringkasan(_req, res) {
  res.json(await Laporan.getRingkasanLaporan(pool));
}
