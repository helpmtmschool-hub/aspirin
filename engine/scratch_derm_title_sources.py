"""Dump two candidate corroborating Telegram sources for Marrow dermatology titles:
  * Subjectwise Lectures topic 2712 'Dermatology (Marrow)'   (the authority used for OBG)
  * D@M& 2025-26 topic 539 'DERMATOLOGY'
Read-only metadata pass: caption, filename, size, duration, document id.
"""
import asyncio
import json
from pathlib import Path

from telethon import TelegramClient

PROJECT_DIR = Path(__file__).resolve().parent.parent
creds = json.loads((PROJECT_DIR / "credentials_telegram.json").read_text(encoding="utf-8"))
client = TelegramClient(str(PROJECT_DIR / "telegram_session"), creds["api_id"], creds["api_hash"])

SOURCES = [
    (-1003506593387, 2712, "subjectwise_derm_marrow"),
    (-1002362108524, 539, "dam_dermatology"),
]


def fields(m):
    f = m.file
    return {
        "msg_id": m.id,
        "caption": (m.text or "").strip(),
        "filename": getattr(f, "name", None) if f else None,
        "size": getattr(f, "size", None) if f else None,
        "duration": round(getattr(f, "duration", 0) or 0, 2) if m.video else None,
        "doc_id": str(m.document.id) if m.document else None,
        "mime": getattr(f, "mime_type", None) if f else None,
    }


async def main():
    await client.connect()
    out = {}
    for chat_id, topic_id, label in SOURCES:
        entity = await client.get_entity(chat_id)
        rows = []
        async for m in client.iter_messages(entity, reply_to=topic_id):
            if m.video or m.document:
                rows.append(fields(m))
        rows.reverse()
        print(f"{label}: {len(rows)} media items")
        out[label] = {"chat_id": chat_id, "topic_id": topic_id, "items": rows}
        await asyncio.sleep(2)
    dst = PROJECT_DIR / "engine" / "scratch_derm_title_sources.json"
    dst.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print("wrote", dst)
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
