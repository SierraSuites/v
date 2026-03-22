# DASHBOARD MODULE - QUALITY IMPLEMENTATION GUIDE

**Module**: Command Center / Dashboard
**Business Plan Reference**: `BUSINESS_PLAN/01_DASHBOARD.md`
**Quality Standard**: 95% Completion Minimum
**Priority**: CRITICAL (First Impression)
**Estimated Development Time**: 3 weeks

---

## EXECUTIVE SUMMARY

The Dashboard is the first thing users see every day. It must:
1. **Load instantly** (< 1.5 seconds even with 100+ projects)
2. **Show critical information** at a glance (no hunting)
3. **Surface problems** before they become disasters
4. **Enable quick action** (max 1 click to common tasks)

**Non-Negotiable**: If the dashboard is slow, confusing, or shows stale data, users will lose confidence in the entire platform.

---

## QUALITY STANDARDS

### Performance Targets

| Metric | Target | Max Acceptable | Fail Threshold |
|--------|--------|----------------|----------------|
| Initial Page Load | < 1.2s | < 1.8s | > 2.0s |
| Stats Query Time | < 100ms | < 200ms | > 300ms |
| Real-time Update Latency | < 2s | < 5s | > 10s |
| Widget Render Time | < 50ms each | < 100ms | > 200ms |
| Dashboard Refresh | < 500ms | < 1s | > 1.5s |

### Data Accuracy Standards

| Data Point | Freshness | Update Method | Tolerance |
|------------|-----------|---------------|-----------|
| Active Projects Count | Real-time | PostgreSQL subscription | 0 delay |
| Tasks Due Today | Real-time | Recalculated on change | 0 delay |
| Budget Health | Near real-time | Materialized view | < 30s delay |
| Recent Activity | Real-time | Event stream | < 2s delay |
| Team Status | Polling | Every 60s | 60s delay acceptable |

### UX Standards

- ✅ **Loading State**: Must appear within 100ms of page load
- ✅ **Skeleton Loaders**: For all stat cards and widgets
- ✅ **Error Recovery**: Graceful degradation if API fails
- ✅ **Empty State**: Helpful guidance for new users
- ✅ **Mobile Responsive**: Works perfectly on phone screens
- ✅ **Keyboard Navigation**: All actions accessible via keyboard

---

## DATABASE SCHEMA

### Stats Aggregation (Materialized View)

```sql
-- Materialized view for fast dashboard stats
CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT
  company_id,

  -- Project stats
  COUNT(*) FILTER (WHERE status = 'active' AND deleted_at IS NULL) as active_projects,
  COUNT(*) FILTER (WHERE status = 'planning' AND deleted_at IS NULL) as planning_projects,
  COUNT(*) FILTER (WHERE status = 'on_hold' AND deleted_at IS NULL) as on_hold_projects,

  -- Projects behind schedule
  COUNT(*) FILTER (
    WHERE status = 'active'
    AND estimated_end_date < CURRENT_DATE
    AND deleted_at IS NULL
  ) as projects_behind_schedule,

  -- Budget stats
  SUM(estimated_budget) FILTER (WHERE status = 'active' AND deleted_at IS NULL) as total_budget,
  SUM(actual_spent) FILTER (WHERE status = 'active' AND deleted_at IS NULL) as total_spent,

  -- Projects over budget
  COUNT(*) FILTER (
    WHERE status = 'active'
    AND actual_spent > estimated_budget
    AND deleted_at IS NULL
  ) as projects_over_budget,

  -- Average project health (0-100 score)
  AVG(
    CASE
      WHEN estimated_budget > 0 THEN
        GREATEST(0, LEAST(100, 100 - ((actual_spent - estimated_budget) / estimated_budget * 100)))
      ELSE 100
    END
  ) FILTER (WHERE status = 'active' AND deleted_at IS NULL) as avg_budget_health,

  -- Last updated
  NOW() as calculated_at

FROM projects
GROUP BY company_id;

-- Index for fast lookups
CREATE UNIQUE INDEX idx_dashboard_stats_company ON dashboard_stats(company_id);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh on project changes
CREATE TRIGGER refresh_stats_on_project_change
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_dashboard_stats();
```

### Tasks Due Today (Real-Time Query)

```sql
-- Optimized query for tasks due today
CREATE INDEX idx_tasks_due_today ON tasks(company_id, due_date, status)
WHERE deleted_at IS NULL AND status != 'completed';

-- Query function
CREATE OR REPLACE FUNCTION get_tasks_due_today(p_company_id UUID)
RETURNS TABLE (
  total_count BIGINT,
  critical_count BIGINT,
  high_priority_count BIGINT,
  overdue_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE priority = 'critical') as critical_count,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count,
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE) as overdue_count
  FROM tasks
  WHERE company_id = p_company_id
    AND due_date <= CURRENT_DATE
    AND status != 'completed'
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;
```

