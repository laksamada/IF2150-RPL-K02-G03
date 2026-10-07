<h1>
IF2150 REKAYASA PERANGKAT LUNAK
<br>
TUGAS 6
<br>
ARSITEKTUR PERANGKAT LUNAK (APL)
</h1>
<br>

## *SILEMBUR*

### Untuk: *Amanda Aurellia Salsabila*

Dipersiapkan oleh:
| Informasi | Keterangan |
| --- | --- |
| Kelas | *K02* |
| Kelompok | *G03* |

Dipersiapkan oleh:

Dipersiapkan oleh:
| Informasi | Keterangan |
| --- | --- |
| Kelas | *K02* |
| Kelompok | *G03* |
| Nama Kelompok | LockedIn  |

| NIM       | Nama               |
| --------- | ------------------ |
| *13525059* | *Muhammad Pandu Pulunggana* |
| *13525128* | *Mochamad Fachri Alfaridzi* |
| *13525101* | *Kevin Lincoln Hutabarat* |
| *13525035* | *Muhammad Dhiya Rafi* |
| *13525098* | *Satya Radhityan Yahya* |


---

<br>
<br>

# BAB 1: Style/Pattern Arsitektur Acuan

Pada bagian ini, tentukan *architectural style* atau *pattern* yang menjadi acuan untuk aplikasi yang Anda kembangkan. Misalnya *layered architecture*, *client-server*, *repository*, *pipe and filter architecture*, atau MVC (*Model-View-Controller*).

<p align="center">
<img alt="Contoh Arsitektur MVC" src="./assets/diagram/contoh-arsitektur-mvc.webp" width="70%">
</p>
<p align="center">
<i>Gambar 1. Contoh Arsitektur MVC</i>
</p>

Isi bab ini dengan hal-hal berikut:
1. **Style/pattern yang dipilih** beserta penjelasan singkat peran setiap bagiannya. Untuk MVC, jelaskan peran *Model*, *View*, dan *Controller*.
2. **Alasan pemilihan** berdasarkan karakteristik P/L Anda, misalnya jenis pengguna, alur proses bisnis, serta KF dan KNF pada dokumen SKPL.
3. **Gambar style/pattern yang diterapkan pada P/L Anda.** Jangan hanya menyalin Gambar 1. Isi setiap bagian pattern dengan komponen milik P/L Anda. Misalnya, kotak *Controller* berisi daftar *controller* yang ada di aplikasi dan kotak *Model* berisi daftar *model* yang ada di aplikasi.



Selain *style/pattern*, tuliskan juga lingkungan operasi P/L. Tabel berikut **disalin dari subbab 2.5 *Lingkungan Operasi Perangkat Lunak* pada dokumen SKPL** tanpa perubahan. Setelah tabel, jelaskan kaitan teknologi yang dipakai dengan *style/pattern* yang dipilih. Contohnya, Django (Python) secara bawaan mengikuti pola MVT (*Model-View-Template*), yaitu varian dari MVC.

Tabel 1.1. Lingkungan Operasi Perangkat Lunak

| Komponen | Spesifikasi |
| :--- | :--- |
| *Server* | *Node.js v24, dijalankan pada layanan cloud* |
| *Client* | *Mobile App* |
| *DBMS* | *PostgreSQL 18* |
| *OS* | *Android dan iOS* |
| *Runtime* | *Node.js v24* |
| *Cloud* | *Google Cloud* |

<sub><b><i>Catatan</i></b>: <i>Style/pattern yang dipilih di bab ini menjadi acuan untuk BAB 2 (pengelompokan komponen) dan BAB 3 (model arsitektur). Contoh pada dokumen ini memakai MVC secara konsisten dari BAB 1 sampai BAB 3. Kelompok boleh memakai pattern lain selama alasannya dijelaskan dan BAB 2 serta BAB 3 disesuaikan. Tabel 1.1 harus sama persis dengan subbab 2.5 dokumen SKPL; jangan menambah atau mengubah isinya karena SKPL sudah final.</i></sub>

---

# BAB 2: Identifikasi Komponen / Modul / Subsistem

Tabel 2.1. Identifikasi Komponen/Modul/Subsistem

