/**
 * Test script for Jakarta timezone timestamp formatting
 * Run this in Google Apps Script to test the timestamp conversion
 */

// Copy the formatTimestampJakarta_ function for testing
function formatTimestampJakarta_() {
  const now = new Date();
  // Convert to Jakarta time (GMT+7)
  const jakartaTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
  
  const year = jakartaTime.getUTCFullYear();
  const month = String(jakartaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(jakartaTime.getUTCDate()).padStart(2, '0');
  const hours = String(jakartaTime.getUTCHours()).padStart(2, '0');
  const minutes = String(jakartaTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(jakartaTime.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Test Jakarta timezone timestamp formatting
 */
function testJakartaTimestamp() {
  console.log('=== Testing Jakarta Timezone Timestamp ===');
  
  const now = new Date();
  const utcTimestamp = now.toISOString().replace('T', ' ').substring(0, 19);
  const jakartaTimestamp = formatTimestampJakarta_();
  
  console.log(`Current UTC time: ${utcTimestamp}`);
  console.log(`Jakarta time (GMT+7): ${jakartaTimestamp}`);
  
  // Calculate the difference in hours
  const utcDate = new Date(utcTimestamp.replace(' ', 'T') + 'Z');
  const jakartaDate = new Date(jakartaTimestamp.replace(' ', 'T') + 'Z');
  const diffHours = (jakartaDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60);
  
  console.log(`Time difference: ${diffHours} hours`);
  console.log(`Expected difference: 7 hours (GMT+7)`);
  
  if (Math.abs(diffHours - 7) < 0.1) {
    console.log('✅ PASS: Jakarta timezone conversion is correct');
  } else {
    console.log('❌ FAIL: Jakarta timezone conversion is incorrect');
  }
  
  // Test with a specific example
  console.log('\n=== Example Conversion ===');
  console.log('If your local time shows: 2025-09-13 18:17:51');
  console.log('UTC would be: 2025-09-13 11:17:51');
  console.log('Jakarta (GMT+7) should be: 2025-09-13 18:17:51');
  console.log(`Current Jakarta timestamp: ${jakartaTimestamp}`);
  
  return {
    utc: utcTimestamp,
    jakarta: jakartaTimestamp,
    difference: diffHours
  };
}

/**
 * Run the test
 */
function runTimestampTest() {
  return testJakartaTimestamp();
}