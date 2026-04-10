'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Dashboard Components
import DashboardStats from '@/components/dashboard/DashboardStats'
import WelcomeBanner from '@/components/dashboard/WelcomeBanner'
import RecentProjects from '@/components/dashboard/RecentProjects'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import UpcomingTasks from '@/components/dashboard/UpcomingTasks'
import WeatherWidget from '@/components/dashboard/WeatherWidget'
import PunchListWidget from '@/components/dashboard/PunchListWidget'
import BudgetTrackingWidget from '@/components/dashboard/BudgetTrackingWidget'

// Types
interface DashboardStatsData {
  totalProjects: number
  activeProjects: number
  onHoldProjects: number
  completedProjects: number
  tasksCompleted: number
  tasksInProgress: number
  tasksOverdue: number
  completionRate: number
  totalQuoteValue: number
  pendingQuotes: number
  acceptedQuotes: number
  criticalItems: number
  openItems: number
  resolvedItems: number
  storageUsed: number
  storageLimit: number
  photoCount: number
  teamMembers: number
}

interface Project {
  id: string
  name: string
  status: string
  progress: number
  end_date: string
  client?: string
  updated_at: string
}

interface Activity {
  id: string
  action: string
  entity_type: string
  entity_id: string
  metadata: any
  created_at: string
  user_id: string
  user_profiles?: {
    full_name: string
  }
}

interface Task {
  id: string
  title: string
  due_date: string
  priority: string
  status: string
  project_id: string
  projects?: {
    name: string
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [_companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissedWelcome, setDismissedWelcome] = useState(false)

  // Real data states
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [allProjects, setAllProjects] = useState<any[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStatsData | null>(null)

  // Theme handled per child component via useThemeColors()

  // ============================================================================
  // LOAD ALL DATA VIA API
  // ============================================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [recentRes, statsRes] = await Promise.all([
          fetch('/api/dashboard/recent'),
          fetch('/api/dashboard/stats'),
        ])

        if (!recentRes.ok) {
          if (recentRes.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to load dashboard')
        }

        const data = await recentRes.json()
        setUser(data.user)
        setCompanyId(data.companyId)
        setRecentProjects(data.projects)
        setRecentActivities(data.activities)
        setUpcomingTasks(data.tasks)
        setAllProjects(data.allProjects || [])

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setDashboardStats({
            totalProjects: statsData.projects.total,
            activeProjects: statsData.projects.active,
            onHoldProjects: statsData.projects.onHold,
            completedProjects: statsData.projects.completed,
            tasksCompleted: statsData.tasks.completed,
            tasksInProgress: statsData.tasks.inProgress,
            tasksOverdue: statsData.tasks.overdue,
            completionRate: statsData.tasks.completionRate,
            totalQuoteValue: statsData.quotes.totalValue,
            pendingQuotes: statsData.quotes.pending,
            acceptedQuotes: statsData.quotes.accepted,
            criticalItems: statsData.punchItems.critical,
            openItems: statsData.punchItems.open,
            resolvedItems: statsData.punchItems.resolved,
            storageUsed: statsData.storage.used,
            storageLimit: statsData.storage.limit,
            photoCount: statsData.storage.photoCount,
            teamMembers: statsData.team.members,
          })
        }
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, []) // router.push only called on 401, no need to re-run on router change

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  // ============================================================================
  // LOADING STATE - Quality Guide line 48: Skeleton loaders for all widgets
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d0f17] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  const userData = user?.user_metadata || {}
  const userName = userData.full_name?.split(' ')[0] || 'User'

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0d0f17]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Banner */}
        {!dismissedWelcome && (
          <WelcomeBanner
            greeting={getGreeting()}
            userName={userName}
            onDismiss={() => setDismissedWelcome(true)}
          />
        )}

        {/* Dashboard Stats */}
        <div className="mt-8">
          <DashboardStats stats={dashboardStats} />
        </div>

        {/* Main Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Projects */}
            <RecentProjects
              projects={recentProjects}
            />

            {/* Activity Feed */}
            <ActivityFeed
              activities={recentActivities}
            />

            {/* Budget Tracking */}
            <BudgetTrackingWidget projects={allProjects} />
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Upcoming Tasks */}
            <UpcomingTasks
              tasks={upcomingTasks}
            />

            {/* Weather Conditions */}
            <WeatherWidget tasks={[]} />

            {/* Critical Punch Items */}
            <PunchListWidget showAllProjects={true} />
          </div>
        </div>
      </div>
    </div>
  )
}
