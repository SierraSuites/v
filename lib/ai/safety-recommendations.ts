/**
 * AI Safety Recommendation Engine
 * Predictive safety analytics for construction sites
 */

interface ProjectSafetyProfile {
  project_type: string
  project_phase: 'pre_construction' | 'foundation' | 'framing' | 'mep' | 'finishes' | 'closeout'
  site_conditions: SiteConditions
  team_size: number
  equipment_in_use: string[]
  weather_conditions?: WeatherConditions
  work_height_ft?: number
}

interface SiteConditions {
  confined_spaces: boolean
  excavation_depth_ft: number
  overhead_work: boolean
  heavy_equipment: boolean
  electrical_work: boolean
  demolition: boolean
  hazardous_materials: boolean
}

interface WeatherConditions {
  temperature_f: number
  wind_speed_mph: number
  precipitation: boolean
  visibility_miles: number
}

interface SafetyRecommendation {
  id: string
  category: 'ppe' | 'procedure' | 'equipment' | 'training' | 'environmental'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  rationale: string
  required_by?: string // OSHA regulation
  implementation_steps: string[]
  estimated_cost: number
  estimated_time_hours: number
  potential_incidents_prevented: string[]
}

interface SafetyRiskAssessment {
  overall_risk_score: number // 0-100
  risk_level: 'low' | 'moderate' | 'high' | 'critical'
  top_hazards: Hazard[]
  recommendations: SafetyRecommendation[]
  required_certifications: string[]
  inspection_checklist: ChecklistItem[]
}

interface Hazard {
  hazard_type: string
  risk_score: number
  likelihood: 'rare' | 'unlikely' | 'possible' | 'likely' | 'almost_certain'
  severity: 'negligible' | 'minor' | 'moderate' | 'major' | 'catastrophic'
  description: string
  affected_workers: number
}

interface ChecklistItem {
  category: string
  item: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'as_needed'
  regulatory_requirement?: string
}

/**
 * OSHA hazard categories and risk factors
 */
const OSHA_FOCUS_FOUR = [
  'falls',
  'struck_by',
  'caught_in_between',
  'electrocution',
] as const

/**
 * Calculate safety risk score for a project
 */
