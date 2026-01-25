// Financial Management Supabase Service
// Enterprise-grade invoice, payment, and expense management

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type {
  Invoice,
  InvoiceLineItem,
  Payment,
  Expense,
  FinancialStats,
  ProgressBilling,
  CashFlowForecast
} from '@/types/financial'

const supabase = createClientComponentClient()

// ============================================================================
// INVOICES
// ============================================================================

export async function getInvoices(companyId: string, filters?: {
  status?: string
  projectId?: string
  contactId?: string
  dateFrom?: string
  dateTo?: string
}) {
  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        contact:crm_contacts!invoices_contact_id_fkey (
          id,
          company_name,
          first_name,
          last_name,
          email,
          phone
        ),
        project:projects (
          id,
          name,
          status
        ),
        payments (
          id,
          payment_date,
          amount,
          payment_method,
          reference_number
        )
      `)
      .eq('company_id', companyId)
      .order('invoice_date', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId)
    }

    if (filters?.contactId) {
      query = query.eq('contact_id', filters.contactId)
    }

    if (filters?.dateFrom) {
      query = query.gte('invoice_date', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('invoice_date', filters.dateTo)
    }

    const { data, error } = await query

    if (error) throw error

    return { data: data as Invoice[], error: null }
  } catch (error: any) {
    console.error('Error fetching invoices:', error)
    return { data: null, error: error.message }
  }
}

export async function getInvoice(invoiceId: string) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        contact:crm_contacts!invoices_contact_id_fkey (
          id,
          company_name,
          first_name,
          last_name,
          email,
          phone,
          address,
          city,
          state,
          zip_code
        ),
        project:projects (
          id,
          name,
          status,
          budget,
          address,
          city,
          state,
          zip_code
        ),
        payments (
          id,
          payment_date,
          amount,
          payment_method,
          reference_number,
          notes,
          recorded_by,
          created_at
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (error) throw error

    return { data: data as Invoice, error: null }
  } catch (error: any) {
    console.error('Error fetching invoice:', error)
    return { data: null, error: error.message }
  }
}

export async function createInvoice(invoice: Partial<Invoice>) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .insert([invoice])
      .select()
      .single()

    if (error) throw error

    return { data: data as Invoice, error: null }
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    return { data: null, error: error.message }
  }
}

export async function updateInvoice(invoiceId: string, updates: Partial<Invoice>) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (error) throw error

    return { data: data as Invoice, error: null }
  } catch (error: any) {
    console.error('Error updating invoice:', error)
    return { data: null, error: error.message }
  }
}

export async function deleteInvoice(invoiceId: string) {
  try {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)

    if (error) throw error

    return { error: null }
  } catch (error: any) {
    console.error('Error deleting invoice:', error)
    return { error: error.message }
  }
}

export async function sendInvoice(invoiceId: string, emailData: {
  to: string
  subject: string
  message?: string
}) {
  try {
    // Update invoice status to 'sent'
    await updateInvoice(invoiceId, {
      status: 'sent',
      sent_at: new Date().toISOString()
    })

    // Call API to send email
    const response = await fetch('/api/invoices/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, ...emailData })
    })

    if (!response.ok) {
      throw new Error('Failed to send invoice email')
    }

    return { error: null }
  } catch (error: any) {
    console.error('Error sending invoice:', error)
    return { error: error.message }
  }
}

export async function generateNextInvoiceNumber(companyId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    if (!data || data.length === 0) {
      return `INV-${new Date().getFullYear()}-001`
    }

    // Extract number from last invoice (e.g., "INV-2026-045" -> 45)
    const lastNumber = data[0].invoice_number
    const match = lastNumber.match(/(\d+)$/)

    if (match) {
      const nextNum = parseInt(match[1]) + 1
      return `INV-${new Date().getFullYear()}-${nextNum.toString().padStart(3, '0')}`
    }

    return `INV-${new Date().getFullYear()}-001`
  } catch (error) {
    console.error('Error generating invoice number:', error)
    return `INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
  }
}

// ============================================================================
// PAYMENTS
// ============================================================================

