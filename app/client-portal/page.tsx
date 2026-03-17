'use client'

/**
 * Client Portal Dashboard
 * Main landing page for clients to view their projects
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  HomeIcon,
  DocumentTextIcon,
  CreditCardIcon,
  PhotoIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline'

interface Project {
  id: string
  name: string
  status: string
  completion_percentage?: number
  budget?: number
  spent?: number
  start_date?: string
  end_date?: string
  task_stats?: {
    total: number
    completed: number
    completion_rate: number
  }
}

interface InvoiceSummary {
  total: number
  paid: number
  pending: number
  overdue: number
  total_outstanding: number
}

export default function ClientPortalPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  async function loadDashboardData() {
    try {
      setLoading(true)

      // Load projects
      const projectsRes = await fetch('/api/client-portal/projects')
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json()
        setProjects(projectsData.projects || [])
      }

      // Load invoice summary
      const invoicesRes = await fetch('/api/client-portal/invoices')
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json()
        setInvoiceSummary(invoicesData.summary)
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const activeProjects = projects.filter(p => p.status === 'active')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Client Portal</h1>
              <p className="mt-1 text-sm text-gray-500">
                Track your projects, invoices, and communicate with your contractor
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/client-portal/messages"
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ChatBubbleLeftRightIcon className="w-5 h-5" />
                Messages
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/client-portal/projects"
                className="bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <HomeIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">My Projects</p>
                    <p className="text-2xl font-bold text-gray-900">{activeProjects.length}</p>
                    <p className="text-xs text-gray-500">Active</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/client-portal/invoices"
                className="bg-white p-6 rounded-xl border border-gray-200 hover:border-green-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <CreditCardIcon className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Invoices</p>
                    <p className="text-2xl font-bold text-gray-900">{invoiceSummary?.pending || 0}</p>
                    <p className="text-xs text-gray-500">Pending Payment</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/client-portal/documents"
                className="bg-white p-6 rounded-xl border border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <DocumentTextIcon className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Documents</p>
                    <p className="text-2xl font-bold text-gray-900">View All</p>
                    <p className="text-xs text-gray-500">Contracts & Files</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* Outstanding Balance Alert */}
            {invoiceSummary && invoiceSummary.total_outstanding > 0 && (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <CreditCardIcon className="w-6 h-6 text-yellow-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">Outstanding Balance</p>
                    <p className="text-xs text-yellow-700">
                      You have {invoiceSummary.pending} invoice{invoiceSummary.pending !== 1 ? 's' : ''} pending
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-yellow-900">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                      }).format(invoiceSummary.total_outstanding)}
                    </p>
                    <Link
                      href="/client-portal/invoices"
                      className="text-sm text-yellow-700 hover:text-yellow-900 underline"
                    >
                      Pay Now
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Active Projects */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Active Projects</h2>
                <Link
                  href="/client-portal/projects"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  View All →
                </Link>
              </div>

              {activeProjects.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <HomeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No Active Projects</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    You don't have any active projects at the moment.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeProjects.slice(0, 4).map((project) => (
                    <div
                      key={project.id}
                      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => router.push(`/client-portal/projects/${project.id}`)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                            {project.status}
                          </span>
                        </div>
                      </div>

                      {project.task_stats && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-500">Progress</span>
                            <span className="font-medium text-gray-900">
                              {project.task_stats.completion_rate}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all"
                              style={{ width: `${project.task_stats.completion_rate}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {project.task_stats.completed} of {project.task_stats.total} tasks completed
                          </p>
                        </div>
                      )}

                      {project.start_date && project.end_date && (
                        <div className="text-sm text-gray-500">
                          <p>
                            {new Date(project.start_date).toLocaleDateString()} -{' '}
                            {new Date(project.end_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/client-portal/photos"
                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <PhotoIcon className="w-8 h-8 text-gray-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Photos</h3>
                <p className="text-sm text-gray-500">View progress photos and updates</p>
              </Link>

              <Link
                href="/client-portal/change-orders"
                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <ClipboardDocumentListIcon className="w-8 h-8 text-gray-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Change Orders</h3>
                <p className="text-sm text-gray-500">View and request changes</p>
              </Link>

              <Link
                href="/client-portal/messages"
                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-gray-600 mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Messages</h3>
                <p className="text-sm text-gray-500">Communicate with your contractor</p>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
