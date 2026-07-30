// Peta Kolaborasi: collabRecords langsung dari Publikasi (yang punya mitra) join Institusi_Mitra.
// Jauh lebih sederhana dari gabungan 3-array (allMitraItems+peluang+lapsedPartners) di prototipe lama.
function buildCollabRecords(RAW){
  const mitraById = indexBy(RAW.institusiMitra, 'id');
  return RAW.publikasi
    .filter(p => p.institusi_mitra_id)
    .map(p => {
      const m = mitraById[p.institusi_mitra_id];
      return { negara: m.negara, mitra: m.nama_institusi, bidang: p.bidang_qs, tahun: p.tahun_terbit };
    });
}
