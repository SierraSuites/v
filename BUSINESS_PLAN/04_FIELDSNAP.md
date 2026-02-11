# FIELDSNAP - COMPLETE IMPLEMENTATION PLAN

**Module**: Photo & Media Management with AI Analysis
**Current Status**: 45% Complete (UI Exists, Backend Limited)
**Target Status**: 95% Complete
**Priority**: HIGH (Visual Documentation is Critical)
**Timeline**: 3 weeks

---

## BUSINESS PURPOSE

Construction is a visual business. Photos are:
1. **Legal Protection** - Prove work was done correctly
2. **Progress Documentation** - Show clients what's happening
3. **Quality Control** - Catch defects before they become problems
4. **Change Order Evidence** - Document unforeseen conditions
5. **Marketing Material** - Before/after photos sell future jobs

**User Story**: "I'm a superintendent with 3 active sites. Every day I take 50-100 photos on my phone - progress, issues, deliveries, site conditions. I need those photos organized by project, searchable, and accessible to the office team. When a client asks 'what did the framing look like before drywall?' I need to find that photo in 10 seconds, not 10 minutes."

---

## CURRENT STATE ANALYSIS

### What Works ✅
- **Upload functionality** - Can upload photos
- **Basic organization** - Photos are stored per project
- **Grid/List views** - Multiple viewing modes
- **Search** - Can search photos
- **Filter by project** - Project-based filtering
- **GPS tagging** - Captures location from EXIF
- **Real-time updates** - Subscriptions work
- **Storage tracking** - Knows how much storage used
- **Tags** - Can tag photos

### What's Broken/Limited ❌
- **AI analysis is probably fake** - Claims to have AI but likely just calls Claude API, not real computer vision
- **No batch upload** - Must upload one at a time
- **No mobile optimization** - Hard to use from phone on site
- **Storage limits unclear** - Says "10GB default" but not enforced
- **No photo organization** - Can't create albums or folders
- **No before/after comparison** - Can't link related photos
- **No drawing/annotation** - Can't mark up photos
- **No offline mode** - Must have internet to upload
- **Slow loading** - Loads all photos at once, no pagination
- **No video support** - Photos only

### What's Missing Completely ❌
- **Real Computer Vision AI** - Actual object detection, not just text analysis
- **Auto-Categorization** - Auto-tag by what's in photo (framing, electrical, plumbing)
- **Safety Detection** - Detect missing PPE, unsafe scaffolding, etc.
- **Quality Scoring** - Auto-score photo quality (blurry, dark, etc.)
- **Automatic Organization** - Auto-organize by date, project phase, location
- **Drawing Integration** - Link photos to specific plan locations
- **Time-lapse Generation** - Create time-lapse videos automatically
- **Comparison Tools** - Side-by-side before/after
- **Photo Reports** - Auto-generate photo reports for clients
- **Smart Search** - "Find all photos of electrical rough-in from last week"
- **OCR for Documents** - Photo of invoice → extract data
- **Defect Tracking** - Photo of issue → create punch list item
- **Photo Albums** - Curated collections for clients
- **Watermarking** - Add company logo to photos
- **Exif Data Preservation** - Keep camera info, settings
- **Duplicate Detection** - Avoid uploading same photo twice
- **Archive Old Photos** - Move completed projects to cold storage

---

## COMPLETE FEATURE SPECIFICATION

### 1. **Enhanced Upload Experience** (Priority: CRITICAL)

**Current**: Single file upload
**Needed**: Bulk upload with smart processing

#### Upload Flow:

