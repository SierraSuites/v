'use client'

// ============================================================================
// PROJECT TABS COMPONENT
// Tab navigation for project details
// ============================================================================

import { useState, useCallback } from 'react'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { Users, FileText, DollarSign, Calendar, CheckSquare, BarChart3, GitMerge, HelpCircle, Palette } from 'lucide-react'
import ProjectTeamTab from './ProjectTeamTab'
import ProjectDocumentsTab from './ProjectDocumentsTab'
import ProjectBudgetTab from './ProjectBudgetTab'
import ProjectOverviewTab from './ProjectOverviewTab'
import ProjectChangeOrdersTab from './ProjectChangeOrdersTab'
import ProjectRFIsTab from './ProjectRFIsTab'
import ProjectTimelineTab from './ProjectTimelineTab'
import ProjectTasksTab from './ProjectTasksTab'
import ProjectDesignSelectionsTab from './ProjectDesignSelectionsTab'

interface Props {
  project: ProjectDetails
  onSpentChange?: (spent: number) => void
}

type TabId = 'overview' | 'tasks' | 'design-selections' | 'timeline' | 'budget' | 'documents' | 'team' | 'change-orders' | 'rfis'

export default function ProjectTabs({ project, onSpentChange }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [milestoneCount, setMilestoneCount] = useState(project.milestones.length)
  const [refreshKey, setRefreshKey] = useState(0)
  const bumpRefresh = useCallback(() => setRefreshKey(k => k + 1), [])

  const tabs = [
    {
      id: 'overview' as TabId,
      label: 'Overview',
      icon: <BarChart3 className="h-4 w-4" />,
      count: null
    },
    {
      id: 'tasks' as TabId,
      label: 'Tasks',
      icon: <CheckSquare className="h-4 w-4" />,
      count: null
    },
    {
      id: 'design-selections' as TabId,
      label: 'Design Selections',
      icon: <Palette className="h-4 w-4" />,
      count: project.designSelections?.filter(s => s.status === 'pending').length || null
    },
    {
      id: 'timeline' as TabId,
      label: 'Timeline',
      icon: <Calendar className="h-4 w-4" />,
      count: milestoneCount || null
    },
    {
      id: 'budget' as TabId,
      label: 'Budget',
      icon: <DollarSign className="h-4 w-4" />,
      count: null
    },
    {
      id: 'documents' as TabId,
      label: 'Documents',
      icon: <FileText className="h-4 w-4" />,
      count: project.documents.length
    },
    {
      id: 'team' as TabId,
      label: 'Team',
      icon: <Users className="h-4 w-4" />,
      count: project.teamMembers.length
    },
    {
      id: 'change-orders' as TabId,
      label: 'Change Orders',
      icon: <GitMerge className="h-4 w-4" />,
      count: null
    },
    {
      id: 'rfis' as TabId,
      label: 'RFIs',
      icon: <HelpCircle className="h-4 w-4" />,
      count: null
    }
  ]

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm whitespace-nowrap
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                  }
                `}
              >
                <span className={isActive ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-300'}>
                  {tab.icon}
                </span>
                {tab.label}
                {tab.count !== null && (
                  <span className={`
                    ml-2 py-0.5 px-2.5 rounded-full text-xs
                    ${isActive
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content — all tabs mount immediately so background fetches run in parallel */}
      <div className="pb-12">
        <div className={activeTab === 'overview' ? '' : 'hidden'}><ProjectOverviewTab project={project} refreshKey={refreshKey} /></div>
        <div className={activeTab === 'tasks' ? '' : 'hidden'}><ProjectTasksTab project={project} refreshKey={refreshKey} onMutate={bumpRefresh} /></div>
        <div className={activeTab === 'design-selections' ? '' : 'hidden'}><ProjectDesignSelectionsTab project={project} refreshKey={refreshKey} onMutate={bumpRefresh} /></div>
        <div className={activeTab === 'timeline' ? '' : 'hidden'}><ProjectTimelineTab project={project} refreshKey={refreshKey} onMutate={bumpRefresh} onMilestoneCountChange={setMilestoneCount} /></div>
        <div className={activeTab === 'budget' ? '' : 'hidden'}><ProjectBudgetTab project={project} refreshKey={refreshKey} onMutate={bumpRefresh} onSpentChange={onSpentChange} /></div>
        <div className={activeTab === 'documents' ? '' : 'hidden'}><ProjectDocumentsTab project={project} refreshKey={refreshKey} /></div>
        <div className={activeTab === 'team' ? '' : 'hidden'}><ProjectTeamTab project={project} /></div>
        <div className={activeTab === 'change-orders' ? '' : 'hidden'}><ProjectChangeOrdersTab project={project} refreshKey={refreshKey} onMutate={bumpRefresh} /></div>
        <div className={activeTab === 'rfis' ? '' : 'hidden'}><ProjectRFIsTab project={project} refreshKey={refreshKey} onMutate={bumpRefresh} /></div>
      </div>
    </div>
  )
}
