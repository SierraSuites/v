/**
 * Green Materials Database
 * Sustainable construction materials with environmental scores
 */

export interface GreenMaterial {
  id: string
  name: string
  category: string
  subcategory?: string
  description: string

  // Environmental scores (0-100, higher is better)
  sustainability_score: number
  carbon_intensity: number // kg CO2e per unit
  recycled_content_percent: number
  recyclability_score: number
  durability_rating: number

  // Certifications
  certifications: string[]
  leed_points_eligible: string[]

  // Cost premium vs conventional
  cost_premium_percent: number

  // Availability
  availability: 'readily_available' | 'regional' | 'specialty_order'
  lead_time_days: number

  // Specifications
  unit: string
  typical_applications: string[]
  performance_notes?: string
}

export const GREEN_MATERIALS_DATABASE: GreenMaterial[] = [
  // CONCRETE & MASONRY
  {
    id: 'concrete_low_carbon',
    name: 'Low-Carbon Concrete (30% SCM)',
    category: 'Concrete',
    subcategory: 'Ready-Mix',
    description: 'Portland cement with 30% supplementary cementitious materials (SCM) such as fly ash or slag',
    sustainability_score: 75,
    carbon_intensity: 95,
    recycled_content_percent: 30,
    recyclability_score: 60,
    durability_rating: 90,
    certifications: ['LEED', 'Green Globes'],
    leed_points_eligible: ['MR Credit: Building Product Disclosure', 'MR Credit: Environmental Product Declarations'],
    cost_premium_percent: 0,
    availability: 'readily_available',
    lead_time_days: 0,
    unit: 'cubic yard',
    typical_applications: ['Foundations', 'Structural elements', 'Slabs'],
    performance_notes: 'May have slower early strength gain, suitable for most applications',
  },
  {
    id: 'concrete_geopolymer',
    name: 'Geopolymer Concrete',
    category: 'Concrete',
    subcategory: 'Advanced',
    description: 'Cement-free concrete using industrial byproducts activated with alkaline solution',
    sustainability_score: 95,
    carbon_intensity: 45,
    recycled_content_percent: 90,
    recyclability_score: 70,
    durability_rating: 95,
    certifications: ['LEED', 'Living Building Challenge'],
    leed_points_eligible: ['MR Credit: Building Product Disclosure', 'MR Credit: EPD', 'Innovation'],
    cost_premium_percent: 15,
    availability: 'regional',
    lead_time_days: 7,
    unit: 'cubic yard',
    typical_applications: ['High-performance applications', 'Chemical resistance required', 'Fire-rated assemblies'],
    performance_notes: 'Excellent chemical and fire resistance, higher early strength',
  },

  // STEEL & METALS
  {
    id: 'steel_recycled',
    name: 'Recycled Steel (90%+ Content)',
    category: 'Steel',
    subcategory: 'Structural',
    description: 'Structural steel with minimum 90% recycled content',
    sustainability_score: 90,
    carbon_intensity: 500,
    recycled_content_percent: 90,
    recyclability_score: 100,
    durability_rating: 95,
    certifications: ['LEED', 'Green Globes', 'SCS Certified'],
    leed_points_eligible: ['MR Credit: Building Product Disclosure', 'MR Credit: EPD'],
    cost_premium_percent: -2,
    availability: 'readily_available',
    lead_time_days: 0,
    unit: 'ton',
    typical_applications: ['Framing', 'Reinforcement', 'Structural members'],
    performance_notes: 'Identical performance to virgin steel',
  },

  // LUMBER & WOOD
  {
    id: 'lumber_fsc_certified',
    name: 'FSC-Certified Lumber',
    category: 'Lumber',
    subcategory: 'Dimensional',
    description: 'Forest Stewardship Council certified sustainably harvested wood',
    sustainability_score: 80,
    carbon_intensity: 85,
    recycled_content_percent: 0,
    recyclability_score: 80,
    durability_rating: 85,
    certifications: ['FSC', 'LEED', 'Green Globes'],
    leed_points_eligible: ['MR Credit: Sustainable Forestry', 'MR Credit: Building Product Disclosure'],
    cost_premium_percent: 5,
    availability: 'readily_available',
    lead_time_days: 0,
    unit: '1000 board feet',
    typical_applications: ['Framing', 'Decking', 'Finish carpentry'],
  },
  {
    id: 'lumber_engineered_mass_timber',
    name: 'Mass Timber (CLT/Glulam)',
    category: 'Lumber',
    subcategory: 'Engineered',
    description: 'Cross-laminated timber or glued laminated timber for structural applications',
    sustainability_score: 88,
    carbon_intensity: 120,
    recycled_content_percent: 0,
    recyclability_score: 75,
    durability_rating: 90,
    certifications: ['FSC', 'LEED', 'Carbon Negative'],
    leed_points_eligible: ['MR Credit: Sustainable Forestry', 'Innovation Credit'],
    cost_premium_percent: 10,
    availability: 'specialty_order',
    lead_time_days: 30,
    unit: 'cubic meter',
    typical_applications: ['Structural systems', 'Floors', 'Walls', 'Large spans'],
    performance_notes: 'Carbon sequestration, excellent seismic performance',
  },

  // INSULATION
  {
    id: 'insulation_cellulose',
    name: 'Cellulose Insulation',
    category: 'Insulation',
    subcategory: 'Blown-in',
    description: 'Recycled newspaper treated with borate for fire and pest resistance',
    sustainability_score: 92,
    carbon_intensity: 12,
    recycled_content_percent: 85,
    recyclability_score: 85,
    durability_rating: 80,
    certifications: ['LEED', 'Green Globes', 'GreenGuard Gold'],
    leed_points_eligible: ['MR Credit: Building Product Disclosure', 'EQ Credit: Low Emitting Materials'],
    cost_premium_percent: -10,
    availability: 'readily_available',
    lead_time_days: 0,
    unit: '1000 sqft R-20',
    typical_applications: ['Attics', 'Walls', 'Soundproofing'],
    performance_notes: 'Lower cost than fiberglass, better air sealing',
  },
  {
    id: 'insulation_recycled_denim',
    name: 'Recycled Denim Insulation',
    category: 'Insulation',
    subcategory: 'Batt',
    description: 'Post-consumer recycled cotton denim, formaldehyde-free',
    sustainability_score: 95,
    carbon_intensity: 8,
    recycled_content_percent: 90,
    recyclability_score: 90,
    durability_rating: 85,
    certifications: ['LEED', 'GreenGuard Gold', 'UL Environment'],
    leed_points_eligible: ['MR Credit: Recycled Content', 'EQ Credit: Low Emitting Materials'],
    cost_premium_percent: 20,
    availability: 'readily_available',
    lead_time_days: 3,
    unit: '1000 sqft R-20',
    typical_applications: ['Walls', 'Soundproofing', 'Safe installation (no itching)'],
    performance_notes: 'No respiratory irritation, excellent sound absorption',
  },

  // ROOFING
  {
    id: 'roofing_cool_roof',
    name: 'Cool Roof Coating/Membrane',
    category: 'Roofing',
    subcategory: 'Reflective',
    description: 'High solar reflectance (SR) and thermal emittance (TE) coating or membrane',
    sustainability_score: 85,
    carbon_intensity: 35,
    recycled_content_percent: 20,
    recyclability_score: 60,
    durability_rating: 90,
    certifications: ['LEED', 'Energy Star', 'Cool Roof Rating Council'],
    leed_points_eligible: ['SS Credit: Heat Island Reduction', 'EA Credit: Optimize Energy Performance'],
    cost_premium_percent: 8,
    availability: 'readily_available',
    lead_time_days: 0,
    unit: 'square (100 sqft)',
    typical_applications: ['Low-slope roofs', 'Commercial buildings', 'Hot climates'],
    performance_notes: 'Reduces cooling loads by 10-15%, extends roof life',
  },
  {
    id: 'roofing_green_roof',
    name: 'Green Roof System',
    category: 'Roofing',
    subcategory: 'Vegetative',
    description: 'Living roof with waterproofing, drainage, growth medium, and vegetation',
    sustainability_score: 98,
    carbon_intensity: 28,
    recycled_content_percent: 40,
    recyclability_score: 70,
    durability_rating: 88,
    certifications: ['LEED', 'Living Building Challenge', 'Green Globes'],
    leed_points_eligible: ['SS Credit: Heat Island Reduction', 'SS Credit: Rainwater Management', 'Innovation'],
    cost_premium_percent: 80,
    availability: 'specialty_order',
    lead_time_days: 14,
    unit: 'square (100 sqft)',
    typical_applications: ['Urban buildings', 'Stormwater management', 'Biodiversity'],
    performance_notes: 'Manages stormwater, reduces urban heat island, increases biodiversity',
  },

  // FINISHES
  {
    id: 'drywall_recycled',
    name: 'Recycled Content Drywall',
    category: 'Drywall',
    subcategory: 'Standard',
    description: 'Gypsum board with minimum 95% recycled content',
    sustainability_score: 85,
    carbon_intensity: 180,
    recycled_content_percent: 95,
    recyclability_score: 85,
    durability_rating: 90,
    certifications: ['LEED', 'UL Environment'],
    leed_points_eligible: ['MR Credit: Recycled Content'],
    cost_premium_percent: 0,
    availability: 'readily_available',
    lead_time_days: 0,
    unit: '1000 sqft',
    typical_applications: ['Interior walls', 'Ceilings'],
    performance_notes: 'Identical performance to conventional drywall',
  },
  {
    id: 'paint_zero_voc',
    name: 'Zero-VOC Paint',
    category: 'Paint',
    subcategory: 'Interior',
    description: 'Water-based paint with zero volatile organic compound emissions',
    sustainability_score: 92,
    carbon_intensity: 15,
    recycled_content_percent: 10,
    recyclability_score: 40,
    durability_rating: 88,
    certifications: ['GreenGuard Gold', 'Green Seal', 'LEED'],
    leed_points_eligible: ['EQ Credit: Low Emitting Materials'],
    cost_premium_percent: 10,
    availability: 'readily_available',
    lead_time_days: 0,
    unit: 'gallon',
    typical_applications: ['Interior walls', 'Ceilings', 'Schools', 'Healthcare'],
    performance_notes: 'Improved indoor air quality, no odor',
  },

  // FLOORING
  {
    id: 'flooring_bamboo',
    name: 'Bamboo Flooring (FSC)',
    category: 'Flooring',
    subcategory: 'Hard Surface',
    description: 'FSC-certified bamboo hardwood flooring, rapidly renewable',
    sustainability_score: 88,
    carbon_intensity: 45,
    recycled_content_percent: 0,
    recyclability_score: 70,
    durability_rating: 85,
    certifications: ['FSC', 'FloorScore', 'LEED'],
    leed_points_eligible: ['MR Credit: Rapidly Renewable Materials', 'EQ Credit: Low Emitting Materials'],
    cost_premium_percent: 15,
    availability: 'readily_available',
    lead_time_days: 7,
    unit: 'sqft',
    typical_applications: ['Residential', 'Commercial', 'High-traffic areas'],
    performance_notes: 'Harder than oak, grows to maturity in 3-5 years',
  },
  {
    id: 'flooring_recycled_rubber',
    name: 'Recycled Rubber Flooring',
    category: 'Flooring',
    subcategory: 'Resilient',
    description: 'Post-consumer recycled tire rubber flooring',
    sustainability_score: 90,
    carbon_intensity: 35,
    recycled_content_percent: 90,
    recyclability_score: 85,
    durability_rating: 95,
    certifications: ['LEED', 'FloorScore', 'GreenGuard'],
    leed_points_eligible: ['MR Credit: Recycled Content', 'EQ Credit: Low Emitting Materials'],
    cost_premium_percent: 5,
    availability: 'readily_available',
    lead_time_days: 5,
    unit: 'sqft',
    typical_applications: ['Gyms', 'Playgrounds', 'Industrial', 'High-impact areas'],
    performance_notes: 'Excellent shock absorption, very durable',
  },
]