```
📸 UPLOAD PHOTOS

DRAG & DROP or CLICK TO BROWSE
┌────────────────────────────────────────────────────┐
│                                                    │
│         Drop photos here                           │
│         or click to select files                   │
│                                                    │
│    📱 Supports: JPG, PNG, HEIC, MP4, MOV          │
│    📊 Max 50 files at once, 100MB each            │
│                                                    │
└────────────────────────────────────────────────────┘

UPLOAD QUEUE (12 files):
┌────────────────────────────────────────────────────┐
│ IMG_2045.jpg  ████████░░  Uploading 80%           │
│ IMG_2046.jpg  ██████████  ✅ Complete              │
│ IMG_2047.jpg  ░░░░░░░░░░  Waiting...              │
│ ...                                                │
└────────────────────────────────────────────────────┘

AUTO-DETECTED INFO:
Project: Downtown Office (from GPS) ✅
Date: Jan 22, 2026 (from EXIF) ✅
Location: Floor 3, North Wing (from GPS) ✅

BATCH SETTINGS:
┌────────────────────────────────────────────────────┐
│ Apply to all photos:                               │
│                                                    │
│ Project: [Downtown Office ▼]                      │
│ Phase: [Framing ▼]                                 │
│ Tags: [progress] [framing] [floor-3]              │
│ Description: Optional notes...                     │
│                                                    │
│ ☑ Auto-analyze with AI                            │
│ ☑ Extract EXIF data                               │
│ ☑ Auto-organize by date                           │
│ ☑ Notify team                                     │
│                                                    │
│ [Cancel] [Upload 12 Photos]                       │
└────────────────────────────────────────────────────┘
```

**Smart Features**:
- **Auto-detect project from GPS** - Match coordinates to project address
- **Auto-extract timestamp** - From EXIF data
- **Auto-rotate** - Fix orientation from phone
- **Auto-compress** - Optimize for web (keep original in storage)
- **Generate thumbnails** - Multiple sizes for different uses
- **Background upload** - Continue browsing while uploading
- **Resume interrupted uploads** - Handle poor connectivity
- **Duplicate detection** - "This photo looks similar to one uploaded yesterday"

Database Schema:
```sql
-- Enhance media_assets table
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64); -- SHA256 for duplicate detection
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS thumbnail_small_url TEXT; -- 150x150
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS thumbnail_medium_url TEXT; -- 400x400
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS thumbnail_large_url TEXT; -- 800x800

-- EXIF data
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS exif_data JSONB;
/* Example:
{
  "camera_make": "Apple",
  "camera_model": "iPhone 14 Pro",
  "focal_length": "6.86mm",
  "aperture": "f/1.78",
  "iso": 320,
  "shutter_speed": "1/120",
  "flash": false,
  "orientation": 1
}
*/

-- GPS enhanced
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS gps_accuracy_meters DECIMAL(10, 2);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS gps_altitude_meters DECIMAL(10, 2);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS location_address TEXT; -- Reverse geocoded address

-- Auto-categorization
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS auto_category TEXT; -- 'site', 'progress', 'issue', 'delivery', 'team', 'document'
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS auto_phase TEXT; -- 'demo', 'foundation', 'framing', 'rough-in', 'finish', etc.
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3, 2); -- 0.00 to 1.00

-- Quality metrics
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS quality_score INT; -- 0-100
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_blurry BOOLEAN DEFAULT false;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_dark BOOLEAN DEFAULT false;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES media_assets(id);

-- Video support
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS duration_seconds INT; -- For videos
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS video_codec TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT false; -- Video transcoding status

-- Backup and archival
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS archive_url TEXT; -- Glacier/S3 cold storage URL
```

Implementation Tasks:
- [ ] Implement chunked file upload (handle large files)
- [ ] Build batch upload queue UI
- [ ] Add drag-and-drop support
- [ ] Extract EXIF data server-side
- [ ] Generate multiple thumbnail sizes
- [ ] Implement duplicate detection (perceptual hashing)
- [ ] Add progress tracking per file
- [ ] Handle upload resumption
- [ ] Optimize image compression (WebP conversion)
- [ ] Add video transcoding support

---

### 2. **Real Computer Vision AI** (Priority: CRITICAL)

**Current**: Claims AI analysis, likely just Claude API
**Needed**: Actual object detection and scene understanding

#### AI Capabilities:

