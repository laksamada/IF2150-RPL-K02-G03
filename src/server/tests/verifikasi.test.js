// Test UC02 Verifikasi laporan oleh admin (KF05, KF06, KF07, KF08, KF09, KF16). Pemilik: P4.
// Keputusan diuji pada laporan buatan test sendiri agar data seed untuk anggota lain tetap utuh.
import { KATEGORI, KEPUTUSAN, STATUS } from '@silembur/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { api, auth, loginSebagai } from './helpers.js';

let tokenAdmin;
let tokenWarga;
let tokenPemda;
let idWarga;

beforeAll(async () => {
  tokenAdmin = await loginSebagai('admin');
  tokenWarga = await loginSebagai('warga1');
  tokenPemda = await loginSebagai('pemda');
  const { rows } = await pool.query("SELECT id_pengguna FROM pengguna WHERE email = 'warga1@silembur.test'");
  idWarga = rows[0].id_pengguna;
});
afterAll(() => pool.end());

async function buatLaporan({ kategori = KATEGORI.JALAN_BERLUBANG, hariLalu = 1, status = STATUS.MENUNGGU_VERIFIKASI, induk = null, deskripsi = 'Laporan uji verifikasi' } = {}) {
  const { rows: f } = await pool.query(
    `INSERT INTO fasilitas (nama_fasilitas, kategori, lokasi_fasilitas, latitude, longitude, wilayah)
     VALUES ('Fasilitas Uji Verifikasi', $1, 'Jl. Uji Verifikasi', -6.9, 107.6, 'Coblong') RETURNING id_fasilitas`,
    [kategori],
  );
  const { rows } = await pool.query(
    `INSERT INTO laporan (id_pelapor, id_fasilitas, id_laporan_induk, foto_laporan, deskripsi_laporan,
                          kategori_kerusakan, tanggal_laporan, status_laporan)
     VALUES ($1, $2, $3, 'seed/jalan-berlubang.png', $4, $5, NOW() - make_interval(days => $6), $7)
     RETURNING id_laporan`,
    [idWarga, f[0].id_fasilitas, induk, deskripsi, kategori, hariLalu, status],
  );
  const id = rows[0].id_laporan;
  await pool.query(
    `INSERT INTO lokasi (id_laporan, koordinat, latitude, longitude, wilayah, alamat)
     VALUES ($1, '-6.9,107.6', -6.9, 107.6, 'Coblong', 'Jl. Uji Verifikasi')`,
    [id],
  );
  return { id, idFasilitas: f[0].id_fasilitas };
}

const statusLaporan = async (id) =>
  (await pool.query('SELECT status_laporan FROM laporan WHERE id_laporan = $1', [id])).rows[0].status_laporan;
const barisSkor = async (id) => (await pool.query('SELECT * FROM skor_prioritas WHERE id_laporan = $1', [id])).rows[0];
const notifikasi = async (id) =>
  (await pool.query('SELECT * FROM notifikasi WHERE id_laporan = $1 ORDER BY id_notifikasi', [id])).rows;
const verifikasi = (id, body, token = tokenAdmin) =>
  api().post(`/api/admin/laporan/${id}/verifikasi`).set(auth(token)).send(body);

describe('GET /api/admin/laporan (KF06)', () => {
  it('default menampilkan antrean Menunggu Verifikasi, terlama dulu, dengan identitas pelapor', async () => {
    const res = await api().get('/api/admin/laporan').set(auth(tokenAdmin));
    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((l) => l.status === STATUS.MENUNGGU_VERIFIKASI)).toBe(true);
    const waktu = data.map((l) => new Date(l.tanggalLaporan).getTime());
    expect(waktu).toEqual([...waktu].sort((a, b) => a - b));
    expect(data[0].pelapor).toEqual({ id: expect.any(Number), nama: expect.any(String), email: expect.any(String) });
    expect(data[0]).toHaveProperty('lokasi.wilayah');
  });

  it('bisa difilter status dan dicari dengan kata kunci', async () => {
    const terverifikasi = await api().get('/api/admin/laporan').query({ status: STATUS.TERVERIFIKASI }).set(auth(tokenAdmin));
    expect(terverifikasi.status).toBe(200);
    expect(terverifikasi.body.data.every((l) => l.status === STATUS.TERVERIFIKASI)).toBe(true);

    const { id } = await buatLaporan({ deskripsi: 'Gorong-gorong unikzz amblas' });
    const cari = await api().get('/api/admin/laporan').query({ q: 'UNIKZZ' }).set(auth(tokenAdmin));
    expect(cari.body.data.map((l) => l.id)).toEqual([id]);

    const wildcard = await api().get('/api/admin/laporan').query({ q: '%' }).set(auth(tokenAdmin));
    expect(wildcard.body.data).toEqual([]);
  });

  it('menolak status tidak dikenal (400)', async () => {
    const res = await api().get('/api/admin/laporan').query({ status: 'Disetujui' }).set(auth(tokenAdmin));
    expect(res.status).toBe(400);
  });

  it('jumlah-baru sama dengan jumlah laporan Menunggu Verifikasi', async () => {
    const res = await api().get('/api/admin/laporan/jumlah-baru').set(auth(tokenAdmin));
    expect(res.status).toBe(200);
    const { rows } = await pool.query('SELECT COUNT(*) AS n FROM laporan WHERE status_laporan = $1', [STATUS.MENUNGGU_VERIFIKASI]);
    expect(res.body.jumlah).toBe(rows[0].n);
  });
});

