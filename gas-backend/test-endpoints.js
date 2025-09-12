/**
 * Test script for Google Apps Script endpoints
 * Run with Node.js to verify your GAS deployment
 * 
 * Usage:
 * 1. Update the GAS_URL variable with your actual Web App URL
 * 2. Run: node test-endpoints.js
 */

const https = require('https');
const http = require('http');

// UPDATE THIS WITH YOUR ACTUAL GOOGLE APPS SCRIPT WEB APP URL
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzvuoi3g8xhVhLNhUqsVdbIMEp98pa1UbT2EzbqKJBQb_5uWUyUZvB6LnvoASX-1QRr/exec';

// Test configuration
const TESTS = {
  healthCheck: true,
  memberSearch: true,
  loadSchedules: true,
  submitRegistration: false // Set to true only if you want to test actual submission
};

// Sample test data
const SAMPLE_MEMBER = {
  member_id: 'TEST-2024-00001',
  branch: 'test',
  name: 'Test User',
  birthdate: '2020-01-01',
  parent_name: 'Test Parent',
  contact: '1234567890'
};

const SAMPLE_SELECTIONS = [
  {
    class_category: 'Tennis',
    activity_id: '66327',
    activity_name: 'Ministar Tennis - Tuesday, 03:00 pm'
  }
];

/**
 * Make HTTP request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

/**
 * Test health check endpoint
 */
async function testHealthCheck() {
  console.log('\n🔍 Testing Health Check...');
  
  try {
    const response = await makeRequest(GAS_URL);
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200 && response.data.ok === true) {
      console.log('✅ Health check PASSED');
      return true;
    } else {
      console.log('❌ Health check FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ Health check ERROR:', error.message);
    return false;
  }
}

/**
 * Test member search endpoint
 */
async function testMemberSearch() {
  console.log('\n🔍 Testing Member Search...');
  
  try {
    const searchUrl = `${GAS_URL}?fn=search&name=test`;
    const response = await makeRequest(searchUrl);
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200 && response.data.ok === true) {
      console.log('✅ Member search PASSED');
      console.log(`Found ${response.data.results.length} members`);
      return true;
    } else {
      console.log('❌ Member search FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ Member search ERROR:', error.message);
    return false;
  }
}

/**
 * Test load schedules endpoint
 */
async function testLoadSchedules() {
  console.log('\n🔍 Testing Load Schedules...');
  
  try {
    const schedulesUrl = `${GAS_URL}?fn=schedules`;
    const response = await makeRequest(schedulesUrl);
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200 && response.data.ok === true) {
      console.log('✅ Load schedules PASSED');
      console.log(`Found ${response.data.items.length} activities`);
      
      // Validate schedule structure
      if (response.data.items.length > 0) {
        const firstItem = response.data.items[0];
        const requiredFields = ['activity_id', 'branch', 'class_category', 'activity_name', 'total_slot', 'booked_slot', 'available_slot'];
        const missingFields = requiredFields.filter(field => !(field in firstItem));
        
        if (missingFields.length === 0) {
          console.log('✅ Schedule structure is correct');
        } else {
          console.log('⚠️  Missing fields in schedule:', missingFields);
        }
      }
      
      return true;
    } else {
      console.log('❌ Load schedules FAILED');
      return false;
    }
  } catch (error) {
    console.log('❌ Load schedules ERROR:', error.message);
    return false;
  }
}

/**
 * Test registration submission endpoint
 */
async function testSubmitRegistration() {
  console.log('\n🔍 Testing Submit Registration...');
  console.log('⚠️  This will create test data in your sheets!');
  
  try {
    const response = await makeRequest(GAS_URL, {
      method: 'POST',
      body: {
        member: SAMPLE_MEMBER,
        selections: SAMPLE_SELECTIONS
      }
    });
    
    console.log(`Status: ${response.statusCode}`);
    console.log(`Response:`, JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200 && response.data.ok === true) {
      console.log('✅ Submit registration PASSED');
      return true;
    } else {
      console.log('❌ Submit registration FAILED');
      if (response.data.error) {
        console.log('Error message:', response.data.error);
      }
      return false;
    }
  } catch (error) {
    console.log('❌ Submit registration ERROR:', error.message);
    return false;
  }
}

/**
 * Test CORS headers
 */
function testCORSHeaders(response) {
  console.log('\n🔍 Testing CORS Headers...');
  
  const corsHeaders = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type'
  };
  
  let corsValid = true;
  
  for (const [header, expectedValue] of Object.entries(corsHeaders)) {
    const actualValue = response.headers[header];
    if (actualValue) {
      console.log(`✅ ${header}: ${actualValue}`);
    } else {
      console.log(`❌ Missing header: ${header}`);
      corsValid = false;
    }
  }
  
  if (corsValid) {
    console.log('✅ CORS headers are properly configured');
  } else {
    console.log('❌ CORS headers are missing or incorrect');
  }
  
  return corsValid;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting Google Apps Script Endpoint Tests');
  console.log('='.repeat(50));
  
  // Validate URL
  if (GAS_URL.includes('YOUR_SCRIPT_ID')) {
    console.log('❌ Please update the GAS_URL variable with your actual Google Apps Script URL');
    process.exit(1);
  }
  
  console.log(`Testing URL: ${GAS_URL}`);
  
  const results = {
    healthCheck: false,
    memberSearch: false,
    loadSchedules: false,
    submitRegistration: false,
    cors: false
  };
  
  // Run tests
  if (TESTS.healthCheck) {
    const response = await makeRequest(GAS_URL);
    results.healthCheck = await testHealthCheck();
    results.cors = testCORSHeaders(response);
  }
  
  if (TESTS.memberSearch) {
    results.memberSearch = await testMemberSearch();
  }
  
  if (TESTS.loadSchedules) {
    results.loadSchedules = await testLoadSchedules();
  }
  
  if (TESTS.submitRegistration) {
    results.submitRegistration = await testSubmitRegistration();
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Test Results Summary:');
  console.log('='.repeat(50));
  
  for (const [test, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${test.padEnd(20)}: ${status}`);
  }
  
  const totalTests = Object.values(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  console.log('\n' + '-'.repeat(50));
  console.log(`Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Your Google Apps Script is ready.');
  } else {
    console.log('⚠️  Some tests failed. Please check your Google Apps Script configuration.');
  }
  
  console.log('\n📚 Next steps:');
  console.log('1. Update your .env.local file with the GAS URL');
  console.log('2. Restart your Next.js development server');
  console.log('3. Test the frontend application');
}

// Run the tests
runTests().catch(console.error);

// Export for use in other scripts
module.exports = {
  makeRequest,
  testHealthCheck,
  testMemberSearch,
  testLoadSchedules,
  testSubmitRegistration
};