'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Real-time dashboard updates hook
 *
 * Subscribes to changes in projects, tasks, quotes, and punch items
 * Triggers a refresh callback when data changes
 *
 * Usage:
 * const handleRefresh = () => {
 *   // Reload your data
 * }
 * useDashboardRealtime(companyId, handleRefresh)
 */
export function useDashboardRealtime(
  companyId: string | null,
  onRefresh: () => void
) {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!companyId) return

    const supabase = createClient()

    // Subscribe to projects changes
    const projectsChannel = supabase
      .channel(`company-${companyId}-projects`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'projects',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          onRefresh()
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
        }
      })

    // Subscribe to tasks changes
    const tasksChannel = supabase
      .channel(`company-${companyId}-tasks`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          onRefresh()
        }
      )
      .subscribe()

    // Subscribe to quotes changes
    const quotesChannel = supabase
      .channel(`company-${companyId}-quotes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          onRefresh()
        }
      )
      .subscribe()

    // Subscribe to punch items changes
    const punchItemsChannel = supabase
      .channel(`company-${companyId}-punch-items`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'punch_items',
          filter: `company_id=eq.${companyId}`
        },
        () => {
          onRefresh()
        }
      )
      .subscribe()

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(projectsChannel)
      supabase.removeChannel(tasksChannel)
      supabase.removeChannel(quotesChannel)
      supabase.removeChannel(punchItemsChannel)
      setIsConnected(false)
    }
  }, [companyId, onRefresh])

  return { isConnected }
}
