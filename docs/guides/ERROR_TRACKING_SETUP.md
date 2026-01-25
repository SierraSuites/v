# Error Tracking Setup - Sentry Integration

This guide covers setting up Sentry for comprehensive error tracking and monitoring in The Sierra Suites platform.

## Table of Contents

1. [Why Sentry?](#why-sentry)
2. [Setup Instructions](#setup-instructions)
3. [Configuration](#configuration)
4. [Error Tracking Features](#error-tracking-features)
5. [Custom Error Reporting](#custom-error-reporting)
6. [Performance Monitoring](#performance-monitoring)
7. [User Feedback](#user-feedback)
8. [Testing Error Tracking](#testing-error-tracking)

---

## Why Sentry?

Sentry provides:
- **Real-time error tracking** - Get notified immediately when errors occur
- **Stack traces** - See exactly where errors happened in your code
- **User context** - Know which users are affected
- **Release tracking** - Track errors by deployment version
- **Performance monitoring** - Monitor slow API calls and page loads
- **Issue grouping** - Similar errors are grouped together
- **Alerts** - Get notified via email, Slack, etc.

---

## Setup Instructions

### Step 1: Create Sentry Account

1. Go to https://sentry.io/signup/
2. Sign up for a free account (supports 5,000 errors/month)
3. Create a new project:
   - Platform: **Next.js**
   - Project name: **sierra-suites-production**
   - Team: Create or select team

### Step 2: Install Sentry SDK

```bash
npm install @sentry/nextjs
# or
pnpm add @sentry/nextjs
# or
yarn add @sentry/nextjs
```

### Step 3: Run Sentry Wizard

```bash
npx @sentry/wizard@latest -i nextjs
```

This wizard will:
- Create `sentry.client.config.ts`
- Create `sentry.server.config.ts`
- Create `sentry.edge.config.ts`
- Update `next.config.js` (or create `next.config.mjs`)
- Add environment variables template

### Step 4: Add Environment Variables

Add to `.env.local`:

```bash
# Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=sierra-suites-production

# Optional: Upload source maps (for better stack traces)
SENTRY_AUTH_TOKEN=your-auth-token

# Environment identifier
NEXT_PUBLIC_ENVIRONMENT=production
# or: development, staging
```

**Get your values:**
- DSN: Sentry Dashboard → Settings → Client Keys (DSN)
- Org: Your organization slug in Sentry
- Auth Token: Sentry → Settings → Auth Tokens → Create New Token
  - Scopes needed: `project:releases`, `project:write`

Add to `.env.production`:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://your-production-dsn@sentry.io/project-id
NEXT_PUBLIC_ENVIRONMENT=production
SENTRY_ORG=your-organization-slug
SENTRY_PROJECT=sierra-suites-production
SENTRY_AUTH_TOKEN=your-production-auth-token
```

---

## Configuration

### Client-Side Configuration

Create or update `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session Replay sampling
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Integrations
  integrations: [
    Sentry.replayIntegration({
      // Additional SDK configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // Performance Monitoring
  tracesSampler: (samplingContext) => {
    // Don't sample in development
    if (process.env.NODE_ENV !== 'production') {
      return 1.0
    }

    // Sample API routes at higher rate
    if (samplingContext.location?.pathname?.startsWith('/api/')) {
      return 0.5 // 50% of API requests
    }

    // Sample page loads at lower rate
    return 0.1 // 10% of page loads
  },

  // Filtering
  beforeSend(event, hint) {
    // Filter out certain errors
    const error = hint.originalException

    // Ignore specific error types
    if (error && typeof error === 'object' && 'message' in error) {
      const message = error.message as string

      // Ignore network errors that are expected
      if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
        return null
      }

      // Ignore canceled requests
      if (message.includes('AbortError') || message.includes('The user aborted a request')) {
        return null
      }
    }

    return event
  },

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Ignore errors from browser extensions
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
  ],

  // Don't send errors in development
  enabled: process.env.NODE_ENV === 'production',
})
```

### Server-Side Configuration

Create or update `sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',

  // Adjust this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Performance Monitoring
  integrations: [
    // Database query monitoring
    Sentry.postgresIntegration(),
  ],

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Server-side filtering
  beforeSend(event, hint) {
    // Don't send errors for expected 404s
    if (event.exception?.values?.[0]?.value?.includes('404')) {
      return null
    }

    // Don't send Supabase auth errors (these are expected user errors)
    if (event.exception?.values?.[0]?.value?.includes('Invalid login credentials')) {
      return null
    }

    return event
  },

  enabled: process.env.NODE_ENV === 'production',
})
```

### Edge Runtime Configuration

Create or update `sentry.edge.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  enabled: process.env.NODE_ENV === 'production',
})
```

### Next.js Configuration

Update `next.config.js` (or `next.config.mjs`):

```javascript
const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing Next.js config
  reactStrictMode: true,
  swcMinify: true,

  // Sentry configuration
  sentry: {
    // Upload source maps during build
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements
    disableLogger: true,
  },
}

// Sentry webpack plugin options
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry webpack plugin
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps in production
  silent: process.env.NODE_ENV !== 'production',

  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppress all logs
  silent: true,

  // Upload source maps
  widenClientFileUpload: true,

  // Transpile SDK for compatibility
  transpileClientSDK: true,

  // Hide source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements
  disableLogger: true,

  // Automatically annotate React components for better errors
  automaticVercelMonitors: true,
}

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions)
```

---

## Error Tracking Features

### 1. Automatic Error Capture

Errors are automatically captured:
- Unhandled exceptions
- Unhandled promise rejections
- React component errors (via Error Boundaries)
- API route errors
- Server-side rendering errors

### 2. Manual Error Capture

Capture errors manually in your code:

```typescript
import * as Sentry from '@sentry/nextjs'

