#!/bin/bash
# NIID SSO Authentication Fix - Automated Implementation Script
# Run this script from the project-monitor root directory

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   NIID SSO Authentication Fix - Container Rebuild Script      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if .env exists
if [ ! -f "front/.env" ]; then
    echo "❌ ERROR: front/.env not found!"
    echo "Please create front/.env with the following content:"
    echo ""
    echo "VITE_NIID_CLIENT_ID=Qsl3U0qBryglR-3YkbuH7g"
    echo "VITE_NIID_SSO_URL=http://localhost:11706"
    echo "VITE_NIID_API_URL=http://localhost:11700"
    echo ""
    exit 1
fi

echo "✅ Found front/.env"
echo "Contents:"
cat front/.env
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Stopping existing containers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose down
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Rebuilding frontend container with --no-cache..."
echo "  (This ensures .env is read fresh during build)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose build --no-cache frontend
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Starting all services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker-compose up -d
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                   ✅ Implementation Complete!                   ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Open browser: http://localhost:7670"
echo "2. Click 'Continue with NIID'"
echo "3. Should redirect to NIID login (NOT error page)"
echo ""
echo "For troubleshooting, see: NIID_AUTH_FIX.md"
