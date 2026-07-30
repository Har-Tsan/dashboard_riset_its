# Migrasi Dashboard IRN & FWCI ITS: Hardcoded → Data Eksternal

## Context

Prototipe `prototype/dashboard_irn_fwci_its.html` (1152 baris, satu file HTML+CSS+JS) sudah divalidasi tampilan/interaksinya lewat puluhan iterasi. Saat ini seluruh datanya adalah literal JS hardcoded (13 mitra contoh, 65 dosen — sebagian besar hasil generator random). Tim data sudah menyiapkan skema resmi (`docs/Skema_Data_Dashboard_IRN_FWCI_ITS.md`) dan data dummy penuh sesuai skema itu (`data/Data_Master_IRN_FWCI_ITS.xlsx`, 133 publikasi riil, 9 fakultas, 48 dosen, 24 mitra). Tujuan: dashboard membaca dari file data ini, bukan literal JS — tanpa mengubah tampilan/chart/interaksi yang sudah ada, kecuali dipaksa oleh perbedaan granularitas data (trend chart semester → tahunan, karena `Metrik_ITS_Tahunan` cuma py grain tahunan).

Prinsip skema: hanya data mentah (transaksional + referensi) yang datang dari luar; semua status/skor (sustained, watchlist, kuadran prioritas, skor IRN, warna peta) **wajib dihitung ulang oleh aplikasi**, tidak boleh ada kolom status manual.

Keputusan yang sudah dikonfirmasi user:
- Loader mendukung dua mode: fetch JSON (server lokal) **dan** fallback `<script src>` (dobel-klik file HTML langsung).
- Chart Benchmark yang datanya belum ada (skor IRN mentah L/P & breakdown FWCI per bidang untuk universitas pembanding) tetap ditampilkan untuk ITS saja + catatan teks "data belum tersedia" — bukan disembunyikan.
- `CURRENT_YEAR` konstanta manual di config, diupdate admin tiap tahun berganti.
- Boleh membuat file Excel sample kecil (`data/Data_Master_IRN_FWCI_ITS_SAMPLE.xlsx`, skema identik) khusus QA visual.

## Struktur File Baru

```
prototype/
  dashboard_irn_fwci_its.html      (tetap 1 file, blok <script> data dipecah ke file eksternal)
  js/
    config.js                # CURRENT_YEAR, WINDOW_SIZE=5, SUSTAIN_MIN=3, WATCHLIST_MIN_PUB=8, WATCHLIST_MAX_FWCI=0.6
    country-paths.js         # countryPaths[] dipindah apa adanya (aset kartografi statis)
    domain.js                # sustainWindowCount(), isSustained(), fmtNumOrDash() — 1 implementasi dipakai semua halaman
    data-loader.js            # loadDataset(): fetch JSON -> fallback window.__DASHBOARD_DATA__
    transform-org.js           # buildOrg() -> Kinerja Riset
    transform-peluang.js        # buildMitraSummary(), getSustainedNow(), getBelumTerhitung() -> Peluang Kerjasama
    transform-simulator.js       # buildAllMitraItems(), computeForYear() (tanpa bgResidual) -> Simulator IRN
    transform-peta.js             # buildCollabRecords() -> Peta Kolaborasi
    transform-benchmark.js         # buildRankData(), buildUnivDataFwci(), buildUnivDataIRN(), buildOverlapData()
data/
  Data_Master_IRN_FWCI_ITS.xlsx        (sudah ada, sumber kebenaran, di-maintain manual tim data)
  Data_Master_IRN_FWCI_ITS_SAMPLE.xlsx  (baru — subset kecil utk QA visual, skema identik)
  dataset.json                          (di-generate dari xlsx, dipakai mode fetch)
  dataset.js                            (di-generate dari xlsx, dipakai mode fallback file://)
scripts/
  convert_xlsx_to_json.py    (dev-time only: baca semua sheet kecuali Panduan & Topik_Unggulan_Fakultas,
                               buang kolom "(helper)"/"(formula)", tulis dataset.json + dataset.js)
docs/
  RUNNING_LOCALLY.md          (cara regenerate dataset & menjalankan dashboard)
```

## Tahapan Implementasi

**Tahap 1 — Fondasi (tidak menyentuh UI)**
1. `scripts/convert_xlsx_to_json.py`: sheet → key camelCase (`fakultas`, `departemen`, `dosen`, `institusiMitra`, `publikasi`, `publikasiPenulis`, `naskahPipeline`, `universitasPembanding`, `universitasPembandingFwci`, `metrikItsTahunan`, `kolaborasiPembanding`), field snake_case dipertahankan 1:1 dengan dokumen skema. Tulis `data/dataset.json` dan `data/dataset.js` (`window.__DASHBOARD_DATA__ = {...}`) dari sumber yang sama.
2. `js/data-loader.js`: `async function loadDataset()` — coba `fetch('../data/dataset.json')`, kalau gagal (mis. `file://`) pakai `window.__DASHBOARD_DATA__` dari `dataset.js` (di-include via `<script src>` sebelum data-loader). Validasi minimal (tabel master tidak kosong), lempar error jelas → ditangkap di `boot()`, ditampilkan lewat `.banner-warn` yang sudah ada (bukan `alert()`).
3. `js/domain.js`: satu implementasi window 5-tahun dipakai di semua tempat (`effCur`, `pubsInWindow`, `isSustainedMap` sebelumnya berbeda-beda, sekarang semua memanggil `sustainWindowCount()`/`isSustained()`). Juga `fmtNumOrDash()` untuk field yang kadang berisi placeholder teks ("Belum terverifikasi", "Belum dirilis QS") — konsisten dengan konvensi `'—'` yang sudah dipakai app.

