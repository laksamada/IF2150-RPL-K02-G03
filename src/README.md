# SILEMBUR — Sistem Informasi Lembur

Aplikasi mobile (Android & iOS) untuk melaporkan kerusakan fasilitas umum (jalan berlubang, lampu jalan mati, pohon
tumbang) di Kota Bandung. Masyarakat mengirim laporan berisi foto, lokasi GPS, dan deskripsi; admin memverifikasi;
pemerintah daerah menerima daftar laporan terverifikasi yang terurut berdasarkan skor prioritas. Laporan duplikat bisa
digabung dan riwayat kerusakan per fasilitas bisa ditelusuri.

Tugas Besar IF2150 Rekayasa Perangkat Lunak — Kelas K02, Kelompok G03.

## Teknologi

| Bagian | Teknologi & versi |
| :--- | :--- |
| Aplikasi mobile | Expo SDK 58 (React Native 0.88, React 19.3), Expo Router 58, JavaScript |
| Server API | Node.js 24, Express 5, node-postgres 8, zod 4, multer 2, jsonwebtoken 9 |
| Basis data | PostgreSQL 18 (Docker) |
| Pengujian | Vitest 5 + Supertest 7 |
| Layanan eksternal (opsional) | Google Maps Platform, Google Sign-In, Google Cloud Storage — semuanya punya fallback lokal |

