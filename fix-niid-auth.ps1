# NIID SSO Authentication Fix - Automated Implementation Script (Windows PowerShell)
# Run this script from the project-monitor root directory

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   NIID SSO Authentication Fix - Container Rebuild Script      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-Not (Test-Path "front\.env")) {
    Write-Host "❌ ERROR: front\.env not found!" -ForegroundColor Red
    Write-Host "Please create front\.env with the following content:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "VITE_NIID_CLIENT_ID=Qsl3U0qBryglR-3YkbuH7g"
    Write-Host "VITE_NIID_SSO_URL=http://localhost:11706"
    Write-Host "VITE_NIID_API_URL=http://localhost:11700"
    Write-Host ""
    exit 1
}

Write-Host "✅ Found front\.env" -ForegroundColor Green
Write-Host "Contents:"
Get-Content front\.env
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Step 1: Stopping existing containers..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
docker-compose down
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Step 2: Rebuilding frontend container with --no-cache..." -ForegroundColor Yellow
Write-Host "  (This ensures .env is read fresh during build)" -ForegroundColor Gray
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
docker-compose build --no-cache frontend
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "Step 3: Starting all services..." -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
docker-compose up -d
Write-Host ""

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                   ✅ Implementation Complete!                   ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Open browser: http://localhost:7670" -ForegroundColor White
Write-Host "2. Click 'Continue with NIID'" -ForegroundColor White
Write-Host "3. Should redirect to NIID login (NOT error page)" -ForegroundColor White
Write-Host ""
Write-Host "For troubleshooting, see: NIID_AUTH_FIX.md" -ForegroundColor Gray
