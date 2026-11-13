import fs from 'node:fs/promises';
import path from 'node:path';
import { KATEGORI, STATUS } from '@silembur/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { pool } from '../src/db/pool.js';
import { getJumlahLaporan } from '../src/models/fasilitas/berulang.js';
import { validasiIsianFormulir } from '../src/models/laporan/buat.js';
import { api, auth, loginSebagai } from './helpers.js';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const PJU_CIHAMPELAS = { lat: -6.899811, lng: 107.603902 };

let tokenWarga1;
let tokenWarga2;
let tokenAdmin;
const laporanDibuat = [];
const fasilitasAwal = new Set();
let jumlahLaporanAwal = [];

beforeAll(async () => {
  [tokenWarga1, tokenWarga2, tokenAdmin] = await Promise.all([
    loginSebagai('warga1'),
    loginSebagai('warga2'),
    loginSebagai('admin'),
  ]);
  const { rows } = await pool.query('SELECT id_fasilitas FROM fasilitas');
  rows.forEach((r) => fasilitasAwal.add(r.id_fasilitas));
  jumlahLaporanAwal = (await pool.query('SELECT id_pengguna, jumlah_laporan FROM pengguna')).rows;
});

afterAll(async () => {
  const { rows } = await pool.query('SELECT foto_laporan FROM laporan WHERE id_laporan = ANY($1::int[])', [laporanDibuat]);
  await pool.query('DELETE FROM laporan WHERE id_laporan = ANY($1::int[])', [laporanDibuat]);
  for (const { foto_laporan: foto } of rows) {
    if (foto.startsWith('laporan/')) await fs.rm(path.join(config.uploadDir, foto), { force: true });
  }
  await pool.query('DELETE FROM fasilitas WHERE NOT (id_fasilitas = ANY($1::int[]))', [[...fasilitasAwal]]);
  for (const id of fasilitasAwal) await getJumlahLaporan(pool, id);
  for (const p of jumlahLaporanAwal) {
    await pool.query('UPDATE pengguna SET jumlah_laporan = $1 WHERE id_pengguna = $2', [p.jumlah_laporan, p.id_pengguna]);
  }
  await pool.end();
});

function kirimLaporan(isian = {}, { token = tokenWarga1, foto = true } = {}) {
  const data = {
    kategori: KATEGORI.LAINNYA,
    deskripsi: 'Trotoar retak dan berlubang di depan sekolah.',
    latitude: '-6.880000',
    longitude: '107.620000',
    sumberLokasi: 'GPS',
    ...isian,
  };
  let req = api().post('/api/laporan').set(auth(token));
  for (const [k, v] of Object.entries(data)) if (v !== undefined) req = req.field(k, String(v));
  if (foto) req = req.attach('foto', PNG, 'kerusakan.png');
  return req;
}

const jumlahLaporanPengguna = async (email) =>
  (await pool.query('SELECT jumlah_laporan FROM pengguna WHERE email = $1', [email])).rows[0].jumlah_laporan;

async function buatLaporanPerluRevisi(email = 'warga2@silembur.test') {
  const { rows } = await pool.query(
    `WITH p AS (SELECT id_pengguna FROM pengguna WHERE email = $1),
          f AS (SELECT id_fasilitas FROM fasilitas WHERE nama_fasilitas = 'Jalan Jl. Soekarno-Hatta KM 8')
     INSERT INTO laporan (id_pelapor, id_fasilitas, foto_laporan, deskripsi_laporan, kategori_kerusakan, status_laporan)
     SELECT p.id_pengguna, f.id_fasilitas, 'seed/jalan-berlubang.png', 'Jalan rusak.', 'Jalan Berlubang', 'Perlu Revisi'
       FROM p, f
     RETURNING id_laporan`,
    [email],
  );
  const id = rows[0].id_laporan;
  laporanDibuat.push(id);
  await pool.query(
    `INSERT INTO lokasi (id_laporan, koordinat, latitude, longitude, wilayah, alamat, sumber)
     VALUES ($1, '-6.944988,107.655021', -6.944988, 107.655021, 'Buahbatu', 'Jl. Soekarno-Hatta, Buahbatu', 'GPS')`,
    [id],
  );
  await pool.query(
    `INSERT INTO verifikasi (id_laporan, id_admin, keputusan, catatan_alasan)
     SELECT $1, id_pengguna, 'Revisi', 'Foto kurang jelas.' FROM pengguna WHERE email = 'admin@silembur.test'`,
    [id],
  );
  return id;
}

