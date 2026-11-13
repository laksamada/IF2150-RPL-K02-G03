// Test UC06 fasilitas kerusakan berulang & UC08 riwayat fasilitas (KF14, KF22, KF23, Algo-007, KNF02). Pemilik: P5.
// Skenario hitung berulang memakai fasilitas buatan test sendiri; data seed hanya dibaca.
import { ATURAN, KATEGORI, PESAN, STATUS } from '@silembur/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { Fasilitas } from '../src/models/index.js';
import { api, auth, loginSebagai } from './helpers.js';

let tokenPemda;
let tokenAdmin;
let tokenWarga;
let idMerdeka;

beforeAll(async () => {
  [tokenPemda, tokenAdmin, tokenWarga] = await Promise.all([
    loginSebagai('pemda'),
    loginSebagai('admin'),
    loginSebagai('warga1'),
  ]);
  const { rows } = await pool.query(`SELECT id_fasilitas FROM fasilitas WHERE nama_fasilitas = 'Jalan Jl. Merdeka'`);
  idMerdeka = rows[0].id_fasilitas;
});
afterAll(() => pool.end());

const get = (path, token = tokenPemda) => api().get(path).set(auth(token));

async function buatFasilitas(nama) {
  const { rows } = await pool.query(
    `INSERT INTO fasilitas (nama_fasilitas, kategori, lokasi_fasilitas, latitude, longitude, wilayah)
     VALUES ($1, $2, 'Jl. Uji Berulang, Lengkong', -6.93, 107.62, 'Lengkong') RETURNING id_fasilitas`,
    [nama, KATEGORI.JALAN_BERLUBANG],
  );
  return rows[0].id_fasilitas;
}

