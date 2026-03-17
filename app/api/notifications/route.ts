// API Route: Notifications
// GET /api/notifications - Get user's notifications
// PATCH /api/notifications - Mark notifications as read

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const markReadSchema = z.object({
  notificationIds: z.array(z.string().uuid()).optional(),
  markAllRead: z.boolean().optional(),
})

// ============================================
// GET /api/notifications
// Get user's notifications with pagination
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by read status if requested
    if (unreadOnly) {
      query = query.is('read_at', null)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)

    return NextResponse.json({
      notifications,
      unreadCount: unreadCount || 0,
    })
  } catch (error) {
    console.error('Error in GET /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// PATCH /api/notifications
// Mark notifications as read
// ============================================

export async function PATCH(request: NextRequest) {
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
    const validationResult = markReadSchema.safeParse(body)

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

    const { notificationIds, markAllRead } = validationResult.data

    if (markAllRead) {
      // Mark all notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .is('read_at', null)

      if (error) {
        console.error('Error marking all as read:', error)
        return NextResponse.json(
          { error: 'Failed to mark notifications as read' },
          { status: 500 }
        )
      }
    } else if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', notificationIds)

      if (error) {
        console.error('Error marking notifications as read:', error)
        return NextResponse.json(
          { error: 'Failed to mark notifications as read' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ message: 'Notifications marked as read' })
  } catch (error) {
    console.error('Error in PATCH /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// DELETE /api/notifications
// Delete notifications
// ============================================

export async function DELETE(request: NextRequest) {
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

    // Get notification IDs from query params
    const { searchParams } = new URL(request.url)
    const notificationIds = searchParams.get('ids')?.split(',') || []

    if (notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'No notification IDs provided' },
        { status: 400 }
      )
    }

    // Delete notifications
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id)
      .in('id', notificationIds)

    if (error) {
      console.error('Error deleting notifications:', error)
      return NextResponse.json(
        { error: 'Failed to delete notifications' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Notifications deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