**A. Object Detection**
```
🤖 AI ANALYSIS RESULTS

Photo: IMG_2045.jpg
Uploaded: Jan 22, 2026 3:45 PM

DETECTED OBJECTS (12):
High Confidence (>90%):
├─ 🔨 Worker (3 people) - 96%
├─ 🏗️ Scaffolding - 94%
├─ 🧱 Concrete blocks - 93%
├─ 🪜 Ladder - 91%

Medium Confidence (70-90%):
├─ 🔌 Electrical conduit - 82%
├─ 📦 Material delivery - 78%
└─ ⚠️ Caution sign - 75%

CONSTRUCTION PHASE: Framing (92% confidence)
LOCATION TYPE: Interior - Upper Floor
WEATHER: Overcast

SAFETY ANALYSIS:
✅ All workers wearing hard hats
⚠️ One worker without high-vis vest
✅ Scaffolding appears properly secured
✅ Work area properly barricaded

QUALITY INDICATORS:
✅ Clean work area
✅ Materials organized
⚠️ Some debris visible

AUTO-GENERATED TAGS:
#framing #workers #safety #progress #interior

RECOMMENDATIONS:
• Tag as "Progress Photo"
• Link to Framing phase
• Add to safety review queue (vest issue)
```

**B. Defect Detection**
```
🔍 QUALITY INSPECTION

Photo: IMG_2052.jpg

⚠️ POTENTIAL DEFECTS DETECTED:

1. Crack in concrete (Medium confidence: 78%)
   Location: Bottom-left quadrant
   Size: ~12 inches
   Severity: Medium
   [Create Punch List Item] [Mark as False Positive]

2. Uneven surface (Low confidence: 62%)
   Location: Center area
   Severity: Low
   [Review Needed]

RECOMMENDATION: Have engineer review concrete crack
```

**C. Safety Hazard Detection**
```
🚨 SAFETY ALERT

Photo: IMG_2048.jpg

HAZARDS DETECTED:
🔴 CRITICAL:
   • Worker at height without fall protection (89% conf)
   • Unsecured ladder (82% conf)

🟡 WARNING:
   • No safety signage visible (71% conf)
   • Possible electrical hazard (68% conf)

ACTIONS TAKEN:
✅ Safety team notified
✅ Added to incident review
✅ Flagged for immediate attention

[Dismiss as False Positive] [Confirm Hazard] [Create Incident Report]
```

#### Implementation Options:

**Option A: Cloud AI Services** (Recommended for Phase 1)
- **Google Cloud Vision API** or **AWS Rekognition**
- Pros: Fast, accurate, no training needed, cheap ($1.50/1000 images)
- Cons: Ongoing costs, requires internet, generic (not construction-specific)

**Option B: Custom ML Model** (Phase 2)
- Train on construction photo dataset
- Pros: Construction-specific, one-time cost, offline capable
- Cons: Expensive to build ($50K+), requires ML expertise, ongoing training

**Recommended Approach**: Start with Google Vision API, add custom model later

