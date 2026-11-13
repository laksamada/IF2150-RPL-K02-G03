/**
 * GoogleMapsAdapter sisi server (DPPL Tabel 2.3): mengubah koordinat menjadi wilayah & alamat
 * (dipakai Lokasi.setLokasiLaporan, Algo-006). Peta interaktif ada di sisi mobile
 * (mobile/src/components/map).
 * Pemilik: P1.
 *
 * Mode:
 *   - GOOGLE_MAPS_API_KEY terisi -> Google Geocoding API (fallback offline bila gagal).
 *   - kosong (default)          -> offline: kecamatan Bandung terdekat (wilayahBandung.js).
 *
 * Kontrak (dipakai P2, P5):
 *   getWilayahFromCoordinates(lat, lng) -> Promise<{ wilayah: string, alamat: string }>
 *   jarakMeter(a, b) -> number   // haversine, a/b = { lat, lng }
 *   diKotaBandung(lat, lng) -> boolean   // false bila wilayahOffline memberi "Luar Kota Bandung"
 */
import { config } from '../config.js';
import { KECAMATAN_BANDUNG, SEMUA_WILAYAH } from './wilayahBandung.js';

const RADIUS_BUMI_M = 6_371_000;
const BATAS_KOTA_M = 12_000;

export function jarakMeter(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIUS_BUMI_M * Math.asin(Math.sqrt(h));
}

/** Kecamatan Bandung terdekat dari titik beserta jaraknya (meter). */
function kecamatanTerdekat(lat, lng) {
  let terdekat = KECAMATAN_BANDUNG[0];
  let min = Infinity;
  for (const k of KECAMATAN_BANDUNG) {
    const d = jarakMeter({ lat, lng }, k);
    if (d < min) {
      min = d;
      terdekat = k;
    }
  }
  return { terdekat, min };
}

/**
 * Lingkup satu kota (SKPL/DPPL 1.2): true bila titik berada dalam BATAS_KOTA_M dari pusat salah satu
 * kecamatan Kota Bandung. Aturan yang sama dengan wilayahOffline ("Luar Kota Bandung").
 */
export function diKotaBandung(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return kecamatanTerdekat(lat, lng).min <= BATAS_KOTA_M;
}

export function wilayahOffline(lat, lng) {
  const { terdekat, min } = kecamatanTerdekat(lat, lng);
  if (min > BATAS_KOTA_M) return { wilayah: 'Luar Kota Bandung', alamat: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
  return { wilayah: terdekat.nama, alamat: `Kec. ${terdekat.nama}, Kota Bandung` };
}

const URL_GEOCODING = 'https://maps.googleapis.com/maps/api/geocode/json';
const TIMEOUT_GEOCODING_MS = 3000;

/** "Kecamatan Coblong" / "Kec. Coblong" / "coblong" -> "Coblong" bila ada di daftar kecamatan Bandung. */
function normalisasiKecamatan(nama) {
  if (!nama) return null;
  const bersih = nama.replace(/^(kecamatan|kec\.?)\s+/i, '').trim().toLowerCase();
  return SEMUA_WILAYAH.find((w) => w.toLowerCase() === bersih) ?? null;
}

/**
 * Google Geocoding API (reverse geocoding). Kecamatan diambil dari komponen
 * administrative_area_level_3 (atau _4/locality sebagai cadangan), alamat dari formatted_address.
 * Gagal, kuota habis, atau kecamatan tidak dikenali -> wilayah dari fallback offline,
 * agar nilai filter wilayah (KF19, UC04) selalu konsisten dengan daftar kecamatan.
 * `opsi` disediakan untuk pengujian.
 */
export async function wilayahGoogle(lat, lng, { apiKey = config.googleMapsApiKey, fetchFn = fetch } = {}) {
  const cadangan = wilayahOffline(lat, lng);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_GEOCODING_MS);
  try {
    const url = `${URL_GEOCODING}?latlng=${lat},${lng}&language=id&key=${encodeURIComponent(apiKey)}`;
    const res = await fetchFn(url, { signal: controller.signal });
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return cadangan;

    const komponen = data.results.flatMap((r) => r.address_components ?? []);
    const calon = ['administrative_area_level_3', 'administrative_area_level_4', 'locality', 'sublocality']
      .flatMap((tipe) => komponen.filter((k) => k.types?.includes(tipe)).map((k) => k.long_name));
    const wilayah = calon.map(normalisasiKecamatan).find(Boolean) ?? cadangan.wilayah;
    return { wilayah, alamat: data.results[0].formatted_address ?? cadangan.alamat };
  } catch {
    return cadangan;
  } finally {
    clearTimeout(timer);
  }
}

export async function getWilayahFromCoordinates(lat, lng) {
  return config.googleMapsApiKey ? wilayahGoogle(lat, lng) : wilayahOffline(lat, lng);
}