Arsitektur MVC di atas klien-server: lihat [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Prasyarat

- Node.js **24** dan npm 11
- Docker Desktop (untuk PostgreSQL 18)
- Untuk mencoba aplikasi: HP Android/iOS dengan aplikasi **Expo Go** (SDK 58) di jaringan Wi-Fi yang sama dengan laptop, **atau** emulator Android (Android Studio)

## Instalasi & konfigurasi

Semua perintah dijalankan dari folder `src/`.

```bash
npm install
cp server/.env.example server/.env
cp mobile/.env.example mobile/.env
npm run db:up
npm run db:migrate
npm run db:seed
```

Variabel penting (`server/.env`): `DATABASE_URL`, `JWT_SECRET`, `STORAGE_DRIVER` (`local`/`gcs`), `GOOGLE_MAPS_API_KEY` (kosong = wilayah offline).
Mobile (`mobile/.env`): `EXPO_PUBLIC_API_URL` — kosongkan agar otomatis memakai IP laptop; emulator Android pakai `http://10.0.2.2:3000`.

## Menjalankan

Terminal 1 — server API:
```bash
npm run dev:server
```
Terminal 2 — aplikasi mobile:
```bash
npm run dev:mobile
```
Pindai QR yang muncul dengan Expo Go (Android) atau Kamera (iOS), atau tekan `a` untuk emulator Android.
Jika HP tidak bisa terhubung ke API, izinkan Node.js melewati Windows Firewall untuk port 3000.

Menjalankan test (butuh `npm run db:up`):
```bash
npm test
```

### Jika Docker Desktop di Windows gagal start

Gejala: `docker` menggantung, atau log Docker Desktop berisi `dockerInference` / `engine.sock: The file cannot be accessed by the system`.
Alternatifnya, jalankan Docker Engine langsung di Ubuntu WSL. PostgreSQL tetap bisa diakses dari Windows di `localhost:5432`.

1. Pasang Docker Engine di Ubuntu WSL mengikuti [panduan resmi Docker untuk Ubuntu](https://docs.docker.com/engine/install/ubuntu/), lalu `sudo usermod -aG docker $USER` dan `sudo systemctl enable --now docker` (butuh `systemd=true` di `/etc/wsl.conf`).
2. Dari folder `src/` di Windows, pakai skrip versi WSL:
   ```bash
   npm run db:up:wsl
   ```
   Lalu lanjutkan `npm run db:migrate`, `npm run db:seed`, dan `npm test` seperti biasa.

### Menguji di PC dengan emulator Android (tanpa Android Studio)

Butuh ±5 GB ruang disk dan virtualisasi aktif (Windows Hypervisor Platform).

1. Unduh *command line tools* dari [developer.android.com/studio](https://developer.android.com/studio#command-tools), ekstrak ke `<SDK>\cmdline-tools\latest` (mis. `D:\Android\sdk`), lalu set `ANDROID_HOME=<SDK>`.
2. Pasang paket (nama paket berisi `;`, jadi tulis di file lalu pakai `--package_file`):
   ```bash
   sdkmanager --licenses
   ```
   ```bash
   sdkmanager platform-tools emulator --package_file=paket.txt
   ```
   dengan `paket.txt` berisi `system-images;android-35;google_apis;x86_64`.
3. Buat AVD (`avdmanager create avd -n silembur -k "system-images;android-35;google_apis;x86_64" -d pixel_7`), lalu jalankan `emulator -avd silembur`.
4. Jalankan server, lalu di `src/mobile` jalankan `npx expo start --android`. Bila Expo Go belum terpasang otomatis, pasang APK Expo Go SDK 58 dengan `adb install`, lalu buka `exp://127.0.0.1:8081` setelah `adb reverse tcp:8081 tcp:8081` dan `adb reverse tcp:3000 tcp:3000`.

## Integrasi Google (opsional)

Tanpa konfigurasi apa pun aplikasi berjalan penuh dengan fallback lokal. Isi variabel berikut bila ingin memakai layanan Google:

| Layanan | Konfigurasi | Tanpa konfigurasi |
| :--- | :--- | :--- |
| Google Geocoding (wilayah & alamat laporan) | `GOOGLE_MAPS_API_KEY` di `server/.env` | Kecamatan Bandung terdekat (offline) |
| Google Cloud Storage (foto laporan) | `STORAGE_DRIVER=gcs`, `GCS_BUCKET`, `GOOGLE_APPLICATION_CREDENTIALS` (path file service account, di luar repo). Bucket harus bisa dibaca publik. | Foto disimpan di `server/uploads/` |
| Google Sign-In (masyarakat) | `GOOGLE_CLIENT_IDS` di `server/.env` + `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` di `mobile/.env`. Butuh development build (`npx expo run:android`), tidak jalan di Expo Go. | Tombol Google nonaktif; masuk dengan email + kata sandi |
| Google Maps di APK Android | `GOOGLE_MAPS_ANDROID_API_KEY` saat build | Expo Go memakai kunci bawaannya; iOS memakai Apple Maps |

## Build APK (opsional)

Butuh akun Expo (gratis). Dari folder `src/mobile`, isi `EXPO_PUBLIC_API_URL` dengan alamat server yang bisa dijangkau HP, lalu:
```bash
npx eas-cli@latest build -p android --profile preview
```
Profil build ada di `mobile/eas.json`. Unduh APK dari tautan yang diberikan, lalu lampirkan di GitHub Release.

## Deploy uji coba (Railway + Neon)

Server API di [Railway](https://railway.com) (dibangun dari `src/Dockerfile`), basis data di [Neon](https://neon.tech), foto di *volume* Railway (disk permanen).
**Jangan pernah meng-commit connection string, kata sandi, atau kunci apa pun** — repo ini publik; semua rahasia diisi lewat dashboard Railway.

1. **Neon** — buat project (region Singapore), salin *connection string* (sudah berisi `sslmode=require`).
2. **Seed sekali** dari laptop (folder `src/`), mengarah ke Neon. Perintah ini **menghapus seluruh data** lalu mengisi ulang:
   ```bash
   DATABASE_URL="<connection string Neon>" npm run db:migrate && DATABASE_URL="<connection string Neon>" npm run db:seed
   ```
3. **Railway** — *New Project → Deploy from GitHub repo*, pilih repo ini. Di *Settings* service:
   - *Source*: branch `main`, **Root Directory `/src`** (Railway otomatis memakai `Dockerfile` di folder itu).
   - *Deploy → Healthcheck Path*: `/api/health`.
4. **Variables** service:

   | Variabel | Isi |
   | :--- | :--- |
   | `DATABASE_URL` | connection string Neon |
   | `JWT_SECRET` | string acak panjang, mis. hasil `openssl rand -hex 32` |
   | `UPLOAD_DIR` | `/data/uploads` |
   | `GOOGLE_MAPS_API_KEY` | opsional; kosong = wilayah dari daftar kecamatan offline |

5. **Volume** — *Attach Volume* ke service dengan *mount path* `/data`, agar foto laporan tidak hilang saat deploy ulang.
   Migrasi berjalan otomatis setiap server start; foto contoh seed dibuat ulang otomatis bila belum ada.
6. **Domain** — *Settings → Networking → Generate Domain*, lalu cek `https://<domain>/api/health` → `{"status":"ok",...}`.
7. **Aplikasi** — dengan Expo Go: jalankan `EXPO_PUBLIC_API_URL=https://<domain> npx expo start` dari `src/mobile`.
   Atau build APK profil `demo` setelah mengganti `EXPO_PUBLIC_API_URL` di `mobile/eas.json` dengan domain Railway:
   ```bash
   npx eas-cli@latest build -p android --profile demo
   ```
   Agar peta tampil di APK, isi `GOOGLE_MAPS_ANDROID_API_KEY` di *Environment variables* project Expo (environment `preview`).

Penyimpanan Google Cloud Storage tetap didukung (`STORAGE_DRIVER=gcs`, lihat bagian Integrasi Google) bila tidak memakai volume.
Aplikasi menunggu jawaban server maksimal 5 detik ("Tolong muat ulang halaman"), jadi **buka `/api/health` beberapa menit sebelum demo** untuk memastikan server dan Neon sudah aktif.

## Continuous Integration

Setiap push ke `main` dan setiap pull request menjalankan `.github/workflows/ci.yml`: test server dengan PostgreSQL 18, lalu bundle aplikasi Android dan iOS.

## Akun uji

Kata sandi semua akun: `silembur123` (data fiktif dari seed).

| Peran | Email |
| :--- | :--- |
| Masyarakat (Pelapor) | `warga1@silembur.test`, `warga2@silembur.test`, `warga3@silembur.test` |
| Admin | `admin@silembur.test` |
| Pemerintah Daerah | `pemda@silembur.test` |

## Modul & pembagian anggota

| Kode | Modul / fitur | Use case | Anggota |
| :--- | :--- | :--- | :--- |
| P1 | Fondasi, autentikasi, integrasi Google, gabung duplikat, CI | UC07 | Mochamad Fachri Alfaridzi (13525128) |
| P2 | Membuat & merevisi laporan | UC01 | Muhammad Pandu Pulunggana (13525059) |
| P3 | Laporan publik, laporan saya, notifikasi, UI kit | UC04, UC05 | Satya Radhityan Yahya (13525098) |
| P4 | Verifikasi admin, skor prioritas | UC02 | Kevin Lincoln Hutabarat (13525101) |
| P5 | Prioritas pemda, fasilitas berulang, riwayat fasilitas | UC03, UC06, UC08 | Muhammad Dhiya Rafi (13525035) |

## Basis data

8 tabel: `pengguna`, `fasilitas`, `laporan`, `lokasi`, `skor_prioritas`, `verifikasi`, `riwayat_status`, `notifikasi`.
ERD, atribut, dan pemetaan ke kelas DPPL: [docs/DATABASE.md](docs/DATABASE.md). Kontrak API: [docs/API.md](docs/API.md).

## Struktur folder

```
src/
  shared/      konstanta bersama (status, kategori, aturan bisnis)
  server/      API Express: routes -> controllers -> models (MVC), adapters, db, tests
  mobile/      aplikasi Expo: src/app (rute), src/features (layar), src/api, src/components
  docs/        arsitektur, API, ERD, keputusan desain, konvensi, tugas per anggota
```
