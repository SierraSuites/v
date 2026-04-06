'use client'

import { createContext, useContext } from 'react'

export interface SettingsProfile {
  id: string
  company_id: string | null
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: string
}

export interface SettingsCompany {
  id: string
  name: string
  website: string | null
  phone: string | null
  email: string | null
  industry: string | null
  size: string | null
  address: { street?: string; city?: string; state?: string; zip?: string } | null
}

interface SettingsData {
  profile: SettingsProfile | null
  company: SettingsCompany | null
  email: string
}

const SettingsContext = createContext<SettingsData>({
  profile: null,
  company: null,
  email: '',
})

export function SettingsProvider({
  value,
  children,
}: {
  value: SettingsData
  children: React.ReactNode
}) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettingsData() {
  return useContext(SettingsContext)
}
