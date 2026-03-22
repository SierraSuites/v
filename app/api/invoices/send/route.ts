// API Route: Send Invoice Email with PDF Attachment
// POST /api/invoices/send

import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { InvoicePDF } from '@/components/pdf/InvoicePDF'
import { Invoice } from '@/types/financial'
import { sendInvoiceEmail, InvoiceEmailData } from '@/lib/email/service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, to, subject, message } = body

    if (!invoiceId || !to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: invoiceId, to, subject' },
        { status: 400 }
      )
    }

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

    const hasPermission = permissions?.permissions?.canManageFinances || false

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Forbidden - requires canManageFinances permission' },
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

    // Generate PDF as buffer
    const pdfBuffer = await renderToBuffer(
      InvoicePDF({
        invoice: invoice as Invoice,
        companyInfo
      })
    )

    // Prepare email data
    const clientName = invoice.contact?.company_name ||
      `${invoice.contact?.first_name || ''} ${invoice.contact?.last_name || ''}`.trim() ||
      'Valued Client'

    const emailData: InvoiceEmailData = {
      invoiceNumber: invoice.invoice_number,
      clientName,
      clientEmail: to,
      totalAmount: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(invoice.balance_due || invoice.total_amount || 0),
      dueDate: invoice.due_date
        ? new Date(invoice.due_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Upon receipt',
      companyName: companyInfo.name,
      companyEmail: companyInfo.email || process.env.EMAIL_FROM_ADDRESS || '',
      companyPhone: companyInfo.phone || '',
    }

    // Send email with PDF attachment
    const emailResult = await sendInvoiceEmail(emailData, pdfBuffer)

    if (!emailResult.success) {
      return NextResponse.json(
        {
          error: 'Failed to send invoice email',
          details: emailResult.error,
        },
        { status: 500 }
      )
    }

    // Update invoice email tracking
    await supabase
      .from('invoices')
      .update({
        last_email_sent_at: new Date().toISOString(),
        email_sent_count: (invoice.email_sent_count || 0) + 1,
        status: invoice.status === 'draft' ? 'sent' : invoice.status
      })
      .eq('id', invoiceId)

    return NextResponse.json({
      success: true,
      message: 'Invoice email sent successfully',
      invoiceNumber: invoice.invoice_number
    })
  } catch (error: any) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { error: 'Failed to send invoice email', details: error.message },
      { status: 500 }
    )
  }
}