```typescript
// lib/ai-vision.ts

import vision from '@google-cloud/vision'

const client = new vision.ImageAnnotatorClient()

export async function analyzeConstructionPhoto(imageUrl: string) {
  // 1. Object Detection
  const [objectsResult] = await client.objectLocalization(imageUrl)
  const objects = objectsResult.localizedObjectAnnotations

  // 2. Label Detection (scene understanding)
  const [labelsResult] = await client.labelDetection(imageUrl)
  const labels = labelsResult.labelAnnotations

  // 3. Text Detection (for signs, documents)
  const [textResult] = await client.textDetection(imageUrl)
  const text = textResult.fullTextAnnotation?.text

  // 4. Safe Search (filter inappropriate content)
  const [safeSearchResult] = await client.safeSearchDetection(imageUrl)
  const safeSearch = safeSearchResult.safeSearchAnnotation

  // 5. Custom Analysis Logic
  const analysis = {
    // Detect construction phase
    phase: detectConstructionPhase(labels, objects),

    // Detect safety issues
    safetyIssues: detectSafetyHazards(objects, labels),

    // Detect quality issues
    qualityIssues: detectQualityIssues(labels),

    // Detect workers
    workerCount: objects.filter(o => o.name === 'Person').length,

    // Detect PPE
    hardHats: detectHardHats(objects),
    safetyVests: detectSafetyVests(objects),

    // Extract text from documents
    extractedText: text,

    // Categorize photo
    category: categorizePhoto(labels, objects),

    // Quality score
    qualityScore: calculatePhotoQuality(imageUrl),

    // All detected objects
    objects: objects.map(o => ({
      name: o.name,
      confidence: o.score,
      boundingBox: o.boundingPoly
    })),

    // All labels
    labels: labels.map(l => ({
      description: l.description,
      confidence: l.score
    }))
  }

  return analysis
}

function detectConstructionPhase(labels, objects) {
  const phaseKeywords = {
    demolition: ['demolition', 'debris', 'rubble', 'excavation'],
    foundation: ['concrete', 'rebar', 'formwork', 'foundation'],
    framing: ['lumber', 'framing', 'studs', 'joists', 'wood'],
    rough_in: ['electrical', 'plumbing', 'hvac', 'conduit', 'pipe'],
    drywall: ['drywall', 'sheetrock', 'taping', 'mudding'],
    finish: ['paint', 'flooring', 'tile', 'fixtures', 'trim']
  }

  // Match labels against phase keywords
  for (const [phase, keywords] of Object.entries(phaseKeywords)) {
    const matches = labels.filter(l =>
      keywords.some(kw => l.description.toLowerCase().includes(kw))
    )

    if (matches.length > 0) {
      return {
        phase,
        confidence: Math.max(...matches.map(m => m.score))
      }
    }
  }

  return { phase: 'unknown', confidence: 0 }
}

function detectSafetyHazards(objects, labels) {
  const hazards = []

  // Check for workers at height without protection
  const workersAtHeight = objects.filter(o =>
    o.name === 'Person' &&
    (labels.some(l => ['ladder', 'scaffolding', 'roof'].includes(l.description.toLowerCase())))
  )

  if (workersAtHeight.length > 0) {
    // Check if fall protection visible
    const fallProtection = labels.some(l =>
      ['harness', 'lanyard', 'guardrail'].includes(l.description.toLowerCase())
    )

    if (!fallProtection) {
      hazards.push({
        type: 'fall_protection',
        severity: 'critical',
        description: 'Worker at height without visible fall protection',
        confidence: 0.75
      })
    }
  }

  // Check for electrical hazards
  if (labels.some(l => ['wire', 'electrical', 'power'].includes(l.description.toLowerCase()))) {
    const waterPresent = labels.some(l => ['water', 'wet', 'rain'].includes(l.description.toLowerCase()))
    if (waterPresent) {
      hazards.push({
        type: 'electrical_hazard',
        severity: 'critical',
        description: 'Potential electrical hazard near water',
        confidence: 0.65
      })
    }
  }

  // More hazard detection logic...

  return hazards
}

function detectHardHats(objects) {
  // This requires a custom-trained model
  // For now, use heuristics with generic Vision API
  const people = objects.filter(o => o.name === 'Person')
  const helmets = objects.filter(o =>
    ['helmet', 'hard hat', 'safety helmet'].includes(o.name.toLowerCase())
  )

  return {
    peopleCount: people.length,
    helmetCount: helmets.length,
    compliance: helmets.length >= people.length
  }
}

async function calculatePhotoQuality(imageUrl: string) {
  // Use image properties to assess quality
  const [result] = await client.imageProperties(imageUrl)
  const props = result.imagePropertiesAnnotation

  let score = 100

  // Check if image is too dark
  const avgBrightness = props.dominantColors.colors.reduce((sum, c) =>
    sum + (c.color.red + c.color.green + c.color.blue) / 3, 0
  ) / props.dominantColors.colors.length

  if (avgBrightness < 50) score -= 20  // Too dark
  if (avgBrightness > 250) score -= 15 // Overexposed

  // Additional quality checks would go here
  // (blur detection requires additional processing)

  return Math.max(0, Math.min(100, score))
}
```

