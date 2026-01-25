# 🏗️ SIERRA SUITES - ENTERPRISE IMPLEMENTATION MASTER PLAN
## Complete Roadmap to Production-Grade Quality

**Document Version:** 1.0
**Created:** January 21, 2026
**Target Completion:** August 2026
**Implementation Strategy:** Option B (Full Feature Launch)

---

## 📋 TABLE OF CONTENTS

### PART 1: FOUNDATION & CORE MODULES
1. Executive Summary
2. Database Architecture Overhaul
3. Security & Authentication
4. Performance Optimization
5. Dashboard Module
6. Projects Module
7. TaskFlow Module

### PART 2: REVENUE & COLLABORATION FEATURES
8. FieldSnap Module
9. QuoteHub Module
10. Punch Lists Module
11. Teams & RBAC Module
12. CRM Suite Module

### PART 3: ADVANCED FEATURES & DEPLOYMENT
13. Sustainability Hub Module
14. ReportCenter Module
15. AI Features Module
16. Integration Layer
17. Testing & Quality Assurance
18. Deployment & Infrastructure
19. Documentation & Training
20. Maintenance & Support

---

## 📊 EXECUTIVE SUMMARY

### Current State
Sierra Suites is a **62% complete** construction management platform with:
- ✅ 2 production-ready modules (Projects, TaskFlow)
- ⚠️ 3 modules needing 1-2 weeks work (Dashboard, FieldSnap, QuoteHub)
- ❌ 5 modules requiring major work (Teams, CRM, Sustainability, Reports, AI)

### Target State
By August 2026, deliver an **enterprise-grade platform** with:
- ✅ 100% feature-complete across all 11 modules
- ✅ Bank-grade security with third-party audit
- ✅ Sub-second response times with 10,000+ records
- ✅ 95%+ test coverage
- ✅ SOC2 Type II compliance-ready
- ✅ 99.9% uptime SLA
- ✅ Full API documentation
- ✅ Real AI capabilities (not mock data)

### Timeline Overview
**Month 1-2:** Foundation (Database, Security, Performance)
**Month 3-4:** Core Modules (All 11 modules feature-complete)
**Month 5:** Advanced Features (Real AI, Sustainability calculations)
**Month 6:** Testing & Deployment (QA, staging, production)
**Month 7:** Beta Testing (10-20 contractors)
**Month 8:** Launch (August 2026)

### Resource Requirements
- **Team:** 3 developers (you + 2 hires)
- **Budget:** $15,000-25,000 (APIs, tools, audits)
- **Time:** 1,600-2,000 developer hours

---

## 🗄️ SECTION 1: DATABASE ARCHITECTURE OVERHAUL

### Current Problems
1. **30+ SQL files** - unclear which is authoritative
2. **Multiple FIX files** - indicates RLS policy failures
3. **Schema drift** - application doesn't match database
4. **No migration system** - manual SQL execution prone to errors
5. **Missing indexes** - performance will degrade at scale

### 1.1 Database Consolidation

#### Step 1.1.1: Create Master Schema
**Goal:** Single source of truth for entire database

