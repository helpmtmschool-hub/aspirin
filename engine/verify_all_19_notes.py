import asyncio
import json
import sys
from pathlib import Path
from telethon import TelegramClient

sys.stdout.reconfigure(encoding='utf-8')

with open('credentials_telegram.json', 'r', encoding='utf-8') as f:
    creds = json.load(f)

client = TelegramClient('telegram_session', creds['api_id'], creds['api_hash'])

NOTES_MANIFEST = [
    # 1st Prof
    {
        "prof_year": "1st Prof",
        "subject": "Anatomy",
        "platform": "eGurukul 4.0 / DBMCI",
        "faculty": "Dr. Ashwini Kumar",
        "chat_id": -1003839992379,
        "msg_id": 17227,
        "topic_id": 15033,
        "channel_name": "Folderwise Free Group",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "1st Prof",
        "subject": "Physiology",
        "platform": "PrepLadder Edition X English",
        "faculty": "Dr. Vivek Nalgirkar",
        "chat_id": -1002185821255,
        "msg_id": 270,
        "topic_id": None,
        "channel_name": "PR€PL#DD€R X V€RSI0N",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "1st Prof",
        "subject": "Biochemistry",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Rebecca James",
        "chat_id": -1003264222864,
        "msg_id": 697,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes"
    },
    # 2nd Prof
    {
        "prof_year": "2nd Prof",
        "subject": "Pathology",
        "platform": "PrepLadder Edition X English",
        "faculty": "Dr. Sparsh Gupta",
        "chat_id": -1002185821255,
        "msg_id": 267,
        "topic_id": None,
        "channel_name": "PR€PL#DD€R X V€RSI0N",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "2nd Prof",
        "subject": "Microbiology",
        "platform": "PrepLadder Edition X English",
        "faculty": "Dr. Preeti Sharma",
        "chat_id": -1002185821255,
        "msg_id": 314,
        "topic_id": None,
        "channel_name": "PR€PL#DD€R X V€RSI0N",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "2nd Prof",
        "subject": "Pharmacology",
        "platform": "Cerebellum Academy",
        "faculty": "Dr. Gobind Rai Garg",
        "chat_id": -1003839992379,
        "msg_id": 47640,
        "topic_id": 46021,
        "channel_name": "Folderwise Free Group",
        "notes_type": "Master Full Notes"
    },
    # 3rd Prof (Part 1)
    {
        "prof_year": "3rd Prof (Part 1)",
        "subject": "Forensic Medicine & Toxicology (FMT)",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Akhilesh Raj",
        "chat_id": -1003264222864,
        "msg_id": 694,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "3rd Prof (Part 1)",
        "subject": "Preventive & Social Medicine (PSM)",
        "platform": "Cerebellum Academy",
        "faculty": "Dr. Vivek Jain",
        "chat_id": -1003839992379,
        "msg_id": 47644,
        "topic_id": 46021,
        "channel_name": "Folderwise Free Group",
        "notes_type": "Master Full Notes"
    },
    # Final Prof (Part 2 & Clinicals)
    {
        "prof_year": "Final Prof",
        "subject": "General Medicine",
        "platform": "PrepLadder Edition X English",
        "faculty": "Dr. Deepak Marwah",
        "chat_id": -1004345284917,
        "msg_id": 35,
        "topic_id": None,
        "channel_name": "Prepladder X",
        "notes_type": "Master Final Notes (High Res)"
    },
    {
        "prof_year": "Final Prof",
        "subject": "General Surgery",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Rohan Khandelwal",
        "chat_id": -1003264222864,
        "msg_id": 689,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "Final Prof",
        "subject": "Obstetrics & Gynecology (OBG) - Gynae",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Sakshi Arora",
        "chat_id": -1003264222864,
        "msg_id": 688,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes (Gynae)"
    },
    {
        "prof_year": "Final Prof",
        "subject": "Obstetrics & Gynecology (OBG) - Obs",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Sakshi Arora",
        "chat_id": -1003264222864,
        "msg_id": 736,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes (Obstetrics)"
    },
    {
        "prof_year": "Final Prof",
        "subject": "Pediatrics",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Singaram",
        "chat_id": -1003264222864,
        "msg_id": 691,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "Final Prof",
        "subject": "Orthopedics",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Abbas Ali",
        "chat_id": -1003264222864,
        "msg_id": 684,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "Final Prof",
        "subject": "Ophthalmology",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Utsav Bansal",
        "chat_id": -1003264222864,
        "msg_id": 692,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "Final Prof",
        "subject": "ENT",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Manisha Sinha Budhiraja",
        "chat_id": -1003264222864,
        "msg_id": 693,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "Final Prof",
        "subject": "Anesthesiology",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Rama Krishna",
        "chat_id": -1003264222864,
        "msg_id": 686,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "Final Prof",
        "subject": "Radiology",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Mayur Arun Kulkarni",
        "chat_id": -1003264222864,
        "msg_id": 687,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "Final Prof",
        "subject": "Dermatology",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Malcolm Pinto",
        "chat_id": -1003264222864,
        "msg_id": 690,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes"
    },
    {
        "prof_year": "Final Prof",
        "subject": "Psychiatry",
        "platform": "Marrow Edition 6",
        "faculty": "Dr. Mohan Sunil Kumar",
        "chat_id": -1003264222864,
        "msg_id": 685,
        "topic_id": 576,
        "channel_name": "My Marrow",
        "notes_type": "Main Lecture Notes"
    }
]

