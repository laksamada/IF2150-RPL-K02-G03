/**
 * Seed data FIKTIF untuk pengembangan, demo, dan test.  `npm run db:seed`
 * Menghapus seluruh isi tabel lalu mengisi ulang. Semua akun memakai kata sandi `silembur123`.
 * Pemilik: P1 (anggota lain boleh menambah skenario lewat PR).
 *
 * Skenario yang tersedia:
 *  - laporan di semua status (Menunggu, Perlu Revisi, Ditolak, Terverifikasi, Diproses, Selesai, Digabung)
 *  - fasilitas "Jl. Merdeka" dengan 4 laporan dalam 90 hari -> kandidat kerusakan berulang (UC06)
 *  - fasilitas "PJU Jl. Cihampelas" dengan 2 laporan aktif -> kandidat duplikat (UC07)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { BOBOT_KATEGORI, KATEGORI, STATUS } from '@silembur/shared';
import { config } from '../config.js';
import { getJumlahLaporan } from '../models/fasilitas/berulang.js';
import { buatPng } from './gambarContoh.js';
import { pool, withTransaction } from './pool.js';

const K = KATEGORI;
const S = STATUS;
const HARI = 24 * 60 * 60 * 1000;

const FOTO = {
  [K.JALAN_BERLUBANG]: { file: 'seed/jalan-berlubang.png', warna: [120, 120, 125] },
  [K.LAMPU_JALAN_MATI]: { file: 'seed/lampu-jalan-mati.png', warna: [40, 60, 110] },
  [K.POHON_TUMBANG]: { file: 'seed/pohon-tumbang.png', warna: [40, 120, 60] },
  [K.LAINNYA]: { file: 'seed/lainnya.png', warna: [130, 95, 60] },
};

const PENGGUNA = [
  { email: 'warga1@silembur.test', nama: 'Budi Santoso', peran: 'PELAPOR' },
  { email: 'warga2@silembur.test', nama: 'Siti Rahmawati', peran: 'PELAPOR' },
  { email: 'warga3@silembur.test', nama: 'Andi Wijaya', peran: 'PELAPOR' },
  { email: 'admin@silembur.test', nama: 'Admin SILEMBUR', peran: 'ADMIN' },
  {
    email: 'pemda@silembur.test',
    nama: 'Petugas Dinas PU',
    peran: 'PEMDA',
    nama_instansi: 'Dinas Pekerjaan Umum Kota Bandung',
    wilayah_kerja: 'Kota Bandung',
  },
];

// kunci, nama, kategori, alamat, lat, lng, wilayah
const FASILITAS = [
  ['cihampelas', 'Jalan Jl. Cihampelas No. 42', K.JALAN_BERLUBANG, 'Jl. Cihampelas No. 42, Coblong', -6.893512, 107.604611, 'Coblong'],
  ['dago', 'PJU Jl. Dago Atas RT 03', K.LAMPU_JALAN_MATI, 'Jl. Dago Atas RT 03/RW 05, Coblong', -6.875204, 107.617832, 'Coblong'],
  ['martadinata', 'Pohon Jl. R.E. Martadinata No. 88', K.POHON_TUMBANG, 'Jl. R.E. Martadinata No. 88, Bandung Wetan', -6.904611, 107.617203, 'Bandung Wetan'],
  ['merdeka', 'Jalan Jl. Merdeka', K.JALAN_BERLUBANG, 'Jl. Merdeka, Sumur Bandung', -6.912604, 107.609812, 'Sumur Bandung'],
  ['saluran', 'Saluran Air Jl. Ir. H. Juanda', K.LAINNYA, 'Jl. Ir. H. Juanda, Coblong', -6.884603, 107.613114, 'Coblong'],
  ['pju-cihampelas', 'PJU Jl. Cihampelas', K.LAMPU_JALAN_MATI, 'Jl. Cihampelas No. 120, Cicendo', -6.899811, 107.603902, 'Cicendo'],
  ['soekarno', 'Jalan Jl. Soekarno-Hatta KM 8', K.JALAN_BERLUBANG, 'Jl. Soekarno-Hatta, Buahbatu', -6.944988, 107.655021, 'Buahbatu'],
  ['pasteur', 'Pohon Jl. Pasteur', K.POHON_TUMBANG, 'Jl. Pasteur, Sukajadi', -6.893015, 107.596022, 'Sukajadi'],
];

/**
 * Laporan contoh. jalur = urutan status yang dilalui (riwayat dibuat mengikuti jalur ini).
 * keputusan diisi bila pernah diverifikasi.
 */
