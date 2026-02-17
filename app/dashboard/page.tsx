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

  // ============================================================================
  // LOADING STATE - Quality Guide line 48: Skeleton loaders for all widgets
  // ============================================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Welcome Banner Skeleton */}
          <div className="bg-gray-200 rounded-lg h-40 animate-pulse mb-8" />

          {/* Stats Grid Skeleton - Quality Guide lines 511-523 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-xl border bg-white p-6 animate-pulse">
                <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>

          {/* Main Grid Skeleton */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Projects Skeleton */}
              <div className="bg-white rounded-xl border p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
              {/* Activity Skeleton */}
              <div className="bg-white rounded-xl border p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3 mb-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-gray-200 rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-6">
              {/* Tasks Skeleton */}
              <div className="bg-white rounded-xl border p-6 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-1/2 mb-4" />
                {[1, 2, 3].map(i => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3 mb-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          </div>
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
    <div className="min-h-screen bg-gray-50">
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