**Action Items:**
```sql
-- Create file: database/master-schema.sql

-- ============================================================================
-- SIERRA SUITES - MASTER DATABASE SCHEMA
-- Version: 1.0.0
-- Last Updated: 2026-01-21
-- ============================================================================

-- SECTION 1: CORE TABLES
-- ----------------------------------------------------------------------------

-- Users & Authentication
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    phone_number TEXT,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    subscription_tier TEXT DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
    subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'canceled', 'past_due')),
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ,
    settings JSONB DEFAULT '{}'::jsonb,
    preferences JSONB DEFAULT '{}'::jsonb
);

-- Companies (Multi-tenant)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    industry TEXT,
    size TEXT,
    address JSONB,
    contact_email TEXT,
    contact_phone TEXT,
    website TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECTION 2: PROJECT MANAGEMENT
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    client_name TEXT,
    project_number TEXT,
    description TEXT,
    status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'on-hold', 'completed', 'cancelled')),
    type TEXT CHECK (type IN ('residential', 'commercial', 'industrial', 'infrastructure', 'renovation')),

    -- Location
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT DEFAULT 'US',
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),

    -- Timeline
    start_date DATE,
    end_date DATE,
    estimated_duration_days INTEGER,
    actual_duration_days INTEGER,

    -- Budget
    estimated_budget DECIMAL(15, 2) DEFAULT 0,
    actual_cost DECIMAL(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',

    -- Progress
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

    -- Team
    project_manager_id UUID REFERENCES public.user_profiles(id),
    team_members UUID[] DEFAULT '{}',

    -- Settings
    settings JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ,

    -- Indexes for performance
    CONSTRAINT projects_company_id_idx CHECK (company_id IS NOT NULL)
);

-- Project Phases
CREATE TABLE IF NOT EXISTS public.project_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    phase_order INTEGER NOT NULL,
    status TEXT DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'completed', 'skipped')),
    start_date DATE,
    end_date DATE,
    completion_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Members
CREATE TABLE IF NOT EXISTS public.project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'member', 'viewer')),
    permissions JSONB DEFAULT '{}'::jsonb,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    added_by UUID REFERENCES public.user_profiles(id),
    UNIQUE(project_id, user_id)
);

-- Project Documents
CREATE TABLE IF NOT EXISTS public.project_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    category TEXT CHECK (category IN ('blueprint', 'contract', 'permit', 'invoice', 'photo', 'other')),
    tags TEXT[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    is_latest_version BOOLEAN DEFAULT true,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Project Milestones
CREATE TABLE IF NOT EXISTS public.project_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'completed', 'missed')),
    completion_date DATE,
    importance TEXT CHECK (importance IN ('critical', 'high', 'medium', 'low')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project Expenses
CREATE TABLE IF NOT EXISTS public.project_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    category TEXT CHECK (category IN ('labor', 'materials', 'equipment', 'permits', 'subcontractor', 'overhead', 'other')),
    expense_date DATE NOT NULL,
    receipt_url TEXT,
    payment_method TEXT,
    vendor_name TEXT,
    is_billable BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECTION 3: TASK MANAGEMENT
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    project_name TEXT,

    -- Basic Info
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'not-started' CHECK (status IN ('not-started', 'in-progress', 'review', 'completed', 'blocked')),
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),

    -- Categorization
    trade TEXT CHECK (trade IN ('electrical', 'plumbing', 'hvac', 'concrete', 'framing', 'finishing', 'general')),
    phase TEXT CHECK (phase IN ('pre-construction', 'foundation', 'framing', 'mep', 'finishing', 'closeout')),

    -- Assignment
    assignee_id UUID REFERENCES public.user_profiles(id),
    assignee_name TEXT,
    assignee_avatar TEXT,

    -- Timeline
    start_date DATE,
    due_date DATE,
    duration_days INTEGER,
    completed_date DATE,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),

    -- Time Tracking
    estimated_hours DECIMAL(8, 2),
    actual_hours DECIMAL(8, 2) DEFAULT 0,

    -- Dependencies
    depends_on UUID[] DEFAULT '{}',
    blocks UUID[] DEFAULT '{}',

    -- Weather & Inspections
    is_weather_dependent BOOLEAN DEFAULT false,
    weather_buffer_days INTEGER DEFAULT 0,
    requires_inspection BOOLEAN DEFAULT false,
    inspection_type TEXT,

    -- Resources
    crew_size INTEGER,
    required_equipment TEXT[] DEFAULT '{}',
    required_materials TEXT[] DEFAULT '{}',
    required_certifications TEXT[] DEFAULT '{}',

    -- Safety & Quality
    safety_protocols TEXT[] DEFAULT '{}',
    quality_standards TEXT[] DEFAULT '{}',
    required_documentation TEXT[] DEFAULT '{}',

    -- Notifications
    notify_inspector BOOLEAN DEFAULT false,
    client_visible BOOLEAN DEFAULT false,

    -- Location
    location TEXT,

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Order for Kanban
    kanban_order INTEGER DEFAULT 0
);

-- Task Comments
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    comment TEXT NOT NULL,
    mentions UUID[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Attachments
CREATE TABLE IF NOT EXISTS public.task_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    file_size BIGINT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECTION 4: PHOTO MANAGEMENT (FIELDSNAP)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

    -- File Info
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT,

    -- Photo Metadata (EXIF)
    width INTEGER,
    height INTEGER,
    camera_make TEXT,
    camera_model TEXT,
    iso INTEGER,
    aperture TEXT,
    shutter_speed TEXT,
    focal_length TEXT,

    -- Location
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_address TEXT,

    -- Capture Info
    captured_at TIMESTAMPTZ,
    weather_conditions JSONB,
    temperature DECIMAL(5, 2),

    -- Organization
    title TEXT,
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    category TEXT,
    phase TEXT,

    -- AI Analysis
    ai_tags TEXT[] DEFAULT '{}',
    ai_description TEXT,
    ai_detected_issues JSONB DEFAULT '[]'::jsonb,
    ai_analyzed_at TIMESTAMPTZ,

    -- Sharing
    is_public BOOLEAN DEFAULT false,
    shared_with UUID[] DEFAULT '{}',

    -- Storage
    storage_bucket TEXT DEFAULT 'project-photos',
    storage_path TEXT,

    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo Albums
CREATE TABLE IF NOT EXISTS public.photo_albums (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cover_photo_id UUID REFERENCES public.media_assets(id),
    photo_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Album Photos (Junction)
CREATE TABLE IF NOT EXISTS public.album_photos (
    album_id UUID NOT NULL REFERENCES public.photo_albums(id) ON DELETE CASCADE,
    photo_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    display_order INTEGER DEFAULT 0,
    PRIMARY KEY (album_id, photo_id)
);

-- SECTION 5: PUNCH LISTS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.punch_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'completed')),
    completion_percentage INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.punch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    punch_list_id UUID REFERENCES public.punch_lists(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    photo_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,

    -- Item Details
    title TEXT NOT NULL,
    description TEXT,
    location TEXT,
    trade TEXT CHECK (trade IN ('electrical', 'plumbing', 'hvac', 'concrete', 'framing', 'finishing', 'general', 'other')),

    -- Priority & Status
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'verified', 'closed')),

    -- Assignment
    assigned_to UUID REFERENCES public.user_profiles(id),
    assigned_by UUID REFERENCES public.user_profiles(id),

    -- Resolution
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.user_profiles(id),
    resolution_photo_id UUID REFERENCES public.media_assets(id),

    -- Verification
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES public.user_profiles(id),

    -- Due Date
    due_date DATE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECTION 6: QUOTES & ESTIMATES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),

    -- Quote Info
    quote_number TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted')),

    -- Client
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    client_address JSONB,
    client_id UUID REFERENCES public.crm_contacts(id),

    -- Pricing
    subtotal DECIMAL(15, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',

    -- Dates
    quote_date DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    accepted_date DATE,

    -- Template
    template_id UUID REFERENCES public.quote_templates(id),

    -- Terms
    terms_and_conditions TEXT,
    payment_terms TEXT,
    notes TEXT,

    -- Tracking
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,

    -- Conversion
    converted_to_project_id UUID REFERENCES public.projects(id),
    converted_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quote_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,

    -- Item Details
    item_type TEXT NOT NULL CHECK (item_type IN ('labor', 'material', 'equipment', 'subcontractor', 'overhead', 'profit')),
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'ea',
    unit_price DECIMAL(15, 2) NOT NULL,
    total DECIMAL(15, 2) NOT NULL,

    -- Optional Details
    notes TEXT,
    markup_percentage DECIMAL(5, 2),
    cost_price DECIMAL(15, 2),

    -- Order
    line_order INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.quote_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    name TEXT NOT NULL,
    description TEXT,
    project_type TEXT,
    default_terms TEXT,
    default_payment_terms TEXT,
    line_items JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Continue in next section due to length...
```

