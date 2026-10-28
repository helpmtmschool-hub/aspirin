import json
import re
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_DIR = Path(__file__).resolve().parent.parent

with open(PROJECT_DIR / "engine/scratch_probe_2nd_year_dumps.json", "r", encoding="utf-8") as f:
    probe_dumps = json.load(f)

def format_dur(dur):
    dur = round(dur or 0)
    m_dur, s_dur = divmod(dur, 60)
    h_dur, m_dur = divmod(m_dur, 60)
    return f"{h_dur}h {m_dur}m {s_dur}s" if h_dur > 0 else f"{m_dur}m {s_dur}s"

# =========================================================================
# 1. PATHOLOGY (PrepLadder Edition X English)
# =========================================================================
patho_prim = probe_dumps.get("patho_primary", [])

patho_items = []
for m in patho_prim:
    msg_id = m.get("msg_id")
    raw_txt = (m.get("text") or "").strip()
    fn = m.get("filename") or ""
    dur = round(m.get("duration") or 0)
    sz = m.get("size") or 0
    doc_id = m.get("doc_id")

    if msg_id == 306:
        lec_no = 1
        title_text = "Pathology and Microbiology INICET May 2025"
    else:
        lines = [l.strip() for l in raw_txt.split("\n") if l.strip()]
        first_line = lines[0] if lines else fn
        match = re.match(r"^(\d+)[\._]\s*(.*)", first_line)
        if not match:
            match = re.match(r"^(\d+)[\._]\s*(.*)", fn)
        if match:
            lec_no = int(match.group(1))
            title_text = match.group(2).replace(".mp4", "").replace(".MP4", "").strip()
            # Clean underscores
            title_text = title_text.replace("_", " ").replace(" ,", ",").replace("&", "and")
            title_text = re.sub(r"\s+", " ", title_text).strip()
        else:
            lec_no = 999
            title_text = first_line

    clean_title = f"{lec_no:02d}. {title_text}"
    clean_fn = f"{clean_title}.mp4"

    patho_items.append({
        "lecture_no": lec_no,
        "title": clean_title,
        "filename": clean_fn,
        "destination_path": f"/Aspirin_LMS/01_PrepLadder_X_English/05_Pathology/{clean_fn}",
        "duration_seconds": dur,
        "duration_formatted": format_dur(dur),
        "file_size": sz,
        "document_id": doc_id,
        "primary_source": {
            "channel_name": "Prep X + Cerebellum Primary Channel",
            "chat_id": -1003709841202,
            "message_id": msg_id,
            "filename": fn,
            "caption": raw_txt
        },
        "corroboration": {
            "channel_name": "Folderwise Free Group (Topic 24829) & Subjectwise (Topic 322)",
            "chat_id": -1003839992379,
            "topic_id": 24829,
            "notes": "Verified contiguous 1..77 against Folderwise (range 25381..25422) and Subjectwise Topic 322."
        }
    })

patho_items.sort(key=lambda x: x["lecture_no"])

# =========================================================================
# 2. MICROBIOLOGY (PrepLadder Edition X English)
# =========================================================================
micro_prim = probe_dumps.get("micro_primary", [])

