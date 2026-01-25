# 🚀 Production Deployment Checklist

## Overview

This checklist ensures a smooth, secure, and successful deployment of Sierra Suites to production.

**Complete Before Launch**: All items must be checked off

---

## 📋 Pre-Deployment

### Code Quality

- [ ] All TypeScript files compile without errors
  ```bash
  npm run type-check
  ```

- [ ] No ESLint errors or warnings
  ```bash
  npm run lint
  ```

- [ ] All tests passing
  ```bash
  npm run test
  ```

- [ ] Build completes successfully
  ```bash
  npm run build
  ```

- [ ] No console.log statements in production code

- [ ] All TODO comments addressed or documented

- [ ] Code reviewed by team lead

---

### Environment Setup

#### Required Environment Variables

Create `.env.production` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# OpenAI (for AI features)
OPENAI_API_KEY=sk-your_openai_key_here

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_APP_NAME="Sierra Suites"

# Email (optional)
EMAIL_SERVER=smtp://username:password@smtp.example.com:587
EMAIL_FROM=noreply@yourdomain.com

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Stripe (optional, for payments)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Checklist

- [ ] All environment variables set in production
- [ ] API keys are production keys (not test/dev)
- [ ] No hardcoded secrets in code
- [ ] `.env` files not committed to git
- [ ] Environment variables documented

---

### Database Setup

#### Supabase Configuration

- [ ] Production Supabase project created
- [ ] Database schema deployed
- [ ] RLS policies enabled on all tables
- [ ] Storage buckets created
- [ ] Functions deployed
- [ ] Triggers configured

#### SQL Files to Run (in order)

```bash
# 1. Core Schema
✓ ESSENTIAL_SQL_SETUP.sql
✓ COMPLETE_SQL_SETUP.sql

# 2. Feature Modules
✓ PROJECTS_SQL_SETUP.sql
✓ TASKFLOW_DATABASE_SETUP.sql
✓ FIELDSNAP_SQL_SETUP.sql
✓ FIELDSNAP_STORAGE_SETUP.sql

# 3. QuoteHub
✓ QUOTEHUB_DATABASE_SCHEMA.sql
✓ QUOTEHUB_TEMPLATES.sql

# 4. Seed Data (if needed)
✓ Any seed/demo data scripts
```

#### Database Checklist

- [ ] All SQL files executed successfully
- [ ] No SQL errors in logs
- [ ] Sample data loaded (if applicable)
- [ ] Database indexes created
- [ ] Database backup configured
- [ ] Point-in-time recovery enabled

---

### Storage Configuration

#### Supabase Storage Buckets

Create these buckets in Supabase dashboard:

| Bucket Name | Public | Purpose |
|------------|--------|---------|
| `fieldsnap-photos` | Yes | Field photos and thumbnails |
| `quote-attachments` | No | Quote PDF attachments |
| `project-files` | No | Project documents |
| `user-avatars` | Yes | User profile pictures |

#### Storage Policies

For each bucket, configure RLS policies:

```sql
-- Example for fieldsnap-photos
CREATE POLICY "Users can upload own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fieldsnap-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view shared photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fieldsnap-photos');
```

#### Checklist

- [ ] All storage buckets created
- [ ] Bucket permissions configured
- [ ] Upload size limits set
- [ ] File type restrictions configured
- [ ] CDN configured (if using)

---

## 🔐 Security

### Authentication

- [ ] Email confirmation enabled
- [ ] Password requirements enforced (min 8 chars, complexity)
- [ ] Rate limiting configured for login attempts
- [ ] JWT expiration set appropriately (24 hours recommended)
- [ ] Refresh token rotation enabled
- [ ] MFA available (optional but recommended)

### Authorization (RBAC)

- [ ] All RLS policies tested
- [ ] Permission matrix verified for all roles:
  - [ ] Admin permissions work
  - [ ] Superintendent permissions work
  - [ ] Project Manager permissions work
  - [ ] Field Engineer permissions work
  - [ ] Viewer permissions work

- [ ] API endpoints respect permissions
- [ ] UI elements properly gated
- [ ] Data filtering works correctly

### API Security

- [ ] CORS configured correctly
- [ ] API rate limiting enabled
- [ ] Request validation implemented
- [ ] SQL injection prevention verified
- [ ] XSS protection enabled
- [ ] CSRF tokens implemented

### Data Security

- [ ] Sensitive data encrypted at rest
- [ ] HTTPS enforced
- [ ] Database credentials secured
- [ ] API keys rotated regularly
- [ ] Backup encryption enabled