**Time Estimate:** 8-10 hours
**Priority:** 🔴 CRITICAL - Week 1

---

#### Step 1.1.2: Create RLS Policies
**Goal:** Ensure data isolation between companies

```sql
-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
-- ... (all tables)

-- User Profiles Policies
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can view company members"
    ON public.user_profiles FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );

-- Projects Policies
CREATE POLICY "Users can view company projects"
    ON public.projects FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create projects"
    ON public.projects FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update own projects"
    ON public.projects FOR UPDATE
    USING (user_id = auth.uid() OR project_manager_id = auth.uid())
    WITH CHECK (user_id = auth.uid() OR project_manager_id = auth.uid());

CREATE POLICY "Admins can delete projects"
    ON public.projects FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
            AND company_id = projects.company_id
        )
    );

-- Tasks Policies
CREATE POLICY "Users can view company tasks"
    ON public.tasks FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create tasks"
    ON public.tasks FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update assigned tasks"
    ON public.tasks FOR UPDATE
    USING (
        user_id = auth.uid()
        OR assignee_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
            AND company_id = tasks.company_id
        )
    );

-- Media Assets Policies
CREATE POLICY "Users can view company photos"
    ON public.media_assets FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
        )
        OR is_public = true
        OR auth.uid() = ANY(shared_with)
    );

CREATE POLICY "Users can upload photos"
    ON public.media_assets FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM public.user_profiles WHERE id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update own photos"
    ON public.media_assets FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own photos"
    ON public.media_assets FOR DELETE
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
            AND company_id = media_assets.company_id
        )
    );

-- ... Continue for all tables
```

