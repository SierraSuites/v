# TASKFLOW - IMPLEMENTATION QUALITY GUIDE

**Module**: Task & Schedule Management (Module 05)
**Business Purpose**: Daily work management, team coordination, schedule tracking
**Target Quality**: 95%+ before launch
**Priority**: CRITICAL - Operations backbone

---

## 1. CORE QUALITY REQUIREMENTS

### 1.1 Critical Feature: Task Dependencies & Critical Path

**Standard**: Dependencies MUST prevent tasks from starting until prerequisites complete. Critical path MUST update in real-time.

**Why It Matters**: Without dependencies, teams start tasks out of order, causing rework. Example: Crew shows up to install drywall before electrical rough-in passes inspection = wasted day + $2,000.

**Database Schema**:
```sql
-- Task dependencies table
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Dependency types
  dependency_type TEXT NOT NULL DEFAULT 'finish_to_start',
    -- 'finish_to_start': Task B starts after Task A finishes
    -- 'start_to_start': Task B starts when Task A starts
    -- 'finish_to_finish': Task B finishes when Task A finishes
    -- 'start_to_finish': Task B finishes when Task A starts (rare)

  lag_days INT DEFAULT 0, -- Buffer days after dependency (e.g., concrete needs 3 days to cure)

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id), -- Can't depend on self
  CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'))
);

-- Indexes for performance
CREATE INDEX idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX idx_task_deps_depends ON task_dependencies(depends_on_task_id);

-- RLS policies
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage dependencies in their company"
  ON task_dependencies
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Prevent circular dependencies
CREATE OR REPLACE FUNCTION prevent_circular_dependencies()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if adding this dependency creates a cycle
  IF EXISTS (
    WITH RECURSIVE dep_chain AS (
      -- Start with the new dependency
      SELECT NEW.depends_on_task_id AS task_id, NEW.task_id AS depends_on
      UNION
      -- Follow the chain
      SELECT dc.task_id, td.task_id
      FROM dep_chain dc
      JOIN task_dependencies td ON td.depends_on_task_id = dc.depends_on
      WHERE dc.depends_on = NEW.task_id -- Stop if we circle back
    )
    SELECT 1 FROM dep_chain WHERE task_id = NEW.task_id
  ) THEN
    RAISE EXCEPTION 'Circular dependency detected';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_circular_deps
  BEFORE INSERT OR UPDATE ON task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_dependencies();

-- Critical path calculation (materialized view for performance)
CREATE MATERIALIZED VIEW project_critical_path AS
WITH RECURSIVE task_chain AS (
  -- Start with tasks that have no dependencies (root tasks)
  SELECT
    t.id,
    t.project_id,
    t.title,
    t.estimated_hours,
    t.due_date,
    ARRAY[t.id] AS path,
    t.estimated_hours AS total_hours,
    0 AS depth
  FROM tasks t
  WHERE NOT EXISTS (
    SELECT 1 FROM task_dependencies td WHERE td.task_id = t.id
  )
  AND t.deleted_at IS NULL

  UNION ALL

  -- Add dependent tasks
  SELECT
    t.id,
    t.project_id,
    t.title,
    t.estimated_hours,
    t.due_date,
    tc.path || t.id,
    tc.total_hours + t.estimated_hours,
    tc.depth + 1
  FROM tasks t
  JOIN task_dependencies td ON td.task_id = t.id
  JOIN task_chain tc ON tc.id = td.depends_on_task_id
  WHERE t.deleted_at IS NULL
)
SELECT
  project_id,
  path AS critical_path_task_ids,
  total_hours AS critical_path_hours,
  depth AS critical_path_length
FROM task_chain
WHERE (project_id, total_hours) IN (
  SELECT project_id, MAX(total_hours)
  FROM task_chain
  GROUP BY project_id
);

CREATE UNIQUE INDEX idx_critical_path_project ON project_critical_path(project_id);

-- Refresh critical path when tasks or dependencies change
CREATE OR REPLACE FUNCTION refresh_critical_path()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_critical_path;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_critical_path_on_task_change
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_critical_path();

CREATE TRIGGER refresh_critical_path_on_dependency_change
  AFTER INSERT OR UPDATE OR DELETE ON task_dependencies
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_critical_path();
```

**API Implementation**:
```typescript
// app/api/tasks/[taskId]/dependencies/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const dependencySchema = z.object({
  depends_on_task_id: z.string().uuid(),
  dependency_type: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']),
  lag_days: z.number().int().min(0).optional().default(0),
})

export async function POST(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json()

    // Validate input
    const validatedData = dependencySchema.parse(body)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get task to verify it exists and get company_id
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, company_id, project_id')
      .eq('id', params.taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Verify dependency task exists and is in same project
    const { data: dependsOnTask, error: depTaskError } = await supabase
      .from('tasks')
      .select('id, project_id')
      .eq('id', validatedData.depends_on_task_id)
      .single()

    if (depTaskError || !dependsOnTask) {
      return NextResponse.json({ error: 'Dependency task not found' }, { status: 404 })
    }

    if (dependsOnTask.project_id !== task.project_id) {
      return NextResponse.json(
        { error: 'Cannot create dependency between tasks in different projects' },
        { status: 400 }
      )
    }

    // Create dependency
    const { data: dependency, error: depError } = await supabase
      .from('task_dependencies')
      .insert({
        task_id: params.taskId,
        depends_on_task_id: validatedData.depends_on_task_id,
        dependency_type: validatedData.dependency_type,
        lag_days: validatedData.lag_days,
        company_id: task.company_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (depError) {
      // Handle circular dependency error
      if (depError.message?.includes('Circular dependency')) {
        return NextResponse.json(
          { error: 'This dependency would create a circular reference. Tasks cannot depend on each other in a loop.' },
          { status: 400 }
        )
      }
      throw depError
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      company_id: task.company_id,
      user_id: user.id,
      action: 'dependency_created',
      entity_type: 'task',
      entity_id: params.taskId,
      metadata: {
        depends_on_task_id: validatedData.depends_on_task_id,
        dependency_type: validatedData.dependency_type,
      },
    })

    return NextResponse.json({ dependency }, { status: 201 })

  } catch (error) {
    console.error('Error creating task dependency:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get all dependencies for a task
export async function GET(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data: dependencies, error } = await supabase
    .from('task_dependencies')
    .select(`
      *,
      depends_on_task:tasks!task_dependencies_depends_on_task_id_fkey(
        id,
        title,
        status,
        due_date,
        assignee:user_profiles(id, name, avatar_url)
      )
    `)
    .eq('task_id', params.taskId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ dependencies })
}

// Delete dependency
export async function DELETE(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })
  const { searchParams } = new URL(req.url)
  const dependencyId = searchParams.get('dependencyId')

  if (!dependencyId) {
    return NextResponse.json({ error: 'Dependency ID required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('task_dependencies')
    .delete()
    .eq('id', dependencyId)
    .eq('task_id', params.taskId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

**UI Implementation**:
```typescript
// components/tasks/TaskDependencies.tsx

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LinkIcon, XIcon, AlertTriangleIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskDependenciesProps {
  taskId: string
  projectId: string
}