try {
  // Risky operation
  await processPayment()
} catch (error) {
  // Log to Sentry with additional context
  Sentry.captureException(error, {
    tags: {
      section: 'payment',
      payment_method: 'stripe',
    },
    extra: {
      userId: user.id,
      amount: paymentAmount,
    },
    level: 'error',
  })

  // Still handle error in UI
  showErrorToast('Payment failed')
}
```

### 3. Custom Messages

Log custom messages:

```typescript
import * as Sentry from '@sentry/nextjs'

// Info level
Sentry.captureMessage('User completed onboarding', 'info')

// Warning level
Sentry.captureMessage('Storage quota at 90%', 'warning')

// Error level
Sentry.captureMessage('Database backup failed', 'error')
```

### 4. User Context

Associate errors with users:

```typescript
import * as Sentry from '@sentry/nextjs'

// In your auth callback or layout
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()

if (user) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.user_metadata?.full_name,
  })
}

// On logout
Sentry.setUser(null)
```

**Add to your layout.tsx:**

```typescript
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as Sentry from '@sentry/nextjs'

export function SentryUserProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient()

    // Set user on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        Sentry.setUser({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.full_name,
        })
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        Sentry.setUser({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.full_name,
        })
      } else if (event === 'SIGNED_OUT') {
        Sentry.setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return children
}
```

### 5. Breadcrumbs

Add breadcrumbs to track user actions:

```typescript
import * as Sentry from '@sentry/nextjs'

// Log user actions
Sentry.addBreadcrumb({
  category: 'user-action',
  message: 'User clicked "Create Project"',
  level: 'info',
})

// Log navigation
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'Navigated to /projects',
  level: 'info',
})

// Log API calls
Sentry.addBreadcrumb({
  category: 'api',
  message: 'Fetching projects',
  level: 'info',
  data: {
    url: '/api/projects',
    method: 'GET',
  },
})
```

### 6. Context Tags

Add custom tags for filtering:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.setTag('company_id', companyId)
Sentry.setTag('user_role', userRole)
Sentry.setTag('subscription_plan', plan)

// In API routes
Sentry.setTag('api_endpoint', '/api/projects')
Sentry.setTag('http_method', 'POST')
```

---

## Custom Error Reporting

### API Route Error Reporting

Update `lib/api/auth-middleware.ts` to integrate with Sentry:

```typescript
import * as Sentry from '@sentry/nextjs'

export function handleApiError(error: unknown): NextResponse {
  console.error('API Error:', error)

  // Capture in Sentry
  if (error instanceof Error) {
    Sentry.captureException(error, {
      tags: {
        error_type: 'api_error',
      },
    })
  } else {
    Sentry.captureMessage(`Unknown API error: ${String(error)}`, 'error')
  }

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  )
}
```

