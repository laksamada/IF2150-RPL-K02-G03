<h1>
IF2150 REKAYASA PERANGKAT LUNAK
<br>
TUGAS 9
<br>
IMPLEMENTASI PERANGKAT LUNAK
</h1>
<br>

## *SILEMBUR*
### *LOGO*
<p align="center">
<img alt="Logo SILEMBUR" src="./assets/logo.jpeg" width="40%">
</p>

### Untuk: *Amanda Aurellia Salsabila*

Dipersiapkan oleh:
| Informasi | Keterangan |
| --- | --- |
| Kelas | *K02* |
| Kelompok | *G03* |

| NIM | Nama |
|---|---|
| *13525059* | *Muhammad Pandu Pulunggana* |
| *13525128* | *Mochamad Fachri Alfaridzi* |
| *13525101* | *Kevin Lincoln Hutabarat* |
| *13525035* | *Muhammad Dhiya Rafi* |
| *13525098* | *Satya Radhityan Yahya* |
---

> **Petunjuk pengerjaan:** *[Silahkan hapus bagian ini setelah selesai mengerjakan]*
>
> Dokumen ini adalah **spesifikasi sekaligus template laporan singkat** Tugas 9. Bagian **Ketentuan Implementasi** (Bagian A) adalah aturan yang harus kalian ikuti, boleh dihapus dari laporan akhir. Bagian **Laporan Implementasi** (Bagian B) adalah yang **wajib kalian isi**. Gunakan nama, ID, kebutuhan, use case, dan kelas yang konsisten dengan SKPL, APL, dan DPPL.

---

**Deadline:** Jumat, 13 November 2026, 21.00 WIB
**Asistensi akbar:** Senin, 2 November 2026, 19.00 WIB, Microsoft Teams

---

# BAGIAN A: Ketentuan Implementasi

## A.1 Deskripsi Tugas

Pada tugas ini, kalian mengimplementasikan perangkat lunak yang telah dirancang pada tugas-tugas sebelumnya (SKPL, APL, DPPL) menjadi aplikasi yang **dapat dijalankan**. Platform bebas (web, desktop, atau mobile) selama aplikasi dapat dijalankan ulang oleh asisten mengikuti petunjuk kalian.

Ketentuan umum:
- Setiap anggota bertanggung jawab atas **minimal satu fitur atau modul** dan harus terlihat jelas di riwayat commit/PR.
- Implementasi harus **mengacu pada DPPL**. Jika ada yang berubah (kelas, layar, basis data, dsb.), catat di Bagian B.1. Perubahan itu wajar, tetapi harus tercatat dan beralasan.
- Implementasi **tidak harus berupa kelas** (misalnya fungsi, komponen, *route/handler*, *stored procedure*, atau skrip). Namun, setiap kelas perancangan pada DPPL **wajib dapat ditelusuri** ke implementasinya, dan penelusuran ini dicatat di Bagian B.5.
- Seluruh use case pada SKPL **diprioritaskan** untuk diimplementasikan. Status tiap use case akan dilaporkan pada HIUPL (Tugas 10).
- Seluruh mahasiswa **wajib** mengikuti asistensi akbar.

## A.2 Platform, Bahasa, dan Teknologi

Kalian **bebas** memilih bahasa, framework, library, dan basis data, dengan syarat:

1. **Dapat dijalankan ulang** oleh asisten pada mesin biasa dengan mengikuti README. Versi bahasa/runtime dan seluruh dependensi harus tertulis jelas.
2. **Dependensi dikelola lewat file standar**, misalnya `package.json` + lockfile, `requirements.txt`/`pyproject.toml`, `pom.xml`/`build.gradle`, `composer.json`, `pubspec.yaml`, dan sejenisnya. Jangan meng-commit folder hasil instalasi (`node_modules/`, `venv/`, `build/`, dll.).
3. **Jika memakai layanan eksternal** (basis data cloud, API pihak ketiga, auth, dll.), sediakan cara menjalankan tanpa akun pribadi kalian, atau sediakan data/akun uji pada README. Basis data **sangat disarankan** dapat dijalankan lokal (SQLite, atau Docker Compose untuk PostgreSQL/MySQL/MongoDB).
4. **Arsitektur sesuai DPPL.** Pola arsitektur yang kalian pilih di APL/DPPL (MVC, layered, client-server, dll.) harus terlihat pada struktur kode.

Ketentuan tambahan per platform:

| Platform | Ketentuan |
| :--- | :--- |
| **Web** | Berjalan lokal lewat satu-dua perintah yang terdokumentasi. Boleh juga di-*deploy*; jika ya, cantumkan URL, tetapi **tetap wajib bisa dijalankan lokal** (URL deploy bisa mati). |
| **Desktop** | Berjalan dari source lewat perintah yang terdokumentasi. Build/installer opsional. |
| **Mobile** | Berjalan di emulator/simulator atau perangkat. Sertakan langkah menjalankan, dan **sangat disarankan** melampirkan APK/build di Release. |

