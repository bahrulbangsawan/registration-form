# End-to-End Integration Testing Guide

This guide covers comprehensive testing of the complete registration system, from frontend UI to Google Apps Script backend and Google Sheets data storage.

## Prerequisites

### Backend Setup
1. **Google Apps Script deployed** with Web App URL
2. **Google Sheets configured** with `form2025` and `schedule2025`
3. **Test data populated** in both sheets
4. **Backend endpoints tested** individually (see `gas-backend/TESTING.md`)

### Frontend Setup
1. **Environment configured** with `NEXT_PUBLIC_APPS_SCRIPT_URL`
2. **Dependencies installed** (`npm install`)
3. **Development server running** (`npm run dev`)

## Integration Test Scenarios

### Scenario 1: Complete Happy Path

**Objective**: Test the full registration flow with valid data

**Steps**:
1. **Open the application**:
   ```bash
   npm run dev
   # Navigate to http://localhost:3000
   ```

2. **Test Member Search**:
   - Enter a partial name in the search field
   - Verify autocomplete suggestions appear
   - Select a member from the dropdown
   - Confirm member details populate correctly

3. **Test Activity Selection**:
   - Browse available activities by category
   - Select 1-3 activities from different categories
   - Verify activity details display correctly
   - Check that selected activities appear in the summary

4. **Test Registration Submission**:
   - Click "Submit Registration"
   - Verify loading state appears
   - Confirm success message displays
   - Check that form resets after successful submission

5. **Verify Backend Data**:
   - Check `form2025` sheet for new registration rows
   - Verify `schedule2025` sheet shows updated `booked_slot` and `available_slot`
   - Confirm token format matches specification

**Expected Results**:
- ✅ Member search returns relevant results
- ✅ Activity selection works smoothly
- ✅ Registration submits successfully
- ✅ Data appears correctly in Google Sheets
- ✅ No console errors or network failures

### Scenario 2: Validation Testing

#### Test 2.1: Token Limits

**Objective**: Verify frontend and backend enforce token limits

**Steps**:
1. **Test 5-token limit**:
   - Select 6 activities
   - Attempt to submit
   - Verify error message appears
   - Confirm submission is blocked

2. **Test category limit**:
   - Select 3 activities from the same category
   - Attempt to submit
   - Verify category-specific error message
   - Confirm submission is blocked

**Expected Results**:
- ✅ Frontend prevents selection of 6th activity
- ✅ Frontend prevents 3rd activity in same category
- ✅ Backend validates and returns appropriate errors
- ✅ Error messages are user-friendly and specific

#### Test 2.2: Capacity Validation

**Objective**: Test session capacity enforcement

**Steps**:
1. **Prepare test data**:
   - Set an activity's `available_slot` to 1 in `schedule2025`
   - Note the activity details

2. **Test capacity limit**:
   - Select the activity with 1 available slot
   - Submit registration (should succeed)
   - Immediately try to register another member for the same activity
   - Verify the second registration fails with "Session full" error

**Expected Results**:
- ✅ First registration succeeds
- ✅ Second registration fails with clear error message
- ✅ Available slots update correctly
- ✅ Frontend shows updated availability

### Scenario 3: Race Condition Testing

**Objective**: Test concurrent registration handling

**Steps**:
1. **Setup concurrent test**:
   - Open the application in two browser tabs
   - Select the same activity with limited slots in both tabs
   - Prepare to submit simultaneously

2. **Execute concurrent submissions**:
   - Submit registrations from both tabs at nearly the same time
   - Monitor network requests in browser dev tools
   - Check final state in Google Sheets

**Expected Results**:
- ✅ Only one registration succeeds
- ✅ The other receives "Session full" error
- ✅ No data corruption in sheets
- ✅ LockService prevents race conditions

### Scenario 4: Error Handling

#### Test 4.1: Network Errors

**Objective**: Test application behavior during network issues

**Steps**:
1. **Simulate network failure**:
   - Disconnect internet or block the GAS URL
   - Attempt to search for members
   - Attempt to load activities
   - Attempt to submit registration

2. **Test error recovery**:
   - Restore network connection
   - Retry failed operations
   - Verify application recovers gracefully

**Expected Results**:
- ✅ Clear error messages for network failures
- ✅ Application doesn't crash or freeze
- ✅ User can retry operations after network recovery
- ✅ Form data is preserved during errors

#### Test 4.2: Invalid Data Handling

**Objective**: Test handling of corrupted or invalid data

**Steps**:
1. **Test invalid member data**:
   - Manually corrupt member data in `form2025`
   - Search for the corrupted member
   - Verify graceful error handling

2. **Test invalid activity data**:
   - Manually corrupt activity data in `schedule2025`
   - Load activities list
   - Verify graceful error handling

**Expected Results**:
- ✅ Invalid data doesn't crash the application
- ✅ Clear error messages for data issues
- ✅ Valid data still displays correctly

### Scenario 5: UI/UX Testing

#### Test 5.1: Responsive Design

**Objective**: Verify application works on different screen sizes

**Steps**:
1. **Test mobile view** (320px - 768px):
   - Navigate through all screens
   - Test member search functionality
   - Test activity selection
   - Submit registration

2. **Test tablet view** (768px - 1024px):
   - Repeat all core functionality tests
   - Verify layout adapts appropriately

3. **Test desktop view** (1024px+):
   - Test all functionality
   - Verify optimal use of screen space

**Expected Results**:
- ✅ All functionality works on all screen sizes
- ✅ UI elements are appropriately sized and positioned
- ✅ Text remains readable
- ✅ Touch targets are appropriately sized on mobile

#### Test 5.2: Accessibility

**Objective**: Verify application is accessible to users with disabilities

