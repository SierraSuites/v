"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useThemeColors } from "@/lib/hooks/useThemeColors"
import ProjectCreationModal from "@/components/dashboard/ProjectCreationModal"
import { useToast } from "@/components/ToastNotification"
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  toggleFavoriteProject,
  subscribeToProjects,
  unsubscribeChannel,
  type Project as SupabaseProject
} from "@/lib/supabase/projects"
import { getTeamMembersForProjects, type TeamMember } from "@/lib/supabase/project-helpers"

// Navigation item type
type NavItem = {
  name: string
  href: string
  icon: string
  badge?: string
  locked?: boolean
  subItems?: { name: string; href: string }[]
}

// Project type definition
type Project = {
  id: string
  name: string
  client: string
  address: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  type: "residential" | "commercial" | "industrial" | "infrastructure" | "renovation"
  description?: string
  status: "planning" | "active" | "on-hold" | "completed" | "cancelled"
  progress: number
  startDate: string
  endDate: string
  budget: number
  spent: number
  estimatedBudget?: number
  currency?: string
  phases?: { name: string; startDate: string; endDate: string }[]
  projectManagerId?: string
  teamMembers: TeamMember[]
  equipment?: string[]
  certificationsRequired?: string[]
  documentCategories?: string[]
  notificationSettings?: {
    emailUpdates: boolean
    milestoneAlerts: boolean
    budgetAlerts: boolean
    teamNotifications: boolean
  }
  clientVisibility?: boolean
  lastActivity: string
  thumbnail?: string
  isFavorite: boolean
  createdAt?: string
  updatedAt?: string
}

