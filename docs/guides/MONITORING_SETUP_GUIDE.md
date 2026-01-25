# 📊 MONITORING & ERROR TRACKING SETUP GUIDE

**The Sierra Suites - Production Monitoring**

This guide covers setting up comprehensive monitoring for production deployment.

---

## 🎯 WHAT WE'RE MONITORING

### 1. **Error Tracking** (Sentry)
- JavaScript errors in browser
- API errors on server
- Database errors
- Authentication failures
- Payment processing errors

### 2. **Performance Monitoring** (Sentry)
- Page load times
- API response times
- Database query performance
- Core Web Vitals

### 3. **Analytics** (Vercel Analytics + PostHog)
- User behavior
- Feature usage
- Conversion funnels
- A/B testing

### 4. **Infrastructure** (Vercel + Supabase Dashboards)
- Server uptime
- Database performance
- Storage usage
- Bandwidth usage

---

## 🚀 STEP 1: SENTRY SETUP (Error Tracking)

### Why Sentry?
- **Best-in-class** error tracking
- **Session replay** - see what user was doing before error
- **Performance monitoring** - find slow API calls
- **Free tier**: 5,000 errors/month, 100 performance units

### Installation

```bash
# 1. Install Sentry
npm install @sentry/nextjs

# 2. Run the setup wizard
npx @sentry/wizard -i nextjs
```

The wizard will:
- Create `sentry.client.config.ts`
- Create `sentry.server.config.ts`
- Create `sentry.edge.config.ts`
- Add Sentry to `next.config.mjs`
- Prompt for your Sentry DSN

### Configuration

**1. Create a Sentry account:**
- Go to https://sentry.io/signup/
- Create organization: "The Sierra Suites"
- Create project: "sierra-suites-production"
- Copy your DSN

**2. Add environment variables:**

```env
# .env.local (development)
NEXT_PUBLIC_SENTRY_DSN=https://YOUR_KEY@o4505807360458752.ingest.sentry.io/4505807360458752
SENTRY_AUTH_TOKEN=your_auth_token_here
SENTRY_ORG=the-sierra-suites
SENTRY_PROJECT=sierra-suites-production
NEXT_PUBLIC_ENVIRONMENT=development

# Production (in Vercel dashboard)
NEXT_PUBLIC_SENTRY_DSN=<same-dsn>
SENTRY_AUTH_TOKEN=<same-token>
SENTRY_ORG=the-sierra-suites
SENTRY_PROJECT=sierra-suites-production
NEXT_PUBLIC_ENVIRONMENT=production
```

**3. Update monitoring files:**

In `lib/monitoring/sentry.ts`:
- Uncomment all Sentry import statements
- Uncomment all Sentry.init() calls
- Uncomment all Sentry method calls

**4. Add to root layout:**

`app/layout.tsx`:
```typescript
import { useEffect } from 'react'
import { initSentry } from '@/lib/monitoring/sentry'

export default function RootLayout({ children }) {
  useEffect(() => {
    initSentry()
  }, [])

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

**5. Set user context after login:**

`app/api/auth/login/route.ts` or after authentication:
```typescript
import { setUserContext } from '@/lib/monitoring/sentry'

// After successful login
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', user.id)
  .single()

setUserContext({
  id: user.id,
  email: user.email,
  company_id: profile.company_id,
  subscription_tier: profile.subscription_tier,
})
```

### Sentry Configuration

**sentry.client.config.ts**:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production',

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of error sessions

  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: true,
    }),
  ],
})
```

---

## 📈 STEP 2: POSTHOG SETUP (Product Analytics)

### Why PostHog?
- **Open-source** alternative to Mixpanel
- **Self-hostable** (optional)
- **Free tier**: 1M events/month
- **Feature flags** for A/B testing

### Installation

```bash
npm install posthog-js
```

### Setup

**1. Create PostHog account:**
- Go to https://posthog.com/signup
- Create project: "The Sierra Suites"
- Copy your project API key

**2. Add to environment:**

```env
NEXT_PUBLIC_POSTHOG_KEY=phc_YOUR_KEY_HERE
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**3. Create PostHog provider:**

`lib/monitoring/posthog.tsx`:
```typescript
'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') posthog.debug()
        },
      })
    }
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
```

**4. Wrap app in provider:**

`app/layout.tsx`:
```typescript
import { PostHogProvider } from '@/lib/monitoring/posthog'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  )
}
```

**5. Track key events:**

```typescript
import { usePostHog } from 'posthog-js/react'

