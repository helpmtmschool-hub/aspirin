"""
Yui - Export Telegram Session to StringSession
Use this utility to export your local Telegram session into a single-line string
for use in GitHub Actions Secrets (TELEGRAM_SESSION_STRING).
"""

import asyncio
import json
from pathlib import Path
from telethon import TelegramClient
from telethon.sessions import StringSession

PROJECT_DIR = Path(__file__).resolve().parent.parent

if (PROJECT_DIR / "credentials_telegram.json").exists():
    CREDS_PATH = PROJECT_DIR / "credentials_telegram.json"
else:
    CREDS_PATH = PROJECT_DIR / "credentials_telegram.json"

if (PROJECT_DIR / "telegram_session.session").exists():
    SESSION_PATH = PROJECT_DIR / "telegram_session"
elif (PROJECT_DIR / "brain" / "telegram_session.session").exists():
    SESSION_PATH = PROJECT_DIR / "brain" / "telegram_session"
else:
    SESSION_PATH = PROJECT_DIR / "telegram_session"


async def export_session():
    if not CREDS_PATH.exists():
        print(f"Error: Missing credentials at {CREDS_PATH}")
        return

    with open(CREDS_PATH, "r", encoding="utf-8") as f:
        creds = json.load(f)

    api_id = creds.get("api_id")
    api_hash = creds.get("api_hash")

    print(f"Connecting to Telegram with session at: {SESSION_PATH}")
    client = TelegramClient(str(SESSION_PATH), api_id, api_hash)
    await client.connect()

    if not await client.is_user_authorized():
        print("Error: The local session is not authorized. Please log in first.")
        await client.disconnect()
        return

    me = await client.get_me()
    session_string = StringSession.save(client.session)
    await client.disconnect()

    print("\n" + "=" * 65)
    print(f" SUCCESS! Connected as: {me.first_name} (@{me.username or 'No Username'})")
    print("=" * 65)
    print("\nCopy the session string below and add it to your GitHub Repository Secrets:")
    print("Secret Name: TELEGRAM_SESSION_STRING\n")
    print("-" * 65)
    print(session_string)
    print("-" * 65 + "\n")


if __name__ == "__main__":
    asyncio.run(export_session())
