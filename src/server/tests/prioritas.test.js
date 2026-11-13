// Test UC03 daftar prioritas pemda + pembaruan status (KF12, KF17, KF18, KF19, KNF02, gap G8, G9, G10, G14). Pemilik: P5.
// Perubahan status memakai laporan buatan test sendiri agar data seed untuk test lain tetap utuh.
import { KATEGORI, STATUS, STATUS_PRIORITAS } from '@silembur/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { api, auth, loginSebagai } from './helpers.js';

let tokenPemda;
let tokenAdmin;
let tokenWarga;

beforeAll(async () => {
  [tokenPemda, tokenAdmin, tokenWarga] = await Promise.all([
    loginSebagai('pemda'),
    loginSebagai('admin'),
    loginSebagai('warga1'),
  ]);
});
afterAll(() => pool.end());

const FIELD_PELAPOR = ['pelapor', 'idPelapor', 'id_pelapor', 'nama', 'email', 'namaPelapor'];
const prioritas = (query = {}, token = tokenPemda) => api().get('/api/prioritas').query(query).set(auth(token));
const ubahStatus = (id, body, token = tokenPemda) =>
  api().patch(`/api/laporan/${id}/status`).set(auth(token)).send(body);

/** Laporan uji berstatus tertentu + skor tersimpan (dihitung barusan, jadi tidak dihitung ulang). */
async function buatLaporanUji({ status = STATUS.TERVERIFIKASI, skor = 1 } = {}) {
  const { rows } = await pool.query(
    `INSERT INTO laporan (id_pelapor, foto_laporan, deskripsi_laporan, kategori_kerusakan, status_laporan)
     VALUES (1, 'seed/lainnya.png', 'Laporan uji prioritas', $1, $2) RETURNING id_laporan`,
    [KATEGORI.LAINNYA, status],
  );
  const id = rows[0].id_laporan;
  await pool.query(
    `INSERT INTO lokasi (id_laporan, koordinat, latitude, longitude, wilayah, alamat)
     VALUES ($1, '-6.9,107.6', -6.9, 107.6, 'Lengkong', 'Jl. Uji Prioritas')`,
    [id],
  );
  if (skor !== null) {
    await pool.query('INSERT INTO skor_prioritas (id_laporan, skor) VALUES ($1, $2)', [id, skor]);
  }
  return id;
}

describe('GET /api/prioritas (UC03, Q-004)', () => {
  it('hanya laporan Terverifikasi/Diproses, urut skor menurun', async () => {
    const res = await prioritas();
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.length).toBeGreaterThan(0);
    for (const l of data) expect(STATUS_PRIORITAS).toContain(l.status);

    const nilai = data.map((l) => l.skor?.nilai ?? -Infinity);
    expect(nilai).toEqual([...nilai].sort((a, b) => b - a));

    // Cocok dengan isi basis data: semua laporan prioritas yang ada ikut tampil.
    const { rows } = await pool.query('SELECT COUNT(*) AS n FROM laporan WHERE status_laporan = ANY($1)', [
      [...STATUS_PRIORITAS],
    ]);
    expect(data.length).toBe(rows[0].n);
  });

  it('tidak memuat laporan Menunggu Verifikasi, Perlu Revisi, Ditolak, Selesai, Digabung', async () => {
    const { rows } = await pool.query(
      'SELECT id_laporan FROM laporan WHERE status_laporan <> ALL($1)',
      [[...STATUS_PRIORITAS]],
    );
    const idLain = new Set(rows.map((r) => r.id_laporan));
    expect(idLain.size).toBeGreaterThan(0);
    const res = await prioritas();
    expect(res.body.data.some((l) => idLain.has(l.id))).toBe(false);
  });

  it('bentuk LaporanPrioritas tanpa identitas pelapor (KNF02, G9)', async () => {
    const res = await prioritas();
    const l = res.body.data[0];
    expect(l).toMatchObject({
      id: expect.any(Number),
      kategori: expect.any(String),
      status: expect.any(String),
      foto: expect.stringMatching(/^(\/uploads\/|https?:\/\/)/),
      lokasi: { latitude: expect.any(Number), longitude: expect.any(Number), wilayah: expect.any(String) },
    });
    expect(l.skor).toMatchObject({ nilai: expect.any(Number), jumlahPelapor: expect.any(Number) });

    for (const item of res.body.data) {
      for (const f of FIELD_PELAPOR) expect(item).not.toHaveProperty(f);
    }
    const teks = JSON.stringify(res.body);
    for (const bocor of ['Budi Santoso', 'Siti Rahmawati', 'Andi Wijaya', '@silembur.test']) {
      expect(teks).not.toContain(bocor);
    }
  });

  it('filter kategori', async () => {
    const res = await prioritas({ kategori: KATEGORI.JALAN_BERLUBANG });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const l of res.body.data) expect(l.kategori).toBe(KATEGORI.JALAN_BERLUBANG);
  });

  it('filter wilayah (+ kombinasi kategori)', async () => {
    const res = await prioritas({ wilayah: 'Sumur Bandung' });
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const l of res.body.data) expect(l.lokasi.wilayah).toBe('Sumur Bandung');

    const gabungan = await prioritas({ wilayah: 'Sumur Bandung', kategori: KATEGORI.POHON_TUMBANG });
    expect(gabungan.status).toBe(200);
    expect(gabungan.body.data).toEqual([]);
  });

  it('filter status Selesai hanya menampilkan laporan Selesai', async () => {
    const res = await prioritas({ status: STATUS.SELESAI });
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const l of res.body.data) expect(l.status).toBe(STATUS.SELESAI);
  });

  it('nilai filter yang tidak dikenal -> 400', async () => {
    expect((await prioritas({ status: STATUS.MENUNGGU_VERIFIKASI })).status).toBe(400);
    expect((await prioritas({ kategori: 'Bukan Kategori' })).status).toBe(400);
  });

  it('admin boleh melihat, warga tidak (403), tanpa token 401', async () => {
    expect((await prioritas({}, tokenAdmin)).status).toBe(200);
    expect((await prioritas({}, tokenWarga)).status).toBe(403);
    expect((await api().get('/api/prioritas')).status).toBe(401);
  });

  it('KF17: skor kedaluwarsa (> 1 jam) dihitung ulang tanpa merusak daftar', async () => {
    const id = await buatLaporanUji({ skor: 7 });
    await pool.query(`UPDATE skor_prioritas SET dihitung_pada = NOW() - INTERVAL '2 hours' WHERE id_laporan = $1`, [id]);
    const res = await prioritas();
    expect(res.status).toBe(200);
    const l = res.body.data.find((x) => x.id === id);
    expect(l).toBeDefined();
    expect(l.skor).not.toBeNull(); // stub P4 (null) -> skor lama tetap; implementasi P4 -> skor baru
    const nilai = res.body.data.map((x) => x.skor?.nilai ?? -Infinity);
    expect(nilai).toEqual([...nilai].sort((a, b) => b - a));
  });

  it('laporan prioritas tanpa skor tetap tampil di urutan terbawah', async () => {
    const id = await buatLaporanUji({ skor: null });
    const { data } = (await prioritas()).body;
    expect(data.at(-1).id).toBe(id);
    expect(data.at(-1).skor).toBeNull();
    await pool.query('INSERT INTO skor_prioritas (id_laporan, skor) VALUES ($1, 0)', [id]); // rapikan untuk test lain
  });
});

