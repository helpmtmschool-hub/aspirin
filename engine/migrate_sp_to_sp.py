"""
Yui - Cloud-to-Cloud SharePoint Migration Engine
Transfers existing lecture videos and notes from the Old Developer SharePoint (5ncjwt.sharepoint.com)
directly into the New Commercial SharePoint (openmedq.sharepoint.com) with 0 persistent disk usage.
"""

import argparse
import json
import os
from pathlib import Path
import sys
import time
from typing import Any, Dict, List, Optional
import requests

PROJECT_DIR = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJECT_DIR / "engine" / "transfer_manifest.json"
OLD_TOKEN_FILE = PROJECT_DIR / "onedrive_token_old.json"
NEW_TOKEN_FILE = PROJECT_DIR / "onedrive_token_new.json"

OLD_CLIENT_ID = "ba92c830-fac7-4d60-a0ff-8bf0b581a4c4"
OLD_TENANT_ID = "938a1924-0af0-4599-819b-177a1dcf8fd6"

NEW_CLIENT_ID = "054e8da3-e1e0-4274-b8a9-2bb6f71ef8f8"
NEW_TENANT_ID = "9903c5d7-b085-4596-9ee6-98f39ddba128"
NEW_CLIENT_SECRET = os.environ.get("NEW_CLIENT_SECRET", "")

CHUNK_SIZE = 20 * 1024 * 1024  # 20 MiB chunks


class TokenManager:
    def __init__(self, token_file: Path, client_id: str, tenant_id: str, client_secret: Optional[str] = None):
        self.token_file = token_file
        self.client_id = client_id
        self.tenant_id = tenant_id
        self.client_secret = client_secret
        self.token_data = self._load()

    def _load(self) -> Dict[str, Any]:
        if self.token_file.exists():
            with open(self.token_file, "r", encoding="utf-8") as f:
                return json.load(f)
        raise FileNotFoundError(f"Missing token file: {self.token_file}")

    def _save(self):
        with open(self.token_file, "w", encoding="utf-8") as f:
            json.dump(self.token_data, f, indent=2)

    def get_token(self) -> str:
        # Check if valid (with 5 min safety buffer)
        exp = self.token_data.get("expires_at", 0)
        if time.time() < exp - 300 and "access_token" in self.token_data:
            return self.token_data["access_token"]

        endpoint = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        body = {
            "client_id": self.client_id,
            "grant_type": "refresh_token",
            "refresh_token": self.token_data["refresh_token"],
            "scope": "https://graph.microsoft.com/.default offline_access",
        }
        # Only send client_secret if configured and not public
        if self.client_secret and self.client_secret != "none":
            # Test without secret first if public client
            pass

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


def list_drive_children(headers: Dict[str, str], drive_target: str, item_path: str = "") -> List[Dict[str, Any]]:
    """Recursively lists all files in SharePoint drive."""
    if item_path:
        clean = "/" + item_path.strip("/")
        url = f"https://graph.microsoft.com/v1.0/{drive_target}/root:{clean}:/children"
    else:
        url = f"https://graph.microsoft.com/v1.0/{drive_target}/root/children"

    results = []
    while url:
        res = requests.get(url, headers=headers, timeout=20)
        if res.status_code != 200:
            break
        data = res.json()
        results.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
    return results


def get_download_url(headers: Dict[str, str], drive_target: str, item_id: str) -> Optional[str]:
    url = f"https://graph.microsoft.com/v1.0/{drive_target}/items/{item_id}?$select=@microsoft.graph.downloadUrl"
    res = requests.get(url, headers=headers, timeout=15)
    if res.status_code == 200:
        return res.json().get("@microsoft.graph.downloadUrl")
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
    res = requests.post(endpoint, headers=headers, json=body, timeout=30)
    if res.status_code in (200, 201):
        return res.json()["uploadUrl"]
    raise RuntimeError(f"Failed to create upload session for {remote_path}: {res.status_code} - {res.text}")


def stream_cloud_to_cloud(download_url: str, upload_url: str, total_size: int, chunk_size: int = CHUNK_SIZE) -> Optional[Dict[str, Any]]:
    """Streams data chunk-by-chunk directly from source download URL to destination upload URL."""
    start_byte = 0
    t0 = time.time()
    result_meta = None

    while start_byte < total_size:
        end_byte = min(start_byte + chunk_size - 1, total_size - 1)
        length = end_byte - start_byte + 1

        # 1. Fetch chunk from source
        src_headers = {"Range": f"bytes={start_byte}-{end_byte}"}
        chunk_res = requests.get(download_url, headers=src_headers, timeout=60, stream=True)
        if chunk_res.status_code not in (200, 206):
            raise RuntimeError(f"Error fetching chunk from source: {chunk_res.status_code}")

        chunk_data = chunk_res.content

        # 2. Upload chunk to destination
        dst_headers = {
            "Content-Length": str(length),
            "Content-Range": f"bytes {start_byte}-{end_byte}/{total_size}",
        }

        retries = 3
        for attempt in range(retries):
            put_res = requests.put(upload_url, headers=dst_headers, data=chunk_data, timeout=90)
            if put_res.status_code == 202:
                break
            elif put_res.status_code in (200, 201):
                result_meta = put_res.json()
                break
            elif put_res.status_code == 429:
                sleep_s = int(put_res.headers.get("Retry-After", 10))
                time.sleep(sleep_s)
            else:
                if attempt == retries - 1:
                    raise RuntimeError(f"Upload chunk failed: {put_res.status_code} - {put_res.text}")
                time.sleep(3)

        start_byte += length
        pct = round((start_byte / total_size) * 100, 1)
        speed = (start_byte / (1024 * 1024)) / max(time.time() - t0, 0.1)
        sys.stdout.write(f"\r  [Cloud Stream] {pct}% ({round(start_byte/(1024*1024), 1)}/{round(total_size/(1024*1024), 1)} MB) @ {speed:.2f} MB/s")
        sys.stdout.flush()

    sys.stdout.write("\n")
    sys.stdout.flush()
    return result_meta


