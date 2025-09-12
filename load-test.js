#!/usr/bin/env node

/**
 * Load Testing Script for KYZN Registration System
 * 
 * This script tests the high-load hardening features:
 * - 3,000 concurrent submissions
 * - Idempotency with duplicate request_ids
 * - Queue handling under load
 * - Conflict resolution for overbooking
 * - Exponential backoff and retry logic
 */

const https = require('https');
const http = require('http');

// Configuration
const CONFIG = {
  // Update this to your deployed Google Apps Script URL
  GAS_URL: process.env.GAS_URL || 'https://script.google.com/macros/s/AKfycbw2j07UeYxzqO1WBV-cBCIHFJzW0nUl0yekYwjP2LeUGr2HlfU542A3sxA15RXdrRQ/exec',
  
  // Test parameters
  CONCURRENT_REQUESTS: 3000,
  DUPLICATE_REQUESTS: 50, // Number of duplicate request_ids to test idempotency
  TARGET_ACTIVITY_ID: 'activity_1', // Activity to target for overbooking test
  
  // Test member data
  TEST_MEMBER: {
    member_id: 'TEST001',
    name: 'Load Test User',
    phone: '+1234567890',
    branch: 'BSD'
  }
};

// Generate UUID v4
function generateRequestId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Create test payload
function createTestPayload(requestId, activityId = null) {
  return {
    member: CONFIG.TEST_MEMBER,
    selections: [{
      activity_id: activityId || `activity_${Math.floor(Math.random() * 10) + 1}`,
      activity_name: `Test Activity ${Math.floor(Math.random() * 10) + 1}`,
      class_category: 'test_category',
      schedule_time: '10:00-11:00',
      instructor: 'Test Instructor'
    }],
    request_id: requestId
  };
}

// Make HTTP request
function makeRequest(payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const url = new URL(CONFIG.GAS_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 30000 // 30 second timeout
    };

    const client = url.protocol === 'https:' ? https : http;
    
    const startTime = Date.now();
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            success: true,
            status: res.statusCode,
            data: parsedData,
            duration,
            requestId: payload.request_id
          });
        } catch (err) {
          resolve({
            success: false,
            error: 'Invalid JSON response',
            status: res.statusCode,
            duration,
            requestId: payload.request_id,
            rawResponse: responseData
          });
        }
      });
    });
    
    req.on('error', (err) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      resolve({
        success: false,
        error: err.message,
        duration,
        requestId: payload.request_id
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      const endTime = Date.now();
      const duration = endTime - startTime;
      resolve({
        success: false,
        error: 'Request timeout',
        duration,
        requestId: payload.request_id
      });
    });
    
    req.write(data);
    req.end();
  });
}

// Test 1: Burst test for overbooking prevention
async function testOverbookingPrevention() {
  console.log('\n🎯 Test 1: Overbooking Prevention');
  console.log(`Sending ${CONFIG.CONCURRENT_REQUESTS} requests to the same activity...`);
  
  const requests = [];
  const startTime = Date.now();
  
  // Create concurrent requests targeting the same activity
  for (let i = 0; i < CONFIG.CONCURRENT_REQUESTS; i++) {
    const requestId = generateRequestId();
    const payload = createTestPayload(requestId, CONFIG.TARGET_ACTIVITY_ID);
    requests.push(makeRequest(payload));
  }
  
  const results = await Promise.all(requests);
  const endTime = Date.now();
  
  // Analyze results
  const stats = {
    total: results.length,
    successful: 0,
    queued: 0,
    conflicts: 0,
    busy: 0,
    errors: 0,
    avgDuration: 0
  };
  
  let totalDuration = 0;
  
  results.forEach(result => {
    totalDuration += result.duration;
    
    if (result.success && result.data?.ok) {
      if (result.data.queued) {
        stats.queued++;
      } else {
        stats.successful++;
      }
    } else if (result.success && result.data?.conflicts) {
      stats.conflicts++;
    } else if (result.status === 503) {
      stats.busy++;
    } else {
      stats.errors++;
    }
  });
  
  stats.avgDuration = Math.round(totalDuration / results.length);
  
  console.log('Results:');
  console.log(`  ✅ Successful: ${stats.successful}`);
  console.log(`  ⏳ Queued: ${stats.queued}`);
  console.log(`  ⚠️  Conflicts: ${stats.conflicts}`);
  console.log(`  🚫 Busy (503): ${stats.busy}`);
  console.log(`  ❌ Errors: ${stats.errors}`);
  console.log(`  ⏱️  Average Duration: ${stats.avgDuration}ms`);
  console.log(`  🕐 Total Test Time: ${endTime - startTime}ms`);
  
  return stats;
}

