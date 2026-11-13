/**
 * Klien HTTP ke server SILEMBUR (View -> Controller lewat HTTPS/HTTP, DPPL Physical View).
 * Pemilik: P1.
 *
 * - Token login dipasang otomatis (setTokenApi dipanggil AuthContext).
 * - Timeout 5 detik (ATURAN.TIMEOUT_MS) -> ApiError berpesan "Tolong muat ulang halaman" (skenario alternatif UC04/05/06).
 * - Error server diseragamkan menjadi ApiError { status, message, details }.
 * - 401 pada permintaan bertoken (token kedaluwarsa/dicabut) -> penangan sesi berakhir dari AuthContext
 *   dipanggil agar aplikasi kembali ke login. /auth/login dan /auth/google dikecualikan: 401 di sana berarti
 *   kredensial salah dan cukup ditampilkan sebagai pesan error.
 */
import Constants from 'expo-constants';
import { ATURAN, PESAN } from '@silembur/shared';

let token = null;
export function setTokenApi(t) {
  token = t;
}

let penanganSesiBerakhir = null;
/** Didaftarkan AuthContext: dipanggil sekali saat permintaan bertoken ditolak 401. `null` untuk melepas. */
export function setPenanganSesiBerakhir(fn) {
  penanganSesiBerakhir = fn;
}

const PATH_TANPA_SESI = ['/auth/login', '/auth/google'];

/** Beri tahu AuthContext bila token yang dikirim ditolak (401) dan masih token yang aktif. */
function periksaSesiBerakhir(status, path, tokenDikirim) {
  if (status !== 401 || !tokenDikirim || tokenDikirim !== token) return;
  if (PATH_TANPA_SESI.includes(path)) return;
  penanganSesiBerakhir?.();
}

function tentukanBaseUrl() {
  const dariEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (dariEnv) return dariEnv.replace(/\/+$/, '');
  // Expo Go: pakai host yang sama dengan Metro (IP laptop) di port 3000.
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const host = hostUri.split(':')[0] || 'localhost';
  return `http://${host}:3000`;
}

export const BASE_URL = tentukanBaseUrl();

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

/** Ubah path relatif "/uploads/..." dari server menjadi URL lengkap untuk <Image>. */
export function urlLengkap(path) {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${BASE_URL}${path}`;
}

/**
 * @param {string} method
 * @param {string} path  mis. '/laporan/publik'
 * @param {{ query?: object, body?: object, form?: FormData, timeoutMs?: number }} [opsi]
 */
export async function request(method, path, { query, body, form, timeoutMs = ATURAN.TIMEOUT_MS } = {}) {
  const qs = query
    ? '?' +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&')
    : '';
  const headers = { Accept: 'application/json' };
  const tokenDikirim = token;
  if (tokenDikirim) headers.Authorization = `Bearer ${tokenDikirim}`;
  if (body) headers['Content-Type'] = 'application/json';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${BASE_URL}/api${path}${qs.length > 1 ? qs : ''}`, {
      method,
      headers,
      body: form ?? (body ? JSON.stringify(body) : undefined),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new ApiError(0, PESAN.MUAT_ULANG);
    throw new ApiError(0, `Tidak dapat terhubung ke server (${BASE_URL}). ${PESAN.MUAT_ULANG}`);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    periksaSesiBerakhir(res.status, path, tokenDikirim);
    throw new ApiError(res.status, data?.error?.message ?? `Permintaan gagal (${res.status})`, data?.error?.details);
  }
  return data;
}

/**
 * Upload multipart lewat XMLHttpRequest bawaan React Native.
 * Sejak Expo SDK 58, `fetch` global adalah `expo/fetch` yang tidak mendukung bagian FormData berbentuk
 * `{ uri, type, name }` (foto dari expo-image-picker), sehingga upload foto selalu gagal. XHR React Native
 * masih membaca file dari `uri` secara native. Pola error sama dengan request(): ApiError { status, message, details }.
 */
function kirimMultipart(method, path, form, timeoutMs) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${BASE_URL}/api${path}`);
    xhr.setRequestHeader('Accept', 'application/json');
    const tokenDikirim = token;
    if (tokenDikirim) xhr.setRequestHeader('Authorization', `Bearer ${tokenDikirim}`);
    xhr.timeout = timeoutMs;
    xhr.onload = () => {
      if (xhr.status === 204) return resolve(null);
      let data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        data = null;
      }
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data);
      periksaSesiBerakhir(xhr.status, path, tokenDikirim);
      reject(new ApiError(xhr.status, data?.error?.message ?? `Permintaan gagal (${xhr.status})`, data?.error?.details));
    };
    xhr.ontimeout = () => reject(new ApiError(0, PESAN.MUAT_ULANG));
    xhr.onerror = () => reject(new ApiError(0, `Tidak dapat terhubung ke server (${BASE_URL}). ${PESAN.MUAT_ULANG}`));
    xhr.send(form);
  });
}

export const api = {
  get: (path, query, opsi) => request('GET', path, { ...opsi, query }),
  post: (path, body, opsi) => request('POST', path, { ...opsi, body }),
  put: (path, body, opsi) => request('PUT', path, { ...opsi, body }),
  patch: (path, body, opsi) => request('PATCH', path, { ...opsi, body }),
  /** Kirim multipart (foto). Content-Type + boundary diisi otomatis oleh XHR. */
  kirimForm: (method, path, form, opsi) => kirimMultipart(method, path, form, opsi?.timeoutMs ?? 30_000),
};
