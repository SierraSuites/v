"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null
    }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)

    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Uncomment when Sentry is installed:
      // import { captureError } from '@/lib/monitoring/sentry'
      // captureError(error, {
      //   level: 'error',
      //   tags: { boundary: 'component-error-boundary' },
      //   extra: {
      //     componentStack: errorInfo.componentStack,
      //     errorInfo,
      //   },
      // })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F8F9FA' }}>
          <div className="max-w-md w-full rounded-xl p-8 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
              <span className="text-4xl">🚨</span>
            </div>

            <h2 className="text-2xl font-bold mb-2" style={{ color: '#1A1A1A' }}>
              Construction Zone Ahead
            </h2>

            <p className="text-sm mb-6" style={{ color: '#4A4A4A' }}>
              {this.state.error?.message || 'Something unexpected happened. Our crew is working to fix it.'}
            </p>

            <div className="space-y-3">
              <button
                onClick={this.handleReset}
                className="w-full px-6 py-3 rounded-lg font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(to bottom, #FF6B6B 0%, #FF5252 100%)', boxShadow: '0 2px 4px rgba(255,107,107,0.2)' }}
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full px-6 py-3 rounded-lg font-semibold transition-all"
                style={{ border: '1px solid #E0E0E0', color: '#4A4A4A', backgroundColor: '#FFFFFF' }}
              >
                Go to Dashboard
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-3 rounded-lg font-semibold transition-all"
                style={{ border: '1px solid #E0E0E0', color: '#4A4A4A', backgroundColor: '#FFFFFF' }}
              >
                Reload Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-semibold mb-2" style={{ color: '#DC2626' }}>
                  Error Details (Development Only)
                </summary>
                <pre className="text-xs p-3 rounded overflow-auto max-h-48" style={{ backgroundColor: '#F8F9FA', color: '#1A1A1A' }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Construction-specific error boundary
export function ConstructionErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: '#FEE2E2', border: '1px solid #DC2626' }}>
          <span className="text-4xl mb-4 block">⚠️</span>
          <h3 className="text-lg font-bold mb-2" style={{ color: '#DC2626' }}>
            Safety Check Failed
          </h3>
          <p className="text-sm" style={{ color: '#4A4A4A' }}>
            This component encountered an error. Please refresh the page or contact support.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export default ErrorBoundary
