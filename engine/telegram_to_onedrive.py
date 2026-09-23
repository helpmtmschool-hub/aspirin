"""
Yui - Cloud Pipeline: Telegram to Microsoft OneDrive Migration Engine
Transfers 4,000+ medical lecture videos and clinical notes directly from
the 'Prep X + Cerebellum' Telegram channel (-1003709841202) into your 25 TB SharePoint drive.

Features:
- Targets the 25 TB SharePoint document library (bypassing the 10 GB personal limit)
- Organizes videos by Platform (PrepLadder X EN / PrepLadder X HI / Cerebellum) -> Subject -> Sequenced Lectures
- Stream-pipes 10 MiB chunks directly to Microsoft Graph (zero local disk footprint)
- Resumable manifest tracking (engine/transfer_manifest.json)
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
SECTIONS_PATH = PROJECT_DIR / "engine" / "prepx_sections.json"
LEGACY_CATALOG_PATH = PROJECT_DIR / "public" / "catalog.json"
PREPX_CHANNEL_ID = -1003709841202

PLATFORM_FOLDER_MAP = {
    "prepx_en": "01_PrepLadder_X_English",
    "prepx_hi": "02_PrepLadder_X_Hinglish",
    "cerebellum": "03_Cerebellum_Academy",
}

SUBJECT_FOLDER_MAP = {
    "anatomy": "01_Anatomy",
    "physiology": "02_Physiology",
    "biochemistry": "03_Biochemistry",
    "pathology": "04_Pathology",
    "pharmacology": "05_Pharmacology",
    "microbiology": "06_Microbiology",
    "forensic_medicine": "07_Forensic_Medicine",
    "fmt": "07_Forensic_Medicine",
    "psm": "08_Community_Medicine_PSM",
    "ophthalmology": "09_Ophthalmology",
    "ent": "10_ENT",
    "medicine": "11_General_Medicine",
    "surgery": "12_General_Surgery",
    "obg": "13_Obstetrics_and_Gynecology",
    "pediatrics": "14_Pediatrics",
    "psychiatry": "15_Psychiatry",
    "orthopedics": "16_Orthopedics",
    "anesthesia": "17_Anesthesiology",
    "radiology": "18_Radiology",
    "dermatology": "19_Dermatology",
    "notes_pdf": "00_Notes_PDF",
}


def sanitize_filename(filename: str) -> str:
    """Removes invalid characters and emojis for OneDrive and cross-platform filesystems."""
    clean = re.sub(r'[^\x00-\x7F]+', '_', filename)
    clean = re.sub(r'["*:<>?/\\|#%~]', "_", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:120]


def normalize_subject_title(raw_title: str) -> str:
    t = raw_title.upper()
    if "ANATOMY" in t: return "anatomy"
    if "PHYSIOLOGY" in t: return "physiology"
    if "BIOCHEMISTRY" in t: return "biochemistry"
    if "PATHOLOGY" in t: return "pathology"
    if "PHARMACOLOGY" in t: return "pharmacology"
    if "MICROBIOLOGY" in t: return "microbiology"
    if "PSM" in t: return "psm"
    if "FMT" in t: return "forensic_medicine"
    if "OPHTHALMOLOGY" in t: return "ophthalmology"
    if "ENT" in t: return "ent"
    if "MEDICINE" in t: return "medicine"
    if "SURGERY" in t: return "surgery"
    if "OBG" in t: return "obg"
    if "PEDIATRICS" in t: return "pediatrics"
    if "PSYCHIATRY" in t: return "psychiatry"
    if "ORTHOPEDICS" in t: return "orthopedics"
    if "ANESTHESIA" in t: return "anesthesia"
    if "RADIOLOGY" in t: return "radiology"
    if "DERMATOLOGY" in t: return "dermatology"
    if "NOTES PDF" in t: return "notes_pdf"
    return "medicine"


class OneDriveClient:
    def __init__(
        self,
        client_id: str,
        client_secret: Optional[str],
        refresh_token: str,
        tenant_id: str = "common",
        drive_target: str = "sites/root/drive",
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.tenant_id = tenant_id
        self.drive_target = drive_target  # "sites/root/drive" = 25 TB SharePoint, "me/drive" = 10 GB Personal
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
        """Creates a Microsoft Graph Resumable Upload Session on the 25 TB SharePoint / OneDrive storage."""
        token = self.get_valid_token()
        clean_path = "/" + remote_path.strip("/")
        endpoint = f"https://graph.microsoft.com/v1.0/{self.drive_target}/root:{clean_path}:/createUploadSession"
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
                    return None  # Chunk accepted
                elif res.status_code in (200, 201):
                    return res.json()  # Complete!
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
        self._entities: Dict[int, Any] = {}

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

    def load_queue(self, platform: Optional[str] = None, target_subject: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Loads unuploaded lecture tasks based on Prep X + Cerebellum master sections.
        Falls back to legacy catalog.json if sections file is absent.
        """
        if not SECTIONS_PATH.exists():
            return self._load_queue_legacy(target_subject)

        with open(SECTIONS_PATH, "r", encoding="utf-8") as f:
            sections = json.load(f)

        queue = []
        for sec in sections:
            sec_platform = sec["platform"]
            raw_title = sec["title"]
            norm_subj = normalize_subject_title(raw_title)

            # Filter by platform
            if platform and platform.lower() not in (sec_platform.lower(), "all"):
                continue

            # Filter by subject
            if target_subject and target_subject.lower() != "all":
                tgt = target_subject.lower().strip()
                if tgt == "obgyn":
                    tgt = "obg"
                if tgt != norm_subj.lower():
                    continue

            platform_folder = PLATFORM_FOLDER_MAP.get(sec_platform, sec_platform)
            subj_folder = SUBJECT_FOLDER_MAP.get(norm_subj, norm_subj)

            # Add extra faculty name for Cerebellum specialized tracks
            faculty_tag = ""
            if "DR AJ" in raw_title.upper(): faculty_tag = "_Dr_Ankur_Jain"
            elif "DR SP" in raw_title.upper(): faculty_tag = "_Dr_Smily_Pruthi"
            elif "DR D P" in raw_title.upper(): faculty_tag = "_Dr_Devyani_Puri"
            elif "DR P S" in raw_title.upper(): faculty_tag = "_Dr_Priyanka_Sachdev"

            folder_display = f"{subj_folder}{faculty_tag}"

            for mid in range(sec["start_id"], sec["end_id"] + 1):
                item_id = f"px_{PREPX_CHANNEL_ID}_{mid}"
                if item_id in self.manifest and self.manifest[item_id].get("status") == "completed":
                    continue

                queue.append({
                    "id": item_id,
                    "chat_id": PREPX_CHANNEL_ID,
                    "message_id": mid,
                    "platform": sec_platform,
                    "platform_folder": platform_folder,
                    "subject_id": norm_subj,
                    "subject_name": raw_title,
                    "subject_folder": folder_display,
                })

        return queue

    def _load_queue_legacy(self, target_subject: Optional[str] = None) -> List[Dict[str, Any]]:
        """Legacy catalog fallback."""
        if not LEGACY_CATALOG_PATH.exists():
            return []
        with open(LEGACY_CATALOG_PATH, "r", encoding="utf-8") as f:
            catalog = json.load(f)
        queue = []
        for sub in catalog.get("subjects", []):
            sub_id = sub["id"]
            if target_subject and target_subject.lower() not in (sub_id.lower(), "all"):
                continue
            for mod in sub.get("modules", []):
                for topic in mod.get("topics", []):
                    item_id = topic["id"]
                    if item_id in self.manifest and self.manifest[item_id].get("status") == "completed":
                        continue
                    queue.append({
                        "id": item_id,
                        "chat_id": topic["chat_id"],
                        "message_id": topic["message_id"],
                        "platform": "legacy",
                        "platform_folder": "00_Legacy_Catalog",
                        "subject_id": sub_id,
                        "subject_name": sub["name"],
                        "subject_folder": sub["name"],
                        "filename": topic.get("filename") or f"{topic['title']}.mp4",
                    })
        return queue

    async def transfer_item(self, item: Dict[str, Any]):
        """Pipes a single lecture item from Telegram directly into Microsoft SharePoint (25 TB)."""
        item_id = item["id"]
        chat_id = item["chat_id"]
        message_id = item["message_id"]
        platform_folder = item.get("platform_folder", "01_PrepLadder_X_English")
        subj_folder = item.get("subject_folder", "01_Anatomy")

        # 1. Fetch Telegram message metadata
        try:
            if chat_id not in self._entities:
                self._entities[chat_id] = await self.tg_client.get_entity(chat_id)
            entity = self._entities[chat_id]
            msg = await self.tg_client.get_messages(entity, ids=message_id)
        except FloodWaitError as e:
            print(f"\n[Telegram FloodWait] Need to wait {e.seconds} seconds.")
            raise e

        # If it's a section header without a file (e.g. text message "ANATOMY"), skip & mark recorded
        if not msg or not msg.media or not msg.file:
            txt = (msg.text or msg.message or "").strip() if msg else ""
            print(f"  [Notice] Msg {message_id} is a section separator ({txt[:30]}). Skipping media transfer.")
            self.manifest[item_id] = {
                "status": "completed",
                "type": "separator",
                "text": txt,
                "skipped": True,
            }
            self._save_manifest()
            return

        total_size = msg.file.size
        raw_fn = None
        if msg.file and msg.file.name:
            raw_fn = msg.file.name
        elif msg.document and msg.document.attributes:
            for attr in msg.document.attributes:
                if hasattr(attr, "file_name") and attr.file_name:
                    raw_fn = attr.file_name
                    break

        if not raw_fn:
            caption = (msg.text or msg.message or "").strip()
            if caption:
                raw_fn = caption.split("\n")[0].strip()
            else:
                raw_fn = f"lecture_{message_id}.mp4"

        clean_name = sanitize_filename(raw_fn)

        is_pdf = clean_name.lower().endswith(".pdf") or "pdf" in clean_name.lower()
        if not is_pdf and not clean_name.lower().endswith((".mp4", ".mkv")):
            clean_name += ".mp4"

        clean_title = re.sub(r"\.(mp4|pdf|mkv)$", "", clean_name, flags=re.I).strip()
        remote_path = f"Aspirin_LMS/{platform_folder}/{subj_folder}/{clean_name}"

        print(f"\n[{'PDF' if is_pdf else 'VIDEO'}] {platform_folder} / {subj_folder} -> {clean_name}")
        print(f"Remote: /{remote_path}")
        print(f"  Size: {round(total_size / (1024 * 1024), 2)} MB")

        if self.dry_run:
            print("  (DRY-RUN: Skipping actual transfer)")
            return

        # 2. Create Microsoft Graph Upload Session on 25 TB SharePoint drive
        upload_url = self.od_client.create_upload_session(remote_path)

        # 3. Stream MTProto chunk-by-chunk directly to Microsoft Graph
        start_byte = 0
        chunk_buffer = bytearray()
        result_meta = None

        async for data in self.tg_client.iter_download(msg.media, request_size=1024 * 1024):
            if not data:
                break
            chunk_buffer.extend(data)

            while len(chunk_buffer) >= CHUNK_SIZE or (start_byte + len(chunk_buffer) == total_size):
                to_send_len = min(len(chunk_buffer), CHUNK_SIZE)
                if to_send_len == 0:
                    break
                data_to_send = bytes(chunk_buffer[:to_send_len])
                del chunk_buffer[:to_send_len]

                pct = round(((start_byte + len(data_to_send)) / total_size) * 100, 1)
                sys.stdout.write(f"\r  Uploading: {pct}% [{round((start_byte + len(data_to_send))/(1024*1024), 1)} / {round(total_size/(1024*1024), 1)} MB]")
                sys.stdout.flush()

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
            "title": clean_title,
            "filename": clean_name,
            "platform": item["platform"],
            "subject_id": item["subject_id"],
            "folder_path": f"{platform_folder}/{subj_folder}",
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
        await asyncio.sleep(2)