const LAPORAN = [
  // Menunggu verifikasi
  { f: 'saluran', p: 1, hari: 0.1, desk: 'Saluran air tersumbat sampah sehingga air meluap ke jalan saat hujan.', jalur: [] },
  { f: 'pasteur', p: 2, hari: 0.4, desk: 'Dahan pohon besar patah dan menghalangi sebagian jalur kendaraan.', jalur: [] },
  { f: 'pju-cihampelas', p: 1, hari: 0.7, desk: 'Lampu penerangan jalan padam sejak tiga hari, jalan sangat gelap malam hari.', jalur: [] },
  { f: 'pju-cihampelas', p: 3, hari: 0.6, desk: 'PJU di depan pertokoan mati total, rawan kecelakaan dan kejahatan.', jalur: [] },
  { f: 'merdeka', p: 3, hari: 1, desk: 'Lubang baru muncul lagi di lajur kiri dekat halte, diameter sekitar 40 cm.', jalur: [] },
  // Perlu revisi
  { f: 'soekarno', p: 2, hari: 2, desk: 'Jalan rusak.', jalur: [S.PERLU_REVISI], keputusan: ['Revisi', 'Foto kurang jelas dan deskripsi terlalu singkat, mohon lengkapi ukuran lubang.'] },
  // Ditolak
  { f: 'dago', p: 3, hari: 6, desk: 'Lampu taman rumah warga mati.', jalur: [S.DITOLAK], keputusan: ['Ditolak', 'Bukan fasilitas umum (lampu milik pribadi).'] },
  // Terverifikasi
  { f: 'cihampelas', p: 1, hari: 3, desk: 'Jalan amblas sekitar 1,2 meter dengan kedalaman 30 cm, sudah dipasang cone darurat oleh warga.', jalur: [S.TERVERIFIKASI], keputusan: ['Disetujui', 'Lokasi dan foto sesuai.'] },
  { f: 'martadinata', p: 2, hari: 4, desk: 'Pohon tumbang menimpa kabel listrik dan menutup trotoar.', jalur: [S.TERVERIFIKASI], keputusan: ['Disetujui', 'Darurat, segera tindak lanjuti.'] },
  { f: 'merdeka', p: 2, hari: 30, desk: 'Aspal mengelupas dan berlubang di beberapa titik sepanjang 20 meter.', jalur: [S.TERVERIFIKASI], keputusan: ['Disetujui', 'Valid.'] },
  // Diproses
  { f: 'dago', p: 1, hari: 9, desk: 'Lampu PJU padam di tikungan tajam, pengendara motor kesulitan melihat.', jalur: [S.TERVERIFIKASI, S.DIPROSES], keputusan: ['Disetujui', 'Valid.'], proses: 'Petugas teknis dijadwalkan mengganti lampu.' },
  { f: 'merdeka', p: 1, hari: 10, desk: 'Lubang besar tergenang air, beberapa motor terjatuh.', jalur: [S.TERVERIFIKASI, S.DIPROSES], keputusan: ['Disetujui', 'Prioritaskan.'], proses: 'Penambalan darurat sedang berjalan.' },
  { f: 'soekarno', p: 3, hari: 15, desk: 'Jalan bergelombang dan retak memanjang di lajur cepat.', jalur: [S.TERVERIFIKASI, S.DIPROSES], keputusan: ['Disetujui', 'Valid.'], proses: 'Survei lapangan oleh tim jalan.' },
  // Selesai
  { f: 'merdeka', p: 3, hari: 80, desk: 'Lubang di depan gedung perkantoran mengganggu arus lalu lintas.', jalur: [S.TERVERIFIKASI, S.DIPROSES, S.SELESAI], keputusan: ['Disetujui', 'Valid.'], proses: 'Penambalan dijadwalkan.', selesai: 'Lubang sudah ditambal dan diaspal ulang.' },
  { f: 'martadinata', p: 1, hari: 40, desk: 'Pohon miring hampir roboh setelah angin kencang.', jalur: [S.TERVERIFIKASI, S.DIPROSES, S.SELESAI], keputusan: ['Disetujui', 'Valid.'], proses: 'Tim pertamanan menuju lokasi.', selesai: 'Pohon sudah dipangkas dan diamankan.' },
  // Digabung ke laporan Cihampelas (indeks 7)
  { f: 'cihampelas', p: 3, hari: 2.5, desk: 'Jalan ambles di Cihampelas dekat swalayan, berbahaya untuk motor.', jalur: [S.DIGABUNG], induk: 7 },
];