## A.3 Keamanan Repository

Repo fork kelompok bersifat **public**, sehingga:

- **Dilarang** meng-commit password, API key, token, `.env` asli, sertifikat/private key, atau data pribadi. Hal ini dapat mengurangi nilai.
- Sediakan `.env.example` berisi nama variabel tanpa nilai rahasia, dan masukkan `.env` ke `.gitignore`.
- Jika sudah terlanjur ter-commit, **cabut/ganti** kredensial tersebut. Menghapus commit saja tidak cukup.
- Data uji/seed harus berupa data fiktif.

## A.4 Struktur Folder

Seluruh kode ditempatkan di `src/` pada repo fork. Jangan mengubah folder milestone lama.

```
src/                              # SELURUH kode implementasi
	README.md                     # dokumentasi utama aplikasi (lihat A.5)
	.env.example                  # jika memakai environment variable
	<struktur kode kalian>        # bebas, mengikuti pola arsitektur DPPL
	tests/                        # test case (jika ada)
docs/
	M9/
		KXX_GYY_Implementasi.md   # laporan ini (Bagian B)
		KXX_GYY_Form-Asistensi.md
```

Catatan:
- `README.md` aplikasi diletakkan di **`src/README.md`**, bukan di root repo.
- Jika kerangka kerja kalian mewajibkan struktur tertentu (misalnya Maven `src/main/java`, Flutter `lib/`, monorepo `frontend/` dan `backend/`), letakkan semuanya **di dalam `src/`**.
- Nama file dan folder pada `docs/M9/` mengikuti aturan penamaan milestone sebelumnya (`KXX_GYY_...`).

## A.5 Isi Minimal `src/README.md`

README harus cukup bagi orang yang belum pernah melihat proyek kalian untuk menjalankan aplikasi dari nol. Minimal berisi:

1. **Deskripsi singkat** aplikasi.
2. **Teknologi yang digunakan** beserta versi (bahasa, framework, basis data).
3. **Prasyarat dan instalasi** (software yang harus ada, perintah instalasi dependensi).
4. **Konfigurasi** (environment variable, setup basis data, migrasi/seed) dan langkah demi langkah menjalankannya.
5. **Cara menjalankan aplikasi** (dan cara menjalankan test, jika ada).
6. **Akun/data uji** untuk mencoba tiap peran pengguna (jika ada login).
7. **Daftar modul/fitur yang diimplementasi** beserta pembagian anggota.
8. **Daftar tabel/koleksi basis data** beserta atributnya (atau tautan ke skema/ERD).

## A.6 Best Practices

Kalian dianjurkan menerapkan praktik berikut. Bukti penerapannya dirangkum pada Bagian B.2.

### 1. Branching
Sesuai aturan umum di README repository, `main` fork kelompok dijaga agar tetap bisa menerima sync dari asisten. Pada tugas ini **sangat disarankan** memakai branch per fitur dengan format `<tipe>/<nama-fitur>` (contoh: `feat/login-page`, `fix/null-cart`), lalu digabungkan ke `main` melalui Pull Request. Skema Gitflow penuh (dengan `develop`) boleh dipakai, tetapi tidak diwajibkan.

### 2. Semantic Commit
Gunakan format `<tipe>(<scope>): <deskripsi>`, misalnya `feat(auth): tambah validasi email`.

| Tipe | Kegunaan |
| :--- | :--- |
| `feat` | Menambahkan fitur baru |
| `fix` | Memperbaiki bug |
| `docs` | Mengubah dokumentasi |
| `style` | Perubahan format/spasi, tanpa mengubah logika |
| `refactor` | Perubahan kode yang tidak menambah fitur atau memperbaiki bug |
| `test` | Menambah/memperbaiki pengujian |
| `chore` | Tugas rutin (build, dependensi, konfigurasi) |

### 3. Track Tasks
Gunakan **GitHub Issues** (dan opsional GitHub Projects) untuk membagi tugas dan melacak progres.
- Pecah fitur besar menjadi issue yang lebih kecil dan tetapkan penanggung jawabnya.
- Hubungkan PR dengan issue (`Closes #12`) dan tutup issue ketika selesai.

### 4. Pull Request dan Code Review
- Setiap PR berisi penjelasan deskriptif tentang apa yang dikerjakan, beserta bukti (tangkapan layar/rekaman/hasil test).
- Setiap PR di-*review* minimal **1 anggota lain**, dengan komentar konstruktif atau approval.

### 5. Pengujian dan Optimasi Performa
- Tulis pengujian untuk logika inti (unit test dan/atau pengujian alur utama). Cakupan penuh tidak diwajibkan, tetapi pengujian pada logika utama dinilai.
- Lakukan **profiling** pada setidaknya satu fitur yang berat (query besar, proses pengolahan data, render list panjang, dsb.), lalu catat temuan dan perbaikannya. Contoh alat:

