// Test UC02 Verifikasi Laporan & skor prioritas (KF05, KF06, KF07, KF08, KF09, KF16). Pemilik: P4.
// Semua perubahan memakai laporan buatan test sendiri (bukan data seed) agar skenario seed anggota lain tetap utuh.
import { KATEGORI, STATUS } from '@silembur/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/pool.js';
import { api, auth, loginSebagai } from './helpers.js';

let tokenAdmin;
let tokenWarga;
let tokenPemda;

beforeAll(async () => {
  tokenAdmin = await loginSebagai('admin');
  tokenWarga = await loginSebagai('warga1');
  tokenPemda = await loginSebagai('pemda');
});

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

async function buatLaporanUji({ kategori = KATEGORI.JALAN_BERLUBANG, deskripsi = 'Laporan uji verifikasi', alamat = 'Jl. Uji Verifikasi' } = {}) {
  const { rows: f } = await pool.query(
    `INSERT INTO fasilitas (nama_fasilitas, kategori, lokasi_fasilitas, latitude, longitude, wilayah)
     VALUES ('Fasilitas Uji Verifikasi', $1, $2, -6.9, 107.6, 'Coblong') RETURNING id_fasilitas`,
    [kategori, alamat],
  );
  fasilitasUji.push(f[0].id_fasilitas);
  const { rows } = await pool.query(
    `INSERT INTO laporan (id_pelapor, id_fasilitas, foto_laporan, deskripsi_laporan, kategori_kerusakan)
     VALUES ((SELECT id_pengguna FROM pengguna WHERE email = 'warga1@silembur.test'), $1,
             'seed/jalan-berlubang.png', $2, $3)
     RETURNING id_laporan`,
    [f[0].id_fasilitas, deskripsi, kategori],
  );
  const id = rows[0].id_laporan;
  await pool.query(
    `INSERT INTO lokasi (id_laporan, koordinat, latitude, longitude, wilayah, alamat)
     VALUES ($1, '-6.9,107.6', -6.9, 107.6, 'Coblong', $2)`,
    [id, alamat],
  );
  return id;
}

const putuskan = (id, body, token = tokenAdmin) =>
  api().post(`/api/admin/laporan/${id}/verifikasi`).set(auth(token)).send(body);
const statusLaporan = async (id) =>
  (await pool.query('SELECT status_laporan FROM laporan WHERE id_laporan = $1', [id])).rows[0].status_laporan;
const barisSkor = async (id) => (await pool.query('SELECT skor FROM skor_prioritas WHERE id_laporan = $1', [id])).rows;
const notifikasiLaporan = async (id) =>
  (await pool.query('SELECT id_pelapor, isi_pesan, dibaca FROM notifikasi WHERE id_laporan = $1 ORDER BY id_notifikasi', [id])).rows;
const jumlahVerifikasi = async (id) =>
  (await pool.query('SELECT COUNT(*) AS n FROM verifikasi WHERE id_laporan = $1', [id])).rows[0].n;