---

## 🧪 Testing

### Manual Testing

#### Authentication Flow
- [ ] User registration works
- [ ] Email confirmation works
- [ ] Login works
- [ ] Password reset works
- [ ] Logout works
- [ ] Session persistence works

#### Projects Module
- [ ] Create project
- [ ] Edit project
- [ ] Archive project
- [ ] View project list
- [ ] Project filtering
- [ ] Project search
- [ ] Project permissions

#### FieldSnap Module
- [ ] Upload photos
- [ ] View photo grid
- [ ] View photo detail
- [ ] AI analysis runs
- [ ] Storage quota enforced
- [ ] Share photos
- [ ] Create punch items from photos
- [ ] Search and filter photos

#### TaskFlow Module
- [ ] Create tasks
- [ ] Edit tasks
- [ ] Assign tasks
- [ ] Complete tasks
- [ ] Task filtering
- [ ] Task search
- [ ] Calendar view
- [ ] Kanban view

#### Punch List
- [ ] View punch items
- [ ] Create punch item
- [ ] Update status workflow
- [ ] Upload proof photo
- [ ] Before/after comparison
- [ ] Dashboard widget shows items
- [ ] Filtering works
- [ ] Notifications work

#### QuoteHub
- [ ] View quotes list
- [ ] Create quote (if UI implemented)
- [ ] Edit quote
- [ ] Send quote
- [ ] Accept/reject quote
- [ ] Generate PDF
- [ ] Use templates

#### Team Management
- [ ] View teams
- [ ] Create team
- [ ] Add members
- [ ] Remove members
- [ ] Change roles
- [ ] Team permissions
- [ ] Shared photos work

#### Dashboard
- [ ] All widgets load
- [ ] Stats accurate
- [ ] Quick actions work
- [ ] Navigation works
- [ ] Role badge displays
- [ ] Notifications show

### Browser Testing

- [ ] Chrome (latest) - Desktop
- [ ] Firefox (latest) - Desktop
- [ ] Safari (latest) - Desktop
- [ ] Edge (latest) - Desktop
- [ ] Chrome - Mobile
- [ ] Safari - Mobile (iOS)

### Device Testing

- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Large mobile (414x896)

### Performance Testing

- [ ] Lighthouse score > 90
- [ ] Page load time < 3 seconds
- [ ] First contentful paint < 1.5s
- [ ] Time to interactive < 3.5s
- [ ] No memory leaks
- [ ] Large datasets handle well (1000+ items)

### Accessibility Testing

- [ ] Keyboard navigation works
- [ ] Screen reader compatible
- [ ] Color contrast meets WCAG AA
- [ ] Focus indicators visible
- [ ] Alt text on all images
- [ ] ARIA labels present
- [ ] Forms have labels

---

## 📦 Deployment

### Build & Deploy

```bash
# 1. Clean install
rm -rf node_modules .next
npm install

# 2. Run type checking
npm run type-check

# 3. Build for production
npm run build

# 4. Test build locally
npm run start
# Visit http://localhost:3000 and test

# 5. Deploy to Vercel (or your platform)
vercel --prod

# Or for other platforms:
# npm run deploy
```

### Vercel Configuration

If deploying to Vercel, ensure:

- [ ] Project linked to repository
- [ ] Environment variables set in Vercel dashboard
- [ ] Build command: `npm run build`
- [ ] Output directory: `.next`
- [ ] Install command: `npm install`
- [ ] Node version: 18.x or higher
- [ ] Framework preset: Next.js

### Domain Configuration

- [ ] Custom domain added
- [ ] DNS configured correctly
- [ ] SSL certificate issued
- [ ] HTTPS redirect enabled
- [ ] www redirect configured (if needed)

---

## 📊 Monitoring & Analytics

### Error Monitoring

- [ ] Sentry (or similar) configured
- [ ] Error alerts set up
- [ ] Error dashboard accessible
- [ ] Source maps uploaded

### Analytics

- [ ] Google Analytics configured
- [ ] Custom events tracked:
  - [ ] User registration
  - [ ] Photo uploads
  - [ ] Project creation
  - [ ] Quote generation
  - [ ] Task completion
  - [ ] Punch item resolution

### Performance Monitoring

- [ ] Vercel Analytics enabled
- [ ] Core Web Vitals tracked
- [ ] API response times monitored
- [ ] Database query performance tracked

