import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsLayoutClient from './SettingsLayoutClient'
import { SettingsProvider } from '@/lib/contexts/SettingsContext'

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile + company in one query — no waterfall
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, company_id, full_name, avatar_url, phone, role, companies(id, name, website, phone, email, industry, size, address)')
    .eq('id', user.id)
    .single()

  const company = (profile?.companies as any) ?? null
  const cleanProfile = profile
    ? { id: profile.id, company_id: profile.company_id, full_name: profile.full_name, avatar_url: profile.avatar_url, phone: profile.phone, role: profile.role }
    : null

  return (
    <SettingsProvider value={{ profile: cleanProfile, company, email: user.email ?? '' }}>
      <SettingsLayoutClient user={user}>
        {children}
      </SettingsLayoutClient>
    </SettingsProvider>
  )
}