function QuoteForm() {
  const posthog = usePostHog()

  const handleSubmit = async () => {
    // Track quote creation
    posthog.capture('quote_created', {
      quote_value: total,
      client_type: clientType,
    })
  }
}
```

---

## 🔔 STEP 3: UPTIME MONITORING

### Option A: UptimeRobot (Free)

**1. Create account:** https://uptimerobot.com
**2. Add monitors:**
- HTTP(s): https://sierrasuites.com
- HTTP(s): https://sierrasuites.com/api/health
- Keyword: https://sierrasuites.com (check for "Sierra Suites")

**3. Set up alerts:**
- Email: your@email.com
- Slack: #production-alerts
- Check interval: 5 minutes

### Option B: Better Uptime (Recommended)

**1. Create account:** https://betteruptime.com
**2. Benefits:**
- Status page hosting
- Incident management
- Better alerting
- Free tier: 10 monitors

---

## 📊 STEP 4: LOGGING

### Vercel Logs

**Built-in** with Vercel deployment:
- Function logs (API routes)
- Edge function logs
- Build logs
- Real-time log streaming

**Access:**
- Vercel Dashboard → Your Project → Logs
- Filter by: time, source, status code

### Supabase Logs

**Built-in** with Supabase:
- Database logs (slow queries)
- API logs (RLS violations)
- Auth logs (failed logins)
- Storage logs (upload errors)

**Access:**
- Supabase Dashboard → Your Project → Logs

---

## 🚨 STEP 5: ALERTING

### Critical Alerts (Immediate)
Send to: **SMS + Slack + Email**

1. **Application Down** (uptime monitoring)
2. **Database Down** (Supabase health check fails)
3. **Critical Error Rate > 5%** (Sentry alert)
4. **Payment Processing Failures** (Stripe webhooks)
5. **RLS Policy Violations** (Supabase logs)

### Warning Alerts (Within 1 hour)
Send to: **Slack + Email**

1. **API Response Time > 2s** (Sentry performance)
2. **Database Query > 5s** (Supabase slow query log)
3. **Storage > 80% of limit** (custom monitor)
4. **High Error Rate (1-5%)** (Sentry alert)

### Info Alerts (Daily digest)
Send to: **Email**

1. **New user signups** (PostHog)
2. **Daily active users** (PostHog)
3. **Quote conversion rate** (PostHog)
4. **Average response times** (Sentry)

---

## 🎯 STEP 6: CUSTOM HEALTH CHECK API

Create `/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    version: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',
    checks: {
      database: 'unknown',
      storage: 'unknown',
      auth: 'unknown',
    },
  }

  try {
    // 1. Check database connection
    const supabase = createClient()
    const { error: dbError } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1)

    checks.checks.database = dbError ? 'unhealthy' : 'healthy'

    // 2. Check storage
    const { error: storageError } = await supabase
      .storage
      .listBuckets()

    checks.checks.storage = storageError ? 'unhealthy' : 'healthy'

    // 3. Check auth
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    checks.checks.auth = authError ? 'unhealthy' : 'healthy'

    // Overall status
    const hasFailures = Object.values(checks.checks).includes('unhealthy')
    checks.status = hasFailures ? 'degraded' : 'healthy'

    return NextResponse.json(checks, {
      status: hasFailures ? 503 : 200,
    })

  } catch (error) {
    checks.status = 'unhealthy'
    return NextResponse.json(checks, { status: 503 })
  }
}
```

**Usage:**
- Uptime monitors hit: `https://sierrasuites.com/api/health`
- Expected response: `{ "status": "healthy", ... }`
- If status != 200, trigger alerts

---

## 📋 MONITORING CHECKLIST

### Pre-Launch (Before Production)
- [ ] Sentry installed and configured
- [ ] PostHog installed and configured
- [ ] Error boundaries in all critical components
- [ ] Health check endpoint created
- [ ] Uptime monitoring configured
- [ ] Alert channels set up (Slack, email, SMS)
- [ ] Test error reporting (trigger test error)
- [ ] Test alert notifications

### Week 1 (Initial Launch)
- [ ] Monitor error dashboard daily
- [ ] Check performance metrics daily
- [ ] Review slow queries daily
- [ ] Fix critical errors immediately
- [ ] Adjust alert thresholds

### Ongoing (Production)
- [ ] Weekly error review meeting
- [ ] Monthly performance review
- [ ] Quarterly monitoring tool audit
- [ ] Update alert rules as needed

---

## 💰 COST ESTIMATES

### Free Tier (Beta/Early Stage)
- **Sentry Free**: 5K errors/month, 100 performance units
- **PostHog Free**: 1M events/month
- **UptimeRobot Free**: 50 monitors, 5-min checks
- **Vercel Logs**: Included with Vercel Pro ($20/mo)
- **Supabase Logs**: Included with Supabase Pro ($25/mo)
- **Total**: $45/month (Vercel + Supabase)

### Paid Tier (Growing Business)
- **Sentry Team**: $26/mo (50K errors, 1K performance)
- **PostHog Growth**: $0.000225/event after 1M (pay-as-you-go)
- **Better Uptime**: $18/mo (100 monitors, 30s checks)
- **Vercel Pro**: $20/mo
- **Supabase Pro**: $25/mo
- **Total**: ~$89/month

### Enterprise Tier (Scaled Business)
- **Sentry Business**: $80/mo (500K errors, 10K performance)
- **PostHog Scale**: Custom pricing (~$200/mo for 10M events)
- **Better Uptime Pro**: $78/mo (200 monitors, incident management)
- **Vercel Enterprise**: Custom
- **Supabase Team**: $599/mo
- **Total**: ~$1,000-2,000/month

---

## 🎓 BEST PRACTICES

### 1. **Don't Over-Monitor**
- Start with critical paths only
- Add monitoring as you scale
- Remove noisy alerts

### 2. **Context is King**
- Always include user_id, company_id in errors
- Add breadcrumbs before critical operations
- Tag errors by feature/component

### 3. **Performance Budget**
- Set target: 95% of page loads < 2s
- Set target: 99% of API calls < 1s
- Alert when targets missed

### 4. **Error Budget**
- Acceptable error rate: < 0.1% (1 in 1000)
- Critical error rate: < 0.01% (1 in 10,000)
- Zero tolerance: Payment errors, data loss

### 5. **Incident Response**
- Critical: Fix within 1 hour
- High: Fix within 4 hours
- Medium: Fix within 24 hours
- Low: Fix in next sprint

---

## 🚀 NEXT STEPS

1. **This Week**: Install Sentry, set up basic error tracking
2. **Next Week**: Add PostHog, track key user actions
3. **Week 3**: Set up uptime monitoring, health checks
4. **Week 4**: Configure alerts, test incident response

---

**Questions?** Check Sentry docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
