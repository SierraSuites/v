// ============================================================
// API ROUTE: /api/quotes/[id]/items
// Handles quote line items CRUD
// SECURITY: Protected with authentication and validation
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { addQuoteItem, getQuoteItems } from '@/lib/supabase/quotes'
import { requireAuth, handleApiError, rateLimit, addRateLimitHeaders } from '@/lib/api/auth-middleware'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Validation schema for quote line item
const QuoteItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  quantity: z.number().positive('Quantity must be positive').finite(),
  unit_price: z.number().nonnegative('Unit price cannot be negative').finite(),
  unit: z.string().optional(),
  category: z.string().optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  order: z.number().int().nonnegative().optional(),
})

/**
 * GET /api/quotes/[id]/items
 * Get all line items for a quote
 *
 * @security Requires authentication
 * @rateLimit 60 requests per minute
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. AUTHENTICATION: Verify user is authenticated
    const { data: auth, error: authError } = await requireAuth(request)
    if (authError) return authError

    // 2. RATE LIMITING: Prevent abuse
    const rateLimitError = rateLimit(request, `quote-items-get-${auth!.user.id}`, 60, 60000)
    if (rateLimitError) return rateLimitError

    // 3. INPUT VALIDATION: Validate quote ID format
    const { id } = await params
    if (!id || typeof id !== 'string' || id.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid quote ID' },
        { status: 400 }
      )
    }

    // 4. DATABASE OPERATION: Fetch quote items
    // Note: RLS policies ensure user can only access their company's quotes
    const { data: items, error } = await getQuoteItems(id)

    if (error) {
      // Don't expose internal error messages to client
      console.error('[GET /api/quotes/:id/items] Database error:', error)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to fetch quote items' },
        { status: 500 }
      )
    }

    // 5. SUCCESS RESPONSE: Return data with rate limit headers
    const response = NextResponse.json({
      data: items || [],
      count: items?.length || 0
    })

    return addRateLimitHeaders(response, `quote-items-get-${auth!.user.id}`, 60)

  } catch (error) {
    console.error('[GET /api/quotes/:id/items] Unhandled exception:', error)
    return handleApiError(error)
  }
}

/**
 * POST /api/quotes/[id]/items
 * Add a new line item to a quote
 *
 * @security Requires authentication
 * @rateLimit 30 requests per minute
 * @validation Validates input against QuoteItemSchema
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // 1. AUTHENTICATION: Verify user is authenticated
    const { data: auth, error: authError } = await requireAuth(request)
    if (authError) return authError

    // 2. RATE LIMITING: Stricter limit for write operations
    const rateLimitError = rateLimit(request, `quote-items-post-${auth!.user.id}`, 30, 60000)
    if (rateLimitError) return rateLimitError

    // 3. INPUT VALIDATION: Validate quote ID
    const { id } = await params
    if (!id || typeof id !== 'string' || id.length === 0) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid quote ID' },
        { status: 400 }
      )
    }

    // 4. PARSE REQUEST BODY
    let body: unknown
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // 5. VALIDATE REQUEST BODY: Use Zod schema
    const validationResult = QuoteItemSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))

      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Invalid quote item data',
          details: errors
        },
        { status: 400 }
      )
    }

    // 6. DATABASE OPERATION: Add quote item
    // RLS policies ensure user can only add items to their company's quotes
    const { data: item, error } = await addQuoteItem({
      quote_id: id,
      item_number: 0, // Will be set by database trigger
      convert_to_task: false,
      created_task_id: null,
      category: validationResult.data.category || null,
      description: validationResult.data.description,
      detailed_description: null,
      benefits: null,
      quantity: validationResult.data.quantity,
      unit: validationResult.data.unit || 'unit',
      unit_price: validationResult.data.unit_price,
      cost_price: null,
      markup_percentage: null,
      margin: 0,
      tax_rate: 0,
      is_taxable: true,
      notes: validationResult.data.notes || null,
      sort_order: validationResult.data.order || 0,
      is_optional: false,
      is_allowance: false,
    })

    if (error) {
      console.error('[POST /api/quotes/:id/items] Database error:', error)

      // Handle specific database errors
      if (error.message?.includes('foreign key')) {
        return NextResponse.json(
          { error: 'Not Found', message: 'Quote not found or access denied' },
          { status: 404 }
        )
      }

      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to add quote item' },
        { status: 500 }
      )
    }

    // 7. SUCCESS RESPONSE: Return created item with rate limit headers
    const response = NextResponse.json(
      {
        data: item,
        message: 'Quote item added successfully'
      },
      { status: 201 }
    )

    return addRateLimitHeaders(response, `quote-items-post-${auth!.user.id}`, 30)

  } catch (error) {
    console.error('[POST /api/quotes/:id/items] Unhandled exception:', error)
    return handleApiError(error)
  }
}
