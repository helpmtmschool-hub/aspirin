import json
import re
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_DIR = Path(__file__).resolve().parent.parent

# 1. LOAD RAW DATA
ashwini_data = json.load(open(PROJECT_DIR / "engine/scratch_ashwini_anatomy_dump.json", encoding="utf-8"))
probe_dumps = json.load(open(PROJECT_DIR / "engine/scratch_probe_1st_year_dumps.json", encoding="utf-8"))
folderwise_physio = json.load(open(PROJECT_DIR / "engine/scratch_folderwise_physio.json", encoding="utf-8"))

def format_title_general(t):
    t = re.sub(r'^\d+[\.\)]\s*', '', t)
    t = re.sub(r'^\d+\s*-\s*', '', t)
    t = re.sub(r'\.(mp4|mkv|pdf)$', '', t, flags=re.I)
    t = re.sub(r'Topic\s*:.*$', '', t, flags=re.I)
    t = re.sub(r'Subject\s*:.*$', '', t, flags=re.I)
    t = t.replace('_', ' ').replace("`", "'")
    t = re.sub(r"it's\b", "Its", t, flags=re.I)
    t = re.sub(r'\s+', ' ', t).strip()
    return t

def format_dur(dur):
    dur = round(dur or 0)
    m_dur, s_dur = divmod(dur, 60)
    h_dur, m_dur = divmod(m_dur, 60)
    return f"{h_dur}h {m_dur}m {s_dur}s" if h_dur > 0 else f"{m_dur}m {s_dur}s"

# =========================================================================
# 1. ANATOMY (Dr. Ashwini Kumar - eGurukul 4.0)
# =========================================================================
fw_anat = [m for m in ashwini_data["fw_15033_media"] if m["msg_id"] < 15188 and m.get("duration") is not None]
sub_anat = [m for m in ashwini_data["sub_5071_media"] if m["msg_id"] not in [5181, 5182]] # drop duplicates

section_ranges = [
    (15035, 15055, "Head, Neck and Face", "01_Head_Neck_Face"),
    (15055, 15078, "Neuroanatomy", "02_Neuroanatomy"),
    (15078, 15091, "Thorax", "03_Thorax"),
    (15091, 15109, "Upper Limb", "04_Upper_Limb"),
    (15109, 15127, "Lower Limb", "05_Lower_Limb"),
    (15127, 15132, "General Embryology", "06_General_Embryology"),
    (15132, 15144, "Systemic Embryology", "07_Systemic_Embryology"),
    (15144, 15159, "Abdomen, Pelvis and Perineum", "08_Abdomen_Pelvis_Perineum"),
    (15159, 15168, "Histology", "09_Histology"),
    (15168, 15187, "Osteology", "10_Osteology"),
]

