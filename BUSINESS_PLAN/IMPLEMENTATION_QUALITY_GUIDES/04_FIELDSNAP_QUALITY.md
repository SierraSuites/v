# FIELDSNAP MODULE - QUALITY IMPLEMENTATION GUIDE

**Module**: Photo & Media Management with AI Analysis
**Business Priority**: HIGH (Visual Documentation is Legal Protection)
**Current Completion**: 45% Complete
**Target Completion**: 95% Production-Ready
**Estimated Revenue Impact**: $5-10/company/month in storage fees + Premium AI feature tier

---

## EXECUTIVE SUMMARY

### Why This Module is Critical to Your Success

FieldSnap is not just photo storage - it's **legal protection**, **marketing material**, and **quality control** rolled into one. Construction is a visual business. When a client disputes work quality, when an inspector questions code compliance, when a change order needs justification - **photos are evidence**.

**The Problem**: Contractors take 50-100 photos per day on job sites. Without FieldSnap's AI-powered organization, those photos become a chaotic mess. Finding "that one photo of the electrical rough-in before drywall" takes 10 minutes instead of 10 seconds. Photos aren't tagged, aren't organized, and aren't useful.

**The Solution**: FieldSnap with real computer vision AI automatically:
- Detects what's in every photo (framing, electrical, plumbing, workers, equipment)
- Identifies construction phases (foundation, framing, rough-in, finish)
- Flags safety hazards (missing PPE, unsafe scaffolding, electrical hazards)
- Scores photo quality (blurry? too dark? retake it)
- Organizes photos by project, phase, location, and date
- Enables natural language search: "show me all framing photos from floor 3 last week"

**Business Impact**:
- **Legal Protection**: $50,000 lawsuit avoided because you had timestamped, GPS-tagged photos proving work was done correctly
- **Marketing**: Before/After comparisons close 30% more sales
- **Quality Control**: Catch $5,000 defect before it becomes a $25,000 fix
- **Change Orders**: Photo evidence justifies $15,000 additional work
- **Safety Compliance**: AI flags missing hard hats before OSHA inspector arrives

**Revenue Model**:
- Storage: $5-10/company/month (grows with usage)
- Premium AI Features: $20/month (safety detection, quality scoring, time-lapse generation)
- Enterprise: $50/month (unlimited storage, custom ML models)

**Competitive Advantage**:
- Fieldwire: Basic photo storage, no AI
- Procore: Expensive ($375/month), no real computer vision
- OpenSpace: 360° cameras (expensive hardware), not mobile-friendly
- **The Sierra Suites**: Real AI analysis at accessible pricing

---

## DATABASE SCHEMA

### Core Tables

#### `media_assets` (Enhanced)

```sql
-- Existing table enhancement
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64); -- SHA256 for exact duplicate detection
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS perceptual_hash VARCHAR(16); -- Perceptual hash for similar photo detection
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);

-- Thumbnail URLs (3 sizes for performance)
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS thumbnail_small_url TEXT; -- 150x150 for grid view
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS thumbnail_medium_url TEXT; -- 400x400 for cards
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS thumbnail_large_url TEXT; -- 800x800 for lightbox

-- EXIF Data (camera metadata)
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS exif_data JSONB;
COMMENT ON COLUMN media_assets.exif_data IS 'Example: {"camera_make": "Apple", "camera_model": "iPhone 14 Pro", "focal_length": "6.86mm", "aperture": "f/1.78", "iso": 320, "shutter_speed": "1/120", "flash": false, "orientation": 1}';

-- GPS Enhanced
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS gps_accuracy_meters DECIMAL(10, 2);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS gps_altitude_meters DECIMAL(10, 2);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS location_address TEXT; -- Reverse geocoded address: "1234 Main St, Floor 3"

-- AI Auto-Categorization
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS auto_category TEXT; -- 'site', 'progress', 'issue', 'delivery', 'safety', 'document'
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS auto_phase TEXT; -- 'demo', 'foundation', 'framing', 'rough-in', 'drywall', 'finish', 'punch'
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3, 2); -- 0.00 to 1.00
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS ai_tags TEXT[]; -- Auto-generated tags from AI: ['lumber', 'framing', 'workers', 'safety']

-- Quality Metrics
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS quality_score INT CHECK (quality_score >= 0 AND quality_score <= 100);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_blurry BOOLEAN DEFAULT false;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_dark BOOLEAN DEFAULT false;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_overexposed BOOLEAN DEFAULT false;

-- Duplicate Detection
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES media_assets(id);
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS similarity_score DECIMAL(3, 2); -- 0.00 to 1.00

-- Video Support
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS duration_seconds INT; -- For videos
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS video_codec TEXT;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS video_resolution TEXT; -- '1920x1080'
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT false; -- Video transcoding status

-- Archival
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS archive_url TEXT; -- S3 Glacier or cold storage URL

-- AI Analysis Status
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS ai_analysis_completed BOOLEAN DEFAULT false;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS ai_analysis_timestamp TIMESTAMPTZ;
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS ai_analysis_error TEXT;

-- Full-text search (auto-updated)
ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      COALESCE(title, '') || ' ' ||
      COALESCE(description, '') || ' ' ||
      COALESCE(array_to_string(tags, ' '), '') || ' ' ||
      COALESCE(array_to_string(ai_tags, ' '), '') || ' ' ||
      COALESCE(location_address, '')
    )
  ) STORED;

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_media_fts ON media_assets USING GIN(fts);
CREATE INDEX IF NOT EXISTS idx_media_project_date ON media_assets(project_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_phase ON media_assets(auto_phase) WHERE auto_phase IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_category ON media_assets(auto_category) WHERE auto_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_tags ON media_assets USING GIN(tags) WHERE tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_ai_tags ON media_assets USING GIN(ai_tags) WHERE ai_tags IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_quality ON media_assets(quality_score DESC) WHERE quality_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_duplicates ON media_assets(file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_perceptual_hash ON media_assets(perceptual_hash) WHERE perceptual_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_archived ON media_assets(is_archived, archived_at) WHERE is_archived = true;
```

#### `ai_detections` (New Table)

```sql
CREATE TABLE ai_detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Detection Details
  object_type TEXT NOT NULL, -- 'person', 'hardhat', 'ladder', 'scaffold', 'concrete', 'lumber', etc.
  confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1.00),

  -- Location in Image (bounding box)
  bounding_box JSONB, -- {x: 0.2, y: 0.3, width: 0.4, height: 0.5} (normalized 0-1)

  -- Classification
  category TEXT, -- 'worker', 'equipment', 'material', 'hazard', 'ppe', 'structure'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_detections_media ON ai_detections(media_asset_id);
CREATE INDEX idx_ai_detections_type ON ai_detections(object_type, confidence DESC);
CREATE INDEX idx_ai_detections_category ON ai_detections(category);

-- RLS Policies
ALTER TABLE ai_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AI detections from their company" ON ai_detections
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
```

#### `safety_alerts` (New Table)

