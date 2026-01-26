// ============================================================
// QUOTEHUB DATABASE OPERATIONS
// Supabase client functions for quotes management
// ============================================================

import { createClient } from '@/lib/supabase/client'
import type {
  Quote,
  QuoteItem,
  QuoteWithRelations,
  QuoteListItem,
  QuoteInsert,
  QuoteUpdate,
  QuoteItemInsert,
  QuoteItemUpdate,
  QuoteFilters,
  QuoteSortOptions,
  QuotePaginationOptions,
  QuoteStats,
  Contact,
  ContactInsert,
  ContactUpdate,
  QuoteTemplate,
  QuoteActivity,
  QuoteComment,
  QuoteAnalytics,
} from '@/types/quotes'

// Lazy initialization to avoid calling createClient at build time
let supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabase) {
    supabase = createClient()
  }
  return supabase
}

// ============================================================
// QUOTES CRUD OPERATIONS
// ============================================================

/**
 * Get all quotes for the authenticated user with optional filtering
 */
export async function getQuotes(
  filters?: QuoteFilters,
  sort?: QuoteSortOptions,
  pagination?: QuotePaginationOptions
) {
  try {
    console.log('[getQuotes] Starting with filters:', filters)

    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    let query = supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        title,
        description,
        status,
        total_amount,
        currency,
        quote_date,
        valid_until,
        client_id,
        project_id,
        created_at,
        updated_at,
        client:contacts(id, contact_name, company_name),
        project:projects(id, name)
      `)
      .eq('user_id', user.id)

    // Apply filters
    if (filters) {
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,quote_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }
      if (filters.status && filters.status.length > 0) {
        query = query.in('status', filters.status)
      }
      if (filters.client_id) {
        query = query.eq('client_id', filters.client_id)
      }
      if (filters.project_id) {
        query = query.eq('project_id', filters.project_id)
      }
      if (filters.min_amount !== undefined) {
        query = query.gte('total_amount', filters.min_amount)
      }
      if (filters.max_amount !== undefined) {
        query = query.lte('total_amount', filters.max_amount)
      }
      if (filters.date_from) {
        query = query.gte('quote_date', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('quote_date', filters.date_to)
      }
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.field, { ascending: sort.direction === 'asc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Apply pagination
    if (pagination) {
      const from = (pagination.page - 1) * pagination.per_page
      const to = from + pagination.per_page - 1
      query = query.range(from, to)
    }

    const { data, error } = await query

    if (error) {
      console.error('[getQuotes] Error:', error)
      return { data: null, error }
    }

    // Transform the data to match QuoteListItem type
    const quotes: QuoteListItem[] = (data || []).map((quote: any) => ({
      id: quote.id,
      quote_number: quote.quote_number,
      title: quote.title,
      status: quote.status,
      total_amount: quote.total_amount,
      currency: quote.currency,
      quote_date: quote.quote_date,
      valid_until: quote.valid_until,
      client_name: quote.client?.contact_name || null,
      client_company: quote.client?.company_name || null,
      project_name: quote.project?.name || null,
      created_at: quote.created_at,
      updated_at: quote.updated_at,
    }))

    console.log('[getQuotes] Success:', quotes.length, 'quotes')
    return { data: quotes, error: null }
  } catch (error) {
    console.error('[getQuotes] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

/**
 * Get a single quote by ID with all related data
 */
export async function getQuoteById(id: string) {
  try {
    console.log('[getQuoteById] Fetching quote:', id)

    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    const { data, error } = await getSupabase()
      .from('quotes')
      .select(`
        *,
        client:contacts(*),
        project:projects(id, name, address),
        items:quote_items(*),
        activities:quote_activities(*),
        comments:quote_comments(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('[getQuoteById] Error:', error)
      return { data: null, error }
    }

    console.log('[getQuoteById] Success')
    return { data: data as QuoteWithRelations, error: null }
  } catch (error) {
    console.error('[getQuoteById] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

/**
 * Create a new quote
 */
export async function createQuote(quote: Partial<QuoteInsert>) {
  try {
    console.log('[createQuote] Creating quote:', quote)

    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    const quoteToInsert: QuoteInsert = {
      user_id: user.id,
      created_by: user.id,
      title: quote.title || 'Untitled Quote',
      description: quote.description || null,
      client_id: quote.client_id || null,
      project_id: quote.project_id || null,
      status: quote.status || 'draft',

      // Financial fields with defaults
      subtotal: quote.subtotal || 0,
      tax_rate: quote.tax_rate || 0,
      tax_amount: quote.tax_amount || 0,
      discount_type: quote.discount_type || 'fixed',
      discount_value: quote.discount_value || 0,
      discount_amount: quote.discount_amount || 0,
      total_amount: quote.total_amount || 0,
      deposit_required: quote.deposit_required || 0,
      deposit_amount: quote.deposit_amount || 0,
      currency: quote.currency || 'USD',

      // Dates
      quote_date: quote.quote_date || new Date().toISOString().split('T')[0],
      valid_until: quote.valid_until || null,
      sent_at: quote.sent_at || null,
      viewed_at: quote.viewed_at || null,
      approved_at: quote.approved_at || null,
      rejected_at: quote.rejected_at || null,

      // Additional details
      approved_by: quote.approved_by || null,
      rejection_reason: quote.rejection_reason || null,
      notes: quote.notes || null,
      internal_notes: quote.internal_notes || null,
      terms_conditions: quote.terms_conditions || null,
      payment_terms: quote.payment_terms || null,

      // Branding
      branding: quote.branding || { logo: null, primaryColor: '#2563EB', accentColor: '#F97316' },

      // Tracking
      email_sent_count: 0,
      last_email_sent_at: null,
      view_count: 0,
    }

    const { data, error } = await getSupabase()
      .from('quotes')
      .insert(quoteToInsert)
      .select()
      .single()

    if (error) {
      console.error('[createQuote] Error:', error)
      return { data: null, error }
    }

    console.log('[createQuote] Success:', data.id)
    return { data: data as Quote, error: null }
  } catch (error) {
    console.error('[createQuote] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

/**
 * Update an existing quote
 */
export async function updateQuote(id: string, updates: QuoteUpdate) {
  try {
    console.log('[updateQuote] Updating quote:', id, updates)

    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    const { data, error } = await getSupabase()
      .from('quotes')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('[updateQuote] Error:', error)
      return { data: null, error }
    }

    console.log('[updateQuote] Success')
    return { data: data as Quote, error: null }
  } catch (error) {
    console.error('[updateQuote] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

/**
 * Delete a quote
 */
export async function deleteQuote(id: string) {
  try {
    console.log('[deleteQuote] Deleting quote:', id)

    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('[deleteQuote] Error:', error)
      return { data: null, error }
    }

    console.log('[deleteQuote] Success')
    return { data: true, error: null }
  } catch (error) {
    console.error('[deleteQuote] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

/**
 * Duplicate a quote
 */
export async function duplicateQuote(id: string) {
  try {
    console.log('[duplicateQuote] Duplicating quote:', id)

    const supabase = getSupabase()

    // Get the original quote with items
    const { data: original, error: fetchError } = await getQuoteById(id)
    if (fetchError || !original) {
      return { data: null, error: fetchError || { message: 'Quote not found' } }
    }

    // Create new quote
    const { data: newQuote, error: createError } = await createQuote({
      ...original,
      title: `${original.title} (Copy)`,
      status: 'draft',
      sent_at: null,
      viewed_at: null,
      approved_at: null,
      rejected_at: null,
    })

    if (createError || !newQuote) {
      return { data: null, error: createError || { message: 'Failed to create duplicate' } }
    }

    // Copy line items
    if (original.items && original.items.length > 0) {
      const itemsToInsert = original.items.map((item: QuoteItem) => ({
        quote_id: newQuote.id,
        item_number: item.item_number,
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        tax_rate: item.tax_rate,
        notes: item.notes,
        sort_order: item.sort_order,
        is_optional: item.is_optional,
      }))

      await supabase.from('quote_items').insert(itemsToInsert)
    }

    console.log('[duplicateQuote] Success')
    return { data: newQuote, error: null }
  } catch (error) {
    console.error('[duplicateQuote] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

// ============================================================
// QUOTE ITEMS OPERATIONS
// ============================================================

/**
 * Get all items for a quote
 */
export async function getQuoteItems(quoteId: string) {
  try {
    console.log('[getQuoteItems] Fetching items for quote:', quoteId)

    const { data, error } = await getSupabase()
      .from('quote_items')
      .select('*')
      .eq('quote_id', quoteId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('[getQuoteItems] Error:', error)
      return { data: null, error }
    }

    console.log('[getQuoteItems] Success:', data.length, 'items')
    return { data: data as QuoteItem[], error: null }
  } catch (error) {
    console.error('[getQuoteItems] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

/**
 * Add a line item to a quote
 */
export async function addQuoteItem(item: QuoteItemInsert) {
  try {
    console.log('[addQuoteItem] Adding item to quote:', item.quote_id)

    const { data, error } = await getSupabase()
      .from('quote_items')
      .insert(item)
      .select()
      .single()

    if (error) {
      console.error('[addQuoteItem] Error:', error)
      return { data: null, error }
    }

    console.log('[addQuoteItem] Success')
    return { data: data as QuoteItem, error: null }
  } catch (error) {
    console.error('[addQuoteItem] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

/**
 * Update a quote line item
 */
export async function updateQuoteItem(id: string, updates: QuoteItemUpdate) {
  try {
    console.log('[updateQuoteItem] Updating item:', id)

    const { data, error } = await getSupabase()
      .from('quote_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[updateQuoteItem] Error:', error)
      return { data: null, error }
    }

    console.log('[updateQuoteItem] Success')
    return { data: data as QuoteItem, error: null }
  } catch (error) {
    console.error('[updateQuoteItem] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

/**
 * Delete a quote line item
 */
export async function deleteQuoteItem(id: string) {
  try {
    console.log('[deleteQuoteItem] Deleting item:', id)

    const supabase = getSupabase()
    const { error } = await supabase
      .from('quote_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[deleteQuoteItem] Error:', error)
      return { data: null, error }
    }

    console.log('[deleteQuoteItem] Success')
    return { data: true, error: null }
  } catch (error) {
    console.error('[deleteQuoteItem] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

/**
 * Bulk update quote items (for reordering)
 */
export async function updateQuoteItemsOrder(items: { id: string; sort_order: number }[]) {
  try {
    console.log('[updateQuoteItemsOrder] Updating order for', items.length, 'items')

    const supabase = getSupabase()
    const updates = items.map(item =>
      supabase
        .from('quote_items')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
    )

    await Promise.all(updates)

    console.log('[updateQuoteItemsOrder] Success')
    return { data: true, error: null }
  } catch (error) {
    console.error('[updateQuoteItemsOrder] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

// ============================================================
// CONTACTS OPERATIONS
// ============================================================

/**
 * Get all contacts for the authenticated user
 */
export async function getContacts(contactType?: string) {
  try {
    console.log('[getContacts] Fetching contacts')

    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    let query = supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .order('contact_name', { ascending: true })

    if (contactType) {
      query = query.eq('contact_type', contactType)
    }

    const { data, error } = await query

    if (error) {
      console.error('[getContacts] Error:', error)
      return { data: null, error }
    }

    console.log('[getContacts] Success:', data.length, 'contacts')
    return { data: data as Contact[], error: null }
  } catch (error) {
    console.error('[getContacts] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

/**
 * Create a new contact
 */
export async function createContact(contact: ContactInsert) {
  try {
    console.log('[createContact] Creating contact:', contact.contact_name)

    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    const { data, error } = await getSupabase()
      .from('contacts')
      .insert({ ...contact, user_id: user.id })
      .select()
      .single()

    if (error) {
      console.error('[createContact] Error:', error)
      return { data: null, error }
    }

    console.log('[createContact] Success')
    return { data: data as Contact, error: null }
  } catch (error) {
    console.error('[createContact] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

// ============================================================
// STATISTICS & ANALYTICS
// ============================================================

/**
 * Get quote statistics for the authenticated user
 */
export async function getQuoteStats(): Promise<{ data: QuoteStats | null; error: any }> {
  try {
    console.log('[getQuoteStats] Fetching statistics')

    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } }
    }

    const { data: quotes, error } = await supabase
      .from('quotes')
      .select('status, total_amount, created_at')
      .eq('user_id', user.id)

    if (error) {
      console.error('[getQuoteStats] Error:', error)
      return { data: null, error }
    }

    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const stats: QuoteStats = {
      total: quotes.length,
      by_status: {
        draft: quotes.filter(q => q.status === 'draft').length,
        sent: quotes.filter(q => q.status === 'sent').length,
        viewed: quotes.filter(q => q.status === 'viewed').length,
        approved: quotes.filter(q => q.status === 'approved').length,
        rejected: quotes.filter(q => q.status === 'rejected').length,
        expired: quotes.filter(q => q.status === 'expired').length,
      },
      total_value: quotes.reduce((sum, q) => sum + Number(q.total_amount || 0), 0),
      approved_value: quotes
        .filter(q => q.status === 'approved')
        .reduce((sum, q) => sum + Number(q.total_amount || 0), 0),
      conversion_rate: 0,
      average_value: quotes.length > 0
        ? quotes.reduce((sum, q) => sum + Number(q.total_amount || 0), 0) / quotes.length
        : 0,
      this_month_count: quotes.filter(q => new Date(q.created_at) >= thisMonth).length,
      this_month_value: quotes
        .filter(q => new Date(q.created_at) >= thisMonth)
        .reduce((sum, q) => sum + Number(q.total_amount || 0), 0),
      last_month_count: quotes.filter(q => {
        const date = new Date(q.created_at)
        return date >= lastMonth && date < thisMonth
      }).length,
      last_month_value: quotes
        .filter(q => {
          const date = new Date(q.created_at)
          return date >= lastMonth && date < thisMonth
        })
        .reduce((sum, q) => sum + Number(q.total_amount || 0), 0),
    }

    // Calculate conversion rate
    const sentQuotes = quotes.filter(q => ['sent', 'viewed', 'approved', 'rejected'].includes(q.status))
    const approvedQuotes = quotes.filter(q => q.status === 'approved')
    stats.conversion_rate = sentQuotes.length > 0
      ? (approvedQuotes.length / sentQuotes.length) * 100
      : 0

    console.log('[getQuoteStats] Success')
    return { data: stats, error: null }
  } catch (error) {
    console.error('[getQuoteStats] Exception:', error)
    return { data: null, error: { message: String(error) } }
  }
}

/**
 * Get quote count
 */
export async function getQuoteCount(filters?: QuoteFilters) {
  try {
    const supabase = getSupabase()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: 0, error: { message: 'User not authenticated' } }
    }

    let query = supabase
      .from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    const { count, error } = await query

    if (error) {
      console.error('[getQuoteCount] Error:', error)
      return { data: 0, error }
    }

    return { data: count || 0, error: null }
  } catch (error) {
    console.error('[getQuoteCount] Exception:', error)
    return { data: 0, error: { message: String(error) } }
  }
}
