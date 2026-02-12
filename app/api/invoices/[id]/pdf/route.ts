// API Route: Generate Invoice PDF
// GET /api/invoices/[id]/pdf

import { NextRequest, NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'
import { Invoice } from '@/types/financial'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params

    // Create Supabase client
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user profile with company
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id, companies(name, address, city, state, zip, phone, email, website)')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Check permissions
    const { data: permissions } = await supabase
      .from('user_permissions')
      .select('permissions')
      .eq('user_id', user.id)
      .eq('company_id', profile.company_id)
      .single()

    const hasPermission = permissions?.permissions?.canViewFinancials || false

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden - requires canViewFinancials permission' },
        { status: 403 }
      )
    }

    // Fetch invoice with relations
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        contact:crm_contacts(id, company_name, first_name, last_name, email, phone),
        project:projects(id, name)
      `)
      .eq('id', invoiceId)
      .eq('company_id', profile.company_id)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      )
    }

    // Prepare company info
    const company = Array.isArray(profile.companies)
      ? profile.companies[0]
      : profile.companies

    const companyInfo = {
      name: company?.name || 'Your Company',
      address: company?.address || undefined,
      city: company?.city || undefined,
      state: company?.state || undefined,
      zip: company?.zip || undefined,
      phone: company?.phone || undefined,
      email: company?.email || undefined,
      website: company?.website || undefined,
    }

    // Generate PDF
    const pdfStream = await renderToStream(
      InvoicePDF({
        invoice: invoice as Invoice,
        companyInfo
      })
    )

    // Convert stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.from(chunk))
    }
    const buffer = Buffer.concat(chunks)

    // Return PDF
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoice_number}.pdf"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: error.message },
      { status: 500 }
    )
  }
}
