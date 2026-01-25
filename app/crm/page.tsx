'use client'

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
    negotiation: 'bg-orange-100 text-orange-700',
    won: 'bg-green-100 text-green-700',
    lost: 'bg-red-100 text-red-700',
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
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Active Leads</div>
                  <div className="text-2xl">🎯</div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{metrics?.total_leads || 0}</div>
                <div className="text-sm text-green-600 mt-1">Pipeline value: {formatCurrency(metrics?.total_value || 0)}</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Weighted Value</div>
                  <div className="text-2xl">💰</div>
                </div>
                <div className="text-3xl font-bold text-blue-600">{formatCurrency(metrics?.weighted_value || 0)}</div>
                <div className="text-sm text-gray-500 mt-1">Probability-adjusted</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Avg Deal Size</div>
                  <div className="text-2xl">📊</div>
                </div>
                <div className="text-3xl font-bold text-purple-600">{formatCurrency(metrics?.avg_deal_size || 0)}</div>
                <div className="text-sm text-gray-500 mt-1">Per opportunity</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">Win Rate</div>
                  <div className="text-2xl">🏆</div>
                </div>
                <div className="text-3xl font-bold text-green-600">
                  {((metrics?.win_rate || 0) * 100).toFixed(0)}%
                </div>
                <div className="text-sm text-gray-500 mt-1">Closed deals</div>
              </div>
            </div>

            {/* Pipeline Funnel */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Sales Pipeline</h2>
                <Link href="/crm/leads" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View All →
                </Link>
              </div>

              <div className="p-6">
                {pipelineData.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎯</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No active leads yet</h3>
                    <p className="text-gray-600 mb-6">Start by adding your first lead to track opportunities</p>
                    <Link
                      href="/crm/leads/new"
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-block"
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

                      return (
                        <div key={stage.stage}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${stageColors[stage.stage] || 'bg-gray-100 text-gray-700'}`}>
                                {stage.stage.replace('_', ' ').toUpperCase()}
                              </span>
                              <span className="text-sm text-gray-600">
                                {stage.count} {stage.count === 1 ? 'lead' : 'leads'}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-gray-900">
                              {formatCurrency(stage.value)}
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${percentage}%` }}
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
              {/* Upcoming Activities */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Upcoming Activities</h2>
                  <Link href="/crm/activities" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View All →
                  </Link>
                </div>

                <div className="divide-y">
                  {upcomingActivities.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                      <div className="text-4xl mb-2">📅</div>
                      <p>No upcoming activities</p>
                    </div>
                  ) : (
                    upcomingActivities.map((activity) => (
                      <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{getActivityIcon(activity.activity_type)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900">{activity.subject}</div>
                            <div className="text-sm text-gray-600">
                              {activity.contact?.full_name || 'No contact'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {formatDate(activity.scheduled_date)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Recent Contacts */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Contacts</h2>
                  <Link href="/crm/contacts" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    View All →
                  </Link>
                </div>

                <div className="divide-y">
                  {recentContacts.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
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
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{contact.full_name}</div>
                            {contact.company && (
                              <div className="text-sm text-gray-600">{contact.company}</div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">
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

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/crm/contacts"
                className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-3xl mb-3">👥</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Contacts</h3>
                <p className="text-sm text-gray-600">View and organize all your contacts</p>
              </Link>

              <Link
                href="/crm/leads"
                className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-3xl mb-3">🎯</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Leads Pipeline</h3>
                <p className="text-sm text-gray-600">Track opportunities through your sales funnel</p>
              </Link>

              <Link
                href="/crm/activities"
                className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <div className="text-3xl mb-3">📅</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Activities</h3>
                <p className="text-sm text-gray-600">Schedule calls, meetings, and follow-ups</p>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
    </CRMAccessWrapper>
  )
}
