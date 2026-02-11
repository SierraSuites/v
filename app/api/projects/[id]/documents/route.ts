export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission, requireProjectAccess } from '@/lib/api-permissions'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/projects/[id]/documents
 * List all documents for a project, with uploaded_by user profile joined.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requireProjectAccess(id)
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const { data: documents, error: docsError } = await supabase
      .from('project_documents')
      .select(`
        *,
        uploaded_by_profile:user_profiles!project_documents_uploaded_by_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('project_id', id)
      .order('uploaded_at', { ascending: false })

    if (docsError) {
      console.error('[GET /api/projects/:id/documents] Fetch error:', docsError)
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    return NextResponse.json({ documents: documents || [] })
  } catch (error) {
    console.error('[GET /api/projects/:id/documents] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * POST /api/projects/[id]/documents
 * Create a new document record for a project.
 * This is called after the client has already uploaded the file to storage.
 * The uploaded_by field is set to the authenticated user.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canUploadDocuments')
    if (!authResult.authorized) return authResult.error

    // 2. PROJECT ACCESS CHECK
    const projectAccess = await requireProjectAccess(id)
    if (!projectAccess.authorized) return projectAccess.error

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const body = await request.json()

    const { data: document, error: insertError } = await supabase
      .from('project_documents')
      .insert({
        project_id: id,
        name: body.name,
        category: body.category,
        file_path: body.file_path,
        file_size: body.file_size || null,
        file_type: body.file_type || null,
        description: body.description || null,
        tags: body.tags || [],
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[POST /api/projects/:id/documents] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ document }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/projects/:id/documents] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

/**
 * DELETE /api/projects/[id]/documents?documentId=<uuid>
 * Delete a document record by its ID.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canDeleteDocuments')
    if (!authResult.authorized) return authResult.error

    // 2. PROJECT ACCESS CHECK
    const projectAccess = await requireProjectAccess(id)
    if (!projectAccess.authorized) return projectAccess.error

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: documentId' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', documentId)
      .eq('project_id', id)

    if (deleteError) {
      console.error('[DELETE /api/projects/:id/documents] Delete error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/projects/:id/documents] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
