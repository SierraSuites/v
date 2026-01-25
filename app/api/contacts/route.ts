// ============================================================
// API ROUTE: /api/contacts
// Handles GET (list contacts) and POST (create contact)
// SECURITY: Full authentication, validation, and rate limiting
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getContacts, createContact } from '@/lib/supabase/quotes'
import { requireAuth, rateLimit, addRateLimitHeaders, handleApiError } from '@/lib/api/auth-middleware'

export const dynamic = 'force-dynamic'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for GET query parameters
 */
const GetContactsQuerySchema = z.object({
  type: z.enum(['client', 'supplier', 'subcontractor', 'lead', 'other']).optional(),
  search: z.string().max(200).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
})

/**
 * Phone number validation - supports international formats
 * Examples: +1-555-123-4567, (555) 123-4567, +44 20 7946 0958
 */
const PhoneSchema = z.string()
  .regex(
    /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/,
    'Invalid phone number format'
  )
  .optional()
  .nullable()

/**
 * Email validation with strict RFC 5322 compliance
 */
const EmailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email too long')

/**
 * Schema for creating a new contact
 * Comprehensive validation for all contact fields
 */
const CreateContactSchema = z.object({
  // Required fields
  name: z.string()
    .min(1, 'Name is required')
    .max(200, 'Name too long')
    .regex(/^[\p{L}\p{M}\p{N}\s\-\'\.]+$/u, 'Name contains invalid characters'),

  type: z.enum(['client', 'supplier', 'subcontractor', 'lead', 'other'])
    .default('client'),

  // Contact information
  email: EmailSchema.optional().nullable(),

  phone: PhoneSchema,

  mobile: PhoneSchema,

  fax: PhoneSchema,

  // Company information
  company: z.string()
    .max(200, 'Company name too long')
    .optional()
    .nullable(),

  job_title: z.string()
    .max(100, 'Job title too long')
    .optional()
    .nullable(),

  // Address fields
  address_line1: z.string()
    .max(255, 'Address line 1 too long')
    .optional()
    .nullable(),

  address_line2: z.string()
    .max(255, 'Address line 2 too long')
    .optional()
    .nullable(),

  city: z.string()
    .max(100, 'City name too long')
    .optional()
    .nullable(),

  state: z.string()
    .max(100, 'State name too long')
    .optional()
    .nullable(),

  postal_code: z.string()
    .max(20, 'Postal code too long')
    .regex(/^[A-Z0-9\s\-]+$/i, 'Invalid postal code format')
    .optional()
    .nullable(),

  country: z.string()
    .length(2, 'Country must be 2-letter ISO code')
    .regex(/^[A-Z]{2}$/, 'Country must be uppercase letters')
    .default('US'),

  // Optional fields
  website: z.string()
    .url('Invalid website URL')
    .max(500, 'Website URL too long')
    .optional()
    .nullable(),

  notes: z.string()
    .max(2000, 'Notes too long')
    .optional()
    .nullable(),

  // Business fields
  tax_id: z.string()
    .max(50, 'Tax ID too long')
    .optional()
    .nullable(),

  payment_terms: z.number()
    .int('Payment terms must be a whole number')
    .min(0, 'Payment terms cannot be negative')
    .max(365, 'Payment terms cannot exceed 365 days')
    .optional()
    .nullable(),

  credit_limit: z.number()
    .nonnegative('Credit limit cannot be negative')
    .finite()
    .optional()
    .nullable(),

  // Status
  status: z.enum(['active', 'inactive', 'archived'])
    .default('active'),

  // Tags for categorization
  tags: z.array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional()
    .nullable(),

  // Metadata
  metadata: z.record(z.string(), z.any())
    .optional()
    .nullable(),
})
.refine(
  data => data.email || data.phone || data.mobile,
  {
    message: 'At least one contact method (email, phone, or mobile) is required',
    path: ['email'],
  }
)

// ============================================================================
// GET /api/contacts
// ============================================================================

/**
 * GET /api/contacts
 * List all contacts for the authenticated user
 *
 * @security Requires authentication
 * @rateLimit 100 requests per minute
 * @validation Query parameters validated with Zod
 */
export async function GET(request: NextRequest) {
  try {
    // 1. AUTHENTICATION
    const { data: authData, error: authError } = await requireAuth(request)
    if (authError) return authError

    // 2. RATE LIMITING
    const rateLimitError = rateLimit(request, `contacts-list-${authData!.user.id}`, 100, 60000)
    if (rateLimitError) return rateLimitError

    // 3. PARSE & VALIDATE QUERY PARAMETERS
    const searchParams = request.nextUrl.searchParams
    const queryObject = Object.fromEntries(searchParams.entries())

    const validationResult = GetContactsQuerySchema.safeParse(queryObject)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))

      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Invalid query parameters',
          details: errors
        },
        { status: 400 }
      )
    }

    const params = validationResult.data

    // 4. FETCH CONTACTS FROM DATABASE
    const { data: contacts, error } = await getContacts(params.type)

    if (error) {
      console.error('[GET /api/contacts] Database error:', error)
      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to fetch contacts' },
        { status: 500 }
      )
    }

    // 5. APPLY CLIENT-SIDE FILTERS (if needed)
    let filteredContacts = contacts || []

    if (params.search) {
      const searchLower = params.search.toLowerCase()
      filteredContacts = filteredContacts.filter(contact =>
        (contact.contact_name?.toLowerCase().includes(searchLower) ||
         contact.company_name?.toLowerCase().includes(searchLower) ||
         contact.email?.toLowerCase().includes(searchLower))
      )
    }

    // Note: Contact type doesn't have status field - removed filtering
    // if (params.status) {
    //   filteredContacts = filteredContacts.filter(contact =>
    //     contact.status === params.status
    //   )
    // }

    // 6. SUCCESS RESPONSE
    const response = NextResponse.json({
      data: filteredContacts,
      count: filteredContacts.length
    })

    return addRateLimitHeaders(response, `contacts-list-${authData!.user.id}`, 100)

  } catch (error) {
    console.error('[GET /api/contacts] Unhandled exception:', error)
    return handleApiError(error)
  }
}

