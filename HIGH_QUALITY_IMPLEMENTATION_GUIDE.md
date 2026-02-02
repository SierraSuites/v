# THE SIERRA SUITES - HIGH QUALITY IMPLEMENTATION GUIDE
## How to Build World-Class Features From Business Plans

**Document Version**: 1.0
**Last Updated**: January 27, 2026
**Owner**: Product & Engineering Leadership
**Purpose**: Transform business requirements into production-ready, high-quality features that exceed user expectations and outperform competitors.

---

## Philosophy: From "What to Build" to "Build It Better Than Anyone Else"

The BUSINESS_PLAN folder tells us **WHAT** to build and **WHY** it matters.

This guide tells us **HOW** to build each feature to a standard that makes contractors say:
> "Holy shit, this is better than Procore. And it's 1/4 the price."

### The Three Pillars of Quality Implementation

1. **Functional Excellence** - It works perfectly, every time
2. **User Experience Excellence** - It's delightful to use
3. **Technical Excellence** - It's fast, reliable, and maintainable

**Non-Negotiable Standard**: Every feature must achieve **95%+ quality** before shipping. 95% means:
- ✅ All core user flows work perfectly
- ✅ Edge cases are handled gracefully
- ✅ Performance is excellent
- ✅ UX is polished and consistent
- ✅ Error states are handled
- ✅ Mobile experience is native-quality
- ⚠️ Only minor enhancements remain (not blockers)

---

# PART 1: UNIVERSAL QUALITY STANDARDS

These standards apply to **EVERY** feature across all modules.

## 1.1 Data Quality & Integrity

### Database Design Standards

**Every table MUST include**:
```sql
CREATE TABLE example_table (
  -- Identity
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenancy (CRITICAL - prevents data leaks)
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Soft deletes (never hard delete user data)
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  -- Audit trail
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),

  -- Your business fields here
  ...

  -- Indexes for performance
  CREATE INDEX idx_example_company ON example_table(company_id) WHERE deleted_at IS NULL;
  CREATE INDEX idx_example_created ON example_table(created_at DESC);
);

-- Row Level Security (RLS) - MANDATORY
ALTER TABLE example_table ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their company's data
CREATE POLICY "Users can access own company data"
ON example_table
FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Trigger: Auto-update updated_at
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON example_table
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

**Why This Matters**:
- ❌ Without `company_id` + RLS: Data leaks between customers (catastrophic)
- ❌ Without soft deletes: Accidental deletions lose data forever
- ❌ Without audit trail: Can't debug issues or answer "who changed this?"
- ❌ Without indexes: Queries slow down as data grows

### Data Validation Standards

**Client-Side Validation** (First line of defense):
```typescript
import { z } from 'zod'

// Define schema
const projectSchema = z.object({
  name: z.string()
    .min(3, "Project name must be at least 3 characters")
    .max(100, "Project name too long"),

  start_date: z.date()
    .refine(date => date >= new Date(), {
      message: "Start date cannot be in the past"
    }),

  estimated_budget: z.number()
    .positive("Budget must be positive")
    .max(100_000_000, "Budget exceeds maximum"),

  client_email: z.string()
    .email("Invalid email format")
    .optional(),
})

// Use in form
const handleSubmit = async (data: FormData) => {
  // Validate before sending to API
  const result = projectSchema.safeParse(data)

  if (!result.success) {
    // Show field-specific errors to user
    setErrors(result.error.flatten().fieldErrors)
    return
  }

  // Proceed with API call
  await createProject(result.data)
}
```

**Server-Side Validation** (Never trust the client):
```typescript
// API route: /api/projects
export async function POST(req: Request) {
  const body = await req.json()

  // ALWAYS validate on server too
  const result = projectSchema.safeParse(body)

  if (!result.success) {
    return Response.json(
      { error: "Validation failed", details: result.error.issues },
      { status: 422 }
    )
  }

  // Additional server-only checks
  const { data } = result

  // Check permissions
  const user = await getCurrentUser()
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Business logic validation
  const existingProjectCount = await getProjectCount(user.company_id)
  const userPlan = await getUserPlan(user.id)

  if (userPlan === 'starter' && existingProjectCount >= 5) {
    return Response.json(
      { error: "Project limit reached. Upgrade to add more projects." },
      { status: 403 }
    )
  }

  // Proceed with creation
  const project = await createProject({
    ...data,
    company_id: user.company_id,
    created_by: user.id
  })

  return Response.json({ project }, { status: 201 })
}
```

**Database Constraints** (Last line of defense):
```sql
-- Constraints prevent bad data even if code has bugs
ALTER TABLE projects
ADD CONSTRAINT projects_name_not_empty CHECK (LENGTH(TRIM(name)) >= 3),
ADD CONSTRAINT projects_budget_positive CHECK (estimated_budget > 0),
ADD CONSTRAINT projects_dates_logical CHECK (end_date >= start_date),
ADD CONSTRAINT projects_status_valid CHECK (status IN ('draft', 'planning', 'active', 'on_hold', 'completed', 'archived'));
```

---

## 1.2 User Experience Quality

### Loading States - The User Must Never Wonder "Is It Working?"

**Rule**: Every async operation MUST show loading state within 100ms.

**Bad Example** ❌:
```typescript
// User clicks button, nothing happens for 2 seconds, suddenly list appears
function ProjectList() {
  const [projects, setProjects] = useState([])

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(setProjects)
  }, [])

  return <div>{projects.map(p => <ProjectCard project={p} />)}</div>
}
```

**Good Example** ✅:
```typescript
function ProjectList() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        setProjects(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <ProjectListSkeleton /> // Skeleton loader, not spinner
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load projects"
        message={error}
        onRetry={() => window.location.reload()}
      />
    )
  }

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<BuildingIcon />}
        title="No projects yet"
        description="Create your first project to get started"
        action={
          <Button onClick={() => router.push('/projects/new')}>
            Create Project
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid gap-4">
      {projects.map(p => <ProjectCard key={p.id} project={p} />)}
    </div>
  )
}
```

### Skeleton Loaders vs Spinners

**Use Skeleton Loaders** (Preferred):
- Better perceived performance
- Shows layout before data loads
- No jarring spinner animation
- Feels faster even when it's not

```typescript
function ProjectListSkeleton() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="border rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ))}
    </div>
  )
}
```

**Use Spinners** (Only when skeleton doesn't make sense):
- Full-page loads
- Button submit states
- Modal content loading

### Empty States - Never Leave Users Confused

**Bad Empty State** ❌:
```typescript
<div>No projects</div>
```

**Good Empty State** ✅:
```typescript
<div className="text-center py-12">
  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
    <BuildingIcon className="w-8 h-8 text-blue-600" />
  </div>

  <h3 className="text-lg font-semibold text-gray-900 mb-2">
    No projects yet
  </h3>

  <p className="text-gray-600 mb-6 max-w-sm mx-auto">
    Get started by creating your first construction project.
    Track budget, schedule, photos, and team all in one place.
  </p>

  <Button onClick={() => router.push('/projects/new')}>
    <PlusIcon className="w-4 h-4 mr-2" />
    Create Your First Project
  </Button>
