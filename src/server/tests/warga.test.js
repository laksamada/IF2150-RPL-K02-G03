// Test UC04 laporan publik, UC05 laporan saya, dan notifikasi pelapor (KF10–KF13, KF24, KNF02). Pemilik: P3.
// Data diambil dari seed lewat query (bukan id tetap) agar tetap benar walau test lain mengubah status laporan.
import { KATEGORI, STATUS, STATUS_PUBLIK } from '@silembur/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { AKUN, api, auth, loginSebagai } from './helpers.js';

const NAMA_PELAPOR_SEED = ['Budi Santoso', 'Siti Rahmawati', 'Andi Wijaya'];

let tokenWarga1;
let tokenWarga2;
let tokenAdmin;
let idWarga1;

beforeAll(async () => {
  [tokenWarga1, tokenWarga2, tokenAdmin] = await Promise.all([
    loginSebagai('warga1'),
    loginSebagai('warga2'),
    loginSebagai('admin'),
  ]);
  const { rows } = await pool.query('SELECT id_pengguna FROM pengguna WHERE email = $1', [AKUN.warga1]);
  idWarga1 = rows[0].id_pengguna;
});
afterAll(() => pool.end());

/** id laporan pertama dengan status tertentu (opsional milik email tertentu). */
async function idLaporan({ status, email } = {}) {
  const { rows } = await pool.query(
    `SELECT l.id_laporan FROM laporan l JOIN pengguna p ON p.id_pengguna = l.id_pelapor
      WHERE ($1::text IS NULL OR l.status_laporan = $1) AND ($2::text IS NULL OR p.email = $2)
      ORDER BY l.id_laporan LIMIT 1`,
    [status ?? null, email ?? null],
  );
  return rows[0]?.id_laporan;
}

function periksaAnonim(body) {
  const teks = JSON.stringify(body);
  expect(teks).not.toMatch(/pelapor/i);
  expect(teks).not.toMatch(/email/i);
  expect(teks).not.toContain('@silembur.test');
  for (const nama of NAMA_PELAPOR_SEED) expect(teks).not.toContain(nama);
}

describe('GET /api/laporan/publik (UC04, KF10, KNF02)', () => {
  it('mengembalikan laporan publik tanpa identitas pelapor', async () => {
    const res = await api().get('/api/laporan/publik?limit=100').set(auth(tokenWarga1));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    periksaAnonim(res.body);

    const contoh = res.body.data[0];
    expect(Object.keys(contoh).sort()).toEqual(
      ['deskripsi', 'fasilitas', 'foto', 'id', 'kategori', 'lokasi', 'status', 'tanggalLaporan'].sort(),
    );
    expect(contoh.foto).toMatch(/^\/uploads\/|^https?:\/\//);
    expect(contoh.lokasi).toEqual({
      latitude: expect.any(Number),
      longitude: expect.any(Number),
      wilayah: expect.any(String),
      alamat: expect.any(String),
    });
  });

  it('hanya memuat status publik, terbaru dulu', async () => {
    const res = await api().get('/api/laporan/publik?limit=100').set(auth(tokenWarga1));
    const status = res.body.data.map((l) => l.status);
    expect(status.every((s) => STATUS_PUBLIK.includes(s))).toBe(true);
    expect(status).not.toContain(STATUS.DITOLAK);
    expect(status).not.toContain(STATUS.DIGABUNG);
    expect(status).not.toContain(STATUS.PERLU_REVISI);

    const waktu = res.body.data.map((l) => new Date(l.tanggalLaporan).getTime());
    expect(waktu).toEqual([...waktu].sort((a, b) => b - a));
  });

  it.each([
    ['menunggu', [STATUS.MENUNGGU_VERIFIKASI]],
    ['diproses', [STATUS.TERVERIFIKASI, STATUS.DIPROSES]],
    ['selesai', [STATUS.SELESAI]],
  ])('filter kelompok=%s', async (kelompok, harapan) => {
    const res = await api().get('/api/laporan/publik').query({ kelompok, limit: 100 }).set(auth(tokenWarga1));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((l) => harapan.includes(l.status))).toBe(true);
  });

  it('filter wilayah=Coblong hanya mengembalikan wilayah Coblong (UC04 alt 1)', async () => {
    const res = await api().get('/api/laporan/publik?wilayah=Coblong&limit=100').set(auth(tokenWarga1));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((l) => l.lokasi.wilayah === 'Coblong')).toBe(true);
  });

  it('filter kategori dan kombinasi tanpa hasil -> data: []', async () => {
    const res = await api()
      .get('/api/laporan/publik')
      .query({ kategori: KATEGORI.POHON_TUMBANG, limit: 100 })
      .set(auth(tokenWarga1));
    expect(res.body.data.every((l) => l.kategori === KATEGORI.POHON_TUMBANG)).toBe(true);

    const kosong = await api().get('/api/laporan/publik?wilayah=Wilayah Tidak Ada').set(auth(tokenWarga1));
    expect(kosong.status).toBe(200);
    expect(kosong.body).toEqual({ data: [] });
  });

  it('limit & offset membatasi hasil', async () => {
    const semua = await api().get('/api/laporan/publik?limit=100').set(auth(tokenWarga1));
    const halaman = await api().get('/api/laporan/publik?limit=2&offset=1').set(auth(tokenWarga1));
    expect(halaman.body.data.map((l) => l.id)).toEqual(semua.body.data.slice(1, 3).map((l) => l.id));
  });

  it('menolak filter tidak valid (400)', async () => {
    const res = await api().get('/api/laporan/publik?kelompok=semuanya').set(auth(tokenWarga1));
    expect(res.status).toBe(400);
  });

  it('wajib login (401)', async () => {
    expect((await api().get('/api/laporan/publik')).status).toBe(401);
  });
});

