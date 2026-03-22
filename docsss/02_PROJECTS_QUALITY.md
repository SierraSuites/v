# PROJECTS MODULE - QUALITY IMPLEMENTATION GUIDE

**Module**: Project Management (Core Revenue Driver)
**Business Plan Reference**: `BUSINESS_PLAN/02_PROJECTS.md`
**Quality Standard**: 98% Completion Minimum
**Priority**: CRITICAL
**Estimated Development Time**: 6 weeks

---

## EXECUTIVE SUMMARY

Projects is THE CORE MODULE. Everything else supports it. If this doesn't work perfectly, nothing else matters.

**The Reality**: A general contractor managing 8-15 concurrent projects needs:
1. **Instant visibility** - Where is every project right now?
2. **Budget control** - Are we making or losing money? (down to the penny)
3. **Schedule confidence** - Will we finish on time?
4. **Document access** - Every RFI, drawing, contract in one place
5. **Client transparency** - Let clients see progress without constant calls

**Non-Negotiable Standards**:
- Budget tracking accurate to $0.01
- Real-time updates across all devices
- Sub-500ms page loads even with 100+ projects
- Zero data loss (transactions, backups, audit trails)
- Mobile-first (60% of users are in the field)

---

## QUALITY STANDARDS

### Performance Targets

| Metric | Target | Max Acceptable | Fail Threshold |
|--------|--------|----------------|----------------|
| Project List Load | < 800ms | < 1.2s | > 1.5s |
| Project Detail Load | < 600ms | < 1.0s | > 1.2s |
| Budget Calculation | < 50ms | < 100ms | > 200ms |
| Document Upload | < 2s per MB | < 5s per MB | > 10s per MB |
| Gantt Chart Render | < 1.5s | < 2.5s | > 3.0s |
| Search Results | < 200ms | < 500ms | > 1s |
| Real-time Updates | < 1s | < 3s | > 5s |

### Data Accuracy Standards

| Data Point | Accuracy | Validation | Audit Trail |
|------------|----------|------------|-------------|
| Budget Spent | $0.01 | Server-side arithmetic | Required |
| Timeline Dates | Exact day | Date validation | Required |
| Document Versions | 100% tracked | SHA-256 hash | Required |
| Team Assignments | Real-time | RLS enforcement | Required |
| Progress % | User-defined | 0-100 validation | Required |
| Change Orders | Full history | Immutable log | Required |

### Business Logic Standards

```typescript
// Budget Health Calculation (EXACT FORMULA)
const budgetHealth = {
  // Green: Under budget and on track
  excellent: actualSpent <= estimatedBudget * 0.80,

  // Yellow: 80-95% of budget spent
  good: actualSpent > estimatedBudget * 0.80 && actualSpent <= estimatedBudget * 0.95,

  // Orange: 95-100% of budget spent
  warning: actualSpent > estimatedBudget * 0.95 && actualSpent <= estimatedBudget,

  // Red: Over budget
  critical: actualSpent > estimatedBudget
}

// Schedule Status Calculation
const scheduleStatus = {
  // Green: On time or ahead
  onTrack: currentDate <= estimatedEndDate && progress >= expectedProgress,

  // Yellow: Slightly behind but recoverable
  slightlyBehind: daysLate <= 7 && progress >= expectedProgress * 0.9,

  // Orange: Behind schedule
  behind: daysLate > 7 && daysLate <= 30,

  // Red: Critically behind
  critical: daysLate > 30 || progress < expectedProgress * 0.5
}
```

---

## DATABASE SCHEMA

### Core Projects Table

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Basic Information
  name TEXT NOT NULL CHECK (LENGTH(TRIM(name)) >= 3),
  project_number TEXT UNIQUE, -- Auto-generated: PRJ-2026-001
  description TEXT,
  project_type TEXT CHECK (project_type IN ('residential', 'commercial', 'industrial', 'infrastructure')),

  -- Client Information
  client_id UUID REFERENCES contacts(id),
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  client_address TEXT,

  -- Location
  site_address TEXT NOT NULL,
  site_city TEXT,
  site_state TEXT,
  site_zip TEXT,
  site_lat DECIMAL(10, 8),
  site_lng DECIMAL(11, 8),

  -- Timeline
  start_date DATE NOT NULL,
  estimated_end_date DATE NOT NULL,
  actual_end_date DATE,
  duration_days INT GENERATED ALWAYS AS (estimated_end_date - start_date) STORED,

  -- Budget (CRITICAL - Use NUMERIC for exact precision)
  estimated_budget NUMERIC(12, 2) NOT NULL CHECK (estimated_budget >= 0),
  actual_spent NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (actual_spent >= 0),
  committed_costs NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (committed_costs >= 0),
  contingency NUMERIC(12, 2) NOT NULL DEFAULT 0,

  -- Progress
  progress INT NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'planning', 'active', 'on_hold', 'completed', 'archived', 'cancelled')
  ),

  -- Team
  project_manager_id UUID REFERENCES user_profiles(id),
  superintendent_id UUID REFERENCES user_profiles(id),
  estimator_id UUID REFERENCES user_profiles(id),

  -- Settings
  billing_type TEXT CHECK (billing_type IN ('fixed_price', 'time_and_materials', 'cost_plus')),
  contract_value NUMERIC(12, 2),
  retention_percentage NUMERIC(5, 2) DEFAULT 10.00,

  -- Client Portal
  client_portal_enabled BOOLEAN DEFAULT false,
  client_portal_token TEXT UNIQUE,
  client_last_viewed_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[],
  custom_fields JSONB DEFAULT '{}',

  -- Soft Delete & Audit
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id),

  -- Constraints
  CONSTRAINT valid_date_range CHECK (estimated_end_date >= start_date),
  CONSTRAINT valid_budget CHECK (estimated_budget > 0)
);

