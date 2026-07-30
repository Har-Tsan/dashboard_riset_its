# Prompt Vibe Coding — Migrasi `mockup_kinerja_v3` ke Data Eksternal

> **Cara pakai:** tempel seluruh isi file ini sebagai pesan pertama ke Claude Code (atau Claude Desktop Code tab) di project yang sama. File ini SUDAH memuat semua konteks yang biasanya perlu diketik ulang, supaya token kamu tidak habis untuk menjelaskan ulang latar belakang.

---

## 0. Konteks — baca dulu sebelum coding apa pun

Ini adalah **iterasi lanjutan** dari `execution-plan-migrasi.md` yang sudah pernah dieksekusi terhadap `prototype/dashboard_irn_fwci_its.html` (versi lama, 1152 baris). Sejak itu, tampilan direvisi besar-besaran menjadi **`mockup_kinerja_v3.html`** (1667 baris) — ini sekarang **satu-satunya acuan tampilan/UX yang berlaku**, menggantikan prototipe lama. Anggap prototipe lama usang; jangan mundur ke strukturnya.

Empat file lain di project (`Skema_Data_Dashboard_IRN_FWCI_ITS.md`, `Data_Master_IRN_FWCI_ITS.xlsx`, `RUNNING_LOCALLY.md`, `CLAUDE.md`) **tetap berlaku dan tidak berubah** — v3 tidak butuh perubahan skema data sama sekali (lihat §2). `CLAUDE.md` tetap mengikat: **jangan mulai coding sebelum rencana final disetujui.**

### Yang sudah dikonfirmasi dari siklus sebelumnya (tetap berlaku)
- Loader dua mode: `fetch` JSON (server lokal) **dan** fallback `<script src>` (dobel-klik file).
- Chart Benchmark yang datanya belum ada tetap ditampilkan untuk ITS saja + catatan "data belum tersedia".
- `CURRENT_YEAR` konstanta manual di `config.js`, diupdate admin tiap tahun.
- Boleh ada `Data_Master_IRN_FWCI_ITS_SAMPLE.xlsx` untuk QA visual.
- Struktur file kerja: `prototype/js/{config,domain,data-loader,transform-*}.js`, `data/*.json|js|xlsx`, `scripts/*.py`.

---

## 1. Delta terbesar: sistem "Edisi QS" (BARU di v3)

Ini perubahan paling signifikan dibanding rencana lama, dan **wajib dipahami sebelum menulis kode apa pun**.

v3 menambahkan konsep **edisi QS** (`editionSelect`, `benchEditionSelect`, `peluangEditionSelect`, `kinerjaEditionSelect`, `mapEditionSelect`) yang muncul di hampir semua halaman: Ringkasan, Benchmark, Peluang Kerjasama, Kinerja Riset, Peta Kolaborasi. Logikanya:

```js
const LATEST_SCOPUS_DATA_YEAR = 2027; // data Scopus/SciVal terbaru yang tersedia
const QS_LAG_YEARS = 3;               // QS merilis edisi dgn lag 3 tahun dari data
function qsEditionWindow(ed){ return { start: ed-QS_LAG_YEARS-4, end: ed-QS_LAG_YEARS }; }
function isEditionLocked(ed){ return qsEditionWindow(ed).end <= LATEST_SCOPUS_DATA_YEAR; }
function pubsInEditionWindow(item, ed, checkedSet, idx){ /* hitung publikasi dlm window edisi + opsional pipeline */ }
function computeForEdition(ed, checkedSet){ /* L/P/skor IRN utk edisi tsb, dari allMitraItems */ }
function classifyForEdition(ed){ /* ... */ }
```

**Temuan penting (sudah diverifikasi terhadap `Data_Master_IRN_FWCI_ITS.xlsx`): logika ini 100% bisa dihitung dari data mentah yang sudah ada** (`Publikasi.tahun_terbit`, `Naskah_Pipeline.estimasi_tahun_terbit`) ditambah **dua konstanta baru** (`LATEST_SCOPUS_DATA_YEAR`, `QS_LAG_YEARS`). **Tidak perlu kolom/tabel baru di skema Excel.** Perlakukan kedua konstanta ini sama seperti `CURRENT_YEAR`: masuk ke `config.js`, diupdate manual oleh admin.

Ini artinya §1 prinsip desain di `Skema_Data_Dashboard_IRN_FWCI_ITS.md` (status dihitung, bukan diisi manual) **tetap valid dan tidak dilanggar** oleh fitur edisi ini — cukup ditegaskan ulang di `domain.js`.

