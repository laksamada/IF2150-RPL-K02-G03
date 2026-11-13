import { ATURAN, SEMUA_KATEGORI } from '@silembur/shared';

/**
 * Mengembalikan daftar bagian formulir yang belum diisi.
 */
export function bagianBelumLengkap({ foto, kategori, koordinat, deskripsi }) {
  const kurang = [];
  if (!foto) kurang.push('foto');
  if (!SEMUA_KATEGORI.includes(kategori)) kurang.push('kategori');
  if (!koordinat || !Number.isFinite(koordinat.latitude) || !Number.isFinite(koordinat.longitude)) kurang.push('lokasi');
  const teks = (deskripsi ?? '').trim();
  if (teks.length === 0 || teks.length > ATURAN.BATAS_DESKRIPSI) kurang.push('deskripsi');
  return kurang;
}

/**
 * Algo-004 versi mobile, hanya untuk membuka kunci tombol Kirim. Server tetap memvalidasi ulang.
 */
export function validasiIsianFormulir(isian) {
  return bagianBelumLengkap(isian).length === 0;
}