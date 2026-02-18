// ============================================================
// API ROUTE: /api/integrations/api-keys
// Creates API keys server-side so the secret never touches the client
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const CreateApiKeySchema = z.object({
  key_name: z.string().min(1).max(255),
  environment: z.enum(['production', 'sandbox']).default('production'),
  permissions: z.record(z.any()).default({}),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const validation = CreateApiKeySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation Error', details: validation.error.errors }, { status: 400 })
    }

    const { key_name, environment, permissions } = validation.data

    // Generate key server-side: random 32 bytes → hex string
    const rawKey = crypto.randomBytes(32).toString('hex')
    const prefix = `sk_${environment === 'production' ? 'live' : 'test'}_${rawKey.slice(0, 6)}`
    // Store SHA-256 hash — never the raw key
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')

    const { data: apiKey, error } = await supabase
      .from('api_keys')
      .insert({
        company_id: profile.company_id,
        created_by: user.id,
        key_name,
        key_value: keyHash,
        key_prefix: prefix,
        environment,
        permissions,
      })
      .select('id, key_name, key_prefix, environment, permissions, created_at')
      .single()

    if (error) {
      console.error('[POST /api/integrations/api-keys]', error)
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
    }

    // Return the raw key ONCE — it cannot be retrieved again
    return NextResponse.json(
      {
        data: apiKey,
        // Include raw key only at creation time; client should display and warn user to copy it
        raw_key: `${prefix}_${rawKey.slice(6)}`,
        message: 'API key created. Copy it now — it cannot be shown again.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/integrations/api-keys] Unhandled:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