-- Indexes for Performance
CREATE INDEX idx_projects_company ON projects(company_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_status ON projects(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_client ON projects(client_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_dates ON projects(start_date, estimated_end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_projects_search ON projects USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_projects_location ON projects USING gist(ll_to_earth(site_lat, site_lng)) WHERE site_lat IS NOT NULL;

-- Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's projects"
ON projects FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can insert projects for their company"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update their company's projects"
ON projects FOR UPDATE
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

-- Auto-update timestamp
CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate project number
CREATE OR REPLACE FUNCTION generate_project_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.project_number IS NULL THEN
    NEW.project_number := 'PRJ-' ||
                         TO_CHAR(NOW(), 'YYYY') || '-' ||
                         LPAD(
                           (SELECT COUNT(*) + 1
                            FROM projects
                            WHERE company_id = NEW.company_id
                            AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW()))::TEXT,
                           3,
                           '0'
                         );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_project_number_trigger
BEFORE INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION generate_project_number();
```

### Project Expenses (Budget Tracking)

```sql
CREATE TABLE project_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Expense Details
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Categorization
  category TEXT NOT NULL CHECK (
    category IN ('labor', 'materials', 'equipment', 'subcontractor', 'permits', 'insurance', 'overhead', 'other')
  ),
  cost_code TEXT, -- e.g., "01.1000" for Division 01, General Requirements

  -- Cost Tracking
  unit_cost NUMERIC(12, 2),
  quantity NUMERIC(10, 2),
  unit_type TEXT, -- 'hours', 'units', 'sq_ft', etc.

  -- Vendor/Supplier
  vendor_id UUID REFERENCES contacts(id),
  vendor_name TEXT,
  invoice_number TEXT,
  po_number TEXT,

  -- Documentation
  receipt_url TEXT,
  receipt_file_name TEXT,
  notes TEXT,

  -- Approval Workflow
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('draft', 'pending', 'approved', 'rejected', 'paid')
  ),
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Payment
  paid BOOLEAN DEFAULT false,
  paid_date DATE,
  payment_method TEXT,
  check_number TEXT,

  -- Change Order Link
  change_order_id UUID REFERENCES change_orders(id),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_expenses_project ON project_expenses(project_id, expense_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_category ON project_expenses(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_vendor ON project_expenses(vendor_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_status ON project_expenses(status) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's expenses"
ON project_expenses FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Function to update project actual_spent when expenses change
CREATE OR REPLACE FUNCTION update_project_actual_spent()
RETURNS TRIGGER AS $$
BEGIN
  -- Recalculate total approved expenses for the project
  UPDATE projects
  SET actual_spent = (
    SELECT COALESCE(SUM(amount), 0)
    FROM project_expenses
    WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
      AND status = 'approved'
      AND deleted_at IS NULL
  ),
  updated_at = NOW()
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_budget_on_expense_change
AFTER INSERT OR UPDATE OR DELETE ON project_expenses
FOR EACH ROW
EXECUTE FUNCTION update_project_actual_spent();
```

### Project Documents

```sql
CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- File Information
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'pdf', 'dwg', 'image', etc.
  file_size BIGINT NOT NULL, -- bytes
  file_hash TEXT, -- SHA-256 for deduplication

  -- Organization
  folder_path TEXT DEFAULT '/', -- e.g., '/Plans/Electrical'
  category TEXT CHECK (
    category IN ('contract', 'plan', 'specification', 'rfi', 'submittal', 'photo', 'inspection', 'permit', 'other')
  ),

  -- Versioning
  version INT NOT NULL DEFAULT 1,
  is_latest BOOLEAN DEFAULT true,
  parent_document_id UUID REFERENCES project_documents(id), -- Points to previous version

  -- Metadata
  title TEXT,
  description TEXT,
  tags TEXT[],

  -- OCR & Search
  ocr_text TEXT, -- Extracted text from PDFs/images
  ocr_processed BOOLEAN DEFAULT false,

  -- Access Control
  is_public BOOLEAN DEFAULT false, -- Visible in client portal
  share_token TEXT UNIQUE, -- For external sharing
  share_expires_at TIMESTAMPTZ,

  -- Drawing-specific (for CAD files)
  drawing_number TEXT,
  drawing_revision TEXT,
  drawing_discipline TEXT, -- 'architectural', 'structural', 'mep', etc.

  -- Audit
  uploaded_by UUID REFERENCES user_profiles(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_documents_project ON project_documents(project_id, uploaded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_category ON project_documents(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_folder ON project_documents(folder_path) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_search ON project_documents USING gin(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, '') || ' ' || COALESCE(ocr_text, '')));
CREATE INDEX idx_documents_hash ON project_documents(file_hash) WHERE deleted_at IS NULL; -- Deduplication

-- RLS
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's documents"
ON project_documents FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
  OR (is_public = true AND share_token IS NOT NULL)
);

-- Trigger to mark old versions as not latest
CREATE OR REPLACE FUNCTION update_document_versions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_document_id IS NOT NULL THEN
    UPDATE project_documents
    SET is_latest = false
    WHERE id = NEW.parent_document_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_version_trigger
AFTER INSERT ON project_documents
FOR EACH ROW
WHEN (NEW.parent_document_id IS NOT NULL)
EXECUTE FUNCTION update_document_versions();
```

### Change Orders

```sql
CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Change Order Details
  co_number TEXT NOT NULL, -- Auto-generated: CO-001, CO-002, etc.
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reason TEXT, -- Why the change is needed

  -- Financial Impact
  original_amount NUMERIC(12, 2) NOT NULL,
  change_amount NUMERIC(12, 2) NOT NULL,
  new_amount NUMERIC(12, 2) GENERATED ALWAYS AS (original_amount + change_amount) STORED,

  -- Schedule Impact
  original_end_date DATE,
  days_added INT DEFAULT 0,
  new_end_date DATE,

  -- Approval Workflow
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending_client', 'client_approved', 'client_rejected', 'internal_approved', 'executed', 'cancelled')
  ),

  -- Client Approval
  client_approved_at TIMESTAMPTZ,
  client_approved_by TEXT, -- Client name/email
  client_signature_url TEXT,
  client_rejection_reason TEXT,

  -- Internal Approval
  internal_approved_by UUID REFERENCES user_profiles(id),
  internal_approved_at TIMESTAMPTZ,

  -- Documents
  proposal_document_url TEXT,
  signed_document_url TEXT,

  -- Linked Items
  related_rfi_ids UUID[], -- RFIs that led to this CO

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  CONSTRAINT unique_co_number_per_project UNIQUE (project_id, co_number)
);

-- Indexes
CREATE INDEX idx_change_orders_project ON change_orders(project_id, created_at DESC);
CREATE INDEX idx_change_orders_status ON change_orders(status);

-- RLS
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's change orders"
ON change_orders FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Auto-generate CO number
CREATE OR REPLACE FUNCTION generate_co_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.co_number IS NULL THEN
    NEW.co_number := 'CO-' || LPAD(
      (SELECT COUNT(*) + 1
       FROM change_orders
       WHERE project_id = NEW.project_id)::TEXT,
      3,
      '0'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_co_number_trigger
BEFORE INSERT ON change_orders
FOR EACH ROW
EXECUTE FUNCTION generate_co_number();

-- Update project budget when CO is executed
CREATE OR REPLACE FUNCTION update_project_from_change_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'executed' AND OLD.status != 'executed' THEN
    UPDATE projects
    SET
      estimated_budget = estimated_budget + NEW.change_amount,
      estimated_end_date = COALESCE(NEW.new_end_date, estimated_end_date),
      updated_at = NOW()
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_on_co_execution
AFTER UPDATE ON change_orders
FOR EACH ROW
WHEN (NEW.status = 'executed')
EXECUTE FUNCTION update_project_from_change_order();
```

### RFIs (Requests for Information)

```sql
CREATE TABLE project_rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- RFI Details
  rfi_number TEXT NOT NULL, -- Auto-generated: RFI-001
  subject TEXT NOT NULL,
  question TEXT NOT NULL,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Parties
  requested_by UUID REFERENCES user_profiles(id),
  assigned_to UUID REFERENCES user_profiles(id), -- Usually architect/engineer

  -- Response
  response TEXT,
  responded_by UUID REFERENCES user_profiles(id),
  responded_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('draft', 'open', 'answered', 'closed', 'cancelled')
  ),

  -- Dates
  due_date DATE,
  closed_at TIMESTAMPTZ,

  -- Impact
  potential_cost_impact NUMERIC(12, 2),
  potential_schedule_impact INT, -- days

  -- References
  drawing_references TEXT[], -- Drawing numbers
  spec_references TEXT[], -- Specification sections
  attachment_urls TEXT[],

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_rfi_number_per_project UNIQUE (project_id, rfi_number)
);

-- Indexes
CREATE INDEX idx_rfis_project ON project_rfis(project_id, created_at DESC);
CREATE INDEX idx_rfis_status ON project_rfis(status);
CREATE INDEX idx_rfis_assigned ON project_rfis(assigned_to, status);

-- RLS
ALTER TABLE project_rfis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's RFIs"
ON project_rfis FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM user_profiles WHERE id = auth.uid()
  )
);

