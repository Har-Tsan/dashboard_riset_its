"""Hitung ulang metrik turunan kunci secara independen dari Data_Master_IRN_FWCI_ITS.xlsx
(bukan dari kode JS dashboard), untuk dibandingkan manual dengan angka yang benar-benar
dirender di dashboard (Ringkasan Eksekutif / Kinerja Riset / Simulator IRN).

Tidak menjamin "sama dengan versi prototipe lama" -- datanya memang beda (13 mitra contoh
-> seluruh mitra riil). Tujuannya memastikan angka dashboard BENAR secara independen.

Jalankan: python scripts/verify_derivations.py [path/to/workbook.xlsx]
"""
import math
import sys
from pathlib import Path
from collections import defaultdict

import openpyxl

CURRENT_YEAR = 2026
WINDOW = 5
SUSTAIN_MIN = 3
WATCHLIST_MIN_PUB = 8
WATCHLIST_MAX_FWCI = 0.6


def rows(ws):
    it = ws.iter_rows(values_only=True)
    headers = [h for h in next(it)]
    out = []
    for r in it:
        if all(v is None for v in r):
            continue
        out.append(dict(zip(headers, r)))
    return out


def main(xlsx_path):
    wb = openpyxl.load_workbook(xlsx_path, data_only=True)
    publikasi = rows(wb["Publikasi"])
    penulis = rows(wb["Publikasi_Penulis"])
    dosen = rows(wb["Dosen"])
    departemen = rows(wb["Departemen"])
    fakultas = rows(wb["Fakultas"])
    mitra = rows(wb["Institusi_Mitra"])

    pub_by_id = {p["id"]: p for p in publikasi}
    lo = CURRENT_YEAR - (WINDOW - 1)

    # --- Skor IRN mentah (L / ln P) per bidang, tahun berjalan ---
    print("=== Skor IRN mentah per bidang (tahun %d, jendela %d-%d) ===" % (CURRENT_YEAR, lo, CURRENT_YEAR))
    agg = defaultdict(lambda: {"countries": set(), "institutions": set()})
    pubs_by_mitra = defaultdict(list)
    for p in publikasi:
        if p["institusi_mitra_id"]:
            pubs_by_mitra[p["institusi_mitra_id"]].append(p)
    for m in mitra:
        yrs = [p["tahun_terbit"] for p in pubs_by_mitra.get(m["id"], []) if lo <= p["tahun_terbit"] <= CURRENT_YEAR]
        if len(yrs) >= SUSTAIN_MIN:
            bidang_pubs = [p for p in pubs_by_mitra[m["id"]] if lo <= p["tahun_terbit"] <= CURRENT_YEAR]
            bidangs = {p["bidang_qs"] for p in bidang_pubs}
            for b in bidangs:
                agg[b]["countries"].add(m["negara"])
                agg[b]["institutions"].add(m["nama_institusi"])
    total_l, total_p = 0, 0
    for b, v in agg.items():
        L, P = len(v["countries"]), len(v["institutions"])
        total_l += L; total_p += P
        raw = (L / math.log(P)) if P > 1 else None
        print(f"  {b}: L={L} P={P} raw={raw:.2f}" if raw is not None else f"  {b}: L={L} P={P} raw=(belum cukup data)")
    total_raw = (total_l / math.log(total_p)) if total_p > 1 else 0
    idx = min(1, total_raw / 10)
    print(f"  TOTAL: L={total_l} P={total_p} idx={idx:.2f}")

    # --- Watchlist dosen ---
    print("\n=== Watchlist dosen (>=%d publikasi 5th, FWCI<%.1f) ===" % (WATCHLIST_MIN_PUB, WATCHLIST_MAX_FWCI))
    pubs_by_dosen = defaultdict(list)
    for link in penulis:
        pub = pub_by_id.get(link["publikasi_id"])
        if pub:
            pubs_by_dosen[link["dosen_id"]].append(pub)
    watch_count = 0
    for d in dosen:
        pubs = pubs_by_dosen.get(d["id"], [])
        yrs = [p["tahun_terbit"] for p in pubs if lo <= p["tahun_terbit"] <= CURRENT_YEAR]
        fs = [p["fwci"] for p in pubs if isinstance(p["fwci"], (int, float))]
        favg = sum(fs) / len(fs) if fs else 0
        if len(yrs) >= WATCHLIST_MIN_PUB and favg < WATCHLIST_MAX_FWCI:
            watch_count += 1
            print(f"  {d['nama']}: {len(yrs)} publikasi, FWCI {favg:.2f}")
    print(f"  TOTAL watchlist: {watch_count}")

    # --- FWCI per fakultas ---
    print("\n=== FWCI rata-rata per fakultas ===")
    dept_by_id = {d["id"]: d for d in departemen}
    for f in fakultas:
        dept_ids = {d["id"] for d in departemen if d["fakultas_id"] == f["id"]}
        dosen_ids = {d["id"] for d in dosen if d["departemen_id"] in dept_ids}
        fs = []
        for did in dosen_ids:
            for p in pubs_by_dosen.get(did, []):
                if isinstance(p["fwci"], (int, float)):
                    fs.append(p["fwci"])
        favg = sum(fs) / len(fs) if fs else 0
        print(f"  {f['nama_fakultas']}: FWCI={favg:.2f} ({len(fs)} publikasi)")


if __name__ == "__main__":
    root = Path(__file__).resolve().parent.parent
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else root / "data" / "Data_Master_IRN_FWCI_ITS.xlsx"
    main(path)
