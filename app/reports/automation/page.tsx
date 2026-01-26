'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Workflow {
  id: string
  name: string
  description: string
  trigger_type: string
  is_active: boolean
  last_run_at: string | null
  last_run_status: string | null
  run_count: number
  success_count: number
  failure_count: number
  next_run_at: string | null
}

export default function AutomationPage() {
  const router = useRouter()
  const supabase = createClient()

  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    loadWorkflows()
  }, [])

  const loadWorkflows = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('report_workflows')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setWorkflows(data || [])
    } catch (error) {
      console.error('Error loading workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleWorkflow = async (id: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('report_workflows')
        .update({ is_active: !currentState })
        .eq('id', id)

      if (error) throw error

      loadWorkflows()
    } catch (error) {
      console.error('Error toggling workflow:', error)
    }
  }

  const deleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return

    try {
      const { error } = await supabase
        .from('report_workflows')
        .delete()
        .eq('id', id)

      if (error) throw error

      loadWorkflows()
    } catch (error) {
      console.error('Error deleting workflow:', error)
    }
  }

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'schedule': return '📅'
      case 'event': return '🔔'
      case 'threshold': return '📊'
      case 'manual': return '👤'
      default: return '⚙️'
    }
  }

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'partial': return 'text-orange-600 bg-orange-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Report Automation</h1>
              <p className="text-sm text-gray-600">Automate report generation and distribution</p>
            </div>

            <button
              onClick={() => router.push('/reports/automation/builder')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Workflow
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Workflows</div>
            <div className="text-3xl font-bold text-gray-900">{workflows.length}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Active</div>
            <div className="text-3xl font-bold text-green-600">
              {workflows.filter(w => w.is_active).length}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Runs</div>
            <div className="text-3xl font-bold text-blue-600">
              {workflows.reduce((sum, w) => sum + w.run_count, 0)}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Success Rate</div>
            <div className="text-3xl font-bold text-purple-600">
              {workflows.reduce((sum, w) => sum + w.run_count, 0) > 0
                ? Math.round((workflows.reduce((sum, w) => sum + w.success_count, 0) / workflows.reduce((sum, w) => sum + w.run_count, 0)) * 100)
                : 0}%
            </div>
          </div>
        </div>

        {/* Workflow Templates */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">📅</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Daily Client Updates</h3>
              <p className="text-sm text-gray-600 mb-4">Send daily progress reports to all active clients at 5 PM</p>
              <button className="text-blue-600 font-medium text-sm hover:text-blue-700">
                Use Template →
              </button>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">⚠️</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Budget Alert System</h3>
              <p className="text-sm text-gray-600 mb-4">Auto-generate budget variance report when projects exceed 90%</p>
              <button className="text-green-600 font-medium text-sm hover:text-green-700">
                Use Template →
              </button>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-lg p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Weekly Compliance Report</h3>
              <p className="text-sm text-gray-600 mb-4">Generate compliance documentation every Friday for safety audits</p>
              <button className="text-purple-600 font-medium text-sm hover:text-purple-700">
                Use Template →
              </button>
            </div>
          </div>
        </div>

        {/* Workflows List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">Your Workflows</h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading workflows...</p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No workflows yet</h3>
              <p className="text-gray-600 mb-6">Create your first automated workflow to save time</p>
              <button
                onClick={() => router.push('/reports/automation/builder')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Your First Workflow
              </button>
            </div>
          ) : (
            <div className="divide-y">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="text-2xl">{getTriggerIcon(workflow.trigger_type)}</div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                          {workflow.description && (
                            <p className="text-sm text-gray-600">{workflow.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                        {/* Status */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Status:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            workflow.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {workflow.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>

                        {/* Last Run */}
                        {workflow.last_run_at && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Last run:</span>
                            <span className="text-gray-900">{formatDate(workflow.last_run_at)}</span>
                            {workflow.last_run_status && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(workflow.last_run_status)}`}>
                                {workflow.last_run_status}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Next Run */}
                        {workflow.next_run_at && workflow.is_active && (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">Next run:</span>
                            <span className="text-blue-600 font-medium">{formatDate(workflow.next_run_at)}</span>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">Runs:</span>
                          <span className="text-gray-900 font-medium">{workflow.run_count}</span>
                          <span className="text-green-600">✓ {workflow.success_count}</span>
                          {workflow.failure_count > 0 && (
                            <span className="text-red-600">✗ {workflow.failure_count}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleWorkflow(workflow.id, workflow.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          workflow.is_active
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                        title={workflow.is_active ? 'Pause' : 'Activate'}
                      >
                        {workflow.is_active ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </button>

                      <button
                        onClick={() => router.push(`/reports/automation/builder?id=${workflow.id}`)}
                        className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => router.push(`/reports/automation/history?workflow=${workflow.id}`)}
                        className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        title="View History"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => deleteWorkflow(workflow.id)}
                        className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
