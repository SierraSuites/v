/**
 * Individual Document API
 * GET /api/documents/[id] - Get document details
 * PUT /api/documents/[id] - Update document
 * DELETE /api/documents/[id] - Delete document
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Get document with related data
    const { data: document, error } = await supabase
      .from('documents')
      .select(`
        *,
        project:projects(id, name),
        uploaded_by_user:user_profiles!documents_uploaded_by_fkey(
          user_id,
          first_name,
          last_name,
          email
        ),
        versions:documents!parent_document_id(
          id,
          version_number,
          file_name,
          file_size,
          created_at,
          uploaded_by
        )
      `)
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single()

    if (error) {
      console.error('[Document API] Fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Log view activity
    await supabase.rpc('log_document_activity', {
      p_document_id: id,
      p_action: 'viewed',
      p_performed_by: user.id,
    })

    return NextResponse.json({ document })
  } catch (error: any) {
    console.error('[Document API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name,
      description,
      category,
      subcategory,
      tags,
      visibility,
      shared_with,
      metadata,
      status,
    } = body

    // Update document
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .update({
        name,
        description,
        category,
        subcategory,
        tags,
        visibility,
        shared_with,
        metadata,
        status,
      })
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .select()
      .single()

    if (documentError) {
      console.error('[Document API] Update error:', documentError)
      return NextResponse.json({ error: documentError.message }, { status: 500 })
    }

    // Log edit activity
    await supabase.rpc('log_document_activity', {
      p_document_id: id,
      p_action: 'edited',
      p_performed_by: user.id,
    })

    return NextResponse.json({ document })
  } catch (error: any) {
    console.error('[Document API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single()

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Soft delete - mark as deleted
    const { error } = await supabase
      .from('documents')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('company_id', profile.company_id)

    if (error) {
      console.error('[Document API] Delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Log delete activity
    await supabase.rpc('log_document_activity', {
      p_document_id: id,
      p_action: 'deleted',
      p_performed_by: user.id,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Document API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
