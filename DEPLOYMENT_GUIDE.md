# Deployment Guide for Multiple Search Results Fix

## Issue Fixed
The search functionality was only returning the first matching member instead of all matching members for the same phone number.

## Changes Made

### Backend Changes (Code.gs)
- Modified `handleSearch` function to collect ALL matching members instead of returning the first match
- Changed response format from `{ok: true, member: {...}}` to `{ok: true, results: [...], count: number}`
- Added backward compatibility support

### Frontend Changes (useMemberSearch.ts)
- Updated to handle both old single member format and new multiple results format
- Added proper array handling for multiple results

## Deployment Steps

### 1. Deploy Backend Changes
1. Open Google Apps Script: https://script.google.com
2. Open your project (the one linked to your spreadsheet)
3. Copy the updated `Code.gs` content from `/gas-backend/Code.gs`
4. Paste it into the Google Apps Script editor
5. Click "Deploy" > "New deployment"
6. Select "Web app" as type
7. Set execute as "Me" and access to "Anyone"
8. Click "Deploy"
9. Copy the new deployment URL and update your `.env.local` file

### 2. Test the Fix
After deployment, test with:
```bash
curl -L "YOUR_DEPLOYED_URL/exec?fn=search&phone=82129505610&branch=kuningan"
```

Expected response format:
```json
{
  "ok": true,
  "results": [
    {"member_id": "001", "name": "Member 1", ...},
    {"member_id": "002", "name": "Member 2", ...},
    // ... more members
  ],
  "count": 6
}
```

### 3. Frontend Testing
1. Ensure the development server is running: `npm run dev`
2. Open http://localhost:3000
3. Search for phone number "82129505610"
4. Verify it shows all 6 matching members

## Files Modified
- `/gas-backend/Code.gs` - Backend search logic
- `/src/hooks/useMemberSearch.ts` - Frontend response handling

## Notes
- The frontend includes backward compatibility for the old response format
- No database schema changes required
- The fix maintains all existing functionality while adding multiple results support