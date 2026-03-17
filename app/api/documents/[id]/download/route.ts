/**
 * Document Download API
 * GET /api/documents/[id]/download - Download document file
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

    // Get document
    const { data: document, error: documentError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .single()

    if (documentError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get signed URL for download
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.file_path, 60) // 60 seconds expiry

    if (urlError || !signedUrlData) {
      console.error('[Download API] Signed URL error:', urlError)
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      )
    }

    // Log download activity
    await supabase.rpc('log_document_activity', {
      p_document_id: id,
      p_action: 'downloaded',
      p_performed_by: user.id,
    })

    return NextResponse.json({
      download_url: signedUrlData.signedUrl,
      file_name: document.file_name,
      file_type: document.file_type,
      file_size: document.file_size,
    })
  } catch (error: any) {
    console.error('[Download API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
