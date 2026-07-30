// Benchmark & gap analysis: gabungkan ITS (Metrik_ITS_Tahunan) dengan Universitas_Pembanding(+_FWCI),
// dan pivot Kolaborasi_Pembanding (format long) jadi matrix overlapData (format wide) sesuai skema §2.9.
const BENCHMARK_COLORS = ['#93A1AD', '#C88719', '#2F8F5B', '#0EA5A0', '#C1443C'];

function latestTotalRow(metrikRows){
  const totalRows = metrikRows.filter(r => !r.bidang_qs);
  if (!totalRows.length) return null;
  return totalRows.slice().sort((a, b) => b.tahun - a.tahun)[0];
}

function buildRankData(RAW){
  const itsRow = latestTotalRow(RAW.metrikItsTahunan);
  const its = { n: 'ITS', rank: itsRow ? numOrNull(itsRow.rank_qs_overall) : null, highlight: true };
  const others = RAW.universitasPembanding.map(u => ({ n: u.nama_universitas, rank: numOrNull(u.rank_qs_overall) }));
  return [...others, its].sort((a, b) => (a.rank === null ? Infinity : a.rank) - (b.rank === null ? Infinity : b.rank));
}

// Radar FWCI per bidang, edition-aware utk ITS: cari baris Metrik_ITS_Tahunan per bidang dgn `tahun`
// terbaru DI DALAM jendela edisi terpilih (fallback ke rata-rata FWCI publikasi ITS bertahun_terbit
// dlm jendela yg sama, kalau breakdown metrik belum diisi tim data). Pembanding dari
// Universitas_Pembanding_FWCI (data eksternal snapshot, tidak edition-aware -- tidak ada histori per edisi).
function buildUnivDataFwci(RAW, ed){
  const w = qsEditionWindow(ed);
  const perBidangRowsInWindow = RAW.metrikItsTahunan.filter(r => r.bidang_qs && r.tahun >= w.start && r.tahun <= w.end);
  let itsV, itsFallback = false;
  if (perBidangRowsInWindow.length) {
    itsV = BIDANG_QS.map(b => {
      const rows = perBidangRowsInWindow.filter(r => r.bidang_qs === b).sort((a, b2) => b2.tahun - a.tahun);
      return rows.length ? numOrNull(rows[0].fwci_rata_rata) : null;
    });
  } else {
    itsFallback = true;
    itsV = BIDANG_QS.map(b => {
      const vals = RAW.publikasi
        .filter(p => p.bidang_qs === b && p.tahun_terbit >= w.start && p.tahun_terbit <= w.end)
        .map(p => p.fwci).filter(v => typeof v === 'number');
      return vals.length ? round2(average(vals)) : null;
    });
  }
  const rest = RAW.universitasPembanding.map((u, i) => ({
    n: u.nama_universitas,
    v: BIDANG_QS.map(b => {
      const row = RAW.universitasPembandingFwci.find(x => x.universitas_id === u.id && x.bidang_qs === b);
      return row ? numOrNull(row.fwci) : null;
    }),
    color: BENCHMARK_COLORS[i % BENCHMARK_COLORS.length],
    w: 1,
  }));
  return { series: [{ n: 'ITS', v: itsV, color: '#0B2545', w: 3 }, ...rest], itsFallback };
}

// Radar IRN mentah PER BIDANG (L/ln P): hanya ITS yang bisa dihitung (computeForEdition, sama dengan
// Simulator). Universitas_Pembanding cuma punya L/P AGREGAT (total, bukan per bidang) -- lihat
// buildIrnBench() di bawah -- jadi breakdown per bidang untuk pembanding masih "belum tersedia" sampai
// skema punya tabel L/P per bidang.
function buildUnivDataIRN(RAW, ed){
  const itsCalc = computeForEdition(ed, new Set());
  return {
    series: [{ n: 'ITS', v: itsCalc.rows.map(r => r.raw), color: '#0B2545', w: 3 }],
    unavailableFor: RAW.universitasPembanding.map(u => u.nama_universitas),
  };
}
// Bar "IRN per dimensi" (L/P agregat, bukan per bidang): ITS dari computeForEdition, pembanding dari
// Universitas_Pembanding.L_negara_sustained_agregat / P_institusi_sustained_agregat (snapshot eksternal,
// tidak edition-aware).
function buildIrnBench(RAW, ed){
  const itsCalc = computeForEdition(ed, new Set());
  const rows = [{ n: 'ITS', L: itsCalc.totalL, P: itsCalc.totalP }];
  const unavailableFor = [];
  RAW.universitasPembanding.forEach(u => {
    const L = numOrNull(u.L_negara_sustained_agregat);
    const P = numOrNull(u.P_institusi_sustained_agregat);
    if (L !== null && P !== null) rows.push({ n: u.nama_universitas, L, P });
    else unavailableFor.push(u.nama_universitas);
  });
  return { rows, unavailableFor };
}

// Rata-rata FWCI seluruh publikasi ITS dlm jendela edisi (dipakai Ringkasan Eksekutif utk statFWCI) --
// window sama persis dgn IRN (qsEditionWindow), supaya FWCI juga benar-benar bergerak mengikuti
// dropdown edisi, menggantikan formula placeholder mockup (0.55+min(1,ed-2024)*0.03).
function itsAvgFwciInEdition(RAW, ed){
  const w = qsEditionWindow(ed);
  const vals = RAW.publikasi
    .filter(p => p.tahun_terbit >= w.start && p.tahun_terbit <= w.end)
    .map(p => p.fwci).filter(v => typeof v === 'number');
  return vals.length ? round2(average(vals)) : null;
}

// Pivot Kolaborasi_Pembanding (long: 1 baris per pasangan universitas x mitra) -> overlapData (wide).
function buildOverlapData(RAW){
  const itsMitraNames = new Set(RAW.institusiMitra.map(m => m.nama_institusi));
  const overlapCols = ['ITS', ...RAW.universitasPembanding.map(u => u.nama_universitas)];
  const groups = {};
  RAW.kolaborasiPembanding.forEach(r => {
    const key = r.nama_institusi_mitra + '|' + r.negara + '|' + r.bidang_qs;
    (groups[key] = groups[key] || []).push(r);
  });
  const overlapData = Object.values(groups).map(rows => {
    const { nama_institusi_mitra: m, negara: c, bidang_qs: b } = rows[0];
    const v = [
      itsMitraNames.has(m) ? 1 : 0,
      ...RAW.universitasPembanding.map(u => rows.some(r => r.universitas_id === u.id) ? 1 : 0),
    ];
    return { m, c, b, v };
  });
  return { overlapCols, overlapData };
}
