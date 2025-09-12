# QA Testing Checklist - Activity Registration System

This document provides a comprehensive testing checklist to verify the activity registration system works correctly across all scenarios.

## Pre-Testing Setup

### Backend Setup
- [ ] Google Apps Script deployed as Web App
- [ ] Sheet IDs configured correctly in Code.gs
- [ ] form2025 sheet has correct column headers
- [ ] schedule2025 sheet has correct column headers and sample data
- [ ] Web App permissions set to "Anyone" access
- [ ] CORS headers working (test with browser dev tools)

### Frontend Setup
- [ ] Next.js application running (`npm run dev`)
- [ ] `NEXT_PUBLIC_APPS_SCRIPT_URL` environment variable set
- [ ] No console errors on page load
- [ ] All components rendering correctly

### Test Data Setup

**form2025 Sample Data**:
```
member_id       | branch | name           | birthdate  | activity_name                        | parent_name | contact      | token
001-2024-15684  | bsd    | Amara Isabella | 2020-11-09 | Ministar Tennis - Tuesday, 03:00 pm | Bahrul      | 82129505610  | 1
001-2024-15684  | bsd    | Amara Isabella | 2020-11-09 | Ministar Tennis - Thursday, 04:00 pm| Bahrul      | 82129505610  | 2
002-2024-15685  | kng    | John Smith     | 2019-05-15 | Basketball Beginner - Monday, 02:00 pm| Sarah Smith | 81234567890  | 1
```

**schedule2025 Sample Data**:
```
activity_id | branch | class_category | activity_name                        | total_slot | booked_slot | available_slot
66327       | bsd    | Tennis         | Ministar Tennis - Tuesday, 03:00 pm | 5          | 3           | 2
66328       | bsd    | Tennis         | Ministar Tennis - Thursday, 04:00 pm| 4          | 2           | 2
66329       | bsd    | Tennis         | Advanced Tennis - Friday, 05:00 pm  | 6          | 1           | 5
66331       | bsd    | Basketball     | Basketball Beginner - Monday, 02:00 pm| 8        | 5           | 3
66332       | bsd    | Basketball     | Basketball Advanced - Wednesday, 03:00 pm| 6      | 2           | 4
66333       | kng    | Swimming       | Swimming Beginner - Tuesday, 04:00 pm| 10        | 7           | 3
66334       | kng    | Swimming       | Swimming Advanced - Thursday, 05:00 pm| 8        | 8           | 0
66335       | bsd    | Gymnastics     | Gymnastics Basic - Monday, 03:00 pm | 12         | 5           | 7
```

---

## API Testing (Backend)

### 1. Health Check Endpoint

**Test Case**: Basic connectivity
```bash
curl "YOUR_WEB_APP_URL"
```

**Expected Result**:
- [ ] Status: 200 OK
- [ ] Response: `{"ok":true,"msg":"API ready"}`
- [ ] Content-Type: application/json
- [ ] CORS headers present

---

### 2. Member Search Endpoint

**Test Case 2.1**: Valid phone search with results
```bash
curl "YOUR_WEB_APP_URL?fn=search&branch=bsd&phone=82129505610"
```

**Expected Result**:
- [ ] Status: 200 OK
- [ ] Returns member with matching phone number in specified branch
- [ ] All required fields present (member_id, branch, name, birthdate, parent_name, contact)
- [ ] Birthdate in YYYY-MM-DD format

**Test Case 2.2**: Phone search with no results
```bash
curl "YOUR_WEB_APP_URL?fn=search&branch=bsd&phone=99999999999"
```

**Expected Result**:
- [ ] Status: 200 OK
- [ ] Response: `{"ok":true,"results":[]}`

**Test Case 2.3**: Phone number normalization
```bash
curl "YOUR_WEB_APP_URL?fn=search&branch=bsd&phone=082129505610"
curl "YOUR_WEB_APP_URL?fn=search&branch=bsd&phone=6282129505610"
curl "YOUR_WEB_APP_URL?fn=search&branch=bsd&phone=+6282129505610"
```

**Expected Result**:
- [ ] All three requests return the same results
- [ ] Phone number normalization works correctly

