#!/bin/bash
# Setup environment variables for Docker containers

# Create .env files if they don't exist
if [ ! -f ./backend/.env ]; then
  echo "Creating backend/.env file..."
  cat > ./backend/.env << EOL
# Telegram Bot Configuration
# Replace with your real Telegram bot token from @BotFather
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Replace with your bot username WITHOUT the @ symbol
# For example if your bot is @MyProjectBot, enter just: MyProjectBot
TELEGRAM_BOT_NAME=your_bot_username_here

# JWT Secret Key
SECRET_KEY=YOUR_SUPER_SECRET_KEY_REPLACE_IN_PRODUCTION
EOL
fi

if [ ! -f ./frontend/.env ]; then
  echo "Creating frontend/.env file..."
  cat > ./frontend/.env << EOL
# Telegram Bot Configuration
# Replace with your real Telegram bot username WITHOUT the @ symbol
# For example if your bot is @MyProjectBot, enter just: MyProjectBot
VITE_TELEGRAM_BOT_NAME=your_bot_username_here

# API URL - adjust if needed
VITE_API_URL=http://localhost:7671/api
EOL
fi

echo "Environment files have been set up successfully!"
echo "Please edit the .env files with your actual Telegram bot credentials before starting the containers."
