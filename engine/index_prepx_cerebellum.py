"""
Yui - Master Indexer for 'Prep X + Cerebellum' Channel
Reads the master index (Message 4018) in the 'Prep X + Cerebellum' channel (-1003709841202),
scans all 60 subject/faculty sections across:
  1. PrepLadder X English (19 Subjects)
  2. PrepLadder X Hinglish (19 Subjects)
  3. Cerebellum Academy (21 Faculty Tracks + 24 Notes PDFs)
and builds a smartly organized, hierarchically sorted catalog with clean OneDrive paths.
"""

import asyncio
import json
from pathlib import Path
import re
import sys
import time
from typing import Any, Dict, List, Optional
from telethon import TelegramClient

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_DIR = Path(__file__).resolve().parent.parent
CATALOG_OUTPUT = PROJECT_DIR / "public" / "prepx_cerebellum_catalog.json"
CHANNEL_ID = -1003709841202
INDEX_MESSAGE_ID = 4018

SUBJECT_ORDER_MAP = {
    "anatomy": ("01_Anatomy", "1st Prof"),
    "physiology": ("02_Physiology", "1st Prof"),
    "biochemistry": ("03_Biochemistry", "1st Prof"),
    "pathology": ("04_Pathology", "2nd Prof"),
    "pharmacology": ("05_Pharmacology", "2nd Prof"),
    "microbiology": ("06_Microbiology", "2nd Prof"),
    "forensic_medicine": ("07_Forensic_Medicine", "2nd Prof"),
    "psm": ("08_Community_Medicine_PSM", "3rd Prof Part 1"),
    "ophthalmology": ("09_Ophthalmology", "3rd Prof Part 1"),
    "ent": ("10_ENT", "3rd Prof Part 1"),
    "medicine": ("11_General_Medicine", "Final Prof Part 2"),
    "surgery": ("12_General_Surgery", "Final Prof Part 2"),
    "obg": ("13_Obstetrics_and_Gynecology", "Final Prof Part 2"),
    "pediatrics": ("14_Pediatrics", "Final Prof Part 2"),
    "psychiatry": ("15_Psychiatry", "Final Prof Part 2"),
    "orthopedics": ("16_Orthopedics", "Final Prof Part 2"),
    "anesthesia": ("17_Anesthesiology", "Final Prof Part 2"),
    "radiology": ("18_Radiology", "Final Prof Part 2"),
    "dermatology": ("19_Dermatology", "Final Prof Part 2"),
}

NORMALIZE_NAME = {
    "ANATOMY": "anatomy",
    "PHYSIOLOGY": "physiology",
    "BIOCHEMISTRY": "biochemistry",
    "BIOCHEMISTRY 1 BY DR AJ": "biochemistry",
    "BIOCHEMISTRY BY DR SP": "biochemistry",
    "PATHOLOGY": "pathology",
    "PHARMACOLOGY": "pharmacology",
    "MICROBIOLOGY": "microbiology",
    "MICROBIOLOGY BY DR D P": "microbiology",
    "MICROBIOLOGY BY DR P S": "microbiology",
    "PSM": "psm",
    "FMT": "forensic_medicine",
    "OPHTHALMOLOGY": "ophthalmology",
    "ENT": "ent",
    "MEDICINE": "medicine",
    "SURGERY": "surgery",
    "OBG": "obg",
    "PEDIATRICS": "pediatrics",
    "PSYCHIATRY": "psychiatry",
    "ORTHOPEDICS": "orthopedics",
    "ANESTHESIA": "anesthesia",
    "RADIOLOGY": "radiology",
    "DERMATOLOGY": "dermatology",
    "NOTES PDF": "notes_pdf",
}


def sanitize_filename(filename: str) -> str:
    clean = re.sub(r'[^\x00-\x7F]+', '_', filename)
    clean = re.sub(r'["*:<>?/\\|#%~]', "_", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:120]


