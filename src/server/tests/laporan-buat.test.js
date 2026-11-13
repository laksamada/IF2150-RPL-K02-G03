// Test UC01 Membuat & merevisi laporan (KF01-KF04, Algo-001, Algo-004, Algo-006, gap G1, G7). Pemilik: P2.
// Revisi laporan seed dipulihkan di afterAll agar skenario seed untuk anggota lain tetap utuh.
import fs from 'node:fs/promises';
import path from 'node:path';
import { ATURAN, KATEGORI, STATUS, SUMBER_LOKASI } from '@silembur/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { buatPng } from '../src/db/gambarContoh.js';
import { pool, withTransaction } from '../src/db/pool.js';
import { Laporan } from '../src/models/index.js';
import { api, auth, loginSebagai } from './helpers.js';

const PNG = buatPng([200, 60, 40], 16, 16);
const DAGO = { lat: -6.875204, lng: 107.617832 }; // fasilitas seed "PJU Jl. Dago Atas RT 03" (Lampu Jalan Mati)

let tokenWarga1;
let tokenWarga2;
let tokenAdmin;
const fotoDibuat = [];
let cadanganSeed = null;

beforeAll(async () => {
  [tokenWarga1, tokenWarga2, tokenAdmin] = await Promise.all([
    loginSebagai('warga1'),
    loginSebagai('warga2'),
    loginSebagai('admin'),
  ]);
});

afterAll(async () => {
  if (cadanganSeed) {
    const { laporan: l, lokasi: lo, maxRiwayat } = cadanganSeed;
    await pool.query('DELETE FROM riwayat_status WHERE id_laporan = $1 AND id_riwayat > $2', [l.id_laporan, maxRiwayat]);
    await pool.query(
      `UPDATE laporan SET status_laporan = $2, foto_laporan = $3, deskripsi_laporan = $4, kategori_kerusakan = $5,
              id_fasilitas = $6, diperbarui_pada = $7 WHERE id_laporan = $1`,
      [l.id_laporan, l.status_laporan, l.foto_laporan, l.deskripsi_laporan, l.kategori_kerusakan, l.id_fasilitas, l.diperbarui_pada],
    );
    await pool.query(
      `UPDATE lokasi SET koordinat = $2, latitude = $3, longitude = $4, wilayah = $5, alamat = $6, sumber = $7
        WHERE id_laporan = $1`,
      [lo.id_laporan, lo.koordinat, lo.latitude, lo.longitude, lo.wilayah, lo.alamat, lo.sumber],
    );
  }
  // Hapus hanya foto yang diunggah test ini (laporan/...), jangan pernah foto seed atau file di luar uploadDir.
  await Promise.all(
    fotoDibuat
      .filter((f) => typeof f === 'string' && f.startsWith('/uploads/laporan/'))
      .map((f) => path.resolve(config.uploadDir, f.slice('/uploads/'.length)))
      .filter((p) => p.startsWith(path.join(config.uploadDir, 'laporan') + path.sep))
      .map((p) => fs.rm(p, { force: true })),
  );
  await pool.end();
});

function kirimLaporan(isian = {}, { token = tokenWarga1, foto = true } = {}) {
  const data = {
    kategori: KATEGORI.LAMPU_JALAN_MATI,
    deskripsi: 'Lampu jalan padam sejak dua hari, jalan gelap di malam hari.',
    latitude: String(DAGO.lat + 0.00009), // ~10 m dari fasilitas seed
    longitude: String(DAGO.lng),
    sumberLokasi: SUMBER_LOKASI.GPS,
    ...isian,
  };
  let req = api().post('/api/laporan').set(auth(token));
  for (const [k, v] of Object.entries(data)) if (v !== undefined) req = req.field(k, v);
  if (foto) req = req.attach('foto', PNG, { filename: 'a.png', contentType: 'image/png' });
  return req.then((res) => {
    if (foto) fotoDibuat.push(res.body?.laporan?.foto);
    return res;
  });
}

function kirimRevisi(id, isian = {}, { token = tokenWarga1, foto = false } = {}) {
  let req = api().put(`/api/laporan/${id}/revisi`).set(auth(token));
  for (const [k, v] of Object.entries(isian)) req = req.field(k, v);
  if (foto) req = req.attach('foto', PNG, { filename: 'b.png', contentType: 'image/png' });
  // supertest hanya mengirim multipart bila ada field/attach; tanpa isian kirim body kosong.
  if (!foto && Object.keys(isian).length === 0) req = req.send({});
  return req.then((res) => {
    // Revisi tanpa foto baru mengembalikan foto lama (bisa foto seed) -> jangan dicatat untuk dihapus.
    if (foto) fotoDibuat.push(res.body?.laporan?.foto);
    return res;
  });
}

