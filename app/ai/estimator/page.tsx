'use client'

export const dynamic = 'force-dynamic'


import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import AIAccessWrapper from '@/components/ai/AIAccessWrapper'
import { formatCurrency, formatNumber } from '@/lib/ai-permissions'

interface EstimateStep {
  step: number
  title: string
  completed: boolean
}

interface AIQuestion {
  question: string
  options?: string[]
  answer?: string
}

interface LineItem {
  category: string
  description: string
  min: number
  max: number
  notes?: string
}

interface AIEstimate {
  id: string
  project_description: string
  total_min: number
  total_max: number
  breakdown: LineItem[]
  market_comparison: {
    local_average_min: number
    local_average_max: number
    your_advantage: string
  }
  material_optimizations: Array<{
    suggestion: string
    savings: number
  }>
  confidence_score: number
  based_on_projects: number
  created_at: string
}

export default function SmartEstimatorPage() {
  const supabase = createClient()
  const [currentStep, setCurrentStep] = useState(1)
  const [projectDescription, setProjectDescription] = useState('')
  const [aiQuestions, setAiQuestions] = useState<AIQuestion[]>([])
  const [processing, setProcessing] = useState(false)
  const [estimate, setEstimate] = useState<AIEstimate | null>(null)
  const [showBreakdown, setShowBreakdown] = useState(true)

  const steps: EstimateStep[] = [
    { step: 1, title: 'Describe Project', completed: currentStep > 1 },
    { step: 2, title: 'AI Analysis', completed: currentStep > 2 },
    { step: 3, title: 'Review & Refine', completed: currentStep > 3 }
  ]

  const handleDescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectDescription.trim()) return

    setProcessing(true)
    setCurrentStep(2)

    // Simulate AI analyzing and asking clarifying questions
    setTimeout(() => {
      const questions: AIQuestion[] = [
        {
          question: "What's the foundation type?",
          options: ['Slab on grade', 'Crawlspace', 'Full basement', 'Pier and beam'],
          answer: ''
        },
        {
          question: 'Roofing material preference?',
          options: ['Architectural shingles', 'Metal roofing', 'Tile', 'Flat/TPO'],
          answer: ''
        },
        {
          question: 'Any special features?',
          options: ['Smart home system', 'Solar panels', 'Outdoor kitchen', 'Pool/spa', 'None'],
          answer: ''
        },
        {
          question: 'Interior finish level?',
          options: ['Builder grade', 'Mid-range', 'High-end', 'Luxury'],
          answer: ''
        }
      ]
      setAiQuestions(questions)
      setProcessing(false)
    }, 2000)
  }

  const handleAnswerQuestion = (questionIndex: number, answer: string) => {
    const updated = [...aiQuestions]
    updated[questionIndex].answer = answer
    setAiQuestions(updated)
  }

  const handleGenerateEstimate = async () => {
    setProcessing(true)

    // Simulate AI generating comprehensive estimate
    setTimeout(() => {
      const breakdown: LineItem[] = [
        {
          category: 'Site Work & Foundation',
          description: 'Excavation, grading, concrete slab',
          min: 42000,
          max: 48000,
          notes: 'Includes vapor barrier, rebar, and perimeter drainage'
        },
        {
          category: 'Framing & Structure',
          description: 'Lumber, studs, trusses, sheathing',
          min: 68000,
          max: 75000,
          notes: 'Engineered lumber recommended for 15% savings'
        },
        {
          category: 'Roofing',
          description: 'Architectural shingles, underlayment, flashing',
          min: 24000,
          max: 28000,
          notes: 'Includes 30-year warranty shingles'
        },
        {
          category: 'Exterior',
          description: 'Siding, trim, doors, windows',
          min: 38000,
          max: 44000,
          notes: 'Energy-efficient windows add $3,200 but save $180/year'
        },
        {
          category: 'Plumbing',
          description: 'Fixtures, pipes, water heater',
          min: 32000,
          max: 36000,
          notes: 'PEX piping saves 20% over copper'
        },
        {
          category: 'Electrical',
          description: 'Wiring, panel, fixtures, outlets',
          min: 28000,
          max: 32000,
          notes: 'Includes smart home pre-wiring'
        },
        {
          category: 'HVAC',
          description: '2-zone system, ductwork',
          min: 18000,
          max: 21000,
          notes: 'High-efficiency system qualifies for $1,200 tax credit'
        },
        {
          category: 'Insulation',
          description: 'Wall, ceiling, and floor insulation',
          min: 12000,
          max: 14000,
          notes: 'R-30 ceiling, R-19 walls recommended'
        },
        {
          category: 'Drywall & Interior',
          description: 'Drywall, texture, paint, trim',
          min: 52000,
          max: 58000,
          notes: 'Level 4 finish throughout'
        },
        {
          category: 'Flooring',
          description: 'LVP, tile, carpet mix',
          min: 28000,
          max: 34000,
          notes: 'Luxury vinyl plank in main areas'
        },
        {
          category: 'Kitchen & Bath',
          description: 'Cabinets, countertops, fixtures',
          min: 45000,
          max: 52000,
          notes: 'Semi-custom cabinets, quartz counters'
        },
        {
          category: 'Appliances',
          description: 'Kitchen appliance package',
          min: 8000,
          max: 12000,
          notes: 'Mid-range stainless steel package'
        },
        {
          category: 'Garage',
          description: '2-car garage finish',
          min: 14000,
          max: 16000,
          notes: 'Drywall, paint, epoxy floor'
        },
        {
          category: 'Landscaping',
          description: 'Basic landscaping, sprinklers, sod',
          min: 16000,
          max: 20000,
          notes: 'Front and side yards'
        },
        {
          category: 'Permits & Fees',
          description: 'Building permits, impact fees',
          min: 12000,
          max: 14000,
          notes: 'Based on local jurisdiction'
        },
        {
          category: 'Contingency',
          description: '10% buffer for unknowns',
          min: 39500,
          max: 45000,
          notes: 'Industry standard for new construction'
        }
      ]

      const total_min = breakdown.reduce((sum, item) => sum + item.min, 0)
      const total_max = breakdown.reduce((sum, item) => sum + item.max, 0)

      const newEstimate: AIEstimate = {
        id: '1',
        project_description: projectDescription,
        total_min,
        total_max,
        breakdown,
        market_comparison: {
          local_average_min: 475000,
          local_average_max: 525000,
          your_advantage: '8-12% below market'
        },
        material_optimizations: [
          {
            suggestion: 'Switch to engineered lumber for floor joists',
            savings: 4200
          },
          {
            suggestion: 'Use PEX plumbing instead of copper',
            savings: 6400
          },
          {
            suggestion: 'Local supplier has HVAC units 15% off this month',
            savings: 2700
          },
          {
            suggestion: 'Bundle electrical and plumbing rough-in',
            savings: 1800
          }
        ],
        confidence_score: 92,
        based_on_projects: 127,
        created_at: new Date().toISOString()
      }

      setEstimate(newEstimate)
      setProcessing(false)
      setCurrentStep(3)
    }, 3000)
  }

  const handleConvertToProposal = () => {
    alert('Converting to professional proposal...\n\nThis would:\n• Generate PDF proposal\n• Add 3D renderings\n• Include phasing schedule\n• Add material samples\n• Create client presentation')
  }

  const handleSaveToQuotes = async () => {
    if (!estimate) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Save to database
      const { error } = await supabase.from('ai_estimates').insert([{
        user_id: user.id,
        project_description: estimate.project_description,
        total_estimate_min: estimate.total_min,
        total_estimate_max: estimate.total_max,
        breakdown: estimate.breakdown,
        market_comparison: estimate.market_comparison,
        material_optimizations: estimate.material_optimizations,
        confidence_score: estimate.confidence_score,
        based_on_projects: estimate.based_on_projects
      }])

      if (error) throw error
      alert('Estimate saved successfully!')
    } catch (error) {
      console.error('Error saving estimate:', error)
      alert('Failed to save estimate')
    }
  }

  const allQuestionsAnswered = aiQuestions.every(q => q.answer)

  return (
    <AIAccessWrapper requiredTier="pro">
      <div className="min-h-screen bg-linear-to-b from-green-50 to-white">
        {/* Header */}
        <div className="bg-linear-to-r from-green-600 via-emerald-600 to-teal-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/ai" className="text-white/80 hover:text-white text-sm mb-2 inline-block">
                  ← Back to AI Command Center
                </Link>
                <h1 className="text-5xl font-bold mb-2 flex items-center gap-3">
                  <span className="text-6xl">⚡</span>
                  <span>Smart Estimator</span>
                </h1>
                <p className="text-green-100 text-lg">
                  Generate perfect project estimates in 2 minutes • Win 18% more bids
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.step} className="flex-1 flex items-center">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        currentStep >= step.step
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {step.completed ? '✓' : step.step}
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${currentStep >= step.step ? 'text-gray-900' : 'text-gray-500'}`}>
                        Step {step.step}
                      </div>
                      <div className={`text-xs ${currentStep >= step.step ? 'text-gray-600' : 'text-gray-400'}`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 ${currentStep > step.step ? 'bg-green-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 1: Project Description */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Describe Your Project in Plain English
              </h2>
              <p className="text-gray-600 mb-6">
                Tell me about the project. I'll analyze it and ask a few clarifying questions, then generate a complete estimate.
              </p>

              <form onSubmit={handleDescriptionSubmit}>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Example: Build a 2,500 sq ft modern farmhouse with 4 bedrooms, 3.5 baths, chef's kitchen, covered porch, and 2-car garage in Austin, TX"
                  rows={6}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                  required
                />

                <div className="mt-6 flex gap-4">
                  <button
                    type="submit"
                    disabled={!projectDescription.trim()}
                    className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    Analyze with AI →
                  </button>
                </div>
              </form>

              {/* Quick Examples */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Try these examples:</h3>
                <div className="space-y-2">
                  {[
                    '3,000 sq ft commercial office buildout with conference rooms, break room, and modern finishes in downtown Denver',
                    'Single-story ranch home renovation: new kitchen, 2 bathroom remodels, new flooring throughout, 1,800 sq ft',
                    '5-unit townhome development, each 1,400 sq ft, 3 bed/2.5 bath, contemporary style in Portland suburbs'
                  ].map((example, index) => (
                    <button
                      key={index}
                      onClick={() => setProjectDescription(example)}
                      className="w-full text-left px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: AI Clarifications */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              {processing ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-6"></div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">AI Analyzing Your Project...</h3>
                  <p className="text-gray-600">
                    Comparing to 127 similar projects • Analyzing market data • Calculating materials
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    A Few Quick Questions
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Help me refine the estimate with a few clarifications
                  </p>

                  <div className="space-y-6 mb-8">
                    {aiQuestions.map((q, index) => (
                      <div key={index} className="border-l-4 border-green-500 pl-6 py-2">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">{q.question}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {q.options?.map((option, optIndex) => (
                            <button
                              key={optIndex}
                              onClick={() => handleAnswerQuestion(index, option)}
                              className={`px-4 py-3 rounded-lg border-2 transition-all ${
                                q.answer === option
                                  ? 'border-green-500 bg-green-50 text-green-900 font-semibold'
                                  : 'border-gray-300 bg-white text-gray-700 hover:border-green-300'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setCurrentStep(1)}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleGenerateEstimate}
                      disabled={!allQuestionsAnswered}
                      className="flex-1 px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    >
                      Generate Complete Estimate →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Estimate Results */}
          {currentStep === 3 && estimate && (
            <>
              {processing ? (
                <div className="bg-white rounded-lg shadow-lg p-8 text-center py-12">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-6"></div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Generating Your Estimate...</h3>
                  <p className="text-gray-600">
                    Calculating costs • Finding optimizations • Comparing to market • Almost done!
                  </p>
                </div>
              ) : (
                <>
                  {/* Success Animation */}
                  <div className="bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-lg shadow-lg p-8 mb-6 text-center">
                    <div className="text-7xl mb-4">🎉</div>
                    <h2 className="text-4xl font-bold mb-2">Estimate Complete!</h2>
                    <p className="text-green-100 text-lg mb-6">
                      Generated in 58 seconds • {estimate.confidence_score}% confidence • Based on {estimate.based_on_projects} similar projects
                    </p>

                    {/* Total */}
                    <div className="bg-white/10 backdrop-blur rounded-lg p-6 inline-block">
                      <div className="text-sm text-green-100 mb-2">Estimated Project Cost</div>
                      <div className="text-6xl font-bold">
                        {formatCurrency(estimate.total_min)} - {formatCurrency(estimate.total_max)}
                      </div>
                    </div>
                  </div>

                  {/* Market Comparison */}
                  <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Market Comparison
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Local Market Average</div>
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(estimate.market_comparison.local_average_min)} - {formatCurrency(estimate.market_comparison.local_average_max)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 mb-1">Your Competitive Advantage</div>
                        <div className="text-2xl font-bold text-green-600">
                          {estimate.market_comparison.your_advantage}
                        </div>
                        <div className="text-sm text-green-700 mt-1">
                          Save clients {formatCurrency(estimate.market_comparison.local_average_min - estimate.total_max)}+
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Material Optimizations */}
                  <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      AI-Discovered Savings Opportunities
                    </h3>
                    <div className="space-y-3">
                      {estimate.material_optimizations.map((opt, index) => (
                        <div key={index} className="flex items-center justify-between bg-white rounded-lg p-4 border border-yellow-300">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                            <span className="text-gray-900 font-medium">{opt.suggestion}</span>
                          </div>
                          <div className="text-green-600 font-bold">
                            Save {formatCurrency(opt.savings)}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-yellow-200">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 font-semibold">Total Potential Savings:</span>
                        <span className="text-2xl font-bold text-green-600">
                          {formatCurrency(estimate.material_optimizations.reduce((sum, opt) => sum + opt.savings, 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Breakdown */}
                  <div className="bg-white rounded-lg shadow-lg">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900">Detailed Breakdown</h3>
                      <button
                        onClick={() => setShowBreakdown(!showBreakdown)}
                        className="text-sm text-green-600 hover:text-green-800 font-medium"
                      >
                        {showBreakdown ? 'Hide' : 'Show'} Details
                      </button>
                    </div>

                    {showBreakdown && (
                      <div className="divide-y divide-gray-200">
                        {estimate.breakdown.map((item, index) => (
                          <div key={index} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-900 text-lg">{item.category}</h4>
                                <p className="text-sm text-gray-600">{item.description}</p>
                                {item.notes && (
                                  <div className="mt-2 text-xs text-blue-700 bg-blue-50 rounded px-2 py-1 inline-block">
                                    💡 {item.notes}
                                  </div>
                                )}
                              </div>
                              <div className="text-right ml-6">
                                <div className="text-xl font-bold text-gray-900">
                                  {formatCurrency(item.min)} - {formatCurrency(item.max)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Avg: {formatCurrency((item.min + item.max) / 2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button
                      onClick={handleConvertToProposal}
                      className="px-6 py-4 bg-linear-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-bold shadow-lg transform hover:scale-105"
                    >
                      📄 Convert to Proposal
                    </button>
                    <button
                      onClick={handleSaveToQuotes}
                      className="px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      💾 Save to QuoteHub
                    </button>
                    <button
                      onClick={() => {
                        setCurrentStep(1)
                        setProjectDescription('')
                        setAiQuestions([])
                        setEstimate(null)
                      }}
                      className="px-6 py-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                    >
                      🔄 New Estimate
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </AIAccessWrapper>
  )
}