export function assessProjectSafety(profile: ProjectSafetyProfile): SafetyRiskAssessment {
  const hazards: Hazard[] = []
  const recommendations: SafetyRecommendation[] = []
  const requiredCertifications: string[] = []
  const inspectionChecklist: ChecklistItem[] = []

  let riskScore = 0

  // Assess fall hazards
  if (profile.work_height_ft && profile.work_height_ft > 6) {
    const fallRisk = Math.min(profile.work_height_ft / 2, 40) // Cap at 40
    riskScore += fallRisk

    hazards.push({
      hazard_type: 'Falls from Height',
      risk_score: fallRisk,
      likelihood: profile.work_height_ft > 20 ? 'likely' : 'possible',
      severity: profile.work_height_ft > 30 ? 'catastrophic' : 'major',
      description: `Work at ${profile.work_height_ft} feet requires fall protection`,
      affected_workers: Math.ceil(profile.team_size * 0.4),
    })

    recommendations.push({
      id: 'fall-protection-1',
      category: 'ppe',
      priority: 'critical',
      title: 'Implement Fall Protection System',
      description: `All workers at heights above 6 feet must use fall protection`,
      rationale: 'OSHA 1926.501 - Falls are the leading cause of construction deaths',
      required_by: 'OSHA 1926.501',
      implementation_steps: [
        'Provide full-body harnesses to all workers',
        'Install anchor points and lifelines',
        'Conduct fall protection training',
        'Inspect equipment before each use',
        'Establish rescue plan',
      ],
      estimated_cost: profile.team_size * 400, // $400 per worker for equipment
      estimated_time_hours: profile.team_size * 2, // 2 hours training per worker
      potential_incidents_prevented: ['Falls', 'Serious injury', 'Fatality'],
    })

    requiredCertifications.push('Fall Protection Competent Person')

    inspectionChecklist.push({
      category: 'Fall Protection',
      item: 'Inspect harnesses, lanyards, and anchor points',
      frequency: 'daily',
      regulatory_requirement: 'OSHA 1926.502',
    })
  }

  // Assess excavation hazards
  if (profile.site_conditions.excavation_depth_ft > 5) {
    const excavationRisk = Math.min(profile.site_conditions.excavation_depth_ft * 2, 30)
    riskScore += excavationRisk

    hazards.push({
      hazard_type: 'Excavation Cave-In',
      risk_score: excavationRisk,
      likelihood: profile.site_conditions.excavation_depth_ft > 10 ? 'likely' : 'possible',
      severity: 'catastrophic',
      description: `Excavation depth of ${profile.site_conditions.excavation_depth_ft} feet requires protective system`,
      affected_workers: Math.ceil(profile.team_size * 0.3),
    })

    recommendations.push({
      id: 'excavation-1',
      category: 'procedure',
      priority: 'critical',
      title: 'Install Excavation Protective System',
      description: 'Implement shoring, sloping, or shielding for excavations over 5 feet deep',
      rationale: 'OSHA 1926 Subpart P - Prevent cave-ins and soil collapse',
      required_by: 'OSHA 1926.652',
      implementation_steps: [
        'Have competent person classify soil type',
        'Design protective system based on soil classification',
        'Install shoring or trench box before worker entry',
        'Inspect excavation daily and after rain',
        'Provide safe means of egress every 25 feet',
      ],
      estimated_cost: 5000, // Trench box rental or shoring materials
      estimated_time_hours: 16,
      potential_incidents_prevented: ['Cave-in', 'Burial', 'Crushing injuries'],
    })

    requiredCertifications.push('Excavation Competent Person')

    inspectionChecklist.push({
      category: 'Excavation',
      item: 'Daily excavation safety inspection by competent person',
      frequency: 'daily',
      regulatory_requirement: 'OSHA 1926.651(k)',
    })
  }

  // Assess confined space hazards
  if (profile.site_conditions.confined_spaces) {
    riskScore += 25

    hazards.push({
      hazard_type: 'Confined Space Entry',
      risk_score: 25,
      likelihood: 'possible',
      severity: 'catastrophic',
      description: 'Confined spaces present multiple hazards including oxygen deficiency and toxic atmospheres',
      affected_workers: Math.ceil(profile.team_size * 0.2),
    })

    recommendations.push({
      id: 'confined-space-1',
      category: 'procedure',
      priority: 'critical',
      title: 'Establish Confined Space Entry Program',
      description: 'Implement permit-required confined space procedures',
      rationale: 'OSHA 1926.1200 - Prevent asphyxiation and toxic exposure',
      required_by: 'OSHA 1926.1200',
      implementation_steps: [
        'Identify and label all permit-required confined spaces',
        'Test atmosphere before and during entry',
        'Provide continuous ventilation',
        'Station attendant at entry point',
        'Establish rescue procedures',
        'Issue entry permits for each entry',
      ],
      estimated_cost: 3500, // Atmospheric testing equipment, ventilation
      estimated_time_hours: 24,
      potential_incidents_prevented: ['Asphyxiation', 'Toxic exposure', 'Engulfment'],
    })

    requiredCertifications.push('Confined Space Entry Supervisor')

    inspectionChecklist.push({
      category: 'Confined Space',
      item: 'Atmospheric testing and permit verification',
      frequency: 'as_needed',
      regulatory_requirement: 'OSHA 1926.1203',
    })
  }

  // Assess electrical hazards
  if (profile.site_conditions.electrical_work) {
    riskScore += 20

    hazards.push({
      hazard_type: 'Electrical Shock/Arc Flash',
      risk_score: 20,
      likelihood: 'possible',
      severity: 'major',
      description: 'Electrical work presents shock and arc flash hazards',
      affected_workers: Math.ceil(profile.team_size * 0.25),
    })

    recommendations.push({
      id: 'electrical-1',
      category: 'procedure',
      priority: 'high',
      title: 'Implement Electrical Safety Program',
      description: 'Establish lockout/tagout procedures and arc flash protection',
      rationale: 'OSHA 1926 Subpart K - Prevent electrocution (4th leading cause of construction deaths)',
      required_by: 'OSHA 1926.416, 1926.417',
      implementation_steps: [
        'Implement lockout/tagout program',
        'Provide arc-rated PPE based on hazard analysis',
        'Ensure only qualified electricians work on live circuits',
        'Use GFCI protection on temporary power',
        'Maintain safe clearances from overhead lines',
      ],
      estimated_cost: 2500,
      estimated_time_hours: 16,
      potential_incidents_prevented: ['Electrocution', 'Arc flash burns', 'Shock injuries'],
    })

    requiredCertifications.push('Qualified Electrician', 'LOTO Authorized Person')

    inspectionChecklist.push({
      category: 'Electrical',
      item: 'GFCI testing and cord/tool inspection',
      frequency: 'daily',
      regulatory_requirement: 'OSHA 1926.404',
    })
  }

  // Assess heavy equipment hazards
  if (profile.site_conditions.heavy_equipment) {
    riskScore += 18

    hazards.push({
      hazard_type: 'Struck-By/Caught-Between Equipment',
      risk_score: 18,
      likelihood: 'possible',
      severity: 'major',
      description: 'Heavy equipment operations create struck-by and caught-between hazards',
      affected_workers: profile.team_size,
    })

    recommendations.push({
      id: 'equipment-1',
      category: 'procedure',
      priority: 'high',
      title: 'Equipment Safety Protocols',
      description: 'Implement heavy equipment safety procedures and spotters',
      rationale: 'Prevent struck-by incidents (2nd leading cause of construction deaths)',
      implementation_steps: [
        'Assign spotters for all backing operations',
        'Establish equipment exclusion zones',
        'Ensure operators are certified',
        'Conduct pre-operation inspections',
        'Use high-visibility vests for all ground workers',
      ],
      estimated_cost: 1500,
      estimated_time_hours: 8,
      potential_incidents_prevented: ['Struck-by incidents', 'Crushing injuries', 'Runover accidents'],
    })

    requiredCertifications.push('Equipment Operator Certification')

    inspectionChecklist.push({
      category: 'Equipment',
      item: 'Daily equipment pre-operation inspection',
      frequency: 'daily',
      regulatory_requirement: 'OSHA 1926.602',
    })
  }

  // Assess weather-related hazards
  if (profile.weather_conditions) {
    if (profile.weather_conditions.temperature_f > 90) {
      riskScore += 12

      recommendations.push({
        id: 'heat-1',
        category: 'environmental',
        priority: 'high',
        title: 'Heat Illness Prevention Program',
        description: 'Implement heat stress controls for high temperature work',
        rationale: 'Prevent heat exhaustion and heat stroke',
        implementation_steps: [
          'Provide water (1 quart per hour per worker)',
          'Establish shade rest areas',
          'Schedule heaviest work during cooler hours',
          'Implement work/rest cycles',
          'Train workers on heat illness signs',
        ],
        estimated_cost: 800,
        estimated_time_hours: 4,
        potential_incidents_prevented: ['Heat exhaustion', 'Heat stroke', 'Dehydration'],
      })
    }

    if (profile.weather_conditions.wind_speed_mph > 25) {
      riskScore += 15

      recommendations.push({
        id: 'wind-1',
        category: 'procedure',
        priority: 'high',
        title: 'High Wind Work Restrictions',
        description: 'Suspend certain operations during high wind conditions',
        rationale: 'Prevent wind-related falls and material displacement',
        implementation_steps: [
          'Stop crane operations when winds exceed 20 mph',
          'Suspend work on scaffolding above 30 feet in high winds',
          'Secure all loose materials and equipment',
          'Monitor weather forecasts continuously',
        ],
        estimated_cost: 0,
        estimated_time_hours: 2,
        potential_incidents_prevented: ['Falls', 'Struck-by falling objects', 'Crane accidents'],
      })
    }
  }

  // Universal recommendations
  recommendations.push({
    id: 'ppe-general',
    category: 'ppe',
    priority: 'high',
    title: 'Mandatory PPE Program',
    description: 'Ensure all workers have and use required personal protective equipment',
    rationale: 'OSHA 1926 Subpart E - Basic protection for all workers',
    required_by: 'OSHA 1926.95, 1926.100, 1926.102',
    implementation_steps: [
      'Provide hard hats (ANSI Z89.1)',
      'Safety glasses with side shields',
      'Steel-toe boots (ASTM F2413)',
      'High-visibility vests (ANSI 107)',
      'Gloves appropriate for task',
      'Enforce 100% PPE compliance',
    ],
    estimated_cost: profile.team_size * 250,
    estimated_time_hours: profile.team_size * 0.5,
    potential_incidents_prevented: ['Head injuries', 'Eye injuries', 'Foot injuries', 'Struck-by visibility issues'],
  })

  // Standard inspections
  inspectionChecklist.push(
    {
      category: 'General',
      item: 'Site safety walk-through',
      frequency: 'daily',
      regulatory_requirement: 'Best Practice',
    },
    {
      category: 'Housekeeping',
      item: 'Debris removal and trip hazard elimination',
      frequency: 'daily',
      regulatory_requirement: 'OSHA 1926.25',
    },
    {
      category: 'Fire Safety',
      item: 'Fire extinguisher inspection',
      frequency: 'monthly',
      regulatory_requirement: 'OSHA 1926.150',
    }
  )

  // Determine overall risk level
  let riskLevel: 'low' | 'moderate' | 'high' | 'critical'
  if (riskScore < 20) {
    riskLevel = 'low'
  } else if (riskScore < 40) {
    riskLevel = 'moderate'
  } else if (riskScore < 60) {
    riskLevel = 'high'
  } else {
    riskLevel = 'critical'
  }

  // Sort recommendations by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
  recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

  // Sort hazards by risk score
  hazards.sort((a, b) => b.risk_score - a.risk_score)

  return {
    overall_risk_score: Math.min(riskScore, 100),
    risk_level: riskLevel,
    top_hazards: hazards.slice(0, 5),
    recommendations,
    required_certifications: [...new Set(requiredCertifications)],
    inspection_checklist: inspectionChecklist,
  }
}

