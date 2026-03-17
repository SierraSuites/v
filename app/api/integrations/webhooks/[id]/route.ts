// API Route: Individual Webhook Management
// GET /api/integrations/webhooks/[id] - Get webhook details
// PATCH /api/integrations/webhooks/[id] - Update webhook
// DELETE /api/integrations/webhooks/[id] - Delete webhook

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updateWebhookSchema = z.object({
  webhookName: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  url: z.string().url().optional(),
  method: z.enum(['POST', 'PUT', 'PATCH']).optional(),
  events: z.array(z.string()).min(1).optional(),
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
  payloadFormat: z.enum(['json', 'form', 'xml']).optional(),
  retryPolicy: z.enum(['none', 'linear', 'exponential']).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  timeoutSeconds: z.number().int().min(1).max(300).optional(),
  isActive: z.boolean().optional(),
})

// ============================================
// GET /api/integrations/webhooks/[id]
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const { data: webhook, error } = await supabase
      .from('webhooks')
      .select(`
        *,
        creator:created_by (
          id,
          profiles (full_name)
        )
      `)
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
      .single()

    if (error || !webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    return NextResponse.json({ webhook })
  } catch (error) {
    console.error('Error in GET /api/integrations/webhooks/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH /api/integrations/webhooks/[id]
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const validationResult = updateWebhookSchema.safeParse(body)

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

    const updateData: any = {}
    if (data.webhookName !== undefined) updateData.webhook_name = data.webhookName
    if (data.description !== undefined) updateData.description = data.description
    if (data.url !== undefined) updateData.url = data.url
    if (data.method !== undefined) updateData.method = data.method
    if (data.events !== undefined) updateData.events = data.events
    if (data.secret !== undefined) updateData.secret = data.secret
    if (data.headers !== undefined) updateData.headers = data.headers
    if (data.payloadFormat !== undefined) updateData.payload_format = data.payloadFormat
    if (data.retryPolicy !== undefined) updateData.retry_policy = data.retryPolicy
    if (data.maxRetries !== undefined) updateData.max_retries = data.maxRetries
    if (data.timeoutSeconds !== undefined) updateData.timeout_seconds = data.timeoutSeconds
    if (data.isActive !== undefined) updateData.is_active = data.isActive

    updateData.updated_at = new Date().toISOString()

    const { data: webhook, error: updateError } = await supabase
      .from('webhooks')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
      .select()
      .single()

    if (updateError || !webhook) {
      console.error('Error updating webhook:', updateError)
      return NextResponse.json(
        { error: 'Failed to update webhook' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Webhook updated successfully',
      webhook,
    })
  } catch (error) {
    console.error('Error in PATCH /api/integrations/webhooks/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/integrations/webhooks/[id]
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('webhooks')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)

    if (deleteError) {
      console.error('Error deleting webhook:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete webhook' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Webhook deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/integrations/webhooks/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
