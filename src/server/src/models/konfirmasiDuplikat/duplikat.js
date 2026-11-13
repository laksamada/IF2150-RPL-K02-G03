/**
 * Model KonfirmasiDuplikat (C11) — simpanKandidat, warning, gabungLaporan (UC07, KF15, KF17, KF20, KF21, Algo-012, Q-013).
 * Pemilik: P1.
 *
 * KonfirmasiDuplikat tidak punya tabel: daftar kandidat dihitung dari laporan aktif (STATUS_AKTIF)
 * yang berbagi fasilitas; jejak penggabungan tersimpan di laporan.id_laporan_induk.
 * simpanKandidat() & warning() terjadi di sisi mobile (state pilihan + dialog konfirmasi).
 */
import { STATUS, STATUS_AKTIF } from '@silembur/shared';
import { HttpError, urlFoto } from '../../utils/http.js';
import { getJumlahLaporan } from '../fasilitas/berulang.js';
import { catatRiwayat, ubahStatus } from '../laporan/status.js';
import { hitungSkor } from '../skorPrioritas/skor.js';

const KOLOM_LAPORAN = `
  l.id_laporan, l.id_fasilitas, l.id_laporan_induk, l.foto_laporan, l.deskripsi_laporan,
  l.kategori_kerusakan, l.tanggal_laporan, l.status_laporan,
  lo.latitude, lo.longitude, lo.wilayah, lo.alamat,
  p.id_pengguna AS pelapor_id, p.nama AS pelapor_nama, p.email AS pelapor_email,
  sp.skor,
  f.nama_fasilitas, f.kategori AS fasilitas_kategori, f.lokasi_fasilitas,
  f.latitude AS fasilitas_latitude, f.longitude AS fasilitas_longitude, f.wilayah AS fasilitas_wilayah,
  f.jumlah_kerusakan_berulang, f.kandidat_evaluasi`;

const FROM_LAPORAN = `
  FROM laporan l
  JOIN pengguna p ON p.id_pengguna = l.id_pelapor
  LEFT JOIN lokasi lo ON lo.id_laporan = l.id_laporan
  LEFT JOIN skor_prioritas sp ON sp.id_laporan = l.id_laporan
  LEFT JOIN fasilitas f ON f.id_fasilitas = l.id_fasilitas`;

/** DTO LaporanAdmin (lihat src/docs/API.md). Identitas pelapor boleh tampil karena hanya untuk ADMIN. */
function toLaporanAdmin(r) {
  return {
    id: r.id_laporan,
    kategori: r.kategori_kerusakan,
    deskripsi: r.deskripsi_laporan,
    foto: urlFoto(r.foto_laporan),
    status: r.status_laporan,
    tanggalLaporan: r.tanggal_laporan,
    lokasi: r.latitude === null || r.latitude === undefined
      ? null
      : { latitude: r.latitude, longitude: r.longitude, wilayah: r.wilayah, alamat: r.alamat },
    fasilitas: r.id_fasilitas ? { id: r.id_fasilitas, nama: r.nama_fasilitas } : null,
    pelapor: { id: r.pelapor_id, nama: r.pelapor_nama, email: r.pelapor_email },
    skor: r.skor ?? null,
    idLaporanInduk: r.id_laporan_induk,
  };
}

/** DTO Fasilitas (lihat src/docs/API.md). */
function toFasilitas(r) {
  if (!r.id_fasilitas) return null;
  return {
    id: r.id_fasilitas,
    nama: r.nama_fasilitas,
    kategori: r.fasilitas_kategori,
    lokasi: r.lokasi_fasilitas,
    latitude: r.fasilitas_latitude,
    longitude: r.fasilitas_longitude,
    wilayah: r.fasilitas_wilayah,
    jumlahKerusakanBerulang: r.jumlah_kerusakan_berulang,
    kandidatEvaluasi: r.kandidat_evaluasi,
  };
}

/**
 * KF20/KF21: semua laporan aktif dikelompokkan per fasilitas.
 * kandidat = kelompok berisi >= 2 laporan aktif (kandidat duplikat yang perlu dikonfirmasi admin).
 * Urutan: kelompok kandidat dulu, lalu kelompok dengan laporan terbaru.
 * @returns {Promise<Array<{ fasilitas: object|null, kandidat: boolean, laporan: object[] }>>}
 */
export async function getKandidatDuplikat(db) {
  const { rows } = await db.query(
    `SELECT ${KOLOM_LAPORAN} ${FROM_LAPORAN}
      WHERE l.status_laporan = ANY($1)
      ORDER BY l.id_fasilitas NULLS LAST, l.tanggal_laporan ASC, l.id_laporan ASC`,
    [STATUS_AKTIF],
  );

  const kelompok = new Map();
  for (const r of rows) {
    // Laporan tanpa fasilitas tidak bisa dibandingkan: masing-masing jadi kelompok sendiri.
    const kunci = r.id_fasilitas ?? `tanpa-${r.id_laporan}`;
    if (!kelompok.has(kunci)) kelompok.set(kunci, { fasilitas: toFasilitas(r), laporan: [] });
    kelompok.get(kunci).laporan.push(toLaporanAdmin(r));
  }

  const terbaru = (k) => Math.max(...k.laporan.map((l) => new Date(l.tanggalLaporan).getTime()));
  return [...kelompok.values()]
    .map((k) => ({ ...k, kandidat: k.laporan.length >= 2 }))
    .sort((a, b) => Number(b.kandidat) - Number(a.kandidat) || terbaru(b) - terbaru(a));
}

