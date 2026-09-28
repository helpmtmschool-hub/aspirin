"""Dump Telegram dermatology uploads (captions, filenames, sizes, durations, doc ids)
from the source channel and the independent titled groups, for title cross-verification.

Reads only - no media download, single connection, small page sizes.
"""
import asyncio
import json
import sys
from pathlib import Path

from telethon import TelegramClient
from telethon.errors import FloodWaitError
from telethon.tl.functions.messages import GetForumTopicsRequest

PROJECT_DIR = Path(__file__).resolve().parent.parent
creds = json.loads((PROJECT_DIR / "credentials_telegram.json").read_text(encoding="utf-8"))
client = TelegramClient(str(PROJECT_DIR / "telegram_session"), creds["api_id"], creds["api_hash"])

MY_MARROW = -1003264222864   # source channel, forum topic 310 = Dermatology
SUBJECTWISE = -1003506593387  # forum with per-subject Marrow topics
MARROW_CH = -1003659432109   # independent Marrow rip
DERM_CH = -1002959326572     # "Marrow Dermatology"


def video_fields(m):
    out = {"msg_id": m.id, "date": str(m.date) if m.date else None,
           "text": (m.text or "").strip(), "filename": None, "size": None,
           "duration": None, "doc_id": None}
    if m.video or (m.document and m.file):
        f = m.file
        out["filename"] = getattr(f, "name", None)
        out["size"] = getattr(f, "size", None)
        out["duration"] = getattr(f, "duration", None) if m.video else None
        out["doc_id"] = str(m.document.id) if m.document else None
        if not m.video and getattr(f, "mime_type", ""):
            out["mime"] = f.mime_type
    return out


async def dump_topic(chat_id, topic_id, label, limit=None):
    rows = []
    try:
        entity = await client.get_entity(chat_id)
    except Exception as e:
        print(f"[{label}] entity error: {type(e).__name__}: {e}", file=sys.stderr)
        return rows
    try:
        async for m in client.iter_messages(entity, reply_to=topic_id):
            if m.video or m.document:
                rows.append(video_fields(m))
            if limit and len(rows) >= limit:
                break
    except FloodWaitError as e:
        print(f"[{label}] flood wait {e.seconds}s", file=sys.stderr)
        await asyncio.sleep(e.seconds + 5)
    except Exception as e:
        print(f"[{label}] iter error: {type(e).__name__}: {e}", file=sys.stderr)
    print(f"[{label}] topic={topic_id} media={len(rows)}")
    return rows


async def list_topics(chat_id, label):
    try:
        entity = await client.get_entity(chat_id)
        r = await client(GetForumTopicsRequest(entity, limit=300, offset_date=None, offset_id=0, offset_topic=0))
        out = [{"topic_id": t.id, "title": t.title, "messages": t.messages} for t in r.topics]
        print(f"[{label}] topics={len(out)}")
        for t in out:
            print(f"    {t['topic_id']}: {t['title']} ({t['messages']} msgs)")
        return out
    except Exception as e:
        print(f"[{label}] topic list error: {type(e).__name__}: {e}", file=sys.stderr)
        return []


async def dump_flat(chat_id, label, search=None, limit=200):
    rows = []
    try:
        entity = await client.get_entity(chat_id)
    except Exception as e:
        print(f"[{label}] entity error: {type(e).__name__}: {e}", file=sys.stderr)
        return rows
    try:
        it = client.iter_messages(entity, limit=limit, search=search) if search else client.iter_messages(entity, limit=limit)
        async for m in it:
            if m.video or m.document or (m.text and search):
                rows.append(video_fields(m))
    except Exception as e:
        print(f"[{label}] iter error: {type(e).__name__}: {e}", file=sys.stderr)
    print(f"[{label}] rows={len(rows)}")
    return rows


async def main():
    await client.connect()
    print("authorized:", await client.is_user_authorized())
    result = {}
    result["my_marrow_derm"] = await dump_topic(MY_MARROW, 310, "MyMarrow-derm-topic310")
    result["subjectwise_topics"] = await list_topics(SUBJECTWISE, "Subjectwise")
    result["marrow_channel"] = await dump_flat(MARROW_CH, "MarrowChannel", limit=400)
    result["derm_channel"] = await dump_flat(DERM_CH, "MarrowDermChannel", limit=400)
    out = PROJECT_DIR / "engine" / "scratch_derm_tg_dump.json"
    out.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
    print("wrote", out)
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
