'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AIAccessWrapper from '@/components/ai/AIAccessWrapper'

interface ContractAnalysis {
  id: string
  contract_name: string
  contract_type: 'subcontractor' | 'general_contractor' | 'supplier' | 'client' | 'consultant'
  upload_date: string
  page_count: number
  overall_risk_score: number
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  analysis_summary: string
  legal_risks: {
    severity: 'critical' | 'high' | 'moderate' | 'low'
    risk_type: string
    clause_reference: string
    description: string
    potential_impact: string
    estimated_cost_exposure: number
    recommendation: string
    industry_standard_comparison: string
  }[]
  payment_terms: {
    payment_schedule: string
    retention_percentage: number
    payment_timeline_days: number
    favorable_to: 'you' | 'other_party' | 'balanced'
    concerns: string[]
  }
  liability_clauses: {
    clause_type: string
    description: string
    risk_level: 'critical' | 'high' | 'moderate' | 'low'
    recommendation: string
  }[]
  missing_protections: string[]
  favorable_terms: string[]
  redline_suggestions: {
    section: string
    current_language: string
    suggested_language: string
    reason: string
    priority: 'high' | 'medium' | 'low'
  }[]
  negotiation_tips: string[]
  confidence_score: number
}

export default function ContractGuardianPage() {
  const router = useRouter()
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [selectedContract, setSelectedContract] = useState<string>('all')

  // Demo data - Contract analyses
  const [analyses, setAnalyses] = useState<ContractAnalysis[]>([
    {
      id: 'contract-1',
      contract_name: 'Riverside Medical Center - General Contractor Agreement',
      contract_type: 'general_contractor',
      upload_date: '2025-12-03',
      page_count: 42,
      overall_risk_score: 68,
      risk_level: 'high',
      analysis_summary: 'High-risk contract with unfavorable indemnification clause and aggressive liquidated damages. Payment terms are standard but retention is above market. Recommend negotiating 5 key clauses before signing.',
      legal_risks: [
        {
          severity: 'critical',
          risk_type: 'Broad Indemnification',
          clause_reference: 'Section 12.3, Page 18',
          description: 'You must defend and indemnify owner for ANY claims, even those caused by owner\'s own negligence',
          potential_impact: 'Unlimited liability exposure for claims you didn\'t cause',
          estimated_cost_exposure: 500000,
          recommendation: 'MUST REVISE: Limit indemnification to claims arising from your own negligence. Industry standard is comparative fault indemnification.',
          industry_standard_comparison: 'This clause is in bottom 5% - extremely unfavorable. 92% of contracts limit indemnification to proportionate fault.'
        },
        {
          severity: 'critical',
          risk_type: 'Liquidated Damages',
          clause_reference: 'Section 8.4, Page 14',
          description: 'Liquidated damages of $5,000 per day for delays, regardless of cause',
          potential_impact: 'Financial penalty even for delays beyond your control (weather, owner changes, etc.)',
          estimated_cost_exposure: 150000,
          recommendation: 'NEGOTIATE: Add exceptions for force majeure, owner-caused delays, and change orders. Cap total damages at 10% of contract value.',
          industry_standard_comparison: 'Daily rate is 40% higher than market average. 78% of contracts include delay exceptions.'
        },
        {
          severity: 'high',
          risk_type: 'Pay-When-Paid Clause',
          clause_reference: 'Section 5.2, Page 9',
          description: 'You only get paid when owner pays the GC (shifts payment risk to you)',
          potential_impact: 'Could wait months for payment if owner has financial issues',
          estimated_cost_exposure: 280000,
          recommendation: 'REVISE to "pay-if-paid" with 60-day maximum wait. Better: negotiate direct payment terms not contingent on owner payment.',
          industry_standard_comparison: 'Pay-when-paid clauses are unenforceable in 14 states. 64% of contractors successfully negotiate this out.'
        },
        {
          severity: 'moderate',
          risk_type: 'Waiver of Consequential Damages - One Sided',
          clause_reference: 'Section 13.7, Page 21',
          description: 'You waive right to consequential damages, but owner does not waive theirs',
          potential_impact: 'Owner can sue for lost profits/revenue, but you cannot',
          estimated_cost_exposure: 100000,
          recommendation: 'Make this mutual: both parties waive consequential damages (industry standard).',
          industry_standard_comparison: '88% of contracts have mutual waiver. One-sided waivers are red flag.'
        }
      ],
      payment_terms: {
        payment_schedule: 'Monthly progress payments based on completed work',
        retention_percentage: 10,
        payment_timeline_days: 45,
        favorable_to: 'other_party',
        concerns: [
          '10% retention is above market average (7% typical)',
          '45-day payment window is longer than standard 30 days',
          'Final retention release tied to final completion of entire project (could delay payment 6+ months)',
          'No interest accrues on retained funds'
        ]
      },
      liability_clauses: [
        {
          clause_type: 'Insurance Requirements',
          description: '$5M general liability, $2M professional liability, $1M umbrella required',
          risk_level: 'moderate',
          recommendation: 'Insurance requirements are high but reasonable for project size. Confirm your current policies meet these limits.'
        },
        {
          clause_type: 'Warranty Period',
          description: '2-year warranty on all work (industry standard is 1 year)',
          risk_level: 'moderate',
          recommendation: 'Negotiate down to 1 year, or increase contract price to cover extended warranty risk.'
        },
        {
          clause_type: 'No Limitation of Liability',
          description: 'Contract has no cap on total liability',
          risk_level: 'critical',
          recommendation: 'ADD CLAUSE: Limit total liability to contract value (industry standard). Without this, you have unlimited exposure.'
        }
      ],
      missing_protections: [
        'No force majeure clause (protection for delays beyond your control)',
        'No change order process defined (vulnerable to scope creep)',
        'No dispute resolution process (could face expensive litigation)',
        'No termination for convenience terms (if you need to exit)',
        'No protection against owner bankruptcy or insolvency'
      ],
      favorable_terms: [
        'Right to stop work if payments are 15+ days late',
        'You can hire subcontractors without pre-approval',
        'Access to site is guaranteed 6am-8pm, 7 days/week'
      ],
      redline_suggestions: [
        {
          section: 'Section 12.3 - Indemnification',
          current_language: 'Contractor shall defend, indemnify and hold harmless Owner from any and all claims arising from the work.',
          suggested_language: 'Contractor shall defend, indemnify and hold harmless Owner from claims arising from Contractor\'s negligent acts or omissions, to the extent of Contractor\'s proportionate fault.',
          reason: 'Limits your liability to claims you actually caused, not claims caused by owner or others.',
          priority: 'high'
        },
        {
          section: 'Section 8.4 - Liquidated Damages',
          current_language: 'Contractor shall pay Owner $5,000 per day for each day of delay beyond substantial completion date.',
          suggested_language: 'Contractor shall pay Owner $3,000 per day for delays caused by Contractor, excluding force majeure events, owner-caused delays, and change orders. Total liquidated damages shall not exceed 10% of contract price.',
          reason: 'Reduces daily rate, adds exceptions for delays beyond your control, and caps total exposure.',
          priority: 'high'
        },
        {
          section: 'Section 5.2 - Payment Terms',
          current_language: 'Contractor shall be paid within 45 days of Owner\'s payment to General Contractor.',
          suggested_language: 'Contractor shall be paid within 30 days of invoice submittal, regardless of Owner payment status.',
          reason: 'Eliminates payment risk from owner\'s financial issues and shortens payment timeline.',
          priority: 'high'
        },
        {
          section: 'Add New Section - Limitation of Liability',
          current_language: 'N/A - clause does not exist',
          suggested_language: 'Each party\'s total aggregate liability under this Agreement shall not exceed the total contract price.',
          reason: 'Caps your maximum liability exposure to the contract value.',
          priority: 'high'
        },
        {
          section: 'Add New Section - Force Majeure',
          current_language: 'N/A - clause does not exist',
          suggested_language: 'Neither party shall be liable for delays caused by events beyond their reasonable control, including acts of God, severe weather, labor disputes, or government actions.',
          reason: 'Protects you from liability for delays you cannot control.',
          priority: 'high'
        }
      ],
      negotiation_tips: [
        'Lead with indemnification clause - this is your biggest risk and most important change',
        'Owner may resist changing liquidated damages rate, but exceptions and cap are very negotiable',
        'Payment terms are highly negotiable - 30 days and pay-if-paid are achievable',
        'Suggest mutual waiver of consequential damages (protects both parties)',
        'Frame requests as "industry standard" and "bankability" issues (lenders won\'t approve one-sided contracts)',
        'If owner won\'t budge on high-risk terms, increase your price by 8-12% to cover the additional risk',
        'Walk away if owner refuses to make indemnification and liability cap mutual/reasonable'
      ],
      confidence_score: 96
    },
    {
      id: 'contract-2',
      contract_name: 'HVAC Subcontractor Agreement - Downtown Lofts',
      contract_type: 'subcontractor',
      upload_date: '2025-12-01',
      page_count: 18,
      overall_risk_score: 35,
      risk_level: 'medium',
      analysis_summary: 'Moderate risk subcontractor agreement with fair payment terms and reasonable liability limits. Main concerns are warranty period (2 years vs standard 1 year) and missing change order process. Overall acceptable with minor revisions.',
      legal_risks: [
        {
          severity: 'moderate',
          risk_type: 'Extended Warranty Period',
          clause_reference: 'Section 9.1, Page 12',
          description: '2-year warranty on all HVAC work and equipment',
          potential_impact: 'Extended warranty increases your risk and callback costs',
          estimated_cost_exposure: 15000,
          recommendation: 'Negotiate down to 1 year for labor, 2 years for equipment only (standard for HVAC). Or increase contract price by $8,000 to cover extended warranty risk.',
          industry_standard_comparison: 'Industry standard is 1 year labor, manufacturer warranty for equipment. 2-year labor warranty adds significant risk.'
        },
        {
          severity: 'moderate',
          risk_type: 'Scope Creep Risk',
          clause_reference: 'Section 3.4, Page 5',
          description: 'Change order process is vaguely defined',
          potential_impact: 'GC could demand extra work without paying for it',
          estimated_cost_exposure: 25000,
          recommendation: 'ADD SPECIFIC CLAUSE: All scope changes require written change order with agreed price before work begins. No verbal authorizations accepted.',
          industry_standard_comparison: '92% of well-written contracts have formal change order approval process.'
        }
      ],
      payment_terms: {
        payment_schedule: 'Monthly progress payments',
        retention_percentage: 5,
        payment_timeline_days: 30,
        favorable_to: 'balanced',
        concerns: [
          'Retention release timing not specified (should be at substantial completion)',
          'No interest on late payments'
        ]
      },
      liability_clauses: [
        {
          clause_type: 'Limitation of Liability',
          description: 'Total liability capped at contract value ($180,000)',
          risk_level: 'low',
          recommendation: 'This is fair and industry standard. Keep as-is.'
        },
        {
          clause_type: 'Insurance Requirements',
          description: '$2M general liability, $1M auto, workers comp',
          risk_level: 'low',
          recommendation: 'Requirements are reasonable and standard for project size.'
        }
      ],
      missing_protections: [
        'No dispute resolution/arbitration clause',
        'Change order approval process needs clarification'
      ],
      favorable_terms: [
        'Liability is capped at contract value',
        '30-day payment terms (industry standard)',
        '5% retention (below market average of 7-10%)',
        'You can use your own subcontractors for ductwork',
        'Materials escalation clause protects you from price increases'
      ],
      redline_suggestions: [
        {
          section: 'Section 9.1 - Warranty',
          current_language: 'Subcontractor warrants all work for 2 years from substantial completion.',
          suggested_language: 'Subcontractor warrants labor for 1 year and equipment per manufacturer warranty (typically 2-5 years) from substantial completion.',
          reason: 'Aligns with industry standard and reduces your labor callback risk.',
          priority: 'medium'
        },
        {
          section: 'Add to Section 3.4 - Change Orders',
          current_language: 'Changes to scope may be requested by General Contractor.',
          suggested_language: 'All changes to scope require a written change order signed by both parties with agreed pricing before work begins. Verbal authorizations are not valid.',
          reason: 'Prevents scope creep and ensures you get paid for extra work.',
          priority: 'high'
        }
      ],
      negotiation_tips: [
        'This is a relatively fair contract - pick your battles on warranty and change orders',
        'Warranty reduction is very negotiable - most GCs accept 1-year labor standard',
        'Change order clarification should be non-controversial (protects both parties)',
        'Consider accepting 2-year warranty if GC pays extra $8,000-$10,000',
        'Overall this contract is signaled with minor revisions'
      ],
      confidence_score: 94
    },
    {
      id: 'contract-3',
      contract_name: 'Material Supply Agreement - BuildRight Supply',
      contract_type: 'supplier',
      upload_date: '2025-11-28',
      page_count: 12,
      overall_risk_score: 22,
      risk_level: 'low',
      analysis_summary: 'Low-risk supplier agreement with favorable terms. Payment terms are standard Net 30. Only minor concern is missing force majeure clause for delivery delays. Safe to sign with minimal changes.',
      legal_risks: [
        {
          severity: 'low',
          risk_type: 'No Force Majeure for Deliveries',
          clause_reference: 'Section 6.2, Page 8',
          description: 'Supplier can charge penalties for late material acceptance, but no protection for their delivery delays',
          potential_impact: 'If supplier is late delivering materials, you have limited recourse',
          estimated_cost_exposure: 5000,
          recommendation: 'ADD CLAUSE: Include mutual force majeure allowing either party relief for delays beyond their control (weather, shipping delays, material shortages).',
          industry_standard_comparison: '82% of supply agreements include force majeure protection for both parties.'
        }
      ],
      payment_terms: {
        payment_schedule: 'Net 30 from invoice date',
        retention_percentage: 0,
        payment_timeline_days: 30,
        favorable_to: 'balanced',
        concerns: [
          '1.5% monthly interest on late payments (18% annual - slightly high but acceptable)'
        ]
      },
      liability_clauses: [
        {
          clause_type: 'Product Warranty',
          description: 'Materials warranted defect-free for 1 year',
          risk_level: 'low',
          recommendation: 'Standard warranty. Ensure you inspect materials upon delivery and report defects within 30 days.'
        }
      ],
      missing_protections: [
        'Force majeure clause for delivery delays'
      ],
      favorable_terms: [
        'No retention held',
        'Volume discounts available (tiered pricing)',
        'Can return unused materials within 30 days for 90% credit',
        'Free delivery on orders over $5,000',
        'Price protection: locked pricing for 90 days',
        'Supplier carries $5M product liability insurance'
      ],
      redline_suggestions: [
        {
          section: 'Add New Section - Force Majeure',
          current_language: 'N/A - clause does not exist',
          suggested_language: 'Neither party shall be liable for delays caused by events beyond their reasonable control, including severe weather, material shortages, or shipping delays.',
          reason: 'Protects both parties from liability for uncontrollable delivery delays.',
          priority: 'low'
        }
      ],
      negotiation_tips: [
        'This is an excellent supplier contract - very little needs changing',
        'Force majeure addition should be non-controversial',
        'Consider negotiating volume discount tiers if you plan large recurring orders',
        'Safe to sign with minimal changes'
      ],
      confidence_score: 92
    }
  ])

  // Calculate stats
  const stats = {
    totalContracts: analyses.length,
    criticalRisks: analyses.reduce((sum, a) =>
      sum + a.legal_risks.filter(r => r.severity === 'critical').length, 0
    ),
    avgRiskScore: Math.round(
      analyses.reduce((sum, a) => sum + a.overall_risk_score, 0) / analyses.length
    ),
    highRiskContracts: analyses.filter(a => a.risk_level === 'high' || a.risk_level === 'critical').length,
    totalCostExposure: analyses.reduce((sum, a) =>
      sum + a.legal_risks.reduce((sum2, r) => sum2 + r.estimated_cost_exposure, 0), 0
    ),
    avgAIConfidence: Math.round(
      analyses.reduce((sum, a) => sum + a.confidence_score, 0) / analyses.length
    )
  }

  const handleUploadContract = async (file: File | null) => {
    if (!file) return

    setUploadingFile(true)

    // Simulate upload and analysis
    setTimeout(() => {
      alert(`✅ Contract uploaded! AI legal analysis will complete in 3-5 minutes. We'll email you when ready.`)
      setUploadingFile(false)
      setShowUploadModal(false)
    }, 2000)
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getContractTypeIcon = (type: string): string => {
    const icons: { [key: string]: string } = {
      subcontractor: '🔨',
      general_contractor: '🏗️',
      supplier: '📦',
      client: '🤝',
      consultant: '💼'
    }
    return icons[type] || '📄'
  }

  const getContractTypeLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      subcontractor: 'Subcontractor Agreement',
      general_contractor: 'General Contractor Agreement',
      supplier: 'Supplier Agreement',
      client: 'Client Contract',
      consultant: 'Consultant Agreement'
    }
    return labels[type] || type
  }

  const getRiskLevelColor = (level: string): string => {
    if (level === 'critical') return 'text-red-700 bg-red-100 border-red-600'
    if (level === 'high') return 'text-orange-700 bg-orange-100 border-orange-600'
    if (level === 'medium') return 'text-yellow-700 bg-yellow-100 border-yellow-600'
    return 'text-green-700 bg-green-100 border-green-600'
  }

  const getRiskLevelLabel = (level: string): string => {
    if (level === 'critical') return '🚨 CRITICAL RISK'
    if (level === 'high') return '⚠️ HIGH RISK'
    if (level === 'medium') return '⚡ MODERATE RISK'
    return '✅ LOW RISK'
  }

  const getSeverityColor = (severity: string): string => {
    if (severity === 'critical') return 'bg-red-600 text-white'
    if (severity === 'high') return 'bg-orange-600 text-white'
    if (severity === 'moderate') return 'bg-yellow-600 text-white'
    return 'bg-blue-600 text-white'
  }

  const getPaymentFavorability = (favorable: string): { color: string; label: string } => {
    if (favorable === 'you') return { color: 'text-green-700 bg-green-100', label: '✓ Favorable to You' }
    if (favorable === 'other_party') return { color: 'text-red-700 bg-red-100', label: '⚠️ Unfavorable' }
    return { color: 'text-blue-700 bg-blue-100', label: '⚖️ Balanced' }
  }

  return (
    <AIAccessWrapper requiredTier="enterprise">
      <div className="min-h-screen bg-linear-to-b from-indigo-50 via-blue-50 to-white p-8">
        {/* Header */}
        <div className="max-w-7xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                ⚖️ Contract Guardian
              </h1>
              <p className="text-lg text-gray-600">
                AI-powered legal contract review that protects you from hidden risks
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold shadow-lg"
            >
              📤 Upload Contract for Review
            </button>
          </div>

          {/* How It Works Banner */}
          <div className="bg-linear-to-r from-indigo-100 to-blue-100 border-l-4 border-indigo-600 p-6 rounded-lg mb-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">🤖</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">How AI Contract Review Works:</h3>
                <p className="text-gray-700">
                  Upload any construction contract (PDF). Our AI analyzes every clause for legal risks, unfavorable terms, missing protections, and payment issues.
                  It compares each term to industry standards, calculates your cost exposure, and provides specific redline suggestions with negotiation tips.
                  Contractors using Contract Guardian <span className="font-bold text-indigo-700">avoid $85,000+ in contract risks per year</span> on average!
                </p>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-6 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-600">
              <div className="text-3xl mb-2">📋</div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalContracts}</div>
              <div className="text-sm text-gray-600">Contracts Reviewed</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-600">
              <div className="text-3xl mb-2">🚨</div>
              <div className="text-3xl font-bold text-red-600">{stats.criticalRisks}</div>
              <div className="text-sm text-gray-600">Critical Risks</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-orange-600">
              <div className="text-3xl mb-2">⚠️</div>
              <div className="text-3xl font-bold text-gray-900">{stats.avgRiskScore}</div>
              <div className="text-sm text-gray-600">Avg Risk Score</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-600">
              <div className="text-3xl mb-2">📊</div>
              <div className="text-3xl font-bold text-gray-900">{stats.highRiskContracts}</div>
              <div className="text-sm text-gray-600">High Risk Contracts</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-600">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalCostExposure)}</div>
              <div className="text-sm text-gray-600">Total Cost Exposure</div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
              <div className="text-3xl mb-2">🎯</div>
              <div className="text-3xl font-bold text-gray-900">{stats.avgAIConfidence}%</div>
              <div className="text-sm text-gray-600">AI Accuracy</div>
            </div>
          </div>

          {/* Contract Analyses */}
          <div className="space-y-6">
            {analyses.length === 0 ? (
              <div className="bg-white p-12 rounded-lg shadow-md text-center">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Contracts Reviewed Yet</h3>
                <p className="text-gray-600 mb-6">
                  Upload a construction contract (PDF) to get AI-powered legal risk analysis in minutes.
                </p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
                >
                  📤 Upload Your First Contract
                </button>
              </div>
            ) : (
              analyses.map((analysis) => (
                <div key={analysis.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-3xl">{getContractTypeIcon(analysis.contract_type)}</span>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{analysis.contract_name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-sm text-gray-600">
                                {getContractTypeLabel(analysis.contract_type)} • {analysis.page_count} pages
                              </span>
                              <span className="text-sm text-gray-600">
                                Uploaded {formatDate(analysis.upload_date)}
                              </span>
                              <span className="text-sm px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full font-semibold">
                                {analysis.confidence_score}% AI confidence
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-block px-4 py-2 rounded-lg border-2 ${getRiskLevelColor(analysis.risk_level)}`}>
                          <div className="text-xl font-bold">{getRiskLevelLabel(analysis.risk_level)}</div>
                          <div className="text-sm">Risk Score: {analysis.overall_risk_score}/100</div>
                        </div>
                      </div>
                    </div>

                    {/* AI Summary */}
                    <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 mb-6 rounded">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">🤖</div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">AI Legal Analysis Summary:</h4>
                          <p className="text-gray-700">{analysis.analysis_summary}</p>
                        </div>
                      </div>
                    </div>

                    {/* Legal Risks */}
                    {analysis.legal_risks.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-lg">
                          <span>⚠️</span> Legal Risks Identified ({analysis.legal_risks.length})
                        </h4>
                        <div className="space-y-4">
                          {analysis.legal_risks.map((risk, i) => (
                            <div key={i} className={`p-4 rounded-lg border-l-4 ${
                              risk.severity === 'critical' ? 'bg-red-50 border-red-600' :
                              risk.severity === 'high' ? 'bg-orange-50 border-orange-600' :
                              risk.severity === 'moderate' ? 'bg-yellow-50 border-yellow-600' :
                              'bg-blue-50 border-blue-600'
                            }`}>
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(risk.severity)}`}>
                                      {risk.severity.toUpperCase()}
                                    </span>
                                    <span className="font-bold text-gray-900 text-lg">{risk.risk_type}</span>
                                  </div>
                                  <div className="text-sm text-gray-600 mb-2">
                                    📍 {risk.clause_reference}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm text-gray-600">Cost Exposure</div>
                                  <div className="text-xl font-bold text-red-600">
                                    {formatCurrency(risk.estimated_cost_exposure)}
                                  </div>
                                </div>
                              </div>

                              <div className="bg-white bg-opacity-60 p-3 rounded mb-3">
                                <div className="font-semibold text-gray-900 mb-1">What This Means:</div>
                                <p className="text-gray-700 text-sm mb-2">{risk.description}</p>
                                <div className="font-semibold text-gray-900 mb-1">Potential Impact:</div>
                                <p className="text-gray-700 text-sm">{risk.potential_impact}</p>
                              </div>

                              <div className="bg-green-50 border border-green-200 p-3 rounded mb-3">
                                <div className="font-semibold text-green-900 mb-1">✓ AI Recommendation:</div>
                                <p className="text-green-800 text-sm">{risk.recommendation}</p>
                              </div>

                              <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                                <div className="font-semibold text-blue-900 mb-1">📊 Industry Standard Comparison:</div>
                                <p className="text-blue-800 text-sm">{risk.industry_standard_comparison}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payment Terms */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-lg">
                        <span>💰</span> Payment Terms Analysis
                      </h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div>
                            <div className="text-sm text-gray-600">Payment Schedule</div>
                            <div className="font-semibold text-gray-900">{analysis.payment_terms.payment_schedule}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Payment Timeline</div>
                            <div className="font-semibold text-gray-900">{analysis.payment_terms.payment_timeline_days} days</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Retention</div>
                            <div className="font-semibold text-gray-900">{analysis.payment_terms.retention_percentage}%</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Overall Assessment</div>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              getPaymentFavorability(analysis.payment_terms.favorable_to).color
                            }`}>
                              {getPaymentFavorability(analysis.payment_terms.favorable_to).label}
                            </span>
                          </div>
                        </div>

                        {analysis.payment_terms.concerns.length > 0 && (
                          <div>
                            <div className="font-semibold text-gray-900 mb-2">⚠️ Payment Concerns:</div>
                            <ul className="space-y-1">
                              {analysis.payment_terms.concerns.map((concern, i) => (
                                <li key={i} className="text-sm text-gray-700">• {concern}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Redline Suggestions */}
                    {analysis.redline_suggestions.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-lg">
                          <span>✏️</span> Redline Suggestions ({analysis.redline_suggestions.length})
                        </h4>
                        <div className="space-y-4">
                          {analysis.redline_suggestions.map((suggestion, i) => (
                            <div key={i} className="bg-yellow-50 border-l-4 border-yellow-600 p-4 rounded">
                              <div className="flex items-start justify-between mb-2">
                                <div className="font-semibold text-gray-900">{suggestion.section}</div>
                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                  suggestion.priority === 'high' ? 'bg-red-600 text-white' :
                                  suggestion.priority === 'medium' ? 'bg-orange-600 text-white' :
                                  'bg-blue-600 text-white'
                                }`}>
                                  {suggestion.priority.toUpperCase()} PRIORITY
                                </span>
                              </div>

                              <div className="mb-3">
                                <div className="text-sm font-semibold text-red-900 mb-1">❌ Current Language:</div>
                                <div className="bg-red-100 border border-red-300 p-2 rounded text-sm text-gray-700 italic">
                                  "{suggestion.current_language}"
                                </div>
                              </div>

                              <div className="mb-3">
                                <div className="text-sm font-semibold text-green-900 mb-1">✅ Suggested Language:</div>
                                <div className="bg-green-100 border border-green-300 p-2 rounded text-sm text-gray-700 italic">
                                  "{suggestion.suggested_language}"
                                </div>
                              </div>

                              <div className="bg-blue-50 border border-blue-200 p-2 rounded">
                                <div className="text-sm font-semibold text-blue-900 mb-1">Why This Change:</div>
                                <p className="text-sm text-blue-800">{suggestion.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Missing Protections */}
                    {analysis.missing_protections.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-lg">
                          <span>🛡️</span> Missing Protections
                        </h4>
                        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded">
                          <p className="text-sm text-gray-700 mb-2">This contract is missing important protective clauses:</p>
                          <ul className="space-y-1">
                            {analysis.missing_protections.map((protection, i) => (
                              <li key={i} className="text-sm text-red-800 font-medium">⚠️ {protection}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Favorable Terms */}
                    {analysis.favorable_terms.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-lg">
                          <span>✅</span> Favorable Terms
                        </h4>
                        <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                          <p className="text-sm text-gray-700 mb-2">Good news! These terms work in your favor:</p>
                          <ul className="space-y-1">
                            {analysis.favorable_terms.map((term, i) => (
                              <li key={i} className="text-sm text-green-800 font-medium">✓ {term}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Negotiation Tips */}
                    {analysis.negotiation_tips.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-lg">
                          <span>💡</span> Negotiation Strategy Tips
                        </h4>
                        <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 rounded">
                          <ul className="space-y-2">
                            {analysis.negotiation_tips.map((tip, i) => (
                              <li key={i} className="text-sm text-indigo-900">
                                <span className="font-bold">{i + 1}.</span> {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Upload Contract for AI Review
                </h2>

                <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">💡</div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">What You'll Get:</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li>• Complete legal risk analysis with cost exposure estimates</li>
                        <li>• Clause-by-clause review vs industry standards</li>
                        <li>• Specific redline suggestions with exact language</li>
                        <li>• Payment terms fairness assessment</li>
                        <li>• Negotiation tips from thousands of construction contracts</li>
                        <li>• Analysis completes in 3-5 minutes</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Contract Type
                  </label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    <option>General Contractor Agreement</option>
                    <option>Subcontractor Agreement</option>
                    <option>Supplier/Vendor Agreement</option>
                    <option>Client Contract</option>
                    <option>Consultant Agreement</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Upload Contract (PDF)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-3">📄</div>
                    <p className="text-gray-600 mb-4">
                      Drag and drop your contract PDF here, or click to browse
                    </p>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handleUploadContract(e.target.files?.[0] || null)}
                      className="hidden"
                      id="contract-upload"
                    />
                    <label
                      htmlFor="contract-upload"
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold cursor-pointer inline-block"
                    >
                      Choose PDF File
                    </label>
                    <p className="text-xs text-gray-500 mt-3">
                      PDF files only • Max 25MB • All data encrypted and confidential
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">🔒</div>
                    <div className="text-sm text-gray-700">
                      <strong>100% Confidential:</strong> Your contracts are encrypted in transit and at rest.
                      AI analysis happens in a secure isolated environment. We never share or use your contracts for training.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                    disabled={uploadingFile}
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
