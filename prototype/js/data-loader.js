// Memuat dataset dari data/dataset.json (mode server, via fetch) dengan fallback
// ke data/dataset.js (window.__DASHBOARD_DATA__, via <script src>) supaya dashboard
// tetap bisa dibuka langsung (dobel-klik file HTML) tanpa server lokal.
const REQUIRED_TABLES = [
  'fakultas', 'departemen', 'dosen', 'institusiMitra', 'publikasi',
  'publikasiPenulis', 'naskahPipeline', 'universitasPembanding',
  'universitasPembandingFwci', 'metrikItsTahunan', 'kolaborasiPembanding',
];

function validateDataset(d){
  if (!d || typeof d !== 'object') throw new Error('Dataset kosong atau tidak valid.');
  const missing = REQUIRED_TABLES.filter(k => !Array.isArray(d[k]));
  if (missing.length) throw new Error('Tabel data berikut tidak ditemukan: ' + missing.join(', '));
  const emptyMaster = ['fakultas', 'departemen', 'dosen', 'institusiMitra'].filter(k => d[k].length === 0);
  if (emptyMaster.length) throw new Error('Tabel master berikut kosong: ' + emptyMaster.join(', '));
  return d;
}

async function loadDataset(){
  try {
    const res = await fetch('../data/dataset.json');
    if (res.ok) return validateDataset(await res.json());
  } catch (e) {
    // fetch gagal (mis. dibuka via file://) - lanjut ke fallback di bawah
  }
  if (window.__DASHBOARD_DATA__) return validateDataset(window.__DASHBOARD_DATA__);
  throw new Error('Tidak bisa memuat data/dataset.json maupun data/dataset.js. Jalankan lewat server lokal atau pastikan data/dataset.js sudah dibuat (lihat docs/RUNNING_LOCALLY.md).');
}