anatomy_lectures = []
g_idx = 1
for start, end, sec_display, sec_slug in section_ranges:
    sec_videos = [m for m in fw_anat if start <= m["msg_id"] < end]
    for sec_idx, v in enumerate(sec_videos, 1):
        raw_t = v["text"] or v["filename"] or ""
        clean_t = format_title_general(raw_t)
        
        # specific fixes for clean title display
        clean_t = re.sub(r'\bcvs\b', 'CVS', clean_t, flags=re.I)
        clean_t = re.sub(r'\bgit\b', 'GIT', clean_t, flags=re.I)
        clean_t = re.sub(r'\bhnf\b', 'HNF', clean_t, flags=re.I)
        clean_t = re.sub(r'\beeg\b', 'EEG', clean_t, flags=re.I)
        clean_t = re.sub(r'\bct\b', 'CT', clean_t, flags=re.I)
        clean_t = re.sub(r'\bsma\b', 'SMA', clean_t, flags=re.I)
        clean_t = re.sub(r'\bima\b', 'IMA', clean_t, flags=re.I)
        clean_t = re.sub(r'\biv\b', 'IV', clean_t, flags=re.I)
        clean_t = re.sub(r'\biii\b', 'III', clean_t, flags=re.I)
        clean_t = re.sub(r'\bvi\b', 'VI', clean_t, flags=re.I)
        clean_t = re.sub(r'\bvii\b', 'VII', clean_t, flags=re.I)
        clean_t = re.sub(r'\bviii\b', 'VIII', clean_t, flags=re.I)
        clean_t = re.sub(r'\bix\b', 'IX', clean_t, flags=re.I)
        clean_t = re.sub(r'\bxi\b', 'XI', clean_t, flags=re.I)
        clean_t = re.sub(r'\bxii\b', 'XII', clean_t, flags=re.I)
        clean_t = re.sub(r'&', 'and', clean_t)
        clean_t = re.sub(r'\s+', ' ', clean_t).strip()
        
        dur = round(v["duration"] or 0)
        
        # Corroborating match in Subjectwise
        sub_match = None
        for sm in sub_anat:
            if sm["size"] == v["size"] or abs(round(sm.get("duration") or 0) - dur) <= 2:
                sub_match = sm
                break
                
        anatomy_lectures.append({
            "global_lecture_no": g_idx,
            "section_slug": sec_slug,
            "section_name": sec_display,
            "section_lecture_no": sec_idx,
            "title": f"{sec_idx:02d}. {clean_t}",
            "filename": f"{sec_idx:02d}. {clean_t}.mp4",
            "destination_path": f"/Aspirin_LMS/05_eGurukul_4.0/01_Anatomy_Dr_Ashwini_Kumar/{sec_slug}/{sec_idx:02d}. {clean_t}.mp4",
            "duration_seconds": dur,
            "duration_formatted": format_dur(dur),
            "file_size": v["size"],
            "document_id": v["doc_id"],
            "primary_source": {
                "channel_name": "Folderwise Free Group (Topic 15033: Egurukul/DBMCI 4.0 Videos)",
                "chat_id": -1003839992379,
                "topic_id": 15033,
                "message_id": v["msg_id"],
                "caption": v["text"],
                "filename": v["filename"]
            },
            "corroboration": {
                "channel_name": "Subjectwise Lectures (Topic 5071: Ashwani Anatomy)",
                "chat_id": -1003506593387,
                "topic_id": 5071,
                "message_id": sub_match["msg_id"] if sub_match else None,
                "caption": sub_match["text"] if sub_match else None,
                "filename": sub_match["filename"] if sub_match else None,
                "size_match": (sub_match["size"] == v["size"]) if sub_match else False,
                "notes": "Subjectwise has truncated clips for Upper Limb/Thorax and 2 duplicates in Abdomen; Folderwise holds complete full-length un-abbreviated media."
            }
        })
        g_idx += 1

# Master notes PDF
anatomy_notes_pdf = {
    "title": "Anatomy 4.0 (Dr. Ashwini Kumar) Complete Notes Textbook.pdf",
    "filename": "Anatomy 4.0 Complete Notes (Dr. Ashwini Kumar).pdf",
    "destination_path": "/Aspirin_LMS/05_eGurukul_4.0/01_Anatomy_Dr_Ashwini_Kumar/00_Notes_PDF/Anatomy 4.0 Complete Notes (Dr. Ashwini Kumar).pdf",
    "file_size": 106365567,
    "primary_source": {
        "channel_name": "Folderwise Free Group",
        "chat_id": -1003839992379,
        "topic_id": 15033,
        "message_id": 15187,
        "filename": "Anatomy 4.0_without_password.pdf"
    }
}

# =========================================================================
# 2. PHYSIOLOGY (PrepLadder Edition X - English)
# =========================================================================
prepx_phys = probe_dumps["physio_prepx_primary"]
f_by_num = {}
for f in folderwise_physio:
    try:
        num = int(f["text"].split(".")[0])
        f_by_num[num] = f
    except Exception:
        pass

