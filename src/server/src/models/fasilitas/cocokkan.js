import { ATURAN } from '@silembur/shared';
import { jarakMeter } from '../../adapters/googleMapsAdapter.js';

const DELTA_KOTAK = 0.0005;

/**
 * Mencari fasilitas berkategori sama yang terdekat dalam radius 30 m.
 */
export async function cariFasilitasTerdekat(db, { kategori, latitude, longitude }) {
  const { rows } = await db.query(
    `SELECT id_fasilitas, latitude, longitude
       FROM fasilitas
      WHERE kategori = $1
        AND latitude  BETWEEN $2 AND $3
        AND longitude BETWEEN $4 AND $5`,
    [kategori, latitude - DELTA_KOTAK, latitude + DELTA_KOTAK, longitude - DELTA_KOTAK, longitude + DELTA_KOTAK],
  );

  let terdekat = null;
  for (const f of rows) {
    const jarak = jarakMeter({ lat: latitude, lng: longitude }, { lat: f.latitude, lng: f.longitude });
    if (jarak <= ATURAN.RADIUS_FASILITAS_METER && (!terdekat || jarak < terdekat.jarak)) {
      terdekat = { idFasilitas: f.id_fasilitas, jarak };
    }
  }
  return terdekat;
}

/**
 * Menautkan laporan ke fasilitas terdekat, atau membuat fasilitas baru bila tidak ada.
 */
export async function cariAtauBuatFasilitas(db, { kategori, latitude, longitude, wilayah, alamat }) {
  await db.query(`SELECT pg_advisory_xact_lock(hashtext('fasilitas:' || $1))`, [kategori]);

  const terdekat = await cariFasilitasTerdekat(db, { kategori, latitude, longitude });
  if (terdekat) return { idFasilitas: terdekat.idFasilitas, baru: false };

  const { rows } = await db.query(
    `INSERT INTO fasilitas (nama_fasilitas, kategori, lokasi_fasilitas, latitude, longitude, wilayah)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id_fasilitas`,
    [`${kategori} - ${alamat}`, kategori, alamat, latitude, longitude, wilayah],
  );
  return { idFasilitas: rows[0].id_fasilitas, baru: true };
}