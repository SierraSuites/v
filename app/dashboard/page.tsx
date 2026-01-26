'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

  // Loading states for each section
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [loadingActivities, setLoadingActivities] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(true)

  // Error states
  const [projectsError, setProjectsError] = useState<string | null>(null)
  const [activitiesError, setActivitiesError] = useState<string | null>(null)
  const [tasksError, setTasksError] = useState<string | null>(null)

  // ============================================================================
  // AUTHENTICATION & INITIALIZATION
  // ============================================================================

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push('/login')
        return
      }

      // Get user's company_id
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', session.user.id)
        .single()

      setUser(session.user)
      setCompanyId(profile?.company_id || null)
      setLoading(false)
    }

    loadUser()
  }, [router])

  // ============================================================================
  // LOAD REAL DATA
  // ============================================================================

  useEffect(() => {
    if (!user || !companyId) return

    loadRecentProjects()
    loadRecentActivities()
    loadUpcomingTasks()
  }, [user, companyId])

  /**
   * Load recent projects from database
   * Shows 5 most recently updated projects
   */
  const loadRecentProjects = async () => {
    try {
      setLoadingProjects(true)
      setProjectsError(null)

      const supabase = createClient()
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, progress, estimated_end_date, client_name, updated_at')
        .eq('company_id', companyId)
        .order('updated_at', { ascending: false })
        .limit(5)

      if (error) throw error

      setRecentProjects(data || [])
    } catch (error) {
      console.error('Error loading projects:', error)
      setProjectsError('Failed to load projects')
      setRecentProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  /**
   * Load recent activities from database
   * Shows 10 most recent activities for the company
   */
  const loadRecentActivities = async () => {
    try {
      setLoadingActivities(true)
      setActivitiesError(null)

      const supabase = createClient()
      const { data, error } = await supabase
        .from('activities')
        .select(`
          id,
          action,
          entity_type,
          entity_id,
          metadata,
          created_at,
          user_id,
          user_profiles (
            full_name
          )
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      // Transform the data to match Activity type (user_profiles is returned as array but we need object)
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        user_profiles: Array.isArray(item.user_profiles) ? item.user_profiles[0] : item.user_profiles
      })) as Activity[]
      setRecentActivities(transformedData)
    } catch (error) {
      console.error('Error loading activities:', error)
      setActivitiesError('Failed to load activity feed')
      setRecentActivities([])
    } finally {
      setLoadingActivities(false)
    }
  }

  /**
   * Load upcoming tasks from database
   * Shows tasks due in next 7 days, ordered by priority and due date
   */
  const loadUpcomingTasks = async () => {
    try {
      setLoadingTasks(true)
      setTasksError(null)

      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          due_date,
          priority,
          status,
          project_id,
          projects (
            name
          )
        `)
        .eq('company_id', companyId)
        .neq('status', 'completed')
        .gte('due_date', today)
        .lte('due_date', nextWeek)
        .order('priority', { ascending: false }) // high priority first
        .order('due_date', { ascending: true })
        .limit(6)

      if (error) throw error

      // Transform the data to match Task type (projects is returned as array but we need object)
      const transformedData = (data || []).map((item: any) => ({
        ...item,
        projects: Array.isArray(item.projects) ? item.projects[0] : item.projects
      })) as Task[]
      setUpcomingTasks(transformedData)
    } catch (error) {
      console.error('Error loading tasks:', error)
      setTasksError('Failed to load upcoming tasks')
      setUpcomingTasks([])
    } finally {
      setLoadingTasks(false)
    }
  }

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
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
