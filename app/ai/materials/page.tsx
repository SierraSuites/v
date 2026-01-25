'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AIAccessWrapper from '@/components/ai/AIAccessWrapper'

interface MaterialItem {
  id: string
  project_id: string
  project_name: string
  material_name: string
  category: string
  quantity_needed: number
  unit: string
  current_supplier: string
  current_unit_price: number
  current_total_cost: number
  delivery_date: string
  status: 'pending' | 'ordered' | 'delivered'
}

interface MaterialOptimization {
  id: string
  material_item_id: string
  material_name: string
  optimization_type: 'bulk_ordering' | 'supplier_switch' | 'material_substitution' | 'timing' | 'waste_reduction'
  title: string
  description: string
  current_cost: number
  optimized_cost: number
  savings: number
  savings_percentage: number
  recommended_supplier?: string
  recommended_product?: string
  confidence_score: number
  implementation_steps: string[]
  risk_level: 'low' | 'medium' | 'high'
  time_to_implement_days: number
}

interface SupplierComparison {
  supplier_name: string
  reliability_score: number
  avg_delivery_days: number
  price_competitiveness: number
  quality_rating: number
  payment_terms: string
  total_cost_for_items: number
  savings_vs_current: number
}

interface MarketIntelligence {
  material_category: string
  trend: 'rising' | 'falling' | 'stable'
  trend_percentage: number
  recommendation: string
  urgency: 'act_now' | 'monitor' | 'delay'
  price_forecast_30_days: number
  historical_data: { week: string; price: number }[]
}

