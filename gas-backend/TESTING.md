# Google Apps Script Testing Guide

This guide provides step-by-step instructions for testing your Google Apps Script deployment.

## Prerequisites

1. **Deploy your Google Apps Script**:
   - Follow the instructions in `DEPLOYMENT.md`
   - Get your Web App URL (should end with `/exec`)
   - Ensure it's deployed with "Execute as: Me" and "Who has access: Anyone"

2. **Prepare test data**:
   - Add sample data to your `form2025` sheet
   - Add sample activities to your `schedule2025` sheet
   - Ensure column headers match the specifications exactly

## Testing Methods

### Method 1: Using the Node.js Test Script (Recommended)

1. **Update the test script**:
   ```bash
   cd gas-backend
   # Edit test-endpoints.js and update GAS_URL with your actual URL
   ```

2. **Run the tests**:
   ```bash
   node test-endpoints.js
   ```

3. **Review results**:
   - The script will test all endpoints automatically
   - Check for CORS headers
   - Validate response structures

### Method 2: Manual Testing with curl

#### 1. Health Check

```bash
# Replace YOUR_SCRIPT_ID with your actual script ID
curl -X GET "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec" \
  -H "Content-Type: application/json" \
  -v
```

**Expected Response:**
```json
{
  "ok": true,
  "msg": "API ready"
}
```

#### 2. Member Search

```bash
# Search for members with name containing "test"
curl -X GET "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec?fn=search&name=test" \
  -H "Content-Type: application/json" \
  -v
```

**Expected Response:**
```json
{
  "ok": true,
  "results": [
    {
      "member_id": "2024-00001",
      "branch": "bsd",
      "name": "Test User",
      "birthdate": "2020-01-01",
      "parent_name": "Test Parent",
      "contact": "1234567890"
    }
  ]
}
```

#### 3. Load Schedules

```bash
# Get all available activities
curl -X GET "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec?fn=schedules" \
  -H "Content-Type: application/json" \
  -v
```

**Expected Response:**
```json
{
  "ok": true,
  "items": [
    {
      "activity_id": "66327",
      "branch": "bsd",
      "class_category": "Tennis",
      "activity_name": "Ministar Tennis - Tuesday, 03:00 pm",
      "total_slot": 5,
      "booked_slot": 3,
      "available_slot": 2
    }
  ]
}
```

#### 4. Submit Registration

```bash
# Submit a registration (this will create actual data!)
curl -X POST "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "member": {
      "member_id": "TEST-2024-00001",
      "branch": "test",
      "name": "Test User",
      "birthdate": "2020-01-01",
      "parent_name": "Test Parent",
      "contact": "1234567890"
    },
    "selections": [
      {
        "class_category": "Tennis",
        "activity_id": "66327",
        "activity_name": "Ministar Tennis - Tuesday, 03:00 pm"
      }
    ]
  }' \
  -v
```

**Expected Success Response:**
```json
{
  "ok": true,
  "msg": "Registration successful",
  "tokens": [
    "TEST-2024-00001-66327-1234567890"
  ]
}
```

#### 5. Test CORS (OPTIONS Request)

```bash
# Test preflight CORS request
curl -X OPTIONS "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec" \
  -H "Origin: https://your-frontend-domain.github.io" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**Expected Headers:**
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

## Validation Test Cases

### 1. Token Limit Tests

#### Test: Maximum 5 tokens per member
```bash
# Submit 6 selections (should fail)
curl -X POST "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "member": {...},
    "selections": [
      {"class_category": "Tennis", "activity_id": "66327", "activity_name": "Tennis 1"},
      {"class_category": "Swimming", "activity_id": "66328", "activity_name": "Swimming 1"},
      {"class_category": "Basketball", "activity_id": "66329", "activity_name": "Basketball 1"},
      {"class_category": "Football", "activity_id": "66330", "activity_name": "Football 1"},
      {"class_category": "Volleyball", "activity_id": "66331", "activity_name": "Volleyball 1"},
      {"class_category": "Badminton", "activity_id": "66332", "activity_name": "Badminton 1"}
    ]
  }'
