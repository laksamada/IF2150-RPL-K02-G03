// Test UC07 Mengonfirmasi dan Menggabungkan Laporan Duplikat (KF15, KF17, KF20, KF21, Algo-012). Pemilik: P1.
// Penggabungan memakai laporan buatan test sendiri (bukan data seed) agar skenario seed untuk anggota lain tetap utuh.
import { KATEGORI, STATUS } from '@silembur/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { api, auth, loginSebagai } from './helpers.js';

let tokenAdmin;
let tokenWarga;

beforeAll(async () => {
  tokenAdmin = await loginSebagai('admin');
  tokenWarga = await loginSebagai('warga1');
});
afterAll(() => pool.end());

/** Buat fasilitas + laporan uji. hariLalu menentukan urutan (lebih besar = lebih lama). */
async function buatFasilitas(kategori = KATEGORI.LAMPU_JALAN_MATI) {
  const { rows } = await pool.query(
    `INSERT INTO fasilitas (nama_fasilitas, kategori, lokasi_fasilitas, latitude, longitude, wilayah)
     VALUES ('Fasilitas Uji Duplikat', $1, 'Jl. Uji', -6.9, 107.6, 'Coblong') RETURNING id_fasilitas`,
    [kategori],
  );
  return rows[0].id_fasilitas;
}

async function buatLaporan({ idFasilitas, kategori = KATEGORI.LAMPU_JALAN_MATI, hariLalu = 1, status = STATUS.MENUNGGU_VERIFIKASI, induk = null }) {
  const { rows } = await pool.query(
    `INSERT INTO laporan (id_pelapor, id_fasilitas, id_laporan_induk, foto_laporan, deskripsi_laporan,
                          kategori_kerusakan, tanggal_laporan, status_laporan)
     VALUES (1, $1, $2, 'seed/lampu-jalan-mati.png', 'Laporan uji duplikat', $3,
             NOW() - make_interval(days => $4), $5)
     RETURNING id_laporan`,
    [idFasilitas, induk, kategori, hariLalu, status],
  );
  const id = rows[0].id_laporan;
  await pool.query(
    `INSERT INTO lokasi (id_laporan, koordinat, latitude, longitude, wilayah, alamat)
     VALUES ($1, '-6.9,107.6', -6.9, 107.6, 'Coblong', 'Jl. Uji')`,
    [id],
  );
  return id;
}

const ambil = async (id) =>
  (await pool.query('SELECT status_laporan, id_laporan_induk, id_fasilitas FROM laporan WHERE id_laporan = $1', [id])).rows[0];
const jumlahRiwayat = async (id) =>
  (await pool.query('SELECT COUNT(*) AS n FROM riwayat_status WHERE id_laporan = $1', [id])).rows[0].n;
const gabung = (idLaporan, token = tokenAdmin) =>
  api().post('/api/admin/duplikat/gabung').set(auth(token)).send({ idLaporan });

describe('GET /api/admin/duplikat/kandidat (KF20, KF21)', () => {
  it('mengelompokkan laporan aktif per fasilitas, kelompok kandidat di atas', async () => {
    const res = await api().get('/api/admin/duplikat/kandidat').set(auth(tokenAdmin));
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.length).toBeGreaterThan(0);

    const pju = data.find((k) => k.fasilitas?.nama === 'PJU Jl. Cihampelas');
    expect(pju.kandidat).toBe(true);
    expect(pju.laporan).toHaveLength(2);
    expect(pju.laporan[0].pelapor.nama).toEqual(expect.any(String)); // admin boleh melihat pelapor

    const indeksPertamaBukanKandidat = data.findIndex((k) => !k.kandidat);
    if (indeksPertamaBukanKandidat !== -1) {
      expect(data.slice(indeksPertamaBukanKandidat).every((k) => !k.kandidat)).toBe(true);
    }
  });

  it('hanya memuat laporan aktif', async () => {
    const res = await api().get('/api/admin/duplikat/kandidat').set(auth(tokenAdmin));
    const status = res.body.data.flatMap((k) => k.laporan.map((l) => l.status));
    expect(status).not.toContain(STATUS.DITOLAK);
    expect(status).not.toContain(STATUS.SELESAI);
    expect(status).not.toContain(STATUS.DIGABUNG);
  });

  it('menolak pengguna non-admin (403)', async () => {
    const res = await api().get('/api/admin/duplikat/kandidat').set(auth(tokenWarga));
    expect(res.status).toBe(403);
  });
});

