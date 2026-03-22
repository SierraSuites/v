# TASKFLOW MODULE - QUALITY IMPLEMENTATION GUIDE

**Module**: Task & Workflow Management
**Business Priority**: HIGH (Operations Backbone)
**Current Completion**: 50% Complete
**Target Completion**: 95% Production-Ready
**Estimated Revenue Impact**: CRITICAL - Core feature that justifies entire platform subscription

---

## EXECUTIVE SUMMARY

### Why This Module is Critical to Your Success

TaskFlow is not optional - it's the **operational heartbeat** of The Sierra Suites. Without rock-solid task management, contractors can't run their businesses. This isn't a nice-to-have feature, it's **table stakes** for competing with Procore, Buildertrend, and CoConstruct.

**The Problem**: Construction superintendents manage 8 projects simultaneously with 12 crew members. Monday morning they need to assign the week's work: Who does what? When? Where? What materials are needed? What's blocking progress? Without TaskFlow, this takes 30 minutes of scrambling. **With TaskFlow, it takes 30 seconds.**

**Why Contractors Abandon Software**:
1. **Tasks fall through the cracks** → Missed inspections cost $5,000 in delays
2. **No accountability** → "I thought you were handling that" → Finger-pointing when things fail
3. **Can't track progress** → Client asks "Are we 60% done or 80%?" → No one knows
4. **Chaos on job sites** → Crews show up without clear assignments → Wasted labor hours

**The Solution**: TaskFlow with professional features:
- **Dependencies**: "Drywall can't start until electrical rough-in is inspected"
- **Templates**: Apply "Kitchen Remodel - Standard" (47 tasks) in 10 seconds
- **Time Tracking**: Know exactly how long tasks actually take (vs. estimates)
- **Capacity Planning**: See who's overbooked before they burn out
- **Multiple Views**: Kanban for dailies, Gantt for timeline, Calendar for scheduling

**Business Impact**:
- **Project Delays Eliminated**: Dependencies prevent "oops, we did things out of order"
- **Template Efficiency**: Save 2 hours per project in task setup (50 projects/year = 100 hours saved = $10,000)
- **Improved Estimates**: Track actual vs estimated hours → 20% better bidding accuracy
- **Team Utilization**: Identify who's overloaded → prevent burnout → reduce turnover

**Revenue Impact**:
This IS the core product. If TaskFlow doesn't work, contractors cancel. Period.
- Baseline subscription depends on this working perfectly
- Templates justify $20/month premium tier
- Time tracking justifies $30/month professional tier
- Gantt charts justify $50/month enterprise tier

**Competitive Advantage**:
- Procore: $375/month, complex, too heavy for small contractors
- Buildertrend: $299/month, dated UI, slow
- CoConstruct: Focus on custom homes, not commercial
- **The Sierra Suites**: Modern, fast, affordable ($99/month), all-in-one

---

## DATABASE SCHEMA

### Core Tables Enhancement

#### `tasks` (Enhanced Existing Table)

```sql
-- Enhance existing tasks table with missing columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(8, 2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_hours DECIMAL(8, 2) DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS complexity TEXT CHECK (complexity IN ('simple', 'medium', 'complex'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'task' CHECK (
  task_type IN ('task', 'milestone', 'inspection', 'delivery', 'meeting', 'approval')
);

-- Progress tracking
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress_percentage INT DEFAULT 0 CHECK (
  progress_percentage >= 0 AND progress_percentage <= 100
);

-- Sequence for ordering within status
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sequence_order INT DEFAULT 0;

-- Recurrence reference
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_task_id UUID REFERENCES recurring_tasks(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_instance_date DATE;

-- Completion tracking
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL AND status != 'completed';
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON tasks(due_date, status) WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled');

-- Auto-set completed_at when status changes to completed
CREATE OR REPLACE FUNCTION tasks_set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
    NEW.completed_by = auth.uid();
    NEW.progress_percentage = 100;
  ELSIF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
    NEW.completed_by = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_auto_complete
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION tasks_set_completed_at();
```

#### `task_dependencies` (New Table)

```sql
CREATE TABLE task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Dependency Type
  dependency_type TEXT DEFAULT 'finish_to_start' CHECK (
    dependency_type IN (
      'finish_to_start',  -- B starts when A finishes (most common)
      'start_to_start',   -- B starts when A starts
      'finish_to_finish', -- B finishes when A finishes
      'start_to_finish'   -- B finishes when A starts (rare)
    )
  ),

  -- Lag time (can be negative for lead time)
  lag_days INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent circular dependencies and duplicate dependencies
  UNIQUE(task_id, depends_on_task_id),
  CHECK (task_id != depends_on_task_id)
);

CREATE INDEX idx_task_deps_task ON task_dependencies(task_id);
CREATE INDEX idx_task_deps_depends_on ON task_dependencies(depends_on_task_id);

-- RLS Policies
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view dependencies from their company" ON task_dependencies
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage dependencies in their company" ON task_dependencies
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

-- Function to detect circular dependencies
CREATE OR REPLACE FUNCTION check_circular_dependency()
RETURNS TRIGGER AS $$
DECLARE
  visited_tasks UUID[];
  current_task UUID;
  dep_task UUID;
BEGIN
  -- Start from the new dependency's target
  current_task := NEW.task_id;
  visited_tasks := ARRAY[current_task];

  -- Follow the chain of dependencies
  LOOP
    SELECT depends_on_task_id INTO dep_task
    FROM task_dependencies
    WHERE task_id = current_task
    LIMIT 1;

    EXIT WHEN dep_task IS NULL;

    -- Check if we've created a circle
    IF dep_task = ANY(visited_tasks) THEN
      RAISE EXCEPTION 'Circular dependency detected: Task % depends on %, which creates a circular reference', NEW.task_id, NEW.depends_on_task_id;
    END IF;

    visited_tasks := array_append(visited_tasks, dep_task);
    current_task := dep_task;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_circular_dependencies
  BEFORE INSERT OR UPDATE ON task_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION check_circular_dependency();
```

#### `task_checklist_items` (New Table)

