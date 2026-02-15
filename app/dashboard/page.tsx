'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useThemeColors } from "@/lib/hooks/useThemeColors"


// Dashboard Components
import DashboardStats from '@/components/dashboard/DashboardStats'
import WelcomeBanner from '@/components/dashboard/WelcomeBanner'
import RecentProjects from '@/components/dashboard/RecentProjects'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import UpcomingTasks from '@/components/dashboard/UpcomingTasks'

// Types
interface Project {
  id: string
  name: string
  status: string
  progress: number
  estimated_end_date: string
  client_name?: string
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
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissedWelcome, setDismissedWelcome] = useState(false)

  // Real data states
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [recentActivities, setRecentActivities] = useState<Activity[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])

  // Theme
  const { colors, darkMode } = useThemeColors()

  // ============================================================================
  // LOAD ALL DATA VIA API
  // ============================================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard/recent')

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login')
            return
          }
          throw new Error('Failed to load dashboard')
        }

        const data = await res.json()

        setUser(data.user)
        setCompanyId(data.companyId)
        setRecentProjects(data.projects)
        setRecentActivities(data.activities)
        setUpcomingTasks(data.tasks)
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router])

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // ============================================================================
  // LOADING STATE
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
          <DashboardStats />
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
          </div>

          {/* Right Column - 1/3 width */}
          <div className="space-y-6">
            {/* Upcoming Tasks */}
            <UpcomingTasks
              tasks={upcomingTasks}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
