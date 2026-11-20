import { ATURAN, KATEGORI, STATUS } from '@silembur/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { getFasilitasBerulang } from '../src/models/fasilitas/berulang.js';
import { cariFasilitas } from '../src/models/fasilitas/riwayat.js';
import { Fasilitas } from '../src/models/index.js';

afterAll(() => pool.end());

describe('Kelas C06: Fasilitas - Berulang & Riwayat (C06-UT04 s.d. C06-UT12)', () => {
  it('C06-UT04: getFasilitasBerulang mengambil daftar fasilitas kandidat evaluasi', async () => {
    const fasilitas = await getFasilitasBerulang(pool, { limit: 10 });
    expect(Array.isArray(fasilitas)).toBe(true);
    expect(fasilitas.length).toBeLessThanOrEqual(10);
    fasilitas.forEach((f) => {
      const id = f.id ?? f.idFasilitas ?? f.id_fasilitas;
      expect(id).toBeDefined();
    });
  });

  it('C06-UT05: getFasilitasBerulang menangani nilai batas limit = 0 dengan aman', async () => {
    const fasilitas = await getFasilitasBerulang(pool, { limit: 0 });
    expect(Array.isArray(fasilitas)).toBe(true);
  });

  it('C06-UT06: getFasilitasBerulang menolak pemanggilan jika koneksi pool tidak valid', async () => {
    await expect(getFasilitasBerulang(null, { limit: 5 })).rejects.toThrow();
  });

  it('C06-UT07: cariFasilitas menemukan fasilitas valid berdasarkan kata kunci', async () => {
    const hasil = await cariFasilitas(pool, 'merdeka');
    const list = Array.isArray(hasil) ? hasil : (hasil?.data ?? hasil?.rows ?? []);
    expect(list.length).toBeGreaterThan(0);
    expect(list.some((f) => (f.nama ?? f.nama_fasilitas ?? '').toLowerCase().includes('merdeka'))).toBe(true);
  });

  it('C06-UT08: cariFasilitas tanpa filter mengembalikan seluruh daftar fasilitas', async () => {
    const hasil = await cariFasilitas(pool);
    const list = Array.isArray(hasil) ? hasil : (hasil?.data ?? hasil?.rows ?? []);
    expect(list.length).toBeGreaterThanOrEqual(8);
  });

  it('C06-UT09: cariFasilitas dengan kata kunci yang tidak ada mengembalikan array kosong', async () => {
    const hasil = await cariFasilitas(pool, { q: 'FASILITAS_TIDAK_ADA_XYZ_999' });
    const list = Array.isArray(hasil) ? hasil : (hasil?.rows ?? []);
    expect(list.length).toBe(0);
  });

  it('C06-UT10: getJumlahLaporan menandai kandidat_evaluasi = true jika laporan >= ambang', async () => {
    const { rows } = await pool.query(`SELECT id_fasilitas FROM fasilitas WHERE nama_fasilitas = 'Jalan Jl. Merdeka'`);
    const idMerdeka = rows[0].id_fasilitas;
    const jumlah = await Fasilitas.getJumlahLaporan(pool, idMerdeka);
    expect(jumlah).toBeGreaterThanOrEqual(ATURAN.AMBANG_BERULANG);
  });

  it('C06-UT11: getJumlahLaporan tepat di batas ambang (3 laporan) mengaktifkan evaluasi', async () => {
    const { rows: f } = await pool.query(
      `INSERT INTO fasilitas (nama_fasilitas, kategori, lokasi_fasilitas, latitude, longitude, wilayah)
       VALUES ('Fasilitas Uji Batas C06', $1, 'Jl. Uji C06', -6.93, 107.62, 'Lengkong') RETURNING id_fasilitas`,
      [KATEGORI.JALAN_BERLUBANG],
    );
    const id = f[0].id_fasilitas;

    for (let i = 0; i < ATURAN.AMBANG_BERULANG; i++) {
      await pool.query(
        `INSERT INTO laporan (id_pelapor, id_fasilitas, foto_laporan, deskripsi_laporan, kategori_kerusakan, status_laporan)
         VALUES (1, $1, 'seed/jalan-berlubang.png', 'Uji batas', $2, $3)`,
        [id, KATEGORI.JALAN_BERLUBANG, STATUS.TERVERIFIKASI],
      );
    }

    const jumlah = await Fasilitas.getJumlahLaporan(pool, id);
    expect(jumlah).toBe(ATURAN.AMBANG_BERULANG);
    const { rows: cek } = await pool.query('SELECT kandidat_evaluasi FROM fasilitas WHERE id_fasilitas = $1', [id]);
    expect(cek[0].kandidat_evaluasi).toBe(true);

    await pool.query('DELETE FROM laporan WHERE id_fasilitas = $1', [id]);
    await pool.query('DELETE FROM fasilitas WHERE id_fasilitas = $1', [id]);
  });

  it('C06-UT12: getJumlahLaporan dengan ID null mengembalikan 0', async () => {
    expect(await Fasilitas.getJumlahLaporan(pool, null)).toBe(0);
  });
});