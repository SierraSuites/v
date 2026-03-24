"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

type Plan = "starter" | "professional" | "enterprise"

interface NavItem {
  name: string
  href: string
  icon: string
  locked?: boolean
  lockedFor?: Plan[]
  badge?: string
  subItems?: { name: string; href: string }[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [notificationCount] = useState(3) // Placeholder notification count
  const [expandedNav, setExpandedNav] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [dismissedWelcome, setDismissedWelcome] = useState(false)
  const [activeView, setActiveView] = useState("overview")

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      // TEMPORARY: Skip auth check to view placeholder data
      // if (error || !session) {
      //   router.push("/login")
      //   return
      // }

      // Use placeholder user data if no session
      if (session) {
        setUser(session.user)
      } else {
        setUser({
          user_metadata: {
            full_name: "John Doe",
            company_name: "Demo Construction Co.",
            selected_plan: "starter"
          }
        })
      }
      setLoading(false)
    }

    loadUser()

    // Update time every minute
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const formatDate = () => {
    return currentTime.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const userData = user?.user_metadata || {}
  const userPlan: Plan = userData.selected_plan || "starter"
  const userCurrency = userData.selected_currency || "usd"
  const userName = userData.full_name?.split(' ')[0] || "User"

  const planNames = {
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise"
  }

  const planPricing = {
    starter: "$49",
    professional: "$88",
    enterprise: "$149"
  }

  const planColors = {
    starter: "bg-blue-500",
    professional: "bg-purple-500",
    enterprise: "bg-amber-500"
  }

  // Placeholder data for demonstration
  const userStats = {
    totalProjects: 8,
    activeProjects: 3,
    onHoldProjects: 2,
    completedProjects: 3,
    tasksToday: 12,
    overdueTasks: 3,
    tasksThisWeek: 24,
    completionRate: 78,
    recentPhotos: 42,
    storageUsed: 2.4,
    storageLimit: userPlan === "starter" ? 5 : userPlan === "professional" ? 50 : 500,
    teamMembers: 5,
    onlineMembers: 3,
    revenueThisMonth: 24500,
    revenueYTD: 187600
  }

  // Placeholder projects data
  const recentProjects = [
    { id: 1, name: "Downtown Office Renovation", status: "active", progress: 65, dueDate: "2024-02-15", client: "TechCorp Inc." },
    { id: 2, name: "Residential Kitchen Remodel", status: "active", progress: 40, dueDate: "2024-02-28", client: "Smith Family" },
    { id: 3, name: "Commercial Warehouse Build", status: "on-hold", progress: 25, dueDate: "2024-03-10", client: "Logistics Co." },
  ]

  // Placeholder activities data
  const recentActivities = [
    { id: 1, type: "task", message: "Task completed: Final inspection scheduled", time: "2 hours ago", icon: "✅" },
    { id: 2, type: "photo", message: "12 photos uploaded to Kitchen Remodel project", time: "4 hours ago", icon: "📸" },
    { id: 3, type: "project", message: "New project created: Office Renovation", time: "Yesterday", icon: "🏗️" },
    { id: 4, type: "team", message: "John Doe joined your team", time: "2 days ago", icon: "👥" },
  ]

  // Placeholder tasks data
  const upcomingTasks = [
    { id: 1, title: "Schedule final inspection", project: "Office Renovation", dueDate: "Today", priority: "high" },
    { id: 2, title: "Review contractor quotes", project: "Kitchen Remodel", dueDate: "Tomorrow", priority: "medium" },
    { id: 3, title: "Update project timeline", project: "Warehouse Build", dueDate: "Feb 15", priority: "low" },
  ]

  // Placeholder team members
  const teamMembers = [
    { id: 1, name: "John Doe", role: "Project Manager", avatar: "JD", status: "online" },
    { id: 2, name: "Jane Smith", role: "Contractor", avatar: "JS", status: "online" },
    { id: 3, name: "Mike Johnson", role: "Inspector", avatar: "MJ", status: "offline" },
  ]

  const navigationItems: NavItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: "📊"
    },
    {
      name: "Projects",
      href: "/projects",
      icon: "🏗️",
      subItems: [
        { name: "All Projects", href: "/projects" },
        { name: "Active Projects", href: "/projects/active" },
        { name: "Archived", href: "/projects/archived" }
      ]
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
      href: "/quotes",
      icon: "💰"
    },
    {
      name: "ReportCenter",
      href: "/reports",
      icon: "📈"
    },
    {
      name: "CRM Suite",
      href: "/crm",
      icon: "🤝",
      locked: userPlan === "starter",
      lockedFor: ["starter"],
      badge: "Pro"
    },
    {
      name: "Sustainability Hub",
      href: "/sustainability",
      icon: "🌱",
      locked: userPlan === "starter",
      lockedFor: ["starter"],
      badge: "Pro"
    },
    {
      name: "AI Tools",
      href: "/ai-tools",
      icon: "🤖",
      locked: userPlan !== "enterprise",
      lockedFor: ["starter", "professional"],
      badge: "Enterprise"
    },
    {
      name: "Blog & Resources",
      href: "/resources",
      icon: "📚"
    },
    {
      name: "Settings",
      href: "/settings",
      icon: "⚙️"
    }
  ]

  const toggleNav = (name: string) => {
    setExpandedNav(expandedNav === name ? null : name)
  }

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark bg-[#10121b]' : 'bg-gray-50'}`}>
      {/* Modern Sidebar with Glass Effect - Redesigned v2 */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 backdrop-blur-xl bg-opacity-40 ${darkMode ? 'bg-[#10121b]' : 'bg-white'} border-r ${darkMode ? 'border-gray-800' : 'border-gray-200'} transition-all duration-300 flex flex-col ${sidebarCollapsed ? 'w-20' : 'w-72'}`}>
        {/* Logo & Company - Modern Design */}
        <div className={`p-6 ${darkMode ? 'border-b border-gray-800' : 'border-b border-gray-200'}`}>
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">SS</span>
                </div>
                <h1 className={`text-lg font-bold tracking-tight ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  The Sierra Suites
                </h1>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`p-2 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-lg transition-all duration-200`}
            >
              <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''} ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* User Profile Widget - Modern Card */}
        <div className={`p-4 ${darkMode ? 'border-b border-gray-800' : 'border-b border-gray-200'}`}>
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'} transition-all duration-200 ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {userData.full_name?.charAt(0) || "U"}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 ${darkMode ? 'border-gray-900' : 'border-white'} shadow-sm"></div>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left">
                  <p className={`font-semibold text-sm truncate ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{userData.full_name || "User"}</p>
                  <p className={`text-xs truncate ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{userData.company_name || "Company"}</p>
                  <span className={`inline-block mt-1.5 px-2 py-0.5 text-xs font-semibold text-white rounded-md ${planColors[userPlan]} shadow-sm`}>
                    {planNames[userPlan]}
                  </span>
                </div>
              )}
            </button>

            {showProfileDropdown && !sidebarCollapsed && (
              <div className={`absolute top-full left-0 right-0 mt-2 ${darkMode ? 'bg-gray-900/95' : 'bg-white'} backdrop-blur-xl border ${darkMode ? 'border-gray-800' : 'border-gray-200'} rounded-xl shadow-2xl py-2 z-10`}>
                <Link href="/profile" className={`flex items-center gap-3 px-4 py-2.5 text-sm ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'} transition-colors`}>
                  <span>👤</span> Profile
                </Link>
                <Link href="/settings" className={`flex items-center gap-3 px-4 py-2.5 text-sm ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'} transition-colors`}>
                  <span>⚙️</span> Settings
                </Link>
                <Link href="/billing" className={`flex items-center gap-3 px-4 py-2.5 text-sm ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'} transition-colors`}>
                  <span>💳</span> Billing
                </Link>
                <hr className={`my-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`} />
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 text-left px-4 py-2.5 text-sm ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} text-red-500 transition-colors`}
                >
                  <span>🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation - Modern Design */}
        <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          <ul className="space-y-1.5">
            {navigationItems.map((item) => (
              <li key={item.name}>
                {item.subItems ? (
                  <>
                    <button
                      onClick={() => toggleNav(item.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${darkMode ? 'hover:bg-gray-800/70' : 'hover:bg-gray-100'} transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl transition-transform group-hover:scale-110">{item.icon}</span>
                        {!sidebarCollapsed && (
                          <span className={`font-medium text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{item.name}</span>
                        )}
                      </div>
                      {!sidebarCollapsed && (
                        <svg className={`w-4 h-4 transition-transform ${expandedNav === item.name ? 'rotate-90' : ''} ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              className={`block px-3 py-2 text-sm rounded-lg transition-all duration-200 ${darkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
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
                      item.href === "/dashboard"
                        ? darkMode
                          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/50"
                          : "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30"
                        : item.locked
                        ? `opacity-50 cursor-not-allowed ${darkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-100/30'}`
                        : darkMode
                        ? "hover:bg-gray-800/70 text-gray-300"
                        : "hover:bg-gray-100 text-gray-700"
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
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

        {/* Bottom Section - Modern Actions */}
        <div className={`p-4 ${darkMode ? 'border-t border-gray-800' : 'border-t border-gray-200'} space-y-2`}>
          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${darkMode ? 'hover:bg-gray-800/70' : 'hover:bg-gray-100'} transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <span className="text-xl transition-transform group-hover:scale-110">🔔</span>
            {!sidebarCollapsed && <span className={`font-medium text-sm flex-1 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Notifications</span>}
            {notificationCount > 0 && (
              <span className={`${sidebarCollapsed ? 'absolute -top-1 -right-1' : ''} w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg`}>
                {notificationCount}
              </span>
            )}
          </button>

          {/* Support Chat */}
          <button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${darkMode ? 'hover:bg-gray-800/70' : 'hover:bg-gray-100'} transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <span className="text-xl transition-transform group-hover:scale-110">💬</span>
            {!sidebarCollapsed && <span className={`font-medium text-sm flex-1 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Support Chat</span>}
          </button>

          {/* Dark Mode Toggle - Modern Switch */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${darkMode ? 'hover:bg-gray-800/70' : 'hover:bg-gray-100'} transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <span className="text-xl transition-transform group-hover:scale-110">{darkMode ? '🌙' : '☀️'}</span>
            {!sidebarCollapsed && (
              <>
                <span className={`font-medium text-sm flex-1 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {darkMode ? 'Dark Mode' : 'Light Mode'}
                </span>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </>
            )}
          </button>

          {/* Upgrade Card - Enhanced Design */}
          {userPlan !== "enterprise" && !sidebarCollapsed && (
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-xl text-white shadow-xl shadow-blue-900/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✨</span>
                  <h4 className="font-bold text-sm">Upgrade to {userPlan === "starter" ? "Pro" : "Enterprise"}</h4>
                </div>
                <p className="text-xs opacity-95 mb-3 leading-relaxed">Unlock advanced features and AI-powered tools</p>
                <Link href="/pricing" className="block text-center px-4 py-2 bg-white/95 backdrop-blur-sm text-blue-600 rounded-lg text-xs font-bold hover:bg-white shadow-lg transition-all duration-200 hover:scale-105">
                  Upgrade Now
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${darkMode ? 'bg-[#0d0f17]' : 'bg-gray-50'}`}>
        {/* Modern Top Bar with Glassmorphism */}
        <header className={`backdrop-blur-xl ${darkMode ? 'bg-[#10121b]/80 border-gray-800' : 'bg-white/80 border-gray-200'} border-b px-6 py-4 sticky top-0 z-40`}>
          <div className="flex items-center justify-between gap-4">
            {/* Left: Modern Greeting & Date */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  {getGreeting()}, {userName}
                </h2>
                <span className="text-2xl animate-wave inline-block">👋</span>
              </div>
              <div className="flex items-center gap-4">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{formatDate()}</p>
                <div className={`flex items-center gap-3 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'} px-3 py-1 rounded-full ${darkMode ? 'bg-gray-800/50' : 'bg-gray-100'}`}>
                  <span className="flex items-center gap-1">🌤️ <span className="font-medium">72°F</span></span>
                  <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-400'}`}></span>
                  <span className="flex items-center gap-1">💨 <span className="font-medium">8mph</span></span>
                  <span className={`w-1 h-1 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-400'}`}></span>
                  <span className="flex items-center gap-1">💧 <span className="font-medium">0%</span></span>
                </div>
              </div>
            </div>

            {/* Right: Modern Search & Actions */}
            <div className="flex items-center gap-2">
              {/* Global Search with Modern Design */}
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search projects, tasks..."
                  className={`w-80 px-4 py-2.5 pl-11 pr-16 rounded-xl border ${darkMode ? 'border-gray-700 bg-gray-800/50 text-gray-200 placeholder-gray-500 focus:bg-gray-800 focus:border-blue-500' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:border-blue-500'} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200`}
                />
                <svg className={`absolute left-3.5 top-3 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <kbd className={`absolute right-3 top-2.5 px-2 py-1 text-xs ${darkMode ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-300'} rounded border font-mono`}>⌘K</kbd>
              </div>

              {/* Quick Actions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowQuickActions(!showQuickActions)}
                  className={`p-2.5 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-xl transition-all duration-200 group`}
                >
                  <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'} group-hover:rotate-90 transition-transform duration-200`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
                {showQuickActions && (
                  <div className={`absolute right-0 mt-2 w-56 ${darkMode ? 'bg-gray-900/95 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-xl border rounded-xl shadow-2xl py-2 z-50`}>
                    <Link href="/projects/new" className={`flex items-center gap-3 px-4 py-2.5 ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'} transition-colors`}>
                      <span>🏗️</span>
                      <span className="text-sm font-medium">New Project</span>
                    </Link>
                    <Link href="/taskflow/new" className={`flex items-center gap-3 px-4 py-2.5 ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'} transition-colors`}>
                      <span>✅</span>
                      <span className="text-sm font-medium">New Task</span>
                    </Link>
                    <Link href="/fieldsnap" className={`flex items-center gap-3 px-4 py-2.5 ${darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'} transition-colors`}>
                      <span>📸</span>
                      <span className="text-sm font-medium">Upload Photos</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Notifications */}
              <button className={`relative p-2.5 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-xl transition-all duration-200 group`}>
                <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'} group-hover:animate-pulse`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse">
                    {notificationCount}
                  </span>
                )}
              </button>

              {/* Help/Tutorial */}
              <Link href="/help" className={`p-2.5 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-xl transition-all duration-200 group`}>
                <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </Link>

              {/* User Menu */}
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                {userData.full_name?.charAt(0) || "U"}
              </button>
            </div>
          </div>
        </header>

        {/* Main Content Area with Modern Design */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STARTER TIER DASHBOARD */}
          {userPlan === "starter" && (
            <>
              {/* Modern Welcome Banner - Dismissible */}
              {!dismissedWelcome && (
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 text-white rounded-2xl p-8 shadow-2xl shadow-blue-900/30">
                  {/* Decorative Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                    <svg className="absolute -right-10 -top-10 w-64 h-64 opacity-20" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="80" fill="white" />
                    </svg>
                  </div>

                  <div className="relative z-10 flex items-start justify-between">
                    <div className="flex-1 pr-8">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">🎉</span>
                        <h3 className="text-2xl font-bold">Welcome to The Sierra Suites!</h3>
                      </div>
                      <p className="text-blue-100 mb-6 text-sm leading-relaxed">Get started by completing your setup checklist below</p>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                          <div className="w-5 h-5 rounded-md bg-green-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium">Create your account</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                          <div className="w-5 h-5 rounded-md border-2 border-white/40 flex-shrink-0"></div>
                          <span className="text-sm font-medium opacity-90">Create first project</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                          <div className="w-5 h-5 rounded-md border-2 border-white/40 flex-shrink-0"></div>
                          <span className="text-sm font-medium opacity-90">Add a task</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                          <div className="w-5 h-5 rounded-md border-2 border-white/40 flex-shrink-0"></div>
                          <span className="text-sm font-medium opacity-90">Upload first photo</span>
                        </div>
                      </div>

                      <Link href="/help/getting-started" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105">
                        <span>📹</span>
                        <span>Watch Video Tutorial</span>
                      </Link>
                    </div>
                    <button
                      onClick={() => setDismissedWelcome(true)}
                      className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Modern Stats Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Project Overview Widget - Modern Card */}
                <div className={`lg:col-span-6 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg">
                        <span className="text-xl">🏗️</span>
                      </div>
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Project Overview</h3>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'} font-medium`}>
                      Max 3 projects
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700/50' : 'border-gray-200'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Projects</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{userStats.totalProjects}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border ${darkMode ? 'border-green-500/20' : 'border-green-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Active</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{userStats.activeProjects}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/10 border ${darkMode ? 'border-amber-500/20' : 'border-amber-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>On Hold</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>{userStats.onHoldProjects}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800/30 border-gray-700/50' : 'bg-gray-100 border-gray-200'} border hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Completed</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>{userStats.completedProjects}</p>
                    </div>
                  </div>

                  <Link href="/projects" className="block text-center px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-900/30 hover:shadow-xl transition-all duration-200 hover:scale-105">
                    View All Projects
                  </Link>
                </div>

                {/* Task Summary Widget - Modern Card */}
                <div className={`lg:col-span-6 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center shadow-lg">
                      <span className="text-xl">✅</span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Task Summary</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border ${darkMode ? 'border-blue-500/20' : 'border-blue-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>Today's Tasks</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{userStats.tasksToday}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/10 border ${darkMode ? 'border-red-500/20' : 'border-red-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Overdue</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{userStats.overdueTasks}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border ${darkMode ? 'border-purple-500/20' : 'border-purple-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>This Week</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{userStats.tasksThisWeek}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border ${darkMode ? 'border-green-500/20' : 'border-green-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Completion Rate</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{userStats.completionRate}%</p>
                    </div>
                  </div>

                  <Link href="/taskflow" className="block text-center px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-600 shadow-lg shadow-purple-900/30 hover:shadow-xl transition-all duration-200 hover:scale-105">
                    Go to TaskFlow
                  </Link>
                </div>
              </div>

              {/* Second Row - Modern Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Recent Photos Widget - Modern Card (4 cols) */}
                <div className={`lg:col-span-4 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-pink-400 flex items-center justify-center shadow-lg">
                      <span className="text-xl">📸</span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Recent Photos</h3>
                  </div>

                  {userStats.recentPhotos === 0 ? (
                    <div className="text-center py-8">
                      <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center`}>
                        <span className="text-3xl opacity-50">📷</span>
                      </div>
                      <p className={`text-sm mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>No photos yet</p>
                      <Link href="/fieldsnap" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-xl text-sm font-semibold hover:from-pink-700 hover:to-pink-600 shadow-lg shadow-pink-900/30 hover:shadow-xl transition-all duration-200 hover:scale-105">
                        <span>📸</span> Upload First Photo
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className={`aspect-square ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-xl hover:scale-105 transition-transform duration-200 cursor-pointer`}></div>
                        ))}
                      </div>
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Storage</span>
                          <span className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{userStats.storageUsed}GB / {userStats.storageLimit}GB</span>
                        </div>
                        <div className={`w-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-full h-2`}>
                          <div
                            className="bg-gradient-to-r from-pink-600 to-pink-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(userStats.storageUsed / userStats.storageLimit) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <Link href="/fieldsnap" className="block text-center px-4 py-2.5 bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-xl text-sm font-semibold hover:from-pink-700 hover:to-pink-600 shadow-lg shadow-pink-900/30 hover:shadow-xl transition-all duration-200 hover:scale-105">
                        View All Photos
                      </Link>
                    </>
                  )}
                </div>

                {/* Quick Actions Panel - Modern Grid (4 cols) */}
                <div className={`lg:col-span-4 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg">
                      <span className="text-xl">⚡</span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Quick Actions</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/projects/new" className={`group flex flex-col items-center justify-center p-4 border-2 border-dashed ${darkMode ? 'border-gray-700 hover:border-blue-500 hover:bg-blue-500/5' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'} rounded-xl transition-all duration-200 hover:scale-105`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🏗️</span>
                      <span className={`text-sm font-semibold text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>New Project</span>
                    </Link>
                    <Link href="/taskflow/new" className={`group flex flex-col items-center justify-center p-4 border-2 border-dashed ${darkMode ? 'border-gray-700 hover:border-purple-500 hover:bg-purple-500/5' : 'border-gray-300 hover:border-purple-500 hover:bg-purple-50'} rounded-xl transition-all duration-200 hover:scale-105`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">✅</span>
                      <span className={`text-sm font-semibold text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Add Task</span>
                    </Link>
                    <Link href="/fieldsnap" className={`group flex flex-col items-center justify-center p-4 border-2 border-dashed ${darkMode ? 'border-gray-700 hover:border-pink-500 hover:bg-pink-500/5' : 'border-gray-300 hover:border-pink-500 hover:bg-pink-50'} rounded-xl transition-all duration-200 hover:scale-105`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📸</span>
                      <span className={`text-sm font-semibold text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Upload Photos</span>
                    </Link>
                    <Link href="/reports/new" className={`group flex flex-col items-center justify-center p-4 border-2 border-dashed ${darkMode ? 'border-gray-700 hover:border-green-500 hover:bg-green-500/5' : 'border-gray-300 hover:border-green-500 hover:bg-green-50'} rounded-xl transition-all duration-200 hover:scale-105`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</span>
                      <span className={`text-sm font-semibold text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Generate Report</span>
                    </Link>
                  </div>
                </div>

                {/* Activity Feed - Modern Card (4 cols) */}
                <div className={`lg:col-span-4 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-400 flex items-center justify-center shadow-lg">
                      <span className="text-xl">📋</span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Activity Feed</h3>
                  </div>

                  <div className="space-y-3 mb-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-gray-800/30 hover:bg-gray-800/50' : 'bg-gray-50 hover:bg-gray-100'} transition-colors cursor-pointer`}>
                        <span className="text-2xl">{activity.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'} line-clamp-2`}>{activity.message}</p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link href="/activity" className={`block text-center text-sm font-semibold ${darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-700'} transition-colors`}>
                    View All Activity →
                  </Link>
                </div>
              </div>

              {/* Modern Upgrade Prompt Card (Full Width) */}
              <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600 text-white rounded-2xl p-8 shadow-2xl shadow-purple-900/30">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.3),transparent)]"></div>
                  <svg className="absolute -right-20 -bottom-20 w-96 h-96 opacity-20" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="white" />
                  </svg>
                </div>

                <div className="relative z-10">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-4xl">🚀</span>
                    <div>
                      <h3 className="text-3xl font-bold mb-2">Unlock CRM & Advanced Features</h3>
                      <p className="text-purple-100 text-base leading-relaxed">Upgrade to Professional to access powerful tools for your growing business</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                    <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl">🤝</span>
                      </div>
                      <div>
                        <p className="font-bold mb-1 text-lg">CRM Suite</p>
                        <p className="text-sm text-purple-100">Manage leads and clients effectively</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl">👥</span>
                      </div>
                      <div>
                        <p className="font-bold mb-1 text-lg">Team Collaboration</p>
                        <p className="text-sm text-purple-100">Unlimited team members</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl">🌱</span>
                      </div>
                      <div>
                        <p className="font-bold mb-1 text-lg">Sustainability Hub</p>
                        <p className="text-sm text-purple-100">ESG metrics & reporting</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <Link href="/pricing" className="px-8 py-4 bg-white text-purple-600 rounded-xl font-bold text-lg hover:bg-purple-50 shadow-2xl hover:shadow-3xl transition-all duration-200 hover:scale-105">
                      Upgrade to Pro - {planPricing.professional}/month
                    </Link>
                    <Link href="/pricing" className="inline-flex items-center gap-2 text-white hover:text-purple-100 font-semibold text-lg group transition-colors">
                      <span>See All Features</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PRO TIER DASHBOARD */}
          {userPlan === "professional" && (
            <>
              {/* Modern Welcome Banner - Dismissible */}
              {!dismissedWelcome && (
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 text-white rounded-2xl p-8 shadow-2xl shadow-blue-900/30">
                  {/* Decorative Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                    <svg className="absolute -right-10 -top-10 w-64 h-64 opacity-20" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="80" fill="white" />
                    </svg>
                  </div>

                  <div className="relative z-10 flex items-start justify-between">
                    <div className="flex-1 pr-8">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">🎉</span>
                        <h3 className="text-2xl font-bold">Welcome to The Sierra Suites!</h3>
                      </div>
                      <p className="text-blue-100 mb-6 text-sm leading-relaxed">Get started by completing your setup checklist below</p>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                          <div className="w-5 h-5 rounded-md bg-green-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium">Create your account</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                          <div className="w-5 h-5 rounded-md border-2 border-white/40 flex-shrink-0"></div>
                          <span className="text-sm font-medium opacity-90">Create first project</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                          <div className="w-5 h-5 rounded-md border-2 border-white/40 flex-shrink-0"></div>
                          <span className="text-sm font-medium opacity-90">Add a task</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                          <div className="w-5 h-5 rounded-md border-2 border-white/40 flex-shrink-0"></div>
                          <span className="text-sm font-medium opacity-90">Upload first photo</span>
                        </div>
                      </div>

                      <Link href="/help/getting-started" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105">
                        <span>📹</span>
                        <span>Watch Video Tutorial</span>
                      </Link>
                    </div>
                    <button
                      onClick={() => setDismissedWelcome(true)}
                      className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Modern Stats Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Project Overview Widget - Modern Card */}
                <div className={`lg:col-span-6 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg">
                        <span className="text-xl">🏗️</span>
                      </div>
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Project Overview</h3>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'} font-medium`}>
                      Max 15 projects
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700/50' : 'border-gray-200'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Projects</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{userStats.totalProjects}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border ${darkMode ? 'border-green-500/20' : 'border-green-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Active</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{userStats.activeProjects}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/10 border ${darkMode ? 'border-amber-500/20' : 'border-amber-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>On Hold</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>{userStats.onHoldProjects}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800/30 border-gray-700/50' : 'bg-gray-100 border-gray-200'} border hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Completed</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>{userStats.completedProjects}</p>
                    </div>
                  </div>

                  <Link href="/projects" className="block text-center px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-900/30 hover:shadow-xl transition-all duration-200 hover:scale-105">
                    View All Projects
                  </Link>
                </div>

                {/* Task Summary Widget - Modern Card */}
                <div className={`lg:col-span-6 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center shadow-lg">
                      <span className="text-xl">✅</span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Task Summary</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border ${darkMode ? 'border-blue-500/20' : 'border-blue-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>Today's Tasks</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{userStats.tasksToday}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/10 border ${darkMode ? 'border-red-500/20' : 'border-red-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Overdue</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{userStats.overdueTasks}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border ${darkMode ? 'border-purple-500/20' : 'border-purple-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>This Week</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{userStats.tasksThisWeek}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border ${darkMode ? 'border-green-500/20' : 'border-green-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Completion Rate</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{userStats.completionRate}%</p>
                    </div>
                  </div>

                  <Link href="/taskflow" className="block text-center px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-600 shadow-lg shadow-purple-900/30 hover:shadow-xl transition-all duration-200 hover:scale-105">
                    Go to TaskFlow
                  </Link>
                </div>
              </div>

              {/* Second Row - Modern Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Recent Photos Widget - Modern Card (4 cols) */}
                <div className={`lg:col-span-4 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-pink-400 flex items-center justify-center shadow-lg">
                      <span className="text-xl">📸</span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Recent Photos</h3>
                  </div>

                  {userStats.recentPhotos === 0 ? (
                    <div className="text-center py-8">
                      <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} flex items-center justify-center`}>
                        <span className="text-3xl opacity-50">📷</span>
                      </div>
                      <p className={`text-sm mb-4 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>No photos yet</p>
                      <Link href="/fieldsnap" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-xl text-sm font-semibold hover:from-pink-700 hover:to-pink-600 shadow-lg shadow-pink-900/30 hover:shadow-xl transition-all duration-200 hover:scale-105">
                        <span>📸</span> Upload First Photo
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className={`aspect-square ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-xl hover:scale-105 transition-transform duration-200 cursor-pointer`}></div>
                        ))}
                      </div>
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Storage</span>
                          <span className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{userStats.storageUsed}GB / {userStats.storageLimit}GB</span>
                        </div>
                        <div className={`w-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-full h-2`}>
                          <div
                            className="bg-gradient-to-r from-pink-600 to-pink-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(userStats.storageUsed / userStats.storageLimit) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      <Link href="/fieldsnap" className="block text-center px-4 py-2.5 bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-xl text-sm font-semibold hover:from-pink-700 hover:to-pink-600 shadow-lg shadow-pink-900/30 hover:shadow-xl transition-all duration-200 hover:scale-105">
                        View All Photos
                      </Link>
                    </>
                  )}
                </div>

                {/* Quick Actions Panel - Modern Grid (4 cols) */}
                <div className={`lg:col-span-4 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg">
                      <span className="text-xl">⚡</span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Quick Actions</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/projects/new" className={`group flex flex-col items-center justify-center p-4 border-2 border-dashed ${darkMode ? 'border-gray-700 hover:border-blue-500 hover:bg-blue-500/5' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'} rounded-xl transition-all duration-200 hover:scale-105`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🏗️</span>
                      <span className={`text-sm font-semibold text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>New Project</span>
                    </Link>
                    <Link href="/taskflow/new" className={`group flex flex-col items-center justify-center p-4 border-2 border-dashed ${darkMode ? 'border-gray-700 hover:border-purple-500 hover:bg-purple-500/5' : 'border-gray-300 hover:border-purple-500 hover:bg-purple-50'} rounded-xl transition-all duration-200 hover:scale-105`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">✅</span>
                      <span className={`text-sm font-semibold text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Add Task</span>
                    </Link>
                    <Link href="/fieldsnap" className={`group flex flex-col items-center justify-center p-4 border-2 border-dashed ${darkMode ? 'border-gray-700 hover:border-pink-500 hover:bg-pink-500/5' : 'border-gray-300 hover:border-pink-500 hover:bg-pink-50'} rounded-xl transition-all duration-200 hover:scale-105`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📸</span>
                      <span className={`text-sm font-semibold text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Upload Photos</span>
                    </Link>
                    <Link href="/reports/new" className={`group flex flex-col items-center justify-center p-4 border-2 border-dashed ${darkMode ? 'border-gray-700 hover:border-green-500 hover:bg-green-500/5' : 'border-gray-300 hover:border-green-500 hover:bg-green-50'} rounded-xl transition-all duration-200 hover:scale-105`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</span>
                      <span className={`text-sm font-semibold text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Generate Report</span>
                    </Link>
                  </div>
                </div>

                {/* Activity Feed - Modern Card (4 cols) */}
                <div className={`lg:col-span-4 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-400 flex items-center justify-center shadow-lg">
                      <span className="text-xl">📋</span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Activity Feed</h3>
                  </div>

                  <div className="space-y-3 mb-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-gray-800/30 hover:bg-gray-800/50' : 'bg-gray-50 hover:bg-gray-100'} transition-colors cursor-pointer`}>
                        <span className="text-2xl">{activity.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'} line-clamp-2`}>{activity.message}</p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link href="/activity" className={`block text-center text-sm font-semibold ${darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-700'} transition-colors`}>
                    View All Activity →
                  </Link>
                </div>
              </div>

              {/* Modern Upgrade Prompt Card (Full Width) - Modified for Pro Users */}
              <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600 text-white rounded-2xl p-8 shadow-2xl shadow-purple-900/30">
                {/* Animated Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.3),transparent)]"></div>
                  <svg className="absolute -right-20 -bottom-20 w-96 h-96 opacity-20" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="white" />
                  </svg>
                </div>

                <div className="relative z-10">
                  <div className="flex items-start gap-3 mb-4">
                    <span className="text-4xl">🚀</span>
                    <div>
                      <h3 className="text-3xl font-bold mb-2">Unlock AI-Powered Features</h3>
                      <p className="text-purple-100 text-base leading-relaxed">Upgrade to Enterprise to access cutting-edge AI tools for your business</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8">
                    <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl">🤖</span>
                      </div>
                      <div>
                        <p className="font-bold mb-1 text-lg">AI Proposals</p>
                        <p className="text-sm text-purple-100">Generate proposals with AI</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl">🔧</span>
                      </div>
                      <div>
                        <p className="font-bold mb-1 text-lg">Subcontractors</p>
                        <p className="text-sm text-purple-100">Manage your vendors</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                      <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl">📊</span>
                      </div>
                      <div>
                        <p className="font-bold mb-1 text-lg">Advanced CRM</p>
                        <p className="text-sm text-purple-100">Premium lead management</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <Link href="/pricing" className="px-8 py-4 bg-white text-purple-600 rounded-xl font-bold text-lg hover:bg-purple-50 shadow-2xl hover:shadow-3xl transition-all duration-200 hover:scale-105">
                      Upgrade to Enterprise - {planPricing.enterprise}/month
                    </Link>
                    <Link href="/pricing" className="inline-flex items-center gap-2 text-white hover:text-purple-100 font-semibold text-lg group transition-colors">
                      <span>See All Features</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ENTERPRISE TIER DASHBOARD */}
          {userPlan === "enterprise" && (
            <>
              {/* Modern Welcome Banner - Dismissible */}
              {!dismissedWelcome && (
                <div className="relative overflow-hidden bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 text-white rounded-2xl p-8 shadow-2xl shadow-amber-900/30">
                  {/* Decorative Background Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                    <svg className="absolute -right-10 -top-10 w-64 h-64 opacity-20" viewBox="0 0 200 200">
                      <circle cx="100" cy="100" r="80" fill="white" />
                    </svg>
                  </div>

                  <div className="relative z-10 flex items-start justify-between">
                    <div className="flex-1 pr-8">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">🚀</span>
                        <h3 className="text-2xl font-bold">Welcome to Enterprise Dashboard!</h3>
                      </div>
                      <p className="text-amber-100 mb-6 text-sm leading-relaxed">Access AI-powered tools and advanced analytics for your business</p>

                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                          <div className="w-5 h-5 rounded-md bg-green-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium">AI Proposals Active</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                          <div className="w-5 h-5 rounded-md bg-green-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium">Advanced CRM Ready</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                          <div className="w-5 h-5 rounded-md bg-green-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium">Unlimited Storage</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20">
                          <div className="w-5 h-5 rounded-md bg-green-500 flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-sm font-medium">Priority Support</span>
                        </div>
                      </div>

                      <Link href="/help/enterprise" className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-amber-600 rounded-xl text-sm font-bold hover:bg-amber-50 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105">
                        <span>📚</span>
                        <span>Enterprise Documentation</span>
                      </Link>
                    </div>
                    <button
                      onClick={() => setDismissedWelcome(true)}
                      className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Modern Stats Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Project Overview Widget - Modern Card */}
                <div className={`lg:col-span-6 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg">
                        <span className="text-xl">🏗️</span>
                      </div>
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Project Overview</h3>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'} font-medium`}>
                      Unlimited projects
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800/50' : 'bg-gray-50'} border ${darkMode ? 'border-gray-700/50' : 'border-gray-200'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Projects</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>{userStats.totalProjects}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border ${darkMode ? 'border-green-500/20' : 'border-green-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Active</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{userStats.activeProjects}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/10 border ${darkMode ? 'border-amber-500/20' : 'border-amber-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-amber-400' : 'text-amber-700'}`}>On Hold</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>{userStats.onHoldProjects}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800/30 border-gray-700/50' : 'bg-gray-100 border-gray-200'} border hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Completed</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-gray-400' : 'text-gray-700'}`}>{userStats.completedProjects}</p>
                    </div>
                  </div>

                  <Link href="/projects" className="block text-center px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-900/30 hover:shadow-xl transition-all duration-200 hover:scale-105">
                    View All Projects
                  </Link>
                </div>

                {/* Task Summary Widget - Modern Card */}
                <div className={`lg:col-span-6 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-purple-400 flex items-center justify-center shadow-lg">
                      <span className="text-xl">✅</span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Task Summary</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border ${darkMode ? 'border-blue-500/20' : 'border-blue-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>Today's Tasks</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>{userStats.tasksToday}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/10 border ${darkMode ? 'border-red-500/20' : 'border-red-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Overdue</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>{userStats.overdueTasks}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border ${darkMode ? 'border-purple-500/20' : 'border-purple-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>This Week</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>{userStats.tasksThisWeek}</p>
                    </div>
                    <div className={`p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/10 border ${darkMode ? 'border-green-500/20' : 'border-green-500/30'} hover:scale-105 transition-transform duration-200`}>
                      <p className={`text-xs font-medium mb-2 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Completion Rate</p>
                      <p className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>{userStats.completionRate}%</p>
                    </div>
                  </div>

                  <Link href="/taskflow" className="block text-center px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-purple-600 shadow-lg shadow-purple-900/30 hover:shadow-xl transition-all duration-200 hover:scale-105">
                    Go to TaskFlow
                  </Link>
                </div>
              </div>

              {/* Second Row - Modern Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Recent Photos Widget - Modern Card (4 cols) */}
                <div className={`lg:col-span-4 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-pink-400 flex items-center justify-center shadow-lg">
                      <span className="text-xl">📸</span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Recent Photos</h3>
                  </div>

                  <>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className={`aspect-square ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-xl hover:scale-105 transition-transform duration-200 cursor-pointer`}></div>
                      ))}
                    </div>
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className={`font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Storage</span>
                        <span className={`font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>{userStats.storageUsed}GB / Unlimited</span>
                      </div>
                      <div className={`w-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'} rounded-full h-2`}>
                        <div className="bg-gradient-to-r from-pink-600 to-pink-400 h-2 rounded-full transition-all duration-500" style={{ width: '5%' }}></div>
                      </div>
                    </div>
                    <Link href="/fieldsnap" className="block text-center px-4 py-2.5 bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-xl text-sm font-semibold hover:from-pink-700 hover:to-pink-600 shadow-lg shadow-pink-900/30 hover:shadow-xl transition-all duration-200 hover:scale-105">
                      View All Photos
                    </Link>
                  </>
                </div>

                {/* Quick Actions Panel - Modern Grid (4 cols) */}
                <div className={`lg:col-span-4 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg">
                      <span className="text-xl">⚡</span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Quick Actions</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/projects/new" className={`group flex flex-col items-center justify-center p-4 border-2 border-dashed ${darkMode ? 'border-gray-700 hover:border-blue-500 hover:bg-blue-500/5' : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'} rounded-xl transition-all duration-200 hover:scale-105`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🏗️</span>
                      <span className={`text-sm font-semibold text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>New Project</span>
                    </Link>
                    <Link href="/ai-proposals/new" className={`group flex flex-col items-center justify-center p-4 border-2 border-dashed ${darkMode ? 'border-gray-700 hover:border-amber-500 hover:bg-amber-500/5' : 'border-gray-300 hover:border-amber-500 hover:bg-amber-50'} rounded-xl transition-all duration-200 hover:scale-105`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">🤖</span>
                      <span className={`text-sm font-semibold text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>AI Proposal</span>
                    </Link>
                    <Link href="/fieldsnap" className={`group flex flex-col items-center justify-center p-4 border-2 border-dashed ${darkMode ? 'border-gray-700 hover:border-pink-500 hover:bg-pink-500/5' : 'border-gray-300 hover:border-pink-500 hover:bg-pink-50'} rounded-xl transition-all duration-200 hover:scale-105`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📸</span>
                      <span className={`text-sm font-semibold text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Upload Photos</span>
                    </Link>
                    <Link href="/advanced-crm" className={`group flex flex-col items-center justify-center p-4 border-2 border-dashed ${darkMode ? 'border-gray-700 hover:border-green-500 hover:bg-green-500/5' : 'border-gray-300 hover:border-green-500 hover:bg-green-50'} rounded-xl transition-all duration-200 hover:scale-105`}>
                      <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📊</span>
                      <span className={`text-sm font-semibold text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Advanced CRM</span>
                    </Link>
                  </div>
                </div>

                {/* Activity Feed - Modern Card (4 cols) */}
                <div className={`lg:col-span-4 ${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-orange-400 flex items-center justify-center shadow-lg">
                      <span className="text-xl">📋</span>
                    </div>
                    <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Activity Feed</h3>
                  </div>

                  <div className="space-y-3 mb-4">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className={`flex items-start gap-3 p-3 rounded-lg ${darkMode ? 'bg-gray-800/30 hover:bg-gray-800/50' : 'bg-gray-50 hover:bg-gray-100'} transition-colors cursor-pointer`}>
                        <span className="text-2xl">{activity.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'} line-clamp-2`}>{activity.message}</p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link href="/activity" className={`block text-center text-sm font-semibold ${darkMode ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-700'} transition-colors`}>
                    View All Activity →
                  </Link>
                </div>
              </div>

              {/* Enterprise-Specific: Revenue & Analytics Card (Full Width) */}
              <div className={`${darkMode ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-200'} backdrop-blur-sm border rounded-2xl p-6 shadow-xl ${darkMode ? 'shadow-gray-900/50' : 'shadow-gray-200/50'} hover:shadow-2xl transition-all duration-300`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg">
                    <span className="text-xl">💰</span>
                  </div>
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>Revenue Analytics</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 border ${darkMode ? 'border-emerald-500/20' : 'border-emerald-500/30'}`}>
                    <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>Revenue This Month</p>
                    <p className={`text-4xl font-bold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      ${userStats.revenueThisMonth.toLocaleString()}
                    </p>
                    <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>+12% from last month</p>
                  </div>

                  <div className={`p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 border ${darkMode ? 'border-blue-500/20' : 'border-blue-500/30'}`}>
                    <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>Revenue YTD</p>
                    <p className={`text-4xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      ${userStats.revenueYTD.toLocaleString()}
                    </p>
                    <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Across {userStats.completedProjects} completed projects</p>
                  </div>

                  <div className={`p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 border ${darkMode ? 'border-purple-500/20' : 'border-purple-500/30'}`}>
                    <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>Avg Project Value</p>
                    <p className={`text-4xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                      ${Math.round(userStats.revenueYTD / userStats.completedProjects).toLocaleString()}
                    </p>
                    <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>Based on completed projects</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
