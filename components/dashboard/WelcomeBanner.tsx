'use client'

interface WelcomeBannerProps {
  userName: string
  greeting: string
  onDismiss: () => void
}

export default function WelcomeBanner({ userName, greeting, onDismiss }: WelcomeBannerProps) {
  return (
    <div className="bg-linear-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 mb-8 text-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2">
            {greeting}, {userName}!
          </h1>
          <p className="text-blue-100 mb-4">
            Welcome to your Sierra Suites dashboard. Manage your construction projects with ease.
          </p>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-white/90 dark:bg-white/10 text-blue-600 dark:text-blue-200 rounded-lg font-medium hover:bg-white dark:hover:bg-white/20 transition-colors">
              + New Project
            </button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400 transition-colors">
              📸 Upload Photos
            </button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-400 transition-colors">
              💰 Create Quote
            </button>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-blue-100 hover:text-white text-2xl font-bold leading-none"
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>
    </div>
  )
}
