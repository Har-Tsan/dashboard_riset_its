/* ---------- Aturan bisnis inti (dipakai di semua halaman) ---------- */

// Jumlah publikasi dalam jendela WINDOW_SIZE tahun berjalan sampai targetYear.
// includeOldest=false membuang tahun tertua jendela (dipakai toggle "Sertakan tahun tertua").
function sustainWindowCount(years, targetYear, includeOldest, oldestYear){
  const lo = targetYear - (WINDOW_SIZE - 1);
  let ys = (years || []).filter(y => y >= lo && y <= targetYear);
  if (!includeOldest) ys = ys.filter(y => y !== oldestYear);
  return ys.length;
}
function isSustained(years, targetYear, includeOldest, oldestYear){
  return sustainWindowCount(years, targetYear, includeOldest, oldestYear) >= SUSTAIN_MIN;
}
function isWatchlist(x){
  return x.p >= WATCHLIST_MIN_PUB && x.f < WATCHLIST_MAX_FWCI;
}

// ---- Mode "proyeksi QS" (BERBEDA dari mode operasional di atas -- JANGAN disatukan) ----
// Metodologi SciVal sesungguhnya: publikasi yang dihitung utk edisi QS/IRN tahun Y adalah jendela
// ber-lag [Y-QS_LAG_YEARS-(WINDOW_SIZE-1), Y-QS_LAG_YEARS], bukan [Y-4,Y] real-time seperti
// sustainWindowCount(). Dipakai HANYA di Simulator IRN & Ringkasan Eksekutif; sustainWindowCount()
// tetap dipakai apa adanya (tidak diubah) di Peluang Kerjasama, Kinerja Riset, dan Peta Kolaborasi.
function qsEditionWindow(editionYear){
  return { start: editionYear - QS_LAG_YEARS - (WINDOW_SIZE - 1), end: editionYear - QS_LAG_YEARS };
}
function sustainWindowCountQS(years, editionYear, includeOldest, oldestYear){
  const { start, end } = qsEditionWindow(editionYear);
  let ys = (years || []).filter(y => y >= start && y <= end);
  if (!includeOldest) ys = ys.filter(y => y !== oldestYear);
  return ys.length;
}
// Edisi dianggap "terkunci" (skornya sudah ditentukan oleh publikasi yang sudah benar-benar terbit,
// bukan proyeksi) kalau ujung jendela publikasinya sudah <= tahun data Scopus/SciVal terbaru yang ada.
// Satu-satunya penanda locked/official dipakai di seluruh halaman (Ringkasan, Benchmark, Peluang,
// Kinerja, Peta, Simulator) -- tidak ada konstanta "edisi resmi" terpisah.
function isEditionLocked(editionYear){
  return qsEditionWindow(editionYear).end <= LATEST_SCOPUS_DATA_YEAR;
}
// Tahun data Scopus/SciVal terbaru yang benar-benar tersedia, DIDERIVASI dari data mentah (bukan
// konstanta manual) -- max tahun_terbit publikasi & tahun Metrik_ITS_Tahunan. Dipanggil sekali di
// boot() sebelum transform lain, hasilnya disimpan ke LATEST_SCOPUS_DATA_YEAR (config.js).
function deriveLatestScopusDataYear(RAW){
  const pubYears = RAW.publikasi.map(p => p.tahun_terbit);
  const metrikYears = RAW.metrikItsTahunan.map(m => m.tahun);
  return Math.max(...pubYears, ...metrikYears);
}

// Format angka yang kadang berisi placeholder teks ("Belum terverifikasi", "Belum dirilis QS").
function numOrNull(v){
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function fmtNumOrDash(v){
  const n = numOrNull(v);
  return n !== null ? n : '—';
}
/* ---------- Utilitas data generik (join/agregasi kecil) ---------- */
function indexBy(arr, key){
  const o = {};
  arr.forEach(r => { o[r[key]] = r; });
  return o;
}
function groupByArray(arr, key){
  const o = {};
  arr.forEach(r => { const k = r[key]; (o[k] = o[k] || []).push(r); });
  return o;
}
function average(nums){
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}
function round2(n){
  return Math.round(n * 100) / 100;
}
// Nilai modus (paling sering muncul) dari sebuah array; null kalau kosong.
function modeOf(values){
  if (!values.length) return null;
  const counts = {};
  values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  let best = values[0], bestCount = 0;
  values.forEach(v => { if (counts[v] > bestCount) { best = v; bestCount = counts[v]; } });
  return best;
}
