/**
 * Konfigurasi server dari environment variable (lihat server/.env.example).
 * Pemilik: P1.
 */
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';

const env = (name, fallback = '') => process.env[name]?.trim() || fallback;

const databaseUrl = isTest
  ? env('TEST_DATABASE_URL', 'postgres://silembur:silembur@localhost:5432/silembur_test')
  : env('DATABASE_URL', 'postgres://silembur:silembur@localhost:5432/silembur');

// Rahasia JWT bawaan hanya untuk pengembangan lokal tanpa .env: nilainya terlihat di repo publik (KNF02).
// Tetap dipakai sebagai cadangan agar sesi stabil saat `node --watch` me-restart server;
// server.js menampilkan peringatan bila rahasia ini (atau placeholder .env.example) yang terpakai.
const JWT_SECRET_BAWAAN = 'dev-only-secret-ganti-di-env';
const JWT_SECRET_PLACEHOLDER = ['', JWT_SECRET_BAWAAN, 'ganti-dengan-string-acak'];
const jwtSecret = env('JWT_SECRET', JWT_SECRET_BAWAAN);

// Test tidak boleh menyentuh folder unggahan pengembangan (server/uploads, berisi foto seed demo).
// Foto test ditulis ke folder sementara OS, dipisah per basis data test agar beberapa proses test
// paralel (DB berbeda) tidak saling menghapus. TEST_UPLOAD_DIR boleh menimpa lokasi ini.
function folderUnggahTest() {
  let namaDb = 'silembur_test';
  try {
    namaDb = new URL(databaseUrl).pathname.replace(/^\//, '') || namaDb;
  } catch {
    // URL tidak valid: biarkan pool yang melaporkan; pakai nama bawaan.
  }
  return path.join(os.tmpdir(), 'silembur-test-uploads', namaDb.replace(/[^\w-]/g, '_'));
}

export const config = Object.freeze({
  isTest,
  port: Number(env('PORT', '3000')),
  databaseUrl,
  jwtSecret,
  jwtSecretBawaan: !isTest && JWT_SECRET_PLACEHOLDER.includes(jwtSecret),
  jwtExpiresIn: env('JWT_EXPIRES_IN', '7d'),
  storageDriver: env('STORAGE_DRIVER', 'local'),
  uploadDir: isTest
    ? path.resolve(env('TEST_UPLOAD_DIR', folderUnggahTest()))
    : path.resolve(serverRoot, env('UPLOAD_DIR', 'uploads')),
  gcsBucket: env('GCS_BUCKET'),
  googleMapsApiKey: env('GOOGLE_MAPS_API_KEY'),
  googleClientIds: env('GOOGLE_CLIENT_IDS')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  serverRoot,
});
