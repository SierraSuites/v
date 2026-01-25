// AI Analysis Service for FieldSnap
// This module provides AI-powered image analysis for construction photos

export interface AIAnalysisResult {
  objects: string[]
  defects: string[]
  safety_issues: string[]
  quality_score: number // 0-100
  confidence: number // 0-1
  analysis_type: 'basic' | 'advanced' | 'construction_specific'
  model_version: string
  processing_time_ms: number
}

export interface AIAnalysisOptions {
  type?: 'basic' | 'advanced' | 'construction_specific'
  focusAreas?: ('objects' | 'defects' | 'safety' | 'quality' | 'progress')[]
  includeAnnotations?: boolean
  saveToHistory?: boolean
}

/**
 * Analyze a construction photo using AI
 * In production, this would call OpenAI Vision API, AWS Rekognition, or a custom ML model
 */
export async function analyzePhoto(
  imageUrl: string,
  options: AIAnalysisOptions = {}
): Promise<AIAnalysisResult> {
  const startTime = Date.now()

  const {
    type = 'basic',
    focusAreas = ['objects', 'defects', 'safety', 'quality'],
    includeAnnotations = false,
    saveToHistory = true
  } = options

  try {
    // Check if OpenAI API key is configured
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY

    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      // Return mock data for demo purposes
      console.warn('AI Analysis API key not configured. Using mock data.')
      return getMockAnalysis(type, startTime)
    }

    // Call OpenAI Vision API
    const analysis = await analyzeWithOpenAI(imageUrl, apiKey, type, focusAreas)

    const processingTime = Date.now() - startTime

    const result: AIAnalysisResult = {
      ...analysis,
      analysis_type: type,
      model_version: 'gpt-4-vision',
      processing_time_ms: processingTime
    }

    if (saveToHistory) {
      // In a real implementation, save to ai_analysis_history table
      console.log('Saving analysis to history:', result)
    }

    return result
  } catch (error) {
    console.error('Error analyzing photo:', error)
    // Return mock data on error
    return getMockAnalysis(type, startTime)
  }
}

/**
 * Analyze photo using OpenAI Vision API
 */
