import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import type Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Create Supabase admin client for webhook operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      )
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription') {
          const userId = session.metadata?.userId
          const plan = session.metadata?.plan
          const currency = session.metadata?.currency

          if (!userId) {
            console.error('No userId in session metadata')
            break
          }

          // Update user in database
          const { error } = await supabaseAdmin
            .from('users')
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_status: 'active',
              selected_plan: plan,
              selected_currency: currency,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId)

          if (error) {
            console.error('Error updating user:', error)
          }
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (!userId) {
          console.error('No userId in subscription metadata')
          break
        }

        const status = subscription.status

        // Map Stripe status to our status
        let subscriptionStatus: 'active' | 'cancelled' | 'past_due' | 'pending' = 'pending'
        if (status === 'active') subscriptionStatus = 'active'
        else if (status === 'canceled') subscriptionStatus = 'cancelled'
        else if (status === 'past_due') subscriptionStatus = 'past_due'

        const { error } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: subscriptionStatus,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) {
          console.error('Error updating subscription:', error)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const userId = subscription.metadata?.userId

        if (!userId) {
          console.error('No userId in subscription metadata')
          break
        }

        const { error } = await supabaseAdmin
          .from('users')
          .update({
            subscription_status: 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) {
          console.error('Error cancelling subscription:', error)
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('Payment succeeded for invoice:', invoice.id)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = invoice.subscription as string

        if (subscriptionId) {
          const { error } = await supabaseAdmin
            .from('users')
            .update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscriptionId)

          if (error) {
            console.error('Error updating payment failed status:', error)
          }
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