export function TaskDependencies({ taskId, projectId }: TaskDependenciesProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string>('')
  const [dependencyType, setDependencyType] = useState<string>('finish_to_start')
  const [lagDays, setLagDays] = useState<number>(0)

  const queryClient = useQueryClient()

  // Fetch existing dependencies
  const { data: dependenciesData, isLoading: loadingDeps } = useQuery({
    queryKey: ['task-dependencies', taskId],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`)
      if (!res.ok) throw new Error('Failed to fetch dependencies')
      return res.json()
    },
  })

  // Fetch available tasks in same project
  const { data: availableTasksData } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: async () => {
      const res = await fetch(`/api/projects/${projectId}/tasks`)
      if (!res.ok) throw new Error('Failed to fetch tasks')
      return res.json()
    },
    enabled: isAdding,
  })

  // Add dependency mutation
  const addDependencyMutation = useMutation({
    mutationFn: async (data: { depends_on_task_id: string; dependency_type: string; lag_days: number }) => {
      const res = await fetch(`/api/tasks/${taskId}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to add dependency')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] })
      queryClient.invalidateQueries({ queryKey: ['project-critical-path', projectId] })
      setIsAdding(false)
      setSelectedTaskId('')
      setLagDays(0)
    },
  })

  // Remove dependency mutation
  const removeDependencyMutation = useMutation({
    mutationFn: async (dependencyId: string) => {
      const res = await fetch(`/api/tasks/${taskId}/dependencies?dependencyId=${dependencyId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to remove dependency')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-dependencies', taskId] })
      queryClient.invalidateQueries({ queryKey: ['project-critical-path', projectId] })
    },
  })

  const dependencies = dependenciesData?.dependencies || []
  const availableTasks = availableTasksData?.tasks?.filter((t: any) => t.id !== taskId) || []

  const handleAddDependency = () => {
    if (!selectedTaskId) return

    addDependencyMutation.mutate({
      depends_on_task_id: selectedTaskId,
      dependency_type: dependencyType,
      lag_days: lagDays,
    })
  }

  const getDependencyTypeLabel = (type: string) => {
    switch (type) {
      case 'finish_to_start': return 'Finish to Start'
      case 'start_to_start': return 'Start to Start'
      case 'finish_to_finish': return 'Finish to Finish'
      case 'start_to_finish': return 'Start to Finish'
      default: return type
    }
  }

  if (loadingDeps) {
    return <div className="animate-pulse h-24 bg-gray-100 rounded" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Dependencies</h3>
        {!isAdding && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAdding(true)}
          >
            <LinkIcon className="w-4 h-4 mr-2" />
            Add Dependency
          </Button>
        )}
      </div>

      {/* Error display */}
      {addDependencyMutation.isError && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="w-4 h-4" />
          <AlertDescription>
            {addDependencyMutation.error instanceof Error
              ? addDependencyMutation.error.message
              : 'Failed to add dependency'}
          </AlertDescription>
        </Alert>
      )}

      {/* Add dependency form */}
      {isAdding && (
        <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              This task depends on:
            </label>
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a task..." />
              </SelectTrigger>
              <SelectContent>
                {availableTasks.map((task: any) => (
                  <SelectItem key={task.id} value={task.id}>
                    <div className="flex items-center gap-2">
                      <Badge variant={task.status === 'completed' ? 'success' : 'default'}>
                        {task.status}
                      </Badge>
                      <span>{task.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Dependency Type:
            </label>
            <Select value={dependencyType} onValueChange={setDependencyType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="finish_to_start">
                  Finish to Start (most common)
                </SelectItem>
                <SelectItem value="start_to_start">
                  Start to Start
                </SelectItem>
                <SelectItem value="finish_to_finish">
                  Finish to Finish
                </SelectItem>
                <SelectItem value="start_to_finish">
                  Start to Finish (rare)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {dependencyType === 'finish_to_start' && 'This task starts after the selected task finishes'}
              {dependencyType === 'start_to_start' && 'This task starts when the selected task starts'}
              {dependencyType === 'finish_to_finish' && 'This task finishes when the selected task finishes'}
              {dependencyType === 'start_to_finish' && 'This task finishes when the selected task starts'}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Lag (days):
            </label>
            <input
              type="number"
              min="0"
              value={lagDays}
              onChange={(e) => setLagDays(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="0"
            />
            <p className="text-xs text-gray-500 mt-1">
              Buffer time after dependency (e.g., concrete needs 3 days to cure)
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleAddDependency}
              disabled={!selectedTaskId || addDependencyMutation.isPending}
            >
              {addDependencyMutation.isPending ? 'Adding...' : 'Add Dependency'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsAdding(false)
                setSelectedTaskId('')
                setLagDays(0)
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Dependencies list */}
      {dependencies.length > 0 ? (
        <div className="space-y-2">
          {dependencies.map((dep: any) => (
            <div
              key={dep.id}
              className="flex items-center justify-between p-3 border rounded-lg bg-white"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <LinkIcon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-sm">
                    {dep.depends_on_task.title}
                  </span>
                  <Badge variant={dep.depends_on_task.status === 'completed' ? 'success' : 'default'}>
                    {dep.depends_on_task.status}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500 ml-6">
                  {getDependencyTypeLabel(dep.dependency_type)}
                  {dep.lag_days > 0 && ` + ${dep.lag_days} day${dep.lag_days > 1 ? 's' : ''} lag`}
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeDependencyMutation.mutate(dep.id)}
                disabled={removeDependencyMutation.isPending}
              >
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        !isAdding && (
          <div className="text-center py-6 text-gray-500 text-sm">
            No dependencies yet. Add one to ensure tasks happen in the right order.
          </div>
        )
      )}
    </div>
  )
}
```

**Testing Checklist**:
- [ ] Can create finish-to-start dependency
- [ ] Can create start-to-start dependency
- [ ] Cannot create circular dependency (shows error)
- [ ] Cannot create dependency to self (shows error)
- [ ] Lag days work correctly (task auto-scheduled after lag)
- [ ] Deleting dependency works
- [ ] Dependencies show in Gantt chart view
- [ ] Critical path updates when dependencies change
- [ ] Completing prerequisite task enables dependent task
- [ ] Cannot start dependent task if prerequisite incomplete (blocked state)
- [ ] RLS prevents users from seeing other company dependencies

**Success Metrics**:
- 80% of projects use task dependencies
- < 5% of tasks started out of order
- Zero circular dependency bugs reported

---

### 1.2 Critical Feature: Recurring Tasks

**Standard**: Recurring tasks MUST auto-create on schedule without manual intervention. Users should never manually create duplicate tasks.

**Why It Matters**: Daily safety inspections, weekly progress meetings, monthly reporting - these happen on every project. Creating them manually is error-prone and time-consuming.

**Database Schema**:
```sql
CREATE TABLE recurring_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  -- Template
  title VARCHAR(500) NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  task_type TEXT DEFAULT 'task',
  estimated_hours DECIMAL(8, 2),

  -- Recurrence pattern
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  interval INT DEFAULT 1 CHECK (interval > 0), -- Every X days/weeks/months
  days_of_week INT[], -- [1,2,3,4,5] for Mon-Fri (1=Monday, 7=Sunday)
  day_of_month INT CHECK (day_of_month >= 1 AND day_of_month <= 31),

  -- Schedule bounds
  start_date DATE NOT NULL,
  end_date DATE, -- NULL = no end
  max_occurrences INT, -- Alternative to end_date

  -- Assignment
  assignee_rotation UUID[], -- Rotate through these user IDs
  current_rotation_index INT DEFAULT 0,
  assign_to_project_manager BOOLEAN DEFAULT false,

  -- Creation strategy
  create_in_advance_days INT DEFAULT 7, -- Create tasks X days in advance

  -- Status
  is_active BOOLEAN DEFAULT true,
  paused_until DATE,

  -- Tracking
  last_created_at DATE,
  next_create_date DATE,
  occurrences_created INT DEFAULT 0,

  -- Checklist template
  checklist_items JSONB DEFAULT '[]',

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recurring_tasks_company ON recurring_tasks(company_id);
CREATE INDEX idx_recurring_tasks_project ON recurring_tasks(project_id);
CREATE INDEX idx_recurring_tasks_next_create ON recurring_tasks(next_create_date)
  WHERE is_active = true AND (paused_until IS NULL OR paused_until < CURRENT_DATE);

ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage recurring tasks in their company"
  ON recurring_tasks
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Function to calculate next occurrence
CREATE OR REPLACE FUNCTION calculate_next_occurrence(
  p_last_date DATE,
  p_frequency TEXT,
  p_interval INT,
  p_days_of_week INT[],
  p_day_of_month INT
) RETURNS DATE AS $$
DECLARE
  v_next_date DATE;
  v_day_of_week INT;
BEGIN
  CASE p_frequency
    WHEN 'daily' THEN
      v_next_date := p_last_date + (p_interval || ' days')::INTERVAL;

    WHEN 'weekly' THEN
      -- Find next matching day of week
      v_next_date := p_last_date + '1 day'::INTERVAL;
      v_day_of_week := EXTRACT(ISODOW FROM v_next_date);

      -- Keep incrementing until we hit a matching day of week
      WHILE NOT (v_day_of_week = ANY(p_days_of_week)) LOOP
        v_next_date := v_next_date + '1 day'::INTERVAL;
        v_day_of_week := EXTRACT(ISODOW FROM v_next_date);
      END LOOP;

    WHEN 'monthly' THEN
      v_next_date := (p_last_date + (p_interval || ' months')::INTERVAL);
      -- Set to specific day of month
      IF p_day_of_month IS NOT NULL THEN
        v_next_date := DATE_TRUNC('month', v_next_date) + (p_day_of_month - 1 || ' days')::INTERVAL;
      END IF;

    ELSE
      RAISE EXCEPTION 'Unknown frequency: %', p_frequency;
  END CASE;

  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql;

-- Background job to create recurring task instances
-- This would be called by a cron job (e.g., Supabase Edge Functions + pg_cron)
CREATE OR REPLACE FUNCTION create_recurring_task_instances()
RETURNS void AS $$
DECLARE
  rec_task RECORD;
  new_task_date DATE;
  assignee_id UUID;
BEGIN
  -- Find all recurring tasks that need new instances created
  FOR rec_task IN
    SELECT *
    FROM recurring_tasks
    WHERE is_active = true
      AND (paused_until IS NULL OR paused_until < CURRENT_DATE)
      AND (
        next_create_date IS NULL
        OR next_create_date <= CURRENT_DATE + (create_in_advance_days || ' days')::INTERVAL
      )
      AND (end_date IS NULL OR next_create_date <= end_date)
      AND (max_occurrences IS NULL OR occurrences_created < max_occurrences)
  LOOP
    -- Calculate next task date
    IF rec_task.next_create_date IS NULL THEN
      new_task_date := rec_task.start_date;
    ELSE
      new_task_date := rec_task.next_create_date;
    END IF;

    -- Determine assignee (rotation or PM)
    IF rec_task.assign_to_project_manager AND rec_task.project_id IS NOT NULL THEN
      SELECT owner_id INTO assignee_id
      FROM projects
      WHERE id = rec_task.project_id;
    ELSIF rec_task.assignee_rotation IS NOT NULL AND array_length(rec_task.assignee_rotation, 1) > 0 THEN
      assignee_id := rec_task.assignee_rotation[(rec_task.current_rotation_index % array_length(rec_task.assignee_rotation, 1)) + 1];
    ELSE
      assignee_id := rec_task.created_by;
    END IF;

    -- Create the task instance
    INSERT INTO tasks (
      company_id,
      project_id,
      title,
      description,
      priority,
      task_type,
      estimated_hours,
      due_date,
      assignee_id,
      status,
      recurring_task_id,
      created_by
    ) VALUES (
      rec_task.company_id,
      rec_task.project_id,
      rec_task.title || ' - ' || to_char(new_task_date, 'Mon DD'),
      rec_task.description,
      rec_task.priority,
      rec_task.task_type,
      rec_task.estimated_hours,
      new_task_date,
      assignee_id,
      'not_started',
      rec_task.id,
      rec_task.created_by
    );

    -- Create checklist items if template exists
    IF rec_task.checklist_items IS NOT NULL AND jsonb_array_length(rec_task.checklist_items) > 0 THEN
      INSERT INTO task_checklist_items (task_id, title, sequence_order)
      SELECT
        (SELECT id FROM tasks WHERE recurring_task_id = rec_task.id ORDER BY created_at DESC LIMIT 1),
        item->>'title',
        (item->>'order')::INT
      FROM jsonb_array_elements(rec_task.checklist_items) AS item;
    END IF;

    -- Update recurring task record
    UPDATE recurring_tasks
    SET
      last_created_at = new_task_date,
      next_create_date = calculate_next_occurrence(
        new_task_date,
        frequency,
        interval,
        days_of_week,
        day_of_month
      ),
      occurrences_created = occurrences_created + 1,
      current_rotation_index = current_rotation_index + 1
    WHERE id = rec_task.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**API Implementation**:
```typescript
// app/api/recurring-tasks/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const recurringTaskSchema = z.object({
  project_id: z.string().uuid().optional(),
  title: z.string().min(3).max(500),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  task_type: z.string().optional(),
  estimated_hours: z.number().positive().optional(),

  frequency: z.enum(['daily', 'weekly', 'monthly']),
  interval: z.number().int().positive().default(1),
  days_of_week: z.array(z.number().int().min(1).max(7)).optional(),
  day_of_month: z.number().int().min(1).max(31).optional(),

  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  max_occurrences: z.number().int().positive().optional(),

  assignee_rotation: z.array(z.string().uuid()).optional(),
  assign_to_project_manager: z.boolean().default(false),

  create_in_advance_days: z.number().int().min(0).max(365).default(7),

  checklist_items: z.array(z.object({
    title: z.string(),
    order: z.number().int(),
  })).optional(),
})

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json()

    // Validate
    const validatedData = recurringTaskSchema.parse(body)

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get company_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Validate frequency-specific fields
    if (validatedData.frequency === 'weekly' && (!validatedData.days_of_week || validatedData.days_of_week.length === 0)) {
      return NextResponse.json(
        { error: 'days_of_week required for weekly frequency' },
        { status: 400 }
      )
    }

    if (validatedData.frequency === 'monthly' && !validatedData.day_of_month) {
      return NextResponse.json(
        { error: 'day_of_month required for monthly frequency' },
        { status: 400 }
      )
    }

    // Create recurring task
    const { data: recurringTask, error } = await supabase
      .from('recurring_tasks')
      .insert({
        ...validatedData,
        company_id: profile.company_id,
        created_by: user.id,
        next_create_date: validatedData.start_date, // First occurrence
        checklist_items: validatedData.checklist_items || [],
      })
      .select()
      .single()

    if (error) throw error

    // Immediately create first instance if start_date is within create_in_advance_days
    const startDate = new Date(validatedData.start_date)
    const today = new Date()
    const advanceDays = validatedData.create_in_advance_days
    const advanceDate = new Date(today)
    advanceDate.setDate(advanceDate.getDate() + advanceDays)

    if (startDate <= advanceDate) {
      // Trigger instance creation
      await supabase.rpc('create_recurring_task_instances')
    }

    return NextResponse.json({ recurringTask }, { status: 201 })

  } catch (error) {
    console.error('Error creating recurring task:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get recurring tasks
export async function GET(req: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  let query = supabase
    .from('recurring_tasks')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ recurringTasks: data })
}
```

**UI Implementation**:
```typescript
// components/tasks/CreateRecurringTaskModal.tsx

'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

interface CreateRecurringTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
}

