export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api-permissions'

// GET /api/task-templates
// List custom task templates (user's own + public)
export async function GET(req: NextRequest) {
  try {
    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canViewAllTasks')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('task_templates')
      .select('*')
      .or(`user_id.eq.${authResult.userId},is_public.eq.true`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching task templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch task templates' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in task-templates GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/task-templates
// Create a task template
export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canManageTasks')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const { name, description, category, icon, is_public, tasks } = await req.json()

    // Look up company_id from user_profiles
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', authResult.userId!)
      .single()

    if (profileError) {
      console.error('Error fetching user profile:', profileError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const { data, error } = await supabase
      .from('task_templates')
      .insert({
        name,
        description,
        category,
        icon,
        is_public,
        tasks,
        user_id: authResult.userId!,
        company_id: profile?.company_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating task template:', error)
      return NextResponse.json(
        { error: 'Failed to create task template' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in task-templates POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/task-templates
// Update a task template
export async function PUT(req: NextRequest) {
  try {
    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canManageTasks')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const { id, ...updates } = await req.json()

    const { data, error } = await supabase
      .from('task_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating task template:', error)
      return NextResponse.json(
        { error: 'Failed to update task template' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in task-templates PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/task-templates?id=xxx
// Delete a task template
export async function DELETE(req: NextRequest) {
  try {
    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canManageTasks')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const id = req.nextUrl.searchParams.get('id')
    if (!id) {
      return NextResponse.json(
        { error: 'Missing id query parameter' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('task_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting task template:', error)
      return NextResponse.json(
        { error: 'Failed to delete task template' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in task-templates DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