describe('GET /api/admin/laporan/:id (I-06)', () => {
  it('memuat detail, pratinjau skor (tanpa menyimpan), riwayat, dan histori verifikasi', async () => {
    const { id: induk } = await buatLaporan({ kategori: KATEGORI.POHON_TUMBANG, hariLalu: 4 });
    await pool.query(
      `INSERT INTO riwayat_status (id_laporan, status_lama, status_baru, deskripsi_perubahan)
       VALUES ($1, NULL, $2, 'Laporan berhasil diterima oleh sistem.')`,
      [induk, STATUS.MENUNGGU_VERIFIKASI],
    );

    const res = await api().get(`/api/admin/laporan/${induk}`).set(auth(tokenAdmin));
    expect(res.status).toBe(200);
    const { laporan } = res.body;
    expect(laporan.id).toBe(induk);
    expect(laporan.pelapor.nama).toBe('Budi Santoso');
    expect(laporan.pratinjauSkor).toEqual({ nilai: 30 + 5 + 8 + 10, jumlahPelapor: 1, lamaMenunggu: 4, frekuensiBerulang: 1 });
    expect(laporan.riwayat).toHaveLength(1);
    expect(laporan.verifikasi).toEqual([]);
    expect(await barisSkor(induk)).toBeUndefined();
  });

  it('404 untuk laporan yang tidak ada, 400 untuk id tidak valid', async () => {
    expect((await api().get('/api/admin/laporan/999999').set(auth(tokenAdmin))).status).toBe(404);
    expect((await api().get('/api/admin/laporan/abc').set(auth(tokenAdmin))).status).toBe(400);
  });
});

