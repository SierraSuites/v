'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'near_miss' | 'first_aid' | 'medical_treatment' | 'recordable' | 'lost_time' | 'fatality'
type IncidentStatus = 'open' | 'investigating' | 'pending_action' | 'closed'
type CertType = 'company_license' | 'insurance' | 'bond' | 'osha_training' | 'equipment_cert' | 'trade_license' | 'professional_cert' | 'other'
type HolderType = 'company' | 'employee' | 'equipment' | 'subcontractor'
type InspectionStatus = 'scheduled' | 'in_progress' | 'passed' | 'passed_with_conditions' | 'failed' | 'cancelled' | 'rescheduled'
type InspectionType = 'building_code' | 'electrical' | 'plumbing' | 'mechanical' | 'structural' | 'fire_safety' | 'osha' | 'final' | 'other'

interface SafetyIncident {
  id: string
  incident_number: string
  occurred_at: string
  location: string
  severity: Severity
  incident_type: string
  description: string
  employee_name: string | null
  employee_job_title: string | null
  status: IncidentStatus
  is_osha_recordable: boolean
  is_dart_case: boolean
  follow_up_required: boolean
  follow_up_completed: boolean
  project_id: string | null
  created_at: string
}

interface SafetyBriefing {
  id: string
  briefing_date: string
  work_description: string
  hazards_identified: string[]
  ppe_required: string[]
  topics_covered: string[]
  total_attendees: number
  all_workers_signed: boolean
  toolbox_talk_topic: string | null
  location: string | null
  project_id: string
  created_at: string
}

interface Certification {
  id: string
  certification_type: CertType
  name: string
  holder_name: string | null
  holder_type: HolderType
  issuing_authority: string | null
  certification_number: string | null
  issue_date: string | null
  expiration_date: string | null
  is_active: boolean
  required_for_projects: boolean
  created_at: string
}

interface Inspection {
  id: string
  inspection_type: InspectionType
  inspection_name: string
  scheduled_date: string
  scheduled_time: string | null
  inspector_name: string | null
  inspector_agency: string | null
  status: InspectionStatus
  result: string | null
  project_id: string
  created_at: string
}

