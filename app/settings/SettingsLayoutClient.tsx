'use client'

import AppShell from '@/components/dashboard/AppShell'
import SettingsSidebar from '@/components/settings/SettingsSidebar'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { Toaster } from 'react-hot-toast'

export default function SettingsLayoutClient({
  user,
  children,
}: {
  user: any
  children: React.ReactNode
}) {
  const { darkMode } = useThemeColors()
  const pageBg = darkMode ? '#0f1117' : '#F9FAFB'
  const dividerColor = darkMode ? '#1e2333' : '#E0E0E0'

  return (
    <>
      <AppShell user={user}>
        <div className="flex min-h-full" style={{ backgroundColor: pageBg }}>
          <SettingsSidebar />
          <div className="w-px shrink-0" style={{ backgroundColor: dividerColor }} />
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: pageBg }}>
            {children}
          </div>
        </div>
      </AppShell>
      <Toaster position="top-right" />
    </>
  )
}
