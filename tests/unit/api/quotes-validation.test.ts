import { describe, it, expect } from 'vitest'
import { z } from 'zod'

// ─── INLINE SCHEMAS (mirrors what's in app/api/quotes/route.ts) ─────────────
// Keeping these local so tests don't import Next.js server internals.

const CreateQuoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  client_id: z.string().uuid('Invalid client ID').optional().nullable(),
  project_id: z.string().uuid('Invalid project ID').optional().nullable(),
  status: z.enum(['draft', 'sent', 'approved', 'rejected', 'expired']).default('draft'),
  subtotal: z.number().min(0, 'Subtotal cannot be negative'),
  tax_rate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100').default(0),
  discount_amount: z.number().min(0, 'Discount cannot be negative').default(0),
  total_amount: z.number().min(0, 'Total cannot be negative'),
  currency: z.enum(['USD', 'CAD', 'EUR', 'GBP']).default('USD'),
  valid_until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format')
    .optional()
    .nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

const GetQuotesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['draft', 'sent', 'approved', 'rejected', 'expired', 'all']).default('all'),
  search: z.string().max(100).optional(),
})

// ─── CREATE QUOTE VALIDATION ─────────────────────────────────────────────────

describe('CreateQuoteSchema', () => {
  const validQuote = {
    title: 'Roof Renovation Quote',
    subtotal: 50000,
    tax_rate: 8,
    discount_amount: 0,
    total_amount: 54000,
  }

  it('accepts a valid quote', () => {
    const result = CreateQuoteSchema.safeParse(validQuote)
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = CreateQuoteSchema.safeParse({ ...validQuote, title: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('title')
  })

  it('rejects negative subtotal', () => {
    const result = CreateQuoteSchema.safeParse({ ...validQuote, subtotal: -100 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('subtotal')
  })

  it('rejects tax rate above 100', () => {
    const result = CreateQuoteSchema.safeParse({ ...validQuote, tax_rate: 150 })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('tax_rate')
  })

  it('rejects invalid status value', () => {
    const result = CreateQuoteSchema.safeParse({ ...validQuote, status: 'pending' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date format', () => {
    const result = CreateQuoteSchema.safeParse({ ...validQuote, valid_until: '15-03-2026' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('valid_until')
  })

  it('accepts valid date format YYYY-MM-DD', () => {
    const result = CreateQuoteSchema.safeParse({ ...validQuote, valid_until: '2026-12-31' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid client_id UUID', () => {
    const result = CreateQuoteSchema.safeParse({ ...validQuote, client_id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('accepts null client_id', () => {
    const result = CreateQuoteSchema.safeParse({ ...validQuote, client_id: null })
    expect(result.success).toBe(true)
  })

  it('defaults status to draft', () => {
    const result = CreateQuoteSchema.safeParse(validQuote)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.status).toBe('draft')
  })

  it('defaults currency to USD', () => {
    const result = CreateQuoteSchema.safeParse(validQuote)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.currency).toBe('USD')
  })

  it('accepts all valid currencies', () => {
    for (const currency of ['USD', 'CAD', 'EUR', 'GBP']) {
      const result = CreateQuoteSchema.safeParse({ ...validQuote, currency })
      expect(result.success).toBe(true)
    }
  })

  it('rejects unsupported currency', () => {
    const result = CreateQuoteSchema.safeParse({ ...validQuote, currency: 'AUD' })
    expect(result.success).toBe(false)
  })

  it('rejects notes over 2000 characters', () => {
    const result = CreateQuoteSchema.safeParse({ ...validQuote, notes: 'x'.repeat(2001) })
    expect(result.success).toBe(false)
  })
})

// ─── GET QUOTES QUERY VALIDATION ─────────────────────────────────────────────

describe('GetQuotesQuerySchema', () => {
  it('uses defaults when no params provided', () => {
    const result = GetQuotesQuerySchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
      expect(result.data.status).toBe('all')
    }
  })

  it('coerces string numbers to integers', () => {
    const result = GetQuotesQuerySchema.safeParse({ page: '3', limit: '50' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(3)
      expect(result.data.limit).toBe(50)
    }
  })

  it('rejects page 0 or negative', () => {
    expect(GetQuotesQuerySchema.safeParse({ page: '0' }).success).toBe(false)
    expect(GetQuotesQuerySchema.safeParse({ page: '-1' }).success).toBe(false)
  })

  it('rejects limit above 100', () => {
    const result = GetQuotesQuerySchema.safeParse({ limit: '200' })
    expect(result.success).toBe(false)
  })

  it('accepts all valid status filters', () => {
    const statuses = ['draft', 'sent', 'approved', 'rejected', 'expired', 'all']
    for (const status of statuses) {
      const result = GetQuotesQuerySchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })

  it('rejects unknown status filter', () => {
    const result = GetQuotesQuerySchema.safeParse({ status: 'cancelled' })
    expect(result.success).toBe(false)
  })
})
