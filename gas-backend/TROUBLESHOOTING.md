# Google Apps Script ERR_ABORTED Troubleshooting Guide

## Problem Description

The frontend application shows `net::ERR_ABORTED` error when trying to access the Google Apps Script web app URL:
```
https://script.google.com/macros/s/AKfycbyOPtloM3MQ_pjiAe-u_-GC0CStwxqjvldZmjXh6p9LBcJMqp3xld4DmIQRuOGz5i0h/exec
```

## Root Cause Analysis

The `ERR_ABORTED` error occurs when the browser cancels the request before completion. Since `curl` tests work but browser requests fail, this indicates a browser-specific issue.

## Common Causes & Solutions

### 1. Deployment Access Settings

**Problem**: Web app not deployed with "Anyone" access

**Solution**:
1. Go to [script.google.com](https://script.google.com)
2. Open your Apps Script project
3. Click "Deploy" → "Manage deployments"
4. Click the edit icon (pencil) on your deployment
5. Ensure settings are:
   - **Execute as**: "Me (your-email@gmail.com)"
   - **Who has access**: "Anyone" (NOT "Anyone with Google account")
6. Click "Deploy"

### 2. Script Authorization Issues

**Problem**: Script hasn't been properly authorized for web access

**Solution**:
1. In Apps Script editor, click "Deploy" → "Test deployments"
2. Click "Execute" to test the script
3. If prompted, authorize the script:
   - Click "Review permissions"
   - Choose your Google account
   - Click "Advanced" → "Go to [Project Name] (unsafe)"
   - Click "Allow"

### 3. Deployment URL Changes

**Problem**: Deployment URL has changed after redeployment

**Solution**:
1. In Apps Script, go to "Deploy" → "Manage deployments"
2. Copy the current Web app URL
3. Update `.env.local` with the new URL:
   ```
   NEXT_PUBLIC_APPS_SCRIPT_URL=NEW_URL_HERE
   ```
4. Restart the development server

### 4. Browser Security Policies

**Problem**: Browser blocking requests due to security policies

**Solutions**:

**Option A: Test in Incognito Mode**
- Open browser in incognito/private mode
- Test the application
- If it works, clear browser cache and cookies

**Option B: Disable Browser Extensions**
- Temporarily disable ad blockers and security extensions
- Test the application

**Option C: Try Different Browser**
- Test in Chrome, Firefox, Safari, or Edge
- Some browsers have stricter CORS policies

### 5. Network/Firewall Issues

**Problem**: Corporate firewall or network blocking Google Apps Script

**Solution**:
- Test on different network (mobile hotspot)
- Contact IT department to whitelist `script.google.com` and `script.googleusercontent.com`

## Verification Steps

### Step 1: Test Direct URL Access

Open this URL directly in browser:
```
https://script.google.com/macros/s/AKfycbyOPtloM3MQ_pjiAe-u_-GC0CStwxqjvldZmjXh6p9LBcJMqp3xld4DmIQRuOGz5i0h/exec
```

Expected result: `{"ok":true,"msg":"API ready"}`

### Step 2: Test Search Function

Open this URL in browser:
```
https://script.google.com/macros/s/AKfycbyOPtloM3MQ_pjiAe-u_-GC0CStwxqjvldZmjXh6p9LBcJMqp3xld4DmIQRuOGz5i0h/exec?fn=search&branch=bsd&phone=82129506
```

Expected result: `{"ok":false,"error":"Member not found"}` or member data

### Step 3: Check Browser Console

1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Try the search function in your app
4. Look for additional error details

## Advanced Debugging

### Enable Detailed Logging

Add this to your Apps Script for debugging:

```javascript
function doGet(e) {
  console.log('doGet called with params:', e.parameter);
  console.log('Request headers:', e.headers || 'No headers');
  
  try {
    // ... existing code
  } catch (error) {
    console.error('doGet error details:', {
      message: error.message,
      stack: error.stack,
      params: e.parameter
    });
    throw error;
  }
}
```

### Check Apps Script Logs

1. In Apps Script editor, go to "Executions"
2. Look for recent executions and any error messages
3. Check the logs for detailed error information

## Quick Fix Checklist

- [ ] Verify deployment access is set to "Anyone"
- [ ] Confirm script is properly authorized
- [ ] Test URL directly in browser
- [ ] Check browser console for additional errors
- [ ] Try incognito mode
- [ ] Test with different browser
- [ ] Verify .env.local has correct URL
- [ ] Restart development server

## If Nothing Works

### Create New Deployment

1. In Apps Script, click "Deploy" → "New deployment"
2. Choose "Web app"
3. Set new version description
4. Configure:
   - Execute as: "Me"
   - Who has access: "Anyone"
5. Deploy and get new URL
6. Update `.env.local` with new URL

### Contact Support

If the issue persists, provide these details:
- Browser and version
- Operating system
- Network environment (home/corporate)
- Complete error message from browser console
- Apps Script execution logs
- Whether direct URL access works

## Prevention

- Always test deployments in multiple browsers
- Keep deployment URLs in version control comments
- Document deployment settings
- Set up monitoring for API availability
- Use staging environment for testing changes