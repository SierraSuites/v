'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface ProposalSection {
  id: string
  type: 'cover' | 'team_intro' | 'project_approach' | 'timeline' | 'investment' | 'terms' | 'testimonials' | 'portfolio' | 'custom'
  title: string
  content: string
  order: number
  visible: boolean
}

interface Quote {
  id: string
  project_name: string
  client_name: string
  total_min: number
  total_max: number
  line_items: any[]
  created_at: string
}

function ProposalBuilderContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const quoteId = searchParams.get('quote')

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null)
  const [proposalTitle, setProposalTitle] = useState('')
  const [sections, setSections] = useState<ProposalSection[]>([])
  const [presentationMode, setPresentationMode] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showExportModal, setShowExportModal] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState(true)

  // Company branding (would come from settings in production)
  const [branding, setBranding] = useState({
    companyName: 'The Sierra Suites Construction',
    tagline: 'Building Excellence Since 2010',
    primaryColor: '#3B82F6',
    accentColor: '#10B981',
    logoUrl: null
  })

  // Demo quotes
  const [quotes, setQuotes] = useState<Quote[]>([
    {
      id: '1',
      project_name: 'Custom Home - Oakmont Drive',
      client_name: 'Johnson Family',
      total_min: 1125000,
      total_max: 1285000,
      line_items: [
        { category: 'Site Work & Foundation', min: 125000, max: 145000 },
        { category: 'Framing & Structure', min: 280000, max: 320000 },
        { category: 'Exterior Finishes', min: 185000, max: 215000 },
        { category: 'Interior Finishes', min: 320000, max: 365000 },
        { category: 'MEP Systems', min: 155000, max: 175000 },
        { category: 'Fixtures & Appliances', min: 60000, max: 65000 }
      ],
      created_at: '2025-12-05'
    }
  ])

  // Initialize proposal from quote
  useEffect(() => {
    if (quoteId && quotes.length > 0) {
      const quote = quotes.find(q => q.id === quoteId)
      if (quote) {
        setSelectedQuote(quote)
        setProposalTitle(`${quote.project_name} - Proposal`)
        initializeDefaultSections(quote)
      }
    }
  }, [quoteId, quotes])

  const initializeDefaultSections = (quote: Quote) => {
    const defaultSections: ProposalSection[] = [
      {
        id: '1',
        type: 'cover',
        title: 'Cover Page',
        content: `${quote.project_name}\n\nPrepared for: ${quote.client_name}\n\n${branding.companyName}\n${branding.tagline}`,
        order: 1,
        visible: true
      },
      {
        id: '2',
        type: 'team_intro',
        title: 'Meet Your Team',
        content: `We're a family-owned construction company with over 15 years of experience building custom homes in the greater metro area. Our team brings together master craftsmen, experienced project managers, and dedicated support staff—all committed to bringing your vision to life.\n\nYour dedicated project team includes:\n• Project Manager: Sarah Chen (12 years experience)\n• Lead Superintendent: Mike Torres (18 years experience)\n• Design Coordinator: Jessica Park (8 years experience)`,
        order: 2,
        visible: true
      },
      {
        id: '3',
        type: 'project_approach',
        title: 'Our Approach to Your Project',
        content: `We understand that building a custom home is one of life's most significant investments. That's why we've developed a proven process that keeps you informed, involved, and confident every step of the way.\n\nOur Process:\n\n1. Discovery & Planning (Weeks 1-4)\n   • Detailed design review and refinement\n   • Site analysis and preparation planning\n   • Permitting and approvals\n   • Material selections and ordering\n\n2. Foundation & Structure (Weeks 5-16)\n   • Site preparation and foundation work\n   • Framing and structural systems\n   • Weekly progress updates with photos\n\n3. Systems & Finishes (Weeks 17-28)\n   • MEP rough-ins and inspections\n   • Exterior and interior finishes\n   • Fixture and appliance installation\n\n4. Final Details & Walkthrough (Weeks 29-32)\n   • Final inspections and touch-ups\n   • Comprehensive walkthrough\n   • Warranty documentation delivery`,
        order: 3,
        visible: true
      },
      {
        id: '4',
        type: 'timeline',
        title: 'Project Timeline',
        content: `Estimated Duration: 32 weeks from permit approval to final walkthrough\n\nKey Milestones:\n• Permit Approval: Week 0\n• Foundation Complete: Week 8\n• Frame & Dry-In: Week 16\n• MEP Rough-In Complete: Week 20\n• Interior Finishes Start: Week 22\n• Final Walkthrough: Week 32\n\nWe provide weekly photo updates and maintain an online portal where you can track progress 24/7. Our average project completion rate is 98% on-time or early.`,
        order: 4,
        visible: true
      },
      {
        id: '5',
        type: 'investment',
        title: 'Investment Summary',
        content: generateInvestmentContent(quote),
        order: 5,
        visible: true
      },
      {
        id: '6',
        type: 'terms',
        title: 'Terms & Conditions',
        content: `Payment Terms:\n• 10% deposit upon contract signing\n• Progress payments based on completion milestones\n• Final payment due at closing walkthrough\n• All payments subject to lien waivers from subcontractors\n\nWarranty:\n• 1-year workmanship warranty on all labor\n• Manufacturer warranties on all materials and equipment\n• 10-year structural warranty\n\nScope Changes:\n• All changes require written change order approval\n• Change orders processed within 48 hours\n• Transparent pricing on all additions\n\nThis proposal is valid for 30 days from the date above. After this period, pricing may be subject to adjustment based on material cost changes.`,
        order: 6,
        visible: true
      },
      {
        id: '7',
        type: 'testimonials',
        title: 'What Our Clients Say',
        content: `"${branding.companyName} transformed our vision into reality. Their attention to detail and communication throughout the process was outstanding."\n— David & Laura M., Custom Home Owners\n\n"We've worked with many contractors over the years. This team stands out for their professionalism, craftsmanship, and genuine care for their clients."\n— Robert K., Residential Developer\n\n"From the first meeting to final walkthrough, we felt like partners in the process. The quality of work exceeded our expectations."\n— The Anderson Family, Home Renovation`,
        order: 7,
        visible: true
      }
    ]

    setSections(defaultSections)
  }

  function generateInvestmentContent(quote: Quote): string {
    const avgTotal = (quote.total_min + quote.total_max) / 2
    return `Total Investment Range: ${formatCurrency(quote.total_min)} - ${formatCurrency(quote.total_max)}\n\nThis investment includes:\n\n${quote.line_items.map(item =>
      `• ${item.category}: ${formatCurrency(item.min)} - ${formatCurrency(item.max)}`
    ).join('\n')}\n\nInvestment Details:\n• All estimates include materials, labor, and project management\n• Pricing based on current material costs (subject to market adjustment)\n• Permits and inspections included\n• Builder's risk insurance included\n• Weekly cleaning and site maintenance included\n\nNot Included:\n• Landscaping beyond rough grading\n• Driveway paving (can be added)\n• Fence and permanent outdoor structures\n• Window treatments\n• Optional upgrades and change orders`
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const handleToggleSection = (sectionId: string) => {
    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, visible: !s.visible } : s
    ))
  }

  const handleUpdateContent = (sectionId: string, newContent: string) => {
    setSections(sections.map(s =>
      s.id === sectionId ? { ...s, content: newContent } : s
    ))
  }

  const handleAddSection = () => {
    const newSection: ProposalSection = {
      id: Date.now().toString(),
      type: 'custom',
      title: 'Custom Section',
      content: 'Add your custom content here...',
      order: sections.length + 1,
      visible: true
    }
    setSections([...sections, newSection])
  }

  const handleExport = (format: string) => {
    alert(`Generating ${format.toUpperCase()} proposal... This will take 15-30 seconds.`)
    setShowExportModal(false)

    setTimeout(() => {
      alert(`✅ Proposal exported successfully! Download starting...`)
    }, 2000)
  }

  const nextSlide = () => {
    const visibleSections = sections.filter(s => s.visible)
    if (currentSlide < visibleSections.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const getSectionIcon = (type: string): string => {
    const icons: { [key: string]: string } = {
      cover: '📄',
      team_intro: '👥',
      project_approach: '🎯',
      timeline: '📅',
      investment: '💰',
      terms: '📋',
      testimonials: '⭐',
      portfolio: '🖼️',
      custom: '✏️'
    }
    return icons[type] || '📄'
  }

  const visibleSections = sections.filter(s => s.visible)
  const currentSection = presentationMode ? visibleSections[currentSlide] : null

  if (!selectedQuote) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-indigo-50 to-white p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📊 Professional Proposal Generator
          </h1>
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-6xl mb-4">💼</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Quote Selected</h2>
            <p className="text-gray-600 mb-6">
              Select a quote from QuoteHub to convert it into a professional client proposal.
            </p>
            <button
              onClick={() => router.push('/quotes')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              Go to QuoteHub
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (presentationMode) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
        {/* Presentation Header */}
        <div className="bg-black bg-opacity-50 px-8 py-4 flex items-center justify-between">
          <div className="text-white">
            <div className="font-bold">{proposalTitle}</div>
            <div className="text-sm text-gray-300">
              Slide {currentSlide + 1} of {visibleSections.length}
            </div>
          </div>
          <button
            onClick={() => setPresentationMode(false)}
            className="px-4 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-semibold"
          >
            Exit Presentation
          </button>
        </div>

        {/* Current Slide */}
        <div className="flex-1 flex items-center justify-center p-16">
          <div className="max-w-5xl w-full bg-white rounded-lg shadow-2xl p-12">
            {currentSection && (
              <div>
                <div className="flex items-center gap-4 mb-8 pb-6 border-b-2">
                  <span className="text-5xl">{getSectionIcon(currentSection.type)}</span>
                  <h2 className="text-4xl font-bold text-gray-900">{currentSection.title}</h2>
                </div>
                <div className="prose prose-lg max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-xl text-gray-700 leading-relaxed">
                    {currentSection.content}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-black bg-opacity-50 px-8 py-6 flex items-center justify-center gap-6">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="px-8 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <div className="flex gap-2">
            {visibleSections.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full ${
                  index === currentSlide ? 'bg-white' : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
          <button
            onClick={nextSlide}
            disabled={currentSlide === visibleSections.length - 1}
            className="px-8 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-indigo-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                📊 Professional Proposal Generator
              </h1>
              <p className="text-lg text-gray-600">
                Transform your quote into a compelling client presentation
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPresentationMode(true)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
              >
                🎭 Presentation Mode
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
              >
                📤 Export Proposal
              </button>
            </div>
          </div>

          {/* Quote Info Banner */}
          <div className="bg-gradient-to-r from-purple-100 to-indigo-100 border-l-4 border-purple-600 p-6 rounded-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Converting Quote:</h3>
                <div className="text-gray-700">
                  <strong>{selectedQuote.project_name}</strong> for {selectedQuote.client_name}
                </div>
                <div className="text-gray-600 text-sm mt-1">
                  Investment Range: {formatCurrency(selectedQuote.total_min)} - {formatCurrency(selectedQuote.total_max)}
                </div>
              </div>
              {aiSuggestions && (
                <div className="bg-white px-4 py-2 rounded-lg border-2 border-purple-400">
                  <div className="flex items-center gap-2 text-sm">
                    <span>🤖</span>
                    <span className="font-semibold text-purple-700">AI Suggestions Active</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Section Manager */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h3 className="font-bold text-gray-900 mb-4">📋 Proposal Sections</h3>

              <div className="space-y-2 mb-6">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className={`p-3 rounded-lg border-2 ${
                      section.visible
                        ? 'bg-blue-50 border-blue-400'
                        : 'bg-gray-50 border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span>{getSectionIcon(section.type)}</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {section.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleSection(section.id)}
                        className={`w-5 h-5 rounded ${
                          section.visible
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-300 text-gray-600'
                        } flex items-center justify-center text-xs`}
                      >
                        {section.visible ? '✓' : ''}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleAddSection}
                className="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 font-semibold"
              >
                + Add Custom Section
              </button>

              <div className="mt-6 pt-6 border-t">
                <div className="text-sm text-gray-600 mb-2">
                  {visibleSections.length} of {sections.length} sections visible
                </div>
                <div className="text-xs text-gray-500">
                  Toggle sections on/off to customize your proposal
                </div>
              </div>
            </div>
          </div>

          {/* Center - Content Editor */}
          <div className="col-span-9">
            <div className="space-y-6">
              {/* Proposal Title */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Proposal Title
                </label>
                <input
                  type="text"
                  value={proposalTitle}
                  onChange={(e) => setProposalTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-lg font-semibold"
                />
              </div>

              {/* Section Editors */}
              {sections.filter(s => s.visible).map((section) => (
                <div key={section.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-purple-100 to-indigo-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getSectionIcon(section.type)}</span>
                      <div>
                        <h3 className="font-bold text-gray-900">{section.title}</h3>
                        <div className="text-sm text-gray-600 capitalize">
                          {section.type.replace('_', ' ')} Section
                        </div>
                      </div>
                    </div>
                    {aiSuggestions && section.type !== 'investment' && (
                      <button className="px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700">
                        🤖 AI Enhance
                      </button>
                    )}
                  </div>

                  <div className="p-6">
                    {section.type === 'investment' ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <pre className="whitespace-pre-wrap font-sans text-gray-700">
                          {section.content}
                        </pre>
                        <div className="mt-4 text-sm text-gray-600">
                          💡 Investment details are auto-generated from your quote
                        </div>
                      </div>
                    ) : (
                      <textarea
                        value={section.content}
                        onChange={(e) => handleUpdateContent(section.id, e.target.value)}
                        rows={10}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-sans"
                      />
                    )}
                  </div>
                </div>
              ))}

              {sections.filter(s => s.visible).length === 0 && (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                  <div className="text-6xl mb-4">📄</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Sections Visible</h3>
                  <p className="text-gray-600">
                    Enable sections from the left sidebar to start building your proposal
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Export Proposal
                </h2>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Choose Export Format:</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                    >
                      <div className="text-3xl mb-2">📕</div>
                      <div className="font-bold text-gray-900 mb-1">PDF Proposal</div>
                      <div className="text-sm text-gray-600">Professional, print-ready format</div>
                    </button>

                    <button
                      onClick={() => handleExport('pptx')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                    >
                      <div className="text-3xl mb-2">📊</div>
                      <div className="font-bold text-gray-900 mb-1">PowerPoint</div>
                      <div className="text-sm text-gray-600">Perfect for presentations</div>
                    </button>

                    <button
                      onClick={() => handleExport('docx')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                    >
                      <div className="text-3xl mb-2">📝</div>
                      <div className="font-bold text-gray-900 mb-1">Word Document</div>
                      <div className="text-sm text-gray-600">Editable proposal document</div>
                    </button>

                    <button
                      onClick={() => handleExport('interactive')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                    >
                      <div className="text-3xl mb-2">🌐</div>
                      <div className="font-bold text-gray-900 mb-1">Web Link</div>
                      <div className="text-sm text-gray-600">Interactive online proposal</div>
                    </button>
                  </div>
                </div>

                <div className="bg-purple-50 border-l-4 border-purple-600 p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">✨</div>
                    <div className="text-sm text-gray-700">
                      <strong>Enterprise Feature:</strong> All exports include your company branding (logo, colors, fonts).
                      Web links track when clients open and view your proposal.
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowExportModal(false)}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ProposalBuilderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-purple-50 via-indigo-50 to-white flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ProposalBuilderContent />
    </Suspense>
  )
}
