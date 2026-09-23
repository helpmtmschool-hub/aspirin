"""
Yui - Microsoft OneDrive / Graph API OAuth Token Helper
Easily authenticates your Microsoft 5 TB Organization / Personal account
and generates the ONEDRIVE_REFRESH_TOKEN for GitHub Actions Secrets.

Supports:
1. Device Code Flow (Easiest: Go to https://microsoft.com/devicelogin and enter code)
2. Local Browser Authorization Flow (Redirect to http://localhost:8080)
"""

import argparse
import json
import os
import sys
import time
from urllib.parse import urlencode
import requests

DEFAULT_SCOPES = ["offline_access", "Files.ReadWrite.All", "User.Read"]


def get_device_code(client_id: str, tenant_id: str = "common"):
    endpoint = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/devicecode"
    data = {
        "client_id": client_id,
        "scope": " ".join(DEFAULT_SCOPES),
    }
    res = requests.post(endpoint, data=data)
    if res.status_code != 200:
        print(f"Error requesting device code: {res.status_code} - {res.text}")
        return None
    return res.json()


def poll_device_token(client_id: str, device_code: str, interval: int, expires_in: int, tenant_id: str = "common", client_secret: str = None):
    endpoint = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    data = {
        "client_id": client_id,
        "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
        "device_code": device_code,
    }
    if client_secret:
        data["client_secret"] = client_secret

    start_time = time.time()
    print("Waiting for you to sign in at https://microsoft.com/devicelogin ...")

    while time.time() - start_time < expires_in:
        time.sleep(interval or 5)
        res = requests.post(endpoint, data=data)
        token_data = res.json()

        if "access_token" in token_data:
            return token_data

        err = token_data.get("error")
        if err == "authorization_pending":
            sys.stdout.write(".")
            sys.stdout.flush()
            continue
        elif err == "slow_down":
            time.sleep(interval + 5)
            continue
        elif err == "expired_token":
            print("\nError: The device code expired. Please try again.")
            return None
        else:
            print(f"\nAuthorization error: {err} - {token_data.get('error_description')}")
            return None

    print("\nTimed out waiting for sign-in.")
    return None


def run_browser_flow(client_id: str, client_secret: Optional[str] = None, tenant_id: str = "common", port: int = 8400):
    """Local browser redirect flow: spins up a temporary HTTP server on localhost."""
    import http.server
    import urllib.parse
    import webbrowser

    redirect_uri = f"http://localhost:{port}"
    scope_str = "%20".join(DEFAULT_SCOPES)
    auth_url = (
        f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"
        f"?client_id={client_id}"
        f"&response_type=code"
        f"&redirect_uri={urllib.parse.quote(redirect_uri)}"
        f"&response_mode=query"
        f"&scope={scope_str}"
    )

    auth_code = None

    class OAuthHandler(http.server.BaseHTTPRequestHandler):
        def do_GET(self):
            nonlocal auth_code
            parsed = urllib.parse.urlparse(self.path)
            query = urllib.parse.parse_qs(parsed.query)

            if "code" in query:
                auth_code = query["code"][0]
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"<h1>Success!</h1><p>You can close this tab and return to the terminal.</p>")
            else:
                err = query.get("error", ["unknown"])[0]
                desc = query.get("error_description", [""])[0]
                self.send_response(400)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(f"<h1>Error</h1><p>{err}: {desc}</p>".encode("utf-8"))

        def log_message(self, format, *args):
            return  # Quiet server logs

    print(f"\nStarting local listener on {redirect_uri} ...")
    server = http.server.HTTPServer(("localhost", port), OAuthHandler)
    server.timeout = 180

    print("\n" + "=" * 65)
    print(" Opening browser for Microsoft sign-in...")
    print(f" If it doesn't open automatically, visit:")
    print(f" {auth_url}")
    print("=" * 65 + "\n")

    webbrowser.open(auth_url)

    while auth_code is None:
        server.handle_request()

    server.server_close()

    if not auth_code:
        print("Failed to capture authorization code.")
        return

    print("Authorization code captured! Exchanging for tokens...")
    token_endpoint = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    token_data = {
        "client_id": client_id,
        "grant_type": "authorization_code",
        "code": auth_code,
        "redirect_uri": redirect_uri,
        "scope": " ".join(DEFAULT_SCOPES),
    }
    if client_secret:
        token_data["client_secret"] = client_secret

    res = requests.post(token_endpoint, data=token_data)
    if res.status_code != 200:
        print(f"Token exchange error: {res.status_code} - {res.text}")
        return

    tokens = res.json()
    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        print("Error: No refresh token returned. Response:", tokens)
        return

    print("\n" + "=" * 65)
    print(" SUCCESS! Microsoft OneDrive Authorization Completed!")
    print("=" * 65)
    print("\nAdd the following secrets to your GitHub Repository Secrets:\n")
    print(f"ONEDRIVE_CLIENT_ID:     {client_id}")
    if client_secret:
        print(f"ONEDRIVE_CLIENT_SECRET: {client_secret}")
    print(f"ONEDRIVE_TENANT_ID:     {tenant_id}")
    print("\nONEDRIVE_REFRESH_TOKEN:")
    print("-" * 65)
    print(refresh_token)
    print("-" * 65 + "\n")

    with open("onedrive_token.json", "w", encoding="utf-8") as f:
        json.dump(tokens, f, indent=2)
    print("Saved full token response to onedrive_token.json (never committed to git).")