Database Updates:
```sql
-- Store AI analysis results
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS ai_analysis_completed BOOLEAN DEFAULT false;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS ai_analysis_timestamp TIMESTAMPTZ;

-- Detailed AI results
CREATE TABLE ai_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),

  -- Detection
  object_type TEXT NOT NULL, -- 'person', 'hardhat', 'ladder', 'scaffold', etc.
  confidence DECIMAL(3, 2) NOT NULL,

  -- Location in image
  bounding_box JSONB, -- {x, y, width, height}

  -- Classification
  category TEXT, -- 'worker', 'equipment', 'material', 'hazard', etc.

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE safety_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES media_assets(id),
  project_id UUID REFERENCES projects(id),

  -- Alert
  alert_type TEXT NOT NULL, -- 'fall_protection', 'ppe_missing', 'electrical_hazard', etc.
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  description TEXT NOT NULL,
  confidence DECIMAL(3, 2),

  -- Status
  status TEXT DEFAULT 'open', -- 'open', 'acknowledged', 'false_positive', 'resolved'
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolution_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Implementation Tasks:
- [ ] Setup Google Cloud Vision API account
- [ ] Create image analysis pipeline
- [ ] Build safety hazard detection logic
- [ ] Implement quality scoring
- [ ] Create AI results display UI
- [ ] Add safety alert notifications
- [ ] Build review queue for flagged photos
- [ ] Add false positive reporting
- [ ] Train custom model (Phase 2)

---

### 3. **Smart Organization & Search** (Priority: HIGH)

**Current**: Basic search, manual tagging
**Needed**: Auto-organization and intelligent search

#### Auto-Organization:

```
📁 PHOTO LIBRARY (2,847 photos)

ORGANIZED BY PROJECT:
├─ 📂 Downtown Office (1,245 photos)
│  ├─ 📅 By Date
│  │  ├─ January 2026 (456 photos)
│  │  └─ December 2025 (789 photos)
│  ├─ 🏗️ By Phase
│  │  ├─ Demolition (124 photos)
│  │  ├─ Foundation (234 photos)
│  │  ├─ Framing (456 photos) ← Currently here
│  │  └─ Rough-in (178 photos)
│  ├─ 📍 By Location
│  │  ├─ Floor 1 (345 photos)
│  │  ├─ Floor 2 (456 photos)
│  │  └─ Floor 3 (244 photos)
│  └─ 🏷️ By Category
│     ├─ Progress (892 photos)
│     ├─ Issues (45 photos)
│     ├─ Safety (23 photos)
│     └─ Deliveries (67 photos)
│
└─ 📂 Kitchen Remodel (345 photos)
   └─ ...

SMART COLLECTIONS (Auto-generated):
├─ 🔥 Recent Safety Issues (12 photos)
├─ ⚠️ Quality Alerts (8 photos)
├─ 📸 This Week (156 photos)
├─ ⭐ Featured (Best photos for portfolio)
└─ 🔄 Before & After Pairs (24 pairs)
```

#### Smart Search:

```
🔍 SEARCH PHOTOS

[Search box: "electrical rough-in floor 3 last week"]

SEARCH RESULTS (23 photos):
Sorted by relevance

Did you mean to filter by:
├─ Project: Downtown Office ✓
├─ Phase: Rough-in ✓
├─ Location: Floor 3 ✓
└─ Date: Jan 15-22 ✓

FILTERS APPLIED:
✓ Contains: electrical conduit
✓ Location: Floor 3
✓ Date: Last 7 days
✓ AI Tags: rough-in, electrical

[Photo grid showing results...]
```

**Natural Language Search Examples**:
- "Show me all photos with safety issues from downtown office"
- "Find concrete pour photos from last month"
- "Electrical work before drywall"
- "Photos tagged with John Smith"
- "Dark or blurry photos that need retaking"

Implementation:
```typescript
// lib/photo-search.ts