</div>
```

### Error States - Turn Frustration Into Guidance

**Principles**:
1. **Explain what happened** (in plain English, not tech jargon)
2. **Explain why it happened** (if known)
3. **Provide next steps** (what can the user do?)
4. **Never blame the user** (even if it's their fault)

**Bad Error** ❌:
```typescript
<div>Error: 500 Internal Server Error</div>
```

**Good Error** ✅:
```typescript
<div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
  <div className="flex items-start">
    <AlertTriangleIcon className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
    <div className="flex-1">
      <h4 className="font-semibold text-red-900 mb-1">
        Couldn't create project
      </h4>
      <p className="text-sm text-red-800 mb-3">
        {error.message === "PERMISSION_DENIED"
          ? "You don't have permission to create projects. Ask your admin to upgrade your role."
          : error.message === "PROJECT_LIMIT_REACHED"
          ? "You've reached your project limit (5 projects on Starter plan). Upgrade to Professional to add unlimited projects."
          : "Something went wrong on our end. We've been notified and are looking into it."
        }
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try Again
        </Button>
        {error.message === "PROJECT_LIMIT_REACHED" && (
          <Button size="sm" onClick={() => router.push('/pricing')}>
            View Plans
          </Button>
        )}
      </div>
    </div>
  </div>
</div>
```

---

## 1.3 Performance Quality

### Page Load Performance Targets

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| First Contentful Paint (FCP) | < 1.2s | < 1.8s |
| Largest Contentful Paint (LCP) | < 2.0s | < 2.5s |
| Time to Interactive (TTI) | < 3.0s | < 3.8s |
| Cumulative Layout Shift (CLS) | < 0.05 | < 0.1 |
| First Input Delay (FID) | < 50ms | < 100ms |

**How to Achieve**:

1. **Code Splitting**:
```typescript
// Bad: Load everything upfront
import DashboardCharts from '@/components/DashboardCharts'
import ProjectGantt from '@/components/ProjectGantt'
import PhotoGallery from '@/components/PhotoGallery'

// Good: Lazy load heavy components
const DashboardCharts = dynamic(() => import('@/components/DashboardCharts'), {
  loading: () => <ChartSkeleton />
})

const ProjectGantt = dynamic(() => import('@/components/ProjectGantt'), {
  loading: () => <GanttSkeleton />
})
```

2. **Image Optimization**:
```typescript
// Bad: Raw image
<img src="/project-photo.jpg" alt="Project" />

// Good: Next.js Image with optimization
<Image
  src="/project-photo.jpg"
  alt="Project site on Jan 15"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AA..." // Low-res preview
  loading="lazy"
/>
```

3. **Database Query Optimization**:
```sql
-- Bad: Fetches all projects then filters in JS
SELECT * FROM projects;

-- Good: Let database do the filtering
SELECT
  id,
  name,
  status,
  progress,
  estimated_budget,
  actual_spent
FROM projects
WHERE company_id = $1
  AND deleted_at IS NULL
  AND status = 'active'
ORDER BY updated_at DESC
LIMIT 20
OFFSET $2;

-- Add index for fast filtering
CREATE INDEX idx_projects_active_company
ON projects(company_id, status, updated_at DESC)
WHERE deleted_at IS NULL;
```

4. **Pagination & Virtualization**:
```typescript
// Bad: Load 1000 projects at once
const { data: projects } = await supabase
  .from('projects')
  .select('*')

// Good: Paginate
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .range(0, 19) // First 20

// Best: Virtualize long lists (for 100+ items)
import { useVirtualizer } from '@tanstack/react-virtual'

