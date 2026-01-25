// ============================================================================
// API ROUTE: /api/quotes
// Handles GET (list quotes) and POST (create quote)
// SECURITY: Full authentication, validation, and rate limiting
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getQuotes, createQuote, getQuoteCount } from '@/lib/supabase/quotes'
import type { QuoteFilters, QuoteSortOptions, QuotePaginationOptions } from '@/types/quotes'
import { requireAuth, rateLimit, addRateLimitHeaders, handleApiError } from '@/lib/api/auth-middleware'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for GET query parameters
 * Validates all filter, sort, and pagination parameters
 */
const GetQuotesQuerySchema = z.object({
  // Search
  search: z.string().max(200).optional(),

  // Filters
  status: z.string()
    .transform(str => str.split(','))
    .pipe(z.array(z.enum(['draft', 'ready', 'sent', 'viewed', 'commented', 'revised', 'approved', 'rejected', 'on_hold', 'expired', 'won', 'lost', 'cancelled'])))
    .optional(),
  client_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  min_amount: z.string().transform(Number).pipe(z.number().nonnegative()).optional(),
  max_amount: z.string().transform(Number).pipe(z.number().nonnegative()).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),

  // Sort
  sort_field: z.enum(['quote_number', 'client_name', 'total', 'status', 'created_at', 'valid_until']).optional(),
  sort_direction: z.enum(['asc', 'desc']).default('desc'),

  // Pagination
  page: z.string().transform(Number).pipe(z.number().int().positive()).default('1'),
  per_page: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).default('20'),
})

/**
 * Schema for creating a new quote
 * Comprehensive validation of all quote fields
 */
const CreateQuoteSchema = z.object({
  // Required fields
  quote_number: z.string()
    .min(1, 'Quote number is required')
    .max(50, 'Quote number too long')
    .regex(/^[A-Z0-9-]+$/, 'Quote number must contain only uppercase letters, numbers, and hyphens'),

  client_id: z.string()
    .uuid('Invalid client ID'),

  // Optional project association
  project_id: z.string()
    .uuid('Invalid project ID')
    .optional()
    .nullable(),

  // Financial fields
  subtotal: z.number()
    .nonnegative('Subtotal cannot be negative')
    .finite(),

  tax_rate: z.number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .finite()
    .default(0),

  tax_amount: z.number()
    .nonnegative('Tax amount cannot be negative')
    .finite()
    .default(0),

  discount_amount: z.number()
    .nonnegative('Discount amount cannot be negative')
    .finite()
    .default(0),

  total: z.number()
    .positive('Total must be positive')
    .finite(),

  // Status and dates
  status: z.enum(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired'])
    .default('draft'),

  valid_until: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .refine(date => new Date(date) > new Date(), 'Valid until date must be in the future')
    .optional()
    .nullable(),

  // Optional text fields
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title too long'),

  description: z.string()
    .max(2000, 'Description too long')
    .optional()
    .nullable(),

  notes: z.string()
    .max(1000, 'Notes too long')
    .optional()
    .nullable(),

  terms: z.string()
    .max(5000, 'Terms too long')
    .optional()
    .nullable(),

  // Currency
  currency: z.string()
    .length(3, 'Currency must be 3-letter code')
    .regex(/^[A-Z]{3}$/, 'Currency must be uppercase letters')
    .default('USD'),

  // Metadata (prevent injection attacks)
  metadata: z.record(z.string(), z.any())
    .optional()
    .nullable(),
})
.refine(
  data => data.subtotal + data.tax_amount - data.discount_amount === data.total,
  {
    message: 'Total must equal subtotal + tax - discount',
    path: ['total'],
  }
)

// ============================================================================
// GET /api/quotes
// ============================================================================

/**
 * GET /api/quotes
 * List all quotes with optional filtering, sorting, and pagination
 *
 * @security Requires authentication
 * @rateLimit 100 requests per minute
 * @validation Query parameters validated with Zod
 */
export async function GET(request: NextRequest) {
  try {
    // 1. AUTHENTICATION
    const { data: authData, error: authError } = await requireAuth(request)
    if (authError) return authError

    // 2. RATE LIMITING
    const rateLimitError = rateLimit(request, `quotes-list-${authData!.user.id}`, 100, 60000)
    if (rateLimitError) return rateLimitError

    // 3. PARSE & VALIDATE QUERY PARAMETERS
    const searchParams = request.nextUrl.searchParams
    const queryObject = Object.fromEntries(searchParams.entries())

    const validationResult = GetQuotesQuerySchema.safeParse(queryObject)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))

      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: errors
        },
        { status: 400 }
      )
    }

    const params = validationResult.data

    // 4. BUILD FILTERS OBJECT
    const filters: QuoteFilters = {}

    if (params.search) filters.search = params.search
    if (params.status) filters.status = params.status
    if (params.client_id) filters.client_id = params.client_id
    if (params.project_id) filters.project_id = params.project_id
    if (params.min_amount) filters.min_amount = params.min_amount
    if (params.max_amount) filters.max_amount = params.max_amount
    if (params.date_from) filters.date_from = params.date_from
    if (params.date_to) filters.date_to = params.date_to

    // 5. BUILD SORT OBJECT
    const sort: QuoteSortOptions | undefined = params.sort_field
      ? {
          field: params.sort_field,
          direction: params.sort_direction,
        }
      : undefined

    // 6. BUILD PAGINATION OBJECT
    const pagination: QuotePaginationOptions = {
      page: params.page,
      per_page: params.per_page,
    }

    // 7. FETCH QUOTES FROM DATABASE
    const { data: quotes, error } = await getQuotes(filters, sort, pagination)

    if (error) {
      console.error('[GET /api/quotes] Database error:', error)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to fetch quotes' },
        { status: 500 }
      )
    }

    // 8. GET TOTAL COUNT FOR PAGINATION
    const { data: totalCount } = await getQuoteCount(filters)

    // 9. BUILD RESPONSE
    const response = NextResponse.json({
      data: quotes || [],
      pagination: {
        page: pagination.page,
        per_page: pagination.per_page,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / pagination.per_page),
      },
    })

    // 10. ADD RATE LIMIT HEADERS
    return addRateLimitHeaders(response, `quotes-list-${authData!.user.id}`, 100)

  } catch (error) {
    console.error('[GET /api/quotes] Unhandled exception:', error)
    return handleApiError(error)
  }
}

