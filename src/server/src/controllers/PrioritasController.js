/**
 * PrioritasController (DPPL Tabel 2.3): daftar laporan prioritas pemda + pembaruan status penanganan
 * (UC03, KF17, KF18, KF19, gap G8, G10, G14).
 * Pemilik: P5. Kontrak: src/docs/API.md#uc03
 */
import { z } from 'zod';
import { SEMUA_KATEGORI, STATUS, STATUS_PRIORITAS } from '@silembur/shared';
import { pool, withTransaction } from '../db/pool.js';
import { periksa } from '../middleware/validasi.js';
import { Laporan, SkorPrioritas } from '../models/index.js';
import { HttpError, paramId } from '../utils/http.js';

const kosongJadiUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

export const skemaFilterPrioritas = z.object({
  kategori: z.preprocess(kosongJadiUndefined, z.enum(SEMUA_KATEGORI).optional()),
  wilayah: z.preprocess(kosongJadiUndefined, z.string().trim().optional()),
  status: z.preprocess(kosongJadiUndefined, z.enum([...STATUS_PRIORITAS, STATUS.SELESAI]).optional()),
});

export const skemaUbahStatus = z.object({
  status: z.enum([STATUS.DIPROSES, STATUS.SELESAI]),
  keterangan: z.string().trim().min(1, 'Keterangan penanganan wajib diisi').max(300),
});

/**
 * KF17: hitung ulang skor yang sudah lebih dari 1 jam (lama menunggu bertambah).
 * Tiap laporan dalam transaksinya sendiri; kegagalan satu laporan tidak menggagalkan daftar
 * (skor lama tetap dipakai). hitungSkor boleh mengembalikan null.
 */
async function hitungUlangSkorKadaluarsa() {
  const daftarId = await Laporan.getIdSkorKadaluarsa(pool, { menit: 60 });
  for (const id of daftarId) {
    try {
      await withTransaction((db) => SkorPrioritas.hitungSkor(db, id));
    } catch (err) {
      console.error(`Gagal menghitung ulang skor laporan #${id}: ${err.message}`);
    }
  }
}

/** GET /api/prioritas?kategori=&wilayah=&status= -> { data: LaporanPrioritas[] } urut skor DESC (Q-004) */
export async function daftarPrioritas(req, res) {
  const filter = periksa(skemaFilterPrioritas, req.query);
  await hitungUlangSkorKadaluarsa();
  const data = await Laporan.getLaporanTerverifikasi(pool, filter);
  res.json({ data });
}

/** PATCH /api/laporan/:id/status  body: { status, keterangan } -> { laporan: LaporanPrioritas } (gap G8) */
export async function perbaruiStatus(req, res) {
  const idLaporan = paramId(req);
  const { status, keterangan } = req.valid.body;
  const laporan = await withTransaction(async (db) => {
    await Laporan.ubahStatus(db, { idLaporan, statusBaru: status, deskripsi: keterangan, idPengguna: req.pengguna.id });
    return Laporan.getLaporanPrioritas(db, idLaporan);
  });
  if (!laporan) throw new HttpError(404, `Laporan #${idLaporan} tidak ditemukan`);
  res.json({ laporan });
}
