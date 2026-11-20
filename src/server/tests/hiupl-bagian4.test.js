// Test HIUPL M10 Bagian 4 (UC02 Verifikasi & skor prioritas). Dijalankan pada tag v9.1.
// Cakupan ID: C02-UT01..04, C04-UT11..13, C07-UT01..06, C08-UT01..06, C10-UT05..06, INT-TC11..12.
// Setiap test memakai laporan/fasilitas buatan sendiri dan membersihkannya di afterAll,
// sehingga data seed dan test anggota lain tidak terpengaruh.
import { BOBOT_KATEGORI, KATEGORI, KEPUTUSAN, STATUS } from '@silembur/shared';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { pool, withTransaction } from '../src/db/pool.js';
import { Laporan, Notifikasi, SkorPrioritas, Verifikasi } from '../src/models/index.js';
import { api, auth, loginSebagai } from './helpers.js';

let tokenAdmin;
let tokenWarga;
let tokenPemda;
let idWarga;
let idAdmin;

const dibuat = { laporan: [], fasilitas: [] };

beforeAll(async () => {
  tokenAdmin = await loginSebagai('admin');
  tokenWarga = await loginSebagai('warga1');
  tokenPemda = await loginSebagai('pemda');
  idWarga = (await pool.query("SELECT id_pengguna FROM pengguna WHERE email = 'warga1@silembur.test'")).rows[0].id_pengguna;
  idAdmin = (await pool.query("SELECT id_pengguna FROM pengguna WHERE email = 'admin@silembur.test'")).rows[0].id_pengguna;
});

afterAll(async () => {
  if (dibuat.laporan.length) {
    // Anak (Digabung) dihapus lebih dulu karena id_laporan_induk tidak memakai ON DELETE CASCADE.
    await pool.query('DELETE FROM laporan WHERE id_laporan = ANY($1) AND id_laporan_induk IS NOT NULL', [dibuat.laporan]);
    await pool.query('DELETE FROM laporan WHERE id_laporan = ANY($1)', [dibuat.laporan]);
  }
  if (dibuat.fasilitas.length) {
    await pool.query('DELETE FROM fasilitas WHERE id_fasilitas = ANY($1)', [dibuat.fasilitas]);
  }
  await pool.end();
});

// ---------------------------------------------------------------------------------------------
// Pembantu
// ---------------------------------------------------------------------------------------------

async function buatFasilitas(kategori = KATEGORI.JALAN_BERLUBANG) {
  const { rows } = await pool.query(
    `INSERT INTO fasilitas (nama_fasilitas, kategori, lokasi_fasilitas, latitude, longitude, wilayah)
     VALUES ('Fasilitas Uji HIUPL Bagian 4', $1, 'Jl. Uji HIUPL Bagian 4', -6.9, 107.6, 'Coblong')
     RETURNING id_fasilitas`,
    [kategori],
  );
  dibuat.fasilitas.push(rows[0].id_fasilitas);
  return rows[0].id_fasilitas;
}

/**
 * Laporan uji milik warga1. `jam` = umur laporan dalam jam (24 jam = lama menunggu 1 hari).
 * `tanggal` (opsional) menimpa `jam` dengan waktu persis, dipakai untuk menguji urutan seri.
 */
async function buatLaporan({
  kategori = KATEGORI.JALAN_BERLUBANG,
  jam = 24,
  tanggal = null,
  status = STATUS.MENUNGGU_VERIFIKASI,
  induk = null,
  idFasilitas,
  tanpaFasilitas = false,
  deskripsi = 'Laporan uji HIUPL Bagian 4',
  alamat = 'Jl. Uji HIUPL Bagian 4',
} = {}) {
  const fasilitas = tanpaFasilitas ? null : (idFasilitas ?? (await buatFasilitas(kategori)));
  const { rows } = await pool.query(
    `INSERT INTO laporan (id_pelapor, id_fasilitas, id_laporan_induk, foto_laporan, deskripsi_laporan,
                          kategori_kerusakan, tanggal_laporan, status_laporan)
     VALUES ($1, $2, $3, 'seed/jalan-berlubang.png', $4, $5,
             COALESCE($6::timestamptz, NOW() - make_interval(hours => $7)), $8)
     RETURNING id_laporan`,
    [idWarga, fasilitas, induk, deskripsi, kategori, tanggal, jam, status],
  );
  const id = rows[0].id_laporan;
  dibuat.laporan.push(id);
  await pool.query(
    `INSERT INTO lokasi (id_laporan, koordinat, latitude, longitude, wilayah, alamat)
     VALUES ($1, '-6.9,107.6', -6.9, 107.6, 'Coblong', $2)`,
    [id, alamat],
  );
  return { id, idFasilitas: fasilitas };
}

const hitung = async (sql, params) => (await pool.query(sql, params)).rows[0].n;
const statusLaporan = async (id) =>
  (await pool.query('SELECT status_laporan FROM laporan WHERE id_laporan = $1', [id])).rows[0].status_laporan;
const barisSkor = async (id) => (await pool.query('SELECT * FROM skor_prioritas WHERE id_laporan = $1', [id])).rows[0];
const barisNotifikasi = async (id) =>
  (await pool.query('SELECT * FROM notifikasi WHERE id_laporan = $1 ORDER BY id_notifikasi', [id])).rows;
const barisVerifikasi = async (id) =>
  (await pool.query('SELECT * FROM verifikasi WHERE id_laporan = $1 ORDER BY id_verifikasi', [id])).rows;
const barisRiwayat = async (id) =>
  (await pool.query('SELECT * FROM riwayat_status WHERE id_laporan = $1 ORDER BY id_riwayat', [id])).rows;
const jumlahRiwayat = (id) => hitung('SELECT COUNT(*) AS n FROM riwayat_status WHERE id_laporan = $1', [id]);

const putuskanApi = (id, body, token = tokenAdmin) =>
  api().post(`/api/admin/laporan/${id}/verifikasi`).set(auth(token)).send(body);
const daftarApi = (query = {}, token = tokenAdmin) => api().get('/api/admin/laporan').query(query).set(auth(token));
const putuskanModel = (data) => withTransaction((db) => Verifikasi.tetapkanKeputusan(db, { idAdmin, ...data }));

// Waktu dari basis data dan dari proses Node berjalan di mesin yang sama; toleransi 2 menit.
const barusan = (waktu) => Math.abs(Date.now() - new Date(waktu).getTime()) < 120_000;

