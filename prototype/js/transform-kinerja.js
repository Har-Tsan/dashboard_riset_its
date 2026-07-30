// Kinerja Riset: helper agregasi per-jendela-tahun di atas `org[]` (transform-org.js), dipakai utk
// mengganti hack fractional-scaling (pubScaleFraction/effSustained pakai tahun hardcode) di mockup --
// data riil punya Publikasi.tahun_terbit per baris, jadi window "Tahun QS"/"Tahun fokus" bisa dihitung
// ulang persis, bukan didekati dgn pecahan. Semua fungsi di sini murni baca `org[].pubs`/`.depts`/`.dosen`
// (hasil buildOrg()), tidak query RAW lagi.

// Jumlah publikasi dlm rentang tahun [start,end] inklusif, opsional difilter satu bidang QS.
function countPubsInRange(pubs, start, end, bidang){
  return (pubs || []).filter(p => p.y >= start && p.y <= end && (!bidang || bidang === 'all' || p.b === bidang)).length;
}

// "Tahun fokus" di Kinerja Riset bersifat kumulatif dari awal jendela edisi sampai tahun terpilih.
// scope='all' berarti TOTAL seluruh riwayat publikasi (tidak dibatasi jendela edisi sama sekali --
// persis semantik pubScaleFraction()===1 di mockup utk opsi "Semua tahun", yang mengembalikan
// facTotalP(f) apa adanya, bukan angka yang dipotong ke jendela ber-lag 5 tahun). Dipakai facValue() & Top 5.
function resolveFocusRange(editionYear, focusScope){
  if (!focusScope || focusScope === 'all') return { start: -Infinity, end: Infinity };
  const w = qsEditionWindow(editionYear);
  const y = +focusScope;
  return { start: w.start, end: y };
}

// Jumlah publikasi fakultas pada rentang tahun fokus (bidang='all' = seluruh bidang). Pengganti
// facValue(f,bidang) mockup yg dulu mengalikan agregat statis dgn pecahan (pubScaleFraction()).
function facValue(fac, bidang, editionYear, focusScope){
  const r = resolveFocusRange(editionYear, focusScope);
  return countPubsInRange(fac.pubs, r.start, r.end, bidang);
}

// Mitra sustained "efektif" per edisi: kalau edisi belum terkunci (proyeksi ke depan), mitra yang
// sustained-nya bertumpu pada publikasi tahun tertua jendela (atRisk2022) dianggap berisiko lepas
// begitu tahun itu keluar jendela -- sama seperti pendekatan mockup, hanya penanda locked/unlocked-nya
// sekarang isEditionLocked() (data-driven), bukan perbandingan `ed>2026` hardcode.
function effSustainedForEdition(fac, editionYear){
  return isEditionLocked(editionYear) ? fac.sustained : Math.max(0, fac.sustained - fac.atRisk2022);
}

// YoY riil: perubahan jumlah publikasi jendela edisi ini vs jendela edisi sebelumnya (ed-1), per
// fakultas. Pengganti naikPct fake mockup (3+(f.mitra%5)*2). null kalau jendela sebelumnya kosong
// (persentase tidak terdefinisi, bukan 0%).
function facYoYPercent(fac, editionYear){
  const cur = qsEditionWindow(editionYear);
  const prev = qsEditionWindow(editionYear - 1);
  const curCount = countPubsInRange(fac.pubs, cur.start, cur.end);
  const prevCount = countPubsInRange(fac.pubs, prev.start, prev.end);
  if (!prevCount) return null;
  return Math.round(((curCount - prevCount) / prevCount) * 100);
}

// Top 5: jumlah publikasi & mitra per dosen pada rentang tahun fokus (kumulatif, sama semantik dgn
// facValue). FWCI dosen TIDAK di-window (tetap agregat penuh dari buildOrg -- sama seperti mockup,
// yang juga tidak men-scale kolom FWCI Top 5).
function dosenPubCountInRange(dosen, start, end){
  return countPubsInRange(dosen.pubs, start, end);
}
function dosenMitraCountInRange(dosen, start, end){
  const ids = new Set((dosen.pubs || []).filter(p => p.y >= start && p.y <= end && p.mitraId).map(p => p.mitraId));
  return ids.size;
}

// Rentang tahun publikasi TERLUAS yang benar-benar ada di data (bukan jendela edisi ber-lag) --
// dipakai utk memberi label eksplisit pada opsi "Semua tahun" (facValue/Top 5), supaya jelas rentang
// tahun yang sebenarnya diagregasi (data riil bisa lebih lebar dari jendela edisi manapun).
function allPubYearRange(org){
  const years = org.flatMap(f => f.pubs).map(p => p.y);
  return { min: Math.min(...years), max: Math.max(...years) };
}

// Opsi dropdown departemen utk fakultas yg sedang dicentang di filter fakultas (populateSharedDeptFilter).
function buildDeptOptions(org, selectedFacIds){
  return org
    .filter(f => selectedFacIds.includes(f.id))
    .flatMap(f => f.depts.map(d => ({ value: d.name, facName: f.name })));
}

// Tren publikasi & FWCI rata-rata SUNGGUHAN per tahun kalender (bukan snapshot rata diulang), utk
// fakultas/departemen/bidang terpilih di filter shared Kinerja Riset. Publikasi.tahun_terbit sudah
// tersedia di data riil, jadi ini bukan lagi pendekatan ilustratif seperti di mockup.
function yearlyTrendSeries(org, facIds, deptNames, bidangs, startYear, endYear){
  const years = [];
  for (let y = startYear; y <= endYear; y++) years.push(y);
  const series = org
    .filter(f => facIds.includes(f.id))
    .map(f => {
      const pubs = f.depts
        .filter(d => deptNames.includes(d.name))
        .flatMap(d => d.pubs)
        .filter(p => bidangs.includes(p.b));
      const pubCounts = years.map(y => pubs.filter(p => p.y === y).length);
      const avgFwci = years.map(y => {
        const vals = pubs.filter(p => p.y === y && typeof p.f === 'number').map(p => p.f);
        return vals.length ? round2(average(vals)) : null;
      });
      return { facId: f.id, name: f.name, pubCounts, avgFwci };
    });
  return { years, series };
}