const jumlahLaporanPengguna = async (email) =>
  (await pool.query('SELECT jumlah_laporan FROM pengguna WHERE email = $1', [email])).rows[0].jumlah_laporan;
const idFasilitasDago = async () =>
  (await pool.query(`SELECT id_fasilitas FROM fasilitas WHERE nama_fasilitas = 'PJU Jl. Dago Atas RT 03'`)).rows[0].id_fasilitas;

describe('validasiIsianFormulir (Algo-004, unit)', () => {
  const lengkap = {
    foto: 'laporan/2026-11-13/a.png',
    deskripsi: 'Jalan berlubang cukup dalam.',
    koordinat: '-6.9,107.6',
    kategori: KATEGORI.JALAN_BERLUBANG,
  };

  it('isian lengkap -> true', () => {
    expect(Laporan.validasiIsianFormulir(lengkap)).toBe(true);
    expect(Laporan.validasiIsianFormulir({ ...lengkap, koordinat: { latitude: -6.9, longitude: 107.6 } })).toBe(true);
    expect(Laporan.validasiIsianFormulir({ ...lengkap, deskripsi: 'x'.repeat(ATURAN.BATAS_DESKRIPSI) })).toBe(true);
  });

  it.each([
    ['foto kosong', { foto: '' }],
    ['foto tidak ada', { foto: undefined }],
    ['deskripsi kosong', { deskripsi: '' }],
    ['deskripsi hanya spasi', { deskripsi: '   ' }],
    ['koordinat kosong', { koordinat: '' }],
    ['koordinat tidak lengkap', { koordinat: { latitude: -6.9 } }],
    ['deskripsi > 300 karakter', { deskripsi: 'x'.repeat(ATURAN.BATAS_DESKRIPSI + 1) }],
    ['kategori tidak dikenal', { kategori: 'Banjir' }],
  ])('%s -> false', (_nama, ubah) => {
    expect(Laporan.validasiIsianFormulir({ ...lengkap, ...ubah })).toBe(false);
  });
});

