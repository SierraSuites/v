# MASTER LAUNCH CHECKLIST

**Sierra Suites - Complete Pre-Launch Verification**
**Use this checklist to ensure 100% readiness before August 2026 launch**

---

## HOW TO USE THIS CHECKLIST

1. **Print or keep open** while working through launch preparation
2. **Check off items** as you complete them
3. **Track progress** by section to see overall completion
4. **Delegate tasks** by assigning team members
5. **Block launch** if any CRITICAL items are incomplete

**Legend**:
- 🔴 **CRITICAL** - Must be complete before launch (blockers)
- 🟠 **HIGH** - Should be complete, can launch without but risky
- 🟡 **MEDIUM** - Nice to have, can complete post-launch
- 🟢 **LOW** - Optional, future enhancement

---

## SECTION 1: DATABASE & SCHEMA

### Database Consolidation 🔴 CRITICAL
- [ ] Created `database/master-schema.sql` from 30+ scattered SQL files
- [ ] Removed all `FIX_*.sql` files
- [ ] Verified all tables have `company_id` column
- [ ] Verified all foreign keys properly defined
- [ ] Added indexes on `company_id` columns
- [ ] Added indexes on `user_id` columns
- [ ] Added indexes on `created_at` columns
- [ ] Tested schema on fresh Supabase project
- [ ] Created migration file: `supabase/migrations/20260121000000_initial_schema.sql`
- [ ] Migration runs without errors

### Row Level Security (RLS) 🔴 CRITICAL
- [ ] Enabled RLS on `user_profiles` table
- [ ] Enabled RLS on `companies` table
- [ ] Enabled RLS on `projects` table
- [ ] Enabled RLS on `tasks` table
- [ ] Enabled RLS on `quotes` table
- [ ] Enabled RLS on `quote_items` table
- [ ] Enabled RLS on `crm_contacts` table
- [ ] Enabled RLS on `crm_deals` table
- [ ] Enabled RLS on `crm_communications` table
- [ ] Enabled RLS on `punch_items` table
- [ ] Enabled RLS on `punch_item_photos` table
- [ ] Enabled RLS on `media_assets` table
- [ ] Enabled RLS on `project_documents` table
- [ ] Enabled RLS on `project_expenses` table
- [ ] Enabled RLS on `team_invitations` table
- [ ] Enabled RLS on `notifications` table
- [ ] Enabled RLS on `email_logs` table
- [ ] Enabled RLS on all other tables

### RLS Policy Testing 🔴 CRITICAL
- [ ] User A cannot see User B's projects (different companies)
- [ ] User can only see their own company data
- [ ] User cannot insert data for another company
- [ ] User cannot update another company's data
- [ ] User cannot delete another company's data
- [ ] Owner can delete records
- [ ] Admin can update records
- [ ] Member has read-only for sensitive data
- [ ] Viewer has read-only access only
- [ ] Created `database/test-rls-policies.sql` with test cases

### Storage Security 🔴 CRITICAL
- [ ] Created `project-photos` bucket
- [ ] Created `project-documents` bucket
- [ ] RLS policies on `storage.objects` for uploads
- [ ] RLS policies on `storage.objects` for downloads
- [ ] File size limits configured
- [ ] Allowed file types configured
- [ ] Tested upload as User A
- [ ] Verified User B cannot access User A's files

---

## SECTION 2: AUTHENTICATION & SECURITY

### Authentication 🔴 CRITICAL
- [ ] User registration works
- [ ] Email verification works
- [ ] User login works
- [ ] Password reset works
- [ ] Session timeout configured (24 hours)
- [ ] Logout works and clears session
- [ ] No service role key exposed to client
- [ ] Auth state persists on page refresh

### API Security 🔴 CRITICAL
- [ ] Created `lib/api-middleware.ts` with `withAuth` function
- [ ] All `/api/projects/*` routes use `withAuth`
- [ ] All `/api/tasks/*` routes use `withAuth`
- [ ] All `/api/quotes/*` routes use `withAuth`
- [ ] All `/api/crm/*` routes use `withAuth`
- [ ] All `/api/team/*` routes use `withAuth`
- [ ] All API routes verify `company_id` matches user
- [ ] All API routes return 401 if not authenticated
- [ ] All API routes return 403 if not authorized
- [ ] No routes trust client-provided `company_id`