**Keputusan yang perlu dikonfirmasi user sebelum coding (jangan diasumsikan sendiri):**
1. Apakah `LATEST_SCOPUS_DATA_YEAR` dan `QS_LAG_YEARS` memang dimaksudkan sebagai konstanta manual di `config.js` (selaras `CURRENT_YEAR`), atau harus mengikuti tahun terbaru yang benar-benar ada di sheet `Publikasi`/`Metrik_ITS_Tahunan`?
2. Rentang opsi `<select>` edisi di tiap halaman (`editionSelect`, dst.) — apakah daftar tahun edisinya digenerate otomatis dari `CURRENT_YEAR`/konstanta di atas, atau tetap hardcode seperti di mockup?
3. `isEditionLocked(ed)` dipakai untuk menandai edisi yang "sudah pasti" (datanya lengkap) vs edisi proyeksi ke depan — pastikan istilah/UI label ini konsisten dgn tim data (mis. label "terkunci"/"proyeksi" di dropdown).

---

## 2. Verifikasi struktur data — TIDAK ADA perubahan skema yang dibutuhkan

Sudah dicek langsung: kolom di `Data_Master_IRN_FWCI_ITS.xlsx` (sheet `Fakultas`, `Departemen`, `Dosen`, `Institusi_Mitra`, `Publikasi`, `Publikasi_Penulis`, `Naskah_Pipeline`, `Universitas_Pembanding`, `Universitas_Pembanding_FWCI`, `Metrik_ITS_Tahunan`, `Kolaborasi_Pembanding`, `Topik_Unggulan_Fakultas`) **identik** dengan `Skema_Data_Dashboard_IRN_FWCI_ITS.md`. Instruksi user "jangan mengubah struktur data" **bisa dipatuhi sepenuhnya** — semua fitur baru di v3 (termasuk sistem edisi) adalah hasil hitungan aplikasi dari kolom yang sudah ada.

Jangan improvisasi tabel/kolom baru. Kalau selama coding ternyata ada kebutuhan data yang benar-benar tidak bisa dihitung dari skema saat ini, **berhenti dan tanyakan ke user dulu**, jangan menambah kolom sendiri (sesuai `CLAUDE.md`).

---

## 3. Yang masih sama seperti prototipe lama (dan masih perlu dibereskan)

`mockup_kinerja_v3.html` masih murni prototipe visual: seluruh data literal JS hardcoded, termasuk hal-hal yang di rencana lama sudah ditandai untuk dihapus:

- `genDosen(45)` + `allDosen = [...namedDosen, ...genDosen(45)]` — generator dummy, **hapus total**, ganti query nyata ke seluruh `Dosen`.
- `bgResidual` (dipakai di Simulator) — **hapus total** sesuai §6 skema, sekarang semua mitra riil.
- Array literal yang harus diganti hasil transformasi: `peluang`, `sustainedPartners`, `lapsedPartners`, `org`, `allMitraItems`, `overlapData`, `univFwciStatic`, `irnBenchStatic`, `rankDataStatic`, `countryPaths` (aset kartografi — ini tetap statis, bukan data).
- `estYear(bulan)` — kalau masih ada pemakaiannya, ganti dgn `Naskah_Pipeline.estimasi_tahun_terbit` langsung (sama seperti keputusan lama).
- Magic number watchlist (`p>=8&&f<0.6`) — konsolidasi ke `isWatchlist()` di `config.js`.

## 4. Yang baru di v3 dan perlu transform tambahan

- **Multi-select filter framework** (`buildMsDropdown`, `toggleMsDropdown`, `populateSharedFilters`, `getSharedSelection`, `renderSharedAll`) di halaman Kinerja Riset — filter fakultas/departemen kini multi-select, bukan single dropdown. Ini murni UI state, tidak butuh data baru, tapi pastikan opsi filter (`facOptions`, dept options) digenerate dari `Dosen`/`Departemen` hasil transformasi, bukan dari `allDosen` dummy.
- **Trend chart per beberapa dosen sekaligus** (`renderDosenChartMulti`, `renderTrendCharts2`, `renderTop5`) — pastikan sumber datanya tetap satu jalur dari `org[]`/`Publikasi_Penulis`, jangan bikin agregasi paralel yang bisa tidak sinkron dengan Kinerja Riset lainnya.
- **Simulator**: `simBaseYear` + `simYear` (2026–2030) — cek apakah `computeForYear()` lama masih dipertahankan apa adanya atau berubah jadi `computeForEdition()`. Kalau keduanya dipertahankan (base year window biasa vs edition window), pastikan **satu sumber kebenaran**: kedua fungsi harus memanggil helper jendela publikasi yang sama di `domain.js`, jangan duplikasi logika `pubsInWindow` vs `pubsInEditionWindow`.
- **Ringkasan Eksekutif** kini punya `editionSelect` juga — cek apakah ini menggantikan logika lama (`renderTopRec()`/`closeCount` pakai window tetap `CURRENT_YEAR`, lepas dari toggle) atau berdampingan. **Jangan asumsikan sendiri** — ini salah satu titik paling berisiko salah pindah logika, konfirmasi ke user perilaku yang benar sebelum wiring.