| Platform | Contoh alat |
| :--- | :--- |
| Web (frontend) | Chrome DevTools (Performance/Network), Lighthouse |
| Web (backend) | Profiler bawaan bahasa, `EXPLAIN` pada query basis data, logging waktu respons |
| Python | `cProfile`, `PyInstrument` |
| Java | VisualVM, JProfiler |
| Mobile | Android Studio Profiler, Flutter DevTools, Xcode Instruments |

### 6. Penggunaan AI
Penggunaan AI **tetap harus dicatat** pada `docs/KXX_GYY_AI-Usage.md` sesuai ketentuan yang sudah berlaku.

## A.7 Pengumpulan

Pengumpulan dinilai dari **tag release**, bukan commit terakhir.

1. Pastikan seluruh pekerjaan sudah di-*commit* dan di-*push* ke `main` fork kelompok.
2. Buat release dengan tag **`v9.0`** (revisi berikutnya `v9.1`, `v9.2`, dst.) dengan target branch `main`.
3. Yang dinilai adalah **tag terakhir yang dibuat sebelum deadline**.

## A.8 Aturan Tanya Jawab

Agar semua kelompok mendapat jawaban yang sama, pertanyaan dibagi menjadi dua jalur:

| Jenis Pertanyaan | Jalur |
| :--- | :--- |
| **Ketentuan tugas**, misalnya teknologi yang diperbolehkan, struktur folder, format pengumpulan, dan penilaian | **Sheets QnA:** *[tautan sheets QnA]* |
| **Kendala teknis kelompok sendiri**, misalnya error, setup, dan penggunaan git | Grup kelompok bersama asisten masing-masing |

Ketentuan:
1. Pertanyaan tentang ketentuan tugas **wajib** diajukan melalui Sheets QnA. Periksa terlebih dahulu apakah pertanyaan serupa sudah dijawab.
2. Jika pertanyaan tentang ketentuan tugas tetap diajukan langsung kepada asisten kelompok, asisten **berhak menolak menjawab** dan meminta kelompok memasukkan pertanyaannya ke Sheets QnA.
3. Jika pertanyaan di Sheets QnA **belum dijawab dalam 24 jam**, kelompok boleh menghubungi asisten kelompok masing-masing. Cantumkan pertanyaan yang sudah diajukan di sheets tersebut.
4. Jawaban pada Sheets QnA berlaku untuk **seluruh kelompok** dan menjadi acuan jika terjadi perbedaan pemahaman.

---

# BAGIAN B: Laporan Implementasi

## B.1 Perubahan dari DPPL

Tabel B.1. Perubahan dari DPPL