**Tahap 2 — Transformasi per entitas** (lihat pseudocode di bawah). Testable terpisah dari HTML.

**Tahap 3 — Wiring**: bungkus isi `<script>` utama (baris 393-1150) ke `async function boot()`, ganti tiap `const X = [...]` literal jadi `const X = D.X` hasil transformasi. Badan fungsi render (`renderTable`, `renderQuad`, `renderFacGrid`, `renderMap`, dst.) **tidak diubah**, kecuali 2 titik eksplisit di Tahap 4.

**Tahap 4 — Hapus yang usang**
- `genDosen(45)` dan pemakaiannya di `allDosen` — dihapus total, ganti query nyata ke seluruh `Dosen`.
- `bgResidual` — dihapus total; `computeForYear()` tidak lagi menambahkan `bgResidual[b].L`/`.P` ke `L`/`P` (satu-satunya perubahan wajib pada badan fungsi render, karena §6 skema eksplisit minta ini hilang begitu semua mitra riil tercatat).
- Field dead (dikonfirmasi via grep, tidak pernah dirender): `citations`, `hindex`, `unggulPct` pada `org[]`. **`real` BUKAN dead** — dipakai langsung di baris 702 (`backgroundColor:org.map(f=>f.real?'rgba(11,37,69,.65)':'rgba(147,161,173,.55)')`) untuk mewarnai bubble chart Perbandingan Fakultas. Field ini **dipertahankan** di shape baru, diisi `real:true` untuk semua 9 fakultas (karena pasca migrasi semua fakultas memang data asli, bukan contoh) — dengan begitu `facBubble` tetap seluruhnya navy tanpa perlu menyentuh baris 700-704 sama sekali.
- Field redundan dihapus, selalu dihitung dari `years`: `cur` pada `peluang`/Peluang Kerjasama (`status`/`jumlahPaper`/`tahunTerakhir`/`jumlahDulu` pada sustainedPartners/lapsedPartners lama) — ketiga array lama digantikan satu `mitraSummary[]`.
- `estYear(bulan)` dihapus — `Naskah_Pipeline.estimasi_tahun_terbit` dipakai langsung sebagai `pipelineYear`.
- **Penting — BUKAN bug, jangan diubah**: `renderTopRec()` dan `closeCount` di Ringkasan Eksekutif memang sengaja memakai window tetap di `CURRENT_YEAR` (setara `includeOldest=true`), lepas dari toggle "Sertakan tahun tertua" — toggle itu cuma berlaku untuk tampilan interaktif di halaman Peluang Kerjasama (tabel & kuadran), bukan untuk snapshot Ringkasan Eksekutif. Karena field `cur` dihapus, `renderTopRec()`/`closeCount` diganti memanggil `sustainWindowCount(x.years, CURRENT_YEAR, true, CURRENT_YEAR-4)` langsung (window tetap, tidak baca checkbox) — **bukan** `effCur(x)` (yang di halaman Peluang baca checkbox `#include2022`). Dua fungsi ini sengaja berbeda perilaku dan keduanya harus tetap ada.
- Magic number watchlist (`p>=8&&f<0.6`, muncul di ≥4 tempat) → panggil `isWatchlist(x)` dari `config.js`.

## Pseudocode Transformasi Kunci

**`org[]`** (Fakultas→Departemen→Dosen, Kinerja Riset): join `Dosen → Publikasi_Penulis → Publikasi(+Institusi_Mitra)`. Per dosen: `p` = `sustainWindowCount(tahun_terbit publikasinya)`, `f` = rata-rata FWCI publikasinya, `mitra`/`sustained` = distinct institusi mitra & yang sustained. Per fakultas: agregat dari semua dosennya; `unggul` (topik unggulan) = bidang QS dengan rata-rata FWCI tertinggi dari publikasi fakultas itu (dihitung ulang, **bukan** dibaca dari sheet `Topik_Unggulan_Fakultas` — sheet itu QA manual tim data, sesuai §4 skema harus jadi metrik turunan aplikasi); `atRisk2022` = selisih jumlah sustained dengan/tanpa tahun tertua; `real:true` tetap diisi (dipakai pewarnaan bubble chart).

