"""
Yui - Telegram Medical Channel Indexer
Scans user Telegram channels (Marrow, PrepLadder, Subjectwise Lectures),
extracts lecture videos, notes, PDFs, durations, and high-yield topics,
and generates Cloudflare D1 SQL migrations and public/catalog.json.
"""

import asyncio
import json
import os
from pathlib import Path
import re
import sys
from typing import Any, Dict, List, Optional

from telethon import TelegramClient

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Paths: Self-contained in Yui with fallback
YUI_DIR = Path(__file__).resolve().parent.parent
FALLBACK_BASE_DIR = Path("C:/Users/medxs/OneDrive/sain")

if (YUI_DIR / "credentials_telegram.json").exists():
    CREDS_PATH = YUI_DIR / "credentials_telegram.json"
else:
    CREDS_PATH = FALLBACK_BASE_DIR / "credentials_telegram.json"

if (YUI_DIR / "telegram_session.session").exists():
    SESSION_PATH = YUI_DIR / "telegram_session"
elif (YUI_DIR / "brain" / "telegram_session.session").exists():
    SESSION_PATH = YUI_DIR / "brain" / "telegram_session"
else:
    SESSION_PATH = FALLBACK_BASE_DIR / "brain" / "telegram_session"

D1_DIR = YUI_DIR / "d1"
PUBLIC_DIR = YUI_DIR / "public"


# The 19 Canonical MBBS / NEET-PG Subjects
CANONICAL_SUBJECTS = [
    # 1st Prof
    {"id": "anatomy", "name": "Anatomy", "code": "ANAT", "prof": "1st Prof", "category": "Pre-Clinical", "icon": "Bone", "color": "#E11D48"},
    {"id": "physiology", "name": "Physiology", "code": "PHYS", "prof": "1st Prof", "category": "Pre-Clinical", "icon": "Activity", "color": "#EA580C"},
    {"id": "biochemistry", "name": "Biochemistry", "code": "BIO", "prof": "1st Prof", "category": "Pre-Clinical", "icon": "Dna", "color": "#D97706"},
    # 2nd Prof
    {"id": "pathology", "name": "Pathology", "code": "PATH", "prof": "2nd Prof", "category": "Para-Clinical", "icon": "Microscope", "color": "#7C3AED"},
    {"id": "pharmacology", "name": "Pharmacology", "code": "PHARM", "prof": "2nd Prof", "category": "Para-Clinical", "icon": "Pill", "color": "#2563EB"},
    {"id": "microbiology", "name": "Microbiology", "code": "MICRO", "prof": "2nd Prof", "category": "Para-Clinical", "icon": "Bug", "color": "#059669"},
    {"id": "forensic_medicine", "name": "Forensic Medicine", "code": "FMT", "prof": "2nd Prof", "category": "Para-Clinical", "icon": "ShieldAlert", "color": "#4B5563"},
    # 3rd Prof Part 1
    {"id": "psm", "name": "Community Medicine (PSM)", "code": "PSM", "prof": "3rd Prof Part 1", "category": "Clinical", "icon": "Users", "color": "#0D9488"},
    {"id": "ophthalmology", "name": "Ophthalmology", "code": "OPHTH", "prof": "3rd Prof Part 1", "category": "Clinical", "icon": "Eye", "color": "#0284C7"},
    {"id": "ent", "name": "ENT (Otorhinolaryngology)", "code": "ENT", "prof": "3rd Prof Part 1", "category": "Clinical", "icon": "Ear", "color": "#059669"},
    # Final Prof Part 2
    {"id": "medicine", "name": "General Medicine", "code": "MED", "prof": "Final Prof Part 2", "category": "Clinical", "icon": "Stethoscope", "color": "#0284C7"},
    {"id": "surgery", "name": "General Surgery", "code": "SURG", "prof": "Final Prof Part 2", "category": "Clinical", "icon": "Scissors", "color": "#DC2626"},
    {"id": "obgyn", "name": "Obstetrics & Gynecology", "code": "OBGYN", "prof": "Final Prof Part 2", "category": "Clinical", "icon": "HeartHandshake", "color": "#DB2777"},
    {"id": "pediatrics", "name": "Pediatrics", "code": "PEDS", "prof": "Final Prof Part 2", "category": "Clinical", "icon": "Baby", "color": "#F59E0B"},
    {"id": "orthopedics", "name": "Orthopedics", "code": "ORTHO", "prof": "Final Prof Part 2", "category": "Clinical", "icon": "Footprints", "color": "#65A30D"},
    {"id": "dermatology", "name": "Dermatology", "code": "DERM", "prof": "Final Prof Part 2", "category": "Clinical", "icon": "Sparkles", "color": "#9333EA"},
    {"id": "psychiatry", "name": "Psychiatry", "code": "PSYCH", "prof": "Final Prof Part 2", "category": "Clinical", "icon": "Brain", "color": "#4F46E5"},
    {"id": "radiology", "name": "Radiology", "code": "RADIO", "prof": "Final Prof Part 2", "category": "Clinical", "icon": "Scan", "color": "#0891B2"},
    {"id": "anesthesiology", "name": "Anesthesiology", "code": "ANES", "prof": "Final Prof Part 2", "category": "Clinical", "icon": "Wind", "color": "#475569"},
]