```

**Expected Error:**
```json
{
  "ok": false,
  "error": "Maximum 5 tokens allowed per member"
}
```

#### Test: Maximum 2 tokens per class category
```bash
# Submit 3 Tennis activities (should fail)
curl -X POST "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "member": {...},
    "selections": [
      {"class_category": "Tennis", "activity_id": "66327", "activity_name": "Tennis 1"},
      {"class_category": "Tennis", "activity_id": "66328", "activity_name": "Tennis 2"},
      {"class_category": "Tennis", "activity_id": "66329", "activity_name": "Tennis 3"}
    ]
  }'
```

**Expected Error:**
```json
{
  "ok": false,
  "error": "Max 2 tokens per category exceeded: Tennis"
}
```

### 2. Capacity Tests

#### Test: Full session
```bash
# Try to register for a session with available_slot = 0
# First, manually set available_slot to 0 in your schedule2025 sheet
# Then submit registration for that activity
```

**Expected Error:**
```json
{
  "ok": false,
  "error": "Session full: Activity Name"
}
```

### 3. Validation Tests

#### Test: Invalid activity ID
```bash
# Submit with non-existent activity_id
curl -X POST "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "member": {...},
    "selections": [
      {"class_category": "Tennis", "activity_id": "INVALID", "activity_name": "Invalid Activity"}
    ]
  }'
```

**Expected Error:**
```json
{
  "ok": false,
  "error": "Activity not found: INVALID"
}
```

#### Test: Missing required fields
```bash
# Submit with missing member fields
curl -X POST "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "member": {
      "member_id": "TEST-001"
      // Missing other required fields
    },
    "selections": [...]
  }'
```

**Expected Error:**
```json
{
  "ok": false,
  "error": "Missing required member field: name"
}
```

## Troubleshooting

### Common Issues

1. **403 Forbidden Error**:
   - Check that your script is deployed with "Who has access: Anyone"
   - Verify the URL is correct and ends with `/exec`

2. **CORS Errors**:
   - Ensure `doOptions()` function is implemented
   - Check that CORS headers are set in all responses

3. **"Script function not found" Error**:
   - Verify your `doGet()` and `doPost()` functions are properly defined
   - Check for syntax errors in your script

4. **Timeout Errors**:
   - Google Apps Script has a 6-minute execution limit
   - Check for infinite loops or inefficient queries

5. **Permission Errors**:
   - Ensure the script has permission to access your Google Sheets
   - Re-authorize if necessary

### Debugging Tips

1. **Use Logger.log()** in your script to debug:
   ```javascript
   Logger.log('Debug info: ' + JSON.stringify(data));
   ```

2. **Check execution transcript** in Google Apps Script editor:
   - Go to "Executions" tab to see detailed logs

3. **Test individual functions** in the script editor:
   - Use the "Run" button to test functions directly

4. **Validate sheet structure**:
   - Ensure column headers match exactly
   - Check for extra spaces or special characters

## Next Steps

Once all tests pass:

1. **Update frontend configuration**:
   ```bash
   # Copy environment file
   cp .env.example .env.local
   
   # Edit .env.local and set your GAS URL
   NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec
   ```

2. **Test frontend integration**:
   ```bash
   npm run dev
   # Open http://localhost:3000 and test the full flow
   ```

3. **Deploy to production**:
   ```bash
   npm run build
   npm run export
   # Deploy the `out` folder to GitHub Pages
   ```

## Performance Testing

For production readiness, consider testing:

1. **Concurrent registrations**: Simulate multiple users registering simultaneously
2. **Large datasets**: Test with realistic amounts of data in your sheets
3. **Rate limiting**: Verify the rate limiting works as expected
4. **Error recovery**: Test how the system handles various error conditions

Remember to clean up any test data from your sheets after testing!