"""
Yui - Cloud-to-Cloud Migration Engine: PrepLadder X Medicine (English)
Streams 141 curated English Medicine lectures directly from Old Developer SharePoint
to New Commercial SharePoint (openmedq.sharepoint.com) into clean folder:
/Aspirin_LMS/PrepLadder_X/Medicine/

Safety & Anti-Flagging Features:
- 0 bytes persistent local disk usage (direct cloud-to-cloud byte streaming).
- 20 MiB chunk size (Microsoft Azure recommended standard).
- Sequential single-stream processing to avoid concurrency flagging.
- 2.5s gentle cooldown between files.
- Resilient retry on HTTP 429 (respects Retry-After header + 5s buffer) and HTTP 503.
- Incremental state saving to engine/transfer_manifest.json and public/transfer_manifest.json.
- Fully idempotent: resumes seamlessly if stopped at any point.
"""

import argparse
import json
import os
from pathlib import Path
import sys
import time
from typing import Any, Dict, List, Optional
import requests

# Ensure UTF-8 console output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_DIR = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJECT_DIR / "engine" / "transfer_manifest.json"
PUBLIC_MANIFEST_PATH = PROJECT_DIR / "public" / "transfer_manifest.json"

OLD_TOKEN_FILE = PROJECT_DIR / "onedrive_token_old.json"
NEW_TOKEN_FILE = PROJECT_DIR / "onedrive_token_new.json"
FALLBACK_TOKEN_FILE = PROJECT_DIR / "onedrive_token.json"

OLD_CLIENT_ID = "ba92c830-fac7-4d60-a0ff-8bf0b581a4c4"
OLD_TENANT_ID = "938a1924-0af0-4599-819b-177a1dcf8fd6"

NEW_CLIENT_ID = "054e8da3-e1e0-4274-b8a9-2bb6f71ef8f8"
NEW_TENANT_ID = "9903c5d7-b085-4596-9ee6-98f39ddba128"

CHUNK_SIZE = 20 * 1024 * 1024  # 20 MiB per chunk
TARGET_FOLDER = "Aspirin_LMS/PrepLadder_X/Medicine"


