"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { usePermissions } from '@/hooks/usePermissions'
import { UnauthorizedAccess } from '@/components/auth/PermissionGate'
import TeamManager from '@/components/teams/TeamManager'
import UserRoleBadge from '@/components/users/UserRoleBadge'

export default function TeamsPage() {
  const router = useRouter()
  const { hasPermission, role, userId, loading: permissionsLoading } = usePermissions()
  const [user, setUser] = useState<any>(null)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user: authUser }, error } = await supabase.auth.getUser()

      if (error || !authUser) {
        router.push('/login')
        return
      }

      setUser(authUser)

      // Get company ID from user metadata or from database
      const company_id = authUser.user_metadata?.company_id

      if (company_id) {
        setCompanyId(company_id)
      } else {
        // Try to get from profile or create
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', authUser.id)
          .single()

        if (profile?.company_id) {
          setCompanyId(profile.company_id)
        }
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto" style={{ borderColor: '#FF6B6B' }} />
          <p className="mt-4 text-sm" style={{ color: '#4A4A4A' }}>Loading teams...</p>
        </div>
      </div>
    )
  }

  // Check permissions
  const canManageTeam = hasPermission('canManageTeam')
  const canInviteMembers = hasPermission('canInviteMembers')

  if (!canManageTeam && !canInviteMembers) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="max-w-7xl mx-auto p-6">
          <UnauthorizedAccess
            message="You need admin or superintendent permissions to manage teams"
            actionText="Back to Dashboard"
            onAction={() => router.push('/dashboard')}
          />
        </div>
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-20">
            <span className="text-6xl mb-4 block">🏢</span>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>No Company Found</h3>
            <p className="text-sm mb-6" style={{ color: '#4A4A4A' }}>
              You need to be part of a company to manage teams
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 rounded-lg font-semibold text-white"
              style={{ backgroundColor: '#FF6B6B' }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <header className="bg-white border-b" style={{ borderColor: '#E0E0E0' }}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Team Management</h1>
                <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                  Manage your teams, members, and project assignments
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {userId && <UserRoleBadge userId={userId} role={role} size="md" />}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Permission Info */}
        <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#E5F4FF', border: '1px solid #BFDBFE' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: '#1E40AF' }}>
                Your Permissions
              </p>
              <ul className="text-xs space-y-1" style={{ color: '#1E40AF' }}>
                {canManageTeam && <li>✓ Can manage teams (create, edit, delete)</li>}
                {canInviteMembers && <li>✓ Can invite and remove members</li>}
                {hasPermission('canChangeRoles') && <li>✓ Can change member roles</li>}
                {hasPermission('canViewAllProjects') && <li>✓ Can view all projects</li>}
              </ul>
            </div>
          </div>
        </div>

        {/* Team Manager Component */}
        <TeamManager companyId={companyId} />
      </main>
    </div>
  )
}