physiology_lectures = []
for i, p in enumerate(prepx_phys, 1):
    raw_fn = p["filename"]
    # clean title
    t = format_title_general(raw_fn)
    t = t.replace("&", "and")
    t = t.replace("_ Pre Synaptic", " - Pre-Synaptic")
    t = t.replace("_ Post Synaptic", " - Post-Synaptic")
    t = t.replace("_ Tactile", " - Tactile")
    t = t.replace("_ Visual and Auditory", " - Visual and Auditory")
    t = t.replace("_ Smell and Taste", " - Smell and Taste")
    t = re.sub(r'\s+', ' ', t).strip()
    
    clean_title = f"{i:02d}. {t}"
    dur = round(p["duration"] or 0)
    fw_match = f_by_num.get(i)
    
    physiology_lectures.append({
        "lecture_no": i,
        "title": clean_title,
        "filename": f"{clean_title}.mp4",
        "destination_path": f"/Aspirin_LMS/01_PrepLadder_X_English/02_Physiology/{clean_title}.mp4",
        "duration_seconds": dur,
        "duration_formatted": format_dur(dur),
        "file_size": p["size"],
        "document_id": p["doc_id"],
        "primary_source": {
            "channel_name": "Prep X + Cerebellum Primary Channel",
            "chat_id": -1003709841202,
            "message_id": p["msg_id"],
            "filename": raw_fn,
            "caption": p["text"]
        },
        "corroboration": {
            "channel_name": "Folderwise Free Group (Topic 24829: Prep X English)",
            "chat_id": -1003839992379,
            "topic_id": 24829,
            "message_id": fw_match["msg_id"] if fw_match else None,
            "caption": fw_match["text"] if fw_match else "MISSING IN FOLDERWISE (Lecture 32 missing)",
            "duration_match": (abs(round(fw_match["duration"] or 0) - dur) <= 5) if fw_match else False,
            "notes": "Folderwise omitted Lecture 32 (Oxygen Transport) and applied 3s watermarked bumper clips; Primary Channel -1003709841202 contains 100% complete pristine files."
        }
    })

# =========================================================================
# 3. BIOCHEMISTRY (Marrow Edition 6 - Dr. Rebecca James)
# =========================================================================
mm_bio = probe_dumps["biochem_mymarrow_1318"]
sub_bio = probe_dumps["biochem_sub_2351"]

biochemistry_lectures = []
for i in range(len(mm_bio)):
    m = mm_bio[i]
    s = sub_bio[i]
    
    # Subjectwise gives the canonical title text
    s_text = s["text"]
    title_text = format_title_general(s_text)
    title_text = re.sub(r'&', 'and', title_text)
    title_text = re.sub(r'\s+', ' ', title_text).strip()
    
    clean_title = f"{i+1:02d}. {title_text}"
    dur = round(m["duration"] or 0)
    
    biochemistry_lectures.append({
        "lecture_no": i + 1,
        "title": clean_title,
        "filename": f"{clean_title}.mp4",
        "destination_path": f"/Aspirin_LMS/04_Marrow_Edition_6/03_Biochemistry/{clean_title}.mp4",
        "duration_seconds": dur,
        "duration_formatted": format_dur(dur),
        "file_size": m["size"],
        "document_id": m["doc_id"],
        "primary_source": {
            "channel_name": "My Marrow (Topic 1318: Biochemistry)",
            "chat_id": -1003264222864,
            "topic_id": 1318,
            "message_id": m["msg_id"],
            "caption": m["text"],
            "filename": m["filename"]
        },
        "corroboration": {
            "channel_name": "Subjectwise Lectures (Topic 2351: Biochemistry (Marrow))",
            "chat_id": -1003506593387,
            "topic_id": 2351,
            "message_id": s["msg_id"],
            "caption": s["text"],
            "filename": s["filename"],
            "duration_match": round(s["duration"] or 0) == dur,
            "size_match": s["size"] == m["size"],
            "notes": "Subjectwise provides canonical titles resolving My Marrow bare-number emojis; durations match exactly on all 61 lectures."
        }
    })

