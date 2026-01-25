'use client'

// Global Error Boundary
// Catches errors in root layout (app/layout.tsx)

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to error reporting service
    console.error('Global Application Error:', error)

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Uncomment when Sentry is installed:
      // import { captureError } from '@/lib/monitoring/sentry'
      // captureError(error, {
      //   level: 'fatal',
      //   tags: { boundary: 'global-error' },
      //   extra: { digest: error.digest },
      // })
    }
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-gray-200">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Critical Error
            </h1>

            {/* Message */}
            <p className="text-gray-600 mb-6">
              The application encountered a critical error. Please try refreshing the page.
            </p>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 text-left">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-semibold text-red-600 mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-xs font-mono text-gray-700 mb-2 break-all">
                      <strong>Message:</strong> {error.message}
                    </p>
                    {error.digest && (
                      <p className="text-xs font-mono text-gray-700 mb-2">
                        <strong>Digest:</strong> {error.digest}
                      </p>
                    )}
                    <pre className="text-xs font-mono text-gray-600 overflow-auto max-h-48 mt-2 p-2 bg-white rounded border border-gray-200">
                      {error.stack}
                    </pre>
                  </div>
                </details>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={reset}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors shadow-md hover:shadow-lg"
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-semibold transition-colors border border-gray-300"
              >
                Go to Home
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 bg-white hover:bg-gray-50 text-gray-700 rounded-lg font-semibold transition-colors border border-gray-300"
              >
                Reload Page
              </button>
            </div>

            {/* Support link */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Need immediate help?{' '}
                <a href="mailto:support@sierrasuites.com" className="text-blue-600 hover:text-blue-700 font-medium">
                  Contact Support
                </a>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
