export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/media-assets
// Insert a media asset record
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

    const body = await req.json()

    const { data, error } = await supabase
      .from('media_assets')
      .insert({
        user_id: body.user_id,
        project_id: body.project_id,
        url: body.url,
        thumbnail_url: body.thumbnail_url,
        filename: body.filename,
        file_size: body.file_size,
        mime_type: body.mime_type,
        width: body.width,
        height: body.height,
        ...body,
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting media asset:', error)
      return NextResponse.json(
        { error: 'Failed to create media asset' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in media-assets POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/media-assets?ids=id1,id2,id3
// Get media assets by ID(s)
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

    const ids = req.nextUrl.searchParams.get('ids')
    if (!ids) {
      return NextResponse.json(
        { error: 'Missing ids query parameter' },
        { status: 400 }
      )
    }

    const idArray = ids.split(',').map((id) => id.trim())

    const { data, error } = await supabase
      .from('media_assets')
      .select('id, url, filename, captured_at')
      .in('id', idArray)

    if (error) {
      console.error('Error fetching media assets:', error)
      return NextResponse.json(
        { error: 'Failed to fetch media assets' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in media-assets GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