**`mitraSummary[]`** (pengganti `peluang[]`+`sustainedPartners[]`+`lapsedPartners[]`, Peluang Kerjasama): satu baris per `Institusi_Mitra`, dengan `years` = semua `tahun_terbit` publikasinya, `f` = rata-rata FWCI, `b` = bidang QS modus (tie-break: tahun terbit terbaru), `unit` = departemen ITS modus dari dosen-dosen yang terlibat, `hist` = daftar `{dosen, judul}` dari publikasinya. `getSustainedNow()`/`getBelumTerhitung()` memfilter `mitraSummary` pakai `isSustained()`; field `demoted` (pengganti konsep "lapsed") dihitung dari apakah mitra itu **pernah** sustained di window manapun sebelum sekarang.

**`allMitraItems[]`** (Simulator IRN): sama seperti `mitraSummary` + `naskah`/`detail[]` dari `Naskah_Pipeline` milik mitra itu (join `dosen_id → Dosen/Departemen/Fakultas`), `pipelineYear` = `estimasi_tahun_terbit` (ambil paling awal kalau >1 naskah).

**`collabRecords`** (Peta Kolaborasi): langsung dari `Publikasi.filter(institusi_mitra_id tidak kosong)` join `Institusi_Mitra` → `{negara, mitra, bidang, tahun}` per baris publikasi. Jauh lebih sederhana dari gabungan 3-array lama.

**Benchmark**: `rankData`/`univData` gabungkan ITS (dari `Metrik_ITS_Tahunan` tahun terbaru, `bidang_qs` kosong = agregat total; kalau breakdown per bidang belum diisi tim data, fallback rata-rata FWCI dari `Publikasi` ITS langsung dengan catatan kecil "(dihitung dari data publikasi)") + `Universitas_Pembanding`/`Universitas_Pembanding_FWCI`. `univDataIRN`/`irnBench` hanya isi ITS (pakai `computeForYear()` yang sama dengan Simulator — satu sumber kebenaran), pembanding diberi `v:null` + teks caption "data belum tersedia: [daftar nama]". `overlapData` di-pivot dari `Kolaborasi_Pembanding` (format long) — group by mitra, kolom `v[0]` (ITS) = cek `nama_institusi_mitra` ada di `Institusi_Mitra` ITS, kolom lain = cek match `universitas_pembanding_id`.

**Ringkasan Eksekutif**: `labels`/trend series dari `Metrik_ITS_Tahunan` (grain tahunan, `bidang_qs` kosong), `irnSeries` dihitung via `computeForYear()` yang sama dengan Simulator (memastikan angka IRN Ringkasan & Simulator selalu identik). Tambah `id` pada beberapa elemen teks statis (baris 141-160) supaya bisa diisi JS — perubahan atribut saja, bukan redesain markup/CSS.

## Perluasan `countryPaths` (Peta)

24 institusi mitra di data dummy mencakup 15 negara, semuanya sudah ada di 20 `countryPaths` — tidak ada gap untuk data dummy ini. Tambahkan guard di `boot()`: bandingkan `negara` unik di `Institusi_Mitra` vs `countryPaths`, kalau ada yang hilang tampilkan banner (`.banner-warn`) berisi daftar negara yang belum bisa diwarnai di peta — supaya kegagalan terlihat jelas, bukan senyap, saat data riil nanti ditambahkan.

## Verifikasi

1. **Cross-check independen** (`scripts/verify_derivations.py`, pandas): hitung ulang manual dari `Data_Master_IRN_FWCI_ITS.xlsx` — jumlah sustained per bidang, skor IRN mentah tahun berjalan, jumlah dosen watchlist, FWCI per fakultas — lalu bandingkan dengan yang benar-benar dirender app (baca dari DOM). Target: benar secara independen, bukan "sama dengan versi lama" (datanya memang berbeda: 13 mitra contoh → 24 mitra riil).
2. **QA visual dengan `_SAMPLE.xlsx`**: subset kecil skema identik yang meniru skenario lama (mitra cur 0/1/2, sustained aktif/berisiko, lapsed) — dipakai untuk membandingkan tampilan tiap halaman langsung dengan desain yang sudah tervalidasi.
3. **Checklist manual per halaman** dengan data dummy penuh: tidak ada `NaN`/`undefined`/`[object Object]`, toggle "Sertakan tahun tertua" konsisten di Peluang/Kinerja/Peta, modal (naskah, mitra list) terisi benar, semua dropdown filter terisi dari data nyata.
4. Jalankan via `python -m http.server 8000` dari root repo → `http://localhost:8000/prototype/dashboard_irn_fwci_its.html`, **dan** uji ulang dengan dobel-klik langsung file HTML (mode fallback `dataset.js`) — dua-duanya harus bekerja identik.

## File Kritis
- `prototype/dashboard_irn_fwci_its.html` — wiring script, tambah beberapa `id`
- `data/Data_Master_IRN_FWCI_ITS.xlsx` — sumber data (tidak diubah isinya)
- `docs/Skema_Data_Dashboard_IRN_FWCI_ITS.md` — acuan mapping
- Baru: `prototype/js/*.js` (9 file di atas), `scripts/convert_xlsx_to_json.py`, `data/Data_Master_IRN_FWCI_ITS_SAMPLE.xlsx`, `docs/RUNNING_LOCALLY.md`
