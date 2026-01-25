# AI Use Cases: Navigation & UX Strategy
**Date:** January 7, 2026
**For:** AWS Partner Meeting - Sierra Suites Platform Architecture

---

## 📊 CURRENT SITE STRUCTURE ANALYSIS

### **Existing Routes:**

```
/ (landing page)
├── /login
├── /register
├── /dashboard ✅ (main entry point after login)
│
├── /ai ✅ (AI Command Center - exists!)
│   ├── /ai/predictor (Project Predictor)
│   ├── /ai/estimator (Smart Estimator)
│   ├── /ai/blueprints (Blueprint Analyzer)
│   ├── /ai/safety (Safety Sentinel)
│   ├── /ai/materials (Material Optimizer)
│   ├── /ai/site (Site Intelligence)
│   └── /ai/contracts (Contract Guardian)
│
├── /projects
│   ├── /projects/[id]/punch-list
│   ├── /projects/design-selections
│   ├── /projects/approvals
│   └── /projects/turnover
│
├── /taskflow (Kanban/Calendar)
├── /fieldsnap (Photo management)
├── /quotes (QuoteHub)
├── /teams (Team management)
│
├── /reports
│   ├── /reports/daily/new
│   ├── /reports/timesheets
│   ├── /reports/analytics
│   ├── /reports/automation
│   └── /reports/client-builder
│
├── /crm
│   ├── /crm/contacts
│   ├── /crm/leads
│   ├── /crm/activities
│   ├── /crm/email
│   ├── /crm/integrations
│   └── /crm/communication-templates
│
└── /sustainability ✅ (exists!)
    ├── /sustainability/carbon
    ├── /sustainability/waste
    ├── /sustainability/materials
    └── /sustainability/certifications
```

---

## 🎯 CURRENT AI STRUCTURE

You **ALREADY HAVE** an `/ai` section with 7 tools:
1. ✅ Project Predictor (`/ai/predictor`)
2. ✅ Smart Estimator (`/ai/estimator`)
3. ✅ Blueprint Analyzer (`/ai/blueprints`)
4. ✅ Safety Sentinel (`/ai/safety`)
5. ✅ Material Optimizer (`/ai/materials`)
6. ✅ Site Intelligence (`/ai/site`)
7. ✅ Contract Guardian (`/ai/contracts`)

**Main AI Hub:** `/ai/page.tsx` - This is your "AI Command Center"

### **What the AI Command Center Currently Shows:**
- Live Project Health Monitor (health scores for each project)
- Critical Predictions (delays, risks)
- AI Recommendations (proactive suggestions)
- Quick access cards to 7 AI tools
- Chat interface ("Ask Sierra" - AI co-pilot)
- Stats: Projects monitored, high-risk count, recommendations, estimated savings

---

## 💡 RECOMMENDED NAVIGATION STRATEGY FOR 11 NEW USE CASES

### **OPTION A: Expand Existing `/ai` Section** ⭐⭐⭐⭐⭐ (RECOMMENDED)

**Why this is best:**
- ✅ Users already know to go to `/ai` for AI features
- ✅ Consistent with existing structure
- ✅ Clean, organized, scalable
- ✅ No confusion about where AI features live

**New routes to add:**

```
/ai
├── [EXISTING] /ai/predictor (Project Predictor - weather delays)
├── [EXISTING] /ai/estimator (Smart Estimator - cost prediction)
├── [EXISTING] /ai/safety (Safety Sentinel - OSHA risks)
├── [EXISTING] /ai/materials (Material Optimizer)
├── [NEW] /ai/timeline (Timeline Predictor - permit approval times)
├── [NEW] /ai/change-orders (Change Order Predictor - cost variance)
├── [NEW] /ai/carbon (Carbon Footprint Estimator - move from /sustainability?)
├── [NEW] /ai/risk-score (Total Risk Score - composite dashboard)
├── [NEW] /ai/description-estimator (Description-Based Estimator)
├── [NEW] /ai/violations (Violation Risk Predictor)
└── [NEW] /ai/inspections (Inspection Failure Predictor)
```

**Updated AI Command Center grid (11 tools displayed):**

```
┌──────────────────────────────────────────────────────────┐
│  AI TOOLS                                                 │
├──────────────────────────────────────────────────────────┤
│  🔮 Project       ⚡ Smart        📐 Blueprint            │
│  Predictor        Estimator       Analyzer                │
│                                                           │
│  🛡️ Safety       💎 Material     📊 Timeline             │
│  Sentinel         Optimizer       Predictor               │
│                                                           │
│  📈 Change        🌱 Carbon       🎯 Total Risk           │
│  Order Pred.      Estimator       Score                   │
│                                                           │
│  📝 Description   ⚠️ Violation    🔍 Inspection           │
│  Estimator        Predictor       Predictor               │
└──────────────────────────────────────────────────────────┘
```

---

### **OPTION B: Create Contextual Access Points** ⭐⭐⭐⭐

**Place AI features where users need them:**

