"""
Yui - Cloud Pipeline: Telegram to Microsoft OneDrive Migration Engine
Transfers 520+ medical lecture videos and clinical notes directly from
private Telegram channels into a 5 TB Microsoft OneDrive account.

Features:
- Stream-pipes 10 MiB chunks directly to Microsoft Graph Resumable Upload Session
- Zero disk footprint (buffered in RAM, ideal for GitHub Actions runners)
- Persistent state tracking via engine/transfer_manifest.json (never re-uploads)
- Safe batching by subject or item limit to prevent Telegram FloodWait
"""

import argparse
import asyncio
import json
import os
from pathlib import Path
import re
import sys
import time
from typing import Any, Dict, List, Optional
import requests
from telethon import TelegramClient
from telethon.errors import FloodWaitError
from telethon.sessions import StringSession

# Ensure UTF-8 console output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Chunk size: 10 MiB (Must be an exact multiple of 320 KiB for Microsoft Graph)
CHUNK_SIZE = 10 * 1024 * 1024  # 10,485,760 bytes = 32 * 327,680 bytes

PROJECT_DIR = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJECT_DIR / "engine" / "transfer_manifest.json"
CATALOG_PATH = PROJECT_DIR / "public" / "catalog.json"


def sanitize_filename(filename: str) -> str:
    """Removes invalid characters and emojis for OneDrive and cross-platform filesystems."""
    # Strip emojis and non-standard unicode characters
    clean = re.sub(r'[^\x00-\x7F]+', '_', filename)
    # Replace characters not allowed in OneDrive/SharePoint: " * : < > ? / \ | # % ~
    clean = re.sub(r'["*:<>?/\\|#%~]', "_", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:120]  # Avoid extremely long path limits


class OneDriveClient:
    def __init__(self, client_id: str, client_secret: Optional[str], refresh_token: str, tenant_id: str = "common"):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.tenant_id = tenant_id
        self.access_token: Optional[str] = None
        self.token_expiry: float = 0

    def get_valid_token(self) -> str:
        """Returns a valid access token, automatically refreshing if expired."""
        if self.access_token and time.time() < (self.token_expiry - 300):
            return self.access_token

        endpoint = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        data = {
            "client_id": self.client_id,
            "grant_type": "refresh_token",
            "refresh_token": self.refresh_token,
            "scope": "offline_access Files.ReadWrite.All User.Read",
        }
        if self.client_secret:
            data["client_secret"] = self.client_secret

        res = requests.post(endpoint, data=data, timeout=30)
        if res.status_code != 200:
            raise PermissionError(f"Failed to refresh Microsoft token: {res.status_code} - {res.text}")

        token_data = res.json()
        self.access_token = token_data["access_token"]
        self.token_expiry = time.time() + token_data.get("expires_in", 3600)
        if "refresh_token" in token_data:
            self.refresh_token = token_data["refresh_token"]
        return self.access_token

    def create_upload_session(self, remote_path: str) -> str:
        """Creates a Microsoft Graph Resumable Upload Session for files > 4MB."""
        token = self.get_valid_token()
        # Ensure path begins with a slash and no duplicate slashes
        clean_path = "/" + remote_path.strip("/")
        endpoint = f"https://graph.microsoft.com/v1.0/me/drive/root:{clean_path}:/createUploadSession"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }
        body = {
            "item": {
                "@microsoft.graph.conflictBehavior": "replace"
            }
        }
        res = requests.post(endpoint, headers=headers, json=body, timeout=30)
        if res.status_code in (200, 201):
            return res.json()["uploadUrl"]
        raise RuntimeError(f"Error creating upload session for {remote_path}: {res.status_code} - {res.text}")

    def upload_chunk(self, upload_url: str, chunk_data: bytes, start_byte: int, total_size: int, retries: int = 5) -> Optional[Dict[str, Any]]:
        """Uploads a single chunk to the uploadUrl with retry and rate-limit handling."""
        end_byte = start_byte + len(chunk_data) - 1
        headers = {
            "Content-Length": str(len(chunk_data)),
            "Content-Range": f"bytes {start_byte}-{end_byte}/{total_size}",
        }

        for attempt in range(retries):
            try:
                res = requests.put(upload_url, headers=headers, data=chunk_data, timeout=120)
                if res.status_code == 202:
                    return None  # Chunk accepted, awaiting further chunks
                elif res.status_code in (200, 201):
                    return res.json()  # Upload complete!
                elif res.status_code == 429:
                    retry_after = int(res.headers.get("Retry-After", 10))
                    print(f"\n[OneDrive 429] Throttled. Backing off for {retry_after}s...")
                    time.sleep(retry_after)
                elif res.status_code >= 500:
                    time.sleep(5 * (attempt + 1))
                else:
                    raise RuntimeError(f"Upload error {res.status_code}: {res.text}")
            except (requests.RequestException, TimeoutError) as e:
                if attempt == retries - 1:
                    raise e
                time.sleep(5 * (attempt + 1))
        raise TimeoutError(f"Failed to upload chunk {start_byte}-{end_byte} after {retries} retries.")