// ---------------------------------------------------------------------------------------------
// C02 Admin (Sedang): lihatDaftarLaporan() dan tetapkanKeputusan() melalui API /api/admin/*
// ---------------------------------------------------------------------------------------------
describe('C02 Admin', () => {
  it('C02-UT01 lihatDaftarLaporan: antrean Menunggu Verifikasi, terlama dulu, memuat identitas pelapor', async () => {
    const lama = await buatLaporan({ jam: 72 });
    const baru = await buatLaporan({ jam: 24 });

    const res = await daftarApi();
    expect(res.status).toBe(200);
    const ids = res.body.data.map((l) => l.id);
    expect(res.body.data.every((l) => l.status === STATUS.MENUNGGU_VERIFIKASI)).toBe(true);
    expect(ids).toContain(lama.id);
    expect(ids).toContain(baru.id);
    expect(ids.indexOf(lama.id)).toBeLessThan(ids.indexOf(baru.id));

    const waktu = res.body.data.map((l) => new Date(l.tanggalLaporan).getTime());
    expect(waktu).toEqual([...waktu].sort((a, b) => a - b));

    const item = res.body.data.find((l) => l.id === lama.id);
    expect(item.pelapor).toEqual({ id: idWarga, nama: 'Budi Santoso', email: 'warga1@silembur.test' });
    expect(item.skor).toBeNull();
  });

  it('C02-UT02 lihatDaftarLaporan: filter status, kata kunci, dan batas panjang kata kunci', async () => {
    const ditolak = await buatLaporan({ status: STATUS.DITOLAK, deskripsi: 'Kata Unik Qzjx untuk filter' });

    const perStatus = await daftarApi({ status: STATUS.DITOLAK });
    expect(perStatus.status).toBe(200);
    expect(perStatus.body.data.every((l) => l.status === STATUS.DITOLAK)).toBe(true);
    expect(perStatus.body.data.map((l) => l.id)).toContain(ditolak.id);

    const kosong = await daftarApi({ status: '' });
    expect(kosong.status).toBe(200);
    expect(kosong.body.data.every((l) => l.status === STATUS.MENUNGGU_VERIFIKASI)).toBe(true);

    const cari = await daftarApi({ status: STATUS.DITOLAK, q: 'QZJX' });
    expect(cari.body.data.map((l) => l.id)).toEqual([ditolak.id]);
    expect((await daftarApi({ q: '%' })).body.data).toEqual([]);

    expect((await daftarApi({ q: 'x'.repeat(100) })).status).toBe(200);
    expect((await daftarApi({ q: 'x'.repeat(101) })).status).toBe(400);
    expect((await daftarApi({ status: 'Disetujui' })).status).toBe(400);
  });

  it('C02-UT03 tetapkanKeputusan: Disetujui, Ditolak, dan Revisi memetakan ke status yang benar', async () => {
    const setuju = await buatLaporan({ jam: 48 });
    const resSetuju = await putuskanApi(setuju.id, { keputusan: KEPUTUSAN.DISETUJUI, catatan: 'Lokasi dan foto sesuai.' });
    expect(resSetuju.status).toBe(200);
    expect(resSetuju.body.laporan.status).toBe(STATUS.TERVERIFIKASI);
    expect(resSetuju.body.skor).toBe(20 + 5 * 1 + 2 * 2 + 10 * 1); // Jalan Berlubang, 1 pelapor, 2 hari, 1 laporan di fasilitas
    expect(resSetuju.body.laporan.skor).toBe(resSetuju.body.skor);
    expect(await statusLaporan(setuju.id)).toBe(STATUS.TERVERIFIKASI);

    const tolak = await buatLaporan();
    const resTolak = await putuskanApi(tolak.id, { keputusan: KEPUTUSAN.DITOLAK, catatan: 'Bukan fasilitas umum.' });
    expect(resTolak.status).toBe(200);
    expect(resTolak.body.skor).toBeNull();
    expect(await statusLaporan(tolak.id)).toBe(STATUS.DITOLAK);

    const revisi = await buatLaporan();
    const resRevisi = await putuskanApi(revisi.id, { keputusan: KEPUTUSAN.REVISI, catatan: 'Foto kurang jelas.' });
    expect(resRevisi.status).toBe(200);
    expect(resRevisi.body.skor).toBeNull();
    expect(await statusLaporan(revisi.id)).toBe(STATUS.PERLU_REVISI);
  });

  it('C02-UT04 tetapkanKeputusan: ditolak bila catatan kosong, id salah, sudah diputuskan, atau bukan admin', async () => {
    const { id } = await buatLaporan();

    const tanpaCatatan = await putuskanApi(id, { keputusan: KEPUTUSAN.DITOLAK, catatan: '   ' });
    expect(tanpaCatatan.status).toBe(400);
    expect(tanpaCatatan.body.error.details[0].field).toBe('catatan');
    expect((await putuskanApi(id, { keputusan: 'Setuju', catatan: 'x' })).status).toBe(400);
    expect((await putuskanApi(999999, { keputusan: KEPUTUSAN.DISETUJUI })).status).toBe(404);
    expect((await putuskanApi('abc', { keputusan: KEPUTUSAN.DISETUJUI })).status).toBe(400);

    expect((await putuskanApi(id, { keputusan: KEPUTUSAN.DISETUJUI }, tokenWarga)).status).toBe(403);
    expect((await putuskanApi(id, { keputusan: KEPUTUSAN.DISETUJUI }, tokenPemda)).status).toBe(403);
    expect((await api().post(`/api/admin/laporan/${id}/verifikasi`).send({ keputusan: KEPUTUSAN.DISETUJUI })).status).toBe(401);

    expect(await statusLaporan(id)).toBe(STATUS.MENUNGGU_VERIFIKASI);
    expect(await barisVerifikasi(id)).toHaveLength(0);

    expect((await putuskanApi(id, { keputusan: KEPUTUSAN.DISETUJUI })).status).toBe(200);
    const ulang = await putuskanApi(id, { keputusan: KEPUTUSAN.DITOLAK, catatan: 'Coba tolak.' });
    expect(ulang.status).toBe(409);
    expect(await statusLaporan(id)).toBe(STATUS.TERVERIFIKASI);
    expect(await barisVerifikasi(id)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------------------------
// C04 Laporan (Mendalam): getLaporanMenungguVerifikasi, getDetailLaporan, updateStatus
// ---------------------------------------------------------------------------------------------
describe('C04 Laporan (sisi admin)', () => {
  it('C04-UT11 getLaporanMenungguVerifikasi dan hitungLaporanBaru: default, urutan, kata kunci, badge', async () => {
    const tanggalSama = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();
    const pertama = await buatLaporan({ tanggal: tanggalSama, deskripsi: 'Seri pertama Zxqv' });
    const kedua = await buatLaporan({ tanggal: tanggalSama, deskripsi: 'Seri kedua Zxqv' });
    const ditolak = await buatLaporan({ status: STATUS.DITOLAK, deskripsi: 'Sudah ditolak Zxqv' });

    // Tanpa argumen = status Menunggu Verifikasi. Seri tanggal diurutkan menurut id.
    const antrean = await Laporan.getLaporanUntukAdmin(pool);
    const ids = antrean.map((l) => l.id);
    expect(antrean.every((l) => l.status === STATUS.MENUNGGU_VERIFIKASI)).toBe(true);
    expect(ids).not.toContain(ditolak.id);
    expect(ids.indexOf(pertama.id)).toBeLessThan(ids.indexOf(kedua.id));

    // Kata kunci: tanpa membedakan huruf, spasi tepi dibuang, wildcard LIKE dianggap teks biasa.
    expect((await Laporan.getLaporanUntukAdmin(pool, { keyword: 'zXqV' })).map((l) => l.id)).toEqual([pertama.id, kedua.id]);
    expect((await Laporan.getLaporanUntukAdmin(pool, { keyword: '  seri kedua  ' })).map((l) => l.id)).toEqual([kedua.id]);
    expect(await Laporan.getLaporanUntukAdmin(pool, { keyword: '%' })).toEqual([]);
    expect(await Laporan.getLaporanUntukAdmin(pool, { keyword: 'tidak-ada-yang-cocok-98765' })).toEqual([]);
    expect(await Laporan.getLaporanUntukAdmin(pool, { keyword: '   ' })).toHaveLength(antrean.length);
    expect((await Laporan.getLaporanUntukAdmin(pool, { status: STATUS.DITOLAK, keyword: 'zxqv' })).map((l) => l.id)).toEqual([ditolak.id]);

    // Badge jumlah laporan baru.
    const awal = await Laporan.hitungLaporanBaru(pool);
    expect(typeof awal).toBe('number');
    expect(awal).toBe(antrean.length);
    const tambahan = await buatLaporan();
    expect(await Laporan.hitungLaporanBaru(pool)).toBe(awal + 1);
    await pool.query('UPDATE laporan SET status_laporan = $1 WHERE id_laporan = $2', [STATUS.DITOLAK, tambahan.id]);
    expect(await Laporan.hitungLaporanBaru(pool)).toBe(awal);
  });

  it('C04-UT12 getDetailLaporan: DTO admin, pratinjau skor tanpa menyimpan, riwayat urut, null bila tidak ada', async () => {
    const a = await buatLaporan({ kategori: KATEGORI.POHON_TUMBANG, jam: 96, alamat: 'Jl. Detail Uji A' });

    const ringkas = await Laporan.getLaporanAdmin(pool, a.id);
    expect(ringkas).toMatchObject({
      id: a.id,
      kategori: KATEGORI.POHON_TUMBANG,
      status: STATUS.MENUNGGU_VERIFIKASI,
      pelapor: { id: idWarga, nama: 'Budi Santoso', email: 'warga1@silembur.test' },
      lokasi: { wilayah: 'Coblong', alamat: 'Jl. Detail Uji A' },
      fasilitas: { id: a.idFasilitas, nama: 'Fasilitas Uji HIUPL Bagian 4' },
      skor: null,
      idLaporanInduk: null,
    });

    await pool.query(
      `INSERT INTO riwayat_status (id_laporan, status_lama, status_baru, deskripsi_perubahan, tanggal_perubahan)
       VALUES ($1, 'Menunggu Verifikasi', 'Perlu Revisi', 'Kedua', NOW() - interval '1 hour'),
              ($1, NULL, 'Menunggu Verifikasi', 'Pertama', NOW() - interval '2 hours')`,
      [a.id],
    );
    const detail = await Laporan.getDetailLaporanAdmin(pool, a.id);
    expect(detail.pratinjauSkor).toEqual({ nilai: 30 + 5 * 1 + 2 * 4 + 10 * 1, jumlahPelapor: 1, lamaMenunggu: 4, frekuensiBerulang: 1 });
    expect(detail.riwayat.map((r) => r.deskripsi)).toEqual(['Pertama', 'Kedua']);
    expect(detail.riwayat[0].statusLama).toBeNull();
    expect(detail.verifikasi).toEqual([]);
    expect(await barisSkor(a.id)).toBeUndefined(); // pratinjau tidak menulis ke skor_prioritas

    // Laporan yang sudah punya laporan tergabung dan histori verifikasi.
    const b = await buatLaporan({ jam: 24 });
    await buatLaporan({ idFasilitas: b.idFasilitas, status: STATUS.DIGABUNG, induk: b.id });
    await pool.query(
      `INSERT INTO verifikasi (id_laporan, id_admin, keputusan, catatan_alasan) VALUES ($1, $2, 'Revisi', 'Tambahkan ukuran lubang.')`,
      [b.id, idAdmin],
    );
    const detailB = await Laporan.getDetailLaporanAdmin(pool, b.id);
    expect(detailB.pratinjauSkor).toEqual({ nilai: 20 + 5 * 2 + 2 * 1 + 10 * 1, jumlahPelapor: 2, lamaMenunggu: 1, frekuensiBerulang: 1 });
    expect(detailB.verifikasi).toHaveLength(1);
    expect(detailB.verifikasi[0]).toMatchObject({ keputusan: 'Revisi', catatan: 'Tambahkan ukuran lubang.', admin: expect.any(String) });
    expect(detailB.verifikasi[0].waktu).toBeInstanceOf(Date);

    expect(await Laporan.getLaporanAdmin(pool, 999999)).toBeNull();
    expect(await Laporan.getDetailLaporanAdmin(pool, 999999)).toBeNull();
  });

  it('C04-UT13 updateStatus (ubahStatus): transisi sah tercatat, transisi tidak sah 409 tanpa perubahan', async () => {
    const ubah = (data) => withTransaction((db) => Laporan.ubahStatus(db, { idPengguna: idAdmin, deskripsi: 'Uji updateStatus', ...data }));

    // Normal: Menunggu Verifikasi -> Terverifikasi -> Diproses -> Selesai.
    const { id } = await buatLaporan();
    await pool.query("UPDATE laporan SET diperbarui_pada = NOW() - interval '1 day' WHERE id_laporan = $1", [id]);
    const sebelum = (await pool.query('SELECT diperbarui_pada FROM laporan WHERE id_laporan = $1', [id])).rows[0].diperbarui_pada;

    const hasil = await ubah({ idLaporan: id, statusBaru: STATUS.TERVERIFIKASI });
    expect(hasil).toEqual({ idLaporan: id, statusLama: STATUS.MENUNGGU_VERIFIKASI, statusBaru: STATUS.TERVERIFIKASI });
    expect(await statusLaporan(id)).toBe(STATUS.TERVERIFIKASI);
    const sesudah = (await pool.query('SELECT diperbarui_pada FROM laporan WHERE id_laporan = $1', [id])).rows[0].diperbarui_pada;
    expect(new Date(sesudah).getTime()).toBeGreaterThan(new Date(sebelum).getTime());
    expect((await barisRiwayat(id)).at(-1)).toMatchObject({
      id_pengguna: idAdmin,
      status_lama: STATUS.MENUNGGU_VERIFIKASI,
      status_baru: STATUS.TERVERIFIKASI,
      deskripsi_perubahan: 'Uji updateStatus',
    });
    await ubah({ idLaporan: id, statusBaru: STATUS.DIPROSES });
    await ubah({ idLaporan: id, statusBaru: STATUS.SELESAI });
    expect(await statusLaporan(id)).toBe(STATUS.SELESAI);
    expect(await jumlahRiwayat(id)).toBe(3);

    // Digabung membawa id_laporan_induk.
    const induk = await buatLaporan();
    const anak = await buatLaporan({ idFasilitas: induk.idFasilitas });
    await ubah({ idLaporan: anak.id, statusBaru: STATUS.DIGABUNG, idLaporanInduk: induk.id });
    expect(await statusLaporan(anak.id)).toBe(STATUS.DIGABUNG);
    expect((await pool.query('SELECT id_laporan_induk FROM laporan WHERE id_laporan = $1', [anak.id])).rows[0].id_laporan_induk).toBe(induk.id);

    // Negatif: transisi di luar TRANSISI_STATUS ditolak 409 dan tidak mengubah apa pun.
    const kasus = [
      [STATUS.MENUNGGU_VERIFIKASI, STATUS.SELESAI],
      [STATUS.DITOLAK, STATUS.TERVERIFIKASI],
      [STATUS.SELESAI, STATUS.DIPROSES],
      [STATUS.DIGABUNG, STATUS.MENUNGGU_VERIFIKASI],
    ];
    for (const [dari, ke] of kasus) {
      const l = await buatLaporan({ status: dari });
      const riwayatAwal = await jumlahRiwayat(l.id);
      await expect(ubah({ idLaporan: l.id, statusBaru: ke })).rejects.toMatchObject({ status: 409 });
      expect(await statusLaporan(l.id)).toBe(dari);
      expect(await jumlahRiwayat(l.id)).toBe(riwayatAwal);
    }
    await expect(ubah({ idLaporan: 999999, statusBaru: STATUS.TERVERIFIKASI })).rejects.toMatchObject({ status: 404 });
  });
});

// ---------------------------------------------------------------------------------------------
// C07 Verifikasi (Mendalam): simpanVerifikasi, teruskanKePemerintah, tetapkanKeputusan, tahanLaporan
// ---------------------------------------------------------------------------------------------
describe('C07 Verifikasi', () => {
  it('C07-UT01 simpanVerifikasi: mencatat keputusan, catatan, admin, dan waktu tanpa mengubah status', async () => {
    const { id } = await buatLaporan();
    const idVerifikasi = await Verifikasi.simpanVerifikasi(pool, {
      idLaporan: id,
      idAdmin,
      keputusan: KEPUTUSAN.REVISI,
      catatan: 'Foto kurang jelas.',
    });
    expect(typeof idVerifikasi).toBe('number');

    const baris = (await barisVerifikasi(id))[0];
    expect(baris).toMatchObject({
      id_verifikasi: idVerifikasi,
      id_laporan: id,
      id_admin: idAdmin,
      keputusan: KEPUTUSAN.REVISI,
      catatan_alasan: 'Foto kurang jelas.',
    });
    expect(barusan(baris.waktu_verifikasi)).toBe(true);
    expect(await statusLaporan(id)).toBe(STATUS.MENUNGGU_VERIFIKASI); // hanya mencatat, status diubah ubahStatus()
  });

  it('C07-UT02 simpanVerifikasi: catatan kosong jadi string kosong; keputusan/admin/laporan tidak valid ditolak basis data', async () => {
    const { id } = await buatLaporan();
    await Verifikasi.simpanVerifikasi(pool, { idLaporan: id, idAdmin, keputusan: KEPUTUSAN.DISETUJUI });
    await Verifikasi.simpanVerifikasi(pool, { idLaporan: id, idAdmin, keputusan: KEPUTUSAN.DISETUJUI, catatan: 'a'.repeat(500) });
    const baris = await barisVerifikasi(id);
    expect(baris[0].catatan_alasan).toBe('');
    expect(baris[1].catatan_alasan).toHaveLength(500);

    const sebelum = (await barisVerifikasi(id)).length;
    await expect(Verifikasi.simpanVerifikasi(pool, { idLaporan: id, idAdmin, keputusan: 'Setuju', catatan: 'x' })).rejects.toMatchObject({ code: '23514' });
    await expect(Verifikasi.simpanVerifikasi(pool, { idLaporan: id, idAdmin: 999999, keputusan: KEPUTUSAN.DISETUJUI })).rejects.toMatchObject({ code: '23503' });
    await expect(Verifikasi.simpanVerifikasi(pool, { idLaporan: 999999, idAdmin, keputusan: KEPUTUSAN.DISETUJUI })).rejects.toMatchObject({ code: '23503' });
    expect(await barisVerifikasi(id)).toHaveLength(sebelum);
  });

  it('C07-UT03 tetapkanKeputusan + teruskanKePemerintah: Disetujui -> Terverifikasi, skor, riwayat, notifikasi', async () => {
    const { id } = await buatLaporan({ jam: 24 });
    const hasil = await putuskanModel({ idLaporan: id, keputusan: KEPUTUSAN.DISETUJUI, catatan: 'Foto dan lokasi sesuai.' });

    expect(hasil).toMatchObject({ idLaporan: id, status: STATUS.TERVERIFIKASI, skor: 20 + 5 * 1 + 2 * 1 + 10 * 1 });
    expect(typeof hasil.idVerifikasi).toBe('number');
    expect(await statusLaporan(id)).toBe(STATUS.TERVERIFIKASI);

    expect(await barisSkor(id)).toMatchObject({ jumlah_pelapor: 1, lama_menunggu: 1, frekuensi_berulang: 1, skor: hasil.skor });
    const verif = (await barisVerifikasi(id))[0];
    expect(verif).toMatchObject({ id_verifikasi: hasil.idVerifikasi, id_admin: idAdmin, keputusan: KEPUTUSAN.DISETUJUI, catatan_alasan: 'Foto dan lokasi sesuai.' });
    expect((await barisRiwayat(id)).at(-1)).toMatchObject({
      id_pengguna: idAdmin,
      status_lama: STATUS.MENUNGGU_VERIFIKASI,
      status_baru: STATUS.TERVERIFIKASI,
      deskripsi_perubahan: 'Disetujui. Catatan: Foto dan lokasi sesuai.',
    });
    const notif = await barisNotifikasi(id);
    expect(notif).toHaveLength(1);
    expect(notif[0]).toMatchObject({ id_pelapor: idWarga, isi_pesan: `Laporan #${id}: Disetujui. Foto dan lokasi sesuai.`, dibaca: false });

    // teruskanKePemerintah dipanggil langsung pada laporan yang sudah Terverifikasi; aman dipanggil dua kali.
    const lain = await buatLaporan({ jam: 48, status: STATUS.TERVERIFIKASI });
    const skor1 = await Verifikasi.teruskanKePemerintah(pool, lain.id);
    const skor2 = await Verifikasi.teruskanKePemerintah(pool, lain.id);
    expect(skor1).toBe(20 + 5 * 1 + 2 * 2 + 10 * 1);
    expect(skor2).toBe(skor1);
    expect(await hitung('SELECT COUNT(*) AS n FROM skor_prioritas WHERE id_laporan = $1', [lain.id])).toBe(1);
  });

  it('C07-UT04 tetapkanKeputusan Ditolak/Revisi + tahanLaporan: tanpa skor, tidak diteruskan ke pemda (KF08)', async () => {
    const menunggu = await buatLaporan({ deskripsi: 'Masih menunggu (kontrol)' });
    const setuju = await buatLaporan({ deskripsi: 'Disetujui (kontrol positif)' });
    await putuskanModel({ idLaporan: setuju.id, keputusan: KEPUTUSAN.DISETUJUI });

    const ditolak = await buatLaporan();
    const hasilTolak = await putuskanModel({ idLaporan: ditolak.id, keputusan: KEPUTUSAN.DITOLAK, catatan: 'Bukan fasilitas umum.' });
    expect(hasilTolak).toMatchObject({ status: STATUS.DITOLAK, skor: null });
    expect(await statusLaporan(ditolak.id)).toBe(STATUS.DITOLAK);
    expect(await barisSkor(ditolak.id)).toBeUndefined();
    expect((await barisNotifikasi(ditolak.id))[0].isi_pesan).toBe(`Laporan #${ditolak.id}: Ditolak. Bukan fasilitas umum.`);
    // Laporan Ditolak langsung keluar dari hitungan kerusakan berulang fasilitasnya (KF14, Algo-007).
    expect(await hitung('SELECT jumlah_kerusakan_berulang AS n FROM fasilitas WHERE id_fasilitas = $1', [ditolak.idFasilitas])).toBe(0);

    const revisi = await buatLaporan();
    const hasilRevisi = await putuskanModel({ idLaporan: revisi.id, keputusan: KEPUTUSAN.REVISI, catatan: 'Foto kurang jelas.' });
    expect(hasilRevisi).toMatchObject({ status: STATUS.PERLU_REVISI, skor: null });
    expect(await barisSkor(revisi.id)).toBeUndefined();
    expect((await barisNotifikasi(revisi.id))[0].isi_pesan).toBe(`Laporan #${revisi.id}: Revisi. Foto kurang jelas.`);
    expect(await hitung('SELECT jumlah_kerusakan_berulang AS n FROM fasilitas WHERE id_fasilitas = $1', [revisi.idFasilitas])).toBe(1);

    // Daftar prioritas pemda hanya memuat laporan yang sudah diteruskan.
    const res = await api().get('/api/prioritas').set(auth(tokenPemda));
    expect(res.status).toBe(200);
    const ids = res.body.data.map((l) => l.id);
    expect(ids).toContain(setuju.id);
    for (const tertahan of [menunggu.id, ditolak.id, revisi.id]) expect(ids).not.toContain(tertahan);
  });

  it('C07-UT05 tetapkanKeputusan: catatan dirapikan, Disetujui tanpa catatan, batas 500 dan 501 karakter', async () => {
    const dipangkas = await buatLaporan();
    await putuskanModel({ idLaporan: dipangkas.id, keputusan: KEPUTUSAN.REVISI, catatan: '  perlu foto baru  ' });
    expect((await barisVerifikasi(dipangkas.id))[0].catatan_alasan).toBe('perlu foto baru');
    expect((await barisNotifikasi(dipangkas.id))[0].isi_pesan).toBe(`Laporan #${dipangkas.id}: Revisi. perlu foto baru`);

    const tanpaCatatan = await buatLaporan();
    await putuskanModel({ idLaporan: tanpaCatatan.id, keputusan: KEPUTUSAN.DISETUJUI, catatan: '   ' });
    expect((await barisVerifikasi(tanpaCatatan.id))[0].catatan_alasan).toBe('');
    expect((await barisRiwayat(tanpaCatatan.id)).at(-1).deskripsi_perubahan).toBe('Disetujui.');
    expect((await barisNotifikasi(tanpaCatatan.id))[0].isi_pesan).toBe(`Laporan #${tanpaCatatan.id}: Disetujui.`);

    const tepat = await buatLaporan();
    expect((await putuskanApi(tepat.id, { keputusan: KEPUTUSAN.DISETUJUI, catatan: 'a'.repeat(500) })).status).toBe(200);
    expect((await barisVerifikasi(tepat.id))[0].catatan_alasan).toHaveLength(500);

    const lebih = await buatLaporan();
    const res = await putuskanApi(lebih.id, { keputusan: KEPUTUSAN.DISETUJUI, catatan: 'a'.repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('catatan');
    expect(await statusLaporan(lebih.id)).toBe(STATUS.MENUNGGU_VERIFIKASI);
    expect(await barisVerifikasi(lebih.id)).toHaveLength(0);
  });

  it('C07-UT06 tetapkanKeputusan: keputusan tidak dikenal, catatan wajib, laporan tidak ada, status tidak sesuai', async () => {
    const { id } = await buatLaporan();
    const riwayatAwal = await jumlahRiwayat(id);

    await expect(putuskanModel({ idLaporan: id, keputusan: 'Setuju', catatan: 'x' })).rejects.toMatchObject({ status: 400 });
    await expect(putuskanModel({ idLaporan: id, keputusan: KEPUTUSAN.DITOLAK, catatan: '   ' })).rejects.toMatchObject({ status: 400 });
    await expect(putuskanModel({ idLaporan: id, keputusan: KEPUTUSAN.REVISI })).rejects.toMatchObject({ status: 400 });
    await expect(putuskanModel({ idLaporan: 999999, keputusan: KEPUTUSAN.DISETUJUI })).rejects.toMatchObject({ status: 404 });

    for (const status of [STATUS.TERVERIFIKASI, STATUS.DIGABUNG, STATUS.PERLU_REVISI]) {
      const l = await buatLaporan({ status });
      await expect(putuskanModel({ idLaporan: l.id, keputusan: KEPUTUSAN.DISETUJUI })).rejects.toMatchObject({ status: 409 });
      expect(await statusLaporan(l.id)).toBe(status);
      expect(await barisVerifikasi(l.id)).toHaveLength(0);
      expect(await barisNotifikasi(l.id)).toHaveLength(0);
    }

    // Semua kegagalan di atas tidak meninggalkan jejak pada laporan yang masih Menunggu Verifikasi.
    expect(await statusLaporan(id)).toBe(STATUS.MENUNGGU_VERIFIKASI);
    expect(await barisVerifikasi(id)).toHaveLength(0);
    expect(await barisNotifikasi(id)).toHaveLength(0);
    expect(await jumlahRiwayat(id)).toBe(riwayatAwal);
    expect(await barisSkor(id)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------
// C08 SkorPrioritas (Mendalam): hitungSkor (Algo-009), getSkor, buatSkorAwal (Q-008)
// ---------------------------------------------------------------------------------------------
describe('C08 SkorPrioritas', () => {
  const { hitungNilaiSkor, hitungSkor, getSkor, buatSkorAwal } = SkorPrioritas;

  it('C08-UT01 hitungSkor (Algo-009, bagian murni): bobot tiap kategori dan gabungan semua faktor', () => {
    expect(BOBOT_KATEGORI).toMatchObject({
      [KATEGORI.POHON_TUMBANG]: 30,
      [KATEGORI.JALAN_BERLUBANG]: 20,
      [KATEGORI.LAMPU_JALAN_MATI]: 10,
      [KATEGORI.LAINNYA]: 5,
    });
    const dasar = { jumlahPelapor: 1, lamaMenunggu: 0, frekuensiBerulang: 0 };
    expect(hitungNilaiSkor({ kategori: KATEGORI.POHON_TUMBANG, ...dasar })).toBe(35);
    expect(hitungNilaiSkor({ kategori: KATEGORI.JALAN_BERLUBANG, ...dasar })).toBe(25);
    expect(hitungNilaiSkor({ kategori: KATEGORI.LAMPU_JALAN_MATI, ...dasar })).toBe(15);
    expect(hitungNilaiSkor({ kategori: KATEGORI.LAINNYA, ...dasar })).toBe(10);
    expect(hitungNilaiSkor({ kategori: KATEGORI.POHON_TUMBANG, jumlahPelapor: 3, lamaMenunggu: 10, frekuensiBerulang: 4 })).toBe(30 + 15 + 20 + 40);
    expect(hitungNilaiSkor({ kategori: KATEGORI.JALAN_BERLUBANG, jumlahPelapor: 2, lamaMenunggu: 5, frekuensiBerulang: 3 })).toBe(20 + 10 + 10 + 30);
  });

  it('C08-UT02 hitungSkor (Algo-009, bagian murni): nilai batas, kategori tidak dikenal, kenaikan per satuan', () => {
    const dasar = { kategori: KATEGORI.JALAN_BERLUBANG, jumlahPelapor: 1, lamaMenunggu: 0, frekuensiBerulang: 0 };
    expect(hitungNilaiSkor(dasar)).toBe(25); // faktor minimum
    expect(hitungNilaiSkor({ ...dasar, jumlahPelapor: 2 }) - hitungNilaiSkor(dasar)).toBe(5);
    expect(hitungNilaiSkor({ ...dasar, lamaMenunggu: 1 }) - hitungNilaiSkor(dasar)).toBe(2);
    expect(hitungNilaiSkor({ ...dasar, frekuensiBerulang: 1 }) - hitungNilaiSkor(dasar)).toBe(10);
    expect(hitungNilaiSkor({ ...dasar, lamaMenunggu: 365 })).toBe(20 + 5 + 730);
    // Cabang else Algo-009: kategori di luar tabel memakai bobot Lainnya.
    expect(hitungNilaiSkor({ ...dasar, kategori: 'Tidak Dikenal' })).toBe(5 + 5);
    expect(hitungNilaiSkor({ ...dasar, kategori: undefined })).toBe(5 + 5);
  });

  it('C08-UT03 hitungSkor: jumlah pelapor, lama menunggu, dan frekuensi dibaca dari basis data lalu disimpan', async () => {
    const induk = await buatLaporan({ kategori: KATEGORI.POHON_TUMBANG, jam: 84, status: STATUS.TERVERIFIKASI }); // 3,5 hari
    const f = induk.idFasilitas;
    await buatLaporan({ idFasilitas: f, kategori: KATEGORI.POHON_TUMBANG, jam: 24, status: STATUS.DIGABUNG, induk: induk.id });
    await buatLaporan({ idFasilitas: f, kategori: KATEGORI.POHON_TUMBANG, jam: 24, status: STATUS.DIGABUNG, induk: induk.id });
    await buatLaporan({ idFasilitas: f, kategori: KATEGORI.POHON_TUMBANG, jam: 12 }); // laporan aktif lain di fasilitas yang sama

    await buatSkorAwal(pool, induk.id);
    await pool.query("UPDATE skor_prioritas SET dihitung_pada = NOW() - interval '1 day' WHERE id_laporan = $1", [induk.id]);
    const sebelum = (await barisSkor(induk.id)).dihitung_pada;

    const skor = await hitungSkor(pool, induk.id);
    // 30 + 5*(1+2 tergabung) + 2*3 hari (3,5 dibulatkan ke bawah) + 10*2 (induk + 1 aktif; yang Digabung tidak dihitung)
    expect(skor).toBe(30 + 15 + 6 + 20);
    const baris = await barisSkor(induk.id);
    expect(baris).toMatchObject({ jumlah_pelapor: 3, lama_menunggu: 3, frekuensi_berulang: 2, skor });
    expect(new Date(baris.dihitung_pada).getTime()).toBeGreaterThan(new Date(sebelum).getTime());
    expect(await getSkor(pool, induk.id)).toBe(skor);
  });

  it('C08-UT04 hitungSkor: pembulatan hari ke bawah dan perhitungan ulang saat data terkait berubah (KF17)', async () => {
    const hampir = await buatLaporan({ jam: 23, status: STATUS.TERVERIFIKASI });
    const lewat = await buatLaporan({ jam: 25, status: STATUS.TERVERIFIKASI });
    for (const l of [hampir, lewat]) await buatSkorAwal(pool, l.id);

    expect(await hitungSkor(pool, hampir.id)).toBe(20 + 5 + 0 + 10); // 23 jam = 0 hari
    expect(await hitungSkor(pool, lewat.id)).toBe(20 + 5 + 2 + 10); // 25 jam = 1 hari

    // Laporan duplikat digabung ke induk -> jumlah pelapor naik, skor naik 5.
    await buatLaporan({ idFasilitas: lewat.idFasilitas, jam: 1, status: STATUS.DIGABUNG, induk: lewat.id });
    expect(await hitungSkor(pool, lewat.id)).toBe(20 + 10 + 2 + 10);
    // Laporan Ditolak di fasilitas yang sama tidak menambah frekuensi berulang.
    await buatLaporan({ idFasilitas: lewat.idFasilitas, jam: 1, status: STATUS.DITOLAK });
    expect(await hitungSkor(pool, lewat.id)).toBe(20 + 10 + 2 + 10);
    expect((await barisSkor(lewat.id)).frekuensi_berulang).toBe(1);
  });

  it('C08-UT05 hitungSkor: null untuk laporan tanpa baris skor atau tidak ada; laporan tanpa fasilitas', async () => {
    const tanpaBaris = await buatLaporan();
    expect(await hitungSkor(pool, tanpaBaris.id)).toBeNull();
    expect(await barisSkor(tanpaBaris.id)).toBeUndefined(); // hitungSkor tidak membuat baris sendiri
    expect(await hitungSkor(pool, 999999)).toBeNull();

    await expect(buatSkorAwal(pool, 999999)).rejects.toMatchObject({ code: '23503' });

    const tanpaFasilitas = await buatLaporan({ kategori: KATEGORI.LAMPU_JALAN_MATI, jam: 0, tanpaFasilitas: true });
    await buatSkorAwal(pool, tanpaFasilitas.id);
    expect(await hitungSkor(pool, tanpaFasilitas.id)).toBe(10 + 5 + 0 + 0); // frekuensiBerulang 0 bila tidak punya fasilitas
  });

  it('C08-UT06 getSkor dan buatSkorAwal: nilai awal 0, idempoten, null bila belum ada', async () => {
    const { id } = await buatLaporan({ jam: 48, status: STATUS.TERVERIFIKASI });
    expect(await getSkor(pool, id)).toBeNull();
    expect(await getSkor(pool, 999999)).toBeNull();

    await buatSkorAwal(pool, id);
    expect(await barisSkor(id)).toMatchObject({ jumlah_pelapor: 1, lama_menunggu: 0, frekuensi_berulang: 0, skor: 0 });
    expect(await getSkor(pool, id)).toBe(0);

    const nilai = await hitungSkor(pool, id);
    expect(nilai).toBeGreaterThan(0);
    await buatSkorAwal(pool, id); // tidak menimpa baris yang sudah dihitung
    expect(await getSkor(pool, id)).toBe(nilai);
    expect(await hitung('SELECT COUNT(*) AS n FROM skor_prioritas WHERE id_laporan = $1', [id])).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------
// C10 Notifikasi (Sedang): kirimNotifikasi (C10-UT01..04 milik Bagian 3 untuk sisi inbox)
// ---------------------------------------------------------------------------------------------
describe('C10 Notifikasi (kirimNotifikasi)', () => {
  const { kirimNotifikasi } = Notifikasi;

  it('C10-UT05 kirimNotifikasi: pesan disimpan untuk pelapor yang benar, spasi tepi dibuang, belum dibaca', async () => {
    const { id } = await buatLaporan();
    const id1 = await kirimNotifikasi(pool, { idLaporan: id, idPelapor: idWarga, isiPesan: `  Laporan #${id}: Revisi. Foto kurang jelas.  ` });
    const id2 = await kirimNotifikasi(pool, { idLaporan: id, idPelapor: idWarga, isiPesan: `Laporan #${id}: Disetujui.` });

    expect(typeof id1).toBe('number');
    expect(id2).toBeGreaterThan(id1);
    const baris = await barisNotifikasi(id);
    expect(baris).toHaveLength(2);
    expect(baris[0]).toMatchObject({ id_notifikasi: id1, id_laporan: id, id_pelapor: idWarga, isi_pesan: `Laporan #${id}: Revisi. Foto kurang jelas.`, dibaca: false });
    expect(barusan(baris[0].waktu_kirim)).toBe(true);

    // Penerima membaca lewat kotak masuk (sisi C10 milik Bagian 3).
    const kotakMasuk = await Notifikasi.getNotifikasiPelapor(pool, idWarga);
    const milikLaporan = kotakMasuk.data.filter((n) => n.idLaporan === id);
    expect(milikLaporan.map((n) => n.id).sort((a, b) => a - b)).toEqual([id1, id2]);
    expect(kotakMasuk.belumDibaca).toBeGreaterThanOrEqual(2);
  });

  it('C10-UT06 kirimNotifikasi: pesan kosong tidak dikirim; laporan atau pelapor tidak ada ditolak basis data', async () => {
    const { id } = await buatLaporan();
    for (const isiPesan of ['', '   ', null, undefined]) {
      expect(await kirimNotifikasi(pool, { idLaporan: id, idPelapor: idWarga, isiPesan })).toBeNull();
    }
    expect(await barisNotifikasi(id)).toHaveLength(0);

    await expect(kirimNotifikasi(pool, { idLaporan: 999999, idPelapor: idWarga, isiPesan: 'Halo' })).rejects.toMatchObject({ code: '23503' });
    await expect(kirimNotifikasi(pool, { idLaporan: id, idPelapor: 999999, isiPesan: 'Halo' })).rejects.toMatchObject({ code: '23503' });
    expect(await barisNotifikasi(id)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------------------------
// Integrasi IK-08: VerifikasiController -> Verifikasi, Laporan, SkorPrioritas, Notifikasi (Model) -> PostgreSQL
// ---------------------------------------------------------------------------------------------
describe('Integrasi IK-08 (UC02)', () => {
  it('INT-TC11 keputusan Disetujui melewati controller, model, dan basis data secara konsisten hingga terbaca pelapor dan pemda', async () => {
    const { id } = await buatLaporan({ kategori: KATEGORI.POHON_TUMBANG, jam: 48, deskripsi: 'Pohon tumbang menutup jalan (INT-TC11)' });
    const badgeAwal = (await api().get('/api/admin/laporan/jumlah-baru').set(auth(tokenAdmin))).body.jumlah;

    const detail = await api().get(`/api/admin/laporan/${id}`).set(auth(tokenAdmin));
    expect(detail.status).toBe(200);
    expect(detail.body.laporan.pratinjauSkor.nilai).toBe(30 + 5 * 1 + 2 * 2 + 10 * 1);

    const res = await putuskanApi(id, { keputusan: KEPUTUSAN.DISETUJUI, catatan: 'Valid, segera diteruskan.' });
    expect(res.status).toBe(200);
    expect(res.body.laporan.status).toBe(STATUS.TERVERIFIKASI);
    expect(res.body.skor).toBe(detail.body.laporan.pratinjauSkor.nilai);

    // Lima tabel konsisten.
    expect(await statusLaporan(id)).toBe(STATUS.TERVERIFIKASI);
    expect(await barisVerifikasi(id)).toEqual([
      expect.objectContaining({ id_admin: idAdmin, keputusan: KEPUTUSAN.DISETUJUI, catatan_alasan: 'Valid, segera diteruskan.' }),
    ]);
    expect((await barisRiwayat(id)).at(-1)).toMatchObject({ id_pengguna: idAdmin, status_lama: STATUS.MENUNGGU_VERIFIKASI, status_baru: STATUS.TERVERIFIKASI });
    expect(await barisSkor(id)).toMatchObject({ skor: res.body.skor, jumlah_pelapor: 1, lama_menunggu: 2, frekuensi_berulang: 1 });
    expect(await barisNotifikasi(id)).toEqual([
      expect.objectContaining({ id_pelapor: idWarga, isi_pesan: `Laporan #${id}: Disetujui. Valid, segera diteruskan.`, dibaca: false }),
    ]);

    // Efek lintas komponen: badge admin berkurang, pelapor menerima notifikasi, pemda melihat laporan berskor.
    const badgeAkhir = (await api().get('/api/admin/laporan/jumlah-baru').set(auth(tokenAdmin))).body.jumlah;
    expect(badgeAkhir).toBe(badgeAwal - 1);

    const notif = await api().get('/api/notifikasi').set(auth(tokenWarga));
    expect(notif.status).toBe(200);
    expect(notif.body.data.find((n) => n.idLaporan === id)).toMatchObject({ isiPesan: `Laporan #${id}: Disetujui. Valid, segera diteruskan.`, dibaca: false });
    expect(notif.body.belumDibaca).toBeGreaterThanOrEqual(1);

    const prioritas = await api().get('/api/prioritas').set(auth(tokenPemda));
    expect(prioritas.status).toBe(200);
    expect(prioritas.body.data.find((l) => l.id === id)).toMatchObject({ status: STATUS.TERVERIFIKASI, skor: { nilai: res.body.skor } });
    expect(JSON.stringify(prioritas.body)).not.toContain('warga1@silembur.test'); // KNF02: identitas pelapor tidak bocor ke pemda
  });

  it('INT-TC12 keputusan ditolak sebelum menyentuh data, dan kegagalan di tengah transaksi dibatalkan seluruhnya', async () => {
    const { id } = await buatLaporan({ jam: 24 });
    const riwayatAwal = await jumlahRiwayat(id);
    const tidakBerubah = async () => {
      expect(await statusLaporan(id)).toBe(STATUS.MENUNGGU_VERIFIKASI);
      expect(await barisVerifikasi(id)).toHaveLength(0);
      expect(await jumlahRiwayat(id)).toBe(riwayatAwal);
      expect(await barisSkor(id)).toBeUndefined();
      expect(await barisNotifikasi(id)).toHaveLength(0);
    };

    // 1. Ditolak di lapisan autentikasi/validasi.
    expect((await api().post(`/api/admin/laporan/${id}/verifikasi`).send({ keputusan: KEPUTUSAN.DISETUJUI })).status).toBe(401);
    expect((await putuskanApi(id, { keputusan: KEPUTUSAN.DISETUJUI }, tokenWarga)).status).toBe(403);
    expect((await putuskanApi(id, { keputusan: KEPUTUSAN.DITOLAK })).status).toBe(400);
    await tidakBerubah();

    // 2. Kegagalan basis data pada langkah terakhir (insert notifikasi) membatalkan langkah-langkah sebelumnya.
    const nama = `uji_gagal_notifikasi_${id}`;
    await pool.query(
      `CREATE OR REPLACE FUNCTION ${nama}() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'gagal uji INT-TC12'; END; $$ LANGUAGE plpgsql`,
    );
    await pool.query(
      `CREATE TRIGGER ${nama} BEFORE INSERT ON notifikasi FOR EACH ROW WHEN (NEW.id_laporan = ${id}) EXECUTE FUNCTION ${nama}()`,
    );
    const senyap = vi.spyOn(console, 'error').mockImplementation(() => {});
    let gagal;
    try {
      gagal = await putuskanApi(id, { keputusan: KEPUTUSAN.DISETUJUI, catatan: 'Uji rollback.' });
    } finally {
      senyap.mockRestore();
      await pool.query(`DROP TRIGGER IF EXISTS ${nama} ON notifikasi`);
      await pool.query(`DROP FUNCTION IF EXISTS ${nama}()`);
    }
    expect(gagal.status).toBe(500);
    await tidakBerubah(); // status, verifikasi, riwayat, skor, dan notifikasi sama seperti sebelum permintaan

    // 3. Setelah gangguan hilang, keputusan yang sama berhasil; keputusan kedua ditolak 409 tanpa efek samping.
    const pulih = await putuskanApi(id, { keputusan: KEPUTUSAN.DISETUJUI, catatan: 'Uji rollback.' });
    expect(pulih.status).toBe(200);
    expect(await statusLaporan(id)).toBe(STATUS.TERVERIFIKASI);
    const ulang = await putuskanApi(id, { keputusan: KEPUTUSAN.DITOLAK, catatan: 'Coba tolak.' });
    expect(ulang.status).toBe(409);
    expect(await barisVerifikasi(id)).toHaveLength(1);
    expect(await barisNotifikasi(id)).toHaveLength(1);
  });
});
