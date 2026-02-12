// Financial Management Supabase Service
// Enterprise-grade invoice, payment, and expense management
// WITH RBAC PERMISSION ENFORCEMENT

import { createClient } from './client'
import { permissionService } from '@/lib/permissions'
import type {
  Invoice,
  InvoiceLineItem,
  Payment,
  Expense,
  FinancialStats,
  ProgressBilling,
  CashFlowForecast
} from '@/types/financial'

// Lazy initialization pattern to avoid build-time issues
let supabase: ReturnType<typeof createClient> | null = null
function getSupabase() {
  if (!supabase) {
    supabase = createClient()
  }
  return supabase
}

// ============================================================================
// PERMISSION GUARD HELPERS
// ============================================================================

/**
 * Get authenticated user and their company ID
 */
async function getAuthContext(): Promise<{
  userId: string
  companyId: string
} | null> {
  try {
    const supabase = getSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.error('Authentication required')
      return null
    }

    // Get user's company from profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      console.error('User profile or company not found')
      return null
    }

    return {
      userId: user.id,
      companyId: profile.company_id
    }
  } catch (error) {
    console.error('Error getting auth context:', error)
    return null
  }
}

/**
 * Check if user has required permission
 */
async function checkPermission(
  permission: 'canManageFinances' | 'canViewFinancials' | 'canApproveExpenses',
  userId: string,
  companyId: string
): Promise<boolean> {
  try {
    const hasPermission = await permissionService.hasPermissionDB(
      userId,
      companyId,
      permission
    )

    // Log permission check for audit trail
    await permissionService.logPermissionCheck(
      `financial_${permission}`,
      'financial_operation',
      companyId,
      hasPermission,
      hasPermission ? undefined : 'Insufficient permissions'
    )

    return hasPermission
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

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
    // RBAC: Check view financials permission
    const authContext = await getAuthContext()
    if (!authContext) {
      return { data: null, error: 'Authentication required' }
    }

    const hasPermission = await checkPermission(
      'canViewFinancials',
      authContext.userId,
      authContext.companyId
    )

    if (!hasPermission) {
      return { data: null, error: 'Permission denied: canViewFinancials required' }
    }

    // Verify company ID matches user's company
    if (companyId !== authContext.companyId) {
      return { data: null, error: 'Access denied: Company mismatch' }
    }

    const supabase = getSupabase()
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
    // RBAC: Check view financials permission
    const authContext = await getAuthContext()
    if (!authContext) {
      return { data: null, error: 'Authentication required' }
    }

    const hasPermission = await checkPermission(
      'canViewFinancials',
      authContext.userId,
      authContext.companyId
    )

    if (!hasPermission) {
      return { data: null, error: 'Permission denied: canViewFinancials required' }
    }

    const supabase = getSupabase()
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

    // Verify invoice belongs to user's company
    if (data && data.company_id !== authContext.companyId) {
      return { data: null, error: 'Access denied: Invoice not found in your company' }
    }

    return { data: data as Invoice, error: null }
  } catch (error: any) {
    console.error('Error fetching invoice:', error)
    return { data: null, error: error.message }
  }
}

