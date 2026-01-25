import { createTask, type TaskInsert } from '@/lib/supabase/tasks'
import { type PunchListItem, type PunchListSeverity } from '@/lib/punchlist'

/**
 * TaskFlow Integration for Punch List
 * Automatically creates TaskFlow tasks from critical punch list items
 */

/**
 * Map punch list severity to task priority
 */
function mapSeverityToPriority(severity: PunchListSeverity): 'critical' | 'high' | 'medium' | 'low' {
  const mapping: Record<PunchListSeverity, 'critical' | 'high' | 'medium' | 'low'> = {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low'
  }
  return mapping[severity]
}

/**
 * Map punch list category to task trade
 */
function mapCategoryToTrade(category: string | null): TaskInsert['trade'] {
  const tradeMapping: Record<string, TaskInsert['trade']> = {
    safety: 'general',
    quality: 'finishing',
    compliance: 'general',
    aesthetic: 'finishing',
    functional: 'general'
  }
  return category ? tradeMapping[category] || 'general' : 'general'
}

/**
 * Determine task phase based on punch item details
 */
function determineTaskPhase(punchItem: PunchListItem): TaskInsert['phase'] {
  // If AI analysis provides hints, use them
  if (punchItem.ai_details?.phase) {
    return punchItem.ai_details.phase
  }

  // Default to finishing for most punch list items
  // Critical safety items go to current phase (assume active work)
  if (punchItem.severity === 'critical' && punchItem.category === 'safety') {
    return 'framing' // Assume active construction phase
  }

  return 'finishing'
}

/**
 * Create a TaskFlow task from a punch list item
 */
export async function createTaskFromPunchItem(
  punchItem: PunchListItem
): Promise<{ success: boolean; taskId?: string; error?: any }> {
  try {
    // Calculate duration based on severity (in days)
    const durationMap: Record<PunchListSeverity, number> = {
      critical: 1,  // 1 day for critical
      high: 3,      // 3 days for high
      medium: 5,    // 5 days for medium
      low: 7        // 7 days for low
    }

    const duration = durationMap[punchItem.severity]

    // Calculate estimated hours based on severity
    const hoursMap: Record<PunchListSeverity, number> = {
      critical: 8,   // 8 hours
      high: 16,      // 2 days
      medium: 24,    // 3 days
      low: 32        // 4 days
    }

    const estimatedHours = hoursMap[punchItem.severity]

    // Build task data
    const taskData: TaskInsert = {
      title: punchItem.title,
      description: `🔗 From Punch List Item #${punchItem.id.substring(0, 8)}

${punchItem.description || 'No description provided'}

${punchItem.ai_generated ? `🤖 AI-Generated Finding (${Math.round((punchItem.ai_confidence || 0) * 100)}% confidence)` : ''}

Location: ${punchItem.location_description || 'Not specified'}
Category: ${punchItem.category || 'General'}

⚠️ This task was automatically created from a punch list item. Update the punch list when work is completed.`,

      project_id: punchItem.project_id,
      project_name: (punchItem.project as any)?.name || null,

      trade: mapCategoryToTrade(punchItem.category),
      phase: determineTaskPhase(punchItem),

      status: 'not-started',
      priority: mapSeverityToPriority(punchItem.severity),

      assignee_id: punchItem.assigned_to,
      assignee_name: punchItem.assigned_user ? (punchItem.assigned_user as any).user_metadata?.full_name || (punchItem.assigned_user as any).email : null,
      assignee_avatar: null,

      start_date: new Date().toISOString().split('T')[0],
      due_date: punchItem.due_date || new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0],

      duration,
      progress: 0,
      estimated_hours: estimatedHours,
      actual_hours: 0,

      dependencies: [],
      attachments: punchItem.photo_id ? 1 : 0,
      comments: 0,

      location: punchItem.location_description,

      weather_dependent: false,
      weather_buffer: 0,

      inspection_required: punchItem.requires_inspection,
      inspection_type: punchItem.category === 'safety' ? 'Safety Inspection' : punchItem.category === 'quality' ? 'Quality Inspection' : null,

      crew_size: punchItem.severity === 'critical' ? 3 : punchItem.severity === 'high' ? 2 : 1,

      equipment: [],
      materials: [],
      certifications: punchItem.category === 'safety' ? ['OSHA 30'] : [],

      safety_protocols: punchItem.category === 'safety'
        ? ['Site Safety Assessment', 'PPE Required', 'Hazard Mitigation']
        : ['Standard Safety Protocols'],

      quality_standards: punchItem.category === 'quality'
        ? ['Quality Control Check', 'Photo Documentation Required', 'Supervisor Approval']
        : [],

      documentation: [
        'Before Photos',
        'After Photos',
        'Punch List Sign-off'
      ],

      notify_inspector: punchItem.requires_inspection,
      client_visibility: punchItem.severity === 'critical' || punchItem.severity === 'high'
    }

    const result = await createTask(taskData)

    if (result.error) {
      console.error('Error creating task from punch item:', result.error)
      return {
        success: false,
        error: result.error
      }
    }

    return {
      success: true,
      taskId: result.data?.id
    }
  } catch (error) {
    console.error('Error in createTaskFromPunchItem:', error)
    return {
      success: false,
      error
    }
  }
}

