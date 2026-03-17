/**
 * Carbon Footprint Calculation Library
 * Implements EPA and GHG Protocol standards
 */

// Emission factors based on EPA and GHG Protocol
// All values in kg CO2e per unit

export const FUEL_EMISSION_FACTORS = {
  // Scope 1: Direct Emissions
  diesel: 10.21, // per gallon
  gasoline: 8.89, // per gallon
  natural_gas: 0.0053, // per cubic foot
  propane: 12.67, // per gallon

  // Equipment-specific factors
  excavator_heavy: 35.2, // per hour
  excavator_medium: 18.5, // per hour
  bulldozer: 42.1, // per hour
  crane_mobile: 28.3, // per hour
  generator_large: 15.6, // per hour
  generator_small: 5.2, // per hour
  concrete_mixer: 12.4, // per hour
  compressor: 8.7, // per hour
}

export const ELECTRICITY_EMISSION_FACTORS = {
  // Scope 2: Indirect Emissions (by US region)
  // Values in kg CO2e per kWh
  us_average: 0.386,
  northeast: 0.234,
  southeast: 0.437,
  midwest: 0.512,
  southwest: 0.392,
  west: 0.198,
  pacific_northwest: 0.092,
}

export const MATERIAL_EMISSION_FACTORS = {
  // Scope 3: Embodied Carbon in Materials
  // Values in kg CO2e per unit
  concrete: {
    standard: 150, // per cubic yard
    low_carbon: 95,
    recycled: 75,
    geopolymer: 45,
  },
  steel: {
    virgin: 1900, // per ton
    recycled: 500,
    rebar: 1850,
    structural: 2100,
  },
  lumber: {
    conventional: 100, // per 1000 board feet
    fsc_certified: 85,
    reclaimed: 25,
    engineered: 120,
  },
  insulation: {
    fiberglass: 25, // per 1000 sqft R-20
    cellulose: 12,
    spray_foam: 180,
    mineral_wool: 45,
    recycled_denim: 8,
  },
  drywall: {
    standard: 250, // per 1000 sqft
    recycled_content: 180,
    lightweight: 220,
  },
  roofing: {
    asphalt_shingle: 40, // per square (100 sqft)
    metal: 65,
    cool_roof: 35,
    green_roof: 28,
    solar_ready: 38,
  },
  glass: {
    standard: 850, // per ton
    low_e: 920,
    recycled_content: 650,
  },
  brick: {
    clay: 220, // per 1000 bricks
    concrete: 180,
    recycled: 95,
  },
}

export const TRANSPORTATION_EMISSION_FACTORS = {
  // Scope 3: Transportation
  // Values in kg CO2e per ton-mile
  truck: 0.161,
  rail: 0.022,
  ship: 0.010,
  air: 1.02,
}

export const WASTE_EMISSION_FACTORS = {
  // Scope 3: Waste Disposal
  // Values in kg CO2e per ton
  landfill: 575, // includes methane generation
  incineration: 38,
  recycling_avoided: -890, // negative = carbon savings
  composting_avoided: -120,
}

/**
 * Calculate Scope 1 emissions (Direct)
 */
export function calculateScope1Emissions(inputs: {
  diesel_gallons?: number
  gasoline_gallons?: number
  natural_gas_cubic_feet?: number
  propane_gallons?: number
  equipment_hours?: {
    excavator_heavy?: number
    excavator_medium?: number
    bulldozer?: number
    crane_mobile?: number
    generator_large?: number
    generator_small?: number
    concrete_mixer?: number
    compressor?: number
  }
}): number {
  let total = 0

  // Fuel combustion
  total += (inputs.diesel_gallons || 0) * FUEL_EMISSION_FACTORS.diesel
  total += (inputs.gasoline_gallons || 0) * FUEL_EMISSION_FACTORS.gasoline
  total += (inputs.natural_gas_cubic_feet || 0) * FUEL_EMISSION_FACTORS.natural_gas
  total += (inputs.propane_gallons || 0) * FUEL_EMISSION_FACTORS.propane

  // Equipment usage
  if (inputs.equipment_hours) {
    const eq = inputs.equipment_hours
    total += (eq.excavator_heavy || 0) * FUEL_EMISSION_FACTORS.excavator_heavy
    total += (eq.excavator_medium || 0) * FUEL_EMISSION_FACTORS.excavator_medium
    total += (eq.bulldozer || 0) * FUEL_EMISSION_FACTORS.bulldozer
    total += (eq.crane_mobile || 0) * FUEL_EMISSION_FACTORS.crane_mobile
    total += (eq.generator_large || 0) * FUEL_EMISSION_FACTORS.generator_large
    total += (eq.generator_small || 0) * FUEL_EMISSION_FACTORS.generator_small
    total += (eq.concrete_mixer || 0) * FUEL_EMISSION_FACTORS.concrete_mixer
    total += (eq.compressor || 0) * FUEL_EMISSION_FACTORS.compressor
  }

  return total
}

