'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface Lead {
  id: string
  title: string
  contact_id: string | null
  contact: {
    full_name: string
    company: string | null
  } | null
  stage: string
  estimated_value: number | null
  probability: number
  weighted_value: number | null
  expected_close_date: string | null
  next_action: string | null
  next_action_date: string | null
  lead_source: string | null
  is_active: boolean
  created_at: string
}

interface Stage {
  id: string
  name: string
  color: string
  order: number
  leads: Lead[]
}

export default function LeadsPipelinePage() {
  const router = useRouter()
  const supabase = createClient()

  const [stages, setStages] = useState<Stage[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  // Default stages
  const defaultStages = [
    { id: 'new', name: 'New', color: 'bg-gray-100 text-gray-700 border-gray-300', order: 1 },
    { id: 'contacted', name: 'Contacted', color: 'bg-blue-100 text-blue-700 border-blue-300', order: 2 },
    { id: 'qualified', name: 'Qualified', color: 'bg-purple-100 text-purple-700 border-purple-300', order: 3 },
    { id: 'proposal_sent', name: 'Proposal Sent', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', order: 4 },
    { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-100 text-orange-700 border-orange-300', order: 5 },
    { id: 'won', name: 'Won', color: 'bg-green-100 text-green-700 border-green-300', order: 6 },
    { id: 'lost', name: 'Lost', color: 'bg-red-100 text-red-700 border-red-300', order: 7 },
  ]

  useEffect(() => {
    loadLeads()
  }, [])

  useEffect(() => {
    organizeLeadsByStage()
  }, [leads])

  const loadLeads = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('crm_leads')
        .select(`
          *,
          contact:crm_contacts(full_name, company)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      setLeads(data || [])
    } catch (error) {
      console.error('Error loading leads:', error)
    } finally {
      setLoading(false)
    }
  }

  const organizeLeadsByStage = () => {
    const stagesWithLeads = defaultStages.map(stage => ({
      ...stage,
      leads: leads.filter(lead => lead.stage === stage.id)
    }))
    setStages(stagesWithLeads)
  }

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault()

    if (!draggedLead || draggedLead.stage === targetStage) {
      setDraggedLead(null)
      return
    }

    try {
      // Update probability based on stage
      const probabilityMap: Record<string, number> = {
        new: 10,
        contacted: 25,
        qualified: 50,
        proposal_sent: 75,
        negotiation: 90,
        won: 100,
        lost: 0
      }

      const newProbability = probabilityMap[targetStage] || draggedLead.probability

      const { error } = await supabase
        .from('crm_leads')
        .update({
          stage: targetStage,
          probability: newProbability
        })
        .eq('id', draggedLead.id)

      if (error) throw error

      // Update local state
      setLeads(prev => prev.map(lead =>
        lead.id === draggedLead.id
          ? { ...lead, stage: targetStage, probability: newProbability }
          : lead
      ))

      setDraggedLead(null)
    } catch (error) {
      console.error('Error updating lead stage:', error)
      alert('Failed to update lead stage')
    }
  }

  const formatCurrency = (value: number | null) => {
    if (!value) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getTotalValue = (stageLeads: Lead[]) => {
    return stageLeads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0)
  }

  const getWeightedValue = (stageLeads: Lead[]) => {
    return stageLeads.reduce((sum, lead) => sum + (lead.weighted_value || 0), 0)
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
                  <h1 className="text-3xl font-bold text-gray-900">Sales Pipeline</h1>
                  <p className="text-gray-600 mt-1">Track leads through your sales funnel</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('kanban')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Kanban
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
              </div>

              <Link
                href="/crm/leads/new"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Lead
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pipeline Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Total Leads</div>
              <div className="text-2xl">🎯</div>
            </div>
            <div className="text-3xl font-bold text-gray-900">{leads.length}</div>
            <div className="text-sm text-gray-500 mt-1">Active opportunities</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Pipeline Value</div>
              <div className="text-2xl">💰</div>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(leads.reduce((sum, lead) => sum + (lead.estimated_value || 0), 0))}
            </div>
            <div className="text-sm text-gray-500 mt-1">Total estimated value</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Weighted Value</div>
              <div className="text-2xl">📊</div>
            </div>
            <div className="text-3xl font-bold text-purple-600">
              {formatCurrency(leads.reduce((sum, lead) => sum + (lead.weighted_value || 0), 0))}
            </div>
            <div className="text-sm text-gray-500 mt-1">Probability-adjusted</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">Close This Month</div>
              <div className="text-2xl">📅</div>
            </div>
            <div className="text-3xl font-bold text-green-600">
              {leads.filter(lead => {
                if (!lead.expected_close_date) return false
                const closeDate = new Date(lead.expected_close_date)
                const now = new Date()
                return closeDate.getMonth() === now.getMonth() && closeDate.getFullYear() === now.getFullYear()
              }).length}
            </div>
            <div className="text-sm text-gray-500 mt-1">Expected to close</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : viewMode === 'kanban' ? (
          // Kanban View
          <div className="overflow-x-auto pb-4">
            <div className="inline-flex gap-4 min-w-full">
              {stages.filter(stage => stage.id !== 'won' && stage.id !== 'lost').map(stage => (
                <div
                  key={stage.id}
                  className="flex-shrink-0 w-80"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, stage.id)}
                >
                  {/* Stage Header */}
                  <div className={`rounded-t-lg border-2 ${stage.color} p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-lg">{stage.name}</h3>
                      <span className="px-2 py-1 rounded-full text-xs font-bold bg-white bg-opacity-50">
                        {stage.leads.length}
                      </span>
                    </div>
                    <div className="text-sm font-medium">
                      {formatCurrency(getTotalValue(stage.leads))}
                    </div>
                    <div className="text-xs opacity-75">
                      Weighted: {formatCurrency(getWeightedValue(stage.leads))}
                    </div>
                  </div>

                  {/* Stage Content */}
                  <div className="bg-gray-100 rounded-b-lg border-2 border-t-0 border-gray-300 p-4 min-h-[500px] max-h-[calc(100vh-400px)] overflow-y-auto space-y-3">
                    {stage.leads.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">
                        No leads in this stage
                      </div>
                    ) : (
                      stage.leads.map(lead => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead)}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-move hover:shadow-md transition-shadow"
                        >
                          <div className="mb-2">
                            <Link
                              href={`/crm/leads/${lead.id}`}
                              className="font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2"
                            >
                              {lead.title}
                            </Link>
                          </div>

                          {lead.contact && (
                            <div className="text-sm text-gray-600 mb-2">
                              {lead.contact.full_name}
                              {lead.contact.company && (
                                <span className="text-gray-500"> • {lead.contact.company}</span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sm mb-2">
                            <div className="font-semibold text-blue-600">
                              {formatCurrency(lead.estimated_value)}
                            </div>
                            <div className="text-gray-500">
                              {lead.probability}% • {formatCurrency(lead.weighted_value)}
                            </div>
                          </div>

                          {lead.expected_close_date && (
                            <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Close: {formatDate(lead.expected_close_date)}
                            </div>
                          )}

                          {lead.next_action && (
                            <div className="flex items-start gap-1 text-xs text-orange-600 bg-orange-50 rounded p-2">
                              <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="line-clamp-2">{lead.next_action}</div>
                            </div>
                          )}

                          {lead.lead_source && (
                            <div className="mt-2">
                              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                {lead.lead_source}
                              </span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}

              {/* Won/Lost Columns */}
              <div className="flex-shrink-0 w-80 grid grid-cols-1 gap-4">
                {stages.filter(stage => stage.id === 'won' || stage.id === 'lost').map(stage => (
                  <div
                    key={stage.id}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage.id)}
                  >
                    <div className={`rounded-t-lg border-2 ${stage.color} p-4`}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{stage.name}</h3>
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-white bg-opacity-50">
                          {stage.leads.length}
                        </span>
                      </div>
                      <div className="text-sm font-medium">
                        {formatCurrency(getTotalValue(stage.leads))}
                      </div>
                    </div>

                    <div className="bg-gray-100 rounded-b-lg border-2 border-t-0 border-gray-300 p-4 min-h-[200px] max-h-[300px] overflow-y-auto space-y-2">
                      {stage.leads.length === 0 ? (
                        <div className="text-center py-4 text-gray-400 text-sm">
                          No {stage.id} leads
                        </div>
                      ) : (
                        stage.leads.slice(0, 5).map(lead => (
                          <div
                            key={lead.id}
                            className="bg-white rounded p-3 text-sm"
                          >
                            <div className="font-medium text-gray-900 line-clamp-1">{lead.title}</div>
                            <div className="text-blue-600 font-semibold">{formatCurrency(lead.estimated_value)}</div>
                          </div>
                        ))
                      )}
                      {stage.leads.length > 5 && (
                        <div className="text-center text-xs text-gray-500">
                          +{stage.leads.length - 5} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // List View
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">All Leads</h2>
            </div>

            {leads.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No leads yet</h3>
                <p className="text-gray-600 mb-6">Start tracking your sales opportunities</p>
                <Link
                  href="/crm/leads/new"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Your First Lead
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {leads.map(lead => (
                  <div key={lead.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link
                          href={`/crm/leads/${lead.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {lead.title}
                        </Link>

                        {lead.contact && (
                          <p className="text-sm text-gray-600 mt-1">
                            {lead.contact.full_name}
                            {lead.contact.company && ` • ${lead.contact.company}`}
                          </p>
                        )}

                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className={`px-3 py-1 rounded-full font-medium border-2 ${
                            defaultStages.find(s => s.id === lead.stage)?.color || 'bg-gray-100 text-gray-700 border-gray-300'
                          }`}>
                            {defaultStages.find(s => s.id === lead.stage)?.name || lead.stage}
                          </span>

                          <span className="text-blue-600 font-semibold">
                            {formatCurrency(lead.estimated_value)}
                          </span>

                          <span className="text-gray-500">
                            {lead.probability}% probability
                          </span>

                          {lead.expected_close_date && (
                            <span className="text-gray-500">
                              Close: {formatDate(lead.expected_close_date)}
                            </span>
                          )}
                        </div>

                        {lead.next_action && (
                          <div className="mt-2 text-sm text-orange-600">
                            Next: {lead.next_action}
                          </div>
                        )}
                      </div>

                      <Link
                        href={`/crm/leads/${lead.id}`}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
