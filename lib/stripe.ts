import Stripe from 'stripe'
import type { Currency, Plan } from '@/types/international'

// Initialize Stripe only if API key is available
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
      typescript: true,
    })
  : null as any as Stripe // Type assertion for build time

// Stripe Price ID mapping - these will be created in your Stripe Dashboard
export function getStripePriceId(plan: Plan, currency: Currency): string {
  const priceIds: Record<Plan, Record<Currency, string>> = {
    starter: {
      usd: process.env.STRIPE_STARTER_USD_PRICE_ID || '',
      gbp: process.env.STRIPE_STARTER_GBP_PRICE_ID || '',
      eur: process.env.STRIPE_STARTER_EUR_PRICE_ID || '',
      cad: process.env.STRIPE_STARTER_CAD_PRICE_ID || '',
    },
    professional: {
      usd: process.env.STRIPE_PROFESSIONAL_USD_PRICE_ID || '',
      gbp: process.env.STRIPE_PROFESSIONAL_GBP_PRICE_ID || '',
      eur: process.env.STRIPE_PROFESSIONAL_EUR_PRICE_ID || '',
      cad: process.env.STRIPE_PROFESSIONAL_CAD_PRICE_ID || '',
    },
    enterprise: {
      usd: process.env.STRIPE_ENTERPRISE_USD_PRICE_ID || '',
      gbp: process.env.STRIPE_ENTERPRISE_GBP_PRICE_ID || '',
      eur: process.env.STRIPE_ENTERPRISE_EUR_PRICE_ID || '',
      cad: process.env.STRIPE_ENTERPRISE_CAD_PRICE_ID || '',
    },
  }

  return priceIds[plan][currency]
}

export async function createCheckoutSession(params: {
  userId: string
  email: string
  plan: Plan
  currency: Currency
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session> {
  const priceId = getStripePriceId(params.plan, params.currency)

  if (!priceId) {
    throw new Error(`Price ID not found for plan: ${params.plan}, currency: ${params.currency}`)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer_email: params.email,
    client_reference_id: params.userId,
    metadata: {
      userId: params.userId,
      plan: params.plan,
      currency: params.currency,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    subscription_data: {
      metadata: {
        userId: params.userId,
        plan: params.plan,
        currency: params.currency,
      },
    },
  })

  return session
}

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId)
  } catch (error) {
    console.error('Failed to retrieve subscription:', error)
    return null
  }
}

export async function cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.cancel(subscriptionId)
}

export async function updateSubscription(
  subscriptionId: string,
  params: Stripe.SubscriptionUpdateParams
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, params)
}
