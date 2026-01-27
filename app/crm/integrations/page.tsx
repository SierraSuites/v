'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  category: string
  tier: 'pro' | 'enterprise'
  status: 'available' | 'connected' | 'coming_soon'
  features: string[]
}

export default function IntegrationsPage() {
  const [integrations] = useState<Integration[]>([
    // Email Integrations
    {
      id: 'gmail',
      name: 'Gmail',
      description: 'Send emails directly from Sierra Suites using your Gmail account',
      icon: '📧',
      category: 'email',
      tier: 'pro',
      status: 'available',
      features: [
        'Send emails from CRM',
        'Track email opens',
        'Sync email templates',
        'Two-way email sync'
      ]
    },
    {
      id: 'outlook',
      name: 'Outlook',
      description: 'Connect your Microsoft Outlook account for seamless email integration',
      icon: '📇',
      category: 'email',
      tier: 'pro',
      status: 'available',
      features: [
        'Send emails from CRM',
        'Calendar integration',
        'Contact sync',
        'Email tracking'
      ]
    },
    {
      id: 'smtp',
      name: 'Custom SMTP',
      description: 'Use your own SMTP server for email delivery',
      icon: '⚙️',
      category: 'email',
      tier: 'pro',
      status: 'available',
      features: [
        'Custom email server',
        'Full control',
        'Any email provider',
        'Bulk email support'
      ]
    },
    // Accounting Integrations
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Sync contacts, invoices, and payments with QuickBooks Online',
      icon: '💼',
      category: 'accounting',
      tier: 'pro',
      status: 'available',
      features: [
        'Two-way contact sync',
        'Invoice integration',
        'Payment tracking',
        'Revenue reporting'
      ]
    },
    {
      id: 'xero',
      name: 'Xero',
      description: 'Connect to Xero for accounting and invoice management',
      icon: '📊',
      category: 'accounting',
      tier: 'enterprise',
      status: 'coming_soon',
      features: [
        'Invoice sync',
        'Expense tracking',
        'Financial reports',
        'Bank reconciliation'
      ]
    },
    // CRM Integrations
    {
      id: 'google_contacts',
      name: 'Google Contacts',
      description: 'Import and sync contacts from Google',
      icon: '👥',
      category: 'crm',
      tier: 'pro',
      status: 'available',
      features: [
        'Import contacts',
        'Two-way sync',
        'Contact deduplication',
        'Group management'
      ]
    },
    {
      id: 'microsoft_contacts',
      name: 'Microsoft People',
      description: 'Sync contacts with Microsoft 365',
      icon: '📇',
      category: 'crm',
      tier: 'pro',
      status: 'available',
      features: [
        'Contact import',
        'Automatic updates',
        'Profile pictures',
        'Contact groups'
      ]
    },
    // Productivity
    {
      id: 'google_calendar',
      name: 'Google Calendar',
      description: 'Sync CRM activities with Google Calendar',
      icon: '📅',
      category: 'productivity',
      tier: 'enterprise',
      status: 'available',
      features: [
        'Activity sync',
        'Meeting scheduling',
        'Reminders',
        'Availability tracking'
      ]
    },
    {
      id: 'microsoft_calendar',
      name: 'Outlook Calendar',
      description: 'Integrate with Microsoft Outlook Calendar',
      icon: '📆',
      category: 'productivity',
      tier: 'enterprise',
      status: 'available',
      features: [
        'Two-way sync',
        'Meeting invites',
        'Busy/free status',
        'Event reminders'
      ]
    },
    // Data Tools
    {
      id: 'excel',
      name: 'Excel Import/Export',
      description: 'Import and export data via Excel/CSV files',
      icon: '📊',
      category: 'data',
      tier: 'pro',
      status: 'connected',
      features: [
        'Bulk import contacts',
        'Export to Excel',
        'CSV support',
        'Data templates'
      ]
    },
    {
      id: 'google_sheets',
      name: 'Google Sheets',
      description: 'Live sync with Google Sheets for data analysis',
      icon: '📈',
      category: 'data',
      tier: 'enterprise',
      status: 'coming_soon',
      features: [
        'Real-time sync',
        'Custom reports',
        'Automated exports',
        'Collaborative editing'
      ]
    },
    // Communication
    {
      id: 'twilio',
      name: 'Twilio SMS',
      description: 'Send SMS messages to contacts',
      icon: '💬',
      category: 'communication',
      tier: 'enterprise',
      status: 'coming_soon',
      features: [
        'SMS campaigns',
        'Two-way messaging',
        'Message templates',
        'Delivery tracking'
      ]
    },
    {
      id: 'zapier',
      name: 'Zapier',
      description: 'Connect to 5,000+ apps via Zapier',
      icon: '⚡',
      category: 'automation',
      tier: 'enterprise',
      status: 'available',
      features: [
        'Custom workflows',
        'Multi-app automation',
        'Triggers and actions',
        'No-code integration'
      ]
    }
  ])

  const categories = [
    { id: 'all', name: 'All Integrations', icon: '🔌' },
    { id: 'email', name: 'Email', icon: '📧' },
    { id: 'accounting', name: 'Accounting', icon: '💼' },
    { id: 'crm', name: 'CRM', icon: '👥' },
    { id: 'productivity', name: 'Productivity', icon: '📅' },
    { id: 'data', name: 'Data Tools', icon: '📊' },
    { id: 'communication', name: 'Communication', icon: '💬' },
    { id: 'automation', name: 'Automation', icon: '⚡' }
  ]

  const [selectedCategory, setSelectedCategory] = useState('all')

  const filteredIntegrations = selectedCategory === 'all'
    ? integrations
    : integrations.filter(i => i.category === selectedCategory)

  const getStatusBadge = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return (
          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Connected
          </span>
        )
      case 'available':
        return (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            Available
          </span>
        )
      case 'coming_soon':
        return (
          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
            Coming Soon
          </span>
        )
    }
  }

  const getTierBadge = (tier: Integration['tier']) => {
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${
        tier === 'enterprise'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-blue-100 text-blue-700'
      }`}>
        {tier.toUpperCase()}
      </span>
    )
  }

  const stats = {
    total: integrations.length,
    connected: integrations.filter(i => i.status === 'connected').length,
    available: integrations.filter(i => i.status === 'available').length,
    coming_soon: integrations.filter(i => i.status === 'coming_soon').length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href="/crm"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
                  <p className="text-gray-600 mt-1">Connect Sierra Suites with your favorite tools</p>
                </div>
              </div>
            </div>

            <Link
              href="/pricing"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View Plans
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Integrations</div>
              <div className="text-2xl">🔌</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500 mt-1">Available to you</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Connected</div>
              <div className="text-2xl">✅</div>
            </div>
            <div className="text-3xl font-bold text-green-600">{stats.connected}</div>
            <div className="text-sm text-gray-500 mt-1">Active integrations</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Available</div>
              <div className="text-2xl">🚀</div>
            </div>
            <div className="text-3xl font-bold text-blue-600">{stats.available}</div>
            <div className="text-sm text-gray-500 mt-1">Ready to connect</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Coming Soon</div>
              <div className="text-2xl">🔜</div>
            </div>
            <div className="text-3xl font-bold text-gray-600">{stats.coming_soon}</div>
            <div className="text-sm text-gray-500 mt-1">In development</div>
          </div>
        </div>

        {/* Important Notice */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-3xl">💡</div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Integrations are Optional</h3>
              <p className="text-sm text-gray-700 mb-3">
                Sierra Suites works perfectly on its own. Every integration is <strong>completely optional</strong> with a native fallback.
                Use our built-in features, or connect your existing tools - the choice is yours!
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                <span className="px-2 py-1 bg-white rounded">✓ No forced integrations</span>
                <span className="px-2 py-1 bg-white rounded">✓ Native fallbacks included</span>
                <span className="px-2 py-1 bg-white rounded">✓ Connect only what you need</span>
                <span className="px-2 py-1 bg-white rounded">✓ Full control</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.icon} {category.name}
                {category.id !== 'all' && (
                  <span className="ml-2 text-xs opacity-75">
                    ({integrations.filter(i => i.category === category.id).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredIntegrations.map(integration => (
            <div
              key={integration.id}
              className="bg-white rounded-lg shadow border-2 border-gray-200 hover:border-blue-400 transition-all overflow-hidden"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{integration.icon}</div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {getTierBadge(integration.tier)}
                        {getStatusBadge(integration.status)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-4">
                  {integration.description}
                </p>

                {/* Features */}
                <div className="mb-4">
                  <div className="text-xs font-medium text-gray-700 mb-2">Features:</div>
                  <ul className="space-y-1">
                    {integration.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs text-gray-600">
                        <svg className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Button */}
                <div className="pt-4 border-t border-gray-200">
                  {integration.status === 'connected' ? (
                    <div className="flex gap-2">
                      <button className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                        Configure
                      </button>
                      <button className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium">
                        Disconnect
                      </button>
                    </div>
                  ) : integration.status === 'available' ? (
                    <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                      Connect {integration.name}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed text-sm font-medium"
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Need More? */}
        <div className="mt-12 bg-white rounded-lg shadow p-8 text-center">
          <div className="text-4xl mb-4">💬</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Need a Specific Integration?</h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            We're always adding new integrations based on customer feedback. Let us know which tools you use,
            and we'll prioritize them in our roadmap.
          </p>
          <button className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
            Request an Integration
          </button>
        </div>
      </div>
    </div>
  )
}
