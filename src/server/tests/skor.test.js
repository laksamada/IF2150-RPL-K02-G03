// Test skor prioritas (Algo-009, KF16, KF17). Pemilik: P4.
// Bagian DB memakai fasilitas/laporan buatan test sendiri agar data seed anggota lain tetap utuh.
import { KATEGORI, STATUS } from '@silembur/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { buatSkorAwal, getSkor, hitungNilaiSkor, hitungSkor } from '../src/models/skorPrioritas/skor.js';


// Hapus data buatan test ini agar tidak memengaruhi test anggota lain (mis. hitungan antrean/fasilitas).
const fasilitasUji = [];
async function bersihkan() {
  if (fasilitasUji.length === 0) return;
  await pool.query('DELETE FROM laporan WHERE id_fasilitas = ANY($1) AND id_laporan_induk IS NOT NULL', [fasilitasUji]);
  await pool.query('DELETE FROM laporan WHERE id_fasilitas = ANY($1)', [fasilitasUji]);
  await pool.query('DELETE FROM fasilitas WHERE id_fasilitas = ANY($1)', [fasilitasUji]);
}
afterAll(async () => {
  await bersihkan();
  await pool.end();
});

const dasar = { jumlahPelapor: 1, lamaMenunggu: 0, frekuensiBerulang: 0 };

describe('hitungNilaiSkor (Algo-009, fungsi murni)', () => {
  it.each([
    [KATEGORI.POHON_TUMBANG, 35],
    [KATEGORI.JALAN_BERLUBANG, 25],
    [KATEGORI.LAMPU_JALAN_MATI, 15],
    [KATEGORI.LAINNYA, 10],
  ])('bobot kategori %s dengan faktor minimum -> %i', (kategori, harapan) => {
    expect(hitungNilaiSkor({ kategori, ...dasar })).toBe(harapan);
  });

  it.each([
    ['jumlahPelapor 1', { jumlahPelapor: 1 }, 25],
    ['jumlahPelapor 3', { jumlahPelapor: 3 }, 35],
    ['lamaMenunggu 0', { lamaMenunggu: 0 }, 25],
    ['lamaMenunggu 10', { lamaMenunggu: 10 }, 45],
    ['frekuensiBerulang 0', { frekuensiBerulang: 0 }, 25],
    ['frekuensiBerulang 4', { frekuensiBerulang: 4 }, 65],
    ['semua faktor', { jumlahPelapor: 3, lamaMenunggu: 10, frekuensiBerulang: 4 }, 95],
  ])('%s (Jalan Berlubang)', (_nama, ubah, harapan) => {
    expect(hitungNilaiSkor({ kategori: KATEGORI.JALAN_BERLUBANG, ...dasar, ...ubah })).toBe(harapan);
  });

  it('menolak kategori yang tidak dikenal', () => {
    expect(() => hitungNilaiSkor({ kategori: 'Tidak Ada', ...dasar })).toThrow();
  });
});

async function buatLaporan({ idFasilitas, kategori, hariLalu = 0, status = STATUS.MENUNGGU_VERIFIKASI, induk = null }) {
  const { rows } = await pool.query(
    `INSERT INTO laporan (id_pelapor, id_fasilitas, id_laporan_induk, foto_laporan, deskripsi_laporan,
                          kategori_kerusakan, tanggal_laporan, status_laporan)
     VALUES ((SELECT id_pengguna FROM pengguna WHERE email = 'warga1@silembur.test'), $1, $2,
             'seed/jalan-berlubang.png', 'Laporan uji skor', $3,
             NOW() - make_interval(days => $4), $5)
     RETURNING id_laporan`,
    [idFasilitas, induk, kategori, hariLalu, status],
  );
  return rows[0].id_laporan;
}

async function buatFasilitas(kategori) {
  const { rows } = await pool.query(
    `INSERT INTO fasilitas (nama_fasilitas, kategori, lokasi_fasilitas, latitude, longitude, wilayah)
     VALUES ('Fasilitas Uji Skor', $1, 'Jl. Uji', -6.9, 107.6, 'Coblong') RETURNING id_fasilitas`,
    [kategori],
  );
  fasilitasUji.push(rows[0].id_fasilitas);
  return rows[0].id_fasilitas;
}

describe('hitungSkor (Algo-009, Q-009, Q-010)', () => {
  it('mengembalikan null bila laporan belum punya baris skor_prioritas', async () => {
    const f = await buatFasilitas(KATEGORI.JALAN_BERLUBANG);
    const id = await buatLaporan({ idFasilitas: f, kategori: KATEGORI.JALAN_BERLUBANG });
    expect(await hitungSkor(pool, id)).toBeNull();
    expect(await getSkor(pool, id)).toBeNull();
  });

  it('mengembalikan null untuk laporan yang tidak ada', async () => {
    expect(await hitungSkor(pool, 999999)).toBeNull();
  });

  it('menghitung dari jumlah pelapor (1 + tergabung), lama menunggu, dan frekuensi fasilitas, lalu menyimpannya', async () => {
    const f = await buatFasilitas(KATEGORI.JALAN_BERLUBANG);
    const induk = await buatLaporan({
      idFasilitas: f, kategori: KATEGORI.JALAN_BERLUBANG, hariLalu: 3, status: STATUS.TERVERIFIKASI,
    });
    await buatLaporan({
      idFasilitas: f, kategori: KATEGORI.JALAN_BERLUBANG, hariLalu: 2, status: STATUS.DIGABUNG, induk,
    });
    await buatSkorAwal(pool, induk);

    // Jalan Berlubang 20 + 5*2 pelapor + 2*3 hari + 10*1 (hanya induk yang terhitung; anak Digabung dikecualikan)
    expect(await hitungSkor(pool, induk)).toBe(46);

    const { rows } = await pool.query(
      'SELECT jumlah_pelapor, lama_menunggu, frekuensi_berulang, skor FROM skor_prioritas WHERE id_laporan = $1',
      [induk],
    );
    expect(rows[0]).toEqual({ jumlah_pelapor: 2, lama_menunggu: 3, frekuensi_berulang: 1, skor: 46 });
    expect(await getSkor(pool, induk)).toBe(46);
  });

  it('buatSkorAwal idempoten (tidak menimpa baris yang sudah ada)', async () => {
    const f = await buatFasilitas(KATEGORI.LAMPU_JALAN_MATI);
    const id = await buatLaporan({ idFasilitas: f, kategori: KATEGORI.LAMPU_JALAN_MATI, status: STATUS.TERVERIFIKASI });
    await buatSkorAwal(pool, id);
    await hitungSkor(pool, id);
    const sebelum = await getSkor(pool, id);
    await buatSkorAwal(pool, id);
    expect(await getSkor(pool, id)).toBe(sebelum);
  });
});
