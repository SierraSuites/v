export const dynamic = 'force-dynamic'

// ============================================================================
// PROJECT DETAIL PAGE
// Complete project management interface with tabs
// ============================================================================

import { notFound } from 'next/navigation'
import { getProjectDetails } from '@/lib/projects/get-project-details'
import ProjectDetailClient from '@/components/projects/ProjectDetailClient'

interface Props {
  params: Promise<{
    id: string
  }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const { data: project, error } = await getProjectDetails(id)

  if (error || !project) {
    notFound()
  }

  return <ProjectDetailClient project={project} />
}