**1. Within Projects (`/projects`)**
```
/projects/[id]
├── Overview tab
│   └── AI Risk Score widget (shows Total Risk Score for THIS project)
├── Budget tab
│   ├── Smart Estimator button
│   ├── Change Order Predictor widget
│   └── Description-Based Estimator (if no sqft)
├── Timeline tab
│   ├── Timeline Predictor (permit delays)
│   └── Project Predictor (weather delays)
├── Safety tab
│   ├── Safety Sentinel widget
│   ├── Violation Risk Predictor
│   └── Inspection Failure Predictor
└── Sustainability tab
    └── Carbon Footprint Estimator
```

**2. Within Dashboard (`/dashboard`)**
```
Dashboard widgets:
- "AI Insights" card (top 3 predictions across all projects)
- "High Risk Projects" card (uses Total Risk Score)
- Quick action: "Get AI Estimate" → /ai/estimator
- Quick action: "Check Project Risks" → /ai/risk-score
```

**3. Within Sustainability (`/sustainability`)**
```
/sustainability
├── /carbon (Carbon Footprint Estimator - AI-powered)
├── /materials (links to AI Material Optimizer)
└── /certifications (LEED automation - future)
```

---

### **OPTION C: Hybrid Approach** ⭐⭐⭐⭐⭐ (BEST OF BOTH WORLDS)

**Combine centralized + contextual access:**

1. **Keep `/ai` as the central hub** - All 11 use cases have dedicated pages here
2. **Embed AI widgets contextually** - Place relevant AI insights where users work
3. **Add "Powered by AI" badges** - Show AI features throughout the platform

**Example user flow:**

```
User is viewing Project "123 Main St Renovation"
├── Dashboard → sees "High Risk" warning
│   └── Clicks "View AI Analysis" → /ai/risk-score?project=123
│
├── Project Page → Budget tab
│   ├── Sees "AI Prediction: 18% chance of cost overrun"
│   └── Clicks "View Full Analysis" → /ai/change-orders?project=123
│
└── Project Page → Timeline tab
    ├── Sees "AI Prediction: Permit approval in 28-34 days"
    └── Clicks "View Full Analysis" → /ai/timeline?project=123
```

---

## 🎨 UI/UX RECOMMENDATIONS

### **1. Navigation Sidebar (Dashboard)**

```
┌─────────────────────────────────────┐
│  SIERRA SUITES                      │
├─────────────────────────────────────┤
│  🏠 Dashboard                       │
│  📊 Projects                        │
│  ✅ TaskFlow                        │
│  📸 FieldSnap                       │
│  💰 Quotes                          │
│  📈 Reports                         │
│  👥 Teams                           │
│  💬 CRM                             │
│                                     │
│  ─────────────────────────          │
│                                     │
│  🤖 AI COMMAND CENTER ⭐            │
│    ├─ Project Predictor             │
│    ├─ Smart Estimator               │
│    ├─ Safety Sentinel               │
│    ├─ Timeline Predictor            │
│    ├─ Change Orders                 │
│    ├─ Carbon Estimator              │
│    ├─ Risk Score                    │
│    └─ [+4 more AI tools]            │
│                                     │
│  ─────────────────────────          │
│                                     │
│  🌱 Sustainability                  │
│  ⚙️ Settings                        │
└─────────────────────────────────────┘
```

**Key changes:**
- ✅ "AI COMMAND CENTER" is a collapsible section
- ✅ Star icon (⭐) indicates premium/special feature
- ✅ Shows top 6 AI tools, "+4 more" expands
- ✅ Clicking main "AI COMMAND CENTER" goes to `/ai` hub

---

### **2. AI Command Center Hub Page (`/ai`)**

**Layout structure:**

```
┌───────────────────────────────────────────────────────────┐
│  🎯 AI COMMAND CENTER                                     │
│  Mission control for your construction projects           │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  [Stats Row]                                              │
│  📊 12 Projects  🚨 2 High Risk  💡 8 Recommendations     │
│  💰 $47,200 Potential Savings  ✅ 89% AI Accuracy         │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  AI TOOLS                                                 │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ 🔮 Project│ ⚡ Smart  │ 📊 Timeline│ 📈 Change │        │
│  │ Predictor │ Estimator│ Predictor │ Orders   │          │
│  │ Weather   │ Cost AI  │ Permit AI │ Cost Var │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ 🛡️ Safety │ 💎 Material│ 🌱 Carbon │ 🎯 Total │        │
│  │ Sentinel  │ Optimizer│ Estimator│ Risk     │          │
│  │ OSHA AI   │ Save $    │ ESG Ready│ Score    │          │
│  └──────────┴──────────┴──────────┴──────────┘          │
│  ┌──────────┬──────────┬──────────┬──────────┐          │
│  │ 📝 Desc.  │ ⚠️ Violation│ 🔍 Inspect.│ 📐 Blueprint│     │
│  │ Estimator │ Predictor│ Predictor│ Analyzer │          │
│  │ No sqft?  │ Code Risk│ Pass/Fail│ Find Issues│         │
│  └──────────┴──────────┴──────────┴──────────┘          │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  LIVE PROJECT HEALTH         │  AI RECOMMENDATIONS        │
│  ┌─────────────────────┐    │  ┌──────────────────────┐ │
│  │ Project A  ✅ 92     │    │  │ ⚡ HIGH: Order         │ │
│  │ Project B  ⚠️ 67     │    │  │    windows early      │ │
│  │ Project C  🚨 45     │    │  │ 💡 MED: Reschedule    │ │
│  └─────────────────────┘    │  │    concrete pour      │ │
│                              │  └──────────────────────┘ │
│                                                           │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  💬 ASK SIERRA (AI Chat)                                 │
│  "Ask me about delays, costs, safety, materials..."      │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

**Key elements:**
1. **Hero section** - Stats showing AI value (savings, accuracy)
2. **Tool grid** - 11 AI tools displayed as cards with icons + 1-liner descriptions
3. **Live insights** - Project health + recommendations (contextual)
4. **AI chat** - "Ask Sierra" conversational interface at bottom

---

### **3. Individual AI Tool Pages**

**Each AI tool follows this template:**

```
/ai/[tool-name]