function ProjectList({ projects }) {
  const parentRef = useRef(null)

  const rowVirtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated row height
  })

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
        {rowVirtualizer.getVirtualItems().map(virtualRow => (
          <ProjectCard
            key={virtualRow.index}
            project={projects[virtualRow.index]}
          />
        ))}
      </div>
    </div>
  )
}
```

---

## 1.4 Mobile Quality

### Mobile-First Design Principles

**Rule**: Design for mobile FIRST, then enhance for desktop.

Why? 60% of construction workers use mobile as their primary device.

**Bad Approach** ❌:
```typescript
// Desktop-first thinking
<div className="flex gap-8">
  <Sidebar className="w-64" />
  <MainContent className="flex-1" />
  <RightPanel className="w-80" />
</div>
```

**Good Approach** ✅:
```typescript
// Mobile-first, progressive enhancement
<div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
  {/* Sidebar: Bottom drawer on mobile, left sidebar on desktop */}
  <Sidebar className="order-3 lg:order-1 lg:w-64" />

  {/* Main content: Always priority */}
  <MainContent className="order-1 lg:order-2 flex-1" />

  {/* Right panel: Hidden on mobile unless needed */}
  <RightPanel className="order-2 lg:order-3 lg:w-80 hidden lg:block" />
</div>
```

### Touch Target Sizes

**Minimum Touch Target**: 44x44px (iOS) / 48x48px (Android)

```typescript
// Bad: Tiny buttons
<button className="p-1 text-xs">Delete</button>

// Good: Touch-friendly
<button className="p-3 min-w-[44px] min-h-[44px]">
  <TrashIcon className="w-5 h-5" />
</button>
```

### Mobile Navigation Patterns

**Bottom Navigation** (Primary actions):
```typescript
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t lg:hidden">
  <div className="flex justify-around p-2">
    <NavItem href="/dashboard" icon={<HomeIcon />} label="Home" />
    <NavItem href="/projects" icon={<BuildingIcon />} label="Projects" />
    <NavItem href="/photos" icon={<CameraIcon />} label="Photos" />
    <NavItem href="/tasks" icon={<CheckIcon />} label="Tasks" />
  </div>
</nav>
```

**Hamburger Menu** (Secondary nav):
```typescript
<Sheet>
  <SheetTrigger>
    <MenuIcon className="w-6 h-6" />
  </SheetTrigger>
  <SheetContent side="left">
    <nav>
      <NavLink href="/settings">Settings</NavLink>
      <NavLink href="/teams">Team</NavLink>
      <NavLink href="/reports">Reports</NavLink>
    </nav>
  </SheetContent>
</Sheet>
```

---

# PART 2: MODULE-SPECIFIC QUALITY STANDARDS

## 2.1 Dashboard Module Quality Standards

**Reference Business Plan**: `BUSINESS_PLAN/01_DASHBOARD.md`

### Core Quality Requirements

#### 1. Real-Time Data Accuracy

**Standard**: All statistics MUST update within 2 seconds of underlying data changing.

**Implementation**:
```typescript
// Use Supabase real-time subscriptions
useEffect(() => {
  const channel = supabase
    .channel('dashboard-updates')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'projects'
    }, (payload) => {
      // Update project count immediately
      refetchDashboardStats()
    })
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [])
```

#### 2. Performance Under Load

**Standard**: Dashboard MUST load in < 2 seconds even with 100+ active projects.

**Implementation Strategy**:
1. **Aggregate stats in database**, not JavaScript:
```sql
-- Bad: Fetch all projects, calculate in JS
SELECT * FROM projects WHERE company_id = $1;

-- Good: Let PostgreSQL do the math
SELECT
  COUNT(*) FILTER (WHERE status = 'active') as active_count,
  COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold_count,
  SUM(estimated_budget) FILTER (WHERE status = 'active') as total_budget,
  SUM(actual_spent) FILTER (WHERE status = 'active') as total_spent,
  COUNT(*) FILTER (WHERE actual_spent > estimated_budget) as over_budget_count
FROM projects
WHERE company_id = $1
  AND deleted_at IS NULL;
```

2. **Cache expensive calculations**:
```typescript
// Use React Query with smart caching
const { data: stats } = useQuery({
  queryKey: ['dashboard-stats', companyId],
  queryFn: () => fetchDashboardStats(companyId),
  staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  refetchInterval: 60 * 1000, // Auto-refresh every minute
})
```

#### 3. Critical Alerts Must Be Obvious

**Standard**: Problems requiring immediate attention MUST be visible within 3 seconds of dashboard load.

**Implementation**:
```typescript
function CriticalAlerts() {
  const { data: alerts } = useQuery({
    queryKey: ['critical-alerts'],
    queryFn: fetchCriticalAlerts,
    // Load alerts first, before other dashboard widgets
    priority: 'high'
  })

  if (!alerts || alerts.length === 0) return null

  return (
    <div className="mb-6 space-y-3">
      {alerts.map(alert => (
        <Alert
          key={alert.id}
          variant={alert.severity} // 'critical' | 'warning' | 'info'
          className={cn(
            "animate-in fade-in slide-in-from-top-2",
            alert.severity === 'critical' && "bg-red-50 border-red-600"
          )}
        >
          <AlertIcon severity={alert.severity} />
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
          {alert.action && (
            <Button
              size="sm"
              onClick={alert.action.onClick}
              className="mt-2"
            >
              {alert.action.label}
            </Button>
          )}
        </Alert>
      ))}
    </div>
  )
}