export async function intelligentPhotoSearch(query: string, companyId: string) {
  // 1. Parse natural language query
  const parsedQuery = await parseSearchQuery(query)

  // 2. Build Supabase query
  let queryBuilder = supabase
    .from('media_assets')
    .select('*')
    .eq('company_id', companyId)

  // Apply filters from parsed query
  if (parsedQuery.project) {
    queryBuilder = queryBuilder.eq('project_id', parsedQuery.project.id)
  }

  if (parsedQuery.dateRange) {
    queryBuilder = queryBuilder
      .gte('captured_at', parsedQuery.dateRange.start)
      .lte('captured_at', parsedQuery.dateRange.end)
  }

  if (parsedQuery.phase) {
    queryBuilder = queryBuilder.eq('auto_phase', parsedQuery.phase)
  }

  if (parsedQuery.category) {
    queryBuilder = queryBuilder.eq('auto_category', parsedQuery.category)
  }

  if (parsedQuery.tags && parsedQuery.tags.length > 0) {
    queryBuilder = queryBuilder.contains('tags', parsedQuery.tags)
  }

  if (parsedQuery.keywords && parsedQuery.keywords.length > 0) {
    // Full-text search on description and AI tags
    queryBuilder = queryBuilder.textSearch('fts', parsedQuery.keywords.join(' & '))
  }

  // 3. Execute query
  const { data: photos } = await queryBuilder

  // 4. Rank by relevance
  const rankedPhotos = rankByRelevance(photos, parsedQuery)

  return rankedPhotos
}

async function parseSearchQuery(query: string) {
  // Use AI to parse natural language
  // For now, use simple keyword extraction

  const keywords = query.toLowerCase().split(' ')

  const result = {
    project: null,
    phase: null,
    category: null,
    dateRange: null,
    tags: [],
    keywords: []
  }

  // Detect phase keywords
  const phases = ['demolition', 'foundation', 'framing', 'rough-in', 'drywall', 'finish']
  for (const phase of phases) {
    if (keywords.includes(phase) || keywords.includes(phase.replace('-', ''))) {
      result.phase = phase
    }
  }

  // Detect category keywords
  if (keywords.includes('safety') || keywords.includes('hazard')) {
    result.category = 'safety'
  } else if (keywords.includes('issue') || keywords.includes('defect')) {
    result.category = 'issue'
  } else if (keywords.includes('progress')) {
    result.category = 'progress'
  }

  // Detect date keywords
  if (keywords.includes('today')) {
    result.dateRange = {
      start: startOfDay(new Date()),
      end: endOfDay(new Date())
    }
  } else if (keywords.includes('week') || keywords.includes('last week')) {
    result.dateRange = {
      start: subDays(new Date(), 7),
      end: new Date()
    }
  } else if (keywords.includes('month') || keywords.includes('last month')) {
    result.dateRange = {
      start: subDays(new Date(), 30),
      end: new Date()
    }
  }

  // Remaining keywords for full-text search
  result.keywords = keywords.filter(kw =>
    !phases.includes(kw) &&
    !['today', 'week', 'month', 'last', 'from', 'the', 'and', 'or'].includes(kw)
  )

  return result
}
```

Database Indexes for Search:
```sql
-- Full-text search
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(description, '') || ' ' ||
      COALESCE(array_to_string(tags, ' '), '') || ' ' ||
      COALESCE(array_to_string(ai_tags, ' '), '')
    )
  ) STORED;

CREATE INDEX idx_media_fts ON media_assets USING GIN(fts);

-- Other search indexes
CREATE INDEX idx_media_project_date ON media_assets(project_id, captured_at DESC);
CREATE INDEX idx_media_phase ON media_assets(auto_phase);
CREATE INDEX idx_media_category ON media_assets(auto_category);
CREATE INDEX idx_media_tags ON media_assets USING GIN(tags);
CREATE INDEX idx_media_ai_tags ON media_assets USING GIN(ai_tags);
```

Implementation Tasks:
- [ ] Build auto-organization system
- [ ] Implement smart collections
- [ ] Create natural language query parser
- [ ] Add full-text search
- [ ] Build advanced filter UI
- [ ] Add saved searches
- [ ] Create photo albums
- [ ] Implement duplicate grouping

---

### 4. **Before/After & Comparison Tools** (Priority: MEDIUM)

```
🔄 BEFORE & AFTER COMPARISON

KITCHEN REMODEL - Smith Residence

┌──────────────────────────────────────────────────┐
│                                                  │
│  BEFORE                    AFTER                 │
│  ┌──────────┐             ┌──────────┐          │
│  │          │             │          │          │
│  │  [Photo] │    ═══>     │  [Photo] │          │
│  │          │             │          │          │
│  └──────────┘             └──────────┘          │
│  Dec 15, 2025             Mar 28, 2026          │
│                                                  │
│  [Slider View] [Side-by-Side] [Overlay]         │
│                                                  │
└──────────────────────────────────────────────────┘

