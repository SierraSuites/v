'use client'

// ============================================================================
// PROJECT TABS COMPONENT
// Tab navigation for project details
// ============================================================================

import { useState } from 'react'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { Users, FileText, DollarSign, Calendar, CheckSquare, BarChart3 } from 'lucide-react'
import ProjectTeamTab from './ProjectTeamTab'
import ProjectDocumentsTab from './ProjectDocumentsTab'
import ProjectBudgetTab from './ProjectBudgetTab'
import ProjectOverviewTab from './ProjectOverviewTab'

interface Props {
  project: ProjectDetails
}

type TabId = 'overview' | 'team' | 'documents' | 'budget' | 'timeline' | 'tasks'

export default function ProjectTabs({ project }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const tabs = [
    {
      id: 'overview' as TabId,
      label: 'Overview',
      icon: <BarChart3 className="h-4 w-4" />,
      count: null
    },
    {
      id: 'team' as TabId,
      label: 'Team',
      icon: <Users className="h-4 w-4" />,
      count: project.teamMembers.length
    },
    {
      id: 'documents' as TabId,
      label: 'Documents',
      icon: <FileText className="h-4 w-4" />,
      count: project.documents.length
    },
    {
      id: 'budget' as TabId,
      label: 'Budget',
      icon: <DollarSign className="h-4 w-4" />,
      count: null
    },
    {
      id: 'timeline' as TabId,
      label: 'Timeline',
      icon: <Calendar className="h-4 w-4" />,
      count: project.milestones.length
    },
    {
      id: 'tasks' as TabId,
      label: 'Tasks',
      icon: <CheckSquare className="h-4 w-4" />,
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
        {activeTab === 'budget' && <ProjectBudgetTab project={project} />}
        {activeTab === 'timeline' && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Timeline Coming Soon</h3>
            <p className="text-gray-600">Milestones and project timeline visualization will be available soon.</p>
          </div>
        )}
        {activeTab === 'tasks' && (
          <div className="bg-white rounded-lg border p-8 text-center">
            <CheckSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tasks Coming Soon</h3>
            <p className="text-gray-600">Project tasks will be integrated with TaskFlow module soon.</p>
          </div>
        )}
      </div>
    </div>
  )
}