// Example critical alerts
const criticalAlerts = [
  {
    severity: 'critical',
    title: 'Project Over Budget',
    message: 'Downtown Office Renovation is $45K over budget (110% spent)',
    action: {
      label: 'Review Budget',
      onClick: () => router.push('/projects/PRJ-123/budget')
    }
  },
  {
    severity: 'warning',
    title: 'Inspection Tomorrow',
    message: 'Electrical inspection at Harbor View - Final walkthrough required',
    action: {
      label: 'View Details',
      onClick: () => router.push('/projects/PRJ-456/inspections')
    }
  }
]
```

#### 4. Quick Actions Must Be One Click

**Standard**: Common actions (create project, add task, upload photo) accessible in ≤ 1 click.

**Implementation**:
```typescript
function QuickActions() {
  return (
    <div className="flex gap-3 mb-6">
      <Button onClick={() => router.push('/projects/new')}>
        <PlusIcon className="w-4 h-4 mr-2" />
        New Project
      </Button>

      <Button variant="outline" onClick={() => router.push('/tasks/new')}>
        <CheckIcon className="w-4 h-4 mr-2" />
        Add Task
      </Button>

      <Button variant="outline" onClick={() => openPhotoUpload()}>
        <CameraIcon className="w-4 h-4 mr-2" />
        Upload Photo
      </Button>

      <Popover>
        <PopoverTrigger>
          <Button variant="ghost">
            <MoreHorizontalIcon className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <QuickActionMenu />
        </PopoverContent>
      </Popover>
    </div>
  )
}
```

---

## 2.2 Projects Module Quality Standards

**Reference Business Plan**: `BUSINESS_PLAN/02_PROJECTS.md`

### Core Quality Requirements

#### 1. Budget Tracking Accuracy to the Penny

**Standard**: Budget vs Actual must be accurate to $0.01, updated in real-time.

**Database Schema**:
```sql
-- Project budget tracking
CREATE TABLE project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID NOT NULL REFERENCES projects(id),

  -- Expense details
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL, -- Supports up to $9,999,999,999.99
  expense_date DATE NOT NULL,
  category TEXT NOT NULL, -- 'labor', 'materials', 'equipment', 'subcontractor', 'other'

  -- Receipt/documentation
  receipt_url TEXT,
  vendor_name TEXT,
  invoice_number TEXT,

  -- Approval workflow
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,

  -- Change orders
  change_order_id UUID REFERENCES change_orders(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Materialized view for fast budget calculations
CREATE MATERIALIZED VIEW project_budget_summary AS
SELECT
  p.id as project_id,
  p.company_id,
  p.estimated_budget,

  -- Total spent (approved expenses only)
  COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'approved'), 0) as total_spent,

  -- Pending expenses
  COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'pending'), 0) as pending_expenses,

  -- Remaining budget
  p.estimated_budget - COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'approved'), 0) as remaining_budget,

  -- Budget health percentage
  CASE
    WHEN p.estimated_budget > 0 THEN
      (COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'approved'), 0) / p.estimated_budget * 100)
    ELSE 0
  END as budget_used_percentage,

  -- By category
  COALESCE(SUM(e.amount) FILTER (WHERE e.category = 'labor' AND e.status = 'approved'), 0) as labor_spent,
  COALESCE(SUM(e.amount) FILTER (WHERE e.category = 'materials' AND e.status = 'approved'), 0) as materials_spent,
  COALESCE(SUM(e.amount) FILTER (WHERE e.category = 'equipment' AND e.status = 'approved'), 0) as equipment_spent,
  COALESCE(SUM(e.amount) FILTER (WHERE e.category = 'subcontractor' AND e.status = 'approved'), 0) as subcontractor_spent,

  -- Last updated
  MAX(e.created_at) as last_expense_date
