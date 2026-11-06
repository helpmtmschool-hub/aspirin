import asyncio
import json
import sys
from pathlib import Path
from telethon import TelegramClient

sys.stdout.reconfigure(encoding='utf-8')

with open('credentials_telegram.json', 'r', encoding='utf-8') as f:
    creds = json.load(f)

client = TelegramClient('telegram_session', creds['api_id'], creds['api_hash'])

async def audit_prepx_psm():
    await client.connect()
    ent = await client.get_entity(-1003839992379)
    
    videos = []
    total_bytes = 0
    total_seconds = 0
    
    async for m in client.iter_messages(ent, min_id=8999, max_id=9116):
        fn = getattr(m.file, 'name', '') or ''
        if fn.endswith('.mp4') or (m.document and 'video' in (m.document.mime_type or '')):
            dur = 0
            w, h = 0, 0
            for a in m.document.attributes:
                if hasattr(a, 'duration'):
                    dur = a.duration
                if hasattr(a, 'w') and hasattr(a, 'h'):
                    w, h = a.w, a.h
                    
            sz = m.file.size or 0
            total_bytes += sz
            total_seconds += dur
            
            # Form clean title
            raw_title = (m.text or m.message or fn).replace('\n', ' ').strip('* ')
            if raw_title.endswith('.mp4'):
                raw_title = raw_title[:-4]
                
            clean_cid = str(-1003839992379).replace("-100", "")
            tg_link = f"https://t.me/c/{clean_cid}/8633/{m.id}"
            
            videos.append({
                "msg_id": m.id,
                "file_name": fn,
                "title": raw_title,
                "duration_seconds": int(dur),
                "duration_str": f"{int(dur)//60}:{int(dur)%60:02d}",
                "resolution": f"{w}x{h}" if w and h else "720p",
                "size_bytes": sz,
                "size_mb": round(sz / (1024 * 1024), 2),
                "date": str(m.date),
                "tg_link": tg_link,
                "doc_id": m.document.id
            })

    # Reverse to get chronological order (1 to 116)
    videos.reverse()
    
    # Also fetch Notes PDF (Msg 9116)
    note_msg = await client.get_messages(ent, ids=9116)
    clean_cid = str(-1003839992379).replace("-100", "")
    note_info = {
        "msg_id": note_msg.id,
        "file_name": note_msg.file.name,
        "title": "PrepLadder Version X PSM Complete Notes",
        "size_bytes": note_msg.file.size,
        "size_mb": round(note_msg.file.size / (1024 * 1024), 2),
        "tg_link": f"https://t.me/c/{clean_cid}/8633/{note_msg.id}",
        "doc_id": note_msg.document.id,
        "mime_type": note_msg.file.mime_type,
        "date": str(note_msg.date)
    }

    # Fetch QBank from -1002185821255 Msg 294
    ent_qbank = await client.get_entity(-1002185821255)
    qbank_msg = await client.get_messages(ent_qbank, ids=294)
    clean_qcid = str(-1002185821255).replace("-100", "")
    qbank_info = {
        "msg_id": qbank_msg.id,
        "file_name": qbank_msg.file.name,
        "title": "PrepLadder Version X PSM Question Bank",
        "size_bytes": qbank_msg.file.size,
        "size_mb": round(qbank_msg.file.size / (1024 * 1024), 2),
        "tg_link": f"https://t.me/c/{clean_qcid}/{qbank_msg.id}",
        "doc_id": qbank_msg.document.id,
        "mime_type": qbank_msg.file.mime_type,
        "date": str(qbank_msg.date)
    }

    catalog = {
        "subject": "Community Medicine (PSM)",
        "subject_id": "psm",
        "platform": "PrepLadder Edition X",
        "total_lectures": len(videos),
        "total_duration_hours": round(total_seconds / 3600, 2),
        "total_video_size_gb": round(total_bytes / (1024 * 1024 * 1024), 2),
        "total_video_size_mb": round(total_bytes / (1024 * 1024), 2),
        "notes": note_info,
        "qbank": qbank_info,
        "lectures": videos
    }

    out_file = Path("engine/prepladder_x_psm_catalog.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(catalog, f, indent=2, ensure_ascii=False)

    print("================ PREPLADDER X PSM AUDIT ================")
    print(f"Total Video Lectures: {len(videos)}")
    print(f"Total Video Size:     {catalog['total_video_size_gb']} GB ({catalog['total_video_size_mb']} MB)")
    print(f"Total Duration:       {catalog['total_duration_hours']} hours ({total_seconds // 3600}h {(total_seconds % 3600)//60}m)")
    print(f"Notes PDF:            {note_info['file_name']} ({note_info['size_mb']} MB)")
    print(f"QBank PDF:            {qbank_info['file_name']} ({qbank_info['size_mb']} MB)")
    print(f"Catalog saved to:     {out_file.resolve()}")

    # Verify contiguous numbering
    missing_nums = []
    for i in range(1, 117):
        found = any(v['file_name'].startswith(f"{i}.") or v['file_name'].startswith(f"{i}_") for v in videos)
        if not found:
            missing_nums.append(i)
    if missing_nums:
        print(f"WARNING: Missing lecture numbers: {missing_nums}")
    else:
        print("✓ All 116 lectures (1 to 116) are 100% contiguous with ZERO missing files!")

    await client.disconnect()

asyncio.run(audit_prepx_psm())
