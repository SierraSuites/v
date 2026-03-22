'use client'

// ============================================================================
// PROJECT TABS COMPONENT
// Tab navigation for project details
// ============================================================================

import { useState } from 'react'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { Users, FileText, DollarSign, Calendar, CheckSquare, BarChart3, GitMerge, HelpCircle } from 'lucide-react'
import ProjectTeamTab from './ProjectTeamTab'
import ProjectDocumentsTab from './ProjectDocumentsTab'
import ProjectBudgetTab from './ProjectBudgetTab'
import ProjectOverviewTab from './ProjectOverviewTab'
import ProjectChangeOrdersTab from './ProjectChangeOrdersTab'
import ProjectRFIsTab from './ProjectRFIsTab'
import ProjectTimelineTab from './ProjectTimelineTab'
import ProjectTasksTab from './ProjectTasksTab'

interface Props {
  project: ProjectDetails
  onSpentChange?: (spent: number) => void
}

type TabId = 'overview' | 'team' | 'documents' | 'budget' | 'timeline' | 'tasks' | 'change-orders' | 'rfis'

export default function ProjectTabs({ project, onSpentChange }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

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
      id: 'timeline' as TabId,
      label: 'Timeline',
      icon: <Calendar className="h-4 w-4" />,
      count: project.milestones.length || null
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
      <div className="border-b border-gray-200 mb-6">
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
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <span className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}>
                  {tab.icon}
                </span>
                {tab.label}
                {tab.count !== null && (
                  <span className={`
                    ml-2 py-0.5 px-2.5 rounded-full text-xs
                    ${isActive
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
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

      {/* Tab Content */}
      <div className="pb-12">
        {activeTab === 'overview' && <ProjectOverviewTab project={project} />}
        {activeTab === 'team' && <ProjectTeamTab project={project} />}
        {activeTab === 'documents' && <ProjectDocumentsTab project={project} />}
        {activeTab === 'budget' && <ProjectBudgetTab project={project} onSpentChange={onSpentChange} />}
        {activeTab === 'timeline' && <ProjectTimelineTab project={project} />}
        {activeTab === 'tasks' && <ProjectTasksTab project={project} />}
        {activeTab === 'change-orders' && <ProjectChangeOrdersTab project={project} />}
        {activeTab === 'rfis' && <ProjectRFIsTab project={project} />}
      </div>
    </div>
  )
}