### Permission Checks 🟠 HIGH
- [ ] Created `lib/permissions.ts` with role checks
- [ ] Created `hooks/usePermissions.ts` hook
- [ ] Dashboard checks permissions before showing data
- [ ] Projects checks create/edit/delete permissions
- [ ] Tasks checks assignment permissions
- [ ] Quotes checks sending permissions
- [ ] CRM checks contact management permissions
- [ ] Teams checks invitation permissions
- [ ] UI hides actions user cannot perform

### Security Audit 🔴 CRITICAL
- [ ] Ran `npm audit` - zero critical/high vulnerabilities
- [ ] Ran `npm audit fix` for fixable issues
- [ ] All dependencies up to date
- [ ] No hardcoded secrets in code
- [ ] All secrets in environment variables
- [ ] `.env.local` in `.gitignore`
- [ ] No API keys committed to Git
- [ ] HTTPS enforced on production
- [ ] CORS configured properly
- [ ] Rate limiting implemented (optional but recommended)

---

## SECTION 3: CODE QUALITY & TYPE SAFETY

### TypeScript 🔴 CRITICAL
- [ ] Created `types/index.ts` with all interfaces
- [ ] Removed all `as any` type casts from `app/quotes/[id]/page.tsx`
- [ ] Removed all `as any` type casts from `app/crm/page.tsx`
- [ ] Removed all `as any` type casts from `components/quotes/*.tsx`
- [ ] Searched codebase for remaining `as any` - found 0 instances
- [ ] Enabled strict mode in `tsconfig.json`
- [ ] `npm run build` completes without TypeScript errors
- [ ] All components properly typed
- [ ] All API responses properly typed
- [ ] All database queries properly typed

### Code Organization 🟠 HIGH
- [ ] Dashboard page.tsx split into modular components
- [ ] `components/dashboard/DashboardStats.tsx` created
- [ ] `components/dashboard/DashboardWeather.tsx` created
- [ ] `components/dashboard/DashboardCalendar.tsx` created
- [ ] `components/dashboard/DashboardGantt.tsx` created
- [ ] Main dashboard page is < 300 lines
- [ ] No files > 500 lines (except generated files)
- [ ] Code splitting implemented with `dynamic` imports
- [ ] Loading states for all async operations

### Deprecated Code Removal 🔴 CRITICAL
- [ ] Uninstalled `@supabase/auth-helpers-nextjs`
- [ ] Migrated `app/crm/page.tsx` to `@supabase/ssr`
- [ ] Migrated `app/reports/page.tsx` to `@supabase/ssr`
- [ ] Searched for `auth-helpers-nextjs` - found 0 instances
- [ ] All Supabase clients use `createClient()` pattern
- [ ] No deprecated function calls remain

### Linting & Formatting 🟡 MEDIUM
- [ ] `npm run lint` passes with zero errors
- [ ] Prettier configured
- [ ] All files formatted with Prettier
- [ ] ESLint rules configured
- [ ] Pre-commit hook runs linter (optional)

---

## SECTION 4: CORE FEATURES

### Dashboard Module 🟠 HIGH
- [ ] Dashboard loads without errors
- [ ] Stats cards show correct data
- [ ] Weather widget displays current weather
- [ ] Calendar shows upcoming tasks/milestones
- [ ] Gantt chart renders correctly
- [ ] Recent activity feed works
- [ ] Real-time updates work (when data changes)
- [ ] Empty states for new users
- [ ] Loading states display correctly
- [ ] Mobile responsive

### Projects Module 🔴 CRITICAL
- [ ] Can create new project
- [ ] Can edit project details
- [ ] Can delete project (with confirmation)
- [ ] Team members display correctly (not empty array)
- [ ] Can add team members
- [ ] Can remove team members
- [ ] Documents tab works (upload/download/delete)
- [ ] Budget tab shows expenses
- [ ] Can add expenses
- [ ] Budget calculations correct
- [ ] Milestones display
- [ ] Phases display
- [ ] Mobile responsive

