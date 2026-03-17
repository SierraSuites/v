// Hook for user presence functionality using Supabase Realtime
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

export interface UserPresence {
  userId: string
  fullName: string
  avatarUrl?: string
  status: PresenceStatus
  lastSeenAt?: string
  currentPage?: string
}

export function usePresence() {
  const [presence, setPresence] = useState<UserPresence[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  let realtimeChannel: RealtimeChannel | null = null

  // Fetch initial presence
  const fetchPresence = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/chat/presence')
      const data = await response.json()

      if (response.ok) {
        setPresence(data.presence || [])
      }
    } catch (err) {
      console.error('Error fetching presence:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Update user's own presence
  const updatePresence = useCallback(
    async (status: PresenceStatus, currentPage?: string) => {
      try {
        const response = await fetch('/api/chat/presence', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, currentPage }),
        })

        if (!response.ok) {
          throw new Error('Failed to update presence')
        }
      } catch (err) {
        console.error('Error updating presence:', err)
      }
    },
    []
  )

  // Subscribe to real-time presence updates
  useEffect(() => {
    fetchPresence()

    // Subscribe to presence changes
    realtimeChannel = supabase
      .channel('presence:global')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
        },
        async (payload) => {
          // Refetch all presence data
          fetchPresence()
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
    }
  }, [fetchPresence])

  // Set user as online when component mounts
  useEffect(() => {
    updatePresence('online')

    // Set user as offline when component unmounts or page is closed
    const handleBeforeUnload = () => {
      updatePresence('offline')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      updatePresence('offline')
    }
  }, [updatePresence])

  // Update presence periodically (heartbeat)
  useEffect(() => {
    const interval = setInterval(() => {
      updatePresence('online', window.location.pathname)
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [updatePresence])

  return {
    presence,
    loading,
    updatePresence,
    refetch: fetchPresence,
  }
}
