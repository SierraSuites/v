'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Toaster } from "react-hot-toast"
import AppShell from '@/components/dashboard/AppShell'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

const SEGMENT_LABELS: Record<string, string> = {
  dashboard:           'Dashboard',
  projects:            'Projects',
  'design-selections': 'Design Selections',
  approvals:           'Approvals',
  turnover:            'Turnover',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function ProjectsBreadcrumb() {
  const pathname = usePathname()
  const { colors } = useThemeColors()
  const [projectName, setProjectName] = useState<string | null>(null)

  // If the path contains a UUID segment, fetch the project name
  useEffect(() => {
    const uuidSeg = pathname.split('/').find(s => UUID_RE.test(s))
    if (!uuidSeg) { setProjectName(null); return }

    createClient()
      .from('projects')
      .select('name')
      .eq('id', uuidSeg)
      .single()
      .then(({ data }) => setProjectName(data?.name ?? null))
  }, [pathname])

  const rawSegs = pathname.split('/').filter(Boolean)
  const crumbs = [
    { href: '/dashboard', label: 'Dashboard', isLast: false },
    ...rawSegs.map((seg, i) => ({
      href: '/' + rawSegs.slice(0, i + 1).join('/'),
      label: UUID_RE.test(seg)
        ? (projectName ?? '…')
        : (SEGMENT_LABELS[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
      isLast: i === rawSegs.length - 1,
    })),
  ]

  return (
    <nav className="flex items-center gap-1.5 text-sm px-4 sm:px-6 lg:px-8 pt-6 pb-0 max-w-7xl mx-auto">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <span style={{ color: colors.textMuted }}>/</span>}
          {crumb.isLast
            ? <span className="font-medium" style={{ color: colors.text }}>{crumb.label}</span>
            : <Link href={crumb.href} className="hover:underline" style={{ color: colors.textMuted }}>{crumb.label}</Link>
          }
        </span>
      ))}
    </nav>
  )
}

// Only render breadcrumb in the layout for pages that don't manage it themselves
function ProjectsBreadcrumbConditional() {
  const pathname = usePathname()
  const isDetailPage = pathname.split('/').some(s => UUID_RE.test(s))
  const selfManaged = ['/projects', '/projects/design-selections', '/projects/approvals', '/projects/turnover']
  if (isDetailPage || selfManaged.includes(pathname)) return null
  return <ProjectsBreadcrumb />
}

export default function ProjectsLayout({
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <AppShell user={user}>
        <ProjectsBreadcrumbConditional />
        {children}
      </AppShell>
      <Toaster position="top-right" />
    </>
  )
}