### Enhanced Error Boundary

Update `components/ErrorBoundary.tsx`:

```typescript
import * as Sentry from '@sentry/nextjs'

export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)

    // Send to Sentry with component stack
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        error_boundary: 'main',
      },
    })
  }

  // ... rest of component
}
```

### Database Error Tracking

Create `lib/supabase/error-tracking.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'
import { PostgrestError } from '@supabase/supabase-js'

export function trackSupabaseError(
  error: PostgrestError,
  context: {
    table?: string
    operation?: 'select' | 'insert' | 'update' | 'delete'
    userId?: string
  }
) {
  Sentry.captureException(new Error(error.message), {
    tags: {
      error_type: 'database',
      db_table: context.table,
      db_operation: context.operation,
      db_code: error.code,
    },
    extra: {
      error_details: error.details,
      error_hint: error.hint,
      user_id: context.userId,
    },
    level: 'error',
  })
}

// Usage in your queries:
import { trackSupabaseError } from '@/lib/supabase/error-tracking'

const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('company_id', companyId)

if (error) {
  trackSupabaseError(error, {
    table: 'projects',
    operation: 'select',
    userId: user.id,
  })
  throw new Error('Failed to fetch projects')
}
```

---

## Performance Monitoring

### Transaction Tracking

Track slow operations:

```typescript
import * as Sentry from '@sentry/nextjs'

// Wrap slow operations in transactions
export async function generateQuotePDF(quoteId: string) {
  const transaction = Sentry.startTransaction({
    op: 'quote.generate_pdf',
    name: 'Generate Quote PDF',
    tags: {
      quote_id: quoteId,
    },
  })

  try {
    // Step 1: Fetch quote data
    const span1 = transaction.startChild({
      op: 'db.query',
      description: 'Fetch quote data',
    })
    const quote = await fetchQuote(quoteId)
    span1.finish()

    // Step 2: Generate PDF
    const span2 = transaction.startChild({
      op: 'pdf.generate',
      description: 'Generate PDF document',
    })
    const pdf = await generatePDF(quote)
    span2.finish()

    // Step 3: Upload to storage
    const span3 = transaction.startChild({
      op: 'storage.upload',
      description: 'Upload PDF to storage',
    })
    const url = await uploadPDF(pdf)
    span3.finish()

    transaction.setStatus('ok')
    return url
  } catch (error) {
    transaction.setStatus('internal_error')
    Sentry.captureException(error)
    throw error
  } finally {
    transaction.finish()
  }
}
```

### API Route Performance

Add to API routes:

```typescript
import * as Sentry from '@sentry/nextjs'

export async function GET(request: NextRequest) {
  const transaction = Sentry.startTransaction({
    op: 'http.server',
    name: 'GET /api/projects',
    tags: {
      'http.method': 'GET',
    },
  })

  try {
    // Your API logic
    const projects = await getProjects()

    transaction.setHttpStatus(200)
    transaction.setTag('projects_count', projects.length)

    return NextResponse.json({ data: projects })
  } catch (error) {
    transaction.setHttpStatus(500)
    Sentry.captureException(error)
    return handleApiError(error)
  } finally {
    transaction.finish()
  }
}
```

### Custom Metrics

Track custom metrics:

```typescript
import * as Sentry from '@sentry/nextjs'

// Track file upload size
Sentry.metrics.distribution('file.upload.size', fileSize, {
  unit: 'byte',
  tags: {
    file_type: fileType,
  },
})

// Track quote value
Sentry.metrics.distribution('quote.value', quoteTotal, {
  unit: 'dollar',
  tags: {
    currency: 'USD',
  },
})

// Track processing time
Sentry.metrics.distribution('ai.analysis.duration', processingTime, {
  unit: 'millisecond',
  tags: {
    analysis_type: 'photo',
  },
})
```

---

## User Feedback

### User Feedback Widget

Add a feedback button to your app:

