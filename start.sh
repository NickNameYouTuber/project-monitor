#!/bin/bash
# Start script for Project Monitor

# Display welcome message
echo "✨ Project Monitor Setup and Start Script ✨"
echo "=========================================="

# Check for .env files
if [ ! -f ./backend/.env ] || [ ! -f ./frontend/.env ]; then
  echo "⚠️ Environment files not found. Setting up default configuration..."
  
  # Create directory for scripts if it doesn't exist
  mkdir -p ./scripts
  
  # Run setup-env script if it exists
  if [ -f ./scripts/setup-env.sh ]; then
    chmod +x ./scripts/setup-env.sh
    ./scripts/setup-env.sh
  else
    echo "❌ setup-env.sh not found! Please ensure it exists in the scripts directory."
    exit 1
  fi
  
  echo "📝 Please edit the .env files now with your Telegram bot credentials."
  echo "Press Enter when you're ready to continue..."
  read -p ""
else
  echo "✅ Environment files found."
fi

# Build and start containers
echo "🔄 Starting Docker containers..."
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Display success message
echo "✅ Project Monitor started successfully!"
echo "📱 Frontend: http://localhost:7670"
echo "🔌 Backend: http://localhost:7671"
echo ""
echo "📝 To configure Telegram login:"
echo "1. Make sure you have created a bot with @BotFather"
echo "2. Use /setdomain command in BotFather chat to authorize your domain"
echo "3. Update the .env files with your bot's token and username"
echo ""
echo "📄 See TELEGRAM_SETUP.md for detailed instructions."