```sql
CREATE TABLE safety_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Alert Details
  alert_type TEXT NOT NULL, -- 'fall_protection', 'ppe_missing', 'electrical_hazard', 'scaffold_unsafe', etc.
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1.00),

  -- Status Tracking
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'false_positive', 'resolved')),
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_safety_alerts_media ON safety_alerts(media_asset_id);
CREATE INDEX idx_safety_alerts_project ON safety_alerts(project_id);
CREATE INDEX idx_safety_alerts_status ON safety_alerts(status, severity);
CREATE INDEX idx_safety_alerts_created ON safety_alerts(created_at DESC);

-- RLS Policies
ALTER TABLE safety_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view safety alerts from their company" ON safety_alerts
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update safety alerts from their company" ON safety_alerts
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_safety_alert_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_safety_alert_updated_at
  BEFORE UPDATE ON safety_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_safety_alert_timestamp();
```

#### `photo_comparisons` (New Table)

```sql
CREATE TABLE photo_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Photos
  before_photo_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  after_photo_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,

  -- Metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),

  -- Visibility
  is_featured BOOLEAN DEFAULT false, -- Show in portfolio
  is_client_visible BOOLEAN DEFAULT true,

  -- Sharing
  share_token UUID DEFAULT gen_random_uuid(), -- For public share links
  share_expires_at TIMESTAMPTZ,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comparisons_project ON photo_comparisons(project_id);
CREATE INDEX idx_comparisons_featured ON photo_comparisons(is_featured) WHERE is_featured = true;
CREATE INDEX idx_comparisons_share ON photo_comparisons(share_token) WHERE share_token IS NOT NULL;

-- RLS Policies
ALTER TABLE photo_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comparisons from their company" ON photo_comparisons
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
    OR (
      share_token IS NOT NULL
      AND (share_expires_at IS NULL OR share_expires_at > NOW())
    )
  );

CREATE POLICY "Users can insert comparisons in their company" ON photo_comparisons
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update comparisons from their company" ON photo_comparisons
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );
```

#### `photo_albums` (New Table)

```sql
CREATE TABLE photo_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- Album Details
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Type
  album_type TEXT DEFAULT 'manual' CHECK (album_type IN ('manual', 'smart')),
  smart_rules JSONB, -- For smart albums: {"phase": "framing", "dateRange": "last_week"}

  -- Ordering
  sort_order INT DEFAULT 0,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE album_photos (
  album_id UUID NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (album_id, media_asset_id)
);

CREATE INDEX idx_albums_project ON photo_albums(project_id);
CREATE INDEX idx_albums_type ON photo_albums(album_type);
CREATE INDEX idx_album_photos_album ON album_photos(album_id, sort_order);

-- RLS Policies
ALTER TABLE photo_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view albums from their company" ON photo_albums
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage albums in their company" ON photo_albums
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM user_companies WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view album photos from their company" ON album_photos
  FOR SELECT USING (
    album_id IN (
      SELECT id FROM photo_albums WHERE company_id IN (
        SELECT company_id FROM user_companies WHERE user_id = auth.uid()
      )
    )
  );
```

---

## CORE COMPONENTS

### 1. Batch Upload with Smart Processing