```sql
CREATE TABLE task_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- Checklist Item
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Completion
  is_completed BOOLEAN DEFAULT false,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,

  -- Ordering
  sequence_order INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_checklist_task ON task_checklist_items(task_id, sequence_order);

-- RLS Policies
ALTER TABLE task_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist items from their company tasks" ON task_checklist_items
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage checklist items in their company" ON task_checklist_items
  FOR ALL USING (
    task_id IN (
      SELECT id FROM tasks WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

-- Trigger to auto-set completed_at
CREATE OR REPLACE FUNCTION checklist_item_set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = true AND (OLD.is_completed IS NULL OR OLD.is_completed = false) THEN
    NEW.completed_at = NOW();
    NEW.completed_by = auth.uid();
  ELSIF NEW.is_completed = false AND OLD.is_completed = true THEN
    NEW.completed_at = NULL;
    NEW.completed_by = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER checklist_item_auto_complete
  BEFORE UPDATE ON task_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION checklist_item_set_completed_at();

-- Trigger to update task progress based on checklist completion
CREATE OR REPLACE FUNCTION update_task_progress_from_checklist()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tasks
  SET progress_percentage = (
    SELECT ROUND(
      (COUNT(*) FILTER (WHERE is_completed = true)::DECIMAL / NULLIF(COUNT(*), 0)) * 100
    )::INT
    FROM task_checklist_items
    WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
  )
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_task_progress_on_checklist_change
  AFTER INSERT OR UPDATE OR DELETE ON task_checklist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_task_progress_from_checklist();
```

#### `task_comments` (New Table)

```sql
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Comment Content
  comment TEXT NOT NULL,

  -- Threading (for replies)
  parent_comment_id UUID REFERENCES task_comments(id) ON DELETE CASCADE,

  -- Mentions
  mentioned_users UUID[], -- Array of user IDs mentioned in comment

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_comments_task ON task_comments(task_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_user ON task_comments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON task_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- RLS Policies
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments from their company tasks" ON task_comments
  FOR SELECT USING (
    deleted_at IS NULL AND
    task_id IN (
      SELECT id FROM tasks WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert comments on their company tasks" ON task_comments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own comments" ON task_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" ON task_comments
  FOR DELETE USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_comment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_comment_timestamp();
```

#### `task_attachments` (New Table)

```sql
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,

  -- File Details
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL, -- Supabase storage path
  file_url TEXT NOT NULL, -- Public URL
  file_size_bytes BIGINT NOT NULL,
  file_type VARCHAR(100), -- MIME type

  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_attachments_task ON task_attachments(task_id) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments from their company tasks" ON task_attachments
  FOR SELECT USING (
    deleted_at IS NULL AND
    task_id IN (
      SELECT id FROM tasks WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can upload attachments to their company tasks" ON task_attachments
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete their own attachments" ON task_attachments
  FOR DELETE USING (uploaded_by = auth.uid());
```

#### `task_watchers` (New Table)

```sql
CREATE TABLE task_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(task_id, user_id)
);

CREATE INDEX idx_watchers_task ON task_watchers(task_id);
CREATE INDEX idx_watchers_user ON task_watchers(user_id);

-- RLS Policies
ALTER TABLE task_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view watchers from their company tasks" ON task_watchers
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can watch their company tasks" ON task_watchers
  FOR INSERT WITH CHECK (
    task_id IN (
      SELECT id FROM tasks WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can unwatch tasks" ON task_watchers
  FOR DELETE USING (user_id = auth.uid());
```

#### `task_time_entries` (New Table)

```sql
CREATE TABLE task_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Time Tracking
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,

  -- Auto-calculated duration
  duration_minutes INT GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at)) / 60
  ) STORED,

  -- Notes
  notes TEXT,

  -- Billing
  is_billable BOOLEAN DEFAULT true,
  hourly_rate DECIMAL(10, 2),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_entries_task ON task_time_entries(task_id, started_at DESC);
CREATE INDEX idx_time_entries_user ON task_time_entries(user_id, started_at DESC);
CREATE INDEX idx_time_entries_running ON task_time_entries(user_id) WHERE ended_at IS NULL;

-- RLS Policies
ALTER TABLE task_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view time entries from their company" ON task_time_entries
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own time entries" ON task_time_entries
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own time entries" ON task_time_entries
  FOR UPDATE USING (user_id = auth.uid());

-- Trigger to update task actual_hours when time entries change
CREATE OR REPLACE FUNCTION update_task_actual_hours()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tasks
  SET actual_hours = (
    SELECT COALESCE(SUM(duration_minutes) / 60.0, 0)
    FROM task_time_entries
    WHERE task_id = COALESCE(NEW.task_id, OLD.task_id)
      AND ended_at IS NOT NULL
  )
  WHERE id = COALESCE(NEW.task_id, OLD.task_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER time_entry_update_hours
  AFTER INSERT OR UPDATE OR DELETE ON task_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_task_actual_hours();
```

#### `task_templates` (New Table)

```sql
CREATE TABLE task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Template Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category TEXT, -- 'kitchen', 'bathroom', 'commercial', 'electrical', 'framing', etc.

  -- Usage Stats
  times_used INT DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Metadata
  estimated_duration_days INT,
  estimated_cost DECIMAL(12, 2),
  task_count INT DEFAULT 0,

  -- Visibility
  is_public BOOLEAN DEFAULT false, -- Share across entire company
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_company ON task_templates(company_id, is_active);
CREATE INDEX idx_templates_category ON task_templates(category);

-- RLS Policies
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates from their company" ON task_templates
  FOR SELECT USING (
    is_active = true AND
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage templates in their company" ON task_templates
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
```

#### `task_template_items` (New Table)

```sql
CREATE TABLE task_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,

  -- Task Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'task',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),

  -- Scheduling
  start_offset_days INT DEFAULT 0, -- Days from project start
  duration_days INT DEFAULT 1,
  estimated_hours DECIMAL(8, 2),

  -- Assignment
  default_assignee_role TEXT, -- 'pm', 'superintendent', 'lead', 'subcontractor', 'specific_user'

  -- Dependencies (reference other template items by sequence)
  depends_on_sequences INT[], -- Array of sequence numbers this depends on

  -- Checklist
  checklist_items JSONB DEFAULT '[]', -- [{"title": "...", "sequence": 0}, ...]

  -- Ordering
  sequence_order INT NOT NULL,
  phase_name VARCHAR(100), -- Group tasks by phase: "Demo", "Foundation", "Framing", etc.

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_items_template ON task_template_items(template_id, sequence_order);

-- RLS (inherits from template)
ALTER TABLE task_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template items from their company" ON task_template_items
  FOR SELECT USING (
    template_id IN (
      SELECT id FROM task_templates WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage template items in their company" ON task_template_items
  FOR ALL USING (
    template_id IN (
      SELECT id FROM task_templates WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );

-- Trigger to update task_count on template
CREATE OR REPLACE FUNCTION update_template_task_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE task_templates
  SET task_count = (
    SELECT COUNT(*) FROM task_template_items WHERE template_id = COALESCE(NEW.template_id, OLD.template_id)
  )
  WHERE id = COALESCE(NEW.template_id, OLD.template_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER template_update_count
  AFTER INSERT OR DELETE ON task_template_items
  FOR EACH ROW
  EXECUTE FUNCTION update_template_task_count();
```

#### `recurring_tasks` (New Table)