### TaskFlow Module 🔴 CRITICAL
- [ ] Can create task
- [ ] Can edit task
- [ ] Can delete task
- [ ] Can assign task to user
- [ ] Assigned user receives notification/email
- [ ] Can change task status
- [ ] Can set due date
- [ ] Can set priority
- [ ] Task templates available (40-50 tasks per template)
- [ ] Gantt chart shows dependencies
- [ ] Calendar view works
- [ ] Board view works
- [ ] List view works
- [ ] Filter by status/assignee/project
- [ ] Mobile responsive

### QuoteHub Module 🟠 HIGH
- [ ] Can create quote
- [ ] Can add line items
- [ ] Calculations correct (subtotal, tax, total)
- [ ] Can generate PDF
- [ ] PDF includes all quote data
- [ ] PDF looks professional
- [ ] Can send quote via email
- [ ] Email received by client
- [ ] Email includes PDF attachment
- [ ] Quote status updates to "sent"
- [ ] Quote templates available
- [ ] Version history tracked
- [ ] Mobile responsive

### FieldSnap Module 🟡 MEDIUM
- [ ] Can upload photos
- [ ] Batch upload works (multiple files)
- [ ] Upload progress shown
- [ ] EXIF data extracted
- [ ] Photos display in gallery
- [ ] Can filter by project/date/location
- [ ] Can download photos
- [ ] Can delete photos
- [ ] Fake AI removed - "Coming Soon" shown
- [ ] Storage quota enforced
- [ ] Mobile responsive

### CRM Module 🟠 HIGH
- [ ] Can create contact
- [ ] Can edit contact
- [ ] Can delete contact
- [ ] Can import contacts from CSV
- [ ] Can create deal
- [ ] Can move deals through pipeline (drag-drop)
- [ ] Deal values calculate correctly
- [ ] Can send email from contact
- [ ] Email logged in communications
- [ ] Communication history displays
- [ ] No deprecated Supabase client
- [ ] Mobile responsive

### Punch Lists Module 🟡 MEDIUM
- [ ] Can create punch item
- [ ] Can assign punch item
- [ ] Can change status (7-state workflow)
- [ ] Status transitions validated
- [ ] Can upload before/after photos
- [ ] Can add progress photos
- [ ] Can generate punch list report PDF
- [ ] Notifications sent on status changes
- [ ] History tracked
- [ ] Mobile responsive

### Teams Module 🔴 CRITICAL
- [ ] Can view team members
- [ ] Can invite team member
- [ ] Invitation email sent
- [ ] Can accept invitation via link
- [ ] Can change member role
- [ ] Can remove member
- [ ] Permissions enforced based on role
- [ ] Only owners/admins can invite
- [ ] Only owners/admins can remove
- [ ] Mobile responsive

---

## SECTION 5: INTEGRATIONS

### Email Integration (Resend) 🔴 CRITICAL
- [ ] Resend API key configured
- [ ] From email verified in Resend
- [ ] Quote emails send successfully
- [ ] Team invitation emails send
- [ ] Task assignment emails send
- [ ] Password reset emails send
- [ ] Email logs saved to database
- [ ] Unsubscribe link included (if applicable)
- [ ] Email templates professional-looking

### Payment Integration (Stripe) 🔴 CRITICAL
- [ ] Stripe account created
- [ ] Products created in Stripe (Starter, Professional, Enterprise)
- [ ] Prices configured
- [ ] Checkout session works
- [ ] Payment succeeds with test card
- [ ] Subscription activated in database
- [ ] Webhook endpoint configured
- [ ] Webhook signature verified
- [ ] `checkout.session.completed` handled
- [ ] `customer.subscription.deleted` handled
- [ ] User upgraded to correct tier
- [ ] Features enabled based on tier

### Weather API Integration 🟡 MEDIUM
- [ ] Weather service created (`lib/weather-service.ts`)
- [ ] Weather displays on dashboard
- [ ] 7-day forecast shows
- [ ] Weather updates daily
- [ ] Handles API errors gracefully
- [ ] Caches weather data (1 hour)

### Excel Import/Export 🟡 MEDIUM
- [ ] Can export projects to Excel
- [ ] Can import projects from Excel
- [ ] Can export contacts to Excel
- [ ] Can import contacts from CSV
- [ ] Can export quotes to Excel
- [ ] Can export tasks to Excel
- [ ] Export includes all relevant data
- [ ] Import validates data

---

## SECTION 6: PERFORMANCE

