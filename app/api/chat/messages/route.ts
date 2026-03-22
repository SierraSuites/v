// API Route: Chat Messages
// GET /api/chat/messages?channelId=xxx - Get messages for a channel
// POST /api/chat/messages - Send a new message

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const sendMessageSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  parentMessageId: z.string().uuid().optional(),
  mentionedUsers: z.array(z.string().uuid()).optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().optional(),
  fileType: z.string().max(100).optional(),
})

// ============================================
// GET /api/chat/messages
// Get messages for a channel with pagination
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
    const channelId = searchParams.get('channelId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const before = searchParams.get('before') // Timestamp for pagination

    if (!channelId) {
      return NextResponse.json(
        { error: 'channelId is required' },
        { status: 400 }
      )
    }

    // Verify user is a member of the channel
    const { data: membership } = await supabase
      .from('channel_members')
      .select('id')
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this channel' },
        { status: 403 }
      )
    }

    // Build query
    let query = supabase
      .from('chat_messages')
      .select(
        `
        id,
        content,
        message_type,
        parent_message_id,
        file_url,
        file_name,
        file_size,
        file_type,
        mentioned_users,
        edited_at,
        created_at,
        user:user_id (
          id,
          profiles (
            full_name,
            avatar_url
          )
        ),
        message_reactions (
          id,
          emoji,
          user_id
        )
      `
      )
      .eq('channel_id', channelId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // If before timestamp provided, filter messages before that time
    if (before) {
      query = query.lt('created_at', before)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error('Error fetching messages:', error)
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      )
    }

    // Mark messages as read
    await supabase.rpc('mark_messages_read', {
      p_user_id: user.id,
      p_channel_id: channelId,
    })

    return NextResponse.json({ messages: messages.reverse() })
  } catch (error) {
    console.error('Error in GET /api/chat/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/chat/messages
// Send a new message
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
    const validationResult = sendMessageSchema.safeParse(body)

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

    const {
      channelId,
      content,
      parentMessageId,
      mentionedUsers,
      fileUrl,
      fileName,
      fileSize,
      fileType,
    } = validationResult.data

    // Verify user is a member of the channel
    const { data: membership } = await supabase
      .from('channel_members')
      .select('id')
      .eq('channel_id', channelId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this channel' },
        { status: 403 }
      )
    }

    // Determine message type
    let messageType = 'text'
    if (fileUrl) messageType = 'file'
    if (mentionedUsers && mentionedUsers.length > 0) messageType = 'mention'

    // Create the message
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        channel_id: channelId,
        user_id: user.id,
        content,
        message_type: messageType,
        parent_message_id: parentMessageId || null,
        mentioned_users: mentionedUsers || null,
        file_url: fileUrl || null,
        file_name: fileName || null,
        file_size: fileSize || null,
        file_type: fileType || null,
      })
      .select(
        `
        id,
        content,
        message_type,
        parent_message_id,
        file_url,
        file_name,
        file_size,
        file_type,
        mentioned_users,
        created_at,
        user:user_id (
          id,
          profiles (
            full_name,
            avatar_url
          )
        )
      `
      )
      .single()

    if (messageError) {
      console.error('Error creating message:', messageError)
      return NextResponse.json(
        { error: 'Failed to send message' },
        { status: 500 }
      )
    }

    // Update channel's updated_at timestamp
    await supabase
      .from('chat_channels')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', channelId)

    return NextResponse.json(
      { message: 'Message sent successfully', data: message },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/chat/messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
