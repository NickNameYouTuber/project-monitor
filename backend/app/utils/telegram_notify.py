import os
import requests


TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")


def send_telegram_message_safe(chat_id: str, text: str) -> None:
    if not TELEGRAM_BOT_TOKEN:
        return
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        requests.post(url, json={"chat_id": chat_id, "text": text}, timeout=5)
    except Exception:
        # Silent fail
        pass

