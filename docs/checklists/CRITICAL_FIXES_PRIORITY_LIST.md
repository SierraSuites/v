# CRITICAL FIXES PRIORITY LIST

**Sierra Suites - Immediate Action Items**
**Target: Production-Ready in 6-8 Weeks**

---

## WEEK 1: FOUNDATION & CRITICAL BUGS (40 hours)

### Day 1-2: Database Consolidation (CRITICAL)
**Priority**: 🔴 BLOCKER
**Assignee**: Senior Developer
**Hours**: 12-16

**Tasks**:
- [ ] Create `database/master-schema.sql` from 30+ scattered SQL files
- [ ] Remove all `FIX_*.sql` files after consolidation
- [ ] Verify all tables have company_id column
- [ ] Ensure all foreign keys are properly defined
- [ ] Add missing indexes on company_id, user_id, created_at columns
- [ ] Test schema in fresh Supabase project

**Validation**:
```sql
-- Run this to verify all tables have company_id
SELECT table_name
FROM information_schema.columns
WHERE column_name = 'company_id'
AND table_schema = 'public';

-- Should return: companies, user_profiles, projects, tasks, quotes,
-- crm_contacts, crm_deals, punch_items, media_assets, etc.
```

**Files to Create/Update**:
- `database/master-schema.sql` (NEW)
- `supabase/migrations/20260121000000_initial_schema.sql` (NEW)

---

### Day 2-3: RLS Policies Implementation (CRITICAL)
**Priority**: 🔴 BLOCKER - Security Vulnerability
**Assignee**: Senior Developer
**Hours**: 12-16

**Tasks**:
- [ ] Enable RLS on ALL tables
- [ ] Implement SELECT policies (company_id check)
- [ ] Implement INSERT policies (company_id validation)
- [ ] Implement UPDATE policies (ownership check)
- [ ] Implement DELETE policies (role-based)
- [ ] Test policies with multiple user accounts
- [ ] Document all policies in schema file

**Critical Tables Requiring RLS**:
```sql
-- MUST HAVE RLS (Security Critical):
✓ user_profiles
✓ projects
✓ tasks
✓ quotes
✓ quote_items
✓ crm_contacts
✓ crm_deals
✓ crm_communications
✓ punch_items
✓ media_assets
✓ project_documents
✓ project_expenses
✓ team_invitations
✓ notifications
```

**Test Script**: Create `database/test-rls-policies.sql`
```sql
-- Test 1: User A cannot see User B's projects
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'user-a-id';

SELECT * FROM projects WHERE company_id = 'company-b-id';
-- Should return 0 rows

ROLLBACK;
```

---

### Day 3-4: Fix Dashboard File Size (CRITICAL)
**Priority**: 🔴 BLOCKER - Build will fail
**Assignee**: Intern 1
**Hours**: 12-16

**Current Issue**: [app/dashboard/page.tsx](app/dashboard/page.tsx) is 31,706 tokens (158KB)

**Solution**: Split into modular components

**New File Structure**:
```
components/dashboard/
├── DashboardStats.tsx           (Stats cards)
├── DashboardWeather.tsx         (Weather widget)
├── DashboardCalendar.tsx        (Calendar view)
├── DashboardGantt.tsx           (Gantt chart)
├── DashboardTeamHeatmap.tsx     (Team activity)
├── DashboardRecentActivity.tsx  (Activity feed)
├── DashboardUpcomingTasks.tsx   (Task list)
├── DashboardProjectHealth.tsx   (Health metrics)
├── DashboardQuickActions.tsx    (Action buttons)
└── DashboardLayout.tsx          (Layout wrapper)
```

**New Dashboard Page** (should be ~100 lines):
```typescript
// app/dashboard/page.tsx
import DashboardStats from '@/components/dashboard/DashboardStats'
import DashboardWeather from '@/components/dashboard/DashboardWeather'
import DashboardCalendar from '@/components/dashboard/DashboardCalendar'
// ... other imports

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DashboardStats />
          <DashboardGantt />
          <DashboardRecentActivity />
        </div>
        <div className="space-y-6">
          <DashboardWeather />
          <DashboardCalendar />
          <DashboardUpcomingTasks />
        </div>
      </div>
    </DashboardLayout>
  )
}
```

**Validation**:
- Main page.tsx should be < 200 lines
- Each component should be < 300 lines
- Total functionality preserved
- Performance improved (code splitting)

---

### Day 4-5: Fix Projects Team Members Bug (HIGH)
**Priority**: 🟠 HIGH - Broken feature
**Assignee**: Intern 1
**Hours**: 8

**Current Issue**: Team members always show as empty array

**Root Cause**: Not querying `project_members` join table

**Fix Location**: [lib/projects.ts](lib/projects.ts) or create new file

**Implementation**:
```typescript
// lib/projects.ts

export async function getProjectWithTeam(projectId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      project_members!inner (
        id,
        role,
        added_at,
        user:user_profiles (
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

  // Transform data
  return {
    ...data,
    team_members: data.project_members.map((pm: any) => ({
      id: pm.user.id,
      name: pm.user.full_name,
      email: pm.user.email,
      avatar_url: pm.user.avatar_url,
      project_role: pm.role,
      system_role: pm.user.role,
      added_at: pm.added_at
    }))
  }
}
```

**Validation**:
- Create test project
- Add 3 team members
- Verify all show up in UI
- Verify avatars, names, roles display correctly

---

### Day 5: Remove Fake AI (HIGH)
**Priority**: 🟠 HIGH - Sets false expectations
**Assignee**: Intern 2
**Hours**: 6-8

**Files to Update**:

1. **[app/fieldsnap/page.tsx](app/fieldsnap/page.tsx)**
   - Remove fake `analyzePhoto()` function
   - Remove hardcoded analysis results
   - Add "AI Analysis Coming Soon" badge
   - Keep photo upload/management functionality

2. **[app/sustainability/page.tsx](app/sustainability/page.tsx)**
   - Remove hardcoded carbon data
   - Replace with "Coming Soon" feature preview
   - Show planned features list

