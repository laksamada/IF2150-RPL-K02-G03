// Test lingkup satu kota (SKPL/DPPL 1.2) dan penanda kerusakan berulang otomatis
// (KF14, UC06, Algo-007, gap G11) pada alur buat/revisi/verifikasi laporan.
// Semua laporan & fasilitas buatan test ini dihapus di afterAll agar data seed dan test lain tetap utuh.
import fs from 'node:fs/promises';
import path from 'node:path';
import { ATURAN, KATEGORI, KEPUTUSAN, STATUS, SUMBER_LOKASI } from '@silembur/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { diKotaBandung } from '../src/adapters/googleMapsAdapter.js';
import { config } from '../src/config.js';
import { buatPng } from '../src/db/gambarContoh.js';
import { pool } from '../src/db/pool.js';
import { api, auth, loginSebagai } from './helpers.js';

const PNG = buatPng([40, 120, 60], 16, 16);
const ANTAPANI = { lat: -6.9152, lng: 107.6612 }; // dalam Kota Bandung, jauh dari fasilitas seed
const UJUNGBERUNG = { lat: -6.9102, lng: 107.7002 }; // dalam Kota Bandung, titik lain
const JAKARTA = { lat: -6.2, lng: 106.8166 };
const GARUT = { lat: -7.2167, lng: 107.9 };
const DETAIL_LUAR_KOTA = [{ field: 'lokasi', pesan: 'Lokasi kerusakan harus berada di Kota Bandung' }];

let tokenWarga3;
let tokenAdmin;
let tokenPemda;
const laporanDibuat = new Set();
const fasilitasDibuat = new Set();
const fotoDibuat = [];

beforeAll(async () => {
  [tokenWarga3, tokenAdmin, tokenPemda] = await Promise.all([
    loginSebagai('warga3'),
    loginSebagai('admin'),
    loginSebagai('pemda'),
  ]);
});

afterAll(async () => {
  const ids = [...laporanDibuat];
  if (ids.length) {
    await pool.query(
      `UPDATE pengguna SET jumlah_laporan = jumlah_laporan - $1 WHERE email = 'warga3@silembur.test'`,
      [ids.length],
    );
    await pool.query('DELETE FROM laporan WHERE id_laporan = ANY($1::int[])', [ids]);
  }
  const fasilitas = [...fasilitasDibuat];
  if (fasilitas.length) {
    await pool.query(
      `DELETE FROM fasilitas f WHERE f.id_fasilitas = ANY($1::int[])
          AND NOT EXISTS (SELECT 1 FROM laporan l WHERE l.id_fasilitas = f.id_fasilitas)`,
      [fasilitas],
    );
  }
  await Promise.all(
    fotoDibuat
      .filter((f) => typeof f === 'string' && f.startsWith('/uploads/laporan/'))
      .map((f) => path.resolve(config.uploadDir, f.slice('/uploads/'.length)))
      .filter((p) => p.startsWith(path.join(config.uploadDir, 'laporan') + path.sep))
      .map((p) => fs.rm(p, { force: true })),
  );
  await pool.end();
});

function catat(res) {
  const l = res.body?.laporan;
  if (l?.id) laporanDibuat.add(l.id);
  if (l?.fasilitas?.id) fasilitasDibuat.add(l.fasilitas.id);
  if (l?.foto) fotoDibuat.push(l.foto);
  return res;
}

function kirimLaporan(titik, isian = {}) {
  const data = {
    kategori: KATEGORI.POHON_TUMBANG,
    deskripsi: 'Pohon tumbang menutup sebagian badan jalan.',
    latitude: String(titik.lat),
    longitude: String(titik.lng),
    sumberLokasi: SUMBER_LOKASI.MANUAL,
    ...isian,
  };
  let req = api().post('/api/laporan').set(auth(tokenWarga3));
  for (const [k, v] of Object.entries(data)) req = req.field(k, v);
  return req.attach('foto', PNG, { filename: 'c.png', contentType: 'image/png' }).then(catat);
}

function kirimRevisi(id, isian, { foto = false } = {}) {
  let req = api().put(`/api/laporan/${id}/revisi`).set(auth(tokenWarga3));
  for (const [k, v] of Object.entries(isian)) req = req.field(k, v);
  if (foto) req = req.attach('foto', PNG, { filename: 'd.png', contentType: 'image/png' });
  return req.then((res) => {
    if (foto) fotoDibuat.push(res.body?.laporan?.foto);
    return res;
  });
}

const verifikasi = (id, keputusan, catatan = '') =>
  api().post(`/api/admin/laporan/${id}/verifikasi`).set(auth(tokenAdmin)).send({ keputusan, catatan });

async function barisFasilitas(id) {
  const { rows } = await pool.query(
    'SELECT jumlah_kerusakan_berulang, kandidat_evaluasi FROM fasilitas WHERE id_fasilitas = $1',
    [id],
  );
  return rows[0];
}

async function jumlahFotoTersimpan() {
  try {
    const isi = await fs.readdir(path.join(config.uploadDir, 'laporan'), { recursive: true, withFileTypes: true });
    return isi.filter((e) => e.isFile()).length;
  } catch {
    return 0;
  }
}

const jumlahLaporanWarga3 = async () =>
  (await pool.query(`SELECT jumlah_laporan FROM pengguna WHERE email = 'warga3@silembur.test'`)).rows[0].jumlah_laporan;

