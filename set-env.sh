#!/bin/bash

# Read backend .env file
if [ -f ./backend/.env ]; then
  echo "Loading backend environment variables..."
  export $(cat ./backend/.env | grep -v ^# | xargs)
fi

# Read frontend .env file
if [ -f ./frontend/.env ]; then
  echo "Loading frontend environment variables..."
  export $(cat ./frontend/.env | grep -v ^# | xargs)
fi

echo "Environment variables loaded successfully!"
echo "TELEGRAM_BOT_NAME: $TELEGRAM_BOT_NAME"
# Mask the token for security
if [ ! -z "$TELEGRAM_BOT_TOKEN" ]; then
  TOKEN_LENGTH=${#TELEGRAM_BOT_TOKEN}
  TOKEN_START=${TELEGRAM_BOT_TOKEN:0:4}
  TOKEN_END=${TELEGRAM_BOT_TOKEN: -4}
  MASKED_TOKEN="$TOKEN_START...$TOKEN_END"
  echo "TELEGRAM_BOT_TOKEN: $MASKED_TOKEN"
else
  echo "TELEGRAM_BOT_TOKEN not set!"
fi
