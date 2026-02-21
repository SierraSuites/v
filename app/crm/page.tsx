'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import CRMAccessWrapper from '@/components/crm/CRMAccessWrapper'

interface PipelineMetrics {
  total_leads: number
  total_value: number
  weighted_value: number
  avg_deal_size: number
  win_rate: number
}

interface StageData {
  stage: string
  count: number
  value: number
}

interface Activity {
  id: string
  activity_type: string
  subject: string
  scheduled_date: string
  contact: {
    full_name: string
  }
}

export default function CRMDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<PipelineMetrics | null>(null)
  const [pipelineData, setPipelineData] = useState<StageData[]>([])
  const [upcomingActivities, setUpcomingActivities] = useState<Activity[]>([])
  const [recentContacts, setRecentContacts] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Load pipeline metrics
      await loadPipelineMetrics(user.id)

      // Load pipeline by stage
      await loadPipelineByStage(user.id)

      // Load upcoming activities
      await loadUpcomingActivities(user.id)

      // Load recent contacts
      await loadRecentContacts(user.id)

    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPipelineMetrics = async (userId: string) => {
    const { data, error } = await supabase
      .rpc('get_pipeline_metrics', { user_id_param: userId })

    if (!error && data && data.length > 0) {
      setMetrics(data[0])
    }
  }

  const loadPipelineByStage = async (userId: string) => {
    const { data, error} = await supabase
      .from('crm_leads')
      .select('stage, estimated_value')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (!error && data) {
      const grouped = data.reduce((acc: any, lead) => {
        const stage = lead.stage || 'new'
        if (!acc[stage]) {
          acc[stage] = { stage, count: 0, value: 0 }
        }
        acc[stage].count += 1
        acc[stage].value += lead.estimated_value || 0
        return acc
      }, {})

      setPipelineData(Object.values(grouped))
    }
  }

  const loadUpcomingActivities = async (userId: string) => {
    const { data, error } = await supabase
      .from('crm_activities')
      .select(`
        id,
        activity_type,
        subject,
        scheduled_date,
        contact:crm_contacts(full_name)
      `)
      .eq('user_id', userId)
      .eq('status', 'scheduled')
      .gte('scheduled_date', new Date().toISOString())
      .order('scheduled_date', { ascending: true })
      .limit(5)

    if (!error && data) {
      // Transform the data to match Activity type (contact is returned as array but we need object)
      const transformedData = data.map((item: any) => ({
        ...item,
        contact: Array.isArray(item.contact) ? item.contact[0] : item.contact
      })) as Activity[]
      setUpcomingActivities(transformedData)
    }
  }

  const loadRecentContacts = async (userId: string) => {
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5)

    if (!error && data) {
      setRecentContacts(data)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call': return '📞'
      case 'email': return '📧'
      case 'meeting': return '🤝'
      case 'site_visit': return '🏗️'
      case 'quote_sent': return '📋'
      default: return '📌'
    }
  }

  const stageColors: Record<string, string> = {
    new: 'bg-gray-100 text-gray-700',
    contacted: 'bg-blue-100 text-blue-700',
    qualified: 'bg-purple-100 text-purple-700',
    proposal_sent: 'bg-yellow-100 text-yellow-700',
    proposal: 'bg-yellow-100 text-yellow-700',
    negotiation: 'bg-orange-100 text-orange-700',
    won: 'bg-green-100 text-green-700',
    lost: 'bg-red-100 text-red-700',
  }

  // Quality Guide lines 602-608: Stage-specific bar colors
  const stageBarColors: Record<string, string> = {
    new: '#9CA3AF',
    contacted: '#3B82F6',
    qualified: '#06B6D4',
    proposal_sent: '#EAB308',
    proposal: '#EAB308',
    negotiation: '#F97316',
    won: '#22C55E',
    lost: '#EF4444',
  }

  return (
    <CRMAccessWrapper>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">CRM Dashboard</h1>
              <p className="text-gray-600 mt-1">Manage leads, contacts, and grow your business</p>
            </div>

            <div className="flex gap-3">
              <Link
                href="/crm/contacts/new"
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                + New Contact
              </Link>
              <Link
                href="/crm/leads/new"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                + New Lead
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-6 animate-pulse">
            {/* Stats skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-3" />
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-32" />
                </div>
              ))}
            </div>
            {/* Cards skeleton */}
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                    <div className="h-6 bg-gray-200 rounded-full w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Quality Guide lines 697-718: Metrics Grid with 5 stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="rounded-xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Total Pipeline</div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6A9BFD 0%, #8BB5FE 100%)' }}>
                    <span className="text-white text-sm">💰</span>
                  </div>
                </div>
                <div className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{formatCurrency(metrics?.total_value || 0)}</div>
                <div className="text-xs mt-1" style={{ color: '#4A4A4A' }}>{metrics?.total_leads || 0} active leads</div>
              </div>

              <div className="rounded-xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Weighted Value</div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6BCB77 0%, #85D68D 100%)' }}>
                    <span className="text-white text-sm">📊</span>
                  </div>
                </div>
                <div className="text-2xl font-bold" style={{ color: '#22C55E' }}>{formatCurrency(metrics?.weighted_value || 0)}</div>
                <div className="text-xs mt-1" style={{ color: '#4A4A4A' }}>Probability-adjusted</div>
              </div>

              <div className="rounded-xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Active Deals</div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8787 100%)' }}>
                    <span className="text-white text-sm">🎯</span>
                  </div>
                </div>
                <div className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>{metrics?.total_leads || 0}</div>
                <div className="text-xs mt-1" style={{ color: '#4A4A4A' }}>In pipeline</div>
              </div>

              <div className="rounded-xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Avg Deal Size</div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #C4B5FD 100%)' }}>
                    <span className="text-white text-sm">📈</span>
                  </div>
                </div>
                <div className="text-2xl font-bold" style={{ color: '#7C3AED' }}>{formatCurrency(metrics?.avg_deal_size || 0)}</div>
                <div className="text-xs mt-1" style={{ color: '#4A4A4A' }}>Per opportunity</div>
              </div>

              <div className="rounded-xl p-5" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Win Rate</div>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFD93D 0%, #FFE066 100%)' }}>
                    <span className="text-white text-sm">🏆</span>
                  </div>
                </div>
                {/* Quality Guide lines 938-943: Win rate color by threshold */}
                <div className="text-2xl font-bold" style={{
                  color: (metrics?.win_rate || 0) >= 0.6 ? '#22C55E' : (metrics?.win_rate || 0) >= 0.4 ? '#F59E0B' : '#DC2626'
                }}>
                  {((metrics?.win_rate || 0) * 100).toFixed(0)}%
                </div>
                <div className="text-xs mt-1" style={{ color: '#4A4A4A' }}>Closed deals</div>
              </div>
            </div>

            {/* Quality Guide lines 602-608, 749-760: Pipeline Funnel with stage colors */}
            <div className="rounded-xl mb-8" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E0E0E0' }}>
                <h2 className="text-lg font-semibold" style={{ color: '#1A1A1A' }}>Sales Pipeline</h2>
                <Link href="/crm/leads" className="text-sm font-medium" style={{ color: '#6A9BFD' }}>
                  View All →
                </Link>
              </div>

              <div className="p-6">
                {pipelineData.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎯</div>
                    <h3 className="text-xl font-semibold mb-2" style={{ color: '#1A1A1A' }}>No active leads yet</h3>
                    <p className="mb-6" style={{ color: '#4A4A4A' }}>Start by adding your first lead to track opportunities</p>
                    <Link
                      href="/crm/leads/new"
                      className="px-6 py-3 text-white rounded-lg transition-colors inline-block"
                      style={{ background: 'linear-gradient(to bottom, #FF6B6B 0%, #FF5252 100%)' }}
                    >
                      Create Your First Lead
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pipelineData.map((stage) => {
                      const percentage = metrics?.total_leads
                        ? (stage.count / metrics.total_leads) * 100
                        : 0
                      const barColor = stageBarColors[stage.stage] || '#9CA3AF'

                      return (
                        <div key={stage.stage}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${stageColors[stage.stage] || 'bg-gray-100 text-gray-700'}`}>
                                {stage.stage.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className="text-sm" style={{ color: '#4A4A4A' }}>
                                {stage.count} {stage.count === 1 ? 'lead' : 'leads'}
                              </span>
                            </div>
                            <div className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>
                              {formatCurrency(stage.value)}
                            </div>
                          </div>
                          <div className="w-full rounded-full h-2" style={{ backgroundColor: '#E0E0E0' }}>
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{ width: `${Math.max(percentage, 2)}%`, backgroundColor: barColor }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Quality Guide lines 1059-1087: Upcoming Activities with left border accent */}
              <div className="rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E0E0E0' }}>
                  <h2 className="text-lg font-semibold" style={{ color: '#1A1A1A' }}>Upcoming Activities</h2>
                  <Link href="/crm/activities" className="text-sm font-medium" style={{ color: '#6A9BFD' }}>
                    View All →
                  </Link>
                </div>

                <div className="divide-y divide-gray-100">
                  {upcomingActivities.length === 0 ? (
                    <div className="p-12 text-center" style={{ color: '#4A4A4A' }}>
                      <div className="text-4xl mb-2">📅</div>
                      <p>No upcoming activities</p>
                    </div>
                  ) : (
                    upcomingActivities.map((activity) => {
                      // Quality Guide lines 1059-1087: Activity type border colors
                      const borderColor = activity.activity_type === 'call' ? '#3B82F6'
                        : activity.activity_type === 'email' ? '#6A9BFD'
                        : activity.activity_type === 'meeting' ? '#22C55E'
                        : activity.activity_type === 'site_visit' ? '#F59E0B'
                        : '#9CA3AF'
                      return (
                        <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors" style={{ borderLeft: `4px solid ${borderColor}` }}>
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">{getActivityIcon(activity.activity_type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-sm" style={{ color: '#1A1A1A' }}>{activity.subject}</div>
                                <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#F8F9FA', color: '#4A4A4A' }}>
                                  {activity.activity_type.replace('_', ' ')}
                                </span>
                              </div>
                              <div className="text-sm" style={{ color: '#4A4A4A' }}>
                                {activity.contact?.full_name || 'No contact'}
                              </div>
                              <div className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                                {formatDate(activity.scheduled_date)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Quality Guide lines 912-949: Recent Contacts with avatar initials */}
              <div className="rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
                <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E0E0E0' }}>
                  <h2 className="text-lg font-semibold" style={{ color: '#1A1A1A' }}>Recent Contacts</h2>
                  <Link href="/crm/contacts" className="text-sm font-medium" style={{ color: '#6A9BFD' }}>
                    View All →
                  </Link>
                </div>

                <div className="divide-y divide-gray-100">
                  {recentContacts.length === 0 ? (
                    <div className="p-12 text-center" style={{ color: '#4A4A4A' }}>
                      <div className="text-4xl mb-2">👥</div>
                      <p>No contacts yet</p>
                    </div>
                  ) : (
                    recentContacts.map((contact) => (
                      <Link
                        key={contact.id}
                        href={`/crm/contacts/${contact.id}`}
                        className="p-4 hover:bg-gray-50 transition-colors block"
                      >
                        <div className="flex items-center gap-3">
                          {/* Avatar with initials */}
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0" style={{
                            background: contact.category === 'client' ? 'linear-gradient(135deg, #6BCB77 0%, #85D68D 100%)'
                              : contact.category === 'vendor' ? 'linear-gradient(135deg, #A78BFA 0%, #C4B5FD 100%)'
                              : 'linear-gradient(135deg, #6A9BFD 0%, #8BB5FE 100%)'
                          }}>
                            {contact.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm" style={{ color: '#1A1A1A' }}>{contact.full_name}</div>
                            {contact.company && (
                              <div className="text-xs" style={{ color: '#4A4A4A' }}>{contact.company}</div>
                            )}
                            <div className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>
                              {contact.email || contact.phone || 'No contact info'}
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            contact.category === 'client' ? 'bg-green-100 text-green-700' :
                            contact.category === 'prospect' ? 'bg-blue-100 text-blue-700' :
                            contact.category === 'vendor' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {contact.category}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quality Guide lines 996-1016: Quick Actions */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/crm/contacts"
                className="rounded-xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #6A9BFD 0%, #8BB5FE 100%)' }}>
                  <span className="text-white text-xl">👥</span>
                </div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: '#1A1A1A' }}>Manage Contacts</h3>
                <p className="text-sm" style={{ color: '#4A4A4A' }}>View and organize all your contacts</p>
              </Link>

              <Link
                href="/crm/leads"
                className="rounded-xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #6BCB77 0%, #85D68D 100%)' }}>
                  <span className="text-white text-xl">🎯</span>
                </div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: '#1A1A1A' }}>Leads Pipeline</h3>
                <p className="text-sm" style={{ color: '#4A4A4A' }}>Track opportunities through your sales funnel</p>
              </Link>

              <Link
                href="/crm/activities"
                className="rounded-xl p-6 hover:shadow-md transition-all hover:-translate-y-0.5"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #C4B5FD 100%)' }}>
                  <span className="text-white text-xl">📅</span>
                </div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: '#1A1A1A' }}>Activities</h3>
                <p className="text-sm" style={{ color: '#4A4A4A' }}>Schedule calls, meetings, and follow-ups</p>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
    </CRMAccessWrapper>
  )
}