/**
 * Search materials by category or name
 */
export function searchGreenMaterials(query: {
  category?: string
  minSustainabilityScore?: number
  maxCostPremium?: number
  certifications?: string[]
  availability?: string[]
}): GreenMaterial[] {
  let results = [...GREEN_MATERIALS_DATABASE]

  if (query.category) {
    results = results.filter(m =>
      m.category.toLowerCase().includes(query.category!.toLowerCase())
    )
  }

  if (query.minSustainabilityScore) {
    results = results.filter(m => m.sustainability_score >= query.minSustainabilityScore!)
  }

  if (query.maxCostPremium !== undefined) {
    results = results.filter(m => m.cost_premium_percent <= query.maxCostPremium!)
  }

  if (query.certifications && query.certifications.length > 0) {
    results = results.filter(m =>
      query.certifications!.some(cert => m.certifications.includes(cert))
    )
  }

  if (query.availability && query.availability.length > 0) {
    results = results.filter(m => query.availability!.includes(m.availability))
  }

  return results.sort((a, b) => b.sustainability_score - a.sustainability_score)
}

/**
 * Get material recommendations for a specific category
 */
export function getMaterialRecommendations(
  category: string,
  prioritize: 'sustainability' | 'cost' | 'performance' = 'sustainability'
): GreenMaterial[] {
  const materials = GREEN_MATERIALS_DATABASE.filter(m =>
    m.category.toLowerCase() === category.toLowerCase()
  )

  if (prioritize === 'sustainability') {
    return materials.sort((a, b) => b.sustainability_score - a.sustainability_score)
  } else if (prioritize === 'cost') {
    return materials.sort((a, b) => a.cost_premium_percent - b.cost_premium_percent)
  } else {
    return materials.sort((a, b) => b.durability_rating - a.durability_rating)
  }
}