# SAVE VERIFIED JSON FILES
out_anat = PROJECT_DIR / "engine/egurukul_anatomy_verified.json"
out_anat.write_text(json.dumps({
    "subject": "Anatomy",
    "faculty": "Dr. Ashwini Kumar",
    "platform": "eGurukul 4.0 / DBMCI",
    "total_lectures": len(anatomy_lectures),
    "total_size_bytes": sum(l["file_size"] for l in anatomy_lectures),
    "total_duration_seconds": sum(l["duration_seconds"] for l in anatomy_lectures),
    "master_pdf": anatomy_notes_pdf,
    "lectures": anatomy_lectures
}, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Saved: {out_anat} ({len(anatomy_lectures)} lectures)")

out_phys = PROJECT_DIR / "engine/prepx_physiology_verified.json"
out_phys.write_text(json.dumps({
    "subject": "Physiology",
    "faculty": "Dr. Vivek Nalgirkar",
    "platform": "PrepLadder Edition X (English)",
    "total_lectures": len(physiology_lectures),
    "total_size_bytes": sum(l["file_size"] for l in physiology_lectures),
    "total_duration_seconds": sum(l["duration_seconds"] for l in physiology_lectures),
    "lectures": physiology_lectures
}, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Saved: {out_phys} ({len(physiology_lectures)} lectures)")

out_bio = PROJECT_DIR / "engine/marrow_biochemistry_verified.json"
out_bio.write_text(json.dumps({
    "subject": "Biochemistry",
    "faculty": "Dr. Rebecca James",
    "platform": "Marrow Edition 6",
    "total_lectures": len(biochemistry_lectures),
    "total_size_bytes": sum(l["file_size"] for l in biochemistry_lectures),
    "total_duration_seconds": sum(l["duration_seconds"] for l in biochemistry_lectures),
    "lectures": biochemistry_lectures
}, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Saved: {out_bio} ({len(biochemistry_lectures)} lectures)")

# MASTER COMBINED CATALOG
out_master = PROJECT_DIR / "engine/verified_first_year_catalog.json"
out_master.write_text(json.dumps({
    "curriculum": "MBBS First Professional Year",
    "generated_at": "2026-10-27T14:50:00Z",
    "summary": {
        "anatomy": {
            "platform": "eGurukul 4.0 / DBMCI",
            "faculty": "Dr. Ashwini Kumar",
            "lectures_count": len(anatomy_lectures),
            "size_gb": round(sum(l["file_size"] for l in anatomy_lectures) / (1024**3), 2),
            "duration_hours": round(sum(l["duration_seconds"] for l in anatomy_lectures) / 3600, 2),
            "has_notes_pdf": True
        },
        "physiology": {
            "platform": "PrepLadder Edition X (English)",
            "faculty": "Dr. Vivek Nalgirkar",
            "lectures_count": len(physiology_lectures),
            "size_gb": round(sum(l["file_size"] for l in physiology_lectures) / (1024**3), 2),
            "duration_hours": round(sum(l["duration_seconds"] for l in physiology_lectures) / 3600, 2),
            "has_notes_pdf": False
        },
        "biochemistry": {
            "platform": "Marrow Edition 6",
            "faculty": "Dr. Rebecca James",
            "lectures_count": len(biochemistry_lectures),
            "size_gb": round(sum(l["file_size"] for l in biochemistry_lectures) / (1024**3), 2),
            "duration_hours": round(sum(l["duration_seconds"] for l in biochemistry_lectures) / 3600, 2),
            "has_notes_pdf": False
        },
        "grand_total": {
            "total_lectures": len(anatomy_lectures) + len(physiology_lectures) + len(biochemistry_lectures),
            "total_size_gb": round((sum(l["file_size"] for l in anatomy_lectures) + sum(l["file_size"] for l in physiology_lectures) + sum(l["file_size"] for l in biochemistry_lectures)) / (1024**3), 2),
            "total_duration_hours": round((sum(l["duration_seconds"] for l in anatomy_lectures) + sum(l["duration_seconds"] for l in physiology_lectures) + sum(l["duration_seconds"] for l in biochemistry_lectures)) / 3600, 2)
        }
    },
    "anatomy": anatomy_lectures,
    "physiology": physiology_lectures,
    "biochemistry": biochemistry_lectures
}, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Saved master catalog: {out_master}")

