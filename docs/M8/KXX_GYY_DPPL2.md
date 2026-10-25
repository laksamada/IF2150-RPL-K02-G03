<h1>
IF2150 REKAYASA PERANGKAT LUNAK
<br>
TUGAS 5
<br>
DESKRIPSI PERANCANGAN PERANGKAT LUNAK (DPPL)
</h1>
<br>

## _SILEMBUR_

### _[Logo Perangkat Lunak]_

### Untuk: _Amanda Aurellia Salsabila_

Dipersiapkan oleh:
| Informasi | Keterangan |
| --- | --- |
| Kelas | _K02_ |
| Kelompok | _G03_ |

| NIM        | Nama                        |
| ---------- | --------------------------- |
| _13525059_ | _Muhammad Pandu Pulunggana_ |
| _13525128_ | _Mochamad Fachri Alfaridzi_ |
| _13525101_ | _Kevin Lincoln Hutabarat_   |
| _13525035_ | _Muhammad Dhiya Rafi_       |
| _13525098_ | _Satya Radhityan Yahya_     |

---

---

## Daftar Perubahan

| Revisi | Deskripsi                                                                                                                               |
| :----- | :-------------------------------------------------------------------------------------------------------------------------------------- |
| _A_    | _Deskripsikan perubahan yang dilakukan dari dokumen sebelumnya pada dokumen ini. Jika tidak terdapat perubahan, harap kosongkan tabel._ |
| _B_    |                                                                                                                                         |
| _C_    |                                                                                                                                         |
| ...    |                                                                                                                                         |

---

<br>

> **Petunjuk pengerjaan:** _[Silahkan hapus bagian ini setelah selesai mengerjakan]_
>
> Dokumen ini melanjutkan **Deskripsi Perancangan Perangkat Lunak**. Gunakan nama, ID, kebutuhan, dan use case yang konsisten dengan kedua dokumen tersebut. Contoh pola ID baru di bawah dapat disesuaikan dengan kesepakatan kelompok, ID yang sudah ada tetap dipertahankan.

<br>

---

# BAB 1: Pendahuluan

## 1.1 Tujuan Penulisan Dokumen

Dokumen DPPL ini menjelaskan rancangan perangkat lunak SILEMBUR yang disusun dari kebutuhan pada SKPL dan arsitektur pada APL. Isinya mencakup rancangan arsitektur dan realisasi setiap use case dalam bentuk sequence diagram dan diagram kelas perancangan. Dokumen ini digunakan oleh Kelompok G03 sebagai acuan saat mengimplementasikan dan menguji P/L. Asisten mata kuliah IF2150 menggunakannya untuk memeriksa kesesuaian rancangan dengan kebutuhan yang sudah ditetapkan.

## 1.2 Lingkup Masalah

SILEMBUR (Sistem Informasi Lembur) adalah aplikasi web mobile untuk melaporkan kerusakan fasilitas umum seperti jalan berlubang, lampu penerangan jalan yang mati, dan pohon tumbang. Nama "lembur" diambil dari bahasa Sunda yang berarti kampung. Masyarakat membuat laporan berisi foto, lokasi GPS, dan deskripsi kerusakan. Admin kemudian memverifikasi laporan tersebut sebelum diteruskan ke pemerintah daerah. Kanal pengaduan yang ada saat ini, seperti SP4N-LAPOR dan JAKI, memperlakukan setiap laporan sebagai pengaduan terpisah. Akibatnya laporan duplikat menumpuk, prioritas penanganan tidak langsung terlihat, dan riwayat kerusakan suatu fasilitas sulit ditelusuri. SILEMBUR menangani masalah tersebut dengan menggabungkan laporan duplikat, menghitung skor prioritas setiap laporan terverifikasi, dan mencatat riwayat status per fasilitas. Cakupan sistem dibatasi pada satu kota dengan tiga jenis pengguna, yaitu masyarakat umum, admin, dan pemerintah daerah.

## 1.3 Definisi, Istilah, dan Singkatan

Semua definisi dan singkatan yang digunakan dalam dokumen ini beserta penjelasannya.

Tabel 1.3. Definisi Istilah dan Singkatan

| Singkatan, Akronim, atau Istilah | Penjelasan                                                                                                                                                                              |
| :------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _P/L_                            | _Singkatan dari Perangkat Lunak, yaitu aplikasi yang memberikan perintah kepada komputer untuk menjalankan tugas tertentu._                                                             |
| _DPPL_                           | _Singkatan dari Deskripsi Perancangan Perangkat Lunak, yaitu dokumen yang berisi rancangan P/L sebagai acuan implementasi._                                                             |
| _SKPL_                           | _Singkatan dari Spesifikasi Kebutuhan Perangkat Lunak, yaitu dokumen yang merangkum kriteria-kriteria yang diperlukan untuk membangun aplikasi menjalankan tugasnya._                   |
| _APL_                            | _Singkatan dari Arsitektur Perangkat Lunak, yaitu dokumen yang berisi pola arsitektur dan komponen penyusun P/L._                                                                       |
| _MVC_                            | _Singkatan dari Model View Controller, yaitu pola arsitektur yang memisahkan data dan logika bisnis dari tampilan serta pengolah input._                                                |
| _KF_                             | _Singkatan dari Kebutuhan Fungsional._                                                                                                                                                  |
| _KNF_                            | _Singkatan dari Kebutuhan Non-Fungsional._                                                                                                                                              |
| _UC_                             | _Singkatan dari Use Case._                                                                                                                                                              |
| _SILEMBUR_                       | _Singkatan dari Sistem Informasi Lembur, yaitu nama aplikasi pelaporan kerusakan fasilitas umum yang dibangun pada dokumen ini._                                                        |
| _GPS_                            | _Singkatan dari Global Positioning System, yaitu layanan penentuan lokasi yang dipakai untuk mengambil koordinat laporan secara otomatis._                                              |
| _SP4N-LAPOR_                     | _Singkatan dari Sistem Pengelolaan Pengaduan Pelayanan Publik Nasional Layanan Aspirasi dan Pengaduan Online Rakyat, yaitu kanal pengaduan nasional yang disebut pada lingkup masalah._ |
| _JAKI_                           | _Singkatan dari Jakarta Kini, yaitu aplikasi layanan warga milik Pemerintah Provinsi DKI Jakarta yang disebut pada lingkup masalah._                                                    |
| _US_                             | _Singkatan dari User Story, yaitu kebutuhan pengguna awal._                                                                                                                             |
| _R_                              | _Singkatan dari Requirement (Kebutuhan), yaitu kebutuhan user, sistem, dan bisnis._                                                                                                     |
| _C_                              | _Singkatan dari Class (Kelas), yaitu objek yang terikat dengan Use Case._                                                                                                               |
| _API_                            | _Singkatan dari Application Programming Interface, yaitu antarmuka yang memungkinkan dua sistem saling bertukar data._                                                                  |
| _DBMS_                           | _Singkatan dari Database Management System, yaitu perangkat lunak yang mengelola basis data._                                                                                           |
| _OS_                             | _Singkatan dari Operating System (Sistem Operasi)._                                                                                                                                     |
| _ID_                             | _Singkatan dari Identifier, yaitu penanda unik untuk setiap kebutuhan, use case, atau kelas._                                                                                           |