class LectureTransferEngine:
    def __init__(self, od_client: Optional[OneDriveClient], dry_run: bool = False):
        self.od_client = od_client
        self.dry_run = dry_run
        self.tg_client: Optional[TelegramClient] = None
        self.manifest: Dict[str, Any] = self._load_manifest()

    def _load_manifest(self) -> Dict[str, Any]:
        if MANIFEST_PATH.exists():
            try:
                with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return {}
        return {}

    def _save_manifest(self):
        MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
            json.dump(self.manifest, f, indent=2)

    async def init_telegram(self):
        api_id = os.environ.get("TELEGRAM_API_ID")
        api_hash = os.environ.get("TELEGRAM_API_HASH")
        session_str = os.environ.get("TELEGRAM_SESSION_STRING")

        # Fallback to local files if env vars are absent
        if not api_id or not api_hash:
            creds_file = PROJECT_DIR / "credentials_telegram.json"
            if creds_file.exists():
                with open(creds_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    api_id = data.get("api_id")
                    api_hash = data.get("api_hash")

        if not api_id or not api_hash:
            raise ValueError("Missing TELEGRAM_API_ID or TELEGRAM_API_HASH.")

        api_id = int(api_id)

        if session_str:
            print("Connecting to Telegram via TELEGRAM_SESSION_STRING...")
            self.tg_client = TelegramClient(StringSession(session_str), api_id, api_hash)
        else:
            session_file = PROJECT_DIR / "telegram_session"
            print(f"Connecting to Telegram via local session file at {session_file}...")
            self.tg_client = TelegramClient(str(session_file), api_id, api_hash)

        await self.tg_client.connect()
        if not await self.tg_client.is_user_authorized():
            raise PermissionError("Telegram session is not authorized.")
        me = await self.tg_client.get_me()
        print(f"Connected to Telegram as: {me.first_name} (@{me.username or 'No Username'})")

    def load_queue(self, target_subject: Optional[str] = None) -> List[Dict[str, Any]]:
        """Loads all video topics and notes from catalog.json that have not been uploaded yet."""
        if not CATALOG_PATH.exists():
            raise FileNotFoundError(f"Missing catalog at {CATALOG_PATH}")

        with open(CATALOG_PATH, "r", encoding="utf-8") as f:
            catalog = json.load(f)

        queue = []
        for sub in catalog.get("subjects", []):
            sub_id = sub["id"]
            sub_name = sub["name"]

            if target_subject and target_subject.lower() not in (sub_id.lower(), "all"):
                continue

            # 1. Video Topics
            for mod in sub.get("modules", []):
                for topic in mod.get("topics", []):
                    item_id = topic["id"]
                    if item_id in self.manifest and self.manifest[item_id].get("status") == "completed":
                        continue
                    queue.append({
                        "id": item_id,
                        "type": "video",
                        "subject_id": sub_id,
                        "subject_name": sub_name,
                        "title": topic["title"],
                        "filename": topic.get("filename") or f"{topic['title']}.mp4",
                        "file_size_bytes": topic.get("file_size_bytes", 0),
                        "chat_id": topic["chat_id"],
                        "message_id": topic["message_id"],
                    })

            # 2. Clinical Notes (PDFs)
            for note in sub.get("notes", []):
                item_id = note["id"]
                if item_id in self.manifest and self.manifest[item_id].get("status") == "completed":
                    continue
                queue.append({
                    "id": item_id,
                    "type": "note",
                    "subject_id": sub_id,
                    "subject_name": sub_name,
                    "title": note["title"],
                    "filename": note.get("filename") or f"{note['title']}.pdf",
                    "file_size_bytes": note.get("file_size_bytes", 0),
                    "chat_id": note["chat_id"],
                    "message_id": note["message_id"],
                })

        return queue

    async def transfer_item(self, item: Dict[str, Any]):
        """Pipes a single item from Telegram directly into Microsoft OneDrive."""
        item_id = item["id"]
        chat_id = item["chat_id"]
        message_id = item["message_id"]
        sub_name = item["subject_name"]
        raw_filename = item["filename"]
        clean_name = sanitize_filename(raw_filename)

        ext = ".mp4" if item["type"] == "video" else ".pdf"
        if not clean_name.lower().endswith(ext):
            clean_name += ext

        remote_path = f"Aspirin_LMS/{sub_name}/{clean_name}"

        print(f"\n[{item['type'].upper()}] {sub_name} -> {clean_name}")
        print(f"Remote: /{remote_path}")

        if self.dry_run:
            print("  (DRY-RUN: Skipping actual transfer)")
            return

        # 1. Fetch Telegram message metadata
        try:
            entity = await self.tg_client.get_entity(chat_id)
            msg = await self.tg_client.get_messages(entity, ids=message_id)
        except FloodWaitError as e:
            print(f"\n[Telegram FloodWait] Need to wait {e.seconds} seconds.")
            raise e

        if not msg or not msg.media or not msg.file:
            print(f"  Warning: No media found for message {message_id} in {chat_id}. Skipping.")
            return

        total_size = msg.file.size
        print(f"  Size: {round(total_size / (1024 * 1024), 2)} MB. Initiating OneDrive Upload Session...")

        # 2. Create Microsoft Graph Upload Session
        upload_url = self.od_client.create_upload_session(remote_path)

        # 3. Stream MTProto chunk-by-chunk directly to OneDrive
        start_byte = 0
        chunk_buffer = bytearray()
        result_meta = None

        async for data in self.tg_client.iter_download(msg.media, request_size=1024 * 1024):
            if not data:
                break
            chunk_buffer.extend(data)

            # Once buffer reaches CHUNK_SIZE or is at EOF
            while len(chunk_buffer) >= CHUNK_SIZE or (start_byte + len(chunk_buffer) == total_size):
                to_send_len = min(len(chunk_buffer), CHUNK_SIZE)
                if to_send_len == 0:
                    break
                data_to_send = bytes(chunk_buffer[:to_send_len])
                del chunk_buffer[:to_send_len]

                pct = round(((start_byte + len(data_to_send)) / total_size) * 100, 1)
                sys.stdout.write(f"\r  Uploading: {pct}% [{round((start_byte + len(data_to_send))/(1024*1024), 1)} / {round(total_size/(1024*1024), 1)} MB]")
                sys.stdout.flush()

                # Upload chunk to OneDrive
                res = self.od_client.upload_chunk(upload_url, data_to_send, start_byte, total_size)
                start_byte += len(data_to_send)

                if res is not None:
                    result_meta = res
                    break

        print("\n  Upload Completed Successfully!")

        # 4. Record into manifest
        drive_item_id = result_meta.get("id") if result_meta else None
        web_url = result_meta.get("webUrl") if result_meta else None

        self.manifest[item_id] = {
            "title": item["title"],
            "filename": clean_name,
            "subject_id": item["subject_id"],
            "subject_name": sub_name,
            "type": item["type"],
            "telegram_chat_id": chat_id,
            "telegram_message_id": message_id,
            "onedrive_item_id": drive_item_id,
            "onedrive_path": f"/{remote_path}",
            "web_url": web_url,
            "size_bytes": total_size,
            "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "completed",
        }
        self._save_manifest()
        # Small delay between files to avoid aggressive spikes
        await asyncio.sleep(2)


async def run_pipeline(subject: Optional[str] = None, limit: int = 20, dry_run: bool = False):
    od_client = None
    if not dry_run:
        client_id = os.environ.get("ONEDRIVE_CLIENT_ID")
        client_secret = os.environ.get("ONEDRIVE_CLIENT_SECRET")
        refresh_token = os.environ.get("ONEDRIVE_REFRESH_TOKEN")
        tenant_id = os.environ.get("ONEDRIVE_TENANT_ID", "common")

        # Fallback to local onedrive_token.json if env vars missing
        if not refresh_token:
            token_file = PROJECT_DIR / "onedrive_token.json"
            if token_file.exists():
                with open(token_file, "r", encoding="utf-8") as f:
                    td = json.load(f)
                    refresh_token = td.get("refresh_token")

        if not client_id or not refresh_token:
            raise ValueError(
                "Missing ONEDRIVE_CLIENT_ID or ONEDRIVE_REFRESH_TOKEN.\n"
                "Run 'python engine/get_onedrive_token.py' to generate your token."
            )

        od_client = OneDriveClient(client_id, client_secret, refresh_token, tenant_id)

    engine = LectureTransferEngine(od_client, dry_run=dry_run)
    await engine.init_telegram()

    queue = engine.load_queue(target_subject=subject)
    print("=" * 65)
    print(f" Yui Pipeline: Telegram -> OneDrive")
    print(f" Target Subject: {subject or 'ALL'}")
    print(f" Total Pending Items in Queue: {len(queue)}")
    print(f" Batch Limit for this run:    {limit}")
    print("=" * 65)

    processed = 0
    for item in queue[:limit]:
        try:
            await engine.transfer_item(item)
            processed += 1
        except FloodWaitError as e:
            print(f"\n[Telegram FloodWait] Hit rate limit. Sleeping {e.seconds}s or exiting batch.")
            if e.seconds > 180:
                print(f"FloodWait is {e.seconds}s. Gracefully ending this batch run.")
                break
            await asyncio.sleep(e.seconds)
        except Exception as e:
            print(f"\nError transferring item {item['id']}: {e}")
            # Continue to next item without breaking the batch
            continue

    print("\n" + "=" * 65)
    print(f" Batch Run Complete! Processed {processed} items.")
    print(f" Remaining pending items in catalog: {len(queue) - processed}")
    print("=" * 65)

    if engine.tg_client:
        await engine.tg_client.disconnect()


def main():
    parser = argparse.ArgumentParser(description="Yui Telegram to OneDrive Migration Engine")
    parser.add_argument("--subject", default=None, help="Target subject (e.g. 'anatomy', 'physiology', or 'all')")
    parser.add_argument("--limit", type=int, default=20, help="Max items to upload in this run (default: 20)")
    parser.add_argument("--dry-run", action="store_true", help="List files without actually uploading")

    args = parser.parse_args()
    asyncio.run(run_pipeline(subject=args.subject, limit=args.limit, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