3. **[components/dashboard/AIInsights.tsx](components/dashboard/AIInsights.tsx)** (if exists)
   - Remove or replace with "AI Insights Coming Soon"

**Create Stub Endpoints**:
```typescript
// app/api/ai/analyze-photo/route.ts
export async function POST() {
  return NextResponse.json({
    error: 'AI analysis not yet implemented',
    message: 'This feature will be available soon',
    status: 'coming_soon'
  }, { status: 501 })
}
```

**Validation**:
- No fake data shown anywhere
- Users see honest "Coming Soon" messages
- Photo upload still works (just no AI analysis)

---

## WEEK 2: SECURITY & TYPE SAFETY (40 hours)

### Day 6-7: Type Safety Cleanup (HIGH)
**Priority**: 🟠 HIGH - Code quality
**Assignee**: Intern 1
**Hours**: 12-16

**Tasks**:
- [ ] Find all instances of `as any` type casts
- [ ] Create proper TypeScript interfaces
- [ ] Replace type casts with proper types
- [ ] Fix all TypeScript errors
- [ ] Enable strict mode in tsconfig.json

**Search Command**:
```bash
# Find all type casting violations
grep -r "as any" app/ components/ lib/

# Common files with violations:
# - app/quotes/[id]/page.tsx
# - app/crm/page.tsx
# - components/quotes/*.tsx
```

**Create Type Definitions**: `types/index.ts`
```typescript
// types/index.ts

// User & Auth Types
export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

export interface UserProfile extends User {
  company_id: string
  role: 'owner' | 'admin' | 'project_manager' | 'member' | 'viewer'
  subscription_tier: 'starter' | 'professional' | 'enterprise'
  created_at: string
}

// Project Types
export interface Project {
  id: string
  company_id: string
  user_id: string
  name: string
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
  start_date: string
  target_end_date: string
  actual_end_date?: string
  budget: number
  client_name: string
  address: string
  city: string
  state: string
  zip_code: string
  project_type: 'residential' | 'commercial' | 'industrial' | 'infrastructure'
  created_at: string
  updated_at: string
}

export interface ProjectWithRelations extends Project {
  team_members: TeamMember[]
  phases: ProjectPhase[]
  documents: ProjectDocument[]
  milestones: ProjectMilestone[]
  expenses: ProjectExpense[]
}

export interface TeamMember {
  id: string
  name: string
  email: string
  avatar_url?: string
  project_role: string
  system_role: string
  added_at: string
}

// Task Types
export interface Task {
  id: string
  company_id: string
  project_id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assigned_to?: string
  due_date: string
  estimated_hours?: number
  actual_hours?: number
  created_at: string
}

// Quote Types (from Part 3)
export interface QuoteClient {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
}

export interface QuoteLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  total: number
  category?: string
  notes?: string
}

export interface Quote {
  id: string
  company_id: string
  quote_number: string
  client_id: string
  project_id?: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  valid_until: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  notes?: string
  terms?: string
  created_at: string
  sent_at?: string
}

export interface QuoteWithRelations extends Quote {
  client: QuoteClient
  items: QuoteLineItem[]
  project?: {
    id: string
    name: string
    address: string
  }
}

// CRM Types
export interface CRMContact {
  id: string
  company_id: string
  name: string
  email: string
  phone?: string
  company?: string
  title?: string
  type: 'lead' | 'prospect' | 'client' | 'vendor' | 'partner'
  source?: string
  created_at: string
}

export interface CRMDeal {
  id: string
  company_id: string
  contact_id: string
  title: string
  value: number
  pipeline_stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'
  probability: number
  expected_close_date?: string
  actual_close_date?: string
  lost_reason?: string
  created_at: string
}

// Pagination Types
export interface PaginationParams {
  limit?: number
  cursor?: string
  orderBy?: string
  ascending?: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
  total?: number
}

// API Response Types
export interface APIError {
  error: string
  code?: string
  details?: Record<string, any>
}

export interface APISuccess<T = any> {
  data: T
  message?: string
}
```

**Update tsconfig.json**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true
  }
}
```

---

### Day 7-8: Migrate Deprecated Supabase Clients (HIGH)
**Priority**: 🟠 HIGH - Deprecated package will break
**Assignee**: Intern 2
**Hours**: 8-12

**Files Using Deprecated Client**:
- [app/crm/page.tsx](app/crm/page.tsx)
- [app/reports/page.tsx](app/reports/page.tsx)
- Any file importing `@supabase/auth-helpers-nextjs`

**Search for Deprecated Imports**:
```bash
grep -r "auth-helpers-nextjs" app/ components/ lib/
```

**Old Pattern** (REMOVE):
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'

const supabase = createClientComponentClient()
```

**New Pattern** (USE):
```typescript
// Client components
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

// Server components
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()
```

**Uninstall Old Package**:
```bash
npm uninstall @supabase/auth-helpers-nextjs
```

**Validation**:
- No build errors
- All pages load correctly
- Authentication still works
- Data fetching still works

---

### Day 8-9: API Security Middleware (CRITICAL)
**Priority**: 🔴 CRITICAL - Security vulnerability
**Assignee**: Senior Developer
**Hours**: 12-16

**Create**: `lib/api-middleware.ts` (from Part 3)

**Apply to All API Routes**:

**Example - Before** (INSECURE):
```typescript
// app/api/projects/route.ts
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data } = await supabase.from('projects').select('*')
  return NextResponse.json(data)
}
```

**Example - After** (SECURE):
```typescript
// app/api/projects/route.ts
import { withAuth } from '@/lib/api-middleware'

export async function GET(request: NextRequest) {
  return withAuth(request, async (user) => {
    const supabase = await createClient()

    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', user.companyId) // ✅ Company isolation

    return NextResponse.json(data)
  })
}
```