describe('POST /api/admin/laporan/:id/verifikasi (KF05, KF07, KF09, KF16)', () => {
  it('Disetujui -> Terverifikasi, skor > 0 tersimpan, notifikasi terkirim ke pelapor', async () => {
    const id = await buatLaporanUji();
    const res = await putuskan(id, { keputusan: 'Disetujui', catatan: 'Lokasi dan foto sesuai.' });

    expect(res.status).toBe(200);
    expect(res.body.skor).toBeGreaterThan(0);
    expect(res.body.laporan.id).toBe(id);
    expect(res.body.laporan.status).toBe(STATUS.TERVERIFIKASI);
    expect(res.body.laporan.skor).toBe(res.body.skor);

    expect(await statusLaporan(id)).toBe(STATUS.TERVERIFIKASI);
    const skor = await barisSkor(id);
    expect(skor).toHaveLength(1);
    expect(skor[0].skor).toBeGreaterThan(0);

    const notif = await notifikasiLaporan(id);
    expect(notif).toHaveLength(1);
    expect(notif[0].isi_pesan).toBe(`Laporan #${id}: Disetujui. Lokasi dan foto sesuai.`);
    expect(notif[0].dibaca).toBe(false);

    const riwayat = await pool.query('SELECT status_baru FROM riwayat_status WHERE id_laporan = $1 ORDER BY id_riwayat DESC LIMIT 1', [id]);
    expect(riwayat.rows[0].status_baru).toBe(STATUS.TERVERIFIKASI);
  });

  it('Disetujui tanpa catatan tetap berhasil dan pesan notifikasi tidak berekor spasi', async () => {
    const id = await buatLaporanUji();
    const res = await putuskan(id, { keputusan: 'Disetujui' });
    expect(res.status).toBe(200);
    expect((await notifikasiLaporan(id))[0].isi_pesan).toBe(`Laporan #${id}: Disetujui.`);
  });

  it('Ditolak -> status Ditolak, tanpa baris skor, pelapor diberi tahu', async () => {
    const id = await buatLaporanUji();
    const res = await putuskan(id, { keputusan: 'Ditolak', catatan: 'Bukan fasilitas umum.' });

    expect(res.status).toBe(200);
    expect(res.body.skor).toBeNull();
    expect(await statusLaporan(id)).toBe(STATUS.DITOLAK);
    expect(await barisSkor(id)).toHaveLength(0);
    expect((await notifikasiLaporan(id))[0].isi_pesan).toBe(`Laporan #${id}: Ditolak. Bukan fasilitas umum.`);
  });

  it('Revisi dengan catatan -> status Perlu Revisi, tanpa skor, pelapor diberi tahu', async () => {
    const id = await buatLaporanUji();
    const res = await putuskan(id, { keputusan: 'Revisi', catatan: 'Foto kurang jelas.' });

    expect(res.status).toBe(200);
    expect(await statusLaporan(id)).toBe(STATUS.PERLU_REVISI);
    expect(await barisSkor(id)).toHaveLength(0);
    expect((await notifikasiLaporan(id))[0].isi_pesan).toBe(`Laporan #${id}: Revisi. Foto kurang jelas.`);
  });

  it('Revisi atau Ditolak tanpa catatan -> 400 dan tidak ada yang berubah', async () => {
    const id = await buatLaporanUji();
    for (const keputusan of ['Revisi', 'Ditolak']) {
      const res = await putuskan(id, { keputusan, catatan: '   ' });
      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe('catatan');
    }
    expect(await statusLaporan(id)).toBe(STATUS.MENUNGGU_VERIFIKASI);
    expect(await jumlahVerifikasi(id)).toBe(0);
    expect(await notifikasiLaporan(id)).toHaveLength(0);
  });

  it('keputusan di luar KEPUTUSAN -> 400', async () => {
    const id = await buatLaporanUji();
    expect((await putuskan(id, { keputusan: 'Setuju', catatan: 'x' })).status).toBe(400);
  });

  it('verifikasi ulang laporan yang sudah Terverifikasi -> 409 tanpa efek samping', async () => {
    const id = await buatLaporanUji();
    expect((await putuskan(id, { keputusan: 'Disetujui' })).status).toBe(200);
    const ulang = await putuskan(id, { keputusan: 'Ditolak', catatan: 'Salah' });
    expect(ulang.status).toBe(409);
    expect(await statusLaporan(id)).toBe(STATUS.TERVERIFIKASI);
    expect(await jumlahVerifikasi(id)).toBe(1);
    expect(await notifikasiLaporan(id)).toHaveLength(1);
  });

  it('laporan yang tidak ada -> 404; id bukan angka -> 400', async () => {
    expect((await putuskan(999999, { keputusan: 'Disetujui' })).status).toBe(404);
    expect((await putuskan('abc', { keputusan: 'Disetujui' })).status).toBe(400);
  });

  it('pelapor dan pemda ditolak 403; tanpa token 401', async () => {
    const id = await buatLaporanUji();
    expect((await putuskan(id, { keputusan: 'Disetujui' }, tokenWarga)).status).toBe(403);
    expect((await putuskan(id, { keputusan: 'Disetujui' }, tokenPemda)).status).toBe(403);
    const tanpaToken = await api().post(`/api/admin/laporan/${id}/verifikasi`).send({ keputusan: 'Disetujui' });
    expect(tanpaToken.status).toBe(401);
    expect(await statusLaporan(id)).toBe(STATUS.MENUNGGU_VERIFIKASI);
  });

  it('laporan yang disetujui masuk daftar prioritas dengan skor (KF08, KF18)', async () => {
    const id = await buatLaporanUji();
    const diterima = await putuskan(id, { keputusan: 'Disetujui' });
    expect(diterima.status).toBe(200);
    // Query langsung: laporan Terverifikasi + skor tersimpan = syarat tampil di daftar pemda.
    const { rows } = await pool.query(
      `SELECT l.status_laporan, sp.skor FROM laporan l JOIN skor_prioritas sp ON sp.id_laporan = l.id_laporan
        WHERE l.id_laporan = $1`,
      [id],
    );
    expect(rows[0].status_laporan).toBe(STATUS.TERVERIFIKASI);
    expect(rows[0].skor).toBe(diterima.body.skor);
  });
});

