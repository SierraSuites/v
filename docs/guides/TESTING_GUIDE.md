# The Sierra Suites - Testing Guide

This guide provides comprehensive testing procedures for The Sierra Suites construction management platform. Use this before deploying to production to ensure all features work correctly.

## Table of Contents

1. [Authentication Testing](#authentication-testing)
2. [Multi-Tenant Isolation Testing](#multi-tenant-isolation-testing)
3. [API Security Testing](#api-security-testing)
4. [Dashboard & Analytics Testing](#dashboard--analytics-testing)
5. [Project Management Testing](#project-management-testing)
6. [Document Management Testing](#document-management-testing)
7. [FieldSnap Photo Testing](#fieldsnap-photo-testing)
8. [QuoteHub Testing](#quotehub-testing)
9. [TaskFlow Testing](#taskflow-testing)
10. [AI Features Testing](#ai-features-testing)
11. [Storage & File Upload Testing](#storage--file-upload-testing)
12. [Performance Testing](#performance-testing)
13. [Browser Compatibility Testing](#browser-compatibility-testing)

---

## Authentication Testing

### 1. User Registration Flow

**Test Case: New User Registration**
```
1. Navigate to /register
2. Fill in company details (Step 1):
   - Company Name: "Test Construction Co"
   - Industry: "Commercial Construction"
   - Company Size: "10-50"
3. Verify form validation (try submitting with empty fields)
4. Click "Continue" → Should go to Step 2
5. Select a plan (Starter/Professional/Enterprise)
6. Fill in user details:
   - Full Name: "Test User"
   - Email: "test@example.com"
   - Password: "SecurePass123!" (min 8 chars)
7. Click "Continue" → Should go to Step 3 (Payment)
8. For testing: You can skip payment or use Stripe test cards
9. Verify account creation and automatic login
10. Verify redirect to /dashboard
```

**Expected Results:**
- ✅ All validation errors display correctly
- ✅ Cannot proceed without required fields
- ✅ Password must meet requirements
- ✅ Email must be valid format
- ✅ User is created in Supabase auth
- ✅ Company record created in companies table
- ✅ User profile created in user_profiles table
- ✅ User automatically logged in after registration
- ✅ Session persists on page refresh

### 2. Login Flow

**Test Case: Standard Login**
```
1. Navigate to /login
2. Enter valid email and password
3. Click "Sign In"
4. Verify redirect to /dashboard
5. Verify user data loads correctly
```

**Test Case: Invalid Credentials**
```
1. Navigate to /login
2. Enter incorrect password
3. Verify error message displays
4. Verify no redirect occurs
```

**Expected Results:**
- ✅ Valid credentials → redirect to dashboard
- ✅ Invalid credentials → error message shown
- ✅ Session cookie set on successful login
- ✅ Protected routes accessible after login

### 3. Password Reset Flow

**Test Case: Forgot Password**
```
1. Navigate to /forgot-password
2. Enter registered email
3. Click "Send Reset Link"
4. Check email for reset link
5. Click reset link → redirect to /reset-password
6. Enter new password (twice)
7. Submit → verify redirect to /login
8. Login with new password
```

**Expected Results:**
- ✅ Reset email sent to valid addresses
- ✅ Reset token works within validity period
- ✅ Password successfully updated
- ✅ Can login with new password
- ✅ Old password no longer works

### 4. Session Persistence

**Test Case: Session Remains Active**
```
1. Login successfully
2. Navigate to /dashboard
3. Refresh the page (F5)
4. Verify still logged in
5. Close browser completely
6. Reopen browser and navigate to site
7. Verify still logged in (if "Remember me" was checked)
```

**Expected Results:**
- ✅ Session persists across page refreshes
- ✅ Session persists across browser tabs
- ✅ Session expires after configured timeout (if applicable)

### 5. Logout Flow

**Test Case: User Logout**
```
1. Login to dashboard
2. Click user menu → Logout
3. Verify redirect to /login
4. Try accessing /dashboard directly
5. Verify redirect back to /login
```

**Expected Results:**
- ✅ Session cleared on logout
- ✅ Protected routes redirect to login
- ✅ No user data remains in browser

---

## Multi-Tenant Isolation Testing

**CRITICAL: This ensures users cannot see other companies' data**

### Setup: Create Test Accounts

```
Account 1:
- Company: "Alpha Construction"
- Email: "alpha@test.com"
- Password: "TestPass123!"

Account 2:
- Company: "Beta Builders"
- Email: "beta@test.com"
- Password: "TestPass123!"
```

### Test Case 1: Project Isolation

```
1. Login as alpha@test.com
2. Create a project:
   - Name: "Alpha Project 1"
   - Status: "In Progress"
3. Logout
4. Login as beta@test.com
5. Navigate to /projects
6. Verify "Alpha Project 1" is NOT visible
7. Create a project:
   - Name: "Beta Project 1"
8. Logout
9. Login as alpha@test.com
10. Verify only "Alpha Project 1" is visible
```

**Expected Results:**
- ✅ Each company only sees their own projects
- ✅ No cross-company data leakage
- ✅ Direct URL access to other company's projects returns 404 or unauthorized

### Test Case 2: Quote Isolation

```
1. Login as alpha@test.com
2. Create a quote for "Alpha Project 1"
3. Note the quote ID from URL (/quotes/[id])
4. Logout
5. Login as beta@test.com
6. Try accessing /quotes/[alpha-quote-id] directly
7. Verify 404 or unauthorized error
8. Navigate to /quotes
9. Verify only Beta's quotes are visible
```

**Expected Results:**
- ✅ Cannot access other company's quotes
- ✅ Quote lists are isolated per company
- ✅ RLS policies prevent cross-company access

### Test Case 3: Document Isolation

```
1. Login as alpha@test.com
2. Upload a document to "Alpha Project 1"
3. Note the storage path
4. Logout
5. Login as beta@test.com
6. Try accessing the document URL directly
7. Verify access denied
```

**Expected Results:**
- ✅ Storage buckets enforce RLS policies
- ✅ Cannot download other company's files
- ✅ File listings are isolated

### Test Case 4: Team Member Isolation

```
1. Login as alpha@test.com
2. Navigate to /teams
3. Add a team member: "john@alpha.com"
4. Logout
5. Login as beta@test.com
6. Navigate to /teams
7. Verify john@alpha.com is NOT visible
8. Verify cannot add john@alpha.com to Beta company
```

**Expected Results:**
- ✅ Team members are company-specific
- ✅ Cannot add users from other companies
- ✅ User directory is isolated

---

## API Security Testing

### Test Case 1: Unauthenticated Requests

**Using browser console or Postman:**

```javascript
// Test quotes API without authentication
fetch('/api/quotes')
  .then(r => r.json())
  .then(console.log)

// Expected: { error: "Unauthorized" }, status: 401
```

**Expected Results:**
- ✅ All protected endpoints return 401 without session
- ✅ Error message is consistent
- ✅ No data leakage in error responses

### Test Case 2: Rate Limiting

**Test quotes endpoint (50/min limit):**

```javascript
// Run this in browser console while logged in
async function testRateLimit() {
  const results = []
  for (let i = 0; i < 60; i++) {
    const response = await fetch('/api/quotes')
    results.push({
      attempt: i + 1,
      status: response.status,
      remaining: response.headers.get('X-RateLimit-Remaining')
    })
  }
  console.table(results)
}

testRateLimit()
```

**Expected Results:**
- ✅ First 50 requests succeed (200)
- ✅ Requests 51+ return 429 (Too Many Requests)
- ✅ X-RateLimit-Limit header shows 50
- ✅ X-RateLimit-Remaining decrements correctly
- ✅ X-RateLimit-Reset shows reset timestamp
- ✅ Rate limit resets after 1 minute

### Test Case 3: CORS Protection

**From external domain:**

```javascript
// Try from a different domain (e.g., jsfiddle.net)
fetch('https://your-app.com/api/quotes', {
  credentials: 'include'
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error)
```

**Expected Results:**
- ✅ CORS error if request from unauthorized origin
- ✅ Only allowed origins can make requests

### Test Case 4: SQL Injection Attempts

**Test search/filter inputs:**

```
1. Navigate to /quotes
2. In search box, try entering:
   - "'; DROP TABLE quotes; --"
   - "1' OR '1'='1"
   - "<script>alert('xss')</script>"
3. Submit search
4. Verify no SQL errors
5. Verify quotes table still exists
6. Verify no script execution
```

**Expected Results:**
- ✅ Parameterized queries prevent SQL injection
- ✅ Input sanitization prevents XSS
- ✅ No database errors
- ✅ Search returns safe results or empty array

---

## Dashboard & Analytics Testing

### Test Case 1: Dashboard Data Loading

```
1. Login to dashboard
2. Verify all widgets load:
   - Total Projects count
   - Active Projects count
   - Completed Projects percentage
   - Total Tasks count
   - Storage Used display
3. Verify no loading errors in console
4. Verify data matches actual counts
```

**Expected Results:**
- ✅ All stats display correctly
- ✅ Numbers match database records
- ✅ Loading states show during fetch
- ✅ Error states handle API failures
- ✅ Real-time updates work (if implemented)

### Test Case 2: Real-Time Updates

```
1. Open dashboard in Browser Tab 1
2. Open dashboard in Browser Tab 2 (same user)
3. In Tab 2: Create a new project
4. Switch to Tab 1
5. Verify project count updates automatically
```

**Expected Results:**
- ✅ Stats update in real-time across tabs
- ✅ No page refresh required
- ✅ Supabase real-time subscriptions working

### Test Case 3: Chart Rendering

```
1. Navigate to /reports
2. Verify all charts render:
   - Project status pie chart
   - Task completion line chart
   - Budget tracking bar chart
3. Hover over data points
4. Verify tooltips display
5. Resize browser window
6. Verify charts remain responsive
```

**Expected Results:**
- ✅ Charts render without errors
- ✅ Data is accurate
- ✅ Interactive features work
- ✅ Responsive on all screen sizes

---

## Project Management Testing

### Test Case 1: Create Project

```
1. Navigate to /projects
2. Click "New Project"
3. Fill in details:
   - Name: "Test Commercial Build"
   - Client: "ABC Corp"
   - Status: "Planning"
   - Start Date: Today
   - Budget: $500,000
   - Description: "Test project"
4. Click "Create"
5. Verify project appears in list
6. Verify project details page loads
```

**Expected Results:**
- ✅ Project created successfully
- ✅ Appears in project list immediately
- ✅ All fields saved correctly
- ✅ ID generated automatically
- ✅ Created timestamp set
- ✅ User ID associated correctly

### Test Case 2: Edit Project

```
1. Open a project
2. Click "Edit"
3. Change status to "In Progress"
4. Update budget to $550,000
5. Click "Save"
6. Verify changes reflected immediately
7. Refresh page
8. Verify changes persisted
```

**Expected Results:**
- ✅ Changes save successfully
- ✅ Updated_at timestamp changes
- ✅ Changes persist after refresh
- ✅ Optimistic UI updates work

### Test Case 3: Delete Project

```
1. Create a test project
2. Click "Delete" button
3. Verify confirmation dialog appears
4. Click "Cancel" → verify project NOT deleted
5. Click "Delete" again
6. Click "Confirm"
7. Verify project removed from list
8. Verify related data handled (cascading/prevention)
```

**Expected Results:**
- ✅ Confirmation dialog prevents accidental deletion
- ✅ Project removed from database
- ✅ Related documents/tasks handled appropriately
- ✅ No orphaned records

### Test Case 4: Project Filtering & Search

```
1. Create multiple projects with different statuses
2. Use status filter: "In Progress"
3. Verify only in-progress projects shown
4. Use search: "Commercial"
5. Verify only matching projects shown
6. Clear filters
7. Verify all projects shown again
```

**Expected Results:**
- ✅ Filters work correctly
- ✅ Search is case-insensitive
- ✅ Multiple filters can combine
- ✅ Filter state persists on page navigation

---

## Document Management Testing

### Test Case 1: Upload Document

```
1. Open a project
2. Navigate to Documents tab
3. Click "Upload"
4. Select a PDF file (< 50MB)
5. Add metadata:
   - Name: "Blueprint Floor 1"
   - Category: "Blueprints"
   - Description: "First floor layout"
6. Click "Upload"
7. Verify progress indicator
8. Verify document appears in list
9. Click document to download
10. Verify file downloads correctly
```

**Expected Results:**
- ✅ File uploads successfully
- ✅ Progress indicator shows upload status
- ✅ Metadata saved correctly
- ✅ File accessible via download link
- ✅ Storage path follows convention: `{company_id}/{project_id}/documents/{filename}`

### Test Case 2: Document Size Limit

```
1. Try uploading a file > 50MB
2. Verify error message displays
3. Verify upload is prevented
```

**Expected Results:**
- ✅ Files > 50MB are rejected
- ✅ Clear error message shown
- ✅ No partial upload occurs

### Test Case 3: Document Type Restrictions

```
1. Try uploading different file types:
   - PDF ✅ (should work)
   - DOCX ✅ (should work)
   - XLSX ✅ (should work)
   - JPG ✅ (should work)
   - EXE ❌ (should be blocked)
   - SH ❌ (should be blocked)
```

**Expected Results:**
- ✅ Allowed MIME types upload successfully
- ✅ Disallowed types are rejected
- ✅ Error message explains why

### Test Case 4: Document Versioning

```
1. Upload "Blueprint.pdf" (version 1)
2. Edit and upload "Blueprint.pdf" again
3. Verify both versions are accessible
4. Verify latest version is marked
```

**Expected Results:**
- ✅ Multiple versions can exist
- ✅ Version history is tracked
- ✅ Can download previous versions

---

## FieldSnap Photo Testing

### Test Case 1: Single Photo Upload

```
1. Navigate to /fieldsnap
2. Click "Upload Photo"
3. Select a photo with EXIF data (taken with smartphone)
4. Fill in metadata:
   - Project: Select a project
   - Location: "Foundation - North Wall"
   - Tags: "inspection", "concrete"
5. Click "Upload"
6. Verify photo appears in gallery
7. Click photo to view details
8. Verify EXIF data extracted:
   - Date taken
   - GPS coordinates (if available)
   - Camera info
```

**Expected Results:**
- ✅ Photo uploads successfully
- ✅ EXIF data extracted and stored
- ✅ GPS coordinates displayed on map (if available)
- ✅ Thumbnail generated
- ✅ Storage path: `{company_id}/{project_id}/photos/{filename}`

### Test Case 2: Batch Photo Upload

```
1. Navigate to /fieldsnap
2. Click "Batch Upload"
3. Select 10 photos at once
4. Assign to project
5. Click "Upload All"
6. Verify progress indicator for each photo
7. Verify all photos appear in gallery
```

**Expected Results:**
- ✅ All photos upload successfully
- ✅ Upload queue shows progress
- ✅ Failed uploads show error
- ✅ Can retry failed uploads
- ✅ Batch operation completes

### Test Case 3: AI Photo Analysis

```
1. Upload a construction site photo
2. Click "Analyze with AI"
3. Wait for analysis to complete
4. Verify results show:
   - Detected objects (e.g., "scaffolding", "workers", "materials")
   - Safety issues (if any)
   - Defects detected (if any)
   - Quality score
5. Verify AI tags added to photo
```

**Expected Results:**
- ✅ AI analysis completes within 10 seconds
- ✅ Relevant objects detected
- ✅ Safety issues flagged appropriately
- ✅ Results stored in media_assets.ai_analysis
- ✅ Auto-tagging works

### Test Case 4: Photo to Punch List

```
1. Upload photo with visible defect
2. Run AI analysis
3. Verify punch list item auto-created
4. Navigate to punch list
5. Verify item appears with:
   - Photo reference
   - Detected defect description
   - Severity level
   - Suggested resolution
```

**Expected Results:**
- ✅ Punch items created for defects
- ✅ Photo linked to punch item
- ✅ Severity assessed correctly
- ✅ Only significant defects create items (not false positives)

---

## QuoteHub Testing

### Test Case 1: Create Quote from Scratch

```
1. Navigate to /quotes
2. Click "New Quote"
3. Fill in quote details:
   - Client: "Test Client Inc"
   - Project: Select existing project
   - Valid Until: 30 days from now
4. Add line items:
   - Item 1: "Concrete Foundation" - $50,000
   - Item 2: "Framing" - $75,000
   - Item 3: "Electrical" - $25,000
5. Add markup: 15%
6. Add notes: "Tax not included"
7. Click "Save as Draft"
8. Verify quote saved
9. Verify subtotal: $150,000
10. Verify total with markup: $172,500
```

**Expected Results:**
- ✅ Quote created successfully
- ✅ All line items saved
- ✅ Calculations correct
- ✅ Status = "draft"
- ✅ Can edit draft quote

### Test Case 2: Use Quote Template

```
1. Navigate to /quotes
2. Click "New Quote from Template"
3. Select "Commercial Build Standard"
4. Verify pre-filled line items
5. Customize quantities/prices
6. Save quote
7. Verify template items copied correctly
```

**Expected Results:**
- ✅ Template loads all line items
- ✅ Can modify template values
- ✅ Original template unchanged
- ✅ Saves as new quote

### Test Case 3: Generate Quote PDF

```
1. Open a completed quote
2. Click "Download PDF"
3. Verify PDF generates
4. Open PDF and verify:
   - Company logo/branding
   - Quote number
   - Client details
   - All line items
   - Subtotal and total
   - Terms and conditions
```

**Expected Results:**
- ✅ PDF generates successfully
- ✅ Professional formatting
- ✅ All data accurate
- ✅ Includes company branding

### Test Case 4: Quote Status Workflow

```
1. Create a quote (status: "draft")
2. Change status to "sent"
3. Verify status updated
4. Change status to "accepted"
5. Verify status updated
6. Try editing accepted quote
7. Verify warning or prevention
```

**Expected Results:**
- ✅ Status transitions work
- ✅ Accepted quotes locked from editing
- ✅ Status history tracked
- ✅ Notifications sent on status change (if implemented)

### Test Case 5: Multi-Currency Support

```
1. Create a quote in USD
2. Verify totals in USD
3. Create another quote in CAD
4. Verify currency symbol changes
5. Verify exchange rate applied (if applicable)
```

**Expected Results:**
- ✅ Multiple currencies supported
- ✅ Currency symbols display correctly
- ✅ Calculations accurate per currency

---

## TaskFlow Testing

### Test Case 1: Create Task

```
1. Navigate to /taskflow
2. Click "New Task"
3. Fill in details:
   - Title: "Install HVAC System"
   - Description: "Install commercial HVAC"
   - Project: Select project
   - Assigned To: Select team member
   - Due Date: 7 days from now
   - Priority: "High"
4. Click "Create"
5. Verify task appears in list
```

**Expected Results:**
- ✅ Task created successfully
- ✅ Assigned user notified (if notifications enabled)
- ✅ Task appears in assignee's task list
- ✅ Due date validation works

### Test Case 2: Task Status Updates

```
1. Open a task
2. Change status from "To Do" → "In Progress"
3. Verify status updates
4. Add a comment: "Started work on HVAC"
5. Change status to "Completed"
6. Verify completion timestamp set
```

**Expected Results:**
- ✅ Status changes save immediately
- ✅ Comments attached to task
- ✅ Completion timestamp recorded
- ✅ Task history tracked

### Test Case 3: Apply Task Template

```
1. Navigate to /taskflow
2. Click "Use Template"
3. Select "Commercial Build - Week 1"
4. Select target project
5. Click "Apply"
6. Verify all template tasks created
7. Verify due dates adjusted based on project start
```

**Expected Results:**
- ✅ All template tasks created
- ✅ Dependencies maintained
- ✅ Dates calculated correctly
- ✅ Assignments preserved

### Test Case 4: Task Dependencies

```
1. Create Task A: "Pour Foundation"
2. Create Task B: "Frame Walls" (depends on Task A)
3. Mark Task B as blocked by Task A
4. Try completing Task B before Task A
5. Verify warning shown
6. Complete Task A
7. Verify Task B can now be completed
```

**Expected Results:**
- ✅ Dependencies prevent incorrect sequencing
- ✅ Warnings displayed
- ✅ Dependency chain enforced

---

## AI Features Testing

### Test Case 1: AI Photo Analysis

```
1. Upload construction photo
2. Click "Analyze"
3. Verify analysis results:
   - Objects detected
   - Confidence scores
   - Safety concerns
   - Quality assessment
4. Verify processing time < 10 seconds
```

**Expected Results:**
- ✅ Analysis completes quickly
- ✅ Results are relevant
- ✅ Confidence scores reasonable (>60%)
- ✅ Safety issues flagged

### Test Case 2: AI-Generated Reports

```
1. Navigate to /reports
2. Select "AI Summary Report"
3. Select project and date range
4. Click "Generate"
5. Verify report includes:
   - Project progress summary
   - Key achievements
   - Issues detected
   - Recommendations
```

**Expected Results:**
- ✅ Report generates successfully
- ✅ Content is relevant
- ✅ Data pulled from correct date range
- ✅ Professional formatting

### Test Case 3: Smart Tagging

```
1. Upload multiple photos
2. Enable "Auto-tag with AI"
3. Verify photos automatically tagged
4. Search by AI-generated tag
5. Verify correct photos returned
```

**Expected Results:**
- ✅ Tags generated accurately
- ✅ Tags improve searchability
- ✅ Can filter by AI tags

---

## Storage & File Upload Testing

### Test Case 1: Storage Quota Tracking

```
1. Login to dashboard
2. Check storage widget
3. Upload a 10MB file
4. Verify storage usage increases
5. Check storage widget again
6. Verify correct calculation
```

**Expected Results:**
- ✅ Storage usage tracked accurately
- ✅ Updates in real-time
- ✅ Shows percentage used
- ✅ Warning when approaching limit

### Test Case 2: Storage Limit Enforcement

**For Starter Plan (5GB):**
```
1. Upload files until approaching 5GB
2. Try uploading file that exceeds limit
3. Verify error message
4. Verify upload prevented
5. Verify upgrade prompt shown
```

**Expected Results:**
- ✅ Upload blocked when over limit
- ✅ Clear error message
- ✅ Upgrade option presented
- ✅ Existing files remain accessible

### Test Case 3: File Upload Progress

```
1. Upload a large file (20MB+)
2. Verify progress bar displays
3. Verify percentage updates
4. Try canceling upload mid-way
5. Verify upload stops
6. Retry upload
7. Verify completes successfully
```

**Expected Results:**
- ✅ Progress indicator accurate
- ✅ Can cancel upload
- ✅ Partial uploads cleaned up
- ✅ Retry works correctly

---

## Performance Testing

### Test Case 1: Page Load Times

**Target: All pages load in < 3 seconds**

```
1. Clear browser cache
2. Open DevTools → Network tab
3. Navigate to each page:
   - /dashboard
   - /projects
   - /quotes
   - /fieldsnap
   - /taskflow
4. Record "Load" time
5. Verify all < 3 seconds
```

**Expected Results:**
- ✅ Dashboard loads in < 2 seconds
- ✅ List pages load in < 2 seconds
- ✅ Detail pages load in < 1.5 seconds
- ✅ No render-blocking resources

### Test Case 2: Large Dataset Performance

```
1. Create 100+ projects
2. Navigate to /projects
3. Verify pagination works
4. Verify page load remains fast
5. Test search with large dataset
6. Verify search completes in < 1 second
```

**Expected Results:**
- ✅ Pagination prevents loading all records
- ✅ Page size reasonable (20-50 items)
- ✅ Search remains responsive
- ✅ Infinite scroll works (if implemented)

### Test Case 3: Concurrent Users

**Requires multiple browser sessions:**

```
1. Login with 5 different users simultaneously
2. Have each user:
   - Create projects
   - Upload photos
   - Generate reports
3. Verify no conflicts
4. Verify no data corruption
5. Verify performance remains acceptable
```

**Expected Results:**
- ✅ No data conflicts
- ✅ RLS prevents cross-contamination
- ✅ Response times remain < 3 seconds
- ✅ No database locking issues

---

## Browser Compatibility Testing

### Browsers to Test:

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

### Test Cases for Each Browser:

```
1. Complete registration flow
2. Upload a photo
3. Create a project
4. Generate a PDF quote
5. View dashboard
6. Test responsive design (resize window)
7. Test mobile view (if applicable)
```

**Expected Results:**
- ✅ All features work on all browsers
- ✅ UI renders correctly
- ✅ No console errors
- ✅ Mobile-responsive

---

## Production Checklist

Before going live, verify:

### Security
- [ ] All API routes protected with authentication
- [ ] Rate limiting enabled on all endpoints
- [ ] RLS policies active on all tables
- [ ] Storage buckets secured with RLS
- [ ] No sensitive data in client-side code
- [ ] Environment variables not exposed
- [ ] HTTPS enforced
- [ ] CORS properly configured

### Performance
- [ ] Page load times < 3 seconds
- [ ] Images optimized
- [ ] Code splitting implemented
- [ ] Database queries optimized
- [ ] Caching strategy in place
- [ ] CDN configured (if applicable)

### Functionality
- [ ] All CRUD operations work
- [ ] File uploads work (all types)
- [ ] PDF generation works
- [ ] AI features work
- [ ] Email notifications work
- [ ] Payment processing works (Stripe)
- [ ] Real-time updates work

### Data Integrity
- [ ] Multi-tenant isolation verified
- [ ] No data leakage between companies
- [ ] Backup strategy in place
- [ ] Data migration plan ready

### Monitoring
- [ ] Error tracking configured (Sentry)
- [ ] Analytics configured
- [ ] Performance monitoring active
- [ ] Database monitoring active
- [ ] Storage monitoring active

### Documentation
- [ ] API documentation complete
- [ ] User guide available
- [ ] Admin guide available
- [ ] Deployment guide ready

---

## Troubleshooting Common Issues

### Issue: "Unauthorized" on API Calls

**Solution:**
```typescript
// Check if user session exists
const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)

// Verify cookie is set
console.log('Cookies:', document.cookie)
```

### Issue: Rate Limit Errors

**Solution:**
```typescript
// Check rate limit headers
fetch('/api/quotes')
  .then(response => {
    console.log('Rate Limit:', response.headers.get('X-RateLimit-Limit'))
    console.log('Remaining:', response.headers.get('X-RateLimit-Remaining'))
    console.log('Reset:', response.headers.get('X-RateLimit-Reset'))
  })
```

### Issue: File Upload Fails

**Solution:**
1. Check file size (< 50MB)
2. Check file type (allowed MIME types)
3. Check storage quota
4. Check storage bucket permissions
5. Check browser console for errors

### Issue: Multi-Tenant Data Leakage

**Solution:**
```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Check RLS policies
SELECT * FROM pg_policies
WHERE tablename = 'projects';
```

---

## Manual Testing Script

Use this script to quickly test critical paths:

```bash
# 1. Authentication Flow (5 minutes)
✓ Register new account
✓ Login with credentials
✓ Access dashboard
✓ Logout
✓ Login again

# 2. Project Management (10 minutes)
✓ Create project
✓ Edit project
✓ Upload document to project
✓ Upload photo to project
✓ Delete project (test account only)

# 3. Quote Creation (10 minutes)
✓ Create quote
✓ Add 5+ line items
✓ Generate PDF
✓ Change status to "sent"
✓ Verify calculations correct

# 4. Task Management (5 minutes)
✓ Create task
✓ Assign to team member
✓ Change status
✓ Add comment
✓ Complete task

# 5. Multi-Tenant Test (10 minutes)
✓ Create second test account
✓ Create project in Account 1
✓ Login to Account 2
✓ Verify cannot see Account 1 data
✓ Try accessing Account 1 project URL directly
✓ Verify blocked

# 6. File Upload Test (5 minutes)
✓ Upload PDF document
✓ Upload photo with EXIF
✓ Download uploaded file
✓ Verify EXIF extracted
✓ Run AI analysis

# 7. Security Test (5 minutes)
✓ Logout
✓ Try accessing /api/quotes directly
✓ Verify 401 error
✓ Test rate limiting (make 60 requests)
✓ Verify 429 error after limit

Total Time: ~50 minutes for full manual test
```

---

## Automated Testing Recommendations

Consider implementing automated tests for:

### Unit Tests
- Authentication helpers
- Validation functions
- Calculation functions (quote totals, etc.)
- Date utilities
- EXIF extraction

### Integration Tests
- API route authentication
- Database CRUD operations
- File upload flows
- PDF generation

### E2E Tests (Playwright/Cypress)
- Complete user registration
- Project creation workflow
- Quote generation workflow
- Multi-tenant isolation
- File upload end-to-end

### Load Tests (k6/Artillery)
- API endpoint performance
- Concurrent user simulation
- Database query performance
- File upload under load

---

## Bug Report Template

When reporting bugs, include:

```
**Environment:**
- Browser: [Chrome 120 / Safari 17 / etc.]
- OS: [Windows 11 / macOS 14 / etc.]
- User Role: [Admin / User]
- Company ID: [if relevant]

**Steps to Reproduce:**
1. Login as user@example.com
2. Navigate to /projects
3. Click "New Project"
4. ...

**Expected Behavior:**
Project should be created and appear in list

**Actual Behavior:**
Error message displayed: "Failed to create project"

**Console Errors:**
[Paste any console errors]

**Network Errors:**
[Paste any failed network requests]

**Screenshots:**
[Attach screenshots if relevant]
```

---

## Next Steps

After completing all tests:

1. **Document Results**: Create a test results spreadsheet
2. **Fix Critical Bugs**: Address any P0/P1 bugs immediately
3. **Performance Optimization**: Address any slow pages
4. **Security Audit**: Review all findings
5. **User Acceptance Testing**: Have real users test
6. **Final Sign-Off**: Get approval to deploy

---

## Support

For testing support or questions:
- Review error logs in Supabase Dashboard
- Check Sentry for error tracking
- Review application logs
- Contact: [support email]

---

**Last Updated**: Generated from enterprise implementation
**Version**: 1.0
**Platform**: The Sierra Suites Construction Management Platform