| No | Bagian DPPL | Rancangan Awal | Implementasi Akhir | Alasan |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Kelas C01 Pelapor, C02 Admin, C03 PemerintahDaerah | Ketiga peran dirancang sebagai kelas yang terpisah. | Ketiga peran disimpan di satu tabel `pengguna` dan dibedakan lewat kolom `peran`. Kolom `nama_instansi` dan `wilayah_kerja` hanya dipakai oleh peran PEMDA. | Login cukup memeriksa satu tabel, dan hak akses tiap peran tetap dibatasi lewat kolom `peran`. |
| 2 | Kelas C04 Laporan, C06 Fasilitas, Q-006, Q-009, Q-013 | Kelas Laporan tidak punya atribut yang menghubungkannya ke pelapor, fasilitas, atau laporan induk. Cara laporan dikaitkan ke fasilitas juga tidak dijelaskan. | Tabel `laporan` punya kolom `id_pelapor`, `id_fasilitas`, dan `id_laporan_induk`. Saat laporan dibuat, sistem mencari fasilitas berkategori sama dalam radius 30 m. Kalau tidak ada, fasilitas baru dibuat otomatis. | Q-006, Q-009, dan Q-013 memakai kolom-kolom ini. Tanpa itu, jumlah pelapor, riwayat fasilitas, dan penggabungan duplikat tidak bisa dihitung. |
| 3 | Algo-002, kelas C04 Laporan | Penulisan status tidak seragam, dan status "Perlu Revisi" tidak ada di rancangan. | Semua status dan transisi yang boleh terjadi ditulis di satu tempat (`shared/constants.js`) dan dijaga juga oleh constraint di basis data. Setiap perubahan status lewat `ubahStatus()`. Keputusan "Disetujui" mengubah status menjadi "Terverifikasi". | Supaya setiap bagian aplikasi memakai nama status yang sama dan tidak ada perubahan status yang tidak sah. |
| 4 | Layar I-06, KF05, KF16, Algo-009 | Admin mengisi skor lewat slider dan hanya bisa memilih setuju atau tolak. | Skor dihitung otomatis oleh server dan hanya ditampilkan ke admin. Ada tombol Minta Revisi, dan catatan wajib diisi untuk keputusan Ditolak atau Revisi. | Menurut Algo-009 skor dihitung sistem, bukan diisi manual. KF05 juga meminta adanya opsi revisi beserta alasannya. |
| 5 | Layar I-01, SKPL 2.4 | SKPL meminta Google Sign-In, sedangkan I-01 memakai email dan kata sandi. Cara pendaftaran akun juga tidak dijelaskan. | Tersedia dua cara login: Google Sign-In (bila sudah dikonfigurasi) dan email + kata sandi untuk akun uji. Login Google pertama kali membuat akun Pelapor baru, atau menautkan ke akun dengan email yang sama. Admin dan Pemda tidak bisa mendaftar sendiri. | Asisten bisa mencoba aplikasi tanpa akun Google pribadi, sementara login Google tetap berfungsi jika dikonfigurasi. |
| 6 | DPPL 2.1 (lingkungan server), adapter layanan Google | Server direncanakan berjalan di Google Cloud, dan layanan Google (Maps, Cloud Storage) dipakai langsung. | Deploy uji coba memakai Railway dan Neon, dan aplikasi juga bisa dijalankan lokal dengan PostgreSQL lewat Docker Compose. Layanan Google hanya dipakai jika kuncinya diisi. Jika tidak, foto disimpan di disk server dan wilayah ditentukan dari daftar kecamatan Bandung. | Aplikasi tetap bisa dijalankan ulang tanpa akun atau kunci pribadi milik anggota kelompok. |
| 7 | Layar I-04, UC01, KF05 | Belum ada layar atau endpoint bagi pelapor untuk memperbaiki laporan yang diminta revisi. | Layar I-04 dipakai lagi dalam mode revisi, dengan endpoint `PUT /api/laporan/:id/revisi`. Hanya pemilik laporan berstatus Perlu Revisi yang bisa mengirim revisi. | Pelapor bisa menindaklanjuti permintaan revisi dari admin tanpa membuat laporan baru. |
| 8 | UC03, KF12, KF22, layar I-10 | Tidak dijelaskan siapa yang mengubah status menjadi Diproses atau Selesai. | Pemda memperbarui status laporan lewat API dengan keterangan, dan setiap perubahan tercatat di riwayat status. | Penanganan laporan bisa dipantau pelapor (KF12) dan ditelusuri lewat riwayat (KF22). |
| 9 | KNF02, layar I-08–I-10 | Rancangan layar menampilkan nama pelapor di tampilan non-admin, dan memuat elemen di luar lingkup seperti regu lapangan, telemetri, SPK, dan skor kesehatan. | Identitas pelapor hanya dikirim untuk Admin. Tampilan publik dan Pemda tidak memuat identitas pelapor. Elemen di luar lingkup tidak dibuat. | Menjaga privasi pelapor sesuai KNF02, dan elemen tersebut tidak punya kebutuhan di SKPL. |
| 10 | UC06, UC08, layar I-05, I-09, I-10, Q-004 | Belum ada rancangan layar admin untuk UC06 dan UC08, dan Q-004 hanya mengambil laporan berstatus Terverifikasi. | Dashboard admin punya akses ke fasilitas berulang. Layar I-09 dan I-10 dipakai Admin dan Pemda. Daftar prioritas memuat laporan Terverifikasi dan Diproses. | Laporan yang sedang ditangani tetap muncul di daftar, dan admin bisa melihat fasilitas berulang. |
| 11 | KF14, Algo-007 | Batas jumlah laporan untuk menandai fasilitas berulang tidak disebutkan. | Fasilitas ditandai berulang jika ada minimal 3 laporan dalam 90 hari. | Batasnya harus berupa angka agar bisa diterapkan dan diuji. |
| 12 | UC04, UC05, kelas C04 Laporan | Skenario menyebut "judul" laporan, tetapi kelas Laporan tidak punya atribut judul. | Judul yang tampil di layar dibentuk dari kategori dan alamat lewat `judulLaporan()`, tanpa kolom judul di basis data. | Judul selalu sesuai dengan kategori dan lokasi laporan, tanpa perlu disimpan terpisah. |
| 13 | Algo-005, Q-004 | Daftar prioritas diurutkan dengan bubble sort di aplikasi. | Pengurutan dilakukan basis data dengan `ORDER BY` skor, dan indeks ditambahkan berdasarkan hasil profiling. | Pengurutan di basis data lebih cepat untuk data yang banyak. |
| 14 | Algo-012, UC07, KF15 | Tidak ada aturan kategori atau status untuk laporan yang digabung, dan tidak dijelaskan cara memilih laporan induk. | Hanya laporan aktif dengan kategori yang sama yang bisa digabung. Laporan paling awal menjadi induk, dan penggabungan ditolak jika ada laporan lain yang statusnya sudah lebih jauh. Laporan yang sebelumnya digabung ke laporan anak ikut dipindah ke induk baru. | Laporan yang sudah ditangani tidak tertutup oleh laporan lain, dan jumlah pelapor tidak berkurang. |
| 15 | DPPL 1.2, 2.1, 2.2, rancangan layar | Platform disebut sebagai "aplikasi web mobile" sekaligus aplikasi Android/iOS, dan gaya visual layar I-05–I-07 berbeda dengan I-01–I-04. | Aplikasi dibuat sebagai aplikasi mobile Android/iOS dengan React Native (Expo), dan semua layar memakai gaya visual yang sama. | Menyelesaikan perbedaan platform di dokumen dan membuat tampilan aplikasi seragam. Dokumen milestone lama tidak diubah. |
| 16 | UC04, layar I-02 | Tidak ada aturan paginasi untuk daftar laporan publik. | `GET /api/laporan/publik` menerima `limit` dan `offset` (default 20, maksimum 100), dengan urutan tanggal dan ID yang tetap. | Daftar dimuat sedikit demi sedikit dan urutannya tidak berubah antarhalaman ketika jumlah laporan bertambah. |
| 17 | Algo-004 `validasiIsianFormulir`, layar I-04 | Validasi hanya memeriksa foto, deskripsi, dan koordinat. | Validasi juga memeriksa kategori dan panjang deskripsi (maksimal 300 karakter), di server dan di aplikasi. Server juga menolak titik lokasi di luar Kota Bandung. | Kategori dibutuhkan untuk mencocokkan laporan dengan fasilitas, dan lingkup SILEMBUR hanya Kota Bandung (DPPL 1.2). |