const DESKRIPSI_STATUS = {
  [S.TERVERIFIKASI]: 'Laporan diverifikasi admin dan diteruskan ke pemerintah daerah.',
  [S.PERLU_REVISI]: 'Admin meminta revisi laporan.',
  [S.DITOLAK]: 'Laporan ditolak admin.',
  [S.DIGABUNG]: 'Laporan digabung dengan laporan lain pada fasilitas yang sama.',
};

function nilaiSkorContoh(kategori, jumlahPelapor, lamaMenunggu, frekuensi) {
  return BOBOT_KATEGORI[kategori] + 5 * jumlahPelapor + 2 * lamaMenunggu + 10 * frekuensi;
}

async function tulisFotoContoh() {
  for (const { file, warna } of Object.values(FOTO)) {
    const tujuan = path.join(config.uploadDir, file);
    await fs.mkdir(path.dirname(tujuan), { recursive: true });
    await fs.writeFile(tujuan, buatPng(warna));
  }
}

/**
 * Tulis ulang foto contoh seed yang hilang dari UPLOAD_DIR tanpa menyentuh basis data.
 * Dipanggil saat server start: di hosting dengan disk sementara (mis. paket gratis tanpa volume), isi disk hilang
 * setiap server tidur/deploy ulang, padahal baris laporan seed tetap merujuk `seed/*.png`.
 * @returns {Promise<number>} jumlah file yang ditulis ulang
 */
export async function pastikanFotoContoh() {
  let ditulis = 0;
  for (const { file, warna } of Object.values(FOTO)) {
    const tujuan = path.join(config.uploadDir, file);
    const ada = await fs.access(tujuan).then(
      () => true,
      () => false,
    );
    if (ada) continue;
    await fs.mkdir(path.dirname(tujuan), { recursive: true });
    await fs.writeFile(tujuan, buatPng(warna));
    ditulis += 1;
  }
  return ditulis;
}