micro_items = []
for m in micro_prim:
    msg_id = m.get("msg_id")
    raw_txt = (m.get("text") or "").strip()
    fn = m.get("filename") or ""
    dur = round(m.get("duration") or 0)
    sz = m.get("size") or 0
    doc_id = m.get("doc_id")

    first_line = raw_txt.split("\n")[0].strip() if raw_txt else fn
    match = re.match(r"^(\d+)[\._]\s*(.*)", first_line)
    if not match:
        match = re.match(r"^(\d+)[\._]\s*(.*)", fn)
    if match:
        lec_no = int(match.group(1))
        title_text = match.group(2).replace(".mp4", "").replace(".MP4", "").strip()
        title_text = title_text.replace("_", " ").replace(" ,", ",").replace("&", "and")
        title_text = re.sub(r"\s+", " ", title_text).strip()
    else:
        lec_no = 999
        title_text = first_line

    clean_title = f"{lec_no:02d}. {title_text}"
    clean_fn = f"{clean_title}.mp4"

    micro_items.append({
        "lecture_no": lec_no,
        "title": clean_title,
        "filename": clean_fn,
        "destination_path": f"/Aspirin_LMS/01_PrepLadder_X_English/04_Microbiology/{clean_fn}",
        "duration_seconds": dur,
        "duration_formatted": format_dur(dur),
        "file_size": sz,
        "document_id": doc_id,
        "primary_source": {
            "channel_name": "Prep X + Cerebellum Primary Channel",
            "chat_id": -1003709841202,
            "message_id": msg_id,
            "filename": fn,
            "caption": raw_txt
        },
        "corroboration": {
            "channel_name": "Folderwise Free Group (Topic 24829) & Subjectwise (Topic 389)",
            "chat_id": -1003839992379,
            "topic_id": 24829,
            "notes": "Verified contiguous 1..52 against Folderwise (range 25272..25324) and Subjectwise Topic 389."
        }
    })

micro_items.sort(key=lambda x: x["lecture_no"])

# =========================================================================
# 3. PHARMACOLOGY (Dr. Gobind Rai Garg - Cerebellum Academy)
# =========================================================================
pharma_prim = probe_dumps.get("pharma_grg_primary", [])
pharma_ded = probe_dumps.get("pharma_grg_dedicated", [])

# Primary lookup by message_id
p_by_id = {m["msg_id"]: m for m in pharma_prim}

# Dedicated lookup for backup / notes
d_by_id = {m["msg_id"]: m for m in pharma_ded}

