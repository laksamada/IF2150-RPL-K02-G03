import { z } from 'zod';
import { ATURAN, SEMUA_KATEGORI, SUMBER_LOKASI } from '@silembur/shared';
import { cloudStorageAdapter } from '../../adapters/cloudStorageAdapter.js';
import { diKotaBandung, getWilayahFromCoordinates } from '../../adapters/googleMapsAdapter.js';
import { pool, withTransaction } from '../../db/pool.js';
import { periksa } from '../../middleware/validasi.js';
import { Laporan } from '../../models/index.js';
import { HttpError, paramId } from '../../utils/http.js';

const kosongJadiUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const angka = (nama, min, max) =>
  z.preprocess(
    kosongJadiUndefined,
    z.coerce
      .number({ error: `${nama} wajib diisi dengan angka` })
      .min(min, `${nama} tidak valid`)
      .max(max, `${nama} tidak valid`),
  );

const field = {
  kategori: z.enum(SEMUA_KATEGORI, { error: `Kategori harus salah satu dari: ${SEMUA_KATEGORI.join(', ')}` }),
  deskripsi: z
    .string({ error: 'Deskripsi wajib diisi' })
    .trim()
    .min(1, 'Deskripsi wajib diisi')
    .max(ATURAN.BATAS_DESKRIPSI, `Deskripsi maksimal ${ATURAN.BATAS_DESKRIPSI} karakter`),
  latitude: angka('Latitude', -90, 90),
  longitude: angka('Longitude', -180, 180),
  sumberLokasi: z.enum(Object.values(SUMBER_LOKASI), { error: 'Sumber lokasi harus GPS atau MANUAL' }),
};

export const skemaBuatLaporan = z.object({
  kategori: field.kategori,
  deskripsi: field.deskripsi,
  latitude: field.latitude,
  longitude: field.longitude,
  sumberLokasi: field.sumberLokasi.default(SUMBER_LOKASI.GPS),
});

export const skemaRevisiLaporan = z
  .object({
    kategori: field.kategori.optional(),
    deskripsi: field.deskripsi.optional(),
    latitude: field.latitude.optional(),
    longitude: field.longitude.optional(),
    sumberLokasi: field.sumberLokasi.optional(),
  })
  .refine((d) => (d.latitude === undefined) === (d.longitude === undefined), {
    message: 'Latitude dan longitude harus dikirim bersamaan',
    path: ['latitude'],
  });

function tanpaIsianKosong(body = {}) {
  return Object.fromEntries(Object.entries(body).filter(([, v]) => kosongJadiUndefined(v) !== undefined));
}

/**
 * Ruang lingkup SILEMBUR satu kota (SKPL/DPPL 1.2): titik di luar Kota Bandung ditolak sebelum foto
 * disimpan atau layanan peta dipanggil.
 */
function pastikanDiKotaBandung(lat, lng) {
  if (!diKotaBandung(lat, lng)) {
    throw new HttpError(400, 'Data yang dikirim belum lengkap atau tidak valid', [
      { field: 'lokasi', pesan: 'Lokasi kerusakan harus berada di Kota Bandung' },
    ]);
  }
}

/**
 * POST /api/laporan
 */
export async function buatLaporan(req, res) {
  const data = periksa(skemaBuatLaporan, req.body ?? {});
  if (!req.file) {
    throw new HttpError(400, 'Foto kerusakan wajib dilampirkan', [{ field: 'foto', pesan: 'Foto wajib diisi' }]);
  }
  pastikanDiKotaBandung(data.latitude, data.longitude);

  const foto = await cloudStorageAdapter.simpanFoto(req.file);
  const { wilayah, alamat } = await getWilayahFromCoordinates(data.latitude, data.longitude);

  const idPelapor = req.pengguna.id;
  const laporan = await withTransaction(async (db) => {
    const idLaporan = await Laporan.konfirmasiSimpanLaporan(db, {
      idPelapor,
      foto,
      deskripsi: data.deskripsi,
      kategori: data.kategori,
      latitude: data.latitude,
      longitude: data.longitude,
      sumber: data.sumberLokasi,
      wilayah,
      alamat,
    });
    return Laporan.getLaporanSayaById(db, { idLaporan, idPelapor });
  });
  res.status(201).json({ laporan });
}

/**
 * PUT /api/laporan/:id/revisi
 */
export async function revisiLaporan(req, res) {
  const idLaporan = paramId(req);
  const idPelapor = req.pengguna.id;
  const data = periksa(skemaRevisiLaporan, tanpaIsianKosong(req.body));

  await Laporan.pastikanBisaDirevisi(pool, { idLaporan, idPelapor });
  if (data.latitude !== undefined) pastikanDiKotaBandung(data.latitude, data.longitude);

  const perubahan = { kategori: data.kategori, deskripsi: data.deskripsi };
  if (req.file) perubahan.foto = await cloudStorageAdapter.simpanFoto(req.file);
  if (data.latitude !== undefined) {
    const { wilayah, alamat } = await getWilayahFromCoordinates(data.latitude, data.longitude);
    perubahan.lokasi = {
      latitude: data.latitude,
      longitude: data.longitude,
      sumber: data.sumberLokasi ?? SUMBER_LOKASI.GPS,
      wilayah,
      alamat,
    };
  }

  const laporan = await withTransaction(async (db) => {
    await Laporan.revisiLaporan(db, { idLaporan, idPelapor, perubahan });
    return Laporan.getLaporanSayaById(db, { idLaporan, idPelapor });
  });
  res.json({ laporan });
}