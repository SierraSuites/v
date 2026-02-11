# PROJECTS - COMPLETE IMPLEMENTATION PLAN

**Module**: Project Management
**Current Status**: 75% Complete (Actually Works!)
**Target Status**: 98% Complete
**Priority**: CRITICAL (Core Revenue Driver)
**Timeline**: 4 weeks

---

## BUSINESS PURPOSE

Projects is THE core module - everything else supports it. If this doesn't work perfectly, nothing else matters.

**The Reality**: A GC managing 8-15 concurrent projects needs:
1. **Instant visibility** - Where is every project right now?
2. **Budget control** - Are we making or losing money?
3. **Schedule confidence** - Will we finish on time?
4. **Document access** - Every RFI, drawing, contract in one place
5. **Client transparency** - Let clients see progress without constant calls

**User Story**: "I'm bidding 3 new jobs, managing 12 active projects, and closing out 2. I need to know instantly: Which projects need my attention? Where are we hemorrhaging money? What's blocking progress?"

---

## CURRENT STATE ANALYSIS

### What Works ✅ (This is why it's 75% complete)
- **Real database integration** - Actually uses Supabase
- **CRUD operations** - Create, read, update, delete all work
- **Real-time updates** - Subscriptions properly implemented
- **Team assignments** - Can assign users to projects
- **Status management** - Draft → Planning → Active → On Hold → Completed
- **Basic filtering** - Filter by status, search by name
- **Clean UI** - Professional cards with gradients
- **Mobile responsive** - Works on phones
- **Pagination** - Loads 20 at a time
- **Progress tracking** - 0-100% completion

### What's Broken ❌
- **Budget tracking is fake** - `estimated_budget` and `actual_spent` columns exist but no actual tracking
- **No cost/expense logging** - Can't record what you've spent
- **Timeline is incomplete** - No Gantt chart (just says "coming soon")
- **Documents behind paywall** - UI exists but file upload disabled for free tier
- **No OCR** - Can't extract text from plans/documents
- **Weather integration missing** - Claims to show weather alerts but doesn't
- **Client portal broken** - Can create client login but they can't actually access anything
- **No change order tracking** - Construction lives on change orders, we don't track them
- **No punch list integration** - Punch lists exist separately, not connected to projects
- **No daily reports** - Every GC needs daily site reports, we don't have them

### What's Missing Completely ❌
- **Schedule/Timeline Management** - No real Gantt chart or critical path
- **Budget vs Actual Tracking** - No expense logging system
- **Document Management** - No real file organization system
- **Drawing Management** - Can't mark up plans, no version control
- **RFI System** - Request for Information tracking
- **Submittal Management** - Material/product approval workflow
- **Change Order Workflow** - Approval, tracking, invoicing
- **Inspection Scheduling** - Building department coordination
- **Subcontractor Management** - Bids, contracts, insurance tracking
- **Material Tracking** - Orders, deliveries, backorders
- **Quality Control** - Defect tracking, punch lists
- **Daily Site Reports** - Weather, crew, work completed, issues
- **Photo Timeline** - Automated photo organization by project phase
- **Client Portal** - Real client access with permissions
- **Progress Billing** - Invoice based on completion percentage

---

## COMPLETE FEATURE SPECIFICATION

### 1. **Enhanced Project List View** (Priority: HIGH)

**Current**: Basic cards showing name, status, progress
**Needed**: Rich information density

#### Enhanced Card Display:
```
┌────────────────────────────────────────────────────────┐
│ DOWNTOWN OFFICE RENOVATION              [⋮ Menu]      │
│ #PRJ-2024-045 • Active • 65% Complete                  │
├────────────────────────────────────────────────────────┤
│ CLIENT: Acme Corporation                               │
│ 📍 123 Main St, Chicago IL                             │
│ 📅 Jan 15 - Jun 30, 2026 (165 days total)             │
├────────────────────────────────────────────────────────┤
│ HEALTH INDICATORS:                                     │
│ 💰 Budget: $425K / $450K (94%) ✅                      │
│ 📊 Schedule: 3 days behind ⚠️                          │
│ 📸 Photos: 234 (last: 2 hrs ago) ✅                    │
│ ✅ Tasks: 12 active, 3 overdue ⚠️                      │
├────────────────────────────────────────────────────────┤
│ TEAM: 👷 Mike (PM) • 🔨 Sarah • 🔌 John • +4 more     │
│ NEXT: Electrical inspection (Tomorrow 10 AM)           │
└────────────────────────────────────────────────────────┘
```

#### Features:
```typescript
interface ProjectListItem {
  // Basic Info
  id: string
  project_number: string
  name: string
  status: 'draft' | 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  progress_percentage: number

  // Client & Location
  client: {
    id: string
    name: string
    company: string
  }
  address: {
    street: string
    city: string
    state: string
    zip: string
    coordinates?: { lat: number, lng: number }
  }

  // Timeline
  start_date: Date
  end_date: Date
  estimated_duration_days: number
  actual_duration_days?: number
  days_remaining: number
  schedule_variance_days: number // negative = behind

  // Budget
  estimated_budget: number
  actual_spent: number
  budget_remaining: number
  budget_utilization_percentage: number

  // Team
  project_manager: User
  team_members: User[]
  subcontractors: Subcontractor[]

  // Activity Metrics
  photo_count: number
  last_photo_timestamp?: Date
  task_count: number
  overdue_task_count: number
  document_count: number

  // Alerts
  has_critical_issues: boolean
  has_budget_overrun: boolean
  has_schedule_delay: boolean
  weather_alerts: WeatherAlert[]

  // Next Up
  next_milestone?: Milestone
  next_inspection?: Inspection
}
```

