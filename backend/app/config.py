import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "YOUR_SUPER_SECRET_KEY_REPLACE_IN_PRODUCTION")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BOT_NAME = os.getenv("TELEGRAM_BOT_NAME", "")

# Print config for debugging
if TELEGRAM_BOT_TOKEN:
    masked_token = TELEGRAM_BOT_TOKEN[:4] + "..." + TELEGRAM_BOT_TOKEN[-4:] if len(TELEGRAM_BOT_TOKEN) > 8 else "***"
    print(f"Loaded Telegram bot token: {masked_token}")
    print(f"Loaded Telegram bot name: {TELEGRAM_BOT_NAME}")
else:
    print("WARNING: No Telegram bot token found in environment variables")
