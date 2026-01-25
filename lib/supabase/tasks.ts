import { createClient } from "@/lib/supabase/client"

export type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  project_id: string | null
  project_name: string | null
  trade: "electrical" | "plumbing" | "hvac" | "concrete" | "framing" | "finishing" | "general"
  phase: "pre-construction" | "foundation" | "framing" | "mep" | "finishing" | "closeout"
  status: "not-started" | "in-progress" | "review" | "completed" | "blocked"
  priority: "critical" | "high" | "medium" | "low"
  assignee_id: string | null
  assignee_name: string | null
  assignee_avatar: string | null
  start_date: string | null
  due_date: string
  duration: number
  progress: number
  estimated_hours: number
  actual_hours: number
  dependencies: string[]
  attachments: number
  comments: number
  location: string | null
  weather_dependent: boolean
  weather_buffer: number
  inspection_required: boolean
  inspection_type: string | null
  crew_size: number
  equipment: string[]
  materials: string[]
  certifications: string[]
  safety_protocols: string[]
  quality_standards: string[]
  documentation: string[]
  notify_inspector: boolean
  client_visibility: boolean
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type TaskInsert = Omit<Task, "id" | "user_id" | "created_at" | "updated_at" | "completed_at">
export type TaskUpdate = Partial<TaskInsert>

/**
 * Fetch all tasks for the current user with pagination
 */
export async function getTasks(options?: {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}) {
  const supabase = createClient()
  const page = options?.page || 1
  const pageSize = options?.pageSize || 50
  const sortBy = options?.sortBy || 'due_date'
  const sortOrder = options?.sortOrder || 'asc'

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const query = supabase
    .from("tasks")
    .select("*", { count: 'exact' })
    .order(sortBy, { ascending: sortOrder === 'asc' })
    .range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error("Error fetching tasks:", error)
    console.error("Task fetch error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    return { data: null, error, count: 0, totalPages: 0 }
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 0

  return {
    data,
    error: null,
    count: count || 0,
    totalPages,
    currentPage: page,
    pageSize
  }
}

/**
 * Fetch tasks filtered by project
 */
export async function getTasksByProject(projectId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .order("due_date", { ascending: true })

  if (error) {
    console.error("Error fetching tasks by project:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch tasks filtered by assignee
 */
export async function getTasksByAssignee(assigneeId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("assignee_id", assigneeId)
    .order("due_date", { ascending: true })

  if (error) {
    console.error("Error fetching tasks by assignee:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch tasks filtered by status
 */
export async function getTasksByStatus(status: Task["status"]) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", status)
    .order("due_date", { ascending: true })

  if (error) {
    console.error("Error fetching tasks by status:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch tasks filtered by trade
 */
export async function getTasksByTrade(trade: Task["trade"]) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("trade", trade)
    .order("due_date", { ascending: true })

  if (error) {
    console.error("Error fetching tasks by trade:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch tasks that are weather dependent
 */
export async function getWeatherDependentTasks() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("weather_dependent", true)
    .neq("status", "completed")
    .order("due_date", { ascending: true })

  if (error) {
    console.error("Error fetching weather dependent tasks:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch tasks requiring inspection
 */
export async function getInspectionRequiredTasks() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("inspection_required", true)
    .neq("status", "completed")
    .order("due_date", { ascending: true })

  if (error) {
    console.error("Error fetching inspection required tasks:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch overdue tasks
 */
export async function getOverdueTasks() {
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .lt("due_date", today)
    .neq("status", "completed")
    .order("due_date", { ascending: true })

  if (error) {
    console.error("Error fetching overdue tasks:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch tasks due today
 */
export async function getTasksDueToday() {
  const supabase = createClient()
  const today = new Date().toISOString().split("T")[0]

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("due_date", today)
    .neq("status", "completed")
    .order("priority", { ascending: false })

  if (error) {
    console.error("Error fetching tasks due today:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Fetch a single task by ID
 */
export async function getTaskById(taskId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single()

  if (error) {
    console.error("Error fetching task:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Create a new task
 */
export async function createTask(task: TaskInsert) {
  console.log('createTask function called with:', task)
  const supabase = createClient()

  // Get the current user
  const { data: { user } } = await supabase.auth.getUser()
  console.log('User authenticated for task creation:', user?.id)

  if (!user) {
    console.error('User not authenticated in createTask')
    return { data: null, error: new Error("User not authenticated") }
  }

  const taskToInsert = {
    ...task,
    user_id: user.id
  }
  console.log('Inserting task into database:', taskToInsert)

  const { data, error } = await supabase
    .from("tasks")
    .insert(taskToInsert)
    .select()
    .single()

  if (error) {
    console.error("Error creating task:", error)
    console.error("Task creation error details:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    })
    console.error("Task data being inserted:", task)
    return { data: null, error }
  }

  console.log('✅ Task created successfully:', data)
  return { data, error: null }
}

/**
 * Update an existing task
 */
export async function updateTask(taskId: string, updates: TaskUpdate) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", taskId)
    .select()
    .single()

  if (error) {
    console.error("Error updating task:", error)
    return { data: null, error }
  }

  return { data, error: null }
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)

  if (error) {
    console.error("Error deleting task:", error)
    return { error }
  }

  return { error: null }
}

/**
 * Update task progress
 */
export async function updateTaskProgress(taskId: string, progress: number) {
  return updateTask(taskId, { progress })
}

/**
 * Update task status
 */
export async function updateTaskStatus(taskId: string, status: Task["status"]) {
  return updateTask(taskId, { status })
}

/**
 * Mark task as completed
 */
export async function completeTask(taskId: string) {
  return updateTask(taskId, { status: "completed", progress: 100 })
}

/**
 * Subscribe to real-time task changes
 */
export function subscribeToTasks(callback: (payload: any) => void) {
  const supabase = createClient()

  const channel = supabase
    .channel("tasks-changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tasks"
      },
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Get task statistics
 */
export async function getTaskStatistics() {
  const supabase = createClient()

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("status, priority, trade, weather_dependent, inspection_required")

  if (error) {
    console.error("Error fetching task statistics:", error)
    return {
      total: 0,
      byStatus: {},
      byPriority: {},
      byTrade: {},
      weatherDependent: 0,
      inspectionRequired: 0
    }
  }

  const stats = {
    total: tasks.length,
    byStatus: tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byPriority: tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    byTrade: tasks.reduce((acc, task) => {
      acc[task.trade] = (acc[task.trade] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    weatherDependent: tasks.filter(t => t.weather_dependent).length,
    inspectionRequired: tasks.filter(t => t.inspection_required).length
  }

  return stats
}

/**
 * Bulk update task statuses (for drag-and-drop)
 */
export async function bulkUpdateTaskStatus(updates: { taskId: string; status: Task["status"] }[]) {
  const supabase = createClient()

  const promises = updates.map(({ taskId, status }) =>
    supabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId)
  )

  const results = await Promise.all(promises)

  const errors = results.filter(r => r.error).map(r => r.error)

  if (errors.length > 0) {
    console.error("Errors in bulk update:", errors)
    return { error: errors[0] }
  }

  return { error: null }
}
