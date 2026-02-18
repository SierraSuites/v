# PRODUCTION DEPLOYMENT GUIDE

**Purpose**: Step-by-step guide to deploy The Sierra Suites to production
**Audience**: DevOps engineers, system administrators
**Timeline**: 2-3 days for initial setup

---

## INFRASTRUCTURE ARCHITECTURE

### Recommended Stack

**Hosting**: Vercel (Next.js) + Supabase (Database)
- **Why**: Serverless, auto-scaling, zero DevOps overhead
- **Cost**: ~$200/month for 100 users, ~$1,000/month for 1,000 users
- **Alternative**: AWS (EC2 + RDS + S3) for more control

**Database**: Supabase PostgreSQL
- **Why**: Built-in auth, real-time subscriptions, row-level security
- **Specs**: Start with $25/month plan, upgrade as needed
- **Backup**: Daily automated backups included

**Storage**: Supabase Storage (S3-compatible)
- **Why**: Integrated with database, built-in CDN
- **Cost**: $0.021/GB/month
- **CDN**: Automatic edge caching

**Email**: SendGrid or Postmark
- **Why**: High deliverability, transactional email experts
- **Cost**: $15/month for 40K emails

**Monitoring**: Sentry + Vercel Analytics
- **Why**: Error tracking + performance monitoring
- **Cost**: $26/month Sentry, $10/month Vercel Analytics

---

## DEPLOYMENT STEPS

### 1. Domain & DNS Setup

```bash
# Purchase domain (recommended: namecheap.com or cloudflare.com)
# Example: sierrasuites.com

# DNS Records needed:
# A record: @ -> Vercel IP
# CNAME: www -> cname.vercel-dns.com
# MX records: For email (if using custom domain email)
# TXT record: SPF for email deliverability
```

**DNS Configuration**:
```
Type  Name   Value                        TTL
A     @      76.76.21.21                  300
CNAME www    cname.vercel-dns.com         300
TXT   @      v=spf1 include:sendgrid.net  300
```

### 2. Supabase Project Setup

**Step 1**: Create Project
```
1. Go to supabase.com
2. Create new project
3. Choose region (closest to users - US East for USA)
4. Generate strong database password (save in password manager)
5. Wait 2-3 minutes for provisioning
```

**Step 2**: Configure Database
```sql
-- Run these SQL commands in Supabase SQL Editor

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For full-text search

-- 2. Create companies table (multi-tenancy)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,

  -- Subscription
  plan VARCHAR(50) DEFAULT 'free', -- 'free', 'pro', 'enterprise'
  subscription_status VARCHAR(50) DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,

  -- Storage limits
  storage_used_bytes BIGINT DEFAULT 0,
  storage_quota_gb INT DEFAULT 10,

  -- Billing
  stripe_customer_id VARCHAR(100),
  stripe_subscription_id VARCHAR(100),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create user profiles (extends Supabase auth.users)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),

  -- Profile
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(20),

  -- Role
  role VARCHAR(50) DEFAULT 'user', -- 'owner', 'admin', 'pm', 'worker'

  -- Preferences
  timezone VARCHAR(50) DEFAULT 'America/New_York',
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Row Level Security
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see their own company
CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid());
```

**Step 3**: Configure Storage Buckets
```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('project-photos', 'project-photos', false),
  ('documents', 'documents', false),
  ('company-logos', 'company-logos', true);

-- Set storage policies
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Users can view project photos in their company"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'project-photos' AND
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM projects
      WHERE company_id = (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );
```

### 3. Environment Variables

**Create `.env.local` file**:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... # Keep secret!

# App
NEXT_PUBLIC_APP_URL=https://sierrasuites.com
NODE_ENV=production

# Authentication
NEXTAUTH_SECRET=generate-random-32-char-string
NEXTAUTH_URL=https://sierrasuites.com

# Stripe (payments)
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# SendGrid (email)
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@sierrasuites.com
SENDGRID_FROM_NAME=The Sierra Suites

# Google Cloud (for AI features)
GOOGLE_CLOUD_PROJECT_ID=sierra-suites
GOOGLE_CLOUD_VISION_API_KEY=AIzaxxx

