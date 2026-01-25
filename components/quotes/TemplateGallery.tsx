"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface QuoteTemplate {
  id: string
  company_id: string | null
  name: string
  category: string
  description: string | null
  estimated_duration_days: number | null
  template_data: any
  is_active: boolean
  use_count: number
  created_at: string
  updated_at: string
}

interface TemplateGalleryProps {
  onSelectTemplate?: (templateId: string) => void
  projectId?: string
  clientId?: string
  showCreateButton?: boolean
}

export default function TemplateGallery({
  onSelectTemplate,
  projectId,
  clientId,
  showCreateButton = true
}: TemplateGalleryProps) {
  const router = useRouter()
  const [templates, setTemplates] = useState<QuoteTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [previewTemplate, setPreviewTemplate] = useState<QuoteTemplate | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      const { data, error } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('is_active', true)
        .order('use_count', { ascending: false })
        .order('name')

      if (error) throw error

      setTemplates(data || [])
    } catch (err) {
      console.error('Error loading templates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectTemplate = async (templateId: string) => {
    try {
      if (onSelectTemplate) {
        onSelectTemplate(templateId)
      } else {
        // Navigate to quote builder with template
        const params = new URLSearchParams()
        params.set('templateId', templateId)
        if (projectId) params.set('projectId', projectId)
        if (clientId) params.set('clientId', clientId)
        router.push(`/quotes/new?${params.toString()}`)
      }

      // Increment use count
      const supabase = createClient()
      await supabase.rpc('increment_template_use_count', { template_uuid: templateId })

      // Reload to update use count
      await loadTemplates()
    } catch (err) {
      console.error('Error selecting template:', err)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'residential': return '🏠'
      case 'commercial': return '🏢'
      case 'industrial': return '🏭'
      case 'renovation': return '🔨'
      default: return '📋'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'residential': return '#3B82F6'
      case 'commercial': return '#10B981'
      case 'industrial': return '#F59E0B'
      case 'renovation': return '#8B5CF6'
      default: return '#6B7280'
    }
  }

  const getEstimatedPrice = (template: QuoteTemplate): number => {
    if (!template.template_data?.sections) return 0

    let total = 0
    template.template_data.sections.forEach((section: any) => {
      section.line_items?.forEach((item: any) => {
        if (!item.is_optional) {
          total += (item.quantity || 0) * (item.unit_price || 0)
        }
      })
    })
    return total
  }

  const getLineItemCount = (template: QuoteTemplate): number => {
    if (!template.template_data?.sections) return 0

    let count = 0
    template.template_data.sections.forEach((section: any) => {
      count += section.line_items?.length || 0
    })
    return count
  }

  // Filter templates
  const categories = Array.from(new Set(templates.map(t => t.category))).sort()

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesSearch = !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesCategory && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: '#FF6B6B' }} />
          <p className="mt-4 text-sm" style={{ color: '#6B7280' }}>Loading templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
          📚 Quote Templates
        </h2>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Choose from professional pre-built templates to get started quickly
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Search Templates
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or description..."
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: '#E5E7EB' }}
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{ borderColor: '#E5E7EB' }}
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {getCategoryIcon(category)} {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: '#374151' }}>
            No templates found
          </p>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            {searchQuery
              ? 'Try adjusting your search or filters'
              : 'No templates available for this category'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => {
            const estimatedPrice = getEstimatedPrice(template)
            const lineItemCount = getLineItemCount(template)

            return (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => handleSelectTemplate(template.id)}
              >
                {/* Header */}
                <div
                  className="p-4"
                  style={{
                    background: `linear-gradient(135deg, ${getCategoryColor(template.category)}20, ${getCategoryColor(template.category)}10)`
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                        <span
                          className="text-xs font-bold uppercase px-2 py-1 rounded"
                          style={{
                            backgroundColor: `${getCategoryColor(template.category)}20`,
                            color: getCategoryColor(template.category)
                          }}
                        >
                          {template.category}
                        </span>
                      </div>
                      <h3 className="font-bold text-lg" style={{ color: '#1A1A1A' }}>
                        {template.name}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                  {/* Description */}
                  <p className="text-sm line-clamp-2" style={{ color: '#6B7280' }}>
                    {template.description || 'No description available'}
                  </p>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                        Estimated Price
                      </p>
                      <p className="text-lg font-bold" style={{ color: getCategoryColor(template.category) }}>
                        ${estimatedPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold mb-1" style={{ color: '#6B7280' }}>
                        Line Items
                      </p>
                      <p className="text-lg font-bold" style={{ color: '#1A1A1A' }}>
                        {lineItemCount}
                      </p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  <div className="flex items-center justify-between text-xs" style={{ color: '#6B7280' }}>
                    {template.estimated_duration_days && (
                      <div className="flex items-center gap-1">
                        <span>⏱️</span>
                        <span>{template.estimated_duration_days} days</span>
                      </div>
                    )}
                    {template.use_count > 0 && (
                      <div className="flex items-center gap-1">
                        <span>📊</span>
                        <span>Used {template.use_count}x</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setPreviewTemplate(template)
                      }}
                      className="flex-1 px-4 py-2 rounded-lg border font-semibold transition-colors hover:bg-gray-50"
                      style={{ borderColor: '#E5E7EB', color: '#374151' }}
                    >
                      Preview
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectTemplate(template.id)
                      }}
                      className="flex-1 px-4 py-2 rounded-lg font-semibold transition-transform hover:scale-105"
                      style={{ backgroundColor: getCategoryColor(template.category), color: '#FFFFFF' }}
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{getCategoryIcon(previewTemplate.category)}</span>
                    <h3 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>
                      {previewTemplate.name}
                    </h3>
                  </div>
                  <p className="text-sm" style={{ color: '#6B7280' }}>
                    {previewTemplate.description}
                  </p>
                </div>
                <button
                  onClick={() => setPreviewTemplate(null)}
                  className="text-3xl hover:opacity-70"
                  style={{ color: '#6B7280' }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Body - Line Items Preview */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <h4 className="text-lg font-bold mb-4" style={{ color: '#1A1A1A' }}>
                Included Line Items
              </h4>

              {previewTemplate.template_data?.sections?.map((section: any, index: number) => (
                <div key={index} className="mb-6">
                  {/* Section Header */}
                  <div className="bg-gray-50 px-4 py-2 rounded-lg mb-3">
                    <h5 className="font-bold" style={{ color: '#374151' }}>
                      {section.name}
                    </h5>
                    {section.description && (
                      <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                        {section.description}
                      </p>
                    )}
                  </div>

                  {/* Section Line Items */}
                  <div className="space-y-2 ml-4">
                    {section.line_items?.map((item: any, itemIndex: number) => (
                      <div
                        key={itemIndex}
                        className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm" style={{ color: '#1A1A1A' }}>
                              {item.description}
                            </span>
                            {item.is_optional && (
                              <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                                Optional
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-semibold" style={{ color: '#374151' }}>
                            {item.quantity} {item.unit} × ${item.unit_price.toFixed(2)}
                          </p>
                          <p className="text-xs" style={{ color: '#6B7280' }}>
                            ${(item.quantity * item.unit_price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50" style={{ borderColor: '#E0E0E0' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#6B7280' }}>
                    Estimated Total
                  </p>
                  <p className="text-3xl font-bold" style={{ color: getCategoryColor(previewTemplate.category) }}>
                    ${getEstimatedPrice(previewTemplate).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPreviewTemplate(null)}
                    className="px-6 py-3 rounded-lg border font-semibold transition-colors hover:bg-white"
                    style={{ borderColor: '#E5E7EB', color: '#374151' }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      handleSelectTemplate(previewTemplate.id)
                      setPreviewTemplate(null)
                    }}
                    className="px-6 py-3 rounded-lg font-semibold transition-transform hover:scale-105"
                    style={{ backgroundColor: '#FF6B6B', color: '#FFFFFF' }}
                  >
                    Use This Template
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State / Custom Template Button */}
      {showCreateButton && (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center border-2 border-dashed" style={{ borderColor: '#E5E7EB' }}>
          <p className="text-lg font-semibold mb-2" style={{ color: '#374151' }}>
            Don't see what you need?
          </p>
          <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
            Start from scratch and create a custom quote
          </p>
          <button
            onClick={() => router.push('/quotes/new')}
            className="px-6 py-3 rounded-lg font-semibold transition-transform hover:scale-105"
            style={{ backgroundColor: '#6B7280', color: '#FFFFFF' }}
          >
            ➕ Create Custom Quote
          </button>
        </div>
      )}
    </div>
  )
}