#### Implementation Tasks:
- [ ] Create comprehensive project query function
- [ ] Add budget calculation triggers
- [ ] Add schedule variance calculation
- [ ] Display weather for project location
- [ ] Show critical alerts prominently
- [ ] Add quick actions menu (Edit, Archive, Clone, Export)
- [ ] Add bulk actions (Multi-select, bulk status change)

---

### 2. **Project Detail Page - Complete Rebuild** (Priority: CRITICAL)

**Current**: Basic info form
**Needed**: Comprehensive project command center

#### Tab Structure:

**A. OVERVIEW TAB** (Landing page)
```
┌─────────────────────────────────────────────────────┐
│ PROJECT HEALTH DASHBOARD                            │
├─────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐│
│ │ Schedule │ │  Budget  │ │  Safety  │ │ Quality ││
│ │ ⚠️ 3 days│ │ ✅ 94%   │ │ ✅ 0     │ │ ✅ 95%  ││
│ │  behind  │ │  used    │ │ incidents│ │  score  ││
│ └──────────┘ └──────────┘ └──────────┘ └─────────┘│
├─────────────────────────────────────────────────────┤
│ CRITICAL ITEMS REQUIRING ATTENTION:                 │
│ 🚨 Electrical inspection overdue (3 days)          │
│ ⚠️ Change Order #12 pending approval ($8,500)      │
│ ⚠️ 3 RFIs unanswered (avg response time: 4 days)   │
├─────────────────────────────────────────────────────┤
│ QUICK STATS:                                        │
│ • 47 tasks (12 active, 3 overdue, 32 completed)    │
│ • 234 photos (last upload: 2 hours ago)            │
│ • 18 documents (3 pending review)                  │
│ • 5 change orders (2 approved, 2 pending, 1 draft) │
│ • Next milestone: Rough-in Complete (Feb 15)       │
└─────────────────────────────────────────────────────┘
```

Features:
- [ ] Real-time health indicators
- [ ] Critical alerts with one-click actions
- [ ] Activity timeline
- [ ] Recent photos carousel
- [ ] Team member status
- [ ] Weather forecast for site

**B. BUDGET TAB** (NEW - Critical Missing Feature)
```
💰 BUDGET BREAKDOWN

BUDGET SUMMARY:
┌────────────────────────────────────────┐
│ Total Budget:        $450,000          │
│ Actual Spent:        $423,750          │
│ Committed:           $12,000           │
│ Remaining:           $14,250 (3.2%)    │
│ Projected Final:     $452,000 (+0.4%)  │
└────────────────────────────────────────┘

COST BREAKDOWN:
├─ Labor:              $180,000 / $190,000 (95%)
├─ Materials:          $150,000 / $145,000 (96%)
├─ Subcontractors:     $85,000 / $90,000 (94%)
├─ Equipment:          $6,000 / $8,000 (75%)
├─ Permits/Fees:       $2,750 / $3,000 (92%)
└─ Contingency:        $0 / $14,000 (0%) ⚠️ DEPLETED

EXPENSE LOG (Recent):
┌──────────────────────────────────────────────────┐
│ Jan 22 | Home Depot      | Materials | $2,450   │
│ Jan 22 | ABC Electric    | Labor     | $3,200   │
│ Jan 21 | Concrete Co     | Materials | $8,900   │
│ Jan 21 | Johnson Plumb   | Subcon    | $4,500   │
│ Jan 20 | Equipment Rental| Equipment | $890     │
└──────────────────────────────────────────────────┘
[+ Log Expense] [Import from Receipt] [Export CSV]

CHANGE ORDERS:
├─ CO-001: Additional outlet (+$1,200) ✅ Approved
├─ CO-002: Upgraded fixtures (+$3,450) ✅ Approved
├─ CO-003: Structural repair (+$8,500) ⏳ Pending
└─ CO-004: Client request TBD 📝 Draft
```

Database Schema:
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Basic Info
  date DATE NOT NULL,
  vendor VARCHAR(255) NOT NULL,
  category TEXT NOT NULL, -- 'labor', 'materials', 'subcontractor', 'equipment', 'permits', 'other'
  description TEXT,

  -- Amounts
  amount DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL,

  -- Payment
  payment_method TEXT, -- 'cash', 'check', 'card', 'ach', 'wire'
  payment_status TEXT DEFAULT 'unpaid', -- 'unpaid', 'paid', 'pending'
  paid_date DATE,

  -- Documentation
  receipt_url TEXT,
  invoice_number VARCHAR(100),

  -- Accounting
  cost_code VARCHAR(50),
  billable BOOLEAN DEFAULT true,

  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE change_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Identification
  change_order_number VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,

  -- Financial
  original_amount DECIMAL(12, 2),
  revised_amount DECIMAL(12, 2) NOT NULL,
  difference_amount DECIMAL(12, 2) GENERATED ALWAYS AS (revised_amount - COALESCE(original_amount, 0)) STORED,

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'pending', 'approved', 'rejected'
  requested_date DATE,
  approved_date DATE,
  approved_by UUID REFERENCES auth.users(id),

  -- Reason
  reason TEXT, -- 'client_request', 'unforeseen_condition', 'design_change', 'code_requirement', 'other'
  justification TEXT,

  -- Impact
  schedule_impact_days INT DEFAULT 0,

  -- Documentation
  attachments JSONB DEFAULT '[]',

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS estimated_budget DECIMAL(12, 2);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS actual_spent DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS budget_locked BOOLEAN DEFAULT false;