# OpenAI / Anthropic (for AI Copilot)
ANTHROPIC_API_KEY=sk-ant-xxx
OPENAI_API_KEY=sk-xxx

# Sentry (error tracking)
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_MOBILE_APP=false
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false
```

**Security Notes**:
- ✅ Never commit `.env.local` to git
- ✅ Use different keys for dev/staging/production
- ✅ Rotate keys every 90 days
- ✅ Store in Vercel environment variables (encrypted)

### 4. Vercel Deployment

**Step 1**: Install Vercel CLI
```bash
npm install -g vercel

# Login
vercel login
```

**Step 2**: Deploy
```bash
# From project root
cd /path/to/sierra-suites

# Link to Vercel project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# ... add all environment variables

# Deploy to production
vercel --prod
```

**Step 3**: Configure Custom Domain
```bash
# Add domain
vercel domains add sierrasuites.com

# Add www redirect
vercel domains add www.sierrasuites.com
```

**Vercel Configuration** (`vercel.json`):
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NODE_ENV": "production"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### 5. Database Migrations

**Create Migration System**:
```typescript
// scripts/migrate.ts
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function runMigrations() {
  const migrationsDir = join(process.cwd(), 'supabase/migrations')

  // Get list of migrations
  const migrations = [
    '001_initial_schema.sql',
    '002_add_projects.sql',
    '003_add_tasks.sql',
    '004_add_quotes.sql',
    // ... all migration files
  ]

  for (const migration of migrations) {
    console.log(`Running migration: ${migration}`)

    const sql = readFileSync(join(migrationsDir, migration), 'utf-8')

    const { error } = await supabase.rpc('exec_sql', { query: sql })

    if (error) {
      console.error(`Migration ${migration} failed:`, error)
      process.exit(1)
    }

    console.log(`✅ ${migration} completed`)
  }

  console.log('All migrations completed!')
}

runMigrations()
```

**Run Migrations**:
```bash
npm run migrate:prod
```

### 6. Stripe Setup

**Step 1**: Create Stripe Account
1. Go to stripe.com
2. Create account
3. Complete business verification
4. Get API keys (Dashboard → Developers → API Keys)

**Step 2**: Create Products
```bash
# Using Stripe CLI
stripe products create \
  --name "Pro Plan" \
  --description "Full access to all features"

stripe prices create \
  --product prod_xxx \
  --unit-amount 8900 \
  --currency usd \
  --recurring-interval month
```

**Step 3**: Configure Webhooks
```bash
# Add webhook endpoint
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# For production:
# Dashboard → Developers → Webhooks
# Add endpoint: https://sierrasuites.com/api/webhooks/stripe
# Select events:
#   - customer.subscription.created
#   - customer.subscription.updated
#   - customer.subscription.deleted
#   - invoice.payment_succeeded
#   - invoice.payment_failed
```

### 7. Email Configuration

**SendGrid Setup**:
```bash
# 1. Create SendGrid account (sendgrid.com)
# 2. Verify domain
# 3. Create API key
# 4. Add DNS records for domain verification:

CNAME em1234.sierrasuites.com -> u1234567.wl.sendgrid.net
CNAME s1._domainkey -> s1.domainkey.u1234567.wl.sendgrid.net
CNAME s2._domainkey -> s2.domainkey.u1234567.wl.sendgrid.net
```

**Email Templates**:
Create templates in SendGrid dashboard:
- Welcome email (user signup)
- Email verification
- Password reset
- Invoice sent
- Payment received
- Weekly digest

### 8. Monitoring Setup

**Sentry Configuration**:
```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // Filter out sensitive data
    if (event.request?.headers) {
      delete event.request.headers['authorization']
      delete event.request.headers['cookie']
    }
    return event
  }
})
```

**Vercel Analytics**:
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 9. Security Hardening

**Content Security Policy**:
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' *.vercel.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self' data:;
      connect-src 'self' *.supabase.co *.stripe.com;
    `.replace(/\s{2,}/g, ' ').trim()
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ]
  }
}
```

**Rate Limiting**:
```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s')
})

