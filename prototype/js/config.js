// Konstanta konfigurasi dashboard. Update CURRENT_YEAR manual tiap tahun berganti
// (sejalan dengan cara Metrik_ITS_Tahunan diisi manual tiap rilis QS/SciVal baru).
const CURRENT_YEAR = 2026;
const WINDOW_SIZE = 5;          // jendela publikasi berjalan (tahun)
const SUSTAIN_MIN = 3;          // jumlah publikasi minimum dalam jendela agar dianggap "sustained"
const WATCHLIST_MIN_PUB = 8;    // ambang jumlah publikasi utk watchlist dosen
const WATCHLIST_MAX_FWCI = 0.6; // ambang FWCI utk watchlist dosen
// Lag metodologi SciVal: publikasi yang dihitung utk edisi QS/IRN tahun Y adalah [Y-7,Y-3], bukan [Y-4,Y].
// Dipakai KHUSUS mode "proyeksi QS" (Simulator IRN, Ringkasan Eksekutif) -- lihat qsEditionWindow() di domain.js.
const QS_LAG_YEARS = 3;

// Tahun data Scopus/SciVal terbaru yang benar-benar tersedia -- DIDERIVASI dari data (bukan hardcode
// manual), lihat deriveLatestScopusDataYear() di domain.js. Diisi oleh boot() sebelum transform lain
// dipanggil karena isEditionLocked()/computeForEdition() bergantung padanya.
let LATEST_SCOPUS_DATA_YEAR;

// 5 kategori bidang QS -- konstanta aplikasi (bukan data mentah dari sheet manapun), dipakai di
// Kinerja Riset, Simulator IRN, dan Benchmark.
const BIDANG_QS = [
  'Engineering and Technology',
  'Natural Sciences',
  'Life Sciences and Medicine',
  'Social Sciences and Management',
  'Arts and Humanities',
];
