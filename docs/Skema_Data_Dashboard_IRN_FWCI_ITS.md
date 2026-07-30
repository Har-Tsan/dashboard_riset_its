# Skema Data — Dashboard Strategis IRN & FWCI ITS

Dokumen ini adalah kontrak antara **tim realisasi aplikasi** (vibe coding) dan **tim pengumpulan data**. Keduanya bisa bekerja paralel selama sama-sama merujuk ke struktur ini.

---

## 1. Prinsip desain — baca ini dulu

Prototipe yang sudah dibangun punya banyak "status" yang terlihat seperti data (sustained/belum, watchlist, prioritas tinggi/rendah, risiko konsentrasi, dsb). **Hampir semua itu bukan data yang perlu diisi manual** — itu hasil hitungan dari data mentah di bawah. Yang perlu benar-benar dikumpulkan cuma dua jenis:

1. **Data mentah transaksional**: siapa berkolaborasi dengan siapa, kapan, di bidang apa (tabel `Publikasi` dan `Naskah_Pipeline`).
2. **Data referensi/master**: daftar institusi, struktur fakultas ITS, daftar universitas pembanding (jarang berubah).

Semua status (sustained, watchlist, kuadran prioritas, skor IRN, warna peta) **dihitung otomatis oleh aplikasi** dari dua jenis data itu — jangan sampai ada kolom terpisah untuk "status sustained" yang diisi manual, karena akan mudah tidak sinkron dengan data mentahnya.

---

## 2. Diagram relasi

Lihat diagram ERD di atas. `Universitas_Pembanding` sengaja tidak digambar di situ karena berdiri sendiri (tidak berelasi langsung ke tabel lain) — dijelaskan terpisah di bagian 2.7.

---

## 3. Entitas & field

### 2.1 Institusi_Mitra (master data mitra internasional)
| Field | Tipe | Wajib? | Catatan |
|---|---|---|---|
| id | ID | ya | primary key |
| nama_institusi | teks | ya | mis. "Universiti Kuala Lumpur" |
| negara | teks | ya | untuk peta & agregasi |
| catatan | teks | tidak | bebas |

### 2.2 Publikasi (transaksional — jantung sistem)
**Cakupan diperluas**: tabel ini mencakup **semua publikasi ITS**, bukan cuma yang melibatkan mitra internasional. Publikasi domestik/solo tetap dicatat di sini dengan `institusi_mitra_id` kosong — supaya FWCI per dosen/fakultas bisa dihitung dari seluruh output, bukan cuma yang relevan untuk IRN.

| Field | Tipe | Wajib? | Catatan |
|---|---|---|---|
| id | ID | ya | |
| institusi_mitra_id | FK → Institusi_Mitra | **tidak** (nullable) | kosong = publikasi domestik/tanpa mitra asing; diisi = publikasi ini yang dihitung untuk IRN |
| tahun_terbit | angka (tahun) | ya | dasar perhitungan jendela 5 tahun |
| bidang_qs | enum (5 nilai) | ya | Engineering and Technology / Natural Sciences / Life Sciences and Medicine / Social Sciences and Management / Arts and Humanities |
| judul | teks | disarankan | |
| fwci | desimal | disarankan | dari SciVal, per publikasi — dasar semua perhitungan FWCI (dosen, fakultas, institusi) |
| dosen_id | FK → Dosen (bisa lebih dari satu penulis → tabel bantu `Publikasi_Penulis`) | disarankan | ini yang menghubungkan ke level dosen/departemen/fakultas |
| sumber_data | enum | ya | Scholar API / SciVal / Manual |

### 2.3 Naskah_Pipeline (belum terbit, dari SIM internal)
| Field | Tipe | Wajib? | Catatan |
|---|---|---|---|
| id | ID | ya | |
| institusi_mitra_id | FK | ya | |
| judul | teks | ya | |
| bidang_qs | enum | ya | |
| status_naskah | enum | ya | Draft internal / Dalam penyusunan / Submitted / Under review |
| target_jurnal | teks | tidak | |
| estimasi_tahun_terbit | angka (tahun) | ya | dipakai simulator, bukan "berapa bulan lagi" |
| dosen_id | FK → Dosen | disarankan | |

### 2.4 Fakultas
| Field | Tipe | Wajib? | Catatan |
|---|---|---|---|
| id | ID | ya | |
| nama_fakultas | teks | ya | |