export async function middleware(request: Request) {
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success } = await ratelimit.limit(ip)

  if (!success) {
    return new Response('Too Many Requests', { status: 429 })
  }

  return NextResponse.next()
}
```

### 10. Performance Optimization

**Image Optimization**:
```typescript
// next.config.js
module.exports = {
  images: {
    domains: ['supabase.co', 'avatars.githubusercontent.com'],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60
  }
}
```

**Database Indexing**:
```sql
-- Critical indexes for performance
CREATE INDEX idx_projects_company_status ON projects(company_id, status);
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX idx_tasks_assignee_due ON tasks(assignee_id, due_date);
CREATE INDEX idx_photos_project_date ON media_assets(project_id, captured_at DESC);

-- Full-text search indexes
CREATE INDEX idx_projects_search ON projects USING GIN(to_tsvector('english', name || ' ' || description));
CREATE INDEX idx_tasks_search ON tasks USING GIN(to_tsvector('english', title || ' ' || description));
```

---

## POST-DEPLOYMENT CHECKLIST

### Immediate (Day 1)
- [ ] Verify all pages load correctly
- [ ] Test user signup flow
- [ ] Test password reset flow
- [ ] Test file upload (photos, documents)
- [ ] Test payment flow (Stripe)
- [ ] Test email sending (SendGrid)
- [ ] Check error tracking (Sentry)
- [ ] Verify SSL certificate (https://)
- [ ] Test on mobile devices
- [ ] Check load times (<3 seconds)

### Week 1
- [ ] Monitor error rates (target: <0.1%)
- [ ] Check database performance
- [ ] Review storage usage
- [ ] Test with 10 beta users
- [ ] Collect feedback
- [ ] Fix critical bugs
- [ ] Optimize slow queries

### Month 1
- [ ] Scale testing (100 concurrent users)
- [ ] Database backup verification
- [ ] Security audit
- [ ] Performance optimization
- [ ] SEO optimization
- [ ] Documentation updates
- [ ] Customer support setup

---

## BACKUP & DISASTER RECOVERY

### Automated Backups

**Supabase** (included):
- Daily automated backups (retained 7 days)
- Point-in-time recovery (last 7 days)
- Backup download available

**Additional Backup Strategy**:
```bash
# Daily backup script (run via cron)
#!/bin/bash

DATE=$(date +%Y%m%d)
pg_dump $DATABASE_URL | gzip > backup-$DATE.sql.gz

# Upload to S3
aws s3 cp backup-$DATE.sql.gz s3://sierra-backups/

# Cleanup old backups (keep 30 days)
find . -name "backup-*.sql.gz" -mtime +30 -delete
```

### Disaster Recovery Plan

**Scenario 1: Database Failure**
1. Restore from latest Supabase backup (5 min)
2. Verify data integrity
3. Update DNS if needed
4. Test all critical flows

**Scenario 2: Vercel Outage**
1. Deploy to backup host (AWS/Netlify)
2. Update DNS records
3. Communicate with users
4. Monitor resolution

**Scenario 3: Data Breach**
1. Immediately revoke compromised credentials
2. Force password reset for all users
3. Audit access logs
4. Notify affected users (legal requirement)
5. Engage security consultant

**RTO/RPO Targets**:
- Recovery Time Objective (RTO): 2 hours
- Recovery Point Objective (RPO): 1 hour (max data loss)

---

## SCALING STRATEGY

### 100 Users → 1,000 Users
- Upgrade Supabase to Pro plan ($25 → $125/month)
- Enable connection pooling
- Add Redis caching (Upstash)
- Optimize database queries

### 1,000 Users → 10,000 Users
- Migrate to dedicated database
- Add read replicas
- Implement CDN for static assets
- Horizontal scaling of API routes
- Consider microservices architecture

### 10,000+ Users (Enterprise)
- Multi-region deployment
- Database sharding by company
- Dedicated ops team
- 24/7 monitoring
- SLA commitments (99.9% uptime)

---

**Deployment should take 2-3 days for initial setup, then continuous deployment for updates. Monitor closely for first month. 🚀**
