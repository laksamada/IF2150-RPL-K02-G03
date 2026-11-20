import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { api, auth, loginSebagai } from './helpers.js';

let tokenPemda;
let tokenWarga;

beforeAll(async () => {
  tokenPemda = await loginSebagai('pemda');
  tokenWarga = await loginSebagai('warga1');
});

afterAll(() => pool.end());

describe('Kelas C03: PemerintahDaerah (C03-UT01 s.d. C03-UT05)', () => {
  it('C03-UT01: meminta daftar prioritas tanpa filter wilayah', async () => {
    const res = await api().get('/api/prioritas').set(auth(tokenPemda));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('C03-UT02: meminta daftar prioritas dengan filter wilayah Coblong', async () => {
    const res = await api().get('/api/prioritas?wilayah=Coblong').set(auth(tokenPemda));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('C03-UT03: meninjau daftar fasilitas rusak berulang (limit 10)', async () => {
    const res = await api().get('/api/fasilitas/berulang?limit=10').set(auth(tokenPemda));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(10);
  });

  it('C03-UT04: meninjau detail & riwayat fasilitas dengan ID valid', async () => {
    const { rows } = await pool.query('SELECT id_fasilitas FROM fasilitas LIMIT 1');
    const idFasilitas = rows[0].id_fasilitas;
    const res = await api().get(`/api/fasilitas/${idFasilitas}`).set(auth(tokenPemda));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.riwayat)).toBe(true);
  });

  it('C03-UT05: meninjau riwayat fasilitas dengan ID tidak valid mengembalikan 404', async () => {
    const res = await api().get('/api/fasilitas/999999').set(auth(tokenPemda));
    expect(res.status).toBe(404);
  });
});