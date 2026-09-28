"""Yui - Marrow Edition 6 Dermatology: old SharePoint -> openmedQ SharePoint.

Source:  /Aspirin_LMS/04_Marrow_Edition_6/19_Dermatology   (5ncjwt tenant, 28 files, 7.62 GiB)
Target:  /Aspirin_LMS/Marrow_E6/Dermatology/{N}. {Verified Title}.mp4   (openmedQ tenant)

The 28 titles come from engine/marrow_derm_true_titles.json, produced by
verify_marrow_derm_titles.py: every SharePoint file is bound to its My Marrow message by exact
byte size, to a titled copy in `Subjectwise Lectures` topic 2712 by Telegram document id (lecture
27 by duration, where that group re-encoded the file), and corroborated against an independent
rip in the `Marrow` channel. No title is guessed.

Modes:
  --prepare   offline data work only: create manifest records (no destination id yet) and
              rewrite dermatology titles in engine/marrow_sections.json. Runs without the
              openmedQ token, so it can be done locally.
  default     cloud-to-cloud transfer. Idempotent: an existing destination file of identical
              size is adopted instead of re-uploaded, so the run can be resumed at any point.

Safety: nothing is ever deleted; 0 bytes persist to disk (20 MiB in-flight chunks only);
single sequential stream; Retry-After honoured on 429 and backoff on 5xx; manifest written
after every file.
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional

import requests

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

PROJECT_DIR = Path(__file__).resolve().parent.parent
MANIFEST_PATH = PROJECT_DIR / "engine" / "transfer_manifest.json"
PUBLIC_MANIFEST_PATH = PROJECT_DIR / "public" / "transfer_manifest.json"
SECTIONS_PATH = PROJECT_DIR / "engine" / "marrow_sections.json"
TITLES_PATH = PROJECT_DIR / "engine" / "marrow_derm_true_titles.json"

OLD_TOKEN_FILE = PROJECT_DIR / "onedrive_token_old.json"
NEW_TOKEN_FILE = PROJECT_DIR / "onedrive_token_new.json"
FALLBACK_TOKEN_FILE = PROJECT_DIR / "onedrive_token.json"

OLD_CLIENT_ID = "ba92c830-fac7-4d60-a0ff-8bf0b581a4c4"
OLD_TENANT_ID = "938a1924-0af0-4599-819b-177a1dcf8fd6"
NEW_CLIENT_ID = "054e8da3-e1e0-4274-b8a9-2bb6f71ef8f8"
NEW_TENANT_ID = "9903c5d7-b085-4596-9ee6-98f39ddba128"

CHUNK_SIZE = 20 * 1024 * 1024
SOURCE_FOLDER = "Aspirin_LMS/04_Marrow_Edition_6/19_Dermatology"
TARGET_FOLDER = "Aspirin_LMS/Marrow_E6/Dermatology"
DEST_FOLDER_PATH = "Marrow_E6/Dermatology"
MARROW_CHAT_ID = -1003264222864
VERIFIED_ON = "2026-09-28"


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


def fmt_duration(sec: int) -> str:
    m, s = divmod(int(sec), 60)
    h, m = divmod(m, 60)
    return f"{h}h {m}m" if h else f"{m}m {s}s"


def load_manifest() -> Dict[str, Any]:
    return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))


def save_manifest(manifest: Dict[str, Any]):
    text = json.dumps(manifest, indent=2, ensure_ascii=False)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    PUBLIC_MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(text, encoding="utf-8")
    PUBLIC_MANIFEST_PATH.write_text(text, encoding="utf-8")


def verified_lectures() -> list:
    doc = json.loads(TITLES_PATH.read_text(encoding="utf-8"))
    if doc.get("lecture_count") != len(doc["lectures"]):
        raise SystemExit("marrow_derm_true_titles.json is inconsistent - re-run verify_marrow_derm_titles.py")
    return doc["lectures"]


def source_video_meta(old: TokenManager, item_id: str) -> Dict[str, Any]:
    """Resolution + SharePoint-reported duration, read from the source tenant."""
    res = requests.get(
        f"https://graph.microsoft.com/v1.0/sites/root/drive/items/{item_id}?$select=id,name,size,video",
        headers=old.headers(), timeout=60,
    )
    if res.status_code != 200:
        return {}
    v = res.json().get("video") or {}
    out = {}
    if v.get("width") and v.get("height"):
        out["resolution"] = f"{v['width']}x{v['height']}"
    if v.get("duration"):
        out["sp_duration_seconds"] = int(round(v["duration"] / 1000))
    return out


def ensure_records(old: TokenManager) -> list:
    """Create/refresh manifest records for all 28 lectures. Returns (key, entry) list."""
    manifest = load_manifest()
    kept = []
    for lec in verified_lectures():
        key = f"mr_{MARROW_CHAT_ID}_{lec['telegram_message_id']}"
        filename = f"{lec['title']}.mp4"
        entry = manifest.get(key, {})
        provenance = {
            "verified_on": VERIFIED_ON,
            "method": "byte-size match to My Marrow upload + Telegram document id match to a titled group, "
                      "corroborated by an independently ripped copy",
            "binding": lec["binding"],
            "sources": [
                {"chat": "Subjectwise Lectures", "chat_id": -1003506593387, "topic_id": 2712,
                 "message_id": lec["source_b_message"], "title": lec["source_b_title"]},
                {"chat": "Marrow", "chat_id": -1003659432109,
                 "message_id": lec["source_c_message"], "title": lec["source_c_title"]},
            ],
            "source_channel_title": lec["previous_title"],
        }
        entry.update({
            "title": lec["title"],
            "filename": filename,
            "platform": "marrow",
            "subject_id": "dermatology",
            "telegram_chat_id": MARROW_CHAT_ID,
            "telegram_message_id": lec["telegram_message_id"],
            "marrow_lecture_no": lec["seq"],
            "size_bytes": lec["size_bytes"],
            "duration_seconds": lec["duration_seconds"],
            "duration_formatted": fmt_duration(lec["duration_seconds"]),
            "source_channel": "My Marrow topic 310",
            "source_onedrive_item_id": lec["sharepoint_item_id"],
            "source_onedrive_path": f"/{lec['sharepoint_path']}",
            "source_sp_filename": lec["previous_title"],
            "title_verified": provenance,
            "thumbnail_url": f"/api/thumbnail/{MARROW_CHAT_ID}/{lec['telegram_message_id']}",
        })
        # status 'completed' means the video is on the source SharePoint: that is what keeps the
        # scheduled Telegram->SharePoint pipeline from re-downloading all 28 lectures. The catalog
        # still excludes them because they have no openmedQ `onedrive_item_id` yet.
        if entry.get("onedrive_item_id"):
            entry["status"] = "completed"
            entry["openmedq_migrated"] = True
            entry.setdefault("folder_path", DEST_FOLDER_PATH)
        else:
            entry["folder_path"] = SOURCE_FOLDER.replace("Aspirin_LMS/", "")
            entry["status"] = "completed"
            entry["openmedq_migrated"] = False
            entry["openmedq_status"] = "pending_transfer"
        if not entry.get("resolution") and lec.get("sharepoint_item_id"):
            entry.update(source_video_meta(old, lec["sharepoint_item_id"]))
        manifest[key] = entry
        kept.append((key, manifest[key]))
    save_manifest(manifest)
    print(f"Manifest records ensured: {len(kept)}")
    return kept


def sync_sections():
    """marrow_sections.json feeds the pipeline's preferred_title, so it must carry the same titles."""
    sections = json.loads(SECTIONS_PATH.read_text(encoding="utf-8"))
    by_msg = {lec["telegram_message_id"]: lec["title"] for lec in verified_lectures()}
    changed = 0
    for sec in sections:
        if sec.get("subject_id") != "dermatology":
            continue
        for vid in sec.get("videos", []):
            new_title = by_msg.get(vid.get("message_id"))
            if new_title and vid.get("title") != new_title:
                vid["title"] = new_title
                changed += 1
    SECTIONS_PATH.write_text(json.dumps(sections, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"marrow_sections.json: {changed} dermatology titles updated")


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
        if chunk.status_code != 206:
            # A 200 means the source ignored Range and sent the whole file: uploading that as one
            # chunk would silently truncate or duplicate bytes.
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


def migrate(new: TokenManager, old: TokenManager, limit: Optional[int], dry_run: bool,
            cooldown: float, verify_only: bool) -> int:
    manifest = load_manifest()
    records = [(k, v) for k, v in manifest.items()
               if isinstance(v, dict) and v.get("subject_id") == "dermatology"
               and v.get("platform") == "marrow" and not v.get("skipped")]
    records.sort(key=lambda kv: kv[1].get("marrow_lecture_no", 0))
    total_bytes = sum(v["size_bytes"] for _, v in records)
    print(f"Dermatology records: {len(records)}   payload: {total_bytes / (1024 ** 3):.2f} GiB")

    moved = adopted = failed = 0
    for i, (key, item) in enumerate(records, 1):
        if limit and moved >= limit:
            print(f"Limit of {limit} files reached.")
            break
        path = f"{TARGET_FOLDER}/{item['filename']}"
        size = item["size_bytes"]
        print(f"\n[{i}/{len(records)}] {item['filename']} ({size / (1024 * 1024):.1f} MB)")
        existing = dest_item(new, path)
        if existing and existing.get("size") == size:
            print("  -> already on openmedQ at matching size; adopting existing item")
            item["onedrive_item_id"] = existing["id"]
            item["web_url"] = existing.get("webUrl")
            item["onedrive_path"] = f"/{path}"
            item["folder_path"] = DEST_FOLDER_PATH
            item["status"] = "completed"
            item["openmedq_migrated"] = True
            item.pop("openmedq_status", None)
            manifest[key] = item
            save_manifest(manifest)
            adopted += 1
            continue
        if dry_run:
            print(f"  (DRY RUN) would stream {item['source_onedrive_item_id']} -> /{path}")
            continue
        if verify_only:
            print("  [VERIFY] missing on destination")
            failed += 1
            continue

        src_url = download_url(old, item["source_onedrive_item_id"])
        if not src_url:
            print(f"  [ERROR] no download URL for {item['source_onedrive_item_id']}")
            failed += 1
            continue
        try:
            meta = stream(src_url, create_upload_session(new, path), size)
        except (RuntimeError, requests.RequestException) as e:
            # Leave the record untouched: the next run adopts or resumes this file cleanly.
            print(f"  [ERROR] {item['filename']}: {e}")
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
        item["onedrive_item_id"] = meta["id"]
        item["web_url"] = meta.get("webUrl")
        item["onedrive_path"] = f"/{path}"
        item["folder_path"] = DEST_FOLDER_PATH
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


def rename_on_source(old: TokenManager, dry_run: bool) -> None:
    """Optional: bring the legacy SharePoint filenames in line with the verified titles."""
    manifest = load_manifest()
    headers = old.headers()
    derm = [(k, v) for k, v in manifest.items() if isinstance(v, dict) and v.get("subject_id") == "dermatology"]
    for key, item in sorted(derm, key=lambda kv: kv[1].get("marrow_lecture_no", 0)):
        src_id = item.get("source_onedrive_item_id")
        want = item["filename"]
        if not src_id:
            continue
        res = requests.get(f"https://graph.microsoft.com/v1.0/sites/root/drive/items/{src_id}?$select=id,name,size",
                           headers=headers, timeout=60)
        if res.status_code != 200:
            print(f"  [WARN] {src_id} not readable: {res.status_code}")
            continue
        current = res.json()
        if current["name"] == want:
            continue
        print(f"  source rename: '{current['name']}' -> '{want}'")
        if dry_run:
            continue
        patch = requests.patch(f"https://graph.microsoft.com/v1.0/sites/root/drive/items/{src_id}",
                               headers=headers, json={"name": want}, timeout=60)
        if patch.status_code not in (200, 201):
            print(f"    [FAIL] {patch.status_code} {patch.text[:160]}")
        else:
            item["source_onedrive_path"] = f"/{SOURCE_FOLDER}/{want}"
            item["source_sp_filename"] = current["name"]
            manifest[key] = item
    if not dry_run:
        save_manifest(manifest)


def check_sources(old: TokenManager) -> int:
    """Pre-flight: every source item must resolve to a readable download URL of the recorded size."""
    manifest = load_manifest()
    derm = [(k, v) for k, v in manifest.items()
            if isinstance(v, dict) and v.get("subject_id") == "dermatology"]
    derm.sort(key=lambda kv: kv[1].get("marrow_lecture_no", 0))
    bad = 0
    for key, item in derm:
        url = download_url(old, item["source_onedrive_item_id"])
        if not url:
            print(f"  L{item['marrow_lecture_no']:>2} {item['filename']}: NO DOWNLOAD URL")
            bad += 1
            continue
        probe = requests.get(url, headers={"Range": "bytes=0-0"}, timeout=60)
        cr = probe.headers.get("Content-Range", "")
        reported = int(cr.rsplit("/", 1)[-1]) if "/" in cr else None
        if probe.status_code != 206 or reported != item["size_bytes"]:
            print(f"  L{item['marrow_lecture_no']:>2} {item['filename']}: "
                  f"probe {probe.status_code}, reported {reported} vs recorded {item['size_bytes']}")
            bad += 1
        else:
            print(f"  L{item['marrow_lecture_no']:>2} readable, {reported} bytes match")
    print(f"Source pre-flight: {len(derm) - bad}/{len(derm)} OK")
    return bad


def main():
    ap = argparse.ArgumentParser(description="Migrate Marrow dermatology to openmedQ SharePoint")
    ap.add_argument("--prepare", action="store_true", help="Only write manifest records + section titles")
    ap.add_argument("--limit", type=int, default=None, help="Max files to transfer this run")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--cooldown", type=float, default=2.5, help="Seconds between files")
    ap.add_argument("--verify-only", action="store_true", help="Report destination coverage without uploading")
    ap.add_argument("--rename-source", action="store_true", help="Also rename the legacy SharePoint files")
    ap.add_argument("--source-check", action="store_true",
                    help="Pre-flight the source tenant only (no openmedQ token needed)")
    args = ap.parse_args()

    old = TokenManager(OLD_TOKEN_FILE, OLD_CLIENT_ID, OLD_TENANT_ID, "OLD_ONEDRIVE")
    old.get_token()

    if args.source_check:
        sys.exit(1 if check_sources(old) else 0)

    if args.prepare:
        ensure_records(old)
        sync_sections()
        print("\nPrepare complete. Transfer still needs the openmedQ token.")
        return

    new = TokenManager(NEW_TOKEN_FILE, NEW_CLIENT_ID, NEW_TENANT_ID, "NEW_ONEDRIVE")
    print("=" * 70)
    print(" Marrow Dermatology cloud-to-cloud migration")
    print(f" source      : /{SOURCE_FOLDER}")
    print(f" destination : /{TARGET_FOLDER}")
    print(f" safeguards  : 20 MiB chunks, sequential, {args.cooldown}s cooldown, 429 backoff, size verify")
    print("=" * 70)

    ensure_records(old)
    sync_sections()
    failed = migrate(new, old, args.limit, args.dry_run, args.cooldown, args.verify_only)
    if args.rename_source:
        print("\nLegacy SharePoint filenames:")
        rename_on_source(old, args.dry_run)
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