**Test Case 2.4**: Branch isolation
```bash
curl "YOUR_WEB_APP_URL?fn=search&branch=bsd&phone=82129505610"
curl "YOUR_WEB_APP_URL?fn=search&branch=kuningan&phone=82129505610"
```

**Expected Result**:
- [ ] BSD branch returns member if exists in BSD
- [ ] Kuningan branch returns empty if member only exists in BSD
- [ ] Branch filtering works correctly

**Test Case 2.5**: Missing required parameters
```bash
curl "YOUR_WEB_APP_URL?fn=search"
curl "YOUR_WEB_APP_URL?fn=search&branch=bsd"
curl "YOUR_WEB_APP_URL?fn=search&phone=82129505610"
```

**Expected Result**:
- [ ] Status: 400 Bad Request
- [ ] Response: `{"ok":false,"error":"Branch and phone parameters are required"}`

**Test Case 2.6**: Empty parameters
```bash
curl "YOUR_WEB_APP_URL?fn=search&branch=&phone="
```

**Expected Result**:
- [ ] Status: 400 Bad Request
- [ ] Response: `{"ok":false,"error":"Branch and phone parameters are required"}`

---

### 3. Schedules Endpoint

**Test Case 3.1**: Load schedules for specific branch
```bash
curl "YOUR_WEB_APP_URL?fn=schedules&branch=bsd"
```

**Expected Result**:
- [ ] Status: 200 OK
- [ ] Returns array of schedule items for BSD branch only
- [ ] All required fields present (activity_id, branch, class_category, activity_name, total_slot, booked_slot, available_slot)
- [ ] Numeric fields are numbers, not strings
- [ ] available_slot = total_slot - booked_slot
- [ ] All returned items have branch = "bsd"

**Test Case 3.2**: Load schedules for different branch
```bash
curl "YOUR_WEB_APP_URL?fn=schedules&branch=kuningan"
```

**Expected Result**:
- [ ] Status: 200 OK
- [ ] Returns array of schedule items for Kuningan branch only
- [ ] All returned items have branch = "kuningan"
- [ ] Different activities than BSD branch

**Test Case 3.3**: Missing branch parameter
```bash
curl "YOUR_WEB_APP_URL?fn=schedules"
```

**Expected Result**:
- [ ] Status: 400 Bad Request
- [ ] Response: `{"ok":false,"error":"Branch parameter is required"}`

**Test Case 3.4**: Verify specific schedule data

**Expected Result**:
- [ ] Activity 66327 shows available_slot = 2 (BSD branch)
- [ ] Activity 66334 shows available_slot = 0 (full session, Kuningan branch)
- [ ] Branch filtering works correctly

---

### 4. Registration Submission Endpoint

**Test Case 4.1**: Valid single selection
```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "member": {
      "member_id": "003-2024-15686",
      "branch": "bsd",
      "name": "Test User",
      "birthdate": "2021-01-01",
      "parent_name": "Test Parent",
      "contact": "81234567890"
    },
    "selections": [
      {
        "class_category": "Basketball",
        "activity_id": "66331",
        "activity_name": "Basketball Beginner - Monday, 02:00 pm"
      }
    ]
  }'
```

**Expected Result**:
- [ ] Status: 200 OK
- [ ] Response: `{"ok":true}`
- [ ] New row added to form2025 sheet
- [ ] schedule2025 booked_slot incremented
- [ ] schedule2025 available_slot decremented

**Test Case 4.2**: Valid multiple selections (different categories)
```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "member": {
      "member_id": "004-2024-15687",
      "branch": "bsd",
      "name": "Multi User",
      "birthdate": "2020-06-15",
      "parent_name": "Multi Parent",
      "contact": "81234567891"
    },
    "selections": [
      {
        "class_category": "Tennis",
        "activity_id": "66327",
        "activity_name": "Ministar Tennis - Tuesday, 03:00 pm"
      },
      {
        "class_category": "Basketball",
        "activity_id": "66331",
        "activity_name": "Basketball Beginner - Monday, 02:00 pm"
      },
      {
        "class_category": "Swimming",
        "activity_id": "66333",
        "activity_name": "Swimming Beginner - Tuesday, 04:00 pm"
      }
    ]
  }'
```