-- Function to calculate actual spent
CREATE OR REPLACE FUNCTION update_project_actual_spent()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET actual_spent = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM expenses
    WHERE project_id = NEW.project_id
    AND payment_status = 'paid'
  )
  WHERE id = NEW.project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER expense_update_project_spent
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_project_actual_spent();
```

Implementation Tasks:
- [ ] Create expenses table and functions
- [ ] Create change orders table
- [ ] Build expense logging UI
- [ ] Add receipt photo upload/OCR
- [ ] Build budget breakdown charts
- [ ] Add cost code system
- [ ] Create change order workflow
- [ ] Add budget forecasting
- [ ] Export to QuickBooks/Xero

**C. SCHEDULE TAB** (NEW - Critical Missing Feature)
```
📅 PROJECT TIMELINE

GANTT CHART VIEW:
┌────────────────────────────────────────────────────────────┐
│          Jan 15   Jan 22   Jan 29   Feb 5    Feb 12   ... │
├────────────────────────────────────────────────────────────┤
│ Site Prep    ████████░                                     │
│ Foundation   ░░░░░░░█████████░                             │
│ Framing      ░░░░░░░░░░░░░░░░████████████░                 │
│ Rough-in     ░░░░░░░░░░░░░░░░░░░░░░░░░░░████████░         │
│ ...                                                        │
└────────────────────────────────────────────────────────────┘
⚠️ Critical Path: Foundation → Framing → Rough-in
🔴 Behind Schedule: Framing (3 days)

MILESTONES:
┌─────────────────────────────────────────────────┐
│ ✅ Permits Approved         Jan 10   COMPLETE  │
│ ✅ Site Cleared             Jan 18   COMPLETE  │
│ 🟡 Foundation Complete      Jan 25   2 days late│
│ ⚪ Framing Complete          Feb 8    UPCOMING  │
│ ⚪ Rough-in Complete         Feb 15   UPCOMING  │
│ ⚪ Inspections Complete      Mar 1    UPCOMING  │
│ ⚪ Final Walkthrough         Jun 25   UPCOMING  │
└─────────────────────────────────────────────────┘

