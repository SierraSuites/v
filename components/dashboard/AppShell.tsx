'use client'

import { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  name: string
  href: string
  icon: string
  locked?: boolean
  lockedFor?: string[]
  badge?: string
  subItems?: { name: string; href: string }[]
}

interface AppShellProps {
  children: ReactNode
  user: any
}

export default function AppShell({ children, user }: AppShellProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const darkMode = theme === 'dark'
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notificationCount] = useState(3)
  const [expandedNav, setExpandedNav] = useState<string | null>(null)

  const userData = user?.user_metadata || {}
  const userName = userData.full_name?.split(' ')[0] || 'User'

  // Fetch plan from session API (server-side auth) instead of direct DB query
  const [userPlan, setUserPlan] = useState<string>('starter')

  useEffect(() => {
    const fetchPlan = async () => {
      if (!user?.id) return
      const res = await fetch('/api/auth/session')
      if (!res.ok) return
      const data = await res.json()
      if (data.profile?.plan) {
        setUserPlan(data.profile.plan)
      }
    }
    fetchPlan()
  }, [user?.id])

  const planNames = {
    starter: 'Starter',
    professional: 'Professional',
    enterprise: 'Enterprise',
  }

  const planColors = {
    starter: 'bg-blue-500',
    professional: 'bg-purple-500',
    enterprise: 'bg-amber-500',
  }

  const navigationItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: '📊',
    },
    {
      name: 'Projects',
      href: '/projects',
      icon: '🏗️',
      subItems: [
        { name: 'All Projects', href: '/projects' },
        { name: 'Active Projects', href: '/projects?status=active' },
        { name: 'Archived', href: '/projects?status=archived' },
      ],
    },
    {
      name: 'TaskFlow',
      href: '/taskflow',
      icon: '✅',
    },
    {
      name: 'FieldSnap',
      href: '/fieldsnap',
      icon: '📸',
    },
    {
      name: 'QuoteHub',
      href: '/quotes',
      icon: '💰',
    },
    {
      name: 'ReportCenter',
      href: '/reports',
      icon: '📈',
    },
    {
      name: 'CRM Suite',
      href: '/crm',
      icon: '🤝',
      locked: userPlan === 'starter',
      lockedFor: ['starter'],
      badge: 'Pro',
    },
    {
      name: 'Sustainability',
      href: '/sustainability',
      icon: '🌱',
      locked: userPlan === 'starter',
      lockedFor: ['starter'],
      badge: 'Pro',
    },
    {
      name: 'AI Tools',
      href: '/ai',
      icon: '🤖',
      locked: userPlan !== 'enterprise',
      lockedFor: ['starter', 'professional'],
      badge: 'Enterprise',
    },
    {
      name: 'Teams',
      href: '/teams',
      icon: '👥',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: '⚙️',
    },
  ]

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const toggleNav = (name: string) => {
    setExpandedNav(expandedNav === name ? null : name)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'dark bg-[#10121b]' : 'bg-gray-50'}`}>
      {/* Sidebar */}
      <aside
        className={`static inset-y-0 left-0 z-50 backdrop-blur-xl bg-opacity-40 ${
          darkMode ? 'bg-[#10121b]' : 'bg-white'
        } border-r ${
          darkMode ? 'border-gray-800' : 'border-gray-200'
        } transition-all duration-300 flex flex-col shrink-0 ${sidebarCollapsed ? 'w-20' : 'w-72'}`}
      >
        {/* Logo */}
        <div className={`p-6 ${darkMode ? 'border-b border-gray-800' : 'border-b border-gray-200'}`}>
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-blue-400 flex items-center justify-center shadow-lg">
                  <span className="text-white font-bold text-sm">SS</span>
                </div>
                <h1 className={`text-lg font-bold tracking-tight ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  Sierra Suites
                </h1>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={`p-2 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-lg transition-all duration-200`}
            >
              <svg
                className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''} ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* User Profile Widget */}
        <div className={`p-4 ${darkMode ? 'border-b border-gray-800' : 'border-b border-gray-200'}`}>
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl ${
                darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'
              } transition-all duration-200 ${sidebarCollapsed ? 'justify-center' : ''}`}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-600 via-blue-500 to-blue-400 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  {userData.full_name?.charAt(0) || 'U'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 text-left">
                  <p className={`font-semibold text-sm truncate ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {userData.full_name || 'User'}
                  </p>
                  <p className={`text-xs truncate ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                    {userData.company_name || 'Company'}
                  </p>
                  <span
                    className={`inline-block mt-1.5 px-2 py-0.5 text-xs font-semibold text-white rounded-md ${planColors[userPlan as keyof typeof planColors]} shadow-sm`}
                  >
                    {planNames[userPlan as keyof typeof planNames]}
                  </span>
                </div>
              )}
            </button>

            {showProfileDropdown && !sidebarCollapsed && (
              <div
                className={`absolute top-full left-0 right-0 mt-2 ${
                  darkMode ? 'bg-gray-900/95' : 'bg-white'
                } backdrop-blur-xl border ${
                  darkMode ? 'border-gray-800' : 'border-gray-200'
                } rounded-xl shadow-2xl py-2 z-10`}
              >
                <Link
                  href="/profile"
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                    darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                  } transition-colors`}
                >
                  <span>👤</span> Profile
                </Link>
                <Link
                  href="/settings"
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                    darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                  } transition-colors`}
                >
                  <span>⚙️</span> Settings
                </Link>
                <Link
                  href="/pricing"
                  className={`flex items-center gap-3 px-4 py-2.5 text-sm ${
                    darkMode ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'
                  } transition-colors`}
                >
                  <span>💳</span> Billing
                </Link>
                <hr className={`my-2 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`} />
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 text-left px-4 py-2.5 text-sm ${
                    darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                  } text-red-500 transition-colors`}
                >
                  <span>🚪</span> Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1.5">
            {navigationItems.map((item) => (
              <li key={item.name}>
                {item.subItems ? (
                  <>
                    <button
                      onClick={() => toggleNav(item.name)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${
                        darkMode ? 'hover:bg-gray-800/70' : 'hover:bg-gray-100'
                      } transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl transition-transform group-hover:scale-110">{item.icon}</span>
                        {!sidebarCollapsed && (
                          <span className={`font-medium text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {item.name}
                          </span>
                        )}
                      </div>
                      {!sidebarCollapsed && (
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedNav === item.name ? 'rotate-90' : ''} ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
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
                              className={`block px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                                darkMode
                                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                              }`}
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
                    href={item.locked ? '#' : item.href}
                    onClick={(e) => {
                      if (item.locked) {
                        e.preventDefault()
                        alert(`This feature requires ${item.badge} plan. Upgrade to access!`)
                      }
                    }}
                    className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                      item.locked
                        ? `opacity-50 cursor-not-allowed ${darkMode ? 'hover:bg-gray-800/30' : 'hover:bg-gray-100/30'}`
                        : darkMode
                        ? 'hover:bg-gray-800/70 text-gray-300'
                        : 'hover:bg-gray-100 text-gray-700'
                    } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  >
                    <span className="text-xl transition-transform group-hover:scale-110">{item.icon}</span>
                    {!sidebarCollapsed && (
                      <>
                        <span className="font-medium text-sm flex-1">{item.name}</span>
                        {item.locked && <span className="text-xs opacity-60">🔒</span>}
                        {item.badge && (
                          <span className="text-xs px-2 py-1 bg-linear-to-r from-amber-500 to-amber-600 text-white rounded-md font-semibold shadow-sm">
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

        {/* Bottom Section */}
        <div className={`p-4 ${darkMode ? 'border-t border-gray-800' : 'border-t border-gray-200'} space-y-2`}>
          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${
              darkMode ? 'hover:bg-gray-800/70' : 'hover:bg-gray-100'
            } transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <span className="text-xl transition-transform group-hover:scale-110">🔔</span>
            {!sidebarCollapsed && (
              <span className={`font-medium text-sm flex-1 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Notifications
              </span>
            )}
            {notificationCount > 0 && (
              <span
                className={`${
                  sidebarCollapsed ? 'absolute -top-1 -right-1' : ''
                } w-5 h-5 bg-linear-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg`}
              >
                {notificationCount}
              </span>
            )}
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setTheme(darkMode ? 'light' : 'dark')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ${
              darkMode ? 'hover:bg-gray-800/70' : 'hover:bg-gray-100'
            } transition-all duration-200 group ${sidebarCollapsed ? 'justify-center' : ''}`}
          >
            <span className="text-xl transition-transform group-hover:scale-110">{darkMode ? '🌙' : '☀️'}</span>
            {!sidebarCollapsed && (
              <>
                <span className={`font-medium text-sm flex-1 text-left ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {darkMode ? 'Dark Mode' : 'Light Mode'}
                </span>
                <div
                  className={`w-10 h-5 rounded-full relative transition-colors ${
                    darkMode ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform ${
                      darkMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  ></div>
                </div>
              </>
            )}
          </button>

          {/* Upgrade Card */}
          {userPlan !== 'enterprise' && !sidebarCollapsed && (
            <div className="mt-4 p-4 bg-linear-to-br from-blue-600 via-blue-500 to-blue-400 rounded-xl text-white shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-br from-white/10 to-transparent"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">✨</span>
                  <h4 className="font-bold text-sm">Upgrade to {userPlan === 'starter' ? 'Pro' : 'Enterprise'}</h4>
                </div>
                <p className="text-xs opacity-95 mb-3 leading-relaxed">Unlock advanced features and AI-powered tools</p>
                <Link
                  href="/pricing"
                  className="block text-center px-4 py-2 bg-white/95 backdrop-blur-sm text-blue-600 rounded-lg text-xs font-bold hover:bg-white shadow-lg transition-all duration-200 hover:scale-105"
                >
                  Upgrade Now
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${darkMode ? 'bg-[#0d0f17]' : 'bg-gray-50'}`}>
        {/* Top Bar */}
        <header
          className={`backdrop-blur-xl ${
            darkMode ? 'bg-[#10121b]/80 border-gray-800' : 'bg-white/80 border-gray-200'
          } border-b px-6 py-4 sticky top-0 z-40`}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Left: Greeting */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                  {getGreeting()}, {userName}
                </h2>
                <span className="text-2xl animate-wave inline-block">👋</span>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{formatDate()}</p>
            </div>

            {/* Right: Search & Quick Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search projects, tasks..."
                  className={`w-80 px-4 py-2.5 pl-11 rounded-xl border ${
                    darkMode
                      ? 'border-gray-700 bg-gray-800/50 text-gray-200 placeholder-gray-500'
                      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400'
                  } text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all duration-200`}
                />
                <svg
                  className={`absolute left-3.5 top-3 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>

              {/* Quick Actions */}
              <button
                className={`p-2.5 rounded-xl ${
                  darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                } transition-colors`}
                title="Quick Actions"
              >
                <span className="text-xl">➕</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