**Expected Result**:
- [ ] Status: 200 OK
- [ ] Response: `{"ok":true}`
- [ ] Three rows added to form2025 sheet
- [ ] Token numbers: 1, 2, 3
- [ ] All schedule slots updated correctly

**Test Case 4.3**: Maximum selections (5 tokens)
```bash
# Create request with 5 selections across different categories
```

**Expected Result**:
- [ ] Status: 200 OK
- [ ] All 5 selections processed
- [ ] Token numbers: 1, 2, 3, 4, 5

**Test Case 4.4**: Exceed maximum selections (6 tokens)
```bash
# Create request with 6 selections
```

**Expected Result**:
- [ ] Status: 400 Bad Request
- [ ] Response: `{"ok":false,"error":"Maximum 5 selections allowed"}`
- [ ] No data written to sheets

**Test Case 4.5**: Category limit (2 per category)
```bash
# Create request with 2 Tennis selections
```

**Expected Result**:
- [ ] Status: 200 OK (2 Tennis selections allowed)

**Test Case 4.6**: Exceed category limit (3 in same category)
```bash
# Create request with 3 Tennis selections
```

**Expected Result**:
- [ ] Status: 400 Bad Request
- [ ] Response: `{"ok":false,"error":"Max 2 tokens per category exceeded: Tennis"}`
- [ ] No data written to sheets

**Test Case 4.7**: Invalid activity_id
```bash
# Create request with non-existent activity_id
```

**Expected Result**:
- [ ] Status: 400 Bad Request
- [ ] Response: `{"ok":false,"error":"Invalid activity_id: 99999"}`

**Test Case 4.8**: Full session (available_slot = 0)
```bash
# Create request for activity_id 66334 (Swimming Advanced - full)
```

**Expected Result**:
- [ ] Status: 400 Bad Request
- [ ] Response: `{"ok":false,"error":"Session full: Swimming Advanced - Thursday, 05:00 pm"}`

**Test Case 4.9**: Missing member fields
```bash
# Create request with missing member.name
```

**Expected Result**:
- [ ] Status: 400 Bad Request
- [ ] Response: `{"ok":false,"error":"Member name is required"}`

**Test Case 4.10**: Invalid JSON
```bash
curl -X POST "YOUR_WEB_APP_URL" \
  -H "Content-Type: application/json" \
  -d '{invalid json}'
```

**Expected Result**:
- [ ] Status: 400 Bad Request
- [ ] Response: `{"ok":false,"error":"Invalid JSON payload"}`

---

## Frontend Testing (UI)

### 1. Page Load and Initial State

**Test Case 1.1**: Application loads correctly
- [ ] Navigate to http://localhost:3000
- [ ] Page loads without errors
- [ ] All components render correctly
- [ ] No console errors in browser dev tools

**Test Case 1.2**: Initial component states
- [ ] NameSearchCard is visible and enabled
- [ ] Branch selector shows available branches (BSD, Kuningan)
- [ ] Phone input field is empty and enabled
- [ ] IdentityCard is hidden
- [ ] ProgressBanner shows "0/5 tokens"
- [ ] TokenSelectionCard is hidden
- [ ] SubmitCard is hidden

### 2. Member Search Flow

**Test Case 2.1**: Successful phone search
- [ ] Select "BSD" branch
- [ ] Enter "82129505610" in phone field
- [ ] Click "Search Members"
- [ ] Loading state appears briefly
- [ ] Search results appear
- [ ] "Amara Isabella" is in results
- [ ] Click "Choose this member"
- [ ] IdentityCard becomes visible
- [ ] Member details populate correctly

**Test Case 2.2**: No search results
- [ ] Select "BSD" branch
- [ ] Enter "99999999999" in phone field
- [ ] Click "Search Members"
- [ ] "No members found" message appears
- [ ] IdentityCard remains hidden

**Test Case 2.3**: Phone number validation
- [ ] Enter invalid phone number (e.g., "123")
- [ ] Click "Search Members"
- [ ] Validation error appears
- [ ] Search is not performed

**Test Case 2.4**: Branch isolation
- [ ] Select "BSD" branch, enter "82129505610"
- [ ] Search returns member
- [ ] Change to "Kuningan" branch, same phone
- [ ] Search returns no results (if member only in BSD)
- [ ] Branch filtering works correctly