UPCOMING (Next 7 Days):
┌─────────────────────────────────────────────────┐
│ Jan 23 | Foundation inspection | 10:00 AM       │
│ Jan 24 | Concrete delivery     | 7:00 AM        │
│ Jan 25 | Foundation pour       | 8:00 AM ⚠️ Rain│
│ Jan 26 | Framing crew starts   | 7:00 AM        │
└─────────────────────────────────────────────────┘
```

Database Schema:
```sql
CREATE TABLE project_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),

  -- Phase Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sequence_order INT NOT NULL,

  -- Schedule
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  duration_days INT,

  -- Dependencies
  depends_on UUID[] DEFAULT '{}', -- Array of phase IDs
  is_critical_path BOOLEAN DEFAULT false,

  -- Progress
  progress_percentage INT DEFAULT 0,
  status TEXT DEFAULT 'not-started', -- 'not-started', 'in-progress', 'completed', 'on-hold'

  -- Resources
  assigned_team JSONB DEFAULT '[]',
  estimated_labor_hours DECIMAL(8, 2),
  actual_labor_hours DECIMAL(8, 2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  phase_id UUID REFERENCES project_phases(id),

  -- Milestone Info
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Schedule
  target_date DATE NOT NULL,
  actual_date DATE,
  is_complete BOOLEAN DEFAULT false,

  -- Importance
  is_critical BOOLEAN DEFAULT false,
  milestone_type TEXT, -- 'inspection', 'delivery', 'payment', 'client_approval', 'other'

  -- Notifications
  notify_days_before INT DEFAULT 3,
  notification_sent BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  milestone_id UUID REFERENCES milestones(id),

  -- Inspection Details
  inspection_type TEXT NOT NULL, -- 'foundation', 'framing', 'electrical', 'plumbing', 'hvac', 'final', 'other'
  inspector_name VARCHAR(255),
  inspector_phone VARCHAR(20),
  inspector_agency VARCHAR(255),

  -- Schedule
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  actual_date DATE,

  -- Results
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'passed', 'failed', 'conditional', 'cancelled'
  result_notes TEXT,
  conditions TEXT[], -- Array of conditions to address

  -- Documentation
  report_url TEXT,
  photos JSONB DEFAULT '[]',

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Implementation Tasks:
- [ ] Create phases, milestones, inspections tables
- [ ] Build interactive Gantt chart component
- [ ] Implement critical path calculation
- [ ] Add drag-to-reschedule functionality
- [ ] Build inspection scheduling UI
- [ ] Add calendar integration
- [ ] Implement schedule variance tracking
- [ ] Add weather integration for outdoor tasks
- [ ] Create milestone notification system

**D. TASKS TAB**
```
✅ PROJECT TASKS (47 total)

FILTERS: [All] [My Tasks] [Overdue] [Today] [This Week]
SORT BY: [Priority ↓] Status | Due Date | Assignee

OVERDUE (3):
┌────────────────────────────────────────────────────┐
│ 🔥 Schedule electrical inspection                  │
│ 🔌 Electrical rough-in • Due: Jan 19              │
│ Assigned to: Mike Johnson                         │
│ 3 DAYS OVERDUE                                    │
└────────────────────────────────────────────────────┘

TODAY (5):
┌────────────────────────────────────────────────────┐
│ ⚠️ Order materials for next phase                  │
│ 🔨 Framing • Due: Today                            │
│ Assigned to: Sarah Wilson                         │
└────────────────────────────────────────────────────┘

THIS WEEK (12):
...

COMPLETED (27):
...
```

Features:
- [ ] Embedded TaskFlow filtered to current project
- [ ] Quick task creation
- [ ] Bulk task assignment
- [ ] Template tasks for common project types
- [ ] Task dependencies
- [ ] Integrate with phases

**E. PHOTOS TAB**
```
📸 PROJECT PHOTOS (234 total)

ORGANIZE BY: [Date ↓] Upload Date | Location | Phase | Tag

PHOTO TIMELINE:
┌────────────────────────────────────────────────────┐
│ Jan 22, 2026 (12 photos)                          │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                       │
│ │img1│ │img2│ │img3│ │img4│ ...                   │
│ └────┘ └────┘ └────┘ └────┘                       │
│ Foundation work progress                          │
├────────────────────────────────────────────────────┤
│ Jan 21, 2026 (18 photos)                          │
│ ...                                               │
└────────────────────────────────────────────────────┘

PHOTO ORGANIZATION:
├─ By Phase:
│  ├─ Site Prep (45 photos)
│  ├─ Foundation (67 photos)
│  ├─ Framing (89 photos)
│  └─ Rough-in (33 photos)
├─ By Location:
│  ├─ Exterior (102 photos)
│  ├─ Floor 1 (78 photos)
│  └─ Floor 2 (54 photos)
└─ By Tag:
   ├─ #before (12 photos)
   ├─ #progress (189 photos)
   ├─ #issue (8 photos)
   └─ #completed (25 photos)
```

Features:
- [ ] Embedded FieldSnap filtered to project
- [ ] Auto-organize by phase
- [ ] Before/during/after comparisons
- [ ] AI-generated photo descriptions
- [ ] GPS tagging for multi-building projects
- [ ] Time-lapse generation

**F. DOCUMENTS TAB** (NEW - Critical Missing Feature)
```
📄 PROJECT DOCUMENTS (18 total)

FOLDERS:
├─ 📁 Contracts (3)
│  ├─ Master Agreement.pdf
│  ├─ Subcontractor - Electrical.pdf
│  └─ Subcontractor - Plumbing.pdf
├─ 📁 Drawings (7)
│  ├─ Architectural Plans v3.pdf
│  ├─ Structural Drawings v2.pdf
│  ├─ Electrical Plans v1.pdf
│  └─ ...
├─ 📁 Permits (2)
│  ├─ Building Permit.pdf
│  └─ Electrical Permit.pdf
├─ 📁 Submittals (4)
│  ├─ Concrete Mix Design (Approved)
│  ├─ Window Specs (Pending Review)
│  └─ ...
├─ 📁 RFIs (2)
│  ├─ RFI-001: Foundation detail clarification
│  └─ RFI-002: Electrical panel location
└─ 📁 Change Orders (5)
   └─ ...

[+ Upload Document] [Create Folder] [Request Document]
```

Database Schema:
```sql
CREATE TABLE project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- File Info
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size_bytes BIGINT,
  file_url TEXT NOT NULL,

  -- Organization
  folder VARCHAR(255) DEFAULT 'General',
  category TEXT, -- 'contract', 'drawing', 'permit', 'submittal', 'rfi', 'change_order', 'photo', 'other'

  -- Version Control
  version VARCHAR(20) DEFAULT '1.0',
  supersedes UUID REFERENCES project_documents(id),
  is_latest_version BOOLEAN DEFAULT true,

  -- Metadata
  title VARCHAR(255),
  description TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Review/Approval
  status TEXT DEFAULT 'active', -- 'active', 'under_review', 'approved', 'superseded', 'archived'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,

  -- Permissions
  is_public BOOLEAN DEFAULT false, -- Client-visible
  access_level TEXT DEFAULT 'team', -- 'team', 'client', 'public'

  -- OCR/Search
  extracted_text TEXT, -- For searchability

  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- RFI Details
  rfi_number VARCHAR(50) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  question TEXT NOT NULL,

  -- Routing
  addressed_to VARCHAR(255), -- Architect, Engineer, Owner, etc.
  sent_to_email VARCHAR(255),

  -- Status
  status TEXT DEFAULT 'open', -- 'open', 'answered', 'closed'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

  -- Response
  response TEXT,
  response_date DATE,
  response_by UUID REFERENCES auth.users(id),

  -- Impact
  affects_schedule BOOLEAN DEFAULT false,
  affects_budget BOOLEAN DEFAULT false,
  schedule_impact_days INT DEFAULT 0,
  budget_impact_amount DECIMAL(12, 2) DEFAULT 0,

  -- Documentation
  attachments JSONB DEFAULT '[]',

  -- Dates
  date_sent DATE,
  date_required DATE,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE submittals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Submittal Info
  submittal_number VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  spec_section VARCHAR(50), -- CSI Division/Section

  -- Routing
  submitted_by VARCHAR(255), -- Subcontractor/Vendor
  submitted_to VARCHAR(255), -- Architect/Engineer

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'approved_as_noted', 'rejected', 'revise_resubmit'
  priority TEXT DEFAULT 'normal',

  -- Review
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Dates
  date_submitted DATE,
  date_required DATE,
  date_approved DATE,
  lead_time_days INT,

  -- Documentation
  attachments JSONB DEFAULT '[]',

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

Implementation Tasks:
- [ ] Create document storage system (Supabase Storage buckets per project)
- [ ] Build folder/organization UI
- [ ] Implement version control
- [ ] Add OCR for searchable PDFs
- [ ] Create RFI workflow
- [ ] Build submittal tracking
- [ ] Add drawing markup tools
- [ ] Implement document approval workflow
- [ ] Add document templates

**G. TEAM TAB**
```
👥 PROJECT TEAM (12 members)

PROJECT MANAGER:
┌────────────────────────────────────────────────────┐
│ 👷 Mike Johnson                                    │
│ mike@construction.com • (555) 123-4567            │
│ Role: Project Manager                             │
│ Active on: 3 other projects                       │
└────────────────────────────────────────────────────┘

INTERNAL TEAM (5):
├─ Sarah Wilson       | Superintendent
├─ John Davis         | Electrician
├─ Robert Taylor      | Carpenter
└─ ...

SUBCONTRACTORS (7):
├─ ABC Electric       | Electrical      | $85,000
│  Contact: Tom Brown | (555) 234-5678
│  Insurance expires: Mar 15, 2026 ✅
│
├─ Johnson Plumbing   | Plumbing        | $42,000
│  Contact: Bill Johnson | (555) 345-6789
│  Insurance expires: Jan 30, 2026 ⚠️
│
└─ ...

[+ Add Team Member] [+ Add Subcontractor] [Manage Roles]
```

Database Schema:
```sql
CREATE TABLE project_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  user_id UUID REFERENCES auth.users(id),

  -- Role
  role TEXT NOT NULL, -- 'project_manager', 'superintendent', 'foreman', 'worker', 'admin'
  is_primary_contact BOOLEAN DEFAULT false,

  -- Permissions
  can_edit_project BOOLEAN DEFAULT false,
  can_approve_expenses BOOLEAN DEFAULT false,
  can_manage_team BOOLEAN DEFAULT false,

  -- Assignment
  assigned_date DATE DEFAULT CURRENT_DATE,
  removed_date DATE,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Company Info
  company_name VARCHAR(255) NOT NULL,
  trade TEXT NOT NULL, -- 'electrical', 'plumbing', 'hvac', 'concrete', 'framing', 'roofing', etc.
  license_number VARCHAR(100),

  -- Contact
  primary_contact_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,

  -- Insurance
  insurance_company VARCHAR(255),
  insurance_policy_number VARCHAR(100),
  insurance_expiration_date DATE,
  insurance_certificate_url TEXT,

  -- Performance
  rating DECIMAL(3, 2), -- 0.00 to 5.00
  total_projects_completed INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE project_subcontracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  subcontractor_id UUID NOT NULL REFERENCES subcontractors(id),

  -- Contract Details
  scope_of_work TEXT NOT NULL,
  contract_amount DECIMAL(12, 2) NOT NULL,

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'signed', 'active', 'completed'

  -- Dates
  start_date DATE,
  end_date DATE,
  signed_date DATE,

  -- Documentation
  contract_url TEXT,

  -- Payment
  payment_terms TEXT,
  amount_paid DECIMAL(12, 2) DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Implementation Tasks:
- [ ] Create team management tables
- [ ] Build subcontractor database
- [ ] Add insurance tracking/alerts
- [ ] Create permission system per project
- [ ] Add subcontractor bidding workflow
- [ ] Build contract management
- [ ] Add performance ratings
- [ ] Track subcontractor payments

**H. REPORTS TAB**
```
📊 PROJECT REPORTS

DAILY REPORTS:
┌────────────────────────────────────────────────────┐
│ Jan 22, 2026 - Daily Site Report                  │
│ Weather: Sunny, 45°F                              │
│ Crew: 8 workers on site                           │
│ Work Completed:                                   │
│ • Foundation formwork 80% complete                │
│ • Rebar placement started                         │
│ Issues: None                                      │
│ Photos: 12 attached                               │
│ [View Full Report]                                │
├────────────────────────────────────────────────────┤
│ [+ Create Today's Report]                         │
└────────────────────────────────────────────────────┘

PROGRESS REPORTS:
├─ Weekly Summary (Auto-generated every Monday)
├─ Monthly Executive Summary
└─ Client Progress Report (Investor-friendly)

FINANCIAL REPORTS:
├─ Budget vs Actual
├─ Cash Flow Projection
├─ Change Order Summary
└─ Cost per Square Foot

COMPLIANCE REPORTS:
├─ Safety Incident Log
├─ Inspection History
└─ Permit Status

[Generate Custom Report] [Schedule Reports] [Export]
```

Database Schema:
```sql
CREATE TABLE daily_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),

  -- Date
  report_date DATE NOT NULL,

  -- Weather
  weather_conditions TEXT,
  temperature_high INT,
  temperature_low INT,
  precipitation TEXT,

  -- Crew
  workers_on_site INT,
  crew_details JSONB DEFAULT '[]',

  -- Work Performed
  work_completed TEXT NOT NULL,
  percentage_complete_today DECIMAL(5, 2),

  -- Materials
  materials_delivered TEXT,
  materials_used TEXT,

  -- Equipment
  equipment_on_site TEXT,

  -- Issues
  issues_encountered TEXT,
  delays TEXT,
  safety_concerns TEXT,

  -- Visitors
  visitors JSONB DEFAULT '[]', -- Inspectors, clients, etc.

  -- Photos
  photo_ids UUID[] DEFAULT '{}',

  -- Next Day
  planned_work_tomorrow TEXT,

  submitted_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
```

Implementation Tasks:
- [ ] Create daily report template
- [ ] Auto-populate weather data
- [ ] Link to day's photos
- [ ] Generate weekly summaries
- [ ] Create client-friendly reports
- [ ] Add custom report builder
- [ ] Schedule automated reports
- [ ] Export to PDF/Excel

---

### 3. **Client Portal** (NEW - High Value Feature)

**Purpose**: Let clients see progress without constant calls/emails

#### Client View:
```
🏗️ DOWNTOWN OFFICE RENOVATION
Client Portal for Acme Corporation

┌────────────────────────────────────────────────────┐
│ PROJECT PROGRESS: 65% Complete                    │
│ ●●●●●●●●●●●●●○○○○○○○                             │
│                                                   │
│ On Track | On Budget | No Safety Issues          │
└────────────────────────────────────────────────────┘

WHAT'S HAPPENING:
• Foundation work 95% complete
• Starting framing next week
• On schedule for June 30 completion

RECENT PHOTOS (Click to view all 234):
[Photo 1] [Photo 2] [Photo 3] [Photo 4]

UPCOMING MILESTONES:
✅ Foundation Complete   - Jan 25
⚪ Framing Complete      - Feb 8
⚪ Rough-in Complete     - Feb 15

YOUR DECISIONS NEEDED:
⚠️ Fixture Selection Due - Feb 1
⚠️ Paint Colors Due      - Feb 10

CHANGE ORDERS:
├─ CO-003: Structural repair (+$8,500) - Pending Your Approval
└─ [Approve] [Request More Info] [Reject]

DOCUMENTS (3 new):
├─ Updated Drawings v3
├─ Electrical Permit (Approved)
└─ Weekly Progress Report

CONTACT YOUR TEAM:
Mike Johnson (PM): mike@construction.com | (555) 123-4567
[Send Message]
```

Database Schema:
```sql
CREATE TABLE client_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),

  -- Auth
  email VARCHAR(255) NOT NULL UNIQUE,
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  last_login TIMESTAMPTZ,

  -- Permissions
  can_view_budget BOOLEAN DEFAULT false,
  can_view_schedule BOOLEAN DEFAULT true,
  can_view_photos BOOLEAN DEFAULT true,
  can_view_documents BOOLEAN DEFAULT true,
  can_approve_changes BOOLEAN DEFAULT false,

  -- Notifications
  notify_on_milestone BOOLEAN DEFAULT true,
  notify_on_change_order BOOLEAN DEFAULT true,
  notify_on_delay BOOLEAN DEFAULT true,
  notify_weekly_update BOOLEAN DEFAULT true,

  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Implementation Tasks:
- [ ] Create separate client portal route
- [ ] Implement client authentication (magic link)
- [ ] Build read-only project views
- [ ] Add photo gallery for clients
- [ ] Implement change order approval workflow
- [ ] Create automated weekly email updates
- [ ] Add messaging system
- [ ] Track client engagement (for sales intel)

---

### 4. **Advanced Features** (Phase 2)

**A. Drawing Management with Markup**
- Upload PDF plans
- Annotate/markup with touch/mouse
- Version control with comparison
- Hyperlinked sheets
- Measure distances (scale-aware)

**B. Material Tracking**
- Purchase orders
- Delivery schedules
- Backorder alerts
- Inventory management
- Barcode scanning

**C. Quality Control & Punch Lists**
- Photo-based defect tracking
- Assign to responsible party
- Deadline tracking
- Before/after photos
- Client final walkthrough

**D. Time Tracking**
- Clock in/out from mobile
- GPS verification
- Labor cost tracking
- Certified payroll reports
- Integrate with QuickBooks Time

**E. Safety Management**
- Daily safety briefings
- Incident reporting
- Near-miss tracking
- OSHA compliance checklists
- Safety training records

---

## TECHNICAL IMPLEMENTATION

### Database Optimizations

**1. Performance Indexes**
```sql
-- Project queries
CREATE INDEX idx_projects_company_status ON projects(company_id, status);
CREATE INDEX idx_projects_company_dates ON projects(company_id, start_date, end_date);

-- Expense queries
CREATE INDEX idx_expenses_project_date ON expenses(project_id, date DESC);
CREATE INDEX idx_expenses_category ON expenses(category, project_id);

-- Documents
CREATE INDEX idx_documents_project_category ON project_documents(project_id, category);

-- Full-text search
CREATE INDEX idx_documents_search ON project_documents USING GIN(to_tsvector('english', title || ' ' || description || ' ' || COALESCE(extracted_text, '')));
```

**2. Materialized Views for Reporting**
```sql
CREATE MATERIALIZED VIEW project_summary_mv AS
SELECT
  p.id,
  p.name,
  p.status,
  p.progress_percentage,

  -- Budget
  p.estimated_budget,
  COALESCE(SUM(e.total_amount), 0) as actual_spent,
  p.estimated_budget - COALESCE(SUM(e.total_amount), 0) as budget_remaining,
  ROUND((COALESCE(SUM(e.total_amount), 0) / NULLIF(p.estimated_budget, 0)) * 100, 2) as budget_utilization,

  -- Schedule
  EXTRACT(DAY FROM p.end_date - p.start_date) as estimated_duration_days,
  EXTRACT(DAY FROM CURRENT_DATE - p.start_date) as days_elapsed,
  EXTRACT(DAY FROM p.end_date - CURRENT_DATE) as days_remaining,

  -- Counts
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT t.id) FILTER(WHERE t.status = 'completed') as completed_task_count,
  COUNT(DISTINCT ma.id) as photo_count,
  COUNT(DISTINCT pd.id) as document_count,

  -- Last Activity
  MAX(ma.uploaded_at) as last_photo_timestamp,
  MAX(t.updated_at) as last_task_update

