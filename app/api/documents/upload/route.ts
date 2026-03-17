/**
 * Document Upload API
 * POST /api/documents/upload - Upload file to Supabase Storage and create document record
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const subcategory = formData.get('subcategory') as string
    const projectId = formData.get('project_id') as string
    const visibility = formData.get('visibility') as string
    const tags = formData.get('tags') as string

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: 'Document name is required' }, { status: 400 })
    }

    if (!category) {
      return NextResponse.json({ error: 'Document category is required' }, { status: 400 })
    }

    // Get file details
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || ''
    const fileName = file.name
    const fileSize = file.size
    const fileType = file.type

    // Generate unique file path
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const storagePath = `${profile.company_id}/documents/${category}/${timestamp}-${randomString}.${fileExtension}`

    // Upload to Supabase Storage
    const fileBuffer = await file.arrayBuffer()
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: fileType,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Upload API] Storage error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      )
    }

    // Create document record
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .insert({
        company_id: profile.company_id,
        project_id: projectId || null,
        name,
        description: description || null,
        category,
        subcategory: subcategory || null,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        file_path: uploadData.path,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        file_extension: fileExtension,
        visibility: visibility || 'private',
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (documentError) {
      // Rollback - delete uploaded file
      await supabase.storage.from('documents').remove([storagePath])

      console.error('[Upload API] Document create error:', documentError)
      return NextResponse.json(
        { error: 'Failed to create document record', details: documentError.message },
        { status: 500 }
      )
    }

    // Log upload activity
    await supabase.rpc('log_document_activity', {
      p_document_id: document.id,
      p_action: 'uploaded',
      p_performed_by: user.id,
      p_metadata: JSON.stringify({
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
      }),
    })

    return NextResponse.json({ document }, { status: 201 })
  } catch (error: any) {
    console.error('[Upload API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