```typescript
'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export function FeedbackButton() {
  useEffect(() => {
    // Load Sentry feedback widget
    const feedback = Sentry.feedbackIntegration({
      colorScheme: 'light',
      autoInject: false,
    })
  }, [])

  const openFeedback = () => {
    const feedback = Sentry.getFeedback()
    if (feedback) {
      feedback.createForm()
      feedback.open()
    }
  }

  return (
    <button
      onClick={openFeedback}
      className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700"
    >
      Report an Issue
    </button>
  )
}
```

### Feedback on Error

Show feedback form when errors occur:

```typescript
import * as Sentry from '@sentry/nextjs'

export class ErrorBoundary extends Component<Props, State> {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const eventId = Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
    })

    this.setState({ eventId })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>Something went wrong</h2>
          <button
            onClick={() => {
              Sentry.showReportDialog({
                eventId: this.state.eventId,
                title: 'We apologize for the inconvenience',
                subtitle: 'Our team has been notified. If you'd like to help, please describe what happened below.',
                user: {
                  email: 'user@example.com',
                  name: 'User Name',
                },
              })
            }}
          >
            Report Feedback
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

---

## Testing Error Tracking

### Test Client-Side Errors

Add a test button (development only):

```typescript
// components/SentryTestButton.tsx
'use client'

import * as Sentry from '@sentry/nextjs'

export function SentryTestButton() {
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const testError = () => {
    throw new Error('Sentry Test Error - Client Side')
  }

  const testMessage = () => {
    Sentry.captureMessage('Sentry Test Message', 'info')
  }

  const testException = () => {
    try {
      throw new Error('Sentry Test Exception')
    } catch (error) {
      Sentry.captureException(error, {
        tags: { test: 'true' },
        extra: { timestamp: new Date().toISOString() },
      })
    }
  }

  return (
    <div className="fixed bottom-4 left-4 bg-gray-800 text-white p-4 rounded-lg space-y-2">
      <h3 className="font-bold">Sentry Tests (Dev Only)</h3>
      <button onClick={testError} className="block w-full bg-red-600 px-3 py-1 rounded">
        Test Error
      </button>
      <button onClick={testMessage} className="block w-full bg-blue-600 px-3 py-1 rounded">
        Test Message
      </button>
      <button onClick={testException} className="block w-full bg-yellow-600 px-3 py-1 rounded">
        Test Exception
      </button>
    </div>
  )
}
```

### Test API Errors

Create a test API route:

```typescript
// app/api/test-sentry/route.ts
import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    // Simulate different error types
    const errorType = request.nextUrl.searchParams.get('type') || 'generic'

    switch (errorType) {
      case 'database':
        throw new Error('Simulated database error')

      case 'auth':
        throw new Error('Simulated authentication error')

      case 'validation':
        throw new Error('Simulated validation error')

      default:
        throw new Error('Simulated generic error')
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        test_error: 'true',
        error_simulation: 'api',
      },
    })

    return NextResponse.json(
      { error: 'Test error captured' },
      { status: 500 }
    )
  }
}
```

### Verify in Sentry Dashboard

1. Go to Sentry Dashboard
2. Navigate to Issues
3. Verify test errors appear
4. Check error details:
   - Stack trace
   - Breadcrumbs
   - User context
   - Tags
   - Environment
5. Verify source maps loaded correctly (line numbers should match your code)

---

## Production Deployment Checklist

Before deploying to production:

### Environment Variables
- [ ] `NEXT_PUBLIC_SENTRY_DSN` set in production
- [ ] `SENTRY_AUTH_TOKEN` set (for source map uploads)
- [ ] `NEXT_PUBLIC_ENVIRONMENT=production` set
- [ ] `SENTRY_ORG` and `SENTRY_PROJECT` set

### Configuration
- [ ] Source maps uploading enabled
- [ ] Sample rate configured (10% recommended for production)
- [ ] User context tracking enabled
- [ ] Breadcrumbs enabled
- [ ] Session replay configured
- [ ] Performance monitoring enabled

### Testing
- [ ] Test errors are captured
- [ ] Source maps work (stack traces show correct line numbers)
- [ ] User context attached to errors
- [ ] Breadcrumbs show user actions
- [ ] API errors tracked
- [ ] Database errors tracked

### Alerts
- [ ] Set up email alerts for new issues
- [ ] Set up Slack integration (optional)
- [ ] Configure alert rules (e.g., error rate > 10/min)
- [ ] Set up weekly digest emails

### Team Access
- [ ] Add team members to Sentry project
- [ ] Configure roles and permissions
- [ ] Set up on-call rotation (if applicable)

---

## Sentry Dashboard Tour

### Issues Tab
- View all errors grouped by similarity
- Filter by environment, release, user
- See error frequency and affected users
- View error trends over time

### Performance Tab
- View slow transactions
- Identify slow API endpoints
- See database query performance
- Track frontend page load times

### Releases Tab
- Track errors by deployment
- Compare error rates between releases
- See which release introduced new errors
- Track deploy health

### Alerts Tab
- Configure custom alert rules
- Set up integrations (email, Slack, PagerDuty)
- View alert history
- Manage notification settings

---

## Best Practices

### Do:
✅ Set user context on login
✅ Add breadcrumbs for important user actions
✅ Use tags to categorize errors
✅ Filter out expected errors (404s, validation errors)
✅ Set appropriate sample rates for performance
✅ Upload source maps for better stack traces
✅ Review and resolve issues regularly
✅ Set up alerts for critical errors

### Don't:
❌ Track every single error (filter noise)
❌ Send sensitive data (passwords, tokens, PII)
❌ Set 100% sample rate in production (too expensive)
❌ Ignore Sentry alerts
❌ Forget to test in staging first
❌ Leave unresolved issues piling up

---

## Troubleshooting

### Source Maps Not Working

**Problem:** Stack traces show minified code

**Solution:**
```bash
# 1. Verify auth token is set
echo $SENTRY_AUTH_TOKEN

