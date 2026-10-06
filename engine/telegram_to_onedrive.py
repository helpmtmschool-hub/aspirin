"""
Yui - Cloud Pipeline: Telegram to SharePoint Migration Engine
Transfers medical lecture videos from the 'Prep X + Cerebellum' channel (-1003709841202) and the
Marrow channel (-1003264222864) into the openmedQ commercial tenant (openmedq.sharepoint.com),
in clean program/subject folders such as Aspirin_LMS/Marrow_E6/OBG.

Lectures that already sit on the legacy 5ncjwt tenant are registered in the manifest for the
cloud-to-cloud workflows instead of being pulled out of Telegram a second time.

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
PREPX_HI_MEDICINE_TITLES_PATH = PROJECT_DIR / "engine" / "prepx_hi_medicine_clean_titles.json"

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

# openmedQ (destination tenant) and 5ncjwt (legacy tenant being drained). The ids match the ones
# engine/migrate_marrow_all.py and the Pages worker use.
NEW_TENANT_CLIENT_ID = "054e8da3-e1e0-4274-b8a9-2bb6f71ef8f8"
NEW_TENANT_ID = "9903c5d7-b085-4596-9ee6-98f39ddba128"
OLD_TENANT_CLIENT_ID = "ba92c830-fac7-4d60-a0ff-8bf0b581a4c4"
OLD_TENANT_ID = "938a1924-0af0-4599-819b-177a1dcf8fd6"

# Folder names already established on openmedQ. Marrow_E6 must keep the exact names
# migrate_marrow_all.py writes, or the same subject lands in two folders.
NEW_TENANT_PLATFORM_FOLDER_MAP = {
    "prepx_en": "PrepLadder_X",
    "prepx_hi": "PrepLadder_X_Hinglish",
    "cerebellum": "Cerebellum",
    "marrow": "Marrow_E6",
    "legacy": "Legacy_Catalog",
}

NEW_TENANT_SUBJECT_FOLDER_MAP = {
    "anatomy": "Anatomy",
    "physiology": "Physiology",
    "biochemistry": "Biochemistry",
    "pathology": "Pathology",
    "pharmacology": "Pharmacology",
    "microbiology": "Microbiology",
    "psm": "Community_Medicine_PSM",
    "forensic_medicine": "Forensic_Medicine",
    "ophthalmology": "Ophthalmology",
    "ent": "ENT",
    "medicine": "Medicine",
    "surgery": "Surgery",
    "obg": "OBG",
    "pediatrics": "Pediatrics",
    "psychiatry": "Psychiatry",
    "orthopedics": "Orthopedics",
    "anesthesia": "Anesthesia",
    "radiology": "Radiology",
    "dermatology": "Dermatology",
    "notes_pdf": "Notes_PDF",
}


def openmedq_subject_folder(subject_id: str, legacy_subject_folder: str) -> str:
    """Map a legacy subject folder to its openmedQ name, keeping Cerebellum's faculty suffix.

    '13_Obstetrics_and_Gynecology' -> 'OBG', '03_Biochemistry_Dr_Smily_Pruthi' ->
    'Biochemistry_Dr_Smily_Pruthi' (two faculties of one subject must not share a folder).
    """
    stripped = re.sub(r"^\d+_", "", legacy_subject_folder)
    legacy_base = re.sub(r"^\d+_", "", SUBJECT_FOLDER_MAP.get(subject_id, ""))
    mapped = NEW_TENANT_SUBJECT_FOLDER_MAP.get(subject_id)
    if mapped and legacy_base and stripped.startswith(legacy_base):
        return mapped + stripped[len(legacy_base):]
    return stripped


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


ACRONYMS = {
    'ENT', 'OBG', 'PSM', 'FMT', 'EEG', 'ICP', 'ALS', 'MND', 'SAH', 'TIA',
    'SLE', 'RA', 'PBC', 'PSC', 'COPD', 'TB', 'ILD', 'PAP', 'LBW', 'CT',
    'MRI', 'USG', 'PROM', 'IUGR', 'PCOS', 'PID', 'CIN', 'ATLS', 'IV', 'GI',
    'NEET', 'PG', 'COVID', 'HIV', 'DNA', 'RNA', 'CSF', 'RBC', 'WBC', 'HB',
    'ABG', 'ECG', 'LFT', 'KFT', 'RFT', 'P1', 'P2', 'P3', 'P4',
    'HTN', 'PPH', 'IUCD', 'IUCDS'
}

MINOR_WORDS = {'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 'to', 'from', 'by', 'of', 'in', 'with'}

# Acronym + lowercase inflectional suffix, which .upper() would flatten to all-caps.
ACRONYM_DISPLAY = {'IUCDS': 'IUCDs'}


def to_title_case(s: str) -> str:
    tokens = re.split(r'(\s+|[-/(),])', s)
    out = []
    word_idx = 0
    for tok in tokens:
        if not tok or re.match(r'^(\s+|[-/(),])$', tok):
            out.append(tok)
            continue
        cleaned = re.sub(r'[^\w]', '', tok).upper()
        if cleaned in ACRONYMS:
            out.append(ACRONYM_DISPLAY.get(cleaned, cleaned))
        elif word_idx > 0 and tok.lower() in MINOR_WORDS:
            out.append(tok.lower())
        else:
            out.append(tok.capitalize())
        word_idx += 1
    return "".join(out)


def normalize_lecture_title(raw_title: str, subject_name: str = "", subject_id: str = "") -> str:
    t = raw_title.strip()
    t = re.sub(r'\.(mp4|mkv|webm|pdf)$', '', t, flags=re.I).strip()
    t = re.sub(r'\bsurgey\b', 'Surgery', t, flags=re.I)
    t = re.sub(r'\bnutition\b', 'Nutrition', t, flags=re.I)
    t = re.sub(r'\bdsz\b', 'Disease', t, flags=re.I)
    t = re.sub(r'\bpappulo\b', 'Papulo', t, flags=re.I)
    t = re.sub(r'\bbasi\b', 'Basics', t, flags=re.I)
    t = re.sub(r'\bint obstruction\b', 'Intestinal Obstruction', t, flags=re.I)
    t = re.sub(r'\buppergi\b', 'Upper GI', t, flags=re.I)
    t = re.sub(r'\bthyriod\b', 'Thyroid', t, flags=re.I)
    t = re.sub(r'\bmedistanum\b', 'Mediastinum', t, flags=re.I)
    t = re.sub(r'\bamnitic\b', 'Amniotic', t, flags=re.I)
    t = re.sub(r'\bderma\b|\bdermat\b', 'Dermatology', t, flags=re.I)
    t = re.sub(r'\bortho\b', 'Orthopedics', t, flags=re.I)
    t = re.sub(r'\bed6\b|\bedition\s*0?6\b', 'Edition 6', t, flags=re.I)
    t = re.sub(r'\s+', ' ', t).strip()

    m = re.match(r'^(?:lecture\s*)?0*(\d+)[\.\s\-_:]*(.*)$', t, flags=re.I)
    if m:
        num = int(m.group(1))
        rest = m.group(2).strip()
        if num > 500:
            return to_title_case(t)
        if not rest:
            rest = f"{subject_name} Part {num}" if subject_name else f"Part {num}"
        clean_rest = to_title_case(rest)
        return f"{num}. {clean_rest}"
    else:
        return to_title_case(t)


# Final Year MBBS / NEET-PG Clinical Subjects
FINAL_YEAR_SUBJECTS = {
    "surgery",
    "obg",
    "pediatrics",
    "orthopedics",
    "dermatology",
    "psychiatry",
    "radiology",
    "anesthesia",
    "ophthalmology",
    "ent",
    "medicine",
}

# Clinical order within subjects (Surgery first, then OBG, Pediatrics, etc.)
# Medicine is rank 11 so completed English medicine doesn't block, and Hinglish medicine doesn't precede clinicals.
SUBJECT_CLINICAL_RANK = {
    "surgery": 1,
    "obg": 2,
    "pediatrics": 3,
    "orthopedics": 4,
    "dermatology": 5,
    "psychiatry": 6,
    "radiology": 7,
    "anesthesia": 8,
    "ophthalmology": 9,
    "ent": 10,
    "medicine": 11,
    "psm": 12,
    "forensic_medicine": 13,
    "fmt": 13,
    "pathology": 14,
    "pharmacology": 15,
    "microbiology": 16,
    "anatomy": 17,
    "physiology": 18,
    "biochemistry": 19,
    "notes_pdf": 99,
}


def get_item_priority(item: Dict[str, Any]) -> tuple:
    """
    Queue priority tiers (all videos only):
    Tier 1: Marrow all final years subjects first (except medicine)
    Tier 2: PrepLadder all final years subjects (except what's already uploaded)
    Tier 3: Marrow remaining years subjects [never medicine]
    Tier 4: PrepLadder remaining year subjects
    Tier 5: Cerebellum remaining subjects
    """
    platform = item.get("platform", "")
    subj = item.get("subject_id", "")
    is_final_year = subj in FINAL_YEAR_SUBJECTS

    # NEVER medicine for Marrow
    if platform == "marrow" and subj == "medicine":
        return (999, 999, 999, 999)

    if platform == "marrow" and is_final_year:
        tier = 1
    elif platform in ("prepx_en", "prepx_hi") and is_final_year:
        tier = 2
    elif platform == "marrow" and not is_final_year:
        tier = 3
    elif platform in ("prepx_en", "prepx_hi") and not is_final_year:
        tier = 4
    elif platform == "cerebellum":
        tier = 5
    else:
        tier = 6

    # Sub-rank within tier:
    # 1. Platform preference: prepx_en ahead of prepx_hi
    if platform == "prepx_en":
        plat_rank = 1
    elif platform == "prepx_hi":
        plat_rank = 2
    else:
        plat_rank = 1

    # 2. Subject rank (surgery=1, obg=2, pediatrics=3, etc.)
    subj_rank = SUBJECT_CLINICAL_RANK.get(subj, 50)

    # 3. Message or lecture sequence
    seq = item.get("message_id", 0)
    title = item.get("preferred_title") or ""
    m = re.match(r"^(\d+)\.", title)
    if m:
        seq = int(m.group(1))

    return (tier, plat_rank, subj_rank, seq)


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

    def get_file_by_path(self, remote_path: str) -> Optional[Dict[str, Any]]:
        """Checks if a file already exists on SharePoint and returns its metadata."""
        token = self.get_valid_token()
        clean_path = "/" + remote_path.strip("/")
        endpoint = f"https://graph.microsoft.com/v1.0/{self.drive_target}/root:{clean_path}?$select=id,name,size,webUrl,video,lastModifiedDateTime"
        headers = {"Authorization": f"Bearer {token}"}
        try:
            res = requests.get(endpoint, headers=headers, timeout=10)
            if res.status_code == 200:
                return res.json()
        except Exception:
            pass
        return None

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
    def __init__(self, od_client: Optional[OneDriveClient], legacy_client: Optional[OneDriveClient],
                 dry_run: bool = False, videos_only: bool = True):
        self.od_client = od_client
        self.legacy_client = legacy_client
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
        Loads unuploaded lecture tasks strictly based on user priority tiers:
        1. Marrow all final years subjects first (except medicine)
        2. PrepLadder all final years subjects (except what's already uploaded)
        3. Marrow remaining years subjects [never medicine]
        4. PrepLadder remaining year subjects
        5. Cerebellum remaining subjects
        """
        raw_items: List[Dict[str, Any]] = []

        # Parse target subject(s) into normalized set (supports comma-separated: 'radiology,anesthesia,ophthalmology,ent')
        target_subjects = None
        if target_subject and target_subject.lower() != "all":
            target_subjects = set()
            for raw_part in re.split(r"[,|\s]+", target_subject.lower().strip()):
                s = raw_part.strip()
                if not s:
                    continue
                if s in ("obgyn", "obg"): target_subjects.add("obg")
                elif s in ("anesthesiology", "anesthesia", "anaesthesia"): target_subjects.add("anesthesia")
                elif s in ("fmt", "forensic_medicine"): target_subjects.add("forensic_medicine")
                elif s in ("optha", "eye", "ophthalmology"): target_subjects.add("ophthalmology")
                elif s in ("ear", "ent", "otorhinolaryngology"): target_subjects.add("ent")
                elif s in ("radio", "radiology"): target_subjects.add("radiology")
                elif s in ("final_year", "final", "all_final"):
                    target_subjects.update(["radiology", "anesthesia", "ophthalmology", "ent", "surgery", "obg", "pediatrics", "orthopedics", "dermatology", "psychiatry"])
                else: target_subjects.add(s)

        # 1. Load PrepLadder & Cerebellum sections
        prepx_hi_med_titles = {}
        if PREPX_HI_MEDICINE_TITLES_PATH.exists():
            try:
                with open(PREPX_HI_MEDICINE_TITLES_PATH, "r", encoding="utf-8") as f:
                    prepx_hi_med_titles = json.load(f)
            except Exception:
                pass

        if SECTIONS_PATH.exists():
            with open(SECTIONS_PATH, "r", encoding="utf-8") as f:
                sections = json.load(f)

            for sec in sections:
                sec_platform = sec["platform"]
                raw_title = sec["title"]
                norm_subj = normalize_subject_title(raw_title)

                # Skip non-video notes if videos_only is active
                if self.videos_only and norm_subj == "notes_pdf":
                    continue

                # Filter by platform
                if platform and platform.lower() not in (sec_platform.lower(), "all"):
                    continue

                # Filter by subject
                if target_subjects and norm_subj.lower() not in target_subjects:
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

                    pref_title = None
                    if sec_platform == "prepx_hi" and norm_subj == "medicine":
                        pref_title = prepx_hi_med_titles.get(str(mid)) or prepx_hi_med_titles.get(mid)

                    raw_items.append({
                        "id": item_id,
                        "chat_id": PREPX_CHANNEL_ID,
                        "message_id": mid,
                        "platform": sec_platform,
                        "platform_folder": platform_folder,
                        "dest_platform_folder": NEW_TENANT_PLATFORM_FOLDER_MAP.get(sec_platform, sec_platform),
                        "dest_subject_folder": openmedq_subject_folder(norm_subj, folder_display),
                        "subject_id": norm_subj,
                        "subject_name": raw_title,
                        "subject_folder": folder_display,
                        "preferred_title": pref_title,
                    })

        # 2. Load Marrow sections
        if MARROW_SECTIONS_PATH.exists() and (not platform or platform.lower() in ("marrow", "all")):
            try:
                with open(MARROW_SECTIONS_PATH, "r", encoding="utf-8") as f:
                    marrow_sections = json.load(f)

                for sec in marrow_sections:
                    sec_subj = sec["subject_id"]

                    # Explicit rule: NEVER medicine for Marrow
                    if sec_subj == "medicine":
                        continue

                    if target_subjects and sec_subj.lower() not in target_subjects:
                        continue

                    platform_folder = PLATFORM_FOLDER_MAP.get("marrow", "04_Marrow_Edition_6")
                    subj_folder = SUBJECT_FOLDER_MAP.get(sec_subj, sec_subj)

                    for vid in sec.get("videos", []):
                        mid = vid["message_id"]
                        cid = vid.get("chat_id", MARROW_CHANNEL_ID)
                        item_id = f"mr_{cid}_{mid}"
                        if item_id in self.manifest and self.manifest[item_id].get("status") == "completed":
                            continue

                        raw_items.append({
                            "id": item_id,
                            "chat_id": cid,
                            "message_id": mid,
                            "platform": "marrow",
                            "platform_folder": platform_folder,
                            "dest_platform_folder": NEW_TENANT_PLATFORM_FOLDER_MAP["marrow"],
                            "dest_subject_folder": openmedq_subject_folder(sec_subj, subj_folder),
                            "subject_id": sec_subj,
                            "subject_name": f"Marrow {sec['title']}",
                            "subject_folder": subj_folder,
                            "preferred_title": vid.get("title"),
                        })
            except Exception as e:
                print(f"[Warning] Failed to load marrow sections: {e}")

        # Fallback to legacy catalog only if no items found
        if not raw_items and not SECTIONS_PATH.exists():
            return self._load_queue_legacy(target_subject)

        # 3. Sort all candidate items strictly by the 4-tier user priority
        raw_items.sort(key=get_item_priority)

        # Filter out any discarded items (e.g. tier 999)
        valid_items = [it for it in raw_items if get_item_priority(it)[0] < 900]
        return valid_items

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
                        "dest_platform_folder": NEW_TENANT_PLATFORM_FOLDER_MAP["legacy"],
                        "dest_subject_folder": openmedq_subject_folder(sub_id, sub["name"]),
                        "subject_id": sub_id,
                        "subject_name": sub["name"],
                        "subject_folder": sub["name"],
                        "filename": topic.get("filename") or f"{topic['title']}.mp4",
                    })
        return queue

    def _record_existing(self, item: Dict[str, Any], meta: Dict[str, Any], clean_name: str,
                         clean_title: str, is_pdf: bool, remote_path: str, folder_path: str,
                         telegram_size: int, on_openmedq: bool):
        """Record a lecture that is already on a SharePoint tenant so the queue stops revisiting it.

        Rows for legacy-only copies keep the 5ncjwt item id, which is what the cloud-to-cloud
        workflows read as their transfer source; the site streams them from legacy until then.
        """
        video = meta.get("video") or {}
        duration_sec = round(video["duration"] / 1000) if video.get("duration") else None
        duration_fmt = None
        if duration_sec:
            m = duration_sec // 60
            s = duration_sec % 60
            duration_fmt = f"{m // 60}h {m % 60}m" if m > 60 else f"{m}m {s}s" if s > 0 else f"{m}m"

        row = {
            "title": clean_title,
            "filename": clean_name,
            "platform": item["platform"],
            "subject_id": item["subject_id"],
            "folder_path": folder_path,
            "telegram_chat_id": item["chat_id"],
            "telegram_message_id": item["message_id"],
            "onedrive_item_id": meta.get("id"),
            "onedrive_path": f"/{remote_path}",
            "web_url": meta.get("webUrl"),
            "size_bytes": meta.get("size") or telegram_size,
            "duration_seconds": duration_sec,
            "duration_formatted": duration_fmt,
            "resolution": f"{video['width']}x{video['height']}" if video.get("width") else None,
            "thumbnail_url": f"/api/thumbnail/{item['chat_id']}/{item['message_id']}" if not is_pdf else None,
            "uploaded_at": meta.get("lastModifiedDateTime") or time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "completed",
        }
        if on_openmedq:
            row["openmedq_migrated"] = True
        self.manifest[item["id"]] = row
        self._save_manifest()

    async def transfer_item(self, item: Dict[str, Any]):
        """Transfers a single lecture from Telegram into the openmedQ SharePoint tenant."""
        item_id = item["id"]
        chat_id = item["chat_id"]
        message_id = item["message_id"]
        # The legacy pair is where a copy may already sit on 5ncjwt; the dest pair is where it lands.
        platform_folder = item.get("platform_folder", "01_PrepLadder_X_English")
        subj_folder = item.get("subject_folder", "01_Anatomy")
        dest_program = item.get("dest_platform_folder", platform_folder)
        dest_subject = item.get("dest_subject_folder", subj_folder)

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
        caption = (msg.text or msg.message or "").strip()
        first_line_caption = caption.split("\n")[0].strip() if caption else ""

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

        # If raw_fn is missing or a raw backend numeric CDN ID (e.g. '48598.mp4'):
        is_numeric_fn = bool(raw_fn and re.match(r'^\d+\.(mp4|mkv|webm|pdf)$', str(raw_fn).lower()))
        if is_numeric_fn or not raw_fn:
            if first_line_caption:
                raw_fn = first_line_caption
            elif not raw_fn:
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

        # Safeguard: Skip dummy 8-second 1.79MB placeholder clips in Telegram channels
        if not is_pdf and total_size < 3 * 1024 * 1024:
            print(f"  [Notice] Skipping dummy placeholder clip {clean_name} ({round(total_size / (1024*1024), 2)} MB).")
            self.manifest[item_id] = {
                "status": "completed",
                "type": "dummy_placeholder_skipped",
                "filename": clean_name,
                "skipped": True,
            }
            self._save_manifest()
            return

        # Ensure strict sequential title formatting: e.g. '1. How to Read Surgery'
        clean_title = normalize_lecture_title(raw_fn, item.get("subject_name", ""), item.get("subject_id", ""))
        clean_name = f"{clean_title}.pdf" if is_pdf else f"{clean_title}.mp4"
        remote_path = f"Aspirin_LMS/{dest_program}/{dest_subject}/{clean_name}"
        legacy_path = f"Aspirin_LMS/{platform_folder}/{subj_folder}/{clean_name}"
        min_expected_size = 100 * 1024 if is_pdf else 1024 * 1024

        # Fast check 1: already on openmedQ (e.g. a previous run died before its manifest merged).
        if self.od_client:
            existing_meta = self.od_client.get_file_by_path(remote_path)
            if existing_meta and existing_meta.get("size", 0) > min_expected_size:
                size_mb = round(existing_meta.get("size", 0) / (1024 * 1024), 2)
                print(f"  [Found on openmedQ] {clean_name} already exists ({size_mb} MB). Skipping download.")
                if not self.dry_run:
                    self._record_existing(item, existing_meta, clean_name, clean_title, is_pdf,
                                          remote_path, f"{dest_program}/{dest_subject}", total_size,
                                          on_openmedq=True)
                return

        # Fast check 2: a copy is already on the legacy tenant. Streaming 5ncjwt -> openmedQ costs
        # nothing, while pulling the same bytes out of Telegram again risks a FloodWait ban, so
        # record the legacy item and let the cloud-to-cloud workflow move it.
        if self.legacy_client:
            legacy_meta = self.legacy_client.get_file_by_path(legacy_path)
            if legacy_meta and legacy_meta.get("size", 0) > min_expected_size:
                size_mb = round(legacy_meta.get("size", 0) / (1024 * 1024), 2)
                print(f"  [Found on legacy 5ncjwt] {clean_name} ({size_mb} MB). Registering for "
                      f"cloud-to-cloud migration instead of re-downloading from Telegram.")
                if not self.dry_run:
                    self._record_existing(item, legacy_meta, clean_name, clean_title, is_pdf,
                                          legacy_path, f"{platform_folder}/{subj_folder}", total_size,
                                          on_openmedq=False)
                return

        print(f"\n[{'PDF' if is_pdf else 'VIDEO'}] Telegram -> openmedQ: {dest_program} / {dest_subject} -> {clean_name}")
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

            # Step B: Create upload session on the openmedQ SharePoint drive
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
            "folder_path": f"{dest_program}/{dest_subject}",
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
            "openmedq_migrated": True,
        }
        self._save_manifest()

        # Step F: 2-second safe breathing space between items
        await asyncio.sleep(2)