def run_device_flow(client_id: str, client_secret: str = None, tenant_id: str = "common"):
    print("\nInitiating Microsoft Device Code Flow...")
    device_data = get_device_code(client_id, tenant_id)
    if not device_data:
        return

    if "error" in device_data:
        err = device_data.get("error")
        desc = device_data.get("error_description", "")
        if "AADSTS70002" in desc or err == "invalid_client":
            print("\n" + "!" * 65)
            print(" ACTION REQUIRED IN AZURE PORTAL:")
            print(" In Azure Portal -> App registrations -> your app:")
            print(" 1. Click 'Authentication' in the left menu")
            print(" 2. Under 'Advanced settings', set:")
            print("    'Allow public client flows' -> 'Enable the following mobile and desktop flows' = YES")
            print(" 3. Click 'Save' at the top and re-run this command.")
            print("\n Alternatively, you can use the browser redirect flow:")
            print(f" python engine/get_onedrive_token.py --client-id {client_id} --flow browser")
            print("!" * 65 + "\n")
        else:
            print(f"Error requesting device code: {err} - {desc}")
        return

    user_code = device_data["user_code"]
    verification_uri = device_data.get("verification_uri", "https://microsoft.com/devicelogin")
    interval = device_data.get("interval", 5)
    expires_in = device_data.get("expires_in", 900)

    print("\n" + "=" * 65)
    print(f" 1. Open your browser: {verification_uri}")
    print(f" 2. Enter this code:   {user_code}")
    print(f" 3. Sign in with your 5 TB Microsoft organization account")
    print("=" * 65 + "\n")

    token_data = poll_device_token(
        client_id,
        device_data["device_code"],
        interval,
        expires_in,
        tenant_id=tenant_id,
        client_secret=client_secret,
    )

    if not token_data or "refresh_token" not in token_data:
        print("\nFailed to obtain refresh token.")
        return

    refresh_token = token_data["refresh_token"]

    print("\n" + "=" * 65)
    print(" SUCCESS! Microsoft OneDrive Authorization Completed!")
    print("=" * 65)
    print("\nAdd the following secrets to your GitHub Repository Secrets:\n")
    print(f"ONEDRIVE_CLIENT_ID:     {client_id}")
    if client_secret:
        print(f"ONEDRIVE_CLIENT_SECRET: {client_secret}")
    print(f"ONEDRIVE_TENANT_ID:     {tenant_id}")
    print("\nONEDRIVE_REFRESH_TOKEN:")
    print("-" * 65)
    print(refresh_token)
    print("-" * 65 + "\n")

    # Save to local file for convenience (ignored by .gitignore)
    with open("onedrive_token.json", "w", encoding="utf-8") as f:
        json.dump(token_data, f, indent=2)
    print("Saved full token response to onedrive_token.json (never committed to git).")


def main():
    parser = argparse.ArgumentParser(description="Microsoft OneDrive OAuth Token Helper for Yui")
    parser.add_argument("--client-id", required=True, help="Azure App Registration Application (client) ID")
    parser.add_argument("--client-secret", default=None, help="Azure App Registration Client Secret (if configured)")
    parser.add_argument("--tenant", default="common", help="Azure AD Tenant ID (default: 'common' or 'organizations')")
    parser.add_argument("--flow", choices=["device", "browser"], default="device", help="OAuth flow: 'device' (default) or 'browser'")
    parser.add_argument("--port", type=int, default=8400, help="Local port for browser flow redirect (default: 8400)")

    args = parser.parse_args()
    if args.flow == "browser":
        run_browser_flow(args.client_id, args.client_secret, args.tenant, args.port)
    else:
        run_device_flow(args.client_id, args.client_secret, args.tenant)


if __name__ == "__main__":
    main()
