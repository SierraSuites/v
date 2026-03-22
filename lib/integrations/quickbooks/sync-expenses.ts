/**
 * QuickBooks Expense Sync Service
 *
 * Handles syncing expenses between The Sierra Suites and QuickBooks
 */

import { createClient } from '@/lib/supabase/server'

interface QuickBooksExpense {
  Id?: string
  TxnDate: string
  AccountRef: {
    value: string // Expense account ID in QuickBooks
    name?: string
  }
  EntityRef?: {
    value: string // Vendor ID
    name?: string
  }
  TotalAmt: number
  Line: Array<{
    DetailType: 'AccountBasedExpenseLineDetail'
    Amount: number
    AccountBasedExpenseLineDetail: {
      AccountRef: {
        value: string
        name?: string
      }
    }
    Description?: string
  }>
  PaymentType?: 'Cash' | 'Check' | 'CreditCard'
  PrivateNote?: string
  SyncToken?: string
}

/**
 * Convert Sierra Suites expense to QuickBooks format
 */
function convertToQuickBooksExpense(
  expense: any,
  accountRefId: string = '1' // Default expense account
): QuickBooksExpense {
  const paymentMethodMap: Record<string, 'Cash' | 'Check' | 'CreditCard'> = {
    'cash': 'Cash',
    'check': 'Check',
    'credit_card': 'CreditCard',
    'debit_card': 'CreditCard',
  }

  return {
    TxnDate: expense.expense_date,
    AccountRef: {
      value: accountRefId,
    },
    TotalAmt: expense.amount,
    Line: [
      {
        DetailType: 'AccountBasedExpenseLineDetail',
        Amount: expense.amount,
        AccountBasedExpenseLineDetail: {
          AccountRef: {
            value: accountRefId,
          },
        },
        Description: expense.description || expense.category || '',
      },
    ],
    PaymentType: paymentMethodMap[expense.payment_method] || 'Cash',
    PrivateNote: expense.notes || undefined,
  }
}

/**
 * Sync expense to QuickBooks
 *
 * @param expenseId - Sierra Suites expense ID
 * @param accessToken - QuickBooks access token
 * @param realmId - QuickBooks company ID
 * @returns Sync result
 */
export async function syncExpenseToQuickBooks(
  expenseId: string,
  accessToken: string,
  realmId: string
) {
  try {
    const supabase = await createClient()

    // Get expense from database
    const { data: expense, error: fetchError } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', expenseId)
      .single()

    if (fetchError || !expense) {
      return {
        success: false,
        error: 'Expense not found',
      }
    }

    // Convert to QuickBooks format
    const qbExpense = convertToQuickBooksExpense(expense)

    // Check if expense already exists in QuickBooks
    const existingQBExpenseId = expense.quickbooks_expense_id

    let response

    if (existingQBExpenseId) {
      // Update existing expense
      response = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/purchase?operation=update`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            ...qbExpense,
            Id: existingQBExpenseId,
            SyncToken: expense.quickbooks_sync_token || '0',
          }),
        }
      )
    } else {
      // Create new expense (Purchase in QuickBooks)
      response = await fetch(
        `https://quickbooks.api.intuit.com/v3/company/${realmId}/purchase`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(qbExpense),
        }
      )
    }

    if (!response.ok) {
      const errorData = await response.json()
      console.error('[QuickBooks Sync] Expense sync error:', errorData)
      return {
        success: false,
        error: errorData.Fault?.Error?.[0]?.Message || 'Failed to sync expense',
      }
    }

    const result = await response.json()
    const qbExpenseData = result.Purchase

    // Update local expense with QuickBooks IDs
    await supabase
      .from('expenses')
      .update({
        quickbooks_expense_id: qbExpenseData.Id,
        quickbooks_sync_token: qbExpenseData.SyncToken,
        last_quickbooks_sync_at: new Date().toISOString(),
      })
      .eq('id', expenseId)

    return {
      success: true,
      quickbooksId: qbExpenseData.Id,
      message: existingQBExpenseId
        ? 'Expense updated in QuickBooks'
        : 'Expense created in QuickBooks',
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
 * Sync all expenses to QuickBooks
 *
 * @param companyId - Sierra Suites company ID
 * @param accessToken - QuickBooks access token
 * @param realmId - QuickBooks company ID
 */
export async function syncAllExpenses(
  companyId: string,
  accessToken: string,
  realmId: string
) {
  try {
    const supabase = await createClient()

    // Get all expenses that need syncing
    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('id, description, amount, last_quickbooks_sync_at')
      .eq('company_id', companyId)
      .order('expense_date', { ascending: false })
      .limit(100) // Limit to prevent timeouts

    if (error || !expenses) {
      return {
        success: false,
        error: 'Failed to fetch expenses',
      }
    }

    const results = {
      total: expenses.length,
      synced: 0,
      failed: 0,
      errors: [] as string[],
    }

    // Sync each expense
    for (const expense of expenses) {
      const result = await syncExpenseToQuickBooks(expense.id, accessToken, realmId)

      if (result.success) {
        results.synced++
      } else {
        results.failed++
        results.errors.push(`${expense.description}: ${result.error}`)
      }

      // Rate limiting - wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return {
      success: true,
      results,
    }
  } catch (error: any) {
    console.error('[QuickBooks Bulk Sync] Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to sync expenses',
    }
  }
}

/**
 * Pull expenses from QuickBooks and create in local database
 *
 * @param companyId - Sierra Suites company ID
 * @param accessToken - QuickBooks access token
 * @param realmId - QuickBooks company ID
 * @param startDate - Optional start date filter
 */
export async function pullExpensesFromQuickBooks(
  companyId: string,
  accessToken: string,
  realmId: string,
  startDate?: string
) {
  try {
    // Build query
    let query = "SELECT * FROM Purchase WHERE EntityRef.Type = 'Vendor'"

    if (startDate) {
      query += ` AND MetaData.CreateTime >= '${startDate}'`
    }

    query += ' MAXRESULTS 100'

    const response = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`,
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
        error: errorData.Fault?.Error?.[0]?.Message || 'Failed to fetch expenses',
      }
    }

    const result = await response.json()
    const qbExpenses = result.QueryResponse?.Purchase || []

    // TODO: Create expenses in local database
    // This requires mapping QuickBooks Purchase records to Sierra Suites expense schema

    return {
      success: true,
      count: qbExpenses.length,
      data: qbExpenses,
    }
  } catch (error: any) {
    console.error('[QuickBooks Pull] Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to pull expenses from QuickBooks',
    }
  }
}