┌───────────────────────────────────────────────────────────┐
│  [BREADCRUMB] AI Command Center > Tool Name               │
├───────────────────────────────────────────────────────────┤
│                                                           │
│  🔮 [ICON] TOOL NAME                                      │
│  Brief description of what this AI does                   │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  INPUT SECTION                                   │    │
│  │  Project: [Dropdown]                             │    │
│  │  OR Enter details manually:                      │    │
│  │  - [Relevant fields based on use case]           │    │
│  │  [Run AI Analysis Button]                        │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  RESULTS SECTION                                 │    │
│  │  📊 Prediction: [Main result]                    │    │
│  │  📈 Confidence: 89%                              │    │
│  │  💡 Recommendation: [Action to take]            │    │
│  │  💰 Potential savings: $X,XXX                    │    │
│  │                                                   │    │
│  │  [Detailed breakdown / charts / tables]          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │  HISTORICAL RESULTS                              │    │
│  │  Past predictions for this project type          │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  [Export PDF] [Share Results] [Save to Project]          │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

## 🚀 IMPLEMENTATION PHASES

### **Phase 1: Foundation (Week 1-2)**
✅ Already done - `/ai` hub exists
- Audit existing 7 AI tool pages
- Document current data flows
- Plan AWS Lambda endpoints

### **Phase 2: Add 11 New Use Cases (Week 3-6)**
Create routes + basic UI:
1. `/ai/timeline` - Timeline Predictor
2. `/ai/change-orders` - Change Order Predictor
3. `/ai/carbon` - Carbon Estimator (migrate from /sustainability)
4. `/ai/risk-score` - Total Risk Score
5. `/ai/description-estimator` - Description-Based Estimator
6. `/ai/violations` - Violation Risk Predictor
7. `/ai/inspections` - Inspection Failure Predictor

Keep existing:
8. `/ai/predictor` - Project Predictor (update with weather API)
9. `/ai/estimator` - Smart Estimator (connect to 500K permits)
10. `/ai/safety` - Safety Sentinel (connect to OSHA data)
11. `/ai/materials` - Material Optimizer

### **Phase 3: Contextual Embedding (Week 7-8)**
Add AI widgets to:
- Project pages (risk score, cost prediction)
- Dashboard (top insights)
- Budget/timeline tabs (contextual predictions)

### **Phase 4: AWS Integration (Week 9-12)**
- Connect all 11 tools to AWS Lambda endpoints
- Real ML predictions (not demo data)
- Supabase hybrid queries

---

## 📱 MOBILE CONSIDERATIONS

**Responsive navigation:**
```
Mobile (< 768px):
- Hamburger menu shows all sections
- AI Command Center is a tab in bottom nav
- Individual AI tools are full-screen modals
- Chat interface is floating button (bottom-right)

Tablet (768px - 1024px):
- Collapsible sidebar (default collapsed)
- AI tools grid is 2x2 instead of 4x3
- All features accessible

Desktop (> 1024px):
- Full sidebar always visible
- AI tools grid is 4x3
- Chat interface is right-side panel
```

---

## 🎯 FINAL RECOMMENDATION

**Use OPTION C: Hybrid Approach**

1. **Keep `/ai` as central hub** for all 11 AI use cases
2. **Embed AI widgets** throughout the platform (projects, dashboard, reports)
3. **Add breadcrumbs** to help users navigate back to AI Command Center
4. **Use "Powered by AI" badges** to indicate AI-enhanced features

**User journey example:**
```
Dashboard → sees "Project at risk" widget
  → clicks "View AI Analysis"
    → goes to /ai/risk-score?project=123
      → sees composite risk score + breakdown
        → clicks "View Change Order Risk"
          → goes to /ai/change-orders?project=123
            → sees detailed cost variance prediction
```

**Benefits:**
- ✅ Users can access AI from anywhere (contextual)
- ✅ Users can browse all AI tools in one place (`/ai`)
- ✅ Clear navigation hierarchy
- ✅ Scalable (can add more AI tools easily)
- ✅ Mobile-friendly

---

**END OF DOCUMENT**
