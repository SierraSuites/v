'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Toaster } from 'react-hot-toast'
import AppShell from '@/components/dashboard/AppShell'

export default function IntegrationsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

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

      setUser(session.user)
      setLoading(false)
    }

    loadUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <AppShell user={user}>
        {children}
      </AppShell>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff' },
          success: {
            duration: 3000,
            iconTheme: { primary: '#10B981', secondary: '#fff' },
          },
          error: {
            duration: 4000,
            iconTheme: { primary: '#EF4444', secondary: '#fff' },
          },
        }}
      />
    </>
  )
}
