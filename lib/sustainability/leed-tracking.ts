/**
 * LEED Certification Tracking Logic
 * Based on LEED v4.1 BD+C (Building Design and Construction)
 */

export type LEEDCategory =
  | 'Location and Transportation'
  | 'Sustainable Sites'
  | 'Water Efficiency'
  | 'Energy and Atmosphere'
  | 'Materials and Resources'
  | 'Indoor Environmental Quality'
  | 'Innovation'
  | 'Regional Priority'

export type LEEDLevel = 'Certified' | 'Silver' | 'Gold' | 'Platinum' | null

export interface LEEDCredit {
  id: string
  category: LEEDCategory
  name: string
  points_available: number
  points_earned: number
  status: 'not_started' | 'in_progress' | 'submitted' | 'achieved' | 'denied'
  description: string
  requirements: string[]
  documentation_needed: string[]
  estimated_cost?: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface LEEDProject {
  project_id: string
  certification_level_target: LEEDLevel
  credits: LEEDCredit[]
  total_points_earned: number
  total_points_possible: number
  current_level: LEEDLevel
  submission_date?: string
  certification_date?: string
}

/**
 * LEED v4.1 Credit Framework
 */
export const LEED_CREDITS: Omit<LEEDCredit, 'points_earned' | 'status'>[] = [
  // LOCATION AND TRANSPORTATION (16 points)
  {
    id: 'LT-1',
    category: 'Location and Transportation',
    name: 'LEED for Neighborhood Development Location',
    points_available: 16,
    description: 'Locate project in a LEED-ND certified development',
    requirements: ['Must be in a certified LEED-ND neighborhood'],
    documentation_needed: ['LEED-ND certification'],
    difficulty: 'hard',
  },
  {
    id: 'LT-2',
    category: 'Location and Transportation',
    name: 'Sensitive Land Protection',
    points_available: 1,
    description: 'Avoid developing environmentally sensitive lands',
    requirements: [
      'Do not build on prime farmland',
      'Avoid floodplains',
      'Protect habitat and wetlands',
    ],
    documentation_needed: ['Site survey', 'Environmental assessment'],
    difficulty: 'medium',
  },
  {
    id: 'LT-3',
    category: 'Location and Transportation',
    name: 'High Priority Site',
    points_available: 2,
    description: 'Encourage development on infill or brownfield sites',
    requirements: ['Build on previously developed land OR', 'Build on priority brownfield'],
    documentation_needed: ['Site history', 'Environmental assessment if brownfield'],
    difficulty: 'easy',
  },
  {
    id: 'LT-4',
    category: 'Location and Transportation',
    name: 'Surrounding Density and Diverse Uses',
    points_available: 5,
    description: 'Locate in areas with high density and diverse uses',
    requirements: ['Meet minimum density requirements', 'Demonstrate diverse uses nearby'],
    documentation_needed: ['GIS analysis', 'Community amenity documentation'],
    difficulty: 'medium',
  },
  {
    id: 'LT-5',
    category: 'Location and Transportation',
    name: 'Access to Quality Transit',
    points_available: 5,
    description: 'Locate near mass transit',
    requirements: ['Within 1/4 mile walk of transit stops'],
    documentation_needed: ['Transit service documentation', 'Walking distance map'],
    difficulty: 'easy',
  },
  {
    id: 'LT-6',
    category: 'Location and Transportation',
    name: 'Bicycle Facilities',
    points_available: 1,
    description: 'Provide bike storage and facilities',
    requirements: ['Short-term bike parking', 'Long-term bike storage', 'Shower facilities'],
    documentation_needed: ['Bike facility plans', 'Count calculations'],
    estimated_cost: 5000,
    difficulty: 'easy',
  },
  {
    id: 'LT-7',
    category: 'Location and Transportation',
    name: 'Reduced Parking Footprint',
    points_available: 1,
    description: 'Reduce parking capacity',
    requirements: ['Do not exceed minimum local code OR', 'Provide 40% preferred parking for carpools/EVs'],
    documentation_needed: ['Parking calculations', 'Local code requirements'],
    difficulty: 'medium',
  },
  {
    id: 'LT-8',
    category: 'Location and Transportation',
    name: 'Green Vehicles',
    points_available: 1,
    description: 'Provide EV charging and carpool/carshare programs',
    requirements: ['5% EV-ready parking spaces OR', 'Carpool/carshare program'],
    documentation_needed: ['EV charging plans', 'Program documentation'],
    estimated_cost: 15000,
    difficulty: 'easy',
  },

  // SUSTAINABLE SITES (10 points)
  {
    id: 'SS-1',
    category: 'Sustainable Sites',
    name: 'Construction Activity Pollution Prevention',
    points_available: 1,
    description: 'Prevent pollution from construction activities (PREREQUISITE)',
    requirements: ['Erosion control plan', 'Sediment control', 'Air quality management'],
    documentation_needed: ['SWPPP', 'Inspection logs'],
    difficulty: 'easy',
  },
  {
    id: 'SS-2',
    category: 'Sustainable Sites',
    name: 'Site Assessment',
    points_available: 1,
    description: 'Conduct comprehensive site assessment',
    requirements: ['Document site conditions', 'Identify sensitive areas'],
    documentation_needed: ['Site survey', 'Assessment report'],
    difficulty: 'easy',
  },
  {
    id: 'SS-3',
    category: 'Sustainable Sites',
    name: 'Site Development - Protect or Restore Habitat',
    points_available: 2,
    description: 'Preserve or restore native vegetation',
    requirements: ['40% greenfield OR', '30% previously developed site'],
    documentation_needed: ['Landscape plans', 'Native plant list'],
    estimated_cost: 20000,
    difficulty: 'medium',
  },
  {
    id: 'SS-4',
    category: 'Sustainable Sites',
    name: 'Open Space',
    points_available: 1,
    description: 'Provide outdoor space for building users',
    requirements: ['30% open space OR', 'Meet local code +25%'],
    documentation_needed: ['Site plan', 'Open space calculations'],
    difficulty: 'easy',
  },
  {
    id: 'SS-5',
    category: 'Sustainable Sites',
    name: 'Rainwater Management',
    points_available: 3,
    description: 'Manage rainwater on-site',
    requirements: ['Replicate natural hydrology', 'Reduce runoff'],
    documentation_needed: ['Stormwater calculations', 'LID strategies'],
    estimated_cost: 35000,
    difficulty: 'medium',
  },
  {
    id: 'SS-6',
    category: 'Sustainable Sites',
    name: 'Heat Island Reduction',
    points_available: 2,
    description: 'Reduce heat island effect',
    requirements: ['Shade/cool hardscape', 'Cool roof', 'Green roof OR', 'Solar panels'],
    documentation_needed: ['Roof plan', 'Hardscape plan', 'Material specifications'],
    estimated_cost: 25000,
    difficulty: 'easy',
  },
  {
    id: 'SS-7',
    category: 'Sustainable Sites',
    name: 'Light Pollution Reduction',
    points_available: 1,
    description: 'Minimize light trespass and sky glow',
    requirements: ['Shield fixtures', 'Reduce lighting levels at night'],
    documentation_needed: ['Lighting plan', 'Photometric calculations'],
    estimated_cost: 8000,
    difficulty: 'easy',
  },

  // WATER EFFICIENCY (11 points)
  {
    id: 'WE-1',
    category: 'Water Efficiency',
    name: 'Outdoor Water Use Reduction',
    points_available: 2,
    description: 'Reduce outdoor water use',
    requirements: ['50% reduction from baseline OR', 'No irrigation'],
    documentation_needed: ['Landscape plan', 'Water budget calculations'],
    estimated_cost: 15000,
    difficulty: 'medium',
  },
  {
    id: 'WE-2',
    category: 'Water Efficiency',
    name: 'Indoor Water Use Reduction',
    points_available: 6,
    description: 'Reduce indoor water use (PREREQUISITE + credits)',
    requirements: ['20% reduction (prerequisite)', 'Additional reductions for more points'],
    documentation_needed: ['Fixture specifications', 'Water use calculations'],
    estimated_cost: 12000,
    difficulty: 'easy',
  },
  {
    id: 'WE-3',
    category: 'Water Efficiency',
    name: 'Cooling Tower Water Use',
    points_available: 2,
    description: 'Reduce water use in cooling towers',
    requirements: ['Water treatment', 'Conductivity controllers'],
    documentation_needed: ['Equipment specifications', 'Calculations'],
    estimated_cost: 18000,
    difficulty: 'medium',
  },
  {
    id: 'WE-4',
    category: 'Water Efficiency',
    name: 'Water Metering',
    points_available: 1,
    description: 'Install permanent water meters',
    requirements: ['Meter all water uses', 'Data accessible'],
    documentation_needed: ['Metering plan', 'Equipment specifications'],
    estimated_cost: 8000,
    difficulty: 'easy',
  },

  // ENERGY AND ATMOSPHERE (33 points)
  {
    id: 'EA-1',
    category: 'Energy and Atmosphere',
    name: 'Enhanced Commissioning',
    points_available: 6,
    description: 'Enhanced building systems commissioning',
    requirements: ['Commission all energy systems', 'Involve commissioning agent early'],
    documentation_needed: ['Commissioning plan', 'Reports', 'Training documentation'],
    estimated_cost: 45000,
    difficulty: 'medium',
  },
  {
    id: 'EA-2',
    category: 'Energy and Atmosphere',
    name: 'Optimize Energy Performance',
    points_available: 18,
    description: 'Maximize energy efficiency (PREREQUISITE + credits)',
    requirements: ['5% better than baseline (prerequisite)', 'Additional improvements for more points'],
    documentation_needed: ['Energy model', 'Equipment specifications'],
    estimated_cost: 100000,
    difficulty: 'medium',
  },
  {
    id: 'EA-3',
    category: 'Energy and Atmosphere',
    name: 'Advanced Energy Metering',
    points_available: 1,
    description: 'Install advanced energy meters',
    requirements: ['Meter all energy uses', 'Real-time data'],
    documentation_needed: ['Metering plan', 'Equipment specifications'],
    estimated_cost: 12000,
    difficulty: 'easy',
  },
  {
    id: 'EA-4',
    category: 'Energy and Atmosphere',
    name: 'Demand Response',
    points_available: 2,
    description: 'Participate in demand response programs',
    requirements: ['10% load shedding capability'],
    documentation_needed: ['DR program enrollment', 'Load shedding plan'],
    estimated_cost: 15000,
    difficulty: 'medium',
  },
  {
    id: 'EA-5',
    category: 'Energy and Atmosphere',
    name: 'Renewable Energy Production',
    points_available: 3,
    description: 'Generate renewable energy on-site',
    requirements: ['1-3% of energy from renewables (1 pt)', 'Up to 10% for 3 points'],
    documentation_needed: ['Renewable energy calculations', 'Equipment specifications'],
    estimated_cost: 75000,
    difficulty: 'medium',
  },
  {
    id: 'EA-6',
    category: 'Energy and Atmosphere',
    name: 'Enhanced Refrigerant Management',
    points_available: 1,
    description: 'Reduce refrigerant impact',
    requirements: ['No refrigerants OR', 'Low GWP refrigerants'],
    documentation_needed: ['Equipment specifications', 'Refrigerant impact calculations'],
    difficulty: 'easy',
  },
  {
    id: 'EA-7',
    category: 'Energy and Atmosphere',
    name: 'Green Power and Carbon Offsets',
    points_available: 2,
    description: 'Purchase renewable energy or carbon offsets',
    requirements: ['50% green power for 2 years (1 pt)', '100% for 2 points'],
    documentation_needed: ['Green power contracts', 'Purchase receipts'],
    estimated_cost: 20000,
    difficulty: 'easy',
  },

  // MATERIALS AND RESOURCES (13 points)
  {
    id: 'MR-1',
    category: 'Materials and Resources',
    name: 'Building Life-Cycle Impact Reduction',
    points_available: 5,
    description: 'Reduce building life-cycle impacts',
    requirements: ['Reuse building OR', 'Reuse materials OR', 'LCA showing reduction'],
    documentation_needed: ['Bill of materials', 'LCA report', 'Reuse documentation'],
    difficulty: 'hard',
  },
  {
    id: 'MR-2',
    category: 'Materials and Resources',
    name: 'Building Product Disclosure and Optimization - Environmental Product Declarations',
    points_available: 2,
    description: 'Use products with EPDs',
    requirements: ['20 products with EPDs'],
    documentation_needed: ['Product EPDs', 'Material submittals'],
    difficulty: 'medium',
  },
  {
    id: 'MR-3',
    category: 'Materials and Resources',
    name: 'Building Product Disclosure and Optimization - Sourcing of Raw Materials',
    points_available: 2,
    description: 'Use responsibly sourced materials',
    requirements: ['25% of materials by cost from responsible sources'],
    documentation_needed: ['Certifications (FSC, etc.)', 'Material receipts'],
    difficulty: 'medium',
  },
  {
    id: 'MR-4',
    category: 'Materials and Resources',
    name: 'Building Product Disclosure and Optimization - Material Ingredients',
    points_available: 2,
    description: 'Use products with ingredient disclosure',
    requirements: ['20 products with ingredient transparency'],
    documentation_needed: ['Health Product Declarations', 'Declare labels'],
    difficulty: 'medium',
  },
  {
    id: 'MR-5',
    category: 'Materials and Resources',
    name: 'Construction and Demolition Waste Management',
    points_available: 2,
    description: 'Divert construction waste from landfill (PREREQUISITE + credit)',
    requirements: ['50% diversion (prerequisite)', '75% for 1 point', '90% for 2 points'],
    documentation_needed: ['Waste tracking logs', 'Diversion reports'],
    estimated_cost: 8000,
    difficulty: 'easy',
  },

  // INDOOR ENVIRONMENTAL QUALITY (16 points)
  {
    id: 'EQ-1',
    category: 'Indoor Environmental Quality',
    name: 'Enhanced Indoor Air Quality Strategies',
    points_available: 2,
    description: 'Improve indoor air quality',
    requirements: ['Increased ventilation', 'Air quality monitoring'],
    documentation_needed: ['Ventilation calculations', 'Monitoring plan'],
    estimated_cost: 18000,
    difficulty: 'medium',
  },
  {
    id: 'EQ-2',
    category: 'Indoor Environmental Quality',
    name: 'Low-Emitting Materials',
    points_available: 3,
    description: 'Use materials with low VOC emissions',
    requirements: ['90% of materials by cost meet emissions standards'],
    documentation_needed: ['Product certifications', 'Material submittals'],
    difficulty: 'easy',
  },
  {
    id: 'EQ-3',
    category: 'Indoor Environmental Quality',
    name: 'Construction Indoor Air Quality Management Plan',
    points_available: 1,
    description: 'Protect indoor air quality during construction',
    requirements: ['IAQ plan', 'HVAC protection', 'Flush-out OR testing'],
    documentation_needed: ['IAQ management plan', 'Testing results'],
    estimated_cost: 5000,
    difficulty: 'easy',
  },
  {
    id: 'EQ-4',
    category: 'Indoor Environmental Quality',
    name: 'Indoor Air Quality Assessment',
    points_available: 2,
    description: 'Verify indoor air quality',
    requirements: ['Flush-out OR', 'Air testing'],
    documentation_needed: ['Test results', 'Flush-out documentation'],
    estimated_cost: 8000,
    difficulty: 'easy',
  },
  {
    id: 'EQ-5',
    category: 'Indoor Environmental Quality',
    name: 'Thermal Comfort',
    points_available: 1,
    description: 'Provide thermal comfort',
    requirements: ['Meet ASHRAE 55 standards', 'Occupant controls'],
    documentation_needed: ['Design documentation', 'Control descriptions'],
    difficulty: 'easy',
  },
  {
    id: 'EQ-6',
    category: 'Indoor Environmental Quality',
    name: 'Interior Lighting',
    points_available: 2,
    description: 'Provide quality lighting',
    requirements: ['Lighting controls', 'Daylight access'],
    documentation_needed: ['Lighting plan', 'Daylight calculations'],
    estimated_cost: 12000,
    difficulty: 'medium',
  },
  {
    id: 'EQ-7',
    category: 'Indoor Environmental Quality',
    name: 'Daylight',
    points_available: 3,
    description: 'Maximize daylight access',
    requirements: ['55% of regularly occupied spaces with daylight'],
    documentation_needed: ['Daylight simulations', 'Window calculations'],
    difficulty: 'medium',
  },
  {
    id: 'EQ-8',
    category: 'Indoor Environmental Quality',
    name: 'Quality Views',
    points_available: 1,
    description: 'Provide quality views',
    requirements: ['75% of regularly occupied spaces with views'],
    documentation_needed: ['View analysis', 'Floor plans'],
    difficulty: 'easy',
  },
  {
    id: 'EQ-9',
    category: 'Indoor Environmental Quality',
    name: 'Acoustic Performance',
    points_available: 1,
    description: 'Provide acoustic comfort',
    requirements: ['Meet acoustic standards for HVAC and envelope'],
    documentation_needed: ['Acoustic specifications', 'Testing results'],
    estimated_cost: 15000,
    difficulty: 'medium',
  },

  // INNOVATION (6 points)
  {
    id: 'IN-1',
    category: 'Innovation',
    name: 'Innovation',
    points_available: 5,
    description: 'Achieve exceptional performance or innovative strategies',
    requirements: ['Demonstrate innovation'],
    documentation_needed: ['Innovation narrative', 'Supporting calculations'],
    difficulty: 'hard',
  },
  {
    id: 'IN-2',
    category: 'Innovation',
    name: 'LEED Accredited Professional',
    points_available: 1,
    description: 'Include LEED AP on project team',
    requirements: ['LEED AP with appropriate specialty'],
    documentation_needed: ['LEED AP credentials'],
    difficulty: 'easy',
  },

  // REGIONAL PRIORITY (4 points)
  {
    id: 'RP-1',
    category: 'Regional Priority',
    name: 'Regional Priority',
    points_available: 4,
    description: 'Address regional environmental priorities',
    requirements: ['Achieve credits designated as regional priorities'],
    documentation_needed: ['Regional priority credit documentation'],
    difficulty: 'medium',
  },
]

/**
 * Calculate LEED certification level based on points
 */
export function calculateLEEDLevel(points: number): LEEDLevel {
  if (points >= 80) return 'Platinum'
  if (points >= 60) return 'Gold'
  if (points >= 50) return 'Silver'
  if (points >= 40) return 'Certified'
  return null
}

/**
 * Calculate points needed for next level
 */
export function pointsToNextLevel(currentPoints: number): {
  current_level: LEEDLevel
  next_level: LEEDLevel | null
  points_needed: number
} {
  const current_level = calculateLEEDLevel(currentPoints)

  let next_level: LEEDLevel | null = null
  let points_needed = 0

  if (currentPoints < 40) {
    next_level = 'Certified'
    points_needed = 40 - currentPoints
  } else if (currentPoints < 50) {
    next_level = 'Silver'
    points_needed = 50 - currentPoints
  } else if (currentPoints < 60) {
    next_level = 'Gold'
    points_needed = 60 - currentPoints
  } else if (currentPoints < 80) {
    next_level = 'Platinum'
    points_needed = 80 - currentPoints
  }

  return {
    current_level,
    next_level,
    points_needed,
  }
}

/**
 * Get recommended credits to pursue
 */
export function getRecommendedCredits(
  project: LEEDProject,
  prioritize: 'easy_wins' | 'high_points' | 'low_cost' = 'easy_wins'
): LEEDCredit[] {
  const notStarted = project.credits.filter(c => c.status === 'not_started')

  if (prioritize === 'easy_wins') {
    return notStarted
      .filter(c => c.difficulty === 'easy')
      .sort((a, b) => b.points_available - a.points_available)
      .slice(0, 10)
  } else if (prioritize === 'high_points') {
    return notStarted
      .sort((a, b) => b.points_available - a.points_available)
      .slice(0, 10)
  } else {
    return notStarted
      .filter(c => c.estimated_cost !== undefined)
      .sort((a, b) => (a.estimated_cost || 0) - (b.estimated_cost || 0))
      .slice(0, 10)
  }
}

/**
 * Calculate category progress
 */
export function calculateCategoryProgress(project: LEEDProject): Record<LEEDCategory, {
  earned: number
  possible: number
  percentage: number
}> {
  const progress: any = {}

  const categories: LEEDCategory[] = [
    'Location and Transportation',
    'Sustainable Sites',
    'Water Efficiency',
    'Energy and Atmosphere',
    'Materials and Resources',
    'Indoor Environmental Quality',
    'Innovation',
    'Regional Priority',
  ]

  categories.forEach(category => {
    const categoryCredits = project.credits.filter(c => c.category === category)
    const earned = categoryCredits.reduce((sum, c) => sum + c.points_earned, 0)
    const possible = categoryCredits.reduce((sum, c) => sum + c.points_available, 0)

    progress[category] = {
      earned,
      possible,
      percentage: possible > 0 ? (earned / possible) * 100 : 0,
    }
  })

  return progress
}

/**
 * Initialize new LEED project
 */
export function initializeLEEDProject(projectId: string, targetLevel: LEEDLevel = 'Silver'): LEEDProject {
  return {
    project_id: projectId,
    certification_level_target: targetLevel,
    credits: LEED_CREDITS.map(credit => ({
      ...credit,
      points_earned: 0,
      status: 'not_started',
    })),
    total_points_earned: 0,
    total_points_possible: 110, // Total points available in LEED v4.1 BD+C
    current_level: null,
  }
}