---

## 5. Struktur file kerja (lanjutan dari sebelumnya, disesuaikan)

```
prototype/
  dashboard_irn_fwci_its.html   -> GANTI referensi jadi mockup_kinerja_v3.html sebagai basis, blok <script> data dipecah ke luar
  js/
    config.js          # CURRENT_YEAR, LATEST_SCOPUS_DATA_YEAR (baru), QS_LAG_YEARS (baru),
                        # WINDOW_SIZE=5, SUSTAIN_MIN=3, WATCHLIST_MIN_PUB=8, WATCHLIST_MAX_FWCI=0.6
    country-paths.js   # countryPaths[] dipindah apa adanya
    domain.js           # sustainWindowCount(), isSustained(), fmtNumOrDash(),
                        # qsEditionWindow(), isEditionLocked(), pubsInEditionWindow() (satu implementasi dipakai semua halaman edisi)
    data-loader.js
    transform-org.js
    transform-peluang.js
    transform-simulator.js     # computeForYear() DAN/ATAU computeForEdition() — konfirmasi dulu (lihat §4)
    transform-peta.js
    transform-benchmark.js
    transform-kinerja.js       # BARU — multi-select filter state + agregasi multi-dosen, terpisah dari transform-org agar reusable
data/            (tidak berubah)
scripts/         (tidak berubah, convert_xlsx_to_json.py tetap valid krn skema sama)
docs/            (tidak berubah)
```

---

## 6. Tahapan implementasi (ringkas — detail teknis mengikuti pola `execution-plan-migrasi.md`)

1. **Fondasi**: `config.js` (tambah 2 konstanta edisi), `domain.js` (tambah helper edisi + reuse helper window lama), `data-loader.js` (tidak berubah dari sebelumnya kalau sudah ada).
2. **Transform per entitas**: reuse `transform-org/peluang/peta/benchmark.js` yang sudah ada kalau file itu memang sudah pernah dibangun dari `execution-plan-migrasi.md` — cek dulu apakah repo sudah punya file-file ini sebelum menulis ulang dari nol. Tambahkan `transform-kinerja.js` untuk kebutuhan filter multi-select + multi-dosen chart. Update `transform-simulator.js` untuk mendukung mode edisi bila dikonfirmasi di §4.
3. **Wiring**: bungkus `<script>` utama v3 ke `boot()`, ganti semua literal array ke `D.X` hasil transformasi, wiring tiap `*EditionSelect`/`*FocusYear` ke helper edisi yang sama.
4. **Hapus yang usang**: `genDosen`, `bgResidual`, `estYear`, magic number watchlist — persis seperti §3.
5. **Verifikasi**: jalankan ulang `scripts/verify_derivations.py` (kalau sudah ada) + tambah kasus verifikasi khusus untuk logika edisi (`computeForEdition` vs hitung manual pandas untuk minimal 2 edisi berbeda). Checklist manual per halaman v3 — termasuk cek dropdown edisi konsisten antar halaman (pilih edisi X di Kinerja Riset seharusnya tidak diam-diam mempengaruhi halaman lain kecuali memang didesain shared).

---

## 7. Yang harus TIDAK diubah

- Tampilan, layout, chart, interaksi persis seperti `mockup_kinerja_v3.html` — ini referensi UI/UX final, bukan draft.
- Struktur/skema `Data_Master_IRN_FWCI_ITS.xlsx` — lihat §2.
- Prinsip inti: status/skor turunan dihitung aplikasi, tidak ada kolom manual untuk sustained/watchlist/kuadran/dll.

## 8. Sebelum mulai coding

Sesuai `CLAUDE.md`: **susun rencana teknis final (nama file, urutan tahap, keputusan §1 & §4) dan minta persetujuan user dulu**, baru mulai menulis kode. Kalau repo sudah punya hasil implementasi dari `execution-plan-migrasi.md` sebelumnya, mulai dengan `view` struktur folder yang ada supaya tidak menulis ulang file yang sudah benar.
