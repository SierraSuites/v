/**
 * Documents API
 * GET /api/documents - List documents with filtering
 * POST /api/documents - Upload new document
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
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

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const status = searchParams.get('status') || 'active'
    const latestOnly = searchParams.get('latest_only') === 'true'

    // Build query
    let query = supabase
      .from('documents')
      .select(`
        *,
        project:projects(id, name),
        uploaded_by_user:user_profiles!documents_uploaded_by_fkey(
          user_id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('company_id', profile.company_id)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (latestOnly) {
      query = query.eq('is_latest_version', true)
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: documents, error } = await query

    if (error) {
      console.error('[Documents API] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ documents })
  } catch (error: any) {
    console.error('[Documents API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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
      project_id,
      file_path,
      file_name,
      file_size,
      file_type,
      file_extension,
      visibility,
      shared_with,
      metadata,
    } = body

    // Create document
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        company_id: profile.company_id,
        project_id,
        name,
        description,
        category,
        subcategory,
        tags,
        file_path,
        file_name,
        file_size,
        file_type,
        file_extension,
        visibility: visibility || 'private',
        uploaded_by: user.id,
        shared_with,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (documentError) {
      console.error('[Documents API] Create error:', documentError)
      return NextResponse.json({ error: documentError.message }, { status: 500 })
    }

    return NextResponse.json({ document }, { status: 201 })
  } catch (error: any) {
    console.error('[Documents API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