export function CreateRecurringTaskModal({
  open,
  onOpenChange,
  projectId,
}: CreateRecurringTaskModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [interval, setInterval] = useState(1)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]) // Mon-Fri default
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [startDate, setStartDate] = useState<Date>(new Date())
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [hasEndDate, setHasEndDate] = useState(false)
  const [createInAdvanceDays, setCreateInAdvanceDays] = useState(7)

  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/recurring-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create recurring task')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      onOpenChange(false)
      resetForm()
    },
  })

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setFrequency('weekly')
    setInterval(1)
    setDaysOfWeek([1, 2, 3, 4, 5])
    setDayOfMonth(1)
    setStartDate(new Date())
    setEndDate(undefined)
    setHasEndDate(false)
    setCreateInAdvanceDays(7)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const data: any = {
      project_id: projectId,
      title,
      description,
      frequency,
      interval,
      start_date: format(startDate, 'yyyy-MM-dd'),
      create_in_advance_days: createInAdvanceDays,
    }

    if (frequency === 'weekly') {
      data.days_of_week = daysOfWeek
    } else if (frequency === 'monthly') {
      data.day_of_month = dayOfMonth
    }

    if (hasEndDate && endDate) {
      data.end_date = format(endDate, 'yyyy-MM-dd')
    }

    createMutation.mutate(data)
  }

  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort()
    )
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Recurring Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Details */}
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Daily safety inspection"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Walk the site and check for safety hazards..."
              rows={3}
            />
          </div>

          {/* Frequency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="frequency">Frequency *</Label>
              <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="interval">Every</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  value={interval}
                  onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <span className="text-sm text-gray-600">
                  {frequency === 'daily' && 'day(s)'}
                  {frequency === 'weekly' && 'week(s)'}
                  {frequency === 'monthly' && 'month(s)'}
                </span>
              </div>
            </div>
          </div>

          {/* Days of Week (for weekly) */}
          {frequency === 'weekly' && (
            <div>
              <Label>On Days</Label>
              <div className="flex gap-2 mt-2">
                {dayNames.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDayOfWeek(index + 1)}
                    className={`
                      px-3 py-2 rounded-md text-sm font-medium transition-colors
                      ${daysOfWeek.includes(index + 1)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Day of Month (for monthly) */}
          {frequency === 'monthly' && (
            <div>
              <Label htmlFor="dayOfMonth">Day of Month</Label>
              <Input
                id="dayOfMonth"
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                className="w-24"
              />
              <p className="text-xs text-gray-500 mt-1">
                Task will be created on this day each month
              </p>
            </div>
          )}

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="hasEndDate"
                  checked={hasEndDate}
                  onCheckedChange={(checked) => setHasEndDate(checked as boolean)}
                />
                <Label htmlFor="hasEndDate">Set End Date</Label>
              </div>
              {hasEndDate && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => date < startDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
          </div>

          {/* Create in Advance */}
          <div>
            <Label htmlFor="createInAdvance">Create Tasks in Advance</Label>
            <div className="flex items-center gap-2">
              <Input
                id="createInAdvance"
                type="number"
                min="0"
                max="365"
                value={createInAdvanceDays}
                onChange={(e) => setCreateInAdvanceDays(parseInt(e.target.value) || 7)}
                className="w-24"
              />
              <span className="text-sm text-gray-600">days ahead</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Tasks will be created this many days before they're due
            </p>
          </div>

          {/* Error */}
          {createMutation.isError && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200">
              <p className="text-sm text-red-800">
                {createMutation.error instanceof Error
                  ? createMutation.error.message
                  : 'Failed to create recurring task'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Recurring Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

**Testing Checklist**:
- [ ] Daily recurring task creates instances correctly
- [ ] Weekly task creates on correct days of week (Mon-Fri)
- [ ] Monthly task creates on correct day of month
- [ ] Tasks create X days in advance (configurable)
- [ ] Recurring task stops at end_date
- [ ] Recurring task stops after max_occurrences
- [ ] Assignee rotation works (cycles through team)
- [ ] Pausing recurring task works
- [ ] Deleting recurring task doesn't delete created instances
- [ ] Background cron job runs every hour
- [ ] Can edit recurring task (future instances update)
- [ ] RLS prevents cross-company access

**Success Metrics**:
- 50% of projects use recurring tasks
- 200+ recurring task instances created per month
- < 1% manual duplicate task creation

---

### 1.3 Critical Feature: Time Tracking

**Standard**: Time tracking MUST be accurate to the minute. Billable hours MUST match payroll systems exactly.

**Why It Matters**: Construction companies bill clients for labor hours. If time tracking is off by 10%, they lose thousands per project. Example: $50/hour x 1000 hours x 10% error = $5,000 lost revenue.

**Database Schema**:
```sql
CREATE TABLE task_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Time
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,

  -- Duration calculation (auto-computed)
  duration_minutes INT GENERATED ALWAYS AS (
    CASE
      WHEN ended_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
      ELSE NULL
    END
  ) STORED,

  duration_hours DECIMAL(8, 2) GENERATED ALWAYS AS (
    CASE
      WHEN ended_at IS NOT NULL
      THEN ROUND(EXTRACT(EPOCH FROM (ended_at - started_at)) / 3600.0, 2)
      ELSE NULL
    END
  ) STORED,

  -- Billing
  is_billable BOOLEAN DEFAULT true,
  hourly_rate DECIMAL(8, 2), -- Rate at time of entry
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (
    CASE
      WHEN ended_at IS NOT NULL AND is_billable AND hourly_rate IS NOT NULL
      THEN ROUND((EXTRACT(EPOCH FROM (ended_at - started_at)) / 3600.0) * hourly_rate, 2)
      ELSE 0
    END
  ) STORED,

  -- Notes
  description TEXT,

  -- Status
  is_approved BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,

  -- Invoice linkage
  invoice_line_item_id UUID,
  billed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_entries_task ON task_time_entries(task_id);
CREATE INDEX idx_time_entries_user ON task_time_entries(user_id, started_at DESC);
CREATE INDEX idx_time_entries_company_date ON task_time_entries(company_id, started_at DESC);
CREATE INDEX idx_time_entries_unbilled ON task_time_entries(company_id)
  WHERE is_billable = true AND billed_at IS NULL;

ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view time entries in their company"
  ON task_time_entries FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own time entries"
  ON task_time_entries FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own time entries"
  ON task_time_entries FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    -- Managers can update anyone's in their company
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND (r.permissions->>'time_tracking'->>'approve_others')::boolean = true
    )
  );

-- Auto-update task actual_hours when time entries change
CREATE OR REPLACE FUNCTION update_task_actual_hours()
RETURNS TRIGGER AS $$
DECLARE
  task_total_hours DECIMAL(8, 2);
BEGIN
  -- Calculate total hours for the task
  SELECT COALESCE(SUM(duration_hours), 0)
  INTO task_total_hours
  FROM task_time_entries
  WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
    AND ended_at IS NOT NULL;

  -- Update task
  UPDATE tasks
  SET
    actual_hours = task_total_hours,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entry_update_task_hours
  AFTER INSERT OR UPDATE OR DELETE ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_task_actual_hours();

-- Prevent overlapping time entries for same user
CREATE OR REPLACE FUNCTION prevent_overlapping_time_entries()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM task_time_entries
    WHERE user_id = NEW.user_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::UUID)
      AND (
        -- New entry starts during existing entry
        (NEW.started_at >= started_at AND NEW.started_at < ended_at)
        OR
        -- New entry ends during existing entry
        (NEW.ended_at > started_at AND NEW.ended_at <= ended_at)
        OR
        -- New entry completely contains existing entry
        (NEW.started_at <= started_at AND NEW.ended_at >= ended_at)
        OR
        -- Existing active entry (no end time)
        (ended_at IS NULL AND started_at < NEW.started_at)
      )
  ) THEN
    RAISE EXCEPTION 'Time entry overlaps with existing entry';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_overlapping_time
  BEFORE INSERT OR UPDATE ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_overlapping_time_entries();

