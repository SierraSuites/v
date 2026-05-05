export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireProjectAccess, requireProjectPermission } from '@/lib/api-permissions'

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

    const authResult = await requireProjectPermission(id, 'uploadDocuments')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
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
        uploaded_by: authResult.userId!,
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
 * PATCH /api/projects/[id]/documents?documentId=<uuid>
 * Update a document's entity link (linked_entity_type + linked_entity_id).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authResult = await requireProjectPermission(id, 'uploadDocuments')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')
    if (!documentId) return NextResponse.json({ error: 'Missing documentId' }, { status: 400 })

    const raw = await request.json()
    const VALID_ENTITY_TYPES = ['change_order', 'rfi', 'design_selection']
    const linked_entity_type = raw.linked_entity_type === null ? null
      : VALID_ENTITY_TYPES.includes(raw.linked_entity_type) ? raw.linked_entity_type : undefined
    if (linked_entity_type === undefined) return NextResponse.json({ error: 'Invalid linked_entity_type' }, { status: 400 })

    const { error } = await supabase
      .from('project_documents')
      .update({ linked_entity_type, linked_entity_id: raw.linked_entity_id ?? null })
      .eq('id', documentId)
      .eq('project_id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/projects/[id]/documents?documentId=<uuid>
 * Delete a document record and its storage file.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const authResult = await requireProjectPermission(id, 'deleteDocuments')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get('documentId')

    if (!documentId) {
      return NextResponse.json({ error: 'Missing required query parameter: documentId' }, { status: 400 })
    }

    // Fetch file_path before deleting so we can remove the storage object
    const { data: doc } = await supabase
      .from('project_documents')
      .select('file_path')
      .eq('id', documentId)
      .eq('project_id', id)
      .single()

    const { error: deleteError } = await supabase
      .from('project_documents')
      .delete()
      .eq('id', documentId)
      .eq('project_id', id)

    if (deleteError) {
      console.error('[DELETE /api/projects/:id/documents] Delete error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    // Remove the storage file — best-effort, don't fail the request if it errors
    if (doc?.file_path) {
      await supabase.storage.from('project-documents').remove([doc.file_path])
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/projects/:id/documents] Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
