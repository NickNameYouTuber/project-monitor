import urllib.request
import urllib.error
import json
import sys

BASE_URL = "https://api.id.nicorp.tech/api/developers"
EMAIL = "nigit_admin@nicorp.tech"
PASSWORD = "NigitSecurePass2025!"
APP_ID = 1 

def request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    
    headers["Content-Type"] = "application/json"
    headers["User-Agent"] = "Python-Urllib-NIGIt-Update"
    
    if data:
        data_bytes = json.dumps(data).encode("utf-8")
    else:
        data_bytes = None
        
    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urllib.error.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            return e.code, json.loads(content)
        except:
            return e.code, content
    except Exception as e:
        print(f"Network error: {e}")
        sys.exit(1)

def login():
    print("Logging in...")
    status, body = request(f"{BASE_URL}/login", "POST", {
        "email": EMAIL,
        "password": PASSWORD
    })
    
    if status == 200:
        return body["access_token"]
    else:
        print(f"Login failed: {status} {body}")
        sys.exit(1)

def update_app(token):
    print("Updating App Redirect URIs...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Get current app to keep existing params safe
    status, app = request(f"{BASE_URL}/apps/{APP_ID}", "GET", headers=headers)
    if status != 200:
         print(f"Failed to get app: {status} {app}")
         sys.exit(1)

    print(f"Current URIs: {app.get('redirect_uris')}")
    
    new_uris = [
        "http://localhost:5173/sso/niid/callback",
        "https://pm.nicorp.tech/sso/niid/callback",
        "https://nit.nicorp.tech/sso/niid/callback"
    ]

    # Update
    status, body = request(f"{BASE_URL}/apps/{APP_ID}", "PUT", {
        "redirect_uris": new_uris,
        "scopes": ["profile", "email"]
    }, headers=headers)
    
    if status == 200:
        print("Update successful!")
        return body
    else:
        print(f"Update failed: {status} {body}")
        sys.exit(1)

if __name__ == "__main__":
    token = login()
    app = update_app(token)
    print("APP_DETAILS_UPDATED")
    print(json.dumps(app))
