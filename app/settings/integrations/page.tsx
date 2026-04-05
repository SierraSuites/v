'use client'

import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { PuzzlePieceIcon } from '@heroicons/react/24/outline'

const INTEGRATIONS = [
  {
    name: 'Procore',
    description: 'Sync projects, RFIs, and submittals with Procore.',
    logo: '🏗️',
    status: 'coming_soon',
  },
  {
    name: 'QuickBooks',
    description: 'Sync expenses and invoices with QuickBooks.',
    logo: '📊',
    status: 'coming_soon',
  },
  {
    name: 'Slack',
    description: 'Get project notifications and alerts in Slack.',
    logo: '💬',
    status: 'coming_soon',
  },
  {
    name: 'Google Drive',
    description: 'Attach and sync documents from Google Drive.',
    logo: '📁',
    status: 'coming_soon',
  },
  {
    name: 'DocuSign',
    description: 'Send change orders and contracts for e-signature.',
    logo: '✍️',
    status: 'coming_soon',
  },
]

export default function IntegrationsPage() {
  const { colors, darkMode } = useThemeColors()

  const cardStyle = {
    backgroundColor: colors.bg,
    border: colors.border,
    borderRadius: '0.5rem',
    padding: '1.25rem',
  }

  return (
    <div className="max-w-2xl mx-auto px-10 py-8" style={{ color: colors.text }}>
      <h1 className="text-xl font-bold mb-1" style={{ color: colors.text }}>Integrations</h1>
      <p className="text-sm mb-6" style={{ color: colors.textMuted }}>
        Connect Sierra Suites with your existing tools and workflows.
      </p>

      <div className="space-y-3">
        {INTEGRATIONS.map(integration => (
          <div key={integration.name} style={cardStyle} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: darkMode ? '#2a2d3d' : '#f2f3f5' }}
              >
                {integration.logo}
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: colors.text }}>{integration.name}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>{integration.description}</div>
              </div>
            </div>
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0"
              style={{
                backgroundColor: darkMode ? '#2a2d3d' : '#f2f3f5',
                color: colors.textMuted,
              }}
            >
              Coming soon
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs mt-6" style={{ color: colors.textMuted }}>
        Interested in a specific integration? Contact support to request it.
      </p>
    </div>
  )
}