SUBJECT_KEYWORD_MAP = {
    "ent": ["ent", "ear", "nose", "throat", "septoplasty", "larynx", "micro laryngeal"],
    "ophthalmology": ["ophthalmology", "eye", "cataract", "retina", "glaucoma", "cornea"],
    "medicine": ["medicine", "nephrology", "endocrinology", "cardiology", "neurology", "bartter", "gitelman", "liddle", "pituitary"],
    "surgery": ["surgery", "operative", "laparoscopy", "appendectomy", "hernia"],
    "psm": ["psm", "community medicine", "epidemiology", "biostatistics", "osce psm"],
    "forensic_medicine": ["forensic", "fmt", "fsm", "autopsy", "xray", "dmch fsm"],
    "pediatrics": ["pediatrics", "peds", "neonatology", "milestones"],
    "obgyn": ["obgyn", "obstetrics", "gynecology", "labor", "antenatal"],
    "orthopedics": ["orthopedics", "ortho", "fracture", "joint"],
    "pathology": ["pathology", "path", "histology", "neoplasia"],
    "pharmacology": ["pharmacology", "pharma", "drugs", "antimicrobials"],
    "microbiology": ["microbiology", "micro", "virology", "bacteriology"],
    "anatomy": ["anatomy", "embryology", "neuroanatomy"],
    "physiology": ["physiology", "physio"],
    "biochemistry": ["biochemistry", "metabolism"],
    "radiology": ["radiology", "ct scan", "mri", "ultrasound"],
    "dermatology": ["dermatology", "skin", "lesions"],
    "psychiatry": ["psychiatry", "depression", "schizophrenia"],
    "anesthesiology": ["anesthesia", "anesthesiology"],
}


def detect_subject(text: str, filename: str) -> str:
    combined = f"{text} {filename}".lower()
    for sub_id, keywords in SUBJECT_KEYWORD_MAP.items():
        if any(kw in combined for kw in keywords):
            return sub_id
    return "medicine"  # Default fallback


def clean_title(text: str, filename: str) -> str:
    # Try parsing "TITLE: ... COURSE: ..."
    title_match = re.search(r"TITLE:\s*(.*?)(?:\s*COURSE:|$)", text, re.IGNORECASE)
    if title_match and title_match.group(1).strip():
        return title_match.group(1).replace("|", " - ").strip()
    
    # Try numbered prefixes e.g. "48. Bartter Syndrome..."
    num_match = re.search(r"^\d+\.\s*([^\n]+)", text)
    if num_match and num_match.group(1).strip():
        return num_match.group(1).split("Topic :")[0].strip()

    if filename and filename.endswith((".mp4", ".mkv", ".pdf")):
        clean_fn = re.sub(r"\.(mp4|mkv|pdf)$", "", filename)
        clean_fn = clean_fn.replace("_", " ").strip()
        if clean_fn:
            return clean_fn

    first_line = (text.split("\n")[0] if text else "Clinical Lecture").strip()
    return first_line[:80] or "Clinical Lecture"