**Test Case 2.5**: Search error handling
- [ ] Temporarily break backend URL
- [ ] Attempt search
- [ ] Error message appears
- [ ] User can retry

### 3. Token Selection Flow

**Test Case 3.1**: First token selection
- [ ] After selecting member, TokenSelectionCard appears
- [ ] "Token 1" is displayed
- [ ] Category dropdown shows all available categories
- [ ] Select "Tennis" category
- [ ] Activity dropdown shows Tennis activities
- [ ] Only activities with available_slot > 0 are shown
- [ ] Select an activity
- [ ] ProgressBanner updates to "1/5 tokens • Tennis 1/2"
- [ ] Second TokenSelectionCard appears

**Test Case 3.2**: Category limit enforcement
- [ ] Select 2 Tennis activities
- [ ] ProgressBanner shows "Tennis 2/2"
- [ ] In next token selection, Tennis category is disabled/hidden
- [ ] Other categories remain available

**Test Case 3.3**: Maximum tokens reached
- [ ] Select 5 activities across different categories
- [ ] ProgressBanner shows "5/5 tokens"
- [ ] No additional TokenSelectionCard appears
- [ ] SubmitCard becomes visible

**Test Case 3.4**: Remove token functionality
- [ ] Select 3 tokens
- [ ] Click "Remove" on second token
- [ ] Token is removed from list
- [ ] Subsequent tokens renumber correctly
- [ ] ProgressBanner updates correctly
- [ ] Category limits recalculate

### 4. Submission Flow

**Test Case 4.1**: Successful submission
- [ ] Select valid tokens (1-5)
- [ ] Click "Submit Registration"
- [ ] Loading state appears
- [ ] Success message appears
- [ ] "Registration submitted successfully!" toast
- [ ] Form resets to initial state

**Test Case 4.2**: Submission validation errors
- [ ] Submit with invalid data (simulate backend error)
- [ ] Error message appears in alert
- [ ] Selections are preserved
- [ ] User can modify and retry

**Test Case 4.3**: Session full error
- [ ] Select an activity that becomes full
- [ ] Submit registration
- [ ] "Session full" error appears
- [ ] Selections preserved for modification

### 5. Responsive Design

**Test Case 5.1**: Mobile view (375px width)
- [ ] All components stack vertically
- [ ] Text remains readable
- [ ] Buttons are touch-friendly
- [ ] No horizontal scrolling

**Test Case 5.2**: Tablet view (768px width)
- [ ] Layout adapts appropriately
- [ ] Components use available space well

**Test Case 5.3**: Desktop view (1200px+ width)
- [ ] Layout is centered and well-proportioned
- [ ] No excessive white space

### 6. Accessibility

**Test Case 6.1**: Keyboard navigation
- [ ] Tab through all interactive elements
- [ ] Focus indicators visible
- [ ] Enter/Space activate buttons
- [ ] Escape closes dropdowns

**Test Case 6.2**: Screen reader compatibility
- [ ] All form fields have labels
- [ ] Error messages are announced
- [ ] Loading states are announced
- [ ] Success messages are announced

---

## Integration Testing

### 1. Race Condition Testing

**Test Case 1.1**: Concurrent submissions for last slot
- [ ] Set up activity with available_slot = 1
- [ ] Open two browser windows
- [ ] Both users select the same activity
- [ ] Submit simultaneously
- [ ] One succeeds, one gets "Session full" error
- [ ] Schedule updated correctly

**Test Case 1.2**: Lock service timeout
- [ ] Simulate long-running operation
- [ ] Verify timeout handling
- [ ] "System busy" message appears

### 2. Data Consistency Testing

**Test Case 2.1**: Form sheet data integrity
- [ ] Submit registration
- [ ] Verify all columns populated correctly
- [ ] Token numbers sequential
- [ ] Member data consistent across rows

**Test Case 2.2**: Schedule sheet updates
- [ ] Note initial booked_slot values
- [ ] Submit registration
- [ ] Verify booked_slot incremented
- [ ] Verify available_slot decremented
- [ ] Calculations are correct

### 3. Error Recovery Testing

