cont SIERRA SUITES - ENTERPRISE IMPLEMENTATION PART 2
## Revenue & Collaboration Features

**Continuation of:** ENTERPRISE_IMPLEMENTATION_MASTER_PLAN.md

---

## 📱 SECTION 4: DASHBOARD MODULE

### Current State
- **Completion:** 85%
- **Enterprise Score:** 78/100
- **Critical Issue:** Page is 31,706 tokens (158KB) - exceeds file size limits
- **Missing:** Real data integration, pagination, empty states

### 4.1 Dashboard Refactoring

#### Step 4.1.1: Split into Modular Components

**Create component structure:**

```
components/dashboard/
├── DashboardLayout.tsx          # Main layout wrapper
├── DashboardStats.tsx            # Stats cards (projects, tasks, etc.)
├── DashboardWeather.tsx          # Weather widget
├── DashboardCalendar.tsx         # Calendar preview
├── DashboardGantt.tsx            # Gantt chart
├── DashboardTeamHeatmap.tsx      # Team activity heatmap
├── DashboardRecentActivity.tsx   # Activity feed
├── DashboardPunchList.tsx        # Critical punch items
├── DashboardNotifications.tsx    # Notification center
├── DashboardStorageMeter.tsx     # Storage usage
└── DashboardQuickActions.tsx     # Quick action buttons
```

**Implementation:**

```typescript
// components/dashboard/DashboardStats.tsx (NEW)

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, CheckCircle2, Clock, DollarSign } from 'lucide-react'

interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  totalQuotes: number
  quotesValue: number
  criticalPunchItems: number
}

export default function DashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) return

    // Load all stats in parallel
    const [projects, tasks, quotes, punchItems] = await Promise.all([
      supabase
        .from('projects')
        .select('id, status', { count: 'exact' })
        .eq('company_id', profile.company_id),

      supabase
        .from('tasks')
        .select('id, status, due_date', { count: 'exact' })
        .eq('company_id', profile.company_id),

      supabase
        .from('quotes')
        .select('id, total', { count: 'exact' })
        .eq('company_id', profile.company_id),

      supabase
        .from('punch_items')
        .select('id', { count: 'exact' })
        .eq('priority', 'critical')
        .eq('status', 'open')
    ])

    // Calculate stats
    const activeProjects = projects.data?.filter(p => p.status === 'active').length ?? 0
    const completedTasks = tasks.data?.filter(t => t.status === 'completed').length ?? 0
    const overdueTasks = tasks.data?.filter(t =>
      t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
    ).length ?? 0
    const quotesValue = quotes.data?.reduce((sum, q) => sum + (q.total ?? 0), 0) ?? 0

    setStats({
      totalProjects: projects.count ?? 0,
      activeProjects,
      totalTasks: tasks.count ?? 0,
      completedTasks,
      overdueTasks,
      totalQuotes: quotes.count ?? 0,
      quotesValue,
      criticalPunchItems: punchItems.count ?? 0
    })

    setLoading(false)
  }

  if (loading) {
    return <StatsLoadingSkeleton />
  }

  if (!stats) {
    return <StatsEmptyState />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Projects Card */}
      <StatCard
        title="Active Projects"
        value={stats.activeProjects}
        total={stats.totalProjects}
        icon={<BarChart3 className="h-5 w-5" />}
        trend={calculateTrend(stats.activeProjects, stats.totalProjects)}
        href="/projects"
      />

      {/* Tasks Card */}
      <StatCard
        title="Tasks Completed"
        value={stats.completedTasks}
        total={stats.totalTasks}
        icon={<CheckCircle2 className="h-5 w-5" />}
        badge={stats.overdueTasks > 0 ? {
          label: `${stats.overdueTasks} overdue`,
          variant: 'destructive'
        } : undefined}
        href="/taskflow"
      />

      {/* Quotes Card */}
      <StatCard
        title="Quote Value"
        value={formatCurrency(stats.quotesValue)}
        subtitle={`${stats.totalQuotes} quotes`}
        icon={<DollarSign className="h-5 w-5" />}
        href="/quotes"
      />

      {/* Punch Items Card */}
      <StatCard
        title="Critical Items"
        value={stats.criticalPunchItems}
        subtitle="Punch list items"
        icon={<Clock className="h-5 w-5" />}
        variant={stats.criticalPunchItems > 0 ? 'warning' : 'success'}
        href="/fieldsnap"
      />
    </div>
  )
}

// Reusable stat card component
interface StatCardProps {
  title: string
  value: string | number
  total?: number
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; isPositive: boolean }
  badge?: { label: string; variant: 'default' | 'destructive' | 'warning' }
  variant?: 'default' | 'success' | 'warning' | 'destructive'
  href?: string
}

function StatCard(props: StatCardProps) {
  // Implementation...
}
```

