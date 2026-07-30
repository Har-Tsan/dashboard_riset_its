// Simulator IRN: allMitraItems (seluruh Institusi_Mitra + Naskah_Pipeline terkait)
// dan computeForEdition() -- TANPA bgResidual (lihat docs/Skema_Data_Dashboard_IRN_FWCI_ITS.md §6).
function buildAllMitraItems(RAW){
  const pubsByMitra = groupByArray(RAW.publikasi.filter(p => p.institusi_mitra_id), 'institusi_mitra_id');
  const naskahByMitra = groupByArray(RAW.naskahPipeline, 'institusi_mitra_id');
  const dosenById = indexBy(RAW.dosen, 'id');
  const deptById = indexBy(RAW.departemen, 'id');
  const fakultasById = indexBy(RAW.fakultas, 'id');

  function dominantBidang(pubs){
    const counts = {}, latest = {};
    pubs.forEach(p => {
      counts[p.bidang_qs] = (counts[p.bidang_qs] || 0) + 1;
      latest[p.bidang_qs] = Math.max(latest[p.bidang_qs] || 0, p.tahun_terbit);
    });
    let best = null, bestScore = -1;
    Object.keys(counts).forEach(b => {
      const score = counts[b] * 10000 + latest[b];
      if (score > bestScore) { bestScore = score; best = b; }
    });
    return best;
  }

  return RAW.institusiMitra
    .map(m => {
      const pubs = pubsByMitra[m.id] || [];
      const years = pubs.map(p => p.tahun_terbit);
      const fVals = pubs.map(p => p.fwci).filter(v => typeof v === 'number');

      const naskahRows = naskahByMitra[m.id] || [];
      const detail = naskahRows.map(n => {
        const d = dosenById[n.dosen_id];
        const dept = d ? deptById[d.departemen_id] : null;
        const fak = dept ? fakultasById[dept.fakultas_id] : null;
        return {
          judul: n.judul,
          status: n.status_naskah,
          jurnal: n.target_jurnal,
          penulis: d ? d.nama : '-',
          dept: dept ? dept.nama_departemen : '-',
          fakultas: fak ? fak.nama_fakultas : '-',
        };
      });
      const pipelineYear = naskahRows.length ? Math.min(...naskahRows.map(n => n.estimasi_tahun_terbit)) : null;

      // Kalau belum ada publikasi sama sekali (pubs kosong) tapi ada naskah pipeline, pakai bidang_qs
      // dari naskah sebagai fallback -- supaya item ini tetap dihitung ke bidang yang benar begitu
      // naskahnya "terbit" dalam simulasi, bukan jatuh ke '-' yang bukan key valid di computeForEdition().
      const bidang = dominantBidang(pubs) || modeOf(naskahRows.map(n => n.bidang_qs)) || '-';

      return {
        n: m.nama_institusi,
        c: m.negara,
        b: bidang,
        f: fVals.length ? round2(average(fVals)) : null, // null = tidak ada data FWCI, bukan FWCI=0
        years,
        naskah: naskahRows.length,
        pipelineYear,
        detail,
      };
    })
    // Institusi tanpa riwayat publikasi sama sekali DAN tanpa naskah pipeline tidak relevan untuk
    // simulasi IRN (tidak pernah bisa "sustained"/berkontribusi skor) -- jangan ikut ditampilkan.
    .filter(item => item.years.length > 0 || item.naskah > 0);
}

// Mode "proyeksi QS" (bukan operasional) -- editionYear di sini adalah EDISI QS, bukan tahun kalender
// biasa. Jendela publikasinya ber-lag (lihat qsEditionWindow() di domain.js), meniru metodologi SciVal.
// Satu implementasi dipakai konsisten di 5 halaman (Ringkasan, Benchmark, Peluang, Kinerja, Simulator)
// -- lihat prompt-vibe-coding-migrasi-v3.md §4 soal risiko duplikasi pubsInWindow vs pubsInEditionWindow.
function pubsInEditionWindow(years, editionYear, pipelineYear, naskahCount, checked){
  let count = sustainWindowCountQS(years, editionYear, true, qsEditionWindow(editionYear).start);
  const qsWin = qsEditionWindow(editionYear);
  // Naskah pipeline (pipelineYear=P) hanya relevan kalau: (a) dicentang, (b) P jatuh di jendela
  // ber-lag edisi ini, DAN (c) P benar-benar di luar data Scopus/SciVal yang sudah ada (P >
  // LATEST_SCOPUS_DATA_YEAR) -- kalau P sudah <= LATEST_SCOPUS_DATA_YEAR, publikasinya seharusnya
  // sudah masuk hitungan `years` di atas (sudah "terbit" secara data), bukan proyeksi lagi.
  if (checked && pipelineYear !== null && pipelineYear > LATEST_SCOPUS_DATA_YEAR && pipelineYear >= qsWin.start && pipelineYear <= qsWin.end) {
    count += naskahCount;
  }
  return count;
}
function yearWhenLapses(item){
  for (let Y = CURRENT_YEAR; Y <= CURRENT_YEAR + 8; Y++) {
    if (pubsInEditionWindow(item.years, Y, item.pipelineYear, item.naskah, false) < SUSTAIN_MIN) return Y;
  }
  return null;
}
// allMitraItems adalah variabel global diisi boot() sebelum fungsi ini dipanggil.
function computeForEdition(editionYear, checkedSet){
  const cs = checkedSet || new Set();
  const agg = {};
  BIDANG_QS.forEach(b => { agg[b] = { countries: new Set(), institutions: new Set() }; });
  allMitraItems.forEach((item, i) => {
    const count = pubsInEditionWindow(item.years, editionYear, item.pipelineYear, item.naskah, cs.has(i));
    if (count >= SUSTAIN_MIN && agg[item.b]) { agg[item.b].countries.add(item.c); agg[item.b].institutions.add(item.n); }
  });
  let totalL = 0, totalP = 0;
  const rows = BIDANG_QS.map(b => {
    const L = agg[b].countries.size, P = agg[b].institutions.size;
    totalL += L; totalP += P;
    const raw = P > 1 ? (L / Math.log(P)) : null;
    return { b, L, P, raw };
  });
  const totalRaw = totalP > 1 ? (totalL / Math.log(totalP)) : 0;
  const idx = Math.min(1, totalRaw / 10);
  return { rows, totalL, totalP, totalRaw, idx, agg };
}
// Klasifikasi mitra utk edisi tertentu (dipakai Peluang Kerjasama & Ringkasan Eksekutif):
// sustained (>=3 publikasi dlm jendela), hampir (tepat 2, tinggal 1 lagi), tidak_aktif (sustained di
// edisi sebelumnya tapi tidak lagi di edisi ini), lainnya (sisanya).
function classifyForEdition(editionYear){
  return allMitraItems.map((item, i) => {
    const count = pubsInEditionWindow(item.years, editionYear, item.pipelineYear, item.naskah, false);
    const prevCount = pubsInEditionWindow(item.years, editionYear - 1, item.pipelineYear, item.naskah, false);
    let status = 'lainnya';
    if (count >= SUSTAIN_MIN) status = 'sustained';
    else if (count === SUSTAIN_MIN - 1) status = 'hampir';
    else if (prevCount >= SUSTAIN_MIN) status = 'tidak_aktif';
    return Object.assign({}, item, { count, status });
  });
}