// ============================================================================
// POST /api/contacts
// ============================================================================

/**
 * POST /api/contacts
 * Create a new contact
 *
 * @security Requires authentication
 * @rateLimit 20 creates per minute
 * @validation Request body validated with Zod
 */
export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATION
    const { data: authData, error: authError } = await requireAuth(request)
    if (authError) return authError

    // 2. RATE LIMITING (stricter for write operations)
    const rateLimitError = rateLimit(request, `contacts-create-${authData!.user.id}`, 20, 60000)
    if (rateLimitError) return rateLimitError

    // 3. PARSE REQUEST BODY
    let body: unknown
    try {
      body = await request.json()
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // 4. VALIDATE REQUEST BODY
    const validationResult = CreateContactSchema.safeParse(body)

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))

      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Invalid contact data',
          details: errors
        },
        { status: 400 }
      )
    }

    const contactData = validationResult.data

    // 5. ADDITIONAL BUSINESS LOGIC VALIDATION
    // Normalize phone numbers (remove formatting)
    if (contactData.phone) {
      contactData.phone = contactData.phone.replace(/[\s\-\(\)\.]/g, '')
    }
    if (contactData.mobile) {
      contactData.mobile = contactData.mobile.replace(/[\s\-\(\)\.]/g, '')
    }
    if (contactData.fax) {
      contactData.fax = contactData.fax.replace(/[\s\-\(\)\.]/g, '')
    }

    // Normalize email to lowercase
    if (contactData.email) {
      contactData.email = contactData.email.toLowerCase()
    }

    // Map validation schema fields to Contact type fields
    // Combine address lines if present
    const addressParts = [contactData.address_line1, contactData.address_line2].filter(Boolean)
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : null

    const mappedContactData = {
      user_id: authData!.user.id,
      contact_name: contactData.name,
      company_name: contactData.company || null,
      email: contactData.email || null,
      phone: contactData.phone || null,
      address: fullAddress,
      city: contactData.city || null,
      state: contactData.state || null,
      zip: contactData.postal_code || null,
      country: contactData.country,
      contact_type: contactData.type,
      notes: contactData.notes || null,
    }

    // 6. CREATE CONTACT IN DATABASE
    const { data: contact, error } = await createContact(mappedContactData)

    if (error) {
      console.error('[POST /api/contacts] Database error:', error)

      // Handle specific database errors
      if (error.message?.includes('unique constraint')) {
        return NextResponse.json(
          { error: 'Conflict', message: 'Contact with this email already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Internal Server Error', message: 'Failed to create contact' },
        { status: 500 }
      )
    }

    // 7. SUCCESS RESPONSE
    const response = NextResponse.json(
      {
        data: contact,
        message: 'Contact created successfully'
      },
      { status: 201 }
    )

    return addRateLimitHeaders(response, `contacts-create-${authData!.user.id}`, 20)

  } catch (error) {
    console.error('[POST /api/contacts] Unhandled exception:', error)
    return handleApiError(error)
  }
}