/**
 * Calculate Scope 2 emissions (Electricity)
 */
export function calculateScope2Emissions(inputs: {
  electricity_kwh?: number
  region?: keyof typeof ELECTRICITY_EMISSION_FACTORS
  heating_therms?: number
}): number {
  let total = 0

  // Electricity
  const region = inputs.region || 'us_average'
  const emissionFactor = ELECTRICITY_EMISSION_FACTORS[region]
  total += (inputs.electricity_kwh || 0) * emissionFactor

  // Natural gas heating (convert therms to cubic feet, then calculate)
  // 1 therm = 100 cubic feet
  total += (inputs.heating_therms || 0) * 100 * FUEL_EMISSION_FACTORS.natural_gas

  return total
}

/**
 * Calculate Scope 3 emissions (Materials, Transportation, Waste)
 */
export function calculateScope3Emissions(inputs: {
  materials?: {
    concrete_yards?: number
    concrete_type?: 'standard' | 'low_carbon' | 'recycled' | 'geopolymer'
    steel_tons?: number
    steel_type?: 'virgin' | 'recycled' | 'rebar' | 'structural'
    lumber_board_feet?: number
    lumber_type?: 'conventional' | 'fsc_certified' | 'reclaimed' | 'engineered'
    insulation_sqft?: number
    insulation_type?: 'fiberglass' | 'cellulose' | 'spray_foam' | 'mineral_wool' | 'recycled_denim'
    drywall_sqft?: number
    drywall_type?: 'standard' | 'recycled_content' | 'lightweight'
    roofing_squares?: number
    roofing_type?: 'asphalt_shingle' | 'metal' | 'cool_roof' | 'green_roof' | 'solar_ready'
  }
  transportation?: {
    truck_ton_miles?: number
    rail_ton_miles?: number
    ship_ton_miles?: number
    air_ton_miles?: number
  }
  waste?: {
    landfill_tons?: number
    incineration_tons?: number
    recycled_tons?: number
    composted_tons?: number
  }
}): number {
  let total = 0

  // Materials
  if (inputs.materials) {
    const m = inputs.materials

    if (m.concrete_yards) {
      const type = m.concrete_type || 'standard'
      total += m.concrete_yards * MATERIAL_EMISSION_FACTORS.concrete[type]
    }

    if (m.steel_tons) {
      const type = m.steel_type || 'virgin'
      total += m.steel_tons * MATERIAL_EMISSION_FACTORS.steel[type]
    }

    if (m.lumber_board_feet) {
      const type = m.lumber_type || 'conventional'
      total += (m.lumber_board_feet / 1000) * MATERIAL_EMISSION_FACTORS.lumber[type]
    }

    if (m.insulation_sqft) {
      const type = m.insulation_type || 'fiberglass'
      total += (m.insulation_sqft / 1000) * MATERIAL_EMISSION_FACTORS.insulation[type]
    }

    if (m.drywall_sqft) {
      const type = m.drywall_type || 'standard'
      total += (m.drywall_sqft / 1000) * MATERIAL_EMISSION_FACTORS.drywall[type]
    }

    if (m.roofing_squares) {
      const type = m.roofing_type || 'asphalt_shingle'
      total += m.roofing_squares * MATERIAL_EMISSION_FACTORS.roofing[type]
    }
  }

  // Transportation
  if (inputs.transportation) {
    const t = inputs.transportation
    total += (t.truck_ton_miles || 0) * TRANSPORTATION_EMISSION_FACTORS.truck
    total += (t.rail_ton_miles || 0) * TRANSPORTATION_EMISSION_FACTORS.rail
    total += (t.ship_ton_miles || 0) * TRANSPORTATION_EMISSION_FACTORS.ship
    total += (t.air_ton_miles || 0) * TRANSPORTATION_EMISSION_FACTORS.air
  }

  // Waste
  if (inputs.waste) {
    const w = inputs.waste
    total += (w.landfill_tons || 0) * WASTE_EMISSION_FACTORS.landfill
    total += (w.incineration_tons || 0) * WASTE_EMISSION_FACTORS.incineration
    total += (w.recycled_tons || 0) * WASTE_EMISSION_FACTORS.recycling_avoided
    total += (w.composted_tons || 0) * WASTE_EMISSION_FACTORS.composting_avoided
  }

  return total
}

/**
 * Calculate total carbon footprint
 */
