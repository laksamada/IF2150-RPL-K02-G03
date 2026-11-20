// Test Algo-009 skor prioritas (KF16, KF17). Pemilik: P4.
import { BOBOT_KATEGORI, KATEGORI, STATUS } from '@silembur/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { buatSkorAwal, hitungNilaiSkor, hitungSkor } from '../src/models/skorPrioritas/skor.js';

// Baris yang dibuat test ini dihapus lagi agar tidak memengaruhi file test lain (mis. prioritas.test.js).
const dibuat = { laporan: [], fasilitas: [] };

afterAll(async () => {
  if (dibuat.laporan.length) {
    await pool.query('DELETE FROM skor_prioritas WHERE id_laporan = ANY($1)', [dibuat.laporan]);
    await pool.query('DELETE FROM laporan WHERE id_laporan = ANY($1)', [dibuat.laporan]);
  }
  if (dibuat.fasilitas.length) {
    await pool.query('DELETE FROM fasilitas WHERE id_fasilitas = ANY($1)', [dibuat.fasilitas]);
  }
  await pool.end();
});

describe('hitungNilaiSkor (Algo-009, fungsi murni)', () => {
  const dasar = { jumlahPelapor: 1, lamaMenunggu: 0, frekuensiBerulang: 0 };

  it.each([
    [KATEGORI.POHON_TUMBANG, 30],
    [KATEGORI.JALAN_BERLUBANG, 20],
    [KATEGORI.LAMPU_JALAN_MATI, 10],
    [KATEGORI.LAINNYA, 5],
  ])('bobot kategori %s = %i', (kategori, bobot) => {
    expect(BOBOT_KATEGORI[kategori]).toBe(bobot);
    expect(hitungNilaiSkor({ kategori, ...dasar })).toBe(bobot + 5);
  });

  it('kategori tidak dikenal memakai bobot Lainnya', () => {
    expect(hitungNilaiSkor({ kategori: 'Tidak Dikenal', ...dasar })).toBe(5 + 5);
  });

  it.each([
    // kategori, jumlahPelapor, lamaMenunggu, frekuensiBerulang, skor
    [KATEGORI.JALAN_BERLUBANG, 1, 0, 0, 25],
    [KATEGORI.JALAN_BERLUBANG, 3, 0, 0, 35],
    [KATEGORI.JALAN_BERLUBANG, 1, 10, 0, 45],
    [KATEGORI.JALAN_BERLUBANG, 1, 0, 4, 65],
    [KATEGORI.POHON_TUMBANG, 3, 10, 4, 30 + 15 + 20 + 40],
    [KATEGORI.LAMPU_JALAN_MATI, 3, 10, 0, 10 + 15 + 20],
    [KATEGORI.LAINNYA, 1, 10, 4, 5 + 5 + 20 + 40],
  ])('%s, pelapor %i, menunggu %i hari, frekuensi %i -> %i', (kategori, jumlahPelapor, lamaMenunggu, frekuensiBerulang, skor) => {
    expect(hitungNilaiSkor({ kategori, jumlahPelapor, lamaMenunggu, frekuensiBerulang })).toBe(skor);
  });
});

describe('hitungSkor (Algo-009 + Q-009/Q-010)', () => {
  async function buatFasilitas() {
    const { rows } = await pool.query(
      `INSERT INTO fasilitas (nama_fasilitas, kategori, lokasi_fasilitas, latitude, longitude, wilayah)
       VALUES ('Fasilitas Uji Skor', $1, 'Jl. Uji Skor', -6.91, 107.61, 'Coblong') RETURNING id_fasilitas`,
      [KATEGORI.POHON_TUMBANG],
    );
    dibuat.fasilitas.push(rows[0].id_fasilitas);
    return rows[0].id_fasilitas;
  }

  async function buatLaporan({ idFasilitas, hariLalu, status = STATUS.MENUNGGU_VERIFIKASI, induk = null }) {
    const { rows } = await pool.query(
      `INSERT INTO laporan (id_pelapor, id_fasilitas, id_laporan_induk, foto_laporan, deskripsi_laporan,
                            kategori_kerusakan, tanggal_laporan, status_laporan)
       VALUES ((SELECT id_pengguna FROM pengguna WHERE email = 'warga1@silembur.test'), $1, $2,
               'seed/pohon-tumbang.png', 'Laporan uji skor', $3, NOW() - make_interval(hours => $4), $5)
       RETURNING id_laporan`,
      [idFasilitas, induk, KATEGORI.POHON_TUMBANG, Math.round(hariLalu * 24), status],
    );
    dibuat.laporan.push(rows[0].id_laporan);
    return rows[0].id_laporan;
  }

  it('mengembalikan null bila laporan belum punya baris skor', async () => {
    const f = await buatFasilitas();
    const id = await buatLaporan({ idFasilitas: f, hariLalu: 2 });
    expect(await hitungSkor(pool, id)).toBeNull();
    const { rowCount } = await pool.query('SELECT 1 FROM skor_prioritas WHERE id_laporan = $1', [id]);
    expect(rowCount).toBe(0);
  });

  it('menghitung dari jumlah pelapor, lama menunggu (dibulatkan ke bawah), frekuensi lalu menyimpannya', async () => {
    const f = await buatFasilitas();
    const induk = await buatLaporan({ idFasilitas: f, hariLalu: 3.5, status: STATUS.TERVERIFIKASI });
    // Dua laporan digabung ke induk -> jumlahPelapor 3; tidak dihitung sebagai frekuensi (status Digabung).
    await buatLaporan({ idFasilitas: f, hariLalu: 1, status: STATUS.DIGABUNG, induk });
    await buatLaporan({ idFasilitas: f, hariLalu: 1, status: STATUS.DIGABUNG, induk });
    // Satu laporan aktif lain di fasilitas yang sama -> frekuensi 2 (induk + laporan ini).
    await buatLaporan({ idFasilitas: f, hariLalu: 0.5 });

    await buatSkorAwal(pool, induk);
    const skor = await hitungSkor(pool, induk);

    const harapan = hitungNilaiSkor({
      kategori: KATEGORI.POHON_TUMBANG,
      jumlahPelapor: 3,
      lamaMenunggu: 3,
      frekuensiBerulang: 2,
    });
    expect(skor).toBe(harapan);

    const { rows } = await pool.query('SELECT * FROM skor_prioritas WHERE id_laporan = $1', [induk]);
    expect(rows[0]).toMatchObject({ jumlah_pelapor: 3, lama_menunggu: 3, frekuensi_berulang: 2, skor: harapan });
  });

  it('buatSkorAwal idempoten', async () => {
    const f = await buatFasilitas();
    const id = await buatLaporan({ idFasilitas: f, hariLalu: 1, status: STATUS.TERVERIFIKASI });
    await buatSkorAwal(pool, id);
    await buatSkorAwal(pool, id);
    const { rows } = await pool.query('SELECT COUNT(*) AS n FROM skor_prioritas WHERE id_laporan = $1', [id]);
    expect(rows[0].n).toBe(1);
  });
});
