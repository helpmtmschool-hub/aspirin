"""
Interactive browser-based OAuth flow for OpenmedQ.
Opens your browser directly for login — bypasses device code flow restrictions.
"""
import base64
import hashlib
import http.server
import json
import os
import secrets
import sys
import threading
import time
import urllib.parse

import requests

sys.stdout.reconfigure(line_buffering=True)

CLIENT_ID = "054e8da3-e1e0-4274-b8a9-2bb6f71ef8f8"
TENANT_ID = "9903c5d7-b085-4596-9ee6-98f39ddba128"
REDIRECT_PORT = 8457
REDIRECT_URI = f"http://localhost:{REDIRECT_PORT}"
SCOPE = "https://graph.microsoft.com/.default offline_access"

auth_code_result = {"code": None, "error": None}


class OAuthHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = urllib.parse.parse_qs(parsed.query)

        if "code" in params:
            auth_code_result["code"] = params["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<html><body style='font-family:sans-serif;text-align:center;padding-top:60px;'><h1 style='color:#10b981;font-size:32px;'>&#10004; Authentication Successful!</h1><p style='font-size:18px;color:#555;'>You can close this tab and return to the IDE.</p></body></html>")
        elif "error" in params:
            auth_code_result["error"] = params.get("error_description", params["error"])[0]
            self.send_response(400)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            msg = auth_code_result["error"]
            self.wfile.write(f"<html><body style='font-family:sans-serif;text-align:center;padding-top:60px;'><h1 style='color:#ef4444;font-size:32px;'>Authentication Failed</h1><p style='font-size:18px;color:#555;'>{msg}</p></body></html>".encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # Suppress HTTP server logs


# Generate PKCE code verifier and challenge
code_verifier = secrets.token_urlsafe(64)[:128]
code_challenge = base64.urlsafe_b64encode(
    hashlib.sha256(code_verifier.encode("ascii")).digest()
).decode("ascii").rstrip("=")

# Build authorization URL
auth_url = (
    f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/authorize?"
    + urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "response_type": "code",
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPE,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "prompt": "select_account",
    })
)

# Write redirect HTML file
html_path = os.path.abspath("engine/open_login.html")
with open(html_path, "w", encoding="utf-8") as f:
    f.write(f"""<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url={auth_url}">
    <title>Signing into OpenmedQ...</title>
</head>
<body style="font-family:system-ui;text-align:center;padding-top:50px;">
    <h2>Redirecting to Microsoft Login...</h2>
    <p><a href="{auth_url}">Click here if not redirected automatically</a></p>
</body>
</html>
""")

with open("engine/auth_url.txt", "w", encoding="utf-8") as f:
    f.write(auth_url)

# Start local server
server = http.server.HTTPServer(("127.0.0.1", REDIRECT_PORT), OAuthHandler)
server_thread = threading.Thread(target=server.handle_request, daemon=True)
server_thread.start()

print("=" * 70)
print(f"Auth URL: {auth_url}")
print("=" * 70)
sys.stdout.flush()

try:
    os.startfile(html_path)
    print("Launched browser via os.startfile")
except Exception as e:
    print(f"Could not auto-launch browser: {e}")

print("Waiting for authentication callback on http://localhost:8457...")
sys.stdout.flush()
server_thread.join(timeout=600)
server.server_close()

if auth_code_result["error"]:
    print(f"ERROR: {auth_code_result['error']}")
    sys.exit(1)

if not auth_code_result["code"]:
    print("ERROR: Timed out waiting for authentication.")
    sys.exit(1)

print("Got authorization code! Exchanging for tokens...")
sys.stdout.flush()

# Exchange auth code for tokens
token_res = requests.post(
    f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token",
    data={
        "client_id": CLIENT_ID,
        "grant_type": "authorization_code",
        "code": auth_code_result["code"],
        "redirect_uri": REDIRECT_URI,
        "code_verifier": code_verifier,
        "scope": SCOPE,
    }
)

if token_res.status_code != 200:
    print(f"Token exchange failed: {token_res.status_code}")
    print(token_res.text[:500])
    sys.exit(1)

token_data = token_res.json()
save = {
    "access_token": token_data["access_token"],
    "refresh_token": token_data.get("refresh_token", ""),
    "expires_at": time.time() + token_data.get("expires_in", 3600),
}

with open("onedrive_token_new.json", "w", encoding="utf-8") as f:
    json.dump(save, f, indent=2)
with open("onedrive_token.json", "w", encoding="utf-8") as f:
    json.dump(save, f, indent=2)

# Verify token works
headers = {"Authorization": f"Bearer {save['access_token']}"}
me = requests.get("https://graph.microsoft.com/v1.0/me", headers=headers)
if me.status_code == 200:
    user = me.json()
    print(f"\nSUCCESS! Authenticated as: {user.get('displayName')} ({user.get('userPrincipalName')})")
else:
    print(f"\nTokens saved but /me check returned: {me.status_code}")

print("Tokens saved to onedrive_token.json and onedrive_token_new.json")