export async function createInvoice(invoice: Partial<Invoice>) {
  try {
    // RBAC: Check manage finances permission
    const authContext = await getAuthContext()
    if (!authContext) {
      return { data: null, error: 'Authentication required' }
    }

    const hasPermission = await checkPermission(
      'canManageFinances',
      authContext.userId,
      authContext.companyId
    )

    if (!hasPermission) {
      return { data: null, error: 'Permission denied: canManageFinances required' }
    }

    // Ensure invoice is created for user's company
    const invoiceData = {
      ...invoice,
      company_id: authContext.companyId,
      created_by: authContext.userId
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('invoices')
      .insert([invoiceData])
      .select()
      .single()

    if (error) throw error

    // Log the operation
    await permissionService.logPermissionCheck(
      'create_invoice',
      'invoice',
      data.id,
      true
    )

    return { data: data as Invoice, error: null }
  } catch (error: any) {
    console.error('Error creating invoice:', error)
    return { data: null, error: error.message }
  }
}

export async function updateInvoice(invoiceId: string, updates: Partial<Invoice>) {
  try {
    // RBAC: Check manage finances permission
    const authContext = await getAuthContext()
    if (!authContext) {
      return { data: null, error: 'Authentication required' }
    }

    const hasPermission = await checkPermission(
      'canManageFinances',
      authContext.userId,
      authContext.companyId
    )

    if (!hasPermission) {
      return { data: null, error: 'Permission denied: canManageFinances required' }
    }

    const supabase = getSupabase()

    // Verify invoice belongs to user's company
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('company_id')
      .eq('id', invoiceId)
      .single()

    if (!existingInvoice || existingInvoice.company_id !== authContext.companyId) {
      return { data: null, error: 'Access denied: Invoice not found in your company' }
    }

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

    // Log the operation
    await permissionService.logPermissionCheck(
      'update_invoice',
      'invoice',
      invoiceId,
      true
    )

    return { data: data as Invoice, error: null }
  } catch (error: any) {
    console.error('Error updating invoice:', error)
    return { data: null, error: error.message }
  }
}

export async function deleteInvoice(invoiceId: string) {
  try {
    // RBAC: Check manage finances permission
    const authContext = await getAuthContext()
    if (!authContext) {
      return { error: 'Authentication required' }
    }

    const hasPermission = await checkPermission(
      'canManageFinances',
      authContext.userId,
      authContext.companyId
    )

    if (!hasPermission) {
      return { error: 'Permission denied: canManageFinances required' }
    }

    const supabase = getSupabase()

    // Verify invoice belongs to user's company
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('company_id, status')
      .eq('id', invoiceId)
      .single()

    if (!existingInvoice || existingInvoice.company_id !== authContext.companyId) {
      return { error: 'Access denied: Invoice not found in your company' }
    }

    // Prevent deletion of paid invoices
    if (existingInvoice.status === 'paid') {
      return { error: 'Cannot delete paid invoices. Consider voiding instead.' }
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)

    if (error) throw error

    // Log the operation
    await permissionService.logPermissionCheck(
      'delete_invoice',
      'invoice',
      invoiceId,
      true
    )

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
    const supabase = getSupabase()
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
    // RBAC: Check view financials permission
    const authContext = await getAuthContext()
    if (!authContext) {
      return { data: null, error: 'Authentication required' }
    }

    const hasPermission = await checkPermission(
      'canViewFinancials',
      authContext.userId,
      authContext.companyId
    )

    if (!hasPermission) {
      return { data: null, error: 'Permission denied: canViewFinancials required' }
    }

    // Verify company ID matches user's company
    if (companyId !== authContext.companyId) {
      return { data: null, error: 'Access denied: Company mismatch' }
    }

    const supabase = getSupabase()
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
    // RBAC: Check manage finances permission
    const authContext = await getAuthContext()
    if (!authContext) {
      return { data: null, error: 'Authentication required' }
    }

    const hasPermission = await checkPermission(
      'canManageFinances',
      authContext.userId,
      authContext.companyId
    )

    if (!hasPermission) {
      return { data: null, error: 'Permission denied: canManageFinances required' }
    }

    // Ensure payment is created for user's company
    const paymentData = {
      ...payment,
      company_id: authContext.companyId,
      recorded_by: authContext.userId
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('payments')
      .insert([paymentData])
      .select()
      .single()

    if (error) throw error

    // Log the operation
    await permissionService.logPermissionCheck(
      'record_payment',
      'payment',
      data.id,
      true
    )

    return { data: data as Payment, error: null }
  } catch (error: any) {
    console.error('Error recording payment:', error)
    return { data: null, error: error.message }
  }
}

export async function deletePayment(paymentId: string) {
  try {
    const supabase = getSupabase()
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
    // RBAC: Check view financials permission
    const authContext = await getAuthContext()
    if (!authContext) {
      return { data: null, error: 'Authentication required' }
    }

    const hasPermission = await checkPermission(
      'canViewFinancials',
      authContext.userId,
      authContext.companyId
    )

    if (!hasPermission) {
      return { data: null, error: 'Permission denied: canViewFinancials required' }
    }

    // Verify company ID matches user's company
    if (companyId !== authContext.companyId) {
      return { data: null, error: 'Access denied: Company mismatch' }
    }

    const supabase = getSupabase()
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
    // RBAC: Check manage finances permission
    const authContext = await getAuthContext()
    if (!authContext) {
      return { data: null, error: 'Authentication required' }
    }

    const hasPermission = await checkPermission(
      'canManageFinances',
      authContext.userId,
      authContext.companyId
    )

    if (!hasPermission) {
      return { data: null, error: 'Permission denied: canManageFinances required' }
    }

    // Ensure expense is created for user's company
    const expenseData = {
      ...expense,
      company_id: authContext.companyId,
      created_by: authContext.userId
    }

    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('expenses')
      .insert([expenseData])
      .select()
      .single()

    if (error) throw error

    // Log the operation
    await permissionService.logPermissionCheck(
      'create_expense',
      'expense',
      data.id,
      true
    )

    return { data: data as Expense, error: null }
  } catch (error: any) {
    console.error('Error creating expense:', error)
    return { data: null, error: error.message }
  }
}

export async function updateExpense(expenseId: string, updates: Partial<Expense>) {
  try {
    // RBAC: Check manage finances OR approve expenses permission
    const authContext = await getAuthContext()
    if (!authContext) {
      return { data: null, error: 'Authentication required' }
    }

    const supabase = getSupabase()

    // Verify expense belongs to user's company
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('company_id, approval_status')
      .eq('id', expenseId)
      .single()

    if (!existingExpense || existingExpense.company_id !== authContext.companyId) {
      return { data: null, error: 'Access denied: Expense not found in your company' }
    }

    // If updating approval_status, need canApproveExpenses
    if ('approval_status' in updates && updates.approval_status) {
      const canApprove = await checkPermission(
        'canApproveExpenses',
        authContext.userId,
        authContext.companyId
      )

      if (!canApprove) {
        return { data: null, error: 'Permission denied: canApproveExpenses required' }
      }
    } else {
      // For other updates, need canManageFinances
      const canManage = await checkPermission(
        'canManageFinances',
        authContext.userId,
        authContext.companyId
      )

      if (!canManage) {
        return { data: null, error: 'Permission denied: canManageFinances required' }
      }
    }

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

    // Log the operation
    await permissionService.logPermissionCheck(
      ('approval_status' in updates && updates.approval_status) ? 'approve_expense' : 'update_expense',
      'expense',
      expenseId,
      true
    )

    return { data: data as Expense, error: null }
  } catch (error: any) {
    console.error('Error updating expense:', error)
    return { data: null, error: error.message }
  }
}

export async function deleteExpense(expenseId: string) {
  try {
    // RBAC: Check manage finances permission
    const authContext = await getAuthContext()
    if (!authContext) {
      return { error: 'Authentication required' }
    }

    const hasPermission = await checkPermission(
      'canManageFinances',
      authContext.userId,
      authContext.companyId
    )

    if (!hasPermission) {
      return { error: 'Permission denied: canManageFinances required' }
    }

    const supabase = getSupabase()

    // Verify expense belongs to user's company
    const { data: existingExpense } = await supabase
      .from('expenses')
      .select('company_id, approval_status')
      .eq('id', expenseId)
      .single()

    if (!existingExpense || existingExpense.company_id !== authContext.companyId) {
      return { error: 'Access denied: Expense not found in your company' }
    }

    // Prevent deletion of approved expenses
    if (existingExpense.approval_status === 'approved') {
      return { error: 'Cannot delete approved expenses. Consider rejecting first.' }
    }

    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', expenseId)

    if (error) throw error

    // Log the operation
    await permissionService.logPermissionCheck(
      'delete_expense',
      'expense',
      expenseId,
      true
    )

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
    // RBAC: Check view financials permission
    const authContext = await getAuthContext()
    if (!authContext) {
      return { data: null, error: 'Authentication required' }
    }

    const hasPermission = await checkPermission(
      'canViewFinancials',
      authContext.userId,
      authContext.companyId
    )

    if (!hasPermission) {
      return { data: null, error: 'Permission denied: canViewFinancials required' }
    }

    // Verify company ID matches user's company
    if (companyId !== authContext.companyId) {
      return { data: null, error: 'Access denied: Company mismatch' }
    }

    const supabase = getSupabase()
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
    const supabase = getSupabase()
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
  const supabase = getSupabase()
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
  const supabase = getSupabase()
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
  const supabase = getSupabase()
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