| Nama Komponen/Modul/Subsistem | Jenis                 | Penjelasan                                                                                                             |
| :---------------------------- | :-------------------- | :--------------------------------------------------------------------------------------------------------------------- |
| *FormLaporanView*             | *View*                | *Menampilkan formulir laporan berisi foto, lokasi, dan deskripsi kerusakan, lalu mengirimkannya ke LaporanController.* |
| *VerifikasiView*              | *View*                | *Menampilkan laporan yang menunggu verifikasi beserta pilihan setujui, tolak, atau minta revisi untuk admin.*          |
| *PrioritasView*               | *View*                | *Menampilkan laporan terverifikasi yang terurut berdasarkan skor prioritas kepada pemerintah daerah.*                  |
| *LaporanPublikView*           | *View*                | *Menampilkan laporan pengguna lain tanpa identitas pelapor.*                                                           |
| *LaporanSayaView*             | *View*                | *Menampilkan laporan milik pelapor beserta status, riwayat penanganan, dan notifikasi verifikasi.*                     |
| *FasilitasBerulangView*       | *View*                | *Menampilkan fasilitas yang menjadi kandidat evaluasi perbaikan permanen.*                                             |
| *DuplikatView*                | *View*                | *Menampilkan kandidat laporan duplikat dan konfirmasi penggabungan untuk admin.*                                       |
| *RiwayatFasilitasView*        | *View*                | *Menampilkan pencarian fasilitas dan riwayat perubahan status laporannya.*                                             |
| *LaporanController*           | *Controller*          | *Memproses pembuatan laporan, daftar laporan publik, serta status dan riwayat laporan milik pelapor.*                  |
| *VerifikasiController*        | *Controller*          | *Memproses keputusan verifikasi admin, mengirim notifikasi, dan memicu perhitungan skor prioritas.*                    |
| *PrioritasController*         | *Controller*          | *Memproses daftar laporan terverifikasi berdasarkan skor prioritas dan filternya.*                                     |
| *FasilitasController*         | *Controller*          | *Memproses daftar fasilitas dengan kerusakan berulang, pencarian fasilitas, dan riwayat statusnya.*                    |
| *DuplikatController*          | *Controller*          | *Memproses pencarian kandidat duplikat dan penggabungan laporan setelah dikonfirmasi admin.*                           |
| *Pengguna*                    | *Model*               | *Merepresentasikan akun dan peran pengguna, yaitu Pelapor, Admin, dan PemerintahDaerah.*                               |
| *Laporan*                     | *Model*               | *Merepresentasikan data laporan berupa foto, lokasi, deskripsi, kategori, dan status.*                                 |
| *Lokasi*                      | *Model*               | *Merepresentasikan koordinat dan wilayah laporan.*                                                                     |
| *Fasilitas*                   | *Model*               | *Merepresentasikan fasilitas umum dan menandainya jika laporan melewati ambang batas.*                                 |
| *Verifikasi*                  | *Model*               | *Merepresentasikan keputusan verifikasi beserta catatan alasannya.*                                                    |
| *SkorPrioritas*               | *Model*               | *Menghitung skor prioritas laporan.*                                                                                   |
| *RiwayatStatus*               | *Model*               | *Mencatat setiap perubahan status laporan.*                                                                            |
| *Notifikasi*                  | *Model*               | *Merepresentasikan pesan hasil verifikasi untuk pelapor.*                                                              |
| *KonfirmasiDuplikat*          | *Model*               | *Menyimpan kandidat duplikat dan menggabungkannya menjadi satu laporan induk.*                                         |
| *Autentikasi*                 | *Pendukung*           | *Memeriksa token Google Sign-In dan membatasi akses sesuai peran pengguna.*                                            |
| *Validasi*                    | *Pendukung*           | *Memeriksa kelengkapan dan format input sebelum diproses controller.*                                                  |
| *GoogleMapsAdapter*           | *Integrasi Eksternal* | *Menghubungkan aplikasi dengan Google Maps Platform untuk menampilkan dan memilih lokasi.*                             |
| *CloudStorageAdapter*         | *Integrasi Eksternal* | *Menghubungkan aplikasi dengan Google Cloud Storage untuk menyimpan foto laporan.*                                     |
| *Database*                    | *Penyimpanan Data*    | *Basis data PostgreSQL 18 yang menyimpan seluruh data Model.*                                                          |
---

# BAB 3: Model Arsitektur Perangkat Lunak

## 3.1 Logical View

*Logical View* dipilih karena paling langsung memperlihatkan penerapan MVC pada SILEMBUR. Diagram ini menunjukkan *controller* mana yang menangani setiap layar, *model* mana yang diakses setiap *controller*, dan bagaimana *model* saling berhubungan. Informasi tersebut menjadi panduan pembagian modul saat implementasi.

<p align="center">
<img alt="Logical View SILEMBUR" src="./assets/diagram/logical-view.png" width="100%">
</p>
<p align="center">
<i>Gambar 2. Logical View SILEMBUR</i>
</p>

Seluruh komponen pada Tabel 2.1 digambarkan dan dikelompokkan menjadi *View*, *Controller*, *Model*, *Pendukung*, *Integrasi Eksternal*, dan *Penyimpanan Data*. Setiap *View* diberi keterangan use case dan aktor yang memakainya. Garis "Memanggil" menunjukkan *View* yang meneruskan aksi pengguna ke *Controller*, sedangkan garis "akses" menunjukkan *Controller* yang membaca atau mengubah *Model*. Hubungan antar-*Model* mengikuti diagram kelas keseluruhan pada SKPL. Fasilitas mengagregasi Laporan, Laporan mengagregasi Lokasi dan RiwayatStatus, serta Laporan tersusun atas (komposisi) SkorPrioritas. Karena Lokasi, RiwayatStatus, dan SkorPrioritas merupakan bagian dari Laporan, *controller* mengaksesnya melalui Laporan, tidak secara langsung. Seluruh *controller* memakai Autentikasi dan Validasi sebelum memproses permintaan. Layanan Google di luar P/L, yaitu Google Maps Platform, Google Sign-In, dan Google Cloud Storage, digambarkan dengan garis putus-putus.

## 3.2 Physical View

---

# Referensi

- Sommerville, I. (2016). *Software Engineering* (10th ed.). Pearson. Chapter 6: *Architectural Design*: [https://software-engineering-book.com/slides/](https://software-engineering-book.com/slides/)
- Diagram arsitektur: [https://www.drawio.com/](https://www.drawio.com/), [https://staruml.io/](https://staruml.io/)
