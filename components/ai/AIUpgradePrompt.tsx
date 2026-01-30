'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  getAIUpgradeMessage,
  calculateAIROI,
  formatCurrency,
  formatPercentage,
  formatNumber,
  AI_TESTIMONIALS,
  type SubscriptionTier
} from '@/lib/ai-permissions'

interface AIUpgradePromptProps {
  variant?: 'full' | 'compact'
  currentTier: SubscriptionTier
  targetTier: 'pro' | 'enterprise'
}

export default function AIUpgradePrompt({
  variant = 'full',
  currentTier,
  targetTier
}: AIUpgradePromptProps) {
  const upgradeInfo = getAIUpgradeMessage(currentTier)
  const [annualRevenue, setAnnualRevenue] = useState(2500000)
  const [avgProjectSize, setAvgProjectSize] = useState(125000)
  const [currentMargin, setCurrentMargin] = useState(12)

  const roi = calculateAIROI(annualRevenue, avgProjectSize, currentMargin, targetTier)

  if (variant === 'compact') {
    return (
      <div className="bg-linear-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🤖</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              AI Construction Co-Pilot - {upgradeInfo.requiredTier} Feature
            </h3>
            <p className="text-sm text-gray-700">
              Predict delays, optimize costs, and save {formatCurrency(roi.annualAIValue)}+ per year
            </p>
          </div>
          <Link
            href="/pricing"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold whitespace-nowrap"
          >
            Upgrade to {upgradeInfo.requiredTier}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-blue-50 via-indigo-50 to-white flex items-center justify-center p-4">
      <div className="max-w-7xl w-full">
        {/* Hero Section */}
        <div className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-t-2xl shadow-2xl px-8 py-12 text-white text-center relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-60 h-60 bg-white rounded-full blur-3xl"></div>
          </div>

          <div className="relative z-10">
            <div className="text-7xl mb-4">🤖</div>
            <h1 className="text-5xl font-bold mb-3">{upgradeInfo.title}</h1>
            <p className="text-2xl text-blue-100 mb-6">{upgradeInfo.description}</p>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <div className="text-4xl font-bold">3 weeks</div>
                <div className="text-sm text-blue-100">earlier delay predictions</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <div className="text-4xl font-bold">2 min</div>
                <div className="text-sm text-blue-100">to create perfect estimate</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <div className="text-4xl font-bold">42%</div>
                <div className="text-sm text-blue-100">fewer safety incidents</div>
              </div>
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
                <div className="text-4xl font-bold">18%</div>
                <div className="text-sm text-blue-100">higher bid win rate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-b-2xl shadow-2xl px-8 py-12">
          {/* Pricing */}
          <div className="text-center mb-12">
            <div className="inline-block bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl px-8 py-6 border-2 border-blue-200">
              <div className="text-sm text-gray-600 mb-1">Upgrade to</div>
              <div className="text-6xl font-bold text-gray-900 mb-1">
                ${upgradeInfo.price}
                <span className="text-lg text-gray-600">/month</span>
              </div>
              <div className="text-sm text-blue-600 font-semibold mb-2">
                {upgradeInfo.requiredTier} Plan
              </div>
              {currentTier === 'pro' && (
                <div className="text-xs text-gray-600">
                  Only $61 more than Pro • ROI in 4 days
                </div>
              )}
              {currentTier === 'starter' && (
                <div className="text-xs text-gray-600">
                  First project pays for 50+ years • 14-day free trial
                </div>
              )}
            </div>
          </div>

          {/* Interactive ROI Calculator */}
          <div className="mb-12 bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-8 border-2 border-green-200">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center flex items-center justify-center gap-3">
              <span>💰</span>
              <span>Calculate Your ROI</span>
            </h2>
            <p className="text-center text-gray-600 mb-6">
              See exactly how much the AI Co-Pilot will save your business
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Annual Revenue
                </label>
                <input
                  type="number"
                  value={annualRevenue}
                  onChange={(e) => setAnnualRevenue(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  step="100000"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Average Project Size
                </label>
                <input
                  type="number"
                  value={avgProjectSize}
                  onChange={(e) => setAvgProjectSize(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  step="10000"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Profit Margin (%)
                </label>
                <input
                  type="number"
                  value={currentMargin}
                  onChange={(e) => setCurrentMargin(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  step="1"
                  min="0"
                  max="100"
                />
              </div>
            </div>

            {/* AI Improvements */}
            <div className="bg-white rounded-lg p-6 mb-6 shadow">
              <h3 className="text-lg font-bold text-gray-900 mb-4">AI-Powered Improvements:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚡</div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Reduce estimating errors by {formatPercentage(roi.estimatingErrorReduction, 0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      AI learns from your past projects to eliminate costly bidding mistakes
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-2xl">♻️</div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Cut material waste by {formatPercentage(roi.materialWasteReduction, 0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Smart ordering and optimization reduces over-ordering and waste
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-2xl">⏱️</div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Reduce delays by {formatPercentage(roi.scheduleDelayReduction, 0)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Predict and prevent delays before they impact your schedule
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-2xl">📈</div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      Win {formatPercentage(roi.bidWinRateIncrease, 0)} more bids
                    </div>
                    <div className="text-sm text-gray-600">
                      AI-optimized proposals stand out and win more contracts
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-6 shadow border-l-4 border-blue-500">
                <div className="text-xs text-gray-600 mb-1">Margin Improvement</div>
                <div className="text-3xl font-bold text-blue-600">
                  +{formatPercentage(roi.marginImprovement)}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow border-l-4 border-purple-500">
                <div className="text-xs text-gray-600 mb-1">Additional Revenue</div>
                <div className="text-3xl font-bold text-purple-600">
                  {formatCurrency(roi.additionalRevenue)}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow border-l-4 border-orange-500">
                <div className="text-xs text-gray-600 mb-1">Annual AI Value</div>
                <div className="text-3xl font-bold text-orange-600">
                  {formatCurrency(roi.annualAIValue)}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow border-2 border-green-500">
                <div className="text-xs text-gray-600 mb-1">Return on Investment</div>
                <div className="text-3xl font-bold text-green-600">
                  {formatNumber(roi.roi)}%
                </div>
                <div className="text-xs text-green-700 font-semibold mt-1">
                  Payback in {roi.paybackDays} days
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <div className="text-lg font-bold text-gray-900">
                The AI Co-Pilot delivers {formatCurrency(roi.annualAIValue)} in annual value
              </div>
              <div className="text-sm text-gray-600">
                Subscription cost: {formatCurrency(roi.tierCost)}/year
              </div>
            </div>
          </div>

          {/* Features Grid */}
          {upgradeInfo.features.length > 0 && (
            <div className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
                What You Get with AI Co-Pilot
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upgradeInfo.features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Why Construction Companies Love This */}
          <div className="mb-12 bg-linear-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-lg p-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              The "Magic Moment" - Your First AI Experience
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="text-3xl mb-3">🔮</div>
                <strong className="text-yellow-900 text-lg">Upload One Project</strong>
                <p className="text-gray-700 mt-2">
                  Give the AI one completed project. It analyzes everything - costs, timeline, crew, materials.
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="text-3xl mb-3">💡</div>
                <strong className="text-yellow-900 text-lg">AI Finds Hidden Insights</strong>
                <p className="text-gray-700 mt-2">
                  "You consistently underestimate drywall by 18%" • "Projects in Zone 3 are 23 days longer"
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="text-3xl mb-3">⚡</div>
                <strong className="text-yellow-900 text-lg">Applies to Current Project</strong>
                <p className="text-gray-700 mt-2">
                  "Your current project will be $42,000 over unless you switch suppliers and add 2 crew in week 3"
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="text-3xl mb-3">🎉</div>
                <strong className="text-yellow-900 text-lg">Watch the Magic</strong>
                <p className="text-gray-700 mt-2">
                  The AI saved $28,000 on the first project. It's like having a $200K/year PM for $149/month.
                </p>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Real Results from Real Contractors
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {AI_TESTIMONIALS.slice(0, 2).map((testimonial, index) => (
                <div key={index} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-blue-600">
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">"</div>
                    <div className="flex-1">
                      <p className="text-gray-700 italic mb-3">{testimonial.quote}</p>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {testimonial.author.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{testimonial.author}</div>
                          <div className="text-sm text-gray-600">{testimonial.company}</div>
                          <div className="text-xs text-blue-600 font-semibold">
                            {testimonial.project} • Saved: {testimonial.savings}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <Link
              href="/pricing"
              className="flex-1 px-8 py-5 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-bold text-center text-xl shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              🚀 Unlock AI Co-Pilot - ${upgradeInfo.price}/month
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 px-8 py-5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-center text-xl"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Trust Signals */}
          <div className="pt-8 border-t border-gray-200">
            <div className="flex items-center justify-center gap-8 flex-wrap text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                14-day free trial
              </div>
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
                ROI guarantee
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                AI trained on 4,287+ projects
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
