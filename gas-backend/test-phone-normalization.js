/**
 * Test script for phone normalization function
 * Run this in Google Apps Script to test phone number normalization
 */

// Copy the normalizePhone_ function for testing
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
  
  // For other formats, return as-is
  return digits;
}

function phonesEqual_(phone1, phone2) {
  const normalized1 = normalizePhone_(phone1);
  const normalized2 = normalizePhone_(phone2);
  
  console.log(`Phone comparison: '${phone1}' -> '${normalized1}' vs '${phone2}' -> '${normalized2}' = ${normalized1 === normalized2}`);
  
  return normalized1 === normalized2;
}

/**
 * Test phone normalization with various formats
 */
function testPhoneNormalization() {
  console.log('=== Testing Phone Normalization ===');
  
  const testCases = [
    // Indonesian local format
    { input: '081234567890', expected: '6281234567890' },
    { input: '0812-3456-7890', expected: '6281234567890' },
    { input: '0812 3456 7890', expected: '6281234567890' },
    
    // International format
    { input: '+6281234567890', expected: '6281234567890' },
    { input: '6281234567890', expected: '6281234567890' },
    
    // Edge cases
    { input: '', expected: '' },
    { input: null, expected: '' },
    { input: undefined, expected: '' },
    { input: '123', expected: '123' },
    { input: 'abc', expected: '' },
    { input: '+1-555-123-4567', expected: '15551234567' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach((testCase, index) => {
    const result = normalizePhone_(testCase.input);
    const success = result === testCase.expected;
    
    console.log(`Test ${index + 1}: ${success ? 'PASS' : 'FAIL'}`);
    console.log(`  Input: '${testCase.input}'`);
    console.log(`  Expected: '${testCase.expected}'`);
    console.log(`  Got: '${result}'`);
    console.log('');
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log(`=== Test Results ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${testCases.length}`);
  
  return { passed, failed, total: testCases.length };
}

/**
 * Test phone comparison with various combinations
 */
function testPhoneComparison() {
  console.log('\n=== Testing Phone Comparison ===');
  
  const comparisonTests = [
    { phone1: '081234567890', phone2: '+6281234567890', shouldMatch: true },
    { phone1: '0812-3456-7890', phone2: '6281234567890', shouldMatch: true },
    { phone1: '081234567890', phone2: '081234567891', shouldMatch: false },
    { phone1: '081234567890', phone2: '0812 3456 7890', shouldMatch: true },
    { phone1: '', phone2: '', shouldMatch: true },
    { phone1: '081234567890', phone2: '', shouldMatch: false }
  ];
  
  let passed = 0;
  let failed = 0;
  
  comparisonTests.forEach((test, index) => {
    const result = phonesEqual_(test.phone1, test.phone2);
    const success = result === test.shouldMatch;
    
    console.log(`Comparison Test ${index + 1}: ${success ? 'PASS' : 'FAIL'}`);
    console.log(`  Phone1: '${test.phone1}'`);
    console.log(`  Phone2: '${test.phone2}'`);
    console.log(`  Should match: ${test.shouldMatch}`);
    console.log(`  Result: ${result}`);
    console.log('');
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  });
  
  console.log(`=== Comparison Test Results ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${comparisonTests.length}`);
  
  return { passed, failed, total: comparisonTests.length };
}

/**
 * Run all tests
 */
function runAllTests() {
  const normalizationResults = testPhoneNormalization();
  const comparisonResults = testPhoneComparison();
  
  const totalPassed = normalizationResults.passed + comparisonResults.passed;
  const totalFailed = normalizationResults.failed + comparisonResults.failed;
  const totalTests = normalizationResults.total + comparisonResults.total;
  
  console.log('\n=== OVERALL RESULTS ===');
  console.log(`Total Passed: ${totalPassed}`);
  console.log(`Total Failed: ${totalFailed}`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  
  if (totalFailed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log(`❌ ${totalFailed} test(s) failed. Please review the implementation.`);
  }
}