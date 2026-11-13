/**
 * Titik masuk server. Listen di 0.0.0.0 agar HP (Expo Go) di jaringan yang sama bisa mengakses.
 * Pemilik: P1.
 */
import os from 'node:os';
import { buatApp } from './app.js';
import { config } from './config.js';
import { pastikanFotoContoh } from './db/seed.js';

if (config.jwtSecretBawaan) {
  console.warn(
    'PERINGATAN: JWT_SECRET belum diatur, server memakai rahasia bawaan yang terlihat di repo publik.\n' +
      '  Salin server/.env.example menjadi server/.env lalu isi JWT_SECRET dengan string acak panjang.',
  );
}

// Hosting berdisk sementara (mis. paket gratis tanpa volume) menghapus UPLOAD_DIR saat server tidur/deploy ulang,
// padahal laporan seed tetap merujuk seed/*.png. Tulis ulang yang hilang; gagal tidak menghentikan server.
pastikanFotoContoh()
  .then((n) => n && console.log(`Foto contoh seed ditulis ulang: ${n} file.`))
  .catch((err) => console.warn('Foto contoh seed tidak dapat ditulis ulang:', err.message));

const app = buatApp();

app.listen(config.port, '0.0.0.0', () => {
  const ipLan = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
  console.log(`SILEMBUR API berjalan di http://localhost:${config.port}/api`);
  for (const ip of ipLan) console.log(`  dari HP/emulator: http://${ip}:${config.port}/api`);
  console.log(`  penyimpanan foto: ${config.storageDriver}, peta/wilayah: ${config.googleMapsApiKey ? 'google' : 'offline'}`);
});