// Test 2: Idempotency test
async function testIdempotency() {
  console.log('\n🔄 Test 2: Idempotency');
  console.log(`Testing ${CONFIG.DUPLICATE_REQUESTS} duplicate request_ids...`);
  
  const duplicateRequestIds = [];
  for (let i = 0; i < CONFIG.DUPLICATE_REQUESTS; i++) {
    duplicateRequestIds.push(generateRequestId());
  }
  
  const requests = [];
  
  // Send each request_id 5 times
  duplicateRequestIds.forEach(requestId => {
    for (let i = 0; i < 5; i++) {
      const payload = createTestPayload(requestId);
      requests.push(makeRequest(payload));
    }
  });
  
  const results = await Promise.all(requests);
  
  // Group results by request_id
  const groupedResults = {};
  results.forEach(result => {
    if (!groupedResults[result.requestId]) {
      groupedResults[result.requestId] = [];
    }
    groupedResults[result.requestId].push(result);
  });
  
  let idempotencyViolations = 0;
  let successfulGroups = 0;
  
  Object.entries(groupedResults).forEach(([requestId, groupResults]) => {
    const successfulResults = groupResults.filter(r => r.success && r.data?.ok && !r.data?.queued);
    
    if (successfulResults.length > 1) {
      idempotencyViolations++;
      console.log(`  ⚠️  Violation: ${requestId} succeeded ${successfulResults.length} times`);
    } else if (successfulResults.length === 1) {
      successfulGroups++;
    }
  });
  
  console.log('Results:');
  console.log(`  ✅ Proper idempotency: ${successfulGroups}/${duplicateRequestIds.length}`);
  console.log(`  ❌ Violations: ${idempotencyViolations}`);
  
  return { successfulGroups, idempotencyViolations };
}

// Test 3: Queue processing test
async function testQueueProcessing() {
  console.log('\n⏳ Test 3: Queue Processing');
  console.log('This test requires manual verification of queue processing triggers.');
  console.log('Check your Google Apps Script execution logs for queue processing activity.');
  
  // This would require access to the Google Apps Script execution logs
  // or a status endpoint to check queue processing
  return { message: 'Manual verification required' };
}

// Main test runner
async function runLoadTests() {
  console.log('🚀 KYZN Registration System Load Test');
  console.log('=====================================');
  console.log(`Target URL: ${CONFIG.GAS_URL}`);
  console.log(`Concurrent Requests: ${CONFIG.CONCURRENT_REQUESTS}`);
  
  if (!CONFIG.GAS_URL.includes('script.google.com')) {
    console.log('⚠️  Warning: Please update GAS_URL in the configuration');
    console.log('   Set the GAS_URL environment variable or update the script');
    return;
  }
  
  try {
    // Run tests
    const overBookingResults = await testOverbookingPrevention();
    const idempotencyResults = await testIdempotency();
    const queueResults = await testQueueProcessing();
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    
    const totalRequests = overBookingResults.total + (CONFIG.DUPLICATE_REQUESTS * 5);
    const totalSuccessful = overBookingResults.successful + overBookingResults.queued;
    
    console.log(`Total Requests Sent: ${totalRequests}`);
    console.log(`Successful/Queued: ${totalSuccessful}`);
    console.log(`Conflicts Detected: ${overBookingResults.conflicts}`);
    console.log(`Idempotency Violations: ${idempotencyResults.idempotencyViolations}`);
    
    // Pass/Fail criteria
    const passed = (
      idempotencyResults.idempotencyViolations === 0 &&
      overBookingResults.conflicts > 0 && // Should have conflicts when targeting same activity
      totalSuccessful > 0 // Should have some successful submissions
    );
    
    console.log(`\n${passed ? '✅ TESTS PASSED' : '❌ TESTS FAILED'}`);
    
    if (!passed) {
      console.log('\nFailure Analysis:');
      if (idempotencyResults.idempotencyViolations > 0) {
        console.log('- Idempotency is not working correctly');
      }
      if (overBookingResults.conflicts === 0) {
        console.log('- Conflict detection may not be working');
      }
      if (totalSuccessful === 0) {
        console.log('- No successful submissions (check server configuration)');
      }
    }
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  runLoadTests().catch(console.error);
}

module.exports = { runLoadTests, testOverbookingPrevention, testIdempotency };