**Time Estimate:** 6-8 hours
**Priority:** 🔴 CRITICAL - Week 1

---

#### Step 1.1.3: Create Performance Indexes

```sql
-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- User Profiles
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON public.user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON public.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_project_manager_id ON public.projects(project_manager_id);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);

-- Media Assets
CREATE INDEX IF NOT EXISTS idx_media_company_id ON public.media_assets(company_id);
CREATE INDEX IF NOT EXISTS idx_media_user_id ON public.media_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_media_project_id ON public.media_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_media_uploaded_at ON public.media_assets(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_tags ON public.media_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_media_ai_tags ON public.media_assets USING GIN(ai_tags);

-- Quotes
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON public.quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_projects_search ON public.projects USING GIN(
    to_tsvector('english', name || ' ' || COALESCE(client_name, '') || ' ' || COALESCE(description, ''))
);

CREATE INDEX IF NOT EXISTS idx_tasks_search ON public.tasks USING GIN(
    to_tsvector('english', title || ' ' || COALESCE(description, ''))
);
```

**Time Estimate:** 2-3 hours
**Priority:** 🔴 CRITICAL - Week 1

---

### 1.2 Migration System Setup

#### Step 1.2.1: Install Supabase Migrations

```bash
# Initialize Supabase migrations
supabase init

# Create migration from master schema
supabase db diff --schema public --file master_schema

# Create individual migrations
supabase migration new add_rls_policies
supabase migration new add_performance_indexes
supabase migration new add_functions_and_triggers
```

#### Step 1.2.2: Create Database Functions

```sql
-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ... (apply to all tables)

-- Function: Calculate project spent amount
CREATE OR REPLACE FUNCTION public.calculate_project_spent(project_uuid UUID)
RETURNS DECIMAL AS $$
    SELECT COALESCE(SUM(amount), 0)
    FROM public.project_expenses
    WHERE project_id = project_uuid;
$$ LANGUAGE SQL STABLE;

-- Function: Calculate storage usage
CREATE OR REPLACE FUNCTION public.calculate_storage_usage(company_uuid UUID)
RETURNS BIGINT AS $$
    SELECT COALESCE(SUM(file_size), 0)
    FROM public.media_assets
    WHERE company_id = company_uuid;
$$ LANGUAGE SQL STABLE;

-- Function: Get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(user_uuid UUID)
RETURNS JSONB AS $$
    SELECT settings->'permissions'
    FROM public.user_profiles
    WHERE id = user_uuid;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;
```

**Time Estimate:** 4-5 hours
**Priority:** 🟡 HIGH - Week 1