describe('POST /api/admin/duplikat/gabung (Algo-012, KF15, KF17)', () => {
  it('induk = laporan terlama, sisanya Digabung dan menunjuk induk', async () => {
    const f1 = await buatFasilitas();
    const f2 = await buatFasilitas();
    const lama = await buatLaporan({ idFasilitas: f1, hariLalu: 5 });
    const baru = await buatLaporan({ idFasilitas: f2, hariLalu: 1 });
    const riwayatSebelum = await jumlahRiwayat(baru);

    const res = await gabung([baru, lama]);

    expect(res.status).toBe(200);
    expect(res.body.idLaporanInduk).toBe(lama);
    expect(res.body.digabung).toEqual([baru]);

    const anak = await ambil(baru);
    expect(anak.status_laporan).toBe(STATUS.DIGABUNG);
    expect(anak.id_laporan_induk).toBe(lama);
    expect(anak.id_fasilitas).toBe(f1); // pindah ke fasilitas induk
    expect(await jumlahRiwayat(baru)).toBe(riwayatSebelum + 1);
    expect((await ambil(lama)).status_laporan).toBe(STATUS.MENUNGGU_VERIFIKASI);
  });

  it('laporan yang sudah tergabung ke anak ikut pindah ke induk baru (jumlah pelapor tidak berkurang)', async () => {
    const f = await buatFasilitas();
    const induk = await buatLaporan({ idFasilitas: f, hariLalu: 9 });
    const anak = await buatLaporan({ idFasilitas: f, hariLalu: 3 });
    const cucu = await buatLaporan({ idFasilitas: f, hariLalu: 4, status: STATUS.DIGABUNG, induk: anak });

    expect((await gabung([induk, anak])).status).toBe(200);
    expect((await ambil(cucu)).id_laporan_induk).toBe(induk);
    const { rows } = await pool.query('SELECT COUNT(*) AS n FROM laporan WHERE id_laporan_induk = $1', [induk]);
    expect(rows[0].n).toBe(2);
  });

  it('menolak laporan tidak aktif (409) tanpa mengubah apa pun', async () => {
    const f = await buatFasilitas();
    const aktif = await buatLaporan({ idFasilitas: f, hariLalu: 3 });
    const ditolak = await buatLaporan({ idFasilitas: f, hariLalu: 2, status: STATUS.DITOLAK });

    const res = await gabung([aktif, ditolak]);
    expect(res.status).toBe(409);
    expect((await ambil(aktif)).status_laporan).toBe(STATUS.MENUNGGU_VERIFIKASI);
    expect((await ambil(ditolak)).status_laporan).toBe(STATUS.DITOLAK);
  });

  it('menolak anak Terverifikasi digabung ke induk Menunggu Verifikasi (409) tanpa mengubah apa pun (G15)', async () => {
    const f = await buatFasilitas();
    const induk = await buatLaporan({ idFasilitas: f, hariLalu: 6 });
    const terverifikasi = await buatLaporan({ idFasilitas: f, hariLalu: 2, status: STATUS.TERVERIFIKASI });
    const riwayatInduk = await jumlahRiwayat(induk);
    const riwayatAnak = await jumlahRiwayat(terverifikasi);

    const res = await gabung([induk, terverifikasi]);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/induk/i);
    expect(await ambil(induk)).toMatchObject({ status_laporan: STATUS.MENUNGGU_VERIFIKASI, id_laporan_induk: null });
    expect(await ambil(terverifikasi)).toMatchObject({ status_laporan: STATUS.TERVERIFIKASI, id_laporan_induk: null });
    expect(await jumlahRiwayat(induk)).toBe(riwayatInduk);
    expect(await jumlahRiwayat(terverifikasi)).toBe(riwayatAnak);
  });

  it('tetap menggabungkan bila induk lebih lanjut dari anaknya (G15)', async () => {
    const f = await buatFasilitas();
    const induk = await buatLaporan({ idFasilitas: f, hariLalu: 7, status: STATUS.DIPROSES });
    const terverifikasi = await buatLaporan({ idFasilitas: f, hariLalu: 3, status: STATUS.TERVERIFIKASI });
    const menunggu = await buatLaporan({ idFasilitas: f, hariLalu: 1 });

    const res = await gabung([menunggu, terverifikasi, induk]);

    expect(res.status).toBe(200);
    expect(res.body.idLaporanInduk).toBe(induk);
    expect(res.body.digabung).toEqual([terverifikasi, menunggu]);
    expect((await ambil(induk)).status_laporan).toBe(STATUS.DIPROSES);
    expect(await ambil(terverifikasi)).toMatchObject({ status_laporan: STATUS.DIGABUNG, id_laporan_induk: induk });
    expect(await ambil(menunggu)).toMatchObject({ status_laporan: STATUS.DIGABUNG, id_laporan_induk: induk });
  });

  it('menolak kategori berbeda (400)', async () => {
    const f = await buatFasilitas();
    const a = await buatLaporan({ idFasilitas: f, kategori: KATEGORI.LAMPU_JALAN_MATI });
    const b = await buatLaporan({ idFasilitas: f, kategori: KATEGORI.JALAN_BERLUBANG });
    expect((await gabung([a, b])).status).toBe(400);
  });

  it('menolak input kurang dari dua laporan berbeda (400) dan id yang tidak ada (404)', async () => {
    const f = await buatFasilitas();
    const a = await buatLaporan({ idFasilitas: f });
    expect((await gabung([a])).status).toBe(400);
    expect((await gabung([a, a])).status).toBe(400);
    expect((await gabung([a, 999999])).status).toBe(404);
  });

  it('menolak pengguna non-admin (403)', async () => {
    expect((await gabung([1, 2], tokenWarga)).status).toBe(403);
  });
});