export default function ProjectsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
  // const { colors } = useThemeColors()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState("newest")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  // const [darkMode, setDarkMode] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedNav, setExpandedNav] = useState<string | null>(null)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  // Theme
  const { colors, darkMode } = useThemeColors()

  // User plan (for tier-based limits)
  const [userPlan, setUserPlan] = useState<"starter" | "professional" | "enterprise">(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('userPlan') as "starter" | "professional" | "enterprise") || 'professional'
    }
    return 'professional'
  })

  // User data
  const userData = {
    full_name: user?.user_metadata?.full_name || "John Doe",
    company_name: user?.user_metadata?.company_name || "Demo Construction Co.",
  }

  // Navigation items
  const navigationItems: NavItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: "📊"
    },
    {
      name: "Projects",
      href: "/projects",
      icon: "🏗️"
    },
    {
      name: "TaskFlow",
      href: "/taskflow",
      icon: "✅"
    },
    {
      name: "FieldSnap",
      href: "/fieldsnap",
      icon: "📸"
    },
    {
      name: "QuoteHub",
      href: "/quotehub",
      icon: "💰"
    },
    {
      name: "ReportCenter",
      href: "/reportcenter",
      icon: "📊"
    },
    {
      name: "CRM",
      href: "/crm",
      icon: "🤝",
      badge: "Pro",
      locked: userPlan === "starter"
    },
    {
      name: "Proposals",
      href: "/proposals",
      icon: "📄",
      badge: "Pro",
      locked: userPlan === "starter"
    },
    {
      name: "Subcontractors",
      href: "/subcontractors",
      icon: "🔧",
      badge: "Enterprise",
      locked: userPlan !== "enterprise"
    },
    {
      name: "Advanced CRM",
      href: "/advanced-crm",
      icon: "📈",
      badge: "Enterprise",
      locked: userPlan !== "enterprise"
    },
    {
      name: "AI Proposals",
      href: "/ai-proposals",
      icon: "🤖",
      badge: "Enterprise",
      locked: userPlan !== "enterprise"
    },
  ]

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const toggleNav = (name: string) => {
    setExpandedNav(expandedNav === name ? null : name)
  }

  // Handle project save (create/update)
  const handleSaveProject = async (projectData: any) => {
    console.log('handleSaveProject called with projectData:', projectData)
    console.log('projectData keys:', Object.keys(projectData))
    console.log('projectData type:', typeof projectData)

    if (editingProject) {
      // Update existing project
      const updates = {
        name: projectData.name,
        client: projectData.client,
        address: projectData.address,
        city: projectData.city,
        state: projectData.state,
        zip_code: projectData.zipCode,
        country: projectData.country,
        type: projectData.type,
        description: projectData.description,
        status: projectData.status,
        start_date: projectData.startDate,
        end_date: projectData.endDate,
        estimated_budget: projectData.estimatedBudget,
        currency: projectData.currency,
        equipment: projectData.equipment,
        certifications_required: projectData.certificationsRequired,
        document_categories: projectData.documentCategories,
        notification_settings: projectData.notificationSettings,
        client_visibility: projectData.clientVisibility
      }

      const { data, error } = await updateProject(editingProject.id, updates)

      if (error) {
        toast.error(`Failed to update project: ${error.message}`)
        return
      }

      // Optimistic update
      setProjects(prev => prev.map(p =>
        p.id === editingProject.id ? convertSupabaseProject(data!) : p
      ))
      toast.success(`Project "${projectData.name}" updated successfully`)
      setEditingProject(null)
    } else {
      // Validate required fields before submitting
      if (!projectData.name || !projectData.client || !projectData.address || !projectData.startDate || !projectData.endDate) {
        toast.error('Please fill in all required fields: Name, Client, Address, Start Date, and End Date')
        console.error('Missing required fields:', {
          name: projectData.name,
          client: projectData.client,
          address: projectData.address,
          startDate: projectData.startDate,
          endDate: projectData.endDate
        })
        return
      }

      // Create new project
      const newProjectData = {
        name: projectData.name,
        client: projectData.client,
        address: projectData.address,
        city: projectData.city || null,
        state: projectData.state || null,
        zip_code: projectData.zipCode || null,
        country: projectData.country || 'US',
        type: projectData.type || 'residential' as const,
        description: projectData.description || null,
        status: projectData.status || 'planning' as const,
        start_date: projectData.startDate, // Don't use fallback - validation ensures it exists
        end_date: projectData.endDate, // Don't use fallback - validation ensures it exists
        estimated_budget: projectData.estimatedBudget || 0,
        currency: projectData.currency || 'USD',
        equipment: projectData.equipment || [],
        certifications_required: projectData.certificationsRequired || [],
        document_categories: projectData.documentCategories || [],
        notification_settings: projectData.notificationSettings || {
          emailUpdates: true,
          milestoneAlerts: true,
          budgetAlerts: true,
          teamNotifications: true
        },
        client_visibility: projectData.clientVisibility || false,
        is_favorite: false,
        thumbnail: null,
        project_manager_id: null
      }

      console.log('Creating project with data:', newProjectData)

      const { data, error } = await createProject(newProjectData)

      if (error) {
        console.error('Project creation failed with error:', error)
        toast.error(`Failed to create project: ${error.message}`)
        return
      }

      // Add to local state
      setProjects(prev => [convertSupabaseProject(data!), ...prev])
      toast.success(`Project "${projectData.name}" created successfully`)
    }
    setShowCreateModal(false)
  }

  // Convert Supabase project to local Project type
  const convertSupabaseProject = (supabaseProject: SupabaseProject): Project => {
    return {
      id: supabaseProject.id,
      name: supabaseProject.name,
      client: supabaseProject.client,
      address: supabaseProject.address,
      city: supabaseProject.city || undefined,
      state: supabaseProject.state || undefined,
      zipCode: supabaseProject.zip_code || undefined,
      country: supabaseProject.country,
      type: supabaseProject.type,
      description: supabaseProject.description || undefined,
      status: supabaseProject.status,
      progress: supabaseProject.progress,
      startDate: supabaseProject.start_date,
      endDate: supabaseProject.end_date,
      budget: supabaseProject.estimated_budget,
      spent: supabaseProject.spent,
      estimatedBudget: supabaseProject.estimated_budget,
      currency: supabaseProject.currency,
      equipment: supabaseProject.equipment,
      certificationsRequired: supabaseProject.certifications_required,
      documentCategories: supabaseProject.document_categories,
      notificationSettings: supabaseProject.notification_settings,
      clientVisibility: supabaseProject.client_visibility,
      teamMembers: [], // Will be populated from project_members table
      lastActivity: getRelativeTime(supabaseProject.updated_at),
      isFavorite: supabaseProject.is_favorite,
      thumbnail: supabaseProject.thumbnail || undefined,
      createdAt: supabaseProject.created_at,
      updatedAt: supabaseProject.updated_at
    }
  }

  // Helper function to get relative time
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  // Handle favorite toggle
  const handleToggleFavorite = async (projectId: string, currentFavorite: boolean) => {
    // Optimistic update
    setProjects(prev => prev.map(p =>
      p.id === projectId ? { ...p, isFavorite: !currentFavorite } : p
    ))

    const { error } = await toggleFavoriteProject(projectId, !currentFavorite)

    if (error) {
      // Revert on error
      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, isFavorite: currentFavorite } : p
      ))
      toast.error("Failed to update favorite status")
    }
  }

  // Handle delete project
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteProject = async () => {
    if (!deleteConfirm) return
    setDeleting(true)

    // Optimistic update
    setProjects(prev => prev.filter(p => p.id !== deleteConfirm.id))
    const { id, name } = deleteConfirm
    setDeleteConfirm(null)

    const { error } = await deleteProject(id)

    if (error) {
      const { data } = await getProjects()
      if (data) setProjects(data.map(convertSupabaseProject))
      toast.error("Failed to delete project")
    } else {
      toast.success(`Project "${name}" deleted successfully`)
    }
    setDeleting(false)
  }

  // Project limits by tier
  const projectLimits = {
    starter: 3,
    professional: 50,
    enterprise: Infinity
  }

  // Projects data
  const [projects, setProjects] = useState<Project[]>([])



  // Set up real-time subscriptions for projects
  useEffect(() => {
    const channel = subscribeToProjects((payload) => {
      console.log('Project change received:', payload)

      if (payload.eventType === 'INSERT') {
        // New project created (by another user/tab)
        const newProject = convertSupabaseProject(payload.new as SupabaseProject)
        setProjects(prev => {
          // Avoid duplicates
          if (prev.some(p => p.id === newProject.id)) return prev
          return [newProject, ...prev]
        })
      } else if (payload.eventType === 'UPDATE') {
        // Project updated
        const updatedProject = convertSupabaseProject(payload.new as SupabaseProject)
        setProjects(prev => prev.map(p =>
          p.id === updatedProject.id ? updatedProject : p
        ))
      } else if (payload.eventType === 'DELETE') {
        // Project deleted
        setProjects(prev => prev.filter(p => p.id !== payload.old.id))
      }
    })

    // Cleanup subscription on unmount
    return () => {
      unsubscribeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const loadAll = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setUser(session.user)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('plan')
          .eq('id', session.user.id)
          .single()

        if (profile?.plan) {
          setUserPlan(profile.plan as "starter" | "professional" | "enterprise")
          localStorage.setItem('userPlan', profile.plan)
        }
      } else {
        setUser({ user_metadata: { full_name: "John Doe" } })
      }

      // Load projects before revealing the page
      const { data, error } = await getProjects()
      if (error) {
        console.error("Error loading projects:", error)
        toast.error("Failed to load projects")
      } else if (data) {
        const convertedProjects = data.map(convertSupabaseProject)
        const projectIds = convertedProjects.map(p => p.id)
        const teamMembersMap = await getTeamMembersForProjects(projectIds)
        setProjects(convertedProjects.map(project => ({
          ...project,
          teamMembers: teamMembersMap[project.id] || []
        })))
      }

      setLoading(false)
    }
    loadAll()
  }, [])

  // Sync URL params to filter state
  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowCreateModal(true)
    }
    const status = searchParams.get('status')
    setStatusFilter(status || "all")
  }, [searchParams])

  // Filter and sort projects
  const filteredProjects = projects
    .filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           project.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           project.address.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || project.status === statusFilter
      const matchesType = typeFilter === "all" || project.type === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        case "oldest": return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        case "name": return a.name.localeCompare(b.name)
        case "progress": return b.progress - a.progress
        default: return 0
      }
    })

  // Calculate stats
  const stats = {
    total: projects.length,
    active: projects.filter(p => p.status === "active").length,
    planning: projects.filter(p => p.status === "planning").length,
    onHold: projects.filter(p => p.status === "on-hold").length,
    completed: projects.filter(p => p.status === "completed").length,
    overdue: projects.filter(p => p.status !== "completed" && p.endDate && new Date(p.endDate) < new Date()).length,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500"
      case "planning": return "bg-blue-500"
      case "on-hold": return "bg-amber-500"
      case "completed": return "bg-gray-500"
      case "archived": return "bg-gray-400"
      default: return "bg-gray-500"
    }
  }

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-700 bg-green-50"
      case "planning": return "text-blue-700 bg-blue-50"
      case "on-hold": return "text-amber-700 bg-amber-50"
      case "completed": return "text-gray-700 bg-gray-50"
      case "archived": return "text-gray-600 bg-gray-100"
      default: return "text-gray-700 bg-gray-50"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount)
  }

  const canCreateProject = projects.length < projectLimits[userPlan]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0d0f17] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: darkMode ? '#0d0f17' : '#F8F9FA' }}>
        {/* Header */}
        <div style={{ backgroundColor: colors.bg, borderBottom: colors.border }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm mb-4">
              <Link href="/dashboard" className="hover:underline" style={{ color: colors.textMuted }}>Dashboard</Link>
              <span style={{ color: colors.textMuted }}>/</span>
              <span className="font-medium" style={{ color: colors.text }}>Projects</span>
            </nav>

            {/* Title Row */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold" style={{ color: colors.text }}>Projects</h1>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Manage and track all your construction projects</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  disabled={!canCreateProject}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    canCreateProject
                      ? "text-white"
                      : "cursor-not-allowed"
                  }`}
                  style={canCreateProject ? { background: 'linear-gradient(to bottom, #FF6B6B 0%, #FF5252 100%)', boxShadow: '0 2px 4px rgba(255,107,107,0.2), 0 1px 2px rgba(255,107,107,0.3)' } : { backgroundColor: colors.bgMuted, color: colors.textMuted }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create Project
                </button>
              </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: darkMode ? 'rgba(37,99,235,0.15)' : '#E0F2FF' }}>
                    <span className="text-xl">🏗️</span>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Total</div>
                    <div className="text-lg font-bold" style={{ color: colors.text }}>{stats.total}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: darkMode ? 'rgba(34,197,94,0.15)' : '#E6F9EA' }}>
                    <span className="text-xl">🚀</span>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Active</div>
                    <div className="text-lg font-bold" style={{ color: '#22C55E' }}>{stats.active}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: darkMode ? 'rgba(59,130,246,0.15)' : '#E5F4FF' }}>
                    <span className="text-xl">📋</span>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Planning</div>
                    <div className="text-lg font-bold" style={{ color: '#3B82F6' }}>{stats.planning}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: darkMode ? 'rgba(245,158,11,0.15)' : '#FFF9E6' }}>
                    <span className="text-xl">⏸️</span>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>On Hold</div>
                    <div className="text-lg font-bold" style={{ color: '#F59E0B' }}>{stats.onHold}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-4" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: colors.bgMuted }}>
                    <span className="text-xl">✅</span>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>Completed</div>
                    <div className="text-lg font-bold" style={{ color: colors.textMuted }}>{stats.completed}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tier limit warning */}
        {userPlan === "starter" && projects.length >= projectLimits.starter - 1 && (
          <div className="mb-6 rounded-xl p-4" style={{ backgroundColor: '#FFF9E6', border: '1px solid #FFD93D', boxShadow: '0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.05)' }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold mb-1" style={{ color: colors.text }}>
                  {projects.length >= projectLimits.starter ? "Project Limit Reached" : "Approaching Project Limit"}
                </h3>
                <p className="text-sm mb-3" style={{ color: colors.textMuted }}>
                  {projects.length >= projectLimits.starter
                    ? `You've reached the maximum of ${projectLimits.starter} projects on the Starter plan.`
                    : `You're using ${projects.length} of ${projectLimits.starter} projects. Upgrade to Pro for up to 50 projects.`
                  }
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-semibold transition-colors"
                  style={{ background: 'linear-gradient(to bottom, #FFD93D 0%, #FFC107 100%)', boxShadow: '0 2px 4px rgba(255,217,61,0.2), 0 1px 2px rgba(255,217,61,0.3)' }}
                >
                  Upgrade to Pro
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Project Sub-Pages */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/projects/design-selections"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: colors.bg, border: colors.border, color: colors.text, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}
          >
            <span>🎨</span>
            Design Selections
          </Link>
          <Link
            href="/projects/approvals"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: colors.bg, border: colors.border, color: colors.text, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}
          >
            <span>✅</span>
            Approvals
          </Link>
          <Link
            href="/projects/turnover"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:-translate-y-0.5"
            style={{ backgroundColor: colors.bg, border: colors.border, color: colors.text, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}
          >
            <span>📦</span>
            Turnover
          </Link>
        </div>

        {/* Filters and View Toggle */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Search */}
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative">
                <svg className="absolute left-3 top-3 w-5 h-5" style={{ color: colors.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search projects, clients, locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none"
                  style={{ border: colors.border, color: colors.text }}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg focus:outline-none text-sm"
                style={{ border: colors.border, color: colors.text }}
              >
                <option value="all">All Status</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg focus:outline-none text-sm"
                style={{ border: colors.border, color: colors.text }}
              >
                <option value="all">All Types</option>
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="infrastructure">Infrastructure</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 rounded-lg focus:outline-none text-sm"
                style={{ border: colors.border, color: colors.text }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">By Name</option>
                <option value="progress">By Progress</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center rounded-lg p-1" style={{ backgroundColor: colors.bgAlt }}>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "grid" ? "shadow-sm" : ""
                  }`}
                  style={viewMode === "grid" ? { backgroundColor: colors.bg, color: colors.text } : { color: colors.textMuted }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "list" ? "shadow-sm" : ""
                  }`}
                  style={viewMode === "list" ? { backgroundColor: colors.bg, color: colors.text } : { color: colors.textMuted }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Grid/List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden animate-pulse" style={{ backgroundColor: colors.bg, border: colors.border }}>
                <div className="h-32" style={{ backgroundColor: colors.bgMuted }} />
                <div className="p-5 space-y-3">
                  <div className="h-4 rounded-full w-2/3" style={{ backgroundColor: colors.bgMuted }} />
                  <div className="h-3 rounded-full w-1/2" style={{ backgroundColor: colors.bgMuted }} />
                  <div className="h-2 rounded-full w-full mt-4" style={{ backgroundColor: colors.bgMuted }} />
                  <div className="flex gap-2 pt-1">
                    <div className="h-6 w-16 rounded-full" style={{ backgroundColor: colors.bgMuted }} />
                    <div className="h-6 w-20 rounded-full" style={{ backgroundColor: colors.bgMuted }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
            <div className="max-w-md mx-auto">
              <span className="text-6xl mb-4 block">🏗️</span>
              <h3 className="text-xl font-bold mb-2" style={{ color: colors.text }}>No projects found</h3>
              <p className="mb-6" style={{ color: colors.textMuted }}>
                {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                  ? "Try adjusting your filters or search query"
                  : "Get started by creating your first construction project"
                }
              </p>
              {canCreateProject && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg font-semibold transition-colors"
                  style={{ background: 'linear-gradient(to bottom, #FF6B6B 0%, #FF5252 100%)', boxShadow: '0 2px 4px rgba(255,107,107,0.2), 0 1px 2px rgba(255,107,107,0.3)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create First Project
                </button>
              )}
            </div>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="group rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}
              >
                {/* Project Thumbnail */}
                <Link href={`/projects/${project.id}`} className="block relative h-48 overflow-hidden" style={{ backgroundColor: colors.bgAlt }}>
                  <img
                    src={project.thumbnail}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusTextColor(project.status)}`}>
                      {project.status.replace('-', ' ').toUpperCase()}
                    </span>
                    {project.isFavorite && (
                      <span className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-amber-500">
                        ⭐
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <div className="flex items-center gap-2 text-white text-xs">
                      <span>📍</span>
                      <span className="truncate">{project.address}</span>
                    </div>
                  </div>
                </Link>

                {/* Project Info */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-1">
                    <Link href={`/projects/${project.id}`} className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg transition-colors truncate" style={{ color: colors.text }}>
                        {project.name}
                      </h3>
                    </Link>
                    <button
                      onClick={() => setDeleteConfirm({ id: project.id, name: project.name })}
                      className="ml-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      style={{ color: '#EF4444' }}
                      title="Delete project"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm mb-4" style={{ color: colors.textMuted }}>{project.client}</p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span style={{ color: colors.textMuted }}>Progress</span>
                      <span className="font-semibold" style={{ color: colors.text }}>{project.progress}%</span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ backgroundColor: colors.bgMuted }}>
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(project.status)}`}
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats - Spec Section 1 lines 88-92: Budget health + schedule */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-lg p-2" style={{ backgroundColor: colors.bgAlt }}>
                      <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Budget</p>
                      <p className="text-sm font-semibold" style={{ color: colors.text }}>{formatCurrency(project.budget)}</p>
                      {project.budget > 0 && (() => {
                        const pct = (project.spent / project.budget) * 100
                        const color = pct > 100 ? '#EF4444' : pct > 95 ? '#F59E0B' : '#22C55E'
                        return <p className="text-xs font-medium mt-0.5" style={{ color }}>{pct.toFixed(0)}% used</p>
                      })()}
                    </div>
                    <div className="rounded-lg p-2" style={{ backgroundColor: colors.bgAlt }}>
                      <p className="text-xs mb-0.5" style={{ color: colors.textMuted }}>Timeline</p>
                      {(() => {
                        const daysLeft = Math.ceil((new Date(project.endDate).getTime() - new Date().getTime()) / 86400000)
                        const isOverdue = daysLeft < 0 && project.status !== 'completed'
                        return (
                          <p className="text-sm font-semibold" style={{ color: isOverdue ? '#EF4444' : daysLeft <= 7 ? '#F59E0B' : colors.text }}>
                            {project.status === 'completed' ? 'Done' : isOverdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                          </p>
                        )
                      })()}
                    </div>
                  </div>

                  {/* Team Members */}
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {project.teamMembers.slice(0, 3).map((member, idx) => (
                        <div
                          key={idx}
                          className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                          style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #5FD9CF 100%)' }}
                          title={member.name}
                        >
                          {member.avatar}
                        </div>
                      ))}
                      {project.teamMembers.length > 3 && (
                        <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: colors.bgMuted, color: colors.textMuted }}>
                          +{project.teamMembers.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: colors.textMuted }}>{project.lastActivity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: colors.bgAlt, borderBottom: colors.border }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Project</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Timeline</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Team</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Budget</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: colors.border }}>
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="transition-colors" style={{ borderBottom: colors.border }}>
                      <td className="px-6 py-4">
                        <Link href={`/projects/${project.id}`} className="flex items-center gap-3 group">
                          <img
                            src={project.thumbnail}
                            alt={project.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold transition-colors truncate" style={{ color: colors.text }}>
                              {project.name}
                            </p>
                            <p className="text-sm truncate" style={{ color: colors.textMuted }}>{project.client}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusTextColor(project.status)}`}>
                          {project.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 rounded-full h-2" style={{ backgroundColor: colors.bgMuted }}>
                            <div
                              className={`h-2 rounded-full ${getStatusColor(project.status)}`}
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium min-w-12" style={{ color: colors.text }}>{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium" style={{ color: colors.text }}>{new Date(project.startDate).toLocaleDateString()}</p>
                          <p style={{ color: colors.textMuted }}>{new Date(project.endDate).toLocaleDateString()}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex -space-x-2">
                          {project.teamMembers.slice(0, 3).map((member, idx) => (
                            <div
                              key={idx}
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 border-2 border-white flex items-center justify-center text-white text-xs font-semibold"
                              title={member.name}
                            >
                              {member.avatar}
                            </div>
                          ))}
                          {project.teamMembers.length > 3 && (
                            <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: colors.bgMuted, color: colors.textMuted }}>
                              +{project.teamMembers.length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium" style={{ color: colors.text }}>{formatCurrency(project.budget)}</p>
                          <p style={{ color: colors.textMuted }}>{formatCurrency(project.spent)} spent</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setDeleteConfirm({ id: project.id, name: project.name })}
                          className="p-2 rounded-lg transition-colors hover:bg-red-50"
                          style={{ color: '#EF4444' }}
                          title="Delete project"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>

      {/* Project Creation Modal */}
      <ProjectCreationModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingProject(null)
        }}
        onSave={handleSaveProject}
        editingProject={editingProject as any}
        mode={editingProject ? 'edit' : 'create'}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl p-6 w-full max-w-md shadow-xl" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(239,68,68,0.1)' }}>
                <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-lg" style={{ color: colors.text }}>Delete Project</h3>
                <p className="text-sm" style={{ color: colors.textMuted }}>This action cannot be undone.</p>
              </div>
            </div>
            <p className="mb-6 text-sm" style={{ color: colors.text }}>
              Are you sure you want to delete <span className="font-semibold">"{deleteConfirm.name}"</span>? All associated data will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ border: colors.border, color: colors.text }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: '#EF4444' }}
              >
                {deleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}