/**
 * Calculate total sustainability score for material selections
 */
export function calculateProjectMaterialScore(
  selectedMaterials: Array<{ materialId: string; quantity: number }>
): {
  overall_score: number
  total_carbon_kg: number
  total_recycled_content_percent: number
  leed_points_potential: number
  cost_premium_total_percent: number
} {
  let totalScore = 0
  let totalCarbon = 0
  let totalRecycledContent = 0
  let leedPointsSet = new Set<string>()
  let totalCostPremium = 0
  let weightSum = 0

  selectedMaterials.forEach(({ materialId, quantity }) => {
    const material = GREEN_MATERIALS_DATABASE.find(m => m.id === materialId)
    if (!material) return

    const weight = quantity // Use quantity as weight
    totalScore += material.sustainability_score * weight
    totalCarbon += material.carbon_intensity * quantity
    totalRecycledContent += material.recycled_content_percent * weight
    totalCostPremium += material.cost_premium_percent * weight
    weightSum += weight

    // Collect unique LEED points
    material.leed_points_eligible.forEach(point => leedPointsSet.add(point))
  })

  return {
    overall_score: weightSum > 0 ? totalScore / weightSum : 0,
    total_carbon_kg: totalCarbon,
    total_recycled_content_percent: weightSum > 0 ? totalRecycledContent / weightSum : 0,
    leed_points_potential: leedPointsSet.size,
    cost_premium_total_percent: weightSum > 0 ? totalCostPremium / weightSum : 0,
  }
}

/**
 * Get all available categories
 */
export function getMaterialCategories(): string[] {
  const categories = new Set(GREEN_MATERIALS_DATABASE.map(m => m.category))
  return Array.from(categories).sort()
}

/**
 * Get all available certifications
 */
export function getAvailableCertifications(): string[] {
  const certs = new Set<string>()
  GREEN_MATERIALS_DATABASE.forEach(m => {
    m.certifications.forEach(cert => certs.add(cert))
  })
  return Array.from(certs).sort()
}
