// ============================================================
// API ROUTE: /api/quotes/stats
// Get quote statistics and analytics
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getQuoteStats } from '@/lib/supabase/quotes'
import { requireAuth, rateLimit, addRateLimitHeaders, handleApiError } from '@/lib/api/auth-middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/quotes/stats
 * Get quote statistics for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const { data: authData, error: authError } = await requireAuth(request)
    if (authError) return authError

    // Rate limiting (50 requests per minute for analytics)
    const rateLimitError = rateLimit(request, `quotes-stats-${authData!.user.id}`, 50, 60000)
    if (rateLimitError) return rateLimitError

    console.log('[GET /api/quotes/stats] Fetching statistics')

    const { data: stats, error } = await getQuoteStats()

    if (error) {
      console.error('[GET /api/quotes/stats] Error:', error)
      return NextResponse.json(
        { error: error.message || 'Failed to fetch statistics' },
        { status: 500 }
      )
    }

    const response = NextResponse.json({ data: stats })
    return addRateLimitHeaders(response, `quotes-stats-${authData!.user.id}`, 50)
  } catch (error) {
    return handleApiError(error)
  }
}