## 1.4 Aturan Penomoran

Tuliskan aturan penomoran (ID) yang digunakan dalam dokumen ini. Gunakan pola ID yang **sama** dengan yang sudah dipakai pada dokumen-dokumen sebelumnya, jangan membuat pola baru di dokumen ini.

Tabel 1.4. Aturan Penomoran

| Hal/Bagian                 | Penomoran | Keterangan                                          |
| :------------------------- | :-------- | :-------------------------------------------------- |
| _User Story_               | _US-XX_   | _Kebutuhan pengguna awal_                           |
| _Aktivitas_                | _AXX_     | _Aktivitas aktor_                                   |
| _Kebutuhan_                | _RXX_     | _Kebutuhan user, sistem dan bisnis_                 |
| _Kebutuhan Fungsional_     | _KFXX_    | _Proses yang harus disediakan oleh sistem_          |
| _Kebutuhan Non-Fungsional_ | _KNFXX_   | _Kualitas dan performa yang harus dicapai_          |
| _Use Case_                 | _UCXX_    | _Kasus-kasus penggunaan perangkat lunak oleh aktor_ |
| _Kelas_                    | _CXX_     | _Objek yang terikat dengan Use Case_                |

## 1.5 Referensi

- Kelompok K02 G03. _Spesifikasi Kebutuhan Perangkat Lunak (SKPL) SILEMBUR_
- Kelompok K02 G03. _Arsitektur Perangkat Lunak (APL) SILEMBUR_
- Powerpoint Modul dari Edunex kelas Software Engineering [Parent Class]
- Sommerville, I. (2016). _Software Engineering_ (10th ed.). Pearson

## 1.6 Deskripsi Umum Dokumen (Ikhtisar)

Dokumen DPPL SILEMBUR ini terdiri dari lima bab. BAB 1 berisi pendahuluan dokumen. BAB 2 membahas perancangan arsitektur yang meliputi lingkungan implementasi serta pola arsitektur dan komponen penyusunnya. BAB 3 membahas realisasi setiap use case melalui identifikasi kelas dan sequence diagram serta diagram kelas. BAB 4 menyajikan diagram kelas perancangan keseluruhan. BAB 5 menyajikan matriks kerunutan antara kelas perancangan dan use case.

<br>

---

# BAB 2: Perancangan Arsitektur

## 2.1 Rancangan Lingkungan Implementasi

Sebutkan _operating system_, DBMS, _development tools_, _filing system_, dan bahasa pemrograman yang digunakan.

| Komponen   | Spesifikasi                                  |
| :--------- | :------------------------------------------- |
| _Server_   | _Node.js v24, dijalankan pada layanan cloud_ |
| _Client_   | _Mobile App_                                 |
| _DBMS_     | _PostgreSQL 18_                              |
| _OS_       | _Android dan iOS_                            |
| _Runtime_  | _Node.js v24_                                |
| _Cloud_    | _Google Cloud_                               |
| _Language_ | _JavaScript_                                 |

## 2.2 Style/Pattern Arsitektur Acuan

Tentukan _architectural style_ atau _pattern_ yang menjadi acuan aplikasi, misalnya _layered architecture_, _client-server_, _repository_, _pipe and filter_, atau MVC (_Model-View-Controller_).

Gunakan hasil **BAB 1 Style/Pattern Arsitektur Acuan pada dokumen APL**, termasuk alasan pemilihan dan gambar penerapannya pada P/L kelompok. Gunakan komponen aplikasi sendiri pada gambar, bukan hanya contoh pola umum.

Gaya arsitektur utama yang dipilih adalah MVC yang dibangun di atas pola klien-server. Bagian dan peran dari MVC, yaitu:

- Model: Menyimpan data dan logika bisnis. Model bertanggung jawab dalam manajemen data, termasuk pengambilan, penyimpanan, dan pemrosesan data.
- View: Menampilkan data yang diberikan Model kepada pengguna.
- Controller: Menjadi penghubung antara Model dan View. Controller akan menerima input pengguna, memprosesnya, dan menentukan bagaimana data dari Model akan ditampilkan oleh View.

Gaya arsitektur utama MVC dipilih karena data berupa laporan pengguna dan fasilitas dapat ditampilkan dalam beberapa bentuk tergantung pengguna yang memintanya beserta usecase yang dijalankan. Misalnya:

