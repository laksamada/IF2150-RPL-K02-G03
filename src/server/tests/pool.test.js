// Test ketahanan koneksi basis data (KNF01/KNF03): error koneksi menganggur & ROLLBACK gagal. Pemilik: P1.
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { pool, withTransaction } from '../src/db/pool.js';

afterEach(() => vi.restoreAllMocks());
afterAll(() => pool.end());

describe('pool basis data', () => {
  it("memasang handler 'error' sehingga error koneksi menganggur tidak menghentikan proses", () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(pool.listenerCount('error')).toBeGreaterThan(0);
    expect(() => pool.emit('error', new Error('koneksi putus'))).not.toThrow();
    expect(console.error).toHaveBeenCalled();
  });
});

describe('withTransaction', () => {
  function clientPalsu({ gagalRollback }) {
    return {
      query: vi.fn(async (sql) => {
        if (sql === 'ROLLBACK' && gagalRollback) throw new Error('rollback gagal');
        return { rows: [] };
      }),
      release: vi.fn(),
    };
  }

  it('ROLLBACK gagal -> lempar error asli dan buang koneksi lewat release(err)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const client = clientPalsu({ gagalRollback: true });
    vi.spyOn(pool, 'connect').mockResolvedValue(client);
    const asli = new Error('query gagal');

    await expect(withTransaction(async () => { throw asli; })).rejects.toBe(asli);
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(client.release.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(client.release.mock.calls[0][0].message).toBe('rollback gagal');
  });

  it('ROLLBACK berhasil -> koneksi dikembalikan normal', async () => {
    const client = clientPalsu({ gagalRollback: false });
    vi.spyOn(pool, 'connect').mockResolvedValue(client);
    const asli = new Error('query gagal');

    await expect(withTransaction(async () => { throw asli; })).rejects.toBe(asli);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalledWith(undefined);
  });

  it('transaksi sukses mengembalikan hasil fn dan COMMIT', async () => {
    const hasil = await withTransaction(async (db) => (await db.query('SELECT 1 AS n')).rows[0].n);
    expect(hasil).toBe(1);
  });
});