# Curated canonical Dr. GRG Pharmacology syllabus structure
# (section_slug, section_name, [(msg_id, lec_no, title)])
pharma_curriculum = [
    ("00_Orientation_Strategy", "Orientation & Strategy", [
        (2866, 1, "About The Faculty"),
        (2867, 2, "How To Use The App!"),
        (2868, 3, "Life Story of Dr. GRG"),
        (2869, 4, "Motivation and Strategy"),
    ]),
    ("01_General_Pharmacology", "General Pharmacology", [
        (2870, 1, "Introduction and Routes of Drug Administration"),
        (2871, 2, "Pharmacokinetics Absorption"),
        (2872, 3, "Pharmacokinetics Distribution"),
        (2873, 4, "Pharmacokinetics Metabolism"),
        (2874, 5, "Pharmacokinetics Excretion"),
        (2875, 6, "Kinetics of Elimination"),
        (2876, 7, "Pharmacodynamics Introduction and Enzyme Inhibitors"),
        (2877, 8, "Pharmacodynamics Receptors"),
        (2878, 9, "Dose Response Curve"),
        (2879, 10, "Clinical Trials and Pharmacovigilance"),
        (2880, 11, "Factors Affecting Drug Action"),
        (2881, 12, "Combined Effect of Drugs"),
        (2882, 13, "Practicals in General Pharmacology"),
    ]),
    ("02_Autonomic_Nervous_System", "Autonomic Nervous System (ANS)", [
        (2883, 14, "Basics and Cholinergic Drugs"),
        (2884, 15, "Anti-Cholinergic Drugs"),
        (2885, 16, "Adrenergic Drugs"),
        (2886, 17, "Anti-Adrenergic Drugs"),
        (2887, 18, "Glaucoma"),
        (2888, 19, "Practicals in ANS"),
    ]),
    ("03_Autacoids_Inflammation", "Autacoids & Inflammation", [
        (2932, 20, "Histamine and Serotonin"),
        (2889, 21, "Migraine"),
        (2890, 22, "PG and NSAIDs"),
        (2891, 23, "Gout and Rheumatoid Arthritis"),
    ]),
    ("04_Cardiovascular_System", "Cardiovascular System (CVS)", [
        (2892, 24, "Congestive Heart Failure"),
        (2893, 25, "Ischemic Heart Disease"),
        (2894, 26, "Drug Used in Hypertension"),
        (2895, 27, "Anti-Arrhythmic Drugs"),
        (2896, 28, "Anti-Dyslipidemic"),
    ]),
    ("05_Renal_System", "Renal System", [
        (2897, 29, "Diuretics"),
    ]),
    ("06_Endocrine_System", "Endocrine System", [
        (2898, 30, "Pituitary Hypothalamic System"),
        (2899, 31, "Thyroid"),
        (2900, 32, "Pancreas"),
        (2901, 33, "Adrenal"),
        (2902, 34, "Osteoporosis"),
        (2903, 35, "Sex Hormones"),
        (2904, 36, "Oral Contraceptives"),
    ]),
    ("07_Central_Nervous_System", "Central Nervous System (CNS)", [
        (2905, 37, "Sedative Hypnotics"),
        (2906, 38, "Neurodegenerative Diseases"),
        (2907, 39, "Anti-Epileptic Drugs"),
        (2908, 40, "Anti-Psychotic Drugs"),
        (2909, 41, "Drugs for Mania and Depression"),
        (2910, 42, "Drugs of Abuse"),
        (2911, 43, "Local Anaesthetics and Skeletal Muscle Relaxants"),
        (2912, 44, "General Anaesthetics"),
    ]),
    ("08_Hematology", "Hematology", [
        (2913, 45, "Drugs Affecting Blood Flow"),
        (2914, 46, "Drugs Affecting Cells of Blood"),
    ]),
    ("09_Respiratory_System", "Respiratory System", [
        (2915, 47, "Cough and Bronchial Asthma"),
    ]),
    ("10_Gastrointestinal_System", "Gastrointestinal System (GIT)", [
        (2916, 48, "Gastro-Intestinal Tract (GIT)"),
    ]),
    ("11_Antimicrobial_Agents", "Antimicrobial Agents", [
        (2917, 49, "General Considerations about Anti-Microbial Agents"),
        (2918, 50, "Drugs Inhibiting Cell Wall Synthesis"),
        (2919, 51, "AMA Acting by Other Mechanisms"),
        (2920, 52, "Tuberculosis and Leprosy"),
        (2921, 53, "Anti-Viral Drugs"),
        (2922, 54, "Anti-Fungal Drugs"),
        (2923, 55, "Malaria and Other Parasites"),
    ]),
    ("12_Chemotherapy_Oncology_Immunopharmacology", "Chemotherapy & Immunopharmacology", [
        (2924, 56, "Cytotoxic Drugs"),
        (2931, 57, "Targeted Anti-Cancer Drugs"),
        (2925, 58, "Immunosuppressants Drugs"),
        (2926, 59, "Monoclonal Antibodies"),
    ]),
    ("13_Toxicology_Miscellaneous", "Toxicology & Miscellaneous", [
        (2927, 60, "Drug Interactions and Antidotes"),
        (2928, 61, "Miscellaneous Topics"),
        (2929, 62, "New Drugs"),
    ]),
    ("14_Clinical_Punches", "High-Yield Clinical Punches", [
        (2933, 1, "Clinical Punch - 1"),
        (2934, 2, "Clinical Punch - 2"),
        (2935, 3, "Clinical Punch - 3"),
        (2936, 4, "Clinical Punch - 4"),
        (2937, 5, "Clinical Punch - 5"),
    ]),
]

pharma_items = []
global_order = 1