Butir 2–15 merangkum penyesuaian G1–G16 di `src/docs/KEPUTUSAN.md`. G4 dan G13 digabung di butir 15, G5 dan G16 di butir 5, dan G6 dicatat bersama perubahan deploy di butir 6. Butir 1, 16, dan 17 adalah perubahan tambahan yang ditemukan saat implementasi. Bagian lain mengikuti rancangan DPPL.

## B.2 Bukti Penerapan Best Practices

Tabel B.2. Bukti Best Practices

| Praktik | Bukti | Keterangan |
| :--- | :--- | :--- |
| Branching | [Daftar branch](https://github.com/laksamada/IF2150-RPL-K02-G03/branches) dan PR [#2](https://github.com/laksamada/IF2150-RPL-K02-G03/pull/2), [#3](https://github.com/laksamada/IF2150-RPL-K02-G03/pull/3), [#4](https://github.com/laksamada/IF2150-RPL-K02-G03/pull/4) | Fitur dikembangkan pada branch terpisah (contoh `feat/p1`, `feat/implementation`, `chore/deploy-railway`) lalu digabung ke `main`. |
| Semantic commit | [Riwayat commit](https://github.com/laksamada/IF2150-RPL-K02-G03/commits/main) | Contoh: `fix(notifikasi): restore data and unread count response` dan `build(deploy): switch to dockerfile for railway`. Format sudah dipakai pada sebagian besar commit|
| Track tasks | [Issues #5–#30](https://github.com/laksamada/IF2150-RPL-K02-G03/issues?q=is%3Aissue+label%3Aenhancement) | Terdapat 26 issue fitur. Issue dibagi menurut pemilik P1–P5; contoh yang ditutup: [#10 validasi laporan](https://github.com/laksamada/IF2150-RPL-K02-G03/issues/10), [#15 API laporan publik](https://github.com/laksamada/IF2150-RPL-K02-G03/issues/15), [#19 layar detail warga](https://github.com/laksamada/IF2150-RPL-K02-G03/issues/19). Daftar [issue yang masih terbuka](https://github.com/laksamada/IF2150-RPL-K02-G03/issues?q=is%3Aissue+is%3Aopen+label%3Aenhancement) mencakup fitur verifikasi admin (#20–#24) dan prioritas/fasilitas (#25–#30). |
| Pull request dan review | PR [#2](https://github.com/laksamada/IF2150-RPL-K02-G03/pull/2), [#3](https://github.com/laksamada/IF2150-RPL-K02-G03/pull/3), [#4](https://github.com/laksamada/IF2150-RPL-K02-G03/pull/4) | Ketiga PR tercatat merged ke `main`. GitHub tidak menampilkan review formal pada PR #3 dan #4; bukti reviewer untuk PR tersebut belum tercatat, sehingga pemenuhan review oleh anggota lain tidak dapat diverifikasi dari repo. |
| Pengujian | [14 test server](../../src/server/tests/) · [workflow CI](../../.github/workflows/ci.yml) · [run CI terbaru](https://github.com/laksamada/IF2150-RPL-K02-G03/actions/runs/43419379555) | Test mencakup autentikasi, laporan dan revisi, anonimitas/public, notifikasi, verifikasi/skor, prioritas, fasilitas, duplikat, status, dan adapter. Run CI terbaru berstatus sukses; CI menjalankan test dengan PostgreSQL 18 serta bundle Android dan iOS. Untuk menjalankan lokal: `npm run db:up`, lalu `npm test` dari `src/`. |

### B.2.1 Profiling dan Optimasi

Pilih minimal satu fitur yang diprofil.

| Informasi | Keterangan |
| :--- | :--- |
| Fitur / proses yang diprofil | Q-004: daftar prioritas PEMDA (`GET /api/prioritas`) dengan 10.016 laporan (seed + 10.000 data fiktif deterministik). |
| Alat | PostgreSQL `EXPLAIN (ANALYZE)` sebanyak 30 pengukuran dan waktu endpoint dengan `curl -w "%{time_total}"` sebanyak 20 pengukuran; hasil median dicatat di [`src/server/scripts/PROFILING.md`](../../src/server/scripts/PROFILING.md). |
| Temuan (sebelum) | Filter kategori + wilayah membutuhkan 0,834 ms pada query dan 2,6 ms pada endpoint median; query melakukan sequential scan pada tabel laporan dan lokasi. |
| Perbaikan | Menambahkan indeks `laporan(status_laporan, kategori_kerusakan)`, `lokasi(wilayah)`, serta `skor_prioritas(dihitung_pada)` melalui migrasi `501_indeks_prioritas.sql`. Indeks skor menargetkan pencarian skor kedaluwarsa KF17. |
| Hasil (sesudah) | Filter kategori + wilayah turun menjadi 0,187 ms (query, sekitar 4,5× lebih cepat) dan 1,6 ms (endpoint). Endpoint tanpa filter relatif tetap, 15,2 menjadi 15,4 ms median, karena serialisasi ribuan laporan mendominasi. Seluruh angka dan kasus lain dijelaskan di laporan profiling. |

## B.3 Kendala dan Catatan Penting

- **Urutan menjalankan:** dari `src/`, jalankan `npm install`, `npm run db:up`, `npm run db:migrate`, dan `npm run db:seed`; setelah itu jalankan `npm run dev:server` dan `npm run dev:mobile` di terminal terpisah. Petunjuk rinci tersedia di [`src/README.md`](../../src/README.md).
- **Test mengosongkan database test:** `npm test` memigrasikan ulang skema `silembur_test` dan mengisi seed. Jangan arahkan `TEST_DATABASE_URL` ke basis data pengembangan/demo karena setup test menjalankan reset skema.
- **Akun uji:** kata sandi seluruh akun seed adalah `silembur123`. Akun peran Pelapor, Admin, dan PEMDA dicantumkan di bagian Akun uji pada README.
- **Integrasi opsional:** Google Geocoding, Google Cloud Storage, dan Google Sign-In membutuhkan konfigurasi masing-masing. Tanpa konfigurasi, geocoding dan penyimpanan foto menggunakan fallback lokal; tombol Google Sign-In tidak aktif. Google Sign-In pada Android membutuhkan development build, bukan Expo Go. Peta pada APK Android memerlukan kunci Maps Android; petunjuk platform dan konfigurasi ada di README.
- **Foto saat deployment:** penyimpanan lokal menjadi fallback; untuk mempertahankan foto pada deployment Railway, konfigurasi volume persisten atau gunakan Google Cloud Storage. Tanpa penyimpanan persisten, file lokal tidak boleh dianggap tahan terhadap penggantian instance.
- **Batas skala yang diketahui:** profiling menemukan hitung ulang semua 3.529 skor kedaluwarsa dalam satu permintaan prioritas membutuhkan 1,09 detik dan bertumbuh linear terhadap jumlah laporan. Waktu ini masih di bawah target KNF03 (<4 detik), tetapi implementasi berbasis banyak transaksi per laporan perlu dievaluasi ulang bila data bertambah jauh.
- **Batas pengukuran profiling:** angka Q-004 diukur pada PostgreSQL 18.0 dan Node.js 26 pada mesin macOS/Apple Silicon, sedangkan runtime proyek yang ditargetkan Node.js 24. Hasil tersebut merupakan pengukuran pada lingkungan profil, bukan jaminan waktu identik di semua perangkat.
- **Status verifikasi pull request:** PR #2–#4 tercatat merged; GitHub tidak menunjukkan review formal pada PR #3 dan #4. Jika review dilakukan melalui kanal lain, bukti dan nama reviewer perlu ditambahkan agar dapat diverifikasi.

## B.4 Kontribusi Anggota

Tabel B.4. Kontribusi Anggota

| NIM | Nama | Modul / Fitur yang Dikerjakan | Persentase Kontribusi |
| :--- | :--- | :--- | :--- |
| 13525128 | Mochamad Fachri Alfaridzi | P1: Fondasi proyek, autentikasi (email + kata sandi dan Google Sign-In), integrasi eksternal (adapter Google Maps, Cloud Storage), penggabungan laporan duplikat (UC07), CI. | 20% |
| 13525059 | Muhammad Pandu Pulunggana | P2: Pembuatan dan revisi laporan (UC01). Validasi isian, penyimpanan laporan, pencocokan fasilitas radius 30 m, lokasi laporan, endpoint `POST /api/laporan` dan `PUT /api/laporan/:id/revisi`, layar I-04, serta pengujiannya. | 20% |
| 13525098 | Satya Radhityan Yahya | P3: Tampilan warga, yaitu laporan publik, laporan saya, notifikasi, dan UI kit (UC04, UC05). | 20% |
| 13525101 | Kevin Lincoln Hutabarat | P4: Verifikasi admin, skor prioritas, dan pengiriman notifikasi (UC02). | 20% |
| 13525035 | Muhammad Dhiya Rafi | P5: Dashboard pemerintah daerah, yaitu prioritas laporan, fasilitas rusak berulang, riwayat fasilitas (UC03, UC06, UC08), serta profiling Q-004. | 20% |

## B.5 Traceability Kelas Perancangan ke Implementasi

Seluruh model server dikumpulkan di `src/server/src/models/index.js` dengan nama sesuai kelas DPPL (`Pengguna`, `Laporan`, `Lokasi`, `Fasilitas`, `Verifikasi`, `SkorPrioritas`, `RiwayatStatus`, `Notifikasi`, `KonfirmasiDuplikat`). Setiap objek tersebut menggabungkan fungsi dari beberapa file.

Tabel B.5. Traceability Kelas Perancangan ke Implementasi

| ID Kelas | Nama Kelas Perancangan | Bentuk Implementasi | Lokasi (File dan Nama) | Keterangan |
| :--- | :--- | :--- | :--- | :--- |
| C01 | Pelapor | Tabel, fungsi model, komponen | Tabel `pengguna` (peran `PELAPOR`). `src/server/src/models/laporan/buat.js` - `konfirmasiSimpanLaporan()`. `src/server/src/models/laporan/saya.js` - `getDaftarLaporanSaya()`, `getDetailLaporanSaya()`. `src/server/src/models/notifikasi/inbox.js` - `getNotifikasiPelapor()`. `src/mobile/src/features/warga/` - `DetailLaporanScreen`, `LaporanSayaScreen`, `NotifikasiScreen` | Pelapor, Admin, dan PemerintahDaerah disimpan di satu tabel `pengguna` yang dibedakan oleh kolom `peran`. Atribut `jumlahLaporan` menjadi kolom `jumlah_laporan`. `konfirmasiSimpanLaporan()` = Algo-001. `bukaLaporan()` dan `bukaRiwayatLaporan()` diwujudkan oleh detail laporan saya beserta riwayat statusnya. `terimaNotifikasi()` diwujudkan oleh kotak masuk notifikasi. |
| C02 | Admin | Tabel, fungsi model, route, komponen | Tabel `pengguna` (peran `ADMIN`). `src/server/src/models/laporan/verifikasi.js` - `getLaporanAdmin()`. `src/server/src/models/verifikasi/verifikasi.js` - `tetapkanKeputusan()`. `src/server/src/models/fasilitas/berulang.js` - `getFasilitasBerulang()`. `src/server/src/controllers/VerifikasiController.js`. `src/mobile/src/features/verifikasi/DashboardAdminScreen.js`, `src/mobile/src/features/duplikat/DuplikatScreen.js` | `lihatDaftarLaporan()` = `GET /api/admin/laporan`. `tetapkanKeputusan()` = `POST /api/admin/laporan/:id/keputusan`. `konfirmasiGabungLaporan()` diwujudkan oleh dialog konfirmasi di `DuplikatScreen`. `lihatFasilitasRusakBerulang()` = `GET /api/fasilitas/berulang`. |
| C03 | PemerintahDaerah | Tabel, fungsi model, route, komponen | Tabel `pengguna` (peran `PEMDA`, kolom `nama_instansi`, `wilayah_kerja`). `src/server/src/models/laporan/prioritas.js` - `getLaporanTerverifikasi()`, `getLaporanPrioritas()`. `src/server/src/controllers/PrioritasController.js` - `GET /api/prioritas`. `src/mobile/src/features/prioritas/PrioritasScreen.js` | `lihatLaporanTerverifikasi()` = `GET /api/prioritas`. `pilihFilter(kategori, wilayah)` diwujudkan oleh parameter query dan pilihan filter di layar. `lihatFasilitasRusakBerulang()` memakai endpoint yang sama dengan Admin. |
| C04 | Laporan | Tabel, fungsi model, route, komponen | Tabel `laporan`. `src/server/src/models/laporan/` - `buat.js` (`validasiIsianFormulir()`, `simpanLaporan()`, `revisiLaporan()`), `status.js` (`ubahStatus()`), `verifikasi.js` (`getLaporanAdmin()`, `getDetailLaporanAdmin()`), `publik.js`, `saya.js`, `prioritas.js` (`getLaporanTerverifikasi()`). `src/server/src/controllers/laporan/`. `src/mobile/src/features/pelaporan/BuatLaporanScreen.js` | `buatLaporanBaru()`, `tampilkanFormulir()`, dan `bukaKunciSimpan()` diwujudkan oleh `BuatLaporanScreen` (*state* `lengkap` mengatur tombol Kirim). `validasiIsianFormulir()` = Algo-004. `simpanLaporan()` = Q-001. `getLaporanMenungguVerifikasi()` = `getLaporanAdmin()`. `getDetailLaporan()` = detail admin, publik, dan saya. `updateStatus()` = `ubahStatus()` (Q-002). `urutkanBerdasarkanPrioritas()` dan `filterLaporan()` ada di SQL Q-004 (lihat B.1 no. 13). `pilihDuplikat()` = `getKandidatDuplikat()`. `getRiwayatStatus()` memakai model RiwayatStatus. |
| C05 | Lokasi | Tabel, fungsi model | Tabel `lokasi`. `src/server/src/models/lokasi/lokasi.js` - `setLokasiLaporan()`, `getWilayah()` | `setLokasiLaporan(koordinat)` = Algo-006 dan Q-005. Wilayah diambil dari `googleMapsAdapter.getWilayahFromCoordinates()`. Di mobile, lokasi dipilih melalui GPS (`expo-location`) atau pin peta (`PetaPilih`). |
| C06 | Fasilitas | Tabel, fungsi model, route, komponen | Tabel `fasilitas`. `src/server/src/models/fasilitas/` - `cocokkan.js` (`cariAtauBuatFasilitas()`), `berulang.js` (`getJumlahLaporan()`, `getFasilitasBerulang()`), `riwayat.js` (`cariFasilitas()`, `getDetailFasilitas()`). `src/server/src/models/laporan/prioritas.js` - `getLaporanPerFasilitas()`. `src/server/src/controllers/FasilitasController.js`. `src/mobile/src/features/fasilitas/` - `DaftarFasilitasScreen`, `DetailFasilitasScreen` | `getLaporan()` = `getLaporanPerFasilitas()`. `cariFasilitas(keyword)` = `GET /api/fasilitas`. `getDetailFasilitas()` = `GET /api/fasilitas/:id`. `getJumlahLaporan()` memperbarui `jumlah_kerusakan_berulang` dan `kandidat_evaluasi`. `cariAtauBuatFasilitas()` adalah operasi tambahan (B.1 no. 2). |
| C07 | Verifikasi | Tabel, fungsi model | Tabel `verifikasi`. `src/server/src/models/verifikasi/verifikasi.js` - `simpanVerifikasi()`, `teruskanKePemerintah()`, `tetapkanKeputusan()` | `simpanVerifikasi()` = Algo-002 dan Q-003. `teruskanKePemerintah()` mengubah status menjadi Terverifikasi. `tahanLaporan()` tidak memerlukan query, karena laporan yang tidak disetujui otomatis tertahan oleh statusnya. |
| C08 | SkorPrioritas | Tabel, fungsi model | Tabel `skor_prioritas`. `src/server/src/models/skorPrioritas/skor.js` - `hitungSkor()`, `getSkor()`, `hitungNilaiSkor()`, `getKomponenSkor()` | `hitungSkor()` = Algo-009, dihitung dari jumlah pelapor, lama menunggu, dan frekuensi berulang. Skor dihitung ulang jika berumur lebih dari 1 jam (KF17). |
| C09 | RiwayatStatus | Tabel, fungsi model | Tabel `riwayat_status`. `src/server/src/models/riwayatStatus/riwayat.js` - `getRiwayatStatus()`, `getPerubahan()`. `src/server/src/models/laporan/status.js` - `catatRiwayat()` | Setiap perubahan status lewat `ubahStatus()` otomatis tercatat sebagai riwayat. Ditampilkan di detail laporan saya dan detail fasilitas. |
| C10 | Notifikasi | Tabel, fungsi model, route, komponen | Tabel `notifikasi`. `src/server/src/models/notifikasi/kirim.js` - `kirimNotifikasi()`. `src/server/src/models/notifikasi/inbox.js` - `getNotifikasiPelapor()`, `tandaiDibaca()`. `src/server/src/controllers/NotifikasiController.js`. `src/mobile/src/features/warga/NotifikasiScreen.js` | `kirimNotifikasi()` dipanggil saat keputusan verifikasi dan perubahan status. Kotak masuk pelapor = `GET /api/notifikasi` dan `PATCH /api/notifikasi/:id/dibaca`. |
| C11 | KonfirmasiDuplikat | Fungsi model, route, komponen | `src/server/src/models/konfirmasiDuplikat/duplikat.js` - `getKandidatDuplikat()`, `gabungLaporan()`. `src/server/src/controllers/DuplikatController.js`. `src/mobile/src/features/duplikat/DuplikatScreen.js` | `simpanKandidat()` dan `warning()` diwujudkan di mobile (*state* pilihan dan dialog konfirmasi). `gabungLaporan()` = Algo-012 (`POST /api/admin/duplikat/gabung`). Atribut `daftarKandidat` dan `namaFasilitasInduk` diwujudkan sebagai *state* layar dan kolom `id_laporan_induk` pada tabel `laporan`. |


Catatan:
- Satu kelas perancangan boleh diwujudkan oleh beberapa file/unit, dan satu file/unit boleh mewujudkan beberapa kelas perancangan. Tuliskan semuanya.
- Kelas perancangan yang **tidak diimplementasikan** atau **digabung/dipecah** tetap dicantumkan, dan alasannya dicatat di Bagian B.1.