def build_tenant_client(env_prefix: str, token_files: tuple, client_id: str, tenant_id: str) -> Optional[OneDriveClient]:
    """Build a client for one SharePoint tenant.

    '<PREFIX>_CLIENT_ID / _TENANT_ID / _REFRESH_TOKEN' win (CI), otherwise the first local token
    file that exists is used. Returns None when this machine has no credentials for that tenant.

    No client secret is ever sent: both Entra apps are public clients, and pairing one tenant's
    secret with another's client id fails with AADSTS7000215. Prefixes are NEW_/OLD_ rather than
    plain 'ONEDRIVE_' because the CI secrets and the local .env disagree on what that means.
    """
    refresh_token = os.environ.get(f"{env_prefix}_REFRESH_TOKEN")
    if not refresh_token:
        for name in token_files:
            path = PROJECT_DIR / name
            if not path.exists():
                continue
            try:
                refresh_token = json.loads(path.read_text(encoding="utf-8")).get("refresh_token")
            except Exception:
                refresh_token = None
            if refresh_token:
                break
    if not refresh_token:
        return None
    return OneDriveClient(
        client_id=os.environ.get(f"{env_prefix}_CLIENT_ID") or client_id,
        client_secret=None,
        refresh_token=refresh_token,
        tenant_id=os.environ.get(f"{env_prefix}_TENANT_ID") or tenant_id,
        drive_target=os.environ.get(f"{env_prefix}_DRIVE_TARGET", "sites/root/drive"),
    )