for sec_slug, sec_name, lecs in pharma_curriculum:
    for mid, l_no, title in lecs:
        pm = p_by_id.get(mid)
        if not pm:
            print(f"Warning: Primary msg {mid} not found!")
            continue

        dur = round(pm.get("duration") or 0)
        sz = pm.get("size") or 0
        doc_id = pm.get("doc_id")
        orig_fn = pm.get("filename") or ""

        clean_title = f"{l_no:02d}. {title}"
        clean_fn = f"{clean_title}.mp4"

        pharma_items.append({
            "global_order": global_order,
            "section_slug": sec_slug,
            "section_name": sec_name,
            "section_lecture_no": l_no,
            "title": clean_title,
            "filename": clean_fn,
            "destination_path": f"/Aspirin_LMS/06_Cerebellum/03_Pharmacology_Dr_GRG/{sec_slug}/{clean_fn}",
            "duration_seconds": dur,
            "duration_formatted": format_dur(dur),
            "file_size": sz,
            "document_id": doc_id,
            "primary_source": {
                "channel_name": "Prep X + Cerebellum Primary Channel",
                "chat_id": -1003709841202,
                "message_id": mid,
                "filename": orig_fn,
                "caption": pm.get("text")
            },
            "corroboration": {
                "channel_name": "Dedicated GRG Channel (-1002138638940) & Folderwise Topic 46021",
                "chat_id": -1003839992379,
                "topic_id": 46021,
                "notes": "Verified against Cerebellum Main Videos topic 46021 (msgs 46506..46577) and dedicated GRG channel."
            }
        })
        global_order += 1

# Add Notes PDF
notes_doc = d_by_id.get(273)
if notes_doc:
    notes_item = {
        "global_order": global_order,
        "section_slug": "15_Notes_PDF",
        "section_name": "Notes PDF",
        "section_lecture_no": 1,
        "title": "New Edition Cerebellum GRG Pharmacology Notes",
        "filename": "New Edition Cerebellum GRG Pharmacology Notes.pdf",
        "destination_path": "/Aspirin_LMS/06_Cerebellum/03_Pharmacology_Dr_GRG/15_Notes_PDF/New Edition Cerebellum GRG Pharmacology Notes.pdf",
        "duration_seconds": 0,
        "duration_formatted": "PDF Document",
        "file_size": notes_doc.get("size") or 0,
        "document_id": notes_doc.get("doc_id"),
        "is_pdf": True,
        "primary_source": {
            "channel_name": "Dedicated GRG Channel",
            "chat_id": -1002138638940,
            "message_id": 273,
            "filename": notes_doc.get("filename"),
            "caption": notes_doc.get("text")
        },
        "corroboration": {
            "channel_name": "Folderwise Topic 46021 (Msg 47640)",
            "chat_id": -1003839992379,
            "topic_id": 46021,
            "notes": "Complete handwritten/printed Cerebellum Dr. GRG Pharmacology notes."
        }
    }
    pharma_items.append(notes_item)

# SAVE INDIVIDUAL SUBJECT CATALOGS
out_patho = PROJECT_DIR / "engine/prepx_pathology_verified.json"
out_patho.write_text(json.dumps({
    "subject": "Pathology",
    "faculty": "PrepLadder X Faculty",
    "platform": "PrepLadder Edition X (English)",
    "total_lectures": len(patho_items),
    "total_size_bytes": sum(l["file_size"] for l in patho_items),
    "total_duration_seconds": sum(l["duration_seconds"] for l in patho_items),
    "lectures": patho_items
}, indent=2, ensure_ascii=False), encoding="utf-8")

out_micro = PROJECT_DIR / "engine/prepx_microbiology_verified.json"
out_micro.write_text(json.dumps({
    "subject": "Microbiology",
    "faculty": "PrepLadder X Faculty",
    "platform": "PrepLadder Edition X (English)",
    "total_lectures": len(micro_items),
    "total_size_bytes": sum(l["file_size"] for l in micro_items),
    "total_duration_seconds": sum(l["duration_seconds"] for l in micro_items),
    "lectures": micro_items
}, indent=2, ensure_ascii=False), encoding="utf-8")