### Pagination 🔴 CRITICAL
- [ ] Projects list paginated (50 per page)
- [ ] Tasks list paginated
- [ ] CRM contacts paginated
- [ ] CRM deals paginated
- [ ] Quotes list paginated
- [ ] Media assets paginated
- [ ] Team members paginated (if >50)
- [ ] "Load More" button works
- [ ] Infinite scroll works (if implemented)
- [ ] Cursor-based pagination used
- [ ] Next cursor returned correctly

### Database Indexes 🟠 HIGH
- [ ] Index on `projects(company_id, status)`
- [ ] Index on `projects(company_id, created_at DESC)`
- [ ] Index on `tasks(project_id, status)`
- [ ] Index on `tasks(assigned_to, status)`
- [ ] Index on `quotes(company_id, status)`
- [ ] Index on `crm_contacts(company_id, type)`
- [ ] Index on all foreign keys
- [ ] Query performance tested with 1000+ records

### Code Splitting 🟡 MEDIUM
- [ ] Dashboard components dynamically imported
- [ ] Charts loaded with `dynamic` import + `ssr: false`
- [ ] Heavy components code-split
- [ ] Loading states for lazy-loaded components
- [ ] Bundle size analyzed
- [ ] Main bundle < 500KB

### Caching 🟡 MEDIUM
- [ ] SWR installed and configured
- [ ] Projects list cached (1 minute)
- [ ] Dashboard stats cached (30 seconds)
- [ ] Weather cached (1 hour)
- [ ] Static pages cached
- [ ] Revalidation on focus disabled where appropriate

---

## SECTION 7: TESTING

### Unit Tests 🟠 HIGH
- [ ] Jest configured
- [ ] React Testing Library configured
- [ ] Test for user login
- [ ] Test for project creation
- [ ] Test for task assignment
- [ ] Test for quote generation
- [ ] Test for pagination utility
- [ ] Test for permission checks
- [ ] Test for RLS policies
- [ ] Test for file upload
- [ ] Test coverage > 70%
- [ ] All tests pass: `npm test`

### E2E Tests 🟠 HIGH
- [ ] Playwright configured
- [ ] E2E test: Complete project workflow
- [ ] E2E test: Quote generation and email
- [ ] E2E test: Team member invitation
- [ ] E2E test: User registration and login
- [ ] E2E test: File upload
- [ ] All E2E tests pass: `npm run test:e2e`
- [ ] Tests run in CI/CD pipeline

### Manual Testing 🔴 CRITICAL
- [ ] Tested on Chrome (latest)
- [ ] Tested on Firefox (latest)
- [ ] Tested on Safari (latest)
- [ ] Tested on mobile Chrome (iOS)
- [ ] Tested on mobile Safari (iOS)
- [ ] Tested on mobile Chrome (Android)
- [ ] Tested at 1920x1080 resolution
- [ ] Tested at 1366x768 resolution
- [ ] Tested at 375x667 resolution (mobile)
- [ ] All features work on all browsers

### User Acceptance Testing 🔴 CRITICAL
- [ ] Created UAT test plan
- [ ] Recruited 3-5 beta testers
- [ ] Beta testers completed all test scenarios
- [ ] Collected feedback
- [ ] Fixed critical bugs found
- [ ] Addressed usability issues
- [ ] Re-tested fixes

---

## SECTION 8: DOCUMENTATION

### Developer Documentation 🟠 HIGH
- [ ] Created `docs/README.md` with setup instructions
- [ ] Created `docs/API.md` with all endpoints
- [ ] Created `docs/DEPLOYMENT.md` with deployment steps
- [ ] Created `CHANGELOG.md`
- [ ] All code has JSDoc comments where needed
- [ ] Complex logic explained with comments
- [ ] Architecture decisions documented

### User Documentation 🟡 MEDIUM
- [ ] Created `docs/USER_GUIDE.md`
- [ ] Getting started guide written
- [ ] Feature tutorials created
- [ ] FAQ page created
- [ ] Troubleshooting guide created
- [ ] Screenshots added to docs
- [ ] Video tutorials created (optional)