---

### 1.3 Database Testing & Validation

#### Step 1.3.1: RLS Policy Testing

**Create test suite:**

```typescript
// tests/database/rls-policies.test.ts

import { createClient } from '@supabase/supabase-js'

describe('RLS Policies', () => {
  let user1Client: any
  let user2Client: any

  beforeAll(async () => {
    // Create two test users in different companies
    user1Client = createClient(process.env.SUPABASE_URL!, process.env.TEST_USER1_KEY!)
    user2Client = createClient(process.env.SUPABASE_URL!, process.env.TEST_USER2_KEY!)
  })

  test('User 1 cannot see User 2 projects', async () => {
    // User 2 creates a project
    const { data: project } = await user2Client
      .from('projects')
      .insert({ name: 'Secret Project' })
      .select()
      .single()

    // User 1 tries to fetch it
    const { data: forbidden } = await user1Client
      .from('projects')
      .select()
      .eq('id', project.id)

    expect(forbidden).toHaveLength(0)
  })

  test('User can only update own tasks', async () => {
    // User 2 creates a task
    const { data: task } = await user2Client
      .from('tasks')
      .insert({ title: 'User 2 Task' })
      .select()
      .single()

    // User 1 tries to update it
    const { error } = await user1Client
      .from('tasks')
      .update({ title: 'Hacked!' })
      .eq('id', task.id)

    expect(error).toBeTruthy()
  })

  test('Admin can delete company projects', async () => {
    // Create admin user and regular user
    // Test admin can delete, regular user cannot
  })

  // 20+ more tests covering all RLS policies
})
```

**Time Estimate:** 8-10 hours
**Priority:** 🔴 CRITICAL - Week 2

---

## 🔒 SECTION 2: SECURITY & AUTHENTICATION

### 2.1 Authentication Hardening

#### Step 2.1.1: Standardize Supabase Client

**Problem:** Some files use deprecated `@supabase/auth-helpers-nextjs`

**Solution:** Create single client factory

```typescript
// lib/supabase/client.ts (UPDATED)

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1]
        },
        set(name: string, value: string, options: any) {
          document.cookie = `${name}=${value}; path=/; ${Object.entries(options).map(([k, v]) => `${k}=${v}`).join('; ')}`
        },
        remove(name: string, options: any) {
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        },
      },
    }
  )

  return client
}

// lib/supabase/server.ts (NEW)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export function createServerClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}
```

**Action:** Replace ALL instances of deprecated client

```bash
# Find all files using deprecated client
grep -r "createClientComponentClient" .
grep -r "@supabase/auth-helpers-nextjs" .

# Replace in CRM files
# app/crm/page.tsx
# app/reports/page.tsx
# components/crm/*.tsx
```

**Time Estimate:** 4-6 hours
**Priority:** 🔴 CRITICAL - Week 1

---

#### Step 2.1.2: Implement Company ID Consistency

**Problem:** company_id sourced from metadata AND profiles table

**Solution:** Single source of truth

```typescript
// lib/auth/get-user-company.ts (NEW)

import { createClient } from '@/lib/supabase/client'

export async function getUserCompany() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // ALWAYS get from profiles table (source of truth)
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('company_id, role, subscription_tier')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    console.error('Failed to get user company:', error)
    return null
  }

  return profile
}

// Usage everywhere:
const profile = await getUserCompany()
if (!profile) return redirect('/login')

const companyId = profile.company_id
```

**Action:** Replace ALL company_id lookups

**Time Estimate:** 3-4 hours
**Priority:** 🔴 CRITICAL - Week 1

---

#### Step 2.1.3: Remove Type Casting Violations

**Problem:** Multiple files use `as any`

**Solution:** Proper TypeScript types

```typescript
// types/quotehub.ts (UPDATED)

export interface QuoteClient {
  id?: string
  name: string
  email: string
  phone?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
  }
}

export interface Quote {
  id: string
  quote_number: string
  title: string
  client: QuoteClient  // Properly typed, not 'any'
  status: QuoteStatus
  total: number
  // ... rest
}

// app/quotes/[id]/page.tsx (FIXED)

// BAD:
const clientName = (quote.client as any).name

// GOOD:
const clientName = quote.client.name

// Even better with null checking:
const clientName = quote.client?.name ?? 'Unknown Client'
```

