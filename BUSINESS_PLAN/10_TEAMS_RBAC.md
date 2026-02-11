# TEAMS & RBAC - COMPLETE IMPLEMENTATION PLAN

**Module**: Team Management & Role-Based Access Control
**Current Status**: 50% Complete (Basic structure exists)
**Target Status**: 95% Complete
**Priority**: HIGH (Security & Multi-User)
**Timeline**: 1.5 weeks

---

## BUSINESS PURPOSE

As companies grow beyond 1-2 people, they need:
1. **Permissions** - Not everyone should see financials
2. **Organizational Structure** - Office vs field workers
3. **Multi-Company** - GCs with subs need separate tenants
4. **Audit Trails** - Who changed what, when
5. **Onboarding** - Easy to add new team members

**User Story**: "I have 3 office staff, 8 field workers, and work with 12 subcontractors. Office staff need full access. Field workers only see their assigned projects. Subs only see their specific tasks. My bookkeeper needs financial access but shouldn't delete projects. I need to know who approved that $15K change order."

---

## KEY FEATURES

### 1. **Role-Based Permissions**
```
👥 ROLES & PERMISSIONS

BUILT-IN ROLES:

┌─────────────────────────────────────────────────┐
│ OWNER / ADMIN (Full Access)                    │
├─────────────────────────────────────────────────┤
│ ✅ All projects                                 │
│ ✅ Financials                                   │
│ ✅ User management                              │
│ ✅ Company settings                             │
│ ✅ Delete anything                              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ PROJECT MANAGER                                 │
├─────────────────────────────────────────────────┤
│ ✅ View all projects                            │
│ ✅ Edit assigned projects                       │
│ ✅ Create quotes                                │
│ ✅ View project finances                        │
│ ✅ Manage tasks                                 │
│ ❌ Delete projects                              │
│ ❌ Company settings                             │
│ ❌ User management                              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ SUPERINTENDENT                                  │
├─────────────────────────────────────────────────┤
│ ✅ View assigned projects only                  │
│ ✅ Update tasks                                 │
│ ✅ Upload photos                                │
│ ✅ Daily reports                                │
│ ❌ View finances                                │
│ ❌ Delete anything                              │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ FIELD WORKER                                    │
├─────────────────────────────────────────────────┤
│ ✅ View own tasks only                          │
│ ✅ Update task status                           │
│ ✅ Upload photos                                │
│ ✅ Log time                                     │
│ ❌ View other users' work                       │
│ ❌ Any financial data                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ BOOKKEEPER / ACCOUNTANT                         │
├─────────────────────────────────────────────────┤
│ ✅ View all projects                            │
│ ✅ View/edit financials                         │
│ ✅ Create invoices                              │
│ ✅ Expenses                                     │
│ ❌ Delete projects                              │
│ ❌ Project operations                           │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ CLIENT (View Only)                              │
├─────────────────────────────────────────────────┤
│ ✅ View assigned project                        │
│ ✅ See photos                                   │
│ ✅ View schedule                                │
│ ✅ Approve change orders                        │
│ ❌ Edit anything                                │
│ ❌ View other projects                          │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ SUBCONTRACTOR                                   │
├─────────────────────────────────────────────────┤
│ ✅ View assigned tasks only                     │
│ ✅ Update task status                           │
│ ✅ Upload related photos                        │
│ ✅ Submit invoices                              │
│ ❌ View project finances                        │
│ ❌ Access other projects                        │
└─────────────────────────────────────────────────┘

[Create Custom Role]
```