# 2. Check Sentry webpack plugin is enabled
# In next.config.js, verify withSentryConfig is called

# 3. Verify source maps are being uploaded
# Check build output for "Sentry webpack plugin" messages

# 4. Check Sentry dashboard → Settings → Source Maps
# Verify source maps for your release are uploaded
```

### Errors Not Appearing

**Problem:** Errors not showing up in Sentry

**Solution:**
```typescript
// 1. Check DSN is set
console.log('Sentry DSN:', process.env.NEXT_PUBLIC_SENTRY_DSN)

// 2. Check Sentry is enabled
import * as Sentry from '@sentry/nextjs'
console.log('Sentry enabled:', Sentry.isEnabled())

// 3. Manually test
Sentry.captureMessage('Test message')

// 4. Check browser console for Sentry errors
// 5. Verify network tab shows request to sentry.io
```

### Too Many Errors

**Problem:** Getting flooded with errors

**Solution:**
```typescript
// Increase filtering in beforeSend
beforeSend(event, hint) {
  // Ignore certain error patterns
  const error = hint.originalException

  if (error instanceof TypeError && error.message.includes('null')) {
    return null // Don't send to Sentry
  }

  return event
}

// Or adjust sample rates
tracesSampleRate: 0.05, // Only 5% of errors
```

---

## Cost Optimization

Sentry pricing is based on:
- Number of errors per month
- Number of transactions (performance monitoring)
- Number of replays (session replay)

### Free Tier Limits:
- 5,000 errors/month
- 10,000 transactions/month
- 50 replays/month

### Optimization Tips:

1. **Filter aggressively**
   - Don't send expected errors (404s, validation)
   - Filter browser extension errors
   - Filter known third-party errors

2. **Sample intelligently**
   - Use 10% sample rate for page loads
   - Use 50% sample rate for API calls
   - Use 100% for critical errors only

3. **Quota management**
   - Set monthly quota limits
   - Configure spike protection
   - Archive old releases

4. **Monitor usage**
   - Check Sentry dashboard → Stats
   - Review most frequent errors
   - Resolve issues to reduce volume

---

## Next Steps

After setting up Sentry:

1. **Deploy to staging** - Test error tracking in staging environment
2. **Monitor for 1 week** - Ensure no issues with setup
3. **Deploy to production** - Enable in production
4. **Set up alerts** - Configure team notifications
5. **Review weekly** - Make error review part of your workflow
6. **Optimize** - Adjust sample rates and filters based on usage

---

## Support Resources

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Sentry Discord**: https://discord.gg/sentry
- **Status Page**: https://status.sentry.io/

---

**Last Updated**: Generated from enterprise implementation
**Version**: 1.0
**Platform**: The Sierra Suites Construction Management Platform
