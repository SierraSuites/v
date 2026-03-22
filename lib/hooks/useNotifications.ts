// Hook for notifications functionality using Supabase Realtime
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface Notification {
  id: string
  user_id: string
  company_id: string
  notification_type: string
  title: string
  content?: string
  entity_type?: string
  entity_id?: string
  action_url?: string
  read_at?: string | null
  created_at: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  let realtimeChannel: RealtimeChannel | null = null

  // Fetch notifications
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    try {
      setLoading(true)
      const url = unreadOnly
        ? '/api/notifications?unreadOnly=true'
        : '/api/notifications'
      const response = await fetch(url)
      const data = await response.json()

      if (response.ok) {
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Mark notifications as read
  const markAsRead = useCallback(
    async (notificationIds?: string[], markAll = false) => {
      try {
        const response = await fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notificationIds,
            markAllRead: markAll,
          }),
        })

        if (response.ok) {
          // Update local state
          if (markAll) {
            setNotifications((prev) =>
              prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
            )
            setUnreadCount(0)
          } else if (notificationIds) {
            setNotifications((prev) =>
              prev.map((n) =>
                notificationIds.includes(n.id)
                  ? { ...n, read_at: new Date().toISOString() }
                  : n
              )
            )
            setUnreadCount((prev) => Math.max(0, prev - notificationIds.length))
          }
        }
      } catch (err) {
        console.error('Error marking notifications as read:', err)
      }
    },
    []
  )

  // Delete notifications
  const deleteNotifications = useCallback(async (notificationIds: string[]) => {
    try {
      const response = await fetch(
        `/api/notifications?ids=${notificationIds.join(',')}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        setNotifications((prev) =>
          prev.filter((n) => !notificationIds.includes(n.id))
        )
        // Recalculate unread count
        setUnreadCount((prev) => {
          const deletedUnread = notifications.filter(
            (n) => notificationIds.includes(n.id) && !n.read_at
          ).length
          return Math.max(0, prev - deletedUnread)
        })
      }
    } catch (err) {
      console.error('Error deleting notifications:', err)
    }
  }, [notifications])

  // Subscribe to real-time notification updates
  useEffect(() => {
    fetchNotifications()

    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return

      // Subscribe to notifications for this user
      realtimeChannel = supabase
        .channel('notifications:user')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications((prev) => [payload.new as Notification, ...prev])
            setUnreadCount((prev) => prev + 1)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.new.id ? (payload.new as Notification) : n
              )
            )
            // Recalculate unread count
            fetchNotifications()
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id))
            // Recalculate unread count
            fetchNotifications()
          }
        )
        .subscribe()
    })

    // Cleanup
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
    }
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    deleteNotifications,
    refetch: fetchNotifications,
  }
}