### Recent Activity Feed

```sql
CREATE TABLE activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Activity details
  action TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'completed'
  entity_type TEXT NOT NULL, -- 'project', 'task', 'quote', 'expense', etc.
  entity_id UUID NOT NULL,
  entity_name TEXT,

  -- Who did it
  user_id UUID REFERENCES user_profiles(id),
  user_name TEXT,

  -- What changed
  changes JSONB, -- { field: { old: value, new: value } }

  -- Metadata
  metadata JSONB, -- Additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Indexes
  INDEX idx_activity_company_created (company_id, created_at DESC),
  INDEX idx_activity_entity (entity_type, entity_id),
  INDEX idx_activity_user (user_id, created_at DESC)
);

-- RLS
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company activity"
ON activity_feed FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Retention policy: Keep only last 90 days
CREATE OR REPLACE FUNCTION cleanup_old_activity()
RETURNS void AS $$
BEGIN
  DELETE FROM activity_feed
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily)
SELECT cron.schedule('cleanup-activity', '0 2 * * *', 'SELECT cleanup_old_activity()');
```

---

## IMPLEMENTATION

### 1. Dashboard Stats Component

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'

interface DashboardStats {
  active_projects: number
  planning_projects: number
  on_hold_projects: number
  projects_behind_schedule: number
  total_budget: number
  total_spent: number
  projects_over_budget: number
  avg_budget_health: number
  calculated_at: string
}

interface TaskStats {
  total_count: number
  critical_count: number
  high_priority_count: number
  overdue_count: number
}

export default function DashboardStatsGrid() {
  const supabase = createClient()

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const { data, error } = await supabase
        .from('dashboard_stats')
        .select('*')
        .eq('company_id', profile.company_id)
        .single()

      if (error) throw error
      return data as DashboardStats
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })

  // Fetch tasks due today
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks-due-today'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const { data, error } = await supabase
        .rpc('get_tasks_due_today', { p_company_id: profile.company_id })

      if (error) throw error
      return data[0] as TaskStats
    },
    refetchInterval: 60000, // Refresh every minute
  })

  // Real-time subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'projects'
      }, () => {
        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'tasks'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['tasks-due-today'] })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (statsLoading || tasksLoading) {
    return <DashboardStatsGridSkeleton />
  }

  if (!stats || !tasks) {
    return <DashboardStatsGridError />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Active Projects Card */}
      <StatCard
        title="Active Projects"
        value={stats.active_projects}
        subtitle={
          stats.projects_behind_schedule > 0
            ? `${stats.projects_behind_schedule} behind schedule`
            : 'All on track'
        }
        trend={{
          value: stats.planning_projects,
          label: 'in planning',
          direction: 'neutral'
        }}
        icon={<BuildingIcon className="w-6 h-6" />}
        color="blue"
        href="/projects?status=active"
      />

      {/* Tasks Due Today Card */}
      <StatCard
        title="Tasks Due Today"
        value={tasks.total_count}
        subtitle={
          tasks.overdue_count > 0
            ? `${tasks.overdue_count} overdue`
            : 'No overdue tasks'
        }
        trend={{
          value: tasks.critical_count,
          label: 'critical',
          direction: tasks.critical_count > 0 ? 'down' : 'neutral'
        }}
        icon={<CheckCircleIcon className="w-6 h-6" />}
        color={tasks.overdue_count > 0 ? 'red' : tasks.critical_count > 0 ? 'yellow' : 'green'}
        href="/taskflow?filter=due-today"
        urgent={tasks.overdue_count > 0}
      />

      {/* Budget Health Card */}
      <StatCard
        title="Budget Health"
        value={`${stats.avg_budget_health.toFixed(0)}%`}
        subtitle={
          stats.projects_over_budget > 0
            ? `${stats.projects_over_budget} projects over budget`
            : 'All within budget'
        }
        trend={{
          value: ((stats.total_spent / stats.total_budget) * 100).toFixed(0),
          label: '% of total budget used',
          direction: stats.total_spent > stats.total_budget * 0.9 ? 'down' : 'neutral'
        }}
        icon={<DollarSignIcon className="w-6 h-6" />}
        color={
          stats.projects_over_budget > 0
            ? 'red'
            : stats.avg_budget_health < 15
            ? 'yellow'
            : 'green'
        }
        href="/financial/budget"
        urgent={stats.projects_over_budget > 0}
      />

      {/* Total Budget Card */}
      <StatCard
        title="Total Project Value"
        value={formatCurrency(stats.total_budget)}
        subtitle={`${formatCurrency(stats.total_spent)} spent`}
        trend={{
          value: formatCurrency(stats.total_budget - stats.total_spent),
          label: 'remaining',
          direction: 'neutral'
        }}
        icon={<TrendingUpIcon className="w-6 h-6" />}
        color="blue"
        href="/financial/overview"
      />

      {/* On Hold Projects (if any) */}
      {stats.on_hold_projects > 0 && (
        <StatCard
          title="Projects On Hold"
          value={stats.on_hold_projects}
          subtitle="Requires attention"
          icon={<PauseCircleIcon className="w-6 h-6" />}
          color="yellow"
          href="/projects?status=on-hold"
        />
      )}
    </div>
  )
}

