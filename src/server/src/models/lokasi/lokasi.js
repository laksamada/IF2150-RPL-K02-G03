import { SUMBER_LOKASI } from '@silembur/shared';
import { getWilayahFromCoordinates } from '../../adapters/googleMapsAdapter.js';

export function formatKoordinat(latitude, longitude) {
  return `${latitude.toFixed(6)},${longitude.toFixed(6)}`;
}

/**
 * Menyimpan lokasi laporan. Baris lokasi yang sudah ada ditimpa (dipakai juga saat revisi).
 */
export async function setLokasiLaporan(
  db,
  { idLaporan, latitude, longitude, sumber = SUMBER_LOKASI.GPS, wilayah, alamat },
) {
  const koordinat = formatKoordinat(latitude, longitude);
  if (!wilayah) ({ wilayah, alamat } = await getWilayahFromCoordinates(latitude, longitude));

  await db.query(
    `INSERT INTO lokasi (id_laporan, koordinat, latitude, longitude, wilayah, alamat, sumber)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id_laporan) DO UPDATE
        SET koordinat = EXCLUDED.koordinat,
            latitude  = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude,
            wilayah   = EXCLUDED.wilayah,
            alamat    = EXCLUDED.alamat,
            sumber    = EXCLUDED.sumber`,
    [idLaporan, koordinat, latitude, longitude, wilayah, alamat ?? null, sumber],
  );
  return { koordinat, wilayah, alamat };
}

/**
 * Mengambil wilayah (kecamatan) laporan.
 */
export async function getWilayah(db, idLaporan) {
  const { rows } = await db.query('SELECT wilayah FROM lokasi WHERE id_laporan = $1', [idLaporan]);
  return rows[0]?.wilayah ?? null;
}