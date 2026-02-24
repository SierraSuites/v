"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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

  // Quality Guide lines 39-47: Skeleton loaders instead of spinner
  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="max-w-7xl mx-auto p-6 space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 bg-gray-200 rounded w-40 mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
            </div>
            <div className="flex gap-3">
              <div className="h-10 bg-gray-200 rounded-lg w-36 animate-pulse" />
              <div className="h-10 bg-gray-200 rounded-lg w-28 animate-pulse" />
            </div>
          </div>
          {/* Stats skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-24" />
                  <div className="w-8 h-8 bg-gray-200 rounded" />
                </div>
                <div className="h-8 bg-gray-200 rounded w-20" />
              </div>
            ))}
          </div>
          {/* Filter skeleton */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2 h-10 bg-gray-200 rounded-lg" />
              <div className="h-10 bg-gray-200 rounded-lg" />
              <div className="h-10 bg-gray-200 rounded-lg" />
            </div>
          </div>
          {/* Quote cards skeleton */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-6 bg-gray-200 rounded w-48" />
                      <div className="h-5 bg-gray-200 rounded-full w-20" />
                    </div>
                    <div className="h-4 bg-gray-200 rounded w-72" />
                  </div>
                  <div className="text-right">
                    <div className="h-8 bg-gray-200 rounded w-24 mb-2" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-12" />
                      <div className="h-6 bg-gray-200 rounded w-16" />
                      <div className="h-6 bg-gray-200 rounded w-10" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#1A1A1A' }}>
              💼 QuoteHub
            </h1>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              Manage your construction quotes and proposals
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/quotes/templates')}
              className="px-4 py-2 rounded-lg border font-semibold transition-colors hover:bg-white"
              style={{ borderColor: '#E5E7EB', color: '#374151' }}
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

        {/* Spec lines 82-88: Pipeline Overview with count + value per status */}
        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Draft', count: stats.draft_count, value: stats.draft_value, icon: '📝', color: '#6B7280', bg: '#F3F4F6' },
                { label: 'Sent', count: stats.sent_count, value: stats.sent_value, icon: '📤', color: '#3B82F6', bg: '#EFF6FF' },
                { label: 'Viewed', count: stats.viewed_count, value: stats.viewed_value, icon: '👀', color: '#8B5CF6', bg: '#F5F3FF' },
                { label: 'Accepted', count: stats.accepted_count, value: stats.accepted_value, icon: '✅', color: '#10B981', bg: '#ECFDF5' },
                { label: 'Rejected', count: stats.rejected_count, value: stats.rejected_value, icon: '❌', color: '#EF4444', bg: '#FEF2F2' },
                { label: 'Conversion', count: null, value: null, icon: '📊', color: '#3B82F6', bg: '#EFF6FF', isRate: true },
              ].map((item) => (
                <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
                      {item.label}
                    </span>
                  </div>
                  {(item as any).isRate ? (
                    <p className="text-2xl font-bold" style={{ color: item.color }}>
                      {stats.conversion_rate || 0}%
                    </p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold" style={{ color: item.color }}>
                        {item.count || 0}
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
                        {formatCurrency(item.value || 0)}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Total value summary bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Total Quotes</span>
                  <p className="text-xl font-bold" style={{ color: '#1A1A1A' }}>{stats.total_quotes || 0}</p>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Pipeline Value</span>
                  <p className="text-xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(stats.total_value || 0)}</p>
                </div>
                <div className="h-8 w-px bg-gray-200" />
                <div>
                  <span className="text-xs font-semibold uppercase text-gray-500">Accepted Value</span>
                  <p className="text-xl font-bold" style={{ color: '#10B981' }}>{formatCurrency(stats.accepted_value || 0)}</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
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
              <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
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
              <label className="block text-sm font-semibold mb-2" style={{ color: '#374151' }}>
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
                  style={{ borderColor: '#E5E7EB', color: '#374151' }}
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
            <p className="text-lg font-semibold mb-2" style={{ color: '#374151' }}>
              {searchQuery || selectedStatus !== 'all' ? 'No quotes match your filters' : 'No quotes yet'}
            </p>
            <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
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
                        <h3 className="text-xl font-bold" style={{ color: '#1A1A1A' }}>
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

                      <div className="flex items-center gap-4 text-sm" style={{ color: '#6B7280' }}>
                        <span>#{quote.quote_number}</span>
                        <span>•</span>
                        <span>
                          {(quote.client as any)?.company_name || (quote.client as any)?.first_name
                            ? `${(quote.client as any)?.company_name || ''} ${(quote.client as any)?.first_name || ''} ${(quote.client as any)?.last_name || ''}`
                            : 'No client'}
                        </span>
                        <span>•</span>
                        <span>{new Date(quote.created_at).toLocaleDateString()}</span>
                        {/* Spec line 99-100: Expiration urgency indicator */}
                        {quote.valid_until && (() => {
                          const daysLeft = Math.ceil((new Date(quote.valid_until).getTime() - new Date().getTime()) / 86400000)
                          const urgencyColor = daysLeft < 0 ? '#DC2626' : daysLeft <= 7 ? '#F59E0B' : '#6B7280'
                          return (
                            <>
                              <span>•</span>
                              <span style={{ color: urgencyColor, fontWeight: daysLeft <= 7 ? 600 : 400 }}>
                                {daysLeft < 0
                                  ? `Expired ${Math.abs(daysLeft)}d ago`
                                  : daysLeft === 0
                                  ? 'Expires today'
                                  : `Expires in ${daysLeft}d`
                                }
                              </span>
                            </>
                          )
                        })()}
                      </div>

                      {quote.description && (
                        <p className="text-sm mt-2 line-clamp-1" style={{ color: '#6B7280' }}>
                          {quote.description}
                        </p>
                      )}
                    </div>

                    {/* Right side - Amount and actions */}
                    <div className="text-right ml-6">
                      <p className="text-2xl font-bold mb-1" style={{ color: '#FF6B6B' }}>
                        {formatCurrency(quote.total_amount)}
                      </p>
                      {/* Quality Guide lines 1086-1104: Margin color indicator */}
                      {quote.status === 'accepted' && (quote as any).margin_percent != null && (() => {
                        const margin = (quote as any).margin_percent
                        const color = margin >= 25 ? '#10B981' : margin >= 15 ? '#F59E0B' : '#EF4444'
                        return (
                          <p className="text-xs font-semibold mb-2" style={{ color }}>
                            Margin: {margin.toFixed(1)}%
                          </p>
                        )
                      })()}
                      {/* Spec lines 101-103: Context-aware action buttons per status */}
                      <div className="flex gap-2 flex-wrap justify-end">
                        {/* Draft: Edit, Duplicate, Delete */}
                        {quote.status === 'draft' && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); router.push(`/quotes/${quote.id}/edit`) }} className="px-3 py-1 rounded text-xs font-semibold hover:bg-gray-100" style={{ color: '#6B7280' }}>Edit</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDuplicateQuote(quote.id) }} className="px-3 py-1 rounded text-xs font-semibold hover:bg-gray-100" style={{ color: '#6B7280' }}>Duplicate</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteQuote(quote.id) }} className="px-3 py-1 rounded text-xs font-semibold hover:bg-red-50" style={{ color: '#EF4444' }}>Delete</button>
                          </>
                        )}
                        {/* Sent/Viewed: Follow Up, Duplicate, PDF */}
                        {(quote.status === 'sent' || quote.status === 'viewed') && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); router.push(`/quotes/${quote.id}/edit`) }} className="px-3 py-1 rounded text-xs font-semibold hover:bg-blue-50" style={{ color: '#3B82F6' }}>Follow Up</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDuplicateQuote(quote.id) }} className="px-3 py-1 rounded text-xs font-semibold hover:bg-gray-100" style={{ color: '#6B7280' }}>Duplicate</button>
                            <button onClick={(e) => { e.stopPropagation(); router.push(`/quotes/${quote.id}/pdf`) }} className="px-3 py-1 rounded text-xs font-semibold hover:bg-blue-50" style={{ color: '#3B82F6' }}>PDF</button>
                          </>
                        )}
                        {/* Spec lines 113-114: Accepted: Convert to Project, View PDF */}
                        {quote.status === 'accepted' && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); router.push(`/projects?from_quote=${quote.id}`) }} className="px-3 py-1 rounded text-xs font-semibold hover:bg-green-50" style={{ color: '#10B981' }}>Convert to Project</button>
                            <button onClick={(e) => { e.stopPropagation(); router.push(`/quotes/${quote.id}/pdf`) }} className="px-3 py-1 rounded text-xs font-semibold hover:bg-blue-50" style={{ color: '#3B82F6' }}>PDF</button>
                          </>
                        )}
                        {/* Rejected/Expired: Duplicate to create new version */}
                        {(quote.status === 'rejected' || quote.status === 'expired') && (
                          <button onClick={(e) => { e.stopPropagation(); handleDuplicateQuote(quote.id) }} className="px-3 py-1 rounded text-xs font-semibold hover:bg-gray-100" style={{ color: '#6B7280' }}>Create New Version</button>
                        )}
                        {/* Converted: Go to Project */}
                        {quote.status === 'converted' && (
                          <button onClick={(e) => { e.stopPropagation(); router.push(`/projects`) }} className="px-3 py-1 rounded text-xs font-semibold hover:bg-green-50" style={{ color: '#10B981' }}>View Project</button>
                        )}
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
