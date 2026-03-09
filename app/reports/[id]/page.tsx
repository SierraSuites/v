'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  PaperAirplaneIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline'

interface Report {
  id: string
  report_number: string
  report_type: string
  title: string
  status: string
  date_range_start: string | null
  date_range_end: string | null
  sent_to_client: boolean
  client_viewed: boolean
  created_at: string
  summary: string | null
  sections: any[] | null
  data_snapshot: any | null
  project?: { name: string; id: string } | null
}

const reportTypeLabels: Record<string, string> = {
  daily: 'Daily Progress',
  weekly_timesheet: 'Weekly Timesheet',
  budget: 'Budget Summary',
  safety: 'Safety Report',
  progress: 'Progress Report',
  custom: 'Custom Report',
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  final: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  archived: 'bg-yellow-100 text-yellow-700',
}

export default function ReportDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { loadReport() }, [id])

  async function loadReport() {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('reports')
        .select('*, project:projects(name, id)')
        .eq('id', id)
        .single()

      if (error) { router.push('/reports'); return }
      setReport(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkFinal() {
    if (!report) return
    const { error } = await supabase.from('reports').update({ status: 'final' }).eq('id', id)
    if (!error) setReport({ ...report, status: 'final' })
  }

  async function handleSendToClient() {
    if (!report) return
    if (!confirm('Mark this report as sent to client?')) return
    setSending(true)
    try {
      const { error } = await supabase.from('reports').update({
        status: 'sent',
        sent_to_client: true,
      }).eq('id', id)
      if (!error) setReport({ ...report, status: 'sent', sent_to_client: true })
    } finally {
      setSending(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this report? This cannot be undone.')) return
    setDeleting(true)
    const { error } = await supabase.from('reports').delete().eq('id', id)
    if (!error) router.push('/reports')
    setDeleting(false)
  }

  function handlePrint() {
    window.print()
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  )

  if (!report) return null

  const sections: any[] = report.sections || []
  const data = report.data_snapshot || {}

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/reports" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeftIcon className="w-4 h-4" /> Back to Reports
          </Link>
          <div className="flex items-center gap-2">
            {report.status === 'draft' && (
              <button onClick={handleMarkFinal}
                className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
                <CheckCircleIcon className="w-4 h-4" /> Mark Final
              </button>
            )}
            {!report.sent_to_client && report.status !== 'draft' && (
              <button onClick={handleSendToClient} disabled={sending}
                className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                <PaperAirplaneIcon className="w-4 h-4" /> {sending ? 'Sending...' : 'Send to Client'}
              </button>
            )}
            <button onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
              <DocumentArrowDownIcon className="w-4 h-4" /> Print / PDF
            </button>
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50">
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Report Header Card */}
        <div className="bg-white rounded-xl border p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                  {reportTypeLabels[report.report_type] || report.report_type}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[report.status] || 'bg-gray-100 text-gray-700'}`}>
                  {report.status}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
              {report.project && (
                <Link href={`/projects/${report.project.id}`} className="text-sm text-blue-600 hover:underline mt-1 block">
                  {report.project.name}
                </Link>
              )}
            </div>
            <div className="text-right text-sm text-gray-500">
              <p className="font-medium text-gray-700">#{report.report_number}</p>
              <p>{new Date(report.created_at).toLocaleDateString()}</p>
              {report.date_range_start && (
                <p>{new Date(report.date_range_start).toLocaleDateString()} — {report.date_range_end ? new Date(report.date_range_end).toLocaleDateString() : 'Present'}</p>
              )}
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
            <div className={`flex items-center gap-1.5 text-sm ${report.sent_to_client ? 'text-green-600' : 'text-gray-400'}`}>
              <PaperAirplaneIcon className="w-4 h-4" />
              {report.sent_to_client ? 'Sent to client' : 'Not sent yet'}
            </div>
            <div className={`flex items-center gap-1.5 text-sm ${report.client_viewed ? 'text-green-600' : 'text-gray-400'}`}>
              <EyeIcon className="w-4 h-4" />
              {report.client_viewed ? 'Client viewed' : 'Not viewed'}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-400">
              <ClockIcon className="w-4 h-4" />
              Created {new Date(report.created_at).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Summary */}
        {report.summary && (
          <div className="bg-white rounded-xl border p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-2">Summary</h2>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{report.summary}</p>
          </div>
        )}

        {/* Sections */}
        {sections.length > 0 && (
          <div className="space-y-4">
            {sections.map((section: any, i: number) => (
              <div key={section.id || i} className="bg-white rounded-xl border p-6">
                <h2 className="font-semibold text-gray-900 mb-3">{section.title}</h2>
                {section.type === 'text' && (
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{section.content || section.data?.content}</p>
                )}
                {section.type === 'gallery' && section.data?.photos && (
                  <div className="grid grid-cols-3 gap-3">
                    {section.data.photos.map((photo: any, pi: number) => (
                      <img key={pi} src={photo.url} alt={photo.caption || ''} className="rounded-lg object-cover aspect-video w-full" />
                    ))}
                  </div>
                )}
                {section.type === 'table' && section.data?.rows && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      {section.data.headers && (
                        <thead className="bg-gray-50">
                          <tr>{section.data.headers.map((h: string, hi: number) => (
                            <th key={hi} className="text-left px-3 py-2 text-xs text-gray-500 font-medium">{h}</th>
                          ))}</tr>
                        </thead>
                      )}
                      <tbody>
                        {section.data.rows.map((row: any[], ri: number) => (
                          <tr key={ri} className="border-t">
                            {row.map((cell: any, ci: number) => (
                              <td key={ci} className="px-3 py-2 text-gray-700">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {section.type === 'checklist' && section.data?.items && (
                  <ul className="space-y-2">
                    {section.data.items.map((item: any, ii: number) => (
                      <li key={ii} className="flex items-center gap-2 text-sm">
                        <span className={item.checked ? 'text-green-500' : 'text-gray-300'}>
                          {item.checked ? '✓' : '○'}
                        </span>
                        <span className={item.checked ? 'line-through text-gray-400' : 'text-gray-700'}>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {/* Fallback for unstructured content */}
                {!['text', 'gallery', 'table', 'checklist'].includes(section.type) && (
                  <pre className="text-xs text-gray-600 bg-gray-50 rounded p-3 overflow-auto">
                    {JSON.stringify(section.data || section.content, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Raw data snapshot if no sections */}
        {sections.length === 0 && Object.keys(data).length > 0 && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="font-semibold text-gray-900 mb-3">Report Data</h2>
            <pre className="text-xs text-gray-600 bg-gray-50 rounded p-4 overflow-auto max-h-96">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}

        {sections.length === 0 && Object.keys(data).length === 0 && (
          <div className="bg-white rounded-xl border p-12 text-center">
            <p className="text-gray-400">No content in this report yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
