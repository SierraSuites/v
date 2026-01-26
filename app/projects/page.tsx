"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
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
  const toast = useToast()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState("newest")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedNav, setExpandedNav] = useState<string | null>(null)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  // User plan (for tier-based limits)
  const [userPlan, setUserPlan] = useState<"starter" | "professional" | "enterprise">("professional")

  // User data
  const userData = {
    full_name: user?.user_metadata?.full_name || "John Doe",
    company_name: user?.user_metadata?.company_name || "Demo Construction Co.",
  }

  const userName = userData.full_name?.split(' ')[0] || "User"

  // Plan names and colors
  const planNames = {
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise"
  }

  const planColors = {
    starter: "bg-blue-500",
    professional: "bg-purple-500",
    enterprise: "bg-amber-500"
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
  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return
    }

    // Optimistic update
    setProjects(prev => prev.filter(p => p.id !== projectId))

    const { error } = await deleteProject(projectId)

    if (error) {
      // Revert on error - need to reload since we removed it
      const { data } = await getProjects()
      if (data) {
        setProjects(data.map(convertSupabaseProject))
      }
      toast.error("Failed to delete project")
    } else {
      toast.success(`Project "${projectName}" deleted successfully`)
    }
  }

  // Project limits by tier
  const projectLimits = {
    starter: 3,
    professional: 50,
    enterprise: Infinity
  }

  // Projects data
  const [projects, setProjects] = useState<Project[]>([])

  // Load projects from Supabase
  useEffect(() => {
    const loadProjects = async () => {
      const { data, error } = await getProjects()

      if (error) {
        console.error("Error loading projects:", error)
        toast.error("Failed to load projects")
        return
      }

      if (data) {
        const convertedProjects = data.map(convertSupabaseProject)

        // Fetch team members for all projects
        const projectIds = convertedProjects.map(p => p.id)
        const teamMembersMap = await getTeamMembersForProjects(projectIds)

        // Add team members to each project
        const projectsWithTeams = convertedProjects.map(project => ({
          ...project,
          teamMembers: teamMembersMap[project.id] || []
        }))

        setProjects(projectsWithTeams)
      }
    }

    loadProjects()
  }, [])

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
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setUser(session.user)
        // Get user plan from metadata
        const plan = session.user.user_metadata?.selected_plan || "starter"
        setUserPlan(plan)
      } else {
        // For demo, use placeholder
        setUser({ user_metadata: { full_name: "John Doe" } })
      }
      setLoading(false)
    }
    loadUser()
  }, [])

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 transition-all duration-300 flex flex-col ${sidebarCollapsed ? 'w-20' : 'w-72'}`} style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E0E0E0', boxShadow: '2px 0 4px rgba(0,0,0,0.02), 1px 0 2px rgba(0,0,0,0.05)' }}>
        {/* Logo & Company */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8787 100%)', boxShadow: '0 2px 4px rgba(255,107,107,0.2), 0 1px 2px rgba(255,107,107,0.3)' }}>
                  <span className="text-white font-bold text-sm">SS</span>
                </div>
                <h1 className="text-lg font-bold tracking-tight" style={{ color: '#1A1A1A' }}>
                  The Sierra Suites
                </h1>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''} text-gray-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* User Profile Widget */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition-all duration-200 ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #5FD9CF 100%)', boxShadow: '0 2px 4px rgba(78,205,196,0.2), 0 1px 2px rgba(78,205,196,0.3)' }}>
                  {userData.full_name?.charAt(0) || "U"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: '#6BCB77' }}></div>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left">
                  <p className="font-semibold text-sm truncate text-gray-900">{userData.full_name || "User"}</p>
                  <p className="text-xs truncate text-gray-500">{userData.company_name || "Company"}</p>
                  <span className={`inline-block mt-1.5 px-2 py-0.5 text-xs font-semibold text-white rounded-md ${planColors[userPlan]} shadow-sm`}>
                    {planNames[userPlan]}
                  </span>
                </div>
              )}
            </button>

            {showProfileDropdown && !sidebarCollapsed && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white backdrop-blur-xl border border-gray-200 rounded-xl shadow-2xl py-2 z-10">
                <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 transition-colors">
                  <span>👤</span> Profile
                </Link>
                <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 transition-colors">
                  <span>⚙️</span> Settings
                </Link>
                <Link href="/billing" className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 transition-colors">
                  <span>💳</span> Billing
                </Link>
                <hr className="my-2 border-gray-200" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-red-500 transition-colors"
                >
                  <span>🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <ul className="space-y-1.5">
            {navigationItems.map((item) => (
              <li key={item.name}>
                {item.subItems ? (
                  <>
                    <button
                      onClick={() => toggleNav(item.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl transition-transform group-hover:scale-110">{item.icon}</span>
                        {!sidebarCollapsed && (
                          <span className="font-medium text-sm text-gray-700">{item.name}</span>
                        )}
                      </div>
                      {!sidebarCollapsed && (
                        <svg className={`w-4 h-4 transition-transform ${expandedNav === item.name ? 'rotate-90' : ''} text-gray-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                    {expandedNav === item.name && !sidebarCollapsed && (
                      <ul className="ml-9 mt-1.5 space-y-1">
                        {item.subItems.map((subItem) => (
                          <li key={subItem.name}>
                            <Link
                              href={subItem.href}
                              className="block px-3 py-2 text-sm rounded-lg transition-all duration-200 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            >
                              {subItem.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.locked ? "#" : item.href}
                    onClick={(e) => {
                      if (item.locked) {
                        e.preventDefault()
                        alert(`This feature requires ${item.badge} plan. Upgrade to access!`)
                      }
                    }}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                      item.href === "/projects"
                        ? "text-white shadow-lg"
                        : item.locked
                        ? "opacity-50 cursor-not-allowed hover:bg-gray-100/30"
                        : "hover:bg-gray-100 text-gray-700"
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                    style={item.href === "/projects" ? { background: 'linear-gradient(135deg, #FF6B6B 0%, #FF8787 100%)', boxShadow: '0 2px 4px rgba(255,107,107,0.15), 0 1px 2px rgba(255,107,107,0.25)' } : {}}
                  >
                    <span className="text-xl transition-transform group-hover:scale-110">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="font-medium text-sm flex-1">{item.name}</span>
                        {item.locked && (
                          <span className="text-xs opacity-60">🔒</span>
                        )}
                        {item.badge && (
                          <span className="text-xs px-2 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-md font-semibold shadow-sm">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        {/* Bottom Section - Upgrade Card */}
        <div className="p-4 border-t border-gray-200">
          {userPlan !== "enterprise" && !sidebarCollapsed && (
            <div className="p-4 rounded-xl text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #5FD9CF 100%)', boxShadow: '0 4px 6px rgba(78,205,196,0.15), 0 2px 4px rgba(78,205,196,0.25)' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✨</span>
                  <h4 className="font-bold text-sm">Upgrade to {userPlan === "starter" ? "Pro" : "Enterprise"}</h4>
                </div>
                <p className="text-xs opacity-95 mb-3 leading-relaxed">Unlock advanced features and AI-powered tools</p>
                <Link href="/pricing" className="block text-center px-4 py-2 bg-white/95 backdrop-blur-sm rounded-lg text-xs font-bold hover:bg-white transition-all duration-200 hover:scale-105" style={{ color: '#4ECDC4', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  Upgrade Now
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-40" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.05)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Projects</h1>
              <p className="text-sm mt-1" style={{ color: '#4A4A4A' }}>
                {stats.total} total project{stats.total !== 1 ? 's' : ''}
                {userPlan === "starter" && ` (${projectLimits.starter} max on Starter plan)`}
                {userPlan === "professional" && ` (${projectLimits.professional} max on Pro plan)`}
              </p>
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
                style={canCreateProject ? { background: 'linear-gradient(to bottom, #FF6B6B 0%, #FF5252 100%)', boxShadow: '0 2px 4px rgba(255,107,107,0.2), 0 1px 2px rgba(255,107,107,0.3)' } : { backgroundColor: '#E0E0E0', color: '#4A4A4A' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Project
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tier limit warning */}
        {userPlan === "starter" && projects.length >= projectLimits.starter - 1 && (
          <div className="mb-6 rounded-xl p-4" style={{ backgroundColor: '#FFF9E6', border: '1px solid #FFD93D', boxShadow: '0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.05)' }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold mb-1" style={{ color: '#1A1A1A' }}>
                  {projects.length >= projectLimits.starter ? "Project Limit Reached" : "Approaching Project Limit"}
                </h3>
                <p className="text-sm mb-3" style={{ color: '#4A4A4A' }}>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="rounded-xl p-4 transition-shadow" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0F2FF' }}>
                <span className="text-xl">🏗️</span>
              </div>
              <p className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Total</p>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>{stats.total}</p>
          </div>

          <div className="rounded-xl p-4 transition-shadow" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E6F9EA' }}>
                <span className="text-xl">🚀</span>
              </div>
              <p className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Active</p>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#6BCB77' }}>{stats.active}</p>
          </div>

          <div className="rounded-xl p-4 transition-shadow" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E5F4FF' }}>
                <span className="text-xl">📋</span>
              </div>
              <p className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Planning</p>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#6A9BFD' }}>{stats.planning}</p>
          </div>

          <div className="rounded-xl p-4 transition-shadow" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFF9E6' }}>
                <span className="text-xl">⏸️</span>
              </div>
              <p className="text-sm font-medium" style={{ color: '#4A4A4A' }}>On Hold</p>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#FFD93D' }}>{stats.onHold}</p>
          </div>

          <div className="rounded-xl p-4 transition-shadow" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
                <span className="text-xl">✅</span>
              </div>
              <p className="text-sm font-medium" style={{ color: '#4A4A4A' }}>Completed</p>
            </div>
            <p className="text-3xl font-bold" style={{ color: '#4A4A4A' }}>{stats.completed}</p>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
            {/* Search */}
            <div className="flex-1 w-full lg:w-auto">
              <div className="relative">
                <svg className="absolute left-3 top-3 w-5 h-5" style={{ color: '#4A4A4A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search projects, clients, locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none"
                  style={{ border: '1px solid #E0E0E0', color: '#1A1A1A' }}
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg focus:outline-none text-sm"
                style={{ border: '1px solid #E0E0E0', color: '#1A1A1A' }}
              >
                <option value="all">All Status</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg focus:outline-none text-sm"
                style={{ border: '1px solid #E0E0E0', color: '#1A1A1A' }}
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
                style={{ border: '1px solid #E0E0E0', color: '#1A1A1A' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">By Name</option>
                <option value="progress">By Progress</option>
              </select>

              {/* View Toggle */}
              <div className="flex items-center rounded-lg p-1" style={{ backgroundColor: '#F8F9FA' }}>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === "grid" ? "shadow-sm" : ""
                  }`}
                  style={viewMode === "grid" ? { backgroundColor: '#FFFFFF', color: '#1A1A1A' } : { color: '#4A4A4A' }}
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
                  style={viewMode === "list" ? { backgroundColor: '#FFFFFF', color: '#1A1A1A' } : { color: '#4A4A4A' }}
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
        {filteredProjects.length === 0 ? (
          <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
            <div className="max-w-md mx-auto">
              <span className="text-6xl mb-4 block">🏗️</span>
              <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>No projects found</h3>
              <p className="mb-6" style={{ color: '#4A4A4A' }}>
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
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="group rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}
              >
                {/* Project Thumbnail */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
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
                      <button className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-amber-500 hover:bg-white transition-colors">
                        ⭐
                      </button>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <div className="flex items-center gap-2 text-white text-xs">
                      <span>📍</span>
                      <span className="truncate">{project.address}</span>
                    </div>
                  </div>
                </div>

                {/* Project Info */}
                <div className="p-5">
                  <h3 className="font-bold text-lg mb-1 transition-colors" style={{ color: '#1A1A1A' }}>
                    {project.name}
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#4A4A4A' }}>{project.client}</p>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span style={{ color: '#4A4A4A' }}>Progress</span>
                      <span className="font-semibold" style={{ color: '#1A1A1A' }}>{project.progress}%</span>
                    </div>
                    <div className="w-full rounded-full h-2" style={{ backgroundColor: '#E0E0E0' }}>
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getStatusColor(project.status)}`}
                        style={{ width: `${project.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="rounded-lg p-2" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs mb-0.5" style={{ color: '#4A4A4A' }}>Budget</p>
                      <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{formatCurrency(project.budget)}</p>
                    </div>
                    <div className="rounded-lg p-2" style={{ backgroundColor: '#F8F9FA' }}>
                      <p className="text-xs mb-0.5" style={{ color: '#4A4A4A' }}>Spent</p>
                      <p className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>{formatCurrency(project.spent)}</p>
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
                        <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: '#E0E0E0', color: '#4A4A4A' }}>
                          +{project.teamMembers.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-xs" style={{ color: '#4A4A4A' }}>{project.lastActivity}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead style={{ backgroundColor: '#F8F9FA', borderBottom: '1px solid #E0E0E0' }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Project</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Timeline</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Team</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Budget</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider" style={{ color: '#4A4A4A' }}>Actions</th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: '1px solid #E0E0E0' }}>
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="transition-colors" style={{ borderBottom: '1px solid #E0E0E0' }}>
                      <td className="px-6 py-4">
                        <Link href={`/projects/${project.id}`} className="flex items-center gap-3 group">
                          <img
                            src={project.thumbnail}
                            alt={project.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold transition-colors truncate" style={{ color: '#1A1A1A' }}>
                              {project.name}
                            </p>
                            <p className="text-sm truncate" style={{ color: '#4A4A4A' }}>{project.client}</p>
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
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getStatusColor(project.status)}`}
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 min-w-[3rem]">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900 font-medium">{new Date(project.startDate).toLocaleDateString()}</p>
                          <p className="text-gray-600">{new Date(project.endDate).toLocaleDateString()}</p>
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
                            <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-semibold">
                              +{project.teamMembers.length - 3}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900 font-medium">{formatCurrency(project.budget)}</p>
                          <p className="text-gray-600">{formatCurrency(project.spent)} spent</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
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
      </main>
      </div>

      {/* Project Creation Modal */}
      <ProjectCreationModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingProject(null)
        }}
        onSave={handleSaveProject}
        editingProject={editingProject}
        mode={editingProject ? 'edit' : 'create'}
      />
    </div>
  )
}
