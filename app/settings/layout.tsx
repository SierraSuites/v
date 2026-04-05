'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Toaster } from 'react-hot-toast'
import AppShell from '@/components/dashboard/AppShell'
import SettingsSidebar from '@/components/settings/SettingsSidebar'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { colors, darkMode } = useThemeColors()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        router.push('/login')
        return
      }

      setUser(session.user)
      setLoading(false)
    }
    loadUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bgAlt }}>
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <AppShell user={user}>
        <div className="flex min-h-full" style={{ backgroundColor: colors.bgAlt }}>
          <SettingsSidebar />
          {/* Vertical divider */}
          <div className="w-px shrink-0" style={{ backgroundColor: colors.bgMuted }} />
          {/* Content */}
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: colors.bgAlt }}>
            {children}
          </div>
        </div>
      </AppShell>
      <Toaster position="top-right" />
    </>
  )
}
