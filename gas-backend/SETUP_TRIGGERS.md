# Google Apps Script Triggers Setup

This document explains how to set up the time-driven triggers required for the high-load registration system.

## Required Triggers

### 1. Queue Processing Trigger

This trigger processes queued submissions every minute.

**Setup Steps:**

1. Open your Google Apps Script project
2. Click on the "Triggers" icon (⏰) in the left sidebar
3. Click "+ Add Trigger"
4. Configure the trigger:
   - **Choose which function to run:** `processQueuedSubmissions`
   - **Choose which deployment should run:** Head
   - **Select event source:** Time-driven
   - **Select type of time based trigger:** Minutes timer
   - **Select minute interval:** Every minute
5. Click "Save"

### 2. Cache Cleanup Trigger (Optional)

This trigger cleans up expired cache entries and logs.

**Setup Steps:**

1. Click "+ Add Trigger"
2. Configure the trigger:
   - **Choose which function to run:** `cleanupExpiredData`
   - **Choose which deployment should run:** Head
   - **Select event source:** Time-driven
   - **Select type of time based trigger:** Hours timer
   - **Select hour interval:** Every 6 hours
3. Click "Save"

## Trigger Functions

The following functions are called by the triggers:

### processQueuedSubmissions()

- Processes up to 200 queued submissions per run
- Handles per-file locking and optimistic concurrency
- Updates submission status in the queue
- Logs processing results

### cleanupExpiredData()

- Removes expired idempotency keys from cache
- Cleans up old log entries (older than 7 days)
- Optimizes cache performance

## Monitoring

To monitor trigger execution:

1. Go to "Executions" in the left sidebar
2. View recent trigger runs and their status
3. Check for any errors or failures
4. Review execution time and performance

## Troubleshooting

### Common Issues:

1. **Trigger not running:**
   - Check if triggers are enabled
   - Verify function names are correct
   - Ensure script has necessary permissions

2. **Execution timeout:**
   - Reduce batch size in queue processing
   - Optimize database operations
   - Consider splitting work across multiple triggers

3. **Permission errors:**
   - Re-authorize the script
   - Check spreadsheet sharing permissions
   - Verify cache service access

### Performance Optimization:

- Monitor execution time in the "Executions" tab
- Adjust batch sizes based on performance
- Consider increasing trigger frequency during peak times
- Use the logs sheet to track processing metrics

## Security Considerations

- Triggers run with the script owner's permissions
- Ensure proper access controls on spreadsheets
- Monitor for unusual activity in execution logs
- Regularly review and update trigger configurations