interface ComplianceStats {
  totalIncidentsYTD: number
  recordableIncidents: number
  dartRate: number
  trir: number
  daysWithoutIncident: number
  briefingsThisMonth: number
  certsExpiringSoon: number
  certsExpired: number
  inspectionsScheduled: number
  inspectionPassRate: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getSeverityConfig(severity: Severity) {
  const configs: Record<Severity, { label: string; bg: string; text: string; border: string; dot: string }> = {
    near_miss:         { label: 'Near Miss',          bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-300', dot: 'bg-blue-500' },
    first_aid:         { label: 'First Aid',           bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-500' },
    medical_treatment: { label: 'Medical Treatment',   bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' },
    recordable:        { label: 'Recordable',          bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-300',  dot: 'bg-red-500' },
    lost_time:         { label: 'Lost Time',           bg: 'bg-red-100',   text: 'text-red-800',    border: 'border-red-400',  dot: 'bg-red-600' },
    fatality:          { label: 'Fatality',            bg: 'bg-gray-900',  text: 'text-white',      border: 'border-gray-900', dot: 'bg-gray-900' },
  }
  return configs[severity] ?? configs.near_miss
}

function getStatusConfig(status: IncidentStatus) {
  const configs: Record<IncidentStatus, { label: string; bg: string; text: string }> = {
    open:             { label: 'Open',            bg: 'bg-red-100',    text: 'text-red-700' },
    investigating:    { label: 'Investigating',   bg: 'bg-orange-100', text: 'text-orange-700' },
    pending_action:   { label: 'Pending Action',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
    closed:           { label: 'Closed',          bg: 'bg-green-100',  text: 'text-green-700' },
  }
  return configs[status] ?? configs.open
}

function getInspectionStatusConfig(status: InspectionStatus) {
  const configs: Record<InspectionStatus, { label: string; bg: string; text: string }> = {
    scheduled:              { label: 'Scheduled',            bg: 'bg-blue-100',   text: 'text-blue-700' },
    in_progress:            { label: 'In Progress',          bg: 'bg-yellow-100', text: 'text-yellow-700' },
    passed:                 { label: 'Passed ✓',             bg: 'bg-green-100',  text: 'text-green-700' },
    passed_with_conditions: { label: 'Passed w/ Conditions', bg: 'bg-teal-100',   text: 'text-teal-700' },
    failed:                 { label: 'Failed',               bg: 'bg-red-100',    text: 'text-red-700' },
    cancelled:              { label: 'Cancelled',            bg: 'bg-gray-100',   text: 'text-gray-600' },
    rescheduled:            { label: 'Rescheduled',          bg: 'bg-purple-100', text: 'text-purple-700' },
  }
  return configs[status] ?? configs.scheduled
}

function getCertExpiryStatus(expDate: string | null) {
  const days = daysUntil(expDate)
  if (days === null) return { label: 'No Expiry', bg: 'bg-gray-100', text: 'text-gray-600', icon: '♾️' }
  if (days < 0)   return { label: `Expired ${Math.abs(days)}d ago`, bg: 'bg-red-100',    text: 'text-red-700',    icon: '🔴' }
  if (days <= 7)  return { label: `${days}d left`,                  bg: 'bg-red-50',     text: 'text-red-600',    icon: '🔴' }
  if (days <= 30) return { label: `${days}d left`,                  bg: 'bg-orange-100', text: 'text-orange-700', icon: '⚠️' }
  if (days <= 60) return { label: `${days}d left`,                  bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '⚠️' }
  return { label: `${days}d left`, bg: 'bg-green-100', text: 'text-green-700', icon: '✅' }
}

function getCertTypeLabel(type: CertType): string {
  const labels: Record<CertType, string> = {
    company_license:   'Company License',
    insurance:         'Insurance',
    bond:              'Bond',
    osha_training:     'OSHA Training',
    equipment_cert:    'Equipment Cert',
    trade_license:     'Trade License',
    professional_cert: 'Professional Cert',
    other:             'Other',
  }
  return labels[type] ?? type
}

function getInspectionTypeLabel(type: InspectionType): string {
  const labels: Record<InspectionType, string> = {
    building_code: 'Building Code',
    electrical:    'Electrical',
    plumbing:      'Plumbing',
    mechanical:    'Mechanical',
    structural:    'Structural',
    fire_safety:   'Fire Safety',
    osha:          'OSHA',
    final:         'Final',
    other:         'Other',
  }
  return labels[type] ?? type
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: string; label: string; value: string | number; sub?: string; color: string
}) {
  const { colors } = useThemeColors()
  return (
    <div className={`rounded-xl shadow-sm border-l-4 ${color} p-4 sm:p-5`} style={{ backgroundColor: colors.bg }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium truncate" style={{ color: colors.textMuted }}>{label}</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: colors.text }}>{value}</p>
          {sub && <p className="text-xs mt-1" style={{ color: colors.textMuted }}>{sub}</p>}
        </div>
        <span className="text-2xl sm:text-3xl flex-shrink-0">{icon}</span>
      </div>
    </div>
  )
}

function EmptyState({ icon, title, desc, action, onAction }: {
  icon: string; title: string; desc: string; action?: string; onAction?: () => void
}) {
  const { colors } = useThemeColors()
  return (
    <div className="text-center py-12 sm:py-16 px-4">
      <div className="text-5xl sm:text-6xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text }}>{title}</h3>
      <p className="text-sm max-w-md mx-auto mb-6" style={{ color: colors.textMuted }}>{desc}</p>
      {action && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
        >
          + {action}
        </button>
      )}
    </div>
  )
}

// ─── Tab: Overview ─────────────────────────────────────────────────────────────

function OverviewTab({
  stats, incidents, certifications, inspections,
}: {
  stats: ComplianceStats
  incidents: SafetyIncident[]
  certifications: Certification[]
  inspections: Inspection[]
}) {
  const { colors } = useThemeColors()
  const recentIncidents = incidents.slice(0, 5)
  const upcomingInspections = inspections
    .filter(i => i.status === 'scheduled')
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 4)
  const expiringCerts = certifications
    .filter(c => {
      const days = daysUntil(c.expiration_date)
      return days !== null && days <= 60
    })
    .sort((a, b) => new Date(a.expiration_date!).getTime() - new Date(b.expiration_date!).getTime())
    .slice(0, 4)

  return (
    <div className="space-y-6">
      {/* KPI stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard icon="📊" label="DART Rate"         value={stats.dartRate} sub="Industry avg: 3.2" color="border-orange-500" />
        <StatCard icon="📈" label="TRIR"              value={stats.trir}     sub="Industry avg: 5.5" color="border-red-500" />
        <StatCard icon="🚨" label="Incidents YTD"     value={stats.totalIncidentsYTD} sub={`${stats.recordableIncidents} recordable`} color="border-yellow-500" />
        <StatCard icon="📋" label="Certs Expiring"    value={stats.certsExpiringSoon} sub={`${stats.certsExpired} expired`} color="border-purple-500" />
        <StatCard icon="✅" label="Inspection Pass %"  value={`${stats.inspectionPassRate}%`} sub={`${stats.inspectionsScheduled} upcoming`} color="border-green-500" />
      </div>

      {/* Days without incident banner */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-5 sm:p-6 text-white flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
        <div className="text-4xl sm:text-5xl">🦺</div>
        <div>
          <p className="text-green-100 text-sm font-medium">Days Without a Recordable Incident</p>
          <p className="text-5xl sm:text-6xl font-black">{stats.daysWithoutIncident}</p>
          <p className="text-green-100 text-sm mt-1">Keep up the great safety record!</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent incidents */}
        <div className="lg:col-span-2 rounded-xl shadow-sm" style={{ backgroundColor: colors.bg, border: colors.border }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: colors.border }}>
            <h3 className="font-semibold" style={{ color: colors.text }}>Recent Incidents</h3>
            <span className="text-xs" style={{ color: colors.textMuted }}>{incidents.length} total</span>
          </div>
          {recentIncidents.length === 0 ? (
            <div className="py-8 text-center text-sm" style={{ color: colors.textMuted }}>
              <div className="text-3xl mb-2">🎉</div>
              No incidents reported — great safety record!
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'transparent' }}>
              {recentIncidents.map(inc => {
                const sev = getSeverityConfig(inc.severity)
                const sta = getStatusConfig(inc.status)
                return (
                  <div key={inc.id} className="px-5 py-3 flex items-start gap-3 transition-colors" style={{ borderBottom: colors.border }}>
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${sev.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: colors.text }}>{inc.incident_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sev.bg} ${sev.text}`}>
                          {sev.label}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sta.bg} ${sta.text}`}>
                          {sta.label}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: colors.textMuted }}>{inc.location} · {formatDate(inc.occurred_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Sidebar: upcoming inspections + expiring certs */}
        <div className="space-y-4">
          {/* Upcoming inspections */}
          <div className="rounded-xl shadow-sm" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="px-4 py-3" style={{ borderBottom: colors.border }}>
              <h3 className="font-semibold text-sm" style={{ color: colors.text }}>Upcoming Inspections</h3>
            </div>
            {upcomingInspections.length === 0 ? (
              <p className="py-6 text-center text-xs" style={{ color: colors.textMuted }}>No inspections scheduled</p>
            ) : (
              <div>
                {upcomingInspections.map(ins => {
                  const days = daysUntil(ins.scheduled_date)
                  return (
                    <div key={ins.id} className="px-4 py-3" style={{ borderBottom: colors.border }}>
                      <p className="text-sm font-medium truncate" style={{ color: colors.text }}>{ins.inspection_name}</p>
                      <p className="text-xs" style={{ color: colors.textMuted }}>{formatDate(ins.scheduled_date)}</p>
                      {days !== null && days <= 7 && (
                        <span className="text-xs text-red-600 font-medium">⚠️ In {days} days</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Expiring certs */}
          <div className="rounded-xl shadow-sm" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="px-4 py-3" style={{ borderBottom: colors.border }}>
              <h3 className="font-semibold text-sm" style={{ color: colors.text }}>Expiring Certifications</h3>
            </div>
            {expiringCerts.length === 0 ? (
              <p className="py-6 text-center text-xs" style={{ color: colors.textMuted }}>All certifications current ✅</p>
            ) : (
              <div>
                {expiringCerts.map(cert => {
                  const exp = getCertExpiryStatus(cert.expiration_date)
                  return (
                    <div key={cert.id} className="px-4 py-3" style={{ borderBottom: colors.border }}>
                      <div className="flex items-center gap-1.5">
                        <span>{exp.icon}</span>
                        <p className="text-sm font-medium truncate" style={{ color: colors.text }}>{cert.name}</p>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{cert.holder_name} · {exp.label}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Safety Briefings ─────────────────────────────────────────────────────

function BriefingsTab({
  briefings, onNew, loading,
}: {
  briefings: SafetyBriefing[]
  onNew: () => void
  loading: boolean
}) {
  const { colors } = useThemeColors()
  const [search, setSearch] = useState('')
  const filtered = briefings.filter(b =>
    b.work_description.toLowerCase().includes(search.toLowerCase()) ||
    (b.toolbox_talk_topic ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <input
          type="text"
          placeholder="Search briefings..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-72 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          onClick={onNew}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium whitespace-nowrap"
        >
          + New Briefing
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-40 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🦺"
          title="No safety briefings yet"
          desc="Daily briefings document your crew's safety meetings, PPE requirements, and hazard awareness. Start one before work begins."
          action="Create First Briefing"
          onAction={onNew}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(b => (
            <div key={b.id} className="rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow" style={{ backgroundColor: colors.bg, border: colors.border }}>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <p className="font-semibold text-sm" style={{ color: colors.text }}>{formatDate(b.briefing_date)}</p>
                  {b.location && <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>📍 {b.location}</p>}
                </div>
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                  b.all_workers_signed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {b.all_workers_signed ? '✓ All Signed' : '⚠ Missing Sigs'}
                </span>
              </div>

              {/* Work description */}
              <p className="text-sm line-clamp-2 mb-3" style={{ color: colors.textMuted }}>{b.work_description}</p>

              {/* Stats row */}
              <div className="flex flex-wrap gap-3 text-xs pt-3" style={{ color: colors.textMuted, borderTop: colors.border }}>
                <span>👥 {b.total_attendees} workers</span>
                {b.toolbox_talk_topic && <span>📣 {b.toolbox_talk_topic}</span>}
                <span>⚠️ {b.hazards_identified.length} hazards</span>
              </div>

              {/* PPE pills */}
              {b.ppe_required.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {b.ppe_required.slice(0, 4).map(ppe => (
                    <span key={ppe} className="px-2 py-0.5 bg-orange-50 text-orange-700 rounded text-xs">{ppe}</span>
                  ))}
                  {b.ppe_required.length > 4 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">+{b.ppe_required.length - 4}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Incidents & OSHA ────────────────────────────────────────────────────

function IncidentsTab({
  incidents, onNew, loading,
}: {
  incidents: SafetyIncident[]
  onNew: () => void
  loading: boolean
}) {
  const { colors } = useThemeColors()
  const [search, setSearch] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<'all' | Severity>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | IncidentStatus>('all')
  const [subTab, setSubTab] = useState<'incidents' | 'osha300'>('incidents')

  const filtered = incidents.filter(inc => {
    const matchSearch = inc.incident_number.toLowerCase().includes(search.toLowerCase()) ||
      inc.location.toLowerCase().includes(search.toLowerCase()) ||
      inc.description.toLowerCase().includes(search.toLowerCase())
    const matchSeverity = filterSeverity === 'all' || inc.severity === filterSeverity
    const matchStatus = filterStatus === 'all' || inc.status === filterStatus
    return matchSearch && matchSeverity && matchStatus
  })

  const osha300 = incidents.filter(i => i.is_osha_recordable)

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg p-1 w-full sm:w-fit" style={{ backgroundColor: colors.bgAlt }}>
        {([
          { key: 'incidents', label: `All Incidents (${incidents.length})` },
          { key: 'osha300',   label: `OSHA 300 Log (${osha300.length})` },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={subTab === t.key ? { backgroundColor: colors.bg, color: colors.text, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' } : { color: colors.textMuted }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'incidents' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Search incidents..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full sm:w-60 px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
              />
              <select
                value={filterSeverity}
                onChange={e => setFilterSeverity(e.target.value as any)}
                className="px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
              >
                <option value="all">All Severities</option>
                <option value="near_miss">Near Miss</option>
                <option value="first_aid">First Aid</option>
                <option value="medical_treatment">Medical Treatment</option>
                <option value="recordable">Recordable</option>
                <option value="lost_time">Lost Time</option>
                <option value="fatality">Fatality</option>
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="pending_action">Pending Action</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <button
              onClick={onNew}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium whitespace-nowrap"
            >
              🚨 Report Incident
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon="✅"
              title={incidents.length === 0 ? "No incidents recorded" : "No incidents match your filters"}
              desc={incidents.length === 0
                ? "Report incidents quickly to maintain your OSHA 300 log and track corrective actions."
                : "Try adjusting your search or filter criteria."}
              action={incidents.length === 0 ? "Report First Incident" : undefined}
              onAction={incidents.length === 0 ? onNew : undefined}
            />
          ) : (
            <div className="space-y-3">
              {filtered.map(inc => {
                const sev = getSeverityConfig(inc.severity)
                const sta = getStatusConfig(inc.status)
                return (
                  <div
                    key={inc.id}
                    className={`rounded-xl shadow-sm border-l-4 ${sev.border} p-4 sm:p-5 hover:shadow-md transition-shadow`}
                    style={{ backgroundColor: colors.bg }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-sm font-bold" style={{ color: colors.text }}>{inc.incident_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sev.bg} ${sev.text}`}>
                            {sev.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sta.bg} ${sta.text}`}>
                            {sta.label}
                          </span>
                          {inc.is_osha_recordable && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              OSHA Recordable
                            </span>
                          )}
                          {inc.is_dart_case && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              DART Case
                            </span>
                          )}
                        </div>
                        <p className="text-sm line-clamp-2" style={{ color: colors.textMuted }}>{inc.description}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs" style={{ color: colors.textMuted }}>
                          <span>📍 {inc.location}</span>
                          <span>📅 {formatDate(inc.occurred_at)}</span>
                          {inc.employee_name && <span>👤 {inc.employee_name}</span>}
                          {inc.employee_job_title && <span>· {inc.employee_job_title}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {inc.follow_up_required && !inc.follow_up_completed && (
                          <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-1 rounded">
                            Follow-up due
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {subTab === 'osha300' && (
        <div className="rounded-xl shadow-sm overflow-hidden" style={{ backgroundColor: colors.bg, border: colors.border }}>
          <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" style={{ borderBottom: colors.border }}>
            <div>
              <h3 className="font-semibold" style={{ color: colors.text }}>OSHA 300 Log — {new Date().getFullYear()}</h3>
              <p className="text-xs mt-0.5" style={{ color: colors.textMuted }}>Required by OSHA 29 CFR 1904. Must be posted Feb 1–Apr 30.</p>
            </div>
            <button className="px-4 py-2 rounded-lg text-sm transition-colors whitespace-nowrap" style={{ border: colors.border, color: colors.textMuted }}>
              📄 Export OSHA 300
            </button>
          </div>
          {osha300.length === 0 ? (
            <div className="py-10 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm" style={{ color: colors.textMuted }}>No recordable incidents this year.</p>
              <p className="text-xs mt-1" style={{ color: colors.textMuted }}>Incidents marked as OSHA Recordable will appear here automatically.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: colors.bgAlt }}>
                  <tr>
                    {['Case #', 'Date', 'Employee', 'Job Title', 'Location', 'Injury Type', 'Days Away', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: colors.textMuted }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {osha300.map((inc, idx) => (
                    <tr key={inc.id} className="transition-colors" style={{ borderBottom: colors.border }}>
                      <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: colors.text }}>{`${new Date().getFullYear()}-${String(idx + 1).padStart(4, '0')}`}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(inc.occurred_at)}</td>
                      <td className="px-4 py-3">{inc.employee_name ?? 'Redacted'}</td>
                      <td className="px-4 py-3">{inc.employee_job_title ?? '—'}</td>
                      <td className="px-4 py-3">{inc.location}</td>
                      <td className="px-4 py-3 capitalize">{inc.incident_type}</td>
                      <td className="px-4 py-3 text-center">{inc.is_dart_case ? '✓' : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusConfig(inc.status).bg} ${getStatusConfig(inc.status).text}`}>
                          {getStatusConfig(inc.status).label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Certifications ───────────────────────────────────────────────────────

function CertificationsTab({
  certifications, onNew, loading,
}: {
  certifications: Certification[]
  onNew: () => void
  loading: boolean
}) {
  const { colors } = useThemeColors()
  const [filter, setFilter] = useState<'all' | 'expiring' | CertType>('all')

  const filtered = certifications.filter(c => {
    if (filter === 'all') return true
    if (filter === 'expiring') {
      const days = daysUntil(c.expiration_date)
      return days !== null && days <= 60
    }
    return c.certification_type === filter
  })

  const expired = certifications.filter(c => (daysUntil(c.expiration_date) ?? 1) < 0)
  const expiringSoon = certifications.filter(c => {
    const d = daysUntil(c.expiration_date)
    return d !== null && d >= 0 && d <= 60
  })

  return (
    <div className="space-y-4">
      {/* Alert banners */}
      {expired.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">🔴</span>
          <div>
            <p className="text-red-800 font-semibold text-sm">{expired.length} certification{expired.length > 1 ? 's' : ''} expired</p>
            <p className="text-red-600 text-xs mt-0.5">Renew immediately to stay compliant: {expired.map(c => c.name).join(', ')}</p>
          </div>
        </div>
      )}
      {expiringSoon.length > 0 && expired.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-yellow-800 font-semibold text-sm">{expiringSoon.length} certification{expiringSoon.length > 1 ? 's' : ''} expiring within 60 days</p>
            <p className="text-yellow-700 text-xs mt-0.5">Schedule renewals now to avoid lapses.</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all',      label: `All (${certifications.length})` },
            { key: 'expiring', label: `Expiring (${expiringSoon.length + expired.length})` },
            { key: 'company_license', label: 'Licenses' },
            { key: 'insurance',       label: 'Insurance' },
            { key: 'osha_training',   label: 'OSHA Training' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-orange-500 text-white'
                  : ''
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={onNew}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium whitespace-nowrap"
        >
          + Add Certification
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-36 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No certifications found"
          desc="Track company licenses, insurance, employee OSHA training, and equipment certifications. Get alerted before they expire."
          action="Add First Certification"
          onAction={onNew}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cert => {
            const exp = getCertExpiryStatus(cert.expiration_date)
            return (
              <div key={cert.id} className="rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow" style={{ backgroundColor: colors.bg, border: colors.border }}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: colors.text }}>{cert.name}</p>
                    <span className="inline-block px-2 py-0.5 rounded text-xs mt-1" style={{ backgroundColor: colors.bgMuted, color: colors.textMuted }}>
                      {getCertTypeLabel(cert.certification_type)}
                    </span>
                  </div>
                  <span className={`flex-shrink-0 text-lg`}>{exp.icon}</span>
                </div>

                {/* Details */}
                <div className="space-y-1 text-xs mb-3" style={{ color: colors.textMuted }}>
                  {cert.holder_name && <p>👤 {cert.holder_name} <span className="text-gray-400">({cert.holder_type})</span></p>}
                  {cert.issuing_authority && <p>🏛️ {cert.issuing_authority}</p>}
                  {cert.certification_number && <p>🔢 {cert.certification_number}</p>}
                </div>

                {/* Expiry badge */}
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${exp.bg} ${exp.text}`}>
                  <span>Expires {cert.expiration_date ? formatDate(cert.expiration_date) : 'N/A'}</span>
                  {daysUntil(cert.expiration_date) !== null && (
                    <span className="opacity-75">· {exp.label}</span>
                  )}
                </div>

                {cert.required_for_projects && (
                  <p className="text-xs text-purple-600 mt-2">⭐ Required for projects</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Tab: Inspections ──────────────────────────────────────────────────────────

function InspectionsTab({
  inspections, onNew, loading,
}: {
  inspections: Inspection[]
  onNew: () => void
  loading: boolean
}) {
  const { colors } = useThemeColors()
  const [filter, setFilter] = useState<'all' | InspectionStatus>('all')

  const filtered = inspections.filter(i =>
    filter === 'all' ? true : i.status === filter
  )

  const upcoming = inspections.filter(i => i.status === 'scheduled').length
  const passed   = inspections.filter(i => i.status === 'passed' || i.status === 'passed_with_conditions').length
  const failed   = inspections.filter(i => i.status === 'failed').length

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{upcoming}</p>
          <p className="text-xs text-blue-600 mt-0.5">Scheduled</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-2xl font-bold text-green-700">{passed}</p>
          <p className="text-xs text-green-600 mt-0.5">Passed</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 sm:p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{failed}</p>
          <p className="text-xs text-red-600 mt-0.5">Failed</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all', label: 'All' },
            { key: 'scheduled', label: 'Scheduled' },
            { key: 'passed', label: 'Passed' },
            { key: 'failed', label: 'Failed' },
          ] as const).map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-orange-500 text-white'
                  : ''
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={onNew}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium whitespace-nowrap"
        >
          + Schedule Inspection
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="No inspections scheduled"
          desc="Schedule building, fire, electrical, and OSHA inspections. Track prep checklists and deficiencies to maximize your pass rate."
          action="Schedule Inspection"
          onAction={onNew}
        />
      ) : (
        <div className="space-y-3">
          {filtered
            .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
            .map(ins => {
              const sta = getInspectionStatusConfig(ins.status)
              const days = daysUntil(ins.scheduled_date)
              const isUrgent = ins.status === 'scheduled' && days !== null && days <= 7
              return (
                <div
                  key={ins.id}
                  className={`rounded-xl shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow ${
                    isUrgent ? 'border-l-4 border-l-orange-400' : ''
                  }`}
                  style={{ backgroundColor: colors.bg, border: isUrgent ? undefined : colors.border }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sta.bg} ${sta.text}`}>
                          {sta.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs" style={{ backgroundColor: colors.bgMuted, color: colors.textMuted }}>
                          {getInspectionTypeLabel(ins.inspection_type)}
                        </span>
                        {isUrgent && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                            ⚠️ In {days} days
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-sm" style={{ color: colors.text }}>{ins.inspection_name}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-xs" style={{ color: colors.textMuted }}>
                        <span>📅 {formatDate(ins.scheduled_date)}</span>
                        {ins.scheduled_time && <span>🕐 {ins.scheduled_time}</span>}
                        {ins.inspector_name && <span>👤 {ins.inspector_name}</span>}
                        {ins.inspector_agency && <span>🏛️ {ins.inspector_agency}</span>}
                      </div>
                    </div>
                    {ins.result && (
                      <div className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${
                        ins.result === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {ins.result === 'passed' ? '✓ Passed' : '✗ Failed'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

// ─── Create Modals ─────────────────────────────────────────────────────────────

function CreateIncidentModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const { colors } = useThemeColors()
  const [form, setForm] = useState({
    occurred_at: new Date().toISOString().slice(0, 16),
    location: '',
    severity: 'near_miss' as Severity,
    incident_type: 'injury',
    description: '',
    employee_name: '',
    employee_job_title: '',
    immediate_actions_taken: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ ...form, is_osha_recordable: ['recordable', 'lost_time', 'fatality', 'medical_treatment'].includes(form.severity) })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.bg }}>
        <div className="sticky top-0 px-6 py-4 flex items-center justify-between rounded-t-2xl" style={{ backgroundColor: colors.bg, borderBottom: colors.border }}>
          <h2 className="text-lg font-bold font-bold" style={{ color: colors.text }}>🚨 Report Safety Incident</h2>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: colors.textMuted }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Date & Time *</label>
              <input
                type="datetime-local"
                value={form.occurred_at}
                onChange={e => setForm({ ...form, occurred_at: e.target.value })}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Severity *</label>
              <select
                value={form.severity}
                onChange={e => setForm({ ...form, severity: e.target.value as Severity })}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
              >
                <option value="near_miss">Near Miss</option>
                <option value="first_aid">First Aid</option>
                <option value="medical_treatment">Medical Treatment</option>
                <option value="recordable">Recordable</option>
                <option value="lost_time">Lost Time</option>
                <option value="fatality">Fatality</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Location *</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              required
              placeholder="e.g. Floor 3, North Wing"
              className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Employee Name</label>
              <input
                type="text"
                value={form.employee_name}
                onChange={e => setForm({ ...form, employee_name: e.target.value })}
                placeholder="John Davis"
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Job Title</label>
              <input
                type="text"
                value={form.employee_job_title}
                onChange={e => setForm({ ...form, employee_job_title: e.target.value })}
                placeholder="Carpenter"
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Description *</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              required
              rows={3}
              placeholder="Describe what happened, what the person was doing, and how the incident occurred..."
              className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Immediate Actions Taken</label>
            <textarea
              value={form.immediate_actions_taken}
              onChange={e => setForm({ ...form, immediate_actions_taken: e.target.value })}
              rows={2}
              placeholder="First aid given, area secured, crew notified..."
              className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
            />
          </div>

          {['recordable', 'lost_time', 'fatality', 'medical_treatment'].includes(form.severity) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-700 font-medium">
                ⚠️ This severity level requires an OSHA 300 log entry. The incident will be marked as OSHA Recordable automatically.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm transition-colors" style={{ border: colors.border, color: colors.textMuted, backgroundColor: colors.bg }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CreateBriefingModal({ onClose, onSave, projects }: {
  onClose: () => void
  onSave: (data: any) => Promise<void>
  projects: { id: string; name: string }[]
}) {
  const { colors } = useThemeColors()
  const PPE_OPTIONS = ['Hard hat', 'Safety glasses', 'Hi-vis vest', 'Steel-toe boots', 'Fall protection harness', 'Hearing protection', 'Gloves', 'Respirator']
  const HAZARD_OPTIONS = ['Working at heights', 'Power tools', 'Heavy machinery', 'Electrical work', 'Confined spaces', 'Overhead work', 'Excavation', 'Chemical exposure', 'Hot work', 'Material deliveries']

  const [form, setForm] = useState({
    project_id: projects[0]?.id ?? '',
    briefing_date: new Date().toISOString().split('T')[0],
    work_description: '',
    toolbox_talk_topic: '',
    emergency_assembly_point: '',
    location: '',
    ppe_required: [] as string[],
    hazards_identified: [] as string[],
  })
  const [saving, setSaving] = useState(false)

  const toggle = (field: 'ppe_required' | 'hazards_identified', val: string) => {
    setForm(f => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter(x => x !== val) : [...f[field], val],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onSave({ ...form, topics_covered: form.hazards_identified })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.bg }}>
        <div className="sticky top-0 px-6 py-4 flex items-center justify-between rounded-t-2xl" style={{ backgroundColor: colors.bg, borderBottom: colors.border }}>
          <h2 className="text-lg font-bold" style={{ color: colors.text }}>🦺 Daily Safety Briefing</h2>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: colors.textMuted }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Date *</label>
              <input
                type="date"
                value={form.briefing_date}
                onChange={e => setForm({ ...form, briefing_date: e.target.value })}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
              />
            </div>
            {projects.length > 0 && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Project *</label>
                <select
                  value={form.project_id}
                  onChange={e => setForm({ ...form, project_id: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
                >
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Location / Site Area</label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Downtown Office - Floor 3"
              className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Today's Work *</label>
            <textarea
              value={form.work_description}
              onChange={e => setForm({ ...form, work_description: e.target.value })}
              required
              rows={2}
              placeholder="Framing Floor 3, electrical rough-in, material deliveries..."
              className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: colors.textMuted }}>PPE Required</label>
            <div className="grid grid-cols-2 gap-2">
              {PPE_OPTIONS.map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: colors.text }}>
                  <input
                    type="checkbox"
                    checked={form.ppe_required.includes(opt)}
                    onChange={() => toggle('ppe_required', opt)}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: colors.textMuted }}>Hazards Identified</label>
            <div className="grid grid-cols-2 gap-2">
              {HAZARD_OPTIONS.map(opt => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: colors.text }}>
                  <input
                    type="checkbox"
                    checked={form.hazards_identified.includes(opt)}
                    onChange={() => toggle('hazards_identified', opt)}
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Toolbox Talk Topic</label>
              <input
                type="text"
                value={form.toolbox_talk_topic}
                onChange={e => setForm({ ...form, toolbox_talk_topic: e.target.value })}
                placeholder="Fall Protection"
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Assembly Point *</label>
              <input
                type="text"
                value={form.emergency_assembly_point}
                onChange={e => setForm({ ...form, emergency_assembly_point: e.target.value })}
                required
                placeholder="Parking lot NW corner"
                className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm transition-colors" style={{ border: colors.border, color: colors.textMuted, backgroundColor: colors.bg }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Briefing'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CreateCertModal({ onClose, onSave }: { onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const { colors } = useThemeColors()
  const [form, setForm] = useState({
    name: '',
    certification_type: 'company_license' as CertType,
    holder_type: 'company' as HolderType,
    holder_name: '',
    issuing_authority: '',
    certification_number: '',
    issue_date: '',
    expiration_date: '',
    alert_days_before: 60,
    required_for_projects: false,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try { await onSave(form); onClose() }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.bg }}>
        <div className="sticky top-0 px-6 py-4 flex items-center justify-between rounded-t-2xl" style={{ backgroundColor: colors.bg, borderBottom: colors.border }}>
          <h2 className="text-lg font-bold" style={{ color: colors.text }}>📋 Add Certification</h2>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: colors.textMuted }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Certification Name *</label>
            <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="General Contractor License" className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Type *</label>
              <select value={form.certification_type} onChange={e => setForm({...form, certification_type: e.target.value as CertType})} required className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}>
                <option value="company_license">Company License</option>
                <option value="insurance">Insurance</option>
                <option value="bond">Bond</option>
                <option value="osha_training">OSHA Training</option>
                <option value="equipment_cert">Equipment Cert</option>
                <option value="trade_license">Trade License</option>
                <option value="professional_cert">Professional Cert</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Holder *</label>
              <select value={form.holder_type} onChange={e => setForm({...form, holder_type: e.target.value as HolderType})} required className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}>
                <option value="company">Company</option>
                <option value="employee">Employee</option>
                <option value="equipment">Equipment</option>
                <option value="subcontractor">Subcontractor</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Holder Name</label>
              <input type="text" value={form.holder_name} onChange={e => setForm({...form, holder_name: e.target.value})} placeholder="John Davis / The Company" className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Issuing Authority</label>
              <input type="text" value={form.issuing_authority} onChange={e => setForm({...form, issuing_authority: e.target.value})} placeholder="State Board / OSHA" className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Certification Number</label>
            <input type="text" value={form.certification_number} onChange={e => setForm({...form, certification_number: e.target.value})} placeholder="GC-123456" className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Issue Date</label>
              <input type="date" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Expiration Date</label>
              <input type="date" value={form.expiration_date} onChange={e => setForm({...form, expiration_date: e.target.value})} className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: colors.text }}>
            <input type="checkbox" checked={form.required_for_projects} onChange={e => setForm({...form, required_for_projects: e.target.checked})} className="rounded border-gray-300 text-orange-500" />
            Required for bidding / working on projects
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm transition-colors" style={{ border: colors.border, color: colors.textMuted, backgroundColor: colors.bg }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Add Certification'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CreateInspectionModal({ onClose, onSave, projects }: {
  onClose: () => void
  onSave: (data: any) => Promise<void>
  projects: { id: string; name: string }[]
}) {
  const { colors } = useThemeColors()
  const [form, setForm] = useState({
    project_id: projects[0]?.id ?? '',
    inspection_type: 'building_code' as InspectionType,
    inspection_name: '',
    scheduled_date: '',
    scheduled_time: '',
    inspector_name: '',
    inspector_agency: '',
    inspector_phone: '',
    description: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try { await onSave(form); onClose() }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" style={{ backgroundColor: colors.bg }}>
        <div className="sticky top-0 px-6 py-4 flex items-center justify-between rounded-t-2xl" style={{ backgroundColor: colors.bg, borderBottom: colors.border }}>
          <h2 className="text-lg font-bold" style={{ color: colors.text }}>🔍 Schedule Inspection</h2>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors" style={{ color: colors.textMuted }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {projects.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Project *</label>
              <select value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})} required className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Inspection Type *</label>
              <select value={form.inspection_type} onChange={e => setForm({...form, inspection_type: e.target.value as InspectionType})} required className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }}>
                <option value="building_code">Building Code</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="mechanical">Mechanical</option>
                <option value="structural">Structural</option>
                <option value="fire_safety">Fire Safety</option>
                <option value="osha">OSHA</option>
                <option value="final">Final</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Inspection Name *</label>
              <input type="text" value={form.inspection_name} onChange={e => setForm({...form, inspection_name: e.target.value})} required placeholder="Electrical Rough-In" className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Date *</label>
              <input type="date" value={form.scheduled_date} onChange={e => setForm({...form, scheduled_date: e.target.value})} required className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Time</label>
              <input type="time" value={form.scheduled_time} onChange={e => setForm({...form, scheduled_time: e.target.value})} className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Inspector Name</label>
              <input type="text" value={form.inspector_name} onChange={e => setForm({...form, inspector_name: e.target.value})} placeholder="James Wilson" className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Agency</label>
              <input type="text" value={form.inspector_agency} onChange={e => setForm({...form, inspector_agency: e.target.value})} placeholder="Building Department" className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: colors.textMuted }}>Notes / Requirements</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Electrical plans must be on site, permit posted..." className="w-full px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" style={{ border: colors.border, backgroundColor: colors.bg, color: colors.text }} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm transition-colors" style={{ border: colors.border, color: colors.textMuted, backgroundColor: colors.bg }}>Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">{saving ? 'Saving...' : 'Schedule Inspection'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

function CompliancePage() {
  const searchParams = useSearchParams()
  const { colors } = useThemeColors()
  const initialTab = (searchParams.get('tab') as any) ?? 'overview'

  const [activeTab, setActiveTab] = useState<'overview' | 'briefings' | 'incidents' | 'certifications' | 'inspections'>(initialTab)
  const [loading, setLoading] = useState(true)

  // Data state
  const [incidents, setIncidents] = useState<SafetyIncident[]>([])
  const [briefings, setBriefings] = useState<SafetyBriefing[]>([])
  const [certifications, setCertifications] = useState<Certification[]>([])
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([])
  const [stats, setStats] = useState<ComplianceStats>({
    totalIncidentsYTD: 0, recordableIncidents: 0, dartRate: 0.0, trir: 0.0,
    daysWithoutIncident: 0, briefingsThisMonth: 0,
    certsExpiringSoon: 0, certsExpired: 0,
    inspectionsScheduled: 0, inspectionPassRate: 100,
  })

  // Modal state
  const [showIncidentModal, setShowIncidentModal]     = useState(false)
  const [showBriefingModal, setShowBriefingModal]     = useState(false)
  const [showCertModal, setShowCertModal]             = useState(false)
  const [showInspectionModal, setShowInspectionModal] = useState(false)

  const supabase = createClient()

  // ── Load all data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Load projects first (needed for forms)
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('status', 'active')
        .order('name')
      setProjects(projectsData ?? [])

      // Load compliance data — each wrapped in try/catch so one failure
      // doesn't block the others (tables may not exist before migration)
      const [incRes, briefRes, certRes, insRes] = await Promise.allSettled([
        supabase.from('safety_incidents').select('*').order('occurred_at', { ascending: false }),
        supabase.from('safety_briefings').select('*').order('briefing_date', { ascending: false }),
        supabase.from('certifications').select('*').order('expiration_date', { ascending: true }),
        supabase.from('inspections').select('*').order('scheduled_date', { ascending: true }),
      ])

      const incData  = incRes.status  === 'fulfilled' ? (incRes.value.data  ?? []) : []
      const briefData= briefRes.status === 'fulfilled' ? (briefRes.value.data ?? []) : []
      const certData = certRes.status  === 'fulfilled' ? (certRes.value.data  ?? []) : []
      const insData  = insRes.status   === 'fulfilled' ? (insRes.value.data   ?? []) : []

      setIncidents(incData as SafetyIncident[])
      setBriefings(briefData as SafetyBriefing[])
      setCertifications(certData as Certification[])
      setInspections(insData as Inspection[])

      // Compute stats
      const now = new Date()
      const yearStart = new Date(now.getFullYear(), 0, 1)
      const incYTD = incData.filter(i => new Date(i.occurred_at) >= yearStart)
      const recordable = incYTD.filter(i => i.is_osha_recordable)

      // Days without incident: days since last recordable, or days since year start
      const lastRecordable = recordable.sort((a: any, b: any) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      )[0]
      const daysWithout = lastRecordable
        ? Math.floor((now.getTime() - new Date(lastRecordable.occurred_at).getTime()) / 86400000)
        : Math.floor((now.getTime() - yearStart.getTime()) / 86400000)

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const briefsThisMonth = briefData.filter((b: any) => new Date(b.briefing_date) >= monthStart)

      const certsExpired  = certData.filter((c: any) => (daysUntil(c.expiration_date) ?? 1) < 0)
      const certsSoon     = certData.filter((c: any) => { const d = daysUntil(c.expiration_date); return d !== null && d >= 0 && d <= 60 })
      const insScheduled  = insData.filter((i: any) => i.status === 'scheduled')
      const insPassed     = insData.filter((i: any) => i.status === 'passed' || i.status === 'passed_with_conditions')
      const insTotal      = insPassed.length + insData.filter((i: any) => i.status === 'failed').length
      const passRate      = insTotal > 0 ? Math.round((insPassed.length / insTotal) * 100) : 100

      setStats({
        totalIncidentsYTD:  incYTD.length,
        recordableIncidents: recordable.length,
        dartRate: 0.0, // Would calculate via Supabase RPC in production
        trir: 0.0,
        daysWithoutIncident: daysWithout,
        briefingsThisMonth: briefsThisMonth.length,
        certsExpiringSoon: certsSoon.length,
        certsExpired: certsExpired.length,
        inspectionsScheduled: insScheduled.length,
        inspectionPassRate: passRate,
      })
    } catch (err) {
      console.error('Compliance data load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ── Save handlers ──────────────────────────────────────────────────────────
  const saveIncident = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return }
    const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', user.id).single()
    if (!profile?.company_id) { toast.error('No company found'); return }

    const { error } = await supabase.from('safety_incidents').insert({
      ...data,
      company_id: profile.company_id,
      reported_by_id: user.id,
    })
    if (error) { toast.error('Failed to save incident: ' + error.message); throw error }
    toast.success('Incident reported successfully')
    await loadData()
  }

  const saveBriefing = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return }
    const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', user.id).single()
    if (!profile?.company_id) { toast.error('No company found'); return }

    if (!data.project_id) { toast.error('Please select a project'); throw new Error('No project') }

    const { error } = await supabase.from('safety_briefings').insert({
      ...data,
      company_id: profile.company_id,
      conducted_by_id: user.id,
    })
    if (error) { toast.error('Failed to save briefing: ' + error.message); throw error }
    toast.success('Safety briefing recorded')
    await loadData()
  }

  const saveCert = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return }
    const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', user.id).single()
    if (!profile?.company_id) { toast.error('No company found'); return }

    const { error } = await supabase.from('certifications').insert({
      ...data,
      company_id: profile.company_id,
      created_by: user.id,
    })
    if (error) { toast.error('Failed to save certification: ' + error.message); throw error }
    toast.success('Certification added')
    await loadData()
  }

  const saveInspection = async (data: any) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Not authenticated'); return }
    const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', user.id).single()
    if (!profile?.company_id) { toast.error('No company found'); return }

    if (!data.project_id) { toast.error('Please select a project'); throw new Error('No project') }

    const { error } = await supabase.from('inspections').insert({
      ...data,
      company_id: profile.company_id,
      inspector_id: user.id,
    })
    if (error) { toast.error('Failed to save inspection: ' + error.message); throw error }
    toast.success('Inspection scheduled')
    await loadData()
  }

  // ── Tabs config ────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'overview',       label: 'Overview',      icon: '📊' },
    { id: 'briefings',      label: 'Briefings',     icon: '🦺', count: briefings.length },
    { id: 'incidents',      label: 'Incidents',     icon: '🚨', count: incidents.length },
    { id: 'certifications', label: 'Certifications',icon: '📋', count: certifications.length },
    { id: 'inspections',    label: 'Inspections',   icon: '🔍', count: inspections.length },
  ] as const

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0f17]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Page Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: colors.text }}>
                🦺 Compliance & Safety
              </h1>
              <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                OSHA compliance, safety briefings, certifications, and inspections
              </p>
            </div>
            {/* Quick-action buttons based on active tab */}
            {activeTab === 'incidents' && (
              <button
                onClick={() => setShowIncidentModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium text-sm shadow-sm"
              >
                🚨 Report Incident
              </button>
            )}
            {activeTab === 'briefings' && (
              <button
                onClick={() => setShowBriefingModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-colors font-medium text-sm shadow-sm"
              >
                + New Briefing
              </button>
            )}
          </div>
        </div>

        {/* Tab navigation — scrollable on mobile */}
        <div className="mb-6 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="flex gap-1 min-w-max sm:min-w-0" style={{ borderBottom: colors.border }}>
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent'
                }`}
                style={activeTab !== tab.id ? { color: colors.textMuted } : {}}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {'count' in tab && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                    activeTab === tab.id ? 'bg-orange-100 text-orange-700' : ''
                  }`}
                  style={activeTab !== tab.id ? { backgroundColor: colors.bgMuted, color: colors.textMuted } : {}}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        {activeTab === 'overview' && (
          <OverviewTab
            stats={stats}
            incidents={incidents}
            certifications={certifications}
            inspections={inspections}
          />
        )}
        {activeTab === 'briefings' && (
          <BriefingsTab
            briefings={briefings}
            onNew={() => setShowBriefingModal(true)}
            loading={loading}
          />
        )}
        {activeTab === 'incidents' && (
          <IncidentsTab
            incidents={incidents}
            onNew={() => setShowIncidentModal(true)}
            loading={loading}
          />
        )}
        {activeTab === 'certifications' && (
          <CertificationsTab
            certifications={certifications}
            onNew={() => setShowCertModal(true)}
            loading={loading}
          />
        )}
        {activeTab === 'inspections' && (
          <InspectionsTab
            inspections={inspections}
            onNew={() => setShowInspectionModal(true)}
            loading={loading}
          />
        )}
      </div>

      {/* Modals */}
      {showIncidentModal && (
        <CreateIncidentModal
          onClose={() => setShowIncidentModal(false)}
          onSave={saveIncident}
        />
      )}
      {showBriefingModal && (
        <CreateBriefingModal
          onClose={() => setShowBriefingModal(false)}
          onSave={saveBriefing}
          projects={projects}
        />
      )}
      {showCertModal && (
        <CreateCertModal
          onClose={() => setShowCertModal(false)}
          onSave={saveCert}
        />
      )}
      {showInspectionModal && (
        <CreateInspectionModal
          onClose={() => setShowInspectionModal(false)}
          onSave={saveInspection}
          projects={projects}
        />
      )}
    </div>
  )
}

// ─── Export with Suspense (required for useSearchParams) ──────────────────────
export default function CompliancePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0d0f17]">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CompliancePage />
    </Suspense>
  )
}
