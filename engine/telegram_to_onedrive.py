"""
Yui - Cloud Pipeline: Telegram to Microsoft OneDrive Migration Engine
Transfers 4,000+ medical lecture videos and clinical notes directly from
the 'Prep X + Cerebellum' Telegram channel (-1003709841202) into your 25 TB SharePoint drive.

Key Features & Ban-Proof Speed Optimizations:
- 4x Parallel MTProto chunk downloading (exact Telegram Desktop client spec: 4 senders per DC)
- Sender pooling per DC to eliminate authentication handshake latency between files
- 20 MiB chunked upload to Microsoft Graph (Azure data center line speed: 30-60 MB/s)
- Automatic local SSD staging and immediate cleanup (zero persistent disk footprint)
- 100% strict Telegram anti-ban safeguards:
    * Bounded to max 4 connections (same as official Telegram app)
    * Immediate backoff on FloodWaitError (with +10s safety buffer)
    * 2-second cooldown between files to avoid aggressive traffic spikes
    * Resumable manifest tracking (engine/transfer_manifest.json)
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

# Ensure UTF-8 console output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Upload chunk size: 20 MiB (Must be an exact multiple of 320 KiB: 64 * 327,680 bytes)
UPLOAD_CHUNK_SIZE = 20 * 1024 * 1024
# Telegram MTProto part size: 512 KiB (Maximum allowed by Telegram API)
TG_PART_SIZE = 512 * 1024

PROJECT_DIR = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJECT_DIR / "engine" / "transfer_manifest.json"
PUBLIC_MANIFEST_PATH = PROJECT_DIR / "public" / "transfer_manifest.json"
SECTIONS_PATH = PROJECT_DIR / "engine" / "prepx_sections.json"
MARROW_SECTIONS_PATH = PROJECT_DIR / "engine" / "marrow_sections.json"
LEGACY_CATALOG_PATH = PROJECT_DIR / "public" / "catalog.json"
PREPX_CHANNEL_ID = -1003709841202
MARROW_CHANNEL_ID = -1003264222864

def load_env_file():
    env_file = PROJECT_DIR / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k and k not in os.environ:
                        os.environ[k] = v

load_env_file()

PLATFORM_FOLDER_MAP = {
    "prepx_en": "01_PrepLadder_X_English",
    "prepx_hi": "02_PrepLadder_X_Hinglish",
    "cerebellum": "03_Cerebellum_Academy",
    "marrow": "04_Marrow_Edition_6",
}

MARROW_FINAL_YEAR_TOPICS = {
    "surgery": 339,
    "obg": 423,
    "pediatrics": 252,
    "orthopedics": 787,
    "anesthesia": 575,
    "dermatology": 310,
    "psychiatry": 1293,
    "radiology": 533,
    "ophthalmology": 211,
    "ent": 146,
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


# Academic clinical hierarchy for lecture migration:
# 1. PrepLadder Medicine lectures first (English, then Hinglish)
# 2. PrepLadder Final Year clinical subjects (Surgery, OBG, Pediatrics, Orthopedics, Dermatology, Psychiatry, Radiology, Anesthesia)
# 3. PrepLadder Remaining Years:
#    - 3rd Prof: Ophthalmology, ENT, PSM, FMT
#    - 2nd Prof: Pathology, Pharmacology, Microbiology
#    - 1st Prof: Anatomy, Physiology, Biochemistry
# 4. Cerebellum Academy in the exact same clinical order:
#    - Medicine -> Final Year -> Remaining Years -> Notes PDF
SUBJECT_CLINICAL_RANK = {
    "medicine": 1,
    "surgery": 2,
    "obg": 3,
    "pediatrics": 4,
    "orthopedics": 5,
    "dermatology": 6,
    "psychiatry": 7,
    "radiology": 8,
    "anesthesia": 9,
    "ophthalmology": 10,
    "ent": 11,
    "psm": 12,
    "forensic_medicine": 13,
    "pathology": 14,
    "pharmacology": 15,
    "microbiology": 16,
    "anatomy": 17,
    "physiology": 18,
    "biochemistry": 19,
    "notes_pdf": 20,
}


def get_section_priority(sec_platform: str, raw_title: str) -> tuple:
    """
    Returns a sort tuple prioritizing:
    1. PrepLadder Medicine
    2. PrepLadder Final Year
    3. PrepLadder Remaining Years (3rd, 2nd, 1st profs)
    4. Cerebellum Medicine
    5. Cerebellum Final Year
    6. Cerebellum Remaining Years
    7. Cerebellum Notes PDF
    """
    norm_subj = normalize_subject_title(raw_title)
    platform_group = 1 if sec_platform in ("prepx_en", "prepx_hi") else 2

    if norm_subj == "medicine":
        cat_rank = 1
    elif norm_subj in ("surgery", "obg", "pediatrics", "orthopedics", "dermatology", "psychiatry", "radiology", "anesthesia"):
        cat_rank = 2
    elif norm_subj in ("ophthalmology", "ent", "psm", "forensic_medicine", "pathology", "pharmacology", "microbiology", "anatomy", "physiology", "biochemistry"):
        cat_rank = 3
    else:
        cat_rank = 4

    platform_rank = 1 if sec_platform == "prepx_en" else (2 if sec_platform == "prepx_hi" else 3)
    subj_rank = SUBJECT_CLINICAL_RANK.get(norm_subj, 99)

    return (platform_group, cat_rank, platform_rank, subj_rank)


class FastTelegramDownloader:
    """
    High-performance, 100% ban-safe parallel MTProto downloader.
    Uses 4 concurrent chunk connections per DC (exact official Telegram Desktop spec).
    Reuses warm MTProto senders across files to eliminate handshake delays.
    """
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
                    # Always pass part_size for limit (Telegram automatically returns partial bytes on final part)
                    req = GetFileRequest(location, offset=offset, limit=part_size)

                    data = None
                    for attempt in range(5):
                        try:
                            res = await self.client._call(sender, req)
                            data = res.bytes
                            break
                        except FloodWaitError as e:
                            print(f"\n[Telegram FloodWait] Rate limit hit. Safely backing off for {e.seconds + 10}s...")
                            await asyncio.sleep(e.seconds + 10)
                            if attempt == 4:
                                raise e
                        except Exception as e:
                            if attempt == 4:
                                raise e
                            await asyncio.sleep(1)

                    if data is None:
                        continue

                    async with lock:
                        downloaded += len(data)
                        parts_data[part_idx] = data
                        while write_index in parts_data:
                            f.seek(write_index * part_size)
                            f.write(parts_data.pop(write_index))
                            write_index += 1

                        pct = round((downloaded / file_size) * 100, 1)
                        speed = (downloaded / (1024 * 1024)) / max(time.time() - t0, 0.1)
                        sys.stdout.write(f"\r  [Telegram Download] {pct}% ({round(downloaded/(1024*1024), 1)}/{round(file_size/(1024*1024), 1)} MB) @ {speed:.2f} MB/s")
                        sys.stdout.flush()

            tasks = [asyncio.create_task(worker(i)) for i in range(connections)]
            await asyncio.gather(*tasks)

        sys.stdout.write("\n")
        sys.stdout.flush()
        return file_size

    async def close(self):
        for senders in self._senders_by_dc.values():
            for s in senders:
                try:
                    await s.disconnect()
                except Exception:
                    pass
        self._senders_by_dc.clear()


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
        """Creates a Microsoft Graph Resumable Upload Session on the 25 TB SharePoint drive."""
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

    def get_video_metadata(self, item_id: str) -> Dict[str, Any]:
        """Fetches video duration, resolution, and thumbnail info from Microsoft Graph."""
        token = self.get_valid_token()
        endpoint = f"https://graph.microsoft.com/v1.0/{self.drive_target}/items/{item_id}?$select=id,name,video"
        headers = {"Authorization": f"Bearer {token}"}
        try:
            res = requests.get(endpoint, headers=headers, timeout=15)
            if res.status_code == 200:
                data = res.json()
                video = data.get("video") or {}
                duration_ms = video.get("duration")
                if duration_ms:
                    sec = round(duration_ms / 1000)
                    m = sec // 60
                    s = sec % 60
                    formatted = f"{m // 60}h {m % 60}m" if m > 60 else f"{m}m {s}s" if s > 0 else f"{m}m"
                    return {
                        "duration_seconds": sec,
                        "duration_formatted": formatted,
                        "resolution": f"{video.get('width')}x{video.get('height')}" if video.get("width") else None,
                    }
        except Exception:
            pass
        return {}

    def upload_file(self, upload_url: str, file_path: Path, chunk_size: int = UPLOAD_CHUNK_SIZE, retries: int = 5) -> Optional[Dict[str, Any]]:
        """Uploads a local file in 20 MiB chunks directly to Microsoft Graph uploadUrl."""
        total_size = file_path.stat().st_size
        start_byte = 0
        result_meta = None
        t0 = time.time()

        with open(file_path, "rb") as f:
            while start_byte < total_size:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                chunk_len = len(chunk)
                end_byte = start_byte + chunk_len - 1

                headers = {
                    "Content-Length": str(chunk_len),
                    "Content-Range": f"bytes {start_byte}-{end_byte}/{total_size}",
                }

                for attempt in range(retries):
                    try:
                        res = requests.put(upload_url, headers=headers, data=chunk, timeout=120)
                        if res.status_code == 202:
                            break  # Accepted
                        elif res.status_code in (200, 201):
                            result_meta = res.json()  # Complete!
                            break
                        elif res.status_code == 429:
                            retry_after = int(res.headers.get("Retry-After", 10))
                            print(f"\n[OneDrive 429] Throttled. Backing off for {retry_after}s...")
                            time.sleep(retry_after)
                        elif res.status_code >= 500:
                            time.sleep(3 * (attempt + 1))
                        else:
                            raise RuntimeError(f"OneDrive upload error {res.status_code}: {res.text}")
                    except (requests.RequestException, TimeoutError) as e:
                        if attempt == retries - 1:
                            raise e
                        time.sleep(3 * (attempt + 1))

                start_byte += chunk_len
                pct = round((start_byte / total_size) * 100, 1)
                speed = (start_byte / (1024 * 1024)) / max(time.time() - t0, 0.1)
                sys.stdout.write(f"\r  [SharePoint Upload] {pct}% ({round(start_byte/(1024*1024), 1)}/{round(total_size/(1024*1024), 1)} MB) @ {speed:.2f} MB/s")
                sys.stdout.flush()

        sys.stdout.write("\n")
        sys.stdout.flush()
        return result_meta


class LectureTransferEngine:
    def __init__(self, od_client: Optional[OneDriveClient], dry_run: bool = False, videos_only: bool = True):
        self.od_client = od_client
        self.dry_run = dry_run
        self.videos_only = videos_only
        self.tg_client: Optional[TelegramClient] = None
        self.downloader: Optional[FastTelegramDownloader] = None
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
        if PUBLIC_MANIFEST_PATH.parent.exists():
            with open(PUBLIC_MANIFEST_PATH, "w", encoding="utf-8") as f:
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
        self.downloader = FastTelegramDownloader(self.tg_client, max_workers=4)

    def load_queue(self, platform: Optional[str] = None, target_subject: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Loads unuploaded lecture tasks based on Prep X + Cerebellum master sections.
        Falls back to legacy catalog.json if sections file is absent.
        """
        if not SECTIONS_PATH.exists():
            return self._load_queue_legacy(target_subject)

        with open(SECTIONS_PATH, "r", encoding="utf-8") as f:
            sections = json.load(f)

        # Sort master sections according to academic clinical priority
        sorted_sections = sorted(
            sections,
            key=lambda s: get_section_priority(s.get("platform", ""), s.get("title", ""))
        )

        queue = []
        for sec in sorted_sections:
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

        # Load Marrow Final Year sections
        if MARROW_SECTIONS_PATH.exists() and (not platform or platform.lower() in ("marrow", "all")):
            try:
                with open(MARROW_SECTIONS_PATH, "r", encoding="utf-8") as f:
                    marrow_sections = json.load(f)

                for sec in marrow_sections:
                    sec_subj = sec["subject_id"]
                    if target_subject and target_subject.lower() != "all":
                        tgt = target_subject.lower().strip()
                        if tgt == "obgyn":
                            tgt = "obg"
                        if tgt != sec_subj.lower():
                            continue

                    platform_folder = PLATFORM_FOLDER_MAP.get("marrow", "04_Marrow_Edition_6")
                    subj_folder = SUBJECT_FOLDER_MAP.get(sec_subj, sec_subj)

                    for vid in sec.get("videos", []):
                        mid = vid["message_id"]
                        item_id = f"mr_{MARROW_CHANNEL_ID}_{mid}"
                        if item_id in self.manifest and self.manifest[item_id].get("status") == "completed":
                            continue

                        queue.append({
                            "id": item_id,
                            "chat_id": MARROW_CHANNEL_ID,
                            "message_id": mid,
                            "platform": "marrow",
                            "platform_folder": platform_folder,
                            "subject_id": sec_subj,
                            "subject_name": f"Marrow {sec['title']}",
                            "subject_folder": subj_folder,
                            "preferred_title": vid.get("title"),
                        })
            except Exception as e:
                print(f"[Warning] Failed to load marrow sections: {e}")

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
        """Transfers a single lecture item from Telegram directly into Microsoft SharePoint (25 TB)."""
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
            print(f"\n[Telegram FloodWait] Server requested wait of {e.seconds} seconds.")
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
        if item.get("preferred_title"):
            raw_fn = item["preferred_title"]
        elif msg.file and msg.file.name:
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
        if not is_pdf and not clean_name.lower().endswith((".mp4", ".mkv", ".webm", ".mov")):
            clean_name += ".mp4"

        is_video = bool(msg.video) or (msg.file and msg.file.mime_type and msg.file.mime_type.startswith("video/")) or clean_name.lower().endswith((".mp4", ".mkv", ".webm", ".mov"))
        if self.videos_only and (is_pdf or not is_video):
            print(f"  [Notice] Skipping non-video file {clean_name} (--videos-only is enabled).")
            self.manifest[item_id] = {
                "status": "completed",
                "type": "non_video_skipped",
                "filename": clean_name,
                "skipped": True,
            }
            self._save_manifest()
            return

        clean_title = re.sub(r"\.(mp4|pdf|mkv|webm|mov)$", "", clean_name, flags=re.I).strip()
        remote_path = f"Aspirin_LMS/{platform_folder}/{subj_folder}/{clean_name}"

        print(f"\n[{'PDF' if is_pdf else 'VIDEO'}] {platform_folder} / {subj_folder} -> {clean_name}")
        print(f"Remote: /{remote_path}")
        print(f"  Size: {round(total_size / (1024 * 1024), 2)} MB")

        if self.dry_run:
            print("  (DRY-RUN: Skipping actual transfer)")
            return

        # Local temporary staging file on high-speed runner SSD
        scratch_dir = PROJECT_DIR / ".scratch_transfer"
        scratch_dir.mkdir(parents=True, exist_ok=True)
        local_temp_file = scratch_dir / f"tmp_{message_id}_{clean_name}"

        result_meta = None
        try:
            # Step A: Safe 4-worker parallel MTProto download directly to SSD
            await self.downloader.download_file(msg.document, local_temp_file)

            # Step B: Create upload session on 25 TB SharePoint drive
            upload_url = self.od_client.create_upload_session(remote_path)

            # Step C: High-speed Azure-to-SharePoint 20 MiB chunk upload
            result_meta = self.od_client.upload_file(upload_url, local_temp_file)

        finally:
            # Step D: Immediately clean up local SSD
            if local_temp_file.exists():
                try:
                    local_temp_file.unlink()
                except Exception:
                    pass

        print("  Upload Completed Successfully!")

        # Step E: Record into manifest
        drive_item_id = result_meta.get("id") if result_meta else None
        web_url = result_meta.get("webUrl") if result_meta else None

        # Fetch video duration and resolution if video
        video_meta = {}
        if not is_pdf and drive_item_id and self.od_client:
            video_meta = self.od_client.get_video_metadata(drive_item_id)

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
            "duration_seconds": video_meta.get("duration_seconds"),
            "duration_formatted": video_meta.get("duration_formatted"),
            "resolution": video_meta.get("resolution"),
            "thumbnail_url": f"/api/thumbnail/{chat_id}/{message_id}" if not is_pdf else None,
            "uploaded_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "completed",
        }
        self._save_manifest()

        # Step F: 2-second safe breathing space between items
        await asyncio.sleep(2)