async def verify_all():
    await client.connect()
    verified_results = []
    total_bytes = 0
    
    print(f"Starting verification of {len(NOTES_MANIFEST)} items...")
    for idx, item in enumerate(NOTES_MANIFEST, 1):
        try:
            ent = await client.get_entity(item["chat_id"])
            m = await client.get_messages(ent, ids=item["msg_id"])
            if not m or not m.file:
                print(f"[{idx}/{len(NOTES_MANIFEST)}] FAILED: {item['subject']} (Msg {item['msg_id']} not found or has no file)")
                continue
            
            fn = m.file.name
            sz = m.file.size
            total_bytes += sz
            sz_mb = sz / (1024 * 1024)
            date_str = str(m.date)
            
            # Formulate telegram link
            clean_cid = str(item["chat_id"]).replace("-100", "")
            if item.get("topic_id"):
                tg_link = f"https://t.me/c/{clean_cid}/{item['topic_id']}/{item['msg_id']}"
            else:
                tg_link = f"https://t.me/c/{clean_cid}/{item['msg_id']}"
            
            rec = {
                "subject": item["subject"],
                "prof_year": item["prof_year"],
                "platform": item["platform"],
                "faculty": item["faculty"],
                "notes_type": item["notes_type"],
                "channel_name": item["channel_name"],
                "chat_id": item["chat_id"],
                "topic_id": item.get("topic_id"),
                "msg_id": item["msg_id"],
                "file_name": fn,
                "size_bytes": sz,
                "size_mb": round(sz_mb, 2),
                "date": date_str,
                "tg_link": tg_link,
                "doc_id": m.document.id if m.document else None,
                "mime_type": m.file.mime_type
            }
            verified_results.append(rec)
            print(f"[{idx}/{len(NOTES_MANIFEST)}] OK: {item['subject']} ({item['platform']}) -> '{fn}' ({sz_mb:.2f} MB)")
        except Exception as e:
            print(f"[{idx}/{len(NOTES_MANIFEST)}] ERROR: {item['subject']}: {e}")

    await client.disconnect()

    out_file = Path("engine/all_19_subjects_verified_notes.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(verified_results, f, indent=2, ensure_ascii=False)
    
    print("\n================ VERIFICATION COMPLETE ================")
    print(f"Verified items: {len(verified_results)} / {len(NOTES_MANIFEST)}")
    print(f"Total Notes Size: {total_bytes / (1024*1024*1024):.2f} GB ({total_bytes / (1024*1024):.2f} MB)")
    print(f"Saved catalog to: {out_file.resolve()}")

asyncio.run(verify_all())

