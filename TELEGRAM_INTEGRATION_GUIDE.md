# Telegram Login Widget Integration Guide

## Step 1: Create and Configure Your Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Start the chat and send the `/newbot` command
3. Follow the instructions to create a new bot:
   - Enter a display name (e.g., "Project Monitor")
   - Enter a username (e.g., "project_monitor_bot") - this must end with "bot"
4. **Save the API token** - you'll need this for configuration
5. Configure your bot for web login:
   - Send `/setdomain` to @BotFather
   - Select your bot
   - Enter `localhost` for local development
   - For production, enter your actual domain without protocol (e.g., `yourapp.com`)

## Step 2: Configure Environment Variables

### Backend Configuration:

Edit `backend/.env` file:

```bash
# Replace with your actual bot token from BotFather
TELEGRAM_BOT_TOKEN=123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi

# Replace with your bot username WITHOUT @ symbol
TELEGRAM_BOT_NAME=project_monitor_bot

# Set a secure secret key for JWT tokens
SECRET_KEY=your_secure_secret_key_here
```

### Frontend Configuration:

Edit `frontend/.env` file:

```bash
# Replace with your bot username WITHOUT @ symbol (same as backend)
VITE_TELEGRAM_BOT_NAME=project_monitor_bot

# API URL - adjust if needed for your environment
VITE_API_URL=http://localhost:7671/api
```

## Step 3: Restart Docker Containers

```bash
docker-compose down
docker-compose up -d
```

## Step 4: Test Telegram Login

1. Open your browser and navigate to http://localhost:7670
2. You should see the login screen with the Telegram Login Widget
3. Click the Telegram login button
4. Complete the Telegram authorization process
5. You should be redirected back to your application and logged in automatically

## Troubleshooting

### Widget Not Appearing:
- Check browser console for JavaScript errors
- Verify that `VITE_TELEGRAM_BOT_NAME` is set correctly
- Ensure Telegram's widget script is loading properly

### Login Not Working:
- Check backend logs for authentication errors
- Verify `TELEGRAM_BOT_TOKEN` is set correctly
- Make sure you've authorized your domain with BotFather
- During development, the hash verification is relaxed, but ensure your token is correct

### Widget Shows Error:
- Verify bot name is correct
- Ensure you've set the domain correctly with `/setdomain` in BotFather

## For Production Deployment:

When deploying to production:

1. Enable strict hash verification by uncommenting the verification code in `auth.py`
2. Set the proper domain in BotFather with `/setdomain`
3. Use HTTPS for your production environment
4. Set more secure values for `SECRET_KEY`

## Technical Details:

The integration works as follows:

1. Frontend loads Telegram Login Widget that communicates with Telegram servers
2. When user authenticates, Telegram provides user data and a hash
3. This data is sent to your backend `/auth/telegram` endpoint
4. Backend verifies the data with Telegram bot token
5. If valid, it creates or updates the user in the database
6. It then issues a JWT token that the frontend uses for subsequent requests