```sql
CREATE TABLE recurring_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Task Template
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  estimated_hours DECIMAL(8, 2),

  -- Recurrence Pattern
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  interval INT DEFAULT 1, -- Every X days/weeks/months
  days_of_week INT[], -- [1,2,3,4,5] for Mon-Fri, NULL for all days
  day_of_month INT, -- For monthly: 1-31

  -- Schedule
  start_date DATE NOT NULL,
  end_date DATE,
  max_occurrences INT,

  -- Assignment (rotating or fixed)
  assignee_rotation UUID[], -- Array of user IDs to rotate through
  current_rotation_index INT DEFAULT 0,
  fixed_assignee_id UUID REFERENCES auth.users(id), -- Or use fixed assignee

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_created_at DATE,
  next_create_date DATE,
  occurrences_created INT DEFAULT 0,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_tasks_next_create ON recurring_tasks(next_create_date) WHERE is_active = true;
CREATE INDEX idx_recurring_tasks_project ON recurring_tasks(project_id) WHERE is_active = true;

-- RLS Policies
ALTER TABLE recurring_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recurring tasks from their company" ON recurring_tasks
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage recurring tasks in their company" ON recurring_tasks
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
```

---

## CORE COMPONENTS

### 1. Enhanced Kanban Board with Dependencies

