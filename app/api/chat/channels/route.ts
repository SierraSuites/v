// API Route: Chat Channels
// GET /api/chat/channels - List user's channels
// POST /api/chat/channels - Create a new channel

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createChannelSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  channelType: z.enum(['public', 'private', 'direct', 'project']),
  projectId: z.string().uuid().optional(),
  memberIds: z.array(z.string().uuid()).optional(), // User IDs to add as members
})

// ============================================
// GET /api/chat/channels
// List all channels for the authenticated user
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

    // Get channels where user is a member
    const { data: channels, error } = await supabase
      .from('chat_channels')
      .select(
        `
        id,
        name,
        description,
        channel_type,
        project_id,
        created_at,
        updated_at,
        projects:project_id (
          id,
          name
        ),
        channel_members!inner (
          id,
          role,
          last_read_at
        )
      `
      )
      .eq('company_id', profile.company_id)
      .eq('channel_members.user_id', user.id)
      .is('archived_at', null)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching channels:', error)
      return NextResponse.json(
        { error: 'Failed to fetch channels' },
        { status: 500 }
      )
    }

    // Get unread message counts for each channel
    const channelsWithUnread = await Promise.all(
      channels.map(async (channel) => {
        const { data: unreadCount } = await supabase.rpc(
          'get_unread_message_count',
          {
            p_user_id: user.id,
            p_channel_id: channel.id,
          }
        )

        return {
          ...channel,
          unreadCount: unreadCount || 0,
        }
      })
    )

    return NextResponse.json({ channels: channelsWithUnread })
  } catch (error) {
    console.error('Error in GET /api/chat/channels:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/chat/channels
// Create a new channel
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

    // Get user's company_id
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createChannelSchema.safeParse(body)

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

    const { name, description, channelType, projectId, memberIds } =
      validationResult.data

    // If project channel, verify project exists and belongs to company
    if (channelType === 'project' && projectId) {
      const { data: project } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('company_id', profile.company_id)
        .single()

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found or access denied' },
          { status: 404 }
        )
      }
    }

    // Create the channel
    const { data: channel, error: channelError } = await supabase
      .from('chat_channels')
      .insert({
        company_id: profile.company_id,
        name,
        description,
        channel_type: channelType,
        project_id: projectId || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (channelError) {
      console.error('Error creating channel:', channelError)
      return NextResponse.json(
        { error: 'Failed to create channel' },
        { status: 500 }
      )
    }

    // Add creator as admin
    await supabase.from('channel_members').insert({
      channel_id: channel.id,
      user_id: user.id,
      role: 'admin',
    })

    // Add additional members if provided
    if (memberIds && memberIds.length > 0) {
      const members = memberIds.map((memberId) => ({
        channel_id: channel.id,
        user_id: memberId,
        role: 'member',
      }))

      await supabase.from('channel_members').insert(members)
    }

    // Send system message
    await supabase.from('chat_messages').insert({
      channel_id: channel.id,
      user_id: user.id,
      content: `Channel created by ${profile.company_id}`,
      message_type: 'system',
    })

    return NextResponse.json(
      { message: 'Channel created successfully', channel },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/chat/channels:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
