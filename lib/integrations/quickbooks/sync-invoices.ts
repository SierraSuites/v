/**
 * QuickBooks Invoice Sync Service
 *
 * Handles syncing invoices between The Sierra Suites and QuickBooks
 */

import { createClient } from '@/lib/supabase/server'
import type { Invoice } from '@/types/financial'

interface QuickBooksInvoice {
  Id?: string
  DocNumber: string
  TxnDate: string
  DueDate: string
  CustomerRef: {
    value: string
    name?: string
  }
  Line: Array<{
    DetailType: 'SalesItemLineDetail'
    Amount: number
    SalesItemLineDetail: {
      ItemRef: {
        value: string
        name: string
      }
      Qty?: number
      UnitPrice?: number
    }
    Description?: string
  }>
  TotalAmt: number
  Balance: number
  SyncToken?: string
}

/**
 * Convert Sierra Suites invoice to QuickBooks format
 */
function convertToQuickBooksInvoice(
  invoice: Invoice,
  customerRefId: string
): QuickBooksInvoice {
  // Parse line items from invoice
  const lineItems = invoice.line_items || []

  return {
    DocNumber: invoice.invoice_number,
    TxnDate: invoice.invoice_date,
    DueDate: invoice.due_date,
    CustomerRef: {
      value: customerRefId,
    },
    Line: lineItems.map((item: any) => ({
      DetailType: 'SalesItemLineDetail',
      Amount: item.total || item.amount || 0,
      SalesItemLineDetail: {
        ItemRef: {
          value: '1', // Default service item - should be mapped
          name: item.description || 'Service',
        },
        Qty: item.quantity || 1,
        UnitPrice: item.rate || item.unit_price || 0,
      },
      Description: item.description || '',
    })),
    TotalAmt: invoice.total_amount,
    Balance: invoice.balance_due || invoice.total_amount,
  }
}

/**
 * Sync invoice to QuickBooks
 *
 * @param invoiceId - Sierra Suites invoice ID
 * @param accessToken - QuickBooks access token
 * @param realmId - QuickBooks company ID
 * @returns Sync result
 */
export async function syncInvoiceToQuickBooks(
  invoiceId: string,
  accessToken: string,
  realmId: string
) {
  try {
    const supabase = await createClient()

    // Get invoice from database
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, contact:crm_contacts(id, first_name, last_name, company_name, quickbooks_customer_id)')
      .eq('id', invoiceId)
      .single()

    if (fetchError || !invoice) {
      return {
        success: false,
        error: 'Invoice not found',
      }
    }

    // Check if customer exists in QuickBooks
    const customerRefId = invoice.contact?.quickbooks_customer_id

    if (!customerRefId) {
      return {
        success: false,
        error: 'Customer not synced to QuickBooks. Please sync customer first.',
      }
    }

    // Convert to QuickBooks format
    const qbInvoice = convertToQuickBooksInvoice(invoice as Invoice, customerRefId)

    // Check if invoice already exists in QuickBooks
    const existingQBInvoiceId = invoice.quickbooks_invoice_id

    let response

    if (existingQBInvoiceId) {
      // Update existing invoice
      response = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/invoice?operation=update`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            ...qbInvoice,
            Id: existingQBInvoiceId,
            SyncToken: invoice.quickbooks_sync_token || '0',
          }),
        }
      )
    } else {
      // Create new invoice
      response = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/invoice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(qbInvoice),
        }
      )
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[QuickBooks Sync] Invoice sync error:', errorData)
      return {
        success: false,
        error: errorData.Fault?.Error?.[0]?.Message || 'Failed to sync invoice',
      }
    }

    const result = await response.json()
    const qbInvoiceData = result.Invoice

    // Update local invoice with QuickBooks IDs
    await supabase
      .from('invoices')
      .update({
        quickbooks_invoice_id: qbInvoiceData.Id,
        quickbooks_sync_token: qbInvoiceData.SyncToken,
        last_quickbooks_sync_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)

    return {
      success: true,
      quickbooksId: qbInvoiceData.Id,
      message: existingQBInvoiceId
        ? 'Invoice updated in QuickBooks'
        : 'Invoice created in QuickBooks',
    }
  } catch (error: any) {
    console.error('[QuickBooks Sync] Unexpected error:', error)
    return {
      success: false,
      error: error.message || 'Unexpected error during sync',
    }
  }
}

/**
 * Fetch invoice from QuickBooks and update local database
 *
 * @param quickbooksInvoiceId - QuickBooks invoice ID
 * @param accessToken - QuickBooks access token
 * @param realmId - QuickBooks company ID
 */
export async function pullInvoiceFromQuickBooks(
  quickbooksInvoiceId: string,
  accessToken: string,
  realmId: string
) {
  try {
    const response = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${realmId}/invoice/${quickbooksInvoiceId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      return {
        success: false,
        error: errorData.Fault?.Error?.[0]?.Message || 'Failed to fetch invoice',
      }
    }

    const result = await response.json()
    const qbInvoice: QuickBooksInvoice = result.Invoice

    // TODO: Update local database with QuickBooks data
    // This requires mapping QuickBooks fields back to Sierra Suites schema

    return {
      success: true,
      data: qbInvoice,
    }
  } catch (error: any) {
    console.error('[QuickBooks Pull] Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to pull invoice from QuickBooks',
    }
  }
}

/**
 * Sync all unpaid invoices to QuickBooks
 *
 * @param companyId - Sierra Suites company ID
 * @param accessToken - QuickBooks access token
 * @param realmId - QuickBooks company ID
 */
export async function syncAllInvoices(
  companyId: string,
  accessToken: string,
  realmId: string
) {
  try {
    const supabase = await createClient()

    // Get all invoices that need syncing
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('id, invoice_number, status, last_quickbooks_sync_at')
      .eq('company_id', companyId)
      .in('status', ['sent', 'overdue', 'partial'])
      .order('created_at', { ascending: false })

    if (error || !invoices) {
      return {
        success: false,
        error: 'Failed to fetch invoices',
      }
    }

    const results = {
      total: invoices.length,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Sync each invoice
    for (const invoice of invoices) {
      const result = await syncInvoiceToQuickBooks(invoice.id, accessToken, realmId)

      if (result.success) {
        results.synced++
      } else {
        results.failed++
        results.errors.push(`${invoice.invoice_number}: ${result.error}`)
      }
    }

    return {
      success: true,
      results,
    }
  } catch (error: any) {
    console.error('[QuickBooks Bulk Sync] Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to sync invoices',
    }
  }
}
