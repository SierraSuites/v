// ============================================================================
// PROJECT DETAIL PAGE
// Complete project management interface with tabs
// ============================================================================

import { notFound } from 'next/navigation'
import { getProjectDetails } from '@/lib/projects/get-project-details'
import ProjectHeader from '@/components/projects/ProjectHeader'
import ProjectTabs from '@/components/projects/ProjectTabs'

interface Props {
  params: {
    id: string
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { data: project, error } = await getProjectDetails(params.id)

  if (error || !project) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Project Header */}
      <ProjectHeader project={project} />

      {/* Main Content with Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProjectTabs project={project} />
      </div>
    </div>
  )
}
