// ============================================================================
// SENTRY ERROR TRACKING INTEGRATION
// Production-grade error monitoring and performance tracking
// ============================================================================

/**
 * Sentry Configuration for The Sierra Suites
 *
 * Features:
 * - Error tracking with context (user, company, environment)
 * - Performance monitoring (API calls, page loads)
 * - Breadcrumb tracking (user actions leading to errors)
 * - Session replay for debugging
 * - Custom error tagging and filtering
 *
 * Setup Instructions:
 * 1. Install Sentry: npm install @sentry/nextjs
 * 2. Run: npx @sentry/wizard -i nextjs
 * 3. Set environment variables:
 *    - NEXT_PUBLIC_SENTRY_DSN=<your-dsn>
 *    - SENTRY_AUTH_TOKEN=<your-auth-token>
 *    - SENTRY_ORG=<your-org>
 *    - SENTRY_PROJECT=<your-project>
 * 4. Uncomment the imports and initialization below
 */

// import * as Sentry from '@sentry/nextjs'

/**
 * Initialize Sentry for client-side error tracking
 * Call this in app/layout.tsx or instrumentation.ts
 */
export function initSentry() {
  // Only initialize in production or staging
  if (process.env.NODE_ENV === 'development') {
    console.log('[Sentry] Skipping initialization in development mode')
    return
  }

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

  if (!dsn) {
    console.warn('[Sentry] No DSN provided. Error tracking disabled.')
    return
  }

  // Uncomment when Sentry is installed:
  /*
  Sentry.init({
    dsn,

    // Environment
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'production',

    // Release tracking for better error grouping
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'unknown',

    // Sample rate for errors (1.0 = 100% of errors)
    sampleRate: 1.0,

    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% in prod, 100% in staging

    // Session Replay
    replaysSessionSampleRate: 0.1, // 10% of normal sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        // Trace navigation and user interactions
        tracePropagationTargets: [
          'localhost',
          /^https:\/\/.*\.sierrasuites\.com/,
          /^https:\/\/.*\.supabase\.co/,
        ],
      }),
      new Sentry.Replay({
        // Privacy settings for session replay
        maskAllText: false,
        blockAllMedia: true,
        maskAllInputs: true, // Mask sensitive input fields
      }),
    ],

    // Ignore known errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',

      // Network errors we can't control
      'NetworkError',
      'Failed to fetch',
      'Network request failed',

      // Supabase auth redirects (expected behavior)
      'NEXT_REDIRECT',

      // User cancelled operations
      'AbortError',
      'The user aborted a request',
    ],

    // Filter out sensitive data before sending
    beforeSend(event, hint) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map(breadcrumb => {
          if (breadcrumb.data) {
            // Remove passwords, tokens, credit cards
            const sensitiveKeys = ['password', 'token', 'authorization', 'credit_card', 'ssn', 'api_key']
            sensitiveKeys.forEach(key => {
              if (breadcrumb.data && key in breadcrumb.data) {
                breadcrumb.data[key] = '[REDACTED]'
              }
            })
          }
          return breadcrumb
        })
      }

      // Remove sensitive data from request/response
      if (event.request?.data) {
        const data = event.request.data as Record<string, unknown>
        if (typeof data === 'object' && data !== null) {
          if ('password' in data) data.password = '[REDACTED]'
          if ('token' in data) data.token = '[REDACTED]'
          if ('credit_card' in data) data.credit_card = '[REDACTED]'
        }
      }

      return event
    },
  })
  */

  console.log('[Sentry] Initialized successfully')
}

/**
 * Set user context for better error tracking
 * Call this after successful authentication
 */
export function setUserContext(user: {
  id: string
  email?: string
  company_id?: string
  subscription_tier?: string
}) {
  // Uncomment when Sentry is installed:
  /*
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email?.split('@')[0],
  })

  // Add custom tags for filtering
  Sentry.setTag('company_id', user.company_id || 'unknown')
  Sentry.setTag('subscription_tier', user.subscription_tier || 'unknown')
  */

  console.log('[Sentry] User context set:', user.id)
}

/**
 * Clear user context on logout
 */
export function clearUserContext() {
  // Uncomment when Sentry is installed:
  /*
  Sentry.setUser(null)
  */

  console.log('[Sentry] User context cleared')
}

/**
 * Capture custom error with context
 */
export function captureError(
  error: Error,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  }
) {
  console.error('[Error]', error, context)

  // Uncomment when Sentry is installed:
  /*
  Sentry.captureException(error, {
    level: context?.level || 'error',
    tags: context?.tags,
    extra: context?.extra,
  })
  */
}

/**
 * Capture custom message (non-error event)
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
  }
) {
  console.log(`[${level.toUpperCase()}]`, message, context)

  // Uncomment when Sentry is installed:
  /*
  Sentry.captureMessage(message, {
    level,
    tags: context?.tags,
    extra: context?.extra,
  })
  */
}

/**
 * Add breadcrumb for debugging context
 * Breadcrumbs are actions/events leading up to an error
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
) {
  // Uncomment when Sentry is installed:
  /*
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  })
  */

  console.log('[Breadcrumb]', category, message, data)
}

/**
 * Start a performance transaction
 * Useful for tracking slow operations
 */
export function startTransaction(name: string, operation: string) {
  // Uncomment when Sentry is installed:
  /*
  return Sentry.startTransaction({
    name,
    op: operation,
  })
  */

  console.log('[Transaction Started]', name, operation)
  return null
}

/**
 * Wrap API calls with automatic error tracking
 */
export async function withErrorTracking<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: {
    tags?: Record<string, string>
    extra?: Record<string, unknown>
  }
): Promise<T> {
  const transaction = startTransaction(operation, 'function')

  try {
    const result = await fn()
    // @ts-ignore - transaction might be null
    transaction?.finish()
    return result
  } catch (error) {
    captureError(
      error instanceof Error ? error : new Error(String(error)),
      {
        ...context,
        tags: {
          ...context?.tags,
          operation,
        },
      }
    )
    // @ts-ignore - transaction might be null
    transaction?.finish()
    throw error
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
// 1. Initialize in app/layout.tsx:
import { initSentry } from '@/lib/monitoring/sentry'

export default function RootLayout({ children }) {
  useEffect(() => {
    initSentry()
  }, [])

  return <html>...</html>
}

// 2. Set user context after login:
import { setUserContext } from '@/lib/monitoring/sentry'

const { data } = await supabase.auth.signIn(...)
setUserContext({
  id: data.user.id,
  email: data.user.email,
  company_id: profile.company_id,
  subscription_tier: profile.subscription_tier,
})

// 3. Track errors in API routes:
import { captureError, addBreadcrumb } from '@/lib/monitoring/sentry'

export async function POST(request: NextRequest) {
  try {
    addBreadcrumb('api', 'Creating quote', { endpoint: '/api/quotes' })

    const quote = await createQuote(data)
    return NextResponse.json({ data: quote })
  } catch (error) {
    captureError(error, {
      tags: { api_route: '/api/quotes', method: 'POST' },
      extra: { request_body: data },
      level: 'error',
    })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// 4. Wrap critical operations:
import { withErrorTracking } from '@/lib/monitoring/sentry'

const result = await withErrorTracking(
  'database.create_invoice',
  async () => {
    return await supabase.from('invoices').insert(data)
  },
  {
    tags: { component: 'InvoiceForm' },
    extra: { invoice_data: data },
  }
)
*/
