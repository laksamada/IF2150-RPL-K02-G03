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

  describe('Integrasi API Pemda (IK-09 & IK-10)', () => {
    it('INT-TC13 (IK-09): GET /api/prioritas dengan token Pemda mengembalikan 200', async () => {
      const res = await api().get('/api/prioritas').set(auth(tokenPemda));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('INT-TC14 (IK-09): GET /api/prioritas ditolak 403 jika diakses Pelapor', async () => {
      const res = await api().get('/api/prioritas').set(auth(tokenWarga));
      expect(res.status).toBe(403);
    });

    it('INT-TC15 (IK-10): GET /api/fasilitas/berulang dengan token Pemda mengembalikan 200', async () => {
      const res = await api().get('/api/fasilitas/berulang?limit=5').set(auth(tokenPemda));
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('INT-TC16 (IK-10): GET /api/fasilitas?q=jalan memfilter pencarian fasilitas dengan status 200', async () => {
      const res = await api().get('/api/fasilitas?q=jalan').set(auth(tokenPemda));
      expect(res.status).toBe(200);
    });
  });