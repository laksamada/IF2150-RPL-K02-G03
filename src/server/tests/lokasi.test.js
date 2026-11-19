// Test unit C05 Lokasi, batas radius C06 Fasilitas, dan kasus gagal C01 konfirmasiSimpanLaporan (UC01). Pemilik: P2.
// Setiap test berjalan dalam transaksi yang di-ROLLBACK, jadi data seed tidak berubah.
import { ATURAN, KATEGORI, STATUS, SUMBER_LOKASI } from '@silembur/shared';
import { afterAll, describe, expect, it } from 'vitest';
import { getWilayahFromCoordinates } from '../src/adapters/googleMapsAdapter.js';
import { HttpError } from '../src/utils/http.js';
import { pool } from '../src/db/pool.js';
import { cariAtauBuatFasilitas } from '../src/models/fasilitas/cocokkan.js';
import { konfirmasiSimpanLaporan, simpanLaporan } from '../src/models/laporan/buat.js';
import { formatKoordinat, getWilayah, setLokasiLaporan } from '../src/models/lokasi/lokasi.js';

const METER_PER_DERAJAT_LAT = (2 * Math.PI * 6_371_000) / 360; // sama dengan jari-jari pada jarakMeter()
const TITIK = { latitude: -6.9147, longitude: 107.6098 }; // Kota Bandung (Sumur Bandung)

afterAll(async () => {
  await pool.end();
});

/** Menjalankan fn di dalam transaksi lalu membatalkan semua perubahannya. */
async function dalamRollback(fn) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    return await fn(db);
  } finally {
    await db.query('ROLLBACK');
    db.release();
  }
}

async function idPelapor(db, email = 'warga1@silembur.test') {
  return (await db.query('SELECT id_pengguna FROM pengguna WHERE email = $1', [email])).rows[0].id_pengguna;
}

/** Laporan baru tanpa baris lokasi, sebagai pemilik lokasi yang diuji. */
async function laporanTanpaLokasi(db) {
  const idFasilitas = (await db.query('SELECT id_fasilitas FROM fasilitas ORDER BY id_fasilitas LIMIT 1')).rows[0].id_fasilitas;
  return simpanLaporan(db, {
    idPelapor: await idPelapor(db),
    idFasilitas,
    foto: 'laporan/uji/a.png',
    deskripsi: 'Uji lokasi',
    kategori: KATEGORI.JALAN_BERLUBANG,
  });
}

describe('C05 Lokasi: setLokasiLaporan (Algo-006, Q-005)', () => {
  it('normal: titik GPS di Kota Bandung disimpan dengan wilayah dari adapter', async () => {
    await dalamRollback(async (db) => {
      const idLaporan = await laporanTanpaLokasi(db);

      const hasil = await setLokasiLaporan(db, { idLaporan, ...TITIK });

      const { rows } = await db.query('SELECT * FROM lokasi WHERE id_laporan = $1', [idLaporan]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ koordinat: '-6.914700,107.609800', sumber: SUMBER_LOKASI.GPS });
      expect(rows[0].wilayah).not.toBe('Luar Kota Bandung');
      expect(rows[0].alamat).toContain('Kota Bandung');
      expect(hasil.wilayah).toBe(rows[0].wilayah);
    });
  });

  it('batas: dipanggil ulang (revisi) menimpa baris yang sama, koordinat dibulatkan 6 desimal', async () => {
    await dalamRollback(async (db) => {
      const idLaporan = await laporanTanpaLokasi(db);
      await setLokasiLaporan(db, { idLaporan, ...TITIK });

      await setLokasiLaporan(db, {
        idLaporan,
        latitude: -6.91750049,
        longitude: 107.61910051,
        sumber: SUMBER_LOKASI.MANUAL,
        wilayah: 'Regol',
        alamat: 'Jl. Uji',
      });

      const { rows } = await db.query('SELECT * FROM lokasi WHERE id_laporan = $1', [idLaporan]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        koordinat: '-6.917500,107.619101',
        sumber: SUMBER_LOKASI.MANUAL,
        wilayah: 'Regol',
        alamat: 'Jl. Uji',
      });
    });
  });

  it('negatif: laporan yang tidak ada ditolak basis data, tidak ada baris lokasi tersimpan', async () => {
    await dalamRollback(async (db) => {
      await db.query('SAVEPOINT sebelum');
      await expect(setLokasiLaporan(db, { idLaporan: 999999, ...TITIK })).rejects.toThrow();
      await db.query('ROLLBACK TO SAVEPOINT sebelum');
      const { rows } = await db.query('SELECT 1 FROM lokasi WHERE id_laporan = 999999');
      expect(rows).toHaveLength(0);
    });
  });

  it('formatKoordinat menghasilkan "lat,lng" dengan 6 desimal', () => {
    expect(formatKoordinat(-6.9, 107.6)).toBe('-6.900000,107.600000');
  });
});

