import { ATURAN, SEMUA_KATEGORI, STATUS } from '@silembur/shared';
import { HttpError, urlFoto } from '../../utils/http.js';
import { cariAtauBuatFasilitas } from '../fasilitas/cocokkan.js';
import { getJumlahLaporan } from '../fasilitas/berulang.js';
import { setLokasiLaporan } from '../lokasi/lokasi.js';
import { catatRiwayat, ubahStatus } from './status.js';

const PESAN_DITERIMA = 'Laporan berhasil diterima oleh sistem.';
const PESAN_DIREVISI = 'Laporan direvisi oleh pelapor.';
const PESAN_BELUM_LENGKAP = 'Lengkapi foto, kategori, lokasi, dan deskripsi untuk melanjutkan';

function koordinatSah(koordinat) {
  if (!koordinat) return false;
  let lat;
  let lng;
  if (typeof koordinat === 'string') {
    const bagian = koordinat.split(',');
    if (bagian.length !== 2 || bagian.some((b) => b.trim() === '')) return false;
    [lat, lng] = bagian.map(Number);
  } else {
    lat = koordinat.latitude;
    lng = koordinat.longitude;
  }
  return (
    typeof lat === 'number' && typeof lng === 'number' &&
    Number.isFinite(lat) && Number.isFinite(lng) &&
    Math.abs(lat) <= 90 && Math.abs(lng) <= 180
  );
}

/**
 * Algo-004: memeriksa foto, deskripsi, koordinat, dan kategori (bila dikirim).
 */
export function validasiIsianFormulir({ foto, deskripsi, koordinat, kategori } = {}) {
  const adaFoto = typeof foto === 'string' ? foto.trim() !== '' : Boolean(foto);
  const teks = typeof deskripsi === 'string' ? deskripsi.trim() : '';
  const deskripsiSah = teks.length > 0 && teks.length <= ATURAN.BATAS_DESKRIPSI;
  const kategoriSah = kategori === undefined || SEMUA_KATEGORI.includes(kategori);
  return adaFoto && deskripsiSah && koordinatSah(koordinat) && kategoriSah;
}

/**
 * Q-001: menyimpan laporan baru dan menambah jumlah laporan pelapor.
 */
export async function simpanLaporan(db, { idPelapor, idFasilitas, foto, deskripsi, kategori }) {
  const { rows } = await db.query(
    `INSERT INTO laporan (id_pelapor, id_fasilitas, foto_laporan, deskripsi_laporan, kategori_kerusakan,
                          tanggal_laporan, status_laporan)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6)
     RETURNING id_laporan`,
    [idPelapor, idFasilitas, foto, deskripsi, kategori, STATUS.MENUNGGU_VERIFIKASI],
  );
  await db.query('UPDATE pengguna SET jumlah_laporan = jumlah_laporan + 1 WHERE id_pengguna = $1', [idPelapor]);
  return rows[0].id_laporan;
}

/**
 * Algo-001: seluruh alur pembuatan laporan. Wajib dipanggil di dalam withTransaction().
 */
export async function konfirmasiSimpanLaporan(
  db,
  { idPelapor, foto, deskripsi, kategori, latitude, longitude, sumber, wilayah, alamat },
) {
  if (!validasiIsianFormulir({ foto, deskripsi, koordinat: { latitude, longitude }, kategori })) {
    throw new HttpError(400, PESAN_BELUM_LENGKAP);
  }
  const teks = deskripsi.trim();
  const { idFasilitas } = await cariAtauBuatFasilitas(db, { kategori, latitude, longitude, wilayah, alamat });
  const idLaporan = await simpanLaporan(db, { idPelapor, idFasilitas, foto, deskripsi: teks, kategori });
  await setLokasiLaporan(db, { idLaporan, latitude, longitude, sumber, wilayah, alamat });
  await catatRiwayat(db, {
    idLaporan,
    status: STATUS.MENUNGGU_VERIFIKASI,
    deskripsi: PESAN_DITERIMA,
    idPengguna: idPelapor,
  });
  await getJumlahLaporan(db, idFasilitas);
  return idLaporan;
}

/**
 * Merevisi laporan "Perlu Revisi" milik pelapor, lalu mengembalikannya ke "Menunggu Verifikasi".
 * Wajib dipanggil di dalam withTransaction().
 */