async function analyzeWithOpenAI(
  imageUrl: string,
  apiKey: string,
  type: string,
  focusAreas: string[]
): Promise<Omit<AIAnalysisResult, 'analysis_type' | 'model_version' | 'processing_time_ms'>> {
  const prompt = buildAnalysisPrompt(type, focusAreas)

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
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
      max_tokens: 1000
    })
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`)
  }

  const data = await response.json()
  const analysisText = data.choices[0]?.message?.content || ''

  // Parse the AI response
  return parseAIResponse(analysisText)
}

/**
 * Build analysis prompt based on type and focus areas
 */
function buildAnalysisPrompt(type: string, focusAreas: string[]): string {
  let prompt = 'Analyze this construction site photo and provide a detailed assessment. Return your analysis in JSON format with the following structure:\n\n'

  prompt += '{\n'
  prompt += '  "objects": ["list of detected objects and equipment"],\n'
  prompt += '  "defects": ["list of visible defects or quality issues"],\n'
  prompt += '  "safety_issues": ["list of safety concerns or violations"],\n'
  prompt += '  "quality_score": <0-100>,\n'
  prompt += '  "confidence": <0-1>\n'
  prompt += '}\n\n'

  if (type === 'construction_specific') {
    prompt += 'Focus on construction-specific elements:\n'
    prompt += '- Building materials (concrete, steel, lumber, drywall, etc.)\n'
    prompt += '- Construction equipment (cranes, excavators, scaffolding, tools)\n'
    prompt += '- Safety equipment (hard hats, safety vests, barriers, signage)\n'
    prompt += '- Workmanship quality (alignment, finish, cleanliness)\n'
    prompt += '- Code compliance issues\n'
    prompt += '- Progress indicators (framing complete, MEP rough-in, etc.)\n\n'
  }

  if (focusAreas.includes('safety')) {
    prompt += 'Pay special attention to:\n'
    prompt += '- PPE compliance (hard hats, safety glasses, gloves, vests)\n'
    prompt += '- Fall protection (guardrails, harnesses, netting)\n'
    prompt += '- Hazard zones and barriers\n'
    prompt += '- Emergency equipment accessibility\n'
    prompt += '- Housekeeping and trip hazards\n\n'
  }

  if (focusAreas.includes('defects')) {
    prompt += 'Look for defects such as:\n'
    prompt += '- Cracks in concrete or drywall\n'
    prompt += '- Misalignment or uneven surfaces\n'
    prompt += '- Poor workmanship or finishing\n'
    prompt += '- Water damage or staining\n'
    prompt += '- Structural concerns\n\n'
  }

  if (focusAreas.includes('quality')) {
    prompt += 'Assess quality based on:\n'
    prompt += '- Overall workmanship\n'
    prompt += '- Attention to detail\n'
    prompt += '- Cleanliness and organization\n'
    prompt += '- Industry standards compliance\n\n'
  }

  prompt += 'Provide specific, actionable observations. Be concise but thorough.'

  return prompt
}

/**
 * Parse AI response text into structured data
 */
function parseAIResponse(text: string): Omit<AIAnalysisResult, 'analysis_type' | 'model_version' | 'processing_time_ms'> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        objects: parsed.objects || [],
        defects: parsed.defects || [],
        safety_issues: parsed.safety_issues || [],
        quality_score: parsed.quality_score || 75,
        confidence: parsed.confidence || 0.8
      }
    }
  } catch (error) {
    console.error('Error parsing AI response:', error)
  }

  // Fallback: try to extract data from text
  return {
    objects: extractListFromText(text, 'objects'),
    defects: extractListFromText(text, 'defects'),
    safety_issues: extractListFromText(text, 'safety'),
    quality_score: 75,
    confidence: 0.7
  }
}

/**
 * Extract list items from text
 */
function extractListFromText(text: string, keyword: string): string[] {
  const lines = text.split('\n')
  const items: string[] = []
  let capturing = false

  for (const line of lines) {
    if (line.toLowerCase().includes(keyword)) {
      capturing = true
      continue
    }
    if (capturing && line.match(/^[-*•]\s+(.+)/)) {
      items.push(line.replace(/^[-*•]\s+/, '').trim())
    } else if (capturing && items.length > 0) {
      break
    }
  }

  return items
}

/**
 * Generate mock analysis data for demo/testing
 */
function getMockAnalysis(type: string, startTime: number): AIAnalysisResult {
  const mockData = {
    basic: {
      objects: ['Construction site', 'Building materials', 'Equipment', 'Workers'],
      defects: [],
      safety_issues: [],
      quality_score: 85,
      confidence: 0.75
    },
    advanced: {
      objects: ['Concrete mixer', 'Scaffolding', 'Hard hats', 'Safety barriers', 'Lumber stack', 'Power tools'],
      defects: ['Minor surface crack in concrete', 'Uneven drywall joint'],
      safety_issues: ['Worker without safety vest'],
      quality_score: 78,
      confidence: 0.82
    },
    construction_specific: {
      objects: [
        'Concrete formwork',
        'Rebar installation',
        'Scaffolding system',
        'Hard hats (4 visible)',
        'Safety vest (3 visible)',
        'Power drill',
        'Measuring tape',
        'Safety barriers',
        'Material storage area'
      ],
      defects: [
        'Hairline crack in concrete slab (section 3)',
        'Misaligned formwork on north wall',
        'Incomplete rebar tie-off (2 locations)',
        'Surface spalling on column C4'
      ],
      safety_issues: [
        'One worker without proper PPE',
        'Unsecured scaffold platform',
        'Trip hazard: loose materials in walkway',
        'Missing guardrail on elevated platform'
      ],
      quality_score: 72,
      confidence: 0.88
    }
  }

  const data = mockData[type as keyof typeof mockData] || mockData.basic

  return {
    ...data,
    analysis_type: type as 'basic' | 'advanced' | 'construction_specific',
    model_version: 'mock-v1.0',
    processing_time_ms: Date.now() - startTime
  }
}

/**
 * Batch analyze multiple photos
 */
export async function batchAnalyzePhotos(
  imageUrls: string[],
  options: AIAnalysisOptions = {}
): Promise<AIAnalysisResult[]> {
  const results = await Promise.all(
    imageUrls.map(url => analyzePhoto(url, options))
  )
  return results
}

/**
 * Get analysis cost estimate
 */
export function estimateAnalysisCost(
  photoCount: number,
  type: 'basic' | 'advanced' | 'construction_specific' = 'basic'
): {
  estimatedCost: number
  currency: string
  perPhotoC cost: number
} {
  const costPerPhoto = {
    basic: 0.01,       // $0.01 per photo
    advanced: 0.03,    // $0.03 per photo
    construction_specific: 0.05  // $0.05 per photo
  }

  const cost = costPerPhoto[type] * photoCount

  return {
    estimatedCost: parseFloat(cost.toFixed(2)),
    currency: 'USD',
    perPhotoCost: costPerPhoto[type]
  }
}

/**
 * Analyze defect severity
 */
export function analyzeDefectSeverity(defect: string): {
  severity: 'low' | 'medium' | 'high' | 'critical'
  urgent: boolean
  estimatedRepairCost: string
} {
  const criticalKeywords = ['structural', 'collapse', 'unsafe', 'code violation', 'failure']
  const highKeywords = ['crack', 'leak', 'damage', 'misalignment']
  const mediumKeywords = ['uneven', 'minor', 'cosmetic', 'surface']

  const lowerDefect = defect.toLowerCase()

  if (criticalKeywords.some(keyword => lowerDefect.includes(keyword))) {
    return {
      severity: 'critical',
      urgent: true,
      estimatedRepairCost: '$5,000+'
    }
  }

  if (highKeywords.some(keyword => lowerDefect.includes(keyword))) {
    return {
      severity: 'high',
      urgent: true,
      estimatedRepairCost: '$1,000-$5,000'
    }
  }

  if (mediumKeywords.some(keyword => lowerDefect.includes(keyword))) {
    return {
      severity: 'medium',
      urgent: false,
      estimatedRepairCost: '$250-$1,000'
    }
  }

  return {
    severity: 'low',
    urgent: false,
    estimatedRepairCost: '$100-$250'
  }
}
