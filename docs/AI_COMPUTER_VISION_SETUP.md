# AI Computer Vision Integration Guide

## Overview

This document outlines the implementation plan for integrating computer vision AI into The Sierra Suites platform for automated photo analysis, safety hazard detection, and quality scoring.

## Current Status

**Status:** ⚠️ PLANNED - Not yet implemented

The `/api/fieldsnap/analyze` endpoint currently uses text-only AI analysis via OpenAI. True computer vision requires integration with specialized vision APIs.

## Recommended Provider: Google Cloud Vision API

### Why Google Cloud Vision?

- **Comprehensive Features**: Object detection, label detection, text extraction (OCR), face detection
- **Safety Detection**: Built-in SafeSearch for inappropriate content
- **Landmark Detection**: Useful for construction site identification
- **Industry Standard**: Proven reliability and accuracy
- **Reasonable Pricing**: $1.50 per 1000 images (label detection)

### Alternative Providers

1. **AWS Rekognition**
   - Similar features to Google Cloud Vision
   - Tight integration with AWS ecosystem
   - PPE detection (useful for safety compliance)

2. **Azure Computer Vision**
   - Microsoft ecosystem integration
   - Good for text extraction (OCR)
   - Spatial analysis capabilities

3. **OpenAI Vision (GPT-4 Vision)**
   - Natural language descriptions
   - Currently used in the app
   - Limited to text analysis, not true CV

## Implementation Plan

### Phase 1: Setup & Configuration

#### 1. Create Google Cloud Project

```bash
# 1. Go to https://console.cloud.google.com/
# 2. Create new project: "sierra-suites-vision"
# 3. Enable Cloud Vision API
# 4. Create service account with Vision API access
# 5. Download JSON credentials
```

#### 2. Install Dependencies

```bash
npm install @google-cloud/vision
```

#### 3. Environment Variables

Add to `.env.local`:

```bash
# Google Cloud Vision
GOOGLE_CLOUD_PROJECT_ID=sierra-suites-vision
GOOGLE_CLOUD_VISION_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_VISION_CLIENT_EMAIL=vision@sierra-suites-vision.iam.gserviceaccount.com

# OR use service account file
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

### Phase 2: Core Vision Service

#### Create Vision Service (`lib/ai/vision-service.ts`)

```typescript
import vision from '@google-cloud/vision'

let visionClient: vision.ImageAnnotatorClient | null = null