export default function MaterialOptimizerPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'current' | 'optimizations' | 'suppliers' | 'market'>('optimizations')
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [showOptimizationModal, setShowOptimizationModal] = useState(false)
  const [selectedOptimization, setSelectedOptimization] = useState<MaterialOptimization | null>(null)

  // Demo data - Current materials
  const [materials, setMaterials] = useState<MaterialItem[]>([
    {
      id: '1',
      project_id: 'proj-1',
      project_name: 'Riverside Medical Center',
      material_name: '2x6 Premium Kiln-Dried Lumber',
      category: 'Lumber',
      quantity_needed: 3200,
      unit: 'linear feet',
      current_supplier: 'BuildRight Supply',
      current_unit_price: 4.25,
      current_total_cost: 13600,
      delivery_date: '2025-12-15',
      status: 'pending'
    },
    {
      id: '2',
      project_id: 'proj-1',
      project_name: 'Riverside Medical Center',
      material_name: 'Ready-Mix Concrete 4000 PSI',
      category: 'Concrete',
      quantity_needed: 180,
      unit: 'cubic yards',
      current_supplier: 'Metro Concrete',
      current_unit_price: 165,
      current_total_cost: 29700,
      delivery_date: '2025-12-10',
      status: 'pending'
    },
    {
      id: '3',
      project_id: 'proj-2',
      project_name: 'Downtown Loft Conversion',
      material_name: 'Steel I-Beams W12x26',
      category: 'Steel',
      quantity_needed: 24,
      unit: 'pieces',
      current_supplier: 'Industrial Steel Co',
      current_unit_price: 385,
      current_total_cost: 9240,
      delivery_date: '2025-12-12',
      status: 'pending'
    },
    {
      id: '4',
      project_id: 'proj-1',
      project_name: 'Riverside Medical Center',
      material_name: 'Drywall 4x8 1/2"',
      category: 'Drywall',
      quantity_needed: 420,
      unit: 'sheets',
      current_supplier: 'BuildRight Supply',
      current_unit_price: 12.50,
      current_total_cost: 5250,
      delivery_date: '2025-12-20',
      status: 'pending'
    },
    {
      id: '5',
      project_id: 'proj-2',
      project_name: 'Downtown Loft Conversion',
      material_name: 'PEX Tubing 1/2"',
      category: 'Plumbing',
      quantity_needed: 1200,
      unit: 'linear feet',
      current_supplier: 'ProPlumb Wholesale',
      current_unit_price: 0.85,
      current_total_cost: 1020,
      delivery_date: '2025-12-14',
      status: 'pending'
    }
  ])

  // Demo data - AI Optimizations
  const [optimizations, setOptimizations] = useState<MaterialOptimization[]>([
    {
      id: 'opt-1',
      material_item_id: '1',
      material_name: '2x6 Premium Kiln-Dried Lumber',
      optimization_type: 'bulk_ordering',
      title: 'Save $3,200 with Bulk Lumber Order',
      description: 'By combining lumber orders from 3 projects this week, you qualify for volume pricing at $3.25/ft (24% discount)',
      current_cost: 13600,
      optimized_cost: 10400,
      savings: 3200,
      savings_percentage: 23.5,
      recommended_supplier: 'Timber Direct Wholesale',
      confidence_score: 94,
      implementation_steps: [
        'Confirm lumber specs match across all 3 projects',
        'Schedule single delivery for Tuesday Dec 10',
        'Arrange on-site storage for full shipment',
        'Update project schedules to coordinate usage'
      ],
      risk_level: 'low',
      time_to_implement_days: 2
    },
    {
      id: 'opt-2',
      material_item_id: '2',
      material_name: 'Ready-Mix Concrete 4000 PSI',
      optimization_type: 'supplier_switch',
      title: 'Switch Concrete Supplier - Save $4,860',
      description: 'QuickSet Concrete offers same-day delivery at $138/cy (16% lower) with 4.8-star reliability rating',
      current_cost: 29700,
      optimized_cost: 24840,
      savings: 4860,
      savings_percentage: 16.4,
      recommended_supplier: 'QuickSet Concrete',
      confidence_score: 91,
      implementation_steps: [
        'Request sample batch from QuickSet for testing',
        'Verify delivery capacity for your pour schedule',
        'Update supplier in project management system',
        'Schedule concrete pour with new supplier'
      ],
      risk_level: 'low',
      time_to_implement_days: 3
    },
    {
      id: 'opt-3',
      material_item_id: '3',
      material_name: 'Steel I-Beams W12x26',
      optimization_type: 'timing',
      title: 'Delay Steel Order 2 Weeks - Save $1,850',
      description: 'Steel prices dropping 8% next month. Project schedule allows 2-week delay without impact',
      current_cost: 9240,
      optimized_cost: 7390,
      savings: 1850,
      savings_percentage: 20.0,
      confidence_score: 87,
      implementation_steps: [
        'Verify structural work can start Dec 26 instead of Dec 12',
        'Notify steel fabricator of revised delivery date',
        'Lock in Dec 26 pricing now with supplier',
        'Update project timeline and notify team'
      ],
      risk_level: 'medium',
      time_to_implement_days: 1
    },
    {
      id: 'opt-4',
      material_item_id: '4',
      material_name: 'Drywall 4x8 1/2"',
      optimization_type: 'material_substitution',
      title: 'Switch to Lightweight Drywall - Save $1,260 + Labor',
      description: 'Lightweight drywall costs same but reduces labor by 15% (easier to hang). Total savings including labor: $2,100',
      current_cost: 5250,
      optimized_cost: 3990,
      savings: 1260,
      savings_percentage: 24.0,
      recommended_product: 'UltraLight Drywall 4x8 1/2"',
      confidence_score: 89,
      implementation_steps: [
        'Confirm lightweight drywall meets fire rating requirements',
        'Order from same supplier (BuildRight has it in stock)',
        'Notify drywall crew of product change',
        'Update material specs in project documents'
      ],
      risk_level: 'low',
      time_to_implement_days: 1
    },
    {
      id: 'opt-5',
      material_item_id: '5',
      material_name: 'PEX Tubing 1/2"',
      optimization_type: 'waste_reduction',
      title: 'Optimize PEX Layout - Reduce Waste by 18%',
      description: 'AI-optimized plumbing layout reduces required PEX from 1,200 ft to 980 ft while maintaining all fixtures',
      current_cost: 1020,
      optimized_cost: 833,
      savings: 187,
      savings_percentage: 18.3,
      confidence_score: 92,
      implementation_steps: [
        'Review AI-optimized plumbing layout with lead plumber',
        'Verify code compliance with local inspector',
        'Reduce PEX order to 980 ft + 10% buffer = 1,080 ft',
        'Share optimized layout with plumbing team'
      ],
      risk_level: 'low',
      time_to_implement_days: 2
    },
    {
      id: 'opt-6',
      material_item_id: '1',
      material_name: 'General - All Materials',
      optimization_type: 'bulk_ordering',
      title: 'Just-In-Time Delivery Scheduling Saves $2,400/month',
      description: 'Optimize delivery timing across all projects to reduce on-site storage needs and material damage',
      current_cost: 0,
      optimized_cost: 0,
      savings: 2400,
      savings_percentage: 100,
      confidence_score: 85,
      implementation_steps: [
        'Set up AI-powered delivery coordination system',
        'Integrate with supplier delivery scheduling',
        'Train project managers on JIT material ordering',
        'Monitor and adjust delivery windows weekly'
      ],
      risk_level: 'medium',
      time_to_implement_days: 7
    }
  ])

  // Demo data - Supplier comparisons
  const [suppliers, setSuppliers] = useState<SupplierComparison[]>([
    {
      supplier_name: 'Timber Direct Wholesale',
      reliability_score: 94,
      avg_delivery_days: 3,
      price_competitiveness: 92,
      quality_rating: 4.7,
      payment_terms: 'Net 30',
      total_cost_for_items: 45200,
      savings_vs_current: 8400
    },
    {
      supplier_name: 'BuildRight Supply',
      reliability_score: 88,
      avg_delivery_days: 2,
      price_competitiveness: 78,
      quality_rating: 4.4,
      payment_terms: 'Net 15',
      total_cost_for_items: 53600,
      savings_vs_current: 0
    },
    {
      supplier_name: 'QuickSet Concrete',
      reliability_score: 91,
      avg_delivery_days: 1,
      price_competitiveness: 89,
      quality_rating: 4.8,
      payment_terms: 'Net 30',
      total_cost_for_items: 24840,
      savings_vs_current: 4860
    },
    {
      supplier_name: 'Metro Materials Hub',
      reliability_score: 85,
      avg_delivery_days: 4,
      price_competitiveness: 85,
      quality_rating: 4.3,
      payment_terms: 'Net 45',
      total_cost_for_items: 48900,
      savings_vs_current: 4700
    }
  ])

  // Demo data - Market intelligence
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence[]>([
    {
      material_category: 'Lumber',
      trend: 'rising',
      trend_percentage: 14,
      recommendation: 'Order lumber NOW before prices spike another 8-12% next month. Lock in current pricing for Q1 2026 projects.',
      urgency: 'act_now',
      price_forecast_30_days: 4.85,
      historical_data: [
        { week: '4 weeks ago', price: 3.85 },
        { week: '3 weeks ago', price: 3.95 },
        { week: '2 weeks ago', price: 4.10 },
        { week: 'Last week', price: 4.25 },
        { week: 'This week', price: 4.25 }
      ]
    },
    {
      material_category: 'Steel',
      trend: 'falling',
      trend_percentage: -8,
      recommendation: 'DELAY steel orders by 2-3 weeks. Prices dropping due to reduced demand. Expected to fall another 5-7%.',
      urgency: 'delay',
      price_forecast_30_days: 354,
      historical_data: [
        { week: '4 weeks ago', price: 418 },
        { week: '3 weeks ago', price: 405 },
        { week: '2 weeks ago', price: 392 },
        { week: 'Last week', price: 385 },
        { week: 'This week', price: 385 }
      ]
    },
    {
      material_category: 'Concrete',
      trend: 'stable',
      trend_percentage: 2,
      recommendation: 'Concrete prices stable. Shop around for best supplier - price differences up to 18% for same product.',
      urgency: 'monitor',
      price_forecast_30_days: 168,
      historical_data: [
        { week: '4 weeks ago', price: 162 },
        { week: '3 weeks ago', price: 163 },
        { week: '2 weeks ago', price: 165 },
        { week: 'Last week', price: 165 },
        { week: 'This week', price: 165 }
      ]
    },
    {
      material_category: 'Drywall',
      trend: 'rising',
      trend_percentage: 6,
      recommendation: 'Drywall prices climbing due to gypsum shortage. Consider buying extra for upcoming projects.',
      urgency: 'monitor',
      price_forecast_30_days: 13.25,
      historical_data: [
        { week: '4 weeks ago', price: 11.80 },
        { week: '3 weeks ago', price: 12.10 },
        { week: '2 weeks ago', price: 12.35 },
        { week: 'Last week', price: 12.50 },
        { week: 'This week', price: 12.50 }
      ]
    }
  ])

  // Calculate stats
  const stats = {
    totalOptimizations: optimizations.length,
    potentialSavings: optimizations.reduce((sum, opt) => sum + opt.savings, 0),
    averageSavingsPercentage: Math.round(
      optimizations.reduce((sum, opt) => sum + opt.savings_percentage, 0) / optimizations.length
    ),
    ordersOptimized: materials.filter(m =>
      optimizations.some(opt => opt.material_item_id === m.id)
    ).length,
    topSupplierSavings: Math.max(...suppliers.map(s => s.savings_vs_current))
  }

  const handleApplyOptimization = async (optimization: MaterialOptimization) => {
    setSelectedOptimization(optimization)
    setShowOptimizationModal(true)
  }

  const handleConfirmOptimization = async () => {
    if (!selectedOptimization) return

    // In production, update material order
    console.log('Applying optimization:', selectedOptimization.id)

    // Remove from optimizations list
    setOptimizations(prev => prev.filter(opt => opt.id !== selectedOptimization.id))
    setShowOptimizationModal(false)
    setSelectedOptimization(null)

    // Show success message
    alert(`✅ Optimization applied! You'll save ${formatCurrency(selectedOptimization.savings)}`)
  }

  const handleExportToPO = () => {
    alert('📋 Exporting optimized materials to purchase order system...')
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const getOptimizationTypeIcon = (type: string): string => {
    const icons: { [key: string]: string } = {
      bulk_ordering: '📦',
      supplier_switch: '🔄',
      material_substitution: '🔀',
      timing: '⏰',
      waste_reduction: '♻️'
    }
    return icons[type] || '💡'
  }

  const getOptimizationTypeLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      bulk_ordering: 'Bulk Ordering',
      supplier_switch: 'Supplier Switch',
      material_substitution: 'Material Substitution',
      timing: 'Timing Optimization',
      waste_reduction: 'Waste Reduction'
    }
    return labels[type] || type
  }

  const getTrendIcon = (trend: string): string => {
    if (trend === 'rising') return '📈'
    if (trend === 'falling') return '📉'
    return '➡️'
  }

  const getUrgencyColor = (urgency: string): string => {
    if (urgency === 'act_now') return 'text-red-600 bg-red-50'
    if (urgency === 'delay') return 'text-green-600 bg-green-50'
    return 'text-blue-600 bg-blue-50'
  }

  const getUrgencyLabel = (urgency: string): string => {
    if (urgency === 'act_now') return 'ACT NOW'
    if (urgency === 'delay') return 'DELAY PURCHASE'
    return 'MONITOR'
  }

  return (
    <AIAccessWrapper requiredTier="enterprise">
      <div className="min-h-screen bg-gradient-to-b from-green-50 via-emerald-50 to-white p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                💰 Material Optimizer
              </h1>
              <p className="text-lg text-gray-600">
                AI-powered material management that reduces costs by 15-30%
              </p>
            </div>
            <button
              onClick={handleExportToPO}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-lg"
            >
              📋 Export to Purchase Orders
            </button>
          </div>

          {/* How It Works Banner */}
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 border-l-4 border-green-600 p-6 rounded-lg mb-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🤖</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">How AI Material Optimization Works:</h3>
                <p className="text-gray-700">
                  Our AI analyzes your material orders across all projects, supplier pricing, market trends, and delivery schedules to find savings opportunities.
                  It identifies bulk ordering discounts, better suppliers, material substitutions, optimal timing, and waste reduction strategies.
                  Average customers save <span className="font-bold text-green-700">23% on materials</span> - that's <span className="font-bold text-green-700">$187,000/year</span> for a typical contractor!
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-5 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-600">
              <div className="text-3xl mb-2">💡</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalOptimizations}</div>
              <div className="text-sm text-gray-600">Active Optimizations</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-emerald-600">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-3xl font-bold text-green-600">{formatCurrency(stats.potentialSavings)}</div>
              <div className="text-sm text-gray-600">Potential Savings</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-3xl font-bold text-gray-900">{stats.averageSavingsPercentage}%</div>
              <div className="text-sm text-gray-600">Avg Savings Rate</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-600">
              <div className="text-3xl mb-2">📦</div>
              <div className="text-3xl font-bold text-gray-900">{stats.ordersOptimized}</div>
              <div className="text-sm text-gray-600">Orders Optimized</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-600">
              <div className="text-3xl mb-2">🏆</div>
              <div className="text-3xl font-bold text-gray-900">{formatCurrency(stats.topSupplierSavings)}</div>
              <div className="text-sm text-gray-600">Top Supplier Savings</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 bg-white p-2 rounded-lg shadow-md">
            <button
              onClick={() => setActiveTab('optimizations')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'optimizations'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              💡 AI Optimizations ({optimizations.length})
            </button>
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'current'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📋 Current Materials ({materials.length})
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'suppliers'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              🏪 Supplier Comparison ({suppliers.length})
            </button>
            <button
              onClick={() => setActiveTab('market')}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                activeTab === 'market'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📈 Market Intelligence ({marketIntelligence.length})
            </button>
          </div>

          {/* AI Optimizations Tab */}
          {activeTab === 'optimizations' && (
            <div className="space-y-6">
              {optimizations.length === 0 ? (
                <div className="bg-white p-12 rounded-lg shadow-md text-center">
                  <div className="text-6xl mb-4">🎉</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">All Optimizations Applied!</h3>
                  <p className="text-gray-600">
                    Great job! You've applied all AI recommendations. Check back tomorrow for new savings opportunities.
                  </p>
                </div>
              ) : (
                optimizations.map((optimization) => (
                  <div key={optimization.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl">{getOptimizationTypeIcon(optimization.optimization_type)}</span>
                            <div>
                              <h3 className="text-xl font-bold text-gray-900">{optimization.title}</h3>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-full">
                                  {getOptimizationTypeLabel(optimization.optimization_type)}
                                </span>
                                <span className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                                  {optimization.confidence_score}% confidence
                                </span>
                                <span className={`text-sm px-3 py-1 rounded-full ${
                                  optimization.risk_level === 'low' ? 'bg-green-100 text-green-700' :
                                  optimization.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {optimization.risk_level === 'low' ? '✓ Low Risk' :
                                   optimization.risk_level === 'medium' ? '⚠️ Medium Risk' :
                                   '⚠️ High Risk'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-green-600 mb-1">
                            {formatCurrency(optimization.savings)}
                          </div>
                          <div className="text-sm text-gray-600">
                            {optimization.savings_percentage.toFixed(1)}% savings
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-700 mb-4">{optimization.description}</p>

                      {/* Material Details */}
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <div className="font-semibold text-gray-900 mb-2">📦 {optimization.material_name}</div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Current Cost:</span>
                            <div className="font-semibold text-gray-900">{formatCurrency(optimization.current_cost)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Optimized Cost:</span>
                            <div className="font-semibold text-green-600">{formatCurrency(optimization.optimized_cost)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Implementation Time:</span>
                            <div className="font-semibold text-gray-900">{optimization.time_to_implement_days} days</div>
                          </div>
                        </div>
                        {optimization.recommended_supplier && (
                          <div className="mt-2">
                            <span className="text-gray-600">Recommended Supplier:</span>
                            <span className="ml-2 font-semibold text-blue-600">{optimization.recommended_supplier}</span>
                          </div>
                        )}
                        {optimization.recommended_product && (
                          <div className="mt-2">
                            <span className="text-gray-600">Recommended Product:</span>
                            <span className="ml-2 font-semibold text-blue-600">{optimization.recommended_product}</span>
                          </div>
                        )}
                      </div>

                      {/* Implementation Steps */}
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Implementation Steps:</h4>
                        <div className="space-y-2">
                          {optimization.implementation_steps.map((step, index) => (
                            <div key={index} className="flex items-start gap-3">
                              <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                                {index + 1}
                              </div>
                              <div className="text-gray-700">{step}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-4 border-t">
                        <button
                          onClick={() => handleApplyOptimization(optimization)}
                          className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                        >
                          ✓ Apply This Optimization
                        </button>
                        <button
                          onClick={() => {
                            setOptimizations(prev => prev.filter(opt => opt.id !== optimization.id))
                          }}
                          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Current Materials Tab */}
          {activeTab === 'current' && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Material</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Project</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unit Price</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Total Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Delivery</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {materials.map((material) => (
                      <tr key={material.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{material.material_name}</div>
                          <div className="text-sm text-gray-600">{material.category}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{material.project_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {formatNumber(material.quantity_needed)} {material.unit}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">{material.current_supplier}</td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                          {formatCurrency(material.current_unit_price)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                          {formatCurrency(material.current_total_cost)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {new Date(material.delivery_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            material.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            material.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {material.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Supplier Comparison Tab */}
          {activeTab === 'suppliers' && (
            <div className="space-y-6">
              {suppliers.map((supplier, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{supplier.supplier_name}</h3>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <span className="text-yellow-500">★</span>
                            <span className="font-semibold text-gray-900">{supplier.quality_rating.toFixed(1)}</span>
                            <span className="text-gray-600 text-sm">Quality Rating</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            Payment Terms: <span className="font-semibold text-gray-900">{supplier.payment_terms}</span>
                          </div>
                        </div>
                      </div>
                      {supplier.savings_vs_current > 0 && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600 mb-1">
                            Save {formatCurrency(supplier.savings_vs_current)}
                          </div>
                          <div className="text-sm text-gray-600">vs current suppliers</div>
                        </div>
                      )}
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Reliability Score</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${supplier.reliability_score}%` }}
                            />
                          </div>
                          <span className="text-lg font-bold text-gray-900">{supplier.reliability_score}</span>
                        </div>
                      </div>

                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Price Competitiveness</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${supplier.price_competitiveness}%` }}
                            />
                          </div>
                          <span className="text-lg font-bold text-gray-900">{supplier.price_competitiveness}</span>
                        </div>
                      </div>

                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Avg Delivery Time</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {supplier.avg_delivery_days} <span className="text-sm font-normal text-gray-600">days</span>
                        </div>
                      </div>

                      <div className="bg-indigo-50 p-4 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Total Cost (Current Orders)</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(supplier.total_cost_for_items)}
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    {supplier.savings_vs_current > 0 && (
                      <button className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
                        Switch to {supplier.supplier_name} - Save {formatCurrency(supplier.savings_vs_current)}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Market Intelligence Tab */}
          {activeTab === 'market' && (
            <div className="space-y-6">
              {marketIntelligence.map((intel, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-3xl">{getTrendIcon(intel.trend)}</span>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{intel.material_category}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className={`text-sm px-3 py-1 rounded-full font-semibold ${
                                intel.trend === 'rising' ? 'bg-red-100 text-red-700' :
                                intel.trend === 'falling' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {intel.trend === 'rising' ? '↑' : intel.trend === 'falling' ? '↓' : '→'}
                                {' '}{Math.abs(intel.trend_percentage)}%
                                {' '}{intel.trend === 'rising' ? 'increase' : intel.trend === 'falling' ? 'decrease' : 'stable'}
                              </span>
                              <span className={`text-sm px-3 py-1 rounded-full font-bold ${getUrgencyColor(intel.urgency)}`}>
                                {getUrgencyLabel(intel.urgency)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600 mb-1">30-Day Forecast</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(intel.price_forecast_30_days)}
                        </div>
                      </div>
                    </div>

                    {/* AI Recommendation */}
                    <div className={`p-4 rounded-lg mb-4 ${
                      intel.urgency === 'act_now' ? 'bg-red-50 border-l-4 border-red-600' :
                      intel.urgency === 'delay' ? 'bg-green-50 border-l-4 border-green-600' :
                      'bg-blue-50 border-l-4 border-blue-600'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">🤖</div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">AI Recommendation:</h4>
                          <p className="text-gray-700">{intel.recommendation}</p>
                        </div>
                      </div>
                    </div>

                    {/* Price History Chart */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Price History (5 weeks)</h4>
                      <div className="flex items-end justify-between gap-2 h-32">
                        {intel.historical_data.map((data, i) => {
                          const maxPrice = Math.max(...intel.historical_data.map(d => d.price))
                          const height = (data.price / maxPrice) * 100

                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                              <div className="text-xs font-semibold text-gray-900">
                                {formatCurrency(data.price)}
                              </div>
                              <div
                                className={`w-full rounded-t ${
                                  intel.trend === 'rising' ? 'bg-red-400' :
                                  intel.trend === 'falling' ? 'bg-green-400' :
                                  'bg-blue-400'
                                }`}
                                style={{ height: `${height}%` }}
                              />
                              <div className="text-xs text-gray-600 text-center">
                                {data.week}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Optimization Confirmation Modal */}
        {showOptimizationModal && selectedOptimization && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Confirm Optimization
                </h2>

                <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{getOptimizationTypeIcon(selectedOptimization.optimization_type)}</span>
                    <h3 className="text-lg font-bold text-gray-900">{selectedOptimization.title}</h3>
                  </div>
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    You'll save {formatCurrency(selectedOptimization.savings)}
                  </div>
                  <p className="text-gray-700">{selectedOptimization.description}</p>
                </div>

                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3">Next Steps:</h4>
                  <div className="space-y-2">
                    {selectedOptimization.implementation_steps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <div className="text-gray-700">{step}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-50 border-l-4 border-yellow-600 p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">⚠️</div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">Important:</h4>
                      <p className="text-gray-700">
                        This will update your material order for <strong>{selectedOptimization.material_name}</strong>.
                        Make sure to coordinate with your team and verify all implementation steps.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleConfirmOptimization}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                  >
                    ✓ Confirm & Apply Optimization
                  </button>
                  <button
                    onClick={() => {
                      setShowOptimizationModal(false)
                      setSelectedOptimization(null)
                    }}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AIAccessWrapper>
  )
}