export function calculateTotalCarbonFootprint(
  scope1: number,
  scope2: number,
  scope3: number
): {
  total: number
  scope1: number
  scope2: number
  scope3: number
  breakdown: {
    scope1_percent: number
    scope2_percent: number
    scope3_percent: number
  }
} {
  const total = scope1 + scope2 + scope3

  return {
    total,
    scope1,
    scope2,
    scope3,
    breakdown: {
      scope1_percent: total > 0 ? (scope1 / total) * 100 : 0,
      scope2_percent: total > 0 ? (scope2 / total) * 100 : 0,
      scope3_percent: total > 0 ? (scope3 / total) * 100 : 0,
    },
  }
}

/**
 * Convert emissions to common units
 */
export function convertEmissions(kgCO2e: number): {
  kg: number
  tons: number
  metric_tons: number
  cars_per_year: number
  trees_planted: number
  homes_electricity_year: number
} {
  return {
    kg: kgCO2e,
    tons: kgCO2e / 907.185, // US tons
    metric_tons: kgCO2e / 1000,
    cars_per_year: kgCO2e / 4600, // Average car per year
    trees_planted: kgCO2e / 21, // Trees needed to offset per year
    homes_electricity_year: kgCO2e / 7200, // Average home electricity per year
  }
}

/**
 * Calculate carbon reduction from sustainable choices
 */
export function calculateCarbonSavings(
  baseline_emissions: number,
  sustainable_emissions: number
): {
  absolute_savings: number
  percent_reduction: number
  equivalent_cars: number
  equivalent_trees: number
} {
  const savings = baseline_emissions - sustainable_emissions
  const percent = baseline_emissions > 0 ? (savings / baseline_emissions) * 100 : 0

  return {
    absolute_savings: savings,
    percent_reduction: percent,
    equivalent_cars: savings / 4600,
    equivalent_trees: savings / 21,
  }
}

/**
 * Generate carbon reduction recommendations
 */
export function generateCarbonRecommendations(emissions: {
  scope1: number
  scope2: number
  scope3: number
}): Array<{
  category: string
  recommendation: string
  potential_reduction_percent: number
  estimated_savings_kg: number
  difficulty: 'easy' | 'medium' | 'hard'
  cost_impact: 'low' | 'medium' | 'high'
}> {
  const recommendations: Array<{
    category: string
    recommendation: string
    potential_reduction_percent: number
    estimated_savings_kg: number
    difficulty: 'easy' | 'medium' | 'hard'
    cost_impact: 'low' | 'medium' | 'high'
  }> = []
  const total = emissions.scope1 + emissions.scope2 + emissions.scope3

  // Scope 1 recommendations
  if (emissions.scope1 > total * 0.3) {
    recommendations.push({
      category: 'Fuel & Equipment',
      recommendation: 'Switch to biodiesel blend (B20) for diesel equipment',
      potential_reduction_percent: 15,
      estimated_savings_kg: emissions.scope1 * 0.15,
      difficulty: 'easy' as const,
      cost_impact: 'low' as const,
    })
    recommendations.push({
      category: 'Fuel & Equipment',
      recommendation: 'Upgrade to Tier 4 Final emission standard equipment',
      potential_reduction_percent: 25,
      estimated_savings_kg: emissions.scope1 * 0.25,
      difficulty: 'hard' as const,
      cost_impact: 'high' as const,
    })
  }

  // Scope 2 recommendations
  if (emissions.scope2 > total * 0.2) {
    recommendations.push({
      category: 'Electricity',
      recommendation: 'Purchase renewable energy credits (RECs)',
      potential_reduction_percent: 100,
      estimated_savings_kg: emissions.scope2,
      difficulty: 'easy' as const,
      cost_impact: 'low' as const,
    })
    recommendations.push({
      category: 'Electricity',
      recommendation: 'Install on-site solar for temporary power',
      potential_reduction_percent: 60,
      estimated_savings_kg: emissions.scope2 * 0.6,
      difficulty: 'medium' as const,
      cost_impact: 'medium' as const,
    })
  }

  // Scope 3 recommendations
  if (emissions.scope3 > total * 0.4) {
    recommendations.push({
      category: 'Materials',
      recommendation: 'Specify low-carbon concrete (30% cement replacement)',
      potential_reduction_percent: 35,
      estimated_savings_kg: emissions.scope3 * 0.35,
      difficulty: 'medium' as const,
      cost_impact: 'low' as const,
    })
    recommendations.push({
      category: 'Materials',
      recommendation: 'Increase recycled steel content to 90%+',
      potential_reduction_percent: 45,
      estimated_savings_kg: emissions.scope3 * 0.45,
      difficulty: 'easy' as const,
      cost_impact: 'low' as const,
    })
    recommendations.push({
      category: 'Waste',
      recommendation: 'Implement construction waste diversion plan (75% target)',
      potential_reduction_percent: 20,
      estimated_savings_kg: emissions.scope3 * 0.2,
      difficulty: 'medium' as const,
      cost_impact: 'low' as const,
    })
  }

  return recommendations.sort((a, b) => b.estimated_savings_kg - a.estimated_savings_kg)
}