async def run_indexing():
    creds_file = PROJECT_DIR / "credentials_telegram.json"
    session_file = PROJECT_DIR / "telegram_session"

    with open(creds_file, "r", encoding="utf-8") as f:
        creds = json.load(f)

    client = TelegramClient(str(session_file), creds["api_id"], creds["api_hash"])
    await client.connect()

    if not await client.is_user_authorized():
        print("Telegram not authorized.")
        await client.disconnect()
        return

    print(f"Connected to Telegram. Fetching Master Index (Msg {INDEX_MESSAGE_ID})...")
    entity = await client.get_entity(CHANNEL_ID)
    index_msg = await client.get_messages(entity, ids=INDEX_MESSAGE_ID)

    if not index_msg or not (index_msg.text or index_msg.message):
        print("Failed to read index message.")
        await client.disconnect()
        return

    index_text = index_msg.text or index_msg.message
    sections = []
    current_edition = "01_PrepLadder_X_English"

    for line in index_text.split("\n"):
        line = line.strip()
        if "PREP X ENGLISH" in line:
            current_edition = "01_PrepLadder_X_English"
        elif "PREP X HINGLISH" in line:
            current_edition = "02_PrepLadder_X_Hinglish"
        elif "CEREBELLUM ENGLISH" in line:
            current_edition = "03_Cerebellum_Academy"
        else:
            m = re.match(r"-\s*\[(.*?)\]\(https://t\.me/c/\d+/(\d+)\)", line)
            if m:
                raw_title = m.group(1).strip()
                start_id = int(m.group(2))
                sections.append({
                    "edition": current_edition,
                    "raw_title": raw_title,
                    "start_id": start_id,
                })

    print(f"Parsed {len(sections)} sections from Index. Fetching lecture metadata in batches...")

    all_lectures = []
    notes_list = []

    for i in range(len(sections)):
        sec = sections[i]
        next_start = sections[i + 1]["start_id"] if i + 1 < len(sections) else INDEX_MESSAGE_ID
        edition = sec["edition"]
        raw_title = sec["raw_title"]
        norm_key = NORMALIZE_NAME.get(raw_title.upper(), "medicine")

        # Determine clean folder name
        if norm_key in SUBJECT_ORDER_MAP:
            folder_name, prof = SUBJECT_ORDER_MAP[norm_key]
        elif norm_key == "notes_pdf":
            folder_name = "00_Notes_PDF"
            prof = "Clinical Reference"
        else:
            folder_name = f"20_{sanitize_filename(raw_title)}"
            prof = "Clinical"

        # Extra faculty context for Cerebellum
        faculty_tag = ""
        if "DR AJ" in raw_title.upper():
            faculty_tag = " (Dr. Ankur Jain)"
        elif "DR SP" in raw_title.upper():
            faculty_tag = " (Dr. Smily Pruthi)"
        elif "DR D P" in raw_title.upper():
            faculty_tag = " (Dr. Devyani Puri)"
        elif "DR P S" in raw_title.upper():
            faculty_tag = " (Dr. Priyanka Sachdev)"

        display_subject = f"{folder_name}{faculty_tag}".replace(" ", "_")

        msg_ids = list(range(sec["start_id"], next_start))
        print(f"[{edition}] {raw_title} (Msgs {sec['start_id']} to {next_start - 1}) ...")

        # Fetch in batches of 100 for high speed
        batch_size = 100
        for b_start in range(0, len(msg_ids), batch_size):
            chunk_ids = msg_ids[b_start : b_start + batch_size]
            messages = await client.get_messages(entity, ids=chunk_ids)

            for m in messages:
                if not m or not m.file:
                    continue

                fn = m.file.name or f"lecture_{m.id}.mp4"
                clean_fn = sanitize_filename(fn)
                file_size = m.file.size
                is_pdf = clean_fn.lower().endswith(".pdf") or "pdf" in fn.lower()

                # Clean title e.g. "01. Introduction" from "01. Introduction.mp4"
                title = re.sub(r"\.(mp4|pdf|mkv)$", "", clean_fn, flags=re.I).strip()

                remote_onedrive_path = f"Aspirin_LMS/{edition}/{display_subject}/{clean_fn}"

                item_record = {
                    "id": f"px_{CHANNEL_ID}_{m.id}",
                    "chat_id": CHANNEL_ID,
                    "message_id": m.id,
                    "edition": edition,
                    "subject_id": norm_key,
                    "subject_name": raw_title,
                    "folder_name": display_subject,
                    "prof": prof,
                    "title": title,
                    "filename": clean_fn,
                    "file_size_bytes": file_size,
                    "file_size_mb": round(file_size / (1024 * 1024), 2),
                    "is_pdf": is_pdf,
                    "onedrive_path": remote_onedrive_path,
                }

                if is_pdf:
                    notes_list.append(item_record)
                else:
                    all_lectures.append(item_record)

    output_data = {
        "channel_title": "Prep X + Cerebellum",
        "channel_id": CHANNEL_ID,
        "indexed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_videos": len(all_lectures),
        "total_notes": len(notes_list),
        "total_items": len(all_lectures) + len(notes_list),
        "lectures": all_lectures,
        "notes": notes_list,
    }

    CATALOG_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(CATALOG_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2)

    print("\n" + "=" * 65)
    print(f" SUCCESS! Master Index Built!")
    print(f" Total Videos Indexed: {len(all_lectures)}")
    print(f" Total Notes Indexed:  {len(notes_list)}")
    print(f" Total Items:          {len(all_lectures) + len(notes_list)}")
    print(f" Saved to: {CATALOG_OUTPUT}")
    print("=" * 65)

    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(run_indexing())
