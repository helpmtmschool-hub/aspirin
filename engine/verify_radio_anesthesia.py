import json
import re
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_DIR = Path(__file__).resolve().parent.parent
data = json.load(open(PROJECT_DIR / "engine" / "scratch_radio_anesthesia_dump.json", encoding="utf-8"))
ms = json.load(open(PROJECT_DIR / "engine" / "marrow_sections.json", encoding="utf-8"))
manifest = json.load(open(PROJECT_DIR / "engine" / "transfer_manifest.json", encoding="utf-8"))

mm_rad = data["mm_radio_533"]
sub_rad1 = data["sub_radio_2783"]
sub_rad2 = data["sub_radio_2605"]

mm_ane = data["mm_anest_575"]
sub_ane = data["sub_anest_2573"]

def format_duration(seconds):
    if not seconds: return "0m 00s"
    sec = round(seconds)
    m = sec // 60
    s = sec % 60
    h = m // 60
    m = m % 60
    return f"{h}h {m:02d}m {s:02d}s" if h > 0 else f"{m:02d}m {s:02d}s"

print("===============================================================")
print("=== CROSS-VERIFICATION: MARROW RADIOLOGY (41 Lectures) ===")
print("===============================================================")
sec_rad = next(x for x in ms if x["subject_id"] == "radiology")

rad_verified = []
for idx in range(41):
    m_v = sec_rad["videos"][idx]
    mm = mm_rad[idx]
    s1 = sub_rad1[idx]
    s2 = sub_rad2[idx]

    # Verify doc_id or size match
    doc_match = (mm["doc_id"] == s1["doc_id"] or mm["doc_id"] == s2["doc_id"])
    size_match = (mm["size"] == s1["size"] or mm["size"] == s2["size"])
    dur_match = (abs((mm["duration"] or 0) - (s1["duration"] or 0)) <= 2)

    # Check manifest status
    item_id = f"mr_{-1003264222864}_{mm['msg_id']}"
    is_completed = (item_id in manifest and manifest[item_id].get("status") == "completed")

    clean_title = m_v["title"]
    rad_verified.append({
        "lecture_no": idx + 1,
        "title": clean_title,
        "mm_msg_id": mm["msg_id"],
        "sub_msg_id": s1["msg_id"],
        "duration_seconds": round(mm["duration"] or s1["duration"] or 0),
        "duration_formatted": format_duration(mm["duration"] or s1["duration"]),
        "file_size": mm["size"] or s1["size"],
        "document_id": mm["doc_id"] or s1["doc_id"],
        "openmedq_status": "Uploaded" if is_completed else "Pending",
        "doc_match": doc_match,
        "size_match": size_match,
        "mm_caption": (mm["text"] or "").split("\n")[0],
        "s1_caption": (s1["text"] or "").split("\n")[0]
    })

print(f"{'#':<3} | {'Status':<9} | {'Dur':<8} | {'Size MB':<7} | {'MM_ID':<5} | {'Sub_ID':<6} | {'Title'}")
print("-" * 95)
for r in rad_verified:
    sz_mb = round((r['file_size'] or 0) / (1024*1024), 1)
    status_tag = "[DONE]" if r['openmedq_status'] == "Uploaded" else "[WAIT]"
    print(f"{r['lecture_no']:<3} | {status_tag:<9} | {r['duration_formatted']:<8} | {sz_mb:<7.1f} | {r['mm_msg_id']:<5} | {r['sub_msg_id']:<6} | {r['title']}")

print("\n===============================================================")
print("=== CROSS-VERIFICATION: MARROW ANESTHESIA (31 Lectures) ===")
print("===============================================================")
sec_ane = next(x for x in ms if x["subject_id"] == "anesthesia")

ane_verified = []
for idx in range(31):
    m_v = sec_ane["videos"][idx]
    mm = mm_ane[idx]
    s1 = sub_ane[idx]

    doc_match = (mm["doc_id"] == s1["doc_id"])
    size_match = (mm["size"] == s1["size"])
    dur_match = (abs((mm["duration"] or 0) - (s1["duration"] or 0)) <= 2)

    item_id = f"mr_{-1003264222864}_{mm['msg_id']}"
    is_completed = (item_id in manifest and manifest[item_id].get("status") == "completed")

    clean_title = m_v["title"]
    ane_verified.append({
        "lecture_no": idx + 1,
        "title": clean_title,
        "mm_msg_id": mm["msg_id"],
        "sub_msg_id": s1["msg_id"],
        "duration_seconds": round(mm["duration"] or s1["duration"] or 0),
        "duration_formatted": format_duration(mm["duration"] or s1["duration"]),
        "file_size": mm["size"] or s1["size"],
        "document_id": mm["doc_id"] or s1["doc_id"],
        "openmedq_status": "Uploaded" if is_completed else "Pending",
        "doc_match": doc_match,
        "size_match": size_match,
        "mm_caption": (mm["text"] or "").split("\n")[0],
        "s1_caption": (s1["text"] or "").split("\n")[0]
    })

print(f"{'#':<3} | {'Status':<9} | {'Dur':<8} | {'Size MB':<7} | {'MM_ID':<5} | {'Sub_ID':<6} | {'Title'}")
print("-" * 95)
for a in ane_verified:
    sz_mb = round((a['file_size'] or 0) / (1024*1024), 1)
    status_tag = "[DONE]" if a['openmedq_status'] == "Uploaded" else "[WAIT]"
    print(f"{a['lecture_no']:<3} | {status_tag:<9} | {a['duration_formatted']:<8} | {sz_mb:<7.1f} | {a['mm_msg_id']:<5} | {a['sub_msg_id']:<6} | {a['title']}")

# Save verified datasets
(PROJECT_DIR / "engine" / "marrow_radiology_verified.json").write_text(json.dumps(rad_verified, indent=2, ensure_ascii=False), encoding="utf-8")
(PROJECT_DIR / "engine" / "marrow_anesthesia_verified.json").write_text(json.dumps(ane_verified, indent=2, ensure_ascii=False), encoding="utf-8")
print("\nSaved verified datasets to engine/marrow_radiology_verified.json and engine/marrow_anesthesia_verified.json")
