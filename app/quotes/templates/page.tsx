'use client'

// ============================================================
// BEAUTIFUL TEMPLATE GALLERY
// Browse and use pre-built quote templates
// ============================================================

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function QuoteTemplatesPage() {
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Sample templates (in production, these would come from the database)
  const templates = [
    {
      id: 1,
      name: 'Residential Construction',
      description: 'Complete template for residential home construction projects',
      category: 'residential',
      icon: '🏠',
      itemCount: 25,
      timesUsed: 142,
      avgValue: 85000,
    },
    {
      id: 2,
      name: 'Kitchen Renovation',
      description: 'Detailed quote for kitchen remodeling and renovation',
      category: 'renovation',
      icon: '🔨',
      itemCount: 18,
      timesUsed: 98,
      avgValue: 35000,
    },
    {
      id: 3,
      name: 'Commercial Build-out',
      description: 'Office space and commercial interior build-out',
      category: 'commercial',
      icon: '🏢',
      itemCount: 32,
      timesUsed: 67,
      avgValue: 125000,
    },
    {
      id: 4,
      name: 'Bathroom Remodel',
      description: 'Complete bathroom renovation and fixture replacement',
      category: 'renovation',
      icon: '🚿',
      itemCount: 15,
      timesUsed: 156,
      avgValue: 18000,
    },
    {
      id: 5,
      name: 'Landscaping Project',
      description: 'Outdoor landscaping, hardscaping, and irrigation',
      category: 'landscaping',
      icon: '🌳',
      itemCount: 20,
      timesUsed: 89,
      avgValue: 22000,
    },
    {
      id: 6,
      name: 'Electrical Service',
      description: 'Electrical panel upgrade and wiring services',
      category: 'specialty',
      icon: '⚡',
      itemCount: 12,
      timesUsed: 234,
      avgValue: 8500,
    },
    {
      id: 7,
      name: 'Roofing Replacement',
      description: 'Complete roof tear-off and replacement',
      category: 'specialty',
      icon: '🏗️',
      itemCount: 10,
      timesUsed: 178,
      avgValue: 15000,
    },
    {
      id: 8,
      name: 'HVAC Installation',
      description: 'Heating and cooling system installation',
      category: 'specialty',
      icon: '❄️',
      itemCount: 14,
      timesUsed: 145,
      avgValue: 12000,
    },
  ]

  const categories = [
    { value: 'all', label: 'All Templates', icon: '📋' },
    { value: 'residential', label: 'Residential', icon: '🏠' },
    { value: 'commercial', label: 'Commercial', icon: '🏢' },
    { value: 'renovation', label: 'Renovation', icon: '🔨' },
    { value: 'landscaping', label: 'Landscaping', icon: '🌳' },
    { value: 'specialty', label: 'Specialty', icon: '⚡' },
  ]

  const filteredTemplates = templates.filter((template) => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesCategory && matchesSearch
  })

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  function handleUseTemplate(templateId: number) {
    // In production, this would create a new quote from the template
    // For now, redirect to new quote page
    router.push('/quotes/new')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/quotes" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Back to Quotes
          </Link>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">Quote Templates</h1>
          <p className="text-gray-600">Start with a pre-built template to save time and ensure consistency</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">Total Templates</span>
              <span className="text-2xl">📋</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{templates.length}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">Most Popular</span>
              <span className="text-2xl">🌟</span>
            </div>
            <p className="text-lg font-bold text-gray-900">Electrical Service</p>
            <p className="text-sm text-gray-500">234 uses</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600">Avg Quote Value</span>
              <span className="text-2xl">💰</span>
            </div>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(templates.reduce((sum, t) => sum + t.avgValue, 0) / templates.length)}
            </p>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setSelectedCategory(category.value)}
                  className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                    selectedCategory === category.value
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category.icon} {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-lg text-gray-600 mb-2">No templates found</p>
            <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group"
              >
                <div className="p-6">
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-4xl mb-4 group-hover:scale-110 transition-transform">
                    {template.icon}
                  </div>

                  {/* Name & Description */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{template.description}</p>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-gray-200">
                    <div>
                      <div className="text-xs text-gray-500">Items</div>
                      <div className="font-bold text-gray-900">{template.itemCount}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Uses</div>
                      <div className="font-bold text-gray-900">{template.timesUsed}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Avg Value</div>
                      <div className="font-bold text-green-600">{formatCurrency(template.avgValue)}</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUseTemplate(template.id)}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors shadow hover:shadow-lg"
                    >
                      Use Template
                    </button>
                    <button className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-semibold transition-colors">
                      👁️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Custom Template CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Create Your Own Template</h2>
          <p className="text-lg mb-6 opacity-90">
            Save your frequently used quotes as templates for even faster quote creation
          </p>
          <button
            onClick={() => router.push('/quotes/new')}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-bold text-lg shadow-xl transition-all hover:scale-105"
          >
            🎨 Create Custom Template
          </button>
        </div>
      </div>
    </div>
  )
}