describe('Algo-004 validasiIsianFormulir', () => {
  const lengkap = { foto: 'laporan/a.png', deskripsi: 'Lampu mati', koordinat: '-6.9,107.6', kategori: KATEGORI.LAINNYA };

  it('isian lengkap -> true (koordinat string atau objek)', () => {
    expect(validasiIsianFormulir(lengkap)).toBe(true);
    expect(validasiIsianFormulir({ ...lengkap, koordinat: { latitude: -6.9, longitude: 107.6 } })).toBe(true);
    expect(validasiIsianFormulir({ ...lengkap, kategori: undefined })).toBe(true);
  });

  it('foto, deskripsi, atau koordinat kosong -> false', () => {
    expect(validasiIsianFormulir({ ...lengkap, foto: '' })).toBe(false);
    expect(validasiIsianFormulir({ ...lengkap, foto: null })).toBe(false);
    expect(validasiIsianFormulir({ ...lengkap, deskripsi: '   ' })).toBe(false);
    expect(validasiIsianFormulir({ ...lengkap, koordinat: '' })).toBe(false);
    expect(validasiIsianFormulir({ ...lengkap, koordinat: null })).toBe(false);
    expect(validasiIsianFormulir({ ...lengkap, koordinat: '-6.9,' })).toBe(false);
    expect(validasiIsianFormulir({})).toBe(false);
  });

  it('deskripsi > 300 karakter atau kategori tidak dikenal -> false', () => {
    expect(validasiIsianFormulir({ ...lengkap, deskripsi: 'a'.repeat(300) })).toBe(true);
    expect(validasiIsianFormulir({ ...lengkap, deskripsi: 'a'.repeat(301) })).toBe(false);
    expect(validasiIsianFormulir({ ...lengkap, kategori: 'Banjir' })).toBe(false);
  });
});

