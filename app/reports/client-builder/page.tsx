'use client'

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ReportSection {
  id: string
  type: 'header' | 'summary' | 'photos' | 'schedule' | 'budget' | 'upcoming' | 'text' | 'table' | 'chart'
  title: string
  content?: any
  config?: any
  order: number
}

interface ReportTemplate {
  id: string
  name: string
  description: string
  category: string
  sections: ReportSection[]
  isSystemTemplate: boolean
}

interface Project {
  id: string
  name: string
  client_name: string
  budget: number
  completion_percentage: number
}

export default function ClientReportBuilderPage() {
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null)
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [reportSections, setReportSections] = useState<ReportSection[]>([])
  const [reportTitle, setReportTitle] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [draggedSection, setDraggedSection] = useState<string | null>(null)

  // Demo data - Projects
  const [projects, setProjects] = useState<Project[]>([
    { id: '1', name: 'Riverside Medical Center', client_name: 'Riverside Health System', budget: 2850000, completion_percentage: 67 },
    { id: '2', name: 'Downtown Loft Conversion', client_name: 'Urban Living Partners', budget: 875000, completion_percentage: 82 },
    { id: '3', name: 'Custom Home - Oakmont Drive', client_name: 'Johnson Family', budget: 1250000, completion_percentage: 45 }
  ])

  // Demo data - System templates
  const [templates, setTemplates] = useState<ReportTemplate[]>([
    {
      id: 'weekly',
      name: 'Weekly Progress Report',
      description: 'Standard weekly update with photos, schedule, and budget summary',
      category: 'weekly_update',
      isSystemTemplate: true,
      sections: [
        { id: '1', type: 'header', title: 'Weekly Progress Report', order: 1 },
        { id: '2', type: 'summary', title: 'Executive Summary', order: 2 },
        { id: '3', type: 'photos', title: 'Progress Photos This Week', config: { count: 6 }, order: 3 },
        { id: '4', type: 'schedule', title: 'Schedule Update', order: 4 },
        { id: '5', type: 'budget', title: 'Budget Summary', order: 5 },
        { id: '6', type: 'upcoming', title: 'Next Week\'s Activities', order: 6 }
      ]
    },
    {
      id: 'financial',
      name: 'Financial Summary',
      description: 'Detailed financial report with budget breakdown and change orders',
      category: 'financial_summary',
      isSystemTemplate: true,
      sections: [
        { id: '1', type: 'header', title: 'Project Financial Summary', order: 1 },
        { id: '2', type: 'budget', title: 'Budget Overview', order: 2 },
        { id: '3', type: 'table', title: 'Change Orders', order: 3 },
        { id: '4', type: 'chart', title: 'Cost Breakdown by Category', order: 4 },
        { id: '5', type: 'table', title: 'Payment Schedule', order: 5 }
      ]
    },
    {
      id: 'completion',
      name: 'Project Completion Report',
      description: 'Final project summary with before/after photos and final financials',
      category: 'project_completion',
      isSystemTemplate: true,
      sections: [
        { id: '1', type: 'header', title: 'Project Completion Report', order: 1 },
        { id: '2', type: 'photos', title: 'Before & After', config: { count: 4, layout: 'comparison' }, order: 2 },
        { id: '3', type: 'photos', title: 'Final Photos', config: { count: 12 }, order: 3 },
        { id: '4', type: 'budget', title: 'Final Budget Summary', order: 4 },
        { id: '5', type: 'text', title: 'Warranty Information', order: 5 }
      ]
    }
  ])

  // Available section types for drag-and-drop
  const availableSections = [
    { type: 'header', icon: '📄', label: 'Header', description: 'Report title and date' },
    { type: 'summary', icon: '📝', label: 'Executive Summary', description: 'Text overview' },
    { type: 'photos', icon: '📷', label: 'Photo Gallery', description: 'FieldSnap integration' },
    { type: 'schedule', icon: '📅', label: 'Schedule Update', description: 'Timeline and milestones' },
    { type: 'budget', icon: '💰', label: 'Budget Summary', description: 'Financial overview' },
    { type: 'chart', icon: '📊', label: 'Chart/Graph', description: 'Visual data' },
    { type: 'table', icon: '📋', label: 'Data Table', description: 'Structured data' },
    { type: 'text', icon: '✏️', label: 'Text Block', description: 'Custom content' },
    { type: 'upcoming', icon: '⏭️', label: 'Upcoming Work', description: 'Next steps' }
  ]

  useEffect(() => {
    if (selectedTemplate) {
      setReportSections(selectedTemplate.sections)
      setReportTitle(selectedTemplate.name)
    }
  }, [selectedTemplate])

  const handleTemplateSelect = (template: ReportTemplate) => {
    setSelectedTemplate(template)
    setShowTemplateModal(false)
  }

  const handleDragStart = (sectionType: string) => {
    setDraggedSection(sectionType)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!draggedSection) return

    const newSection: ReportSection = {
      id: Date.now().toString(),
      type: draggedSection as any,
      title: availableSections.find(s => s.type === draggedSection)?.label || '',
      order: reportSections.length + 1
    }

    setReportSections([...reportSections, newSection])
    setDraggedSection(null)
  }

  const handleRemoveSection = (sectionId: string) => {
    setReportSections(reportSections.filter(s => s.id !== sectionId))
  }

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    const index = reportSections.findIndex(s => s.id === sectionId)
    if (index === -1) return

    const newSections = [...reportSections]
    if (direction === 'up' && index > 0) {
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]]
    } else if (direction === 'down' && index < newSections.length - 1) {
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]]
    }

    // Update order numbers
    newSections.forEach((section, i) => {
      section.order = i + 1
    })

    setReportSections(newSections)
  }

  const handleExport = (format: string) => {
    // In production, this would generate the actual document
    alert(`Generating ${format.toUpperCase()} report... This will take 15-30 seconds.`)
    setShowExportModal(false)

    // Simulate export
    setTimeout(() => {
      alert(`✅ Report exported successfully! Download starting...`)
    }, 2000)
  }

  const getSectionIcon = (type: string): string => {
    const section = availableSections.find(s => s.type === type)
    return section?.icon || '📄'
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-indigo-50 to-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                📄 Client Report Builder
              </h1>
              <p className="text-lg text-gray-600">
                Create professional client reports with drag-and-drop simplicity
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTemplateModal(true)}
                className="px-6 py-3 border-2 border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 font-semibold"
              >
                📋 Load Template
              </button>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                👁️ {showPreview ? 'Hide' : 'Show'} Preview
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                disabled={reportSections.length === 0 || !selectedProject}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📤 Export Report
              </button>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-gradient-to-r from-blue-100 to-indigo-100 border-l-4 border-blue-600 p-6 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="text-3xl">💡</div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">How to Build Client Reports:</h3>
                <p className="text-gray-700">
                  <strong>1)</strong> Select a project • <strong>2)</strong> Choose a template or start from scratch •
                  <strong>3)</strong> Drag sections from the left into your report • <strong>4)</strong> Customize content •
                  <strong>5)</strong> Preview and export to PDF, PowerPoint, or Word
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Project Selection */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-3">
            Select Project for This Report
          </label>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium"
          >
            <option value="">Choose a project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name} - {project.client_name} ({project.completion_percentage}% complete)
              </option>
            ))}
          </select>

          {selectedProjectData && (
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-gray-600">Client</div>
                <div className="font-semibold text-gray-900">{selectedProjectData.client_name}</div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-sm text-gray-600">Budget</div>
                <div className="font-semibold text-gray-900">{formatCurrency(selectedProjectData.budget)}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-sm text-gray-600">Progress</div>
                <div className="font-semibold text-gray-900">{selectedProjectData.completion_percentage}% Complete</div>
              </div>
            </div>
          )}
        </div>

        {/* Main Builder Interface */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Available Sections */}
          <div className="col-span-3">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
              <h3 className="font-bold text-gray-900 mb-4">📦 Available Sections</h3>
              <p className="text-sm text-gray-600 mb-4">Drag sections into your report →</p>

              <div className="space-y-2">
                {availableSections.map((section) => (
                  <div
                    key={section.type}
                    draggable
                    onDragStart={() => handleDragStart(section.type)}
                    className="p-3 bg-gray-50 border-2 border-gray-300 rounded-lg cursor-move hover:bg-blue-50 hover:border-blue-400 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{section.icon}</span>
                      <span className="font-semibold text-gray-900 text-sm">{section.label}</span>
                    </div>
                    <div className="text-xs text-gray-600">{section.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Center - Report Builder */}
          <div className={showPreview ? 'col-span-5' : 'col-span-9'}>
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Report Title
                </label>
                <input
                  type="text"
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="Enter report title..."
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`min-h-[500px] border-2 border-dashed rounded-lg p-6 ${
                  reportSections.length === 0
                    ? 'border-gray-300 bg-gray-50'
                    : 'border-blue-300 bg-blue-50/30'
                }`}
              >
                {reportSections.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">📄</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Your Report is Empty</h3>
                    <p className="text-gray-600 mb-4">
                      Drag sections from the left to start building your report
                    </p>
                    <p className="text-sm text-gray-500">
                      Or click "Load Template" to start with a pre-built layout
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reportSections.map((section, index) => (
                      <div
                        key={section.id}
                        className="bg-white border-2 border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-2xl">{getSectionIcon(section.type)}</span>
                            <div className="flex-1">
                              <input
                                type="text"
                                value={section.title}
                                onChange={(e) => {
                                  const newSections = [...reportSections]
                                  newSections[index].title = e.target.value
                                  setReportSections(newSections)
                                }}
                                className="w-full font-semibold text-gray-900 bg-transparent border-b-2 border-transparent hover:border-gray-300 focus:border-blue-500 outline-none px-2 py-1"
                              />
                              <div className="text-sm text-gray-600 px-2 mt-1 capitalize">
                                {section.type.replace('_', ' ')} Section
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMoveSection(section.id, 'up')}
                              disabled={index === 0}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => handleMoveSection(section.id, 'down')}
                              disabled={index === reportSections.length - 1}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                              title="Move down"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => handleRemoveSection(section.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                              title="Remove"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Section-specific config */}
                        {section.type === 'photos' && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-sm text-gray-600 mb-2">Photo Count: {section.config?.count || 6} photos</div>
                            <button className="text-sm text-blue-600 hover:underline">
                              Select from FieldSnap →
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {reportSections.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">Report Contains {reportSections.length} Sections</div>
                      <div className="text-sm text-gray-600">Ready to preview and export</div>
                    </div>
                    <button
                      onClick={() => setReportSections([])}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Live Preview */}
          {showPreview && (
            <div className="col-span-4">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-8">
                <h3 className="font-bold text-gray-900 mb-4">👁️ Live Preview</h3>

                <div className="border-2 border-gray-300 rounded-lg p-6 bg-gray-50 max-h-[700px] overflow-y-auto">
                  {/* Preview Header */}
                  <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
                    <div className="text-2xl font-bold text-gray-900 mb-2">
                      {reportTitle || 'Untitled Report'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {selectedProjectData?.name || 'No Project Selected'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>

                  {/* Preview Sections */}
                  <div className="space-y-4">
                    {reportSections.map((section) => (
                      <div key={section.id} className="mb-6">
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <span>{getSectionIcon(section.type)}</span>
                          {section.title}
                        </h4>

                        {section.type === 'summary' && (
                          <p className="text-sm text-gray-700 leading-relaxed">
                            This week we completed foundation work on the north wall and began framing preparations.
                            All work remains on schedule and within budget.
                          </p>
                        )}

                        {section.type === 'photos' && (
                          <div className="grid grid-cols-2 gap-2">
                            {[...Array(Math.min(section.config?.count || 4, 4))].map((_, i) => (
                              <div key={i} className="aspect-video bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-gray-400 text-xs">Photo {i + 1}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {section.type === 'schedule' && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                              <span className="text-sm font-medium text-gray-900">✓ Foundation Complete</span>
                              <span className="text-xs text-gray-600">Completed</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-blue-50 rounded">
                              <span className="text-sm font-medium text-gray-900">⏳ Framing In Progress</span>
                              <span className="text-xs text-gray-600">67% Done</span>
                            </div>
                            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm font-medium text-gray-900">○ Roofing Upcoming</span>
                              <span className="text-xs text-gray-600">Not Started</span>
                            </div>
                          </div>
                        )}

                        {section.type === 'budget' && selectedProjectData && (
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">Original Budget:</span>
                              <span className="font-semibold text-gray-900">{formatCurrency(selectedProjectData.budget)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">Spent to Date:</span>
                              <span className="font-semibold text-gray-900">
                                {formatCurrency(selectedProjectData.budget * (selectedProjectData.completion_percentage / 100))}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-700">Remaining:</span>
                              <span className="font-semibold text-green-600">
                                {formatCurrency(selectedProjectData.budget * (1 - selectedProjectData.completion_percentage / 100))}
                              </span>
                            </div>
                            <div className="mt-2 pt-2 border-t">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${selectedProjectData.completion_percentage}%` }}
                                />
                              </div>
                              <div className="text-xs text-gray-600 text-center mt-1">
                                {selectedProjectData.completion_percentage}% Budget Utilized
                              </div>
                            </div>
                          </div>
                        )}

                        {section.type === 'text' && (
                          <p className="text-sm text-gray-700 leading-relaxed">
                            Custom text content will appear here. You can edit this in the final report.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {reportSections.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <div className="text-4xl mb-2">📄</div>
                      <div className="text-sm">Preview will appear here</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Template Selection Modal */}
        {showTemplateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Choose a Template
                </h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateSelect(template)}
                      className="border-2 border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-gray-900">{template.name}</h3>
                        {template.isSystemTemplate && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                            SYSTEM
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500 font-semibold">Includes:</div>
                        {template.sections.slice(0, 4).map((section, i) => (
                          <div key={i} className="text-xs text-gray-700 flex items-center gap-2">
                            <span>{getSectionIcon(section.type)}</span>
                            <span>{section.title}</span>
                          </div>
                        ))}
                        {template.sections.length > 4 && (
                          <div className="text-xs text-gray-500">+ {template.sections.length - 4} more sections</div>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-all flex flex-col items-center justify-center text-center">
                    <div className="text-4xl mb-3">➕</div>
                    <h3 className="font-bold text-gray-900 mb-2">Start From Scratch</h3>
                    <p className="text-sm text-gray-600">Build a custom report with your own sections</p>
                  </div>
                </div>

                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Export Report
                </h2>

                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Choose Export Format:</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => handleExport('pdf')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="text-3xl mb-2">📕</div>
                      <div className="font-bold text-gray-900 mb-1">PDF Document</div>
                      <div className="text-sm text-gray-600">Print-ready, professional format</div>
                    </button>

                    <button
                      onClick={() => handleExport('pptx')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="text-3xl mb-2">📊</div>
                      <div className="font-bold text-gray-900 mb-1">PowerPoint</div>
                      <div className="text-sm text-gray-600">For client presentations</div>
                    </button>

                    <button
                      onClick={() => handleExport('docx')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="text-3xl mb-2">📝</div>
                      <div className="font-bold text-gray-900 mb-1">Word Document</div>
                      <div className="text-sm text-gray-600">Editable document format</div>
                    </button>

                    <button
                      onClick={() => handleExport('images')}
                      className="p-6 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <div className="text-3xl mb-2">🖼️</div>
                      <div className="font-bold text-gray-900 mb-1">Images (JPG)</div>
                      <div className="text-sm text-gray-600">For email or social media</div>
                    </button>
                  </div>
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">💡</div>
                    <div className="text-sm text-gray-700">
                      <strong>Pro Tip:</strong> PDF is best for most clients. PowerPoint works great for in-person meetings.
                      All formats include your company branding (Enterprise tier).
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
