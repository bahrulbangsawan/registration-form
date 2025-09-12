# High-Load Hardening Implementation

This document describes the high-load hardening features implemented to handle 3,000 simultaneous submissions safely.

## 🎯 Objectives Achieved

✅ **Batch reads/writes** - No per-row IO loops  
✅ **Per-file LockService** - Branch-scoped locking  
✅ **Schedule caching** - Read-through CacheService  
✅ **Submission queue** - Time-driven worker  
✅ **Optimistic concurrency** - Version tokens for conflict detection  
✅ **Idempotency keys** - Prevent duplicate submissions  
✅ **Frontend resilience** - Exponential backoff and UX improvements  

## 🏗️ Architecture Overview

### Backend (Google Apps Script)

**Core Components:**
- `CacheHelper` - Manages schedule caching and idempotency
- `BatchOperations` - Handles bulk read/write operations
- `LockHelper` - Per-file locking with timeouts
- `ConcurrencyHelper` - Optimistic concurrency control
- `Logger` - Performance and error logging

**Key Features:**
- **Batch Operations**: Single `getDataRange().getValues()` and `setValues()` calls
- **Branch-scoped Locking**: `LockService.getDocumentLock()` with 2-5s timeout
- **Schedule Caching**: 30-60s TTL with invalidation on updates
- **Submission Queue**: `pending_submissions` sheet with time-driven processing
- **Optimistic Concurrency**: Version tokens (`booked_slot|total_slot`)
- **Idempotency**: Request ID tracking in CacheService (5-10 min TTL)

### Frontend (Next.js)

**Enhanced Features:**
- **Request ID Generation**: UUID v4 for each submission
- **Exponential Backoff**: 400ms → 6400ms with max 5 attempts
- **Queue Status Display**: Visual feedback for queued submissions
- **Conflict Resolution**: Highlight conflicting sessions for reselection
- **Retry Logic**: Automatic retry on 503 (busy) responses

## 🚀 Setup Instructions

### 1. Deploy Google Apps Script

1. Copy the updated `Code.gs` to your Google Apps Script project
2. Set up the required spreadsheet structure:
   - Add `pending_submissions` sheet with columns: `created_at`, `branch`, `payload_json`, `request_id`, `status`
   - Add `logs` sheet with columns: `timestamp`, `request_id`, `branch`, `event`, `metadata`

### 2. Configure Time-Driven Triggers

Follow the instructions in `gas-backend/SETUP_TRIGGERS.md`:

```bash
# View trigger setup guide
cat gas-backend/SETUP_TRIGGERS.md
```

**Required Triggers:**
- `processSubmissionQueue` - Every 1 minute
- `cleanupExpiredData` - Every 6 hours (optional)

### 3. Update Environment Variables

Ensure your `.env.local` contains:

```env
NEXT_PUBLIC_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### 4. Deploy Frontend

The frontend changes are already implemented in the React components.

## 🧪 Testing

### Load Testing

Run the comprehensive load test:

```bash
# Set your Google Apps Script URL
export GAS_URL="https://script.google.com/macros/s/AKfycbyLE5SKxPdrOa9cZWCCHncwIlaTW2sWyUY0S_4LopmDooPlSvEQcNlG-2HR7wN-7EQr/exec"

# Run load test
node load-test.js
```

**Test Coverage:**
- 3,000 concurrent submissions to same activity (overbooking prevention)
- 50 duplicate request_ids × 5 submissions each (idempotency)
- Queue processing verification

### Manual Testing

1. **Normal Submission**: Submit a registration normally
2. **Conflict Testing**: Try to book the last slot simultaneously
3. **Queue Testing**: Generate high load to trigger queuing
4. **Retry Testing**: Simulate server busy conditions

## 📊 Performance Characteristics

### Expected Behavior Under Load

| Scenario | Expected Response | Status Code |
|----------|-------------------|-------------|
| Normal submission | `{ok: true}` | 200 |
| Queued submission | `{ok: true, queued: true}` | 200 |
| Session conflict | `{ok: false, conflicts: [...]}` | 200 |
| Server busy | `{ok: false, error: "System busy"}` | 503 |
| Duplicate request_id | Previous result (cached) | 200 |

### Performance Metrics

- **Lock timeout**: 2-5 seconds
- **Cache TTL**: 30-60 seconds for schedules
- **Queue processing**: Up to 200 items per minute
- **Idempotency window**: 5-10 minutes
- **Batch size**: Entire sheet ranges (no row-by-row operations)

## 🔧 Configuration

### Backend Configuration (Code.gs)

```javascript
const PERFORMANCE_CONFIG = {
  LOCK_TIMEOUT_MS: 5000,
  CACHE_TTL_SECONDS: 60,
  QUEUE_BATCH_SIZE: 200,
  IDEMPOTENCY_TTL_SECONDS: 600,
  MAX_DAILY_OPERATIONS: 50000
};
```

### Frontend Configuration (SubmitCard.tsx)

```javascript
class ExponentialBackoff {
  private delays = [400, 800, 1600, 3200, 6400]; // ms
  // Max 5 attempts with exponential backoff
}
```

## 🛡️ Security & Reliability

### Data Integrity
- **Optimistic concurrency** prevents race conditions
- **Idempotency keys** prevent duplicate submissions
- **Batch operations** ensure atomic updates
- **Per-file locking** prevents cross-branch interference

### Error Handling
- **Graceful degradation** with queue fallback
- **Exponential backoff** prevents server overload
- **Conflict resolution** guides user to valid selections
- **Comprehensive logging** for debugging

### Monitoring
- **Execution logs** in Google Apps Script console
- **Performance logs** in dedicated spreadsheet
- **Cache hit/miss** tracking
- **Queue depth** monitoring

## 🚨 Troubleshooting

### Common Issues

1. **High queue depth**
   - Increase trigger frequency
   - Optimize batch operations
   - Check for lock contention

2. **Cache misses**
   - Verify cache TTL settings
   - Check cache invalidation logic
   - Monitor cache service quotas

3. **Lock timeouts**
   - Reduce critical section duration
   - Increase lock timeout
   - Check for deadlocks

4. **Idempotency failures**
   - Verify request_id generation
   - Check cache service availability
   - Monitor TTL expiration

### Debug Commands

```bash
# Check server status
curl -X GET "$GAS_URL?fn=health"

# Test single submission
curl -X POST "$GAS_URL" \
  -H "Content-Type: application/json" \
  -d '{"member":{...}, "selections":[...], "request_id":"test-123"}'

# Run load test
node load-test.js
```

## 📈 Scaling Considerations

### Current Limits
- **Google Apps Script**: 6 min execution time, 100MB memory
- **Spreadsheet**: 10M cells, 18,278 columns
- **Cache Service**: 1MB per key, 100MB total
- **Lock Service**: 30s max lock duration

### Scaling Strategies
- **Horizontal**: Multiple script deployments per region
- **Vertical**: Optimize batch sizes and cache usage
- **Temporal**: Distribute load across time zones
- **Functional**: Separate read/write operations

## 🔄 Maintenance

### Regular Tasks
- Monitor execution logs weekly
- Clean up old queue entries monthly
- Review performance metrics quarterly
- Update cache TTL based on usage patterns

### Backup Strategy
- **Spreadsheet**: Automatic Google Drive versioning
- **Code**: Version control in Git
- **Configuration**: Document all settings
- **Logs**: Export critical logs periodically

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Google Apps Script execution logs
3. Run the load test to verify system health
4. Check the logs spreadsheet for detailed error information