```typescript
// app/fieldsnap/upload/page.tsx

'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface UploadFile {
  file: File
  id: string
  preview: string
  status: 'queued' | 'uploading' | 'processing' | 'complete' | 'error'
  progress: number
  error?: string
  mediaAssetId?: string
}

interface BatchSettings {
  projectId: string
  phase?: string
  category?: string
  tags: string[]
  description?: string
  autoAnalyze: boolean
  notifyTeam: boolean
}

export default function FieldSnapUploadPage() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [batchSettings, setBatchSettings] = useState<BatchSettings>({
    projectId: '',
    phase: '',
    category: 'progress',
    tags: [],
    description: '',
    autoAnalyze: true,
    notifyTeam: false
  })

  // Fetch projects for dropdown
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, gps_latitude, gps_longitude')
        .eq('status', 'active')
        .order('name')

      if (error) throw error
      return data
    }
  })

  // Handle file drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: crypto.randomUUID(),
      preview: URL.createObjectURL(file),
      status: 'queued',
      progress: 0
    }))

    setUploadFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.heic', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 50
  })

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (uploadFile: UploadFile) => {
      const { file, id } = uploadFile

      // 1. Extract EXIF data
      const exifData = await extractEXIF(file)

      // 2. Generate file hash for duplicate detection
      const fileHash = await generateFileHash(file)

      // 3. Check for duplicates
      const { data: existingPhoto } = await supabase
        .from('media_assets')
        .select('id, title')
        .eq('file_hash', fileHash)
        .single()

      if (existingPhoto) {
        throw new Error(`Duplicate of "${existingPhoto.title}"`)
      }

      // 4. Sanitize GPS (remove if > 500m from project)
      let gpsLat = exifData.gps?.latitude
      let gpsLng = exifData.gps?.longitude

      if (gpsLat && gpsLng && batchSettings.projectId) {
        const project = projects?.find(p => p.id === batchSettings.projectId)
        if (project) {
          const sanitized = await sanitizeGPS(gpsLat, gpsLng, project.gps_latitude, project.gps_longitude)
          gpsLat = sanitized.lat
          gpsLng = sanitized.lng
        }
      }

      // 5. Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${crypto.randomUUID()}.${fileExt}`
      const filePath = `${batchSettings.projectId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: false
        })

      if (uploadError) throw uploadError

      // 6. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      // 7. Create media asset record
      const { data: mediaAsset, error: dbError } = await supabase
        .from('media_assets')
        .insert({
          project_id: batchSettings.projectId,
          title: file.name,
          description: batchSettings.description || null,
          file_path: filePath,
          url: publicUrl,
          file_size: file.size,
          mime_type: file.type,
          file_hash: fileHash,
          original_filename: file.name,
          tags: batchSettings.tags,
          auto_category: batchSettings.category,
          auto_phase: batchSettings.phase || null,
          gps_latitude: gpsLat,
          gps_longitude: gpsLng,
          exif_data: exifData,
          captured_at: exifData.dateTaken || new Date().toISOString()
        })
        .select()
        .single()

      if (dbError) throw dbError

      // 8. Generate thumbnails (async)
      fetch('/api/media/generate-thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaAssetId: mediaAsset.id, filePath })
      }).catch(err => console.error('Thumbnail generation failed:', err))

      // 9. Trigger AI analysis (async)
      if (batchSettings.autoAnalyze) {
        fetch('/api/ai/analyze-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaAssetId: mediaAsset.id })
        }).catch(err => console.error('AI analysis failed:', err))
      }

      return mediaAsset
    },
    onSuccess: (data, variables) => {
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === variables.id
            ? { ...f, status: 'complete', progress: 100, mediaAssetId: data.id }
            : f
        )
      )
      queryClient.invalidateQueries({ queryKey: ['photos'] })
    },
    onError: (error, variables) => {
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === variables.id
            ? { ...f, status: 'error', error: error.message }
            : f
        )
      )
      toast.error(`Upload failed: ${error.message}`)
    }
  })

  const handleUploadAll = async () => {
    if (!batchSettings.projectId) {
      toast.error('Please select a project')
      return
    }

    const queuedFiles = uploadFiles.filter(f => f.status === 'queued')

    // Upload files sequentially (could be parallelized with limit)
    for (const file of queuedFiles) {
      setUploadFiles(prev =>
        prev.map(f => (f.id === file.id ? { ...f, status: 'uploading' } : f))
      )

      await uploadMutation.mutateAsync(file)
    }

    toast.success(`${queuedFiles.length} photos uploaded successfully`)
  }

  const removeFile = (id: string) => {
    setUploadFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file) URL.revokeObjectURL(file.preview)
      return prev.filter(f => f.id !== id)
    })
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Upload Photos</h1>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
      >
        <input {...getInputProps()} />
        <div className="text-gray-600">
          {isDragActive ? (
            <p className="text-lg">Drop photos here...</p>
          ) : (
            <>
              <p className="text-lg mb-2">Drag & drop photos here, or click to select</p>
              <p className="text-sm">Supports: JPG, PNG, HEIC, MP4, MOV (max 50 files, 100MB each)</p>
            </>
          )}
        </div>
      </div>

      {/* Upload Queue */}
      {uploadFiles.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">
            Upload Queue ({uploadFiles.length} files)
          </h2>

          {/* Batch Settings */}
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h3 className="font-medium mb-4">Apply to all photos:</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project *</label>
                <select
                  value={batchSettings.projectId}
                  onChange={(e) => setBatchSettings(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Select project...</option>
                  {projects?.map(project => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Phase</label>
                <select
                  value={batchSettings.phase}
                  onChange={(e) => setBatchSettings(prev => ({ ...prev, phase: e.target.value }))}
                  className="w-full p-2 border rounded"
                >
                  <option value="">Auto-detect</option>
                  <option value="demolition">Demolition</option>
                  <option value="foundation">Foundation</option>
                  <option value="framing">Framing</option>
                  <option value="rough-in">Rough-In</option>
                  <option value="drywall">Drywall</option>
                  <option value="finish">Finish</option>
                  <option value="punch">Punch List</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  placeholder="progress, floor-3, north-wing"
                  value={batchSettings.tags.join(', ')}
                  onChange={(e) => setBatchSettings(prev => ({
                    ...prev,
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  }))}
                  className="w-full p-2 border rounded"
                />
              </div>

              <div className="col-span-2 flex items-center space-x-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={batchSettings.autoAnalyze}
                    onChange={(e) => setBatchSettings(prev => ({ ...prev, autoAnalyze: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Auto-analyze with AI</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={batchSettings.notifyTeam}
                    onChange={(e) => setBatchSettings(prev => ({ ...prev, notifyTeam: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm">Notify team</span>
                </label>
              </div>
            </div>

            <div className="mt-4 flex space-x-3">
              <button
                onClick={handleUploadAll}
                disabled={!batchSettings.projectId || uploadFiles.filter(f => f.status === 'queued').length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Upload {uploadFiles.filter(f => f.status === 'queued').length} Photos
              </button>

              <button
                onClick={() => setUploadFiles([])}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* File List */}
          <div className="space-y-2">
            {uploadFiles.map(uploadFile => (
              <div key={uploadFile.id} className="flex items-center p-3 bg-white border rounded">
                {/* Preview */}
                <img
                  src={uploadFile.preview}
                  alt={uploadFile.file.name}
                  className="w-16 h-16 object-cover rounded mr-4"
                />

                {/* Details */}
                <div className="flex-1">
                  <p className="font-medium">{uploadFile.file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(uploadFile.file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>

                  {/* Progress */}
                  {uploadFile.status === 'uploading' && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadFile.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {uploadFile.status === 'error' && (
                    <p className="text-sm text-red-600 mt-1">{uploadFile.error}</p>
                  )}
                </div>

                {/* Status Icon */}
                <div className="ml-4">
                  {uploadFile.status === 'queued' && (
                    <span className="text-gray-400">Waiting...</span>
                  )}
                  {uploadFile.status === 'uploading' && (
                    <span className="text-blue-600">Uploading {uploadFile.progress}%</span>
                  )}
                  {uploadFile.status === 'complete' && (
                    <span className="text-green-600">✅ Complete</span>
                  )}
                  {uploadFile.status === 'error' && (
                    <span className="text-red-600">❌ Failed</span>
                  )}
                </div>

                {/* Remove Button */}
                {uploadFile.status !== 'uploading' && (
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="ml-4 text-gray-400 hover:text-red-600"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Utility Functions

async function extractEXIF(file: File): Promise<any> {
  // Use exif-js or similar library
  // For now, return placeholder
  return {
    dateTaken: null,
    camera: null,
    gps: null
  }
}

async function generateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

async function sanitizeGPS(
  photoLat: number,
  photoLng: number,
  projectLat: number,
  projectLng: number
): Promise<{ lat: number | null; lng: number | null }> {
  const distance = calculateDistance(photoLat, photoLng, projectLat, projectLng)

  // If more than 500m from project, strip GPS for privacy
  if (distance > 500) {
    console.warn('GPS too far from project, stripping coordinates')
    return { lat: null, lng: null }
  }

  return { lat: photoLat, lng: photoLng }
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}
```

### 2. Google Cloud Vision AI Integration

