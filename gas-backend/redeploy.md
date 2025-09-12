# Redeployment Instructions

After making CORS fixes to the Google Apps Script, you need to redeploy it:

## Steps to Redeploy:

1. **Open Google Apps Script**:
   - Go to https://script.google.com
   - Open your existing project

2. **Update the Code**:
   - Copy the updated `Code.gs` content
   - Paste it into the Apps Script editor
   - Save the project (Ctrl+S or Cmd+S)

3. **Deploy New Version**:
   - Click "Deploy" > "New deployment"
   - Choose "Web app" as the type
   - Set description: "CORS fixes for browser compatibility"
   - Set execution as: "Me"
   - Set access: "Anyone"
   - Click "Deploy"

4. **Update URL (if changed)**:
   - Copy the new web app URL
   - Update your `.env.local` file with the new URL
   - Restart your development server

## Testing After Deployment:

1. Test the health check:
   ```bash
   curl "YOUR_NEW_URL"
   ```

2. Test the search function:
   ```bash
   curl "YOUR_NEW_URL?fn=search&branch=bsd&phone=82129506"
   ```

3. Test in browser:
   - Open your Next.js app
   - Try searching for a phone number
   - Check browser console for any remaining errors

## Common Issues:

- **Authorization required**: You may need to re-authorize the script
- **URL changed**: Update your environment variables
- **Cache issues**: Clear browser cache or try incognito mode