FROM projects p
LEFT JOIN project_expenses e ON p.id = e.project_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.company_id, p.estimated_budget;

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_project_budget_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY project_budget_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Auto-refresh on expense changes
CREATE TRIGGER refresh_budget_on_expense_change
AFTER INSERT OR UPDATE OR DELETE ON project_expenses
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_project_budget_summary();
```

**UI Implementation**:
```typescript
function ProjectBudgetWidget({ projectId }: { projectId: string }) {
  const { data: budget, isLoading } = useQuery({
    queryKey: ['project-budget', projectId],
    queryFn: () => getProjectBudget(projectId),
    refetchInterval: 5000, // Update every 5 seconds
  })

  if (isLoading) return <BudgetSkeleton />

  const percentUsed = budget.budget_used_percentage
  const isOverBudget = percentUsed > 100
  const isWarning = percentUsed > 85 && percentUsed <= 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Budget Status
          {isOverBudget && (
            <Badge variant="destructive">Over Budget</Badge>
          )}
          {isWarning && (
            <Badge variant="warning">Approaching Limit</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Budget bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">
              ${budget.total_spent.toLocaleString()} spent
            </span>
            <span className="text-muted-foreground">
              of ${budget.estimated_budget.toLocaleString()}
            </span>
          </div>
          <Progress
            value={Math.min(percentUsed, 100)}
            className={cn(
              isOverBudget && "bg-red-100",
              isWarning && "bg-yellow-100"
            )}
            indicatorClassName={cn(
              isOverBudget && "bg-red-600",
              isWarning && "bg-yellow-600",
              !isOverBudget && !isWarning && "bg-green-600"
            )}
          />
          <div className="text-right text-sm mt-1">
            <span className={cn(
              "font-semibold",
              isOverBudget && "text-red-600",
              isWarning && "text-yellow-600"
            )}>
              {percentUsed.toFixed(1)}% used
            </span>
          </div>
        </div>

        {/* Remaining budget */}
        <div className={cn(
          "p-3 rounded-lg",
          isOverBudget ? "bg-red-50" : isWarning ? "bg-yellow-50" : "bg-green-50"
        )}>
          <div className="text-sm font-medium mb-1">
            {isOverBudget ? "Over Budget By" : "Remaining Budget"}
          </div>
          <div className={cn(
            "text-2xl font-bold",
            isOverBudget && "text-red-600",
            !isOverBudget && "text-green-600"
          )}>
            ${Math.abs(budget.remaining_budget).toLocaleString()}
          </div>
        </div>

        {/* Breakdown by category */}
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold">Spending by Category</h4>
          <BudgetCategoryRow label="Labor" amount={budget.labor_spent} />
          <BudgetCategoryRow label="Materials" amount={budget.materials_spent} />
          <BudgetCategoryRow label="Equipment" amount={budget.equipment_spent} />
          <BudgetCategoryRow label="Subcontractors" amount={budget.subcontractor_spent} />
        </div>

        {/* Pending expenses warning */}
        {budget.pending_expenses > 0 && (
          <Alert className="mt-4">
            <AlertDescription>
              ${budget.pending_expenses.toLocaleString()} in pending expenses awaiting approval
            </AlertDescription>
          </Alert>
        )}

        {/* Quick actions */}
        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={() => router.push(`/projects/${projectId}/expenses/new`)}>
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Expense
          </Button>
          <Button size="sm" variant="outline" onClick={() => router.push(`/projects/${projectId}/budget`)}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### 2. Document Management That Actually Works

**Standard**: Upload, organize, version, search, and share documents seamlessly.

**Features Required**:
- ✅ Drag & drop upload
- ✅ Folder organization
- ✅ Version history
- ✅ OCR text extraction
- ✅ Full-text search
- ✅ Share links with expiration
- ✅ Mobile camera upload
- ✅ Auto-categorization by file type

**Implementation**:
```typescript
// File upload with progress
async function uploadDocument(file: File, projectId: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('projectId', projectId)

  // Upload to S3 via API
  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    body: formData,
    onUploadProgress: (progressEvent) => {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      )
      setUploadProgress(percentCompleted)
    }
  })

  const { document } = await response.json()

  // Trigger OCR for PDFs and images
  if (file.type.includes('pdf') || file.type.includes('image')) {
    await fetch('/api/documents/ocr', {
      method: 'POST',
      body: JSON.stringify({ documentId: document.id })
    })
  }

  return document
}

// Document viewer with version history
function DocumentViewer({ documentId }: { documentId: string }) {
  const { data: document } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => getDocument(documentId)
  })

  const { data: versions } = useQuery({
    queryKey: ['document-versions', documentId],
    queryFn: () => getDocumentVersions(documentId)
  })

  return (
    <div className="flex h-full">
      {/* Main viewer */}
      <div className="flex-1">
        {document.file_type.includes('pdf') && (
          <PDFViewer url={document.url} />
        )}
        {document.file_type.includes('image') && (
          <ImageViewer url={document.url} />
        )}
        {/* OCR extracted text for search */}
        {document.ocr_text && (
          <div className="p-4 bg-gray-50">
            <h4 className="font-semibold mb-2">Extracted Text</h4>
            <p className="text-sm whitespace-pre-wrap">{document.ocr_text}</p>
          </div>
        )}
      </div>

      {/* Sidebar with metadata and versions */}
      <div className="w-80 border-l p-4">
        <h3 className="font-semibold mb-4">{document.name}</h3>

        <div className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">Uploaded by</span>
            <p className="font-medium">{document.uploaded_by_name}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Date</span>
            <p className="font-medium">{formatDate(document.created_at)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Size</span>
            <p className="font-medium">{formatFileSize(document.file_size)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Folder</span>
            <p className="font-medium">{document.folder_path || 'Root'}</p>
          </div>
        </div>

        {/* Version history */}
        <div className="mt-6">
          <h4 className="font-semibold mb-3">Version History</h4>
          <div className="space-y-2">
            {versions.map((version, idx) => (
              <div
                key={version.id}
                className="flex items-center justify-between p-2 rounded hover:bg-gray-100"
              >
                <div>
                  <div className="font-medium text-sm">
                    v{versions.length - idx}
                    {idx === 0 && <Badge className="ml-2">Current</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(version.created_at)}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => viewVersion(version)}>
                  View
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Share */}
        <div className="mt-6">
          <Button className="w-full" onClick={() => generateShareLink(documentId)}>
            <ShareIcon className="w-4 h-4 mr-2" />
            Generate Share Link
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## 2.3 QuoteHub Module Quality Standards

**Reference Business Plan**: `BUSINESS_PLAN/03_QUOTEHUB.md`

### Core Quality Requirements

#### 1. Professional PDF Generation

**Standard**: Generated quote PDFs must be indistinguishable from professional designer-created documents.

**Requirements**:
- ✅ Company branding (logo, colors, fonts)
- ✅ Professional layout and typography
- ✅ Line item tables with totals
- ✅ Terms & conditions
- ✅ Digital signature fields
- ✅ Mobile-responsive (looks good on phone and desktop)

**Implementation Using React-PDF**:
```typescript
import { Document, Page, Text, View, StyleSheet, Image, PDFViewer } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  logo: {
    width: 120,
    height: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1E3A8A',
    borderBottom: '2pt solid #1E3A8A',
    paddingBottom: 5,
  },
  table: {
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 10,
  },
  total: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A8A',
    textAlign: 'right',
    marginTop: 10,
  },
})