function getVisionClient() {
  if (!visionClient) {
    visionClient = new vision.ImageAnnotatorClient({
      credentials: {
        client_email: process.env.GOOGLE_CLOUD_VISION_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CLOUD_VISION_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    })
  }
  return visionClient
}

/**
 * Analyze image for objects, labels, and text
 */
export async function analyzeImage(imageBuffer: Buffer) {
  const client = getVisionClient()

  const [result] = await client.annotateImage({
    image: { content: imageBuffer },
    features: [
      { type: 'LABEL_DETECTION', maxResults: 10 },
      { type: 'OBJECT_LOCALIZATION', maxResults: 10 },
      { type: 'TEXT_DETECTION', maxResults: 10 },
      { type: 'SAFE_SEARCH_DETECTION' },
      { type: 'IMAGE_PROPERTIES' },
    ],
  })

  return {
    labels: result.labelAnnotations || [],
    objects: result.localizedObjectAnnotations || [],
    text: result.textAnnotations || [],
    safeSearch: result.safeSearchAnnotation,
    colors: result.imagePropertiesAnnotation?.dominantColors?.colors || [],
  }
}

/**
 * Detect construction-specific hazards
 */
export async function detectSafetyHazards(imageBuffer: Buffer) {
  const analysis = await analyzeImage(imageBuffer)

  const hazards: string[] = []

  // Check for PPE violations
  const objects = analysis.objects.map(o => o.name?.toLowerCase() || '')

  if (objects.includes('person')) {
    const hasHelmet = objects.some(o => o.includes('helmet') || o.includes('hard hat'))
    const hasVest = objects.some(o => o.includes('vest') || o.includes('safety'))

    if (!hasHelmet) hazards.push('Missing hard hat/helmet')
    if (!hasVest) hazards.push('Missing safety vest')
  }

  // Check for unsafe conditions
  const labels = analysis.labels.map(l => l.description?.toLowerCase() || '')

  if (labels.includes('scaffolding') && !labels.includes('guardrail')) {
    hazards.push('Scaffolding without visible guardrails')
  }

  if (labels.includes('ladder') && labels.includes('unstable')) {
    hazards.push('Potentially unstable ladder')
  }

  if (labels.includes('electrical') && labels.includes('water')) {
    hazards.push('Electrical equipment near water')
  }

  return {
    hazards,
    severity: hazards.length > 0 ? 'warning' : 'safe',
    confidence: analysis.labels[0]?.score || 0,
  }
}

/**
 * Score construction quality from photo
 */
export async function scoreQuality(imageBuffer: Buffer) {
  const analysis = await analyzeImage(imageBuffer)

  let score = 100
  const issues: string[] = []

  // Check for common quality issues
  const labels = analysis.labels.map(l => l.description?.toLowerCase() || '')

  if (labels.includes('crack') || labels.includes('damage')) {
    score -= 20
    issues.push('Visible cracks or damage detected')
  }

  if (labels.includes('debris') || labels.includes('clutter')) {
    score -= 10
    issues.push('Work area not clean')
  }

  if (labels.includes('unfinished') || labels.includes('incomplete')) {
    score -= 15
    issues.push('Work appears incomplete')
  }

  // Check alignment/straightness (using image properties)
  // This would require more advanced analysis

  return {
    score: Math.max(0, score),
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : 'D',
    issues,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Extract text from documents (OCR)
 */
export async function extractText(imageBuffer: Buffer) {
  const client = getVisionClient()

  const [result] = await client.textDetection(imageBuffer)
  const detections = result.textAnnotations || []

  return {
    fullText: detections[0]?.description || '',
    words: detections.slice(1).map(d => d.description),
    confidence: detections[0]?.confidence || 0,
  }
}
```

### Phase 3: Update FieldSnap Analyze Endpoint

Update `app/api/fieldsnap/analyze/route.ts`:

```typescript
import { analyzeImage, detectSafetyHazards, scoreQuality } from '@/lib/ai/vision-service'

export async function POST(request: NextRequest) {
  // ... auth code ...

  // Get image from request
  const formData = await request.formData()
  const imageFile = formData.get('image') as File

  if (!imageFile) {
    return NextResponse.json({ error: 'No image provided' }, { status: 400 })
  }

  // Convert to buffer
  const arrayBuffer = await imageFile.arrayBuffer()
  const imageBuffer = Buffer.from(arrayBuffer)

  // Run vision analysis
  const [visionAnalysis, hazards, quality] = await Promise.all([
    analyzeImage(imageBuffer),
    detectSafetyHazards(imageBuffer),
    scoreQuality(imageBuffer),
  ])

  // Also get text analysis from OpenAI (existing functionality)
  const textAnalysis = await analyzeWithOpenAI(imageBuffer)

  return NextResponse.json({
    success: true,
    analysis: {
      // Vision API results
      labels: visionAnalysis.labels.map(l => ({
        name: l.description,
        confidence: l.score,
      })),
      objects: visionAnalysis.objects.map(o => ({
        name: o.name,
        confidence: o.score,
        boundingBox: o.boundingPoly,
      })),
      detectedText: visionAnalysis.text[0]?.description || '',

      // Safety analysis
      safetyHazards: hazards.hazards,
      safetySeverity: hazards.severity,

      // Quality scoring
      qualityScore: quality.score,
      qualityGrade: quality.grade,
      qualityIssues: quality.issues,

      // OpenAI text analysis (existing)
      description: textAnalysis.description,
      suggestions: textAnalysis.suggestions,
    },
  })
}
```

### Phase 4: Safety Hazard Detector

Create `lib/ai/safety-detector.ts`:

```typescript
/**
 * Construction Safety Hazard Detection
 *
 * Uses computer vision to identify common safety violations
 */

export const SAFETY_RULES = {
  PPE_REQUIRED: {
    id: 'ppe_required',
    name: 'Personal Protective Equipment',
    checks: ['hard_hat', 'safety_vest', 'safety_glasses', 'gloves', 'steel_toe_boots'],
  },
  FALL_PROTECTION: {
    id: 'fall_protection',
    name: 'Fall Protection',
    checks: ['guardrails', 'safety_harness', 'safety_net'],
  },
  ELECTRICAL_SAFETY: {
    id: 'electrical_safety',
    name: 'Electrical Safety',
    checks: ['grounded_equipment', 'gfci_protection', 'proper_wiring'],
  },
  FIRE_SAFETY: {
    id: 'fire_safety',
    name: 'Fire Safety',
    checks: ['fire_extinguisher', 'clear_exits', 'no_smoking_near_flammables'],
  },
  HOUSEKEEPING: {
    id: 'housekeeping',
    name: 'Housekeeping & Cleanliness',
    checks: ['clear_walkways', 'organized_materials', 'waste_disposal'],
  },
}

export interface SafetyViolation {
  rule: string
  severity: 'critical' | 'warning' | 'minor'
  description: string
  confidence: number
  location?: {
    x: number
    y: number
    width: number
    height: number
  }
}

export async function detectViolations(
  visionAnalysis: any
): Promise<SafetyViolation[]> {
  const violations: SafetyViolation[] = []

  // PPE Detection
  const people = visionAnalysis.objects.filter((o: any) =>
    o.name?.toLowerCase().includes('person')
  )

  for (const person of people) {
    // Check for hard hat
    const hasHardHat = visionAnalysis.objects.some((o: any) =>
      (o.name?.toLowerCase().includes('helmet') || o.name?.toLowerCase().includes('hard hat')) &&
      isNearby(person.boundingPoly, o.boundingPoly)
    )

    if (!hasHardHat) {
      violations.push({
        rule: 'PPE_REQUIRED',
        severity: 'critical',
        description: 'Person detected without hard hat',
        confidence: person.score || 0,
        location: getBoundingBox(person.boundingPoly),
      })
    }

    // Check for safety vest
    const hasVest = visionAnalysis.objects.some((o: any) =>
      o.name?.toLowerCase().includes('vest') &&
      isNearby(person.boundingPoly, o.boundingPoly)
    )

    if (!hasVest) {
      violations.push({
        rule: 'PPE_REQUIRED',
        severity: 'warning',
        description: 'Person detected without safety vest',
        confidence: person.score || 0,
        location: getBoundingBox(person.boundingPoly),
      })
    }
  }

  // Fall Protection
  const hasScaffolding = visionAnalysis.labels.some((l: any) =>
    l.description?.toLowerCase().includes('scaffolding')
  )

  if (hasScaffolding) {
    const hasGuardrails = visionAnalysis.labels.some((l: any) =>
      l.description?.toLowerCase().includes('guardrail') ||
      l.description?.toLowerCase().includes('railing')
    )

    if (!hasGuardrails) {
      violations.push({
        rule: 'FALL_PROTECTION',
        severity: 'critical',
        description: 'Scaffolding without visible guardrails',
        confidence: 0.8,
      })
    }
  }

  return violations
}

function isNearby(box1: any, box2: any): boolean {
  // Simple proximity check - could be more sophisticated
  const distance = Math.sqrt(
    Math.pow((box1.normalizedVertices[0].x - box2.normalizedVertices[0].x), 2) +
    Math.pow((box1.normalizedVertices[0].y - box2.normalizedVertices[0].y), 2)
  )
  return distance < 0.3 // Within 30% of image
}

function getBoundingBox(poly: any) {
  if (!poly?.normalizedVertices?.[0]) return undefined

  return {
    x: poly.normalizedVertices[0].x,
    y: poly.normalizedVertices[0].y,
    width: poly.normalizedVertices[2].x - poly.normalizedVertices[0].x,
    height: poly.normalizedVertices[2].y - poly.normalizedVertices[0].y,
  }
}
```

## Cost Estimation

### Google Cloud Vision Pricing (as of 2024)

| Feature | Price (per 1000 images) |
|---------|------------------------|
| Label Detection | $1.50 |
| Object Localization | $1.50 |
| Text Detection (OCR) | $1.50 |
| Safe Search | $1.50 |
| Image Properties | $1.50 |

**Total per image (all features):** $0.0075 per image

**Monthly estimates:**
- 100 photos/day = $22.50/month
- 500 photos/day = $112.50/month
- 1000 photos/day = $225/month

**First 1000 images per month are FREE.**

## Testing Strategy

### Unit Tests

```typescript
describe('Vision Service', () => {
  it('should detect objects in construction site photo', async () => {
    const imageBuffer = fs.readFileSync('test-images/construction-site.jpg')
    const result = await analyzeImage(imageBuffer)

    expect(result.objects).toBeDefined()
    expect(result.labels.length).toBeGreaterThan(0)
  })

  it('should detect missing hard hat', async () => {
    const imageBuffer = fs.readFileSync('test-images/worker-no-helmet.jpg')
    const result = await detectSafetyHazards(imageBuffer)

    expect(result.hazards).toContain('Missing hard hat/helmet')
    expect(result.severity).toBe('warning')
  })

  it('should score quality correctly', async () => {
    const imageBuffer = fs.readFileSync('test-images/finished-work.jpg')
    const result = await scoreQuality(imageBuffer)

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
    expect(result.grade).toMatch(/[A-D]/)
  })
})
```

### Integration Tests

1. Upload test images through FieldSnap
2. Verify vision analysis results
3. Check hazard detection accuracy
4. Validate quality scoring
5. Test OCR on documents

## Production Checklist

- [ ] Create Google Cloud project
- [ ] Enable Cloud Vision API
- [ ] Create service account
- [ ] Download credentials
- [ ] Add environment variables
- [ ] Install @google-cloud/vision
- [ ] Implement vision service
- [ ] Update analyze endpoint
- [ ] Test with sample images
- [ ] Set up error monitoring
- [ ] Configure rate limiting
- [ ] Add cost tracking
- [ ] Document API usage
- [ ] Train users on features

## Future Enhancements

### 1. Custom Model Training
- Train TensorFlow model on construction-specific images
- Improve accuracy for niche scenarios
- Reduce API costs with local inference

### 2. Video Analysis
- Analyze timelapse videos
- Detect progress over time
- Automatic highlight generation

### 3. 3D Reconstruction
- Photogrammetry from multiple angles
- Generate 3D models of sites
- Measure dimensions from photos

### 4. Augmented Reality
- AR overlays for measurements
- Virtual furniture placement
- Design visualization on-site

## Resources

- [Google Cloud Vision API Docs](https://cloud.google.com/vision/docs)
- [Vision API Pricing](https://cloud.google.com/vision/pricing)
- [Best Practices Guide](https://cloud.google.com/vision/docs/best-practices)
- [@google-cloud/vision NPM](https://www.npmjs.com/package/@google-cloud/vision)

---

**Status:** 📋 DOCUMENTED - Ready for implementation when needed
**Estimated Implementation Time:** 12-15 hours
**Priority:** Medium - Differentiator feature but not critical for MVP