export async function getPayments(companyId: string, invoiceId?: string) {
  try {
    let query = supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices (
          id,
          invoice_number,
          total_amount,
          contact:crm_contacts!invoices_contact_id_fkey (
            company_name,
            first_name,
            last_name
          )
        )
      `)
      .eq('company_id', companyId)
      .order('payment_date', { ascending: false })

    if (invoiceId) {
      query = query.eq('invoice_id', invoiceId)
    }

    const { data, error } = await query

    if (error) throw error

    return { data: data as Payment[], error: null }
  } catch (error: any) {
    console.error('Error fetching payments:', error)
    return { data: null, error: error.message }
  }
}

export async function recordPayment(payment: Partial<Payment>) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .insert([payment])
      .select()
      .single()

    if (error) throw error

    return { data: data as Payment, error: null }
  } catch (error: any) {
    console.error('Error recording payment:', error)
    return { data: null, error: error.message }
  }
}

export async function deletePayment(paymentId: string) {
  try {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)

    if (error) throw error

    return { error: null }
  } catch (error: any) {
    console.error('Error deleting payment:', error)
    return { error: error.message }
  }
}

// ============================================================================
// EXPENSES
// ============================================================================

export async function getExpenses(companyId: string, filters?: {
  projectId?: string
  category?: string
  dateFrom?: string
  dateTo?: string
  billableOnly?: boolean
}) {
  try {
    let query = supabase
      .from('expenses')
      .select(`
        *,
        project:projects (
          id,
          name
        )
      `)
      .eq('company_id', companyId)
      .order('date', { ascending: false })

    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId)
    }

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.dateFrom) {
      query = query.gte('date', filters.dateFrom)
    }

    if (filters?.dateTo) {
      query = query.lte('date', filters.dateTo)
    }

    if (filters?.billableOnly) {
      query = query.eq('billable_to_client', true)
    }

    const { data, error } = await query

    if (error) throw error

    return { data: data as Expense[], error: null }
  } catch (error: any) {
    console.error('Error fetching expenses:', error)
    return { data: null, error: error.message }
  }
}

export async function createExpense(expense: Partial<Expense>) {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert([expense])
      .select()
      .single()

    if (error) throw error

    return { data: data as Expense, error: null }
  } catch (error: any) {
    console.error('Error creating expense:', error)
    return { data: null, error: error.message }
  }
}

export async function updateExpense(expenseId: string, updates: Partial<Expense>) {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', expenseId)
      .select()
      .single()

    if (error) throw error

    return { data: data as Expense, error: null }
  } catch (error: any) {
    console.error('Error updating expense:', error)
    return { data: null, error: error.message }
  }
}

export async function deleteExpense(expenseId: string) {
  try {
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) throw error

    return { error: null }
  } catch (error: any) {
    console.error('Error deleting expense:', error)
    return { error: error.message }
  }
}

// ============================================================================
// FINANCIAL STATISTICS
// ============================================================================

export async function getFinancialStats(companyId: string): Promise<{
  data: FinancialStats | null
  error: string | null
}> {
  try {
    // Call Supabase function for complex stats
    const { data, error } = await supabase.rpc('get_financial_stats', {
      p_company_id: companyId
    })

    if (error) throw error

    return { data: data as FinancialStats, error: null }
  } catch (error: any) {
    console.error('Error fetching financial stats:', error)
    return { data: null, error: error.message }
  }
}

export async function getAgingReport(companyId: string) {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', companyId)
      .in('status', ['sent', 'partial', 'overdue'])
      .order('due_date', { ascending: true })

    if (error) throw error

    const now = new Date()
    const aging = {
      current: [] as Invoice[],
      aging_31_60: [] as Invoice[],
      aging_61_90: [] as Invoice[],
      aging_90_plus: [] as Invoice[]
    }

    data.forEach((invoice: Invoice) => {
      const dueDate = new Date(invoice.due_date)
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

      if (daysOverdue <= 30) {
        aging.current.push(invoice)
      } else if (daysOverdue <= 60) {
        aging.aging_31_60.push(invoice)
      } else if (daysOverdue <= 90) {
        aging.aging_61_90.push(invoice)
      } else {
        aging.aging_90_plus.push(invoice)
      }
    })

    return { data: aging, error: null }
  } catch (error: any) {
    console.error('Error fetching aging report:', error)
    return { data: null, error: error.message }
  }
}

// ============================================================================
// REAL-TIME SUBSCRIPTIONS
// ============================================================================

export function subscribeToInvoices(
  companyId: string,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel('invoices-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'invoices',
        filter: `company_id=eq.${companyId}`
      },
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToPayments(
  companyId: string,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel('payments-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'payments',
        filter: `company_id=eq.${companyId}`
      },
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export function subscribeToExpenses(
  companyId: string,
  callback: (payload: any) => void
) {
  const channel = supabase
    .channel('expenses-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `company_id=eq.${companyId}`
      },
      callback
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