```typescript
// lib/ai-vision.ts

import vision from '@google-cloud/vision'
import { createClient } from '@/lib/supabase/server'

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
})

export interface AIAnalysisResult {
  category: string
  phase: { phase: string; confidence: number } | null
  aiTags: string[]
  objects: Array<{
    name: string
    confidence: number
    boundingBox: any
  }>
  safetyHazards: Array<{
    type: string
    severity: string
    description: string
    confidence: number
  }>
  qualityScore: number
  isBlurry: boolean
  isDark: boolean
  extractedText: string | null
  workerCount: number
  ppeCompliance: {
    hardHats: boolean
    safetyVests: boolean
  }
}

export async function analyzeConstructionPhoto(
  imageUrl: string
): Promise<AIAnalysisResult> {
  try {
    // Run multiple detections in parallel
    const [
      objectsResult,
      labelsResult,
      textResult,
      propsResult
    ] = await Promise.all([
      client.objectLocalization(imageUrl),
      client.labelDetection(imageUrl),
      client.textDetection(imageUrl),
      client.imageProperties(imageUrl)
    ])

    const objects = objectsResult[0].localizedObjectAnnotations || []
    const labels = labelsResult[0].labelAnnotations || []
    const text = textResult[0].fullTextAnnotation?.text || null
    const props = propsResult[0].imagePropertiesAnnotation

    // Detect construction phase
    const phase = detectConstructionPhase(labels, objects)

    // Detect safety hazards
    const safetyHazards = detectSafetyHazards(objects, labels)

    // Count workers
    const workerCount = objects.filter(o => o.name === 'Person').length

    // Detect PPE
    const ppeCompliance = detectPPE(objects, workerCount)

    // Categorize photo
    const category = categorizePhoto(labels, objects, safetyHazards)

    // Quality score
    const qualityScore = calculatePhotoQuality(props)
    const isBlurry = qualityScore < 60
    const isDark = checkIfDark(props)

    // Generate AI tags
    const aiTags = generateAITags(labels, objects, phase)

    return {
      category,
      phase,
      aiTags,
      objects: objects.map(o => ({
        name: o.name || '',
        confidence: o.score || 0,
        boundingBox: o.boundingPoly
      })),
      safetyHazards,
      qualityScore,
      isBlurry,
      isDark,
      extractedText: text,
      workerCount,
      ppeCompliance
    }

  } catch (error) {
    console.error('AI analysis error:', error)
    throw error
  }
}

export function detectConstructionPhase(
  labels: any[],
  objects: any[]
): { phase: string; confidence: number } | null {
  const phaseKeywords = {
    demolition: ['demolition', 'debris', 'rubble', 'excavation', 'destruction'],
    foundation: ['concrete', 'rebar', 'formwork', 'foundation', 'footing'],
    framing: ['lumber', 'framing', 'studs', 'joists', 'wood', 'timber'],
    rough_in: ['electrical', 'plumbing', 'hvac', 'conduit', 'pipe', 'ductwork'],
    drywall: ['drywall', 'sheetrock', 'gypsum', 'taping', 'mudding'],
    finish: ['paint', 'flooring', 'tile', 'fixtures', 'trim', 'cabinet']
  }

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

  return null
}

function detectSafetyHazards(objects: any[], labels: any[]) {
  const hazards: any[] = []

  // Check for workers at height without protection
  const workersAtHeight = objects.filter(o =>
    o.name === 'Person' &&
    labels.some(l => ['ladder', 'scaffolding', 'scaffold', 'roof'].includes(l.description.toLowerCase()))
  )

  if (workersAtHeight.length > 0) {
    const fallProtection = labels.some(l =>
      ['harness', 'lanyard', 'guardrail', 'safety rail'].includes(l.description.toLowerCase())
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

  // Check for electrical hazards near water
  const electricalPresent = labels.some(l =>
    ['wire', 'electrical', 'power', 'cable'].includes(l.description.toLowerCase())
  )
  const waterPresent = labels.some(l =>
    ['water', 'wet', 'rain', 'puddle'].includes(l.description.toLowerCase())
  )

  if (electricalPresent && waterPresent) {
    hazards.push({
      type: 'electrical_hazard',
      severity: 'critical',
      description: 'Potential electrical hazard near water',
      confidence: 0.65
    })
  }

  // More hazard detection logic...

  return hazards
}

function detectPPE(objects: any[], workerCount: number) {
  const helmets = objects.filter(o =>
    ['helmet', 'hard hat', 'safety helmet'].includes(o.name?.toLowerCase() || '')
  )
  const vests = objects.filter(o =>
    ['safety vest', 'hi-vis vest', 'reflective vest'].includes(o.name?.toLowerCase() || '')
  )

  return {
    hardHats: workerCount > 0 ? helmets.length >= workerCount : true,
    safetyVests: workerCount > 0 ? vests.length >= workerCount : true
  }
}

function categorizePhoto(labels: any[], objects: any[], safetyHazards: any[]) {
  if (safetyHazards.length > 0) return 'safety'

  const issueKeywords = ['crack', 'damage', 'defect', 'issue', 'problem']
  if (labels.some(l => issueKeywords.some(kw => l.description.toLowerCase().includes(kw)))) {
    return 'issue'
  }

  const deliveryKeywords = ['truck', 'delivery', 'materials', 'shipping']
  if (labels.some(l => deliveryKeywords.some(kw => l.description.toLowerCase().includes(kw)))) {
    return 'delivery'
  }

  return 'progress'
}

function calculatePhotoQuality(props: any): number {
  let score = 100

  // Check brightness
  const colors = props?.dominantColors?.colors || []
  const avgBrightness = colors.reduce((sum: number, c: any) =>
    sum + (c.color.red + c.color.green + c.color.blue) / 3, 0
  ) / colors.length

  if (avgBrightness < 50) score -= 20  // Too dark
  if (avgBrightness > 250) score -= 15 // Overexposed

  // Additional quality checks could go here (blur detection requires extra processing)

  return Math.max(0, Math.min(100, score))
}

function checkIfDark(props: any): boolean {
  const colors = props?.dominantColors?.colors || []
  const avgBrightness = colors.reduce((sum: number, c: any) =>
    sum + (c.color.red + c.color.green + c.color.blue) / 3, 0
  ) / colors.length

  return avgBrightness < 50
}

function generateAITags(labels: any[], objects: any[], phase: any): string[] {
  const tags: string[] = []

  // Add phase tag
  if (phase) {
    tags.push(phase.phase)
  }

  // Add top labels
  labels.slice(0, 5).forEach(l => {
    tags.push(l.description.toLowerCase())
  })

  // Add unique objects
  const uniqueObjects = [...new Set(objects.map(o => o.name?.toLowerCase()).filter(Boolean))]
  tags.push(...uniqueObjects.slice(0, 3))

  return [...new Set(tags)] // Remove duplicates
}
```

### 3. AI Analysis API Route