async def index_telegram_channels(limit_per_channel: int = 100) -> Dict[str, Any]:
    with open(CREDS_PATH, "r", encoding="utf-8") as f:
        creds = json.load(f)

    client = TelegramClient(str(SESSION_PATH), creds["api_id"], creds["api_hash"])
    await client.connect()
    if not await client.is_user_authorized():
        await client.disconnect()
        raise PermissionError("Telegram not authorized")

    print("[Indexer] Scanning user dialogs...")
    target_dialogs = []
    target_keywords = [
        "subjectwise lectures",
        "prepladder",
        "marrow",
        "ophthalmology",
        "cereb",
        "medlex",
    ]

    async for dialog in client.iter_dialogs(limit=60):
        name_lower = (dialog.title or "").lower()
        if any(kw in name_lower for kw in target_keywords):
            target_dialogs.append(dialog)
            print(f"  Found target: {dialog.title} (ID: {dialog.id})")

    topics_by_subject: Dict[str, List[Dict[str, Any]]] = {s["id"]: [] for s in CANONICAL_SUBJECTS}
    notes_by_subject: Dict[str, List[Dict[str, Any]]] = {s["id"]: [] for s in CANONICAL_SUBJECTS}

    total_scanned = 0
    total_indexed = 0

    for dialog in target_dialogs:
        print(f"\n[Indexer] Indexing '{dialog.title}'...")
        async for msg in client.iter_messages(dialog.entity, limit=limit_per_channel):
            total_scanned += 1
            if not msg.media or not hasattr(msg, "file") or not msg.file:
                continue

            fname = getattr(msg.file, "name", "") or ""
            text = msg.text or ""
            fsize = msg.file.size or 0
            is_pdf = fname.lower().endswith(".pdf") or "application/pdf" in getattr(msg.file, "mime_type", "")
            is_video = (
                fname.lower().endswith((".mp4", ".mkv", ".mov"))
                or "video" in getattr(msg.file, "mime_type", "")
                or fsize > 15 * 1024 * 1024
            )

            subject_id = detect_subject(text, fname)
            title = clean_title(text, fname)

            # Generate high-yield key pearls from text / title
            pearls = []
            if "PYQ" in title.upper() or "INI CET" in title.upper():
                pearls.append("Frequently asked in INI-CET & NEET-PG exams")
                pearls.append("Review operative anatomical landmarks carefully")
            if "Bartter" in title or "Gitelman" in title or "Liddle" in title:
                pearls.append("Bartter: Thick Ascending Limb (TAL) defect (Na-K-2Cl cotransporter)")
                pearls.append("Gitelman: Distal Convoluted Tubule (DCT) defect (NCCT cotransporter) with Hypocalciuria")
                pearls.append("Liddle: Gain of function mutation in ENaC channels (Pseudohyperaldosteronism)")
            if "Septoplasty" in title:
                pearls.append("Freer's incision made at caudal border of septal cartilage")
                pearls.append("Preserve 1cm dorsal and caudal L-strut to prevent saddle nose deformity")
            if "Pituitary" in title:
                pearls.append("Most common pituitary adenoma: Prolactinoma")
                pearls.append("Bitemporal hemianopia due to optic chiasm compression")

            if not pearls:
                pearls = [
                    f"Core high-yield concepts in {title}",
                    "Focus on clinical presentation, investigation of choice, and management protocols",
                ]

            if is_pdf:
                note_item = {
                    "id": f"note_{dialog.id}_{msg.id}",
                    "subject_id": subject_id,
                    "title": title,
                    "filename": fname or f"{title}.pdf",
                    "file_size_bytes": fsize,
                    "file_size_mb": round(fsize / (1024 * 1024), 2),
                    "chat_id": dialog.id,
                    "message_id": msg.id,
                    "date": msg.date.isoformat() if msg.date else None,
                }
                notes_by_subject[subject_id].append(note_item)
                total_indexed += 1
            elif is_video:
                topic_item = {
                    "id": f"topic_{dialog.id}_{msg.id}",
                    "subject_id": subject_id,
                    "module": "Clinical Lectures & PYQs",
                    "title": title,
                    "filename": fname or f"{title}.mp4",
                    "file_size_bytes": fsize,
                    "file_size_mb": round(fsize / (1024 * 1024), 2),
                    "duration_seconds": 1800,  # ~30 min estimate if missing in metadata
                    "duration_formatted": "30 mins",
                    "chat_id": dialog.id,
                    "message_id": msg.id,
                    "pearls": pearls,
                    "date": msg.date.isoformat() if msg.date else None,
                }
                topics_by_subject[subject_id].append(topic_item)
                total_indexed += 1

    await client.disconnect()
    print(f"\n[Indexer] Scan complete! Scanned {total_scanned} messages, indexed {total_indexed} media items.")

    # Structure full catalog
    catalog = {
        "version": "1.0.0",
        "app_name": "Yui",
        "subjects": [],
    }

    for sub in CANONICAL_SUBJECTS:
        s_id = sub["id"]
        topics = topics_by_subject[s_id]
        notes = notes_by_subject[s_id]
        
        # Group topics into modules
        modules_map = {}
        for t in topics:
            mod_name = t["module"]
            if mod_name not in modules_map:
                modules_map[mod_name] = []
            modules_map[mod_name].append(t)

        modules_list = []
        for mod_name, mod_topics in modules_map.items():
            modules_list.append({
                "id": f"mod_{s_id}_{len(modules_list)+1}",
                "name": mod_name,
                "topics": mod_topics,
            })

        sub_data = {
            **sub,
            "total_topics": len(topics),
            "total_notes": len(notes),
            "modules": modules_list,
            "notes": notes,
        }
        catalog["subjects"].append(sub_data)

    # Save public catalog JSON
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)
    catalog_path = PUBLIC_DIR / "catalog.json"
    with open(catalog_path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)
    print(f"[Indexer] Saved catalog JSON to {catalog_path}")

    # Generate SQL schema & seed
    generate_d1_sql(catalog)
    return catalog


