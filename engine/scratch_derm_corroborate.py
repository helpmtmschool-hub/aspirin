"""Complete the dermatology corroboration table.

Sources:
  A  My Marrow topic 310 (the videos actually on SharePoint)         - shorthand captions
  B  Subjectwise Lectures topic 2712 'Dermatology (Marrow)'          - full titles
  C  Marrow channel -1003659432109 (independent rip, different doc ids)
  D  Swaghat (located from B's message ids)
Writes engine/scratch_derm_corroboration.json.
"""
import asyncio
import json
from pathlib import Path

from telethon import TelegramClient

PROJECT_DIR = Path(__file__).resolve().parent.parent
creds = json.loads((PROJECT_DIR / "credentials_telegram.json").read_text(encoding="utf-8"))
client = TelegramClient(str(PROJECT_DIR / "telegram_session"), creds["api_id"], creds["api_hash"])

MY_MARROW, TOPIC_310 = -1003264222864, 310
SUBJECTWISE, TOPIC_2712 = -1003506593387, 2712
MARROW_CH = -1003659432109
SWAGHAT = -1002193823412


def fields(m):
    f = m.file
    return {"msg_id": m.id, "topic_id": getattr(m, "reply_to", None) and m.reply_to.reply_to_msg_id,
            "caption": (m.text or "").strip(),
            "filename": getattr(f, "name", None) if f else None,
            "size": getattr(f, "size", None) if f else None,
            "duration": round(getattr(f, "duration", 0) or 0, 2) if m.video else None,
            "doc_id": str(m.document.id) if m.document else None}


async def dump_topic(chat_id, topic_id, label):
    entity = await client.get_entity(chat_id)
    rows = []
    async for m in client.iter_messages(entity, reply_to=topic_id):
        if m.video or m.document:
            rows.append(fields(m))
    rows.reverse()
    print(f"{label}: {len(rows)}")
    return rows


async def dump_range(chat_id, lo, hi, label):
    entity = await client.get_entity(chat_id)
    rows = []
    async for m in client.iter_messages(entity, min_id=lo, max_id=hi + 1):
        if m.video or m.document or m.text:
            rows.append(fields(m))
    rows.sort(key=lambda r: r["msg_id"])
    print(f"{label}: {len(rows)}")
    return rows


async def main():
    await client.connect()
    out = {}
    out["A_my_marrow_310"] = await dump_topic(MY_MARROW, TOPIC_310, "A my_marrow")
    out["B_subjectwise_2712"] = await dump_topic(SUBJECTWISE, TOPIC_2712, "B subjectwise")
    out["C_marrow_channel_970_1005"] = await dump_range(MARROW_CH, 970, 1005, "C marrow_channel")
    # find Swaghat's own dermatology topic: probe the messages that mirrored B's titles
    probe = await dump_range(SWAGHAT, 2700, 2760, "D swaghat_probe")
    topics = {}
    for r in probe:
        topics.setdefault(r["topic_id"], 0)
        topics[r["topic_id"]] += 1
    print("swaghat reply_to parents:", topics)
    out["D_swaghat_probe"] = probe
    dst = PROJECT_DIR / "engine" / "scratch_derm_corroboration.json"
    dst.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print("wrote", dst)
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
