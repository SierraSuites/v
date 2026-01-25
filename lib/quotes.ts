import { createClient } from '@/lib/supabase/client'

// ============================================
// TYPES
// ============================================

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'converted'
export type QuoteType = 'estimate' | 'proposal' | 'bid' | 'change_order'
export type LineItemType = 'labor' | 'material' | 'equipment' | 'subcontractor' | 'overhead' | 'profit' | 'permit' | 'other'
export type TemplateCategory = 'residential' | 'commercial' | 'industrial' | 'renovation' | 'landscaping' | 'specialty' | 'custom'

export interface Client {
  id: string
  company_id: string
  name: string
  company_name: string | null
  email: string | null
  phone: string | null
  mobile: string | null
  address: any
  contact_person: string | null
  client_type: 'residential' | 'commercial' | 'industrial' | 'government' | 'other'
  total_quotes_sent: number
  total_quotes_accepted: number
  total_revenue: number
  created_at: string
}

export interface QuoteLineItem {
  id: string
  quote_id: string
  item_type: LineItemType
  category: string | null
  description: string
  detailed_description: string | null
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  cost_price: number | null
  markup_percentage: number | null
  is_optional: boolean
  is_taxable: boolean
  sort_order: number
  sku: string | null
  supplier: string | null
  notes: string | null
  created_at: string
}

export interface Quote {
  id: string
  company_id: string
  project_id: string | null
  quote_number: string
  title: string
  description: string | null
  quote_type: QuoteType
  status: QuoteStatus
  client_id: string | null
  client_contact_info: any
  subtotal: number
  discount_amount: number
  discount_percentage: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  currency: string
  payment_terms: string | null
  payment_schedule: any
  valid_until: string | null
  sent_at: string | null
  viewed_at: string | null
  first_viewed_at: string | null
  view_count: number
  accepted_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  scope_of_work: string | null
  terms_and_conditions: string | null
  notes: string | null
  client_notes: string | null
  template_id: string | null
  show_line_item_details: boolean
  require_signature: boolean
  signature_data: any
  created_by: string
  created_at: string
  updated_at: string

  // Joined data
  client?: Client
  project?: any
  line_items?: QuoteLineItem[]
}

