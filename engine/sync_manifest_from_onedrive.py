"""
Syncs SharePoint files with transfer_manifest.json to recover any uncommitted uploads.
"""

import json
import os
import sys
from pathlib import Path
import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from engine.telegram_to_onedrive import load_env_file, OneDriveClient

load_env_file()

def sync_surgery_from_sp():
    client_id = os.environ.get("ONEDRIVE_CLIENT_ID")
    client_secret = os.environ.get("ONEDRIVE_CLIENT_SECRET")
    refresh_token = os.environ.get("ONEDRIVE_REFRESH_TOKEN")
    tenant_id = os.environ.get("ONEDRIVE_TENANT_ID", "938a1924-0af0-4599-819b-177a1dcf8fd6")

    if not client_id or not refresh_token:
        token_file = Path(__file__).resolve().parent.parent / "onedrive_token.json"
        if token_file.exists():
            with open(token_file, "r") as f:
                d = json.load(f)
                client_id = client_id or d.get("client_id")
                refresh_token = refresh_token or d.get("refresh_token")

    od = OneDriveClient(client_id, client_secret, refresh_token, tenant_id=tenant_id, drive_target="sites/root/drive")
    token = od.get_valid_token()

    # List all children in 04_Marrow_Edition_6/12_General_Surgery
    url = "https://graph.microsoft.com/v1.0/sites/root/drive/root:/Aspirin_LMS/04_Marrow_Edition_6/12_General_Surgery:/children?$top=100&$select=id,name,size,webUrl,video,lastModifiedDateTime"
    headers = {"Authorization": f"Bearer {token}"}
    items = []
    while url:
        res = requests.get(url, headers=headers)
        if res.status_code != 200:
            print(f"Error fetching SP files: {res.status_code} - {res.text}")
            break
        data = res.json()
        items.extend(data.get("value", []))
        url = data.get("@odata.nextLink")

    print(f"Total files on SharePoint in 12_General_Surgery: {len(items)}")

    # Load marrow sections
    marrow_file = Path(__file__).resolve().parent / "marrow_sections.json"
    with open(marrow_file, "r", encoding="utf-8") as f:
        marrow_sections = json.load(f)

    surgery_sec = next(s for s in marrow_sections if s["subject_id"] == "surgery")
    surgery_vids = surgery_sec["videos"]

    # Load transfer manifest
    manifest_file = Path(__file__).resolve().parent / "transfer_manifest.json"
    manifest = {}
    if manifest_file.exists():
        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    sp_map = {it["name"].lower(): it for it in items}

    added = 0
    for v in surgery_vids:
        mid = v["message_id"]
        title = v["title"]
        fn = f"{title}.mp4".lower()
        item_id = f"mr_-1003264222864_{mid}"

        sp_item = sp_map.get(fn)
        if not sp_item:
            # Try fuzzy match (e.g. '1 how to read surgery.mp4')
            for name, it in sp_map.items():
                if name.replace(" ", "").replace("_", "") == fn.replace(" ", "").replace("_", ""):
                    sp_item = it
                    break

        if sp_item and (item_id not in manifest or manifest[item_id].get("status") != "completed"):
            video_obj = sp_item.get("video") or {}
            duration_sec = None
            duration_fmt = None
            resolution = None
            if video_obj.get("duration"):
                duration_sec = round(video_obj["duration"] / 1000)
                m = duration_sec // 60
                s = duration_sec % 60
                duration_fmt = f"{m // 60}h {m % 60}m" if m > 60 else f"{m}m {s}s" if s > 0 else f"{m}m"
            if video_obj.get("width"):
                resolution = f"{video_obj['width']}x{video_obj.get('height')}"

            manifest[item_id] = {
                "title": title,
                "filename": sp_item["name"],
                "platform": "marrow",
                "subject_id": "surgery",
                "folder_path": "04_Marrow_Edition_6/12_General_Surgery",
                "telegram_chat_id": -1003264222864,
                "telegram_message_id": mid,
                "onedrive_item_id": sp_item["id"],
                "onedrive_path": f"/Aspirin_LMS/04_Marrow_Edition_6/12_General_Surgery/{sp_item['name']}",
                "web_url": sp_item.get("webUrl"),
                "size_bytes": sp_item.get("size", 0),
                "duration_seconds": duration_sec,
                "duration_formatted": duration_fmt,
                "resolution": resolution,
                "thumbnail_url": f"/api/thumbnail/-1003264222864/{mid}",
                "uploaded_at": sp_item.get("lastModifiedDateTime"),
                "status": "completed"
            }
            added += 1

    print(f"Added/Updated {added} items from SharePoint into manifest.")

    with open(manifest_file, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    pub_manifest = Path(__file__).resolve().parent.parent / "public" / "transfer_manifest.json"
    if pub_manifest.parent.exists():
        with open(pub_manifest, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)

if __name__ == "__main__":
    sync_surgery_from_sp()