```typescript
// app/api/ai/analyze-photo/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeConstructionPhoto } from '@/lib/ai-vision'

export async function POST(request: NextRequest) {
  try {
    const { mediaAssetId } = await request.json()

    if (!mediaAssetId) {
      return NextResponse.json(
        { error: 'mediaAssetId is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 1. Fetch media asset
    const { data: mediaAsset, error: fetchError } = await supabase
      .from('media_assets')
      .select('*, projects(gps_latitude, gps_longitude)')
      .eq('id', mediaAssetId)
      .single()

    if (fetchError || !mediaAsset) {
      return NextResponse.json(
        { error: 'Media asset not found' },
        { status: 404 }
      )
    }

    // 2. Get public URL for AI analysis
    const { data: { publicUrl } } = supabase.storage
      .from('media')
      .getPublicUrl(mediaAsset.file_path)

    // 3. Run AI analysis
    const analysis = await analyzeConstructionPhoto(publicUrl)

    // 4. Update media asset with AI results
    const { error: updateError } = await supabase
      .from('media_assets')
      .update({
        auto_category: analysis.category,
        auto_phase: analysis.phase?.phase || null,
        confidence_score: analysis.phase?.confidence || null,
        ai_tags: analysis.aiTags,
        quality_score: analysis.qualityScore,
        is_blurry: analysis.isBlurry,
        is_dark: analysis.isDark,
        ai_analysis_completed: true,
        ai_analysis_timestamp: new Date().toISOString()
      })
      .eq('id', mediaAssetId)

    if (updateError) throw updateError

    // 5. Store detected objects
    if (analysis.objects.length > 0) {
      const detections = analysis.objects.map(obj => ({
        media_asset_id: mediaAssetId,
        company_id: mediaAsset.company_id,
        object_type: obj.name,
        confidence: obj.confidence,
        bounding_box: obj.boundingBox,
        category: categorizeObject(obj.name)
      }))

      await supabase.from('ai_detections').insert(detections)
    }

    // 6. Create safety alerts
    if (analysis.safetyHazards.length > 0) {
      const alerts = analysis.safetyHazards
        .filter(h => shouldCreateAlert(h))
        .map(hazard => ({
          media_asset_id: mediaAssetId,
          project_id: mediaAsset.project_id,
          company_id: mediaAsset.company_id,
          alert_type: hazard.type,
          severity: hazard.severity,
          description: hazard.description,
          confidence: hazard.confidence
        }))

      if (alerts.length > 0) {
        await supabase.from('safety_alerts').insert(alerts)
      }
    }

    return NextResponse.json({
      success: true,
      analysis
    })

  } catch (error: any) {
    console.error('AI analysis error:', error)

    // Log error to media asset
    const { mediaAssetId } = await request.json()
    if (mediaAssetId) {
      const supabase = await createClient()
      await supabase
        .from('media_assets')
        .update({
          ai_analysis_error: error.message,
          ai_analysis_timestamp: new Date().toISOString()
        })
        .eq('id', mediaAssetId)
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

function categorizeObject(objectName: string): string {
  const workerObjects = ['person', 'worker', 'man', 'woman']
  if (workerObjects.some(w => objectName.toLowerCase().includes(w))) {
    return 'worker'
  }

  const equipmentObjects = ['ladder', 'scaffold', 'crane', 'forklift']
  if (equipmentObjects.some(e => objectName.toLowerCase().includes(e))) {
    return 'equipment'
  }

  const materialObjects = ['lumber', 'concrete', 'brick', 'pipe']
  if (materialObjects.some(m => objectName.toLowerCase().includes(m))) {
    return 'material'
  }

  return 'other'
}

function shouldCreateAlert(hazard: any): boolean {
  // Only create alerts with sufficient confidence
  if (hazard.severity === 'critical' && hazard.confidence < 0.80) {
    return false
  }
  if (hazard.severity === 'high' && hazard.confidence < 0.90) {
    return false
  }
  return true
}
```


## PERFORMANCE REQUIREMENTS

### Load Time Targets

**Page Load Performance**:
- ✅ Initial page load: < 1.5 seconds
- ✅ Photo grid (100 photos): < 2.0 seconds
- ✅ Photo grid (1000+ photos): < 3.0 seconds with virtualization
- ✅ Single photo detail view: < 0.8 seconds
- ✅ Search results: < 1.0 seconds
- ✅ AI analysis: < 5 seconds per photo

**Upload Performance**:
- ✅ Single photo upload (5MB): < 3 seconds total
- ✅ Batch upload (50 photos): All queued within 10 seconds
- ✅ Thumbnail generation: < 2 seconds per photo
- ✅ Background uploads continue when browsing

**API Response Times**:
- ✅ GET /api/photos (paginated): < 200ms
- ✅ POST /api/photos/upload: < 100ms (async processing)
- ✅ GET /api/photos/search: < 500ms
- ✅ POST /api/ai/analyze-photo: < 5000ms

### Implementation

```typescript
// Virtual scrolling for performance with 1000+ photos
// components/photo-grid.tsx

import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

export function VirtualPhotoGrid({ photos }: { photos: any[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const rowVirtualizer = useVirtualizer({
    count: Math.ceil(photos.length / 4), // 4 columns
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250, // Estimated row height
    overscan: 5 // Render 5 rows outside viewport
  })

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {rowVirtualizer.getVirtualItems().map(virtualRow => {
          const startIdx = virtualRow.index * 4
          const rowPhotos = photos.slice(startIdx, startIdx + 4)

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
              className="grid grid-cols-4 gap-4 px-4"
            >
              {rowPhotos.map(photo => (
                <div key={photo.id} className="aspect-square">
                  <img
                    src={photo.thumbnail_medium_url}
                    alt={photo.title}
                    className="w-full h-full object-cover rounded-lg"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

### Image Optimization

```typescript
// api/media/generate-thumbnails/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import sharp from 'sharp'

