# API Contract - Activity Registration Backend

This document defines the complete API contract for the Google Apps Script backend that powers the activity registration system.

## Base URL

```
https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec
```

## Authentication

No authentication required. The API is publicly accessible.

## Rate Limiting

- **Limit**: 2 requests per minute per IP address
- **Response**: HTTP 429 with error message when exceeded
- **Reset**: 60 seconds from first request

## CORS Support

All endpoints support CORS with the following headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`
- `Access-Control-Max-Age: 86400`

## Content Type

All responses return `Content-Type: application/json`

## Data Architecture

The backend uses a three-sheet architecture in Google Sheets:

- **`list_member`**: Master members table for search operations
  - Contains member identity information
  - Used by the Search Members endpoint
  - Columns: `member_id`, `branch`, `name`, `birthdate`, `parent_name`, `contact`, `registration_status`

- **`form2025`**: Registration records (one row per token)
  - Contains individual registration entries
  - Used by Submit Registration endpoint for validation and writes
  - Columns: `member_id`, `branch`, `name`, `birthdate`, `activity_name`, `parent_name`, `contact`, `token`

- **`schedule2025`**: Activity schedules and availability
  - Contains activity information and capacity tracking
  - Used by Load Schedules endpoint and registration validation
  - Columns: `activity_id`, `branch`, `class_category`, `activity_name`, `total_slot`, `booked_slot`, `available_slot`

This separation allows for efficient member search while maintaining detailed registration tracking.

---

## Endpoints

### 1. Health Check

**Purpose**: Verify API availability and connectivity

#### Request
```http
GET /exec
```

#### Response

**Success (200)**:
```json
{
  "ok": true,
  "msg": "API ready"
}
```

**Error (500)**:
```json
{
  "ok": false,
  "error": "Internal server error"
}
```

---

### 2. Search Members

**Purpose**: Search for members by phone number within a specific branch to retrieve identity information (reads from list_member sheet)

#### Request
```http
GET /exec?fn=search&branch={branch}&phone={phone}
```

**Parameters**:
- `fn`: Must be "search"
- `branch`: Branch identifier ("bsd" or "kuningan")
- `phone`: Phone number (normalized automatically, supports formats like 0812..., 62812..., +62812...)

**Example**:
```http
GET /exec?fn=search&branch=bsd&phone=0812345678
```

#### Response

**Success (200)**:
```json
{
  "ok": true,
  "results": [
    {
      "member_id": "001-2024-15684",
      "branch": "bsd",
      "name": "Amara Isabella",
      "birthdate": "2020-11-09",
      "parent_name": "Bahrul",
      "contact": "82129505610"
    }
  ]
}
```

**Success (Empty Results)**:
```json
{
  "ok": true,
  "results": []
}
```

**Error (400)**:
```json
{
  "ok": false,
  "error": "Branch and phone parameters are required"
}
```

**Error (500)**:
```json
{
  "ok": false,
  "error": "Failed to search members"
}
```

**Notes**:
- Returns up to 20 unique members
- Phone numbers are normalized automatically (0812... and 62812... are treated as equivalent)
- Search is filtered by branch for data isolation
- Supports Indonesian phone number formats
- Duplicates are removed based on `member_id`
- Results are sorted by relevance

---

### 3. Load Schedules

**Purpose**: Retrieve available activity schedules with capacity information for a specific branch

#### Request
```http
GET /exec?fn=schedules&branch={branch}
```

**Parameters**:
- `fn`: Must be "schedules"
- `branch`: Branch identifier ("bsd" or "kuningan")

#### Response

**Success (200)**:
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
    },
    {
      "activity_id": "66331",
      "branch": "bsd",
      "class_category": "Basketball",
      "activity_name": "Ministar Basketball - Tuesday, 02:00 pm",
      "total_slot": 8,
      "booked_slot": 5,
      "available_slot": 3
    }
  ]
}
```

**Success (Empty)**:
```json
{
  "ok": true,
  "items": []
}
```

**Error (500)**:
```json
{
  "ok": false,
  "error": "Failed to load schedules"
}
```

**Notes**:
- Returns all activities for the specified branch regardless of availability
- Frontend should filter by `available_slot > 0` for selectable options
- `available_slot` is calculated as `total_slot - booked_slot`
- Branch filtering ensures data isolation between locations

---

### 4. Submit Registration

**Purpose**: Submit member registration with selected activities (writes to form2025 sheet)

#### Request
```http
POST /exec
Content-Type: application/json
```

**Body**:
```json
{
  "member": {
    "member_id": "001-2024-15684",
    "branch": "bsd",
    "name": "Amara Isabella",
    "birthdate": "2020-11-09",
    "parent_name": "Bahrul",
    "contact": "82129505610"
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
      "activity_name": "Ministar Basketball - Tuesday, 02:00 pm"
    }
  ]
}
```

#### Response

**Success (200)**:
```json
{
  "ok": true
}
```

**Validation Errors (400)**:

*Missing/Invalid Member Data*:
```json
{
  "ok": false,
  "error": "Member information is required"
}
```

*Missing Member Field*:
```json
{
  "ok": false,
  "error": "Member member_id is required"
}
```

*Invalid Selections*:
```json
{
  "ok": false,
  "error": "Selections must be an array"
}
```

*Too Many Selections*:
```json
{
  "ok": false,
  "error": "Maximum 5 selections allowed"
}
```

*Category Limit Exceeded*:
```json
{
  "ok": false,
  "error": "Max 2 tokens per category exceeded: Tennis"
}
```

*Invalid Activity*:
```json
{
  "ok": false,
  "error": "Invalid activity_id: 66327"
}
```

