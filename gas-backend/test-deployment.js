/**
 * Test script to verify Google Apps Script deployment
 * Run this in browser console or as a standalone HTML file
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwxEI50wYXD4bMdQReP12I0YWZYv5mja9UH46n0tnJD9URdHzrfetDKEmk5aezdTjXr/exec';

// Test 1: Health Check
async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  try {
    const response = await fetch(GAS_URL, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });
    
    console.log('✅ Health check response status:', response.status);
    console.log('✅ Health check response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('✅ Health check data:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error);
    return false;
  }
}

// Test 2: Search Function
async function testSearch() {
  console.log('🔍 Testing search function...');
  try {
    const searchUrl = `${GAS_URL}?fn=search&branch=bsd&phone=82129506`;
    const response = await fetch(searchUrl, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow'
    });
    
    console.log('✅ Search response status:', response.status);
    console.log('✅ Search response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('✅ Search data:', data);
    return true;
  } catch (error) {
    console.error('❌ Search test failed:', error);
    return false;
  }
}

// Test 3: POST Request
async function testPost() {
  console.log('🔍 Testing POST request...');
  try {
    const testPayload = {
      member: {
        member_id: 'TEST001',
        branch: 'bsd',
        name: 'Test User',
        birthdate: '2000-01-01',
        parent_name: 'Test Parent',
        contact: '82129506'
      },
      selections: [],
      request_id: 'test-' + Date.now()
    };
    
    const response = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    console.log('✅ POST response status:', response.status);
    console.log('✅ POST response headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('✅ POST data:', data);
    return true;
  } catch (error) {
    console.error('❌ POST test failed:', error);
    return false;
  }
}

// Test 4: Browser Environment Check
function testBrowserEnvironment() {
  console.log('🔍 Testing browser environment...');
  
  const info = {
    userAgent: navigator.userAgent,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    language: navigator.language,
    platform: navigator.platform,
    referrer: document.referrer,
    url: window.location.href,
    protocol: window.location.protocol,
    host: window.location.host
  };
  
  console.log('✅ Browser info:', info);
  
  // Check for potential blocking extensions
  if (typeof window.chrome !== 'undefined' && window.chrome.runtime) {
    console.log('⚠️  Chrome extension environment detected');
  }
  
  // Check for ad blockers (common cause of ERR_ABORTED)
  const testAd = document.createElement('div');
  testAd.innerHTML = '&nbsp;';
  testAd.className = 'adsbox';
  testAd.style.position = 'absolute';
  testAd.style.left = '-10000px';
  document.body.appendChild(testAd);
  
  setTimeout(() => {
    if (testAd.offsetHeight === 0) {
      console.log('⚠️  Ad blocker detected - may cause ERR_ABORTED');
    } else {
      console.log('✅ No ad blocker detected');
    }
    document.body.removeChild(testAd);
  }, 100);
}

// Test 5: Network Connectivity
async function testNetworkConnectivity() {
  console.log('🔍 Testing network connectivity...');
  
  const testUrls = [
    'https://www.google.com/favicon.ico',
    'https://script.google.com/favicon.ico',
    'https://accounts.google.com/favicon.ico'
  ];
  
  for (const url of testUrls) {
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      console.log(`✅ ${url} - accessible`);
    } catch (error) {
      console.log(`❌ ${url} - blocked:`, error.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Google Apps Script deployment tests...');
  console.log('📍 Testing URL:', GAS_URL);
  console.log('⏰ Test started at:', new Date().toISOString());
  
  testBrowserEnvironment();
  await testNetworkConnectivity();
  
  const healthOk = await testHealthCheck();
  if (healthOk) {
    await testSearch();
    await testPost();
  }
  
  console.log('✅ All tests completed!');
  console.log('💡 If you see ERR_ABORTED errors, check the troubleshooting guide.');
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('🔧 Google Apps Script Deployment Tester loaded');
  console.log('📝 Run runAllTests() to start testing');
  console.log('📖 Or run individual tests: testHealthCheck(), testSearch(), testPost()');
  
  // Expose functions globally
  window.runAllTests = runAllTests;
  window.testHealthCheck = testHealthCheck;
  window.testSearch = testSearch;
  window.testPost = testPost;
  window.testBrowserEnvironment = testBrowserEnvironment;
  window.testNetworkConnectivity = testNetworkConnectivity;
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testHealthCheck,
    testSearch,
    testPost,
    testBrowserEnvironment,
    testNetworkConnectivity
  };
}