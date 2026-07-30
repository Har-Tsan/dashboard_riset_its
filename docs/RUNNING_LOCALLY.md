# Menjalankan Dashboard Secara Lokal

## 1. Update data (kalau `data/Data_Master_IRN_FWCI_ITS.xlsx` berubah)

```
python scripts/convert_xlsx_to_json.py
```

Menghasilkan `data/dataset.json` dan `data/dataset.js` dari isi workbook Excel. Kedua file ini **di-generate**, jangan diedit manual — edit Excel-nya lalu jalankan ulang script ini. Commit kedua file hasil generate supaya orang lain tidak perlu Python/openpyxl hanya untuk membuka dashboard.

Sheet `Panduan` dan `Topik_Unggulan_Fakultas` sengaja dilewati oleh converter — keduanya bukan data operasional (lihat catatan di `docs/Skema_Data_Dashboard_IRN_FWCI_ITS.md`).

Dependency: `pip install openpyxl`.

## 2. Buka dashboard-nya

Dashboard mendukung dua cara:

**A. Lewat server lokal (disarankan)** — supaya `data/dataset.json` bisa di-fetch:

```
python -m http.server 8000
```

lalu buka `http://localhost:8000/prototype/dashboard_irn_fwci_its.html` di browser.

**B. Dobel-klik langsung file HTML** — kalau tidak ada server, browser modern memblokir `fetch()` ke file lokal (`file://`). Dashboard otomatis fallback membaca `data/dataset.js` (yang berisi `window.__DASHBOARD_DATA__`) lewat tag `<script>` biasa, jadi tetap bisa dibuka tanpa command apa pun — asalkan `data/dataset.js` sudah pernah di-generate (langkah 1).

## 3. Update tahun berjalan

`CURRENT_YEAR` di `prototype/js/config.js` adalah konstanta manual — update tiap kali tahun berganti / ada rilis QS-SciVal baru, sejalan dengan cara `Metrik_ITS_Tahunan` diisi manual. Seluruh dropdown edisi QS (`editionSelect`, `benchEditionSelect`, `peluangEditionSelect`, `kinerjaEditionSelect`, `mapEditionSelect`, `simBaseYear`, `simYear`) digenerate otomatis dari `CURRENT_YEAR` (rentang `CURRENT_YEAR-2` s/d `CURRENT_YEAR+5`) oleh `populateEditionSelect()` saat boot — tidak perlu diedit manual. `LATEST_SCOPUS_DATA_YEAR` (dipakai untuk badge "Terkunci"/"Proyeksi" di tiap opsi) juga otomatis, diderivasi dari `tahun_terbit` terbaru di `Publikasi`/`Metrik_ITS_Tahunan`, bukan konstanta manual.

## 4. Data sample untuk QA visual

`data/Data_Master_IRN_FWCI_ITS_SAMPLE.xlsx` — subset kecil dengan skema identik, isinya sengaja meniru skenario 22 mitra ilustratif dari prototipe lama (kombinasi cur 0/1/2, sustained aktif/berisiko, lapsed). Dipakai untuk membandingkan tampilan tiap halaman dengan desain yang sudah tervalidasi, bukan pengganti data utama. Regenerasi lewat `python scripts/build_sample_dataset.py`. Untuk memakainya sementara, jalankan converter dengan argumen path sample lalu arahkan browser ke server yang sama:

```
python scripts/convert_xlsx_to_json.py data/Data_Master_IRN_FWCI_ITS_SAMPLE.xlsx data
```

(Ini akan MENIMPA `data/dataset.json`/`dataset.js` dengan versi sample — jalankan ulang langkah 1 tanpa argumen untuk kembali ke data asli setelah selesai QA.)

## 5. Verifikasi cepat

Cek independen (pandas) untuk membandingkan angka turunan (sustained/IRN/watchlist) terhadap hitungan manual dari Excel:

```
pip install pandas
python scripts/verify_derivations.py
```