function QuotePDF({ quote }: { quote: Quote }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Image src={quote.company_logo} style={styles.logo} />
            <Text style={{ fontSize: 10, marginTop: 5 }}>{quote.company_name}</Text>
            <Text style={{ fontSize: 9, color: '#6B7280' }}>{quote.company_address}</Text>
            <Text style={{ fontSize: 9, color: '#6B7280' }}>{quote.company_phone}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.title}>QUOTE</Text>
            <Text style={{ fontSize: 10, marginTop: 5 }}>#{quote.quote_number}</Text>
            <Text style={{ fontSize: 9, color: '#6B7280' }}>
              Date: {formatDate(quote.created_at)}
            </Text>
            <Text style={{ fontSize: 9, color: '#6B7280' }}>
              Valid Until: {formatDate(quote.valid_until)}
            </Text>
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BILL TO</Text>
          <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{quote.client_name}</Text>
          <Text style={{ fontSize: 10, color: '#6B7280' }}>{quote.client_address}</Text>
          <Text style={{ fontSize: 10, color: '#6B7280' }}>{quote.client_email}</Text>
          <Text style={{ fontSize: 10, color: '#6B7280' }}>{quote.client_phone}</Text>
        </View>

        {/* Project Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROJECT</Text>
          <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{quote.project_name}</Text>
          <Text style={{ fontSize: 10, color: '#6B7280' }}>{quote.project_description}</Text>
        </View>

        {/* Line Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LINE ITEMS</Text>
          <View style={styles.table}>
            {/* Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, { flex: 1 }]}>Item</Text>
              <Text style={[styles.tableCell, { flex: 2 }]}>Description</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>Qty</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>Unit Price</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>Total</Text>
            </View>

            {/* Rows */}
            {quote.line_items.map((item, idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 1 }]}>{item.item_number}</Text>
                <Text style={[styles.tableCell, { flex: 2 }]}>{item.description}</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {item.quantity} {item.unit}
                </Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  ${item.unit_price.toLocaleString()}
                </Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  ${item.total.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={{ marginTop: 20, alignItems: 'flex-end' }}>
            <View style={{ width: 250 }}>
              <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.tableCell, { flex: 1 }]}>Subtotal:</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  ${quote.subtotal.toLocaleString()}
                </Text>
              </View>
              {quote.discount > 0 && (
                <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.tableCell, { flex: 1 }]}>Discount:</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                    -${quote.discount.toLocaleString()}
                  </Text>
                </View>
              )}
              <View style={[styles.tableRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.tableCell, { flex: 1 }]}>Tax ({quote.tax_rate}%):</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  ${quote.tax.toLocaleString()}
                </Text>
              </View>
              <View style={[styles.tableRow, { borderTopWidth: 2, borderTopColor: '#1E3A8A' }]}>
                <Text style={[styles.tableCell, { flex: 1, fontWeight: 'bold' }]}>TOTAL:</Text>
                <Text style={styles.total}>${quote.total.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TERMS & CONDITIONS</Text>
          <Text style={{ fontSize: 9, lineHeight: 1.5 }}>{quote.terms_and_conditions}</Text>
        </View>

        {/* Signature */}
        <View style={[styles.section, { marginTop: 40 }]}>
          <Text style={{ fontSize: 10, marginBottom: 30 }}>
            Authorized Signature: ___________________________
          </Text>
          <Text style={{ fontSize: 9, color: '#6B7280' }}>
            By signing this quote, you agree to the terms and conditions outlined above.
          </Text>
        </View>

        {/* Footer */}
        <View style={{ position: 'absolute', bottom: 30, left: 40, right: 40 }}>
          <Text style={{ fontSize: 8, color: '#9CA3AF', textAlign: 'center' }}>
            {quote.company_name} • {quote.company_phone} • {quote.company_email}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

// Usage in component
function QuotePreview({ quoteId }: { quoteId: string }) {
  const { data: quote } = useQuery({
    queryKey: ['quote', quoteId],
    queryFn: () => getQuote(quoteId)
  })

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h2 className="text-2xl font-bold">Quote Preview</h2>
        <div className="flex gap-2">
          <Button onClick={() => downloadPDF(quote)}>
            <DownloadIcon className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={() => emailQuote(quote)}>
            <MailIcon className="w-4 h-4 mr-2" />
            Email to Client
          </Button>
        </div>
      </div>

      <PDFViewer width="100%" height="800px">
        <QuotePDF quote={quote} />
      </PDFViewer>
    </div>
  )
}
```

#### 2. Email Tracking That Shows ROI

**Standard**: Track email opens, clicks, and quote acceptance to prove value.

**Implementation**:
```typescript
// Email tracking table
CREATE TABLE quote_email_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by UUID REFERENCES user_profiles(id),

  -- Tracking
  opened_at TIMESTAMPTZ,
  open_count INT DEFAULT 0,
  clicked_at TIMESTAMPTZ,
  click_count INT DEFAULT 0,

  -- Outcome
  quote_accepted_at TIMESTAMPTZ,
  quote_rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Email content snapshot
  email_subject TEXT,
  email_body TEXT,
  pdf_url TEXT
);

// API endpoint for tracking pixel
export async function GET(
  req: Request,
  { params }: { params: { trackingId: string } }
) {
  const { trackingId } = params

  // Record email open
  await supabase
    .from('quote_email_tracking')
    .update({
      opened_at: new Date().toISOString(),
      open_count: supabase.sql`open_count + 1`
    })
    .eq('id', trackingId)

  // Return 1x1 transparent pixel
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  )

  return new Response(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}

