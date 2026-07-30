// Kinerja Riset: Fakultas -> Departemen -> Dosen, dengan metrik turunan dari
// join Dosen -> Publikasi_Penulis -> Publikasi(+Institusi_Mitra).
function buildOrg(RAW){
  const pubById = indexBy(RAW.publikasi, 'id');
  const authorLinksByDosen = groupByArray(RAW.publikasiPenulis, 'dosen_id');

  function pubsForDosenId(dosenId){
    const links = authorLinksByDosen[dosenId] || [];
    return links.map(l => pubById[l.publikasi_id]).filter(Boolean);
  }

  function sustainedMitraIdSet(includeOldest){
    const set = new Set();
    RAW.institusiMitra.forEach(m => {
      const years = RAW.publikasi.filter(p => p.institusi_mitra_id === m.id).map(p => p.tahun_terbit);
      if (isSustained(years, CURRENT_YEAR, includeOldest, CURRENT_YEAR - 4)) set.add(m.id);
    });
    return set;
  }
  const sustainedIncl = sustainedMitraIdSet(true);
  const sustainedExcl = sustainedMitraIdSet(false);

  function avgFwci(pubs){
    const vals = pubs.map(p => p.fwci).filter(v => typeof v === 'number');
    return vals.length ? round2(average(vals)) : 0;
  }
  function mitraIdSet(pubs){
    return new Set(pubs.filter(p => p.institusi_mitra_id).map(p => p.institusi_mitra_id));
  }
  function sustainedCountAmong(mitraIds, set){
    return [...mitraIds].filter(id => set.has(id)).length;
  }
  // Jumlah BARIS PUBLIKASI milik unit ini sendiri yang institusi mitranya sustained -- pendamping metrik
  // `sustained` (jumlah mitra, dihitung dari status institusi/Opsi A). Dua unit bisa sama-sama "menyentuh"
  // satu mitra sustained yang sama, tapi kontribusi publikasinya jauh berbeda -- ini yang membedakan.
  function countSustainedPubs(pubs, set){
    return pubs.filter(p => p.institusi_mitra_id && set.has(p.institusi_mitra_id)).length;
  }

  // Representasi ringkas tiap publikasi (tahun, bidang, FWCI, mitra) dipakai transform-kinerja.js utk
  // menghitung ulang agregat per-jendela-tahun (edisi QS/tahun fokus) tanpa perlu query RAW lagi.
  function pubRefs(pubs){
    return pubs.map(p => ({
      y: p.tahun_terbit,
      b: p.bidang_qs,
      f: typeof p.fwci === 'number' ? p.fwci : null,
      mitraId: p.institusi_mitra_id || null,
    }));
  }

  function dosenNode(d){
    const pubs = pubsForDosenId(d.id);
    const years = pubs.map(p => p.tahun_terbit);
    const p = sustainWindowCount(years, CURRENT_YEAR, true, CURRENT_YEAR - 4);
    const mitraIds = mitraIdSet(pubs);
    return {
      n: d.nama,
      p,
      f: avgFwci(pubs),
      mitra: mitraIds.size,
      sustained: sustainedCountAmong(mitraIds, sustainedIncl),
      sustainedPubCount: countSustainedPubs(pubs, sustainedIncl),
      pubs: pubRefs(pubs),
    };
  }

  function deptNode(dept, dosenRows){
    const dosen = dosenRows.map(dosenNode);
    const allPubs = dosenRows.flatMap(d => pubsForDosenId(d.id));
    const mitraIds = mitraIdSet(allPubs);
    return {
      id: dept.id,
      name: dept.nama_departemen,
      mitra: mitraIds.size,
      sustained: sustainedCountAmong(mitraIds, sustainedIncl),
      sustainedPubCount: countSustainedPubs(allPubs, sustainedIncl),
      pubs: pubRefs(allPubs), // dipakai transform-kinerja.js utk filter trend chart per-departemen
      dosen,
    };
  }

  function unggulBidang(pubs){
    const byBidang = groupByArray(pubs, 'bidang_qs');
    let best = '—', bestAvg = -Infinity;
    Object.keys(byBidang).forEach(b => {
      const vals = byBidang[b].map(p => p.fwci).filter(v => typeof v === 'number');
      if (!vals.length) return;
      const avg = average(vals);
      if (avg > bestAvg) { bestAvg = avg; best = b; }
    });
    return best;
  }

  function facultyNode(fak){
    const deptRows = RAW.departemen.filter(d => d.fakultas_id === fak.id);
    const dosenByDept = deptRows.map(dept => ({
      dept,
      dosenRows: RAW.dosen.filter(d => d.departemen_id === dept.id),
    }));
    const depts = dosenByDept.map(({ dept, dosenRows }) => deptNode(dept, dosenRows));
    const allPubs = dosenByDept.flatMap(({ dosenRows }) => dosenRows.flatMap(d => pubsForDosenId(d.id)));
    const mitraIds = mitraIdSet(allPubs);
    const sustainedInclCount = sustainedCountAmong(mitraIds, sustainedIncl);
    const sustainedExclCount = sustainedCountAmong(mitraIds, sustainedExcl);

    return {
      id: fak.id,
      name: fak.nama_fakultas,
      real: true, // dipakai facBubble (baris ~702) utk warna - semua fakultas asli pasca migrasi
      fwci: avgFwci(allPubs),
      mitra: mitraIds.size,
      sustained: sustainedInclCount,
      sustainedPubCount: countSustainedPubs(allPubs, sustainedIncl),
      atRisk2022: sustainedInclCount - sustainedExclCount,
      unggul: unggulBidang(allPubs),
      pubs: pubRefs(allPubs), // dipakai transform-kinerja.js utk agregasi per jendela edisi/tahun fokus
      depts,
    };
  }

  return RAW.fakultas.map(facultyNode);
}