export async function POST(request: NextRequest) {
  try {
    const { filePath } = await request.json()
    const supabase = await createClient()

    // Download original image from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('media')
      .download(filePath)

    if (downloadError) throw downloadError

    const buffer = await fileData.arrayBuffer()

    // Generate 3 thumbnail sizes
    const [smallThumb, mediumThumb, largeThumb] = await Promise.all([
      sharp(Buffer.from(buffer))
        .resize(150, 150, { fit: 'cover' })
        .webp({ quality: 80 })
        .toBuffer(),

      sharp(Buffer.from(buffer))
        .resize(400, 400, { fit: 'cover' })
        .webp({ quality: 85 })
        .toBuffer(),

      sharp(Buffer.from(buffer))
        .resize(800, 800, { fit: 'cover' })
        .webp({ quality: 90 })
        .toBuffer()
    ])

    // Upload thumbnails
    const basePath = filePath.replace(/\.[^/.]+$/, '') // Remove extension
    const [smallUrl, mediumUrl, largeUrl] = await Promise.all([
      uploadThumbnail(supabase, `${basePath}_150x150.webp`, smallThumb),
      uploadThumbnail(supabase, `${basePath}_400x400.webp`, mediumThumb),
      uploadThumbnail(supabase, `${basePath}_800x800.webp`, largeThumb)
    ])

    return NextResponse.json({
      small: smallUrl,
      medium: mediumUrl,
      large: largeUrl
    })

  } catch (error: any) {
    console.error('Thumbnail generation error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}

async function uploadThumbnail(
  supabase: any,
  path: string,
  buffer: Buffer
): Promise<string> {
  await supabase.storage.from('media').upload(path, buffer, {
    contentType: 'image/webp',
    cacheControl: '31536000' // 1 year
  })

  const { data } = supabase.storage.from('media').getPublicUrl(path)
  return data.publicUrl
}
```

---

## TESTING REQUIREMENTS

### Unit Tests

```typescript
// __tests__/lib/ai-vision.test.ts

import { analyzeConstructionPhoto, detectConstructionPhase } from '@/lib/ai-vision'

describe('AI Vision Analysis', () => {
  describe('detectConstructionPhase', () => {
    it('should detect framing phase from labels', () => {
      const labels = [
        { description: 'Lumber', score: 0.95 },
        { description: 'Wood', score: 0.89 },
        { description: 'Construction', score: 0.82 }
      ]

      const result = detectConstructionPhase(labels, [])

      expect(result).toEqual({
        phase: 'framing',
        confidence: 0.95
      })
    })

    it('should detect foundation phase from concrete labels', () => {
      const labels = [
        { description: 'Concrete', score: 0.93 },
        { description: 'Rebar', score: 0.87 }
      ]

      const result = detectConstructionPhase(labels, [])

      expect(result).toEqual({
        phase: 'foundation',
        confidence: 0.93
      })
    })

    it('should return null when no phase detected', () => {
      const labels = [
        { description: 'Sky', score: 0.95 },
        { description: 'Clouds', score: 0.89 }
      ]

      const result = detectConstructionPhase(labels, [])

      expect(result).toBeNull()
    })
  })

  describe('analyzeConstructionPhoto', () => {
    it('should analyze a construction photo and return complete results', async () => {
      const mockImageUrl = 'https://example.com/photo.jpg'

      // Mock Google Vision API responses
      // (In real tests, you'd mock the vision client)

      const result = await analyzeConstructionPhoto(mockImageUrl)

      expect(result).toHaveProperty('phase')
      expect(result).toHaveProperty('category')
      expect(result).toHaveProperty('objects')
      expect(result).toHaveProperty('safetyHazards')
      expect(result).toHaveProperty('qualityScore')
      expect(result.qualityScore).toBeGreaterThanOrEqual(0)
      expect(result.qualityScore).toBeLessThanOrEqual(100)
    })
  })
})

// __tests__/lib/photo-search.test.ts

import { intelligentPhotoSearch, parseSearchQuery } from '@/lib/photo-search'

describe('Photo Search', () => {
  describe('parseSearchQuery', () => {
    it('should parse phase keywords', () => {
      const query = 'find framing photos from last week'
      const result = parseSearchQuery(query)

      expect(result.phase).toBe('framing')
      expect(result.dateRange).toBeDefined()
    })

    it('should parse safety keywords', () => {
      const query = 'show me safety hazards'
      const result = parseSearchQuery(query)

      expect(result.category).toBe('safety')
      expect(result.safetyIssuesOnly).toBe(true)
    })

    it('should parse date keywords', () => {
      const query = 'photos from today'
      const result = parseSearchQuery(query)

      expect(result.dateRange).toBeDefined()
      expect(result.dateRange?.start).toBeInstanceOf(Date)
    })

    it('should extract content keywords', () => {
      const query = 'electrical conduit installation'
      const result = parseSearchQuery(query)

      expect(result.keywords).toContain('electrical')
      expect(result.keywords).toContain('conduit')
      expect(result.keywords).toContain('installation')
    })
  })
})
```

### Integration Tests

```typescript
// __tests__/api/ai/analyze-photo.test.ts

import { POST } from '@/app/api/ai/analyze-photo/route'
import { createClient } from '@/lib/supabase/server'

jest.mock('@/lib/supabase/server')
jest.mock('@/lib/ai-vision')

describe('POST /api/ai/analyze-photo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should analyze a photo and update database', async () => {
    const mockMediaAsset = {
      id: 'test-id',
      file_path: 'test/path.jpg',
      company_id: 'company-1',
      project_id: 'project-1'
    }

    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockMediaAsset }),
      update: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ data: [] }),
      storage: {
        from: jest.fn().mockReturnThis(),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/photo.jpg' }
        })
      }
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

    const mockAnalysis = {
      category: 'progress',
      phase: { phase: 'framing', confidence: 0.92 },
      aiTags: ['lumber', 'construction', 'framing'],
      qualityScore: 85,
      isBlurry: false,
      isDark: false,
      objects: [],
      safetyHazards: []
    }

    const { analyzeConstructionPhoto } = await import('@/lib/ai-vision')
    ;(analyzeConstructionPhoto as jest.Mock).mockResolvedValue(mockAnalysis)

    const request = new Request('http://localhost:3000/api/ai/analyze-photo', {
      method: 'POST',
      body: JSON.stringify({ mediaAssetId: 'test-id' })
    })

    const response = await POST(request)
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(mockSupabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        auto_category: 'progress',
        auto_phase: 'framing',
        ai_analysis_completed: true
      })
    )
  })

  it('should return 404 when media asset not found', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } })
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

    const request = new Request('http://localhost:3000/api/ai/analyze-photo', {
      method: 'POST',
      body: JSON.stringify({ mediaAssetId: 'nonexistent' })
    })

    const response = await POST(request)

    expect(response.status).toBe(404)
  })
})
```

### E2E Tests (Playwright)

```typescript
// e2e/photo-upload.spec.ts

import { test, expect } from '@playwright/test'

test.describe('Photo Upload Flow', () => {
  test('should upload photos with batch settings', async ({ page }) => {
    await page.goto('/fieldsnap/upload')

    // Upload files via file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([
      'tests/fixtures/test-photo-1.jpg',
      'tests/fixtures/test-photo-2.jpg'
    ])

    // Wait for files to appear in queue
    await expect(page.locator('text=Upload Queue (2 files)')).toBeVisible()

    // Set batch settings
    await page.selectOption('select[name="project"]', 'Downtown Office')
    await page.selectOption('select[name="phase"]', 'framing')
    await page.fill('input[name="tags"]', 'progress, floor-3')

    // Start upload
    await page.click('button:has-text("Upload 2 Photos")')

    // Wait for completion
    await expect(page.locator('text=✅ Complete')).toHaveCount(2, { timeout: 30000 })

    // Verify photos appear in gallery
    await page.goto('/fieldsnap')
    await expect(page.locator('img[alt="test-photo-1.jpg"]')).toBeVisible()
    await expect(page.locator('img[alt="test-photo-2.jpg"]')).toBeVisible()
  })

  test('should detect and warn about duplicates', async ({ page }) => {
    await page.goto('/fieldsnap/upload')

    // Upload same file twice
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(['tests/fixtures/test-photo-1.jpg'])
    await page.click('button:has-text("Upload 1 Photo")')
    await expect(page.locator('text=✅ Complete')).toBeVisible()

    // Try uploading again
    await fileInput.setInputFiles(['tests/fixtures/test-photo-1.jpg'])
    await page.click('button:has-text("Upload 1 Photo")')

    // Should show duplicate error
    await expect(page.locator('text=Duplicate of')).toBeVisible()
  })
})

test.describe('Photo Search', () => {
  test('should search photos with natural language', async ({ page }) => {
    await page.goto('/fieldsnap')

    // Type natural language query
    await page.fill('input[placeholder*="Search"]', 'framing photos from last week')
    await page.press('input[placeholder*="Search"]', 'Enter')

    // Should show filtered results
    await expect(page.locator('text=Phase: Framing')).toBeVisible()
    await expect(page.locator('text=Date: Last 7 days')).toBeVisible()

    // Results should only show framing photos
    const photoCards = page.locator('[data-testid="photo-card"]')
    await expect(photoCards).toHaveCountGreaterThan(0)
  })
})