describe('GET /api/laporan/publik/:id (KF11, KNF02)', () => {
  it('detail laporan publik tanpa identitas pelapor', async () => {
    const id = await idLaporan({ status: STATUS.TERVERIFIKASI });
    const res = await api().get(`/api/laporan/publik/${id}`).set(auth(tokenWarga2));
    expect(res.status).toBe(200);
    expect(res.body.laporan.id).toBe(id);
    expect(res.body.laporan.status).toBe(STATUS.TERVERIFIKASI);
    periksaAnonim(res.body);
  });

  it.each([STATUS.DITOLAK, STATUS.PERLU_REVISI, STATUS.DIGABUNG])('laporan %s -> 404', async (status) => {
    const id = await idLaporan({ status });
    const res = await api().get(`/api/laporan/publik/${id}`).set(auth(tokenWarga1));
    expect(res.status).toBe(404);
  });

  it('id tidak ada -> 404, id tidak valid -> 400', async () => {
    expect((await api().get('/api/laporan/publik/999999').set(auth(tokenWarga1))).status).toBe(404);
    expect((await api().get('/api/laporan/publik/abc').set(auth(tokenWarga1))).status).toBe(400);
  });
});

describe('GET /api/laporan/ringkasan (I-02 O-0202)', () => {
  it('mengembalikan jumlah masuk/diproses/selesai sesuai basis data', async () => {
    const res = await api().get('/api/laporan/ringkasan').set(auth(tokenWarga1));
    expect(res.status).toBe(200);
    const { rows } = await pool.query(
      `SELECT COUNT(*) FILTER (WHERE status_laporan = ANY($1)) AS diproses,
              COUNT(*) FILTER (WHERE status_laporan = $2) AS selesai
         FROM laporan`,
      [[STATUS.TERVERIFIKASI, STATUS.DIPROSES], STATUS.SELESAI],
    );
    expect(res.body.diproses).toBe(rows[0].diproses);
    expect(res.body.selesai).toBe(rows[0].selesai);
    expect(res.body.masuk).toEqual(expect.any(Number));
    expect(res.body.masuk).toBeGreaterThan(0); // seed punya laporan hari ini
  });
});

