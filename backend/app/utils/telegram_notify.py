import requests
from typing import Optional
from ..config import TELEGRAM_BOT_TOKEN


def send_telegram_message(chat_id: int, text: str) -> bool:
    if not TELEGRAM_BOT_TOKEN or not chat_id:
        return False
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True}
        resp = requests.post(url, json=payload, timeout=5)
        return resp.status_code == 200
    except Exception:
        return False