FROM projects p
LEFT JOIN expenses e ON e.project_id = p.id AND e.payment_status = 'paid'
LEFT JOIN tasks t ON t.project_id = p.id
LEFT JOIN media_assets ma ON ma.project_id = p.id
LEFT JOIN project_documents pd ON pd.project_id = p.id
GROUP BY p.id;

-- Refresh every 5 minutes
CREATE UNIQUE INDEX ON project_summary_mv(id);
```

**3. Triggers for Data Consistency**
```sql
-- Auto-update project progress based on tasks
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects
  SET progress_percentage = (
    SELECT ROUND((COUNT(*) FILTER(WHERE status = 'completed')::NUMERIC /
                  COUNT(*)::NUMERIC) * 100)
    FROM tasks
    WHERE project_id = NEW.project_id
  )
  WHERE id = NEW.project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_update_project_progress
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_project_progress();
```

### API Structure

```typescript
// lib/supabase/projects.ts

export async function getProjectDetails(projectId: string) {
  const supabase = createClient()

  // Use materialized view for better performance
  const { data: project } = await supabase
    .from('project_summary_mv')
    .select('*')
    .eq('id', projectId)
    .single()

  // Get team members
  const { data: team } = await supabase
    .from('project_team_members')
    .select(`
      *,
      user:users(id, name, email, avatar)
    `)
    .eq('project_id', projectId)
    .eq('is_active', true)

  // Get recent expenses
  const { data: recentExpenses } = await supabase
    .from('expenses')
    .select('*')
    .eq('project_id', projectId)
    .order('date', { ascending: false })
    .limit(10)

  // Get upcoming milestones
  const { data: milestones } = await supabase
    .from('milestones')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_complete', false)
    .order('target_date', { ascending: true })
    .limit(5)

  return {
    project,
    team,
    recentExpenses,
    milestones
  }
}