// ============================================================================
// POST /api/quotes
// ============================================================================

/**
 * POST /api/quotes
 * Create a new quote
 *
 * @security Requires authentication
 * @rateLimit 20 creates per minute
 * @validation Request body validated with Zod
 */
export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATION
    const { data: authData, error: authError } = await requireAuth(request)
    if (authError) return authError

    // 2. RATE LIMITING (stricter for write operations)
    const rateLimitError = rateLimit(request, `quotes-create-${authData!.user.id}`, 20, 60000)
    if (rateLimitError) return rateLimitError

    // 3. PARSE REQUEST BODY
    let body: unknown
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // 4. VALIDATE REQUEST BODY
    const validationResult = CreateQuoteSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))

      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Invalid quote data',
          details: errors
        },
        { status: 400 }
      )
    }

    const quoteData = validationResult.data

    // 5. ADDITIONAL BUSINESS LOGIC VALIDATION
    // Check if quote_number is unique (enforced by database, but good to validate)
    // Check if client exists (enforced by foreign key, but good UX to validate)

    // 6. CREATE QUOTE IN DATABASE
    const { data: quote, error } = await createQuote(quoteData)

    if (error) {
      console.error('[POST /api/quotes] Database error:', error)

      // Handle specific database errors
      if (error.message?.includes('unique constraint')) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Quote number already exists' },
          { status: 409 }
        )
      }

      if (error.message?.includes('foreign key')) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Client not found or access denied' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to create quote' },
        { status: 500 }
      )
    }

    // 7. SUCCESS RESPONSE
    const response = NextResponse.json(
      {
        data: quote,
        message: 'Quote created successfully'
      },
      { status: 201 }
    )

    return addRateLimitHeaders(response, `quotes-create-${authData!.user.id}`, 20)

  } catch (error) {
    console.error('[POST /api/quotes] Unhandled exception:', error)
    return handleApiError(error)
  }
}