```typescript
// app/taskflow/[projectId]/page.tsx

'use client'

import { useState } from 'react'
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

type TaskStatus = 'not_started' | 'in_progress' | 'in_review' | 'completed'

interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee_id: string
  assignee?: { name: string }
  due_date: string | null
  estimated_hours: number | null
  actual_hours: number
  progress_percentage: number
  dependencies: Array<{
    id: string
    depends_on_task: { id: string; title: string; status: TaskStatus }
  }>
  blocking_tasks: Array<{
    id: string
    task: { id: string; title: string }
  }>
  checklist_items: Array<{
    id: string
    title: string
    is_completed: boolean
  }>
  time_entries: Array<{
    id: string
    started_at: string
    ended_at: string | null
  }>
}

const STATUS_COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'not_started', label: 'Not Started', color: 'gray' },
  { status: 'in_progress', label: 'In Progress', color: 'blue' },
  { status: 'in_review', label: 'In Review', color: 'yellow' },
  { status: 'completed', label: 'Completed', color: 'green' }
]

export default function TaskFlowPage({ params }: { params: { projectId: string } }) {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar' | 'gantt'>('kanban')
  const [filter, setFilter] = useState<'all' | 'assigned_to_me' | 'overdue' | 'this_week'>('all')

  // Fetch tasks with all related data
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', params.projectId, filter],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          assignee:assignee_id(name),
          dependencies:task_dependencies!task_id(
            id,
            depends_on_task:depends_on_task_id(id, title, status)
          ),
          blocking_tasks:task_dependencies!depends_on_task_id(
            id,
            task:task_id(id, title)
          ),
          checklist_items:task_checklist_items(id, title, is_completed, sequence_order),
          time_entries:task_time_entries(id, started_at, ended_at)
        `)
        .eq('project_id', params.projectId)
        .is('deleted_at', null)
        .order('sequence_order')

      // Apply filters
      if (filter === 'assigned_to_me') {
        const { data: { user } } = await supabase.auth.getUser()
        query = query.eq('assignee_id', user?.id)
      } else if (filter === 'overdue') {
        query = query.lt('due_date', new Date().toISOString()).not('status', 'eq', 'completed')
      } else if (filter === 'this_week') {
        const startOfWeek = new Date()
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(endOfWeek.getDate() + 7)

        query = query
          .gte('due_date', startOfWeek.toISOString())
          .lte('due_date', endOfWeek.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      return data as Task[]
    }
  })

  // Update task status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: TaskStatus }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', params.projectId] })
      toast.success('Task status updated')
    },
    onError: (error) => {
      toast.error(`Failed to update task: ${error.message}`)
    }
  })

  // Handle drag and drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as TaskStatus

    updateStatusMutation.mutate({ taskId, newStatus })
  }

  // Check if task can be started (dependencies met)
  const canStartTask = (task: Task): boolean => {
    if (task.dependencies.length === 0) return true

    return task.dependencies.every(dep => {
      const depTask = dep.depends_on_task
      // For finish_to_start (default), dependency must be completed
      return depTask.status === 'completed'
    })
  }

  // Get blocked reason
  const getBlockedReason = (task: Task): string | null => {
    if (canStartTask(task)) return null

    const incompleteDeps = task.dependencies.filter(
      dep => dep.depends_on_task.status !== 'completed'
    )

    if (incompleteDeps.length === 1) {
      return `Waiting for: ${incompleteDeps[0].depends_on_task.title}`
    }

    return `Waiting for ${incompleteDeps.length} tasks`
  }

  if (isLoading) return <div>Loading tasks...</div>

  // Group tasks by status
  const tasksByStatus = STATUS_COLUMNS.reduce((acc, column) => {
    acc[column.status] = tasks?.filter(t => t.status === column.status) || []
    return acc
  }, {} as Record<TaskStatus, Task[]>)

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Task Management</h1>

        {/* View Mode Selector */}
        <div className="flex gap-2">
          {(['kanban', 'list', 'calendar', 'gantt'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-3">
        {(['all', 'assigned_to_me', 'overdue', 'this_week'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded ${
              filter === f
                ? 'bg-blue-100 text-blue-700 border-blue-500 border'
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            {f.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </button>
        ))}
      </div>

      {/* Kanban Board */}
      {viewMode === 'kanban' && (
        <DndContext onDragEnd={handleDragEnd} collisionDetection={closestCorners}>
          <div className="grid grid-cols-4 gap-4">
            {STATUS_COLUMNS.map(column => {
              const columnTasks = tasksByStatus[column.status]

              return (
                <div key={column.status} className="flex flex-col">
                  {/* Column Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-lg">
                      {column.label}
                      <span className="ml-2 text-sm text-gray-500">
                        ({columnTasks.length})
                      </span>
                    </h3>
                  </div>

                  {/* Task Cards */}
                  <div
                    className="flex-1 bg-gray-50 rounded-lg p-3 space-y-3"
                    style={{ minHeight: '500px' }}
                  >
                    {columnTasks.map(task => {
                      const blockedReason = getBlockedReason(task)
                      const isOverdue = task.due_date &&
                        new Date(task.due_date) < new Date() &&
                        task.status !== 'completed'
                      const hasRunningTimer = task.time_entries.some(e => !e.ended_at)

                      return (
                        <div
                          key={task.id}
                          className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition ${
                            blockedReason ? 'opacity-60 border-2 border-red-300' : ''
                          }`}
                          onClick={() => {/* Open task detail modal */}}
                        >
                          {/* Priority Badge */}
                          {task.priority === 'critical' && (
                            <span className="inline-block px-2 py-1 text-xs bg-red-100 text-red-700 rounded mb-2">
                              🔥 CRITICAL
                            </span>
                          )}
                          {task.priority === 'high' && (
                            <span className="inline-block px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded mb-2">
                              ⚠️ HIGH
                            </span>
                          )}

                          {/* Task Title */}
                          <h4 className="font-medium mb-2">{task.title}</h4>

                          {/* Assignee */}
                          {task.assignee && (
                            <p className="text-sm text-gray-600 mb-2">
                              👷 {task.assignee.name}
                            </p>
                          )}

                          {/* Due Date */}
                          {task.due_date && (
                            <p className={`text-sm mb-2 ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                              📅 {new Date(task.due_date).toLocaleDateString()}
                              {isOverdue && ' (OVERDUE)'}
                            </p>
                          )}

                          {/* Estimated Hours */}
                          {task.estimated_hours && (
                            <p className="text-sm text-gray-600 mb-2">
                              ⏱️ {task.estimated_hours}h est.
                              {task.actual_hours > 0 && ` / ${task.actual_hours.toFixed(1)}h actual`}
                            </p>
                          )}

                          {/* Running Timer */}
                          {hasRunningTimer && (
                            <span className="inline-block px-2 py-1 text-xs bg-green-100 text-green-700 rounded mb-2">
                              ⏱️ Timer Running
                            </span>
                          )}

                          {/* Dependencies */}
                          {task.dependencies.length > 0 && (
                            <p className="text-sm text-blue-600 mb-2">
                              🔗 {task.dependencies.length} dependencies
                            </p>
                          )}

                          {/* Blocking */}
                          {task.blocking_tasks.length > 0 && (
                            <p className="text-sm text-orange-600 mb-2">
                              🚧 Blocking {task.blocking_tasks.length} tasks
                            </p>
                          )}

                          {/* Blocked Reason */}
                          {blockedReason && (
                            <p className="text-sm text-red-600 mb-2">
                              ⛔ {blockedReason}
                            </p>
                          )}

                          {/* Checklist Progress */}
                          {task.checklist_items.length > 0 && (
                            <div className="mb-2">
                              <p className="text-sm text-gray-600">
                                ✓ {task.checklist_items.filter(i => i.is_completed).length}/
                                {task.checklist_items.length} items
                              </p>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${task.progress_percentage}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Add Task Button */}
                    <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600">
                      + Add Task
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </DndContext>
      )}

      {/* Other views would go here: List, Calendar, Gantt */}
    </div>
  )
}
```

### 2. Task Templates System

```typescript
// app/taskflow/templates/page.tsx

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TaskTemplate {
  id: string
  name: string
  description: string
  category: string
  task_count: number
  times_used: number
  estimated_duration_days: number
  template_items: Array<{
    id: string
    title: string
    description: string
    estimated_hours: number
    phase_name: string
    sequence_order: number
    depends_on_sequences: number[]
  }>
}

export default function TaskTemplatesPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['task_templates', selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('task_templates')
        .select(`
          *,
          template_items:task_template_items(
            id, title, description, estimated_hours, phase_name,
            sequence_order, depends_on_sequences
          )
        `)
        .eq('is_active', true)
        .order('times_used', { ascending: false })

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      const { data, error } = await query
      if (error) throw error
      return data as TaskTemplate[]
    }
  })

  // Apply template to project
  const applyTemplateMutation = useMutation({
    mutationFn: async ({ templateId, projectId }: { templateId: string; projectId: string }) => {
      // Call Edge Function to apply template
      const response = await fetch('/api/taskflow/apply-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, projectId })
      })

      if (!response.ok) throw new Error('Failed to apply template')
      return response.json()
    },
    onSuccess: (data) => {
      toast.success(`Created ${data.tasksCreated} tasks from template`)
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Task Templates</h1>

      {/* Category Filter */}
      <div className="mb-6 flex gap-3">
        {['all', 'kitchen', 'bathroom', 'commercial', 'electrical', 'framing', 'custom'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded ${
              selectedCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-white border hover:bg-gray-50'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map(template => (
          <div key={template.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-lg">{template.name}</h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                {template.category}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4">{template.description}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
              <div>
                <p className="text-gray-500">Tasks</p>
                <p className="font-semibold">{template.task_count}</p>
              </div>
              <div>
                <p className="text-gray-500">Duration</p>
                <p className="font-semibold">{template.estimated_duration_days}d</p>
              </div>
              <div>
                <p className="text-gray-500">Used</p>
                <p className="font-semibold">{template.times_used}x</p>
              </div>
            </div>

            {/* Phases Preview */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">Phases:</p>
              <div className="flex flex-wrap gap-1">
                {Array.from(new Set(template.template_items.map(i => i.phase_name))).map(phase => (
                  <span key={phase} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    {phase}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => {/* Open template preview modal */}}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Preview
              </button>
              <button
                onClick={() => {/* Open apply to project modal */}}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Use Template
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Template Button */}
      <button
        onClick={() => {/* Open create template modal */}}
        className="fixed bottom-8 right-8 px-6 py-3 bg-green-600 text-white rounded-full shadow-lg hover:bg-green-700"
      >
        + Create Template
      </button>
    </div>
  )
}
```

### 3. Time Tracking Component

```typescript
// components/taskflow/TimeTracker.tsx

'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface TimeEntry {
  id: string
  task_id: string
  started_at: string
  ended_at: string | null
  duration_minutes: number
  notes: string
  task: {
    title: string
    project: {
      name: string
    }
  }
}

export default function TimeTracker() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Fetch active timer
  const { data: activeTimer } = useQuery({
    queryKey: ['active_timer'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase
        .from('task_time_entries')
        .select(`
          *,
          task:task_id(
            title,
            project:project_id(name)
          )
        `)
        .eq('user_id', user.id)
        .is('ended_at', null)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data as TimeEntry | null
    },
    refetchInterval: 1000 // Check every second for timer updates
  })

  // Update elapsed time
  useEffect(() => {
    if (!activeTimer) {
      setElapsedSeconds(0)
      return
    }

    const startTime = new Date(activeTimer.started_at).getTime()

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [activeTimer])

  // Start timer
  const startTimerMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('task_time_entries')
        .insert({
          task_id: taskId,
          user_id: user.id,
          started_at: new Date().toISOString()
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active_timer'] })
      toast.success('Timer started')
    }
  })

  // Stop timer
  const stopTimerMutation = useMutation({
    mutationFn: async ({ entryId, notes }: { entryId: string; notes?: string }) => {
      const { error } = await supabase
        .from('task_time_entries')
        .update({
          ended_at: new Date().toISOString(),
          notes: notes || null
        })
        .eq('id', entryId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active_timer'] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['time_entries'] })
      toast.success('Timer stopped')
    }
  })

  // Format elapsed time as HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return [hours, minutes, secs]
      .map(val => val.toString().padStart(2, '0'))
      .join(':')
  }

  if (!activeTimer) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border-2 border-gray-200">
        <p className="text-sm text-gray-500 mb-2">No active timer</p>
        <button
          onClick={() => {/* Open task selector modal */}}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
        >
          Start Timer
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 border-2 border-green-500 min-w-[280px]">
      {/* Timer Display */}
      <div className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <p className="text-xs text-gray-500">Timer Running</p>
        </div>
        <p className="text-2xl font-mono font-bold text-gray-900">
          {formatTime(elapsedSeconds)}
        </p>
      </div>

      {/* Task Info */}
      <div className="mb-4 pb-4 border-b">
        <p className="font-medium text-sm mb-1">{activeTimer.task.title}</p>
        <p className="text-xs text-gray-500">{activeTimer.task.project.name}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => stopTimerMutation.mutate({ entryId: activeTimer.id })}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Stop
        </button>
        <button
          onClick={() => {/* Open notes modal */}}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          📝
        </button>
      </div>

      {/* Started At */}
      <p className="text-xs text-gray-400 mt-3 text-center">
        Started {new Date(activeTimer.started_at).toLocaleTimeString()}
      </p>
    </div>
  )
}
```

### 4. Gantt Chart View

```typescript
// components/taskflow/GanttView.tsx

'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface Task {
  id: string
  title: string
  start_date: string
  due_date: string
  status: string
  assignee: { name: string }
  dependencies: Array<{ depends_on_task_id: string }>
}

export default function GanttView({ projectId }: { projectId: string }) {
  const supabase = createClient()

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks_gantt', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          id, title, start_date, due_date, status,
          assignee:assignee_id(name),
          dependencies:task_dependencies(depends_on_task_id)
        `)
        .eq('project_id', projectId)
        .not('start_date', 'is', null)
        .not('due_date', 'is', null)
        .order('start_date')

      if (error) throw error
      return data as Task[]
    }
  })

  // Calculate timeline boundaries
  const { startDate, endDate, totalDays } = useMemo(() => {
    if (!tasks || tasks.length === 0) {
      return { startDate: new Date(), endDate: new Date(), totalDays: 0 }
    }

    const dates = tasks.flatMap(t => [new Date(t.start_date), new Date(t.due_date)])
    const start = new Date(Math.min(...dates.map(d => d.getTime())))
    const end = new Date(Math.max(...dates.map(d => d.getTime())))

    // Add 1 week buffer on each side
    start.setDate(start.getDate() - 7)
    end.setDate(end.getDate() + 7)

    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

    return { startDate: start, endDate: end, totalDays: days }
  }, [tasks])

  // Calculate position for each task bar
  const getTaskPosition = (task: Task) => {
    const taskStart = new Date(task.start_date)
    const taskEnd = new Date(task.due_date)

    const startOffset = (taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    const duration = (taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)

    const left = (startOffset / totalDays) * 100
    const width = (duration / totalDays) * 100

    return { left: `${left}%`, width: `${width}%` }
  }

  if (isLoading) return <div>Loading Gantt chart...</div>

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-6">Timeline View</h2>

      {/* Timeline Header */}
      <div className="mb-4 border-b pb-2">
        <div className="flex text-sm text-gray-600">
          <div className="w-64 flex-shrink-0">Task</div>
          <div className="flex-1 relative">
            <div className="flex justify-between px-2">
              <span>{startDate.toLocaleDateString()}</span>
              <span>{endDate.toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Task Bars */}
      <div className="space-y-2">
        {tasks?.map(task => {
          const position = getTaskPosition(task)
          const statusColors = {
            not_started: 'bg-gray-400',
            in_progress: 'bg-blue-500',
            in_review: 'bg-yellow-500',
            completed: 'bg-green-500'
          }

          return (
            <div key={task.id} className="flex items-center group">
              {/* Task Name */}
              <div className="w-64 flex-shrink-0 pr-4">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <p className="text-xs text-gray-500">{task.assignee.name}</p>
              </div>

              {/* Timeline Bar */}
              <div className="flex-1 relative h-8 bg-gray-100 rounded">
                <div
                  className={`absolute h-full ${statusColors[task.status as keyof typeof statusColors]} rounded transition-all group-hover:opacity-80`}
                  style={position}
                  title={`${task.start_date} → ${task.due_date}`}
                >
                  <span className="text-xs text-white px-2 leading-8 truncate">
                    {task.title}
                  </span>
                </div>

                {/* Dependency Lines (simplified) */}
                {task.dependencies.map((dep, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 h-full border-l-2 border-orange-400"
                    style={{ left: '0%' }}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Today Indicator */}
      <div className="relative mt-4">
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500"
          style={{
            left: `${((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24) / totalDays) * 100}%`
          }}
        >
          <span className="absolute -top-6 -left-8 text-xs text-red-500 font-semibold">
            Today
          </span>
        </div>
      </div>
    </div>
  )
}
```

---

## BUSINESS LOGIC & FORMULAS

### Task Progress Calculation

```typescript
// Calculate task progress based on checklist completion
export function calculateTaskProgress(checklistItems: Array<{ is_completed: boolean }>): number {
  if (checklistItems.length === 0) return 0

  const completedCount = checklistItems.filter(item => item.is_completed).length
  return Math.round((completedCount / checklistItems.length) * 100)
}
```

### Capacity Planning

```typescript
// Calculate team member workload
export interface TeamMemberCapacity {
  userId: string
  userName: string
  totalAssignedHours: number
  availableHoursPerWeek: number
  utilizationPercentage: number
  isOverbooked: boolean
}

export async function calculateTeamCapacity(
  supabase: any,
  projectId: string,
  dateRange: { start: Date; end: Date }
): Promise<TeamMemberCapacity[]> {
  // Fetch all tasks assigned to team members in date range
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      assignee_id,
      estimated_hours,
      assignee:assignee_id(id, name)
    `)
    .eq('project_id', projectId)
    .gte('due_date', dateRange.start.toISOString())
    .lte('due_date', dateRange.end.toISOString())
    .neq('status', 'completed')

  if (error) throw error

  // Group by assignee
  const capacityByUser = new Map<string, TeamMemberCapacity>()

  for (const task of tasks) {
    if (!task.assignee_id) continue

    const existing = capacityByUser.get(task.assignee_id) || {
      userId: task.assignee_id,
      userName: task.assignee.name,
      totalAssignedHours: 0,
      availableHoursPerWeek: 40, // Standard work week
      utilizationPercentage: 0,
      isOverbooked: false
    }

    existing.totalAssignedHours += task.estimated_hours || 0
    capacityByUser.set(task.assignee_id, existing)
  }

  // Calculate utilization
  const weeksBetween = Math.ceil(
    (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24 * 7)
  )

  return Array.from(capacityByUser.values()).map(member => {
    const totalAvailableHours = member.availableHoursPerWeek * weeksBetween
    const utilization = Math.round((member.totalAssignedHours / totalAvailableHours) * 100)

    return {
      ...member,
      utilizationPercentage: utilization,
      isOverbooked: utilization > 100
    }
  })
}
```

### Critical Path Detection

```typescript
// Detect critical path (tasks that cannot be delayed without delaying project)
export interface CriticalPathTask {
  taskId: string
  title: string
  startDate: Date
  endDate: Date
  slack: number // Days this task can be delayed without affecting project
  isCritical: boolean
}

export async function calculateCriticalPath(
  supabase: any,
  projectId: string
): Promise<CriticalPathTask[]> {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select(`
      id, title, start_date, due_date, estimated_hours,
      dependencies:task_dependencies(
        depends_on_task_id,
        dependency_type,
        lag_days
      )
    `)
    .eq('project_id', projectId)
    .not('start_date', 'is', null)
    .not('due_date', 'is', null)

  if (error) throw error

  // Build dependency graph
  const graph = new Map<string, string[]>()
  for (const task of tasks) {
    graph.set(task.id, task.dependencies.map((d: any) => d.depends_on_task_id))
  }

  // Calculate earliest start/finish for each task (forward pass)
  const earliestStart = new Map<string, Date>()
  const earliestFinish = new Map<string, Date>()

  function calculateEarliest(taskId: string): void {
    if (earliestStart.has(taskId)) return

    const task = tasks.find(t => t.id === taskId)!
    const deps = graph.get(taskId) || []

    if (deps.length === 0) {
      earliestStart.set(taskId, new Date(task.start_date))
    } else {
      // Calculate based on dependencies
      deps.forEach(depId => calculateEarliest(depId))
      const maxDepFinish = Math.max(...deps.map(depId => earliestFinish.get(depId)!.getTime()))
      earliestStart.set(taskId, new Date(maxDepFinish))
    }

    const duration = (new Date(task.due_date).getTime() - new Date(task.start_date).getTime()) / (1000 * 60 * 60 * 24)
    const finish = new Date(earliestStart.get(taskId)!)
    finish.setDate(finish.getDate() + duration)
    earliestFinish.set(taskId, finish)
  }

  tasks.forEach(task => calculateEarliest(task.id))

  // Calculate latest start/finish (backward pass)
  const projectEnd = new Date(Math.max(...Array.from(earliestFinish.values()).map(d => d.getTime())))
  const latestFinish = new Map<string, Date>()
  const latestStart = new Map<string, Date>()

  // ... backward pass calculation (simplified for brevity)

  // Calculate slack and identify critical tasks
  return tasks.map(task => {
    const es = earliestStart.get(task.id)!
    const ls = latestStart.get(task.id) || es
    const slack = Math.floor((ls.getTime() - es.getTime()) / (1000 * 60 * 60 * 24))

    return {
      taskId: task.id,
      title: task.title,
      startDate: es,
      endDate: earliestFinish.get(task.id)!,
      slack,
      isCritical: slack === 0
    }
  })
}
```

---

## EDGE FUNCTIONS

### Apply Task Template

```typescript
// supabase/functions/apply-task-template/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const { templateId, projectId } = await req.json()

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! }
        }
      }
    )

    // Fetch template with items
    const { data: template, error: templateError } = await supabaseClient
      .from('task_templates')
      .select(`
        *,
        template_items:task_template_items(*)
      `)
      .eq('id', templateId)
      .single()

    if (templateError) throw templateError

    // Fetch project to get start date
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('id, company_id, start_date')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError

    const projectStartDate = new Date(project.start_date || Date.now())

    // Create tasks from template items
    const taskIdMap = new Map<number, string>() // sequence -> new task ID

    for (const item of template.template_items) {
      const startDate = new Date(projectStartDate)
      startDate.setDate(startDate.getDate() + item.start_offset_days)

      const dueDate = new Date(startDate)
      dueDate.setDate(dueDate.getDate() + item.duration_days)

      const { data: newTask, error: taskError } = await supabaseClient
        .from('tasks')
        .insert({
          project_id: projectId,
          company_id: project.company_id,
          title: item.title,
          description: item.description,
          task_type: item.task_type,
          priority: item.priority,
          estimated_hours: item.estimated_hours,
          start_date: startDate.toISOString(),
          due_date: dueDate.toISOString(),
          status: 'not_started',
          sequence_order: item.sequence_order
        })
        .select('id')
        .single()

      if (taskError) throw taskError

      taskIdMap.set(item.sequence_order, newTask.id)

      // Create checklist items
      if (item.checklist_items && Array.isArray(item.checklist_items)) {
        const checklistInserts = item.checklist_items.map((checkItem: any) => ({
          task_id: newTask.id,
          title: checkItem.title,
          sequence_order: checkItem.sequence || 0
        }))

        if (checklistInserts.length > 0) {
          await supabaseClient.from('task_checklist_items').insert(checklistInserts)
        }
      }
    }

    // Create dependencies
    for (const item of template.template_items) {
      if (item.depends_on_sequences && item.depends_on_sequences.length > 0) {
        const taskId = taskIdMap.get(item.sequence_order)!

        const dependencyInserts = item.depends_on_sequences.map(depSeq => ({
          task_id: taskId,
          depends_on_task_id: taskIdMap.get(depSeq)!,
          company_id: project.company_id,
          dependency_type: 'finish_to_start'
        }))

        await supabaseClient.from('task_dependencies').insert(dependencyInserts)
      }
    }

    // Update template usage stats
    await supabaseClient
      .from('task_templates')
      .update({
        times_used: template.times_used + 1,
        last_used_at: new Date().toISOString()
      })
      .eq('id', templateId)

    return new Response(
      JSON.stringify({
        success: true,
        tasksCreated: template.template_items.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## PERFORMANCE REQUIREMENTS

### Response Time Targets

- **Kanban Board Load**: < 1.0 seconds (with 500 tasks)
- **Task Status Update**: < 200ms (optimistic UI update)
- **Apply Template**: < 3 seconds (for 50-task template)
- **Gantt Chart Render**: < 1.5 seconds (with 200 tasks)
- **Time Entry Start/Stop**: < 150ms
- **Search/Filter**: < 300ms

### Optimization Strategies

1. **Database Indexes**
   - Composite indexes on `(project_id, status)` for Kanban queries
   - Index on `(user_id, ended_at)` for active timer lookups
   - Partial indexes for overdue tasks

2. **Query Optimization**
   - Use `select()` with specific columns instead of `*`
   - Paginate task lists when > 100 tasks
   - Use React Query caching with 5-minute stale time

3. **Real-Time Updates**
   - Subscribe to Supabase Realtime only for active project
   - Batch status updates when dragging multiple tasks
   - Debounce search inputs by 300ms

4. **Frontend Performance**
   - Virtualize Gantt chart rows when > 50 tasks
   - Lazy load task detail modals
   - Memoize dependency calculations

---

## TESTING REQUIREMENTS

### Unit Tests

```typescript
// __tests__/taskflow/dependencies.test.ts

describe('Task Dependency Logic', () => {
  it('should detect when task can be started', () => {
    const task = {
      dependencies: [
        { depends_on_task: { status: 'completed' } },
        { depends_on_task: { status: 'completed' } }
      ]
    }

    expect(canStartTask(task)).toBe(true)
  })

  it('should block task when dependencies incomplete', () => {
    const task = {
      dependencies: [
        { depends_on_task: { status: 'completed' } },
        { depends_on_task: { status: 'in_progress' } }
      ]
    }

    expect(canStartTask(task)).toBe(false)
    expect(getBlockedReason(task)).toContain('Waiting for')
  })

  it('should prevent circular dependencies', async () => {
    // Task A → Task B → Task C → Task A (circular!)
    await expect(
      supabase.from('task_dependencies').insert({
        task_id: taskA.id,
        depends_on_task_id: taskC.id
      })
    ).rejects.toThrow('Circular dependency detected')
  })
})

// __tests__/taskflow/capacity.test.ts

describe('Team Capacity Calculation', () => {
  it('should calculate correct utilization', async () => {
    const capacity = await calculateTeamCapacity(supabase, projectId, {
      start: new Date('2026-02-01'),
      end: new Date('2026-02-28') // 4 weeks
    })

    const member = capacity.find(c => c.userId === userId)
    expect(member?.totalAssignedHours).toBe(80) // 80 hours of tasks
    expect(member?.availableHoursPerWeek).toBe(40)
    expect(member?.utilizationPercentage).toBe(50) // 80 / (40 * 4) = 50%
    expect(member?.isOverbooked).toBe(false)
  })

  it('should flag overbooked team members', async () => {
    // User has 200 hours assigned in a 4-week period (40 * 4 = 160 available)
    const capacity = await calculateTeamCapacity(supabase, projectId, dateRange)

    const overbooked = capacity.find(c => c.userId === userId)
    expect(overbooked?.isOverbooked).toBe(true)
    expect(overbooked?.utilizationPercentage).toBeGreaterThan(100)
  })
})
```

### Integration Tests

```typescript
// __tests__/taskflow/template-application.test.ts

describe('Task Template Application', () => {
  it('should create all tasks from template', async () => {
    const template = await createTemplate({
      name: 'Kitchen Remodel',
      items: [
        { title: 'Demo', sequence: 0, duration_days: 2 },
        { title: 'Plumbing Rough-In', sequence: 1, duration_days: 3, depends_on_sequences: [0] },
        { title: 'Electrical Rough-In', sequence: 2, duration_days: 2, depends_on_sequences: [0] }
      ]
    })

    const response = await fetch('/api/taskflow/apply-template', {
      method: 'POST',
      body: JSON.stringify({
        templateId: template.id,
        projectId: project.id
      })
    })

    expect(response.ok).toBe(true)

    const tasks = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', project.id)

    expect(tasks.data).toHaveLength(3)
    expect(tasks.data[1].title).toBe('Plumbing Rough-In')
  })

  it('should create correct dependencies', async () => {
    // Apply template and verify dependencies created
    await applyTemplate(templateId, projectId)

    const deps = await supabase
      .from('task_dependencies')
      .select('*')
      .in('task_id', taskIds)

    expect(deps.data).toHaveLength(2) // Plumbing and Electrical both depend on Demo
  })
})
```

### E2E Tests

```typescript
// e2e/taskflow.spec.ts

test('should drag task between columns', async ({ page }) => {
  await page.goto(`/taskflow/${projectId}`)

  // Wait for Kanban board to load
  await page.waitForSelector('[data-testid="kanban-board"]')

  // Drag task from "Not Started" to "In Progress"
  const task = page.locator('[data-task-id="task-123"]')
  const inProgressColumn = page.locator('[data-status="in_progress"]')

  await task.dragTo(inProgressColumn)

  // Verify status updated
  await expect(page.locator('[data-task-id="task-123"]')).toHaveAttribute('data-status', 'in_progress')

  // Verify toast notification
  await expect(page.locator('.sonner-toast')).toHaveText(/Task status updated/)
})

test('should start and stop time tracker', async ({ page }) => {
  await page.goto(`/taskflow/${projectId}`)

  // Start timer
  await page.click('[data-testid="start-timer"]')
  await page.click('[data-task-title="Install Cabinets"]')

  // Verify timer is running
  await expect(page.locator('[data-testid="active-timer"]')).toBeVisible()
  await expect(page.locator('[data-testid="timer-display"]')).toHaveText(/00:00:/)

  // Wait 5 seconds
  await page.waitForTimeout(5000)

  // Verify elapsed time updated
  await expect(page.locator('[data-testid="timer-display"]')).toHaveText(/00:00:0[5-6]/)

  // Stop timer
  await page.click('[data-testid="stop-timer"]')

  // Verify timer stopped and time logged
  await expect(page.locator('[data-testid="active-timer"]')).not.toBeVisible()
})
```

---

## COMMON PITFALLS & SOLUTIONS

### Pitfall #1: Circular Dependency Hell

**Problem**: User creates Task A → Task B → Task C → Task A, breaking the system.

**Solution**: Database trigger `check_circular_dependency()` prevents this at insert time.

**Prevention**:
- Trigger validates entire dependency chain before allowing insert
- UI should also prevent obvious circular dependencies (e.g., task depending on itself)
- Show visual dependency graph in UI to help users see connections

### Pitfall #2: Template Application Performance

**Problem**: Applying a 200-task template times out or takes 30+ seconds.

**Solution**:
- Batch insert tasks in groups of 50 using `INSERT INTO ... VALUES ()` bulk syntax
- Create dependencies in separate batch after all tasks exist
- Run as Edge Function with higher timeout (20 seconds)
- Show progress indicator to user

### Pitfall #3: Time Tracker Battery Drain

**Problem**: Real-time polling every 1 second kills mobile battery.

**Solution**:
- Use `setInterval` only when timer is active
- Clear interval when component unmounts
- Use Supabase Realtime subscription instead of polling
- On mobile, reduce update frequency to every 5 seconds

### Pitfall #4: Gantt Chart Rendering Crashes

**Problem**: Rendering 500+ tasks in Gantt view freezes browser.

**Solution**:
- Implement virtual scrolling (only render visible tasks)
- Limit Gantt view to max 200 tasks at once
- Add date range filter to reduce tasks shown
- Use `useMemo` to cache position calculations

### Pitfall #5: Stale Task Data After Real-Time Update

**Problem**: User A updates task, User B's UI doesn't refresh.

**Solution**:
```typescript
// Subscribe to real-time task updates
useEffect(() => {
  const channel = supabase
    .channel('tasks_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `project_id=eq.${projectId}`
      },
      (payload) => {
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] })
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [projectId])
```

---

## PRE-LAUNCH CHECKLIST

### Database

- [ ] All tables created with correct schemas
- [ ] RLS policies enabled and tested for all tables
- [ ] Indexes created on high-traffic columns
- [ ] Triggers tested (circular dependency, auto-complete, progress update)
- [ ] Sample data populated for demo (3 templates, 50 tasks, dependencies)

### Features

- [ ] Kanban board drag-and-drop works smoothly
- [ ] Task dependencies visualized and enforced
- [ ] Templates apply correctly with dependencies
- [ ] Time tracker starts/stops reliably
- [ ] Gantt chart renders timelines accurately
- [ ] Calendar view shows tasks by due date
- [ ] List view filterable and sortable
- [ ] Overdue tasks highlighted in red

### Performance

- [ ] Kanban loads in < 1.0s with 500 tasks
- [ ] Template application completes in < 3s for 50-task template
- [ ] No memory leaks from timer intervals
- [ ] Gantt chart renders 200 tasks without freezing
- [ ] Real-time updates propagate within 500ms

### Testing

- [ ] Unit tests pass (dependency logic, capacity calc)
- [ ] Integration tests pass (template application)
- [ ] E2E tests pass (drag-drop, time tracking)
- [ ] Manual testing on mobile (iOS and Android)
- [ ] Cross-browser testing (Chrome, Safari, Firefox)

### User Experience

- [ ] Blocked tasks clearly show why they're blocked
- [ ] Overdue tasks visually distinct
- [ ] Running timer visible from all pages
- [ ] Template preview shows all tasks before applying
- [ ] Undo/redo for accidental status changes (nice-to-have)

### Documentation

- [ ] API documentation for Edge Functions
- [ ] User guide for creating templates
- [ ] Video tutorial for time tracking
- [ ] Tooltip help text on dependency types

---

## SUCCESS METRICS

### Usage Metrics

- **Task Creation Rate**: Target 50+ tasks/project
- **Template Usage**: Target 60% of projects use at least 1 template
- **Time Tracking Adoption**: Target 40% of users log time weekly
- **Dependency Usage**: Target 20% of tasks have dependencies
- **View Diversity**: Kanban (70%), List (20%), Gantt (10%)

### Performance Metrics

- **Page Load Time**: < 1.0s for Kanban (P95)
- **Action Response Time**: < 200ms for status updates (P95)
- **Error Rate**: < 0.1% of task operations fail
- **Real-Time Latency**: < 500ms for updates to propagate

### Business Metrics

- **Feature Retention**: 80% of users return to TaskFlow weekly
- **Premium Upgrade**: 25% upgrade to access templates and Gantt
- **Support Tickets**: < 5% of users need help with TaskFlow
- **User Satisfaction**: NPS > 50 for TaskFlow module

---

## DEPLOYMENT PROCEDURE

### Pre-Deploy

1. Run full test suite and ensure 100% pass rate
2. Create database migration scripts for all schema changes
3. Test migration on staging environment with production data clone
4. Generate sample templates for common construction workflows

### Deploy

1. **Database Migration** (run during low-traffic window):
   ```sql
   -- Apply all ALTER TABLE statements
   -- Create new tables (dependencies, templates, time entries)
   -- Create triggers and functions
   -- Enable RLS policies
   ```

2. **Edge Functions**:
   ```bash
   supabase functions deploy apply-task-template
   ```

3. **Frontend Deployment**:
   ```bash
   npm run build
   npm run deploy
   ```

4. **Seed Sample Templates**:
   - Kitchen Remodel (47 tasks)
   - Bathroom Renovation (28 tasks)
   - Commercial Build-Out (156 tasks)

### Post-Deploy

1. Smoke test critical flows:
   - Create task
   - Apply template
   - Start/stop timer
   - View Gantt chart

2. Monitor error logs for 1 hour

3. Check performance metrics against targets

4. Send announcement email to users highlighting new features

---

## WHAT TO PRESERVE (ALREADY WORKS)

✅ **Keep These - They're Great:**

1. **Existing Kanban Board**: Drag-and-drop works well, familiar to users
2. **Task Cards**: Clean design, shows priority/assignee/due date
3. **Real-Time Collaboration**: Multiple users can see updates immediately
4. **Status Columns**: 4-column layout (Not Started, In Progress, In Review, Completed) is intuitive
5. **Task Assignment**: Dropdown to assign team members works smoothly

## WHAT TO ADD (MISSING FEATURES)

🚀 **Add These - Fill the Gaps:**

1. **Task Dependencies**: Core feature missing - prevents "oops, we did electrical before framing"
2. **Templates**: Massive time-saver missing - should be able to apply "Kitchen Remodel" template in 10 seconds
3. **Time Tracking**: Missing - prevents accurate estimating for future bids
4. **Gantt Chart View**: Alternative view missing - some users prefer timeline visualization
5. **Checklist Items**: Task sub-items missing - break large tasks into smaller steps
6. **Progress Percentage**: Visual progress bar missing - helps estimate completion
7. **Capacity Planning**: No visibility into who's overbooked
8. **Critical Path Detection**: Advanced feature for professional contractors

## WHAT TO FIX (BROKEN/INCOMPLETE)

🔧 **Fix These - They're Broken:**

1. **Performance with Many Tasks**: Kanban likely slows down with 200+ tasks → Add pagination or virtualization
2. **No Dependency Enforcement**: Nothing prevents starting tasks out of order → Add blocking logic
3. **Missing Indexes**: Queries likely slow without proper indexes → Add composite indexes
4. **No Circular Dependency Prevention**: Database allows invalid dependencies → Add trigger
5. **Stale Data**: Real-time updates may not propagate correctly → Fix subscription logic

---

This quality implementation guide preserves the working Kanban board you've built while completing the missing 50% of TaskFlow functionality. It adds professional features (dependencies, templates, time tracking, Gantt charts) that turn TaskFlow from a basic to-do list into a construction project management powerhouse that can compete with Procore.

**Next Steps**: Once TaskFlow is complete, move to CRM module quality guide.
