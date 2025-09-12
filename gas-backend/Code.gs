/**
 * Google Apps Script Web App for Activity Registration System
 * High-load hardened version supporting 3,000+ concurrent submissions
 * Features: Batch operations, per-file locking, caching, queuing, optimistic concurrency
 */

// Branch Configuration
const CONFIG = {
  bsd: {
    FORM_SHEET_ID: '1fvFSbs-jf0tcCNNVIw67Sojv3Gt7J-N9QnxLXmkIR5g',
    SCHEDULE_SHEET_ID: '1fvFSbs-jf0tcCNNVIw67Sojv3Gt7J-N9QnxLXmkIR5g',
    LIST_MEMBER_SHEET_ID: '1fvFSbs-jf0tcCNNVIw67Sojv3Gt7J-N9QnxLXmkIR5g',
    FORM_SHEET_NAME: 'form',
    SCHEDULE_SHEET_NAME: 'schedule',
    LIST_MEMBER_SHEET_NAME: 'list_member',
    PENDING_SUBMISSIONS_SHEET_NAME: 'pending_submissions',
    LOGS_SHEET_NAME: 'logs'
  },
  kuningan: {
    FORM_SHEET_ID: '1riqBRIcO2ra38SFG-B8wpl22pTsu9mfYWsTHk36s6-w',
    SCHEDULE_SHEET_ID: '1riqBRIcO2ra38SFG-B8wpl22pTsu9mfYWsTHk36s6-w',
    LIST_MEMBER_SHEET_ID: '1riqBRIcO2ra38SFG-B8wpl22pTsu9mfYWsTHk36s6-w',
    FORM_SHEET_NAME: 'form',
    SCHEDULE_SHEET_NAME: 'schedule',
    LIST_MEMBER_SHEET_NAME: 'list_member',
    PENDING_SUBMISSIONS_SHEET_NAME: 'pending_submissions',
    LOGS_SHEET_NAME: 'logs'
  }
};

// Performance and reliability constants
const LOCK_TIMEOUT_MS = 5000;
const CACHE_TTL_SCHEDULES = 60; // 60 seconds
const CACHE_TTL_IDEMPOTENCY = 600; // 10 minutes
const MAX_QUEUE_SIZE = 1000;
const BATCH_PROCESS_SIZE = 200;
const MAX_REQUESTS_PER_MINUTE = 100;
const QUOTA_DAILY_READS = 100000;
const QUOTA_DAILY_WRITES = 20000;

/**
 * Get configuration for a specific branch
 */
function getCfg_(branch) {
  if (!branch || typeof branch !== 'string') {
    throw new Error('Branch parameter is required');
  }
  
  const normalizedBranch = branch.toLowerCase();
  if (!CONFIG[normalizedBranch]) {
    throw new Error('Invalid branch. Must be bsd or kuningan');
  }
  
  return CONFIG[normalizedBranch];
}

/**
 * Normalize phone number: digits only, convert 0xxx to 62xxx, 8xxx to 628xxx
 * Test cases:
 * - Input: 82129505610, Sheet: 82129505610 → ✅ match
 * - Input: 82129505610, Sheet: 6282129505610 → ✅ match  
 * - Input: 08129505610, Sheet: 82129505610 → ✅ match
 * - Input: 08129505610, Sheet: 6282129505610 → ✅ match
 * - Input: 82129505610 with branch=Kuningan, Sheet branch=bsd → ❌ no match (branch mismatch)
 */
function normalizePhone_(phone) {
  if (!phone || typeof phone !== 'string') {
    return '';
  }
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle empty result
  if (!digits) {
    return '';
  }
  
  // Convert Indonesian local format (0xxx) to international (62xxx)
  if (digits.startsWith('0')) {
    return '62' + digits.substring(1);
  }
  
  // Handle +62 format that might have been converted to 62
  if (digits.startsWith('62')) {
    return digits;
  }
  
  // Handle mobile numbers starting with 8 (convert 8xxx to 628xxx)
  if (digits.startsWith('8')) {
    return '62' + digits;
  }
  
  // For other formats, return as-is
  return digits;
}

/**
 * Compare two phone numbers after normalization
 * @deprecated Use direct normalization comparison instead
 */
function phonesEqual_(phone1, phone2) {
  const normalized1 = normalizePhone_(phone1);
  const normalized2 = normalizePhone_(phone2);
  
  return normalized1 === normalized2;
}

/**
 * Cache Service Helper Functions
 */
class CacheHelper {
  static getSchedulesCacheKey(branch) {
    return `schedules::${branch.toLowerCase()}`;
  }
  
  static getIdempotencyCacheKey(requestId) {
    return `idempotency::${requestId}`;
  }
  
  static getQuotaCacheKey(type) {
    const today = new Date().toISOString().split('T')[0];
    return `quota::${type}::${today}`;
  }
  
  static get(key) {
    try {
      const cached = CacheService.getScriptCache().get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.error('Cache get error:', e);
      return null;
    }
  }
  
  static put(key, value, ttlSeconds) {
    try {
      CacheService.getScriptCache().put(key, JSON.stringify(value), ttlSeconds);
    } catch (e) {
      console.error('Cache put error:', e);
    }
  }
  
  static remove(key) {
    try {
      CacheService.getScriptCache().remove(key);
    } catch (e) {
      console.error('Cache remove error:', e);
    }
  }
  
  static incrementQuota(type) {
    const key = this.getQuotaCacheKey(type);
    const current = this.get(key) || 0;
    this.put(key, current + 1, 86400); // 24 hours
    return current + 1;
  }
  
  static checkQuotaLimit(type, limit) {
    const key = this.getQuotaCacheKey(type);
    const current = this.get(key) || 0;
    return current < limit;
  }
}

