import requests
from typing import Optional, Dict

API_BASE_URL = "https://your-nigit-instance.com/api"
API_KEY = "ipk_your_api_key_here"
API_SECRET = "ips_your_api_secret_here"


def authenticate_user(email: str, password: str) -> Optional[Dict]:
    headers = {
        "X-API-Key": API_KEY,
        "X-API-Secret": API_SECRET,
        "Content-Type": "application/json"
    }
    
    payload = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/identity-provider/authenticate",
            json=payload,
            headers=headers
        )
        
        data = response.json()
        
        if data.get("success"):
            print("Authentication successful")
            print(f"User info: {data.get('user')}")
            return data.get("user")
        else:
            print(f"Authentication failed: {data.get('message')}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"Error during authentication: {e}")
        return None


def handle_webhook(request_data: Dict) -> Dict:
    event = request_data.get("event")
    
    if event == "password_changed":
        email = request_data.get("email")
        org_id = request_data.get("organization_id")
        timestamp = request_data.get("timestamp")
        
        print(f"Password changed for user: {email}")
        print(f"Organization: {org_id}")
        print(f"Timestamp: {timestamp}")
        
        return {"success": True}
    else:
        return {"success": False, "message": "Unknown event"}


if __name__ == "__main__":
    user = authenticate_user("user@company.com", "password123")
    if user:
        print(f"Authenticated user ID: {user.get('user_id')}")