describe('POST /api/laporan (KF01-KF04, Algo-001)', () => {
  it('menyimpan laporan, lokasi, riwayat pertama, dan menambah jumlah laporan pelapor', async () => {
    const sebelum = await jumlahLaporanPengguna('warga1@silembur.test');

    const res = await kirimLaporan();

    expect(res.status).toBe(201);
    const { laporan } = res.body;
    expect(laporan).toMatchObject({
      kategori: KATEGORI.LAMPU_JALAN_MATI,
      status: STATUS.MENUNGGU_VERIFIKASI,
      deskripsi: 'Lampu jalan padam sejak dua hari, jalan gelap di malam hari.',
      catatanVerifikasi: null,
    });
    expect(laporan.foto).toMatch(/^\/uploads\/laporan\/.+\.png$/);
    expect(laporan.lokasi).toMatchObject({ wilayah: expect.any(String) });
    expect(laporan.lokasi.latitude).toBeCloseTo(DAGO.lat + 0.00009, 5);
    expect(laporan).not.toHaveProperty('pelapor'); // KNF02

    const fotoTersimpan = path.join(config.uploadDir, laporan.foto.slice('/uploads/'.length));
    await expect(fs.stat(fotoTersimpan)).resolves.toBeTruthy();

    const lokasi = await pool.query('SELECT koordinat, sumber FROM lokasi WHERE id_laporan = $1', [laporan.id]);
    expect(lokasi.rows[0].koordinat).toBe(`${(DAGO.lat + 0.00009).toFixed(6)},${DAGO.lng.toFixed(6)}`);
    expect(lokasi.rows[0].sumber).toBe(SUMBER_LOKASI.GPS);

    const riwayat = await pool.query(
      'SELECT status_lama, status_baru, deskripsi_perubahan FROM riwayat_status WHERE id_laporan = $1',
      [laporan.id],
    );
    expect(riwayat.rows).toEqual([
      { status_lama: null, status_baru: STATUS.MENUNGGU_VERIFIKASI, deskripsi_perubahan: 'Laporan berhasil diterima oleh sistem.' },
    ]);

    expect(await jumlahLaporanPengguna('warga1@silembur.test')).toBe(sebelum + 1);
  });

  it('titik < 30 m dari fasilitas seed berkategori sama memakai fasilitas itu (gap G1)', async () => {
    const res = await kirimLaporan();
    expect(res.status).toBe(201);
    expect(res.body.laporan.fasilitas.id).toBe(await idFasilitasDago());
  });

  it('kategori berbeda di titik yang sama membuat fasilitas baru', async () => {
    const jumlahFasilitas = async () => (await pool.query('SELECT COUNT(*) AS n FROM fasilitas')).rows[0].n;
    const sebelum = await jumlahFasilitas();

    const res = await kirimLaporan({ kategori: KATEGORI.POHON_TUMBANG, sumberLokasi: SUMBER_LOKASI.MANUAL });

    expect(res.status).toBe(201);
    const { fasilitas } = res.body.laporan;
    expect(fasilitas.id).not.toBe(await idFasilitasDago());
    expect(fasilitas.nama.startsWith(`${KATEGORI.POHON_TUMBANG} - `)).toBe(true);
    expect(await jumlahFasilitas()).toBe(sebelum + 1);
    const { rows } = await pool.query('SELECT kategori, wilayah FROM fasilitas WHERE id_fasilitas = $1', [fasilitas.id]);
    expect(rows[0]).toEqual({ kategori: KATEGORI.POHON_TUMBANG, wilayah: res.body.laporan.lokasi.wilayah });
    const lokasi = await pool.query('SELECT sumber FROM lokasi WHERE id_laporan = $1', [res.body.laporan.id]);
    expect(lokasi.rows[0].sumber).toBe(SUMBER_LOKASI.MANUAL); // KF03
  });

  it('titik > 30 m dari fasilitas berkategori sama membuat fasilitas baru', async () => {
    const res = await kirimLaporan({ latitude: String(DAGO.lat + 0.0004) }); // ~45 m
    expect(res.status).toBe(201);
    expect(res.body.laporan.fasilitas.id).not.toBe(await idFasilitasDago());
  });

  it('tanpa foto -> 400 dan tidak ada laporan tersimpan', async () => {
    const sebelum = await jumlahLaporanPengguna('warga1@silembur.test');
    const res = await kirimLaporan({}, { foto: false });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([expect.objectContaining({ field: 'foto' })]);
    expect(await jumlahLaporanPengguna('warga1@silembur.test')).toBe(sebelum);
  });

  it.each([
    ['deskripsi kosong', { deskripsi: '   ' }, 'deskripsi'],
    ['deskripsi > 300 karakter', { deskripsi: 'x'.repeat(ATURAN.BATAS_DESKRIPSI + 1) }, 'deskripsi'],
    ['kategori tidak dikenal', { kategori: 'Banjir' }, 'kategori'],
    ['koordinat kosong', { latitude: '' }, 'latitude'],
    ['koordinat bukan angka', { longitude: 'abc' }, 'longitude'],
    ['sumber lokasi tidak dikenal', { sumberLokasi: 'SATELIT' }, 'sumberLokasi'],
  ])('%s -> 400', async (_nama, isian, field) => {
    const res = await kirimLaporan(isian);
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d) => d.field)).toContain(field);
  });

  it('peran ADMIN -> 403', async () => {
    const res = await kirimLaporan({}, { token: tokenAdmin });
    expect(res.status).toBe(403);
  });

  it('tanpa login -> 401', async () => {
    const res = await api().post('/api/laporan').field('deskripsi', 'x');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/laporan/:id/revisi (gap G7)', () => {
  async function laporanSeedPerluRevisiWarga2() {
    const { rows } = await pool.query(
      `SELECT l.* FROM laporan l JOIN pengguna p ON p.id_pengguna = l.id_pelapor
        WHERE p.email = 'warga2@silembur.test' AND l.status_laporan = $1 ORDER BY l.id_laporan LIMIT 1`,
      [STATUS.PERLU_REVISI],
    );
    return rows[0];
  }

  it('laporan milik orang lain -> 404', async () => {
    const seed = await laporanSeedPerluRevisiWarga2();
    const res = await kirimRevisi(seed.id_laporan, { deskripsi: 'Bukan laporan saya' }, { token: tokenWarga1 });
    expect(res.status).toBe(404);
    const { rows } = await pool.query('SELECT status_laporan FROM laporan WHERE id_laporan = $1', [seed.id_laporan]);
    expect(rows[0].status_laporan).toBe(STATUS.PERLU_REVISI);
  });

  it('revisi laporan seed "Perlu Revisi" milik warga2 -> 200, kembali Menunggu Verifikasi', async () => {
    const seed = await laporanSeedPerluRevisiWarga2();
    cadanganSeed = {
      laporan: seed,
      lokasi: (await pool.query('SELECT * FROM lokasi WHERE id_laporan = $1', [seed.id_laporan])).rows[0],
      maxRiwayat: (await pool.query('SELECT MAX(id_riwayat) AS m FROM riwayat_status WHERE id_laporan = $1', [seed.id_laporan]))
        .rows[0].m,
    };
    const deskripsiBaru = 'Jalan berlubang diameter sekitar 60 cm dan dalam 15 cm di lajur kiri.';

    const res = await kirimRevisi(seed.id_laporan, { deskripsi: deskripsiBaru }, { token: tokenWarga2 });

    expect(res.status).toBe(200);
    expect(res.body.laporan).toMatchObject({
      id: seed.id_laporan,
      status: STATUS.MENUNGGU_VERIFIKASI,
      deskripsi: deskripsiBaru,
      kategori: seed.kategori_kerusakan,
    });
    expect(res.body.laporan.fasilitas.id).toBe(seed.id_fasilitas);
    const { rows } = await pool.query(
      `SELECT status_lama, status_baru, deskripsi_perubahan FROM riwayat_status
        WHERE id_laporan = $1 ORDER BY id_riwayat DESC LIMIT 1`,
      [seed.id_laporan],
    );
    expect(rows[0]).toEqual({
      status_lama: STATUS.PERLU_REVISI,
      status_baru: STATUS.MENUNGGU_VERIFIKASI,
      deskripsi_perubahan: 'Laporan direvisi oleh pelapor.',
    });
  });

  it('revisi foto, kategori, dan lokasi memperbarui laporan + lokasi + fasilitas', async () => {
    const dibuat = (await kirimLaporan()).body.laporan;
    await withTransaction((db) =>
      Laporan.ubahStatus(db, { idLaporan: dibuat.id, statusBaru: STATUS.PERLU_REVISI, deskripsi: 'Uji: minta revisi' }),
    );
    const sebelum = await jumlahLaporanPengguna('warga1@silembur.test');
    const titikBaru = { lat: -6.9175, lng: 107.6191 };

    const res = await kirimRevisi(
      dibuat.id,
      {
        kategori: KATEGORI.JALAN_BERLUBANG,
        latitude: String(titikBaru.lat),
        longitude: String(titikBaru.lng),
        sumberLokasi: SUMBER_LOKASI.MANUAL,
      },
      { foto: true },
    );

    expect(res.status).toBe(200);
    const { laporan } = res.body;
    expect(laporan.status).toBe(STATUS.MENUNGGU_VERIFIKASI);
    expect(laporan.kategori).toBe(KATEGORI.JALAN_BERLUBANG);
    expect(laporan.deskripsi).toBe(dibuat.deskripsi);
    expect(laporan.foto).not.toBe(dibuat.foto);
    expect(laporan.lokasi.latitude).toBeCloseTo(titikBaru.lat, 5);
    expect(laporan.fasilitas.id).not.toBe(dibuat.fasilitas.id);
    const { rows } = await pool.query('SELECT sumber, koordinat FROM lokasi WHERE id_laporan = $1', [dibuat.id]);
    expect(rows[0]).toEqual({ sumber: SUMBER_LOKASI.MANUAL, koordinat: '-6.917500,107.619100' });
    expect(await jumlahLaporanPengguna('warga1@silembur.test')).toBe(sebelum); // revisi bukan laporan baru
  });

  it('status bukan "Perlu Revisi" -> 409', async () => {
    const dibuat = (await kirimLaporan()).body.laporan;
    const res = await kirimRevisi(dibuat.id, { deskripsi: 'Coba revisi' });
    expect(res.status).toBe(409);
  });

  it('latitude tanpa longitude -> 400', async () => {
    const dibuat = (await kirimLaporan()).body.laporan;
    const res = await kirimRevisi(dibuat.id, { latitude: '-6.9' });
    expect(res.status).toBe(400);
  });

  it('laporan tidak ada -> 404, id tidak valid -> 400', async () => {
    expect((await kirimRevisi(999999, { deskripsi: 'x' })).status).toBe(404);
    expect((await kirimRevisi('abc', { deskripsi: 'x' })).status).toBe(400);
  });
});
