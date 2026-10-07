# Deklarasi Penggunaan AI

## Tugas Besar IF2150 - Rekayasa Perangkat Lunak

| Informasi | Keterangan |
|---|---|
| Kelas | *K02* |
| Nomor Kelompok | *G03* |
| Nama Kelompok | *LockedIn* |
| Nama Perangkat Lunak | *SiLembur* |

**Anggota Kelompok:**

| NIM | Nama |
|---|---|
| *13525059* | *Muhammad Pandu Pulunggana* |
| *13525128* | *Mochamad Fachri Alfaridzi* |
| *13525101* | *Kevin Lincoln Hutabarat* |
| *13525035* | *Muhammad Dhiya Rafi* |
| *13525098* | *Satya Radhityan Yahya* |

---

### Daftar Isi
* [Milestone 1](#milestone-1)
* [Milestone 2](#milestone-2)
* [Milestone 3](#milestone-3)
* [Milestone 4](#milestone-4)
* [Milestone 5](#milestone-5)
* [Milestone 6](#milestone-6)

---

### Log Penggunaan AI per Milestone

Silakan catat penggunaan AI yang berdampak signifikan pada pengerjaan tugas (misal: *generate* fungsi algoritma yang kompleks, *generate* draf dokumen SKPL/DPPL, atau *debugging* error utama). 
*Penggunaan sepele seperti memperbaiki *typo* atau auto-complete satu baris kode tidak perlu dicatat.*

### Milestone 1
| Tool AI | Tujuan Penggunaan | Contoh Prompt Utama | Modifikasi & Validasi Manusia |
| :--- | :--- | :--- | :--- |
| ChatGPT | Membantu menyusun analisis kondisi saat ini serta membandingkan solusi pelaporan fasilitas publik yang sudah ada | "Analisis kondisi saat ini untuk sistem pelaporan fasilitas rusak seperti jalan berlubang, lampu mati, atau pohon tumbang. Bandingkan dengan solusi yang sudah ada dan identifikasi kesenjangan yang dapat diselesaikan perangkat lunak." | Hasil analisis AI digunakan sebagai referensi awal. Seluruh isi kemudian ditulis ulang oleh anggota kelompok dan disesuaikan dengan ruang lingkup sistem pelaporan fasilitas publik|

### Milestone 2
| Tool AI | Tujuan Penggunaan | Contoh Prompt Utama | Modifikasi & Validasi Manusia |
| :--- | :--- | :--- | :--- |
| Claude | Memeriksa konsistensi antara dokumen Milestone 1 dan draf Milestone 2, khususnya penamaan dan penomoran aktivitas yang berbeda di kedua dokumen | "Kami sedang mengerjakan Milestone 2 mata kuliah Rekayasa Perangkat Lunak. Masalah utamanya, deskripsi aktivitas pada dokumen Topic Brainstorming dan Requirement Gathering kami berbeda, padahal keduanya membahas sistem yang sama. Tolong periksa bagian mana saja yang tidak konsisten di antara kedua dokumen tersebut." | Daftar aktivitas final disusun sendiri oleh kelompok. Masukan AI hanya dipakai sebagai penanda bagian yang perlu diperiksa ulang. |
| Claude | Meminta pendapat mengenai ruang lingkup aktor pemerintah daerah, karena kelompok kesulitan menentukan sejauh mana peran instansi dapat diimplementasikan dalam proyek kuliah | "Menurut kami ada bagian yang sulit, yaitu peran pemerintah. Walaupun ini memang web untuk pemerintah, saat mengimplementasikan proyek ini kami tidak tahu bagaimana caranya menghubungkan bagian tersebut, misalnya bagaimana pemerintah memverifikasi laporan, sedangkan ini hanya proyek kuliah. Bagaimana sebaiknya batas sistemnya ditentukan?" | Kelompok memutuskan sendiri perbaikan fisik fasilitas ditempatkan di luar perangkat lunak dengan kolom P/L bernilai Tidak. Rumusan kebutuhannya ditulis ulang oleh anggota kelompok. |
| Claude | Memverifikasi tabel pemetaan kebutuhan yang telah disusun kelompok, terutama ketepatan jenis kebutuhan dan penelusuran ke ID aktivitas | "Ini tabel pemetaan kebutuhan yang sudah kami susun, dari R01 sampai R15. Tolong periksa apakah jenis kebutuhan dan penelusuran ke ID aktivitasnya sudah tepat, dan apakah ada aktivitas yang belum tercakup." | AI menandai baris ganda, kesalahan penautan ID aktivitas, dan aktivitas yang belum memiliki kebutuhan. Seluruh perbaikan akhir diputuskan dan ditulis sendiri oleh kelompok. |

### Milestone 3

| Tool AI | Tujuan Penggunaan | Contoh Prompt Utama | Modifikasi & Validasi Manusia |
| :--- | :--- | :--- | :--- |
| ChatGPT | Memverifikasi kesesuaian use case diagram dengan use case pada bagian 3.2 | "Tolong periksa apakah use case diagram ini sudah sesuai dengan use case yang dijelaskan pada bagian 3.2. Sebutkan bagian yang perlu diperiksa atau disesuaikan." |  Kami meninjau kembali hasilnya dan melakukan sedikit penyesuaian pada diagram |

### Milestone 4

| Tool AI | Tujuan Penggunaan | Contoh Prompt Utama | Modifikasi & Validasi Manusia |
| :--- | :--- | :--- | :--- |
| ChatGPT | Memverifikasi tabel keterangan diagram kelas yang telah disusun kelompok untuk beberapa use case (UC), terutama konsistensi kelas, atribut, metode, dan relasi dengan diagram serta skenario use case | "Berdasarkan file md dan diagram yang sudah kami buat, tolong periksa tabel keterangan untuk use case ini. Cek apakah kelas, atribut, metode, dan relasinya sudah sesuai dengan diagram dan skenario use case." | Diagram kelas dan tabel keterangan awal disusun sendiri oleh kelompok. AI hanya digunakan untuk memeriksa konsistensi tabel dan memberikan masukan pada bagian yang perlu ditinjau kembali.  |
| ChatGPT | Membantu memahami dan memverifikasi penggunaan notasi relasi pada diagram kelas, seperti asosiasi, agregasi, komposisi, dan dependensi | "Coba jelaskan arti notasi relasi pada diagram kelas, seperti belah ketupat hitam atau kosong dan garis putus-putus, lalu bantu periksa apakah penggunaannya pada diagram kami sudah sesuai." | Penjelasan AI digunakan sebagai bahan belajar dan referensi saat memeriksa ketepatan relasi pada diagram kelas. |
---


### Milestone 5

| Tool AI | Tujuan Penggunaan | Contoh Prompt Utama | Modifikasi & Validasi Manusia |
| :--- | :--- | :--- | :--- |
| ChatGPT | Memahami sisi teknikal dari pembuatan perangkat lunak, termasuk komponen apa yang dibutuhkan dan penjelasan komponen-komponennya | "Apa itu API, dan bagaimana bisa relevan ketika membuat suatu aplikasi?" | Penjelasan AI digunakan untuk membantu mengisi bagian 2.4 dan 2.5 |

### Milestone 6

| Tool AI | Tujuan Penggunaan | Contoh Prompt Utama | Modifikasi & Validasi Manusia |
| :--- | :--- | :--- | :--- |
| Claude | Meminta rekomendasi pemilihan pola arsitektur dan identifikasi komponen | "berikan rekomendasi untuk menentukan pola arsitektur berdasarkan dokumen-dokumen pada milestone sebelumnya." | Rekomendasi AI dipakai sebagai acuan awal. Kelompok memeriksa kesesuaian komponen dengan kelas dan use case pada SKPL untuk menentukan pola arsitektur yang sesuai. |
| Claude | Meminta saran perbaikan isi tabel Lingkungan Operasi Perangkat Lunak | "Yang Lingkungan Operasi Perangkat Lunak disesuaikan saja, bagusnya seperti apa?" | Saran AI hanya dipakai sebagai pertimbangan. Kelompok tetap memakai Tabel 1.1 yang sama dengan subbab 2.5 SKPL karena SKPL sudah final. |
| Claude | Membantu merevisi diagram Physical View pada subbab 3.2  | "Tolong cek  bagian 3.2 Physical View apakah isinya dan notasinya sudah sesuai ketentuan." | beberapa kali merevisi gaya diagram sampai sesuai kebutuhan. |

---

### Pernyataan Integritas dan Persetujuan

Kami yang bertanda tangan di bawah ini menyatakan bahwa seluruh log penggunaan AI di atas adalah benar. Kami telah memvalidasi seluruh hasil AI dan bertanggung jawab penuh atas orisinalitas, keamanan, dan kebenaran hasil akhir dari tugas ini.

| Tanda Tangan | Nama Anggota |
| :---: | :--- |
| <img src="./assets/ttd_fachri.jpeg"  width="100%" >| **[13225128 - Mochamad Fachri Alfaridzi]** |
| <img src=".\assets\ttd_satya.png" width="100%" > | **[13525098 - Satya Radhityan Yahya]** |
| <img src="./assets/ttd_rafi.png" width="100"> | **[13525035 - Muhammad Dhiya Rafi]** |
| <img src="./assets/ttd_pandu.png" width="100"> | **[13525059 - Muhammad Pandu Pulunggana]** |
| <img src="./assets/ttd_kevin.png" width="100"> | **[13525101 - Kevin Lincoln Hutabarat ]** |