*Session Full*:
```json
{
  "ok": false,
  "error": "Session full: Ministar Tennis - Tuesday, 03:00 pm"
}
```

*Existing Registration Conflict*:
```json
{
  "ok": false,
  "error": "Total registrations would exceed 5 (existing: 3, new: 3)"
}
```

**Rate Limiting (429)**:
```json
{
  "ok": false,
  "error": "Rate limit exceeded. Please try again later."
}
```

**System Errors (500/503)**:

*Processing Failure*:
```json
{
  "ok": false,
  "error": "Registration processing failed"
}
}
```

*System Busy*:
```json
{
  "ok": false,
  "error": "System busy, please try again"
}
```

*Internal Error*:
```json
{
  "ok": false,
  "error": "Internal server error"
}
```

---

## Validation Rules

### Member Object Validation

All fields are required and must be non-empty strings:
- `member_id`: Unique identifier
- `branch`: Branch/location code
- `name`: Full member name
- `birthdate`: Date in YYYY-MM-DD format
- `parent_name`: Parent/guardian name
- `contact`: Contact number

### Selections Array Validation

1. **Array Requirements**:
   - Must be an array
   - Minimum 1 selection
   - Maximum 5 selections

2. **Selection Object Requirements**:
   - `class_category`: Category name (string)
   - `activity_id`: Unique activity identifier (string)
   - `activity_name`: Full activity description (string)

3. **Business Rules**:
   - Maximum 5 total selections per submission
   - Maximum 2 selections per `class_category`
   - All `activity_id` values must exist in schedule
   - All selected activities must have `available_slot >= 1`

### Race Condition Prevention

The API uses Google Apps Script's `LockService` to prevent race conditions:

1. **Lock Acquisition**: 10-second timeout
2. **Critical Section**: Read → Validate → Write operations
3. **Lock Release**: Automatic after completion or error
4. **Failure Handling**: Returns "System busy" if lock cannot be acquired

### Data Consistency

On successful registration:

1. **form2025 Sheet Updates**:
   - One row added per selection
   - Token numbers assigned sequentially
   - All member data replicated per row

2. **schedule2025 Sheet Updates** (Optional but Recommended):
   - `booked_slot` incremented by selection count
   - `available_slot` decremented accordingly
   - Real-time capacity tracking

---

## Error Handling

### Error Response Format

All errors follow this structure:
```json
{
  "ok": false,
  "error": "Human-readable error message"
}
```

### Error Categories

1. **Client Errors (400)**:
   - Invalid request format
   - Missing required fields
   - Business rule violations
   - Validation failures

2. **Rate Limiting (429)**:
   - Too many requests from same IP
   - Temporary restriction

3. **Server Errors (500)**:
   - Internal processing failures
   - Sheet access errors
   - Unexpected exceptions

4. **Service Unavailable (503)**:
   - Lock acquisition timeout
   - System overload

### Frontend Error Handling

The frontend should:

1. **Display Error Messages**: Show `error` field content to users
2. **Preserve Form State**: Keep selections intact on validation errors
3. **Retry Logic**: Implement exponential backoff for 503 errors
4. **User Guidance**: Provide clear next steps for each error type

---

## Testing

### Sample Test Requests

**Health Check**:
```bash
curl "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec"
```

**Member Search**:
```bash
curl "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec?fn=search&name=amara"
```

**Load Schedules**:
```bash
curl "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec?fn=schedules"
```

**Submit Registration**:
```bash
curl -X POST "https://script.google.com/macros/s/AKfycbz5B18r8aseZd1JNrntz5Ldyrj3hs0O7P0zZGPzNtgCfbkD1QLcdFrY3NuzavMFPLvT/exec" \
  -H "Content-Type: application/json" \
  -d '{
    "member": {
      "member_id": "001-2024-15684",
      "branch": "bsd",
      "name": "Amara Isabella",
      "birthdate": "2020-11-09",
      "parent_name": "Bahrul",
      "contact": "82129505610"
    },
    "selections": [
      {
        "class_category": "Tennis",
        "activity_id": "66327",
        "activity_name": "Ministar Tennis - Tuesday, 03:00 pm"
      }
    ]
  }'
```

### Expected Behaviors

1. **Successful Flow**: Health → Search → Schedules → Submit → Success
2. **Validation Errors**: Clear, specific error messages
3. **Race Conditions**: Proper handling with lock service
4. **Rate Limiting**: Graceful degradation with retry guidance

---

## Performance Considerations

### Response Times

- **Health Check**: < 100ms
- **Member Search**: < 500ms
- **Load Schedules**: < 1000ms
- **Submit Registration**: < 2000ms (including lock wait)

### Scalability Limits

- **Google Sheets**: 10 million cells per sheet
- **Apps Script**: 6 minutes execution time limit
- **Concurrent Users**: Limited by lock service (sequential processing)
- **Rate Limiting**: 2 requests/minute per IP

### Optimization Recommendations

1. **Sheet Structure**: Keep data normalized and indexed
2. **Batch Operations**: Process multiple selections efficiently
3. **Caching**: Consider caching schedule data for read-heavy operations
4. **Monitoring**: Track response times and error rates

---

## Security Notes

### Input Sanitization

- All string inputs are trimmed
- Length limits enforced
- Type validation performed
- SQL injection not applicable (Sheets API)

### Access Control

- Public API (no authentication)
- Rate limiting for abuse prevention
- CORS enabled for browser access
- Execution context: Script owner's permissions

### Data Privacy

- Member data stored in Google Sheets
- Access controlled by sheet permissions
- No data encryption at rest (Google's responsibility)
- Audit trail through sheet revision history