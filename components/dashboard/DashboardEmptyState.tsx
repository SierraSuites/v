'use client'

import Link from 'next/link'

interface DashboardEmptyStateProps {
  userName: string
}

export default function DashboardEmptyState({ userName }: DashboardEmptyStateProps) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Welcome Hero */}
      <div className="bg-linear-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 mb-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Sierra Suites, {userName}!
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Your construction management command center is ready. Let's get started by creating your first project.
          </p>
        </div>
      </div>

      {/* Quick Start Steps */}
      <div className="bg-white rounded-xl shadow-sm p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Get Started in 3 Steps</h2>

        <div className="space-y-6">
          {/* Step 1 */}
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              1
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Create Your First Project</h3>
              <p className="text-gray-600 mb-3">
                Start by adding a project. Track progress, manage budgets, and collaborate with your team.
              </p>
              <Link
                href="/projects"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Project
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              2
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Invite Your Team</h3>
              <p className="text-gray-600 mb-3">
                Collaborate better by inviting team members. Assign roles and permissions.
              </p>
              <Link
                href="/teams"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Invite Team
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start">
            <div className="flex-shrink-0 w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
              3
            </div>
            <div className="ml-4 flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Start Capturing Progress</h3>
              <p className="text-gray-600 mb-3">
                Use FieldSnap to capture photos, track punch items, and document your work.
              </p>
              <Link
                href="/fieldsnap"
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Open FieldSnap
                <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Analytics</h3>
          <p className="text-sm text-gray-600">
            Get real-time insights into project health, budget variance, and completion rates.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Photo Management</h3>
          <p className="text-sm text-gray-600">
            Organize photos by project, location, and tags with automatic metadata extraction.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Management</h3>
          <p className="text-sm text-gray-600">
            Create workflows, assign tasks, and track completion with dependencies and timelines.
          </p>
        </div>
      </div>

      {/* Need Help */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Need Help Getting Started?</h3>
        <p className="text-gray-600 mb-4">
          Check out our guides or contact support for assistance.
        </p>
        <div className="flex justify-center gap-4">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            View Documentation
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  )
}