export interface QuoteTemplate {
  id: string
  company_id: string | null
  name: string
  description: string | null
  category: TemplateCategory
  subcategory: string | null
  template_data: any
  default_tax_rate: number
  default_payment_terms: string | null
  default_terms_and_conditions: string | null
  is_public: boolean
  is_active: boolean
  times_used: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface QuotePricing {
  subtotal: number
  discount_amount: number
  tax_amount: number
  total: number
  tax_rate: number
  discount_percentage: number
}

export interface CreateQuoteInput {
  title: string
  description?: string
  quote_type?: QuoteType
  client_id?: string
  project_id?: string
  tax_rate?: number
  discount_amount?: number
  discount_percentage?: number
  currency?: string
  valid_until?: string
  payment_terms?: string
  scope_of_work?: string
  terms_and_conditions?: string
  notes?: string
  client_notes?: string
  template_id?: string
  line_items?: Omit<QuoteLineItem, 'id' | 'quote_id' | 'created_at' | 'total_price'>[]
}

export interface UpdateQuoteInput {
  title?: string
  description?: string
  quote_type?: QuoteType
  status?: QuoteStatus
  client_id?: string
  project_id?: string
  tax_rate?: number
  discount_amount?: number
  discount_percentage?: number
  valid_until?: string
  payment_terms?: string
  scope_of_work?: string
  terms_and_conditions?: string
  notes?: string
  client_notes?: string
}

export interface QuoteStatistics {
  total_quotes: number
  draft: number
  sent: number
  accepted: number
  rejected: number
  total_value: number
  accepted_value: number
  conversion_rate: number
}

// ============================================
// QUOTE SERVICE
// ============================================

export const quoteService = {
  /**
   * Create a new quote
   */
  async create(input: CreateQuoteInput): Promise<Quote | null> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    try {
      // Get user's company
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .single()

      if (!profile?.company_id) {
        throw new Error('No company associated with user')
      }

      // Generate quote number
      const quoteNumber = await this.generateQuoteNumber(profile.company_id)

      // Get client info if client_id provided
      let clientContactInfo = null
      if (input.client_id) {
        const { data: client } = await supabase
          .from('clients')
          .select('*')
          .eq('id', input.client_id)
          .single()

        if (client) {
          clientContactInfo = {
            name: client.name,
            email: client.email,
            phone: client.phone,
            address: client.address
          }
        }
      }

      // Calculate pricing if line items provided
      let pricing: QuotePricing = {
        subtotal: 0,
        discount_amount: input.discount_amount || 0,
        tax_amount: 0,
        total: 0,
        tax_rate: input.tax_rate || 0,
        discount_percentage: input.discount_percentage || 0
      }

      if (input.line_items && input.line_items.length > 0) {
        pricing = this.calculateTotals(
          input.line_items.map(item => ({
            ...item,
            total_price: item.quantity * item.unit_price
          })) as QuoteLineItem[],
          input.tax_rate || 0,
          input.discount_amount || 0
        )
      }

      // Create quote
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
          company_id: profile.company_id,
          quote_number: quoteNumber,
          title: input.title,
          description: input.description,
          quote_type: input.quote_type || 'estimate',
          status: 'draft',
          client_id: input.client_id,
          client_contact_info: clientContactInfo,
          project_id: input.project_id,
          subtotal: pricing.subtotal,
          discount_amount: pricing.discount_amount,
          discount_percentage: input.discount_percentage || 0,
          tax_rate: pricing.tax_rate,
          tax_amount: pricing.tax_amount,
          total_amount: pricing.total,
          currency: input.currency || 'USD',
          valid_until: input.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          payment_terms: input.payment_terms,
          scope_of_work: input.scope_of_work,
          terms_and_conditions: input.terms_and_conditions,
          notes: input.notes,
          client_notes: input.client_notes,
          template_id: input.template_id,
          created_by: user.id
        })
        .select()
        .single()

      if (quoteError) throw quoteError

      // Create line items if provided
      if (input.line_items && input.line_items.length > 0) {
        const lineItemsToInsert = input.line_items.map((item, index) => ({
          quote_id: quote.id,
          item_type: item.item_type,
          category: item.category,
          description: item.description,
          detailed_description: item.detailed_description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          cost_price: item.cost_price,
          markup_percentage: item.markup_percentage,
          is_optional: item.is_optional || false,
          is_taxable: item.is_taxable !== false, // Default true
          sort_order: item.sort_order || index,
          sku: item.sku,
          supplier: item.supplier,
          notes: item.notes
        }))

        const { error: itemsError } = await supabase
          .from('quote_line_items')
          .insert(lineItemsToInsert)

        if (itemsError) throw itemsError
      }

      // Log activity
      await this.logActivity(quote.id, 'created', 'Quote created')