### 2. **Permission Matrix**
```
🔐 DETAILED PERMISSIONS

MODULE: Projects

ACTION                    | Owner | PM | Super | Worker | Book | Client
────────────────────────┼───────┼────┼───────┼────────┼──────┼────────
View all projects       │  ✅   │ ✅  │  ❌   │  ❌    │  ✅  │  ❌
View assigned projects  │  ✅   │ ✅  │  ✅   │  ✅    │  ✅  │  ✅
Create project          │  ✅   │ ✅  │  ❌   │  ❌    │  ❌  │  ❌
Edit project            │  ✅   │ ✅* │  ❌   │  ❌    │  ❌  │  ❌
Delete project          │  ✅   │ ❌  │  ❌   │  ❌    │  ❌  │  ❌
View budget             │  ✅   │ ✅* │  ❌   │  ❌    │  ✅  │  ❌
Edit budget             │  ✅   │ ✅* │  ❌   │  ❌    │  ✅  │  ❌

* Only for projects they're assigned to

MODULE: Tasks

ACTION                    | Owner | PM | Super | Worker | Book | Client
────────────────────────┼───────┼────┼───────┼────────┼──────┼────────
View all tasks          │  ✅   │ ✅  │  ❌   │  ❌    │  ❌  │  ❌
View assigned tasks     │  ✅   │ ✅  │  ✅   │  ✅    │  ❌  │  ❌
Create task             │  ✅   │ ✅  │  ✅   │  ❌    │  ❌  │  ❌
Assign task             │  ✅   │ ✅  │  ✅   │  ❌    │  ❌  │  ❌
Update status           │  ✅   │ ✅  │  ✅   │  ✅*   │  ❌  │  ❌
Delete task             │  ✅   │ ✅  │  ❌   │  ❌    │  ❌  │  ❌

* Only tasks assigned to them

[View Full Matrix] [Export Permissions]
```

### 3. **Team Management**
```
👥 TEAM DIRECTORY

OFFICE (5 members):
├─ Mike Johnson - Owner
│  Role: Owner
│  Access: Full
│  Projects: All (12 active)
│  [Edit]
│
├─ Sarah Wilson - Project Manager
│  Role: Project Manager
│  Access: All projects
│  Projects: 8 assigned
│  [Edit] [View Activity Log]
│
├─ Emily Chen - Bookkeeper
│  Role: Accountant
│  Access: Financial only
│  Last login: 2 hours ago
│  [Edit]
│
└─ ...

FIELD (8 members):
├─ John Davis - Superintendent
│  Role: Superintendent
│  Access: 3 assigned projects
│  Projects: Downtown Office, Smith Residence, Oak Street
│  Mobile app: ✅ Installed
│  Last GPS check-in: 45 min ago (Downtown Office)
│  [Edit] [View Location]
│
├─ Robert Taylor - Carpenter
│  Role: Field Worker
│  Access: Tasks only
│  Tasks: 5 active
│  Time logged today: 6.5 hours
│  [Edit]
│
└─ ...

SUBCONTRACTORS (12):
├─ ABC Electrical - Tom Brown
│  Role: Subcontractor
│  Access: Assigned tasks only
│  Active projects: 2
│  Last activity: Today 10:30 AM
│  [Edit] [View Work]
│
└─ ...

[+ Invite Team Member]
```

### 4. **Audit Log**
```
📋 AUDIT TRAIL - Downtown Office

FILTER: [All Actions ▼] [All Users ▼] [Last 7 days ▼]

┌────────────────────────────────────────────────┐
│ Jan 22, 3:45 PM                                │
│ 💰 Mike Johnson changed project budget        │
│ Changed: estimated_budget                      │
│ From: $450,000                                 │
│ To: $455,000                                   │
│ Reason: "Client approved change order CO-003"  │
│ IP: 192.168.1.100                             │
│ [View Details] [Revert]                       │
├────────────────────────────────────────────────┤
│ Jan 22, 2:15 PM                                │
│ ✅ Sarah Wilson marked task as complete       │
│ Task: "Electrical rough-in inspection"         │
│ Previous status: in-progress                   │
│ New status: completed                          │
│ [View Task]                                    │
├────────────────────────────────────────────────┤
│ Jan 22, 10:30 AM                               │
│ 🗑️ Mike Johnson deleted expense               │
│ Expense: "Concrete supplies" ($2,450)         │
│ Reason: "Duplicate entry"                      │
│ ⚠️ FINANCIAL DELETION - Flagged for review    │
│ [View Details] [Restore]                      │
└────────────────────────────────────────────────┘

CRITICAL ACTIONS (Require approval):
• Budget changes >$5,000
• Project deletions
• User permission changes
• Financial data deletion
```