**Action:** Remove ALL `as any` casts

```bash
# Find all instances
grep -r "as any" app/
grep -r "as any" components/

# Files to fix:
# - app/quotes/[id]/page.tsx
# - components/quotes/*.tsx
# - Any other files with type casting
```

**Time Estimate:** 3-4 hours
**Priority:** 🟡 HIGH - Week 1

---

### 2.2 Security Audit & Penetration Testing

#### Step 2.2.1: Internal Security Checklist

```markdown
# Security Audit Checklist

## Authentication
- [ ] Password requirements enforced (12+ chars, special chars)
- [ ] Email verification required
- [ ] Password reset flow secure (tokens expire in 1 hour)
- [ ] Account lockout after 5 failed attempts
- [ ] Session timeout after 7 days
- [ ] Refresh token rotation working

## Authorization
- [ ] All RLS policies enabled
- [ ] Service role key never exposed to client
- [ ] API routes check user authentication
- [ ] User can only access own company data
- [ ] Admin actions require admin role
- [ ] File uploads check ownership

## Data Protection
- [ ] All data encrypted in transit (HTTPS)
- [ ] Database encrypted at rest
- [ ] API keys stored in environment variables
- [ ] Secrets never committed to Git
- [ ] File uploads virus-scanned (ClamAV)
- [ ] Sensitive data masked in logs

## Input Validation
- [ ] All form inputs validated
- [ ] SQL injection prevented (using Supabase client)
- [ ] XSS prevented (React escapes by default)
- [ ] CSRF tokens on state-changing requests
- [ ] File upload types restricted
- [ ] File upload size limited

## API Security
- [ ] Rate limiting on all endpoints (100 req/min)
- [ ] CORS configured correctly
- [ ] API versioning in place
- [ ] Error messages don't leak info
- [ ] Logging excludes sensitive data

## Compliance
- [ ] GDPR data export available
- [ ] GDPR data deletion working
- [ ] Privacy policy linked
- [ ] Terms of service linked
- [ ] Cookie consent banner
- [ ] Audit log for all data access
```

**Time Estimate:** 12-16 hours
**Priority:** 🔴 CRITICAL - Week 2

---

#### Step 2.2.2: Third-Party Security Audit

**Recommendation:** Hire security firm

**Options:**
1. **Cobalt.io** - Pentest as a Service ($5,000-10,000)
2. **Bugcrowd** - Bug bounty platform ($2,000-5,000)
3. **HackerOne** - Bug bounty ($3,000-7,000)

**Deliverables:**
- Penetration test report
- Vulnerability assessment
- Remediation recommendations
- Compliance certification (SOC2 prep)

**Time Estimate:** 2-3 weeks external
**Priority:** 🟡 HIGH - Week 8-10
**Budget:** $5,000-10,000

---

## ⚡ SECTION 3: PERFORMANCE OPTIMIZATION

### 3.1 Implement Pagination Everywhere

**Problem:** All list views load ALL records

**Solution:** Cursor-based pagination

```typescript
// lib/pagination.ts (NEW)

export interface PaginationParams {
  limit?: number
  cursor?: string
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  nextCursor: string | null
  hasMore: boolean
  total?: number
}

export async function paginatedQuery<T>(
  tableName: string,
  params: PaginationParams = {}
): Promise<PaginatedResponse<T>> {
  const {
    limit = 50,
    cursor,
    orderBy = 'created_at',
    orderDirection = 'desc'
  } = params

  const supabase = createClient()

  let query = supabase
    .from(tableName)
    .select('*', { count: 'exact' })

  if (cursor) {
    query = query.gt(orderBy, cursor)
  }

  query = query
    .order(orderBy, { ascending: orderDirection === 'asc' })
    .limit(limit + 1)  // Fetch one extra to know if there's more

  const { data, error, count } = await query

  if (error) throw error

  const hasMore = (data?.length ?? 0) > limit
  const records = hasMore ? data!.slice(0, -1) : (data ?? [])
  const nextCursor = hasMore ? records[records.length - 1][orderBy] : null

  return {
    data: records as T[],
    nextCursor,
    hasMore,
    total: count ?? undefined
  }
}
```

