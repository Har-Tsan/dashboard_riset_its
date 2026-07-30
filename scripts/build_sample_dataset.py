"""Buat data/Data_Master_IRN_FWCI_ITS_SAMPLE.xlsx -- skema identik dengan Data_Master_IRN_FWCI_ITS.xlsx,
tapi isinya subset kecil yang sengaja meniru skenario 13+6+3 mitra ilustratif di prototipe lama
(cur 0/1/2, sustained aktif/berisiko, lapsed) -- dipakai KHUSUS untuk QA visual saat development,
membandingkan tampilan tiap halaman dengan desain yang sudah tervalidasi. Bukan pengganti dataset utama.

Jalankan: python scripts/build_sample_dataset.py
"""
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "Data_Master_IRN_FWCI_ITS_SAMPLE.xlsx"

wb = openpyxl.Workbook()
wb.remove(wb.active)

def sheet(name, headers, rows):
    ws = wb.create_sheet(name)
    ws.append(headers)
    for r in rows:
        ws.append(r)

# --- Fakultas / Departemen / Dosen (kecil, 2 fakultas) ---
sheet("Fakultas", ["id", "nama_fakultas"], [
    ["F01", "Faculty of Marine Technology"],
    ["F02", "Faculty of Intelligent Electrical and Informatics Technology"],
])
sheet("Departemen", ["id", "fakultas_id", "nama_departemen"], [
    ["D01", "F01", "Department of Marine Engineering"],
    ["D02", "F02", "Department of Informatics"],
])
sheet("Dosen", ["id", "departemen_id", "nama"], [
    ["DS01", "D01", "I Gde Manik Sukanegara Adhita"],
    ["DS02", "D01", "Erzad Iskandar Putra"],
    ["DS03", "D01", "Thariq Arafatul Akbar"],
    ["DS04", "D02", "Tohari Ahmad"],
    ["DS05", "D02", "Gagatsatya Adiatmaja"],
    ["DS06", "D02", "Ilham Gurat Adillion"],
])

# --- Institusi_Mitra: meniru 13 peluang + 6 sustainedPartners + 3 lapsedPartners lama ---
mitra_rows = [
    # id, nama, negara, catatan
    ["M01", "TU Delft", "Belanda"],
    ["M02", "Universiti Kuala Lumpur", "Malaysia"],
    ["M03", "University of Rwanda", "Rwanda"],
    ["M04", "Tokyo Institute of Technology", "Jepang"],
    ["M05", "KAIST", "Korea Selatan"],
    ["M06", "RWTH Aachen", "Jerman"],
    ["M07", "University of Melbourne", "Australia"],
    ["M08", "NTU Singapore", "Singapura"],
    ["M09", "University of Southampton", "Inggris"],
    ["M10", "Shanghai Jiao Tong University", "Tiongkok"],
    ["M11", "IIT Delhi", "India"],
    ["M12", "KMUTT", "Thailand"],
    ["M13", "University of the Philippines", "Filipina"],
    ["M14", "National University of Singapore (NUS)", "Singapura"],
    ["M15", "Universiti Teknologi Malaysia (UTM)", "Malaysia"],
    ["M16", "Seoul National University", "Korea Selatan"],
    ["M17", "Kyoto University", "Jepang"],
    ["M18", "University of Queensland", "Australia"],
    ["M19", "Universitas Malaya", "Malaysia"],
    ["M20", "Universiti Teknologi Petronas", "Malaysia"],
    ["M21", "University of Cape Town", "Afrika Selatan"],
    ["M22", "Nanjing University", "Tiongkok"],
]
sheet("Institusi_Mitra", ["id", "nama_institusi", "negara", "catatan"],
      [r + [None] for r in mitra_rows])

# years per mitra id, meniru cur/status lama (window 2022-2026, CURRENT_YEAR=2026)
years_by_mitra = {
    "M01": [2025, 2026], "M02": [2026], "M03": [2026], "M04": [], "M05": [2025, 2026],
    "M06": [2025], "M07": [2025, 2026], "M08": [], "M09": [2022], "M10": [2023],
    "M11": [2024, 2025], "M12": [], "M13": [2022],
    "M14": [2022, 2023, 2024, 2025, 2026], "M15": [2024, 2025, 2026],
    "M16": [2023, 2024, 2025, 2026], "M17": [2022, 2023, 2024],
    "M18": [2022, 2023, 2024], "M19": [2022, 2023, 2024],
    "M20": [2017, 2018, 2019], "M21": [2016, 2017, 2018], "M22": [2017, 2018, 2019],
}
bidang_by_mitra = {
    "M01": "Engineering and Technology", "M02": "Engineering and Technology", "M03": "Engineering and Technology",
    "M04": "Engineering and Technology", "M05": "Natural Sciences", "M06": "Engineering and Technology",
    "M07": "Life Sciences and Medicine", "M08": "Natural Sciences", "M09": "Engineering and Technology",
    "M10": "Social Sciences and Management", "M11": "Engineering and Technology", "M12": "Natural Sciences",
    "M13": "Arts and Humanities", "M14": "Natural Sciences", "M15": "Engineering and Technology",
    "M16": "Engineering and Technology", "M17": "Life Sciences and Medicine", "M18": "Natural Sciences",
    "M19": "Social Sciences and Management", "M20": "Engineering and Technology", "M21": "Natural Sciences",
    "M22": "Social Sciences and Management",
}
fwci_by_mitra = {
    "M01": 1.62, "M02": 1.05, "M03": 0.72, "M04": 1.90, "M05": 1.75, "M06": 1.40,
    "M07": 1.30, "M08": 2.10, "M09": 1.55, "M10": 0.60, "M11": 0.50, "M12": 0.40,
    "M13": 0.35, "M14": 1.85, "M15": 1.10, "M16": 1.68, "M17": 1.45, "M18": 1.20,
    "M19": 0.95, "M20": 1.0, "M21": 0.9, "M22": 0.8,
}
dosen_ids = ["DS01", "DS02", "DS03", "DS04", "DS05", "DS06"]

