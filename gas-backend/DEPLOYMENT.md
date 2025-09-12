# Google Apps Script Backend Deployment Guide

## Prerequisites

1. **Google Account** with access to Google Drive and Google Sheets
2. **Two Google Sheets** set up with the exact structure:
   - `form` - Registration data storage
   - `schedule` - Activity schedules and availability

## Sheet Setup

### 1. Create form Sheet

Create a Google Sheet with these exact column headers in row 1:
```
member_id | branch | name | birthdate | activity_name | parent_name | contact | token
```

**Column Descriptions:**
- `member_id`: Unique identifier (e.g., "001-2024-15684")
- `branch`: Location/branch (e.g., "bsd", "kng")
- `name`: Member's full name
- `birthdate`: Date in YYYY-MM-DD format
- `activity_name`: Full activity description (e.g., "Ministar Tennis - Tuesday, 03:00 pm")
- `parent_name`: Parent/guardian name
- `contact`: Contact number
- `token`: Sequential token number (1-5)

### 2. Create schedule Sheet

Create a Google Sheet with these exact column headers in row 1:
```
activity_id | branch | class_category | activity_name | total_slot | booked_slot | available_slot
```

**Column Descriptions:**
- `activity_id`: Unique identifier (e.g., "66327")
- `branch`: Location/branch (e.g., "bsd", "kng")
- `class_category`: Category (e.g., "Tennis", "Basketball")
- `activity_name`: Full activity description
- `total_slot`: Maximum capacity
- `booked_slot`: Currently booked slots
- `available_slot`: Remaining slots (total_slot - booked_slot)

**Sample Data for schedule2025:**
```
66327 | bsd | Tennis | Ministar Tennis - Tuesday, 03:00 pm | 5 | 3 | 2
66331 | bsd | Basketball | Ministar Basketball - Tuesday, 02:00 pm | 8 | 5 | 3
66335 | kng | Swimming | Swimming Beginner - Wednesday, 04:00 pm | 6 | 2 | 4
```

## Google Apps Script Deployment

### Step 1: Create New Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click "New project"
3. Replace the default `Code.gs` content with the provided backend code
4. Save the project with a meaningful name (e.g., "Activity Registration Backend")

### Step 2: Configure Sheet IDs

1. Get the Sheet IDs from your Google Sheets URLs:
   - Form sheet: `https://docs.google.com/spreadsheets/d/FORM_SHEET_ID/edit`
   - Schedule sheet: `https://docs.google.com/spreadsheets/d/SCHEDULE_SHEET_ID/edit`

2. Update the configuration constants in `Code.gs`:
```javascript
const FORM_SHEET_ID = 'YOUR_ACTUAL_FORM2025_SHEET_ID';
const SCHEDULE_SHEET_ID = 'YOUR_ACTUAL_SCHEDULE2025_SHEET_ID';
```

### Step 3: Deploy as Web App

1. In the Apps Script editor, click "Deploy" → "New deployment"
2. Choose type: "Web app"
3. Configure deployment settings:
   - **Description**: "Activity Registration API v1"
   - **Execute as**: "Me (your-email@gmail.com)"
   - **Who has access**: "Anyone"
4. Click "Deploy"
5. **Copy the Web App URL** - you'll need this for the frontend

### Step 4: Grant Permissions

1. When prompted, click "Authorize access"
2. Choose your Google account
3. Click "Advanced" → "Go to [Project Name] (unsafe)"
4. Click "Allow" to grant necessary permissions

### Step 5: Test the Deployment

Test the health check endpoint:
```bash
curl "YOUR_WEB_APP_URL"
```

Expected response:
```json
{"ok":true,"msg":"API ready"}
```

## Frontend Integration

### Update Environment Configuration

1. In your Next.js project, create or update `.env.local`:
```env
NEXT_PUBLIC_APPS_SCRIPT_URL=YOUR_WEB_APP_URL
```

2. Replace `YOUR_WEB_APP_URL` with the actual URL from Step 3

### Verify Integration

1. Start your Next.js development server:
```bash
npm run dev
```

2. Open the application and test:
   - Member search functionality
   - Schedule loading
   - Registration submission

## Security Considerations

### Rate Limiting
The backend includes basic rate limiting (2 requests per minute per IP). For production use, consider:
- Implementing more sophisticated rate limiting
- Adding reCAPTCHA verification
- Monitoring for abuse patterns

### Data Validation
The backend performs comprehensive validation:
- Input sanitization and length checks
- Token limit enforcement (max 5 total, max 2 per category)
- Capacity validation with race condition prevention
- Duplicate submission prevention

### Access Control
The Web App is configured for "Anyone" access to support public registration. Consider:
- Implementing API keys for additional security
- Adding request logging for audit trails
- Setting up monitoring and alerts

## Troubleshooting

### Common Issues

1. **"Script function not found" error**
   - Ensure the deployment is set to execute as "Me"
   - Verify the script has been saved

2. **CORS errors in browser**
   - Check that `doOptions()` function is implemented
   - Verify CORS headers are being set correctly

3. **"Permission denied" errors**
   - Re-authorize the script permissions
   - Check that the Google Sheets are accessible by the script owner

4. **Rate limiting issues**
   - Adjust `MAX_REQUESTS_PER_MINUTE` constant if needed
   - Clear the cache service if testing frequently

### Debugging

1. **View Logs**:
   - In Apps Script editor: "Execution transcript"
   - Check `console.log()` outputs

2. **Test Individual Functions**:
   - Use the Apps Script editor's "Run" button
   - Test with sample data

3. **Monitor Sheet Changes**:
   - Verify data is being written to sheets correctly
   - Check that available_slot calculations are accurate

## Maintenance

### Regular Tasks

1. **Monitor Sheet Capacity**:
   - Ensure sheets don't exceed Google's limits
   - Archive old data if necessary

2. **Update Schedules**:
   - Keep schedule2025 current with available activities
   - Update capacity as needed

3. **Review Logs**:
   - Check for errors or unusual patterns
   - Monitor registration volumes

### Backup Strategy

1. **Export Sheet Data**:
   - Regular exports to CSV/Excel
   - Store in Google Drive or external backup

2. **Script Versioning**:
   - Use Apps Script's version management
   - Keep deployment notes for changes

## Production Deployment

For production use:

1. **Create Production Sheets**:
   - Separate sheets for production data
   - Update sheet IDs in the script

2. **Deploy New Version**:
   - Create new deployment for production
   - Update frontend environment variables

3. **Monitor Performance**:
   - Set up Google Cloud Monitoring if needed
   - Monitor response times and error rates

4. **Documentation**:
   - Keep API documentation updated
   - Document any customizations or changes