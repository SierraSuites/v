'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Project {
  id: string
  name: string
  status: string
  completion_percentage?: number
  start_date?: string
  end_date?: string
  task_stats?: { total: number; completed: number; completion_rate: number }
}

export default function ClientPortalProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/client-portal/projects')
      .then(r => r.ok ? r.json() : { projects: [] })
      .then(d => setProjects(d.projects || []))
      .finally(() => setLoading(false))
  }, [])

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-blue-100 text-blue-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
    cancelled: 'bg-red-100 text-red-800',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Projects</h1>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No projects found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {projects.map(project => (
            <div
              key={project.id}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/client-portal/projects/${project.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor[project.status] || 'bg-gray-100 text-gray-800'}`}>
                  {project.status}
                </span>
              </div>

              {project.task_stats && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Progress</span>
                    <span className="font-medium text-gray-900">{project.task_stats.completion_rate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${project.task_stats.completion_rate}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{project.task_stats.completed} of {project.task_stats.total} tasks</p>
                </div>
              )}

              {project.start_date && project.end_date && (
                <p className="text-sm text-gray-500">
                  {new Date(project.start_date).toLocaleDateString()} – {new Date(project.end_date).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
