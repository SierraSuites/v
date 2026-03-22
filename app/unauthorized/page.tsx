'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0f17] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#161b2e] rounded-xl shadow-lg p-8 text-center border border-gray-200 dark:border-gray-700">
        <div className="w-20 h-20 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m2-5V7m0 0V5m0 2h2M12 7H10M4.929 4.929l14.142 14.142M4.929 19.071L19.07 4.93" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Access Denied
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          You don&apos;t have permission to view this page. Contact your administrator if you believe this is a mistake.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => router.back()}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
          >
            Go Back
          </button>
          <Link
            href="/dashboard"
            className="block w-full px-6 py-3 bg-white dark:bg-[#1e2535] hover:bg-gray-50 dark:hover:bg-[#252d3d] text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-colors border border-gray-300 dark:border-gray-600"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