-- View for time entry summaries
CREATE OR REPLACE VIEW time_entry_summary AS
SELECT
  te.company_id,
  te.user_id,
  u.name AS user_name,
  t.project_id,
  p.name AS project_name,
  DATE(te.started_at) AS entry_date,
  COUNT(*) AS entry_count,
  SUM(te.duration_hours) AS total_hours,
  SUM(te.duration_hours) FILTER (WHERE te.is_billable) AS billable_hours,
  SUM(te.total_cost) AS total_cost
FROM task_time_entries te
JOIN user_profiles u ON u.id = te.user_id
JOIN tasks t ON t.id = te.task_id
JOIN projects p ON p.id = t.project_id
WHERE te.ended_at IS NOT NULL
GROUP BY
  te.company_id,
  te.user_id,
  u.name,
  t.project_id,
  p.name,
  DATE(te.started_at);
```

**API Implementation**:
```typescript
// app/api/tasks/[taskId]/time/route.ts

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const timeEntrySchema = z.object({
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().optional(),
  description: z.string().optional(),
  is_billable: z.boolean().default(true),
  hourly_rate: z.number().positive().optional(),
})

// Start time tracking
export async function POST(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const body = await req.json()

    const validatedData = timeEntrySchema.parse(body)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get task and company_id
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, company_id, project_id')
      .eq('id', params.taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Check for active timer for this user
    const { data: activeTimer } = await supabase
      .from('task_time_entries')
      .select('id, started_at, task:tasks(title)')
      .eq('user_id', user.id)
      .is('ended_at', null)
      .single()

    if (activeTimer) {
      return NextResponse.json({
        error: 'You already have an active timer running',
        activeTimer: {
          id: activeTimer.id,
          taskTitle: activeTimer.task.title,
          startedAt: activeTimer.started_at,
        }
      }, { status: 409 })
    }

    // Get user's default hourly rate if not provided
    let hourlyRate = validatedData.hourly_rate
    if (!hourlyRate) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('default_hourly_rate')
        .eq('id', user.id)
        .single()

      hourlyRate = profile?.default_hourly_rate
    }

    // Create time entry
    const { data: timeEntry, error } = await supabase
      .from('task_time_entries')
      .insert({
        task_id: params.taskId,
        user_id: user.id,
        company_id: task.company_id,
        started_at: validatedData.started_at,
        ended_at: validatedData.ended_at,
        description: validatedData.description,
        is_billable: validatedData.is_billable,
        hourly_rate: hourlyRate,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ timeEntry }, { status: 201 })

  } catch (error) {
    console.error('Error creating time entry:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 422 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get time entries for task
export async function GET(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  const supabase = createRouteHandlerClient({ cookies })

  const { data, error } = await supabase
    .from('task_time_entries')
    .select(`
      *,
      user:user_profiles(id, name, avatar_url)
    `)
    .eq('task_id', params.taskId)
    .order('started_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ timeEntries: data })
}

// Stop timer (update to set ended_at)
export async function PATCH(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { timeEntryId, ended_at } = await req.json()

    if (!timeEntryId) {
      return NextResponse.json({ error: 'Time entry ID required' }, { status: 400 })
    }

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('task_time_entries')
      .update({ ended_at: ended_at || new Date().toISOString() })
      .eq('id', timeEntryId)
      .eq('user_id', user?.id) // Can only stop own timer
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ timeEntry: data })

  } catch (error) {
    console.error('Error stopping timer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**UI Implementation**:
```typescript
// components/tasks/TimeTracker.tsx

'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { PlayIcon, StopIcon, ClockIcon } from 'lucide-react'
import { formatDuration } from '@/lib/utils'

interface TimeTrackerProps {
  taskId: string
}

export function TimeTracker({ taskId }: TimeTrackerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const queryClient = useQueryClient()

  // Get active timer for current user
  const { data: activeTimerData } = useQuery({
    queryKey: ['active-timer'],
    queryFn: async () => {
      const res = await fetch('/api/time/active')
      if (!res.ok) return null
      return res.json()
    },
    refetchInterval: 5000, // Check every 5 seconds
  })

  const activeTimer = activeTimerData?.timeEntry
  const isThisTaskActive = activeTimer?.task_id === taskId

  // Update elapsed time every second
  useEffect(() => {
    if (!isThisTaskActive || !activeTimer) {
      setElapsedSeconds(0)
      return
    }

    const startTime = new Date(activeTimer.started_at).getTime()

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - startTime) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [isThisTaskActive, activeTimer])

  // Start timer mutation
  const startTimerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          started_at: new Date().toISOString(),
          is_billable: true,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to start timer')
      }

      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] })
      queryClient.invalidateQueries({ queryKey: ['task-time-entries', taskId] })
    },
  })

  // Stop timer mutation
  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/tasks/${taskId}/time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeEntryId: activeTimer.id,
          ended_at: new Date().toISOString(),
        }),
      })

      if (!res.ok) throw new Error('Failed to stop timer')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-timer'] })
      queryClient.invalidateQueries({ queryKey: ['task-time-entries', taskId] })
      setElapsedSeconds(0)
    },
  })

  if (isThisTaskActive) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
          <ClockIcon className="w-4 h-4 text-green-700" />
          <span className="font-mono text-lg font-semibold text-green-900">
            {formatDuration(elapsedSeconds)}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => stopTimerMutation.mutate()}
          disabled={stopTimerMutation.isPending}
          className="border-green-600 text-green-700 hover:bg-green-100"
        >
          <StopIcon className="w-4 h-4 mr-2" />
          Stop Timer
        </Button>
      </div>
    )
  }

  if (activeTimer && activeTimer.task_id !== taskId) {
    return (
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
        <p className="text-sm text-amber-900">
          Timer running on another task. Stop it first to start a new timer.
        </p>
      </div>
    )
  }

  return (
    <Button
      onClick={() => startTimerMutation.mutate()}
      disabled={startTimerMutation.isPending}
      className="w-full"
    >
      <PlayIcon className="w-4 h-4 mr-2" />
      Start Timer
    </Button>
  )
}

// Utility function
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
```

**Testing Checklist**:
- [ ] Can start timer on task
- [ ] Timer counts up in real-time
- [ ] Can stop timer
- [ ] Duration calculates correctly (to the second)
- [ ] Cannot have 2 timers running simultaneously (shows error)
- [ ] Cannot create overlapping time entries (validation error)
- [ ] Billable hours calculate correctly (duration x rate)
- [ ] Task actual_hours updates when timer stops
- [ ] Can manually add time entry (start + end time)
- [ ] Can edit time entry (before billed)
- [ ] Cannot edit billed time entries
- [ ] Time entries show in timesheet view
- [ ] Managers can approve time entries
- [ ] Export to payroll works
- [ ] RLS prevents users seeing other company time

**Success Metrics**:
- 90% of field workers use time tracking
- < 2% discrepancy between tracked vs billed hours
- 100% of billable hours invoiced

---

## 2. USER EXPERIENCE QUALITY STANDARDS

### 2.1 Loading States

**Every async operation must show progress within 100ms.**

**Kanban Board Loading**:
```typescript
function TaskKanbanSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(col => (
        <div key={col} className="space-y-3">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          {[1, 2, 3].map(card => (
            <div key={card} className="p-4 border rounded-lg space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              <div className="flex gap-2">
                <div className="h-6 w-6 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
```

### 2.2 Empty States

**Guide users on what to do next.**

```typescript
function TasksEmptyState({ projectName }: { projectName: string }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
        <CheckSquareIcon className="w-8 h-8 text-blue-600" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No tasks yet for {projectName}
      </h3>

      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        Break down this project into manageable tasks. Assign them to your team,
        set due dates, and track progress on the Kanban board.
      </p>

      <div className="flex justify-center gap-3">
        <Button onClick={() => openCreateTaskModal()}>
          <PlusIcon className="w-4 h-4 mr-2" />
          Create Task
        </Button>

        <Button variant="outline" onClick={() => openTemplateLibrary()}>
          <LayersIcon className="w-4 h-4 mr-2" />
          Use Template
        </Button>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
        <p className="text-sm text-blue-900">
          <strong>Pro tip:</strong> Use task templates for common projects like
          "Kitchen Remodel" to save time. Templates include pre-configured tasks,
          dependencies, and checklists.
        </p>
      </div>
    </div>
  )
}
```

### 2.3 Error States

**Provide actionable guidance, never blame the user.**

```typescript
function TaskErrorState({ error, onRetry }: { error: Error; onRetry: () => void }) {
  // Categorize error
  const isNetworkError = error.message.includes('fetch') || error.message.includes('network')
  const isPermissionError = error.message.includes('permission') || error.message.includes('unauthorized')

  return (
    <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
      <div className="flex items-start">
        <AlertTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-900 mb-1">
            {isPermissionError ? "Access Denied" : "Couldn't Load Tasks"}
          </h4>

          <p className="text-sm text-red-800 mb-3">
            {isNetworkError && (
              <>
                Check your internet connection. If you're on a job site, you might
                have limited connectivity. The app will retry automatically when
                your connection improves.
              </>
            )}

            {isPermissionError && (
              <>
                You don't have permission to view tasks for this project. Ask your
                project manager to add you to the project team.
              </>
            )}

            {!isNetworkError && !isPermissionError && (
              <>
                Something went wrong while loading tasks. We've been notified and
                are looking into it. Try refreshing the page.
              </>
            )}
          </p>

          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try Again
            </Button>

            {isPermissionError && (
              <Button size="sm" variant="outline" onClick={() => router.push('/support')}>
                Contact Support
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
```

### 2.4 Mobile Optimization

**Field workers primarily use mobile. Touch targets must be 44x44px minimum.**

```typescript
// Mobile-optimized task card
function MobileTaskCard({ task }: { task: Task }) {
  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border touch-manipulation">
      {/* Touch-friendly tap area */}
      <div
        className="min-h-[44px] flex items-start gap-3"
        onClick={() => openTaskDetails(task.id)}
      >
        {/* Large checkbox */}
        <Checkbox
          checked={task.status === 'completed'}
          onCheckedChange={(checked) => updateTaskStatus(task.id, checked ? 'completed' : 'in_progress')}
          className="mt-1 h-6 w-6"
        />

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">
            {task.title}
          </h4>

          <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
            <CalendarIcon className="w-4 h-4" />
            <span>{formatDate(task.due_date)}</span>
          </div>

          {task.assignee && (
            <div className="flex items-center gap-2 mt-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={task.assignee.avatar_url} />
                <AvatarFallback>{task.assignee.name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-700">{task.assignee.name}</span>
            </div>
          )}
        </div>

        {/* Priority badge */}
        {task.priority === 'high' || task.priority === 'urgent' && (
          <Badge variant={task.priority === 'urgent' ? 'destructive' : 'warning'}>
            {task.priority}
          </Badge>
        )}
      </div>

      {/* Quick actions - large touch targets */}
      <div className="flex gap-2 mt-3 pt-3 border-t">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 min-h-[44px]"
          onClick={(e) => {
            e.stopPropagation()
            startTimer(task.id)
          }}
        >
          <PlayIcon className="w-4 h-4 mr-2" />
          Start
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="flex-1 min-h-[44px]"
          onClick={(e) => {
            e.stopPropagation()
            openComments(task.id)
          }}
        >
          <MessageSquareIcon className="w-4 h-4 mr-2" />
          Comment
        </Button>
      </div>
    </div>
  )
}
```

### 2.5 Keyboard Navigation

**Power users should be able to navigate without touching the mouse.**

```typescript
// Keyboard shortcuts for TaskFlow
const useTaskKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Quick search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openTaskSearch()
      }

      // Cmd/Ctrl + N: New task
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        openCreateTaskModal()
      }

      // Cmd/Ctrl + Enter: Complete selected task
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        completeSelectedTask()
      }

      // Escape: Close modal
      if (e.key === 'Escape') {
        closeModals()
      }

      // Arrow keys: Navigate tasks
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        selectNextTask()
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        selectPreviousTask()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])
}
```

### 2.6 Accessibility (WCAG 2.1 AA)

**Screen readers, keyboard users, and low-vision users must have full access.**

```typescript
// Accessible task card
function AccessibleTaskCard({ task }: { task: Task }) {
  return (
    <div
      role="article"
      aria-label={`Task: ${task.title}`}
      className="p-4 bg-white rounded-lg border"
      tabIndex={0}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={`task-${task.id}-checkbox`}
          checked={task.status === 'completed'}
          onCheckedChange={(checked) => updateTaskStatus(task.id, checked ? 'completed' : 'in_progress')}
          aria-label={`Mark ${task.title} as ${task.status === 'completed' ? 'incomplete' : 'complete'}`}
        />

        <div className="flex-1">
          <h3 className="font-medium text-gray-900">
            <label htmlFor={`task-${task.id}-checkbox`}>
              {task.title}
            </label>
          </h3>

          <div className="mt-2 text-sm text-gray-600" role="group" aria-label="Task details">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" aria-hidden="true" />
              <span>
                <span className="sr-only">Due date:</span>
                {formatDate(task.due_date)}
              </span>
            </div>

            {task.assignee && (
              <div className="flex items-center gap-2 mt-1">
                <UserIcon className="w-4 h-4" aria-hidden="true" />
                <span>
                  <span className="sr-only">Assigned to:</span>
                  {task.assignee.name}
                </span>
              </div>
            )}
          </div>

          {task.priority === 'urgent' && (
            <Badge variant="destructive" className="mt-2">
              <span className="sr-only">Priority:</span>
              Urgent
            </Badge>
          )}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openTaskDetails(task.id)}
          aria-label={`View details for ${task.title}`}
        >
          View Details
        </Button>
      </div>
    </div>
  )
}
```

---

## 3. PERFORMANCE REQUIREMENTS

### 3.1 Page Load Performance

**Target**: Kanban board loads in < 2 seconds with 100 tasks.

**Strategy**:
```typescript
// Optimize Kanban board query
async function getKanbanTasks(projectId: string) {
  // 1. Select only needed fields (not *)
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      status,
      priority,
      due_date,
      estimated_hours,
      actual_hours,
      assignee:user_profiles!assignee_id(
        id,
        name,
        avatar_url
      )
    `)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('sequence_order', { ascending: true })
    .limit(100) // Paginate if more than 100

  return data
}

// 2. Use React Query for caching
const { data: tasks, isLoading } = useQuery({
  queryKey: ['project-tasks', projectId],
  queryFn: () => getKanbanTasks(projectId),
  staleTime: 30 * 1000, // Data fresh for 30 seconds
  cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
})

// 3. Virtualize if > 100 tasks
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualizedTaskList({ tasks }: { tasks: Task[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated task card height
    overscan: 5, // Render 5 extra items off-screen
  })

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualRow => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <TaskCard task={tasks[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 3.2 Database Query Optimization

**Target**: All task queries < 100ms.

```sql
-- Index for Kanban board query
CREATE INDEX idx_tasks_project_status ON tasks(project_id, status)
  WHERE deleted_at IS NULL;

-- Index for timeline view
CREATE INDEX idx_tasks_project_dates ON tasks(project_id, due_date)
  WHERE deleted_at IS NULL;

-- Index for user's tasks
CREATE INDEX idx_tasks_assignee_status ON tasks(assignee_id, status, due_date)
  WHERE deleted_at IS NULL;

-- Materialized view for task counts
CREATE MATERIALIZED VIEW project_task_stats AS
SELECT
  project_id,
  COUNT(*) AS total_tasks,
  COUNT(*) FILTER (WHERE status = 'not_started') AS not_started,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
  COUNT(*) FILTER (WHERE status = 'in_review') AS in_review,
  COUNT(*) FILTER (WHERE status = 'completed') AS completed,
  COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') AS overdue,
  SUM(estimated_hours) AS total_estimated_hours,
  SUM(actual_hours) AS total_actual_hours
FROM tasks
WHERE deleted_at IS NULL
GROUP BY project_id;

-- Refresh on task changes
CREATE TRIGGER refresh_task_stats
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_project_task_stats();
```

### 3.3 Real-Time Updates

**Target**: Changes sync across users in < 2 seconds.

```typescript
// Supabase real-time subscription
useEffect(() => {
  const channel = supabase
    .channel(`project:${projectId}:tasks`)
    .on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        // Update React Query cache
        queryClient.setQueryData(
          ['project-tasks', projectId],
          (old: Task[] | undefined) => {
            if (!old) return []

            switch (payload.eventType) {
              case 'INSERT':
                return [...old, payload.new as Task]

              case 'UPDATE':
                return old.map(task =>
                  task.id === payload.new.id ? payload.new as Task : task
                )

              case 'DELETE':
                return old.filter(task => task.id !== payload.old.id)

              default:
                return old
            }
          }
        )
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [projectId, queryClient])
```

---

## 4. SECURITY REQUIREMENTS

### 4.1 Row-Level Security (RLS)

**Every query MUST enforce company isolation.**

```sql
-- Prevent cross-company data leaks
CREATE POLICY "Tasks are isolated by company"
  ON tasks
  FOR ALL
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can only see tasks they have access to
CREATE POLICY "Users can view tasks in their projects"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (
    -- User is assigned to the task
    assignee_id = auth.uid()
    OR
    -- User is on the project team
    project_id IN (
      SELECT project_id FROM project_team_members WHERE user_id = auth.uid()
    )
    OR
    -- User has company-wide task access (admin, PM)
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND (r.permissions->>'tasks'->>'view_all')::boolean = true
    )
  );
```

### 4.2 Input Validation

**Never trust client data.**

```typescript
// Server-side validation
const createTaskSchema = z.object({
  title: z.string().min(3).max(500),
  description: z.string().max(5000).optional(),
  project_id: z.string().uuid(),
  assignee_id: z.string().uuid().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  estimated_hours: z.number().positive().max(1000).optional(),
})

export async function POST(req: Request) {
  const body = await req.json()

  // Validate
  const result = createTaskSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: result.error.issues },
      { status: 422 }
    )
  }

  // Additional business logic validation
  const { data } = result

  // Verify project exists and user has access
  const { data: project } = await supabase
    .from('projects')
    .select('id, company_id')
    .eq('id', data.project_id)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Verify assignee is in same company
  if (data.assignee_id) {
    const { data: assignee } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', data.assignee_id)
      .single()

    if (assignee?.company_id !== project.company_id) {
      return NextResponse.json(
        { error: 'Cannot assign task to user from different company' },
        { status: 400 }
      )
    }
  }

  // Proceed with creation...
}
```

### 4.3 Audit Logging

**Track sensitive actions for compliance.**

```sql
-- Log task deletions
CREATE OR REPLACE FUNCTION log_task_deletion()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    company_id,
    user_id,
    action,
    entity_type,
    entity_id,
    old_values,
    ip_address
  ) VALUES (
    OLD.company_id,
    auth.uid(),
    'delete',
    'task',
    OLD.id,
    jsonb_build_object(
      'title', OLD.title,
      'project_id', OLD.project_id,
      'assignee_id', OLD.assignee_id,
      'status', OLD.status
    ),
    current_setting('request.headers', true)::json->>'x-forwarded-for'
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_deletion_audit
  BEFORE DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION log_task_deletion();
```

---

## 5. PRE-LAUNCH CHECKLIST

### 5.1 Functional Testing

- [ ] Can create task with all fields
- [ ] Can update task
- [ ] Can delete task (soft delete)
- [ ] Can assign task to team member
- [ ] Can change task status via drag-and-drop
- [ ] Can add task dependencies
- [ ] Cannot create circular dependencies
- [ ] Can create recurring tasks
- [ ] Recurring tasks auto-create on schedule
- [ ] Can start/stop time tracker
- [ ] Time duration calculates correctly
- [ ] Cannot have overlapping time entries
- [ ] Task actual_hours updates when time logged
- [ ] Can add checklist items to task
- [ ] Can add comments to task
- [ ] Can attach files to task
- [ ] Can filter tasks by status, assignee, date
- [ ] Can search tasks
- [ ] Can sort tasks
- [ ] Real-time updates work across users
- [ ] Gantt chart displays correctly
- [ ] Calendar view works
- [ ] Critical path highlights correctly

### 5.2 Performance Testing

- [ ] Kanban board loads in < 2s with 100 tasks
- [ ] Database queries < 100ms (verified with EXPLAIN ANALYZE)
- [ ] Real-time updates sync < 2s
- [ ] Drag-and-drop is smooth (60fps)
- [ ] Virtualization works with 500+ tasks
- [ ] Images lazy load
- [ ] No memory leaks (tested with Chrome DevTools)

### 5.3 Security Testing

- [ ] RLS prevents cross-company access (tested manually)
- [ ] Cannot create task in other company's project
- [ ] Cannot view tasks from other companies
- [ ] Cannot assign task to user in other company
- [ ] SQL injection prevented (tested with sqlmap)
- [ ] XSS prevented (tested with XSS payloads)
- [ ] CSRF tokens work
- [ ] Audit logs capture all deletions

### 5.4 Mobile Testing

- [ ] Works on iPhone SE (small screen)
- [ ] Works on iPhone 14 Pro Max
- [ ] Works on Android (Pixel 7)
- [ ] Touch targets are 44x44px minimum
- [ ] Swipe gestures work (if applicable)
- [ ] Works in portrait and landscape
- [ ] No horizontal scroll
- [ ] Text is readable without zooming

### 5.5 Accessibility Testing

- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrows)
- [ ] Screen reader announces all elements correctly (tested with NVDA)
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Focus indicators visible
- [ ] Form errors announced to screen readers
- [ ] All images have alt text
- [ ] Semantic HTML used (headings, lists, etc.)

---

## 6. SUCCESS METRICS

### 6.1 Adoption Metrics

**Target**: 80% of projects use TaskFlow

**Measurement**:
```sql
SELECT
  COUNT(DISTINCT project_id) AS projects_with_tasks,
  (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL) AS total_projects,
  ROUND(
    COUNT(DISTINCT project_id)::DECIMAL /
    (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL) * 100,
    2
  ) AS adoption_percentage
FROM tasks
WHERE deleted_at IS NULL;
```

### 6.2 Task Completion Rate

**Target**: 85% of tasks completed within 7 days of due date

**Measurement**:
```sql
SELECT
  COUNT(*) FILTER (
    WHERE status = 'completed'
      AND updated_at <= due_date + INTERVAL '7 days'
  )::DECIMAL / NULLIF(COUNT(*), 0) * 100 AS on_time_completion_rate
FROM tasks
WHERE deleted_at IS NULL
  AND created_at >= CURRENT_DATE - INTERVAL '30 days';
```

### 6.3 Time Tracking Usage

**Target**: 60% of field workers use time tracking

**Measurement**:
```sql
SELECT
  COUNT(DISTINCT user_id) AS users_tracking_time,
  (
    SELECT COUNT(*)
    FROM user_profiles up
    JOIN user_roles ur ON ur.user_id = up.id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.name IN ('field_worker', 'superintendent')
  ) AS total_field_workers,
  ROUND(
    COUNT(DISTINCT user_id)::DECIMAL /
    (
      SELECT COUNT(*)
      FROM user_profiles up
      JOIN user_roles ur ON ur.user_id = up.id
      JOIN roles r ON r.id = ur.role_id
      WHERE r.name IN ('field_worker', 'superintendent')
    ) * 100,
    2
  ) AS usage_percentage
FROM task_time_entries
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
```

### 6.4 User Satisfaction

**Target**: 4.5/5 average rating for TaskFlow

**Measurement**: In-app survey after 2 weeks of use
- "How satisfied are you with task management? (1-5 stars)"
- "What would make TaskFlow better?"

---

## 7. COMPETITIVE EDGE

### 7.1 vs Procore

**Procore's Weaknesses**:
- Complicated UI (steep learning curve)
- Expensive ($1,500/month+)
- Overkill for small contractors

**Our Advantages**:
- Simple, intuitive Kanban board
- 1/4 the price ($99-$499/month)
- Mobile-first design
- AI-powered suggestions

### 7.2 vs Buildertrend

**Buildertrend's Weaknesses**:
- No dependencies or critical path
- Limited time tracking
- Weak real-time collaboration

**Our Advantages**:
- Full dependency management with Gantt charts
- Built-in time tracking with payroll export
- Real-time updates across all users
- Voice commands for hands-free use

### 7.3 vs Monday.com / Asana

**Their Weaknesses**:
- Generic project management (not construction-specific)
- No field worker mobile app
- No integration with estimates/invoices

**Our Advantages**:
- Construction-specific task types (inspections, deliveries, etc.)
- Mobile app designed for job sites
- Seamless integration with quotes → projects → invoices
- Weather-aware scheduling

---

## CONCLUSION

TaskFlow is the operations backbone of Sierra Suites. When implemented to this quality standard:
- Teams know exactly what to do every day
- Nothing falls through the cracks
- Time tracking is accurate to the minute
- Projects finish on time and on budget

**95% quality means**:
- All core flows work perfectly
- Dependencies prevent out-of-order work
- Recurring tasks auto-create reliably
- Time tracking is accurate
- Mobile experience is native-quality
- Real-time sync is < 2 seconds
- RLS prevents data leaks

**This is how we beat Procore.**