describe('C05 Lokasi: getWilayah', () => {
  it('normal: mengembalikan wilayah lokasi laporan', async () => {
    await dalamRollback(async (db) => {
      const idLaporan = await laporanTanpaLokasi(db);
      await setLokasiLaporan(db, { idLaporan, ...TITIK, wilayah: 'Coblong', alamat: 'Jl. Dago' });
      expect(await getWilayah(db, idLaporan)).toBe('Coblong');
    });
  });

  it('negatif: laporan tanpa lokasi atau tidak ada -> null', async () => {
    await dalamRollback(async (db) => {
      const idLaporan = await laporanTanpaLokasi(db);
      expect(await getWilayah(db, idLaporan)).toBeNull();
      expect(await getWilayah(db, 999999)).toBeNull();
    });
  });
});

describe('C06 Fasilitas: cariAtauBuatFasilitas tepat di batas radius 30 m', () => {
  it('29,9 m memakai fasilitas yang sama, 30,1 m membuat fasilitas baru', async () => {
    await dalamRollback(async (db) => {
      const asal = { latitude: -6.9300, longitude: 107.6400 };
      const isian = { kategori: KATEGORI.POHON_TUMBANG, wilayah: 'Uji', alamat: 'Titik uji' };
      const pertama = await cariAtauBuatFasilitas(db, { ...isian, ...asal });
      expect(pertama.baru).toBe(true);

      const geser = (meter) => ({ latitude: asal.latitude + meter / METER_PER_DERAJAT_LAT, longitude: asal.longitude });
      const dalam = await cariAtauBuatFasilitas(db, { ...isian, ...geser(ATURAN.RADIUS_FASILITAS_METER - 0.1) });
      const luar = await cariAtauBuatFasilitas(db, { ...isian, ...geser(ATURAN.RADIUS_FASILITAS_METER + 0.1) });

      expect(dalam).toEqual({ idFasilitas: pertama.idFasilitas, baru: false });
      expect(luar.baru).toBe(true);
      expect(luar.idFasilitas).not.toBe(pertama.idFasilitas);
    });
  });
});

describe('C01 Pelapor: konfirmasiSimpanLaporan (Algo-001)', () => {
  it('gagal: isian tidak lengkap -> HttpError 400, laporan dan jumlah laporan tidak berubah', async () => {
    await dalamRollback(async (db) => {
      const id = await idPelapor(db);
      const hitung = async () => ({
        laporan: Number((await db.query('SELECT COUNT(*) AS n FROM laporan')).rows[0].n),
        jumlah: (await db.query('SELECT jumlah_laporan FROM pengguna WHERE id_pengguna = $1', [id])).rows[0].jumlah_laporan,
      });
      const sebelum = await hitung();

      const janji = konfirmasiSimpanLaporan(db, {
        idPelapor: id,
        foto: 'laporan/uji/a.png',
        deskripsi: '   ',
        kategori: KATEGORI.JALAN_BERLUBANG,
        ...TITIK,
        sumber: SUMBER_LOKASI.GPS,
      });
      await expect(janji).rejects.toBeInstanceOf(HttpError);
      await expect(janji).rejects.toMatchObject({ status: 400 });
      expect(await hitung()).toEqual(sebelum);
    });
  });

  it('normal: menyimpan laporan Menunggu Verifikasi beserta lokasi dan riwayat, jumlah laporan +1', async () => {
    await dalamRollback(async (db) => {
      const id = await idPelapor(db);
      const jumlah = async () =>
        (await db.query('SELECT jumlah_laporan FROM pengguna WHERE id_pengguna = $1', [id])).rows[0].jumlah_laporan;
      const sebelum = await jumlah();

      const idLaporan = await konfirmasiSimpanLaporan(db, {
        idPelapor: id,
        foto: 'laporan/uji/a.png',
        deskripsi: '  Jalan berlubang di depan sekolah.  ',
        kategori: KATEGORI.JALAN_BERLUBANG,
        ...TITIK,
        sumber: SUMBER_LOKASI.GPS,
        // Controller selalu mengirim wilayah dan alamat dari getWilayahFromCoordinates() sebelum memanggil fungsi ini.
        ...(await getWilayahFromCoordinates(TITIK.latitude, TITIK.longitude)),
      });

      const { rows } = await db.query('SELECT status_laporan, deskripsi_laporan FROM laporan WHERE id_laporan = $1', [idLaporan]);
      expect(rows[0]).toEqual({ status_laporan: STATUS.MENUNGGU_VERIFIKASI, deskripsi_laporan: 'Jalan berlubang di depan sekolah.' });
      expect(await getWilayah(db, idLaporan)).not.toBeNull();
      expect(await jumlah()).toBe(sebelum + 1);
    });
  });
});