**Routes to Secure** (Priority Order):
1. ✅ `/api/projects/*` - CRITICAL
2. ✅ `/api/tasks/*` - CRITICAL
3. ✅ `/api/quotes/*` - HIGH
4. ✅ `/api/crm/*` - HIGH
5. ✅ `/api/team/*` - HIGH
6. ✅ `/api/fieldsnap/*` - MEDIUM
7. ✅ `/api/reports/*` - MEDIUM

**Security Checklist for Each Route**:
- [ ] Verify user is authenticated
- [ ] Verify user's company_id matches resource company_id
- [ ] Verify user has permission for action (role check)
- [ ] Return 401 if not authenticated
- [ ] Return 403 if not authorized
- [ ] Never trust client-provided company_id

---

### Day 9-10: Implement Pagination Everywhere (HIGH)
**Priority**: 🟠 HIGH - Will crash with large datasets
**Assignee**: Intern 1
**Hours**: 12-16

**Current Issue**: All list views load ALL records

**Pages Requiring Pagination**:
1. Projects list (`/projects`)
2. Tasks list (`/taskflow`)
3. CRM contacts (`/crm`)
4. CRM deals (`/crm/deals`)
5. Quotes list (`/quotes`)
6. Reports list (`/reports`)
7. Media assets (`/fieldsnap`)
8. Team members (`/teams`)

**Implementation Pattern**:

```typescript
// Example: app/projects/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { paginatedQuery } from '@/lib/pagination'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const loadProjects = async (nextCursor?: string) => {
    setLoading(true)

    const result = await paginatedQuery('projects', {
      limit: 50,
      cursor: nextCursor,
      orderBy: 'created_at'
    })

    if (nextCursor) {
      setProjects(prev => [...prev, ...result.data])
    } else {
      setProjects(result.data)
    }

    setCursor(result.nextCursor)
    setHasMore(result.hasMore)
    setLoading(false)
  }

  useEffect(() => {
    loadProjects()
  }, [])

  return (
    <div>
      <ProjectList projects={projects} />

      {hasMore && (
        <button
          onClick={() => loadProjects(cursor!)}
          disabled={loading}
          className="w-full py-2 border rounded"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
```

**Alternative: Infinite Scroll**:
```typescript
import { useInView } from 'react-intersection-observer'

export default function ProjectsPage() {
  const { ref, inView } = useInView()

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadProjects(cursor!)
    }
  }, [inView])

  return (
    <div>
      <ProjectList projects={projects} />
      {hasMore && <div ref={ref}>Loading...</div>}
    </div>
  )
}
```

**Install Dependency**:
```bash
npm install react-intersection-observer
```

---

## WEEK 3: CORE FEATURES COMPLETION (40 hours)

### Day 11-12: QuoteHub PDF/Email (HIGH)
**Priority**: 🟠 HIGH - Revenue feature
**Assignee**: Senior Developer
**Hours**: 12-16

**Tasks**:
- [ ] Install jsPDF and Resend
- [ ] Implement PDF generation (from Part 3, Section 8.2)
- [ ] Implement email sending (from Part 3, Section 8.3)
- [ ] Create email templates
- [ ] Add "Send Quote" button to UI
- [ ] Test end-to-end flow

**Installation**:
```bash
npm install jspdf jspdf-autotable resend
npm install -D @types/jspdf
```

**Files to Create**:
- `lib/pdf-generator.ts` (from Part 3)
- `lib/email-service.ts` (from Part 3)
- `app/api/quotes/[id]/send-email/route.ts` (from Part 3)

**Test Checklist**:
- [ ] PDF generates with all quote data
- [ ] PDF includes company logo
- [ ] Email sends successfully
- [ ] Email includes PDF attachment
- [ ] Recipient receives email
- [ ] Quote status updates to "sent"
- [ ] Email logged in database

---

### Day 12-13: Projects Document Tab (MEDIUM)
**Priority**: 🟡 MEDIUM - User request
**Assignee**: Intern 2
**Hours**: 12

**Current State**: Documents tab exists but may be incomplete

**Implementation**:

**File**: `components/projects/DocumentsTab.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DocumentsTab({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)

  const loadDocuments = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('project_documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    setDocuments(data || [])
  }

  useEffect(() => {
    loadDocuments()
  }, [projectId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const supabase = createClient()

    try {
      // Upload to storage
      const filePath = `${projectId}/documents/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('project-documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Create database record
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('project_documents').insert({
        project_id: projectId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user!.id
      })

      loadDocuments()
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (document: any) => {
    const supabase = createClient()

    const { data } = await supabase.storage
      .from('project-documents')
      .createSignedUrl(document.file_path, 60)

    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank')
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return

    const supabase = createClient()
    const doc = documents.find(d => d.id === documentId)

    // Delete from storage
    await supabase.storage
      .from('project-documents')
      .remove([doc.file_path])

    // Delete from database
    await supabase
      .from('project_documents')
      .delete()
      .eq('id', documentId)

    loadDocuments()
  }

  return (
    <div className="space-y-4">
      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <input
          type="file"
          onChange={handleUpload}
          disabled={uploading}
          className="block w-full text-sm"
        />
        {uploading && <p className="text-sm text-gray-600 mt-2">Uploading...</p>}
      </div>

      {/* Documents List */}
      <div className="space-y-2">
        {documents.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
        ) : (
          documents.map(doc => (
            <div key={doc.id} className="flex items-center justify-between p-4 border rounded">
              <div className="flex items-center space-x-3">
                <FileIcon type={doc.file_type} />
                <div>
                  <p className="font-medium">{doc.file_name}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleDownload(doc)}
                  className="px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  Download
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function FileIcon({ type }: { type: string }) {
  const icon = type.includes('pdf') ? '📄' :
               type.includes('image') ? '🖼️' :
               type.includes('word') ? '📝' :
               type.includes('excel') ? '📊' : '📎'

  return <span className="text-2xl">{icon}</span>
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
```

**Create Storage Bucket**:
```sql
-- In Supabase Dashboard > Storage
-- Create bucket: project-documents
-- Set to private (not public)
```

**Update RLS for Storage**:
```sql
-- Allow users to upload to their company projects
CREATE POLICY "Users can upload project documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);

-- Allow users to download their company project documents
CREATE POLICY "Users can download project documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  )
);
```

---

### Day 13-14: Projects Budget Tab (MEDIUM)
**Priority**: 🟡 MEDIUM - Financial tracking
**Assignee**: Intern 1
**Hours**: 12

**File**: `components/projects/BudgetTab.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  date: string
  vendor?: string
  receipt_url?: string
}

export default function BudgetTab({ projectId, projectBudget }: { projectId: string; projectBudget: number }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [showAddModal, setShowAddModal] = useState(false)

  const loadExpenses = async () => {
    const supabase = createClient()

    const { data } = await supabase
      .from('project_expenses')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false })

    setExpenses(data || [])
  }

  useEffect(() => {
    loadExpenses()
  }, [projectId])

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const remainingBudget = projectBudget - totalExpenses
  const percentUsed = (totalExpenses / projectBudget) * 100

  // Group by category
  const expensesByCategory = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total Budget</p>
          <p className="text-2xl font-bold">${projectBudget.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 font-medium">Total Expenses</p>
          <p className="text-2xl font-bold">${totalExpenses.toLocaleString()}</p>
          <p className="text-xs text-gray-600">{percentUsed.toFixed(1)}% of budget</p>
        </div>
        <div className={`${remainingBudget >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
          <p className="text-sm font-medium" style={{ color: remainingBudget >= 0 ? '#059669' : '#dc2626' }}>
            Remaining Budget
          </p>
          <p className="text-2xl font-bold">${remainingBudget.toLocaleString()}</p>
        </div>
      </div>

      {/* Budget Progress Bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span>Budget Usage</span>
          <span>{percentUsed.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${
              percentUsed > 100 ? 'bg-red-600' :
              percentUsed > 80 ? 'bg-yellow-600' :
              'bg-green-600'
            }`}
            style={{ width: `${Math.min(percentUsed, 100)}%` }}
          />
        </div>
      </div>

      {/* Expenses by Category */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Expenses by Category</h3>
        <div className="space-y-2">
          {Object.entries(expensesByCategory).map(([category, amount]) => (
            <div key={category} className="flex justify-between items-center">
              <span className="capitalize">{category.replace('_', ' ')}</span>
              <span className="font-medium">${amount.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Expense Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full py-2 bg-blue-600 text-white rounded"
      >
        Add Expense
      </button>

      {/* Expenses Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {expenses.map(expense => (
              <tr key={expense.id}>
                <td className="px-4 py-3">{new Date(expense.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 capitalize">{expense.category.replace('_', ' ')}</td>
                <td className="px-4 py-3">{expense.description}</td>
                <td className="px-4 py-3">{expense.vendor || '-'}</td>
                <td className="px-4 py-3 text-right font-medium">${expense.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <AddExpenseModal
          projectId={projectId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            loadExpenses()
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}

function AddExpenseModal({ projectId, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    category: 'materials',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase.from('project_expenses').insert({
      project_id: projectId,
      category: formData.category,
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date,
      vendor: formData.vendor || null,
      created_by: user!.id
    })

    if (error) {
      alert('Failed to add expense')
    } else {
      onSuccess()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Expense</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="materials">Materials</option>
              <option value="labor">Labor</option>
              <option value="equipment">Equipment</option>
              <option value="permits">Permits & Fees</option>
              <option value="subcontractor">Subcontractor</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Vendor (Optional)</label>
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Add Expense
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

**Add to Schema** (if not exists):
```sql
CREATE TABLE IF NOT EXISTS public.project_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('materials', 'labor', 'equipment', 'permits', 'subcontractor', 'other')),
    description TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    date DATE NOT NULL,
    vendor TEXT,
    receipt_url TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_project_expenses_project ON public.project_expenses(project_id);
CREATE INDEX idx_project_expenses_date ON public.project_expenses(date DESC);
```

---

## WEEK 4: TESTING INFRASTRUCTURE (40 hours)

### Day 15-16: Jest & Testing Setup (HIGH)
**Priority**: 🟠 HIGH - Cannot launch without tests
**Assignee**: Senior Developer
**Hours**: 12-16

**Tasks**:
- [ ] Install Jest, React Testing Library, Playwright
- [ ] Configure jest.config.js
- [ ] Create jest.setup.js with mocks
- [ ] Set up test file structure
- [ ] Write first 10 critical tests
- [ ] Configure GitHub Actions for CI

**Installation**:
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
npm install -D playwright @playwright/test
npm install -D @types/jest
```

**Critical Tests to Write First**:

1. **Authentication Tests**: `__tests__/auth/login.test.tsx`
2. **Project Creation**: `__tests__/projects/create-project.test.ts`
3. **RLS Policies**: `__tests__/database/rls-policies.test.ts`
4. **Pagination**: `__tests__/lib/pagination.test.ts`
5. **Quote Generation**: `__tests__/quotes/create-quote.test.ts`
6. **Permission Checks**: `__tests__/lib/permissions.test.ts`
7. **Task Assignment**: `__tests__/tasks/assign-task.test.ts`
8. **CRM Contact**: `__tests__/crm/create-contact.test.ts`
9. **File Upload**: `__tests__/storage/file-upload.test.ts`
10. **Email Sending**: `__tests__/email/send-email.test.ts`

**Test Coverage Goal**: 70% minimum for MVP

---

### Day 16-17: E2E Critical Flows (HIGH)
**Priority**: 🟠 HIGH - User acceptance testing
**Assignee**: Intern 1
**Hours**: 12-16

**Playwright Tests to Write**:

**File**: `e2e/critical-flows.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Critical User Flows', () => {
  test('complete project workflow', async ({ page }) => {
    // 1. Login
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')

    // 2. Create project
    await page.click('a[href="/projects"]')
    await page.click('button:has-text("New Project")')
    await page.fill('[name="name"]', 'E2E Test Project')
    await page.fill('[name="budget"]', '500000')
    await page.click('button:has-text("Create")')

    // 3. Verify project created
    await expect(page.locator('text=E2E Test Project')).toBeVisible()

    // 4. Add task
    await page.click('text=E2E Test Project')
    await page.click('button:has-text("Add Task")')
    await page.fill('[name="title"]', 'Test Task')
    await page.click('button:has-text("Save")')

    // 5. Verify task appears
    await expect(page.locator('text=Test Task')).toBeVisible()
  })

  test('quote generation and email', async ({ page }) => {
    await page.goto('/login')
    // Login...

    // Create quote
    await page.click('a[href="/quotes"]')
    await page.click('button:has-text("New Quote")')

    // Fill quote form
    await page.selectOption('[name="client_id"]', { index: 1 })
    await page.fill('[name="description"]', 'Test Service')
    await page.fill('[name="quantity"]', '1')
    await page.fill('[name="unit_price"]', '1000')
    await page.click('button:has-text("Add Item")')

    // Generate PDF
    await page.click('button:has-text("Generate PDF")')

    // Verify PDF downloaded
    const download = await page.waitForEvent('download')
    expect(download.suggestedFilename()).toContain('quote')
  })

  test('team member invitation', async ({ page }) => {
    await page.goto('/login')
    // Login as admin...

    await page.click('a[href="/teams"]')
    await page.click('button:has-text("Invite Member")')

    await page.fill('[name="email"]', 'newmember@example.com')
    await page.selectOption('[name="role"]', 'member')
    await page.click('button:has-text("Send Invitation")')

    await expect(page.locator('text=Invitation sent')).toBeVisible()
  })
})
```

---

### Day 17-18: Fix All TypeScript Errors (CRITICAL)
**Priority**: 🔴 CRITICAL - Build will fail
**Assignee**: Intern 2
**Hours**: 12-16

**Process**:

1. **Enable Strict Mode**:
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```

2. **Run Build**:
```bash
npm run build
```

3. **Fix All Errors Systematically**:

**Common Error Patterns**:

**Error**: `Property 'X' does not exist on type 'any'`
**Fix**: Create proper interface
```typescript
// Before
const name = (data as any).name

// After
interface Data {
  name: string
}
const name = (data as Data).name
```

**Error**: `Object is possibly 'null'`
**Fix**: Add null checks
```typescript
// Before
const user = await getUser()
const email = user.email

// After
const user = await getUser()
if (!user) return
const email = user.email
```

**Error**: `Argument of type 'string | undefined' is not assignable`
**Fix**: Add type guards
```typescript
// Before
function greet(name: string) {
  console.log(`Hello ${name}`)
}
greet(user?.name) // Error

// After
function greet(name: string) {
  console.log(`Hello ${name}`)
}
if (user?.name) {
  greet(user.name)
}
```

**Target**: Zero TypeScript errors

---

### Day 18-19: Performance Optimization (MEDIUM)
**Priority**: 🟡 MEDIUM - User experience
**Assignee**: Senior Developer
**Hours**: 12

**Tasks**:
- [ ] Implement code splitting
- [ ] Add loading states
- [ ] Optimize images
- [ ] Enable SWR caching
- [ ] Add database indexes

**Code Splitting**:

```typescript
// app/dashboard/page.tsx
import dynamic from 'next/dynamic'

const DashboardGantt = dynamic(() => import('@/components/dashboard/DashboardGantt'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false
})

const DashboardWeather = dynamic(() => import('@/components/dashboard/DashboardWeather'), {
  loading: () => <p>Loading weather...</p>
})
```

**SWR Caching**:

```bash
npm install swr
```

```typescript
// hooks/useProjects.ts
import useSWR from 'swr'

export function useProjects() {
  const { data, error, mutate } = useSWR('/api/projects', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000 // 1 minute
  })

  return {
    projects: data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  }
}
```

**Database Indexes** (Add to schema):

```sql
-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_projects_company_status ON public.projects(company_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_company_created ON public.projects(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON public.tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON public.tasks(assigned_to, status) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quotes_company_status ON public.quotes(company_id, status);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_company ON public.crm_contacts(company_id, type);
```

---

## WEEK 5: INTEGRATIONS & POLISH (40 hours)

### Day 20-21: Weather API Integration (HIGH)
**Priority**: 🟠 HIGH - Dashboard feature
**Assignee**: Intern 1
**Hours**: 10-12

**Implementation** (from Part 3, Section 15.2):

**File**: `lib/weather-service.ts`

**Add to Dashboard**: `components/dashboard/DashboardWeather.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { getWeatherForLocation } from '@/lib/weather-service'

export default function DashboardWeather() {
  const [weather, setWeather] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get user's location or default project location
    const loadWeather = async () => {
      try {
        // Example: Load weather for current project
        const data = await getWeatherForLocation(40.7128, -74.0060) // NYC
        setWeather(data)
      } catch (error) {
        console.error('Weather error:', error)
      } finally {
        setLoading(false)
      }
    }

    loadWeather()
  }, [])

  if (loading) return <div className="bg-white rounded-lg shadow p-4">Loading weather...</div>

  if (!weather) return null

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold mb-3">Weather</h3>

      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-3xl font-bold">{weather.temperature}°F</p>
          <p className="text-gray-600">{weather.condition}</p>
        </div>
        <div className="text-4xl">
          {getWeatherIcon(weather.condition)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-gray-600">Precipitation</p>
          <p className="font-medium">{weather.precipitation_probability}%</p>
        </div>
        <div>
          <p className="text-gray-600">Wind</p>
          <p className="font-medium">{weather.wind_speed} mph</p>
        </div>
        <div>
          <p className="text-gray-600">Humidity</p>
          <p className="font-medium">{weather.humidity}%</p>
        </div>
      </div>

      {/* 7-Day Forecast */}
      <div className="mt-4 pt-4 border-t">
        <p className="text-sm font-medium mb-2">7-Day Forecast</p>
        <div className="space-y-1">
          {weather.forecast.map((day: any) => (
            <div key={day.date} className="flex justify-between text-xs">
              <span>{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span>{day.temp_high}° / {day.temp_low}°</span>
              <span>{day.precipitation_probability}% 🌧️</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function getWeatherIcon(condition: string): string {
  const icons: Record<string, string> = {
    'Clear': '☀️',
    'Mainly Clear': '🌤️',
    'Partly Cloudy': '⛅',
    'Overcast': '☁️',
    'Foggy': '🌫️',
    'Light Rain': '🌧️',
    'Moderate Rain': '🌧️',
    'Heavy Rain': '⛈️',
    'Light Snow': '🌨️',
    'Moderate Snow': '❄️',
    'Heavy Snow': '❄️',
    'Thunderstorm': '⛈️'
  }
  return icons[condition] || '🌡️'
}
```

---

### Day 21-22: Stripe Payment Integration (HIGH)
**Priority**: 🟠 HIGH - Revenue requirement
**Assignee**: Senior Developer
**Hours**: 16-20

**Implementation** (from Part 3, Section 15.2):

**Installation**:
```bash
npm install stripe @stripe/stripe-js
```

**Files to Create**:
1. `lib/stripe-service.ts` - Stripe server-side logic
2. `app/api/webhooks/stripe/route.ts` - Webhook handler
3. `components/pricing/CheckoutButton.tsx` - Client component

**Environment Variables**:
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

**Update Pricing Page**: `app/pricing/page.tsx`

```typescript
'use client'

import { useState } from 'react'
import { createCheckoutSession } from '@/lib/stripe-service'

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (tier: string) => {
    setLoading(tier)

    try {
      const response = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier })
      })

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      alert('Failed to start checkout')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold text-center mb-12">Choose Your Plan</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Starter */}
        <div className="border rounded-lg p-8">
          <h3 className="text-2xl font-bold mb-2">Starter</h3>
          <p className="text-4xl font-bold mb-4">$49<span className="text-lg">/mo</span></p>
          <ul className="space-y-2 mb-6">
            <li>✓ 5 Projects</li>
            <li>✓ 5GB Storage</li>
            <li>✓ Basic Features</li>
            <li>✓ Email Support</li>
          </ul>
          <button
            onClick={() => handleSubscribe('starter')}
            disabled={loading === 'starter'}
            className="w-full py-2 bg-blue-600 text-white rounded"
          >
            {loading === 'starter' ? 'Processing...' : 'Get Started'}
          </button>
        </div>

        {/* Professional */}
        <div className="border-2 border-blue-600 rounded-lg p-8 relative">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm">
            Most Popular
          </div>
          <h3 className="text-2xl font-bold mb-2">Professional</h3>
          <p className="text-4xl font-bold mb-4">$149<span className="text-lg">/mo</span></p>
          <ul className="space-y-2 mb-6">
            <li>✓ Unlimited Projects</li>
            <li>✓ 50GB Storage</li>
            <li>✓ All Features</li>
            <li>✓ Priority Support</li>
            <li>✓ API Access</li>
          </ul>
          <button
            onClick={() => handleSubscribe('professional')}
            disabled={loading === 'professional'}
            className="w-full py-2 bg-blue-600 text-white rounded"
          >
            {loading === 'professional' ? 'Processing...' : 'Get Started'}
          </button>
        </div>

        {/* Enterprise */}
        <div className="border rounded-lg p-8">
          <h3 className="text-2xl font-bold mb-2">Enterprise</h3>
          <p className="text-4xl font-bold mb-4">$499<span className="text-lg">/mo</span></p>
          <ul className="space-y-2 mb-6">
            <li>✓ Unlimited Everything</li>
            <li>✓ Unlimited Storage</li>
            <li>✓ White Label</li>
            <li>✓ Dedicated Support</li>
            <li>✓ Custom Integrations</li>
          </ul>
          <button
            onClick={() => handleSubscribe('enterprise')}
            disabled={loading === 'enterprise'}
            className="w-full py-2 bg-blue-600 text-white rounded"
          >
            {loading === 'enterprise' ? 'Processing...' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

**Create Checkout API**: `app/api/checkout/create-session/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { createCheckoutSession } from '@/lib/stripe-service'

export async function POST(request: NextRequest) {
  return withAuth(request, async (user) => {
    const { tier } = await request.json()

    const session = await createCheckoutSession(
      user.companyId,
      tier,
      user.email
    )

    return NextResponse.json({ url: session.url })
  })
}
```

**Test Stripe**:
1. Create products in Stripe Dashboard
2. Set up webhook endpoint
3. Test checkout flow with test card: 4242 4242 4242 4242

---

### Day 22-23: Excel Import/Export (MEDIUM)
**Priority**: 🟡 MEDIUM - User convenience
**Assignee**: Intern 2
**Hours**: 10-12

**Add Export Buttons to Lists**:

**Projects Export**: `components/projects/ExportButton.tsx`

```typescript
'use client'

import { exportProjectsToExcel } from '@/lib/excel-integration'

export default function ExportProjectsButton({ projects }: { projects: any[] }) {
  const handleExport = async () => {
    const blob = await exportProjectsToExcel(projects)

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `projects-${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 border rounded flex items-center space-x-2"
    >
      <span>📊</span>
      <span>Export to Excel</span>
    </button>
  )
}
```

**Add to Projects Page**:
```typescript
// app/projects/page.tsx
import ExportProjectsButton from '@/components/projects/ExportButton'

<ExportProjectsButton projects={projects} />
```

**Similarly for**:
- Tasks export
- Contacts export (CRM)
- Quotes export
- Expenses export

---

### Day 23-24: Email Notifications System (MEDIUM)
**Priority**: 🟡 MEDIUM - User engagement
**Assignee**: Intern 1
**Hours**: 10-12

**Create Notification Service**: `lib/notification-service.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendTaskAssignmentEmail(
  taskId: string,
  assignedToUserId: string
) {
  const supabase = await createClient()

  // Get task and user details
  const { data: task } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(name),
      assigned_by:user_profiles!created_by(full_name)
    `)
    .eq('id', taskId)
    .single()

  const { data: user } = await supabase
    .from('user_profiles')
    .select('email, full_name')
    .eq('id', assignedToUserId)
    .single()

  if (!task || !user) return

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: user.email,
    subject: `New Task Assigned: ${task.title}`,
    html: `
      <h2>You've been assigned a new task</h2>
      <p><strong>Task:</strong> ${task.title}</p>
      <p><strong>Project:</strong> ${(task.project as any).name}</p>
      <p><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
      <p><strong>Priority:</strong> ${task.priority}</p>
      <p>${task.description || ''}</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/taskflow/${taskId}">View Task</a>
    `
  })

  // Log notification
  await supabase.from('notifications').insert({
    user_id: assignedToUserId,
    type: 'task_assignment',
    title: 'New Task Assigned',
    message: `You've been assigned: ${task.title}`,
    link: `/taskflow/${taskId}`
  })
}

export async function sendQuoteStatusEmail(
  quoteId: string,
  status: string
) {
  const supabase = await createClient()

  const { data: quote } = await supabase
    .from('quotes')
    .select(`
      *,
      client:crm_contacts(email, name),
      created_by_user:user_profiles!user_id(email, full_name)
    `)
    .eq('id', quoteId)
    .single()

  if (!quote) return

  const statusMessages: Record<string, string> = {
    'accepted': '✅ Your quote has been accepted!',
    'rejected': '❌ Your quote was declined',
    'expired': '⏰ Your quote has expired'
  }

  // Notify quote creator
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: (quote.created_by_user as any).email,
    subject: `Quote ${quote.quote_number} - ${status.toUpperCase()}`,
    html: `
      <h2>${statusMessages[status]}</h2>
      <p><strong>Quote:</strong> #${quote.quote_number}</p>
      <p><strong>Client:</strong> ${(quote.client as any).name}</p>
      <p><strong>Amount:</strong> $${quote.total.toLocaleString()}</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/quotes/${quoteId}">View Quote</a>
    `
  })
}

export async function sendProjectMilestoneEmail(
  milestoneId: string
) {
  // Similar pattern for milestone notifications
}

export async function sendDailyDigestEmail(userId: string) {
  const supabase = await createClient()

  // Get user and their tasks due soon
  const { data: user } = await supabase
    .from('user_profiles')
    .select('email, full_name, company_id')
    .eq('id', userId)
    .single()

  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      *,
      project:projects(name)
    `)
    .eq('assigned_to', userId)
    .eq('status', 'todo')
    .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('due_date')

  if (!user || !tasks || tasks.length === 0) return

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: user.email,
    subject: 'Your Tasks for the Week',
    html: `
      <h2>Hi ${user.full_name},</h2>
      <p>You have ${tasks.length} tasks due this week:</p>
      <ul>
        ${tasks.map(task => `
          <li>
            <strong>${task.title}</strong> - ${(task.project as any).name}
            <br>Due: ${new Date(task.due_date).toLocaleDateString()}
          </li>
        `).join('')}
      </ul>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/taskflow">View All Tasks</a>
    `
  })
}
```

**Schedule Daily Digest**: `app/api/cron/daily-digest/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendDailyDigestEmail } from '@/lib/notification-service'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Get all users who want daily digest
  const { data: users } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email_preferences->daily_digest', true)

  for (const user of users || []) {
    await sendDailyDigestEmail(user.id)
  }

  return NextResponse.json({ success: true, count: users?.length || 0 })
}
```

**Configure Vercel Cron** (in `vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/daily-digest",
      "schedule": "0 8 * * *"
    }
  ]
}
```

---

## WEEK 6: FINAL POLISH & DEPLOYMENT (40 hours)

### Day 25-26: Production Deployment Setup (CRITICAL)
**Priority**: 🔴 CRITICAL - Must have for launch
**Assignee**: Senior Developer
**Hours**: 16-20

**Tasks**:
- [ ] Set up Vercel production project
- [ ] Configure production environment variables
- [ ] Set up production Supabase project
- [ ] Run database migrations on production
- [ ] Configure custom domain
- [ ] Set up SSL certificate
- [ ] Test production deployment

**Deployment Checklist**:

1. **Create Production Supabase Project**:
   - Create new project in Supabase Dashboard
   - Note connection strings
   - Run migrations: `supabase db push`

2. **Vercel Production Setup**:
```bash
# Link to Vercel
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add RESEND_API_KEY production
vercel env add STRIPE_SECRET_KEY production
# ... add all env vars

# Deploy to production
vercel --prod
```

3. **Custom Domain**:
   - Add domain in Vercel dashboard: `app.sierrasuites.com`
   - Update DNS records
   - Verify SSL certificate

4. **Post-Deployment Tests**:
   - [ ] Can login
   - [ ] Can create project
   - [ ] Can create task
   - [ ] Can generate quote PDF
   - [ ] Can send email
   - [ ] Storage upload works
   - [ ] All pages load
   - [ ] No console errors

---

### Day 26-27: Monitoring & Error Tracking (HIGH)
**Priority**: 🟠 HIGH - Production requirement
**Assignee**: Senior Developer
**Hours**: 8-12

**Install Sentry**:
```bash
npx @sentry/wizard@latest -i nextjs
```

**Configure**: `sentry.client.config.ts`

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ]
})
```

**Set up Uptime Monitoring**:
- Create account at UptimeRobot or Better Uptime
- Monitor: `https://app.sierrasuites.com/api/health`
- Alert via email/SMS if down

**Configure Alerts**:
- Sentry: Alert on error rate > 1%
- Supabase: Alert on DB CPU > 80%
- Vercel: Alert on failed deployments

---

### Day 27-28: Documentation Completion (MEDIUM)
**Priority**: 🟡 MEDIUM - Team enablement
**Assignee**: Intern 2
**Hours**: 12-16

**Create**:

1. **README.md** (Root level):
```markdown
# Sierra Suites

Construction management platform for modern builders.

## Quick Start

\`\`\`bash
npm install
npm run dev
\`\`\`

## Documentation

- [Developer Guide](docs/README.md)
- [API Documentation](docs/API.md)
- [User Guide](docs/USER_GUIDE.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## Support

Email: support@sierrasuites.com
```

2. **DEPLOYMENT.md** (`docs/DEPLOYMENT.md`):
   - Complete deployment instructions
   - Environment variable list
   - Troubleshooting guide

3. **CHANGELOG.md**:
   - Version history
   - Feature additions
   - Bug fixes

4. **User Documentation** (Help Center):
   - Getting Started guide
   - Feature tutorials
   - FAQ
   - Troubleshooting

---

### Day 28-29: Security Audit (CRITICAL)
**Priority**: 🔴 CRITICAL - Must do before launch
**Assignee**: Senior Developer
**Hours**: 12-16

**Security Checklist**:

**Authentication & Authorization**:
- [ ] All API routes require authentication
- [ ] Company isolation enforced everywhere
- [ ] Role-based access control implemented
- [ ] No service role key exposed to client
- [ ] Session timeout configured

**Database Security**:
- [ ] RLS enabled on all tables
- [ ] All policies tested
- [ ] No SQL injection vulnerabilities
- [ ] Proper input validation

**Data Protection**:
- [ ] Sensitive data encrypted
- [ ] No secrets in code
- [ ] Environment variables secured
- [ ] HTTPS enforced
- [ ] CORS configured properly

**File Upload Security**:
- [ ] File type validation
- [ ] File size limits
- [ ] Virus scanning (if needed)
- [ ] Secure file storage
- [ ] Access control on files

**API Security**:
- [ ] Rate limiting implemented
- [ ] Request validation
- [ ] Error messages don't leak info
- [ ] CSRF protection
- [ ] XSS prevention

**Third-Party Security**:
- [ ] All dependencies updated
- [ ] No critical vulnerabilities (`npm audit`)
- [ ] Stripe webhook signature verified
- [ ] Email service authenticated

**Run Security Audit**:
```bash
npm audit
npm audit fix

# Check for outdated packages
npm outdated

# Run security scanner
npx snyk test
```

---

### Day 29-30: User Acceptance Testing (HIGH)
**Priority**: 🟠 HIGH - Final validation
**Assignee**: All Team
**Hours**: 16

**UAT Test Cases**:

**Authentication Flow**:
- [ ] User can register
- [ ] User receives verification email
- [ ] User can login
- [ ] User can reset password
- [ ] User can logout

**Projects Module**:
- [ ] Create project
- [ ] Edit project
- [ ] Add team members
- [ ] Upload documents
- [ ] Track expenses
- [ ] View budget status
- [ ] Delete project

**Tasks Module**:
- [ ] Create task
- [ ] Assign task
- [ ] Update task status
- [ ] Set due date
- [ ] Mark complete
- [ ] Filter tasks

**QuoteHub**:
- [ ] Create quote
- [ ] Add line items
- [ ] Calculate totals
- [ ] Generate PDF
- [ ] Send via email
- [ ] Track status

**CRM**:
- [ ] Add contact
- [ ] Import contacts from CSV
- [ ] Create deal
- [ ] Move deal through pipeline
- [ ] Send email from contact
- [ ] Log communication

**FieldSnap**:
- [ ] Upload photo
- [ ] Batch upload
- [ ] View gallery
- [ ] Filter by project
- [ ] Download photo

**Teams**:
- [ ] Invite team member
- [ ] Accept invitation
- [ ] Change role
- [ ] Remove member

**Bug Tracking**:
- Create spreadsheet of all bugs found
- Assign priority
- Fix before launch

---

## POST-LAUNCH WEEK: MONITORING & SUPPORT

### Day 31-35: Launch Week Support
**Priority**: 🔴 CRITICAL - User success
**All Hands On Deck**

**Launch Day Checklist**:
- [ ] All tests passing
- [ ] Production deployment successful
- [ ] Monitoring active
- [ ] Support email set up
- [ ] Announcement sent
- [ ] Team ready for support

**Monitoring Schedule**:
- **Day 1-3**: Monitor every hour
- **Day 4-7**: Monitor every 4 hours
- **Week 2+**: Daily monitoring

**Support Rotation**:
- Senior Dev: Technical issues
- Intern 1: User questions
- Intern 2: Documentation updates

**Metrics to Track**:
- Active users
- Error rate
- Response time
- Feature usage
- Support tickets
- User feedback

---

# COMPLETE 6-WEEK TIMELINE SUMMARY

## Effort Breakdown by Week:

| Week | Focus | Hours | Team |
|------|-------|-------|------|
| Week 1 | Foundation & Critical Bugs | 40 | Senior + Intern 1 |
| Week 2 | Security & Type Safety | 40 | Senior + Intern 2 |
| Week 3 | Core Features Completion | 40 | Senior + Both Interns |
| Week 4 | Testing Infrastructure | 40 | All Team |
| Week 5 | Integrations & Polish | 40 | All Team |
| Week 6 | Final Polish & Deployment | 40 | All Team |
| **TOTAL** | **Complete MVP** | **240 hours** | **3 people** |

## Team Allocation:

**Senior Developer** (You):
- Database & security work
- API development
- Complex integrations
- Deployment setup
- Architecture decisions

**Intern 1** (UI/UX Focus):
- Dashboard refactoring
- Component development
- E2E testing
- Documentation
- User testing

**Intern 2** (Testing/Quality):
- Type safety fixes
- Unit testing
- Bug fixes
- Excel integration
- QA testing

---

# SUCCESS CRITERIA FOR LAUNCH:

✅ **Zero critical bugs**
✅ **All tests passing** (70%+ coverage)
✅ **Security audit passed**
✅ **Performance targets met** (<2s page load)
✅ **Documentation complete**
✅ **Monitoring active**
✅ **Production deployed**
✅ **UAT completed**

---

**This provides a complete, day-by-day roadmap for 6 weeks to production launch!** 🚀