export async function seed({ log = console.log } = {}) {
  await tulisFotoContoh();
  const hash = await bcrypt.hash('silembur123', 10);
  const sekarang = Date.now();

  await withTransaction(async (db) => {
    await db.query(`TRUNCATE notifikasi, riwayat_status, verifikasi, skor_prioritas, lokasi, laporan,
                    fasilitas, pengguna RESTART IDENTITY CASCADE`);

    const idPengguna = [];
    for (const p of PENGGUNA) {
      const { rows } = await db.query(
        `INSERT INTO pengguna (email, nama, password_hash, peran, nama_instansi, wilayah_kerja)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_pengguna`,
        [p.email, p.nama, hash, p.peran, p.nama_instansi ?? null, p.wilayah_kerja ?? null],
      );
      idPengguna.push(rows[0].id_pengguna);
    }
    const idAdmin = idPengguna[3];
    const idPemda = idPengguna[4];

    const fas = {};
    for (const [kunci, nama, kategori, alamat, lat, lng, wilayah] of FASILITAS) {
      const { rows } = await db.query(
        `INSERT INTO fasilitas (nama_fasilitas, kategori, lokasi_fasilitas, latitude, longitude, wilayah, dibuat_pada)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '120 days') RETURNING id_fasilitas`,
        [nama, kategori, alamat, lat, lng, wilayah],
      );
      fas[kunci] = { id: rows[0].id_fasilitas, kategori, alamat, lat, lng, wilayah };
    }

    const idLaporan = [];
    for (const [i, l] of LAPORAN.entries()) {
      const f = fas[l.f];
      const idPelapor = idPengguna[l.p - 1];
      const t0 = new Date(sekarang - l.hari * HARI);
      const statusAkhir = l.jalur.at(-1) ?? S.MENUNGGU_VERIFIKASI;
      const lat = f.lat + ((i % 3) - 1) * 0.00004;
      const lng = f.lng + ((i % 2) - 0.5) * 0.00006;

      const { rows } = await db.query(
        `INSERT INTO laporan (id_pelapor, id_fasilitas, id_laporan_induk, foto_laporan, deskripsi_laporan,
                              kategori_kerusakan, tanggal_laporan, status_laporan, diperbarui_pada)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $7) RETURNING id_laporan`,
        [idPelapor, f.id, l.induk !== undefined ? idLaporan[l.induk] : null, FOTO[f.kategori].file, l.desk, f.kategori, t0, statusAkhir],
      );
      const id = rows[0].id_laporan;
      idLaporan.push(id);
      await db.query('UPDATE pengguna SET jumlah_laporan = jumlah_laporan + 1 WHERE id_pengguna = $1', [idPelapor]);
      await db.query(
        `INSERT INTO lokasi (id_laporan, koordinat, latitude, longitude, wilayah, alamat, sumber)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, `${lat.toFixed(6)},${lng.toFixed(6)}`, lat, lng, f.wilayah, f.alamat, i % 4 === 0 ? 'MANUAL' : 'GPS'],
      );

      // Riwayat mengikuti jalur status.
      const riwayat = [[null, S.MENUNGGU_VERIFIKASI, 'Laporan berhasil diterima oleh sistem.', idPelapor, t0]];
      let sebelum = S.MENUNGGU_VERIFIKASI;
      l.jalur.forEach((status, j) => {
        const waktu = new Date(t0.getTime() + (j + 1) * 0.15 * l.hari * HARI);
        let desk = DESKRIPSI_STATUS[status];
        let oleh = idAdmin;
        if (status === S.DIPROSES) [desk, oleh] = [l.proses, idPemda];
        if (status === S.SELESAI) [desk, oleh] = [l.selesai, idPemda];
        if (l.keputusan && j === 0 && status !== S.DIGABUNG) desk = `${desk} Catatan: ${l.keputusan[1]}`;
        riwayat.push([sebelum, status, desk, oleh, waktu]);
        sebelum = status;
      });
      for (const [lama, baru, desk, oleh, waktu] of riwayat) {
        await db.query(
          `INSERT INTO riwayat_status (id_laporan, id_pengguna, status_lama, status_baru, deskripsi_perubahan, tanggal_perubahan)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, oleh, lama, baru, desk, waktu],
        );
      }

      if (l.keputusan) {
        const [keputusan, catatan] = l.keputusan;
        const waktu = riwayat[1][4];
        await db.query(
          `INSERT INTO verifikasi (id_laporan, id_admin, keputusan, catatan_alasan, waktu_verifikasi)
           VALUES ($1, $2, $3, $4, $5)`,
          [id, idAdmin, keputusan, catatan, waktu],
        );
        await db.query(
          `INSERT INTO notifikasi (id_laporan, id_pelapor, isi_pesan, dibaca, waktu_kirim) VALUES ($1, $2, $3, $4, $5)`,
          [id, idPelapor, `Laporan #${id}: ${keputusan}. ${catatan}`, l.hari > 5, waktu],
        );
      }
    }

    // Jumlah kerusakan berulang per fasilitas (KF14) lalu skor contoh untuk laporan yang sudah diteruskan.
    const frekuensi = {};
    for (const f of Object.values(fas)) frekuensi[f.id] = await getJumlahLaporan(db, f.id);
    for (const [i, l] of LAPORAN.entries()) {
      if (!l.jalur.includes(S.TERVERIFIKASI)) continue;
      const f = fas[l.f];
      const jumlahPelapor = 1 + LAPORAN.filter((x) => x.induk === i).length;
      const lama = Math.floor(l.hari);
      const skor = nilaiSkorContoh(f.kategori, jumlahPelapor, lama, frekuensi[f.id]);
      await db.query(
        `INSERT INTO skor_prioritas (id_laporan, jumlah_pelapor, lama_menunggu, frekuensi_berulang, skor)
         VALUES ($1, $2, $3, $4, $5)`,
        [idLaporan[i], jumlahPelapor, lama, frekuensi[f.id], skor],
      );
    }
  });

  log(`Seed selesai: ${PENGGUNA.length} pengguna, ${FASILITAS.length} fasilitas, ${LAPORAN.length} laporan.`);
  log('Akun uji (kata sandi: silembur123): ' + PENGGUNA.map((p) => `${p.email} [${p.peran}]`).join(', '));
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  seed()
    .catch((err) => {
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