describe('GET /api/laporan/saya (UC05, KF13, KF24)', () => {
  it('hanya laporan milik pelapor yang login, semua status', async () => {
    const res = await api().get('/api/laporan/saya').set(auth(tokenWarga1));
    expect(res.status).toBe(200);
    const { rows } = await pool.query('SELECT id_laporan FROM laporan WHERE id_pelapor = $1', [idWarga1]);
    expect(res.body.data.map((l) => l.id).sort((a, b) => a - b)).toEqual(
      rows.map((r) => r.id_laporan).sort((a, b) => a - b),
    );
    expect(res.body.data[0]).toHaveProperty('diperbaruiPada');
    expect(res.body.data[0]).toHaveProperty('catatanVerifikasi');
  });

  it('detail menyertakan catatan verifikasi terakhir dan riwayat urut naik', async () => {
    const id = await idLaporan({ status: STATUS.PERLU_REVISI, email: AKUN.warga2 });
    const res = await api().get(`/api/laporan/saya/${id}`).set(auth(tokenWarga2));
    expect(res.status).toBe(200);
    const { laporan } = res.body;
    expect(laporan.status).toBe(STATUS.PERLU_REVISI);
    expect(laporan.catatanVerifikasi).toEqual({
      keputusan: 'Revisi',
      catatan: expect.stringMatching(/Foto kurang jelas/),
      waktu: expect.any(String),
    });
    expect(laporan.riwayat.length).toBeGreaterThanOrEqual(2);
    expect(laporan.riwayat[0].statusBaru).toBe(STATUS.MENUNGGU_VERIFIKASI);
    expect(laporan.riwayat.at(-1).statusBaru).toBe(STATUS.PERLU_REVISI);
    const waktu = laporan.riwayat.map((r) => new Date(r.tanggal).getTime());
    expect(waktu).toEqual([...waktu].sort((a, b) => a - b));
  });

  it('warga1 tidak bisa membuka laporan milik warga2 (404)', async () => {
    const id = await idLaporan({ email: AKUN.warga2 });
    const res = await api().get(`/api/laporan/saya/${id}`).set(auth(tokenWarga1));
    expect(res.status).toBe(404);
  });

  it('hanya untuk PELAPOR (403)', async () => {
    expect((await api().get('/api/laporan/saya').set(auth(tokenAdmin))).status).toBe(403);
  });
});

describe('Notifikasi pelapor (O-0201, KF07 sisi penerima)', () => {
  let idNotifUji;

  beforeAll(async () => {
    const idLap = await idLaporan({ email: AKUN.warga1 });
    const { rows } = await pool.query(
      `INSERT INTO notifikasi (id_laporan, id_pelapor, isi_pesan, dibaca)
       VALUES ($1, $2, 'Notifikasi uji P3', FALSE) RETURNING id_notifikasi`,
      [idLap, idWarga1],
    );
    idNotifUji = rows[0].id_notifikasi;
  });

  it('daftar notifikasi milik sendiri, terbaru dulu, dengan jumlah belum dibaca', async () => {
    const res = await api().get('/api/notifikasi').set(auth(tokenWarga1));
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toEqual({
      id: idNotifUji,
      idLaporan: expect.any(Number),
      isiPesan: 'Notifikasi uji P3',
      dibaca: false,
      waktuKirim: expect.any(String),
    });
    expect(res.body.belumDibaca).toBe(res.body.data.filter((n) => !n.dibaca).length);
    expect(res.body.belumDibaca).toBeGreaterThan(0);
  });

  it('belumDibaca berkurang setelah PATCH dibaca', async () => {
    const sebelum = (await api().get('/api/notifikasi').set(auth(tokenWarga1))).body.belumDibaca;
    const res = await api().patch(`/api/notifikasi/${idNotifUji}/dibaca`).set(auth(tokenWarga1));
    expect(res.status).toBe(204);
    const sesudah = await api().get('/api/notifikasi').set(auth(tokenWarga1));
    expect(sesudah.body.belumDibaca).toBe(sebelum - 1);
    expect(sesudah.body.data.find((n) => n.id === idNotifUji).dibaca).toBe(true);
  });

  it('tidak bisa menandai notifikasi milik orang lain (404)', async () => {
    const res = await api().patch(`/api/notifikasi/${idNotifUji}/dibaca`).set(auth(tokenWarga2));
    expect(res.status).toBe(404);
    const lain = await api().get('/api/notifikasi').set(auth(tokenWarga2));
    expect(lain.body.data.some((n) => n.id === idNotifUji)).toBe(false);
  });
});