/**
 * Tahap kemajuan laporan aktif (gap G15): belum diverifikasi < Terverifikasi < Diproses.
 * Perlu Revisi setara Menunggu Verifikasi karena sama-sama belum diverifikasi.
 */
const TAHAP_STATUS = Object.freeze({
  [STATUS.MENUNGGU_VERIFIKASI]: 0,
  [STATUS.PERLU_REVISI]: 0,
  [STATUS.TERVERIFIKASI]: 1,
  [STATUS.DIPROSES]: 2,
});

/**
 * Algo-012 gabungLaporan(), dijalankan dalam transaksi yang sedang berjalan (`db` = client withTransaction).
 *  1. Kunci semua laporan terpilih; tolak bila ada yang tidak ditemukan (404), tidak aktif (409),
 *     atau berbeda kategori (400, gap G15).
 *  2. Induk = tanggal_laporan paling awal (seri: id terkecil). Induk harus berstatus paling lanjut
 *     di kelompoknya (tahapStatus); bila ada anak yang lebih lanjut, tolak (409, gap G15) agar laporan
 *     Terverifikasi/Diproses tidak hilang dari daftar prioritas pemda (KF08, KF18).
 *  3. Laporan lain -> status "Digabung" + id_laporan_induk (Q-013), pindah ke fasilitas induk.
 *     Laporan yang sebelumnya sudah digabung ke laporan anak ikut dialihkan ke induk baru,
 *     sehingga jumlah pelapor tidak berkurang (KF15).
 *  4. Riwayat induk dicatat, skor induk dihitung ulang (KF17), jumlah kerusakan fasilitas diperbarui.
 * @returns {Promise<{ idLaporanInduk: number, digabung: number[], skor: number|null }>}
 */
export async function gabungLaporan(db, { idLaporanList, idAdmin }) {
  const ids = [...new Set(idLaporanList)];
  if (ids.length < 2) throw new HttpError(400, 'Pilih minimal dua laporan berbeda untuk digabung');

  const { rows } = await db.query(
    `SELECT id_laporan, id_fasilitas, kategori_kerusakan, status_laporan, tanggal_laporan
       FROM laporan WHERE id_laporan = ANY($1)
      ORDER BY tanggal_laporan ASC, id_laporan ASC
      FOR UPDATE`,
    [ids],
  );

  const ditemukan = new Set(rows.map((r) => r.id_laporan));
  const hilang = ids.filter((id) => !ditemukan.has(id));
  if (hilang.length) throw new HttpError(404, `Laporan tidak ditemukan: #${hilang.join(', #')}`);

  const tidakAktif = rows.filter((r) => !STATUS_AKTIF.includes(r.status_laporan));
  if (tidakAktif.length) {
    const daftar = tidakAktif.map((r) => `#${r.id_laporan} (${r.status_laporan})`).join(', ');
    throw new HttpError(409, `Hanya laporan aktif yang bisa digabung. Tidak aktif: ${daftar}`);
  }

  const kategori = new Set(rows.map((r) => r.kategori_kerusakan));
  if (kategori.size > 1) {
    throw new HttpError(400, 'Laporan yang digabung harus memiliki kategori kerusakan yang sama');
  }

  const [induk, ...anak] = rows;
  const idAnak = anak.map((r) => r.id_laporan);

  const lebihLanjut = anak.filter((r) => TAHAP_STATUS[r.status_laporan] > TAHAP_STATUS[induk.status_laporan]);
  if (lebihLanjut.length) {
    const daftar = lebihLanjut.map((r) => `#${r.id_laporan} (${r.status_laporan})`).join(', ');
    throw new HttpError(
      409,
      `Laporan induk #${induk.id_laporan} (laporan terlama) masih berstatus ${induk.status_laporan}, `
        + `sedangkan ${daftar} sudah lebih lanjut. Laporan induk harus sudah sama atau lebih lanjut `
        + 'statusnya sebelum laporan lain digabungkan ke dalamnya.',
    );
  }

  for (const a of anak) {
    await ubahStatus(db, {
      idLaporan: a.id_laporan,
      statusBaru: STATUS.DIGABUNG,
      deskripsi: `Laporan digabung ke laporan #${induk.id_laporan} karena duplikat.`,
      idPengguna: idAdmin,
      idLaporanInduk: induk.id_laporan,
    });
  }

  await db.query(
    `UPDATE laporan SET id_fasilitas = $1, diperbarui_pada = NOW() WHERE id_laporan = ANY($2)`,
    [induk.id_fasilitas, idAnak],
  );
  // Laporan yang dulu digabung ke salah satu anak ikut menunjuk induk baru (jumlah pelapor tetap utuh).
  await db.query(
    `UPDATE laporan SET id_laporan_induk = $1, id_fasilitas = $2 WHERE id_laporan_induk = ANY($3)`,
    [induk.id_laporan, induk.id_fasilitas, idAnak],
  );

  await catatRiwayat(db, {
    idLaporan: induk.id_laporan,
    status: induk.status_laporan,
    deskripsi: `Laporan duplikat #${idAnak.join(', #')} digabung ke laporan ini.`,
    idPengguna: idAdmin,
  });

  const fasilitasTerdampak = new Set(rows.map((r) => r.id_fasilitas).filter(Boolean));
  for (const idFasilitas of fasilitasTerdampak) await getJumlahLaporan(db, idFasilitas);

  const skor = await hitungSkor(db, induk.id_laporan);
  return { idLaporanInduk: induk.id_laporan, digabung: idAnak, skor };
}