describe('POST /api/laporan (UC01, KF01-KF04)', () => {
  it('membuat laporan: 201, Menunggu Verifikasi, lokasi + riwayat tersimpan, jumlah_laporan +1', async () => {
    const sebelum = await jumlahLaporanPengguna('warga1@silembur.test');
    const res = await kirimLaporan({ sumberLokasi: 'MANUAL' });
    expect(res.status).toBe(201);
    const { laporan } = res.body;
    laporanDibuat.push(laporan.id);

    expect(laporan).toMatchObject({
      kategori: KATEGORI.LAINNYA,
      deskripsi: 'Trotoar retak dan berlubang di depan sekolah.',
      status: STATUS.MENUNGGU_VERIFIKASI,
      catatanVerifikasi: null,
    });
    expect(laporan.foto).toMatch(/^\/uploads\/laporan\/.+\.png$/);
    expect(laporan.lokasi).toMatchObject({ latitude: -6.88, longitude: 107.62 });
    expect(laporan.lokasi.wilayah).toBeTruthy();
    expect(laporan.fasilitas?.id).toBeTruthy();
    // KNF02: tidak ada identitas pelapor.
    expect(laporan).not.toHaveProperty('pelapor');
    expect(laporan).not.toHaveProperty('idPelapor');

    const lokasi = (await pool.query('SELECT * FROM lokasi WHERE id_laporan = $1', [laporan.id])).rows[0];
    expect(lokasi).toMatchObject({ koordinat: '-6.880000,107.620000', sumber: 'MANUAL' });

    const riwayat = (await pool.query('SELECT * FROM riwayat_status WHERE id_laporan = $1', [laporan.id])).rows;
    expect(riwayat).toHaveLength(1);
    expect(riwayat[0]).toMatchObject({
      status_lama: null,
      status_baru: STATUS.MENUNGGU_VERIFIKASI,
      deskripsi_perubahan: 'Laporan berhasil diterima oleh sistem.',
    });

    expect(await jumlahLaporanPengguna('warga1@silembur.test')).toBe(sebelum + 1);
    await expect(fs.stat(path.join(config.uploadDir, laporan.foto.replace('/uploads/', '')))).resolves.toBeTruthy();
  });

  it('sumberLokasi default GPS, deskripsi di-trim', async () => {
    const res = await kirimLaporan({ sumberLokasi: undefined, deskripsi: '   Pohon miring hampir tumbang.  ' });
    expect(res.status).toBe(201);
    laporanDibuat.push(res.body.laporan.id);
    expect(res.body.laporan.deskripsi).toBe('Pohon miring hampir tumbang.');
    const { rows } = await pool.query('SELECT sumber FROM lokasi WHERE id_laporan = $1', [res.body.laporan.id]);
    expect(rows[0].sumber).toBe('GPS');
  });

  it('titik < 30 m dari fasilitas berkategori sama -> memakai fasilitas itu (gap G1)', async () => {
    const res = await kirimLaporan({
      kategori: KATEGORI.LAMPU_JALAN_MATI,
      latitude: PJU_CIHAMPELAS.lat + 0.0001, // ±11 m
      longitude: PJU_CIHAMPELAS.lng,
    });
    expect(res.status).toBe(201);
    laporanDibuat.push(res.body.laporan.id);
    expect(res.body.laporan.fasilitas.nama).toBe('PJU Jl. Cihampelas');

    const { rows } = await pool.query(
      `SELECT jumlah_kerusakan_berulang FROM fasilitas WHERE nama_fasilitas = 'PJU Jl. Cihampelas'`,
    );
    expect(rows[0].jumlah_kerusakan_berulang).toBeGreaterThanOrEqual(3);
  });

  it('titik sama tetapi kategori berbeda -> fasilitas baru "<kategori> - <alamat>"', async () => {
    const res = await kirimLaporan({
      kategori: KATEGORI.POHON_TUMBANG,
      latitude: PJU_CIHAMPELAS.lat,
      longitude: PJU_CIHAMPELAS.lng,
    });
    expect(res.status).toBe(201);
    laporanDibuat.push(res.body.laporan.id);
    const { fasilitas, lokasi } = res.body.laporan;
    expect(fasilitasAwal.has(fasilitas.id)).toBe(false);
    expect(fasilitas.nama).toBe(`${KATEGORI.POHON_TUMBANG} - ${lokasi.alamat}`);

    // Laporan kedua di titik yang sama -> memakai fasilitas baru tadi, tidak membuat lagi.
    const res2 = await kirimLaporan({
      kategori: KATEGORI.POHON_TUMBANG,
      latitude: PJU_CIHAMPELAS.lat + 0.00005,
      longitude: PJU_CIHAMPELAS.lng,
    });
    expect(res2.status).toBe(201);
    laporanDibuat.push(res2.body.laporan.id);
    expect(res2.body.laporan.fasilitas.id).toBe(fasilitas.id);
  });

  it('titik > 30 m dari fasilitas berkategori sama -> fasilitas baru', async () => {
    const res = await kirimLaporan({
      kategori: KATEGORI.LAMPU_JALAN_MATI,
      latitude: PJU_CIHAMPELAS.lat + 0.0004, // ±44 m
      longitude: PJU_CIHAMPELAS.lng,
    });
    expect(res.status).toBe(201);
    laporanDibuat.push(res.body.laporan.id);
    expect(res.body.laporan.fasilitas.nama).not.toBe('PJU Jl. Cihampelas');
  });

  it('tanpa foto -> 400, tidak ada laporan tersimpan', async () => {
    const sebelum = (await pool.query('SELECT COUNT(*) AS n FROM laporan')).rows[0].n;
    const res = await kirimLaporan({}, { foto: false });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: 'foto', pesan: 'Foto wajib diisi' }]);
    expect((await pool.query('SELECT COUNT(*) AS n FROM laporan')).rows[0].n).toBe(sebelum);
  });

  it('isian tidak valid -> 400 dengan details per field', async () => {
    const res = await kirimLaporan({ kategori: 'Banjir', deskripsi: 'a'.repeat(301), latitude: '' });
    expect(res.status).toBe(400);
    const fields = res.body.error.details.map((d) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['kategori', 'deskripsi', 'latitude']));
  });

  it('file bukan gambar -> 400', async () => {
    const res = await api()
      .post('/api/laporan')
      .set(auth(tokenWarga1))
      .field('kategori', KATEGORI.LAINNYA)
      .field('deskripsi', 'x')
      .field('latitude', '-6.9')
      .field('longitude', '107.6')
      .attach('foto', Buffer.from('bukan gambar'), 'catatan.txt');
    expect(res.status).toBe(400);
  });

  it('peran ADMIN -> 403, tanpa login -> 401', async () => {
    expect((await kirimLaporan({}, { token: tokenAdmin })).status).toBe(403);
    expect((await api().post('/api/laporan').field('kategori', KATEGORI.LAINNYA)).status).toBe(401);
  });
});

