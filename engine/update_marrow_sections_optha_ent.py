import json
import sys
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_DIR = Path(__file__).resolve().parent.parent

optha_verified = json.load(open(PROJECT_DIR / "engine" / "marrow_ophthalmology_verified.json", encoding="utf-8"))
ent_verified = json.load(open(PROJECT_DIR / "engine" / "marrow_ent_verified.json", encoding="utf-8"))

marrow_sections = json.load(open(PROJECT_DIR / "engine" / "marrow_sections.json", encoding="utf-8"))

# Build Optha video items
optha_videos = []
for v in optha_verified:
    item = {
        "message_id": v["primary_source"]["message_id"],
        "title": v["title"],
        "raw_filename": v["primary_source"]["filename"],
        "file_size": v["file_size"],
        "duration_seconds": v["duration_seconds"],
        "duration_formatted": v["duration_formatted"],
        "document_id": v["document_id"]
    }
    optha_videos.append(item)

# Build ENT video items
ent_videos = []
for v in ent_verified:
    item = {
        "message_id": v["primary_source"]["message_id"],
        "title": v["title"],
        "raw_filename": v["primary_source"]["filename"],
        "file_size": v["file_size"],
        "duration_seconds": v["duration_seconds"],
        "duration_formatted": v["duration_formatted"],
        "document_id": v["document_id"]
    }
    if v["primary_source"]["chat_id"] != -1003264222864:
        item["chat_id"] = v["primary_source"]["chat_id"]
    ent_videos.append(item)

# Replace in marrow_sections
updated = 0
for sec in marrow_sections:
    if sec["subject_id"] == "ophthalmology":
        sec["videos"] = optha_videos
        updated += 1
        print(f"Updated Ophthalmology with {len(optha_videos)} lectures")
    elif sec["subject_id"] == "ent":
        sec["videos"] = ent_videos
        updated += 1
        print(f"Updated ENT with {len(ent_videos)} lectures")

with open(PROJECT_DIR / "engine" / "marrow_sections.json", "w", encoding="utf-8") as f:
    json.dump(marrow_sections, f, indent=2, ensure_ascii=False)

print(f"marrow_sections.json successfully updated! (sections modified: {updated})")
