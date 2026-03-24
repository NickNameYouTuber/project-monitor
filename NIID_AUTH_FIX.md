# NIID SSO Authentication Fix - Implementation Guide

## Problem Summary
The `invalid_request` error from NIID occurs when the frontend sends an unrecognized client_id. This happens because Vite needs the `.env` file at **build time** to embed environment variables into the bundle.

## What Was Fixed

### 1. ✅ Created `.env.example` 
- **File**: `front/.env.example`
- **Purpose**: Documents required NIID configuration variables
- **Use**: Reference this file to set up your actual `.env`

### 2. ✅ Updated Frontend Dockerfile
- **File**: `front/Dockerfile`
- **Change**: Added explicit `COPY .env* ./` before npm install
- **Purpose**: Ensures Vite can read environment variables during build

### 3. ✅ Verified Configuration
- **Backend**: `docker-compose.yml` has correct NIID credentials
  - `NIID_CLIENT_ID=Qsl3U0qBryglR-3YkbuH7g`
  - `NIID_CLIENT_SECRET=N46sgUQ9Pbfc0l8pN9iIMJ3jjcoixip3YEHL7rWLRho`
- **Frontend**: `.env` file exists with correct client_id

## Next Steps - Complete These Now

### Step 1: Verify Frontend `.env` File
Check that `front/.env` exists and contains:
```
VITE_NIID_CLIENT_ID=Qsl3U0qBryglR-3YkbuH7g
VITE_NIID_SSO_URL=http://localhost:11706
VITE_NIID_API_URL=http://localhost:11700
```

If `.env` doesn't exist, create it with the contents above.

### Step 2: Rebuild Frontend Container
Run these commands in your terminal:

```bash
# Navigate to project-monitor directory
cd c:\Users\nick\Music\project-monitor

# Stop all containers
docker-compose down

# Rebuild frontend with .env vars properly embedded
docker-compose build --no-cache frontend

# Start all services
docker-compose up -d
```

The `--no-cache` flag ensures a fresh build that reads the updated `.env` file.

### Step 3: Verify the Fix Works

1. **Open browser** to `http://localhost:7670`

2. **Check the page loads** with "Continue with NIID" button

3. **Click the button** and verify:
   - ✅ Redirects to NIID login page (at `http://localhost:11706`)
   - ❌ Does NOT show error page with "invalid_request"

4. **After login**:
   - ✅ Redirects back to callback with `code=...` parameter
   - ✅ Frontend exchanges code for token
   - ✅ Successfully navigates to `/organizations` dashboard

### Step 4: Troubleshooting

If you still see `invalid_request` error:

**Check 1: Frontend Logs**
```bash
docker logs project-monitor-frontend
```
Look for any build errors or warnings about env variables.

**Check 2: Browser Console (F12)**
- Check Network tab when clicking "Continue with NIID"
- Look at the request URL to see what client_id was sent
- It should show `client_id=Qsl3U0qBryglR-3YkbuH7g`

**Check 3: Backend Logs**
```bash
docker logs project-monitor-backend | grep -i niid
```
Should show successful NIID token exchange.

**Check 4: NIID Registration**
If the error persists, the app may not be registered in NIID. Run:
```bash
cd c:\Users\nick\Music\NIID
python setup_local_integration.py
```
This script will:
- Register project-monitor app in NIID
- Generate new credentials
- Update docker-compose.yml and front/.env automatically

### Step 5: Verify Build Variables Are Embedded

To confirm the fix worked, check browser DevTools:

```javascript
// In browser console, type:
import.meta.env.VITE_NIID_CLIENT_ID
// Should output: Qsl3U0qBryglR-3YkbuH7g
// NOT: WNG_42Met8abLocsiRQQ3Q (old hardcoded value)
```

---

## Summary of Changes

| File | Change | Reason |
|------|--------|--------|
| `front/.env.example` | Created | Documentation of required env vars |
| `front/Dockerfile` | Added `COPY .env* ./` | Ensures Vite reads .env at build time |
| `front/.env` | Verified | Already has correct NIID_CLIENT_ID |
| `docker-compose.yml` backend | Verified | Already has correct NIID credentials |

---

## Technical Details

**Why this fixes the issue:**
- Vite processes environment variables at **build time**, not runtime
- Vite only exposes variables starting with `VITE_` prefix
- The variable is compiled into the JavaScript bundle
- If `.env` isn't present at build time, fallbacks are used (the old hardcoded `WNG_42Met8abLocsiRQQ3Q`)
- NIID doesn't recognize the wrong client_id → `invalid_request` error

**Where the fix happens:**
```typescript
// In src/components/auth-page.tsx
clientId={import.meta.env.VITE_NIID_CLIENT_ID || 'WNG_42Met8abLocsiRQQ3Q'}
// ↑ This now gets: Qsl3U0qBryglR-3YkbuH7g (from .env via Vite build)
// Previously got: WNG_42Met8abLocsiRQQ3Q (fallback, wrong value)
```

---

## Timeline

- **Now**: Run `docker-compose build --no-cache frontend` and `docker-compose up -d`
- **Then**: Test login flow at `http://localhost:7670`
- **If error persists**: Run NIID setup script or check troubleshooting section

**Expected result:** NIID SSO authentication should work without `invalid_request` error.