      return quote
    } catch (error) {
      console.error('Error creating quote:', error)
      throw error
    }
  },

  /**
   * Create quote from template
   */
  async createFromTemplate(
    templateId: string,
    projectId?: string,
    clientId?: string
  ): Promise<Quote | null> {
    const supabase = createClient()

    try {
      // Get template
      const { data: template, error: templateError } = await supabase
        .from('quote_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError || !template) {
        throw new Error('Template not found')
      }

      // Extract template data
      const templateData = template.template_data
      const lineItems = templateData.line_items || []

      // Create quote from template
      const quote = await this.create({
        title: template.name,
        description: template.description || undefined,
        client_id: clientId,
        project_id: projectId,
        tax_rate: template.default_tax_rate,
        payment_terms: template.default_payment_terms || undefined,
        terms_and_conditions: template.default_terms_and_conditions || undefined,
        template_id: templateId,
        line_items: lineItems
      })

      // Increment template usage count
      await supabase
        .from('quote_templates')
        .update({ times_used: template.times_used + 1 })
        .eq('id', templateId)

      return quote
    } catch (error) {
      console.error('Error creating quote from template:', error)
      throw error
    }
  },

  /**
   * Get quote by ID
   */
  async getById(id: string): Promise<Quote | null> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          client:clients(*),
          project:projects(id, name, client_name),
          line_items:quote_line_items(*)
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      // Sort line items by sort_order
      if (data.line_items) {
        data.line_items.sort((a: any, b: any) => a.sort_order - b.sort_order)
      }

      return data
    } catch (error) {
      console.error('Error fetching quote:', error)
      return null
    }
  },

  /**
   * Get all quotes for company
   */
  async getByCompany(
    companyId: string,
    filters?: {
      status?: QuoteStatus | QuoteStatus[]
      client_id?: string
      project_id?: string
      search?: string
    }
  ): Promise<Quote[]> {
    const supabase = createClient()

    try {
      let query = supabase
        .from('quotes')
        .select(`
          *,
          client:clients(id, name, email),
          project:projects(id, name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })

      // Apply filters
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          query = query.in('status', filters.status)
        } else {
          query = query.eq('status', filters.status)
        }
      }

      if (filters?.client_id) {
        query = query.eq('client_id', filters.client_id)
      }

      if (filters?.project_id) {
        query = query.eq('project_id', filters.project_id)
      }

      if (filters?.search) {
        query = query.textSearch('search_vector', filters.search)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('Error fetching quotes:', error)
      return []
    }
  },

  /**
   * Update quote
   */
  async update(id: string, input: UpdateQuoteInput): Promise<Quote | null> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('quotes')
        .update(input)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Log activity
      await this.logActivity(id, 'updated', 'Quote updated')

      return data
    } catch (error) {
      console.error('Error updating quote:', error)
      throw error
    }
  },

  /**
   * Delete quote
   */
  async delete(id: string): Promise<boolean> {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', id)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Error deleting quote:', error)
      throw error
    }
  },

  /**
   * Duplicate quote
   */
  async duplicate(id: string): Promise<Quote | null> {
    const supabase = createClient()

    try {
      // Get original quote
      const original = await this.getById(id)
      if (!original) throw new Error('Quote not found')

      // Create new quote
      const quote = await this.create({
        title: `${original.title} (Copy)`,
        description: original.description || undefined,
        quote_type: original.quote_type,
        client_id: original.client_id || undefined,
        project_id: original.project_id || undefined,
        tax_rate: original.tax_rate,
        discount_amount: original.discount_amount,
        discount_percentage: original.discount_percentage,
        currency: original.currency,
        payment_terms: original.payment_terms || undefined,
        scope_of_work: original.scope_of_work || undefined,
        terms_and_conditions: original.terms_and_conditions || undefined,
        notes: original.notes || undefined,
        client_notes: original.client_notes || undefined,
        line_items: original.line_items?.map(item => ({
          item_type: item.item_type,
          category: item.category,
          description: item.description,
          detailed_description: item.detailed_description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          cost_price: item.cost_price,
          markup_percentage: item.markup_percentage,
          is_optional: item.is_optional,
          is_taxable: item.is_taxable,
          sort_order: item.sort_order,
          sku: item.sku,
          supplier: item.supplier,
          notes: item.notes
        }))
      })

      return quote
    } catch (error) {
      console.error('Error duplicating quote:', error)
      throw error
    }
  },

  /**
   * Calculate quote totals
   */
  calculateTotals(
    lineItems: QuoteLineItem[],
    taxRate: number,
    discountAmount: number = 0
  ): QuotePricing {
    // Calculate subtotal from taxable items
    const subtotalBeforeDiscount = lineItems
      .filter(item => !item.is_optional)
      .reduce((sum, item) => sum + item.total_price, 0)

    // Apply discount
    const subtotal = subtotalBeforeDiscount - discountAmount
    const discountPercentage = subtotalBeforeDiscount > 0
      ? (discountAmount / subtotalBeforeDiscount) * 100
      : 0

    // Calculate tax only on taxable items
    const taxableAmount = lineItems
      .filter(item => item.is_taxable && !item.is_optional)
      .reduce((sum, item) => sum + item.total_price, 0) - discountAmount

    const taxAmount = taxableAmount * (taxRate / 100)

    // Calculate total
    const total = subtotal + taxAmount

    return {
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount_amount: parseFloat(discountAmount.toFixed(2)),
      tax_amount: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      tax_rate: taxRate,
      discount_percentage: parseFloat(discountPercentage.toFixed(2))
    }
  },

  /**
   * Generate quote number
   */
  async generateQuoteNumber(companyId: string): Promise<string> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('generate_quote_number', {
        company_uuid: companyId
      })

      if (error) throw error

      return data as string
    } catch (error) {
      console.error('Error generating quote number:', error)
      // Fallback to timestamp-based
      const timestamp = Date.now().toString().slice(-6)
      return `QS-${new Date().getFullYear()}-${timestamp}`
    }
  },

  /**
   * Send quote to client
   */
  async sendQuote(id: string, method: 'email' | 'link' = 'email'): Promise<void> {
    const supabase = createClient()

    try {
      // Update quote status
      await supabase
        .from('quotes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', id)

      // Log activity
      await this.logActivity(id, 'sent', `Quote sent via ${method}`)

      // TODO: Implement email sending via API route
      if (method === 'email') {
        // await fetch('/api/quotes/send-email', { ... })
      }
    } catch (error) {
      console.error('Error sending quote:', error)
      throw error
    }
  },

  /**
   * Mark quote as viewed
   */
  async markViewed(id: string): Promise<void> {
    const supabase = createClient()

    try {
      const { data: quote } = await supabase
        .from('quotes')
        .select('first_viewed_at, view_count, status')
        .eq('id', id)
        .single()

      const updates: any = {
        viewed_at: new Date().toISOString(),
        view_count: (quote?.view_count || 0) + 1
      }

      // Set first_viewed_at if not set
      if (!quote?.first_viewed_at) {
        updates.first_viewed_at = new Date().toISOString()
      }

      // Update status if sent
      if (quote?.status === 'sent') {
        updates.status = 'viewed'
      }

      await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)

      // Log activity
      await this.logActivity(id, 'viewed', 'Quote viewed by client')
    } catch (error) {
      console.error('Error marking quote as viewed:', error)
      throw error
    }
  },

  /**
   * Accept quote
   */
  async acceptQuote(id: string, signatureData?: any): Promise<Quote | null> {
    const supabase = createClient()

    try {
      const updates: any = {
        status: 'accepted',
        accepted_at: new Date().toISOString()
      }

      if (signatureData) {
        updates.signature_data = signatureData
      }

      const { data, error } = await supabase
        .from('quotes')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Log activity
      await this.logActivity(id, 'accepted', 'Quote accepted by client')

      // Update client stats
      if (data.client_id) {
        await this.updateClientStats(data.client_id)
      }

      return data
    } catch (error) {
      console.error('Error accepting quote:', error)
      throw error
    }
  },

  /**
   * Reject quote
   */
  async rejectQuote(id: string, reason?: string): Promise<Quote | null> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('quotes')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: reason
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      // Log activity
      await this.logActivity(id, 'rejected', `Quote rejected: ${reason || 'No reason provided'}`)

      return data
    } catch (error) {
      console.error('Error rejecting quote:', error)
      throw error
    }
  },

  /**
   * Convert quote to project
   */
  async convertToProject(id: string): Promise<string | null> {
    const supabase = createClient()

    try {
      // Get quote with all details
      const quote = await this.getById(id)
      if (!quote) throw new Error('Quote not found')
      if (quote.status !== 'accepted') throw new Error('Quote must be accepted first')

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: quote.title,
          description: quote.description,
          client_name: quote.client?.name,
          company_id: quote.company_id,
          status: 'planning',
          budget: quote.total_amount,
          created_by: quote.created_by
        })
        .select()
        .single()

      if (projectError) throw projectError

      // Update quote with project reference
      await supabase
        .from('quotes')
        .update({
          status: 'converted',
          project_id: project.id
        })
        .eq('id', id)

      // Log activity
      await this.logActivity(id, 'converted', `Quote converted to project: ${project.name}`)

      return project.id
    } catch (error) {
      console.error('Error converting quote to project:', error)
      throw error
    }
  },

  /**
   * Get quote statistics
   */
  async getStatistics(companyId: string): Promise<QuoteStatistics> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('get_quote_stats', {
        company_uuid: companyId
      })

      if (error) throw error

      return data as QuoteStatistics
    } catch (error) {
      console.error('Error fetching quote statistics:', error)
      return {
        total_quotes: 0,
        draft: 0,
        sent: 0,
        accepted: 0,
        rejected: 0,
        total_value: 0,
        accepted_value: 0,
        conversion_rate: 0
      }
    }
  },

  /**
   * Log quote activity
   */
  async logActivity(
    quoteId: string,
    activityType: string,
    description: string,
    metadata?: any
  ): Promise<void> {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    try {
      await supabase.from('quote_activities').insert({
        quote_id: quoteId,
        activity_type: activityType,
        description,
        user_id: user?.id,
        user_name: user?.user_metadata?.full_name || user?.email,
        metadata
      })
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  },

  /**
   * Update client statistics
   */
  async updateClientStats(clientId: string): Promise<void> {
    const supabase = createClient()

    try {
      const { data: quotes } = await supabase
        .from('quotes')
        .select('status, total_amount')
        .eq('client_id', clientId)

      if (!quotes) return

      const totalSent = quotes.filter(q => q.status !== 'draft').length
      const totalAccepted = quotes.filter(q => q.status === 'accepted').length
      const totalRevenue = quotes
        .filter(q => q.status === 'accepted')
        .reduce((sum, q) => sum + q.total_amount, 0)

      await supabase
        .from('clients')
        .update({
          total_quotes_sent: totalSent,
          total_quotes_accepted: totalAccepted,
          total_revenue: totalRevenue
        })
        .eq('id', clientId)
    } catch (error) {
      console.error('Error updating client stats:', error)
    }
  },

  /**
   * Subscribe to quote changes
   */
  subscribeToQuote(quoteId: string, callback: (payload: any) => void): () => void {
    const supabase = createClient()

    const channel = supabase
      .channel(`quote:${quoteId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
          filter: `id=eq.${quoteId}`
        },
        callback
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get status color
 */
export function getStatusColor(status: QuoteStatus): string {
  const colors: Record<QuoteStatus, string> = {
    draft: '#6B7280',
    sent: '#6366F1',
    viewed: '#F59E0B',
    accepted: '#10B981',
    rejected: '#DC2626',
    expired: '#9CA3AF',
    converted: '#8B5CF6'
  }
  return colors[status]
}

/**
 * Get status icon
 */
export function getStatusIcon(status: QuoteStatus): string {
  const icons: Record<QuoteStatus, string> = {
    draft: '📝',
    sent: '📤',
    viewed: '👁️',
    accepted: '✅',
    rejected: '❌',
    expired: '⏰',
    converted: '🎯'
  }
  return icons[status]
}

/**
 * Get status display name
 */
export function getStatusDisplayName(status: QuoteStatus): string {
  const names: Record<QuoteStatus, string> = {
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    accepted: 'Accepted',
    rejected: 'Rejected',
    expired: 'Expired',
    converted: 'Converted'
  }
  return names[status]
}

/**
 * Format currency
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

/**
 * Check if quote is expired
 */
export function isQuoteExpired(quote: Quote): boolean {
  if (!quote.valid_until) return false
  if (quote.status === 'accepted' || quote.status === 'converted') return false
  return new Date(quote.valid_until) < new Date()
}

/**
 * Get days until expiry
 */
export function getDaysUntilExpiry(quote: Quote): number | null {
  if (!quote.valid_until) return null
  const expiryDate = new Date(quote.valid_until)
  const now = new Date()
  const diffTime = expiryDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