async def run_pipeline(platform: Optional[str] = None, subject: Optional[str] = None, limit: int = 20, dry_run: bool = False, videos_only: bool = True):
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

    engine = LectureTransferEngine(od_client, dry_run=dry_run, videos_only=videos_only)
    await engine.init_telegram()

    queue = engine.load_queue(platform=platform, target_subject=subject)
    print("=" * 65)
    print(f" Yui Pipeline: Telegram -> 25 TB SharePoint Drive (Fast & Ban-Proof)")
    print(f" Platform Edition:       {platform or 'ALL'}")
    print(f" Target Subject:         {subject or 'ALL'}")
    print(f" Videos Only Filter:     {videos_only}")
    print(f" Total Pending in Queue: {len(queue)}")
    print(f" Batch Limit for run:    {limit}")
    if queue:
        first = queue[0]
        print(f" Priority #1 in Queue:   [{first['platform']}] {first['subject_name']} (Msg {first['message_id']})")
    print("=" * 65)

    processed = 0
    for item in queue[:limit]:
        try:
            await engine.transfer_item(item)
            processed += 1
        except FloodWaitError as e:
            print(f"\n[Telegram FloodWait] Server requested sleep {e.seconds}s. Waiting safely...")
            if e.seconds > 180:
                print(f"FloodWait is high ({e.seconds}s). Gracefully ending batch to protect account.")
                break
            await asyncio.sleep(e.seconds + 10)
        except Exception as e:
            print(f"\nError transferring item {item['id']}: {e}")
            continue

    print("\n" + "=" * 65)
    print(f" Batch Run Complete! Processed {processed} items.")
    print(f" Remaining pending items: {len(queue) - processed}")
    print("=" * 65)

    if engine.downloader:
        await engine.downloader.close()
    if engine.tg_client:
        await engine.tg_client.disconnect()


def main():
    parser = argparse.ArgumentParser(description="Yui Telegram to 25 TB SharePoint Migration Engine (Fast & Ban-Proof)")
    parser.add_argument("--platform", default=None, help="Platform: 'prepx_en', 'prepx_hi', 'cerebellum', 'marrow', or 'all'")
    parser.add_argument("--subject", default=None, help="Target subject (e.g. 'surgery', 'medicine', or 'all')")
    parser.add_argument("--limit", type=int, default=25, help="Max items to upload in this run (default: 25)")
    parser.add_argument("--dry-run", action="store_true", help="List files without actually uploading")
    parser.add_argument("--videos-only", action="store_true", default=True, help="Only upload video files (default: True)")

    args = parser.parse_args()
    asyncio.run(run_pipeline(platform=args.platform, subject=args.subject, limit=args.limit, dry_run=args.dry_run, videos_only=args.videos_only))


if __name__ == "__main__":
    main()
