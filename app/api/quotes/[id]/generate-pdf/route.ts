export const dynamic = 'force-dynamic'

// ============================================================
// GET /api/quotes/[id]/generate-pdf
// Generate professional PDF for a quote
// Based on PHASE_1_2_3_IMPLEMENTATION_PLAN.md
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth-middleware'
import { QuotePDFDocument, generateQuotePDFBlob } from '@/lib/pdf/quote-pdf-generator'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { data: authData, error: authError } = await requireAuth(request)
    if (authError) return authError

    const { id } = await params
    const supabase = await createClient()

    // Fetch quote with items and all necessary data
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

    // Get company information for branding
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, full_name')
      .eq('id', authData!.user.id)
      .single()

    // Optional: Fetch company details if you have a companies table
    // For now, we'll use default company info from the PDF generator

    // Transform database quote to PDF-compatible format
    const pdfQuoteData = {
      quote_number: quote.quote_number,
      title: quote.title || 'Construction Quote',
      client_name: quote.client_name,
      client_email: quote.client_email,
      client_phone: quote.client_phone,
      client_address: quote.client_address,
      project_address: quote.project_address,
      issue_date: quote.issue_date || quote.created_at,
      valid_until: quote.valid_until || calculateDefaultValidUntil(quote.created_at),
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
        total: item.total || (item.quantity * item.unit_price),
        category: item.category,
      })),
    }

    // Generate PDF blob
    const blob = await generateQuotePDFBlob(pdfQuoteData)

    // Convert blob to buffer for Next.js response
    const buffer = await blob.arrayBuffer()

    // Return PDF with proper headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quote-${quote.quote_number}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    })

  } catch (err: any) {
    console.error('[generate-pdf] Unexpected error:', err)
    return NextResponse.json({ error: 'Failed to generate PDF: ' + err.message }, { status: 500 })
  }
}

/**
 * Calculate default valid_until date (30 days from issue date)
 */
function calculateDefaultValidUntil(issueDate: string): string {
  const date = new Date(issueDate)
  date.setDate(date.getDate() + 30)
  return date.toISOString()
}
