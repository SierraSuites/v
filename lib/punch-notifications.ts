import { createClient } from '@/lib/supabase/client'

export interface PunchNotificationCounts {
  total: number
  critical: number
  open: number
  needsAttention: number // Critical + overdue items
}

/**
 * Get punch list notification counts for the current user
 */
export async function getPunchNotificationCounts(): Promise<PunchNotificationCounts> {
  try {
    const supabase = createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { total: 0, critical: 0, open: 0, needsAttention: 0 }
    }

    // Get user's projects
    const { data: projects } = await supabase
      .from('projects')
      .select('id')
      .eq('created_by', user.id)

    if (!projects || projects.length === 0) {
      return { total: 0, critical: 0, open: 0, needsAttention: 0 }
    }

    const projectIds = projects.map(p => p.id)

    // Get all punch items for user's projects
    const { data: punchItems } = await supabase
      .from('punch_list_items')
      .select('id, severity, status, created_at, due_date')
      .in('project_id', projectIds)

    if (!punchItems) {
      return { total: 0, critical: 0, open: 0, needsAttention: 0 }
    }

    // Calculate counts
    const total = punchItems.length

    const critical = punchItems.filter(
      item => item.severity === 'critical' && item.status !== 'closed'
    ).length

    const open = punchItems.filter(
      item => item.status === 'open'
    ).length

    // Items needing attention: critical items or overdue items
    const now = new Date()
    const needsAttention = punchItems.filter(item => {
      if (item.status === 'closed' || item.status === 'verified') {
        return false
      }

      // Critical items always need attention
      if (item.severity === 'critical') {
        return true
      }

      // Overdue items need attention
      if (item.due_date) {
        const dueDate = new Date(item.due_date)
        if (dueDate < now) {
          return true
        }
      }

      return false
    }).length

    return {
      total,
      critical,
      open,
      needsAttention
    }
  } catch (error) {
    console.error('Error getting punch notification counts:', error)
    return { total: 0, critical: 0, open: 0, needsAttention: 0 }
  }
}

/**
 * Subscribe to real-time punch list changes
 */
export function subscribeToPunchListChanges(
  projectIds: string[],
  callback: () => void
) {
  const supabase = createClient()

  const channel = supabase
    .channel('punch-list-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'punch_list_items',
        filter: `project_id=in.(${projectIds.join(',')})`
      },
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
