// API Route: Webhooks Management
// GET /api/integrations/webhooks - List webhooks
// POST /api/integrations/webhooks - Create webhook

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createWebhookSchema = z.object({
  webhookName: z.string().min(1).max(255),
  description: z.string().optional(),
  url: z.string().url(),
  method: z.enum(['POST', 'PUT', 'PATCH']).default('POST'),
  events: z.array(z.string()).min(1, 'At least one event is required'),
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
  payloadFormat: z.enum(['json', 'form', 'xml']).default('json'),
  retryPolicy: z.enum(['none', 'linear', 'exponential']).default('exponential'),
  maxRetries: z.number().int().min(0).max(10).default(3),
  timeoutSeconds: z.number().int().min(1).max(300).default(30),
})

// ============================================
// GET /api/integrations/webhooks
// List webhooks
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const isActive = searchParams.get('isActive')
    const event = searchParams.get('event')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('webhooks')
      .select(`
        id,
        webhook_name,
        description,
        url,
        method,
        events,
        headers,
        payload_format,
        retry_policy,
        max_retries,
        timeout_seconds,
        is_active,
        last_triggered_at,
        last_success_at,
        last_failure_at,
        last_error,
        total_deliveries,
        failed_deliveries,
        success_rate,
        created_at,
        updated_at,
        creator:created_by (
          id,
          profiles (full_name)
        )
      `, { count: 'exact' })
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true')
    }

    if (event) {
      query = query.contains('events', [event])
    }

    const { data: webhooks, error, count } = await query

    if (error) {
      console.error('Error fetching webhooks:', error)
      return NextResponse.json(
        { error: 'Failed to fetch webhooks' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      webhooks,
      total: count,
    })
  } catch (error) {
    console.error('Error in GET /api/integrations/webhooks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/integrations/webhooks
// Create a new webhook
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const validationResult = createWebhookSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    // Create webhook
    const { data: webhook, error: webhookError } = await supabase
      .from('webhooks')
      .insert({
        company_id: profile.company_id,
        webhook_name: data.webhookName,
        description: data.description || null,
        url: data.url,
        method: data.method,
        events: data.events,
        secret: data.secret || null,
        headers: data.headers || null,
        payload_format: data.payloadFormat,
        retry_policy: data.retryPolicy,
        max_retries: data.maxRetries,
        timeout_seconds: data.timeoutSeconds,
        created_by: user.id,
      })
      .select()
      .single()

    if (webhookError) {
      console.error('Error creating webhook:', webhookError)
      return NextResponse.json(
        { error: 'Failed to create webhook' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Webhook created successfully',
        webhook,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/integrations/webhooks:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