### Team Documentation 🟠 HIGH
- [ ] Created `TEAM_ONBOARDING_DAY_1.md`
- [ ] Created `QUICK_REFERENCE_COMMANDS.md`
- [ ] Created `CRITICAL_FIXES_PRIORITY_LIST.md`
- [ ] Team members reviewed docs
- [ ] Onboarding process tested with new hire

---

## SECTION 9: DEPLOYMENT & INFRASTRUCTURE

### Production Setup 🔴 CRITICAL
- [ ] Created production Supabase project
- [ ] Ran migrations on production database
- [ ] Verified all tables created
- [ ] Verified RLS policies active
- [ ] Created storage buckets
- [ ] Configured storage RLS policies
- [ ] Tested database connection
- [ ] Backed up production database

### Vercel Deployment 🔴 CRITICAL
- [ ] Created Vercel production project
- [ ] Linked GitHub repository
- [ ] Configured environment variables (all 15+)
- [ ] Configured custom domain: `app.sierrasuites.com`
- [ ] DNS records updated
- [ ] SSL certificate active
- [ ] Deployed to production
- [ ] Production URL accessible
- [ ] All environment variables working
- [ ] Build completes in < 5 minutes

### CI/CD Pipeline 🟠 HIGH
- [ ] Created `.github/workflows/deploy.yml`
- [ ] Tests run on every PR
- [ ] Linter runs on every PR
- [ ] Build tested on every PR
- [ ] Auto-deploy to staging on main push
- [ ] Manual approval for production deploy
- [ ] Deployment notifications in Slack
- [ ] All GitHub Actions passing

### Monitoring 🔴 CRITICAL
- [ ] Sentry installed and configured
- [ ] Sentry DSN in environment variables
- [ ] Error tracking working
- [ ] Source maps uploaded
- [ ] Alerts configured (error rate > 1%)
- [ ] Uptime monitor configured (UptimeRobot)
- [ ] Health endpoint created: `/api/health`
- [ ] Monitoring dashboard accessible
- [ ] Alert emails configured

### Performance Monitoring 🟡 MEDIUM
- [ ] Vercel Analytics enabled
- [ ] Web Vitals monitored
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms (p95)
- [ ] Database query time < 100ms (p95)
- [ ] Largest Contentful Paint < 2.5s
- [ ] First Input Delay < 100ms
- [ ] Cumulative Layout Shift < 0.1

---

## SECTION 10: PRODUCTION READINESS

### Environment Variables 🔴 CRITICAL
- [ ] All development env vars documented
- [ ] All production env vars set in Vercel
- [ ] No secrets in code
- [ ] `.env.example` file up to date
- [ ] Separate dev/staging/prod credentials
- [ ] Service role keys secured
- [ ] API keys rotated if exposed

### Database Backup 🔴 CRITICAL
- [ ] Automated daily backups enabled (Supabase)
- [ ] Manual backup taken before launch
- [ ] Backup restoration tested
- [ ] Backup retention: 7 days minimum
- [ ] Point-in-time recovery enabled (Pro tier)

### Error Handling 🟠 HIGH
- [ ] Global error boundary implemented
- [ ] API errors caught and logged
- [ ] User-friendly error messages shown
- [ ] No stack traces shown to users
- [ ] 404 page created
- [ ] 500 error page created
- [ ] Network errors handled gracefully

### Security Headers 🟠 HIGH
- [ ] HTTPS enforced
- [ ] HSTS header set
- [ ] X-Frame-Options set
- [ ] X-Content-Type-Options set
- [ ] Referrer-Policy set
- [ ] Content-Security-Policy configured
- [ ] Ran security scan (Mozilla Observatory)

### Legal & Compliance 🟡 MEDIUM
- [ ] Privacy Policy page created
- [ ] Terms of Service page created
- [ ] Cookie consent banner (if applicable)
- [ ] GDPR compliance reviewed (if EU users)
- [ ] Data retention policy defined
- [ ] User data export functionality
- [ ] User account deletion works

---

## SECTION 11: LAUNCH PREPARATION

### Pre-Launch Testing 🔴 CRITICAL
- [ ] Production smoke test completed
- [ ] Can create account on production
- [ ] Can login on production
- [ ] Can create project on production
- [ ] Can invite team member on production
- [ ] Can generate quote PDF on production
- [ ] Can send email on production
- [ ] Can upload file on production
- [ ] Can process payment on production (test mode)
- [ ] All features work on production