test.describe('Before/After Comparisons', () => {
  test('should create before/after comparison', async ({ page }) => {
    await page.goto('/fieldsnap/comparisons')

    // Select before photo
    await page.click('[data-testid="photo-selector-before"]')
    await page.click('[data-testid="photo-option"]:first-child')

    // Select after photo
    await page.click('[data-testid="photo-selector-after"]')
    await page.click('[data-testid="photo-option"]:nth-child(2)')

    // Create comparison
    await page.click('button:has-text("Create Comparison")')
    await page.fill('input[placeholder="Comparison title"]', 'Kitchen Renovation')
    await page.click('button:has-text("Save")')

    // Should show comparison with slider
    await expect(page.locator('text=Kitchen Renovation')).toBeVisible()
    await expect(page.locator('.comparison-slider')).toBeVisible()
  })
})
```

---

## COMMON PITFALLS & SOLUTIONS

### 1. Memory Leaks from Image Previews

**Problem**: Creating object URLs for previews but never revoking them causes memory leaks.

```typescript
// ❌ BAD - Memory leak
const preview = URL.createObjectURL(file)
// Never revoked!

// ✅ GOOD - Cleanup
useEffect(() => {
  const preview = URL.createObjectURL(file)
  setPreviewUrl(preview)

  return () => {
    URL.revokeObjectURL(preview) // Cleanup
  }
}, [file])
```

### 2. EXIF Orientation Not Handled

**Problem**: Photos appear rotated incorrectly because EXIF orientation is ignored.

**Solution**: Read EXIF orientation and rotate image during thumbnail generation.

```typescript
// lib/image-processing.ts
import sharp from 'sharp'

export async function generateThumbnail(buffer: Buffer, size: number) {
  return sharp(buffer)
    .rotate() // Auto-rotate based on EXIF orientation
    .resize(size, size, { fit: 'cover' })
    .webp({ quality: 85 })
    .toBuffer()
}
```

### 3. Duplicate Detection False Positives

**Problem**: SHA256 hash detects exact duplicates, but contractors often take multiple similar photos of same thing.

**Solution**: Use perceptual hashing to detect visually similar photos, not just identical files.

```typescript
// lib/perceptual-hash.ts
import { createHash } from 'crypto'
import sharp from 'sharp'

export async function generatePerceptualHash(imageBuffer: Buffer): Promise<string> {
  // 1. Resize to 8x8 (removes detail, keeps structure)
  const resized = await sharp(imageBuffer)
    .greyscale()
    .resize(8, 8, { fit: 'fill' })
    .raw()
    .toBuffer()

  // 2. Calculate average pixel value
  const pixels = Array.from(resized)
  const avg = pixels.reduce((sum, val) => sum + val, 0) / pixels.length

  // 3. Create hash: 1 if pixel > avg, 0 if pixel <= avg
  let hash = ''
  for (const pixel of pixels) {
    hash += pixel > avg ? '1' : '0'
  }

  // 4. Convert binary to hex
  return parseInt(hash, 2).toString(16).padStart(16, '0')
}

// Check similarity (Hamming distance)
export function calculateSimilarity(hash1: string, hash2: string): number {
  const distance = hammingDistance(hash1, hash2)
  return 1 - (distance / 64) // 0 = completely different, 1 = identical
}

function hammingDistance(str1: string, str2: string): number {
  const bin1 = parseInt(str1, 16).toString(2).padStart(64, '0')
  const bin2 = parseInt(str2, 16).toString(2).padStart(64, '0')

  let distance = 0
  for (let i = 0; i < 64; i++) {
    if (bin1[i] !== bin2[i]) distance++
  }
  return distance
}

// Usage in upload
const perceptualHash = await generatePerceptualHash(fileBuffer)

// Find similar photos (> 90% similar)
const { data: similarPhotos } = await supabase
  .from('media_assets')
  .select('id, perceptual_hash')
  .eq('company_id', companyId)

const duplicates = similarPhotos.filter(photo => {
  const similarity = calculateSimilarity(perceptualHash, photo.perceptual_hash)
  return similarity > 0.90
})

if (duplicates.length > 0) {
  console.warn('Similar photo found:', duplicates[0].id)
}
```

### 4. AI Analysis Costs Spiraling

**Problem**: Google Vision API costs $1.50 per 1,000 images. With 10,000 photos/month, that's $15/month per company. With 1,000 companies, that's $15,000/month.

**Solution**:
1. Cache AI results - never re-analyze same photo
2. Batch analyze in off-peak hours
3. Use cheaper detection first, full analysis only when needed
4. Train custom model for Phase 2 (one-time cost)

```typescript
// Check if already analyzed
const { data: existingPhoto } = await supabase
  .from('media_assets')
  .select('ai_analysis_completed')
  .eq('id', photoId)
  .single()

if (existingPhoto.ai_analysis_completed) {
  console.log('Already analyzed, skipping')
  return
}

// For non-critical photos, use cheaper label detection only
if (!isCritical) {
  // Label detection: $1.50/1000
  const [labelsResult] = await client.labelDetection(imageUrl)
  // Skip expensive object localization ($5.00/1000)
}
```

### 5. GPS Privacy Concerns

**Problem**: GPS coordinates in EXIF data reveal workers' home addresses if they start/end day at home.

**Solution**: Strip GPS from photos taken outside project boundaries.

```typescript
// lib/gps-privacy.ts

export async function sanitizeGPS(
  gpsLat: number,
  gpsLng: number,
  projectId: string
): Promise<{ lat: number | null; lng: number | null }> {
  // Get project location
  const { data: project } = await supabase
    .from('projects')
    .select('gps_latitude, gps_longitude')
    .eq('id', projectId)
    .single()

  if (!project) return { lat: null, lng: null }

  // Calculate distance from project (in meters)
  const distance = calculateDistance(
    gpsLat,
    gpsLng,
    project.gps_latitude,
    project.gps_longitude
  )

  // If more than 500m from project, strip GPS
  if (distance > 500) {
    console.warn('GPS too far from project, stripping coordinates')
    return { lat: null, lng: null }
  }

  return { lat: gpsLat, lng: gpsLng }
}

function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}
```

### 6. Storage Costs Growing Uncontrolled

**Problem**: 1,000 companies × 10,000 photos × 5MB avg = 50TB storage. At $0.02/GB/month, that's $1,000/month and growing.

**Solution**: Implement lifecycle policies.

```typescript
// lib/storage-lifecycle.ts

export async function archiveOldProjects() {
  // Find completed projects older than 1 year
  const { data: oldProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('status', 'completed')
    .lt('completion_date', subYears(new Date(), 1))

  for (const project of oldProjects) {
    // Move photos to cold storage (S3 Glacier)
    const { data: photos } = await supabase
      .from('media_assets')
      .select('id, file_path')
      .eq('project_id', project.id)
      .eq('is_archived', false)

    for (const photo of photos) {
      // Download from hot storage
      const { data: fileData } = await supabase.storage
        .from('media')
        .download(photo.file_path)

      // Upload to cold storage (implement S3 Glacier integration)
      const archiveUrl = await uploadToGlacier(fileData)

      // Update database
      await supabase
        .from('media_assets')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          archive_url: archiveUrl
        })
        .eq('id', photo.id)

      // Delete from hot storage
      await supabase.storage
        .from('media')
        .remove([photo.file_path])
    }
  }
}

