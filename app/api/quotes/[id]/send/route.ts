export const dynamic = 'force-dynamic'

// ============================================================
// POST /api/quotes/[id]/send
// Send quote email to client with PDF attachment
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth-middleware'
import { sendQuoteEmail, type QuoteEmailData } from '@/lib/email/service'
import { generateQuotePDFBlob } from '@/lib/pdf/quote-pdf-generator'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { data: authData, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { id } = await params
    const supabase = await createClient()

    // Fetch quote with items
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_items (*)
      `)
      .eq('id', id)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Verify user has access to this quote
    if (quote.user_id !== authData!.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Validate client email
    if (!quote.client_email) {
      return NextResponse.json({ error: 'Quote has no client email' }, { status: 400 })
    }

    // Get user profile for company info
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, full_name')
      .eq('id', authData!.user.id)
      .single()

    // Format currency
    const totalAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quote.currency || 'USD',
    }).format(quote.total_price || 0)

    // Format valid until date
    const validUntil = quote.valid_until
      ? new Date(quote.valid_until).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })

    // Generate PDF attachment
    const pdfQuoteData = {
      quote_number: quote.quote_number,
      title: quote.title || 'Construction Quote',
      client_name: quote.client_name,
      client_email: quote.client_email,
      client_phone: quote.client_phone,
      client_address: quote.client_address,
      project_address: quote.project_address,
      issue_date: quote.issue_date || quote.created_at,
      valid_until: quote.valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: quote.status,
      subtotal: quote.subtotal || 0,
      tax_rate: quote.tax_rate || 0,
      tax_amount: quote.tax_amount || 0,
      total_amount: quote.total_price || 0,
      currency: quote.currency || 'USD',
      scope_of_work: quote.scope_of_work,
      notes: quote.notes,
      quote_items: (quote.quote_items || []).map((item: any) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        total: item.total || item.quantity * item.unit_price,
        category: item.category,
      })),
    }

    const pdfBlob = await generateQuotePDFBlob(pdfQuoteData)
    const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer())

    // Prepare email data
    const emailData: QuoteEmailData = {
      quoteNumber: quote.quote_number,
      clientName: quote.client_name,
      clientEmail: quote.client_email,
      quoteTitle: quote.title || 'Construction Quote',
      totalAmount,
      validUntil,
      companyName: 'The Sierra Suites',
      companyEmail: process.env.EMAIL_FROM_ADDRESS || 'hello@sierrasuites.com',
      companyPhone: '(555) 123-4567',
      viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/quotes/${id}`,
    }

    // Send email with PDF attachment
    const result = await sendQuoteEmail(emailData, pdfBuffer)

    if (!result.success) {
      console.error('[send quote] Email send failed:', result.error)
      return NextResponse.json({ error: 'Failed to send email: ' + result.error }, { status: 500 })
    }

    // Update quote status to 'sent' and increment send count
    await supabase
      .from('quotes')
      .update({
        status: quote.status === 'draft' ? 'sent' : quote.status,
        sent_at: quote.sent_at || new Date().toISOString(),
        email_sent_count: (quote.email_sent_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      message: `Quote sent to ${quote.client_email}`,
      emailId: result.id,
    })
  } catch (err: any) {
    console.error('[send quote] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 })
  }
}
