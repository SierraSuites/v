// API Route: User Presence
// GET /api/chat/presence - Get presence for company users
// POST /api/chat/presence - Update user's own presence

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updatePresenceSchema = z.object({
  status: z.enum(['online', 'away', 'busy', 'offline']),
  currentPage: z.string().max(255).optional(),
})

// ============================================
// GET /api/chat/presence
// Get presence status for all users in the company
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get presence for all users in the company
    const { data: companyUsers } = await supabase
      .from('user_profiles')
      .select(
        `
        id,
        full_name,
        avatar_url,
        user_presence (
          status,
          last_seen_at,
          current_page
        )
      `
      )
      .eq('company_id', profile.company_id)

    if (!companyUsers) {
      return NextResponse.json(
        { error: 'Failed to fetch presence' },
        { status: 500 }
      )
    }

    // Format the response
    const presence = companyUsers.map((u: any) => ({
      userId: u.id,
      fullName: u.full_name,
      avatarUrl: u.avatar_url,
      status: u.user_presence?.[0]?.status || 'offline',
      lastSeenAt: u.user_presence?.[0]?.last_seen_at,
      currentPage: u.user_presence?.[0]?.current_page,
    }))

    return NextResponse.json({ presence })
  } catch (error) {
    console.error('Error in GET /api/chat/presence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/chat/presence
// Update user's own presence status
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updatePresenceSchema.safeParse(body)

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

    const { status, currentPage } = validationResult.data

    // Upsert presence
    const { error } = await supabase.from('user_presence').upsert(
      {
        user_id: user.id,
        status,
        current_page: currentPage || null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

    if (error) {
      console.error('Error updating presence:', error)
      return NextResponse.json(
        { error: 'Failed to update presence' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Presence updated successfully' })
  } catch (error) {
    console.error('Error in POST /api/chat/presence:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