-- Auto-generate RFI number
CREATE OR REPLACE FUNCTION generate_rfi_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rfi_number IS NULL THEN
    NEW.rfi_number := 'RFI-' || LPAD(
      (SELECT COUNT(*) + 1
       FROM project_rfis
       WHERE project_id = NEW.project_id)::TEXT,
      3,
      '0'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_rfi_number_trigger
BEFORE INSERT ON project_rfis
FOR EACH ROW
EXECUTE FUNCTION generate_rfi_number();
```

---

## IMPLEMENTATION

### 1. Project List with Advanced Filtering

```typescript
'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Project {
  id: string
  name: string
  project_number: string
  status: string
  progress: number
  estimated_budget: number
  actual_spent: number
  start_date: string
  estimated_end_date: string
  client_name: string
  site_address: string
  project_manager_id: string
  user_profiles?: {
    full_name: string
  }
}

interface Filters {
  status: string[]
  search: string
  dateRange: { start: string; end: string } | null
  budgetHealth: string[]
  projectManager: string[]
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export default function ProjectListPage() {
  const router = useRouter()
  const [filters, setFilters] = useState<Filters>({
    status: ['active', 'planning'],
    search: '',
    dateRange: null,
    budgetHealth: [],
    projectManager: [],
    sortBy: 'updated_at',
    sortOrder: 'desc',
  })

  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid')

  // Fetch projects with filters
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['projects', filters],
    queryFn: async () => {
      const supabase = createClient()

      // Start query
      let query = supabase
        .from('projects')
        .select(`
          *,
          user_profiles!project_manager_id (
            full_name
          )
        `)
        .is('deleted_at', null)

      // Apply status filter
      if (filters.status.length > 0) {
        query = query.in('status', filters.status)
      }

      // Apply search
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,` +
          `project_number.ilike.%${filters.search}%,` +
          `client_name.ilike.%${filters.search}%,` +
          `site_address.ilike.%${filters.search}%`
        )
      }

      // Apply date range
      if (filters.dateRange) {
        query = query
          .gte('start_date', filters.dateRange.start)
          .lte('start_date', filters.dateRange.end)
      }

      // Apply project manager filter
      if (filters.projectManager.length > 0) {
        query = query.in('project_manager_id', filters.projectManager)
      }

      // Apply sorting
      query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })

      const { data, error } = await query

      if (error) throw error
      return data as Project[]
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  // Filter by budget health (client-side since requires calculation)
  const filteredProjects = useMemo(() => {
    if (!projects) return []

    let filtered = [...projects]

    if (filters.budgetHealth.length > 0) {
      filtered = filtered.filter(project => {
        const budgetUsed = (project.actual_spent / project.estimated_budget) * 100

        if (filters.budgetHealth.includes('excellent') && budgetUsed <= 80) return true
        if (filters.budgetHealth.includes('good') && budgetUsed > 80 && budgetUsed <= 95) return true
        if (filters.budgetHealth.includes('warning') && budgetUsed > 95 && budgetUsed <= 100) return true
        if (filters.budgetHealth.includes('critical') && budgetUsed > 100) return true

        return false
      })
    }

    return filtered
  }, [projects, filters.budgetHealth])

  if (isLoading) {
    return <ProjectListSkeleton />
  }

  if (error) {
    return <ProjectListError error={error} />
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            {filteredProjects.length} projects
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/projects/new')}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="text-sm font-medium mb-2 block">Search</label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Status</label>
            <MultiSelect
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'planning', label: 'Planning' },
                { value: 'active', label: 'Active' },
                { value: 'on_hold', label: 'On Hold' },
                { value: 'completed', label: 'Completed' },
                { value: 'archived', label: 'Archived' },
              ]}
              value={filters.status}
              onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
            />
          </div>

          {/* Budget Health Filter */}
          <div>
            <label className="text-sm font-medium mb-2 block">Budget Health</label>
            <MultiSelect
              options={[
                { value: 'excellent', label: '< 80% (Excellent)', color: 'green' },
                { value: 'good', label: '80-95% (Good)', color: 'blue' },
                { value: 'warning', label: '95-100% (Warning)', color: 'yellow' },
                { value: 'critical', label: '> 100% (Over Budget)', color: 'red' },
              ]}
              value={filters.budgetHealth}
              onChange={(value) => setFilters(prev => ({ ...prev, budgetHealth: value }))}
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="text-sm font-medium mb-2 block">Sort By</label>
            <Select
              value={filters.sortBy}
              onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_at">Last Updated</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="start_date">Start Date</SelectItem>
                <SelectItem value="estimated_budget">Budget</SelectItem>
                <SelectItem value="progress">Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters */}
        {(filters.search || filters.budgetHealth.length > 0) && (
          <div className="flex gap-2 mt-4 flex-wrap">
            {filters.search && (
              <Badge variant="secondary">
                Search: {filters.search}
                <button
                  onClick={() => setFilters(prev => ({ ...prev, search: '' }))}
                  className="ml-2"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.budgetHealth.map(health => (
              <Badge key={health} variant="secondary">
                {health}
                <button
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    budgetHealth: prev.budgetHealth.filter(h => h !== health)
                  }))}
                  className="ml-2"
                >
                  ×
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({
                status: ['active', 'planning'],
                search: '',
                dateRange: null,
                budgetHealth: [],
                projectManager: [],
                sortBy: 'updated_at',
                sortOrder: 'desc',
              })}
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex justify-between items-center mb-4">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList>
            <TabsTrigger value="grid">
              <GridIcon className="w-4 h-4 mr-2" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="list">
              <ListIcon className="w-4 h-4 mr-2" />
              List
            </TabsTrigger>
            <TabsTrigger value="map">
              <MapIcon className="w-4 h-4 mr-2" />
              Map
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Project Display */}
      {filteredProjects.length === 0 ? (
        <EmptyState
          icon={<BuildingIcon />}
          title="No projects found"
          description="Try adjusting your filters or create a new project"
          action={
            <Button onClick={() => router.push('/projects/new')}>
              Create Project
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <ProjectListView projects={filteredProjects} />
      ) : (
        <ProjectMapView projects={filteredProjects} />
      )}
    </div>
  )
}

// Project Card Component
function ProjectCard({ project }: { project: Project }) {
  const router = useRouter()

  const budgetUsedPercent = (project.actual_spent / project.estimated_budget) * 100
  const budgetHealth =
    budgetUsedPercent > 100 ? 'critical' :
    budgetUsedPercent > 95 ? 'warning' :
    budgetUsedPercent > 80 ? 'good' : 'excellent'

  const daysRemaining = Math.ceil(
    (new Date(project.estimated_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  )

  const isOverdue = daysRemaining < 0 && project.status === 'active'

  return (
    <Card
      className="hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => router.push(`/projects/${project.id}`)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate group-hover:text-primary transition-colors">
              {project.name}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span>{project.project_number}</span>
              <span>•</span>
              <Badge variant={getStatusVariant(project.status)}>
                {project.status.replace('_', ' ')}
              </Badge>
            </CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVerticalIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}/edit`)}>
                <EditIcon className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => duplicateProject(project.id)}>
                <CopyIcon className="w-4 h-4 mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => archiveProject(project.id)}>
                <ArchiveIcon className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {/* Client & Location */}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <UserIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{project.client_name}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPinIcon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{project.site_address}</span>
          </div>
          {project.user_profiles && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <UserCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">PM: {project.user_profiles.full_name}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Progress</span>
            <span className="text-muted-foreground">{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        {/* Budget Health */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Budget</span>
            <span className={cn(
              "font-semibold",
              budgetHealth === 'critical' && "text-red-600",
              budgetHealth === 'warning' && "text-yellow-600",
              budgetHealth === 'good' && "text-blue-600",
              budgetHealth === 'excellent' && "text-green-600"
            )}>
              {budgetUsedPercent.toFixed(0)}%
            </span>
          </div>
          <Progress
            value={Math.min(budgetUsedPercent, 100)}
            className="h-2"
            indicatorClassName={cn(
              budgetHealth === 'critical' && "bg-red-600",
              budgetHealth === 'warning' && "bg-yellow-600",
              budgetHealth === 'good' && "bg-blue-600",
              budgetHealth === 'excellent' && "bg-green-600"
            )}
          />
          <div className="flex justify-between text-xs mt-1 text-muted-foreground">
            <span>${formatMoney(project.actual_spent)}</span>
            <span>of ${formatMoney(project.estimated_budget)}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex items-center justify-between text-sm pt-3 border-t">
          <div>
            <div className="text-muted-foreground mb-1">Ends in</div>
            <div className={cn(
              "font-semibold",
              isOverdue && "text-red-600"
            )}>
              {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days`}
            </div>
          </div>
          <div className="text-right">
            <div className="text-muted-foreground mb-1">End Date</div>
            <div className="font-semibold">
              {formatDate(project.estimated_end_date)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getStatusVariant(status: string) {
  const variants = {
    draft: 'secondary',
    planning: 'outline',
    active: 'default',
    on_hold: 'warning',
    completed: 'success',
    archived: 'secondary',
    cancelled: 'destructive',
  }
  return variants[status as keyof typeof variants] || 'default'
}
```

### 2. Budget Tracking Component

```typescript
'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface ProjectBudget {
  project_id: string
  estimated_budget: number
  actual_spent: number
  committed_costs: number
  contingency: number

  // By category
  labor_spent: number
  materials_spent: number
  equipment_spent: number
  subcontractor_spent: number
  permits_spent: number
  overhead_spent: number
}

interface Expense {
  id: string
  description: string
  amount: number
  expense_date: string
  category: string
  vendor_name: string
  status: string
  receipt_url?: string
}

export default function ProjectBudgetTracker({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient()
  const [showAddExpense, setShowAddExpense] = useState(false)

  // Fetch budget summary
  const { data: budget, isLoading } = useQuery({
    queryKey: ['project-budget', projectId],
    queryFn: async () => {
      const supabase = createClient()

      // Get project budget
      const { data: project } = await supabase
        .from('projects')
        .select('estimated_budget, actual_spent, committed_costs, contingency')
        .eq('id', projectId)
        .single()

      // Get expenses by category
      const { data: expenses } = await supabase
        .from('project_expenses')
        .select('category, amount')
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .is('deleted_at', null)

      // Calculate category totals
      const categoryTotals = expenses?.reduce((acc, exp) => {
        acc[`${exp.category}_spent`] = (acc[`${exp.category}_spent`] || 0) + parseFloat(exp.amount)
        return acc
      }, {} as Record<string, number>)

      return {
        ...project,
        ...categoryTotals,
        project_id: projectId,
      } as ProjectBudget
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  })

  // Fetch recent expenses
  const { data: expenses } = useQuery({
    queryKey: ['project-expenses', projectId],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('project_expenses')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('expense_date', { ascending: false })
        .limit(20)

      return data as Expense[]
    },
  })

  if (isLoading) {
    return <BudgetTrackerSkeleton />
  }

  if (!budget) {
    return <div>Failed to load budget data</div>
  }

  const budgetUsed = (budget.actual_spent / budget.estimated_budget) * 100
  const remaining = budget.estimated_budget - budget.actual_spent
  const projectedTotal = budget.actual_spent + budget.committed_costs

  const isOverBudget = budgetUsed > 100
  const isWarning = budgetUsed > 85 && budgetUsed <= 100
  const isAtRisk = projectedTotal > budget.estimated_budget

  return (
    <div className="space-y-6">
      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${formatMoney(budget.estimated_budget)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Spent to Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${formatMoney(budget.actual_spent)}
            </div>
            <div className={cn(
              "text-sm font-medium mt-1",
              isOverBudget ? "text-red-600" : isWarning ? "text-yellow-600" : "text-green-600"
            )}>
              {budgetUsed.toFixed(1)}% of budget
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Committed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${formatMoney(budget.committed_costs)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              POs & contracts
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          isOverBudget && "ring-2 ring-red-500",
          isAtRisk && !isOverBudget && "ring-2 ring-yellow-500"
        )}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Remaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              remaining < 0 ? "text-red-600" : "text-green-600"
            )}>
              ${formatMoney(Math.abs(remaining))}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {remaining < 0 ? 'Over budget' : 'Available'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Health Alert */}
      {(isOverBudget || isAtRisk) && (
        <Alert variant={isOverBudget ? "destructive" : "warning"}>
          <AlertTriangleIcon className="w-4 h-4" />
          <AlertTitle>
            {isOverBudget ? 'Project Over Budget' : 'Budget At Risk'}
          </AlertTitle>
          <AlertDescription>
            {isOverBudget ? (
              <>
                This project is ${formatMoney(Math.abs(remaining))} over budget.
                Immediate action required to control costs.
              </>
            ) : (
              <>
                Projected total (${formatMoney(projectedTotal)}) exceeds budget by ${formatMoney(projectedTotal - budget.estimated_budget)}.
                Review committed costs and upcoming expenses.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Budget Bar Chart */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Budget Breakdown</CardTitle>
            <Button size="sm" onClick={() => setShowAddExpense(true)}>
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <BudgetCategoryBar
              label="Labor"
              spent={budget.labor_spent || 0}
              total={budget.estimated_budget * 0.35} // Typical 35% for labor
              color="blue"
            />
            <BudgetCategoryBar
              label="Materials"
              spent={budget.materials_spent || 0}
              total={budget.estimated_budget * 0.40} // Typical 40% for materials
              color="green"
            />
            <BudgetCategoryBar
              label="Subcontractors"
              spent={budget.subcontractor_spent || 0}
              total={budget.estimated_budget * 0.15} // Typical 15% for subs
              color="purple"
            />
            <BudgetCategoryBar
              label="Equipment"
              spent={budget.equipment_spent || 0}
              total={budget.estimated_budget * 0.05} // Typical 5% for equipment
              color="orange"
            />
            <BudgetCategoryBar
              label="Other"
              spent={(budget.permits_spent || 0) + (budget.overhead_spent || 0)}
              total={budget.estimated_budget * 0.05}
              color="gray"
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {expenses?.map(expense => (
              <div
                key={expense.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="font-medium">{expense.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {expense.vendor_name} • {formatDate(expense.expense_date)} • {expense.category}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    ${formatMoney(expense.amount)}
                  </div>
                  <Badge variant={expense.status === 'approved' ? 'success' : 'warning'}>
                    {expense.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      {showAddExpense && (
        <AddExpenseModal
          projectId={projectId}
          onClose={() => setShowAddExpense(false)}
          onSuccess={() => {
            setShowAddExpense(false)
            queryClient.invalidateQueries({ queryKey: ['project-budget', projectId] })
            queryClient.invalidateQueries({ queryKey: ['project-expenses', projectId] })
          }}
        />
      )}
    </div>
  )
}

function BudgetCategoryBar({ label, spent, total, color }: {
  label: string
  spent: number
  total: number
  color: string
}) {
  const percent = (spent / total) * 100
  const isOver = spent > total

  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    purple: 'bg-purple-600',
    orange: 'bg-orange-600',
    gray: 'bg-gray-600',
  }

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium">{label}</span>
        <span className={cn(
          "font-semibold",
          isOver && "text-red-600"
        )}>
          ${formatMoney(spent)} / ${formatMoney(total)}
          {isOver && ` (+${formatMoney(spent - total)})`}
        </span>
      </div>
      <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all",
            isOver ? "bg-red-600" : colorClasses[color as keyof typeof colorClasses]
          )}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
        {isOver && (
          <div
            className="absolute top-0 h-full bg-red-600/30"
            style={{
              left: '100%',
              width: `${((spent - total) / total) * 100}%`
            }}
          />
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        {percent.toFixed(1)}% used
      </div>
    </div>
  )
}
```
## TESTING REQUIREMENTS

### Unit Tests

```typescript
// __tests__/projects/budget-calculations.test.ts
import { describe, it, expect } from 'vitest'
import { calculateBudgetHealth, calculateScheduleStatus } from '@/lib/projects/calculations'

describe('Budget Health Calculations', () => {
  it('should return "excellent" when under 80% budget', () => {
    const result = calculateBudgetHealth(75000, 100000)
    expect(result.status).toBe('excellent')
    expect(result.percentage).toBe(75)
  })

  it('should return "critical" when over budget', () => {
    const result = calculateBudgetHealth(105000, 100000)
    expect(result.status).toBe('critical')
    expect(result.overBudget).toBe(5000)
  })

  it('should handle exact budget match', () => {
    const result = calculateBudgetHealth(100000, 100000)
    expect(result.status).toBe('warning')
    expect(result.percentage).toBe(100)
  })

  it('should handle zero budget (edge case)', () => {
    const result = calculateBudgetHealth(0, 0)
    expect(result.status).toBe('excellent')
  })
})

describe('Schedule Status Calculations', () => {
  it('should calculate days remaining correctly', () => {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 30)

    const result = calculateScheduleStatus(endDate, 50, new Date())
    expect(result.daysRemaining).toBe(30)
    expect(result.isOverdue).toBe(false)
  })

  it('should detect overdue projects', () => {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() - 10)

    const result = calculateScheduleStatus(endDate, 80, new Date())
    expect(result.isOverdue).toBe(true)
    expect(result.daysLate).toBe(10)
  })
})
```

### Integration Tests

```typescript
// __tests__/projects/budget-workflow.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('Budget Workflow Integration', () => {
  let supabase: any
  let testProjectId: string

  beforeEach(async () => {
    supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!)

    // Create test project
    const { data: project } = await supabase
      .from('projects')
      .insert({
        name: 'Test Project',
        estimated_budget: 100000,
        actual_spent: 0,
        client_name: 'Test Client',
        site_address: '123 Test St',
        start_date: '2026-01-01',
        estimated_end_date: '2026-12-31'
      })
      .select()
      .single()

    testProjectId = project.id
  })

  it('should auto-update project.actual_spent when expense is approved', async () => {
    // Add expense
    await supabase.from('project_expenses').insert({
      project_id: testProjectId,
      description: 'Test Expense',
      amount: 5000,
      category: 'materials',
      status: 'approved'
    })

    // Wait for trigger to execute
    await new Promise(resolve => setTimeout(resolve, 100))

    // Check project actual_spent
    const { data: project } = await supabase
      .from('projects')
      .select('actual_spent')
      .eq('id', testProjectId)
      .single()

    expect(project.actual_spent).toBe(5000)
  })

  it('should not count pending expenses in actual_spent', async () => {
    await supabase.from('project_expenses').insert({
      project_id: testProjectId,
      description: 'Pending Expense',
      amount: 3000,
      category: 'labor',
      status: 'pending'
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    const { data: project } = await supabase
      .from('projects')
      .select('actual_spent')
      .eq('id', testProjectId)
      .single()

    expect(project.actual_spent).toBe(0)
  })

  it('should update budget when change order is executed', async () => {
    const { data: co } = await supabase.from('change_orders').insert({
      project_id: testProjectId,
      title: 'Test CO',
      description: 'Test change order',
      original_amount: 100000,
      change_amount: 15000,
      status: 'draft'
    }).select().single()

    // Execute change order
    await supabase.from('change_orders')
      .update({ status: 'executed' })
      .eq('id', co.id)

    await new Promise(resolve => setTimeout(resolve, 100))

    const { data: project } = await supabase
      .from('projects')
      .select('estimated_budget')
      .eq('id', testProjectId)
      .single()

    expect(project.estimated_budget).toBe(115000)
  })
})
```

### Performance Tests

```typescript
// __tests__/projects/performance.test.ts
import { describe, it, expect } from 'vitest'
import { measurePerformance } from '@/lib/testing/performance'

describe('Projects Module Performance', () => {
  it('should load project list in under 800ms', async () => {
    const duration = await measurePerformance(async () => {
      await fetch('/api/projects')
    })

    expect(duration).toBeLessThan(800)
  })

  it('should load project detail page in under 600ms', async () => {
    const duration = await measurePerformance(async () => {
      await fetch('/api/projects/test-id')
    })

    expect(duration).toBeLessThan(600)
  })

  it('should calculate budget health in under 50ms for 1000 expenses', async () => {
    const expenses = Array(1000).fill({
      amount: 100,
      status: 'approved'
    })

    const duration = await measurePerformance(() => {
      const total = expenses.reduce((sum, exp) => sum + exp.amount, 0)
      const health = calculateBudgetHealth(total, 150000)
    })

    expect(duration).toBeLessThan(50)
  })
})
```

---

## PRE-LAUNCH CHECKLIST

### Functional Completeness

- [ ] **CRUD Operations**
  - [ ] Create project with all required fields
  - [ ] Read project with all relationships (PM, client, etc.)
  - [ ] Update project (partial updates, optimistic UI)
  - [ ] Soft delete project (deleted_at, not hard delete)
  - [ ] Restore deleted project

- [ ] **Budget Tracking**
  - [ ] Add expense (all categories: labor, materials, equipment, etc.)
  - [ ] Approve/reject expense
  - [ ] Auto-update project.actual_spent on expense approval
  - [ ] Track committed costs (POs, contracts)
  - [ ] Show budget health indicators (excellent/good/warning/critical)
  - [ ] Alert when budget exceeds thresholds (85%, 95%, 100%)
  - [ ] Calculate projections (actual + committed vs budget)

- [ ] **Change Orders**
  - [ ] Create change order
  - [ ] Auto-generate CO numbers (CO-001, CO-002, etc.)
  - [ ] Client approval workflow (signature, email)
  - [ ] Internal approval workflow
  - [ ] Execute change order → update project budget
  - [ ] Track schedule impact (days added)
  - [ ] Link COs to related RFIs

- [ ] **RFIs**
  - [ ] Create RFI with attachments
  - [ ] Auto-generate RFI numbers
  - [ ] Assign to team member/consultant
  - [ ] Respond to RFI
  - [ ] Track potential cost/schedule impact
  - [ ] Reference drawings/specs
  - [ ] Close RFI

- [ ] **Documents**
  - [ ] Upload documents (drag-drop, multiple files)
  - [ ] Organize into folders
  - [ ] Categorize (contract, plan, RFI, photo, etc.)
  - [ ] Version control (new version → mark old as not latest)
  - [ ] OCR text extraction from PDFs
  - [ ] Full-text search
  - [ ] Share with client portal (public link)
  - [ ] Download/preview documents

- [ ] **Timeline & Schedule**
  - [ ] Set start/end dates
  - [ ] Track progress percentage
  - [ ] Calculate days remaining
  - [ ] Detect overdue projects
  - [ ] Show timeline on project card
  - [ ] Filter by date range

### Performance Verification

```bash
# Run performance tests
npm run test:performance

# Expected results:
# ✓ Project list load < 800ms
# ✓ Project detail load < 600ms
# ✓ Budget calculation < 50ms
# ✓ Document upload < 2s per MB
# ✓ Search results < 200ms
```

### Data Integrity

- [ ] **Financial Precision**
  - [ ] All budget/expense calculations use NUMERIC(12,2)
  - [ ] No floating-point rounding errors ($0.01 accuracy)
  - [ ] Trigger updates actual_spent correctly
  - [ ] Budget health calculation matches spec

- [ ] **Audit Trails**
  - [ ] created_at, updated_at auto-populated
  - [ ] created_by, updated_by track users
  - [ ] Soft delete preserves history
  - [ ] All financial changes logged

- [ ] **Data Validation**
  - [ ] Budget must be > 0
  - [ ] End date >= start date
  - [ ] Progress 0-100%
  - [ ] Status enum enforced
  - [ ] Required fields validated (name, client, address)

### UX Quality

- [ ] **Loading States**
  - [ ] Skeleton loaders on initial load
  - [ ] Spinner during actions (save, delete)
  - [ ] Optimistic updates (immediate UI feedback)
  - [ ] Disable buttons during submission

- [ ] **Empty States**
  - [ ] "No projects found" with illustration
  - [ ] "No expenses yet" with CTA to add first one
  - [ ] "No documents uploaded" with drag-drop area
  - [ ] Helpful messaging (not just blank space)

- [ ] **Error States**
  - [ ] Form validation errors (inline, specific)
  - [ ] API error handling (toast notifications)
  - [ ] Network failures (retry option)
  - [ ] Permission errors (clear messaging)

- [ ] **Success Feedback**
  - [ ] Toast on project created
  - [ ] Toast on expense approved
  - [ ] Toast on document uploaded
  - [ ] Visual confirmation (green checkmark, etc.)

### Mobile Optimization

- [ ] **Responsive Design**
  - [ ] Project cards stack on mobile
  - [ ] Filters collapse into drawer
  - [ ] Touch-friendly buttons (min 44x44px)
  - [ ] Horizontal scroll on tables

- [ ] **Mobile-Specific Features**
  - [ ] Pull-to-refresh on project list
  - [ ] Swipe actions (archive, delete)
  - [ ] Bottom sheet modals (not centered)
  - [ ] Native file picker for uploads

### Security

- [ ] **Row Level Security**
  - [ ] Users can only see their company's projects
  - [ ] Can't read other companies' data (test in SQL)
  - [ ] Can't modify other companies' projects
  - [ ] RLS policies on all tables (projects, expenses, documents, COs, RFIs)

- [ ] **Input Validation**
  - [ ] XSS prevention (sanitize user input)
  - [ ] SQL injection prevention (parameterized queries)
  - [ ] File upload validation (type, size, malware scan)
  - [ ] CSRF protection on state-changing operations

---

## COMMON PITFALLS & SOLUTIONS

### Pitfall 1: Floating-Point Budget Calculations

**Problem**: Using JavaScript `Number` for money leads to rounding errors.

```typescript
// ❌ WRONG - Will cause $0.01 errors
const total = 10.1 + 20.2 // 30.299999999999997
```

**Solution**: Always use NUMERIC in database, format for display only.

```typescript
// ✅ CORRECT
// 1. Store as NUMERIC(12, 2) in database
// 2. Retrieve as string, convert for display
const formatMoney = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// 3. For calculations, do in database with SUM()
const { data } = await supabase
  .rpc('calculate_project_total', { project_id: id })
  // Database function ensures exact arithmetic
```

### Pitfall 2: Race Conditions in Budget Updates

**Problem**: Multiple simultaneous expense approvals don't update actual_spent correctly.

**Solution**: Use database triggers (atomic operations) instead of application-level updates.

```sql
-- ✅ CORRECT - Trigger handles concurrency automatically
CREATE TRIGGER update_project_budget_on_expense_change
AFTER INSERT OR UPDATE OR DELETE ON project_expenses
FOR EACH ROW
EXECUTE FUNCTION update_project_actual_spent();

-- Database guarantees:
-- 1. Atomic execution
-- 2. Isolation from other transactions
-- 3. Consistent results even with concurrent updates
```

### Pitfall 3: Slow Project List with 100+ Projects

**Problem**: Loading all project data at once is slow.

**Solution**: Implement pagination, lazy loading, and indexes.

```typescript
// ✅ CORRECT
const { data, count } = await supabase
  .from('projects')
  .select('*', { count: 'exact' })
  .is('deleted_at', null)
  .order('updated_at', { ascending: false })
  .range(page * 20, (page + 1) * 20 - 1) // Pagination

// Add database indexes (see schema above)
// CREATE INDEX idx_projects_company ON projects(company_id)
// CREATE INDEX idx_projects_status ON projects(status)
```

### Pitfall 4: Document Upload Failures

**Problem**: Large files fail silently, no progress indicator.

**Solution**: Chunked uploads with progress tracking.

```typescript
// ✅ CORRECT
const uploadDocument = async (file: File) => {
  const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks

  const { data, error } = await supabase.storage
    .from('project-documents')
    .upload(`${projectId}/${file.name}`, file, {
      cacheControl: '3600',
      upsert: false,
      onUploadProgress: (progress) => {
        setUploadProgress((progress.loaded / progress.total) * 100)
      }
    })

  if (error) {
    // Show specific error
    toast.error(`Upload failed: ${error.message}`)
    return
  }

  // Create document record
  await supabase.from('project_documents').insert({
    project_id: projectId,
    file_name: file.name,
    file_url: data.path,
    file_size: file.size,
    file_hash: await calculateHash(file) // For deduplication
  })
}
```

### Pitfall 5: Missing Change Order Audit Trail

**Problem**: Can't prove what budget was before change order.

**Solution**: Store original values, never overwrite history.

```typescript
// ✅ CORRECT
interface ChangeOrder {
  original_amount: number // Budget before CO
  change_amount: number // +/- adjustment
  new_amount: number // Calculated: original + change

  original_end_date: Date // Timeline before CO
  days_added: number // Schedule impact
  new_end_date: Date // New deadline
}

// Trigger updates project but CO preserves history
CREATE TRIGGER update_project_on_co_execution
AFTER UPDATE ON change_orders
WHEN (NEW.status = 'executed')
EXECUTE FUNCTION update_project_from_change_order();
```

---

## SUCCESS METRICS

### Engagement Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Daily Active Users** | 70% of team | Track logins, page views |
| **Projects Created/Month** | Matches real job starts | Compare to actual contracts |
| **Expense Entries/Week** | 30+ per project | Track user engagement |
| **Document Uploads/Week** | 50+ per project | Track field worker usage |
| **Budget Accuracy** | Within 2% of actual | Compare to accounting books |

### Performance Metrics

```typescript
// Track these in production
const performanceMetrics = {
  projectListLoad: 'avg < 800ms',
  projectDetailLoad: 'avg < 600ms',
  budgetCalculation: 'avg < 50ms',
  documentUpload: 'avg < 2s per MB',
  searchQuery: 'avg < 200ms',
  realTimeUpdate: 'avg < 1s latency'
}
```

### Business Impact

- **Time Savings**: 2-3 hours/week per PM (no manual budget spreadsheets)
- **Budget Overruns Reduced**: 15-20% fewer projects over budget
- **Change Order Approvals**: 50% faster (digital signatures, no paper)
- **Document Search**: 90% faster (full-text search vs digging through files)
- **Client Satisfaction**: 25% fewer "where are we at?" calls

---

## DEPLOYMENT CHECKLIST

### Pre-Deploy

- [ ] All tests passing (`npm run test`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint warnings (`npm run lint`)
- [ ] Performance tests meet targets
- [ ] Database migrations tested in staging
- [ ] RLS policies verified (can't access other companies' data)

### Deploy Steps

```bash
# 1. Run database migrations
supabase db push

# 2. Verify migrations applied
supabase db remote commit

# 3. Deploy to Vercel
vercel --prod

# 4. Verify deployment
curl https://thesierrasuites.com/api/health
```

### Post-Deploy

- [ ] Smoke test critical paths
  - [ ] Create new project
  - [ ] Add expense
  - [ ] Upload document
  - [ ] Create change order
- [ ] Monitor error rates (< 0.1%)
- [ ] Monitor performance (< targets)
- [ ] Check database CPU/memory usage
- [ ] Verify real-time updates working

### Rollback Plan

If any critical issue:

```bash
# Immediate rollback to previous version
vercel rollback

# Rollback database migration
supabase db reset --db-url $STAGING_URL
supabase db push --db-url $STAGING_URL
```

---

## CONCLUSION

**The Projects module is mission-critical.** If budget tracking is off by even $100, users will lose trust immediately. If documents can't be found, field workers will go back to Dropbox.

**Quality Standards Are Non-Negotiable**:
- $0.01 budget accuracy (use NUMERIC, not floats)
- Sub-500ms loads (indexes, pagination, caching)
- 100% RLS coverage (users can't see other companies' data)
- Real-time updates (under 1s latency)
- Mobile-first (60% of usage is on phones)

**This guide provides everything needed** to build Projects to production quality. Follow it exactly. Test rigorously. Ship confidently.

**Next**: See [03_QUOTEHUB_QUALITY.md](03_QUOTEHUB_QUALITY.md) for quote-to-project workflow implementation.
