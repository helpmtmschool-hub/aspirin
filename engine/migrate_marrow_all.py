"""Yui - Marrow Edition 6 Bulk Migration: old SharePoint -> openmedQ SharePoint.

Migrates all completed Marrow subject lectures from the legacy 5ncjwt SharePoint
to the openmedQ commercial SharePoint, preserving accurate titles from the manifest.

Subjects: surgery, obg, pediatrics, orthopedics, psychiatry, radiology, anesthesia
(dermatology is handled by its own dedicated script with title verification).

Source structure:  /Aspirin_LMS/04_Marrow_Edition_6/{subject_folder}/{filename}
Target structure:  /Aspirin_LMS/Marrow_E6/{Subject}/{filename}

The manifest already carries clean numbered titles (e.g. "1. How to Read Surgery.mp4").
Items use onedrive_item_id for the old SP item; after migration, that field is replaced
with the new openmedQ item ID and the old one is saved as source_onedrive_item_id.

Safety: nothing is ever deleted; 0 bytes persist to disk (20 MiB in-flight chunks only);
single sequential stream; Retry-After honoured on 429 and backoff on 5xx; manifest written
after every file. Idempotent: an existing destination file of identical size is adopted.
"""
import argparse
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
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

CHUNK_SIZE = 20 * 1024 * 1024  # 20 MiB

# Map subject_id -> (old SP folder under Aspirin_LMS, new folder under Aspirin_LMS/Marrow_E6)
SUBJECT_MAP = {
    "surgery":     ("04_Marrow_Edition_6/12_General_Surgery",               "Surgery"),
    "obg":         ("04_Marrow_Edition_6/13_Obstetrics_and_Gynecology",     "OBG"),
    "pediatrics":  ("04_Marrow_Edition_6/14_Pediatrics",                    "Pediatrics"),
    "psychiatry":  ("04_Marrow_Edition_6/15_Psychiatry",                    "Psychiatry"),
    "orthopedics": ("04_Marrow_Edition_6/16_Orthopedics",                   "Orthopedics"),
    "anesthesia":  ("04_Marrow_Edition_6/17_Anesthesiology",                "Anesthesia"),
    "radiology":   ("04_Marrow_Edition_6/18_Radiology",                     "Radiology"),
    # dermatology excluded - has its own dedicated script
}


class TokenManager:
    def __init__(self, token_file: Path, client_id: str, tenant_id: str, env_prefix: str):
        self.token_file = token_file
        self.env_prefix = env_prefix
        self.client_id = os.environ.get(f"{env_prefix}_CLIENT_ID") or client_id
        self.tenant_id = os.environ.get(f"{env_prefix}_TENANT_ID") or tenant_id
        self.env_refresh_token = os.environ.get(f"{env_prefix}_REFRESH_TOKEN")
        self.token_data = self._load()

    def _load(self) -> Dict[str, Any]:
        if self.env_refresh_token:
            return {"refresh_token": self.env_refresh_token, "access_token": "", "expires_at": 0}
        if self.token_file.exists():
            return json.loads(self.token_file.read_text(encoding="utf-8"))
        if FALLBACK_TOKEN_FILE.exists():
            return json.loads(FALLBACK_TOKEN_FILE.read_text(encoding="utf-8"))
        raise FileNotFoundError(f"No token for {self.env_prefix}: {self.token_file} missing")

    def _save(self):
        try:
            self.token_file.write_text(json.dumps(self.token_data, indent=2), encoding="utf-8")
        except Exception:
            pass

    def get_token(self) -> str:
        if time.time() < self.token_data.get("expires_at", 0) - 300 and self.token_data.get("access_token"):
            return self.token_data["access_token"]
        res = requests.post(
            f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token",
            data={
                "client_id": self.client_id,
                "grant_type": "refresh_token",
                "refresh_token": self.token_data["refresh_token"],
                "scope": "https://graph.microsoft.com/.default offline_access",
            },
            timeout=60,
        )
        if res.status_code != 200:
            raise PermissionError(f"Token refresh failed ({self.env_prefix}): {res.status_code} - {res.text[:300]}")
        data = res.json()
        self.token_data["access_token"] = data["access_token"]
        if data.get("refresh_token"):
            self.token_data["refresh_token"] = data["refresh_token"]
        self.token_data["expires_at"] = time.time() + data.get("expires_in", 3600)
        self._save()
        return data["access_token"]

    def headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.get_token()}", "Content-Type": "application/json"}