**Time Estimate:** 12-16 hours (refactoring entire dashboard)
**Priority:** 🔴 CRITICAL - Week 2

---

#### Step 4.1.2: Real-time Updates

```typescript
// components/dashboard/use-realtime-stats.ts (NEW)

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeStats(companyId: string) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Initial load
    loadStats()

    // Subscribe to changes
    const channels: RealtimeChannel[] = []

    // Projects channel
    const projectsChannel = supabase
      .channel('dashboard-projects')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `company_id=eq.${companyId}`
        },
        () => loadStats()
      )
      .subscribe()

    // Tasks channel
    const tasksChannel = supabase
      .channel('dashboard-tasks')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `company_id=eq.${companyId}`
        },
        () => loadStats()
      )
      .subscribe()

    channels.push(projectsChannel, tasksChannel)

    return () => {
      channels.forEach(channel => {
        supabase.removeChannel(channel)
      })
    }
  }, [companyId])

  const loadStats = async () => {
    // Load stats logic from previous example
  }

  return stats
}
```

**Time Estimate:** 4-6 hours
**Priority:** 🟡 HIGH - Week 2

---

#### Step 4.1.3: Empty States & Onboarding

```typescript
// components/dashboard/DashboardEmptyState.tsx (NEW)

'use client'

import Link from 'next/link'
import { Plus, Upload, Users, FileText } from 'lucide-react'

export default function DashboardEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Building2 className="h-12 w-12 text-primary" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Welcome to Sierra Suites!
      </h2>

      <p className="text-gray-600 mb-8 max-w-md">
        Let's get you started with your first project. Choose an action below to begin.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-4xl">
        <QuickStartCard
          icon={<Plus className="h-8 w-8" />}
          title="Create Project"
          description="Start your first construction project"
          href="/projects/new"
          color="blue"
        />

        <QuickStartCard
          icon={<Upload className="h-8 w-8" />}
          title="Upload Photos"
          description="Document your job site"
          href="/fieldsnap/capture"
          color="green"
        />

        <QuickStartCard
          icon={<FileText className="h-8 w-8" />}
          title="Create Quote"
          description="Send a quote to a client"
          href="/quotes/new"
          color="purple"
        />

        <QuickStartCard
          icon={<Users className="h-8 w-8" />}
          title="Invite Team"
          description="Collaborate with your crew"
          href="/teams"
          color="orange"
        />
      </div>

      {/* Tutorial video */}
      <div className="mt-12">
        <button className="text-sm text-primary hover:underline">
          Watch 2-minute tutorial →
        </button>
      </div>
    </div>
  )
}
```

**Time Estimate:** 3-4 hours
**Priority:** 🟡 HIGH - Week 3

---

### 4.2 Dashboard Performance

#### Step 4.2.1: Implement Dashboard Caching

```typescript
// app/api/dashboard/stats/route.ts (NEW)

import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// Cache for 30 seconds
export const revalidate = 30

export async function GET(request: Request) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Fetch all stats in parallel
    const stats = await fetchDashboardStats(profile.company_id)

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    })
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}

async function fetchDashboardStats(companyId: string) {
  // Implementation from DashboardStats component
}
```

**Time Estimate:** 3-4 hours
**Priority:** 🟡 HIGH - Week 3

---

## 🏗️ SECTION 5: PROJECTS MODULE

### Current State
- **Completion:** 90%
- **Enterprise Score:** 85/100
- **Status:** ✅ PRODUCTION READY with minor fixes
- **Issue:** Team members not fetching from database

### 5.1 Projects Enhancements

#### Step 5.1.1: Fix Team Members Fetching