/**
 * Generate daily safety briefing topics
 */
export function generateDailySafetyTopics(
  phase: ProjectSafetyProfile['project_phase'],
  recentIncidents?: string[]
): string[] {
  const topicsByPhase: Record<ProjectSafetyProfile['project_phase'], string[]> = {
    pre_construction: [
      'Site hazard assessment and planning',
      'Emergency action plan review',
      'PPE requirements for upcoming work',
    ],
    foundation: [
      'Excavation safety and protective systems',
      'Heavy equipment awareness',
      'Concrete pour safety procedures',
    ],
    framing: [
      'Fall protection requirements',
      'Ladder and scaffold safety',
      'Material handling and lifting',
    ],
    mep: [
      'Electrical safety and LOTO',
      'Confined space entry procedures',
      'Overhead work coordination',
    ],
    finishes: [
      'Dust and respiratory protection',
      'Chemical hazards (paints, adhesives)',
      'Slip, trip, and fall prevention',
    ],
    closeout: [
      'Final cleaning hazards',
      'Punch list safety',
      'Tool and equipment return procedures',
    ],
  }

  const topics = [...topicsByPhase[phase]]

  if (recentIncidents && recentIncidents.length > 0) {
    topics.unshift(`Lessons learned from recent incident: ${recentIncidents[0]}`)
  }

  return topics
}
