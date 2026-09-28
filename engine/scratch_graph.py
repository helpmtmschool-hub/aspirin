"""Graph helpers shared by the dermatology migration scratch scripts.

Old tenant (5ncjwt) app is a public client: refresh with client id + refresh token only.
New tenant (openmedq) app also refreshes without a secret in this workspace.
"""
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import requests

PROJECT_ROOT = Path(__file__).resolve().parent.parent
GRAPH = "https://graph.microsoft.com/v1.0"

OLD_TENANT_ID = os.environ.get("OLD_ONEDRIVE_TENANT_ID", "938a1924-0af0-4599-819b-177a1dcf8fd6")
OLD_CLIENT_ID = os.environ.get("OLD_ONEDRIVE_CLIENT_ID", "ba92c830-fac7-4d60-a0ff-8bf0b581a4c4")
NEW_TENANT_ID = os.environ.get("NEW_ONEDRIVE_TENANT_ID", "9903c5d7-b085-4596-9ee6-98f39ddba128")
NEW_CLIENT_ID = os.environ.get("NEW_ONEDRIVE_CLIENT_ID", "054e8da3-e1e0-4274-b8a9-2bb6f71ef8f8")


class Graph:
    def __init__(self, token_file: Path, client_id: str, tenant_id: str):
        self.token_file = PROJECT_ROOT / token_file
        self.client_id = client_id
        self.tenant_id = tenant_id
        self.data = json.loads(self.token_file.read_text(encoding="utf-8"))

    def token(self) -> str:
        if time.time() < self.data.get("expires_at", 0) - 300 and self.data.get("access_token"):
            return self.data["access_token"]
        res = requests.post(
            f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token",
            data={
                "client_id": self.client_id,
                "scope": "https://graph.microsoft.com/.default offline_access",
                "grant_type": "refresh_token",
                "refresh_token": self.data["refresh_token"],
            },
            timeout=60,
        )
        if res.status_code != 200:
            raise PermissionError(f"{self.client_id} refresh failed: {res.status_code} {res.text[:300]}")
        fresh = res.json()
        self.data["access_token"] = fresh["access_token"]
        if fresh.get("refresh_token"):
            self.data["refresh_token"] = fresh["refresh_token"]
        self.data["expires_at"] = time.time() + fresh.get("expires_in", 3600)
        self.token_file.write_text(json.dumps(self.data, indent=2), encoding="utf-8")
        return fresh["access_token"]

    def h(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self.token()}", "Content-Type": "application/json"}

    def get(self, path: str, params: str = "") -> Optional[Any]:
        url = f"{GRAPH}/{path.lstrip('/')}"
        if params:
            url += ("&" if "?" in url else "?") + params
        res = requests.get(url, headers=self.h(), timeout=60)
        if res.status_code == 429:
            time.sleep(int(res.headers.get("Retry-After", 10)) + 5)
            return self.get(path, params)
        if res.status_code != 200:
            return {"__error__": res.status_code, "__text__": res.text[:300]}
        return res.json()

    def children(self, path: str) -> List[Dict[str, Any]]:
        clean = "/" + path.strip("/")
        out = []
        page = self.get(f"sites/root/drive/root:{clean}:/children", "$top=200&$select=id,name,size,file,folder,parentReference")
        while page:
            if "__error__" in page:
                print(f"  [list error] {path}: {page['__error__']} {page.get('__text__','')[:120]}", file=sys.stderr)
                break
            out.extend(page.get("value", []))
            url = page.get("@odata.nextLink")
            if not url:
                break
            res = requests.get(url, headers=self.h(), timeout=60)
            if res.status_code != 200:
                break
            page = res.json()
        return out

    def walk(self, root: str) -> List[Dict[str, Any]]:
        files, stack = [], [root]
        while stack:
            p = stack.pop(0)
            for it in self.children(p):
                child_path = f"{p}/{it['name']}"
                if it.get("folder"):
                    stack.append(child_path)
                elif it.get("file"):
                    files.append({"id": it["id"], "name": it["name"], "path": child_path, "size": it.get("size", 0)})
        return files

    def item_by_path(self, path: str) -> Optional[Dict[str, Any]]:
        clean = "/" + path.strip("/")
        r = self.get(f"sites/root/drive/root:{clean}", "$select=id,name,size,webUrl")
        return None if (r is None or "__error__" in r) else r


def old_graph() -> Graph:
    return Graph("onedrive_token_old.json", OLD_CLIENT_ID, OLD_TENANT_ID)


def new_graph() -> Graph:
    return Graph("onedrive_token_new.json", NEW_CLIENT_ID, NEW_TENANT_ID)


def mb(n) -> str:
    return f"{(n or 0) / (1024 * 1024):.1f}MB"
