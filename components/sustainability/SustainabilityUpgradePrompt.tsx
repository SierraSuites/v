'use client'

import Link from 'next/link'
import { getSustainabilityUpgradeMessage, calculateSustainabilityROI, formatCurrency } from '@/lib/sustainability-permissions'
import { useState } from 'react'

interface SustainabilityUpgradePromptProps {
  variant?: 'full' | 'compact'
}

export default function SustainabilityUpgradePrompt({ variant = 'full' }: SustainabilityUpgradePromptProps) {
  const upgradeInfo = getSustainabilityUpgradeMessage()
  const [projectValue, setProjectValue] = useState(1000000)
  const [certLevel, setCertLevel] = useState<'Certified' | 'Silver' | 'Gold' | 'Platinum'>('Gold')

  const roi = calculateSustainabilityROI(projectValue, certLevel)

  if (variant === 'compact') {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🌱</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              Sustainability Hub - Pro Feature
            </h3>
            <p className="text-sm text-gray-700">
              Win green building contracts and save ${formatCurrency(roi.netBenefit10yr.min).replace('$', '')}+ per project
            </p>
          </div>
          <Link
            href="/pricing"
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold whitespace-nowrap"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <div className="max-w-6xl w-full">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-t-2xl shadow-2xl px-8 py-12 text-white text-center">
          <div className="text-6xl mb-4">🌱</div>
          <h1 className="text-4xl font-bold mb-3">{upgradeInfo.title}</h1>
          <p className="text-xl text-green-100 mb-6">{upgradeInfo.description}</p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <div className="text-3xl font-bold">90%</div>
              <div className="text-sm text-green-100">of RFPs require ESG</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <div className="text-3xl font-bold">23%</div>
              <div className="text-sm text-green-100">higher win rate</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <div className="text-3xl font-bold">$42K</div>
              <div className="text-sm text-green-100">avg tax credits</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur">
              <div className="text-3xl font-bold">4-7%</div>
              <div className="text-sm text-green-100">property premium</div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-b-2xl shadow-2xl px-8 py-12">
          {/* Pricing */}
          <div className="text-center mb-12">
            <div className="inline-block bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl px-8 py-6 border-2 border-green-200">
              <div className="text-sm text-gray-600 mb-1">Upgrade to</div>
              <div className="text-5xl font-bold text-gray-900 mb-1">
                ${upgradeInfo.price}
                <span className="text-lg text-gray-600">/month</span>
              </div>
              <div className="text-sm text-green-600 font-semibold mb-2">
                {upgradeInfo.requiredTier} Plan
              </div>
              <div className="text-xs text-gray-600">
                Only $39 more than Starter • Pays for itself on first project
              </div>
            </div>
          </div>

          {/* ROI Calculator */}
          <div className="mb-12 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 border-2 border-blue-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              💰 See Your ROI in Real-Time
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Value
                </label>
                <input
                  type="number"
                  value={projectValue}
                  onChange={(e) => setProjectValue(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  step="100000"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target LEED Level
                </label>
                <select
                  value={certLevel}
                  onChange={(e) => setCertLevel(e.target.value as any)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Certified">Certified (40-49 pts)</option>
                  <option value="Silver">Silver (50-59 pts)</option>
                  <option value="Gold">Gold (60-79 pts)</option>
                  <option value="Platinum">Platinum (80+ pts)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-6 shadow">
                <div className="text-xs text-gray-600 mb-1">Tax Credits</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(roi.taxCredits.min)} - {formatCurrency(roi.taxCredits.max)}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <div className="text-xs text-gray-600 mb-1">Energy Savings (10yr)</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(roi.energySavings10yr.min)} - {formatCurrency(roi.energySavings10yr.max)}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow">
                <div className="text-xs text-gray-600 mb-1">Certification Cost</div>
                <div className="text-2xl font-bold text-gray-600">
                  {formatCurrency(roi.certificationCost.min)} - {formatCurrency(roi.certificationCost.max)}
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 shadow border-2 border-green-500">
                <div className="text-xs text-gray-600 mb-1">Net Benefit (10yr)</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(roi.netBenefit10yr.min)}+
                </div>
                <div className="text-xs text-green-700 font-semibold mt-1">
                  {roi.roiMultiplier}x ROI
                </div>
              </div>
            </div>

            <div className="mt-6 text-center">
              <div className="text-sm text-gray-700">
                <strong>Property Value Increase:</strong> {roi.propertyValueIncrease.min}%-{roi.propertyValueIncrease.max}% premium
                = {formatCurrency(projectValue * (roi.propertyValueIncrease.min / 100))} - {formatCurrency(projectValue * (roi.propertyValueIncrease.max / 100))}
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              What You Get with Sustainability Hub
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          {/* Why Construction Companies Need This */}
          <div className="mb-12 bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Why Construction Companies Choose This
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong className="text-yellow-900">Win More Bids:</strong>
                <p className="text-gray-700">90% of large RFPs now require sustainability reporting. Don't lose contracts because you can't document ESG.</p>
              </div>
              <div>
                <strong className="text-yellow-900">Reduce Costs:</strong>
                <p className="text-gray-700">Track waste to find $10K-$50K in savings per project. Know where money is literally going in the dumpster.</p>
              </div>
              <div>
                <strong className="text-yellow-900">Get Tax Credits:</strong>
                <p className="text-gray-700">Identify $10K-$100K in green building tax credits you're currently leaving on the table.</p>
              </div>
              <div>
                <strong className="text-yellow-900">Regulatory Ready:</strong>
                <p className="text-gray-700">New carbon reporting regulations are coming. Be prepared instead of scrambling at deadline.</p>
              </div>
            </div>
          </div>

          {/* Social Proof */}
          <div className="mb-12 bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
            <div className="flex items-start gap-4">
              <div className="text-5xl">"</div>
              <div className="flex-1">
                <p className="text-gray-700 italic mb-3">
                  "We used Sierra's Sustainability Hub to win a $12M hospital project that required LEED Gold.
                  The carbon tracking and waste management tools helped us document everything perfectly.
                  The tax credits alone paid for our subscription for 15 years."
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    RJ
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Robert Johnson</div>
                    <div className="text-sm text-gray-600">CEO, Summit Construction Group</div>
                    <div className="text-xs text-green-600 font-semibold">LEED Gold Certified • $12M Contract Won</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/pricing"
              className="flex-1 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-center text-lg shadow-lg hover:shadow-xl"
            >
              🚀 Upgrade to Pro - ${upgradeInfo.price}/month
            </Link>
            <Link
              href="/dashboard"
              className="flex-1 px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-center text-lg"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Trust Signals */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center justify-center gap-8 flex-wrap text-sm text-gray-600">
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
                14-day free trial
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
                USGBC approved tools
              </div>
            </div>
          </div>

          {/* Comparison */}
          <div className="mt-12 bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
              Starter vs Pro: What You're Missing
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-600 mb-2">Starter ($49/mo)</div>
                <div className="text-2xl mb-2">📊</div>
                <ul className="text-left space-y-1 text-gray-600">
                  <li>✗ No sustainability tools</li>
                  <li>✗ Manual ESG tracking</li>
                  <li>✗ Missing tax credits</li>
                  <li>✗ Can't bid green projects</li>
                </ul>
              </div>
              <div className="text-center border-2 border-green-500 rounded-lg p-4 bg-green-50">
                <div className="font-semibold text-green-700 mb-2">Pro ($88/mo)</div>
                <div className="text-2xl mb-2">🌱</div>
                <ul className="text-left space-y-1 text-gray-700">
                  <li className="font-semibold">✓ Full Sustainability Hub</li>
                  <li className="font-semibold">✓ Auto ESG reports</li>
                  <li className="font-semibold">✓ Tax credit finder</li>
                  <li className="font-semibold">✓ Win green contracts</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
