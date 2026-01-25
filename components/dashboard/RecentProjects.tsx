'use client'

import Link from 'next/link'

interface Project {
  id: number
  name: string
  status: string
  progress: number
  dueDate: string
  client: string
}

interface RecentProjectsProps {
  projects: Project[]
}

export default function RecentProjects({ projects }: RecentProjectsProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'on-hold':
        return 'bg-orange-100 text-orange-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
        <Link
          href="/projects"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All →
        </Link>
      </div>

      <div className="space-y-4">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">No projects yet</p>
            <Link
              href="/projects"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Create your first project →
            </Link>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium text-gray-900 hover:text-blue-600"
                  >
                    {project.name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">{project.client}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    project.status
                  )}`}
                >
                  {project.status}
                </span>
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="ml-4 text-right">
                  <p className="text-xs text-gray-500">Due Date</p>
                  <p className="text-xs font-medium text-gray-900">{project.dueDate}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