### Uptime Monitoring

- [ ] Uptime monitor configured (UptimeRobot, Pingdom, etc.)
- [ ] Alert notifications set up
- [ ] Status page created (optional)

---

## 👥 User Management

### Initial Setup

- [ ] Admin account created
- [ ] Test accounts created for each role
- [ ] User roles configured correctly
- [ ] Default permissions verified

### Onboarding

- [ ] Welcome email template configured
- [ ] User guide accessible
- [ ] Demo data available (optional)
- [ ] Tutorial/walkthrough implemented (optional)

---

## 📝 Documentation

### Technical Documentation

- [ ] README.md updated with:
  - [ ] Setup instructions
  - [ ] Environment variables
  - [ ] Database schema
  - [ ] API documentation
  - [ ] Deployment guide

- [ ] Architecture documentation complete
- [ ] Component documentation complete
- [ ] API endpoints documented

### User Documentation

- [ ] User guide written
- [ ] Feature tutorials created
- [ ] FAQ compiled
- [ ] Video tutorials (optional)
- [ ] Help center set up (optional)

### Admin Documentation

- [ ] Admin guide written
- [ ] Permission management guide
- [ ] Backup/restore procedures
- [ ] Troubleshooting guide
- [ ] Emergency procedures

---

## 🔄 Post-Deployment

### Immediate Actions (within 1 hour)

- [ ] Verify production site loads
- [ ] Test critical user flows
- [ ] Check error logs
- [ ] Monitor performance
- [ ] Verify database connections
- [ ] Test email sending

### Day 1 Monitoring

- [ ] Monitor error rates
- [ ] Check user registration
- [ ] Verify email delivery
- [ ] Monitor API response times
- [ ] Check storage usage
- [ ] Review analytics data

### Week 1 Actions

- [ ] Gather user feedback
- [ ] Monitor performance trends
- [ ] Review error patterns
- [ ] Check database performance
- [ ] Verify backup success
- [ ] Plan first updates

---

## 🚨 Rollback Plan

### If Critical Issues Occur

1. **Immediate Response**
   - [ ] Notify team
   - [ ] Assess severity
   - [ ] Decide: fix forward or rollback

2. **Rollback Procedure**
   ```bash
   # Revert to previous deployment
   vercel rollback

   # Or restore database
   # From Supabase dashboard: Projects > Database > Backups
   ```

3. **Communication**
   - [ ] Update status page
   - [ ] Notify affected users
   - [ ] Post incident report

---

## 📞 Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| Technical Lead | _______ | _______ |
| DevOps | _______ | _______ |
| Database Admin | _______ | _______ |
| Product Owner | _______ | _______ |

---

## ✅ Final Sign-Off

### Team Approval

- [ ] Technical Lead approved
- [ ] Product Owner approved
- [ ] QA approved
- [ ] Security reviewed
- [ ] Legal approved (if required)

### Launch Criteria Met

- [ ] All critical bugs fixed
- [ ] All tests passing
- [ ] Performance benchmarks met
- [ ] Security audit complete
- [ ] Documentation complete
- [ ] Backup plan in place
- [ ] Monitoring active
- [ ] Team trained

---

## 🎯 Launch Day Checklist

### Morning (Pre-Launch)

- [ ] Final database backup
- [ ] Verify all systems operational
- [ ] Team on standby
- [ ] Communication plan ready

### Launch

- [ ] Execute deployment
- [ ] Verify production site
- [ ] Run smoke tests
- [ ] Monitor dashboards
- [ ] Send launch announcement

### Post-Launch (First 4 hours)

- [ ] Monitor error logs continuously
- [ ] Track performance metrics
- [ ] Respond to user feedback
- [ ] Fix critical issues immediately
- [ ] Document any incidents

---

## 📈 Success Metrics

### Technical Metrics

- Uptime: > 99.9%
- Page load time: < 3 seconds
- Error rate: < 0.1%
- API response time: < 500ms

### Business Metrics

- User registration rate
- Daily active users
- Feature adoption rate
- User satisfaction score

---

## 🎉 Post-Launch Celebration

Once all checklists complete and monitoring stable:

- [ ] Team celebration scheduled
- [ ] Success metrics shared
- [ ] Lessons learned documented
- [ ] Next iteration planned

---

**Status**: Ready for production deployment once all items checked

**Last Updated**: [Add date when you complete this]

**Deployment Date**: _______________

**Deployed By**: _______________

---

*Let's build something amazing!* 🏗️✨
