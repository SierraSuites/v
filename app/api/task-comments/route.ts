export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/task-comments?taskId=xxx
// List comments for a task
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const taskId = req.nextUrl.searchParams.get('taskId')
    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing taskId query parameter' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching task comments:', error)
      return NextResponse.json(
        { error: 'Failed to fetch task comments' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in task-comments GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/task-comments
// Create a comment on a task
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { task_id, content, mentions } = await req.json()

    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id,
        content,
        mentions,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating task comment:', error)
      return NextResponse.json(
        { error: 'Failed to create comment' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in task-comments POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/task-comments?id=xxx
// Delete a comment
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Missing id query parameter' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting task comment:', error)
      return NextResponse.json(
        { error: 'Failed to delete comment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in task-comments DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
