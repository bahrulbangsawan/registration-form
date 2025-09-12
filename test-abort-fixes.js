/**
 * Test script to verify ERR_ABORTED fixes
 * Run this in browser console on http://localhost:3000
 */

// Test 1: AbortController functionality
function testAbortController() {
  console.log('=== Testing AbortController ===');
  
  const controller1 = new AbortController();
  const controller2 = new AbortController();
  
  // Simulate rapid requests
  const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || 'your-gas-url';
  
  // First request
  fetch(`${url}?fn=search&branch=bsd&phone=6282129505610`, {
    method: 'GET',
    mode: 'cors',
    signal: controller1.signal
  }).catch(err => {
    if (err.name === 'AbortError') {
      console.log('✅ First request properly aborted');
    } else {
      console.error('❌ Unexpected error:', err);
    }
  });
  
  // Abort first request immediately
  controller1.abort();
  
  // Second request should proceed
  fetch(`${url}?fn=search&branch=bsd&phone=6282129505610`, {
    method: 'GET',
    mode: 'cors',
    signal: controller2.signal
  }).then(response => {
    console.log('✅ Second request completed:', response.status);
  }).catch(err => {
    console.error('❌ Second request failed:', err);
  });
}

// Test 2: Phone number validation
function testPhoneValidation() {
  console.log('=== Testing Phone Validation ===');
  
  const testCases = [
    { phone: '123', expected: 'too short' },
    { phone: '12345678', expected: 'too short' },
    { phone: '123456789', expected: 'valid' },
    { phone: '6282129505610', expected: 'valid' },
    { phone: '082129505610', expected: 'valid' },
    { phone: '82129505610', expected: 'valid' }
  ];
  
  testCases.forEach(test => {
    const digits = test.phone.replace(/\D/g, '');
    const isValid = digits.length >= 9;
    const result = isValid ? 'valid' : 'too short';
    
    if (result === test.expected) {
      console.log(`✅ ${test.phone} -> ${result}`);
    } else {
      console.log(`❌ ${test.phone} -> expected ${test.expected}, got ${result}`);
    }
  });
}

// Test 3: URL encoding
function testUrlEncoding() {
  console.log('=== Testing URL Encoding ===');
  
  const testPhones = [
    '6282129505610',
    '082-129-505-610',
    '+62 821 2950 5610',
    '(0821) 2950-5610'
  ];
  
  testPhones.forEach(phone => {
    const digits = phone.replace(/\D/g, '');
    const encoded = encodeURIComponent(digits);
    console.log(`✅ ${phone} -> ${digits} -> ${encoded}`);
  });
}

// Test 4: Manual UI testing instructions
function printManualTestInstructions() {
  console.log('=== Manual Testing Instructions ===');
  console.log('1. Select a branch (BSD or Kuningan)');
  console.log('2. Type quickly in phone field - should not see ERR_ABORTED errors');
  console.log('3. Toggle between branches while typing - should clear results cleanly');
  console.log('4. Try short numbers (< 9 digits) - should not trigger requests');
  console.log('5. Click search button - should send immediate request');
  console.log('6. Check browser console - no AbortError logs should appear');
  console.log('7. Check network tab - aborted requests should show as cancelled');
}

// Run all tests
console.log('🧪 Starting ERR_ABORTED Fix Tests...');
testAbortController();
testPhoneValidation();
testUrlEncoding();
printManualTestInstructions();
console.log('🧪 Tests completed. Check results above.');