class TokenManager:
    def __init__(self, token_file: Path, client_id: str, tenant_id: str, env_prefix: str = ""):
        self.token_file = token_file
        self.env_prefix = env_prefix
        
        # Prefer environment variable if set (GitHub Actions CI)
        self.client_id = os.environ.get(f"{env_prefix}_CLIENT_ID") or client_id
        self.tenant_id = os.environ.get(f"{env_prefix}_TENANT_ID") or tenant_id
        self.env_refresh_token = os.environ.get(f"{env_prefix}_REFRESH_TOKEN")

        self.token_data = self._load()

    def _load(self) -> Dict[str, Any]:
        if self.env_refresh_token:
            return {
                "refresh_token": self.env_refresh_token,
                "access_token": "",
                "expires_at": 0,
            }
        if self.token_file.exists():
            with open(self.token_file, "r", encoding="utf-8") as f:
                return json.load(f)
        if FALLBACK_TOKEN_FILE.exists() and "new" in str(self.token_file):
            with open(FALLBACK_TOKEN_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        raise FileNotFoundError(f"Missing token file: {self.token_file} and no {self.env_prefix}_REFRESH_TOKEN env var")

    def _save(self):
        try:
            if self.token_file.parent.exists():
                with open(self.token_file, "w", encoding="utf-8") as f:
                    json.dump(self.token_data, f, indent=2)
        except Exception:
            pass

    def get_token(self) -> str:
        exp = self.token_data.get("expires_at", 0)
        if time.time() < exp - 300 and self.token_data.get("access_token"):
            return self.token_data["access_token"]

        endpoint = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        body = {
            "client_id": self.client_id,
            "grant_type": "refresh_token",
            "refresh_token": self.token_data["refresh_token"],
            "scope": "https://graph.microsoft.com/.default offline_access",
        }

        res = requests.post(endpoint, data=body, timeout=30)
        if res.status_code != 200:
            raise PermissionError(f"Token refresh failed for {self.client_id}: {res.status_code} - {res.text}")

        data = res.json()
        self.token_data["access_token"] = data["access_token"]
        if "refresh_token" in data:
            self.token_data["refresh_token"] = data["refresh_token"]
        self.token_data["expires_at"] = time.time() + data.get("expires_in", 3600)
        self._save()
        return self.token_data["access_token"]


def get_download_url(headers: Dict[str, str], drive_target: str, item_id: str) -> Optional[str]:
    url = f"https://graph.microsoft.com/v1.0/{drive_target}/items/{item_id}?$select=@microsoft.graph.downloadUrl"
    for attempt in range(3):
        res = requests.get(url, headers=headers, timeout=15)
        if res.status_code == 200:
            return res.json().get("@microsoft.graph.downloadUrl")
        elif res.status_code == 429:
            sleep_s = int(res.headers.get("Retry-After", 10)) + 5
            print(f"    [RateLimit 429] Sleeping {sleep_s}s...")
            time.sleep(sleep_s)
        else:
            time.sleep(2)
    return None


def get_item_by_path(headers: Dict[str, str], drive_target: str, remote_path: str) -> Optional[Dict[str, Any]]:
    clean = "/" + remote_path.strip("/")
    url = f"https://graph.microsoft.com/v1.0/{drive_target}/root:{clean}?$select=id,name,size,webUrl"
    res = requests.get(url, headers=headers, timeout=15)
    if res.status_code == 200:
        return res.json()
    return None


def create_dest_upload_session(headers: Dict[str, str], drive_target: str, remote_path: str) -> str:
    clean = "/" + remote_path.strip("/")
    endpoint = f"https://graph.microsoft.com/v1.0/{drive_target}/root:{clean}:/createUploadSession"
    body = {"item": {"@microsoft.graph.conflictBehavior": "replace"}}

    for attempt in range(5):
        res = requests.post(endpoint, headers=headers, json=body, timeout=30)
        if res.status_code in (200, 201):
            return res.json()["uploadUrl"]
        elif res.status_code == 429:
            sleep_s = int(res.headers.get("Retry-After", 10)) + 5
            print(f"    [RateLimit 429 on upload session] Backing off {sleep_s}s...")
            time.sleep(sleep_s)
        else:
            time.sleep(3)
    raise RuntimeError(f"Failed to create upload session for {remote_path}: {res.status_code} - {res.text}")


def stream_cloud_to_cloud(download_url: str, upload_url: str, total_size: int, chunk_size: int = CHUNK_SIZE) -> Optional[Dict[str, Any]]:
    start_byte = 0
    t0 = time.time()
    result_meta = None

    while start_byte < total_size:
        end_byte = min(start_byte + chunk_size - 1, total_size - 1)
        length = end_byte - start_byte + 1

        # 1. Fetch chunk from Old SharePoint
        src_headers = {"Range": f"bytes={start_byte}-{end_byte}"}
        chunk_res = requests.get(download_url, headers=src_headers, timeout=60, stream=True)
        if chunk_res.status_code not in (200, 206):
            raise RuntimeError(f"Error fetching chunk from source: {chunk_res.status_code}")

        chunk_data = chunk_res.content

        # 2. Upload chunk to OpenmedQ SharePoint
        dst_headers = {
            "Content-Length": str(length),
            "Content-Range": f"bytes {start_byte}-{end_byte}/{total_size}",
        }

        retries = 5
        for attempt in range(retries):
            put_res = requests.put(upload_url, headers=dst_headers, data=chunk_data, timeout=90)
            if put_res.status_code == 202:
                break
            elif put_res.status_code in (200, 201):
                result_meta = put_res.json()
                break
            elif put_res.status_code == 429:
                sleep_s = int(put_res.headers.get("Retry-After", 10)) + 5
                print(f"\n    [RateLimit 429 on PUT chunk] Azure backoff {sleep_s}s...")
                time.sleep(sleep_s)
            elif put_res.status_code in (500, 502, 503, 504):
                time.sleep(5)
            else:
                if attempt == retries - 1:
                    raise RuntimeError(f"Upload chunk failed: {put_res.status_code} - {put_res.text}")
                time.sleep(3)

        start_byte += length
        pct = round((start_byte / total_size) * 100, 1)
        speed = (start_byte / (1024 * 1024)) / max(time.time() - t0, 0.1)
        sys.stdout.write(f"\r  [Azure Stream] {pct}% ({round(start_byte/(1024*1024), 1)}/{round(total_size/(1024*1024), 1)} MB) @ {speed:.2f} MB/s")
        sys.stdout.flush()

    sys.stdout.write("\n")
    sys.stdout.flush()
    return result_meta


def run_medicine_migration(limit: Optional[int] = None, dry_run: bool = False, cooldown_seconds: float = 2.5):
    print("=" * 70)
    print(" PrepLadder X Medicine (English) Cloud Migration Engine")
    print(f" Target Folder: /{TARGET_FOLDER}")
    print(f" Safeguards: 20 MiB chunking, {cooldown_seconds}s cooldown, 429 backoff")
    print("=" * 70)

    if not MANIFEST_PATH.exists():
        print(f"Manifest not found: {MANIFEST_PATH}")
        return

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # 1. Filter only PrepLadder X Medicine English videos
    med_items = []
    hinglish_keys = []

    for k, v in manifest.items():
        if isinstance(v, dict) and v.get("subject_id") == "medicine":
            if v.get("platform") == "prepx_en" and v.get("onedrive_item_id"):
                med_items.append((k, v))
            elif v.get("platform") == "prepx_hi":
                hinglish_keys.append(k)

    print(f"\nDiscovered {len(med_items)} English Medicine videos.")
    print(f"Discovered {len(hinglish_keys)} Hinglish Medicine videos (will mark as skipped).")

    total_bytes = sum(v.get("size_bytes", 0) for _, v in med_items)
    print(f"Total English Payload: {total_bytes / (1024**3):.2f} GiB ({total_bytes / 1e9:.2f} GB)\n")

    # Mark Hinglish as skipped in manifest
    updated_hinglish = 0
    for hk in hinglish_keys:
        if not manifest[hk].get("skipped"):
            manifest[hk]["skipped"] = True
            manifest[hk]["reason"] = "English lecture prioritized (no duplicate hinglish needed)"
            updated_hinglish += 1

    if updated_hinglish > 0:
        print(f"Flagged {updated_hinglish} Hinglish entries as skipped in manifest.")
        with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
        with open(PUBLIC_MANIFEST_PATH, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

    old_mgr = TokenManager(OLD_TOKEN_FILE, OLD_CLIENT_ID, OLD_TENANT_ID, env_prefix="OLD_ONEDRIVE")
    new_mgr = TokenManager(NEW_TOKEN_FILE, NEW_CLIENT_ID, NEW_TENANT_ID, env_prefix="NEW_ONEDRIVE")

    migrated_count = 0
    skipped_count = 0
    total_migrated_bytes = 0

    for i, (key, item) in enumerate(med_items, start=1):
        if limit and migrated_count >= limit:
            print(f"\nLimit of {limit} files reached.")
            break

        filename = item["filename"]
        size_bytes = item.get("size_bytes", 0)
        size_mb = round(size_bytes / (1024 * 1024), 1)
        old_item_id = item["onedrive_item_id"]

        clean_dest_path = f"{TARGET_FOLDER}/{filename}"
        clean_folder_path = "PrepLadder_X/Medicine"

        print(f"\n[{i}/{len(med_items)}] {filename} ({size_mb} MB)")
        print(f"  Target: /{clean_dest_path}")

        if dry_run:
            print("  (DRY RUN: Stream would execute here)")
            continue

        # Check destination if already uploaded
        new_headers = {"Authorization": f"Bearer {new_mgr.get_token()}", "Content-Type": "application/json"}
        dest_meta = get_item_by_path(new_headers, "sites/root/drive", clean_dest_path)

        if dest_meta and dest_meta.get("size") == size_bytes:
            print("  -> Already exists on OpenmedQ with matching size. Updating manifest.")
            skipped_count += 1
            item["onedrive_item_id"] = dest_meta["id"]
            item["web_url"] = dest_meta.get("webUrl")
            item["onedrive_path"] = f"/{clean_dest_path}"
            item["folder_path"] = clean_folder_path
            manifest[key] = item
            with open(MANIFEST_PATH, "w", encoding="utf-8") as mf:
                json.dump(manifest, mf, indent=2)
            continue

        # Get fresh tokens
        old_headers = {"Authorization": f"Bearer {old_mgr.get_token()}"}
        new_headers = {"Authorization": f"Bearer {new_mgr.get_token()}", "Content-Type": "application/json"}

        # 1. Source download URL
        dl_url = get_download_url(old_headers, "sites/root/drive", old_item_id)
        if not dl_url:
            print(f"  [ERROR] Could not fetch download URL for {filename} ({old_item_id}). Skipping.")
            continue

        # 2. Destination upload session
        up_url = create_dest_upload_session(new_headers, "sites/root/drive", clean_dest_path)

        # 3. Stream direct Azure-to-Azure
        new_meta = stream_cloud_to_cloud(dl_url, up_url, size_bytes)

        if new_meta and "id" in new_meta:
            migrated_count += 1
            total_migrated_bytes += size_bytes
            print(f"  [SUCCESS] Migrated! New Item ID: {new_meta['id']}")

            # Update manifest state immediately
            item["onedrive_item_id"] = new_meta["id"]
            item["web_url"] = new_meta.get("webUrl")
            item["onedrive_path"] = f"/{clean_dest_path}"
            item["folder_path"] = clean_folder_path
            item["migrated_to_openmedq_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            manifest[key] = item

            with open(MANIFEST_PATH, "w", encoding="utf-8") as mf:
                json.dump(manifest, mf, indent=2)
            with open(PUBLIC_MANIFEST_PATH, "w", encoding="utf-8") as mf:
                json.dump(manifest, mf, indent=2)

            # Polite cooldown to prevent any throttling triggers
            time.sleep(cooldown_seconds)
        else:
            print(f"  [WARN] Upload did not return full metadata. Retrying on next run.")

    print("\n" + "=" * 70)
    print(f" Migration Session Finished!")
    print(f" Migrated: {migrated_count} | Already Existing: {skipped_count} | Scanned: {len(med_items)}")
    print(f" Transferred Data: {total_migrated_bytes / (1024**3):.2f} GiB")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate PrepLadder X Medicine (English) to OpenmedQ")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of files to migrate in this run")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without modifying files")
    parser.add_argument("--cooldown", type=float, default=2.5, help="Cooldown in seconds between files (default: 2.5s)")
    args = parser.parse_args()

    run_medicine_migration(limit=args.limit, dry_run=args.dry_run, cooldown_seconds=args.cooldown)