async def run_pipeline(platform: Optional[str] = None, subject: Optional[str] = None, limit: int = 20, dry_run: bool = False, videos_only: bool = True):
    # Both clients are built even for a dry run: the existence checks below are read-only.
    od_client = build_tenant_client("NEW_ONEDRIVE", ("onedrive_token_new.json",), NEW_TENANT_CLIENT_ID, NEW_TENANT_ID)
    if od_client is None:
        raise ValueError(
            "No openmedQ credentials (NEW_ONEDRIVE_REFRESH_TOKEN or onedrive_token_new.json). "
            "Not falling back to the legacy tenant - it is the source of this migration."
        )
    try:
        od_client.get_valid_token()
    except PermissionError as e:
        raise ValueError(f"openmedQ token rejected: {e}")

    legacy_client = build_tenant_client(
        "OLD_ONEDRIVE", ("onedrive_token_old.json", "onedrive_token.json"), OLD_TENANT_CLIENT_ID, OLD_TENANT_ID
    )
    if legacy_client is None:
        print("[Warning] No 5ncjwt credentials: lectures already on the legacy tenant will be re-downloaded from Telegram.")
    else:
        try:
            legacy_client.get_valid_token()
        except PermissionError as e:
            print(f"[Warning] 5ncjwt token rejected ({e}); treating it as empty.")
            legacy_client = None

    engine = LectureTransferEngine(od_client, legacy_client, dry_run=dry_run, videos_only=videos_only)
    await engine.init_telegram()

    queue = engine.load_queue(platform=platform, target_subject=subject)
    print("=" * 65)
    print(f" Yui Pipeline: Telegram -> openmedQ SharePoint (Fast & Ban-Proof)")
    print(f" Platform Edition:       {platform or 'ALL'}")
    print(f" Target Subject:         {subject or 'ALL'}")
    print(f" Videos Only Filter:     {videos_only}")
    print(f" Total Pending in Queue: {len(queue)}")
    items_to_process = queue[:limit] if (limit and limit > 0) else queue
    print(f" Items to Process:       {len(items_to_process)}")
    if queue:
        first = queue[0]
        print(f" Priority #1 in Queue:   [{first['platform']}] {first['subject_name']} (Msg {first['message_id']})")
    print("=" * 65)

    processed = 0
    t_start = time.time()
    # Safety limit: Gracefully exit 45 mins before GitHub's 6-hour hard runner timeout
    MAX_RUN_SECONDS = 5.25 * 3600  # 5 hours 15 minutes

    for item in items_to_process:
        elapsed = time.time() - t_start
        if elapsed > MAX_RUN_SECONDS:
            hrs = round(elapsed / 3600, 2)
            print(f"\n[Time Guard] Runner has executed for {hrs} hours. Gracefully stopping batch to allow clean catalog sync and git push.")
            break
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
    parser.add_argument("--limit", type=int, default=150, help="Max items to upload in this run (default: 150, 0 = all remaining)")
    parser.add_argument("--dry-run", action="store_true", help="List files without actually uploading")
    parser.add_argument("--videos-only", action="store_true", default=True, help="Only upload video files (default: True)")

    args = parser.parse_args()
    asyncio.run(run_pipeline(platform=args.platform, subject=args.subject, limit=args.limit, dry_run=args.dry_run, videos_only=args.videos_only))


if __name__ == "__main__":
    main()