CHANGES DETECTED:
✅ New cabinets installed
✅ Countertops replaced
✅ Flooring updated
✅ Lighting upgraded

[Create Client Report] [Add to Portfolio] [Share Link]
```

Database Schema:
```sql
CREATE TABLE photo_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),

  -- Photos
  before_photo_id UUID NOT NULL REFERENCES media_assets(id),
  after_photo_id UUID NOT NULL REFERENCES media_assets(id),

  -- Metadata
  title VARCHAR(255),
  description TEXT,
  location VARCHAR(255),

  -- Visibility
  is_featured BOOLEAN DEFAULT false, -- For portfolio
  is_client_visible BOOLEAN DEFAULT true,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Implementation Tasks:
- [ ] Create photo pairing UI
- [ ] Build comparison slider component
- [ ] Add overlay mode
- [ ] Create before/after report generator
- [ ] Add to client portal
- [ ] Build portfolio page

---

### 5. **Time-Lapse Generation** (Priority: MEDIUM)

**Purpose**: Auto-create construction time-lapse videos

```
🎬 TIME-LAPSE GENERATOR

PROJECT: Downtown Office

SOURCE PHOTOS: 1,245 photos over 4 months

SETTINGS:
Location: Floor 3, looking south
Frequency: One frame per day
Duration: 30 seconds @ 30 fps

┌────────────────────────────────────────────────┐
│ AUTO-SELECT PHOTOS:                            │
│ ☑ Same location (GPS-based)                   │
│ ☑ Same time of day (10:00 AM ±1 hour)         │
│ ☑ Same angle (AI-detected)                    │
│ ☑ Skip dark/blurry photos                     │
│                                                │
│ RESULT: 87 photos selected                    │
└────────────────────────────────────────────────┘

PREVIEW:
[Video player showing first few frames]

EXPORT:
Resolution: [1080p ▼]
Format: [MP4 ▼]
Quality: [High ▼]

[Generate Time-Lapse] (Estimated time: 2 minutes)
```

Implementation (using FFmpeg):
```typescript
// lib/timelapse.ts

export async function generateTimelapse(photos: Photo[], settings: {
  fps: number
  resolution: string
  quality: string
}) {
  // 1. Download photos to temp directory
  const tempDir = await createTempDirectory()

  for (let i = 0; i < photos.length; i++) {
    await downloadPhoto(photos[i].url, `${tempDir}/frame_${i.toString().padStart(5, '0')}.jpg`)
  }

  // 2. Use FFmpeg to create video
  const outputPath = `${tempDir}/timelapse.mp4`

  await execAsync(`
    ffmpeg -framerate ${settings.fps} \
      -pattern_type glob -i '${tempDir}/frame_*.jpg' \
      -c:v libx264 \
      -preset ${settings.quality} \
      -pix_fmt yuv420p \
      -s ${settings.resolution} \
      ${outputPath}
  `)

  // 3. Upload to storage
  const videoUrl = await uploadVideo(outputPath)

  // 4. Clean up temp files
  await deleteTempDirectory(tempDir)

  return videoUrl
}
```

Implementation Tasks:
- [ ] Setup FFmpeg on server
- [ ] Build photo selection algorithm
- [ ] Create time-lapse generation pipeline
- [ ] Add video processing queue
- [ ] Build preview UI
- [ ] Add download/share options

---

## COMPETITIVE EDGE

**vs Fieldwire**: They have good photos, we add AI analysis
**vs Procore**: They store photos, we make them intelligent
**vs OpenSpace**: They do 360° captures, we do smart 2D + AI

**What Makes Us Better**:
1. 🤖 AI analyzes every photo automatically
2. 🔍 Natural language search
3. ⚠️ Safety hazard detection
4. 📊 Quality scoring
5. 🎬 Auto time-lapse generation

---

**FieldSnap is 45% done because upload/view works. But AI analysis, smart organization, and comparison tools are what justify premium pricing. Focus on real AI first. 📸**