**Topik/bidang unggulan bukan lagi field di sini** — sudah dipindah jadi metrik turunan (lihat bagian 4): bidang QS dengan rata-rata FWCI tertinggi dari publikasi dosen-dosen fakultas itu. Alasannya: kalau disimpan manual, gampang basi begitu ada publikasi baru; dengan dihitung otomatis, selalu konsisten dengan data publikasi terkini.

### 2.5 Departemen
| Field | Tipe | Wajib? |
|---|---|---|
| id | ID | ya |
| fakultas_id | FK | ya |
| nama_departemen | teks | ya |

### 2.6 Dosen
| Field | Tipe | Wajib? |
|---|---|---|
| id | ID | ya |
| departemen_id | FK | ya |
| nama | teks | ya |

*(FWCI personal, jumlah publikasi personal, jumlah mitra — semuanya dihitung dari join `Dosen` → `Publikasi_Penulis` → `Publikasi`, bukan kolom tersendiri.)*

### 2.7 Universitas_Pembanding (referensi, berdiri sendiri)
| Field | Tipe | Wajib? | Catatan |
|---|---|---|---|
| id | ID | ya | |
| nama_universitas | teks | ya | |
| tahun_data | angka | ya | rank QS berubah tiap tahun, perlu ditandai |
| rank_qs_overall | angka | ya | |
| L_negara_sustained_agregat | angka | ya | agregat (bukan per bidang) — dipakai chart "IRN per dimensi" di Benchmark |
| P_institusi_sustained_agregat | angka | ya | agregat, sama seperti di atas |

FWCI per bidang tetap di tabel bantu terpisah `Universitas_Pembanding_FWCI(universitas_id, bidang_qs, fwci)` — L/P di atas sengaja agregat saja (tidak per bidang) karena chart yang memakainya juga menampilkan agregat.

### 2.8 Metrik_ITS_Tahunan (snapshot institusi ITS sendiri, per tahun) — **baru**
Ini beda sifat dari tabel lain: bukan transaksional, tapi **snapshot resmi dari QS/SciVal** per tahun. Tidak bisa dihitung dari `Publikasi` karena rank QS dan skor IRN resmi itu terbitan pihak QS, bukan hasil olahan kita sendiri.

| Field | Tipe | Wajib? | Catatan |
|---|---|---|---|
| id | ID | ya | |
| tahun | angka | ya | |
| bidang_qs | enum, boleh kosong | tidak | kosong = angka total institusi; diisi = breakdown per bidang |
| rank_qs_overall | angka | tidak | hanya ada di level total, biasanya kosong kalau bidang_qs diisi |
| fwci_rata_rata | desimal | ya | dari SciVal — ini basis chart tren di Ringkasan Eksekutif |
| skor_irn_resmi | desimal | tidak | kalau QS merilis skor IRN resminya; kalau tidak ada, dashboard tetap pakai proksi L/ln(P) dari data `Publikasi` |

### 2.9 Kolaborasi_Pembanding (mitra milik universitas pembanding) — **baru**
Untuk fitur "Irisan Mitra dan Bidang dengan Pembanding" di halaman Benchmark. Datanya **bukan** hasil hitung dari tabel lain — ini observasi terpisah tentang siapa saja mitra universitas pembanding (biasanya dari halaman publik SciVal/Scopus mereka atau situs institusi).

| Field | Tipe | Wajib? | Catatan |
|---|---|---|---|
| id | ID | ya | |
| universitas_pembanding_id | FK → Universitas_Pembanding | ya | |
| nama_institusi_mitra | teks | ya | tidak perlu FK ke `Institusi_Mitra` — ini institusi yang belum tentu jadi mitra ITS |
| negara | teks | ya | |
| bidang_qs | enum | ya | |

Kolom "overlap/gap" di tabel Benchmark dihitung otomatis: **overlap** kalau `nama_institusi_mitra` juga muncul di `Institusi_Mitra` milik ITS, **gap** kalau tidak.

---

## 4. Metrik turunan (dihitung aplikasi, bukan diisi manual)

