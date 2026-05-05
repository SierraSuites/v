'use client'

import { useState } from 'react'
import ProjectHeader from './ProjectHeader'
import ProjectTabs from './ProjectTabs'
import { ProjectDetails } from '@/lib/projects/get-project-details'

export default function ProjectDetailClient({ project }: { project: ProjectDetails }) {
  const [spent, setSpent] = useState(project.spent)

  const liveProject = {
    ...project,
    spent,
    budgetRemaining: project.estimated_budget - spent,
    budgetPercentage: project.estimated_budget > 0 ? (spent / project.estimated_budget) * 100 : 0,
    isOverBudget: spent > project.estimated_budget,
  }

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900">
      <ProjectHeader project={liveProject} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProjectTabs project={liveProject} onSpentChange={setSpent} />
      </div>
    </div>
  )
}