- Ketika masyarakat umum mengakses laporan yang dibuat pengguna lain, view hanya menampilkan foto, lokasi, deskripsi, dan status tanpa identitas pelapor (berkaitan dengan KF10)
- Ketika masyarakat umum mengakses laporan yang dibuat dirinya sendiri, view menampilkan detail lengkap laporan berupa foto, lokasi, deskripsi, status, dan riwayat perubahan laporan (berkaitan dengan KF10, KF13, KF24)
- Ketika admin mengakses laporan masyarakat umum yang belum diverifikasi, view hanya menampilkan foto, lokasi, deskripsi laporan yang baru dibuat (berkaitan dengan KF06 dan KF07)
- Ketika pemerintah daerah mengakses menu laporan aktif, view menampilkan daftar laporan pengguna yang terurut berdasarkan skor prioritas (berkaitan dengan KF18)
- Ketika admin ingin mengonfirmasi laporan duplikat dengan melihat daftar laporan aktif, view menampilkan preview dari laporan aktif yang duplikat (berkaitan dengan KF20, KF21)
- Ketika admin atau pemerintah daerah mengakses dashboard, view menampilkan preview dari fasilitas yang mengalami kerusakan berulang (berkaitan dengan KF14)
- Ketika admin atau pemerintah daerah mengakses laporan yang dibuat pengguna, view menampilkan detail lengkap laporan berupa foto, lokasi, deskripsi, status, dan riwayat perubahan laporan (berkaitan dengan KF10, KF22, KF23)
  Selain itu, model MVC juga membuat testing tampilan aplikasi lebih mudah dilakukan untuk setiap tipe pengguna dan use case yang dilaksanakan.

<p align="center">
<img alt="Contoh Arsitektur MVC" src="./assets/diagram/Arsitektur-mvc.png" width="40%">
</p>
<p align="center">
<i>Gambar 1. Contoh Arsitektur MVC</i>
</p>

Tabel 1.1. Lingkungan Operasi Perangkat Lunak

| Komponen  | Spesifikasi                                  |
| :-------- | :------------------------------------------- |
| _Server_  | _Node.js v24, dijalankan pada layanan cloud_ |
| _Client_  | _Mobile App_                                 |
| _DBMS_    | _PostgreSQL 18_                              |
| _OS_      | _Android dan iOS_                            |
| _Runtime_ | _Node.js v24_                                |
| _Cloud_   | _Google Cloud_                               |

Model MVC dipilih karena bisa diterapkan untuk aplikasi mobile. MVC bisa diimplementasikan dengan JavaScript dengan membagi model, view, controller menjadi 3 modul atau folder yang berbeda, yang kemudian bisa digunakan untuk membangun aplikasi yang kemudian dihubungkan ke server dengan Node.js.

## 2.3 Identifikasi Komponen / Modul / Subsistem

Identifikasi komponen, modul, atau subsistem penyusun aplikasi berdasarkan _pattern_ yang telah ditetapkan. Jelaskan tanggung jawab masing-masing komponen. Pengelompokan dapat mengikuti lapisan arsitektur atau fungsi/peran komponen dalam sistem.

Ambil dari **Tabel 2.1 dokumen APL**, lalu kelompokkan berdasarkan lapisan (Model/View/Controller). Kolom **Jenis** diisi sesuai pattern, misalnya View, Controller, Model, Service, Repository. Satu komponen merepresentasikan saatu tanggung jawab utama yang jelas,

Tabel 2.3. Identifikasi Komponen/Modul/Subsistem

| Nama Komponen/Modul/Subsistem | Jenis                 | Penjelasan                                                                                                             |
| :---------------------------- | :-------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| _FormLaporanView_             | _View_                | _Menampilkan formulir laporan berisi foto, lokasi, dan deskripsi kerusakan, lalu mengirimkannya ke LaporanController._ |
| _VerifikasiView_              | _View_                | _Menampilkan laporan yang menunggu verifikasi beserta pilihan setujui, tolak, atau minta revisi untuk admin._          |
| _PrioritasView_               | _View_                | _Menampilkan laporan terverifikasi yang terurut berdasarkan skor prioritas kepada pemerintah daerah._                  |
| _LaporanPublikView_           | _View_                | _Menampilkan laporan pengguna lain tanpa identitas pelapor._                                                           |
| _LaporanSayaView_             | _View_                | _Menampilkan laporan milik pelapor beserta status, riwayat penanganan, dan notifikasi verifikasi._                     |
| _FasilitasBerulangView_       | _View_                | _Menampilkan fasilitas yang menjadi kandidat evaluasi perbaikan permanen._                                             |
| _DuplikatView_                | _View_                | _Menampilkan kandidat laporan duplikat dan konfirmasi penggabungan untuk admin._                                       |
| _RiwayatFasilitasView_        | _View_                | _Menampilkan pencarian fasilitas dan riwayat perubahan status laporannya._                                             |
| _LaporanController_           | _Controller_          | _Memproses pembuatan laporan, daftar laporan publik, serta status dan riwayat laporan milik pelapor._                  |
| _VerifikasiController_        | _Controller_          | _Memproses keputusan verifikasi admin, mengirim notifikasi, dan memicu perhitungan skor prioritas._                    |
| _PrioritasController_         | _Controller_          | _Memproses daftar laporan terverifikasi berdasarkan skor prioritas dan filternya._                                     |
| _FasilitasController_         | _Controller_          | _Memproses daftar fasilitas dengan kerusakan berulang, pencarian fasilitas, dan riwayat statusnya._                    |
| _DuplikatController_          | _Controller_          | _Memproses pencarian kandidat duplikat dan penggabungan laporan setelah dikonfirmasi admin._                           |
| _Pengguna_                    | _Model_               | _Merepresentasikan akun dan peran pengguna, yaitu Pelapor, Admin, dan PemerintahDaerah._                               |
| _Laporan_                     | _Model_               | _Merepresentasikan data laporan berupa foto, lokasi, deskripsi, kategori, dan status._                                 |
| _Lokasi_                      | _Model_               | _Merepresentasikan koordinat dan wilayah laporan._                                                                     |
| _Fasilitas_                   | _Model_               | _Merepresentasikan fasilitas umum dan menandainya jika laporan melewati ambang batas._                                 |
| _Verifikasi_                  | _Model_               | _Merepresentasikan keputusan verifikasi beserta catatan alasannya._                                                    |
| _SkorPrioritas_               | _Model_               | _Menghitung skor prioritas laporan._                                                                                   |
| _RiwayatStatus_               | _Model_               | _Mencatat setiap perubahan status laporan._                                                                            |
| _Notifikasi_                  | _Model_               | _Merepresentasikan pesan hasil verifikasi untuk pelapor._                                                              |
| _KonfirmasiDuplikat_          | _Model_               | _Menyimpan kandidat duplikat dan menggabungkannya menjadi satu laporan induk._                                         |
| _Autentikasi_                 | _Pendukung_           | _Memeriksa token Google Sign-In dan membatasi akses sesuai peran pengguna._                                            |
| _Validasi_                    | _Pendukung_           | _Memeriksa kelengkapan dan format input sebelum diproses controller._                                                  |
| _GoogleMapsAdapter_           | _Integrasi Eksternal_ | _Menghubungkan aplikasi dengan Google Maps Platform untuk menampilkan dan memilih lokasi._                             |
| _CloudStorageAdapter_         | _Integrasi Eksternal_ | _Menghubungkan aplikasi dengan Google Cloud Storage untuk menyimpan foto laporan._                                     |
| _Database_                    | _Penyimpanan Data_    | _Basis data PostgreSQL 18 yang menyimpan seluruh data Model._                                                          |

