"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface SharedPhoto {
  id: string
  media_asset_id: string
  shared_with_team_id: string | null
  shared_with_user_id: string | null
  shared_by: string
  permission_level: 'view' | 'comment' | 'edit'
  share_message: string | null
  shared_at: string
  media_asset: any
  shared_by_user: any
  team: any
}

export default function SharedPhotosPage() {
  const router = useRouter()
  const [sharedPhotos, setSharedPhotos] = useState<SharedPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'direct' | 'team'>('all')

  useEffect(() => {
    loadSharedPhotos()
  }, [])

  const loadSharedPhotos = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Get photos shared with this user directly
      const { data: directShares } = await supabase
        .from('shared_media_assets')
        .select(`
          *,
          media_asset:media_assets(*),
          shared_by_user:profiles!shared_by(full_name, avatar_url)
        `)
        .eq('shared_with_user_id', user.id)
        .eq('is_active', true)
        .order('shared_at', { ascending: false })

      // Get photos shared with user's teams
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .is('removed_at', null)

      const teamIds = teamMemberships?.map(m => m.team_id) || []

      let teamShares: any[] = []
      if (teamIds.length > 0) {
        const { data } = await supabase
          .from('shared_media_assets')
          .select(`
            *,
            media_asset:media_assets(*),
            shared_by_user:profiles!shared_by(full_name, avatar_url),
            team:company_teams(name, color)
          `)
          .in('shared_with_team_id', teamIds)
          .eq('is_active', true)
          .order('shared_at', { ascending: false })

        teamShares = data || []
      }

      // Combine all shares
      const allShares = [
        ...(directShares || []).map(s => ({ ...s, shareType: 'direct' })),
        ...(teamShares || []).map(s => ({ ...s, shareType: 'team' }))
      ]

      setSharedPhotos(allShares as any)
    } catch (error) {
      console.error('Error loading shared photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPhotos = sharedPhotos.filter(photo => {
    if (filter === 'all') return true
    if (filter === 'direct') return photo.shared_with_user_id !== null
    if (filter === 'team') return photo.shared_with_team_id !== null
    return true
  })

  const directCount = sharedPhotos.filter(p => p.shared_with_user_id !== null).length
  const teamCount = sharedPhotos.filter(p => p.shared_with_team_id !== null).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-t-transparent rounded-full mx-auto" style={{ borderColor: '#FF6B6B' }} />
          <p className="mt-4 text-sm" style={{ color: '#4A4A4A' }}>Loading shared photos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <header className="bg-white border-b" style={{ borderColor: '#E0E0E0' }}>
        <div className="max-w-7xl mx-auto p-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Shared With Me</h1>
              <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                {sharedPhotos.length} photo{sharedPhotos.length !== 1 ? 's' : ''} shared with you
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div
              className="p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
              style={{ backgroundColor: filter === 'all' ? '#E5F4FF' : '#F8F9FA', border: filter === 'all' ? '2px solid #3B82F6' : '1px solid #E0E0E0' }}
              onClick={() => setFilter('all')}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>All Shared</p>
              <p className="text-xl font-bold" style={{ color: '#1A1A1A' }}>{sharedPhotos.length}</p>
            </div>

            <div
              className="p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
              style={{ backgroundColor: filter === 'direct' ? '#E5F4FF' : '#F8F9FA', border: filter === 'direct' ? '2px solid #3B82F6' : '1px solid #E0E0E0' }}
              onClick={() => setFilter('direct')}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Direct Shares</p>
              <p className="text-xl font-bold" style={{ color: '#1A1A1A' }}>{directCount}</p>
            </div>

            <div
              className="p-3 rounded-lg cursor-pointer hover:shadow-md transition-shadow"
              style={{ backgroundColor: filter === 'team' ? '#E5F4FF' : '#F8F9FA', border: filter === 'team' ? '2px solid #3B82F6' : '1px solid #E0E0E0' }}
              onClick={() => setFilter('team')}
            >
              <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>Team Shares</p>
              <p className="text-xl font-bold" style={{ color: '#1A1A1A' }}>{teamCount}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        {filteredPhotos.length === 0 ? (
          <div className="text-center py-20 rounded-xl" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
            <span className="text-6xl mb-4 block">📤</span>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#1A1A1A' }}>
              {filter === 'all' ? 'No Shared Photos' :
               filter === 'direct' ? 'No Direct Shares' :
               'No Team Shares'}
            </h3>
            <p className="text-sm mb-6" style={{ color: '#4A4A4A' }}>
              {filter === 'all' ? 'Photos shared with you will appear here' :
               filter === 'direct' ? 'Photos shared directly with you will appear here' :
               'Photos shared with your teams will appear here'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredPhotos.map(share => (
              <div
                key={share.id}
                className="group relative rounded-xl overflow-hidden cursor-pointer transform transition-transform hover:scale-105"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', aspectRatio: '1/1' }}
                onClick={() => router.push(`/fieldsnap/${share.media_asset_id}`)}
              >
                <img
                  src={share.media_asset.thumbnail_url || share.media_asset.url}
                  alt={share.media_asset.filename}
                  className="w-full h-full object-cover"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white text-xs font-semibold truncate">
                      {share.media_asset.filename}
                    </p>
                    <p className="text-white/70 text-xs truncate">
                      {share.shared_by_user?.full_name || 'Unknown'}
                    </p>
                    {share.team && (
                      <p className="text-white/70 text-xs truncate">
                        via {share.team.name}
                      </p>
                    )}
                    {share.share_message && (
                      <p className="text-white/90 text-xs mt-1 line-clamp-2">
                        "{share.share_message}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Share Type Badge */}
                <div className="absolute top-2 right-2 flex gap-1">
                  {share.shared_with_user_id && (
                    <span
                      className="px-2 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: '#3B82F6', color: '#FFFFFF' }}
                    >
                      📤 Direct
                    </span>
                  )}
                  {share.shared_with_team_id && (
                    <span
                      className="px-2 py-1 rounded-full text-xs font-bold"
                      style={{ backgroundColor: share.team?.color || '#6B7280', color: '#FFFFFF' }}
                    >
                      👥 Team
                    </span>
                  )}
                </div>

                {/* Permission Level Badge */}
                <div className="absolute top-2 left-2">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-semibold"
                    style={{
                      backgroundColor: share.permission_level === 'edit' ? '#FEF3C7' :
                                     share.permission_level === 'comment' ? '#DBEAFE' : '#F3F4F6',
                      color: share.permission_level === 'edit' ? '#92400E' :
                             share.permission_level === 'comment' ? '#1E40AF' : '#4B5563'
                    }}
                  >
                    {share.permission_level === 'edit' ? '✏️ Edit' :
                     share.permission_level === 'comment' ? '💬 Comment' : '👁️ View'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Help Card */}
        {sharedPhotos.length > 0 && (
          <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#E5F4FF', border: '1px solid #BFDBFE' }}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <p className="font-semibold text-sm mb-1" style={{ color: '#1E40AF' }}>
                  About Shared Photos
                </p>
                <ul className="text-xs space-y-1" style={{ color: '#1E40AF' }}>
                  <li>• <strong>Direct Shares</strong>: Photos shared specifically with you</li>
                  <li>• <strong>Team Shares</strong>: Photos shared with teams you're a member of</li>
                  <li>• <strong>Permission Levels</strong>: View-only, Comment, or Edit access</li>
                  <li>• Click any photo to view full details and AI analysis</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