describe('diKotaBandung (googleMapsAdapter, SKPL/DPPL 1.2)', () => {
  it('titik di Kota Bandung -> true, di luar -> false', () => {
    expect(diKotaBandung(ANTAPANI.lat, ANTAPANI.lng)).toBe(true);
    expect(diKotaBandung(-6.875204, 107.617832)).toBe(true); // seed Dago
    expect(diKotaBandung(JAKARTA.lat, JAKARTA.lng)).toBe(false);
    expect(diKotaBandung(GARUT.lat, GARUT.lng)).toBe(false);
    expect(diKotaBandung(Number.NaN, 107.6)).toBe(false);
  });
});

describe('Lokasi di luar Kota Bandung ditolak (SKPL/DPPL 1.2)', () => {
  it('POST /api/laporan di luar kota -> 400, tanpa foto dan laporan tersimpan', async () => {
    const fotoSebelum = await jumlahFotoTersimpan();
    const laporanSebelum = await jumlahLaporanWarga3();

    const res = await kirimLaporan(JAKARTA);

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(DETAIL_LUAR_KOTA);
    expect(await jumlahFotoTersimpan()).toBe(fotoSebelum);
    expect(await jumlahLaporanWarga3()).toBe(laporanSebelum);
  });

  it('PUT /api/laporan/:id/revisi ke titik di luar kota -> 400, laporan tidak berubah', async () => {
    const dibuat = (await kirimLaporan(ANTAPANI, { kategori: KATEGORI.LAINNYA })).body.laporan;
    expect((await verifikasi(dibuat.id, KEPUTUSAN.REVISI, 'Foto kurang jelas')).status).toBe(200);
    const fotoSebelum = await jumlahFotoTersimpan();

    const res = await kirimRevisi(
      dibuat.id,
      { latitude: String(GARUT.lat), longitude: String(GARUT.lng), sumberLokasi: SUMBER_LOKASI.MANUAL },
      { foto: true },
    );

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(DETAIL_LUAR_KOTA);
    expect(await jumlahFotoTersimpan()).toBe(fotoSebelum);
    const { rows } = await pool.query(
      `SELECT l.status_laporan, l.foto_laporan, lo.latitude FROM laporan l JOIN lokasi lo USING (id_laporan)
        WHERE l.id_laporan = $1`,
      [dibuat.id],
    );
    expect(rows[0].status_laporan).toBe(STATUS.PERLU_REVISI);
    expect(`/uploads/${rows[0].foto_laporan}`).toBe(dibuat.foto);
    expect(rows[0].latitude).toBeCloseTo(ANTAPANI.lat, 5);
  });
});

describe('Penanda kerusakan berulang diperbarui otomatis (KF14, Algo-007, gap G11)', () => {
  const idLaporan = [];
  let idFasilitas;

  it(`${ATURAN.AMBANG_BERULANG} laporan baru di titik & kategori sama -> kandidat evaluasi tanpa verifikasi`, async () => {
    for (let i = 0; i < ATURAN.AMBANG_BERULANG; i += 1) {
      const res = await kirimLaporan(ANTAPANI);
      expect(res.status).toBe(201);
      idLaporan.push(res.body.laporan.id);
      idFasilitas ??= res.body.laporan.fasilitas.id;
      expect(res.body.laporan.fasilitas.id).toBe(idFasilitas);
      expect(await barisFasilitas(idFasilitas)).toEqual({
        jumlah_kerusakan_berulang: i + 1,
        kandidat_evaluasi: i + 1 >= ATURAN.AMBANG_BERULANG,
      });
    }

    const res = await api().get('/api/fasilitas/berulang').set(auth(tokenPemda));
    expect(res.body.data.find((f) => f.id === idFasilitas)).toMatchObject({
      jumlahKerusakanBerulang: ATURAN.AMBANG_BERULANG,
      kandidatEvaluasi: true,
    });
  });

  it('keputusan Ditolak menghitung ulang dan mencabut penanda kandidat', async () => {
    const res = await verifikasi(idLaporan[0], KEPUTUSAN.DITOLAK, 'Bukan fasilitas umum');
    expect(res.status).toBe(200);
    expect(await barisFasilitas(idFasilitas)).toEqual({
      jumlah_kerusakan_berulang: ATURAN.AMBANG_BERULANG - 1,
      kandidat_evaluasi: false,
    });
  });

  it('revisi yang memindahkan titik menghitung ulang fasilitas lama dan baru', async () => {
    const pindah = idLaporan[1];
    expect((await verifikasi(pindah, KEPUTUSAN.REVISI, 'Titik lokasi kurang tepat')).status).toBe(200);
    // "Perlu Revisi" tetap dihitung (Q-006 hanya mengecualikan Ditolak/Digabung).
    expect((await barisFasilitas(idFasilitas)).jumlah_kerusakan_berulang).toBe(ATURAN.AMBANG_BERULANG - 1);

    const res = await kirimRevisi(pindah, {
      latitude: String(UJUNGBERUNG.lat),
      longitude: String(UJUNGBERUNG.lng),
      sumberLokasi: SUMBER_LOKASI.MANUAL,
    });

    expect(res.status).toBe(200);
    const idBaru = res.body.laporan.fasilitas.id;
    fasilitasDibuat.add(idBaru);
    expect(idBaru).not.toBe(idFasilitas);
    expect(await barisFasilitas(idFasilitas)).toEqual({
      jumlah_kerusakan_berulang: ATURAN.AMBANG_BERULANG - 2,
      kandidat_evaluasi: false,
    });
    expect(await barisFasilitas(idBaru)).toEqual({ jumlah_kerusakan_berulang: 1, kandidat_evaluasi: false });
  });
});