## 2.4 Model Arsitektur Perangkat Lunak

Buat model arsitektur dalam bentuk satu atau lebih _view_ yang memperlihatkan interaksi dan kolaborasi komponen, modul, serta subsistem dalam menjalankan fungsi sistem. Pilih notasi yang sesuai. Contoh _view_: _Logical View_, _Process View_, _Development View_, dan _Physical View_.

Gunakan hasil **BAB 3 Model Arsitektur Perangkat Lunak pada dokumen APL**.

## 2.4.1 Logical View

_Logical View_ dipilih karena paling langsung memperlihatkan penerapan MVC pada SILEMBUR. Diagram ini menunjukkan _controller_ mana yang menangani setiap layar, _model_ mana yang diakses setiap _controller_, dan bagaimana _model_ saling berhubungan. Informasi tersebut menjadi panduan pembagian modul saat implementasi.

<p align="center">
<img alt="Logical View SILEMBUR" src="./assets/diagram/logical-view.png" width="100%">
</p>
<p align="center">
<i>Gambar 2. Logical View SILEMBUR</i>
</p>

Seluruh komponen pada Tabel 2.1 digambarkan dan dikelompokkan menjadi _View_, _Controller_, _Model_, _Pendukung_, _Integrasi Eksternal_, dan _Penyimpanan Data_. Setiap _View_ diberi keterangan use case dan aktor yang memakainya. Garis "Memanggil" menunjukkan _View_ yang meneruskan aksi pengguna ke _Controller_, sedangkan garis "akses" menunjukkan _Controller_ yang membaca atau mengubah _Model_. Hubungan antar-_Model_ mengikuti diagram kelas keseluruhan pada SKPL. Fasilitas mengagregasi Laporan, Laporan mengagregasi Lokasi dan RiwayatStatus, serta Laporan tersusun atas (komposisi) SkorPrioritas. Karena Lokasi, RiwayatStatus, dan SkorPrioritas merupakan bagian dari Laporan, _controller_ mengaksesnya melalui Laporan, tidak secara langsung. Seluruh _controller_ memakai Autentikasi dan Validasi sebelum memproses permintaan. Layanan Google di luar P/L, yaitu Google Maps Platform, Google Sign-In, dan Google Cloud Storage, digambarkan dengan garis putus-putus.

## 2.4.2 Physical View

Physical View dipilih karena SILEMBUR berjalan di dua lingkungan yang terpisah yaitu perangkat mobile milik pengguna dan server di Google Cloud. View ini melengkapi Logical View dengan menunjukkan di node mana setiap komponen pada Tabel 2.1 dijalankan dan bagaimana node-node tersebut saling berkomunikasi sesuai lingkungan operasi pada Tabel 1.1.

<p align="center">
<img alt="Physical View SILEMBUR" src="./assets/diagram/physicals.drawio.png" width="100%">
</p>
<p align="center">
<i>Gambar 3. Physical View SILEMBUR</i>
</p>

Semua komponen View dan GoogleMapsAdapter berjalan di aplikasi mobile pada Android dan iOS. View memanggil Controller di server melalui HTTPS. Controller, Model, Pendukung, dan CloudStorageAdapter berjalan di server Node.js v24 pada Google Cloud. Data Model tersimpan di PostgreSQL 18 dan foto laporan tersimpan di Google Cloud Storage. Login dan verifikasi token memakai Google Sign In. Peta diambil dari Google Maps Platform. Controller dan Model ditempatkan di server agar aturan bisnis tidak bisa dilewati dari aplikasi dan Android maupun iOS memakai logika yang sama.

<br>

---

# BAB 3: Realisasi Use Case

## 3.1 Use Case Membuat Laporan Kerusakan Fasilitas

**ID Use Case:** _UC01_  
**Nama Use Case:** _Membuat Laporan Kerusakan Fasilitas_

### 3.1.1 Identifikasi Kelas

Tabel 3.1. Identifikasi Kelas Use Case [UC01]

| No  | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
| :-- | :--------------------- | :-------------------------- |
| 1   | _Pelapor_              | _Pelapor_                   |
| 2   | _Laporan_              | _Laporan_                   |
| 3   | _Lokasi_               | _Lokasi_                    |

### 3.1.2 Sequence Diagram

- **Skenario Normal**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC01_sequence_diagram.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01]</i>
</p>