export async function revisiLaporan(db, { idLaporan, idPelapor, perubahan = {} }) {
  const { rows } = await db.query(
    `SELECT l.id_laporan, l.id_fasilitas, l.foto_laporan, l.deskripsi_laporan, l.kategori_kerusakan, l.status_laporan,
            lo.latitude, lo.longitude, lo.wilayah, lo.alamat
       FROM laporan l
       LEFT JOIN lokasi lo ON lo.id_laporan = l.id_laporan
      WHERE l.id_laporan = $1 AND l.id_pelapor = $2
      FOR UPDATE OF l`,
    [idLaporan, idPelapor],
  );
  const lama = rows[0];
  if (!lama) throw new HttpError(404, 'Laporan tidak ditemukan');
  if (lama.status_laporan !== STATUS.PERLU_REVISI) {
    throw new HttpError(409, `Laporan hanya bisa direvisi saat berstatus "${STATUS.PERLU_REVISI}"`);
  }

  const { foto, kategori, lokasi } = perubahan;
  const deskripsi = perubahan.deskripsi?.trim();
  const baru = {
    foto: foto ?? lama.foto_laporan,
    deskripsi: deskripsi ?? lama.deskripsi_laporan,
    kategori: kategori ?? lama.kategori_kerusakan,
    latitude: lokasi?.latitude ?? lama.latitude,
    longitude: lokasi?.longitude ?? lama.longitude,
    wilayah: lokasi?.wilayah ?? lama.wilayah,
    alamat: lokasi?.alamat ?? lama.alamat,
  };
  if (!validasiIsianFormulir({ ...baru, koordinat: { latitude: baru.latitude, longitude: baru.longitude } })) {
    throw new HttpError(400, PESAN_BELUM_LENGKAP);
  }

  await db.query(
    `UPDATE laporan
        SET foto_laporan = $1, deskripsi_laporan = $2, kategori_kerusakan = $3, diperbarui_pada = NOW()
      WHERE id_laporan = $4`,
    [baru.foto, baru.deskripsi, baru.kategori, idLaporan],
  );
  if (lokasi) await setLokasiLaporan(db, { idLaporan, ...lokasi });

  const kategoriBerubah = baru.kategori !== lama.kategori_kerusakan;
  if (kategoriBerubah || lokasi) {
    const { idFasilitas } = await cariAtauBuatFasilitas(db, baru);
    if (idFasilitas !== lama.id_fasilitas) {
      await db.query('UPDATE laporan SET id_fasilitas = $1 WHERE id_laporan = $2', [idFasilitas, idLaporan]);
      await getJumlahLaporan(db, lama.id_fasilitas);
      await getJumlahLaporan(db, idFasilitas);
    }
  }

  await ubahStatus(db, {
    idLaporan,
    statusBaru: STATUS.MENUNGGU_VERIFIKASI,
    deskripsi: PESAN_DIREVISI,
    idPengguna: idPelapor,
  });
  return idLaporan;
}

/**
 * Pemeriksaan cepat sebelum foto revisi diunggah.
 */
export async function pastikanBisaDirevisi(db, { idLaporan, idPelapor }) {
  const { rows } = await db.query('SELECT status_laporan FROM laporan WHERE id_laporan = $1 AND id_pelapor = $2', [
    idLaporan,
    idPelapor,
  ]);
  if (!rows[0]) throw new HttpError(404, 'Laporan tidak ditemukan');
  if (rows[0].status_laporan !== STATUS.PERLU_REVISI) {
    throw new HttpError(409, `Laporan hanya bisa direvisi saat berstatus "${STATUS.PERLU_REVISI}"`);
  }
}

/**
 * Mengambil laporan milik pelapor dalam bentuk DTO LaporanSaya (tanpa identitas pelapor).
 */
export async function getLaporanSayaById(db, { idLaporan, idPelapor }) {
  const { rows } = await db.query(
    `SELECT l.id_laporan, l.kategori_kerusakan, l.deskripsi_laporan, l.foto_laporan, l.status_laporan,
            l.tanggal_laporan, l.diperbarui_pada, l.id_fasilitas,
            lo.latitude, lo.longitude, lo.wilayah, lo.alamat,
            f.nama_fasilitas,
            v.keputusan, v.catatan_alasan, v.waktu_verifikasi
       FROM laporan l
       LEFT JOIN lokasi lo ON lo.id_laporan = l.id_laporan
       LEFT JOIN fasilitas f ON f.id_fasilitas = l.id_fasilitas
       LEFT JOIN LATERAL (
              SELECT keputusan, catatan_alasan, waktu_verifikasi
                FROM verifikasi
               WHERE id_laporan = l.id_laporan
               ORDER BY waktu_verifikasi DESC, id_verifikasi DESC
               LIMIT 1
            ) v ON TRUE
      WHERE l.id_laporan = $1 AND l.id_pelapor = $2`,
    [idLaporan, idPelapor],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id_laporan,
    kategori: r.kategori_kerusakan,
    deskripsi: r.deskripsi_laporan,
    foto: urlFoto(r.foto_laporan),
    status: r.status_laporan,
    tanggalLaporan: r.tanggal_laporan,
    lokasi:
      r.latitude === null || r.latitude === undefined
        ? null
        : { latitude: r.latitude, longitude: r.longitude, wilayah: r.wilayah, alamat: r.alamat },
    fasilitas: r.id_fasilitas ? { id: r.id_fasilitas, nama: r.nama_fasilitas } : null,
    diperbaruiPada: r.diperbarui_pada,
    catatanVerifikasi: r.keputusan
      ? { keputusan: r.keputusan, catatan: r.catatan_alasan, waktu: r.waktu_verifikasi }
      : null,
  };
}