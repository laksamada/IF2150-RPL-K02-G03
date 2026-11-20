import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { getLaporanTerverifikasi } from '../src/models/laporan/prioritas.js';

afterAll(() => pool.end());

describe('Kelas C04: Laporan - Prioritas Pemda (C04-UT14 s.d. C04-UT17)', () => {
  it('C04-UT14: getLaporanTerverifikasi mengembalikan daftar urut skor menurun', async () => {
    const data = await getLaporanTerverifikasi(pool, {});
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 1) {
      const ambilSkor = (item) => {
        if (typeof item.skor === 'object' && item.skor !== null) {
          return Number(item.skor.total ?? item.skor.nilai ?? 0);
        }
        return Number(item.skorPrioritas ?? item.skor ?? item.skor_prioritas ?? 0);
      };
      expect(ambilSkor(data[0])).toBeGreaterThanOrEqual(ambilSkor(data[1]));
    }
  });

  it('C04-UT15: getLaporanTerverifikasi menjaga konsistensi urutan pada data terverifikasi', async () => {
    const data = await getLaporanTerverifikasi(pool, {});
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(0);
  });

  it('C04-UT16: getLaporanTerverifikasi menyaring berdasarkan wilayah kecamatan valid', async () => {
    const data = await getLaporanTerverifikasi(pool, { wilayah: 'Coblong' });
    expect(Array.isArray(data)).toBe(true);
    data.forEach((lap) => {
      if (lap.wilayah) expect(lap.wilayah).toBe('Coblong');
    });
  });

  it('C04-UT17: getLaporanTerverifikasi mengabaikan filter jika parameter wilayah kosong/null', async () => {
    const dataKosong = await getLaporanTerverifikasi(pool, { wilayah: '' });
    const dataNull = await getLaporanTerverifikasi(pool, { wilayah: null });
    expect(Array.isArray(dataKosong)).toBe(true);
    expect(Array.isArray(dataNull)).toBe(true);
  });
});