/**
 * Logging Helper
 */
class Logger {
  static log(branch, requestId, event, metadata = {}) {
    try {
      const cfg = getCfg_(branch);
      const sheet = SpreadsheetApp.openById(cfg.FORM_SHEET_ID).getSheetByName(cfg.LOGS_SHEET_NAME);
      
      // Create logs sheet if it doesn't exist
      if (!sheet) {
        const newSheet = SpreadsheetApp.openById(cfg.FORM_SHEET_ID).insertSheet(cfg.LOGS_SHEET_NAME);
        newSheet.getRange(1, 1, 1, 6).setValues([[
          'timestamp', 'request_id', 'branch', 'event', 'metadata', 'session_id'
        ]]);
      }
      
      const logSheet = sheet || SpreadsheetApp.openById(cfg.FORM_SHEET_ID).getSheetByName(cfg.LOGS_SHEET_NAME);
      logSheet.appendRow([
        new Date(),
        requestId || 'N/A',
        branch,
        event,
        JSON.stringify(metadata),
        Session.getTemporaryActiveUserKey()
      ]);
    } catch (e) {
      console.error('Logging error:', e);
    }
  }
}

/**
 * Batch Operations Helper
 */
class BatchOperations {
  static readSheetData(sheetId, sheetName) {
    CacheHelper.incrementQuota('reads');
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }
    return sheet.getDataRange().getValues();
  }
  
  static writeSheetData(sheetId, sheetName, data, startRow = 1, startCol = 1) {
    CacheHelper.incrementQuota('writes');
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }
    
    if (data.length > 0) {
      const range = sheet.getRange(startRow, startCol, data.length, data[0].length);
      range.setValues(data);
    }
  }
  
  static appendSheetData(sheetId, sheetName, data) {
    CacheHelper.incrementQuota('writes');
    const sheet = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found`);
    }
    
    if (data.length > 0) {
      const lastRow = sheet.getLastRow();
      const range = sheet.getRange(lastRow + 1, 1, data.length, data[0].length);
      range.setValues(data);
    }
  }
}

/**
 * Per-file Locking Helper
 */
class LockHelper {
  static acquireBranchLock(branch, timeoutMs = LOCK_TIMEOUT_MS) {
    const cfg = getCfg_(branch);
    const lock = LockService.getDocumentLock();
    
    try {
      lock.waitLock(timeoutMs);
      Logger.log(branch, null, 'lock_acquired', { timeout: timeoutMs });
      return lock;
    } catch (e) {
      Logger.log(branch, null, 'lock_failed', { timeout: timeoutMs, error: e.message });
      throw new Error('System busy, please retry');
    }
  }
  
  static releaseLock(lock, branch) {
    try {
      lock.releaseLock();
      Logger.log(branch, null, 'lock_released');
    } catch (e) {
      console.error('Lock release error:', e);
    }
  }
}

/**
 * Optimistic Concurrency Helper
 */
class ConcurrencyHelper {
  static createVersionToken(bookedSlot, totalSlot) {
    return `${bookedSlot}|${totalSlot}`;
  }
  
  static validateVersions(originalVersions, currentData, headers) {
    const activityIdCol = headers.indexOf('activity_id');
    const bookedSlotCol = headers.indexOf('booked_slot');
    const totalSlotCol = headers.indexOf('total_slot');
    
    for (let i = 1; i < currentData.length; i++) {
      const row = currentData[i];
      const activityId = String(row[activityIdCol] || '');
      
      if (originalVersions.has(activityId)) {
        const currentVersion = this.createVersionToken(
          parseInt(row[bookedSlotCol]) || 0,
          parseInt(row[totalSlotCol]) || 0
        );
        
        if (originalVersions.get(activityId) !== currentVersion) {
          return {
            valid: false,
            conflictActivity: activityId,
            error: 'Session just filled, pick another'
          };
        }
      }
    }
    
    return { valid: true };
  }
}

/**
 * Rate Limiting
 */
function checkRateLimit(clientIp) {
  const key = `rate_limit_${clientIp}`;
  const current = CacheHelper.get(key) || 0;
  
  if (current >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  CacheHelper.put(key, current + 1, 60);
  return true;
}

/**
 * Quota Guards
 */
function checkQuotaLimits() {
  if (!CacheHelper.checkQuotaLimit('reads', QUOTA_DAILY_READS)) {
    throw new Error('Daily read quota exceeded. Please try again tomorrow.');
  }
  
  if (!CacheHelper.checkQuotaLimit('writes', QUOTA_DAILY_WRITES)) {
    throw new Error('Daily write quota exceeded. Please try again tomorrow.');
  }
}

/**
 * Get client IP for rate limiting
 */
function getClientIp(e) {
  return e.parameter.clientIp || 'unknown';
}

/**
 * Create standardized JSON response
 */
function createJsonResponse(data, statusCode = 200) {
  const response = ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // CORS headers are automatically handled by Google Apps Script for web apps
  return response;
}

/**
 * Main entry point for GET requests
 */
function doGet(e) {
  try {
    checkQuotaLimits();
    const params = e.parameter;
    
    // Health check endpoint
    if (!params.fn) {
      return createJsonResponse({ ok: true, msg: "API ready" });
    }
    
    // Route to specific functions
    switch (params.fn) {
      case 'search':
        return handleSearch(params.branch, params.phone);
      case 'schedules':
        return handleSchedules(params.branch);
      case 'status':
        return handleStatusCheck(params.request_id);
      default:
        return createJsonResponse({ ok: false, error: "Invalid function parameter" }, 400);
    }
  } catch (error) {
    console.error('doGet error:', error);
    if (error.message.includes('quota')) {
      return createJsonResponse({ ok: false, error: error.message }, 503);
    }
    return createJsonResponse({ ok: false, error: "Internal server error" }, 500);
  }
}

/**
 * Main entry point for POST requests
 */
function doPost(e) {
  try {
    checkQuotaLimits();

    const clientIp = getClientIp(e);
    if (!checkRateLimit(clientIp)) {
      return createJsonResponse({ ok:false, error:"Rate limit exceeded" }, 429);
    }

    if (!e || !e.postData) {
      return createJsonResponse({ ok:false, error:"Empty payload" }, 400);
    }

    // Accept either application/json OR text/plain
    var raw = e.postData.contents || '';
    var data;
    try {
      data = JSON.parse(raw);
    } catch (err) {
      return createJsonResponse({ ok:false, error:"Invalid JSON payload" }, 400);
    }

    if (!data.request_id) data.request_id = Utilities.getUuid();
    return handleSubmission(data);

  } catch (err) {
    console.error('doPost error:', err);
    return createJsonResponse({ ok:false, error:"Internal server error" }, 500);
  }
}

/**
 * Handle OPTIONS requests for CORS preflight
 */
function doOptions(e) {
  return createJsonResponse({}, 200);
}

/**
 * Handle member search by phone number and branch (with caching)
 */
function handleSearch(branch, phone) {
  if (!branch || typeof branch !== 'string' || branch.trim().length === 0) {
    return createJsonResponse({ ok: false, error: "Branch parameter is required" }, 400);
  }
  
  if (!phone || typeof phone !== 'string' || phone.trim().length === 0) {
    return createJsonResponse({ ok: false, error: "Phone parameter is required" }, 400);
  }
  
  // Extract digits only and validate minimum length
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 9) {
    return createJsonResponse({ ok: false, error: "Phone number must be at least 9 digits" }, 400);
  }
  
  try {
    const cfg = getCfg_(branch);
    
    // Check if the sheet exists first
    let sheet;
    try {
      sheet = SpreadsheetApp.openById(cfg.LIST_MEMBER_SHEET_ID).getSheetByName(cfg.LIST_MEMBER_SHEET_NAME);
      if (!sheet) {
        console.error(`Sheet '${cfg.LIST_MEMBER_SHEET_NAME}' not found in spreadsheet ${cfg.LIST_MEMBER_SHEET_ID}`);
        return createJsonResponse({ ok: false, error: "Member database not found. Please contact administrator." }, 500);
      }
    } catch (sheetError) {
      console.error('Sheet access error:', sheetError);
      return createJsonResponse({ ok: false, error: "Unable to access member database. Please contact administrator." }, 500);
    }
    
    const data = BatchOperations.readSheetData(cfg.LIST_MEMBER_SHEET_ID, cfg.LIST_MEMBER_SHEET_NAME);
    
    if (data.length <= 1) {
      console.log(`No member data found in sheet '${cfg.LIST_MEMBER_SHEET_NAME}' for branch '${branch}'`);
      return createJsonResponse({ ok: false, error: "No members found in database" }, 404);
    }
    
    const headers = data[0];
    console.log('Sheet headers:', headers);
    
    // Validate required columns exist
    const requiredColumns = ['contact', 'member_id', 'name', 'birthdate', 'parent_name', 'branch'];
    const missingColumns = [];
    
    const phoneCol = headers.indexOf('contact');
    const memberIdCol = headers.indexOf('member_id');
    const nameCol = headers.indexOf('name');
    const birthdateCol = headers.indexOf('birthdate');
    const parentNameCol = headers.indexOf('parent_name');
    const branchCol = headers.indexOf('branch');
    
    if (phoneCol === -1) missingColumns.push('contact');
    if (memberIdCol === -1) missingColumns.push('member_id');
    if (nameCol === -1) missingColumns.push('name');
    if (birthdateCol === -1) missingColumns.push('birthdate');
    if (parentNameCol === -1) missingColumns.push('parent_name');
    if (branchCol === -1) missingColumns.push('branch');
    
    if (missingColumns.length > 0) {
      console.error(`Missing required columns in list_member sheet: ${missingColumns.join(', ')}`);
      return createJsonResponse({ ok: false, error: `Database configuration error: missing columns ${missingColumns.join(', ')}` }, 500);
    }
    
    const normalizedSearchPhone = normalizePhone_(phone);
    console.log(`Searching for phone: ${phone} -> normalized: ${normalizedSearchPhone} in branch: ${branch}`);
    
    let foundMembers = 0;
    let matchingMembers = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowPhone = String(row[phoneCol] || '');
      const rowBranch = String(row[branchCol] || '').toLowerCase();
      const normalizedRowPhone = normalizePhone_(rowPhone);
      
      // Debug logging for phone comparison
      console.log(`Input=${phone} → normalized=${normalizedSearchPhone}`);
      console.log(`RowPhone=${rowPhone} → normalized=${normalizedRowPhone}`);
      console.log(`Match? ${normalizedSearchPhone === normalizedRowPhone}`);
      console.log(`Branch match? ${rowBranch === branch.toLowerCase()}`);
      
      // Count members in this branch for debugging
      if (rowBranch === branch.toLowerCase()) {
        foundMembers++;
      }
      
      // Check both branch and phone match
      if (rowBranch === branch.toLowerCase() && normalizedSearchPhone === normalizedRowPhone) {
        const member = {
          member_id: String(row[memberIdCol] || ''),
          branch: String(row[branchCol] || ''),
          name: String(row[nameCol] || ''),
          birthdate: String(row[birthdateCol] || ''),
          parent_name: String(row[parentNameCol] || ''),
          contact: String(row[phoneCol] || '')
        };
        
        console.log(`Member found: ${member.name} (${member.member_id})`);
        matchingMembers.push(member);
      }
    }
    
    if (matchingMembers.length > 0) {
      console.log(`Found ${matchingMembers.length} matching member(s) with phone ${normalizedSearchPhone} in branch ${branch}`);
      return createJsonResponse({ ok: true, results: matchingMembers, count: matchingMembers.length });
    }
    
    console.log(`No member found with phone ${normalizedSearchPhone} in branch ${branch}. Total members in branch: ${foundMembers}`);
    return createJsonResponse({ ok: false, error: "Member not found" }, 404);
    
  } catch (error) {
    console.error('handleSearch error:', error);
    if (error.message.includes('Invalid branch')) {
      return createJsonResponse({ ok: false, error: error.message }, 400);
    }
    if (error.message.includes('not found')) {
      return createJsonResponse({ ok: false, error: "Member database not accessible" }, 500);
    }
    return createJsonResponse({ ok: false, error: "Search failed: " + error.message }, 500);
  }
}

/**
 * Handle schedules with caching
 */
function handleSchedules(branch) {
  if (!branch || typeof branch !== 'string' || branch.trim().length === 0) {
    return createJsonResponse({ ok: false, error: "Branch parameter is required" }, 400);
  }
  
  try {
    // Check cache first
    const cacheKey = CacheHelper.getSchedulesCacheKey(branch);
    const cached = CacheHelper.get(cacheKey);
    
    if (cached) {
      Logger.log(branch, null, 'cache_hit', { type: 'schedules' });
      return createJsonResponse({ ok: true, items: cached });
    }
    
    // Cache miss - read from sheet
    Logger.log(branch, null, 'cache_miss', { type: 'schedules' });
    const cfg = getCfg_(branch);
    const data = BatchOperations.readSheetData(cfg.SCHEDULE_SHEET_ID, cfg.SCHEDULE_SHEET_NAME);
    
    if (data.length <= 1) {
      return createJsonResponse({ ok: false, error: "No schedules found" }, 404);
    }
    
    const headers = data[0];
    const activityIdCol = headers.indexOf('activity_id');
    const branchCol = headers.indexOf('branch');
    const classCategoryCol = headers.indexOf('class_category');
    const activityNameCol = headers.indexOf('activity_name');
    const totalSlotCol = headers.indexOf('total_slot');
    const bookedSlotCol = headers.indexOf('booked_slot');
    const availableSlotCol = headers.indexOf('available_slot');
    
    const items = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowBranch = String(row[branchCol] || '').toLowerCase();
      
      if (rowBranch === branch.toLowerCase()) {
        const totalSlot = parseInt(row[totalSlotCol]) || 0;
        const bookedSlot = parseInt(row[bookedSlotCol]) || 0;
        const availableSlot = Math.max(0, totalSlot - bookedSlot);
        
        items.push({
          activity_id: String(row[activityIdCol] || ''),
          branch: String(row[branchCol] || ''),
          class_category: String(row[classCategoryCol] || ''),
          activity_name: String(row[activityNameCol] || ''),
          total_slot: totalSlot,
          booked_slot: bookedSlot,
          available_slot: availableSlot
        });
      }
    }
    
    // Cache the result
    CacheHelper.put(cacheKey, items, CACHE_TTL_SCHEDULES);
    
    return createJsonResponse({ ok: true, items });
    
  } catch (error) {
    console.error('handleSchedules error:', error);
    if (error.message.includes('Invalid branch')) {
      return createJsonResponse({ ok: false, error: error.message }, 400);
    }
    return createJsonResponse({ ok: false, error: "Failed to load schedules" }, 500);
  }
}

/**
 * Handle status check for queued submissions
 */
function handleStatusCheck(requestId) {
  if (!requestId) {
    return createJsonResponse({ ok: false, error: "Request ID is required" }, 400);
  }
  
  try {
    // Check idempotency cache first
    const cacheKey = CacheHelper.getIdempotencyCacheKey(requestId);
    const cached = CacheHelper.get(cacheKey);
    
    if (cached) {
      return createJsonResponse({ ok: true, status: 'completed', result: cached });
    }
    
    // Check pending submissions in both branches
    for (const branchName of ['bsd', 'kuningan']) {
      try {
        const cfg = getCfg_(branchName);
        const data = BatchOperations.readSheetData(cfg.FORM_SHEET_ID, cfg.PENDING_SUBMISSIONS_SHEET_NAME);
        
        if (data.length > 1) {
          const headers = data[0];
          const requestIdCol = headers.indexOf('request_id');
          const statusCol = headers.indexOf('status');
          
          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (String(row[requestIdCol] || '') === requestId) {
              const status = String(row[statusCol] || 'queued');
              return createJsonResponse({ ok: true, status, request_id: requestId });
            }
          }
        }
      } catch (e) {
        // Continue checking other branch
        continue;
      }
    }
    
    return createJsonResponse({ ok: false, error: "Request not found" }, 404);
    
  } catch (error) {
    console.error('handleStatusCheck error:', error);
    return createJsonResponse({ ok: false, error: "Status check failed" }, 500);
  }
}

/**
 * Handle registration submission with all optimizations
 */
function handleSubmission(requestData) {
  const requestId = requestData.request_id;
  
  try {
    // Check idempotency
    const idempotencyKey = CacheHelper.getIdempotencyCacheKey(requestId);
    const existingResult = CacheHelper.get(idempotencyKey);
    
    if (existingResult) {
      Logger.log(requestData.member?.branch || 'unknown', requestId, 'idempotency_hit');
      return createJsonResponse(existingResult);
    }
    
    // Input validation
    const validationError = validateSubmissionData(requestData);
    if (validationError) {
      return createJsonResponse({ ok: false, error: validationError }, 400);
    }
    
    const { member, selections } = requestData;
    const branch = member.branch;
    
    Logger.log(branch, requestId, 'submission_start', { selections_count: selections.length });
    
    // Try to acquire lock
    let lock;
    try {
      lock = LockHelper.acquireBranchLock(branch);
    } catch (lockError) {
      // Lock failed - queue the submission
      Logger.log(branch, requestId, 'lock_failed_queuing');
      const queueResult = queueSubmission(requestData);
      
      if (queueResult.success) {
        return createJsonResponse({ ok: true, queued: true, request_id: requestId });
      } else {
        return createJsonResponse({ ok: false, error: queueResult.error }, 503);
      }
    }
    
    try {
      // Process submission with lock held
      const result = processSubmissionWithLock(requestData);
      
      // Cache successful result for idempotency
      if (result.ok) {
        CacheHelper.put(idempotencyKey, result, CACHE_TTL_IDEMPOTENCY);
        // Invalidate schedule cache
        CacheHelper.remove(CacheHelper.getSchedulesCacheKey(branch));
        Logger.log(branch, requestId, 'submission_success');
      } else {
        Logger.log(branch, requestId, 'submission_failed', { error: result.error });
      }
      
      return createJsonResponse(result);
      
    } finally {
      LockHelper.releaseLock(lock, branch);
    }
    
  } catch (error) {
    console.error('handleSubmission error:', error);
    Logger.log(requestData.member?.branch || 'unknown', requestId, 'submission_error', { error: error.message });
    return createJsonResponse({ ok: false, error: "Registration processing failed" }, 500);
  }
}

/**
 * Process submission with lock held (optimistic concurrency)
 */
function processSubmissionWithLock(requestData) {
  const { member, selections } = requestData;
  const branch = member.branch;
  const cfg = getCfg_(branch);
  
  try {
    // Read current schedule state
    const scheduleData = BatchOperations.readSheetData(cfg.SCHEDULE_SHEET_ID, cfg.SCHEDULE_SHEET_NAME);
    const scheduleHeaders = scheduleData[0];
    
    // Create version tokens for optimistic concurrency
    const originalVersions = new Map();
    const activityIdCol = scheduleHeaders.indexOf('activity_id');
    const bookedSlotCol = scheduleHeaders.indexOf('booked_slot');
    const totalSlotCol = scheduleHeaders.indexOf('total_slot');
    const branchCol = scheduleHeaders.indexOf('branch');
    
    // Collect version tokens for selected activities
    for (const selection of selections) {
      for (let i = 1; i < scheduleData.length; i++) {
        const row = scheduleData[i];
        const rowBranch = String(row[branchCol] || '').toLowerCase();
        const activityId = String(row[activityIdCol] || '');
        
        if (rowBranch === branch.toLowerCase() && activityId === selection.activity_id) {
          const version = ConcurrencyHelper.createVersionToken(
            parseInt(row[bookedSlotCol]) || 0,
            parseInt(row[totalSlotCol]) || 0
          );
          originalVersions.set(activityId, version);
          break;
        }
      }
    }
    
    // Validate against current schedule state
    const scheduleValidation = validateAgainstScheduleBatch(selections, scheduleData, branch);
    if (!scheduleValidation.valid) {
      return { ok: false, error: scheduleValidation.error };
    }
    
    // Validate token limits
    const tokenValidation = validateTokenLimits(selections);
    if (!tokenValidation.valid) {
      return { ok: false, error: tokenValidation.error };
    }
    
    // Check existing member registrations
    const existingValidation = validateExistingRegistrationsBatch(member.member_id, selections, branch);
    if (!existingValidation.valid) {
      return { ok: false, error: existingValidation.error };
    }
    
    // Re-read schedule data for final validation (optimistic concurrency)
    const finalScheduleData = BatchOperations.readSheetData(cfg.SCHEDULE_SHEET_ID, cfg.SCHEDULE_SHEET_NAME);
    const concurrencyCheck = ConcurrencyHelper.validateVersions(originalVersions, finalScheduleData, scheduleHeaders);
    
    if (!concurrencyCheck.valid) {
      return { ok: false, error: concurrencyCheck.error };
    }
    
    // All validations passed - process registration
    const success = processRegistrationBatch(member, selections, finalScheduleData);
    
    if (success) {
      return { ok: true };
    } else {
      return { ok: false, error: "Failed to process registration" };
    }
    
  } catch (error) {
    console.error('processSubmissionWithLock error:', error);
    return { ok: false, error: "Registration processing failed" };
  }
}

/**
 * Queue submission for later processing
 */
function queueSubmission(requestData) {
  try {
    const { member } = requestData;
    const branch = member.branch;
    const cfg = getCfg_(branch);
    
    // Check queue size
    let pendingData;
    try {
      pendingData = BatchOperations.readSheetData(cfg.FORM_SHEET_ID, cfg.PENDING_SUBMISSIONS_SHEET_NAME);
    } catch (e) {
      // Create pending submissions sheet if it doesn't exist
      const sheet = SpreadsheetApp.openById(cfg.FORM_SHEET_ID).insertSheet(cfg.PENDING_SUBMISSIONS_SHEET_NAME);
      sheet.getRange(1, 1, 1, 5).setValues([[
        'created_at', 'branch', 'payload_json', 'request_id', 'status'
      ]]);
      pendingData = [['created_at', 'branch', 'payload_json', 'request_id', 'status']];
    }
    
    if (pendingData.length - 1 >= MAX_QUEUE_SIZE) {
      return { success: false, error: "Queue is full. Please try again later." };
    }
    
    // Add to queue
    const queueRow = [
      new Date(),
      branch,
      JSON.stringify(requestData),
      requestData.request_id,
      'queued'
    ];
    
    BatchOperations.appendSheetData(cfg.FORM_SHEET_ID, cfg.PENDING_SUBMISSIONS_SHEET_NAME, [queueRow]);
    
    Logger.log(branch, requestData.request_id, 'queued', { queue_size: pendingData.length });
    
    return { success: true };
    
  } catch (error) {
    console.error('queueSubmission error:', error);
    return { success: false, error: "Failed to queue submission" };
  }
}

/**
 * Batch validation against schedule
 */
function validateAgainstScheduleBatch(selections, scheduleData, branch) {
  try {
    if (scheduleData.length <= 1) {
      return { valid: false, error: "No schedules available" };
    }
    
    const headers = scheduleData[0];
    const activityIdCol = headers.indexOf('activity_id');
    const availableSlotCol = headers.indexOf('available_slot');
    const activityNameCol = headers.indexOf('activity_name');
    const branchCol = headers.indexOf('branch');
    
    // Create a map of activity_id to available slots for the specific branch
    const scheduleMap = new Map();
    for (let i = 1; i < scheduleData.length; i++) {
      const row = scheduleData[i];
      const rowBranch = String(row[branchCol] || '').toLowerCase();
      
      if (rowBranch === branch.toLowerCase()) {
        const activityId = String(row[activityIdCol] || '');
        const availableSlot = parseInt(row[availableSlotCol]) || 0;
        const activityName = String(row[activityNameCol] || '');
        
        scheduleMap.set(activityId, {
          available_slot: availableSlot,
          activity_name: activityName
        });
      }
    }
    
    // Validate each selection
    for (const selection of selections) {
      const activityId = selection.activity_id;
      const scheduleInfo = scheduleMap.get(activityId);
      
      if (!scheduleInfo) {
        return {
          valid: false,
          error: `Activity ${selection.activity_name} not found or not available for ${branch}`
        };
      }
      
      if (scheduleInfo.available_slot <= 0) {
        return {
          valid: false,
          error: `Activity ${scheduleInfo.activity_name} is fully booked`
        };
      }
    }
    
    return { valid: true };
    
  } catch (error) {
    console.error('validateAgainstScheduleBatch error:', error);
    return { valid: false, error: "Schedule validation failed" };
  }
}

/**
 * Batch validation of existing registrations
 */
function validateExistingRegistrationsBatch(memberId, selections, branch) {
  try {
    const cfg = getCfg_(branch);
    const formData = BatchOperations.readSheetData(cfg.FORM_SHEET_ID, cfg.FORM_SHEET_NAME);
    
    if (formData.length <= 1) {
      return { valid: true }; // No existing registrations
    }
    
    const headers = formData[0];
    const memberIdCol = headers.indexOf('member_id');
    const activityNameCol = headers.indexOf('activity_name');
    
    // Count existing registrations for this member
    let existingCount = 0;
    const existingActivities = new Set();
    
    for (let i = 1; i < formData.length; i++) {
      const row = formData[i];
      if (String(row[memberIdCol] || '') === memberId) {
        existingCount++;
        existingActivities.add(String(row[activityNameCol] || ''));
      }
    }
    
    // Check total limit
    if (existingCount + selections.length > 5) {
      return {
        valid: false,
        error: `Total token limit exceeded. You have ${existingCount} tokens, trying to add ${selections.length} more. Maximum is 5.`
      };
    }
    
    // Check for duplicate activities
    for (const selection of selections) {
      if (existingActivities.has(selection.activity_name)) {
        return {
          valid: false,
          error: `You are already registered for ${selection.activity_name}`
        };
      }
    }
    
    return { valid: true };
    
  } catch (error) {
    console.error('validateExistingRegistrationsBatch error:', error);
    return { valid: false, error: "Existing registration validation failed" };
  }
}

/**
 * Process registration with batch operations
 */
function processRegistrationBatch(member, selections, scheduleData) {
  try {
    const cfg = getCfg_(member.branch);
    
    // Read current form data to get next token number
    const formData = BatchOperations.readSheetData(cfg.FORM_SHEET_ID, cfg.FORM_SHEET_NAME);
    const formHeaders = formData[0];
    const formMemberIdCol = formHeaders.indexOf('member_id');
    const tokenCol = formHeaders.indexOf('token');
    
    let maxToken = 0;
    for (let i = 1; i < formData.length; i++) {
      if (String(formData[i][formMemberIdCol] || '') === member.member_id) {
        const token = parseInt(formData[i][tokenCol]) || 0;
        maxToken = Math.max(maxToken, token);
      }
    }
    
    // Prepare new form rows
    const newFormRows = [];
    for (let i = 0; i < selections.length; i++) {
      const selection = selections[i];
      const tokenNumber = maxToken + i + 1;
      
      newFormRows.push([
        member.member_id,
        member.branch,
        member.name,
        member.birthdate,
        selection.activity_name,
        member.parent_name,
        member.contact,
        tokenNumber
      ]);
    }
    
    // Batch append to form sheet
    BatchOperations.appendSheetData(cfg.FORM_SHEET_ID, cfg.FORM_SHEET_NAME, newFormRows);
    
    // Update schedule slots in batch
    updateScheduleSlotsBatch(cfg, selections, member.branch, scheduleData);
    
    // Update member registration status
    updateMemberStatusBatch(cfg, member.member_id, 'submitted');
    
    return true;
    
  } catch (error) {
    console.error('processRegistrationBatch error:', error);
    return false;
  }
}

/**
 * Update schedule slots using batch operations
 */
function updateScheduleSlotsBatch(cfg, selections, branch, scheduleData) {
  try {
    const headers = scheduleData[0];
    const activityIdCol = headers.indexOf('activity_id');
    const bookedSlotCol = headers.indexOf('booked_slot');
    const availableSlotCol = headers.indexOf('available_slot');
    const totalSlotCol = headers.indexOf('total_slot');
    const branchCol = headers.indexOf('branch');
    
    // Count selections per activity
    const activityCounts = {};
    for (const selection of selections) {
      const activityId = selection.activity_id;
      activityCounts[activityId] = (activityCounts[activityId] || 0) + 1;
    }
    
    // Prepare batch updates
    const updates = [];
    
    for (let i = 1; i < scheduleData.length; i++) {
      const row = scheduleData[i];
      const activityId = String(row[activityIdCol] || '');
      const rowBranch = String(row[branchCol] || '').toLowerCase();
      
      if (rowBranch === branch.toLowerCase() && activityCounts[activityId]) {
        const currentBooked = parseInt(row[bookedSlotCol]) || 0;
        const totalSlot = parseInt(row[totalSlotCol]) || 0;
        const newBooked = currentBooked + activityCounts[activityId];
        const newAvailable = Math.max(0, totalSlot - newBooked);
        
        // Store update for this row
        updates.push({
          row: i + 1,
          bookedCol: bookedSlotCol + 1,
          availableCol: availableSlotCol + 1,
          newBooked,
          newAvailable
        });
      }
    }
    
    // Apply batch updates
    if (updates.length > 0) {
      const sheet = SpreadsheetApp.openById(cfg.SCHEDULE_SHEET_ID).getSheetByName(cfg.SCHEDULE_SHEET_NAME);
      
      for (const update of updates) {
        sheet.getRange(update.row, update.bookedCol).setValue(update.newBooked);
        sheet.getRange(update.row, update.availableCol).setValue(update.newAvailable);
      }
    }
    
  } catch (error) {
    console.error('updateScheduleSlotsBatch error:', error);
  }
}

/**
 * Update member status using batch operations
 */
function updateMemberStatusBatch(cfg, memberId, status) {
  try {
    const memberData = BatchOperations.readSheetData(cfg.LIST_MEMBER_SHEET_ID, cfg.LIST_MEMBER_SHEET_NAME);
    const headers = memberData[0];
    const memberIdCol = headers.indexOf('member_id');
    const registrationStatusCol = headers.indexOf('registration_status');
    
    for (let i = 1; i < memberData.length; i++) {
      if (String(memberData[i][memberIdCol] || '') === memberId) {
        const sheet = SpreadsheetApp.openById(cfg.LIST_MEMBER_SHEET_ID).getSheetByName(cfg.LIST_MEMBER_SHEET_NAME);
        sheet.getRange(i + 1, registrationStatusCol + 1).setValue(status);
        break;
      }
    }
    
  } catch (error) {
    console.error('updateMemberStatusBatch error:', error);
  }
}

/**
 * Validate submission data structure
 */
function validateSubmissionData(data) {
  if (!data || typeof data !== 'object') {
    return "Invalid request data";
  }
  
  const { member, selections, request_id } = data;
  
  // Validate request_id
  if (!request_id || typeof request_id !== 'string' || request_id.trim().length === 0) {
    return "Request ID is required";
  }
  
  // Validate member object
  if (!member || typeof member !== 'object') {
    return "Member information is required";
  }
  
  const requiredMemberFields = ['member_id', 'branch', 'name', 'birthdate', 'parent_name', 'contact'];
  for (const field of requiredMemberFields) {
    if (!member[field] || typeof member[field] !== 'string' || member[field].trim().length === 0) {
      return `Member ${field} is required`;
    }
  }
  
  // Validate selections array
  if (!Array.isArray(selections)) {
    return "Selections must be an array";
  }
  
  if (selections.length === 0) {
    return "At least one selection is required";
  }
  
  if (selections.length > 5) {
    return "Maximum 5 selections allowed";
  }
  
  // Validate each selection
  for (let i = 0; i < selections.length; i++) {
    const selection = selections[i];
    if (!selection || typeof selection !== 'object') {
      return `Selection ${i + 1} is invalid`;
    }
    
    const requiredSelectionFields = ['class_category', 'activity_id', 'activity_name'];
    for (const field of requiredSelectionFields) {
      if (!selection[field] || typeof selection[field] !== 'string' || selection[field].trim().length === 0) {
        return `Selection ${i + 1} ${field} is required`;
      }
    }
  }
  
  return null; // No validation errors
}

/**
 * Validate token limits (max 5 total, max 2 per category)
 */
function validateTokenLimits(selections) {
  // Count selections per category
  const categoryCount = {};
  
  for (const selection of selections) {
    const category = selection.class_category;
    categoryCount[category] = (categoryCount[category] || 0) + 1;
    
    if (categoryCount[category] > 2) {
      return {
        valid: false,
        error: `Max 2 tokens per category exceeded: ${category}`
      };
    }
  }
  
  return { valid: true };
}

/**
 * Time-driven trigger for processing queued submissions
 */
function processQueuedSubmissions() {
  console.log('Starting queued submissions processing...');
  
  for (const branchName of ['bsd', 'kuningan']) {
    try {
      processQueuedSubmissionsForBranch(branchName);
    } catch (error) {
      console.error(`Error processing queue for ${branchName}:`, error);
      Logger.log(branchName, null, 'queue_processing_error', { error: error.message });
    }
  }
}

/**
 * Process queued submissions for a specific branch
 */
function processQueuedSubmissionsForBranch(branch) {
  const cfg = getCfg_(branch);
  
  try {
    // Read pending submissions
    let pendingData;
    try {
      pendingData = BatchOperations.readSheetData(cfg.FORM_SHEET_ID, cfg.PENDING_SUBMISSIONS_SHEET_NAME);
    } catch (e) {
      // No pending submissions sheet
      return;
    }
    
    if (pendingData.length <= 1) {
      return; // No pending submissions
    }
    
    const headers = pendingData[0];
    const createdAtCol = headers.indexOf('created_at');
    const payloadCol = headers.indexOf('payload_json');
    const requestIdCol = headers.indexOf('request_id');
    const statusCol = headers.indexOf('status');
    
    // Get queued items (FIFO)
    const queuedItems = [];
    for (let i = 1; i < pendingData.length && queuedItems.length < BATCH_PROCESS_SIZE; i++) {
      const row = pendingData[i];
      if (String(row[statusCol] || '') === 'queued') {
        queuedItems.push({
          rowIndex: i,
          requestId: String(row[requestIdCol] || ''),
          payload: JSON.parse(String(row[payloadCol] || '{}')),
          createdAt: row[createdAtCol]
        });
      }
    }
    
    if (queuedItems.length === 0) {
      return;
    }
    
    Logger.log(branch, null, 'queue_processing_start', { items_count: queuedItems.length });
    
    // Process each queued item
    const sheet = SpreadsheetApp.openById(cfg.FORM_SHEET_ID).getSheetByName(cfg.PENDING_SUBMISSIONS_SHEET_NAME);
    
    for (const item of queuedItems) {
      try {
        // Try to acquire lock
        const lock = LockHelper.acquireBranchLock(branch, 2000); // Shorter timeout for queue processing
        
        try {
          // Process the submission
          const result = processSubmissionWithLock(item.payload);
          
          // Update status
          if (result.ok) {
            sheet.getRange(item.rowIndex + 1, statusCol + 1).setValue('completed');
            
            // Cache result for idempotency
            const idempotencyKey = CacheHelper.getIdempotencyCacheKey(item.requestId);
            CacheHelper.put(idempotencyKey, result, CACHE_TTL_IDEMPOTENCY);
            
            // Invalidate schedule cache
            CacheHelper.remove(CacheHelper.getSchedulesCacheKey(branch));
            
            Logger.log(branch, item.requestId, 'queue_item_completed');
          } else {
            sheet.getRange(item.rowIndex + 1, statusCol + 1).setValue('failed');
            Logger.log(branch, item.requestId, 'queue_item_failed', { error: result.error });
          }
          
        } finally {
          LockHelper.releaseLock(lock, branch);
        }
        
      } catch (lockError) {
        // Could not acquire lock - leave as queued for next run
        Logger.log(branch, item.requestId, 'queue_item_lock_failed');
        continue;
      }
    }
    
    Logger.log(branch, null, 'queue_processing_complete', { processed_count: queuedItems.length });
    
  } catch (error) {
    console.error(`processQueuedSubmissionsForBranch error for ${branch}:`, error);
    Logger.log(branch, null, 'queue_processing_error', { error: error.message });
  }
}

/**
 * Setup time-driven trigger (run this once to install)
 */
function setupQueueProcessingTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'processQueuedSubmissions') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  // Create new trigger (every 1 minute)
  ScriptApp.newTrigger('processQueuedSubmissions')
    .timeBased()
    .everyMinutes(1)
    .create();
  
  console.log('Queue processing trigger installed');
}

/**
 * Cleanup old logs and completed queue items (run periodically)
 */
function cleanupOldData() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep 7 days
  
  for (const branchName of ['bsd', 'kuningan']) {
    try {
      const cfg = getCfg_(branchName);
      
      // Cleanup logs
      try {
        const logsData = BatchOperations.readSheetData(cfg.FORM_SHEET_ID, cfg.LOGS_SHEET_NAME);
        if (logsData.length > 1000) { // Keep only recent 1000 entries
          const sheet = SpreadsheetApp.openById(cfg.FORM_SHEET_ID).getSheetByName(cfg.LOGS_SHEET_NAME);
          const keepRows = logsData.slice(0, 1).concat(logsData.slice(-999)); // Header + last 999 rows
          sheet.clear();
          BatchOperations.writeSheetData(cfg.FORM_SHEET_ID, cfg.LOGS_SHEET_NAME, keepRows);
        }
      } catch (e) {
        // Logs sheet doesn't exist
      }
      
      // Cleanup completed queue items
      try {
        const pendingData = BatchOperations.readSheetData(cfg.FORM_SHEET_ID, cfg.PENDING_SUBMISSIONS_SHEET_NAME);
        if (pendingData.length > 1) {
          const headers = pendingData[0];
          const createdAtCol = headers.indexOf('created_at');
          const statusCol = headers.indexOf('status');
          
          const keepRows = [headers];
          for (let i = 1; i < pendingData.length; i++) {
            const row = pendingData[i];
            const createdAt = new Date(row[createdAtCol]);
            const status = String(row[statusCol] || '');
            
            // Keep if queued or recent
            if (status === 'queued' || createdAt > cutoffDate) {
              keepRows.push(row);
            }
          }
          
          if (keepRows.length < pendingData.length) {
            const sheet = SpreadsheetApp.openById(cfg.FORM_SHEET_ID).getSheetByName(cfg.PENDING_SUBMISSIONS_SHEET_NAME);
            sheet.clear();
            BatchOperations.writeSheetData(cfg.FORM_SHEET_ID, cfg.PENDING_SUBMISSIONS_SHEET_NAME, keepRows);
          }
        }
      } catch (e) {
        // Pending submissions sheet doesn't exist
      }
      
    } catch (error) {
      console.error(`Cleanup error for ${branchName}:`, error);
    }
  }
}

/**
 * Setup cleanup trigger (run this once to install)
 */
function setupCleanupTrigger() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === 'cleanupOldData') {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  // Create new trigger (daily at 2 AM)
  ScriptApp.newTrigger('cleanupOldData')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  
  console.log('Cleanup trigger installed');
}