/**
 * Active Sessions API
 *
 * Manages user sessions for security monitoring and remote logout
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch all active sessions for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all sessions for this user
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('last_active_at', { ascending: false })

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError)
      return NextResponse.json(
        { error: 'Failed to fetch sessions' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sessions: sessions || [] })
  } catch (error) {
    console.error('Sessions API error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// DELETE - Revoke a specific session (remote logout)
export async function DELETE(request: NextRequest) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Revoke the session
    const { error: revokeError } = await supabase
      .from('user_sessions')
      .update({
        revoked_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .eq('user_id', user.id) // Ensure user can only revoke their own sessions

    if (revokeError) {
      console.error('Error revoking session:', revokeError)
      return NextResponse.json(
        { error: 'Failed to revoke session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully',
    })
  } catch (error) {
    console.error('Revoke session error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// POST - Create/update current session
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request metadata
    const userAgent = request.headers.get('user-agent') || 'Unknown'
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Parse user agent for device info
    const browser = parseBrowser(userAgent)
    const os = parseOS(userAgent)
    const deviceName = `${os} - ${browser}`

    // Create or update session
    const { error: upsertError } = await supabase
      .from('user_sessions')
      .upsert({
        user_id: user.id,
        device_name: deviceName,
        browser,
        os,
        ip_address: ipAddress,
        last_active_at: new Date().toISOString(),
        is_current: true,
      })

    if (upsertError) {
      console.error('Error upserting session:', upsertError)
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Session updated successfully',
    })
  } catch (error) {
    console.error('Update session error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

// Helper functions to parse user agent
function parseBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  if (userAgent.includes('Opera')) return 'Opera'
  return 'Unknown Browser'
}

function parseOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('iOS')) return 'iOS'
  return 'Unknown OS'
}