// Stat Card Component
interface StatCardProps {
  title: string
  value: string | number
  subtitle: string
  trend?: {
    value: string | number
    label: string
    direction: 'up' | 'down' | 'neutral'
  }
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'red'
  href?: string
  urgent?: boolean
}

function StatCard({ title, value, subtitle, trend, icon, color, href, urgent }: StatCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    yellow: 'from-yellow-500 to-yellow-600',
    red: 'from-red-500 to-red-600',
  }

  const Component = href ? Link : 'div'

  return (
    <Component
      href={href || '#'}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md",
        href && "cursor-pointer hover:scale-[1.02]",
        urgent && "ring-2 ring-red-500 animate-pulse"
      )}
    >
      {/* Gradient Background */}
      <div className={cn(
        "absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-10 rounded-full -translate-y-1/2 translate-x-1/2",
        `bg-gradient-to-br ${colorClasses[color]}`
      )} />

      {/* Icon */}
      <div className={cn(
        "inline-flex p-3 rounded-lg bg-gradient-to-br mb-4",
        colorClasses[color],
        "text-white"
      )}>
        {icon}
      </div>

      {/* Content */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-1">
          {title}
        </h3>
        <div className="text-3xl font-bold mb-2">
          {value}
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {subtitle}
        </p>

        {/* Trend */}
        {trend && (
          <div className="flex items-center gap-2 text-sm">
            {trend.direction === 'up' && (
              <ArrowUpIcon className="w-4 h-4 text-green-600" />
            )}
            {trend.direction === 'down' && (
              <ArrowDownIcon className="w-4 h-4 text-red-600" />
            )}
            <span className="font-semibold">{trend.value}</span>
            <span className="text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </div>

      {/* Arrow indicator for links */}
      {href && (
        <div className="absolute bottom-4 right-4 text-muted-foreground">
          <ArrowRightIcon className="w-5 h-5" />
        </div>
      )}
    </Component>
  )
}

// Loading Skeleton
function DashboardStatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="rounded-xl border bg-card p-6 animate-pulse">
          <div className="w-12 h-12 bg-gray-200 rounded-lg mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
        </div>
      ))}
    </div>
  )
}