```typescript
// lib/projects/get-project-details.ts (NEW)

import { createClient } from '@/lib/supabase/client'

export async function getProjectDetails(projectId: string) {
  const supabase = createClient()

  // Fetch project with all related data
  const { data: project, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_members (
        id,
        role,
        added_at,
        user_profiles (
          id,
          full_name,
          email,
          avatar_url,
          role
        )
      ),
      project_phases (*),
      project_documents (*),
      project_milestones (*),
      project_expenses (*)
    `)
    .eq('id', projectId)
    .single()

  if (error) throw error

  return {
    ...project,
    teamMembers: project.project_members.map((pm: any) => ({
      id: pm.user_profiles.id,
      name: pm.user_profiles.full_name,
      email: pm.user_profiles.email,
      avatar: pm.user_profiles.avatar_url,
      role: pm.role,
      addedAt: pm.added_at
    })),
    phases: project.project_phases,
    documents: project.project_documents,
    milestones: project.project_milestones,
    expenses: project.project_expenses
  }
}
```

**Update project page:**

```typescript
// app/projects/[id]/page.tsx (UPDATED)

export default async function ProjectDetailPage({ params }: Props) {
  const project = await getProjectDetails(params.id)

  return (
    <div>
      {/* Project Header */}
      <ProjectHeader project={project} />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team ({project.teamMembers.length})</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <ProjectTeamTab project={project} />
        </TabsContent>

        {/* Other tabs... */}
      </Tabs>
    </div>
  )
}
```

**Time Estimate:** 4-6 hours
**Priority:** 🔴 CRITICAL - Week 1

---

#### Step 5.1.2: Project Documents Tab

```typescript
// components/projects/ProjectDocumentsTab.tsx (NEW)

'use client'

import { useState } from 'react'
import { Upload, File, Download, Trash2, Eye } from 'lucide-react'
import { formatFileSize, formatDate } from '@/lib/utils'

interface Document {
  id: string
  name: string
  file_url: string
  file_type: string
  file_size: number
  category: string
  uploaded_at: string
  uploaded_by: {
    name: string
    avatar: string
  }
}

