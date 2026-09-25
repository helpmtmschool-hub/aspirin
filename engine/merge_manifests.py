import json
import subprocess
from pathlib import Path

def merge_manifests():
    local_path = Path(__file__).resolve().parent / "transfer_manifest.json"
    if not local_path.exists():
        return

    try:
        with open(local_path, "r", encoding="utf-8") as f:
            local_data = json.load(f)
    except Exception as e:
        print(f"[Warning] Failed to load local manifest: {e}")
        local_data = {}

    # Try fetching remote manifest from origin/main
    remote_data = {}
    try:
        remote_str = subprocess.check_output(
            ["git", "show", "origin/main:engine/transfer_manifest.json"],
            text=True,
            encoding="utf-8",
            stderr=subprocess.DEVNULL
        )
        remote_data = json.loads(remote_str)
    except Exception:
        pass

    # Union merge: remote keys preserved, local newly completed keys merged on top
    merged = {**remote_data, **local_data}

    print(f"Manifest merge complete: {len(remote_data)} remote + {len(local_data)} local -> {len(merged)} total items.")

    with open(local_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2)

    pub_path = Path(__file__).resolve().parent.parent / "public" / "transfer_manifest.json"
    if pub_path.parent.exists():
        with open(pub_path, "w", encoding="utf-8") as f:
            json.dump(merged, f, indent=2)

if __name__ == "__main__":
    merge_manifests()