async function buatLaporan(idFasilitas, { status = STATUS.MENUNGGU_VERIFIKASI, hariLalu = 1 } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO laporan (id_pelapor, id_fasilitas, foto_laporan, deskripsi_laporan, kategori_kerusakan,
                          tanggal_laporan, status_laporan)
     VALUES (1, $1, 'seed/jalan-berlubang.png', 'Laporan uji berulang', $2, NOW() - make_interval(days => $3), $4)
     RETURNING id_laporan`,
    [idFasilitas, KATEGORI.JALAN_BERLUBANG, hariLalu, status],
  );
  await pool.query(
    `INSERT INTO lokasi (id_laporan, koordinat, latitude, longitude, wilayah, alamat)
     VALUES ($1, '-6.93,107.62', -6.93, 107.62, 'Lengkong', 'Jl. Uji Berulang')`,
    [rows[0].id_laporan],
  );
  return rows[0].id_laporan;
}

describe('Fasilitas.getJumlahLaporan (Algo-007, Q-006/Q-007, KF14)', () => {
  it('fasilitas seed Jl. Merdeka = 4 laporan dalam 90 hari -> kandidat evaluasi', async () => {
    const jumlah = await Fasilitas.getJumlahLaporan(pool, idMerdeka);
    expect(jumlah).toBe(4);
    const { rows } = await pool.query(
      'SELECT jumlah_kerusakan_berulang, kandidat_evaluasi FROM fasilitas WHERE id_fasilitas = $1',
      [idMerdeka],
    );
    expect(rows[0]).toEqual({ jumlah_kerusakan_berulang: 4, kandidat_evaluasi: true });
  });

  it('laporan Ditolak, Digabung, dan di luar 90 hari tidak dihitung', async () => {
    const id = await buatFasilitas('Fasilitas Uji Berulang');
    await buatLaporan(id, { status: STATUS.TERVERIFIKASI });
    await buatLaporan(id, { status: STATUS.SELESAI, hariLalu: 20 });
    await buatLaporan(id, { status: STATUS.DITOLAK });
    await buatLaporan(id, { status: STATUS.DIGABUNG });
    await buatLaporan(id, { status: STATUS.DIPROSES, hariLalu: ATURAN.PERIODE_BERULANG_HARI + 5 });

    expect(await Fasilitas.getJumlahLaporan(pool, id)).toBe(2);
    let { rows } = await pool.query('SELECT kandidat_evaluasi FROM fasilitas WHERE id_fasilitas = $1', [id]);
    expect(rows[0].kandidat_evaluasi).toBe(false);

    // Tepat di ambang (AMBANG_BERULANG = 3) -> kandidat evaluasi.
    await buatLaporan(id);
    expect(await Fasilitas.getJumlahLaporan(pool, id)).toBe(ATURAN.AMBANG_BERULANG);
    ({ rows } = await pool.query('SELECT kandidat_evaluasi FROM fasilitas WHERE id_fasilitas = $1', [id]));
    expect(rows[0].kandidat_evaluasi).toBe(true);
  });

  it('tanpa fasilitas -> 0', async () => {
    expect(await Fasilitas.getJumlahLaporan(pool, null)).toBe(0);
  });
});

describe('GET /api/fasilitas/berulang (UC06)', () => {
  it('hanya kandidat evaluasi, urut jumlah terbanyak, Jl. Merdeka di dalamnya', async () => {
    const res = await get('/api/fasilitas/berulang');
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.length).toBeGreaterThan(0);
    for (const f of data) expect(f.kandidatEvaluasi).toBe(true);
    const jumlah = data.map((f) => f.jumlahKerusakanBerulang);
    expect(jumlah).toEqual([...jumlah].sort((a, b) => b - a));
    expect(data.find((f) => f.id === idMerdeka)).toMatchObject({
      nama: 'Jalan Jl. Merdeka',
      kategori: KATEGORI.JALAN_BERLUBANG,
      wilayah: 'Sumur Bandung',
      latitude: expect.any(Number),
      jumlahKerusakanBerulang: 4,
    });
  });

  it('limit membatasi jumlah hasil', async () => {
    const res = await get('/api/fasilitas/berulang?limit=1');
    expect(res.body.data).toHaveLength(1);
  });

  it('admin boleh, warga 403', async () => {
    expect((await get('/api/fasilitas/berulang', tokenAdmin)).status).toBe(200);
    expect((await get('/api/fasilitas/berulang', tokenWarga)).status).toBe(403);
  });
});

describe('GET /api/fasilitas (UC08 cariFasilitas)', () => {
  it('tanpa keyword -> semua fasilitas, tanpa pesan', async () => {
    const res = await get('/api/fasilitas');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(8);
    expect(res.body.pesan).toBeUndefined();
  });

  it('pencarian "merdeka" (tidak peka huruf besar) menemukan fasilitas Jl. Merdeka', async () => {
    const res = await get('/api/fasilitas?q=merdeka');
    expect(res.status).toBe(200);
    expect(res.body.data.map((f) => f.id)).toContain(idMerdeka);
    for (const f of res.body.data) expect(`${f.nama} ${f.lokasi} ${f.wilayah}`.toLowerCase()).toContain('merdeka');
  });

  it('pencarian lewat wilayah', async () => {
    const res = await get('/api/fasilitas?q=sukajadi');
    expect(res.body.data.some((f) => f.wilayah === 'Sukajadi')).toBe(true);
  });

  it('filter berulang=true hanya kandidat evaluasi', async () => {
    const res = await get('/api/fasilitas?berulang=true');
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const f of res.body.data) expect(f.kandidatEvaluasi).toBe(true);
  });

  it('keyword asal -> data kosong + pesan UC08 alternatif 1', async () => {
    const res = await get('/api/fasilitas?q=zzqx-tidak-ada');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], pesan: PESAN.FASILITAS_TIDAK_DITEMUKAN });
  });

  it('karakter wildcard dicari apa adanya', async () => {
    const res = await get('/api/fasilitas?q=%25');
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /api/fasilitas/:id (UC08, KF22, KF23)', () => {
  it('detail + laporan + riwayat terbaru dulu, tanpa identitas pelapor', async () => {
    const res = await get(`/api/fasilitas/${idMerdeka}`);
    expect(res.status).toBe(200);
    const { fasilitas, laporan, riwayat } = res.body;
    expect(fasilitas).toMatchObject({ id: idMerdeka, nama: 'Jalan Jl. Merdeka', kandidatEvaluasi: true });

    expect(laporan.length).toBeGreaterThanOrEqual(4);
    for (const l of laporan) {
      expect(l.fasilitas.id).toBe(idMerdeka);
      expect(l).not.toHaveProperty('pelapor');
      expect(l.foto).toMatch(/^\/uploads\//);
    }
    // Laporan yang belum diverifikasi belum punya skor.
    expect(laporan.find((l) => l.status === STATUS.MENUNGGU_VERIFIKASI).skor).toBeNull();
    expect(laporan.find((l) => l.status === STATUS.TERVERIFIKASI).skor.nilai).toEqual(expect.any(Number));

    const idLaporan = new Set(laporan.map((l) => l.id));
    expect(riwayat.length).toBeGreaterThan(laporan.length);
    for (const r of riwayat) {
      expect(idLaporan.has(r.idLaporan)).toBe(true);
      expect(r).toMatchObject({ id: expect.any(Number), statusBaru: expect.any(String), deskripsi: expect.any(String) });
    }
    const waktu = riwayat.map((r) => new Date(r.tanggal).getTime());
    expect(waktu).toEqual([...waktu].sort((a, b) => b - a));

    const teks = JSON.stringify(res.body);
    for (const bocor of ['Budi Santoso', 'Siti Rahmawati', 'Andi Wijaya', '@silembur.test', 'idPelapor']) {
      expect(teks).not.toContain(bocor);
    }
  });

  it('admin juga bisa membuka detail (G10)', async () => {
    expect((await get(`/api/fasilitas/${idMerdeka}`, tokenAdmin)).status).toBe(200);
  });

  it('fasilitas tidak ada -> 404, id tidak valid -> 400', async () => {
    expect((await get('/api/fasilitas/999999')).status).toBe(404);
    expect((await get('/api/fasilitas/abc')).status).toBe(400);
  });
});
