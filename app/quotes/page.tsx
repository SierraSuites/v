"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import {
  quoteService,
  type Quote,
  getStatusColor,
  getStatusIcon,
  formatCurrency,
  isQuoteExpired
} from '@/lib/quotes'

export default function QuotesPage() {
  const router = useRouter()
  const { colors, darkMode } = useThemeColors()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'created_at' | 'quote_number' | 'total_amount'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    loadQuotes()
    loadStats()
  }, [])

  const loadQuotes = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) {
        alert('No company found for your account')
        return
      }

      // Load quotes
      const allQuotes = await quoteService.getByCompany(profile.company_id)
      setQuotes(allQuotes)
    } catch (err) {
      console.error('Error loading quotes:', err)
      alert('Failed to load quotes')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) return

      const statistics = await quoteService.getStatistics(profile.company_id)
      setStats(statistics)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const handleDeleteQuote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote? This action cannot be undone.')) {
      return
    }

    try {
      await quoteService.delete(id)
      await loadQuotes()
      await loadStats()
    } catch (err) {
      console.error('Error deleting quote:', err)
      alert('Failed to delete quote')
    }
  }

  const handleDuplicateQuote = async (id: string) => {
    try {
      const newQuote = await quoteService.duplicate(id)
      if (newQuote) {
        await loadQuotes()
        router.push(`/quotes/${newQuote.id}/edit`)
      }
    } catch (err) {
      console.error('Error duplicating quote:', err)
      alert('Failed to duplicate quote')
    }
  }

  // Filter and sort quotes
  const filteredQuotes = quotes
    .filter(quote => {
      const matchesStatus = selectedStatus === 'all' || quote.status === selectedStatus
      const matchesSearch = !searchQuery ||
        quote.quote_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        quote.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (quote.client as any)?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())

      return matchesStatus && matchesSearch
    })
    .sort((a, b) => {
      let comparison = 0

      if (sortBy === 'created_at') {
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      } else if (sortBy === 'quote_number') {
        comparison = a.quote_number.localeCompare(b.quote_number)
      } else if (sortBy === 'total_amount') {
        comparison = a.total_amount - b.total_amount
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 mx-auto" style={{ borderColor: '#FF6B6B' }} />
          <p className="mt-4 text-lg" style={{ color: colors.textMuted }}>Loading quotes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: colors.bgAlt }}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: colors.text }}>
              💼 QuoteHub
            </h1>
            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
              Manage your construction quotes and proposals
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/quotes/templates')}
              className="px-4 py-2 rounded-lg border font-semibold transition-colors hover:bg-white"
              style={{ borderColor: '#E5E7EB', color: colors.textMuted }}
            >
              📚 Browse Templates
            </button>
            <button
              onClick={() => router.push('/quotes/new')}
              className="px-6 py-2 rounded-lg font-semibold transition-transform hover:scale-105"
              style={{ backgroundColor: '#FF6B6B', color: '#FFFFFF' }}
            >
              + New Quote
            </button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: colors.textMuted }}>
                  Total Quotes
                </span>
                <span className="text-2xl">📝</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: colors.text }}>
                {stats.total_quotes || 0}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: colors.textMuted }}>
                  Total Value
                </span>
                <span className="text-2xl">💰</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>
                {formatCurrency(stats.total_value || 0)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: colors.textMuted }}>
                  Accepted
                </span>
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: '#10B981' }}>
                {stats.accepted_count || 0}
              </p>
              <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {formatCurrency(stats.accepted_value || 0)}
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: colors.textMuted }}>
                  Conversion Rate
                </span>
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-3xl font-bold" style={{ color: '#3B82F6' }}>
                {stats.conversion_rate || 0}%
              </p>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.textMuted }}>
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by number, title, or client..."
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E5E7EB' }}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.textMuted }}>
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                style={{ borderColor: '#E5E7EB' }}
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="viewed">Viewed</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="expired">Expired</option>
                <option value="converted">Converted</option>
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.textMuted }}>
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
                  style={{ borderColor: '#E5E7EB' }}
                >
                  <option value="created_at">Date</option>
                  <option value="quote_number">Number</option>
                  <option value="total_amount">Amount</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 rounded-lg border font-semibold"
                  style={{ borderColor: '#E5E7EB', color: colors.textMuted }}
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quotes List */}
        {filteredQuotes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-lg font-semibold mb-2" style={{ color: colors.textMuted }}>
              {searchQuery || selectedStatus !== 'all' ? 'No quotes match your filters' : 'No quotes yet'}
            </p>
            <p className="text-sm mb-6" style={{ color: colors.textMuted }}>
              {searchQuery || selectedStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first quote to get started'}
            </p>
            {!searchQuery && selectedStatus === 'all' && (
              <button
                onClick={() => router.push('/quotes/new')}
                className="px-6 py-3 rounded-lg font-semibold transition-transform hover:scale-105"
                style={{ backgroundColor: '#FF6B6B', color: '#FFFFFF' }}
              >
                + Create First Quote
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuotes.map(quote => {
              const expired = isQuoteExpired(quote)

              return (
                <div
                  key={quote.id}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => router.push(`/quotes/${quote.id}`)}
                >
                  <div className="flex items-start justify-between">
                    {/* Left side - Quote info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold" style={{ color: colors.text }}>
                          {quote.title}
                        </h3>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-bold uppercase"
                          style={{
                            backgroundColor: `${getStatusColor(quote.status)}20`,
                            color: getStatusColor(quote.status)
                          }}
                        >
                          {getStatusIcon(quote.status)} {quote.status}
                        </span>
                        {expired && (
                          <span
                            className="px-3 py-1 rounded-full text-xs font-bold"
                            style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}
                          >
                            ⚠️ EXPIRED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm" style={{ color: colors.textMuted }}>
                        <span>#{quote.quote_number}</span>
                        <span>•</span>
                        <span>
                          {(quote.client as any)?.company_name || (quote.client as any)?.first_name
                            ? `${(quote.client as any)?.company_name || ''} ${(quote.client as any)?.first_name || ''} ${(quote.client as any)?.last_name || ''}`
                            : 'No client'}
                        </span>
                        <span>•</span>
                        <span>{new Date(quote.created_at).toLocaleDateString()}</span>
                        {quote.valid_until && (
                          <>
                            <span>•</span>
                            <span>Valid until {new Date(quote.valid_until).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>

                      {quote.description && (
                        <p className="text-sm mt-2 line-clamp-1" style={{ color: colors.textMuted }}>
                          {quote.description}
                        </p>
                      )}
                    </div>

                    {/* Right side - Amount and actions */}
                    <div className="text-right ml-6">
                      <p className="text-2xl font-bold mb-2" style={{ color: '#FF6B6B' }}>
                        {formatCurrency(quote.total_amount)}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/quotes/${quote.id}/edit`)
                          }}
                          className="px-3 py-1 rounded text-xs font-semibold transition-colors hover:bg-gray-100"
                          style={{ color: colors.textMuted }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicateQuote(quote.id)
                          }}
                          className="px-3 py-1 rounded text-xs font-semibold transition-colors hover:bg-gray-100"
                          style={{ color: colors.textMuted }}
                        >
                          Duplicate
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/quotes/${quote.id}/pdf`)
                          }}
                          className="px-3 py-1 rounded text-xs font-semibold transition-colors hover:bg-blue-50"
                          style={{ color: '#3B82F6' }}
                        >
                          PDF
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteQuote(quote.id)
                          }}
                          className="px-3 py-1 rounded text-xs font-semibold transition-colors hover:bg-red-50"
                          style={{ color: '#EF4444' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
