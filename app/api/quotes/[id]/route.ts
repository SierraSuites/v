// ============================================================
// API ROUTE: /api/quotes/[id]
// Handles GET, PUT, DELETE for individual quotes
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getQuoteById, updateQuote, deleteQuote, duplicateQuote } from '@/lib/supabase/quotes'
import { requireAuth, rateLimit, addRateLimitHeaders, handleApiError } from '@/lib/api/auth-middleware'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/quotes/[id]
 * Get a single quote by ID with all related data
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Authentication check
    const { data: authData, error: authError } = await requireAuth(request)
    if (authError) return authError

    // Rate limiting (200 requests per minute for single resource)
    const rateLimitError = rateLimit(request, `quotes-get-${authData!.user.id}`, 200, 60000)
    if (rateLimitError) return rateLimitError

    const { id } = await params

    console.log('[GET /api/quotes/:id] Fetching quote:', id)

    const { data: quote, error } = await getQuoteById(id)

    if (error) {
      console.error('[GET /api/quotes/:id] Error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch quote' },
        { status: error.message?.includes('not found') ? 404 : 500 }
      )
    }

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      )
    }

    const response = NextResponse.json({ data: quote })
    return addRateLimitHeaders(response, `quotes-get-${authData!.user.id}`, 200)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PUT /api/quotes/[id]
 * Update a quote
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Authentication check
    const { data: authData, error: authError } = await requireAuth(request)
    if (authError) return authError

    // Rate limiting (50 updates per minute)
    const rateLimitError = rateLimit(request, `quotes-update-${authData!.user.id}`, 50, 60000)
    if (rateLimitError) return rateLimitError

    const { id } = await params
    const body = await request.json()

    console.log('[PUT /api/quotes/:id] Updating quote:', id, body)

    const { data: quote, error } = await updateQuote(id, body)

    if (error) {
      console.error('[PUT /api/quotes/:id] Error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to update quote' },
        { status: 500 }
      )
    }

    const response = NextResponse.json({ data: quote })
    return addRateLimitHeaders(response, `quotes-update-${authData!.user.id}`, 50)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * DELETE /api/quotes/[id]
 * Delete a quote
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Authentication check
    const { data: authData, error: authError } = await requireAuth(request)
    if (authError) return authError

    // Rate limiting (10 deletes per minute)
    const rateLimitError = rateLimit(request, `quotes-delete-${authData!.user.id}`, 10, 60000)
    if (rateLimitError) return rateLimitError

    const { id } = await params

    console.log('[DELETE /api/quotes/:id] Deleting quote:', id)

    const { error } = await deleteQuote(id)

    if (error) {
      console.error('[DELETE /api/quotes/:id] Error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to delete quote' },
        { status: 500 }
      )
    }

    const response = NextResponse.json({ success: true })
    return addRateLimitHeaders(response, `quotes-delete-${authData!.user.id}`, 10)
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * POST /api/quotes/[id]
 * Special actions on a quote (e.g., duplicate)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Authentication check
    const { data: authData, error: authError } = await requireAuth(request)
    if (authError) return authError

    // Rate limiting (20 actions per minute)
    const rateLimitError = rateLimit(request, `quotes-action-${authData!.user.id}`, 20, 60000)
    if (rateLimitError) return rateLimitError

    const { id } = await params
    const body = await request.json()
    const { action } = body

    console.log('[POST /api/quotes/:id] Action:', action, 'on quote:', id)

    if (action === 'duplicate') {
      const { data: newQuote, error } = await duplicateQuote(id)

      if (error) {
        console.error('[POST /api/quotes/:id] Duplicate error:', error)
        return NextResponse.json(
          { error: error.message || 'Failed to duplicate quote' },
          { status: 500 }
        )
      }

      const response = NextResponse.json({ data: newQuote }, { status: 201 })
      return addRateLimitHeaders(response, `quotes-action-${authData!.user.id}`, 20)
    }

    return NextResponse.json(
      { error: 'Unknown action' },
      { status: 400 }
    )
  } catch (error) {
    return handleApiError(error)
  }
}