def scan_remote_folder_recursive(headers: Dict[str, str], drive_target: str, current_path: str = "Aspirin_LMS") -> List[Dict[str, Any]]:
    """Recursively walks the old SharePoint Aspirin_LMS folder and gathers all files."""
    files = []
    items = list_drive_children(headers, drive_target, current_path)
    for it in items:
        name = it["name"]
        item_path = f"{current_path}/{name}"
        if it.get("folder") is not None:
            files.extend(scan_remote_folder_recursive(headers, drive_target, item_path))
        elif it.get("file") is not None:
            files.append({
                "id": it["id"],
                "name": name,
                "path": item_path,
                "size": it.get("size", 0),
            })
    return files


def run_migration(limit: Optional[int] = None, dry_run: bool = False):
    print("=" * 65)
    print(" Yui Cloud-to-Cloud Migration: Old SharePoint -> New OpenmedQ")
    print("=" * 65)

    old_mgr = TokenManager(OLD_TOKEN_FILE, OLD_CLIENT_ID, OLD_TENANT_ID)
    new_mgr = TokenManager(NEW_TOKEN_FILE, NEW_CLIENT_ID, NEW_TENANT_ID, NEW_CLIENT_SECRET)

    old_token = old_mgr.get_token()
    new_token = new_mgr.get_token()

    old_headers = {"Authorization": f"Bearer {old_token}"}
    new_headers = {"Authorization": f"Bearer {new_token}", "Content-Type": "application/json"}

    print("Scanning source SharePoint drive (/Aspirin_LMS)...")
    source_files = scan_remote_folder_recursive(old_headers, "sites/root/drive", "Aspirin_LMS")
    total_gb = sum(f["size"] for f in source_files) / (1024**3)
    print(f"Found {len(source_files)} files totaling {total_gb:.2f} GB in Old SharePoint.\n")

    manifest = {}
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    # Reverse lookup map: remote_path -> manifest_key
    path_to_key = {}
    for k, v in manifest.items():
        if isinstance(v, dict) and v.get("onedrive_path"):
            norm = v["onedrive_path"].strip("/")
            path_to_key[norm] = k

    count = 0
    migrated = 0
    skipped = 0

    for f in source_files:
        if limit and count >= limit:
            print(f"\nLimit of {limit} files reached.")
            break

        count += 1
        rel_path = f["path"]
        size_mb = round(f["size"] / (1024 * 1024), 2)
        print(f"[{count}/{len(source_files)}] {rel_path} ({size_mb} MB)")

        if dry_run:
            print("  (DRY-RUN: Would stream cloud-to-cloud)")
            continue

        # Check if already present on destination
        dest_meta = get_item_by_path(new_headers, "sites/root/drive", rel_path)
        if dest_meta and dest_meta.get("size") == f["size"]:
            print("  -> Already exists on OpenmedQ SharePoint. Skipping.")
            skipped += 1
            # Update manifest with new item ID if needed
            if rel_path in path_to_key:
                manifest[path_to_key[rel_path]]["onedrive_item_id"] = dest_meta["id"]
                manifest[path_to_key[rel_path]]["web_url"] = dest_meta.get("webUrl")
            continue

        # Get fresh tokens if needed
        old_headers["Authorization"] = f"Bearer {old_mgr.get_token()}"
        new_headers["Authorization"] = f"Bearer {new_mgr.get_token()}"

        download_url = get_download_url(old_headers, "sites/root/drive", f["id"])
        if not download_url:
            print(f"  Error: Could not get download URL for {f['id']}. Skipping.")
            continue

        upload_url = create_dest_upload_session(new_headers, "sites/root/drive", rel_path)
        new_meta = stream_cloud_to_cloud(download_url, upload_url, f["size"])

        if new_meta:
            migrated += 1
            if rel_path in path_to_key:
                manifest[path_to_key[rel_path]]["onedrive_item_id"] = new_meta["id"]
                manifest[path_to_key[rel_path]]["web_url"] = new_meta.get("webUrl")
                with open(MANIFEST_PATH, "w", encoding="utf-8") as mf:
                    json.dump(manifest, mf, indent=2)

    print("\n" + "=" * 65)
    print(f" Migration Completed! Migrated: {migrated}, Skipped: {skipped}, Total Scanned: {count}")
    print("=" * 65)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate SharePoint to SharePoint")
    parser.add_argument("--limit", type=int, default=None, help="Max files to migrate in this run")
    parser.add_argument("--dry-run", action="store_true", help="List files without transferring")
    args = parser.parse_args()
    run_migration(limit=args.limit, dry_run=args.dry_run)
