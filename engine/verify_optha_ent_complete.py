import json
import re
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

dump = json.load(open("engine/scratch_optha_ent_tg_dump.json", encoding="utf-8"))
marrow_ch = json.load(open("engine/scratch_marrow_ch_slice.json", encoding="utf-8"))

MY_MARROW = -1003264222864
SUBJECTWISE = -1003506593387
MARROW_FLAT = -1003659432109

optha_mm = dump["my_marrow_optha_211"]
optha_s1 = dump["subjectwise_optha_2741"]
optha_flat = [m for m in marrow_ch if 294 <= m["msg_id"] <= 334]

ent_mm = dump["my_marrow_ent_146"]
ent_s1 = dump["subjectwise_ent_3102"]
ent_s2 = dump["subjectwise_ent_2647"]
ent_flat = [m for m in marrow_ch if 229 <= m["msg_id"] <= 293]

print("=== VERIFYING OPHTHALMOLOGY (Target: 40 Lectures) ===")
# Note: In Subjectwise, 2759 and 2760 are identical duplicates of Lecture 18 (doc_id 5852947187767448962).
# Let's remove the duplicate 2760 from optha_s1.
clean_optha_s1 = []
seen_docs = set()
for x in optha_s1:
    if x["doc_id"] in seen_docs:
        print(f"Skipping duplicate in Subjectwise: id={x['msg_id']} fn={x['filename']} doc={x['doc_id']}")
        continue
    seen_docs.add(x["doc_id"])
    clean_optha_s1.append(x)

print(f"Clean Subjectwise Optha count: {len(clean_optha_s1)}")
print(f"MyMarrow Optha count: {len(optha_mm)}")
print(f"Flat Channel Optha count: {len(optha_flat)}")

# Let's map each lecture 1..40
verified_optha = []
for idx in range(40):
    mm = optha_mm[idx] if idx < len(optha_mm) else None
    s1 = clean_optha_s1[idx] if idx < len(clean_optha_s1) else None
    fl = optha_flat[idx] if idx < len(optha_flat) else None

    lec_num = idx + 1
    
    # Check durations and sizes
    durs = [x["duration"] for x in (mm, s1, fl) if x and x["duration"]]
    sizes = [x["size"] for x in (mm, s1, fl) if x and x["size"]]
    
    verified_optha.append({
        "lecture_no": lec_num,
        "mm": mm,
        "s1": s1,
        "flat": fl,
        "durations": durs,
        "sizes": sizes
    })

# Output summary table
print("\nLecture No | Dur (s) | Size (MB) | MM msg_id | S1 msg_id | Flat msg_id | Suggested Clean Title")
print("-" * 100)
for item in verified_optha:
    l_no = item["lecture_no"]
    dur = round(item["durations"][0]) if item["durations"] else 0
    size_mb = round(item["sizes"][0] / (1024*1024), 1) if item["sizes"] else 0
    mm_id = item["mm"]["msg_id"] if item["mm"] else "-"
    s1_id = item["s1"]["msg_id"] if item["s1"] else "-"
    fl_id = item["flat"]["msg_id"] if item["flat"] else "-"
    
    # Titles
    mm_t = (item["mm"]["text"] or "").split("\n")[0] if item["mm"] else ""
    s1_t = (item["s1"]["text"] or "").split("\n")[0] if item["s1"] else ""
    fl_t = (item["flat"]["text"] or "").split("\n")[0] if item["flat"] else ""
    
    print(f"{l_no:02d} | {dur:4d}s | {size_mb:6.1f} MB | MM:{mm_id} | S1:{s1_id} | Fl:{fl_id}")
    print(f"     S1:   {s1_t}")
    print(f"     MM:   {mm_t}")
    print(f"     Flat: {fl_t}")

# Now ENT
print("\n=======================================================")
print("=== VERIFYING ENT (Target: 64 Lectures) ===")
print("=======================================================")

print(f"Subjectwise 3102 count: {len(ent_s1)}")
print(f"Subjectwise 2647 count: {len(ent_s2)}")
print(f"MyMarrow count: {len(ent_mm)}")
print(f"Flat Channel count: {len(ent_flat)}")

# In MyMarrow, lecture 52 is missing! Let's build a map from S1 (which has all 64)
verified_ent = []
for idx in range(64):
    s1 = ent_s1[idx]
    s2 = ent_s2[idx] if idx < len(ent_s2) else None
    fl = ent_flat[idx] if idx < len(ent_flat) else None
    
    lec_no = idx + 1
    
    # Find in MyMarrow by duration match within 2s or doc_id
    mm_match = None
    for m in ent_mm:
        if m["doc_id"] and m["doc_id"] == s1["doc_id"]:
            mm_match = m
            break
        if m["duration"] and s1["duration"] and abs(m["duration"] - s1["duration"]) <= 2:
            mm_match = m
            break
            
    verified_ent.append({
        "lecture_no": lec_no,
        "s1": s1,
        "s2": s2,
        "flat": fl,
        "mm": mm_match
    })

print("\nLecture No | Dur (s) | Size (MB) | S1 msg_id | MM msg_id | Flat msg_id | S1 Title / MM Title")
print("-" * 110)
for item in verified_ent:
    l_no = item["lecture_no"]
    dur = round(item["s1"]["duration"]) if item["s1"]["duration"] else 0
    size_mb = round(item["s1"]["size"] / (1024*1024), 1) if item["s1"]["size"] else 0
    s1_id = item["s1"]["msg_id"]
    mm_id = item["mm"]["msg_id"] if item["mm"] else "MISSING"
    fl_id = item["flat"]["msg_id"] if item["flat"] else "-"
    
    s1_t = (item["s1"]["text"] or "").split("\n")[0]
    mm_t = (item["mm"]["text"] or "").split("\n")[0] if item["mm"] else "--- MISSING IN MY MARROW ---"
    fl_t = (item["flat"]["text"] or "").split("\n")[0] if item["flat"] else ""
    
    print(f"{l_no:02d} | {dur:4d}s | {size_mb:6.1f} MB | S1:{s1_id} | MM:{mm_id} | Fl:{fl_id}")
    print(f"     S1:   {s1_t}")
    print(f"     MM:   {mm_t}")
    print(f"     Flat: {fl_t}")