export default function ProjectDocumentsTab({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<string>('all')

  const handleUpload = async (files: FileList) => {
    setUploading(true)

    try {
      for (const file of Array.from(files)) {
        // Upload to Supabase Storage
        const supabase = createClient()
        const filePath = `${projectId}/${Date.now()}-${file.name}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-documents')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        // Create database record
        const { data: { publicUrl } } = supabase.storage
          .from('project-documents')
          .getPublicUrl(filePath)

        await supabase
          .from('project_documents')
          .insert({
            project_id: projectId,
            name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            category: detectCategory(file.name)
          })
      }

      // Reload documents
      await loadDocuments()
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const detectCategory = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (['pdf', 'doc', 'docx'].includes(ext ?? '')) return 'contract'
    if (['dwg', 'dxf', 'rvt'].includes(ext ?? '')) return 'blueprint'
    if (['jpg', 'jpeg', 'png'].includes(ext ?? '')) return 'photo'
    if (['xls', 'xlsx', 'csv'].includes(ext ?? '')) return 'invoice'
    return 'other'
  }

  const categories = [
    { value: 'all', label: 'All Documents', count: documents.length },
    { value: 'blueprint', label: 'Blueprints', count: documents.filter(d => d.category === 'blueprint').length },
    { value: 'contract', label: 'Contracts', count: documents.filter(d => d.category === 'contract').length },
    { value: 'permit', label: 'Permits', count: documents.filter(d => d.category === 'permit').length },
    { value: 'invoice', label: 'Invoices', count: documents.filter(d => d.category === 'invoice').length },
  ]

  const filteredDocuments = filter === 'all'
    ? documents
    : documents.filter(d => d.category === filter)

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-sm text-gray-600 mb-4">
          Drag and drop files here, or click to browse
        </p>
        <input
          type="file"
          multiple
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 cursor-pointer"
        >
          {uploading ? 'Uploading...' : 'Choose Files'}
        </label>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setFilter(cat.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filter === cat.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Documents List */}
      <div className="grid gap-4">
        {filteredDocuments.map(doc => (
          <DocumentCard key={doc.id} document={doc} />
        ))}

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No {filter === 'all' ? '' : filter} documents uploaded yet
          </div>
        )}
      </div>
    </div>
  )
}

function DocumentCard({ document }: { document: Document }) {
  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
      {/* File Icon */}
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <File className="h-6 w-6 text-blue-600" />
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{document.name}</h4>
        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
          <span>{formatFileSize(document.file_size)}</span>
          <span>•</span>
          <span>Uploaded {formatDate(document.uploaded_at)}</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <img src={document.uploaded_by.avatar} className="w-4 h-4 rounded-full" />
            {document.uploaded_by.name}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <Eye className="h-4 w-4" />
        </button>
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <Download className="h-4 w-4" />
        </button>
        <button className="p-2 hover:bg-red-100 text-red-600 rounded-lg">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
```

**Time Estimate:** 8-10 hours
**Priority:** 🟡 HIGH - Week 3

---

#### Step 5.1.3: Project Budget Tab

```typescript
// components/projects/ProjectBudgetTab.tsx (NEW)

'use client'

import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Plus, TrendingUp, TrendingDown } from 'lucide-react'

const COLORS = {
  labor: '#3B82F6',
  materials: '#10B981',
  equipment: '#F59E0B',
  subcontractor: '#8B5CF6',
  permits: '#EF4444',
  overhead: '#6B7280',
  other: '#EC4899'
}

export default function ProjectBudgetTab({ project }: { project: Project }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)

  // Load expenses
  useEffect(() => {
    loadExpenses()
  }, [project.id])

  const loadExpenses = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('project_expenses')
      .select('*')
      .eq('project_id', project.id)
      .order('expense_date', { ascending: false })

    setExpenses(data ?? [])
  }

  // Calculate totals by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    const category = expense.category || 'other'
    acc[category] = (acc[category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: COLORS[name as keyof typeof COLORS]
  }))

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0)
  const budgetRemaining = project.estimated_budget - totalSpent
  const budgetPercentage = (totalSpent / project.estimated_budget) * 100

  const isOverBudget = budgetPercentage > 100
  const isNearBudget = budgetPercentage > 90 && budgetPercentage <= 100

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BudgetCard
          title="Estimated Budget"
          amount={project.estimated_budget}
          currency={project.currency}
          icon={<DollarSign className="h-5 w-5" />}
        />

        <BudgetCard
          title="Total Spent"
          amount={totalSpent}
          currency={project.currency}
          percentage={budgetPercentage}
          variant={isOverBudget ? 'danger' : isNearBudget ? 'warning' : 'default'}
          icon={<TrendingUp className="h-5 w-5" />}
        />

        <BudgetCard
          title="Remaining"
          amount={budgetRemaining}
          currency={project.currency}
          variant={budgetRemaining < 0 ? 'danger' : 'success'}
          icon={<TrendingDown className="h-5 w-5" />}
        />
      </div>

      {/* Budget Progress Bar */}
      <div className="bg-white rounded-lg p-6 border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Budget Usage</span>
          <span className="text-sm font-medium text-gray-900">
            {budgetPercentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isOverBudget
                ? 'bg-red-500'
                : isNearBudget
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
          />
        </div>
        {isOverBudget && (
          <p className="text-sm text-red-600 mt-2">
            ⚠️ Over budget by {formatCurrency(Math.abs(budgetRemaining), project.currency)}
          </p>
        )}
      </div>

      {/* Expense Breakdown Chart */}
      <div className="bg-white rounded-lg p-6 border">
        <h3 className="text-lg font-semibold mb-4">Expense Breakdown</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number, project.currency)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent Expenses</h3>
          <button
            onClick={() => setShowAddExpense(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>

        <div className="divide-y">
          {expenses.map(expense => (
            <ExpenseRow key={expense.id} expense={expense} currency={project.currency} />
          ))}

          {expenses.length === 0 && (
            <div className="p-12 text-center text-gray-500">
              No expenses recorded yet
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <AddExpenseModal
          projectId={project.id}
          currency={project.currency}
          onClose={() => setShowAddExpense(false)}
          onSuccess={() => {
            loadExpenses()
            setShowAddExpense(false)
          }}
        />
      )}
    </div>
  )
}
```

**Time Estimate:** 10-12 hours
**Priority:** 🟡 HIGH - Week 3-4

---

## ✅ SECTION 6: TASKFLOW MODULE

### Current State
- **Completion:** 92%
- **Enterprise Score:** 88/100
- **Status:** ✅ PRODUCTION READY
- **Enhancement:** Add task templates, dependencies visualization

### 6.1 Task Templates

```typescript
// lib/taskflow/task-templates.ts (NEW)

export interface TaskTemplate {
  id: string
  name: string
  description: string
  category: 'residential' | 'commercial' | 'renovation'
  tasks: Array<{
    title: string
    description: string
    trade: string
    phase: string
    estimated_hours: number
    order: number
    depends_on_order?: number[]
  }>
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'residential-new-construction',
    name: 'Residential New Construction',
    description: 'Standard task sequence for new home construction',
    category: 'residential',
    tasks: [
      // Pre-Construction Phase
      {
        title: 'Site Survey & Preparation',
        description: 'Survey property, mark boundaries, identify utilities',
        trade: 'general',
        phase: 'pre-construction',
        estimated_hours: 16,
        order: 1
      },
      {
        title: 'Obtain Building Permits',
        description: 'Submit plans and obtain necessary permits',
        trade: 'general',
        phase: 'pre-construction',
        estimated_hours: 8,
        order: 2,
        depends_on_order: [1]
      },
      {
        title: 'Schedule Inspections',
        description: 'Schedule all required inspections with city',
        trade: 'general',
        phase: 'pre-construction',
        estimated_hours: 4,
        order: 3,
        depends_on_order: [2]
      },

      // Foundation Phase
      {
        title: 'Excavation & Grading',
        description: 'Excavate for foundation, grade site',
        trade: 'concrete',
        phase: 'foundation',
        estimated_hours: 24,
        order: 4,
        depends_on_order: [3]
      },
      {
        title: 'Form & Pour Foundation',
        description: 'Build forms, install rebar, pour concrete',
        trade: 'concrete',
        phase: 'foundation',
        estimated_hours: 40,
        order: 5,
        depends_on_order: [4]
      },
      {
        title: 'Foundation Inspection',
        description: 'Schedule and pass foundation inspection',
        trade: 'general',
        phase: 'foundation',
        estimated_hours: 4,
        order: 6,
        depends_on_order: [5]
      },

      // Framing Phase
      {
        title: 'Frame Walls & Roof',
        description: 'Frame walls, install roof trusses, sheathing',
        trade: 'framing',
        phase: 'framing',
        estimated_hours: 120,
        order: 7,
        depends_on_order: [6]
      },
      {
        title: 'Install Windows & Doors',
        description: 'Install all exterior windows and doors',
        trade: 'framing',
        phase: 'framing',
        estimated_hours: 32,
        order: 8,
        depends_on_order: [7]
      },
      {
        title: 'Rough Framing Inspection',
        description: 'Pass framing inspection',
        trade: 'general',
        phase: 'framing',
        estimated_hours: 4,
        order: 9,
        depends_on_order: [7, 8]
      },

      // MEP Phase
      {
        title: 'Rough Plumbing',
        description: 'Install water supply, drain lines, vents',
        trade: 'plumbing',
        phase: 'mep',
        estimated_hours: 48,
        order: 10,
        depends_on_order: [9]
      },
      {
        title: 'Rough Electrical',
        description: 'Install wiring, outlets, switches, breaker panel',
        trade: 'electrical',
        phase: 'mep',
        estimated_hours: 56,
        order: 11,
        depends_on_order: [9]
      },
      {
        title: 'HVAC Installation',
        description: 'Install ductwork, furnace, AC unit',
        trade: 'hvac',
        phase: 'mep',
        estimated_hours: 40,
        order: 12,
        depends_on_order: [9]
      },
      {
        title: 'MEP Inspections',
        description: 'Pass rough plumbing, electrical, HVAC inspections',
        trade: 'general',
        phase: 'mep',
        estimated_hours: 8,
        order: 13,
        depends_on_order: [10, 11, 12]
      },

      // Continue with Finishing, Closeout phases...
      // Total: 40-50 tasks for complete workflow
    ]
  },

  {
    id: 'kitchen-remodel',
    name: 'Kitchen Remodel',
    description: 'Standard task sequence for kitchen renovation',
    category: 'renovation',
    tasks: [
      // ... 20-30 tasks
    ]
  },

  {
    id: 'commercial-buildout',
    name: 'Commercial Tenant Buildout',
    description: 'Office space build-out',
    category: 'commercial',
    tasks: [
      // ... 30-40 tasks
    ]
  }
]

// Function to create tasks from template
export async function createTasksFromTemplate(
  templateId: string,
  projectId: string,
  startDate: Date
): Promise<void> {
  const template = TASK_TEMPLATES.find(t => t.id === templateId)
  if (!template) throw new Error('Template not found')

  const supabase = createClient()
  const tasksToCreate = []

  // Map dependencies
  const taskIdMap = new Map<number, string>()

  for (const taskTemplate of template.tasks) {
    const taskId = crypto.randomUUID()
    taskIdMap.set(taskTemplate.order, taskId)

    // Calculate dates based on order
    const daysOffset = Math.floor(taskTemplate.estimated_hours / 8)
    const taskStartDate = new Date(startDate)
    taskStartDate.setDate(taskStartDate.getDate() + (taskTemplate.order - 1) * 2)

    const taskDueDate = new Date(taskStartDate)
    taskDueDate.setDate(taskDueDate.getDate() + daysOffset)

    // Map dependencies to actual task IDs
    const dependsOn = taskTemplate.depends_on_order
      ?.map(order => taskIdMap.get(order))
      .filter(Boolean) as string[]

    tasksToCreate.push({
      id: taskId,
      project_id: projectId,
      title: taskTemplate.title,
      description: taskTemplate.description,
      trade: taskTemplate.trade,
      phase: taskTemplate.phase,
      estimated_hours: taskTemplate.estimated_hours,
      start_date: taskStartDate.toISOString().split('T')[0],
      due_date: taskDueDate.toISOString().split('T')[0],
      depends_on: dependsOn,
      status: 'not-started'
    })
  }

  // Batch insert
  const { error } = await supabase
    .from('tasks')
    .insert(tasksToCreate)

  if (error) throw error
}
```

**Time Estimate:** 12-16 hours (creating all templates)
**Priority:** 🟢 MEDIUM - Week 4

---

### 6.2 Gantt Chart Enhancements

```typescript
// components/taskflow/GanttChart.tsx (ENHANCED)

import { useMemo } from 'react'
import { format, differenceInDays, addDays } from 'date-fns'

interface GanttTask {
  id: string
  title: string
  start_date: string
  due_date: string
  progress_percentage: number
  depends_on: string[]
  trade: string
  assignee_name?: string
}

export default function EnhancedGanttChart({ tasks }: { tasks: GanttTask[] }) {
  // Calculate timeline
  const timeline = useMemo(() => {
    if (tasks.length === 0) return { start: new Date(), end: new Date(), days: 0 }

    const dates = tasks.flatMap(t => [
      new Date(t.start_date),
      new Date(t.due_date)
    ])

    const start = new Date(Math.min(...dates.map(d => d.getTime())))
    const end = new Date(Math.max(...dates.map(d => d.getTime())))
    const days = differenceInDays(end, start) + 1

    return { start, end, days }
  }, [tasks])

  // Position tasks on timeline
  const positionedTasks = useMemo(() => {
    return tasks.map(task => {
      const taskStart = new Date(task.start_date)
      const taskEnd = new Date(task.due_date)

      const startOffset = differenceInDays(taskStart, timeline.start)
      const duration = differenceInDays(taskEnd, taskStart) + 1

      const left = (startOffset / timeline.days) * 100
      const width = (duration / timeline.days) * 100

      return {
        ...task,
        left,
        width
      }
    })
  }, [tasks, timeline])

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Timeline Header */}
      <div className="sticky top-0 bg-gray-50 border-b p-4">
        <div className="flex gap-4">
          <div className="w-64 flex-shrink-0 font-medium">Task</div>
          <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${timeline.days}, 1fr)` }}>
            {Array.from({ length: timeline.days }).map((_, i) => {
              const date = addDays(timeline.start, i)
              return (
                <div key={i} className="text-center text-xs text-gray-600 border-l first:border-l-0 px-1">
                  {format(date, 'M/d')}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Task Rows */}
      <div className="divide-y">
        {positionedTasks.map(task => (
          <div key={task.id} className="flex gap-4 p-4 hover:bg-gray-50 relative">
            {/* Task Info */}
            <div className="w-64 flex-shrink-0">
              <div className="font-medium text-sm">{task.title}</div>
              <div className="text-xs text-gray-500 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TRADE_COLORS[task.trade]}`}>
                  {task.trade}
                </span>
                {task.assignee_name && (
                  <span className="ml-2">{task.assignee_name}</span>
                )}
              </div>
            </div>

            {/* Gantt Bar */}
            <div className="flex-1 relative h-8">
              <div
                className="absolute top-1 h-6 rounded bg-blue-500 hover:bg-blue-600 cursor-pointer transition-colors"
                style={{
                  left: `${task.left}%`,
                  width: `${task.width}%`
                }}
              >
                {/* Progress Indicator */}
                <div
                  className="h-full rounded bg-blue-700"
                  style={{ width: `${task.progress_percentage}%` }}
                />

                {/* Task Label */}
                <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium">
                  {task.progress_percentage}%
                </span>
              </div>

              {/* Dependency Lines */}
              {task.depends_on.map(depId => {
                const depTask = positionedTasks.find(t => t.id === depId)
                if (!depTask) return null

                return (
                  <svg
                    key={depId}
                    className="absolute inset-0 pointer-events-none"
                    style={{ overflow: 'visible' }}
                  >
                    <line
                      x1={`${depTask.left + depTask.width}%`}
                      y1="50%"
                      x2={`${task.left}%`}
                      y2="50%"
                      stroke="#9CA3AF"
                      strokeWidth="2"
                      strokeDasharray="4"
                    />
                  </svg>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Time Estimate:** 10-12 hours
**Priority:** 🟢 MEDIUM - Week 4

---

## 📸 SECTION 7: FIELDSNAP MODULE

### Current State
- **Completion:** 75%
- **Enterprise Score:** 68/100
- **Critical Issue:** AI analysis is 100% fake
- **Missing:** Real AI integration, batch upload, photo annotations

### 7.1 AI Integration Decision

**OPTIONS:**

**Option A: Remove AI Claims (RECOMMENDED FOR MVP)**
- Remove "AI Analysis" from UI
- Focus on organization & documentation
- Time: 2-3 hours
- Cost: $0

**Option B: Implement Real AI**
- Integrate OpenAI Vision API or AWS Rekognition
- Build actual issue detection
- Time: 20-30 hours
- Cost: $0.01-0.02 per image

**RECOMMENDATION:** Option A for launch, Option B post-launch

---

#### Step 7.1.1: Remove Fake AI (Option A)

```typescript
// components/fieldsnap/PhotoDetailView.tsx (UPDATED)

export default function PhotoDetailView({ photo }: { photo: MediaAsset }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Photo */}
      <div className="lg:col-span-2">
        <img src={photo.file_url} className="w-full rounded-lg" />
      </div>

      {/* Metadata */}
      <div className="space-y-6">
        {/* Basic Info */}
        <PhotoInfoCard photo={photo} />

        {/* Location */}
        {photo.location_lat && photo.location_lng && (
          <LocationCard lat={photo.location_lat} lng={photo.location_lng} />
        )}

        {/* EXIF Data */}
        {photo.camera_make && (
          <ExifDataCard exif={{
            make: photo.camera_make,
            model: photo.camera_model,
            iso: photo.iso,
            aperture: photo.aperture
          }} />
        )}

        {/* Tags */}
        <TagsCard tags={photo.tags} photoId={photo.id} />

        {/* REMOVE AI ANALYSIS CARD */}
        {/* <AIAnalysisCard analysis={photo.ai_detected_issues} /> */}
      </div>
    </div>
  )
}
```

**Time Estimate:** 2-3 hours
**Priority:** 🔴 CRITICAL - Week 1

---

#### Step 7.1.2: Implement Real AI (Option B - Post-Launch)

```typescript
// lib/fieldsnap/ai-analysis.ts (NEW - Future)

import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function analyzePhoto(imageUrl: string): Promise<AIAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this construction site photo. Identify:
1. Type of work (framing, electrical, plumbing, etc.)
2. Any visible safety hazards
3. Any visible defects or issues
4. Progress/completion indicators
5. Weather conditions if visible

Respond in JSON format with detected_issues array, work_type, safety_score (0-100), and description.`
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      max_tokens: 500
    })

    const content = response.choices[0].message.content
    if (!content) throw new Error('No analysis generated')

    return JSON.parse(content)
  } catch (error) {
    console.error('AI analysis failed:', error)
    return {
      detected_issues: [],
      work_type: 'unknown',
      safety_score: null,
      description: 'Analysis failed'
    }
  }
}

interface AIAnalysisResult {
  detected_issues: Array<{
    type: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    location?: string
  }>
  work_type: string
  safety_score: number | null
  description: string
}

// Cost: $0.01-0.02 per image
```

**Time Estimate:** 20-30 hours (including testing)
**Priority:** 🟢 LOW - Post-launch
**Cost:** $0.01-0.02 per image analyzed

---

### 7.2 Batch Photo Upload

```typescript
// components/fieldsnap/BatchUploadModal.tsx (NEW)

'use client'

import { useState } from 'react'
import { Upload, X, Check, AlertCircle } from 'lucide-react'

interface UploadFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export default function BatchUploadModal({ projectId }: { projectId: string }) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [uploading, setUploading] = useState(false)

  const handleFileSelect = (selectedFiles: FileList) => {
    const newFiles: UploadFile[] = Array.from(selectedFiles).map(file => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0
    }))

    setFiles(prev => [...prev, ...newFiles])
  }

  const uploadAll = async () => {
    setUploading(true)

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue

      await uploadSingleFile(i)
    }

    setUploading(false)
  }

  const uploadSingleFile = async (index: number) => {
    const uploadFile = files[index]

    setFiles(prev => prev.map((f, i) =>
      i === index ? { ...f, status: 'uploading', progress: 0 } : f
    ))

    try {
      const supabase = createClient()

      // Extract EXIF data
      const exifData = await extractEXIF(uploadFile.file)

      // Upload to storage
      const filePath = `${projectId}/${Date.now()}-${uploadFile.file.name}`

      const { error: uploadError } = await supabase.storage
        .from('project-photos')
        .upload(filePath, uploadFile.file, {
          onUploadProgress: (progress) => {
            const percentage = (progress.loaded / progress.total) * 100
            setFiles(prev => prev.map((f, i) =>
              i === index ? { ...f, progress: percentage } : f
            ))
          }
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('project-photos')
        .getPublicUrl(filePath)

      // Create database record
      await supabase.from('media_assets').insert({
        project_id: projectId,
        file_name: uploadFile.file.name,
        file_url: publicUrl,
        file_type: uploadFile.file.type,
        file_size: uploadFile.file.size,
        width: exifData.width,
        height: exifData.height,
        camera_make: exifData.make,
        camera_model: exifData.model,
        location_lat: exifData.gps?.latitude,
        location_lng: exifData.gps?.longitude,
        captured_at: exifData.dateTime
      })

      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: 'success', progress: 100 } : f
      ))
    } catch (error) {
      console.error('Upload failed:', error)
      setFiles(prev => prev.map((f, i) =>
        i === index ? { ...f, status: 'error', error: error.message } : f
      ))
    }
  }

  const successCount = files.filter(f => f.status === 'success').length
  const errorCount = files.filter(f => f.status === 'error').length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Upload Photos</h2>
            <p className="text-sm text-gray-600 mt-1">
              {files.length} photos selected
              {successCount > 0 && ` • ${successCount} uploaded`}
              {errorCount > 0 && ` • ${errorCount} failed`}
            </p>
          </div>
          <button onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* File Drop Zone */}
        {files.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="text-center">
              <Upload className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop photos here or click to browse
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Supports JPG, PNG. Max 10MB per file.
              </p>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg cursor-pointer hover:bg-primary/90"
              >
                Choose Files
              </label>
            </div>
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {files.map((file, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200">
                  <img
                    src={file.preview}
                    className="w-full h-full object-cover"
                  />

                  {/* Status Overlay */}
                  {file.status !== 'pending' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      {file.status === 'uploading' && (
                        <div className="text-center text-white">
                          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-2" />
                          <div className="text-sm font-medium">{Math.round(file.progress)}%</div>
                        </div>
                      )}
                      {file.status === 'success' && (
                        <Check className="h-12 w-12 text-green-400" />
                      )}
                      {file.status === 'error' && (
                        <AlertCircle className="h-12 w-12 text-red-400" />
                      )}
                    </div>
                  )}

                  {/* Remove Button */}
                  {file.status === 'pending' && (
                    <button
                      onClick={() => setFiles(prev => prev.filter((_, i) => i !== index))}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        {files.length > 0 && (
          <div className="p-6 border-t flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {uploading
                ? `Uploading ${successCount + 1} of ${files.length}...`
                : `${files.length} photos ready to upload`
              }
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setFiles([])}
                disabled={uploading}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Clear All
              </button>
              <button
                onClick={uploadAll}
                disabled={uploading || files.every(f => f.status !== 'pending')}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload All'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

**Time Estimate:** 8-10 hours
**Priority:** 🟡 HIGH - Week 3

---

This completes **PART 2** of the Enterprise Implementation Plan.

**Part 2 covers:**
✅ Dashboard Module (complete refactor)
✅ Projects Module (enhancements with all tabs)
✅ TaskFlow Module (templates, Gantt improvements)
✅ FieldSnap Module (AI decision, batch upload)

**Coming in Part 3:**
- QuoteHub Module (PDF/email completion)
- Punch Lists Module (full workflow)
- Teams & RBAC Module (security audit)
- CRM Suite Module (email integration)
- Sustainability Hub Module (real calculations)
- ReportCenter Module (report engine)
- AI Features Module (real integration)
- Integration Layer (14 integrations)
- Testing & QA (comprehensive suite)
- Deployment & Infrastructure

Shall I continue with Part 3?