describe('GET /api/admin/laporan (KF06)', () => {
  it('default: hanya Menunggu Verifikasi, terlama dulu, memuat identitas pelapor', async () => {
    const id = await buatLaporanUji();
    const res = await api().get('/api/admin/laporan').set(auth(tokenAdmin));

    expect(res.status).toBe(200);
    const { data } = res.body;
    expect(data.length).toBeGreaterThan(0);
    expect(data.every((l) => l.status === STATUS.MENUNGGU_VERIFIKASI)).toBe(true);
    const waktu = data.map((l) => new Date(l.tanggalLaporan).getTime());
    expect(waktu).toEqual([...waktu].sort((a, b) => a - b));

    const uji = data.find((l) => l.id === id);
    expect(uji.pelapor).toEqual({ id: expect.any(Number), nama: expect.any(String), email: 'warga1@silembur.test' });
    expect(uji).toHaveProperty('skor', null);
    expect(uji).toHaveProperty('idLaporanInduk', null);
    expect(uji.lokasi.wilayah).toBe('Coblong');
  });

  it('filter status memakai nilai STATUS; status tidak dikenal -> 400', async () => {
    const res = await api().get('/api/admin/laporan').query({ status: STATUS.DITOLAK }).set(auth(tokenAdmin));
    expect(res.status).toBe(200);
    expect(res.body.data.every((l) => l.status === STATUS.DITOLAK)).toBe(true);
    expect((await api().get('/api/admin/laporan').query({ status: 'Ngawur' }).set(auth(tokenAdmin))).status).toBe(400);
  });

  it('pencarian q mencari di deskripsi dan alamat, tanpa membedakan huruf besar/kecil', async () => {
    const id = await buatLaporanUji({ deskripsi: 'Kata Unik Zxqv di deskripsi', alamat: 'Jl. Alamat Unik Qwpl' });
    const cari = (q) => api().get('/api/admin/laporan').query({ q }).set(auth(tokenAdmin));

    expect((await cari('zxqv')).body.data.map((l) => l.id)).toEqual([id]);
    expect((await cari('alamat unik qwpl')).body.data.map((l) => l.id)).toEqual([id]);
    expect((await cari('tidak-ada-yang-cocok-12345')).body.data).toEqual([]);
    expect((await cari('%')).body.data).toEqual([]); // wildcard di-escape, bukan "cocok semua"
  });

  it('pelapor dan pemda ditolak 403', async () => {
    expect((await api().get('/api/admin/laporan').set(auth(tokenWarga))).status).toBe(403);
    expect((await api().get('/api/admin/laporan').set(auth(tokenPemda))).status).toBe(403);
  });
});

