# 🚀 Sierra Suites - Complete Deployment Guide

**Last Updated:** January 22, 2026
**Version:** 1.0
**Status:** Production-Ready Deployment Instructions

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Deployment](#database-deployment)
4. [Storage Configuration](#storage-configuration)
5. [Authentication Setup](#authentication-setup)
6. [Application Deployment](#application-deployment)
7. [Verification & Testing](#verification-testing)
8. [Production Checklist](#production-checklist)

---

## 🔧 PREREQUISITES

### Required Accounts:
- ✅ Supabase account (free tier works for development)
- ✅ Vercel account (for Next.js deployment)
- ✅ GitHub account (for code repository)
- ⚠️ OpenAI account (optional - for AI features)
- ⚠️ Stripe account (optional - for payments)

### Required Software:
- Node.js 18+ or 20+
- npm or pnpm
- Git
- Supabase CLI (optional but recommended)

---

## 🌍 ENVIRONMENT SETUP

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in:
   - **Name:** sierra-suites-production (or your choice)
   - **Database Password:** Generate strong password
   - **Region:** Choose closest to your users
   - **Plan:** Free tier for dev, Pro for production

4. Wait for project initialization (~2 minutes)

### Step 2: Get API Keys

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGci...` (starts with eyJ)
   - **service_role key:** `eyJhbGci...` (KEEP SECRET!)

### Step 3: Create `.env.local` File

Create a file named `.env.local` in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... your-anon-key-here

# Supabase Service Role (Server-side only - NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... your-service-role-key-here

# Optional: OpenAI for AI Features
OPENAI_API_KEY=sk-proj-... your-openai-key-here

# Optional: Stripe for Payments
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**⚠️ IMPORTANT:**
- Add `.env.local` to `.gitignore` (should already be there)
- NEVER commit API keys to git
- Use different keys for dev/staging/production

---

## 🗄️ DATABASE DEPLOYMENT

### Step 1: Deploy Master Schema

1. Open Supabase Dashboard → **SQL Editor**
2. Click "**+ New query**"
3. Copy contents of `database/master-schema.sql`
4. Paste into editor
5. Click "**Run**"
6. Verify: Should see "Success. No rows returned"

**What this creates:**
- All tables (user_profiles, projects, tasks, etc.)
- Foreign keys
- Indexes
- Enums
- Constraints

### Step 2: Deploy RLS Policies

1. Open new SQL Editor tab
2. Copy contents of `database/rls-policies.sql`
3. Paste and run
4. Verify: Check "Authentication" → "Policies" to see all policies

**What this creates:**
- Row Level Security on all tables
- Helper functions (get_user_company_id, is_company_admin)
- 50+ security policies
- Multi-tenant data isolation

### Step 3: Deploy Functions & Triggers

1. Open new SQL Editor tab
2. Copy contents of `database/functions-and-triggers.sql`
3. Paste and run
4. Verify: Check "Database" → "Functions" to see all functions

**What this creates:**
- Auto-update timestamps
- Budget calculation functions
- Storage management functions
- Notification system
- Activity logging
- Data validation triggers

### Step 4: Verify Database Setup

Run this verification query:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should see:
-- - companies
-- - user_profiles
-- - projects
-- - tasks
-- - photos
-- - project_documents
-- - project_expenses
-- - quotes
-- - quote_line_items
-- - punch_items
-- - and more...

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- All should show rowsecurity = true

-- Check functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

---

## 📦 STORAGE CONFIGURATION

### Step 1: Create Storage Buckets

1. Go to **Storage** in Supabase dashboard
2. Click "**New bucket**"

**Create these buckets:**

#### Bucket 1: `project-documents`
- **Public:** Yes
- **Allowed MIME types:**
  - `application/pdf`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `application/vnd.ms-excel`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `image/*`
  - `application/dwg`
  - `application/dxf`
- **Max file size:** 52428800 (50MB)

#### Bucket 2: `fieldsnap-photos`
- **Public:** Yes
- **Allowed MIME types:**
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`
  - `image/heic`
- **Max file size:** 52428800 (50MB)

#### Bucket 3: `user-avatars`
- **Public:** Yes
- **Allowed MIME types:**
  - `image/jpeg`
  - `image/png`
  - `image/gif`
  - `image/webp`
- **Max file size:** 5242880 (5MB)

### Step 2: Set Storage Policies

For each bucket, go to **Policies** and add:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-documents');

-- Allow users to read their company's files
CREATE POLICY "Users can read company files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-documents');

-- Allow users to delete their company's files
CREATE POLICY "Users can delete company files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-documents');
```

Repeat for `fieldsnap-photos` and `user-avatars` buckets.

---

## 🔐 AUTHENTICATION SETUP

### Step 1: Configure Email Auth

1. Go to **Authentication** → **Providers**
2. Enable **Email**
3. Configure:
   - ✅ Enable email confirmations
   - ✅ Secure email change
   - ✅ Secure password change

### Step 2: Email Templates (Optional)

Go to **Authentication** → **Email Templates**

Customize these templates:
- Confirm signup
- Invite user
- Magic link
- Change email
- Reset password

### Step 3: URL Configuration

Go to **Authentication** → **URL Configuration**

Set these URLs:
- **Site URL:** `https://yourdomain.com` (production) or `http://localhost:3000` (dev)
- **Redirect URLs:** Add both production and dev URLs

---

## 🌐 APPLICATION DEPLOYMENT

### Option A: Deploy to Vercel (Recommended)

#### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/sierra-suites.git
git push -u origin main
```

#### Step 2: Deploy to Vercel

1. Go to [https://vercel.com](https://vercel.com)
2. Click "**Add New Project**"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset:** Next.js
   - **Root Directory:** ./
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** .next (default)

#### Step 3: Add Environment Variables

In Vercel project settings → **Environment Variables**, add:

```
NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGci...
NEXT_PUBLIC_APP_URL = https://your-project.vercel.app
```

**Optional:**
```
OPENAI_API_KEY = sk-proj-...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_...
STRIPE_SECRET_KEY = sk_...
```

#### Step 4: Deploy

1. Click "**Deploy**"
2. Wait ~3 minutes
3. Visit your URL: `https://your-project.vercel.app`

### Option B: Deploy to Your Own Server

See `SELF_HOSTING_GUIDE.md` (create if needed)

---

## ✅ VERIFICATION & TESTING

### Step 1: Test User Registration

1. Go to your deployed URL
2. Click "Register"
3. Create account with:
   - Email
   - Password
   - Full name
   - Company name
4. Check email for confirmation link
5. Confirm email
6. Login

### Step 2: Verify Database Records

In Supabase dashboard:

```sql
-- Check user was created
SELECT * FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- Check company was created
SELECT * FROM companies ORDER BY created_at DESC LIMIT 1;

-- Check user profile was created
SELECT * FROM user_profiles ORDER BY created_at DESC LIMIT 1;
```

### Step 3: Test Multi-Tenancy

1. Create another user account
2. Create a test company for User 2
3. Login as User 1
4. Create a project
5. Logout, login as User 2
6. Verify: User 2 should NOT see User 1's project

### Step 4: Test Core Features

- ✅ Create project
- ✅ Add tasks to project
- ✅ Upload document
- ✅ Add expense to budget
- ✅ Upload photos to FieldSnap
- ✅ Invite team member
- ✅ Dashboard shows real-time data

---

## 📋 PRODUCTION CHECKLIST

### Security
- [ ] RLS policies deployed and tested
- [ ] All API routes protected
- [ ] Environment variables not exposed to client
- [ ] Service role key kept secret
- [ ] HTTPS enabled (Vercel does this automatically)
- [ ] CORS configured properly

### Performance
- [ ] Database indexes created
- [ ] Images optimized
- [ ] Code splitting enabled
- [ ] CDN configured (Vercel does this)

### Monitoring
- [ ] Error tracking setup (Sentry recommended)
- [ ] Analytics setup (PostHog, Google Analytics, etc.)
- [ ] Uptime monitoring (UptimeRobot, Ping dom)
- [ ] Database backups enabled (Supabase Pro)

### Legal & Compliance
- [ ] Privacy policy added
- [ ] Terms of service added
- [ ] GDPR compliance reviewed
- [ ] Cookie consent implemented

### Testing
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness verified
- [ ] Load testing completed
- [ ] Security audit completed

---

## 🐛 TROUBLESHOOTING

### Issue: "Failed to fetch" errors

**Cause:** CORS or Supabase URL misconfigured

**Fix:**
1. Check `.env.local` has correct Supabase URL
2. Verify URL doesn't have trailing slash
3. Check Supabase project is running

### Issue: "Row Level Security policy violation"

**Cause:** RLS policies not deployed or incorrect

**Fix:**
1. Re-run `database/rls-policies.sql`
2. Check user has `company_id` in `user_profiles` table
3. Verify `get_user_company_id()` function exists

### Issue: "Storage bucket not found"

**Cause:** Storage buckets not created

**Fix:**
1. Create buckets as described in Storage Configuration
2. Ensure bucket names match exactly (case-sensitive)

### Issue: File upload fails

**Cause:** Storage policies not set

**Fix:**
1. Add storage RLS policies for each bucket
2. Check file size within limits
3. Verify MIME type is allowed

---

## 📚 NEXT STEPS

After successful deployment:

1. **Customize branding:** Logo, colors, company info
2. **Invite team:** Add other admins/developers
3. **Import data:** Migrate from existing systems
4. **Train users:** Conduct training sessions
5. **Monitor:** Watch for errors and performance issues
6. **Iterate:** Collect feedback and improve

---

## 🆘 SUPPORT

- **Documentation:** See other MD files in this repo
- **Supabase Issues:** [https://github.com/supabase/supabase/issues](https://github.com/supabase/supabase/issues)
- **Next.js Issues:** [https://github.com/vercel/next.js/issues](https://github.com/vercel/next.js/issues)

---

**Deployment Guide Version:** 1.0
**Last Updated:** January 22, 2026
**Maintained By:** Sierra Suites Development Team