- **Skenario Alternatif 1: Pengguna tidak mengisi seluruh formulir**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC01_sequence_diagram_alt1.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01] - [Pengguna tidak mengisi seluruh formulir]</i>
</p>

### 3.1.3 Diagram Kelas

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC01_class_diagram.png" width="35%">
</p>
<p align="center">
<i>Gambar X. Diagram Kelas Membuat Laporan Kerusakan Fasilitas</i>
</p>

## 3.2 Use Case Memverifikasi Laporan dan Menghitung Prioritas

**ID Use Case:** _UC02_  
**Nama Use Case:** _Memverifikasi Laporan dan Menghitung Prioritas_

### 3.2.1 Identifikasi Kelas

Tabel 3.2. Identifikasi Kelas Use Case [UC02]

| No  | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
| :-- | :--------------------- | :-------------------------- |
| 1   | _Pelapor_              | _Pelapor_                   |
| 2   | _Admin_                | _Admin_                     |
| 3   | _Laporan_              | _Laporan_                   |
| 4   | _Verifikasi_           | _Verifikasi_                |
| 5   | _SkorPrioritas_        | _SkorPrioritas_             |
| 6   | _Notifikasi_           | _Notifikasi_                |

### 3.2.2 Sequence Diagram

- **Skenario Normal**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC02_sequence_diagram.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC02]</i>
</p>

- **Skenario Alternatif 1: Admin menolak laporan**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC02_sequence_diagram_alt1.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC02] - [Admin menolak laporan]</i>
</p>

### 3.2.3 Diagram Kelas

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC02_class_diagram.png" width="35%">
</p>
<p align="center">
<i>Gambar X. Diagram Kelas Memverifikasi Laporan dan Menghitung Prioritas</i>
</p>

## 3.3 Use Case Menyaring dan Memantau Laporan Terverifikasi Berdasarkan Prioritas

**ID Use Case:** _UC03_  
**Nama Use Case:** _Menyaring dan Memantau Laporan Terverifikasi Berdasarkan Prioritas_

### 3.3.1 Identifikasi Kelas

Tabel 3.3. Identifikasi Kelas Use Case [UC03]

| No  | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
| :-- | :--------------------- | :-------------------------- |
| 1   | _PemerintahDaerah_     | _PemerintahDaerah_          |
| 2   | _Laporan_              | _Laporan_                   |
| 3   | _Lokasi_               | _Lokasi_                    |
| 4   | _SkorPrioritas_        | _SkorPrioritas_             |

### 3.3.2 Sequence Diagram

- **Skenario Normal**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC-03-1.drawio (3).png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01]</i>
</p>

- **Skenario Alternatif 1 : Tidak ada laporan terverifikasi setelah diberikan filter**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC-03-1.drawio (1).png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01] - [Nama skenario alternatif]</i>
</p>

- **Skenario Alternatif 2 : Tidak ada laporan terverifikasi**
<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC-03-3.drawio.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01] - [Nama skenario alternatif]</i>
</p>

### 3.3.3 Diagram Kelas

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC03.drawio.png" width="35%">
</p>
<p align="center">
<i>Gambar X. Diagram Kelas [Nama Uce Case]</i>
</p>

## 3.4 Use Case Melihat Daftar dan Detail Laporan Publik

**ID Use Case:** _UC04_
**Nama Use Case:** _Melihat Daftar dan Detail Laporan Publik_

### 3.4.1 Identifikasi Kelas

Tabel 3.1. Identifikasi Kelas Use Case [UC04]

| No  | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
| :-- | :--------------------- | :-------------------------- |
| 1   | _Pelapor_              | _Pelapor_                   |
| 2   | _Laporan_              | _Laporan_                   |
| 2   | _Lokasi_               | _Lokasi_                    |

### 3.4.2 Sequence Diagram

- **Skenario Normal**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC-04-1.drawio.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC04]</i>
</p>

- **Skenario Alternatif 1: Laporan dipilih menggunakan filter**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC-04-2.drawio.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01] - [Nama skenario alternatif]</i>
</p>

- **Skenario Alternatif 2: Tidak ada laporan yang muncul setelah menerapkan filter**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC-04-3.drawio.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01] - [Nama skenario alternatif]</i>
</p>

- **Skenario Alternatif 3: Loading detail laporan terlalu lama**
<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC-04-4.drawio.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01] - [Nama skenario alternatif]</i>
</p>

### 3.4.3 Diagram Kelas

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC04.drawio (1).png" width="35%">
</p>
<p align="center">
<i>Gambar X. Diagram Kelas [Nama Uce Case]</i>
</p>

## 3.5 Use Case _Memantau Status dan Riwayat Penanganan Laporan_

**ID Use Case:** _UC05_
**Nama Use Case:** _Memantau Status dan Riwayat Penanganan Laporan_

### 3.5.1 Identifikasi Kelas

Tabel 3.1. Identifikasi Kelas Use Case [UC05]

| No  | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
| :-- | :--------------------- | :-------------------------- |
| 1   | _Pelapor_              | _Pelapor_                   |
| 2   | _Laporan_              | _Laporan_                   |
| 3   | _RiwayatStatus_        | _RiwayatStatus_             |

### 3.5.2 Sequence Diagram

- **Skenario Normal**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC-05-1.drawio (1).png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01]</i>
</p>

- **Skenario Alternatif 1: Belum ada laporan yang dibuat**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC-05-2.drawio (1).png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01] - [Nama skenario alternatif]</i>
</p>

- **Skenario Alternatif 2: Loading detail laporan terlalu lama**
<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC-05-3.drawio.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC01] - [Nama skenario alternatif]</i>
</p>

### 3.5.3 Diagram Kelas

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC05.drawio (1).png" width="35%">
</p>
<p align="center">
<i>Gambar X. Diagram Kelas [Nama Uce Case]</i>
</p>