**Steps**:
1. **Keyboard navigation**:
   - Navigate entire application using only keyboard
   - Verify all interactive elements are reachable
   - Test form submission with keyboard only

2. **Screen reader compatibility**:
   - Test with screen reader software
   - Verify proper ARIA labels and descriptions
   - Check form field associations

3. **Color contrast**:
   - Verify sufficient contrast ratios
   - Test with color blindness simulators

**Expected Results**:
- ✅ Full keyboard accessibility
- ✅ Screen reader compatibility
- ✅ Sufficient color contrast
- ✅ Clear focus indicators

### Scenario 6: Performance Testing

#### Test 6.1: Load Testing

**Objective**: Test application performance under load

**Steps**:
1. **Test with large datasets**:
   - Add 1000+ members to `form2025`
   - Add 100+ activities to `schedule2025`
   - Test search performance
   - Test activity loading performance

2. **Test concurrent users**:
   - Simulate multiple users accessing the application
   - Monitor response times
   - Check for performance degradation

**Expected Results**:
- ✅ Search remains responsive with large datasets
- ✅ Activity loading completes within reasonable time
- ✅ No significant performance degradation under load
- ✅ Google Apps Script stays within execution limits

### Scenario 7: Browser Compatibility

**Objective**: Verify cross-browser functionality

**Browsers to Test**:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

**Test Steps**:
1. **Core functionality** in each browser:
   - Member search
   - Activity selection
   - Registration submission

2. **UI consistency**:
   - Visual appearance
   - Interactive elements
   - Responsive behavior

**Expected Results**:
- ✅ All functionality works in all tested browsers
- ✅ UI appears consistent across browsers
- ✅ No browser-specific errors

## Integration Test Checklist

### Pre-Testing Setup
- [ ] Google Apps Script deployed and accessible
- [ ] Google Sheets configured with correct structure
- [ ] Test data populated in sheets
- [ ] Frontend environment configured
- [ ] Development server running
- [ ] Browser dev tools open for monitoring

### Core Functionality Tests
- [ ] Member search works correctly
- [ ] Activity loading displays all available sessions
- [ ] Activity selection updates UI appropriately
- [ ] Registration submission succeeds with valid data
- [ ] Success/error messages display correctly
- [ ] Form resets after successful submission

### Validation Tests
- [ ] 5-token limit enforced (frontend and backend)
- [ ] 2-per-category limit enforced (frontend and backend)
- [ ] Session capacity enforced
- [ ] Invalid activity IDs rejected
- [ ] Missing required fields rejected
- [ ] Malformed requests handled gracefully

### Data Integrity Tests
- [ ] Registration data appears correctly in `form2025`
- [ ] Schedule slots update correctly in `schedule2025`
- [ ] Token format matches specification
- [ ] No duplicate or corrupted data
- [ ] Concurrent registrations handled correctly

### Error Handling Tests
- [ ] Network errors handled gracefully
- [ ] Invalid data doesn't crash application
- [ ] Clear error messages displayed
- [ ] Application recovers from errors
- [ ] Form data preserved during errors

### UI/UX Tests
- [ ] Responsive design works on all screen sizes
- [ ] Keyboard navigation functional
- [ ] Screen reader compatibility
- [ ] Sufficient color contrast
- [ ] Loading states display appropriately

### Performance Tests
- [ ] Search performs well with large datasets
- [ ] Activity loading completes within 5 seconds
- [ ] Registration submission completes within 10 seconds
- [ ] No memory leaks or performance degradation

### Browser Compatibility Tests
- [ ] Chrome: All functionality works
- [ ] Firefox: All functionality works
- [ ] Safari: All functionality works
- [ ] Edge: All functionality works
- [ ] Mobile browsers: Core functionality works

### Security Tests
- [ ] CORS headers configured correctly
- [ ] Rate limiting functional
- [ ] No sensitive data exposed in client
- [ ] Input validation prevents injection attacks

## Troubleshooting Common Issues

### Frontend Issues

1. **"Network Error" or CORS issues**:
   - Verify `NEXT_PUBLIC_APPS_SCRIPT_URL` is correct
   - Check Google Apps Script CORS configuration
   - Ensure script is deployed with "Anyone" access

2. **Search not working**:
   - Check network requests in browser dev tools
   - Verify member data exists in `form2025`
   - Check for JavaScript console errors

3. **Activities not loading**:
   - Verify `schedule2025` has data
   - Check activity data format
   - Monitor network requests for errors

### Backend Issues

1. **Script execution errors**:
   - Check Google Apps Script execution logs
   - Verify sheet permissions
   - Check for syntax errors in script

2. **Data not saving**:
   - Verify sheet structure matches specification
   - Check for permission issues
   - Monitor script execution transcript

3. **Performance issues**:
   - Check for inefficient queries
   - Monitor execution time limits
   - Consider optimizing data access patterns

## Sign-off Criteria

The integration testing is complete when:

- [ ] All test scenarios pass successfully
- [ ] No critical or high-priority bugs remain
- [ ] Performance meets acceptable standards
- [ ] Cross-browser compatibility confirmed
- [ ] Accessibility requirements met
- [ ] Documentation is complete and accurate
- [ ] Production deployment tested

## Next Steps

After successful integration testing:

1. **Production Deployment**:
   - Build production version: `npm run build && npm run export`
   - Deploy to GitHub Pages
   - Test production environment

2. **Monitoring Setup**:
   - Monitor Google Apps Script execution logs
   - Set up alerts for errors or performance issues
   - Track usage patterns

3. **User Acceptance Testing**:
   - Conduct testing with actual users
   - Gather feedback on usability
   - Make final adjustments based on feedback

4. **Go-Live Preparation**:
   - Prepare user documentation
   - Train support staff
   - Plan rollout strategy