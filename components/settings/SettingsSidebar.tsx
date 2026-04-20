'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import {
  UserCircleIcon,
  BellIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  PuzzlePieceIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

interface NavSection {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'User Settings',
    items: [
      { label: 'My Account', href: '/settings/profile', icon: UserCircleIcon },
      { label: 'Notifications', href: '/settings/notifications', icon: BellIcon },
      { label: 'Privacy & Security', href: '/settings/security', icon: ShieldCheckIcon },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'Company', href: '/settings/company', icon: BuildingOfficeIcon, adminOnly: true },
      { label: 'Team & Roles', href: '/settings/team', icon: UsersIcon, adminOnly: true },
      { label: 'Billing', href: '/billing', icon: CreditCardIcon, adminOnly: true },
      { label: 'Integrations', href: '/settings/integrations', icon: PuzzlePieceIcon, adminOnly: true },
    ],
  },
]

export default function SettingsSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { colors, darkMode } = useThemeColors()
  const { user } = useCurrentUser()

  const isAdmin = user?.highestRole === 'owner' || user?.highestRole === 'admin'

  async function handleLogout() {
    const supabase = createClient()
    await Promise.all([
      supabase.auth.signOut(),
      fetch('/api/auth/logout', { method: 'POST' }),
    ])
    router.push('/login')
  }

  const sidebarBg = darkMode ? '#10121b' : '#FFFFFF'
  const activeBg = darkMode ? '#1e2333' : '#E8E8E8'
  const hoverBg = darkMode ? '#1e2333' : '#F0F0F0'
  const textColor = colors.textMuted
  const activeTextColor = colors.text
  const dividerColor = darkMode ? '#2d3548' : '#E0E0E0'
  const labelColor = colors.textMuted

  return (
    <div
      className="flex flex-col w-58 min-h-screen shrink-0 overflow-y-auto"
      style={{ backgroundColor: sidebarBg }}
    >
      <div className="px-3 pt-6 pb-2 flex-1">
        {NAV_SECTIONS.map((section, si) => {
          const visibleItems = section.items.filter(item => !item.adminOnly || isAdmin)
          if (visibleItems.length === 0) return null

          return (
            <div key={si} className="mb-2">
              <div
                className="px-2.5 mb-1 text-xs font-semibold uppercase tracking-wide"
                style={{ color: labelColor }}
              >
                {section.title}
              </div>
              {visibleItems.map(item => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md mb-0.5 transition-colors"
                    style={{
                      backgroundColor: active ? activeBg : 'transparent',
                      color: active ? activeTextColor : textColor,
                      fontWeight: active ? 600 : 400,
                      fontSize: '0.9375rem',
                    }}
                    onMouseEnter={e => {
                      if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = hoverBg
                    }}
                    onMouseLeave={e => {
                      if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                    }}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    {item.label}
                  </Link>
                )
              })}
              {si < NAV_SECTIONS.length - 1 && (
                <div className="my-3 mx-2.5 h-px" style={{ backgroundColor: dividerColor }} />
              )}
            </div>
          )
        })}

        {/* Divider before logout */}
        <div className="my-3 mx-2.5 h-px" style={{ backgroundColor: dividerColor }} />

        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md w-full transition-colors text-left"
          style={{ color: '#f23f42', fontSize: '0.9375rem' }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = darkMode ? 'rgba(242,63,66,0.1)' : 'rgba(242,63,66,0.08)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
          }}
        >
          <XMarkIcon className="w-5 h-5 shrink-0" />
          Log Out
        </button>
      </div>

      {/* Version tag */}
      <div className="px-5 py-4 text-xs" style={{ color: labelColor }}>
        Sierra Suites Software
      </div>
    </div>
  )
}