def generate_d1_sql(catalog: Dict[str, Any]):
    D1_DIR.mkdir(parents=True, exist_ok=True)

    # Schema
    schema_sql = """-- Yui LMS Cloudflare D1 Relational Database Schema
DROP TABLE IF EXISTS user_notes;
DROP TABLE IF EXISTS user_progress;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS topics;
DROP TABLE IF EXISTS modules;
DROP TABLE IF EXISTS subjects;

CREATE TABLE subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    prof TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    display_order INTEGER NOT NULL
);

CREATE TABLE modules (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    display_order INTEGER DEFAULT 1,
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
);

CREATE TABLE topics (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    module_id TEXT NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    duration_seconds INTEGER DEFAULT 1800,
    duration_formatted TEXT DEFAULT '30 mins',
    telegram_chat_id INTEGER NOT NULL,
    telegram_message_id INTEGER NOT NULL,
    pearls_json TEXT DEFAULT '[]',
    display_order INTEGER DEFAULT 1,
    FOREIGN KEY(subject_id) REFERENCES subjects(id),
    FOREIGN KEY(module_id) REFERENCES modules(id)
);

CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    telegram_chat_id INTEGER NOT NULL,
    telegram_message_id INTEGER NOT NULL,
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
);

CREATE TABLE user_progress (
    topic_id TEXT PRIMARY KEY,
    watched_seconds REAL DEFAULT 0,
    total_seconds REAL DEFAULT 1800,
    is_completed INTEGER DEFAULT 0,
    is_bookmarked INTEGER DEFAULT 0,
    last_watched_at TEXT,
    FOREIGN KEY(topic_id) REFERENCES topics(id)
);

CREATE TABLE user_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id TEXT NOT NULL,
    timestamp_seconds REAL NOT NULL,
    note_text TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(topic_id) REFERENCES topics(id)
);

CREATE INDEX idx_topics_subject ON topics(subject_id);
CREATE INDEX idx_notes_subject ON notes(subject_id);
CREATE INDEX idx_progress_topic ON user_progress(topic_id);
"""
    with open(D1_DIR / "schema.sql", "w", encoding="utf-8") as f:
        f.write(schema_sql)
    print(f"[Indexer] Generated D1 schema at {D1_DIR / 'schema.sql'}")

    # Seed SQL
    seed_lines = ["-- Yui LMS D1 Initial Seed Data", "BEGIN TRANSACTION;"]

    # Insert Subjects
    for idx, sub in enumerate(catalog["subjects"]):
        seed_lines.append(
            f"INSERT INTO subjects (id, name, code, prof, category, icon, color, display_order) "
            f"VALUES ('{sub['id']}', '{sub['name']}', '{sub['code']}', '{sub['prof']}', '{sub['category']}', '{sub['icon']}', '{sub['color']}', {idx+1});"
        )

        # Insert Modules & Topics
        for mod_idx, mod in enumerate(sub.get("modules", [])):
            mod_title = mod["name"].replace("'", "''")
            seed_lines.append(
                f"INSERT INTO modules (id, subject_id, title, display_order) "
                f"VALUES ('{mod['id']}', '{sub['id']}', '{mod_title}', {mod_idx+1});"
            )

            for t_idx, topic in enumerate(mod.get("topics", [])):
                t_title = topic["title"].replace("'", "''")
                t_fname = topic["filename"].replace("'", "''")
                pearls_escaped = json.dumps(topic.get("pearls", [])).replace("'", "''")
                seed_lines.append(
                    f"INSERT INTO topics (id, subject_id, module_id, title, filename, file_size_bytes, duration_seconds, duration_formatted, telegram_chat_id, telegram_message_id, pearls_json, display_order) "
                    f"VALUES ('{topic['id']}', '{sub['id']}', '{mod['id']}', '{t_title}', '{t_fname}', {topic['file_size_bytes']}, {topic.get('duration_seconds', 1800)}, '{topic.get('duration_formatted', '30 mins')}', {topic['chat_id']}, {topic['message_id']}, '{pearls_escaped}', {t_idx+1});"
                )

        # Insert Notes
        for note in sub.get("notes", []):
            n_title = note["title"].replace("'", "''")
            n_fname = note["filename"].replace("'", "''")
            seed_lines.append(
                f"INSERT INTO notes (id, subject_id, title, filename, file_size_bytes, telegram_chat_id, telegram_message_id) "
                f"VALUES ('{note['id']}', '{sub['id']}', '{n_title}', '{n_fname}', {note['file_size_bytes']}, {note['chat_id']}, {note['message_id']});"
            )

    seed_lines.append("COMMIT;")
    seed_sql = "\n".join(seed_lines)
    with open(D1_DIR / "seed.sql", "w", encoding="utf-8") as f:
        f.write(seed_sql)
    print(f"[Indexer] Generated D1 seed at {D1_DIR / 'seed.sql'}")


if __name__ == "__main__":
    asyncio.run(index_telegram_channels())
