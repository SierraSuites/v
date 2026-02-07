export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe'
import type { Currency, Plan } from '@/types/international'
import { rateLimit, addRateLimitHeaders, handleApiError } from '@/lib/api/auth-middleware'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Rate limiting (10 checkout sessions per minute)
    const rateLimitError = rateLimit(request, `checkout-${user.id}`, 10, 60000)
    if (rateLimitError) return rateLimitError

    const body = await request.json()
    const { plan, currency } = body as { plan: Plan; currency: Currency }

    if (!plan || !currency) {
      return NextResponse.json(
        { error: 'Missing plan or currency' },
        { status: 400 }
      )
    }

    // Validate plan and currency
    const validPlans: Plan[] = ['starter', 'professional', 'enterprise']
    const validCurrencies: Currency[] = ['usd', 'gbp', 'eur', 'cad']

    if (!validPlans.includes(plan) || !validCurrencies.includes(currency)) {
      return NextResponse.json(
        { error: 'Invalid plan or currency' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Guard: email is required for Stripe checkout
    if (!user.email) {
      console.warn('[Checkout] User attempted checkout without email', {
        userId: user.id,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json(
        { error: 'User email is required for checkout' },
        { status: 400 }
      )
    }

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email,
      plan,
      currency,
      successUrl: `${appUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${appUrl}/register?step=2`,
    })

    const response = NextResponse.json({
      sessionId: session.id,
      url: session.url
    })

    return addRateLimitHeaders(response, `checkout-${user.id}`, 10)
  } catch (error) {
    return handleApiError(error)
  }
}