// Error State
function DashboardStatsGridError() {
  return (
    <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
      <div className="flex items-start">
        <AlertTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
        <div>
          <h4 className="font-semibold text-red-900 mb-1">
            Failed to load dashboard statistics
          </h4>
          <p className="text-sm text-red-800">
            We couldn't fetch your latest stats. Try refreshing the page.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### 2. Recent Activity Feed

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'

interface Activity {
  id: string
  action: string
  entity_type: string
  entity_id: string
  entity_name: string
  user_name: string
  changes: Record<string, { old: any; new: any }>
  created_at: string
}

export default function RecentActivityFeed() {
  const { data: activities, isLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      return data as Activity[]
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  })

  if (isLoading) {
    return <ActivityFeedSkeleton />
  }

  if (!activities || activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<ActivityIcon />}
            title="No recent activity"
            description="Activity across your projects will appear here"
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest updates across all projects
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map(activity => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ActivityItem({ activity }: { activity: Activity }) {
  const icon = getActivityIcon(activity.entity_type, activity.action)
  const message = formatActivityMessage(activity)

  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
      <div className={cn(
        "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
        getActivityColor(activity.action)
      )}>
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {message}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {activity.user_name} • {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewEntity(activity.entity_type, activity.entity_id)}
          >
            View
          </Button>
        </div>

        {/* Show changes if available */}
        {activity.changes && Object.keys(activity.changes).length > 0 && (
          <div className="mt-2 text-xs text-gray-600 space-y-1">
            {Object.entries(activity.changes).slice(0, 2).map(([field, change]) => (
              <div key={field} className="flex gap-2">
                <span className="font-medium capitalize">{field}:</span>
                <span className="line-through text-gray-400">{change.old}</span>
                <span>→</span>
                <span className="font-medium">{change.new}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function getActivityIcon(entityType: string, action: string) {
  if (action === 'created') return <PlusCircleIcon className="w-5 h-5" />
  if (action === 'updated') return <EditIcon className="w-5 h-5" />
  if (action === 'deleted') return <TrashIcon className="w-5 h-5" />
  if (action === 'completed') return <CheckCircleIcon className="w-5 h-5" />

  return <ActivityIcon className="w-5 h-5" />
}

function getActivityColor(action: string) {
  const colors = {
    created: 'bg-green-100 text-green-600',
    updated: 'bg-blue-100 text-blue-600',
    deleted: 'bg-red-100 text-red-600',
    completed: 'bg-purple-100 text-purple-600',
  }

  return colors[action as keyof typeof colors] || 'bg-gray-100 text-gray-600'
}

function formatActivityMessage(activity: Activity): string {
  const { action, entity_type, entity_name } = activity

  const templates = {
    project: {
      created: `Created project "${entity_name}"`,
      updated: `Updated project "${entity_name}"`,
      completed: `Completed project "${entity_name}"`,
    },
    task: {
      created: `Added task "${entity_name}"`,
      updated: `Updated task "${entity_name}"`,
      completed: `Completed task "${entity_name}"`,
    },
    quote: {
      created: `Created quote "${entity_name}"`,
      updated: `Updated quote "${entity_name}"`,
      completed: `Sent quote "${entity_name}"`,
    },
    expense: {
      created: `Logged expense "${entity_name}"`,
      updated: `Updated expense "${entity_name}"`,
    },
  }

  return templates[entity_type as keyof typeof templates]?.[action as keyof typeof templates['project']]
    || `${action} ${entity_type} "${entity_name}"`
}
```

---

## TESTING REQUIREMENTS

### Performance Testing

```typescript
// tests/dashboard.performance.test.ts
describe('Dashboard Performance', () => {
  it('should load stats in under 200ms with 100 projects', async () => {
    // Create 100 test projects
    await createTestProjects(100)

    const startTime = performance.now()
    const stats = await getDashboardStats()
    const endTime = performance.now()

    expect(endTime - startTime).toBeLessThan(200)
    expect(stats.active_projects).toBeGreaterThan(0)
  })

  it('should handle real-time updates within 2 seconds', async () => {
    // Subscribe to updates
    const updatePromise = waitForDashboardUpdate()

    // Create new project
    await createProject({ name: 'Test Project' })

    // Wait for update
    const updateTime = await updatePromise

    expect(updateTime).toBeLessThan(2000) // 2 seconds
  })

  it('should render 20 activity items in under 100ms', async () => {
    const activities = generateTestActivities(20)

    const startTime = performance.now()
    render(<RecentActivityFeed activities={activities} />)
    const endTime = performance.now()

    expect(endTime - startTime).toBeLessThan(100)
  })
})
```

### Functional Testing

```typescript
// tests/dashboard.functional.test.ts
describe('Dashboard Functionality', () => {
  it('should show correct project counts', async () => {
    // Setup
    await createTestProject({ status: 'active' })
    await createTestProject({ status: 'active' })
    await createTestProject({ status: 'planning' })

    // Test
    render(<Dashboard />)
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument() // Active projects
      expect(screen.getByText('1 in planning')).toBeInTheDocument()
    })
  })

  it('should highlight overdue tasks in red', async () => {
    // Create overdue task
    await createTestTask({
      due_date: '2025-01-15', // Past date
      status: 'in_progress'
    })

    render(<Dashboard />)
    const taskCard = await screen.findByText(/overdue/)
    expect(taskCard).toHaveClass('text-red-600')
  })

  it('should show budget warning for projects over 85%', async () => {
    await createTestProject({
      estimated_budget: 100000,
      actual_spent: 87000 // 87% spent
    })

    render(<Dashboard />)
    expect(await screen.findByText(/approaching limit/i)).toBeInTheDocument()
  })
})
```

---

## PRE-LAUNCH CHECKLIST

### Functional Requirements
- [ ] All stat cards display accurate real-time data
- [ ] Clicking stat cards navigates to correct filtered view
- [ ] Activity feed updates in real-time (< 2s delay)
- [ ] Empty states shown for new users
- [ ] Error states handled gracefully
- [ ] Quick actions work (create project, task, etc.)
- [ ] Refresh button updates all data
- [ ] Date/time displayed in user's timezone

### Performance Requirements
- [ ] Dashboard loads in < 1.5 seconds
- [ ] Stats query completes in < 100ms
- [ ] Real-time updates appear within 2 seconds
- [ ] No layout shift during load (CLS < 0.1)
- [ ] Smooth 60fps animations
- [ ] Works with 100+ active projects
- [ ] Works with 1000+ tasks

### UX Requirements
- [ ] Skeleton loaders show immediately
- [ ] All cards are clickable/hoverable
- [ ] Mobile layout is usable (no horizontal scroll)
- [ ] Keyboard navigation works
- [ ] Screen reader announces updates
- [ ] Colors meet WCAG AA contrast (4.5:1)
- [ ] Icons have alt text

### Data Accuracy
- [ ] Project counts match database
- [ ] Task counts match database
- [ ] Budget calculations are correct to $0.01
- [ ] Activity feed shows latest 20 items
- [ ] Overdue indicators are accurate
- [ ] Behind schedule count is correct

### Mobile Testing
- [ ] Works on iPhone SE (small screen)
- [ ] Works on iPhone 14 Pro (large screen)
- [ ] Works on Android phones
- [ ] Touch targets are 44x44px minimum
- [ ] No horizontal scroll
- [ ] Stats grid stacks vertically
- [ ] All features accessible on mobile

### Security
- [ ] Users only see their company's data
- [ ] Row-level security enforced
- [ ] No SQL injection vulnerabilities
- [ ] API routes check authentication
- [ ] Real-time subscriptions filtered by company

---

## COMMON PITFALLS & SOLUTIONS

### Pitfall 1: Slow Stats Calculation

**Problem**: Calculating stats on-the-fly for every page load is too slow.

**Solution**: Use materialized view that refreshes on data changes.

```sql
-- Bad: Calculate every time
SELECT COUNT(*) FROM projects WHERE status = 'active';

-- Good: Pre-calculated materialized view
SELECT active_projects FROM dashboard_stats WHERE company_id = $1;
```

### Pitfall 2: Stale Data

**Problem**: Dashboard shows old data, users make decisions on wrong info.

**Solution**: Real-time subscriptions + aggressive cache invalidation.

```typescript
// Subscribe to all relevant tables
useEffect(() => {
  const channel = supabase
    .channel('dashboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, refetch)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, refetch)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, refetch)
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [])
```

### Pitfall 3: Poor Mobile Experience

**Problem**: Desktop-first design makes mobile unusable.

**Solution**: Mobile-first responsive design.

```typescript
// Bad: Fixed layout
<div className="grid grid-cols-4 gap-4">

// Good: Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
```

### Pitfall 4: No Loading States

**Problem**: Users click, nothing happens, they click again, duplicate actions.

**Solution**: Immediate loading feedback.

```typescript
function StatCard() {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true) // Show loading immediately
    try {
      await performAction()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button disabled={isLoading} onClick={handleClick}>
      {isLoading ? <Spinner /> : 'Click Me'}
    </button>
  )
}
```

---

## SUCCESS METRICS

### User Engagement
- **Daily active usage**: 80%+ of users visit dashboard daily
- **Average session start**: Dashboard is first page visited 90% of time
- **Click-through rate**: 60%+ users click on at least one stat card
- **Time to action**: Users find what they need in < 10 seconds

### Performance
- **Load time**: < 1.5 seconds for 95% of loads
- **Error rate**: < 0.1% of dashboard loads fail
- **Real-time accuracy**: Updates appear within 2 seconds 99% of time

### Business Impact
- **Problem detection**: Users find issues 2x faster than before
- **Decision speed**: Users take action 3x faster with dashboard insights
- **Support tickets**: Reduce "where is X?" questions by 50%

---

## DEPLOYMENT CHECKLIST

Before deploying to production:

1. **Database**
   - [ ] Materialized view created
   - [ ] Indexes added
   - [ ] RLS policies enabled
   - [ ] Trigger functions working

2. **Performance**
   - [ ] Load test with 1000 projects passed
   - [ ] Real-time updates tested with 10 concurrent users
   - [ ] Memory leaks checked (no subscriptions leaking)

3. **Monitoring**
   - [ ] Error tracking configured (Sentry)
   - [ ] Performance monitoring setup (Vercel Analytics)
   - [ ] Database query monitoring enabled
   - [ ] Alerts configured for slow queries (> 500ms)

4. **Documentation**
   - [ ] User guide created
   - [ ] Admin documentation updated
   - [ ] API documentation current
   - [ ] Changelog updated

---

**Remember**: The dashboard is the heart of the application. If it's slow, buggy, or confusing, users will lose confidence in the entire platform. Ship it when it's 95%+ perfect, not before.