### 5. **Onboarding Flow**
```
✉️ INVITE TEAM MEMBER

Email: john.davis@example.com
Name: John Davis
Role: [Superintendent ▼]

ASSIGN TO PROJECTS:
☑ Downtown Office (PM: Mike Johnson)
☑ Smith Residence (PM: Sarah Wilson)
☐ Warehouse Build (PM: Mike Johnson)

CUSTOM PERMISSIONS (Optional):
☐ Can approve expenses up to $1,000
☐ Can create change orders
☐ Receives daily digest emails

ONBOARDING CHECKLIST:
☑ Send invitation email
☑ Require password setup
☑ Require profile photo
☑ Show tutorial on first login
☑ Assign onboarding buddy: Sarah Wilson

[Send Invitation]

──────────────────────────────────────────

INVITATION EMAIL PREVIEW:

Subject: Welcome to The Sierra Suites - Construction Team

Hi John,

Mike Johnson has invited you to join The Sierra Suites
construction management platform.

Role: Superintendent
Projects: Downtown Office, Smith Residence

Click here to get started:
[Accept Invitation & Set Password]

You'll have access to:
• View project schedules
• Update task status
• Upload photos
• Submit daily reports

Need help? Contact Mike Johnson at mike@construction.com

The Sierra Suites Team
```

---

## DATABASE SCHEMA

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id), -- NULL for built-in roles

  -- Role Info
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false, -- Can't be deleted

  -- Permissions (JSONB for flexibility)
  permissions JSONB NOT NULL,
  /* Example:
  {
    "projects": {"view_all": true, "create": true, "edit": true, "delete": false},
    "tasks": {"view_all": true, "create": true, "edit": true, "delete": false},
    "financials": {"view": true, "edit": false},
    "users": {"view": true, "invite": false, "edit": false},
    "settings": {"view": false, "edit": false}
  }
  */

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role_id UUID NOT NULL REFERENCES roles(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Scope (optional - limit to specific projects)
  project_ids UUID[], -- If NULL, applies to all projects

  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, role_id, company_id)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Who & When
  user_id UUID NOT NULL REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- What
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  entity_type TEXT NOT NULL, -- 'project', 'task', 'expense', etc.
  entity_id UUID,

  -- Changes
  old_values JSONB,
  new_values JSONB,

  -- Context
  reason TEXT,
  ip_address INET,
  user_agent TEXT,

  -- Classification
  is_critical BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ
);

CREATE INDEX idx_audit_company_time ON audit_logs(company_id, timestamp DESC);
CREATE INDEX idx_audit_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
```

---

## ROW LEVEL SECURITY

```sql
-- Projects: Users can only see projects they have access to
CREATE POLICY "Users can view assigned projects"
  ON projects FOR SELECT
  USING (
    id IN (
      SELECT project_id FROM project_team_members
      WHERE user_id = auth.uid()
    )
    OR
    company_id IN (
      SELECT company_id FROM user_roles
      WHERE user_id = auth.uid()
      AND role_id IN (
        SELECT id FROM roles
        WHERE permissions->>'projects'->>'view_all' = 'true'
      )
    )
  );

-- Tasks: Users can only see tasks assigned to them or in their projects
CREATE POLICY "Users can view accessible tasks"
  ON tasks FOR SELECT
  USING (
    assignee_id = auth.uid()
    OR
    project_id IN (
      SELECT project_id FROM project_team_members
      WHERE user_id = auth.uid()
    )
  );

-- Expenses: Only users with financial permissions can view
CREATE POLICY "Financial access required for expenses"
  ON expenses FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE r.permissions->>'financials'->>'view' = 'true'
    )
  );
```

---

## COMPETITIVE EDGE

**vs Procore**: Similar RBAC, we're simpler to setup
**vs Buildertrend**: Better granular permissions
**vs Monday.com**: Construction-specific roles

**What Makes Us Better**:
1. 🏗️ Pre-built construction roles (not generic)
2. 📱 Mobile-optimized for field workers
3. 🔍 Comprehensive audit trail
4. 👥 Subcontractor portal built-in
5. ⚡ Fast onboarding (< 5 min per user)

---

## SUCCESS METRICS

- **Target**: Support 50+ user companies
- **Target**: <5 min average onboarding time
- **Target**: Zero permission-related security incidents

---

## ROLLOUT PLAN

### Week 1: Core RBAC
- [ ] Implement role system
- [ ] Row-level security
- [ ] Permission checks
- [ ] Audit logging

### Week 2: Team Features
- [ ] Team directory
- [ ] Invitation system
- [ ] Custom roles
- [ ] Permission UI

---

**Teams & RBAC is 50% done (basic structure exists). Granular permissions, audit trails, and easy onboarding are critical for scaling to enterprise clients. 👥**