**Apply to all list views:**

```typescript
// app/projects/page.tsx (UPDATED)

'use client'

import { useState, useEffect } from 'react'
import { paginatedQuery } from '@/lib/pagination'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const loadProjects = async () => {
    setLoading(true)
    try {
      const result = await paginatedQuery<Project>('projects', {
        limit: 50,
        cursor: cursor ?? undefined
      })

      setProjects(prev => [...prev, ...result.data])
      setCursor(result.nextCursor)
      setHasMore(result.hasMore)
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  return (
    <div>
      <div className="grid gap-4">
        {projects.map(project => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={loadProjects}
          disabled={loading}
          className="mt-4"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  )
}
```

**Pages to update:**
- ✅ app/projects/page.tsx
- ✅ app/taskflow/page.tsx
- ✅ app/fieldsnap/page.tsx
- ✅ app/quotes/page.tsx
- ✅ app/crm/contacts/page.tsx
- ✅ app/crm/leads/page.tsx

**Time Estimate:** 8-10 hours
**Priority:** 🔴 CRITICAL - Week 2

---

### 3.2 Code Splitting & Lazy Loading

**Problem:** All modules loaded on dashboard

**Solution:** Route-based code splitting

```typescript
// app/dashboard/page.tsx (UPDATED)

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Lazy load heavy components
const WeatherWidget = dynamic(() => import('@/components/dashboard/WeatherWidget'), {
  loading: () => <WidgetSkeleton />,
  ssr: false
})

const GanttChart = dynamic(() => import('@/components/dashboard/GanttChart'), {
  loading: () => <WidgetSkeleton />,
  ssr: false
})

const TeamHeatmap = dynamic(() => import('@/components/dashboard/TeamHeatmap'), {
  loading: () => <WidgetSkeleton />,
  ssr: false
})

export default function DashboardPage() {
  return (
    <div className="grid gap-6">
      {/* Always load critical stats */}
      <DashboardStats />

      {/* Lazy load widgets */}
      <Suspense fallback={<WidgetSkeleton />}>
        <WeatherWidget />
      </Suspense>

      <Suspense fallback={<WidgetSkeleton />}>
        <GanttChart />
      </Suspense>

      <Suspense fallback={<WidgetSkeleton />}>
        <TeamHeatmap />
      </Suspense>
    </div>
  )
}
```

**Time Estimate:** 4-6 hours
**Priority:** 🟡 HIGH - Week 2

---

### 3.3 Implement Caching with SWR

```typescript
// lib/api/use-projects.ts (NEW)

import useSWR from 'swr'
import { paginatedQuery } from '@/lib/pagination'

const fetcher = () => paginatedQuery<Project>('projects', { limit: 50 })

export function useProjects() {
  const { data, error, mutate } = useSWR('/api/projects', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    refreshInterval: 30000  // Refresh every 30 seconds
  })

  return {
    projects: data?.data ?? [],
    isLoading: !error && !data,
    isError: error,
    mutate  // For optimistic updates
  }
}

// Usage in components:
const { projects, isLoading, mutate } = useProjects()
```

**Apply to all data fetching**

**Time Estimate:** 6-8 hours
**Priority:** 🟡 HIGH - Week 3

---

This completes **PART 1** of the Enterprise Implementation Master Plan.

**Part 1 covers:**
✅ Database Architecture Overhaul
✅ Security & Authentication
✅ Performance Optimization

**Coming in Part 2:**
- Dashboard Module (complete refactor)
- Projects Module (enhancements)
- TaskFlow Module (advanced features)
- FieldSnap Module (AI implementation)
- QuoteHub Module (PDF/email)
- Punch Lists Module
- Teams & RBAC Module
- CRM Suite Module

Shall I continue with Part 2?