pub_rows = []
pub_penulis_rows = []
pid = 1
for mid, years in years_by_mitra.items():
    for y in years:
        pcode = f"P{pid:04d}"
        pub_rows.append([pcode, mid, y, bidang_by_mitra[mid], fwci_by_mitra[mid],
                          f"Kolaborasi riset dengan {mid} ({y}) (contoh sample)", "SciVal"])
        pub_penulis_rows.append([pcode, dosen_ids[pid % len(dosen_ids)]])
        pid += 1
# beberapa publikasi domestik tanpa mitra, supaya FWCI dosen tidak murni dari mitra
for i in range(3):
    pcode = f"P{pid:04d}"
    pub_rows.append([pcode, None, 2025 + (i % 2), "Engineering and Technology", 0.9 + i * 0.1,
                      "Publikasi domestik (contoh sample)", "Scholar API"])
    pub_penulis_rows.append([pcode, dosen_ids[i % len(dosen_ids)]])
    pid += 1

sheet("Publikasi", ["id", "institusi_mitra_id", "tahun_terbit", "bidang_qs", "fwci", "judul", "sumber_data"], pub_rows)
sheet("Publikasi_Penulis", ["publikasi_id", "dosen_id"], pub_penulis_rows)

# --- Naskah_Pipeline: contoh kecil ---
sheet("Naskah_Pipeline", ["id", "institusi_mitra_id", "judul", "bidang_qs", "status_naskah", "target_jurnal", "estimasi_tahun_terbit", "dosen_id"], [
    ["N001", "M01", "Structural Fatigue Analysis (contoh sample)", "Engineering and Technology", "Under review", "Ocean Engineering", 2027, "DS01"],
    ["N002", "M14", "Advanced Photonic Sensor Design (contoh sample)", "Natural Sciences", "Dalam penyusunan", "Sensors and Actuators B", 2027, "DS04"],
    ["N003", "M02", "Hybrid Propulsion System Efficiency (contoh sample)", "Engineering and Technology", "Submitted", "Applied Energy", 2027, "DS02"],
])

# --- Universitas_Pembanding (+FWCI) ---
sheet("Universitas_Pembanding", ["id", "nama_universitas", "tahun_data", "rank_qs_overall"], [
    ["U01", "ITB", 2026, 255],
    ["U02", "Universitas Indonesia", 2026, 189],
    ["U03", "UTM", 2026, 153],
    ["U04", "TU Delft", 2026, 47],
    ["U05", "NTU Singapore", 2026, 12],
])
bidang_list = ["Engineering and Technology", "Natural Sciences", "Life Sciences and Medicine", "Social Sciences and Management", "Arts and Humanities"]
fwci_pembanding = {
    "U01": [1.10, 0.90, 0.75, 0.80, 0.50],
    "U02": [0.70, 0.68, 0.90, 0.85, 0.65],
    "U03": [1.30, 0.95, 0.60, 0.50, 0.30],
    "U04": [1.62, 1.10, 1.00, 0.90, 0.70],
    "U05": [1.90, 1.70, 1.40, 1.10, 0.80],
}
fwci_rows = []
for uid, vals in fwci_pembanding.items():
    for b, v in zip(bidang_list, vals):
        fwci_rows.append([uid, b, v])
sheet("Universitas_Pembanding_FWCI", ["universitas_id", "bidang_qs", "fwci"], fwci_rows)

# --- Metrik_ITS_Tahunan (angka ilustratif lama) ---
sheet("Metrik_ITS_Tahunan", ["tahun", "bidang_qs", "rank_qs_overall", "fwci_rata_rata", "skor_irn_resmi"], [
    [2022, None, 560, 0.58, "Belum dirilis QS"],
    [2023, None, 545, 0.60, "Belum dirilis QS"],
    [2024, None, 530, 0.63, "Belum dirilis QS"],
    [2025, None, 515, 0.66, "Belum dirilis QS"],
    [2026, None, 506, 0.70, "Belum dirilis QS"],
])

# --- Kolaborasi_Pembanding (meniru overlapData lama, format long) ---
overlap_rows_wide = [
    ("RWTH Aachen", "Jerman", "Engineering and Technology", [1, 1, 0, 0, 1, 0]),
    ("TU Munich", "Jerman", "Engineering and Technology", [0, 0, 0, 1, 1, 1]),
    ("KAIST", "Korea Selatan", "Natural Sciences", [1, 0, 0, 1, 0, 1]),
    ("Tsinghua University", "Tiongkok", "Social Sciences and Management", [0, 1, 1, 0, 0, 1]),
    ("University of Melbourne", "Australia", "Life Sciences and Medicine", [1, 0, 1, 0, 1, 1]),
]
# urutan kolom overlap lama: ITS, ITB, UI, UTM, TU Delft, NTU -> abaikan kolom ITS (index0), sisanya jadi baris per pembanding
pembanding_ids = ["U01", "U02", "U03", "U04", "U05"]
kolab_rows = []
for m, c, b, v in overlap_rows_wide:
    for uid, flag in zip(pembanding_ids, v[1:]):
        if flag:
            kolab_rows.append([uid, m, c, b])
sheet("Kolaborasi_Pembanding", ["universitas_id", "nama_institusi_mitra", "negara", "bidang_qs"], kolab_rows)

wb.save(OUT)
print(f"Selesai: {OUT}")