## 3.6 Use Case Meninjau Fasilitas dengan Kerusakan Berulang

**ID Use Case:** _UC06_  
**Nama Use Case:** _Meninjau Fasilitas dengan Kerusakan Berulang_

### 3.6.1 Identifikasi Kelas

Tabel 3.6. Identifikasi Kelas Use Case [UC06]

| No  | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
| :-- | :--------------------- | :-------------------------- |
| 1   | _Laporan_              | _Laporan_                   |
| 2   | _Fasilitas_            | _Fasilitas_                 |
| 3   | _Admin_                | _Admin_                     |
| 4   | _Pemerintah Daerah_    | _Pemerintah Daerah_         |

### 3.6.2 Sequence Diagram

- **Skenario Normal**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC06_sequence_diagram.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC06]</i>
</p>

- **Skenario Alternatif 1: Tidak ada fasilitas yang muncul**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC06_sequence_diagram_alt1.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC06] - [Tidak ada fasilitas yang muncul]</i>
</p>

- **Skenario Alternatif 2: Loading dashboard terlalu lama**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC06_sequence_diagram_alt2.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC06] - [Loading dashboard terlalu lama]</i>
</p>

### 3.6.3 Diagram Kelas

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC06_class_diagram.png" width="35%">
</p>
<p align="center">
<i>Gambar X. Diagram Kelas Meninjau Fasilitas dengan Kerusakan Berulang
</i>
</p>

## 3.7 Use Case Mengonfirmasi dan Menggabungkan Laporan Duplikat

**ID Use Case:** _UC07_  
**Nama Use Case:** _Mengonfirmasi dan Menggabungkan Laporan Duplikat_

### 3.7.1 Identifikasi Kelas

Tabel 3.7. Identifikasi Kelas Use Case [UC07]

| No  | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
| :-- | :--------------------- | :-------------------------- |
| 1   | _Laporan_              | _Laporan_                   |
| 2   | _Fasilitas_            | _Fasilitas_                 |
| 3   | _Admin_                | _Admin_                     |
| 4   | _SkorPrioritas_        | _SkorPrioritas_             |
| 5   | _KonfirmasiDuplikat_   | _KonfirmasiDuplikat_        |

### 3.7.2 Sequence Diagram

- **Skenario Normal**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC07_sequence_diagram.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC07]</i>
</p>

- **Skenario Alternatif 1: Admin salah memilih laporan duplikat**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC07_sequence_diagram_alt1.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC07] - [Admin salah memilih laporan duplikat]</i>
</p>

### 3.7.3 Diagram Kelas

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC07_class_diagram.png" width="35%">
</p>
<p align="center">
<i>Gambar X. Diagram Kelas Mengonfirmasi dan Menggabungkan Laporan Duplikat</i>
</p>

## 3.8 Use Case Melacak Riwayat Perubahan Status per Fasilitas

**ID Use Case:** _UC08_  
**Nama Use Case:** _Melacak Riwayat Perubahan Status per Fasilitas_

### 3.8.1 Identifikasi Kelas

Tabel 3.8. Identifikasi Kelas Use Case [UC08]

| No  | Nama Kelas Perancangan | Nama Kelas Analisis Terkait |
| :-- | :--------------------- | :-------------------------- |
| 1   | _Laporan_              | _Laporan_                   |
| 2   | _Fasilitas_            | _Fasilitas_                 |
| 3   | _RiwayatStatus_        | _RiwayatStatus_             |

### 3.8.2 Sequence Diagram

- **Skenario Normal**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC08_sequence_diagram.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC08]</i>
</p>

- **Skenario Alternatif 1: Admin/Pemerintah daerah mencari fasilitas yang tidak ada dalam list laporan yang berubah**

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC08_sequence_diagram_alt1.png" width="50%">
</p>
<p align="center">
<i>Gambar X. Sequence Diagram [UC08] - [Admin/Pemerintah daerah mencari fasilitas yang tidak ada dalam list laporan yang berubah]</i>
</p>

### 3.8.3 Diagram Kelas

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/UC08_class_diagram.png" width="35%">
</p>
<p align="center">
<i>Gambar X. Diagram Kelas Melacak Riwayat Perubahan Status per Fasilitas </i>
</p>

<br>

---

# BAB 4: Diagram Kelas Keseluruhan

## 4.1 Diagram Kelas

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/ClassDiagramkeseluruhan.drawio.png" width="235%">
</p>
<p align="center">
<i>Gambar 4.1. Diagram Kelas Perancangan Keseluruhan SILEMBUR</i>
</p>

Tabel 4.1. Daftar Kelas Perancangan Keseluruhan