out_pharma = PROJECT_DIR / "engine/cerebellum_pharmacology_grg_verified.json"
out_pharma.write_text(json.dumps({
    "subject": "Pharmacology",
    "faculty": "Dr. Gobind Rai Garg (GRG sir)",
    "platform": "Cerebellum Academy",
    "total_items": len(pharma_items),
    "video_lectures_count": len([p for p in pharma_items if not p.get("is_pdf")]),
    "has_notes_pdf": True,
    "total_size_bytes": sum(l["file_size"] for l in pharma_items),
    "total_duration_seconds": sum(l["duration_seconds"] for l in pharma_items),
    "lectures": pharma_items
}, indent=2, ensure_ascii=False), encoding="utf-8")

# SAVE COMBINED SECOND YEAR CATALOG
combined_catalog = {
    "curriculum": "MBBS Second Professional Year",
    "generated_at": "2026-10-28T11:45:00Z",
    "summary": {
        "pathology": {
            "platform": "PrepLadder Edition X (English)",
            "faculty": "PrepLadder X Faculty",
            "lectures_count": len(patho_items),
            "size_gb": round(sum(l["file_size"] for l in patho_items) / (1024**3), 2),
            "duration_hours": round(sum(l["duration_seconds"] for l in patho_items) / 3600, 2),
            "has_notes_pdf": False
        },
        "microbiology": {
            "platform": "PrepLadder Edition X (English)",
            "faculty": "PrepLadder X Faculty",
            "lectures_count": len(micro_items),
            "size_gb": round(sum(l["file_size"] for l in micro_items) / (1024**3), 2),
            "duration_hours": round(sum(l["duration_seconds"] for l in micro_items) / 3600, 2),
            "has_notes_pdf": False
        },
        "pharmacology": {
            "platform": "Cerebellum Academy",
            "faculty": "Dr. Gobind Rai Garg (GRG sir)",
            "lectures_count": len([p for p in pharma_items if not p.get("is_pdf")]),
            "size_gb": round(sum(l["file_size"] for l in pharma_items) / (1024**3), 2),
            "duration_hours": round(sum(l["duration_seconds"] for l in pharma_items) / 3600, 2),
            "has_notes_pdf": True
        },
        "grand_total": {
            "total_video_lectures": len(patho_items) + len(micro_items) + len([p for p in pharma_items if not p.get("is_pdf")]),
            "total_size_gb": round((sum(l["file_size"] for l in patho_items) + sum(l["file_size"] for l in micro_items) + sum(l["file_size"] for l in pharma_items)) / (1024**3), 2),
            "total_duration_hours": round((sum(l["duration_seconds"] for l in patho_items) + sum(l["duration_seconds"] for l in micro_items) + sum(l["duration_seconds"] for l in pharma_items)) / 3600, 2),
            "total_notes_pdf": 1
        }
    },
    "pathology": patho_items,
    "microbiology": micro_items,
    "pharmacology": pharma_items
}

out_combined = PROJECT_DIR / "engine/verified_second_year_catalog.json"
out_combined.write_text(json.dumps(combined_catalog, indent=2, ensure_ascii=False), encoding="utf-8")

print(f"Generated successfully:")
print(f"  - engine/prepx_pathology_verified.json ({len(patho_items)} lectures, {combined_catalog['summary']['pathology']['size_gb']} GB, {combined_catalog['summary']['pathology']['duration_hours']}h)")
print(f"  - engine/prepx_microbiology_verified.json ({len(micro_items)} lectures, {combined_catalog['summary']['microbiology']['size_gb']} GB, {combined_catalog['summary']['microbiology']['duration_hours']}h)")
print(f"  - engine/cerebellum_pharmacology_grg_verified.json ({len(pharma_items)} items, {combined_catalog['summary']['pharmacology']['size_gb']} GB, {combined_catalog['summary']['pharmacology']['duration_hours']}h)")
print(f"  - engine/verified_second_year_catalog.json (Total: {combined_catalog['summary']['grand_total']['total_video_lectures']} lectures, {combined_catalog['summary']['grand_total']['total_size_gb']} GB, {combined_catalog['summary']['grand_total']['total_duration_hours']}h)")

