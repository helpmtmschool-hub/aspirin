"""
Yui - Cloud Pipeline: Telegram Notes to SharePoint Migration Engine
Transfers verified PDF Notes from Telegram to the openmedQ commercial SharePoint:
1. Marrow Edition 8 Main Notes (Final Year subjects, except medicine) -> Aspirin_LMS/Marrow_E8/Notes/
2. PrepLadder Version X Medicine Notes PDF -> Aspirin_LMS/PrepLadder_X/Medicine/

Safety & Resilience Features:
- 4x Parallel MTProto chunk downloading (official Telegram Desktop spec).
- 20 MiB chunked upload to Microsoft Graph API.
- Idempotent: Skips files already uploaded and verified.
- Updates engine/transfer_manifest.json, public/transfer_manifest.json, and public/catalog.json.
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
from telethon import TelegramClient, utils
from telethon.errors import FloodWaitError
from telethon.network import MTProtoSender
from telethon.sessions import StringSession
from telethon.tl.alltlobjects import LAYER
from telethon.tl.functions import InvokeWithLayerRequest
from telethon.tl.functions.auth import ExportAuthorizationRequest, ImportAuthorizationRequest
from telethon.tl.functions.upload import GetFileRequest

# UTF-8 console output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_DIR = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJECT_DIR / "engine" / "transfer_manifest.json"
PUBLIC_MANIFEST_PATH = PROJECT_DIR / "public" / "transfer_manifest.json"
CATALOG_PATH = PROJECT_DIR / "public" / "catalog.json"
TEMP_DIR = PROJECT_DIR / ".scratch_transfer"
TEMP_DIR.mkdir(exist_ok=True)

UPLOAD_CHUNK_SIZE = 20 * 1024 * 1024  # 20 MiB
TG_PART_SIZE = 512 * 1024             # 512 KiB

def load_env():
    env_file = PROJECT_DIR / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                if k and k not in os.environ:
                    os.environ[k] = v

load_env()

# Target items specification
NOTES_MIGRATION_TARGETS = [
    # --- Marrow Edition 8 Final Year Main Notes (Chat: M-E 8 Notes , q Banks [-1002863499861]) ---
    {
        "id": "note_-1002863499861_24",
        "chat_id": -1002863499861,
        "message_id": 24,
        "platform": "marrow_e8",
        "subject_id": "surgery",
        "title": "Surgery Vol 1 Marrow Ed8 Notes",
        "preferred_filename": "Surgery Vol 1 Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_199",
        "chat_id": -1002863499861,
        "message_id": 199,
        "platform": "marrow_e8",
        "subject_id": "surgery",
        "title": "Surgery Vol 2 Marrow Ed8 Notes",
        "preferred_filename": "Surgery Vol 2 Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_21",
        "chat_id": -1002863499861,
        "message_id": 21,
        "platform": "marrow_e8",
        "subject_id": "obg",
        "title": "OBGYN Vol 1 Marrow Ed8 Notes",
        "preferred_filename": "OBGYN Vol 1 Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_22",
        "chat_id": -1002863499861,
        "message_id": 22,
        "platform": "marrow_e8",
        "subject_id": "obg",
        "title": "OBGYN Vol 2 Marrow Ed8 Notes",
        "preferred_filename": "OBGYN Vol 2 Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_19",
        "chat_id": -1002863499861,
        "message_id": 19,
        "platform": "marrow_e8",
        "subject_id": "pediatrics",
        "title": "Pediatrics Marrow Ed8 Notes",
        "preferred_filename": "Pediatrics Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_20",
        "chat_id": -1002863499861,
        "message_id": 20,
        "platform": "marrow_e8",
        "subject_id": "orthopedics",
        "title": "Orthopedics Marrow Ed8 Notes",
        "preferred_filename": "Orthopedics Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_18",
        "chat_id": -1002863499861,
        "message_id": 18,
        "platform": "marrow_e8",
        "subject_id": "dermatology",
        "title": "Dermatology Marrow Ed8 Notes",
        "preferred_filename": "Dermatology Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_23",
        "chat_id": -1002863499861,
        "message_id": 23,
        "platform": "marrow_e8",
        "subject_id": "psychiatry",
        "title": "Psychiatry Marrow Ed8 Notes",
        "preferred_filename": "Psychiatry Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_16",
        "chat_id": -1002863499861,
        "message_id": 16,
        "platform": "marrow_e8",
        "subject_id": "radiology",
        "title": "Radiology Marrow Ed8 Notes",
        "preferred_filename": "Radiology Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_17",
        "chat_id": -1002863499861,
        "message_id": 17,
        "platform": "marrow_e8",
        "subject_id": "anesthesia",
        "title": "Anesthesiology Marrow Ed8 Notes",
        "preferred_filename": "Anesthesiology Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_25",
        "chat_id": -1002863499861,
        "message_id": 25,
        "platform": "marrow_e8",
        "subject_id": "ophthalmology",
        "title": "Ophthalmology Marrow Ed8 Notes",
        "preferred_filename": "Ophthalmology Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_26",
        "chat_id": -1002863499861,
        "message_id": 26,
        "platform": "marrow_e8",
        "subject_id": "ent",
        "title": "ENT Marrow Ed8 Notes",
        "preferred_filename": "ENT Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_27",
        "chat_id": -1002863499861,
        "message_id": 27,
        "platform": "marrow_e8",
        "subject_id": "psm",
        "title": "Community Medicine (PSM) Marrow Ed8 Notes",
        "preferred_filename": "PSM Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002863499861_15",
        "chat_id": -1002863499861,
        "message_id": 15,
        "platform": "marrow_e8",
        "subject_id": "forensic_medicine",
        "title": "Forensic Medicine (FMT) Marrow Ed8 Notes",
        "preferred_filename": "FMT Marrow Ed8 Notes.pdf",
        "folder_path": "Aspirin_LMS/Marrow_E8/Notes",
        "is_master_textbook": True,
    },

    # --- PrepLadder Version X Medicine Notes PDF ---
    {
        "id": "note_-1004345284917_35",
        "chat_id": -1004345284917,
        "message_id": 35,
        "platform": "prepx_en",
        "subject_id": "medicine",
        "title": "PrepLadder Version X Medicine Notes (Master Edition)",
        "preferred_filename": "Medicine_Version_X_Final.pdf",
        "folder_path": "Aspirin_LMS/PrepLadder_X/Medicine",
        "is_master_textbook": True,
    },
    {
        "id": "note_-1002185821255_330",
        "chat_id": -1002185821255,
        "message_id": 330,
        "platform": "prepx_en",
        "subject_id": "medicine",
        "title": "PrepLadder Version X Medicine Notes (Mobile Edition)",
        "preferred_filename": "Medicine_Version_X_Mobile.pdf",
        "folder_path": "Aspirin_LMS/PrepLadder_X/Medicine",
        "is_master_textbook": True,
    },
]


class MicrosoftGraphUploader:
    """Handles upload session creation and 20 MiB chunked upload to openmedQ SharePoint."""
    def __init__(self):
        # Support both Client Credentials grant and Delegated Refresh Token grant
        self.tenant_id = os.environ.get("M365_TENANT_ID") or os.environ.get("NEW_ONEDRIVE_TENANT_ID") or "9903c5d7-b085-4596-9ee6-98f39ddba128"
        self.client_id = os.environ.get("M365_CLIENT_ID") or os.environ.get("NEW_ONEDRIVE_CLIENT_ID") or "2ba94e86-b064-42bb-819d-faacdfb80351"
        self.client_secret = os.environ.get("M365_CLIENT_SECRET")
        self.refresh_token = os.environ.get("NEW_ONEDRIVE_REFRESH_TOKEN")
        self.drive_id = os.environ.get("M365_DRIVE_ID") or "b!7354rmdgw0SfqPTGsKSQkPl-icC0zvdHjkdWYIvLto-5RraAMfwPTKEbLj10i14Y"

        self.access_token: Optional[str] = None
        self.token_expiry: float = 0

    def get_token(self) -> str:
        if self.access_token and time.time() < (self.token_expiry - 300):
            return self.access_token

        endpoint = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"

        if self.client_secret:
            # Client Credentials Grant (MFA-exempt, app-level service principal)
            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "client_credentials",
                "scope": "https://graph.microsoft.com/.default"
            }
        elif self.refresh_token:
            # Delegated Refresh Token Grant
            data = {
                "client_id": self.client_id,
                "grant_type": "refresh_token",
                "refresh_token": self.refresh_token,
                "scope": "offline_access Files.ReadWrite.All User.Read"
            }
        else:
            raise RuntimeError("No Microsoft Graph authentication credentials provided!")

        res = requests.post(endpoint, data=data, timeout=30)
        if res.status_code != 200:
            raise PermissionError(f"Failed to authenticate with Microsoft Graph: {res.status_code} - {res.text}")

        resp_data = res.json()
        self.access_token = resp_data["access_token"]
        self.token_expiry = time.time() + resp_data.get("expires_in", 3600)
        return self.access_token

    def get_file_metadata(self, remote_path: str) -> Optional[Dict[str, Any]]:
        token = self.get_token()
        clean_path = "/" + remote_path.strip("/")
        endpoint = f"https://graph.microsoft.com/v1.0/drives/{self.drive_id}/root:{clean_path}?$select=id,name,size,webUrl"
        try:
            r = requests.get(endpoint, headers={"Authorization": f"Bearer {token}"}, timeout=15)
            if r.status_code == 200:
                return r.json()
        except Exception:
            pass
        return None

    def create_upload_session(self, remote_path: str) -> str:
        token = self.get_token()
        clean_path = "/" + remote_path.strip("/")
        endpoint = f"https://graph.microsoft.com/v1.0/drives/{self.drive_id}/root:{clean_path}:/createUploadSession"
        body = {"item": {"@microsoft.graph.conflictBehavior": "replace"}}
        r = requests.post(
            endpoint,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            json=body,
            timeout=30
        )
        if r.status_code in (200, 201):
            return r.json()["uploadUrl"]
        raise RuntimeError(f"Error creating upload session for {remote_path}: {r.status_code} - {r.text}")

    def upload_chunks(self, upload_url: str, file_path: Path) -> Dict[str, Any]:
        total_size = file_path.stat().st_size
        start_byte = 0
        t0 = time.time()

        with open(file_path, "rb") as f:
            while start_byte < total_size:
                end_byte = min(start_byte + UPLOAD_CHUNK_SIZE, total_size)
                chunk = f.read(end_byte - start_byte)
                headers = {
                    "Content-Length": str(len(chunk)),
                    "Content-Range": f"bytes {start_byte}-{end_byte - 1}/{total_size}",
                }

                for attempt in range(5):
                    try:
                        res = requests.put(upload_url, headers=headers, data=chunk, timeout=60)
                        if res.status_code in (200, 201):
                            elapsed = time.time() - t0
                            speed_mb = (total_size / (1024 * 1024)) / max(elapsed, 0.1)
                            print(f"  [SharePoint] Upload complete: {total_size / (1024 * 1024):.1f} MB in {elapsed:.1f}s ({speed_mb:.1f} MB/s)")
                            return res.json()
                        elif res.status_code == 202:
                            pct = (end_byte / total_size) * 100
                            print(f"  [SharePoint] Uploading chunk: {end_byte / (1024 * 1024):.1f} / {total_size / (1024 * 1024):.1f} MB ({pct:.1f}%)")
                            start_byte = end_byte
                            break
                        elif res.status_code in (429, 503, 504):
                            wait_sec = int(res.headers.get("Retry-After", 5))
                            print(f"  [SharePoint RateLimit] HTTP {res.status_code}, waiting {wait_sec}s...")
                            time.sleep(wait_sec)
                        else:
                            raise RuntimeError(f"Upload chunk failed with status {res.status_code}: {res.text}")
                    except requests.RequestException as e:
                        if attempt == 4:
                            raise
                        time.sleep(2 ** attempt)

        raise RuntimeError("Upload session finished without 200/201 response")


class FastTelegramDownloader:
    """4-connection MTProto downloader."""
    def __init__(self, client: TelegramClient, max_workers: int = 4):
        self.client = client
        self.max_workers = max_workers
        self._senders_by_dc: Dict[int, List[MTProtoSender]] = {}

    async def _get_senders(self, dc_id: int, count: int) -> List[MTProtoSender]:
        existing = self._senders_by_dc.get(dc_id, [])
        needed = count - len(existing)
        if needed > 0:
            dc = await self.client._get_dc(dc_id)
            auth_key = self.client.session.auth_key if self.client.session.dc_id == dc_id else None
            for _ in range(needed):
                sender = MTProtoSender(auth_key, loggers=self.client._log)
                await sender.connect(self.client._connection(dc.ip_address, dc.port, dc.id, loggers=self.client._log, proxy=self.client._proxy))
                if not auth_key:
                    auth = await self.client(ExportAuthorizationRequest(dc_id))
                    self.client._init_request.query = ImportAuthorizationRequest(id=auth.id, bytes=auth.bytes)
                    req = InvokeWithLayerRequest(LAYER, self.client._init_request)
                    await sender.send(req)
                    auth_key = sender.auth_key
                existing.append(sender)
            self._senders_by_dc[dc_id] = existing
        return existing[:count]

    async def download_file(self, document, out_path: Path) -> int:
        file_size = document.size
        part_size = TG_PART_SIZE
        part_count = (file_size + part_size - 1) // part_size
        dc_id, location = utils.get_input_location(document)
        connections = min(self.max_workers, part_count)
        senders = await self._get_senders(dc_id, connections)

        queue = asyncio.Queue()
        for i in range(part_count):
            queue.put_nowait(i)

        parts_data = {}
        write_index = 0
        lock = asyncio.Lock()
        downloaded = 0
        t0 = time.time()

        with open(out_path, "wb") as f:
            async def worker(sender_idx: int):
                nonlocal write_index, downloaded
                sender = senders[sender_idx]
                while not queue.empty():
                    try:
                        part_idx = queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break

                    offset = part_idx * part_size
                    req = GetFileRequest(location, offset=offset, limit=part_size)
                    data = None

                    for attempt in range(5):
                        try:
                            res = await self.client._call(sender, req)
                            data = res.bytes
                            break
                        except FloodWaitError as e:
                            print(f"\n[Telegram FloodWait] Safely backing off for {e.seconds + 10}s...")
                            await asyncio.sleep(e.seconds + 10)
                        except Exception:
                            if attempt == 4:
                                raise
                            await asyncio.sleep(2 ** attempt)

                    async with lock:
                        parts_data[part_idx] = data
                        downloaded += len(data)
                        while write_index in parts_data:
                            f.write(parts_data.pop(write_index))
                            write_index += 1

            workers = [asyncio.create_task(worker(i)) for i in range(connections)]
            await asyncio.gather(*workers)

        elapsed = time.time() - t0
        speed_mb = (file_size / (1024 * 1024)) / max(elapsed, 0.1)
        print(f"  [Telegram] Download complete: {file_size / (1024 * 1024):.1f} MB in {elapsed:.1f}s ({speed_mb:.1f} MB/s)")
        return file_size


def update_catalog_file(item: Dict[str, Any]):
    """Adds or updates the note entry in public/catalog.json under its subject."""
    if not CATALOG_PATH.exists():
        return
    try:
        cat = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
        subjects = cat.get("subjects", [])
        sub_id = item["subject_id"]
        target_sub = next((s for s in subjects if s["id"] == sub_id), None)
        if not target_sub:
            return

        if "notes" not in target_sub:
            target_sub["notes"] = []

        existing_idx = next((i for i, n in enumerate(target_sub["notes"]) if n.get("id") == item["id"] or n.get("filename") == item["preferred_filename"]), None)
        
        note_entry = {
            "id": item["id"],
            "subject_id": sub_id,
            "title": item["title"],
            "filename": item["preferred_filename"],
            "file_size_bytes": item.get("size_bytes", 0),
            "file_size_mb": round(item.get("size_bytes", 0) / (1024 * 1024), 2),
            "chat_id": item["chat_id"],
            "message_id": item["message_id"],
            "date": item.get("uploaded_at", time.strftime("%Y-%m-%dT%H:%M:%SZ")),
            "is_master_textbook": item.get("is_master_textbook", True),
            "onedrive_item_id": item.get("onedrive_item_id"),
            "onedrive_path": item.get("onedrive_path"),
            "web_url": item.get("web_url"),
        }

        if existing_idx is not None:
            target_sub["notes"][existing_idx] = note_entry
        else:
            target_sub["notes"].append(note_entry)

        cat["updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ")
        CATALOG_PATH.write_text(json.dumps(cat, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"  [Catalog Error] Failed to update catalog.json: {e}")


async def run_migration(target_filter: str = "all", dry_run: bool = False, limit: int = 0):
    print("=" * 65)
    print(" 🏥 Aspirin LMS: Notes to SharePoint Migration Engine")
    print(f" Target Mode: {target_filter}")
    print(f" Dry Run:     {dry_run}")
    print("=" * 65)

    # Filter targets
    targets = []
    for t in NOTES_MIGRATION_TARGETS:
        if target_filter == "marrow_e8" and t["platform"] != "marrow_e8":
            continue
        if target_filter == "prepx_medicine" and t["subject_id"] != "medicine":
            continue
        targets.append(t)

    if limit > 0:
        targets = targets[:limit]

    print(f"\nTotal targets to process: {len(targets)}")

    # Load existing manifest
    manifest: Dict[str, Any] = {}
    if MANIFEST_PATH.exists():
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))

    sp_uploader = MicrosoftGraphUploader()
    # Test Graph auth
    if not dry_run:
        try:
            token = sp_uploader.get_token()
            print("✓ Microsoft Graph API authenticated successfully.")
        except Exception as e:
            print(f"✗ Microsoft Graph authentication failed: {e}")
            return

    # Initialize Telegram client
    session_str = os.environ.get("TELEGRAM_SESSION_STRING")
    api_id = int(os.environ.get("TELEGRAM_API_ID", 24716450))
    api_hash = os.environ.get("TELEGRAM_API_HASH", "0e491fad22372b564277743abb718b61")

    if session_str:
        client = TelegramClient(StringSession(session_str), api_id, api_hash)
    else:
        client = TelegramClient(str(PROJECT_DIR / "telegram_session"), api_id, api_hash)

    await client.connect()
    if not await client.is_user_authorized():
        print("✗ Telegram user session not authorized!")
        return
    me = await client.get_me()
    print(f"✓ Telegram connected as: {me.first_name} ({me.phone or 'Session'})\n")

    tg_downloader = FastTelegramDownloader(client)

    success_count = 0
    skipped_count = 0
    failed_count = 0

    for idx, target in enumerate(targets, start=1):
        item_id = target["id"]
        remote_filename = target["preferred_filename"]
        remote_folder = target["folder_path"]
        remote_path = f"/{remote_folder}/{remote_filename}"
        chat_id = target["chat_id"]
        msg_id = target["message_id"]

        print(f"[{idx}/{len(targets)}] {target['title']} ({remote_filename})")

        # Check if already completed in manifest
        if item_id in manifest and manifest[item_id].get("status") == "completed" and manifest[item_id].get("onedrive_item_id"):
            print(f"  ✓ Already in manifest and marked completed. Skipping.")
            skipped_count += 1
            continue

        # Check if already exists on SharePoint
        if not dry_run:
            existing_sp = sp_uploader.get_file_metadata(remote_path)
            if existing_sp and existing_sp.get("size", 0) > 0:
                print(f"  ✓ Already exists on SharePoint (ID: {existing_sp['id']}). Updating manifest.")
                manifest_entry = {
                    "title": target["title"],
                    "filename": remote_filename,
                    "platform": target["platform"],
                    "subject_id": target["subject_id"],
                    "folder_path": remote_folder,
                    "telegram_chat_id": chat_id,
                    "telegram_message_id": msg_id,
                    "onedrive_item_id": existing_sp["id"],
                    "onedrive_path": remote_path,
                    "web_url": existing_sp.get("webUrl", ""),
                    "size_bytes": existing_sp.get("size", 0),
                    "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "status": "completed",
                    "is_master_textbook": target.get("is_master_textbook", True),
                }
                manifest[item_id] = manifest_entry
                update_catalog_file(manifest_entry)
                skipped_count += 1
                continue

        if dry_run:
            print(f"  [Dry Run] Would download from Chat {chat_id} Msg {msg_id} -> Upload to {remote_path}")
            success_count += 1
            continue

        # Fetch message and document from Telegram
        try:
            entity = await client.get_entity(chat_id)
            msg = await client.get_messages(entity, ids=msg_id)
            if not msg or not msg.document:
                print(f"  ✗ Message {msg_id} or document not found in chat {chat_id}!")
                failed_count += 1
                continue

            file_size_mb = msg.document.size / (1024 * 1024)
            print(f"  Found document: {file_size_mb:.1f} MB")

            local_stage_file = TEMP_DIR / f"stage_{msg_id}_{remote_filename}"
            
            # Step 1: Download from Telegram
            await tg_downloader.download_file(msg.document, local_stage_file)

            # Step 2: Create upload session on SharePoint
            upload_url = sp_uploader.create_upload_session(remote_path)

            # Step 3: Chunked upload to SharePoint
            sp_result = sp_uploader.upload_chunks(upload_url, local_stage_file)

            # Step 4: Cleanup local file
            if local_stage_file.exists():
                local_stage_file.unlink()

            # Step 5: Save manifest and update catalog
            manifest_entry = {
                "title": target["title"],
                "filename": remote_filename,
                "platform": target["platform"],
                "subject_id": target["subject_id"],
                "folder_path": remote_folder,
                "telegram_chat_id": chat_id,
                "telegram_message_id": msg_id,
                "onedrive_item_id": sp_result.get("id"),
                "onedrive_path": remote_path,
                "web_url": sp_result.get("webUrl", ""),
                "size_bytes": sp_result.get("size", msg.document.size),
                "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "status": "completed",
                "is_master_textbook": target.get("is_master_textbook", True),
            }
            manifest[item_id] = manifest_entry

            # Atomic manifest save
            MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
            PUBLIC_MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
            update_catalog_file(manifest_entry)

            print(f"  ✓ Saved to manifest: ID {sp_result.get('id')}")
            success_count += 1

            # 2.5s cooldown
            time.sleep(2.5)

        except Exception as e:
            print(f"  ✗ Transfer failed: {e}")
            failed_count += 1
            if local_stage_file.exists():
                local_stage_file.unlink()

    print("\n" + "=" * 65)
    print(f" MIGRATION SUMMARY:")
    print(f"  Success: {success_count}")
    print(f"  Skipped (Already on SP): {skipped_count}")
    print(f"  Failed:  {failed_count}")
    print("=" * 65)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate Notes from Telegram to SharePoint")
    parser.add_argument("--target", choices=["all", "marrow_e8", "prepx_medicine"], default="all")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without uploading")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of files")
    args = parser.parse_args()

    asyncio.run(run_migration(target_filter=args.target, dry_run=args.dry_run, limit=args.limit))