async def run_pipeline(platform: Optional[str] = None, subject: Optional[str] = None, limit: int = 20, dry_run: bool = False):
    od_client = None
    if not dry_run:
        client_id = os.environ.get("ONEDRIVE_CLIENT_ID")
        client_secret = os.environ.get("ONEDRIVE_CLIENT_SECRET")
        refresh_token = os.environ.get("ONEDRIVE_REFRESH_TOKEN")
        tenant_id = os.environ.get("ONEDRIVE_TENANT_ID", "common")
        drive_target = os.environ.get("ONEDRIVE_DRIVE_TARGET", "sites/root/drive")

        if not refresh_token:
            token_file = PROJECT_DIR / "onedrive_token.json"
            if token_file.exists():
                with open(token_file, "r", encoding="utf-8") as f:
                    td = json.load(f)
                    refresh_token = td.get("refresh_token")

        if not client_id or not refresh_token:
            raise ValueError("Missing ONEDRIVE_CLIENT_ID or ONEDRIVE_REFRESH_TOKEN.")

        od_client = OneDriveClient(
            client_id=client_id,
            client_secret=client_secret,
            refresh_token=refresh_token,
            tenant_id=tenant_id,
            drive_target=drive_target,
        )

    engine = LectureTransferEngine(od_client, dry_run=dry_run)
    await engine.init_telegram()

    queue = engine.load_queue(platform=platform, target_subject=subject)
    print("=" * 65)
    print(f" Yui Pipeline: Telegram -> 25 TB SharePoint Drive")
    print(f" Platform Edition:       {platform or 'ALL'}")
    print(f" Target Subject:         {subject or 'ALL'}")
    print(f" Total Pending in Queue: {len(queue)}")
    print(f" Batch Limit for run:    {limit}")
    print("=" * 65)

    processed = 0
    for item in queue[:limit]:
        try:
            await engine.transfer_item(item)
            processed += 1
        except FloodWaitError as e:
            print(f"\n[Telegram FloodWait] Hit rate limit. Sleeping {e.seconds}s.")
            if e.seconds > 180:
                print(f"FloodWait is {e.seconds}s. Gracefully ending batch.")
                break
            await asyncio.sleep(e.seconds)
        except Exception as e:
            print(f"\nError transferring item {item['id']}: {e}")
            continue

    print("\n" + "=" * 65)
    print(f" Batch Run Complete! Processed {processed} items.")
    print(f" Remaining pending items: {len(queue) - processed}")
    print("=" * 65)

    if engine.tg_client:
        await engine.tg_client.disconnect()


def main():
    parser = argparse.ArgumentParser(description="Yui Telegram to 25 TB SharePoint Migration Engine")
    parser.add_argument("--platform", default=None, help="Platform: 'prepx_en', 'prepx_hi', 'cerebellum', or 'all'")
    parser.add_argument("--subject", default=None, help="Target subject (e.g. 'anatomy', 'notes_pdf', or 'all')")
    parser.add_argument("--limit", type=int, default=20, help="Max items to upload in this run (default: 20)")
    parser.add_argument("--dry-run", action="store_true", help="List files without actually uploading")

    args = parser.parse_args()
    asyncio.run(run_pipeline(platform=args.platform, subject=args.subject, limit=args.limit, dry_run=args.dry_run))


if __name__ == "__main__":
    main()
