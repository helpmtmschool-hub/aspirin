import asyncio
import json
from pathlib import Path
from telethon import TelegramClient

PROJECT_DIR = Path(__file__).resolve().parent.parent if "engine" in str(Path(__file__)) else Path(".").resolve()
creds = json.loads((PROJECT_DIR / "credentials_telegram.json").read_text(encoding="utf-8"))
client = TelegramClient(str(PROJECT_DIR / "telegram_session"), creds["api_id"], creds["api_hash"])

MARROW_CHANNEL_ID = -1003264222864

FINAL_YEAR_TOPICS = [
    {"subject_id": "surgery", "topic_id": 339, "title": "Surgery"},
    {"subject_id": "obg", "topic_id": 423, "title": "Obstetrics & Gynecology"},
    {"subject_id": "pediatrics", "topic_id": 252, "title": "Pediatrics"},
    {"subject_id": "orthopedics", "topic_id": 787, "title": "Orthopedics"},
    {"subject_id": "anesthesia", "topic_id": 575, "title": "Anesthesiology"},
    {"subject_id": "dermatology", "topic_id": 310, "title": "Dermatology"},
    {"subject_id": "psychiatry", "topic_id": 1293, "title": "Psychiatry"},
    {"subject_id": "radiology", "topic_id": 533, "title": "Radiology"},
    {"subject_id": "ophthalmology", "topic_id": 211, "title": "Ophthalmology"},
    {"subject_id": "ent", "topic_id": 146, "title": "ENT"},
]

async def main():
    await client.connect()
    entity = await client.get_entity(MARROW_CHANNEL_ID)
    
    all_sections = []
    
    for item in FINAL_YEAR_TOPICS:
        subj = item["subject_id"]
        t_id = item["topic_id"]
        title = item["title"]
        print(f"Indexing Marrow {title} (Topic {t_id})...")
        
        # Get messages in chronological order (reverse=True)
        messages = await client.get_messages(entity, reply_to=t_id, limit=None, reverse=True)
        
        video_items = []
        for m in messages:
            # Check if video
            is_video = bool(m.video) or (
                m.document and m.file and (
                    (m.file.mime_type and m.file.mime_type.startswith("video/")) or
                    (m.file.name and m.file.name.lower().endswith((".mp4", ".mkv", ".webm", ".mov")))
                )
            )
            if not is_video:
                continue
                
            raw_fn = m.file.name if m.file and m.file.name else None
            caption = (m.text or m.message or "").strip()
            
            # Prefer caption if it contains lecture numbering / title
            lecture_title = ""
            if caption:
                lecture_title = caption.split("\n")[0].strip()
            elif raw_fn:
                lecture_title = raw_fn
            else:
                lecture_title = f"Lecture {m.id}"
                
            video_items.append({
                "message_id": m.id,
                "title": lecture_title,
                "raw_filename": raw_fn,
                "file_size": m.file.size if m.file else 0,
            })
            
        print(f"  -> Found {len(video_items)} videos for {title}")
        all_sections.append({
            "platform": "marrow",
            "subject_id": subj,
            "topic_id": t_id,
            "title": title,
            "videos": video_items,
        })
        
    out_file = PROJECT_DIR / "engine" / "marrow_sections.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(all_sections, f, indent=2)
    print(f"\nSuccessfully indexed all Final Year Marrow subjects to {out_file}!")

if __name__ == "__main__":
    asyncio.run(main())