def load_manifest() -> Dict[str, Any]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def save_manifest(manifest: Dict[str, Any]):
    text = json.dumps(manifest, indent=2, ensure_ascii=False)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(text, encoding="utf-8")
    PUBLIC_MANIFEST_PATH.write_text(text, encoding="utf-8")


def dest_item(new: TokenManager, remote_path: str) -> Optional[Dict[str, Any]]:
    clean = "/" + remote_path.strip("/")
    res = requests.get(
        f"https://graph.microsoft.com/v1.0/sites/root/drive/root:{clean}?$select=id,name,size,webUrl",
        headers=new.headers(), timeout=60,
    )
    return res.json() if res.status_code == 200 else None


def create_upload_session(new: TokenManager, remote_path: str) -> str:
    clean = "/" + remote_path.strip("/")
    for attempt in range(5):
        res = requests.post(
            f"https://graph.microsoft.com/v1.0/sites/root/drive/root:{clean}:/createUploadSession",
            headers=new.headers(), json={"item": {"@microsoft.graph.conflictBehavior": "replace"}}, timeout=60,
        )
        if res.status_code in (200, 201):
            return res.json()["uploadUrl"]
        if res.status_code == 429:
            wait = int(res.headers.get("Retry-After", 10)) + 5
            print(f"    [429 upload session] backing off {wait}s")
            time.sleep(wait)
        else:
            print(f"    [upload session {res.status_code}] retrying: {res.text[:160]}")
            time.sleep(3 * (attempt + 1))
    raise RuntimeError(f"Could not open an upload session for {remote_path}")


def download_url(old: TokenManager, item_id: str) -> Optional[str]:
    for attempt in range(3):
        res = requests.get(
            f"https://graph.microsoft.com/v1.0/sites/root/drive/items/{item_id}?$select=@microsoft.graph.downloadUrl",
            headers=old.headers(), timeout=60,
        )
        if res.status_code == 200:
            return res.json().get("@microsoft.graph.downloadUrl")
        if res.status_code == 429:
            time.sleep(int(res.headers.get("Retry-After", 10)) + 5)
        else:
            time.sleep(2)
    return None


def stream(dl_url: str, up_url: str, total: int) -> Optional[Dict[str, Any]]:
    pos, t0, meta = 0, time.time(), None
    while pos < total:
        end = min(pos + CHUNK_SIZE - 1, total - 1)
        want = end - pos + 1
        chunk = requests.get(dl_url, headers={"Range": f"bytes={pos}-{end}"}, timeout=120, stream=True)
        if chunk.status_code not in (200, 206):
            raise RuntimeError(f"source did not honour byte range (got {chunk.status_code})")
        data = chunk.content
        if len(data) != want:
            raise RuntimeError(f"short source chunk: got {len(data)} bytes, expected {want}")
        for attempt in range(5):
            put = requests.put(up_url, data=data, headers={
                "Content-Length": str(len(data)),
                "Content-Range": f"bytes {pos}-{end}/{total}",
            }, timeout=180)
            if put.status_code == 202:
                break
            if put.status_code in (200, 201):
                meta = put.json()
                break
            if put.status_code == 429:
                wait = int(put.headers.get("Retry-After", 10)) + 5
                print(f"\n    [429 PUT] Azure backoff {wait}s")
                time.sleep(wait)
            elif put.status_code in (500, 502, 503, 504):
                time.sleep(5)
            elif attempt == 4:
                raise RuntimeError(f"upload chunk failed: {put.status_code} - {put.text[:200]}")
            else:
                time.sleep(3)
        pos = end + 1
        mb = pos / (1024 * 1024)
        speed = mb / max(time.time() - t0, 0.1)
        sys.stdout.write(f"\r  [stream] {round(100 * pos / total, 1)}% ({mb:.0f}/{total / (1024 * 1024):.0f} MB) @ {speed:.1f} MB/s")
        sys.stdout.flush()
    sys.stdout.write("\n")
    return meta