| ID Kelas | Nama Kelas           | Atribut                                                                                                                                       | Metode/Operasi                                                                                                                                                                                                                                                                                                                                                                                                                       |
| :------- | :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _C01_    | _Pelapor_            | _idPelapor: Integer, namaPelapor: String, jumlahLaporan: Integer_                                                                             | _konfirmasiSimpanLaporan(), terimaNotifikasi(), bukaLaporan(Laporan), bukaRiwayatLaporan(Laporan)_                                                                                                                                                                                                                                                                                                                                   |
| _C02_    | _Admin_              | _idAdmin: Integer, namaAdmin: String_                                                                                                         | _lihatDaftarLaporan(): List of Laporan, tetapkanKeputusan(keputusan: String, catatan: String), konfirmasiGabungLaporan(): Boolean, lihatFasilitasRusakBerulang(): List of Fasilitas_                                                                                                                                                                                                                                                 |
| _C03_    | _PemerintahDaerah_   | _idPemerintah: Integer, namaInstansi: String, wilayahKerja: String_                                                                           | _lihatLaporanTerverifikasi(), pilihFilter(kategori, wilayah), lihatFasilitasRusakBerulang(): List of Fasilitas_                                                                                                                                                                                                                                                                                                                      |
| _C04_    | _Laporan_            | _idLaporan: Integer, fotoLaporan: String, deskripsiLaporan: String, kategoriKerusakan: String, tanggalLaporan: String, statusLaporan: String_ | _buatLaporanBaru(), tampilkanFormulir(), validasiIsianFormulir(foto: String, deskripsi: String, koordinat: String): Boolean, bukaKunciSimpan(), simpanLaporan(), getLaporanMenungguVerifikasi(): List of Laporan, getDetailLaporan(): String, updateStatus(status), getLaporanTerverifikasi(), urutkanBerdasarkanPrioritas(), filterLaporan(kategori, wilayah), pilihDuplikat(): List of Laporan, getRiwayatStatus(): RiwayatStatus_ |
| _C05_    | _Lokasi_             | _koordinat: String, wilayah: String_                                                                                                          | _setLokasiLaporan(koordinat: String), getWilayah(): String_                                                                                                                                                                                                                                                                                                                                                                          |
| _C06_    | _Fasilitas_          | _idFasilitas: Integer, namaFasilitas: String, lokasiFasilitas: String, jumlahKerusakanBerulang: Integer_                                      | _getLaporan(): Laporan, cariFasilitas(keyword: String): Fasilitas, getDetailFasilitas(): String, getJumlahLaporan(): Integer_                                                                                                                                                                                                                                                                                                        |
| _C07_    | _Verifikasi_         | _idVerifikasi: Integer, keputusan: String, catatanAlasan: String, waktuVerifikasi: String_                                                    | _simpanVerifikasi(keputusan: String, catatan: String), tahanLaporan(), teruskanKePemerintah()_                                                                                                                                                                                                                                                                                                                                       |
| _C08_    | _SkorPrioritas_      | _jumlahPelapor: Integer, lamaMenunggu: Integer, frekuensiBerulang: Integer, namaFasilitasInduk: String, skor: Integer_                        | _hitungSkor(): Integer, getSkor(): Integer_                                                                                                                                                                                                                                                                                                                                                                                          |
| _C09_    | _RiwayatStatus_      | _idRiwayat: Integer, tanggalPerubahan: String, deskripsiPerubahan: String_                                                                    | _getPerubahan(): RiwayatStatus_                                                                                                                                                                                                                                                                                                                                                                                                      |
| _C10_    | _Notifikasi_         | _idNotifikasi: Integer, isiPesan: String, waktuKirim: String_                                                                                 | _kirimNotifikasi()_                                                                                                                                                                                                                                                                                                                                                                                                                  |
| _C11_    | _KonfirmasiDuplikat_ | _daftarKandidat: List of Laporan, namaFasilitasInduk: String_                                                                                 | _simpanKandidat(), warning(), gabungLaporan(): laporan_                                                                                                                                                                                                                                                                                                                                                                              |

<br>

---

# BAB 5: Perancangan Rinci Kelas

Bagian ini diisi dengan daftar seluruh kelas dalam tabel berikut:

Tabel 5.1. Daftar Kelas Perancangan dan Kelas Analisis Terkait

| No  | Nama Kelas Perancangan     | Nama Kelas Analisis Terkait              |
| :-- | :------------------------- | :--------------------------------------- |
| 1   | _[Nama kelas perancangan]_ | _[Nama kelas analisis pada SKPL atau -]_ |
| 2   | _[Nama kelas perancangan]_ | _[Nama kelas analisis pada SKPL atau -]_ |
| ... | _..._                      | _..._                                    |

Untuk **setiap kelas**, identifikasi operasi berdasarkan tanggung jawab kelas beserta _visibility_-nya, serta atribut beserta _visibility_ dan tipenya. Buat subbab tersendiri untuk setiap kelas.

## 5.1 Kelas [Nama Kelas 1]

**Nama Kelas:** _[Nama kelas]_  
**ID Kelas:** _[ID kelas]_

Tabel 5.1.1. Operasi Kelas [Nama Kelas 1]

| Nama Operasi                                                 | Visibility (private, public) | Keterangan                 |
| :----------------------------------------------------------- | :--------------------------- | :------------------------- |
| _[Signature operasi, termasuk parameter dan tipe kembalian]_ | _[Visibility]_               | _[Tanggung jawab operasi]_ |
| _..._                                                        | _..._                        | _..._                      |

Tabel 5.1.2. Atribut Kelas [Nama Kelas 1]

| Nama Atribut     | Visibility (private, public) | Tipe                                              |
| :--------------- | :--------------------------- | :------------------------------------------------ |
| _[Nama atribut]_ | _[Visibility]_               | _[Tipe sesuai bahasa pemrograman yang digunakan]_ |
| _..._            | _..._                        | _..._                                             |

### 5.1.1 Algoritma/Query

Bagian ini diisi untuk kerangka algoritma proses yang dianggap cukup penting. Algoritma dapat dituliskan sebagai _pseudocode_. Implementasi _skeleton code_ juga dapat digunakan untuk kelas yang sudah terdefinisi pada bahasa pemrograman tertentu.

**Nama Kelas:** _[Nama kelas]_  
**Nama Operasi:** _[Signature operasi]_  
**ID Algoritma:** _[Algo-001]_

```text
[Tuliskan pseudocode algoritma operasi di sini.]
```

Jika operasi mengacu pada query tertentu, lengkapi tabel berikut.

Tabel 5.1.1. Query Operasi [Nama Operasi]

| No Query  | Query              | Keterangan       |
| :-------- | :----------------- | :--------------- |
| _[Q-001]_ | _[Tuliskan query]_ | _[Fungsi query]_ |
| _..._     | _..._              | _..._            |

### 5.1.2 Algoritma/Query

_[Ulangi pola 5.1.1 untuk operasi penting berikutnya pada kelas yang sama, jika ada.]_

## 5.2 Kelas [Nama Kelas Berikutnya]

_[Ulangi pola 5.1: nama dan ID kelas, tabel operasi, tabel atribut, serta subbab algoritma/query untuk operasi penting jika diperlukan.]_

