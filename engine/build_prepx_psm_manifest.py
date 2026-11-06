import json
from pathlib import Path

with open("engine/prepladder_x_psm_catalog.json", "r", encoding="utf-8") as f:
    cat = json.load(f)

manifest = []

# 1. Notes PDF
note = cat["notes"]
manifest.append({
    "id": f"px_psm_note_{note['msg_id']}",
    "subject": "Community Medicine (PSM)",
    "subject_id": "psm",
    "platform": "prepx_en",
    "type": "note",
    "chat_id": -1003839992379,
    "topic_id": 8633,
    "message_id": note["msg_id"],
    "file_name": note["file_name"],
    "title": "PrepLadder Version X PSM Complete Notes",
    "preferred_filename": "PSM Version X Notes.pdf",
    "folder_path": "Aspirin_LMS/PrepLadder_X/PSM",
    "size_bytes": note["size_bytes"],
    "size_mb": note["size_mb"],
    "is_master_textbook": True
})

# 2. QBank PDF
qbank = cat["qbank"]
manifest.append({
    "id": f"px_psm_qbank_{qbank['msg_id']}",
    "subject": "Community Medicine (PSM)",
    "subject_id": "psm",
    "platform": "prepx_en",
    "type": "qbank",
    "chat_id": -1002185821255,
    "topic_id": None,
    "message_id": qbank["msg_id"],
    "file_name": qbank["file_name"],
    "title": "PrepLadder Version X PSM Question Bank",
    "preferred_filename": "PSM Version X Qbank.pdf",
    "folder_path": "Aspirin_LMS/PrepLadder_X/PSM",
    "size_bytes": qbank["size_bytes"],
    "size_mb": qbank["size_mb"],
    "is_master_textbook": False
})

# 3. Video Lectures
for idx, lec in enumerate(cat["lectures"], start=1):
    manifest.append({
        "id": f"px_psm_vid_{lec['msg_id']}",
        "seq": idx,
        "subject": "Community Medicine (PSM)",
        "subject_id": "psm",
        "platform": "prepx_en",
        "type": "video",
        "chat_id": -1003839992379,
        "topic_id": 8633,
        "message_id": lec["msg_id"],
        "file_name": lec["file_name"],
        "title": lec["title"],
        "preferred_filename": lec["file_name"],
        "folder_path": "Aspirin_LMS/PrepLadder_X/PSM",
        "duration_seconds": lec["duration_seconds"],
        "duration_str": lec["duration_str"],
        "size_bytes": lec["size_bytes"],
        "size_mb": lec["size_mb"]
    })

out_path = Path("engine/prepladder_x_psm_manifest.json")
out_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Created {out_path} with {len(manifest)} items ({len(manifest)-2} videos + 2 PDFs)!")
print(f"Total Size: {sum(m['size_bytes'] for m in manifest) / (1024*1024*1024):.2f} GB")