**Test Case 3.1**: Network interruption
- [ ] Start submission
- [ ] Disconnect network mid-request
- [ ] Verify error handling
- [ ] Reconnect and retry

**Test Case 3.2**: Backend unavailable
- [ ] Stop Google Apps Script
- [ ] Attempt operations
- [ ] Verify graceful error messages
- [ ] Restart backend and verify recovery

---

## Performance Testing

### 1. Response Time Testing

**Test Case 1.1**: API response times
- [ ] Health check: < 100ms
- [ ] Member search: < 500ms
- [ ] Load schedules: < 1000ms
- [ ] Submit registration: < 2000ms

**Test Case 1.2**: Frontend rendering
- [ ] Initial page load: < 2 seconds
- [ ] Component state changes: < 100ms
- [ ] Form interactions: Immediate feedback

### 2. Load Testing

**Test Case 2.1**: Multiple concurrent users
- [ ] Simulate 5-10 concurrent users
- [ ] All operations complete successfully
- [ ] No data corruption
- [ ] Reasonable response times maintained

---

## Security Testing

### 1. Input Validation

**Test Case 1.1**: XSS prevention
- [ ] Enter `<script>alert('xss')</script>` in search
- [ ] Verify no script execution
- [ ] Data sanitized properly

**Test Case 1.2**: SQL injection (not applicable)
- [ ] Verify Google Sheets API prevents injection
- [ ] No direct SQL queries used

### 2. Rate Limiting

**Test Case 2.1**: Exceed rate limit
- [ ] Make 3+ requests within 1 minute
- [ ] Verify rate limiting kicks in
- [ ] "Rate limit exceeded" message
- [ ] Wait 1 minute and verify reset

---

## Browser Compatibility

### Test across browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Verify for each browser:
- [ ] All functionality works
- [ ] UI renders correctly
- [ ] No console errors
- [ ] CORS requests succeed

---

## Deployment Testing

### 1. Production Environment

**Test Case 1.1**: GitHub Pages deployment
- [ ] Build application: `npm run build`
- [ ] Export static files: `npm run export`
- [ ] Deploy to GitHub Pages
- [ ] Verify all functionality works
- [ ] Check for any path/asset issues

**Test Case 1.2**: Environment variables
- [ ] Verify production GAS URL is set
- [ ] No development URLs in production
- [ ] All API calls use correct endpoints

### 2. Google Apps Script Production

**Test Case 2.1**: Production deployment
- [ ] Deploy new version of GAS
- [ ] Update production sheet IDs
- [ ] Verify permissions are correct
- [ ] Test all endpoints in production

---

## Sign-off Checklist

### Backend
- [ ] All API endpoints working correctly
- [ ] Validation rules enforced
- [ ] Race conditions handled
- [ ] Error messages clear and helpful
- [ ] CORS configured properly
- [ ] Rate limiting functional

### Frontend
- [ ] All user flows working
- [ ] Error handling graceful
- [ ] UI responsive and accessible
- [ ] Performance acceptable
- [ ] Browser compatibility verified

### Integration
- [ ] End-to-end flows complete successfully
- [ ] Data consistency maintained
- [ ] Error recovery works
- [ ] Production deployment successful

### Documentation
- [ ] API contract accurate
- [ ] Deployment guide complete
- [ ] QA checklist comprehensive
- [ ] README updated

---

## Test Execution Log

**Date**: ___________
**Tester**: ___________
**Environment**: ___________

| Test Case | Status | Notes |
|-----------|-----------|-------|
| API Health Check | ☐ Pass ☐ Fail | |
| Member Search | ☐ Pass ☐ Fail | |
| Schedule Loading | ☐ Pass ☐ Fail | |
| Registration Submit | ☐ Pass ☐ Fail | |
| Frontend UI | ☐ Pass ☐ Fail | |
| Integration | ☐ Pass ☐ Fail | |
| Performance | ☐ Pass ☐ Fail | |
| Security | ☐ Pass ☐ Fail | |
| Browser Compatibility | ☐ Pass ☐ Fail | |
| Deployment | ☐ Pass ☐ Fail | |

**Overall Result**: ☐ Pass ☐ Fail

**Issues Found**:
1. ___________
2. ___________
3. ___________

**Sign-off**: ___________