// Cost comparison:
// Hot storage (Supabase): $0.021/GB/month
// Cold storage (Glacier): $0.004/GB/month
// Savings: 80% for completed projects
```

### 7. Safety Alerts Creating Noise

**Problem**: AI detects 50 "missing hard hat" alerts daily, but 45 are false positives (reflections, partial views). Team stops paying attention.

**Solution**: Require minimum confidence + human confirmation for critical alerts.

```typescript
// lib/safety-alerts.ts

export async function createSafetyAlert(
  mediaAssetId: string,
  hazard: any
) {
  // Only create alert if:
  // 1. Severity is critical AND confidence > 80%
  // 2. OR severity is high AND confidence > 90%
  if (
    (hazard.severity === 'critical' && hazard.confidence < 0.80) ||
    (hazard.severity === 'high' && hazard.confidence < 0.90)
  ) {
    console.log('Confidence too low for alert, logging for review')
    return
  }

  // Create alert
  const { data: alert } = await supabase
    .from('safety_alerts')
    .insert({
      media_asset_id: mediaAssetId,
      alert_type: hazard.type,
      severity: hazard.severity,
      description: hazard.description,
      confidence: hazard.confidence,
      status: 'open'
    })
    .select()
    .single()

  // Only notify team for critical alerts
  if (hazard.severity === 'critical') {
    await notifyTeam(alert)
  }
}

// Track false positive rate to improve model
export async function markFalsePositive(alertId: string) {
  await supabase
    .from('safety_alerts')
    .update({ status: 'false_positive' })
    .eq('id', alertId)

  // Log for model retraining
  // TODO: Send to ML training pipeline
}
```

---

## PRE-LAUNCH CHECKLIST

### Database & Storage

- [ ] All tables created with proper indexes
- [ ] Row Level Security policies tested and working
- [ ] Storage bucket configured with correct permissions
- [ ] Thumbnail generation working for all image formats
- [ ] Storage lifecycle policy configured
- [ ] Backup strategy in place for media files

### AI Integration

- [ ] Google Cloud Vision API key configured
- [ ] AI analysis working for sample photos
- [ ] Object detection accuracy > 85% on test set
- [ ] Safety hazard detection tested with edge cases
- [ ] False positive rate < 15%
- [ ] Cost monitoring dashboard set up

### Upload System

- [ ] Single file upload working
- [ ] Batch upload working (50+ files)
- [ ] EXIF extraction working for iPhone/Android
- [ ] GPS privacy filtering working
- [ ] Duplicate detection working (SHA256)
- [ ] Perceptual hash similarity working
- [ ] Upload progress tracking accurate
- [ ] Error handling for failed uploads
- [ ] Retry mechanism for network failures

### Search & Organization

- [ ] Full-text search working
- [ ] Natural language query parsing working
- [ ] Search performance < 1 second for 10,000+ photos
- [ ] Auto-categorization accuracy > 80%
- [ ] Manual tags working
- [ ] Photo albums working
- [ ] Before/After comparisons working

### Performance

- [ ] Page load < 1.5 seconds
- [ ] Virtual scrolling working for 1,000+ photos
- [ ] Lazy loading working for thumbnails
- [ ] Image CDN configured (CloudFront or similar)
- [ ] Compression working (WebP format)
- [ ] Load testing completed for 1,000 concurrent users

### Mobile Experience

- [ ] Responsive design working on all screen sizes
- [ ] Touch gestures working (pinch to zoom, swipe)
- [ ] Mobile upload working from camera roll
- [ ] Mobile camera integration working
- [ ] Offline queue working
- [ ] Progressive Web App (PWA) configured

### Security & Privacy

- [ ] RLS policies prevent cross-company data access
- [ ] Uploaded photos only accessible to company members
- [ ] GPS privacy filtering working
- [ ] EXIF data sanitized properly
- [ ] Share links working with expiration
- [ ] Public portfolio privacy settings working

### Monitoring & Analytics

- [ ] Error tracking configured (Sentry)
- [ ] Performance monitoring configured
- [ ] Storage usage tracking working
- [ ] AI API usage tracking working
- [ ] User analytics configured
- [ ] Cost alerts configured

---

## SUCCESS METRICS

### User Engagement

- ✅ **Upload rate**: 100+ photos per company per week
- ✅ **Search usage**: 50+ searches per company per week
- ✅ **AI analysis adoption**: 90%+ photos analyzed
- ✅ **Safety alert response**: < 2 hours for critical alerts

### Technical Performance

- ✅ **Uptime**: 99.9%
- ✅ **Upload success rate**: 99.5%+
- ✅ **AI analysis success rate**: 95%+
- ✅ **Search response time**: < 500ms average

### Business Impact

- ✅ **Storage revenue**: $5-10 per company per month
- ✅ **AI feature usage**: 80%+ of companies use AI analysis
- ✅ **Customer retention**: FieldSnap users have 2x retention
- ✅ **Support tickets**: < 0.5% of uploads result in support ticket

---

## DEPLOYMENT PROCEDURE

### Phase 1: Core Upload (Week 1)

1. Deploy database schema updates
2. Deploy storage bucket configuration
3. Deploy basic upload UI
4. Deploy thumbnail generation API
5. Test with 10 beta users
6. Monitor for issues

### Phase 2: AI Analysis (Week 2-3)

1. Deploy Google Vision API integration
2. Deploy AI analysis API routes
3. Deploy safety alert system
4. Test with 50 beta users
5. Monitor AI costs and accuracy
6. Tune confidence thresholds

### Phase 3: Search & Organization (Week 4)

1. Deploy full-text search indexes
2. Deploy natural language query parser
3. Deploy photo albums feature
4. Deploy before/after comparisons
5. Test with 100 beta users

### Phase 4: General Release (Week 5)

1. Performance optimization
2. Load testing
3. Documentation updates
4. Marketing announcement
5. Gradual rollout to all users
6. Monitor metrics

### Post-Launch

- Week 1: Monitor error rates, fix critical bugs
- Week 2: Tune AI confidence thresholds based on false positive rate
- Week 3: Optimize performance based on real usage patterns
- Month 2: Implement custom ML model training
- Month 3: Add time-lapse generation

---

## MAINTENANCE & SUPPORT

### Daily Monitoring

- Storage usage growth rate
- AI API costs
- Upload success rate
- Error rate
- Performance metrics

### Weekly Tasks

- Review safety alerts false positive rate
- Check storage lifecycle policy execution
- Review user feedback
- Optimize slow queries

### Monthly Tasks

- Archive old completed projects
- Review AI model performance
- Cost optimization review
- Feature usage analytics
- Customer satisfaction survey

---

**FieldSnap transforms photo management from a filing cabinet into intelligent visual documentation. Real computer vision AI, not just text analysis, is what justifies premium pricing. Focus on making upload effortless and search instant. 📸**