| Metrik | Formula | Dipakai di |
|---|---|---|
| Jumlah publikasi dalam jendela | `COUNT(Publikasi) WHERE tahun_terbit BETWEEN (tahun-4) AND tahun` per institusi_mitra | semua halaman |
| Status sustained | jumlah publikasi dalam jendela ≥ 3 | Peluang Kerjasama, Kinerja Riset, Simulator, Peta |
| L (negara sustained) per bidang | jumlah negara distinct dari institusi yang sustained pada bidang itu | Simulator, Benchmark |
| P (institusi sustained) per bidang | jumlah institusi distinct yang sustained pada bidang itu | Simulator, Benchmark |
| Skor IRN mentah | `L / ln(P)` per bidang, dirata-ratakan | Simulator |
| Watchlist dosen | `jumlah_publikasi(dosen, 5th) >= 8 AND FWCI(dosen) < 0.6` | Kinerja Riset |
| Kuadran prioritas mitra | kombinasi jumlah publikasi menuju 3 (sumbu X) × FWCI (sumbu Y) | Peluang Kerjasama |
| Diversifikasi % | `MAX(jumlah relasi per negara) / total relasi` | Peluang Kerjasama |
| Warna peta (heatmap) | jumlah publikasi per negara, sesuai filter aktif, skala akar-kuadrat relatif terhadap nilai maksimum | Peta Kolaborasi |
| Mitra lapsed (tidak aktif) | sustained di masa lalu, tapi jumlah publikasi dalam jendela sekarang < 3 | otomatis dari `Publikasi`, **tidak perlu tabel terpisah** |
| FWCI per dosen | `AVERAGE(Publikasi.fwci)` untuk publikasi milik dosen itu (lewat `Publikasi_Penulis`) | Kinerja Riset |
| FWCI per fakultas | `AVERAGE(Publikasi.fwci)` untuk semua dosen di fakultas itu | Kinerja Riset |
| **Bidang/topik unggulan fakultas** | rata-rata FWCI dikelompokkan per bidang QS (dari publikasi dosen-dosen fakultas itu), **bidang dengan rata-rata tertinggi** = topik unggulan | Kinerja Riset |
| FWCI ITS keseluruhan/per bidang, Rank QS, dari tahun ke tahun | **bukan dihitung** — diambil langsung dari `Metrik_ITS_Tahunan` (angka resmi QS/SciVal) | Ringkasan Eksekutif (termasuk chart tren) |
| Overlap/gap mitra pembanding | `nama_institusi_mitra` di `Kolaborasi_Pembanding` dicocokkan ke `Institusi_Mitra` milik ITS | Benchmark |

---

## 5. Kalau pakai spreadsheet dulu (rekomendasi tahap awal)

Struktur di atas bisa langsung jadi tab/sheet:

| Sheet | Berisi entitas |
|---|---|
| `Institusi_Mitra` | 2.1 |
| `Publikasi` | 2.2 (satu baris = satu publikasi; kalau penulis lebih dari satu, tambah kolom `dosen_2`, `dosen_3`, dst — atau baris terpisah) |
| `Naskah_Pipeline` | 2.3 |
| `Fakultas`, `Departemen`, `Dosen` | 2.4–2.6 |
| `Universitas_Pembanding` | 2.7 |
| `Metrik_ITS_Tahunan` | 2.8 — ini yang diisi manual tiap kali ada rilis QS/SciVal baru |
| `Kolaborasi_Pembanding` | 2.9 — diisi manual dari observasi profil SciVal/Scopus publik universitas pembanding |

Ini konsisten dengan template Excel (`Data_Kolaborasi`, `Rekap_Mitra`) yang sudah dibuat sebelumnya di project ini — tinggal diperluas: tambah kolom `tahun_terbit` per baris (bukan angka agregat), pisah `Naskah_Pipeline` jadi sheet sendiri dengan `estimasi_tahun_terbit`, dan tambah sheet `Fakultas`/`Departemen`/`Dosen`.

---

## 6. Catatan migrasi dari prototipe

- **`bgResidual`** (angka latar belakang IRN per bidang di Simulator) — ini akal-akalan prototipe karena cuma 13 mitra contoh yang punya nama. Begitu **semua** mitra riil tercatat individual di tabel `Publikasi`, konsep ini hilang sendirinya — L dan P dihitung langsung dari data lengkap.
- **`lapsedPartners`** (daftar terpisah di prototipe) — begitu `Publikasi` punya `tahun_terbit` per baris, status lapsed otomatis muncul dari perhitungan jendela 5 tahun. Tidak perlu tabel/daftar terpisah.
- **Dummy data generator** (65 baris dosen acak di Kinerja Riset) — diganti data `Dosen` + `Publikasi_Penulis` yang sesungguhnya begitu tersedia.