describe('PUT /api/laporan/:id/revisi (gap G7)', () => {
  const revisi = (id, isian = {}, { token = tokenWarga2, foto = false } = {}) => {
    let req = api().put(`/api/laporan/${id}/revisi`).set(auth(token));
    for (const [k, v] of Object.entries(isian)) req = req.field(k, String(v));
    if (foto) req = req.attach('foto', PNG, 'revisi.png');
    return req;
  };

  it('pemilik merevisi laporan Perlu Revisi -> 200, Menunggu Verifikasi, riwayat bertambah', async () => {
    const id = await buatLaporanPerluRevisi();
    const res = await revisi(
      id,
      { deskripsi: 'Lubang berdiameter 60 cm dan dalam 15 cm di lajur kiri.' },
      { foto: true },
    );
    expect(res.status).toBe(200);
    expect(res.body.laporan).toMatchObject({
      id,
      status: STATUS.MENUNGGU_VERIFIKASI,
      deskripsi: 'Lubang berdiameter 60 cm dan dalam 15 cm di lajur kiri.',
      kategori: KATEGORI.JALAN_BERLUBANG,
      fasilitas: { nama: 'Jalan Jl. Soekarno-Hatta KM 8' },
      catatanVerifikasi: { keputusan: 'Revisi', catatan: 'Foto kurang jelas.' },
    });
    expect(res.body.laporan.foto).toMatch(/^\/uploads\/laporan\/.+\.png$/);

    const { rows } = await pool.query(
      'SELECT status_lama, status_baru, deskripsi_perubahan FROM riwayat_status WHERE id_laporan = $1',
      [id],
    );
    expect(rows).toEqual([
      { status_lama: STATUS.PERLU_REVISI, status_baru: STATUS.MENUNGGU_VERIFIKASI, deskripsi_perubahan: 'Laporan direvisi oleh pelapor.' },
    ]);
  });

  it('ubah lokasi -> lokasi & fasilitas ikut diperbarui', async () => {
    const id = await buatLaporanPerluRevisi();
    const res = await revisi(id, { latitude: '-6.912604', longitude: '107.609812', sumberLokasi: 'MANUAL' });
    expect(res.status).toBe(200);
    expect(res.body.laporan.fasilitas.nama).toBe('Jalan Jl. Merdeka');
    const { rows } = await pool.query('SELECT koordinat, sumber FROM lokasi WHERE id_laporan = $1', [id]);
    expect(rows[0]).toEqual({ koordinat: '-6.912604,107.609812', sumber: 'MANUAL' });
  });

  it('laporan seed Perlu Revisi milik warga2 tidak bisa direvisi warga1 -> 404', async () => {
    const { rows } = await pool.query(
      `SELECT l.id_laporan FROM laporan l JOIN pengguna p ON p.id_pengguna = l.id_pelapor
        WHERE p.email = 'warga2@silembur.test' AND l.status_laporan = 'Perlu Revisi' ORDER BY l.id_laporan LIMIT 1`,
    );
    const res = await revisi(rows[0].id_laporan, { deskripsi: 'coba' }, { token: tokenWarga1 });
    expect(res.status).toBe(404);
  });

  it('status bukan Perlu Revisi -> 409', async () => {
    const id = await buatLaporanPerluRevisi();
    expect((await revisi(id, { deskripsi: 'Revisi pertama.' })).status).toBe(200);
    const res = await revisi(id, { deskripsi: 'Revisi kedua.' });
    expect(res.status).toBe(409);
  });

  it('latitude tanpa longitude -> 400; id tidak ada -> 404', async () => {
    const id = await buatLaporanPerluRevisi();
    expect((await revisi(id, { latitude: '-6.9' })).status).toBe(400);
    expect((await revisi(999999, { deskripsi: 'x' })).status).toBe(404);
  });
});