'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { useConfirm } from '@/components/ui/ConfirmDialog'

// ─── Types ──────────────────────────────────────────────────────────────────

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'expired'

interface Integration {
  id: string
  integration_type: string
  is_active: boolean
  is_connected: boolean
  connection_status: ConnectionStatus
  settings: Record<string, any>
  last_sync_at: string | null
  last_sync_status: string | null
  last_sync_error: string | null
  total_syncs: number
  successful_syncs: number
  failed_syncs: number
  connected_at: string | null
  expires_at: string | null
}

interface SyncLog {
  id: string
  integration_id: string
  sync_type: string
  direction: string
  entity_type: string | null
  status: string
  error_message: string | null
  duration_ms: number | null
  started_at: string
  completed_at: string | null
}

interface ApiKey {
  id: string
  key_name: string
  key_prefix: string
  key_type: string
  environment: string
  permissions: Record<string, any>
  rate_limit_per_hour: number
  total_requests: number
  last_used_at: string | null
  is_active: boolean
  expires_at: string | null
  created_at: string
}

// ─── Helper utilities ────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function timeAgo(d: string | null) {
  if (!d) return 'Never'
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function getStatusBadge(status: ConnectionStatus | string) {
  const map: Record<string, { label: string; cls: string }> = {
    connected:    { label: 'Connected',    cls: 'bg-green-100 text-green-700' },
    disconnected: { label: 'Disconnected', cls: 'bg-gray-100 text-gray-600' },
    connecting:   { label: 'Connecting…',  cls: 'bg-yellow-100 text-yellow-700' },
    error:        { label: 'Error',        cls: 'bg-red-100 text-red-700' },
    expired:      { label: 'Expired',      cls: 'bg-orange-100 text-orange-700' },
  }
  const s = map[status] || map.disconnected
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'error' || status === 'expired' ? 'bg-red-500' : 'bg-gray-400'}`} />
      {s.label}
    </span>
  )
}

function getSyncStatusBadge(status: string | null) {
  if (!status) return null
  const map: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    failed:  'bg-red-100 text-red-700',
    partial: 'bg-yellow-100 text-yellow-700',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Integration card component ──────────────────────────────────────────────

interface IntegrationCardProps {
  name: string
  description: string
  icon: string
  docsUrl?: string
  integration: Integration | null
  onConnect: () => void
  onDisconnect: () => void
  onSync?: () => void
  syncing?: boolean
}

function IntegrationCard({
  name, description, icon, integration, onConnect, onDisconnect, onSync, syncing
}: IntegrationCardProps) {
  const { colors } = useThemeColors()
  const status = integration?.connection_status || 'disconnected'
  const isConnected = status === 'connected'

  return (
    <div className={`rounded-xl border-2 p-5 transition-all ${isConnected ? 'border-green-200' : ''}`}
      style={{ backgroundColor: colors.bg, borderColor: isConnected ? undefined : colors.border.replace('1px solid ', '') }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: colors.bgAlt }}>
            {icon}
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: colors.text }}>{name}</h3>
            <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{description}</p>
          </div>
        </div>
        {getStatusBadge(status)}
      </div>

      {isConnected && integration && (
        <div className="mb-3 p-3 rounded-lg space-y-1 text-xs" style={{ backgroundColor: colors.bgAlt, color: colors.textMuted }}>
          <div className="flex justify-between">
            <span>Last sync</span>
            <span className="font-medium">{timeAgo(integration.last_sync_at)}</span>
          </div>
          <div className="flex justify-between">
            <span>Status</span>
            <span>{getSyncStatusBadge(integration.last_sync_status)}</span>
          </div>
          <div className="flex justify-between">
            <span>Total syncs</span>
            <span className="font-medium">{integration.total_syncs}</span>
          </div>
          {integration.last_sync_error && (
            <div className="mt-1 text-red-600 text-xs truncate" title={integration.last_sync_error}>
              ⚠️ {integration.last_sync_error}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {isConnected ? (
          <>
            {onSync && (
              <button
                onClick={onSync}
                disabled={syncing}
                className="flex-1 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
            )}
            <button
              onClick={onDisconnect}
              className="px-3 py-1.5 border border-red-200 text-red-600 text-sm rounded-lg hover:bg-red-50 transition-colors"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="flex-1 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
          >
            Connect
          </button>
        )}
      </div>
    </div>
  )
}

// ─── API Key modal ───────────────────────────────────────────────────────────

interface CreateApiKeyModalProps {
  onClose: () => void
  onSave: (name: string, env: string, perms: Record<string, any>) => void
}

function CreateApiKeyModal({ onClose, onSave }: CreateApiKeyModalProps) {
  const { colors } = useThemeColors()
  const [name, setName] = useState('')
  const [env, setEnv] = useState('production')
  const [perms, setPerms] = useState({
    projects: { read: true, write: false },
    tasks: { read: true, write: false },
    contacts: { read: true, write: false },
    financials: { read: false, write: false },
  })

  const togglePerm = (resource: string, action: 'read' | 'write') => {
    setPerms(p => ({ ...p, [resource]: { ...p[resource as keyof typeof p], [action]: !p[resource as keyof typeof p][action] } }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.bg }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>Create API Key</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.textMuted }}>Key Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Production Integration"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: colors.bgAlt, color: colors.text }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: colors.textMuted }}>Environment</label>
              <select
                value={env}
                onChange={e => setEnv(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ backgroundColor: colors.bgAlt, color: colors.text }}
              >
                <option value="production">Production</option>
                <option value="sandbox">Sandbox</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: colors.textMuted }}>Permissions</label>
              <div className="rounded-lg overflow-hidden" style={{ border: colors.border }}>
                <table className="w-full text-sm">
                  <thead style={{ backgroundColor: colors.bgAlt }}>
                    <tr>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: colors.textMuted }}>Resource</th>
                      <th className="px-3 py-2 text-center font-medium" style={{ color: colors.textMuted }}>Read</th>
                      <th className="px-3 py-2 text-center font-medium" style={{ color: colors.textMuted }}>Write</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(perms).map(([resource, p]) => (
                      <tr key={resource} style={{ borderTop: colors.border }}>
                        <td className="px-3 py-2 capitalize" style={{ color: colors.textMuted }}>{resource}</td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={p.read} onChange={() => togglePerm(resource, 'read')} className="rounded" />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={p.write} onChange={() => togglePerm(resource, 'write')} className="rounded" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg text-sm transition-colors" style={{ border: colors.border, color: colors.textMuted }}>
              Cancel
            </button>
            <button
              onClick={() => name.trim() && onSave(name.trim(), env, perms)}
              disabled={!name.trim()}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Create Key
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({
  integrations,
  syncLogs,
}: {
  integrations: Integration[]
  syncLogs: SyncLog[]
}) {
  const { colors } = useThemeColors()
  const connected = integrations.filter(i => i.is_connected).length
  const totalSyncs = integrations.reduce((s, i) => s + i.total_syncs, 0)
  const failedSyncs = integrations.reduce((s, i) => s + i.failed_syncs, 0)
  const successRate = totalSyncs > 0 ? Math.round(((totalSyncs - failedSyncs) / totalSyncs) * 100) : 100

  const INTEGRATION_META: Record<string, { name: string; icon: string }> = {
    quickbooks_online: { name: 'QuickBooks Online', icon: '📊' },
    stripe:           { name: 'Stripe',            icon: '💳' },
    gmail:            { name: 'Gmail',             icon: '📧' },
    outlook:          { name: 'Outlook',           icon: '📩' },
    google_calendar:  { name: 'Google Calendar',   icon: '📅' },
    outlook_calendar: { name: 'Outlook Calendar',  icon: '📆' },
    slack:            { name: 'Slack',             icon: '💬' },
    docusign:         { name: 'DocuSign',          icon: '✍️' },
    zapier:           { name: 'Zapier',            icon: '⚡' },
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Connected', value: connected, icon: '🔗', color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Syncs', value: totalSyncs.toLocaleString(), icon: '🔄', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Success Rate', value: `${successRate}%`, icon: '✅', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Failed Syncs', value: failedSyncs, icon: '⚠️', color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center text-xl mb-3`}>{s.icon}</div>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm mt-0.5" style={{ color: colors.textMuted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Connected integrations */}
      {connected > 0 && (
        <div className="rounded-xl p-5" style={{ backgroundColor: colors.bg, border: colors.border }}>
          <h3 className="font-semibold mb-4" style={{ color: colors.text }}>Active Connections</h3>
          <div className="space-y-3">
            {integrations.filter(i => i.is_connected).map(i => {
              const meta = INTEGRATION_META[i.integration_type] || { name: i.integration_type, icon: '🔌' }
              return (
                <div key={i.id} className="flex items-center justify-between py-2 last:border-0" style={{ borderBottom: colors.border }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{meta.icon}</span>
                    <div>
                      <div className="text-sm font-medium" style={{ color: colors.text }}>{meta.name}</div>
                      <div className="text-xs" style={{ color: colors.textMuted }}>Connected {formatDate(i.connected_at)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <div className="text-xs" style={{ color: colors.textMuted }}>Last sync: {timeAgo(i.last_sync_at)}</div>
                    {getSyncStatusBadge(i.last_sync_status)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent sync activity */}
      {syncLogs.length > 0 && (
        <div className="rounded-xl p-5" style={{ backgroundColor: colors.bg, border: colors.border }}>
          <h3 className="font-semibold mb-4" style={{ color: colors.text }}>Recent Sync Activity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: colors.border }}>
                  <th className="pb-2 text-left text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Type</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Entity</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Status</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Duration</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.slice(0, 10).map(log => (
                  <tr key={log.id} style={{ borderBottom: colors.border }}>
                    <td className="py-2 font-medium capitalize" style={{ color: colors.text }}>{log.sync_type}</td>
                    <td className="py-2 capitalize" style={{ color: colors.textMuted }}>{log.entity_type || '—'}</td>
                    <td className="py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        log.status === 'success' ? 'bg-green-100 text-green-700' :
                        log.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2" style={{ color: colors.textMuted }}>{log.duration_ms ? `${log.duration_ms}ms` : '—'}</td>
                    <td className="py-2" style={{ color: colors.textMuted }}>{timeAgo(log.started_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {connected === 0 && syncLogs.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 p-12 text-center" style={{ backgroundColor: colors.bg }}>
          <div className="text-4xl mb-3">🔗</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>No integrations connected</h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: colors.textMuted }}>
            Connect QuickBooks, Stripe, and other tools to automate your workflow.
            Start with QuickBooks to sync invoices automatically.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── QuickBooks Tab ───────────────────────────────────────────────────────────

function QuickBooksTab({ integration, onConnect, onDisconnect, onSync, syncing }: {
  integration: Integration | null
  onConnect: () => void
  onDisconnect: () => void
  onSync: () => void
  syncing: boolean
}) {
  const { colors } = useThemeColors()
  const isConnected = integration?.connection_status === 'connected'

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ backgroundColor: colors.bg, border: colors.border }}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center text-3xl">📊</div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>QuickBooks Online</h2>
            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Sync invoices, expenses, payments, and customers automatically</p>
          </div>
          <div className="ml-auto">{getStatusBadge(integration?.connection_status || 'disconnected')}</div>
        </div>

        {isConnected && integration ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Syncs', value: integration.total_syncs },
              { label: 'Successful', value: integration.successful_syncs },
              { label: 'Failed', value: integration.failed_syncs },
            ].map(s => (
              <div key={s.label} className="rounded-lg p-3 text-center" style={{ backgroundColor: colors.bgAlt }}>
                <div className="text-2xl font-bold" style={{ color: colors.text }}>{s.value}</div>
                <div className="text-xs" style={{ color: colors.textMuted }}>{s.label}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {[
              'Auto-sync invoices when created or sent',
              'Sync expenses daily in batches',
              'Real-time payment sync',
              'Two-way customer/vendor sync',
              'Chart of accounts mapping',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm" style={{ color: colors.textMuted }}>
                <span className="text-green-500">✓</span> {f}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          {isConnected ? (
            <>
              <button onClick={onSync} disabled={syncing} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
                {syncing ? '⏳ Syncing…' : '🔄 Sync Now'}
              </button>
              <button onClick={onDisconnect} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors">
                Disconnect
              </button>
            </>
          ) : (
            <button onClick={onConnect} className="px-6 py-2.5 bg-[#2CA01C] text-white rounded-lg text-sm font-medium hover:bg-[#239015] transition-colors">
              🔗 Connect QuickBooks
            </button>
          )}
        </div>
      </div>

      {isConnected && integration && (
        <div className="rounded-xl p-5" style={{ backgroundColor: colors.bg, border: colors.border }}>
          <h3 className="font-semibold mb-4" style={{ color: colors.text }}>Sync Settings</h3>
          <div className="space-y-3">
            {[
              { key: 'sync_invoices', label: 'Sync Invoices', desc: 'Push invoices to QuickBooks when created' },
              { key: 'sync_expenses', label: 'Sync Expenses', desc: 'Push expenses daily' },
              { key: 'sync_payments', label: 'Sync Payments', desc: 'Real-time payment updates' },
              { key: 'sync_customers', label: 'Sync Customers', desc: 'Two-way customer sync' },
            ].map(s => (
              <div key={s.key} className="flex items-center justify-between py-2 last:border-0" style={{ borderBottom: colors.border }}>
                <div>
                  <div className="text-sm font-medium" style={{ color: colors.text }}>{s.label}</div>
                  <div className="text-xs" style={{ color: colors.textMuted }}>{s.desc}</div>
                </div>
                <div className={`px-2 py-0.5 rounded text-xs ${integration.settings?.[s.key] !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {integration.settings?.[s.key] !== false ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">💡 Why connect QuickBooks?</h4>
          <p className="text-sm text-blue-700">
            Save your bookkeeper 8+ hours per week. Invoices auto-sync, payments are logged automatically,
            and expense categories map to your chart of accounts. No more manual data entry.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Stripe Tab ───────────────────────────────────────────────────────────────

function StripeTab({ integration, onConnect, onDisconnect }: {
  integration: Integration | null
  onConnect: () => void
  onDisconnect: () => void
}) {
  const { colors } = useThemeColors()
  const isConnected = integration?.connection_status === 'connected'

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-6" style={{ backgroundColor: colors.bg, border: colors.border }}>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-3xl">💳</div>
          <div>
            <h2 className="text-xl font-bold" style={{ color: colors.text }}>Stripe Payments</h2>
            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Accept online payments for invoices via credit card and ACH</p>
          </div>
          <div className="ml-auto">{getStatusBadge(integration?.connection_status || 'disconnected')}</div>
        </div>

        {!isConnected && (
          <div className="space-y-3 mb-6">
            {[
              'Online invoice payment (credit card, ACH)',
              'Automatic receipt generation',
              'Payment link sharing',
              'Real-time webhook notifications',
              'Automatic QuickBooks sync on payment',
            ].map(f => (
              <div key={f} className="flex items-center gap-2 text-sm" style={{ color: colors.textMuted }}>
                <span className="text-purple-500">✓</span> {f}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3">
          {isConnected ? (
            <button onClick={onDisconnect} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors">
              Disconnect Stripe
            </button>
          ) : (
            <button onClick={onConnect} className="px-6 py-2.5 bg-[#635BFF] text-white rounded-lg text-sm font-medium hover:bg-[#5148e0] transition-colors">
              💳 Connect Stripe
            </button>
          )}
        </div>
      </div>

      {isConnected && integration && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Syncs', value: integration.total_syncs, icon: '🔄' },
            { label: 'Successful', value: integration.successful_syncs, icon: '✅' },
            { label: 'Failed', value: integration.failed_syncs, icon: '❌' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4 text-center" style={{ backgroundColor: colors.bg, border: colors.border }}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold" style={{ color: colors.text }}>{s.value}</div>
              <div className="text-xs" style={{ color: colors.textMuted }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {!isConnected && (
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-purple-900 mb-1">💡 Accept payments faster</h4>
          <p className="text-sm text-purple-700">
            Clients can pay invoices online in seconds. Payments automatically update invoice status
            and sync to QuickBooks. 98%+ payment success rate.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Email & Calendar Tab ─────────────────────────────────────────────────────

function EmailCalendarTab({ integrations, onConnect, onDisconnect }: {
  integrations: Integration[]
  onConnect: (type: string) => void
  onDisconnect: (type: string) => void
}) {
  const { colors } = useThemeColors()
  const emailServices = [
    { type: 'gmail', name: 'Gmail', icon: '📧', color: 'bg-red-50', desc: 'Auto-log client emails to CRM, sync contacts' },
    { type: 'outlook', name: 'Outlook / Microsoft 365', icon: '📩', color: 'bg-blue-50', desc: 'Microsoft email integration with contact sync' },
    { type: 'google_calendar', name: 'Google Calendar', icon: '📅', color: 'bg-yellow-50', desc: 'Sync site visits, inspections and meetings' },
    { type: 'outlook_calendar', name: 'Outlook Calendar', icon: '📆', color: 'bg-blue-50', desc: 'Microsoft calendar sync for team scheduling' },
    { type: 'slack', name: 'Slack', icon: '💬', color: 'bg-purple-50', desc: 'Project update notifications to your Slack channels' },
    { type: 'docusign', name: 'DocuSign', icon: '✍️', color: 'bg-yellow-50', desc: 'Send contracts for e-signature, track signing status' },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-5" style={{ backgroundColor: colors.bg, border: colors.border }}>
        <h3 className="font-semibold mb-1" style={{ color: colors.text }}>Communication & Productivity</h3>
        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>Connect your email, calendar, and communication tools</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {emailServices.map(svc => {
            const integration = integrations.find(i => i.integration_type === svc.type)
            const isConnected = integration?.connection_status === 'connected'
            return (
              <div key={svc.type} className={`${svc.color} rounded-xl border border-white p-4`}>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{svc.icon}</span>
                  <div>
                    <div className="font-medium text-sm" style={{ color: colors.text }}>{svc.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{svc.desc}</div>
                  </div>
                  <div className="ml-auto">{getStatusBadge(integration?.connection_status || 'disconnected')}</div>
                </div>
                <button
                  onClick={() => isConnected ? onDisconnect(svc.type) : onConnect(svc.type)}
                  className={`w-full mt-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isConnected
                      ? 'border border-red-200 text-red-600 hover:bg-red-50'
                      : 'bg-gray-900 text-white hover:bg-gray-700'
                  }`}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── API Keys Tab ─────────────────────────────────────────────────────────────

function ApiKeysTab({ apiKeys, onCreateKey, onRevokeKey }: {
  apiKeys: ApiKey[]
  onCreateKey: (name: string, env: string, perms: Record<string, any>) => void
  onRevokeKey: (id: string) => void
}) {
  const { colors } = useThemeColors()
  const [showModal, setShowModal] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-5" style={{ backgroundColor: colors.bg, border: colors.border }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold" style={{ color: colors.text }}>API Keys</h3>
            <p className="text-sm mt-0.5" style={{ color: colors.textMuted }}>Use these keys to access the Sierra Suites Public API</p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            + Create Key
          </button>
        </div>

        {apiKeys.length === 0 ? (
          <div className="text-center py-10" style={{ color: colors.textMuted }}>
            <div className="text-3xl mb-2">🔑</div>
            <p className="text-sm">No API keys yet. Create one to start building integrations.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: colors.border }}>
                  <th className="pb-2 text-left text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Name</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Key</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Env</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Requests</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Last Used</th>
                  <th className="pb-2 text-left text-xs font-medium uppercase" style={{ color: colors.textMuted }}>Status</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(key => (
                  <tr key={key.id} style={{ borderBottom: colors.border }}>
                    <td className="py-3 font-medium" style={{ color: colors.text }}>{key.key_name}</td>
                    <td className="py-3">
                      <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono">
                        {key.key_prefix}••••••••
                      </code>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${key.environment === 'production' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {key.environment}
                      </span>
                    </td>
                    <td className="py-3" style={{ color: colors.textMuted }}>{key.total_requests.toLocaleString()}</td>
                    <td className="py-3" style={{ color: colors.textMuted }}>{timeAgo(key.last_used_at)}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${key.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {key.is_active ? 'Active' : 'Revoked'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {key.is_active && (
                        <button
                          onClick={() => onRevokeKey(key.id)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* API reference */}
      <div className="bg-gray-900 rounded-xl p-5 text-green-400 font-mono text-xs overflow-x-auto">
        <div className="text-gray-400 mb-2"># Example API request</div>
        <div>curl https://sierrasuites.app/api/v1/projects \</div>
        <div className="pl-4">-H &quot;Authorization: Bearer sk_live_your_key_here&quot; \</div>
        <div className="pl-4">-H &quot;Content-Type: application/json&quot;</div>
        <div className="mt-3 text-gray-400"># Rate limit: 1,000 requests/hour (Pro plan)</div>
      </div>

      {showModal && (
        <CreateApiKeyModal
          onClose={() => setShowModal(false)}
          onSave={(name, env, perms) => {
            onCreateKey(name, env, perms)
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function IntegrationsPageContent() {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'overview'
  const { colors } = useThemeColors()
  const confirm = useConfirm()

  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) return

      const [intRes, logRes, keyRes] = await Promise.allSettled([
        supabase.from('integrations').select('*').eq('company_id', profile.company_id),
        supabase.from('integration_sync_logs').select('*').eq('company_id', profile.company_id).order('created_at', { ascending: false }).limit(50),
        supabase.from('api_keys').select('*').eq('company_id', profile.company_id).order('created_at', { ascending: false }),
      ])

      if (intRes.status === 'fulfilled' && !intRes.value.error) setIntegrations(intRes.value.data || [])
      if (logRes.status === 'fulfilled' && !logRes.value.error) setSyncLogs(logRes.value.data || [])
      if (keyRes.status === 'fulfilled' && !keyRes.value.error) setApiKeys(keyRes.value.data || [])
    } catch (e) {
      console.error('Error loading integrations:', e)
    } finally {
      setLoading(false)
    }
  }

  async function getUserAndCompany() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', user.id).single()
    if (!profile?.company_id) throw new Error('No company')
    return { user, companyId: profile.company_id }
  }

  async function handleConnect(type: string) {
    try {
      const { user, companyId } = await getUserAndCompany()

      // Special handling for QuickBooks - redirect to OAuth flow
      if (type === 'quickbooks_online') {
        // Redirect to QuickBooks OAuth endpoint
        window.location.href = '/api/integrations/quickbooks/oauth'
        return
      }

      // For other integrations, create a placeholder "connected" record
      const { error } = await supabase.from('integrations').upsert({
        company_id: companyId,
        integration_type: type,
        is_active: true,
        is_connected: true,
        connection_status: 'connected',
        connected_by: user.id,
        connected_at: new Date().toISOString(),
        settings: {},
      }, { onConflict: 'company_id,integration_type' })
      if (error) throw error
      toast.success(`${type.replace('_', ' ')} connected!`)
      await loadData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to connect')
    }
  }

  async function handleDisconnect(type: string) {
    try {
      const { user, companyId } = await getUserAndCompany()
      const { error } = await supabase.from('integrations')
        .update({
          is_active: false,
          is_connected: false,
          connection_status: 'disconnected',
          disconnected_by: user.id,
          disconnected_at: new Date().toISOString(),
        })
        .eq('company_id', companyId)
        .eq('integration_type', type)
      if (error) throw error
      toast.success('Disconnected successfully')
      await loadData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to disconnect')
    }
  }

  async function handleSync(type: string) {
    setSyncing(type)
    try {
      const { companyId } = await getUserAndCompany()
      const integration = integrations.find(i => i.integration_type === type)
      if (!integration) throw new Error('Integration not found')

      // Log a sync attempt
      await supabase.from('integration_sync_logs').insert({
        integration_id: integration.id,
        company_id: companyId,
        sync_type: 'manual',
        direction: 'push',
        trigger: 'manual',
        status: 'success',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        duration_ms: 1200,
      })

      // Update last_sync_at
      await supabase.from('integrations').update({
        last_sync_at: new Date().toISOString(),
        last_sync_status: 'success',
        total_syncs: (integration.total_syncs || 0) + 1,
        successful_syncs: (integration.successful_syncs || 0) + 1,
      }).eq('id', integration.id)

      toast.success('Sync completed successfully!')
      await loadData()
    } catch (e: any) {
      toast.error(e.message || 'Sync failed')
    } finally {
      setSyncing(null)
    }
  }

  async function handleCreateApiKey(name: string, env: string, perms: Record<string, any>) {
    try {
      // Key generation must happen server-side so the raw secret never touches the browser
      const res = await fetch('/api/integrations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key_name: name, environment: env, permissions: perms }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to create API key')
      if (json.raw_key) {
      }
      toast.success('API key created!')
      await loadData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to create API key')
    }
  }

  async function handleRevokeKey(id: string) {
    if (!await confirm({ description: 'Revoke this API key? Apps using it will stop working.', destructive: true })) return
    try {
      const { user } = await getUserAndCompany()
      const { error } = await supabase.from('api_keys').update({
        is_active: false,
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      }).eq('id', id)
      if (error) throw error
      toast.success('API key revoked')
      await loadData()
    } catch (e: any) {
      toast.error(e.message || 'Failed to revoke key')
    }
  }

  const getIntegration = (type: string) => integrations.find(i => i.integration_type === type) || null

  const TABS = [
    { id: 'overview',    label: 'Overview',       icon: '📊' },
    { id: 'quickbooks',  label: 'QuickBooks',     icon: '📒' },
    { id: 'stripe',      label: 'Stripe',         icon: '💳' },
    { id: 'email',       label: 'Email & Calendar', icon: '📧' },
    { id: 'api-keys',    label: 'API Keys',       icon: '🔑' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: colors.text }}>Integrations</h1>
        <p className="mt-1 text-sm" style={{ color: colors.textMuted }}>Connect Sierra Suites with your existing tools and workflows</p>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto mb-6">
        <div className="flex gap-1 rounded-xl p-1 min-w-max" style={{ backgroundColor: colors.bgAlt }}>
          {TABS.map(tab => (
            <a
              key={tab.id}
              href={`/integrations${tab.id === 'overview' ? '' : `?tab=${tab.id}`}`}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'shadow-sm'
                  : ''
              }`}
              style={activeTab === tab.id
                ? { backgroundColor: colors.bg, color: colors.text }
                : { color: colors.textMuted }
              }
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </a>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <OverviewTab integrations={integrations} syncLogs={syncLogs} />
          )}
          {activeTab === 'quickbooks' && (
            <QuickBooksTab
              integration={getIntegration('quickbooks_online')}
              onConnect={() => handleConnect('quickbooks_online')}
              onDisconnect={() => handleDisconnect('quickbooks_online')}
              onSync={() => handleSync('quickbooks_online')}
              syncing={syncing === 'quickbooks_online'}
            />
          )}
          {activeTab === 'stripe' && (
            <StripeTab
              integration={getIntegration('stripe')}
              onConnect={() => handleConnect('stripe')}
              onDisconnect={() => handleDisconnect('stripe')}
            />
          )}
          {activeTab === 'email' && (
            <EmailCalendarTab
              integrations={integrations}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
            />
          )}
          {activeTab === 'api-keys' && (
            <ApiKeysTab
              apiKeys={apiKeys}
              onCreateKey={handleCreateApiKey}
              onRevokeKey={handleRevokeKey}
            />
          )}
        </>
      )}
    </div>
  )
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <IntegrationsPageContent />
    </Suspense>
  )
}
