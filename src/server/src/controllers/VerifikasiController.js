/**
 * VerifikasiController (DPPL Tabel 2.3): keputusan verifikasi admin, notifikasi, pemicu skor prioritas.
 * Pemilik: P4. Kontrak: src/docs/API.md#uc02
 * Semua endpoint di sini khusus ADMIN, sehingga identitas pelapor boleh ikut di respons (KNF02).
 */
import { z } from 'zod';
import { KEPUTUSAN, SEMUA_STATUS, STATUS } from '@silembur/shared';
import { pool, withTransaction } from '../db/pool.js';
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
  const status = req.query.status || STATUS.MENUNGGU_VERIFIKASI;
  if (typeof status !== 'string' || !SEMUA_STATUS.includes(status)) {
    throw new HttpError(400, 'Status laporan tidak dikenal');
  }
  const keyword = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : undefined;
  const data = await Laporan.getLaporanUntukAdmin(pool, { status, keyword });
  res.json({ data });
}

/** GET /api/admin/laporan/jumlah-baru -> { jumlah } */
export async function jumlahLaporanBaru(_req, res) {
  res.json({ jumlah: await Laporan.hitungLaporanBaru(pool) });
}

/** GET /api/admin/laporan/:id -> { laporan: LaporanAdmin & { pratinjauSkor, riwayat, verifikasi } } */
export async function detailLaporanAdmin(req, res) {
  const laporan = await Laporan.getDetailLaporanAdmin(pool, paramId(req));
  if (!laporan) throw new HttpError(404, 'Laporan tidak ditemukan');
  res.json({ laporan });
}

/** POST /api/admin/laporan/:id/verifikasi  body: { keputusan, catatan } -> { laporan, skor } */
export async function tetapkanKeputusan(req, res) {
  const idLaporan = paramId(req);
  const { keputusan, catatan } = req.valid.body;
  const { skor } = await withTransaction((db) =>
    Verifikasi.tetapkanKeputusan(db, { idLaporan, idAdmin: req.pengguna.id, keputusan, catatan }),
  );
  const laporan = await Laporan.getLaporanAdminById(pool, idLaporan);
  res.json({ laporan, skor });
}