describe('GET /api/admin/laporan/jumlah-baru', () => {
  it('sama dengan jumlah laporan Menunggu Verifikasi', async () => {
    const { rows } = await pool.query('SELECT COUNT(*) AS n FROM laporan WHERE status_laporan = $1', [STATUS.MENUNGGU_VERIFIKASI]);
    const res = await api().get('/api/admin/laporan/jumlah-baru').set(auth(tokenAdmin));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ jumlah: rows[0].n });
  });

  it('bertambah satu saat ada laporan baru dan berkurang saat diputuskan', async () => {
    const ambil = async () => (await api().get('/api/admin/laporan/jumlah-baru').set(auth(tokenAdmin))).body.jumlah;
    const awal = await ambil();
    const id = await buatLaporanUji();
    expect(await ambil()).toBe(awal + 1);
    await putuskan(id, { keputusan: 'Ditolak', catatan: 'Uji' });
    expect(await ambil()).toBe(awal);
  });

  it('pelapor ditolak 403', async () => {
    expect((await api().get('/api/admin/laporan/jumlah-baru').set(auth(tokenWarga))).status).toBe(403);
  });
});

describe('GET /api/admin/laporan/:id (I-06, gap G3)', () => {
  it('memuat pratinjau skor read-only (tidak menyimpan), riwayat, dan histori verifikasi', async () => {
    const id = await buatLaporanUji({ kategori: KATEGORI.POHON_TUMBANG });
    const res = await api().get(`/api/admin/laporan/${id}`).set(auth(tokenAdmin));

    expect(res.status).toBe(200);
    const { laporan } = res.body;
    expect(laporan.id).toBe(id);
    expect(laporan.pelapor.email).toBe('warga1@silembur.test');
    expect(laporan.pratinjauSkor).toEqual({
      nilai: 30 + 5 * 1 + 2 * 0 + 10 * 1, // Pohon Tumbang, 1 pelapor, baru dibuat, 1 laporan di fasilitas
      jumlahPelapor: 1,
      lamaMenunggu: 0,
      frekuensiBerulang: 1,
    });
    expect(laporan.skor).toBeNull();
    expect(await barisSkor(id)).toHaveLength(0); // pratinjau tidak menulis skor
    expect(laporan.verifikasi).toEqual([]);
    expect(Array.isArray(laporan.riwayat)).toBe(true);
  });

  it('setelah diputuskan, histori verifikasi memuat keputusan, catatan, waktu, dan nama admin', async () => {
    const id = await buatLaporanUji();
    await putuskan(id, { keputusan: 'Revisi', catatan: 'Tambahkan ukuran lubang.' });
    const res = await api().get(`/api/admin/laporan/${id}`).set(auth(tokenAdmin));

    expect(res.body.laporan.status).toBe(STATUS.PERLU_REVISI);
    expect(res.body.laporan.verifikasi).toEqual([
      { keputusan: 'Revisi', catatan: 'Tambahkan ukuran lubang.', waktu: expect.any(String), admin: expect.any(String) },
    ]);
    const statusRiwayat = res.body.laporan.riwayat.map((r) => r.statusBaru);
    expect(statusRiwayat.at(-1)).toBe(STATUS.PERLU_REVISI);
  });

  it('id yang tidak ada -> 404; id bukan angka -> 400; pelapor -> 403', async () => {
    expect((await api().get('/api/admin/laporan/999999').set(auth(tokenAdmin))).status).toBe(404);
    expect((await api().get('/api/admin/laporan/abc').set(auth(tokenAdmin))).status).toBe(400);
    expect((await api().get('/api/admin/laporan/1').set(auth(tokenWarga))).status).toBe(403);
  });
});
