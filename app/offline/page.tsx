'use client'

/**
 * Offline Fallback Page
 *
 * Shown when the user is offline and tries to access a page that's not cached.
 * Provides helpful information and prompts to reconnect.
 */

import { useEffect, useState } from 'react'
import { WifiIcon } from '@heroicons/react/24/outline'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Reload the page when back online
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <WifiIcon className="w-10 h-10 text-gray-400" />
          </div>
        </div>

        {/* Status */}
        <div className="mb-6">
          {isOnline ? (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                Back Online
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                You're back online!
              </h1>
              <p className="text-gray-600">
                Reconnecting to The Sierra Suites...
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-full text-sm font-medium mb-4">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                Offline
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                You're offline
              </h1>
              <p className="text-gray-600">
                Looks like you've lost your internet connection. Some features may not be available right now.
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        {!isOnline && (
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Try Again
            </button>

            <button
              onClick={() => window.history.back()}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            While you're offline:
          </h3>
          <ul className="text-sm text-gray-600 space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>Previously viewed pages may be available from cache</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>New data won't load until you're back online</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400">•</span>
              <span>Check your network connection and try again</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