describe('PATCH /api/laporan/:id/status (gap G8, KF12, KF22)', () => {
  it('Terverifikasi -> Diproses -> Selesai sukses, riwayat tercatat', async () => {
    const id = await buatLaporanUji();

    const r1 = await ubahStatus(id, { status: STATUS.DIPROSES, keterangan: 'Tim lapangan dikirim.' });
    expect(r1.status).toBe(200);
    expect(r1.body.laporan).toMatchObject({ id, status: STATUS.DIPROSES });
    for (const f of FIELD_PELAPOR) expect(r1.body.laporan).not.toHaveProperty(f);

    const r2 = await ubahStatus(id, { status: STATUS.SELESAI, keterangan: 'Perbaikan selesai.' });
    expect(r2.status).toBe(200);
    expect(r2.body.laporan.status).toBe(STATUS.SELESAI);

    const { rows } = await pool.query(
      `SELECT status_lama, status_baru, deskripsi_perubahan, id_pengguna FROM riwayat_status
        WHERE id_laporan = $1 ORDER BY id_riwayat`,
      [id],
    );
    expect(rows.map((r) => [r.status_lama, r.status_baru])).toEqual([
      [STATUS.TERVERIFIKASI, STATUS.DIPROSES],
      [STATUS.DIPROSES, STATUS.SELESAI],
    ]);
    expect(rows[1].deskripsi_perubahan).toBe('Perbaikan selesai.');
    expect(rows[1].id_pengguna).toBe(5); // pemda@silembur.test (urutan seed)

    // Selesai keluar dari daftar prioritas default (KF18, G10).
    const daftar = (await prioritas()).body.data;
    expect(daftar.some((l) => l.id === id)).toBe(false);
  });

  it('Selesai -> Diproses ditolak 409 dan status tidak berubah', async () => {
    const id = await buatLaporanUji({ status: STATUS.SELESAI });
    const res = await ubahStatus(id, { status: STATUS.DIPROSES, keterangan: 'Coba buka lagi.' });
    expect(res.status).toBe(409);
    const { rows } = await pool.query('SELECT status_laporan FROM laporan WHERE id_laporan = $1', [id]);
    expect(rows[0].status_laporan).toBe(STATUS.SELESAI);
  });

  it('Terverifikasi -> Selesai (melompati Diproses) ditolak 409', async () => {
    const id = await buatLaporanUji();
    const res = await ubahStatus(id, { status: STATUS.SELESAI, keterangan: 'Langsung selesai.' });
    expect(res.status).toBe(409);
  });

  it('laporan Menunggu Verifikasi tidak bisa diproses pemda (409)', async () => {
    const id = await buatLaporanUji({ status: STATUS.MENUNGGU_VERIFIKASI, skor: null });
    expect((await ubahStatus(id, { status: STATUS.DIPROSES, keterangan: 'x' })).status).toBe(409);
  });

  it('validasi: status di luar Diproses/Selesai atau keterangan kosong -> 400', async () => {
    const id = await buatLaporanUji();
    expect((await ubahStatus(id, { status: STATUS.TERVERIFIKASI, keterangan: 'x' })).status).toBe(400);
    expect((await ubahStatus(id, { status: STATUS.DIPROSES, keterangan: '   ' })).status).toBe(400);
  });

  it('laporan tidak ada -> 404', async () => {
    expect((await ubahStatus(999999, { status: STATUS.DIPROSES, keterangan: 'x' })).status).toBe(404);
  });

  it('warga dan admin tidak boleh mengubah status penanganan (403)', async () => {
    const id = await buatLaporanUji();
    expect((await ubahStatus(id, { status: STATUS.DIPROSES, keterangan: 'x' }, tokenWarga)).status).toBe(403);
    expect((await ubahStatus(id, { status: STATUS.DIPROSES, keterangan: 'x' }, tokenAdmin)).status).toBe(403);
  });
});