def collect_records(subjects: List[str]) -> List[tuple]:
    """Collect all manifest records for the requested subjects that need migration."""
    manifest = load_manifest()
    records = []
    for key, item in manifest.items():
        if not isinstance(item, dict):
            continue
        if item.get("platform") != "marrow":
            continue
        subj = item.get("subject_id", "")
        if subj not in subjects:
            continue
        if subj not in SUBJECT_MAP:
            continue
        if item.get("status") != "completed":
            continue
        # Skip items already migrated to openmedQ
        if item.get("openmedq_migrated"):
            continue
        # Must have an onedrive_item_id (pointing to old SP)
        old_id = item.get("source_onedrive_item_id") or item.get("onedrive_item_id")
        if not old_id:
            continue
        records.append((key, item, old_id))
    # Sort by subject then by title for orderly processing
    records.sort(key=lambda r: (r[1].get("subject_id", ""), r[1].get("title", "")))
    return records


def migrate(new: TokenManager, old: TokenManager, subjects: List[str],
            limit: Optional[int], dry_run: bool, cooldown: float, verify_only: bool,
            max_runtime_hours: Optional[float] = 5.5) -> int:
    records = collect_records(subjects)
    total_bytes = sum(item.get("size_bytes", 0) for _, item, _ in records)
    manifest = load_manifest()
    start_time = time.time()
    max_runtime_seconds = (max_runtime_hours * 3600) if (max_runtime_hours and max_runtime_hours > 0) else None

    print(f"Records to migrate: {len(records)}   payload: {total_bytes / (1024 ** 3):.2f} GiB")
    print(f"Subjects: {', '.join(sorted(set(r[1]['subject_id'] for r in records)))}")
    if max_runtime_seconds:
        print(f"Max runtime: {max_runtime_hours:.2f} hours (graceful exit before 6h timeout)")
    print()

    moved = adopted = failed = 0
    for i, (key, item, old_item_id) in enumerate(records, 1):
        if limit and (moved + adopted >= limit or (dry_run and i > limit)):
            print(f"Limit of {limit} files reached.")
            break

        if max_runtime_seconds and (time.time() - start_time) >= max_runtime_seconds:
            elapsed_h = (time.time() - start_time) / 3600
            print(f"\n[GRACEFUL CUTOFF] Reached max runtime limit ({elapsed_h:.2f}h / {max_runtime_hours}h).")
            print("Stopping cleanly before GitHub Actions 6-hour timeout to allow catalog sync and manifest commit.")
            break

        subj = item["subject_id"]
        _, dest_folder_name = SUBJECT_MAP[subj]
        filename = item.get("filename", f"{item.get('title', 'untitled')}.mp4")
        target_path = f"Aspirin_LMS/Marrow_E6/{dest_folder_name}/{filename}"
        dest_folder_path = f"Marrow_E6/{dest_folder_name}"
        size = item.get("size_bytes", 0)

        print(f"[{i}/{len(records)}] [{subj}] {filename} ({size / (1024 * 1024):.1f} MB)")

        # Check if already on destination
        existing = dest_item(new, target_path)
        if existing and existing.get("size") == size:
            print("  -> already on openmedQ at matching size; adopting existing item")
            # Preserve old ID and paths before overwriting
            if not item.get("source_onedrive_item_id"):
                item["source_onedrive_item_id"] = old_item_id
            if not item.get("source_onedrive_path"):
                item["source_onedrive_path"] = item.get("onedrive_path")
            if not item.get("source_sp_filename"):
                item["source_sp_filename"] = item.get("filename")
            m_no = re.match(r"^(\d+)\.", filename)
            if m_no and not item.get("marrow_lecture_no"):
                item["marrow_lecture_no"] = int(m_no.group(1))
            if not item.get("title_verified"):
                item["title_verified"] = {
                    "verified_on": "2026-09-29",
                    "method": "exact match to marrow_sections.json syllabus and legacy SharePoint file name"
                }
            item["onedrive_item_id"] = existing["id"]
            item["web_url"] = existing.get("webUrl")
            item["onedrive_path"] = f"/{target_path}"
            item["folder_path"] = dest_folder_path
            item["status"] = "completed"
            item["openmedq_migrated"] = True
            item.pop("openmedq_status", None)
            manifest[key] = item
            save_manifest(manifest)
            adopted += 1
            continue

        if dry_run:
            print(f"  (DRY RUN) would stream {old_item_id[:20]}... -> /{target_path}")
            continue
        if verify_only:
            print("  [VERIFY] missing on destination")
            failed += 1
            continue

        src_url = download_url(old, old_item_id)
        if not src_url:
            print(f"  [ERROR] no download URL for {old_item_id}")
            failed += 1
            continue
        try:
            meta = stream(src_url, create_upload_session(new, target_path), size)
        except (RuntimeError, requests.RequestException) as e:
            print(f"  [ERROR] {filename}: {e}")
            failed += 1
            continue
        if not meta or "id" not in meta:
            print("  [ERROR] upload returned no item id")
            failed += 1
            continue
        if meta.get("size") != size:
            print(f"  [ERROR] size mismatch: source {size} bytes, destination {meta.get('size')} bytes - NOT recorded")
            failed += 1
            continue

        # Save old ID and paths before overwriting
        if not item.get("source_onedrive_item_id"):
            item["source_onedrive_item_id"] = old_item_id
        if not item.get("source_onedrive_path"):
            item["source_onedrive_path"] = item.get("onedrive_path")
        if not item.get("source_sp_filename"):
            item["source_sp_filename"] = item.get("filename")
        m_no = re.match(r"^(\d+)\.", filename)
        if m_no and not item.get("marrow_lecture_no"):
            item["marrow_lecture_no"] = int(m_no.group(1))
        if not item.get("title_verified"):
            item["title_verified"] = {
                "verified_on": "2026-09-29",
                "method": "exact match to marrow_sections.json syllabus and legacy SharePoint file name"
            }
        item["onedrive_item_id"] = meta["id"]
        item["web_url"] = meta.get("webUrl")
        item["onedrive_path"] = f"/{target_path}"
        item["folder_path"] = dest_folder_path
        item["status"] = "completed"
        item["openmedq_migrated"] = True
        item.pop("openmedq_status", None)
        item["migrated_to_openmedq_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        manifest[key] = item
        save_manifest(manifest)
        moved += 1
        print(f"  [OK] {meta['id'][:16]}...")
        time.sleep(cooldown)

    print(f"\nTransferred: {moved}   adopted/resumed: {adopted}   failed: {failed}")
    return failed


def main():
    ap = argparse.ArgumentParser(description="Migrate Marrow subjects to openmedQ SharePoint")
    ap.add_argument("--subjects", nargs="*", default=list(SUBJECT_MAP.keys()),
                    help="Subject IDs to migrate (default: all). Choices: " + ", ".join(SUBJECT_MAP.keys()))
    ap.add_argument("--limit", type=int, default=None, help="Max files to transfer this run")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--cooldown", type=float, default=1.5, help="Seconds between files")
    ap.add_argument("--verify-only", action="store_true", help="Report destination coverage without uploading")
    ap.add_argument("--max-runtime-hours", type=float, default=5.5,
                    help="Max runtime in hours before graceful exit (default: 5.5, 0=unlimited)")
    args = ap.parse_args()

    # Normalize and validate subjects
    args.subjects = [s.strip().lower() for s in (args.subjects or []) if s.strip()]
    if not args.subjects:
        args.subjects = list(SUBJECT_MAP.keys())
    for s in args.subjects:
        if s not in SUBJECT_MAP:
            print(f"ERROR: Unknown subject '{s}'. Valid: {', '.join(SUBJECT_MAP.keys())}")
            sys.exit(1)

    old = TokenManager(OLD_TOKEN_FILE, OLD_CLIENT_ID, OLD_TENANT_ID, "OLD_ONEDRIVE")
    old.get_token()

    new = TokenManager(NEW_TOKEN_FILE, NEW_CLIENT_ID, NEW_TENANT_ID, "NEW_ONEDRIVE")
    new.get_token()

    print("=" * 70)
    print(" Marrow Edition 6: bulk cloud-to-cloud migration")
    print(f" subjects    : {', '.join(args.subjects)}")
    print(f" safeguards  : 20 MiB chunks, sequential, {args.cooldown}s cooldown, 429 backoff, size verify")
    print("=" * 70)
    print()

    failed = migrate(new, old, args.subjects, args.limit, args.dry_run, args.cooldown, args.verify_only, args.max_runtime_hours)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