describe('POST /api/admin/laporan/:id/verifikasi (Algo-002, Algo-008, Algo-011)', () => {
  it('Disetujui -> Terverifikasi, skor dihitung server, verifikasi & riwayat tercatat, pelapor dinotifikasi', async () => {
    const { id } = await buatLaporan({ hariLalu: 2 });
    const res = await verifikasi(id, { keputusan: KEPUTUSAN.DISETUJUI, catatan: 'Lokasi dan foto sesuai.' });

    expect(res.status).toBe(200);
    expect(res.body.laporan.status).toBe(STATUS.TERVERIFIKASI);
    expect(res.body.skor).toBeGreaterThan(0);
    expect(res.body.laporan.skor).toBe(res.body.skor);
    expect(await statusLaporan(id)).toBe(STATUS.TERVERIFIKASI);

    const skor = await barisSkor(id);
    expect(skor).toMatchObject({ jumlah_pelapor: 1, lama_menunggu: 2, frekuensi_berulang: 1, skor: 20 + 5 + 4 + 10 });

    const notif = await notifikasi(id);
    expect(notif).toHaveLength(1);
    expect(notif[0].id_pelapor).toBe(idWarga);
    expect(notif[0].isi_pesan).toBe(`Laporan #${id}: Disetujui. Lokasi dan foto sesuai.`);

    const { rows: v } = await pool.query('SELECT * FROM verifikasi WHERE id_laporan = $1', [id]);
    expect(v).toHaveLength(1);
    expect(v[0].keputusan).toBe(KEPUTUSAN.DISETUJUI);

    const { rows: r } = await pool.query('SELECT * FROM riwayat_status WHERE id_laporan = $1', [id]);
    expect(r.at(-1)).toMatchObject({ status_lama: STATUS.MENUNGGU_VERIFIKASI, status_baru: STATUS.TERVERIFIKASI });
  });

  it('Disetujui tanpa catatan tetap boleh; jumlah pelapor ikut laporan yang sudah digabung', async () => {
    const { id } = await buatLaporan({ hariLalu: 0 });
    await buatLaporan({ status: STATUS.DIGABUNG, induk: id });
    const res = await verifikasi(id, { keputusan: KEPUTUSAN.DISETUJUI });
    expect(res.status).toBe(200);
    expect((await barisSkor(id)).jumlah_pelapor).toBe(2);
    expect((await notifikasi(id))[0].isi_pesan).toBe(`Laporan #${id}: Disetujui.`);
  });

  it('Revisi tanpa catatan -> 400 dan tidak mengubah apa pun', async () => {
    const { id } = await buatLaporan();
    const res = await verifikasi(id, { keputusan: KEPUTUSAN.REVISI, catatan: '   ' });
    expect(res.status).toBe(400);
    expect(await statusLaporan(id)).toBe(STATUS.MENUNGGU_VERIFIKASI);
    expect(await notifikasi(id)).toHaveLength(0);
  });

  it('Ditolak tanpa catatan -> 400; keputusan tidak dikenal -> 400', async () => {
    const { id } = await buatLaporan();
    expect((await verifikasi(id, { keputusan: KEPUTUSAN.DITOLAK })).status).toBe(400);
    expect((await verifikasi(id, { keputusan: 'Terverifikasi', catatan: 'x' })).status).toBe(400);
  });

  it('Revisi dengan catatan -> Perlu Revisi, tanpa skor, pelapor dinotifikasi', async () => {
    const { id } = await buatLaporan();
    const res = await verifikasi(id, { keputusan: KEPUTUSAN.REVISI, catatan: 'Foto kurang jelas.' });
    expect(res.status).toBe(200);
    expect(res.body.skor).toBeNull();
    expect(await statusLaporan(id)).toBe(STATUS.PERLU_REVISI);
    expect(await barisSkor(id)).toBeUndefined();
    expect((await notifikasi(id))[0].isi_pesan).toBe(`Laporan #${id}: Revisi. Foto kurang jelas.`);
  });

  it('Ditolak -> status Ditolak tanpa skor (laporan tertahan, KF08)', async () => {
    const { id } = await buatLaporan();
    const res = await verifikasi(id, { keputusan: KEPUTUSAN.DITOLAK, catatan: 'Bukan fasilitas umum.' });
    expect(res.status).toBe(200);
    expect(res.body.laporan.status).toBe(STATUS.DITOLAK);
    expect(res.body.skor).toBeNull();
    expect(await barisSkor(id)).toBeUndefined();
    expect(await notifikasi(id)).toHaveLength(1);
  });

  it('verifikasi ulang laporan yang sudah Terverifikasi -> 409 tanpa efek samping', async () => {
    const { id } = await buatLaporan();
    expect((await verifikasi(id, { keputusan: KEPUTUSAN.DISETUJUI })).status).toBe(200);
    const res = await verifikasi(id, { keputusan: KEPUTUSAN.DITOLAK, catatan: 'Coba tolak.' });
    expect(res.status).toBe(409);
    expect(await statusLaporan(id)).toBe(STATUS.TERVERIFIKASI);
    expect(await notifikasi(id)).toHaveLength(1);
    const { rows } = await pool.query('SELECT COUNT(*) AS n FROM verifikasi WHERE id_laporan = $1', [id]);
    expect(rows[0].n).toBe(1);
  });

  it('404 untuk laporan yang tidak ada', async () => {
    expect((await verifikasi(999999, { keputusan: KEPUTUSAN.DISETUJUI })).status).toBe(404);
  });

  it('pelapor dan pemda ditolak (403)', async () => {
    const { id } = await buatLaporan();
    expect((await verifikasi(id, { keputusan: KEPUTUSAN.DISETUJUI }, tokenWarga)).status).toBe(403);
    expect((await verifikasi(id, { keputusan: KEPUTUSAN.DISETUJUI }, tokenPemda)).status).toBe(403);
    expect((await api().get('/api/admin/laporan').set(auth(tokenWarga))).status).toBe(403);
    expect((await api().get(`/api/admin/laporan/${id}`).set(auth(tokenPemda))).status).toBe(403);
    expect((await api().get('/api/admin/laporan/jumlah-baru').set(auth(tokenPemda))).status).toBe(403);
    expect(await statusLaporan(id)).toBe(STATUS.MENUNGGU_VERIFIKASI);
  });
});
