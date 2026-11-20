/**
 * VerifikasiController (DPPL Tabel 2.3): keputusan verifikasi admin, notifikasi, pemicu skor prioritas.
 * Pemilik: P4. Kontrak: src/docs/API.md#uc02
 * Semua endpoint di sini khusus ADMIN, sehingga identitas pelapor boleh ikut di respons (KNF02).
 */
import { z } from 'zod';
import { KEPUTUSAN, SEMUA_STATUS } from '@silembur/shared';
import { pool, withTransaction } from '../db/pool.js';
import { periksa } from '../middleware/validasi.js';
import { Laporan, Verifikasi } from '../models/index.js';
import { HttpError, paramId } from '../utils/http.js';

/** Skema body POST /verifikasi. Catatan wajib untuk Ditolak & Revisi (KF05, gap G3). */
export const skemaKeputusan = z
  .object({
    keputusan: z.enum(Object.values(KEPUTUSAN)),
    catatan: z.string().trim().max(500).default(''),
  })
  .refine((v) => v.keputusan === KEPUTUSAN.DISETUJUI || v.catatan.length > 0, {
    message: 'Catatan alasan wajib diisi untuk keputusan Ditolak atau Revisi',
    path: ['catatan'],
  });

const kosongJadiUndefined = (v) => (v === '' ? undefined : v);

/** Skema query GET /admin/laporan. */
export const skemaDaftarAdmin = z.object({
  status: z.preprocess(kosongJadiUndefined, z.enum([...SEMUA_STATUS]).optional()),
  q: z.preprocess(kosongJadiUndefined, z.string().trim().max(100).optional()),
});

/** GET /api/admin/laporan?status=&q= -> { data: LaporanAdmin[] } */
export async function daftarLaporanAdmin(req, res) {
  const { status, q } = periksa(skemaDaftarAdmin, req.query ?? {});
  const data = await Laporan.getLaporanUntukAdmin(pool, { status, keyword: q });
  res.json({ data });
}

/** GET /api/admin/laporan/jumlah-baru -> { jumlah } */
export async function jumlahLaporanBaru(_req, res) {
  const jumlah = await Laporan.hitungLaporanBaru(pool);
  res.json({ jumlah });
}

/** GET /api/admin/laporan/:id -> { laporan: LaporanAdmin & { pratinjauSkor, riwayat, verifikasi } } */
export async function detailLaporanAdmin(req, res) {
  const id = paramId(req);
  const laporan = await Laporan.getDetailLaporanAdmin(pool, id);
  if (!laporan) throw new HttpError(404, `Laporan #${id} tidak ditemukan`);
  res.json({ laporan });
}

/** POST /api/admin/laporan/:id/verifikasi  body: { keputusan, catatan } -> { laporan, skor } */
export async function tetapkanKeputusan(req, res) {
  const id = paramId(req);
  const { keputusan, catatan } = req.valid?.body ?? periksa(skemaKeputusan, req.body ?? {});
  const hasil = await withTransaction(async (db) => {
    const { skor } = await Verifikasi.tetapkanKeputusan(db, {
      idLaporan: id,
      idAdmin: req.pengguna.id,
      keputusan,
      catatan,
    });
    const laporan = await Laporan.getLaporanAdmin(db, id);
    return { laporan, skor };
  });
  res.json(hasil);
}