// Email template with tracking
function generateQuoteEmail(quote: Quote, trackingId: string) {
  return `
    <html>
      <body>
        <h2>Quote #${quote.quote_number} from ${quote.company_name}</h2>

        <p>Hi ${quote.client_name},</p>

        <p>Thank you for the opportunity to quote on your ${quote.project_name} project.
        Please find attached our detailed quote.</p>

        <p><strong>Total Investment: $${quote.total.toLocaleString()}</strong></p>

        <p>
          <a href="${process.env.NEXT_PUBLIC_URL}/quotes/${quote.id}/view?tracking=${trackingId}">
            View Quote Online
          </a>
        </p>

        <p>
          <a href="${process.env.NEXT_PUBLIC_URL}/quotes/${quote.id}/accept?tracking=${trackingId}">
            Accept Quote
          </a>
        </p>

        <p>This quote is valid until ${formatDate(quote.valid_until)}.</p>

        <p>Best regards,<br>${quote.sent_by_name}</p>

        <!-- Tracking pixel -->
        <img src="${process.env.NEXT_PUBLIC_URL}/api/tracking/pixel/${trackingId}"
             width="1" height="1" alt="" />
      </body>
    </html>
  `
}

// Dashboard showing email performance
function QuoteEmailMetrics({ quoteId }: { quoteId: string }) {
  const { data: tracking } = useQuery({
    queryKey: ['quote-tracking', quoteId],
    queryFn: () => getQuoteEmailTracking(quoteId)
  })

  return (
    <div className="grid grid-cols-4 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Sent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{tracking.sent_count}</div>
          <p className="text-sm text-muted-foreground">
            Last sent {formatTimeAgo(tracking.last_sent_at)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Opened</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{tracking.open_count}</div>
          <p className="text-sm text-muted-foreground">
            {tracking.open_rate}% open rate
          </p>
          {tracking.opened_at && (
            <p className="text-xs text-muted-foreground mt-1">
              First opened {formatTimeAgo(tracking.opened_at)}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clicked</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{tracking.click_count}</div>
          <p className="text-sm text-muted-foreground">
            {tracking.click_rate}% click rate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          {tracking.quote_accepted_at ? (
            <>
              <Badge variant="success">Accepted</Badge>
              <p className="text-sm text-muted-foreground mt-2">
                {formatTimeAgo(tracking.quote_accepted_at)}
              </p>
            </>
          ) : tracking.quote_rejected_at ? (
            <>
              <Badge variant="destructive">Rejected</Badge>
              <p className="text-sm text-muted-foreground mt-2">
                {tracking.rejection_reason}
              </p>
            </>
          ) : (
            <>
              <Badge variant="warning">Pending</Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Awaiting response
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 2.4 FieldSnap (Photo Management) Quality Standards

**Reference Business Plan**: `BUSINESS_PLAN/04_FIELDSNAP.md`

### Core Quality Requirements

#### 1. Smart Photo Organization Using AI

**Standard**: Photos must be automatically categorized, tagged, and searchable without manual effort.

**Implementation Using Google Cloud Vision API**:
```typescript
// Server-side processing after upload
export async function POST(req: Request) {
  const { photoId } = await req.json()

  // Get photo from database
  const { data: photo } = await supabase
    .from('photos')
    .select('*')
    .eq('id', photoId)
    .single()

  // Analyze with Google Cloud Vision
  const [result] = await visionClient.annotateImage({
    image: { source: { imageUri: photo.url } },
    features: [
      { type: 'LABEL_DETECTION', maxResults: 10 },
      { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
      { type: 'TEXT_DETECTION' },
      { type: 'SAFE_SEARCH_DETECTION' },
      { type: 'IMAGE_PROPERTIES' },
    ],
  })

  // Extract insights
  const labels = result.labelAnnotations?.map(l => l.description) || []
  const objects = result.localizedObjectAnnotations?.map(o => o.name) || []
  const text = result.textAnnotations?.[0]?.description || null
  const colors = result.imagePropertiesAnnotation?.dominantColors?.colors || []

  // Auto-categorize
  let category = 'general'
  if (labels.includes('Person') || labels.includes('Worker')) {
    category = 'team'
  } else if (labels.includes('Tool') || labels.includes('Equipment')) {
    category = 'equipment'
  } else if (labels.includes('Material') || objects.includes('Building')) {
    category = 'progress'
  } else if (labels.includes('Damage') || labels.includes('Defect')) {
    category = 'issue'
  }

  // Detect safety issues
  const safetyIssues = []
  if (labels.includes('Ladder') && !labels.includes('Safety harness')) {
    safetyIssues.push('Potential fall hazard: Ladder without harness')
  }
  if (labels.includes('Person') && !labels.includes('Hard hat')) {
    safetyIssues.push('Worker without hard hat detected')
  }

  // Update photo with AI insights
  await supabase
    .from('photos')
    .update({
      ai_labels: labels,
      ai_objects: objects,
      ai_text: text,
      ai_category: category,
      ai_safety_issues: safetyIssues,
      ai_dominant_color: colors[0]?.color,
      ai_processed_at: new Date().toISOString(),
    })
    .eq('id', photoId)

  // Create alert if safety issue detected
  if (safetyIssues.length > 0) {
    await createSafetyAlert({
      project_id: photo.project_id,
      photo_id: photoId,
      severity: 'high',
      title: 'Safety Concern Detected in Photo',
      description: safetyIssues.join(', '),
    })
  }

  return Response.json({ success: true })
}

// Smart search
async function searchPhotos(query: string, filters: PhotoFilters) {
  // Full-text search across AI labels, objects, and text
  const { data: photos } = await supabase
    .from('photos')
    .select('*')
    .or(`ai_labels.cs.{${query}},ai_objects.cs.{${query}},ai_text.ilike.%${query}%`)
    .eq('project_id', filters.projectId)
    .order('created_at', { ascending: false })

  return photos
}
```

#### 2. Before/After Comparison Tool

**Standard**: Side-by-side comparison with slider, annotations, and timeline view.

**Implementation**:
```typescript
'use client'

import { useState } from 'react'
import { Slider } from '@/components/ui/slider'

function BeforeAfterComparison({
  beforePhoto,
  afterPhoto,
}: {
  beforePhoto: Photo
  afterPhoto: Photo
}) {
  const [sliderPosition, setSliderPosition] = useState(50)

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-lg">
      {/* Before image */}
      <div className="absolute inset-0">
        <Image
          src={beforePhoto.url}
          alt="Before"
          fill
          className="object-cover"
        />
        <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded font-semibold">
          BEFORE
        </div>
      </div>

      {/* After image with clip path */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <Image
          src={afterPhoto.url}
          alt="After"
          fill
          className="object-cover"
        />
        <div className="absolute top-4 right-4 bg-green-600 text-white px-3 py-1 rounded font-semibold">
          AFTER
        </div>
      </div>

      {/* Slider handle */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={(e) => {
          const handleMouseMove = (e: MouseEvent) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const x = e.clientX - rect.left
            const percentage = (x / rect.width) * 100
            setSliderPosition(Math.max(0, Math.min(100, percentage)))
          }

          const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove)
            document.removeEventListener('mouseup', handleMouseUp)
          }

          document.addEventListener('mousemove', handleMouseMove)
          document.addEventListener('mouseup', handleMouseUp)
        }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <ChevronLeftIcon className="w-4 h-4" />
          <ChevronRightIcon className="w-4 h-4" />
        </div>
      </div>

      {/* Bottom slider for fine control */}
      <div className="absolute bottom-4 left-4 right-4">
        <Slider
          value={[sliderPosition]}
          onValueChange={([value]) => setSliderPosition(value)}
          max={100}
          step={1}
          className="bg-white/80 backdrop-blur"
        />
      </div>

      {/* Metadata */}
      <div className="absolute bottom-16 left-4 right-4 bg-black/60 backdrop-blur text-white p-3 rounded text-sm">
        <div className="flex justify-between">
          <div>
            <div className="font-semibold">Before</div>
            <div className="text-xs opacity-80">
              {formatDate(beforePhoto.created_at)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold">After</div>
            <div className="text-xs opacity-80">
              {formatDate(afterPhoto.created_at)}
            </div>
            <div className="text-xs opacity-80">
              {getDaysDifference(beforePhoto.created_at, afterPhoto.created_at)} days later
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

*This document continues with detailed quality standards for remaining modules...*

---

## PART 3: QUALITY ASSURANCE PROCESS

### Pre-Launch Checklist for Every Feature

Before marking ANY feature as "complete", it MUST pass this checklist:

#### Functional Testing
- [ ] All happy paths work perfectly
- [ ] All edge cases handled
- [ ] Error cases display helpful messages
- [ ] Form validation works (client + server)
- [ ] Database transactions are atomic
- [ ] Real-time updates work
- [ ] Search/filter works with 0 results
- [ ] Search/filter works with 1000+ results
- [ ] Pagination works correctly
- [ ] Sorting works on all columns

#### UX Testing
- [ ] Loading states show within 100ms
- [ ] Empty states are helpful
- [ ] Error states provide next steps
- [ ] Success feedback is clear
- [ ] Animations are smooth (60fps)
- [ ] No layout shifts during load
- [ ] Touch targets are 44x44px minimum
- [ ] Keyboard navigation works
- [ ] Screen reader announces changes

#### Performance Testing
- [ ] Page loads in < 2 seconds
- [ ] Database queries < 100ms
- [ ] Images are optimized
- [ ] No unnecessary re-renders
- [ ] Large lists are virtualized
- [ ] API responses are cached
- [ ] Works with slow 3G connection

#### Mobile Testing
- [ ] Works on iPhone SE (small screen)
- [ ] Works on iPhone 14 Pro Max (large screen)
- [ ] Works on Android phones
- [ ] Works on tablets
- [ ] Touch gestures work
- [ ] Works in portrait and landscape
- [ ] No horizontal scroll

#### Security Testing
- [ ] Row-level security enforced
- [ ] User permissions checked
- [ ] SQL injection prevented
- [ ] XSS prevented
- [ ] CSRF tokens used
- [ ] Sensitive data encrypted
- [ ] File upload validated
- [ ] Rate limiting applied

#### Browser Testing
- [ ] Works in Chrome
- [ ] Works in Safari
- [ ] Works in Firefox
- [ ] Works in Edge
- [ ] No console errors
- [ ] No broken images
- [ ] No broken links

---

## CONCLUSION

This guide transforms the "what to build" from the business plans into "how to build it perfectly."

**Remember**:
- 95% quality is the minimum
- Every feature must delight users
- Performance is a feature
- Mobile is not optional
- Security is not negotiable
- Accessibility is mandatory

**The difference between Sierra Suites and competitors**:
- Procore: Built in 2004, feels like 2004
- We: Built in 2025, feels like 2030

**Build features so good that contractors say**:
> "How is this so cheap? This is better than software that costs 10x more."

That's how we win.

---

**Next Steps**: Take each business plan document and implement using these quality standards. Review this guide before starting any new feature.