export async function createExpense(expense: NewExpense) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('expenses')
    .insert([{
      ...expense,
      created_by: (await supabase.auth.getUser()).data.user?.id
    }])
    .select()
    .single()

  if (error) throw error

  // Trigger will auto-update project.actual_spent

  // Log activity
  await logActivity({
    type: 'expense_added',
    project_id: expense.project_id,
    title: `Expense logged: ${expense.vendor} - ${formatCurrency(expense.total_amount)}`,
    metadata: { expense_id: data.id }
  })

  return data
}

export async function approveChangeOrder(changeOrderId: string, approverId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('change_orders')
    .update({
      status: 'approved',
      approved_by: approverId,
      approved_date: new Date().toISOString()
    })
    .eq('id', changeOrderId)
    .select()
    .single()

  if (error) throw error

  // Update project budget
  await supabase.rpc('add_change_order_to_budget', {
    p_project_id: data.project_id,
    p_amount: data.revised_amount
  })

  // Notify team
  await sendNotification({
    type: 'change_order_approved',
    project_id: data.project_id,
    message: `Change Order ${data.change_order_number} approved for ${formatCurrency(data.revised_amount)}`
  })

  return data
}
```

### Real-Time Subscriptions

```typescript
// Subscribe to project updates
export function subscribeToProject(projectId: string, callback: (event: any) => void) {
  const supabase = createClient()

  const channels = [
    // Project changes
    supabase.channel(`project_${projectId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
        callback
      )
      .subscribe(),

    // Expense changes
    supabase.channel(`expenses_${projectId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `project_id=eq.${projectId}` },
        callback
      )
      .subscribe(),

    // Milestone changes
    supabase.channel(`milestones_${projectId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'milestones', filter: `project_id=eq.${projectId}` },
        callback
      )
      .subscribe()
  ]

  return () => channels.forEach(c => c.unsubscribe())
}
```

---

## UI/UX REQUIREMENTS

### Design Principles

**1. Information Hierarchy**
- Most critical info at top (health indicators)
- Alerts before content
- Actions visible, not buried in menus

**2. Progressive Disclosure**
- Summary on list view
- Details on project page
- Deep dive in tabs

**3. Mobile-First**
- Superintendents use phones on site
- Touch-friendly buttons (min 44px)
- Swipe gestures for common actions

### Component Library

**Project Card**
```tsx
<ProjectCard
  project={project}
  showHealthIndicators={true}
  showTeam={true}
  showNextMilestone={true}
  onClick={() => router.push(`/projects/${project.id}`)}
/>
```

**Budget Display**
```tsx
<BudgetBar
  estimated={450000}
  actual={423750}
  committed={12000}
  showPercentage={true}
  showRemaining={true}
/>
```

**Timeline Gantt**
```tsx
<GanttChart
  phases={phases}
  milestones={milestones}
  startDate={projectStart}
  endDate={projectEnd}
  onPhaseDrag={handleReschedule}
  highlightCriticalPath={true}
/>
```

---

## TESTING REQUIREMENTS

### Unit Tests
- [ ] Budget calculations
- [ ] Schedule variance calculations
- [ ] Progress percentage updates
- [ ] Permission checks
- [ ] Data validation

### Integration Tests
- [ ] Expense logging updates budget
- [ ] Task completion updates progress
- [ ] Change order approval workflow
- [ ] Team member assignment
- [ ] Client portal access

### E2E Tests
- [ ] Create new project flow
- [ ] Log expenses and verify budget
- [ ] Upload documents
- [ ] Invite client and verify access
- [ ] Generate reports

### Performance Tests
- [ ] Load project with 1000+ tasks
- [ ] Load project with 500+ photos
- [ ] Budget calculations with 500+ expenses
- [ ] Real-time updates with 20 concurrent users

---

## SUCCESS METRICS

### Adoption
- **Target**: 100% of active projects in system
- **Measure**: Projects created per week

### Budget Accuracy
- **Target**: <5% variance between estimated and actual
- **Measure**: Budget overruns per project

### Client Satisfaction
- **Target**: 90% of clients use portal weekly
- **Measure**: Client portal login frequency

### Time Savings
- **Target**: 5 hours/week saved per PM
- **Measure**: Time tracking before/after

---

## ROLLOUT PLAN

### Week 1: Budget & Expenses
- [ ] Create expense tracking tables
- [ ] Build expense logging UI
- [ ] Implement budget calculations
- [ ] Add change order system
- [ ] Test with 3 pilot projects

### Week 2: Schedule & Timeline
- [ ] Create phases/milestones tables
- [ ] Build Gantt chart component
- [ ] Add inspection scheduling
- [ ] Implement critical path calculation
- [ ] Add calendar integrations

### Week 3: Documents & RFIs
- [ ] Setup document storage buckets
- [ ] Build file upload/organization
- [ ] Create RFI workflow
- [ ] Add submittal tracking
- [ ] Implement OCR for PDFs

### Week 4: Client Portal & Reports
- [ ] Create client portal authentication
- [ ] Build client-facing views
- [ ] Add change order approval for clients
- [ ] Create daily report templates
- [ ] Build automated report generation

---

## COMPETITIVE ANALYSIS

**vs Procore**:
- ❌ They have: Powerful integrations, robust API, 20+ years of data
- ✅ We have: Simpler UI, faster setup, better for small-medium contractors
- 🎯 Our advantage: Price ($89/user/mo vs their $375+), ease of use

**vs Buildertrend**:
- ❌ They have: Better residential workflows, client selections module
- ✅ We have: Better commercial features, more flexible
- 🎯 Our advantage: Modern tech stack, faster, real-time updates

**vs CoConstruct**:
- ❌ They have: Residential specialists, better financial integrations
- ✅ We have: Commercial + residential, better mobile experience
- 🎯 Our advantage: Unified platform, better for growing companies

**What We Must Match**:
1. Budget tracking with detailed cost codes ✅ (implementing)
2. Schedule with Gantt charts ✅ (implementing)
3. Document management ✅ (implementing)
4. Change order workflow ✅ (implementing)
5. Client portal ✅ (implementing)

**Where We Can Win**:
1. 🚀 Speed - Real-time updates, modern tech
2. 💰 Price - 60% cheaper than Procore
3. 📱 Mobile - Better mobile experience
4. 🤖 AI - Computer vision for photos, smart insights
5. 🎨 UX - Simpler, cleaner, less training needed

---

## DEPENDENCIES

**External Services**:
- Supabase Storage (document storage)
- Weather API (project location weather)
- OCR API (document text extraction)
- QuickBooks API (accounting integration)
- Stripe (payment processing)

**Internal Systems**:
- ✅ Tasks module (completed)
- ✅ Photos module (completed)
- ⏳ Financial module (in progress)
- ⏳ Teams/RBAC (in progress)
- 📅 Daily reports (planned)

**Team Requirements**:
- 2 full-stack developers (4 weeks)
- 1 designer (2 weeks for components)
- 1 QA tester (2 weeks)
- 1 technical writer (1 week for docs)

---

## NOTES FOR DEVELOPER

### Critical Path (Do These First):
1. **Budget tracking** - This is table stakes, can't compete without it
2. **Schedule/Gantt** - Every PM needs to see timeline
3. **Document storage** - Plans must be accessible
4. **Client portal** - High ROI, clients love transparency

### Can Wait for Phase 2:
- Drawing markup tools (nice-to-have)
- Advanced material tracking
- Time clock integration
- Safety management

### Technical Debt to Address:
- Current progress calculation is manual, should auto-update from tasks
- Budget fields exist but aren't used
- Client portal auth is half-built
- Timeline page is placeholder

### Performance Considerations:
- Use materialized views for project summaries
- Cache expensive calculations (budget, schedule variance)
- Lazy load photos/documents tabs
- Implement virtual scrolling for large lists

---

**Projects is 75% done because the core CRUD works. But the 25% missing is what justifies the $89/mo price tag. Focus on budget, schedule, and client portal first. 🎯**