### Performance Testing 🟠 HIGH
- [ ] Load testing completed (100 concurrent users)
- [ ] Database handles load
- [ ] API response times acceptable under load
- [ ] No memory leaks detected
- [ ] No N+1 query issues
- [ ] Rate limiting tested

### Content 🟡 MEDIUM
- [ ] Company logo uploaded
- [ ] Favicon set
- [ ] Meta tags for SEO
- [ ] Open Graph tags for social sharing
- [ ] Marketing website live (separate from app)
- [ ] Demo video created
- [ ] Screenshots for marketing

### Support Infrastructure 🟠 HIGH
- [ ] Support email configured: `support@sierrasuites.com`
- [ ] Support inbox monitored
- [ ] Help center created (optional)
- [ ] In-app chat widget (optional)
- [ ] Support ticket system (optional)
- [ ] Team trained on common support issues

### Launch Announcement 🟡 MEDIUM
- [ ] Email announcement drafted
- [ ] Social media posts prepared
- [ ] Blog post written
- [ ] Press release (optional)
- [ ] Product Hunt launch planned (optional)

---

## SECTION 12: POST-LAUNCH

### Day 1 Monitoring 🔴 CRITICAL
- [ ] Monitor errors in Sentry (hourly)
- [ ] Monitor uptime (hourly)
- [ ] Monitor user signups
- [ ] Monitor support emails
- [ ] Quick response team ready
- [ ] Rollback plan prepared

### Week 1 Monitoring 🟠 HIGH
- [ ] Daily error review
- [ ] Daily performance review
- [ ] User feedback collection
- [ ] Feature usage analytics
- [ ] Bug triage and prioritization
- [ ] Hot fixes deployed as needed

### Success Metrics 🟡 MEDIUM
- [ ] Track daily active users
- [ ] Track weekly active users
- [ ] Track feature adoption rates
- [ ] Track conversion rate (free to paid)
- [ ] Track churn rate
- [ ] Track NPS score
- [ ] Track support ticket volume

---

## FINAL PRE-LAUNCH CHECKLIST

### Must Complete Before Launch 🔴
- [ ] All CRITICAL items above completed
- [ ] Zero high-severity bugs
- [ ] All tests passing
- [ ] Security audit passed
- [ ] Performance targets met
- [ ] Production deployed and verified
- [ ] Monitoring active
- [ ] Team trained and ready
- [ ] Support infrastructure ready
- [ ] Backup taken

### Launch Decision
- [ ] Review all sections above
- [ ] Count incomplete CRITICAL items: _____
- [ ] Count incomplete HIGH items: _____
- [ ] If CRITICAL items > 0: **DO NOT LAUNCH**
- [ ] If HIGH items > 5: **Consider delaying launch**
- [ ] If ready: **Proceed with launch** ✅

---

## COMPLETION TRACKING

**Section Completion**:
- Section 1 (Database): _____ / 30 items (___%)
- Section 2 (Security): _____ / 35 items (___%)
- Section 3 (Code Quality): _____ / 20 items (___%)
- Section 4 (Features): _____ / 75 items (___%)
- Section 5 (Integrations): _____ / 25 items (___%)
- Section 6 (Performance): _____ / 20 items (___%)
- Section 7 (Testing): _____ / 30 items (___%)
- Section 8 (Documentation): _____ / 15 items (___%)
- Section 9 (Deployment): _____ / 35 items (___%)
- Section 10 (Production): _____ / 25 items (___%)
- Section 11 (Launch Prep): _____ / 25 items (___%)
- Section 12 (Post-Launch): _____ / 15 items (___%)

**Overall Completion**: _____ / 350 items (**_____%**)

**Launch Readiness**:
- [ ] ≥ 95% of CRITICAL items complete
- [ ] ≥ 80% of HIGH items complete
- [ ] ≥ 60% of all items complete
- [ ] **READY TO LAUNCH** ✅

---

## NOTES

**Blockers**:
-
-
-

**Deferred to Post-Launch**:
-
-
-

**Launch Date**: ________________

**Team Sign-Off**:
- Senior Developer: ________________
- QA Lead: ________________
- Product Owner: ________________

---

**This checklist represents 6 weeks of focused work to achieve production readiness.**

**Good luck with your launch!** 🚀