/**
 * Automatically create tasks for critical punch items that don't have tasks yet
 */
export async function autoCreateTasksForCriticalPunchItems(
  punchItems: PunchListItem[]
): Promise<{ created: number; failed: number; taskIds: string[] }> {
  const results = {
    created: 0,
    failed: 0,
    taskIds: [] as string[]
  }

  // Filter for critical/high severity items without existing tasks
  const itemsNeedingTasks = punchItems.filter(item =>
    !item.task_id &&
    (item.severity === 'critical' || item.severity === 'high') &&
    item.status !== 'resolved' &&
    item.status !== 'closed'
  )

  for (const item of itemsNeedingTasks) {
    const result = await createTaskFromPunchItem(item)

    if (result.success && result.taskId) {
      results.created++
      results.taskIds.push(result.taskId)

      // Update punch item with task reference
      // Note: You would need to add this to punchListService
      // await punchListService.update(item.id, { task_id: result.taskId })
    } else {
      results.failed++
      console.error(`Failed to create task for punch item ${item.id}`)
    }
  }

  return results
}

/**
 * Check if a punch item should auto-create a task
 */
export function shouldAutoCreateTask(punchItem: PunchListItem): boolean {
  return (
    // Must be critical or high severity
    (punchItem.severity === 'critical' || punchItem.severity === 'high') &&
    // Must not already have a task
    !punchItem.task_id &&
    // Must not be resolved/closed
    punchItem.status !== 'resolved' &&
    punchItem.status !== 'closed' &&
    // Must have a project
    !!punchItem.project_id
  )
}

/**
 * Get task status from punch list status
 */
export function syncTaskStatusFromPunchItem(
  punchStatus: PunchListItem['status']
): TaskInsert['status'] {
  const statusMapping: Record<PunchListItem['status'], TaskInsert['status']> = {
    open: 'not-started',
    in_progress: 'in-progress',
    pending_review: 'review',
    resolved: 'completed',
    closed: 'completed',
    rejected: 'blocked'
  }
  return statusMapping[punchStatus]
}

/**
 * Sync punch list status to related task
 */
export async function syncPunchItemToTask(
  punchItem: PunchListItem
): Promise<{ success: boolean; error?: any }> {
  if (!punchItem.task_id) {
    return { success: false, error: 'No task linked to punch item' }
  }

  try {
    const { updateTask } = await import('@/lib/supabase/tasks')

    const newStatus = syncTaskStatusFromPunchItem(punchItem.status)
    const progress = punchItem.status === 'resolved' || punchItem.status === 'closed' ? 100 :
                     punchItem.status === 'in_progress' ? 50 : 0

    const result = await updateTask(punchItem.task_id, {
      status: newStatus,
      progress,
      ...(punchItem.status === 'resolved' || punchItem.status === 'closed' ? { completed_at: new Date().toISOString() } : {})
    })

    if (result.error) {
      console.error('Error syncing punch item to task:', result.error)
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in syncPunchItemToTask:', error)
    return { success: false, error }
  }
}