<br>

---

# BAB 6: Perancangan Antarmuka

## 6.1 Rancangan Antarmuka [ID Layar 1]

Masukkan versi awal prototipe antarmuka, dimana untuk setiap antarmuka/layar, tuliskan spesifikasi rinci objek yang ditampilkan dan reaksi sistem terhadap interaksi pengguna.

**Antarmuka:** _[ID layar]_  
**Nama Layar:** _[Nama layar]_

<p align="center">
<img alt="Contoh Logical View pada P/L E-Commerce" src="./assets/diagram/contoh-design.png" width="50%">
</p>
<p align="center">
<i>Gambar 6.1. Rancangan Antarmuka [ID Layar] - [Nama Layar]</i>
</p>

Tabel 6.1. Spesifikasi Objek Antarmuka [ID Layar]

| Id_Objek     | Jenis                                          | Konten                            | Keterangan                                                                 |
| :----------- | :--------------------------------------------- | :-------------------------------- | :------------------------------------------------------------------------- |
| _[ID objek]_ | _[Jenis objek, misalnya Button, RTF Box, dll]_ | _[String yang tampil pada layar]_ | _[Reaksi sistem, layar tujuan, tautan, atau ID algoritma yang dijalankan]_ |
| _[ID objek]_ | _[Jenis objek]_                                | _[Konten yang ditampilkan]_       | _[Reaksi sistem atau nama file terkait beserta deskripsi ringkasnya]_      |
| _..._        | _..._                                          | _..._                             | _..._                                                                      |

## 6.X Rancangan Antarmuka [ID Layar X]

_[Ulangi pola 6.1 untuk layar berikutnya sampai semua layar teridentifikasi]_

## 6.Y Rancangan Antarmuka Keseluruhan

Tuliskan daftar gambar seluruh antarmuka. Berikan ID unik untuk setiap tampilan dan gunakan ID yang sama pada subbab perancangan antarmuka masing-masing.

Tabel 6.Y. Rancangan Antarmuka Keseluruhan

| No       | Tampilan Antarmuka                                                             |
| :------- | :----------------------------------------------------------------------------- |
| _[I-01]_ | <img src="./assets/diagram/contoh-design.png" alt="Contoh Desain" width="400"> |
| _[I-02]_ | _[Sisipkan gambar antarmuka I-02]_                                             |
| _[I-XX]_ | _[Sisipkan gambar antarmuka berikutnya]_                                       |

<br>

---

# BAB 7: Matriks Kerunutan

Tabel 7.1. Matriks Kerunutan Kelas terhadap Use Case

| Kelas                    | Use Case Terkait                                                                                                                                                                                                                                                                                                                                                                                                                           |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| _C01-Pelapor_            | _UC01-Membuat Laporan Kerusakan Fasilitas, UC04-Melihat Daftar dan Detail Laporan Publik, UC05-Memantau Status dan Riwayat Penanganan Laporan_                                                                                                                                                                                                                                                                                             |
| _C02-Admin_              | _UC02-Memverifikasi Laporan dan Menhitung Prioritas, UC06-Meninjau Fasilitas dengan Kerusakan Berulang, UC07-Mengonfirmasi dan Menggabungkan Laporan Duplikat, UC08-Melacak Riwayat Perubahan Status per Fasilitas_                                                                                                                                                                                                                        |
| _C03-Pemerintah Daerah_  | _UC03-Menyaring dan Memantau Laporan Terverifikasi Berdasarkan Prioritas, UC06-Meninjau Fasilitas dengan Kerusakan Berulang, UC08-Melacak Riwayat Perubahan Status per Fasilitas_                                                                                                                                                                                                                                                          |
| _C04-Laporan_            | _UC01-Membuat Laporan Kerusakan Fasilitas, UC02-Memverifikasi Laporan dan Menhitung Prioritas, UC03-Menyaring dan Memantau Laporan Terverifikasi Berdasarkan Prioritas, UC04-Melihat Daftar dan Detail Laporan Publik, UC05-Memantau Status dan Riwayat Penanganan Laporan, UC06-Meninjau Fasilitas dengan Kerusakan Berulang, UC07-Mengonfirmasi dan Menggabungkan Laporan Duplikat, UC08-Melacak Riwayat Perubahan Status per Fasilitas_ |
| _C05-Lokasi_             | _UC01-Membuat Laporan Kerusakan Fasilitas_                                                                                                                                                                                                                                                                                                                                                                                                 |
| _C06-Fasilitas_          | _UC06-Meninjau Fasilitas dengan Kerusakan Berulang, UC07-Mengonfirmasi dan Menggabungkan Laporan Duplikat, UC08-Melacak Riwayat Perubahan Status per Fasilitas_                                                                                                                                                                                                                                                                            |
| _C07-Verifikasi_         | _UC02-Memverifikasi Laporan dan Menhitung Prioritas_                                                                                                                                                                                                                                                                                                                                                                                       |
| _C08-SkorPrioritas_      | _UC02-Memverifikasi Laporan dan Menhitung Prioritas, UC03-Menyaring dan Memantau Laporan Terverifikasi Berdasarkan Prioritas, UC07-Mengonfirmasi dan Menggabungkan Laporan Duplikat_                                                                                                                                                                                                                                                       |
| _C09-RiwayatStatus_      | _UC05-Memantau Status dan Riwayat Penanganan Laporan, UC08-Melacak Riwayat Perubahan Status per Fasilitas_                                                                                                                                                                                                                                                                                                                                 |
| _C10-Notifikasi_         | _UC02-Memverifikasi Laporan dan Menhitung Prioritas_                                                                                                                                                                                                                                                                                                                                                                                       |
| _C11-KonfirmasiDuplikat_ | _UC07-Mengonfirmasi dan Menggabungkan Laporan Duplikat_                                                                                                                                                                                                                                                                                                                                                                                    |
