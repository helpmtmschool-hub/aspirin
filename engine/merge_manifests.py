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

    # Intelligent union merge: preserve completed and migrated states from both branches
    merged = dict(remote_data)
    for k, local_val in local_data.items():
        if k not in merged:
            merged[k] = local_val
        else:
            remote_val = merged[k]
            if isinstance(local_val, dict) and isinstance(remote_val, dict):
                # If either side migrated to openmedQ, keep the migrated state
                if local_val.get("openmedq_migrated") and not remote_val.get("openmedq_migrated"):
                    merged[k] = local_val
                elif remote_val.get("openmedq_migrated") and not local_val.get("openmedq_migrated"):
                    merged[k] = remote_val
                # If either side marked item completed, keep completed state
                elif local_val.get("status") == "completed" and remote_val.get("status") != "completed":
                    merged[k] = local_val
                elif remote_val.get("status") == "completed" and local_val.get("status") != "completed":
                    merged[k] = remote_val
                else:
                    # Both have same progress: merge with local updates taking precedence
                    merged[k] = {**remote_val, **local_val}
            else:
                merged[k] = local_val

    print(f"Manifest merge complete: {len(remote_data)} remote + {len(local_data)} local -> {len(merged)} total items.")

    with open(local_path, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2)

    pub_path = Path(__file__).resolve().parent.parent / "public" / "transfer_manifest.json"
    if pub_path.parent.exists():
        with open(pub_path, "w", encoding="utf-8") as f:
            json.dump(merged, f, indent=2)

if __name__ == "__main__":
    merge_manifests()
