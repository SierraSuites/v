'use client'

import Link from 'next/link'
import { getCRMUpgradeMessage } from '@/lib/crm-permissions'

interface CRMUpgradePromptProps {
  variant?: 'full' | 'compact'
}

export default function CRMUpgradePrompt({ variant = 'full' }: CRMUpgradePromptProps) {
  const upgradeInfo = getCRMUpgradeMessage()

  if (variant === 'compact') {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🔒</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              CRM Suite - Pro Feature
            </h3>
            <p className="text-sm text-gray-700">
              Upgrade to Pro (${upgradeInfo.price}/month) to access CRM features
            </p>
          </div>
          <Link
            href="/pricing"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold whitespace-nowrap"
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12 text-white text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h1 className="text-4xl font-bold mb-3">{upgradeInfo.title}</h1>
            <p className="text-xl text-blue-100">{upgradeInfo.description}</p>
          </div>

          {/* Content */}
          <div className="px-8 py-12">
            {/* Pricing */}
            <div className="text-center mb-8">
              <div className="inline-block bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl px-8 py-6 border-2 border-blue-200">
                <div className="text-sm text-gray-600 mb-1">Upgrade to</div>
                <div className="text-4xl font-bold text-gray-900 mb-1">
                  ${upgradeInfo.price}
                  <span className="text-lg text-gray-600">/month</span>
                </div>
                <div className="text-sm text-blue-600 font-semibold">
                  {upgradeInfo.requiredTier} Plan
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {upgradeInfo.features.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {/* Benefits callout */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Why CRM Suite?
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Never lose a lead:</strong> Track every opportunity from first contact to signed contract</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Close more deals:</strong> Visual pipeline helps you focus on high-value opportunities</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Save time:</strong> Email templates and automation eliminate repetitive work</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  <span><strong>Stay organized:</strong> All client communications and history in one place</span>
                </li>
              </ul>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/pricing"
                className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-center text-lg shadow-lg hover:shadow-xl"
              >
                Upgrade to Pro Now
              </Link>
              <Link
                href="/dashboard"
                className="flex-1 px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-center text-lg"
              >
                Back to Dashboard
              </Link>
            </div>

            {/* Trust signals */}
            <div className="mt-8 pt-8 border-t border-gray-200 text-center">
              <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Cancel anytime
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  No setup fees
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  14-day free trial
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
          <div className="flex items-start gap-4">
            <div className="text-4xl">"</div>
            <div className="flex-1">
              <p className="text-gray-700 italic mb-3">
                The CRM Suite helped us close 30% more deals by keeping our sales pipeline organized.
                The email templates alone save us 5 hours per week. Best investment we've made.
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  MJ
                </div>
                <div>
                  <div className="font-semibold text-gray-900">Mike Johnson</div>
                  <div className="text-sm text-gray-600">Owner, Johnson Construction</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
