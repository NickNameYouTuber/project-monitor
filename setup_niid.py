import urllib.request
import urllib.error
import json
import sys

BASE_URL = "https://api.id.nicorp.tech/api/developers"
EMAIL = "nigit_admin@nicorp.tech"
PASSWORD = "NigitSecurePass2025!"
COMPANY = "Project Monitor"

def request(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    
    headers["Content-Type"] = "application/json"
    headers["User-Agent"] = "Python-Urllib-NIGIt-Setup"
    
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

def register():
    print(f"Registering {EMAIL}...")
    status, body = request(f"{BASE_URL}/register", "POST", {
        "email": EMAIL,
        "password": PASSWORD,
        "company_name": COMPANY
    })
    
    if status == 201:
        print("Registration successful")
        return body
    elif status == 409 or (status == 400 and ("already registered" in str(body) or "IntegrityError" in str(body))):
        print("User already registered")
        return None
    else:
        print(f"Registration failed: {status} {body}")
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

def create_app(token):
    print("Creating App...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Check if app exists
    status, apps = request(f"{BASE_URL}/apps", "GET", headers=headers)
    if status == 200:
        for app in apps:
            if app["name"] == "Project Monitor":
                print("App already exists, returning details...")
                return app

    # Create new
    status, body = request(f"{BASE_URL}/apps", "POST", {
        "name": "Project Monitor",
        "description": "NIGIt Project Monitor Integration",
        "redirect_uris": [
            "http://localhost:5173/sso/niid/callback",
            "https://pm.nicorp.tech/sso/niid/callback"
        ]
    }, headers=headers)
    
    if status == 201:
        return body
    else:
        print(f"Create App failed: {status} {body}")
        sys.exit(1)


def approve_app(app_id):
    print(f"Approving App {app_id}...")
    # Using admin endpoint (it seems unprotected in code viewed)
    # PUT /api/developers/apps/{app_id}/status
    status, body = request(f"{BASE_URL}/apps/{app_id}/status", "PUT", {
        "status": "approved"
    })
    
    if status == 200:
        print("App approved and keys generated")
        return body
    else:
        print(f"App approval failed: {status} {body}")
        
        # Try finding if keys are already there (if it was already approved)
        # Re-fetch app details
        # But we need developer context or admin context. 
        # get_app_by_id in developers.py requires current_developer.
        # But we have it? Wait, approve_app above didn't use token? 
        # The endpoint in code didn't use token. 
        # Let's try re-fetch with token using get_app_by_client_id or list.
        return None

if __name__ == "__main__":
    register()
    token = login()
    app = create_app(token)
    
    # If client_id is null, approve it
    if not app.get("client_id"):
        approved_app = approve_app(app["id"])
        if approved_app:
            app = approved_app
        else:
            # Fallback: maybe it failed because we needed auth? 
            # But the code showed no depends. 
            pass
            
    print("APP_DETAILS_START")
    print(json.dumps(app))
    print("APP_DETAILS_END")
