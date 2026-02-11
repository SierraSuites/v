export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api-permissions'

// GET /api/shared-media?mediaAssetId=xxx
// List shares for a media asset
export async function GET(req: NextRequest) {
  try {
    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canViewAllPhotos')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const mediaAssetId = req.nextUrl.searchParams.get('mediaAssetId')
    if (!mediaAssetId) {
      return NextResponse.json(
        { error: 'Missing mediaAssetId query parameter' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('shared_media_assets')
      .select('*, company_teams(id, name, color)')
      .eq('media_asset_id', mediaAssetId)
      .eq('is_active', true)
      .order('shared_at', { ascending: false })

    if (error) {
      console.error('Error fetching shared media:', error)
      return NextResponse.json(
        { error: 'Failed to fetch shared media' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in shared-media GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/shared-media
// Create a share
export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canSharePhotos')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const {
      media_asset_id,
      shared_with_team_id,
      shared_with_user_id,
      permission_level,
      expires_at,
      share_message,
    } = await req.json()

    const { data, error } = await supabase
      .from('shared_media_assets')
      .insert({
        media_asset_id,
        shared_with_team_id,
        shared_with_user_id,
        permission_level,
        expires_at,
        share_message,
        shared_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating share:', error)
      return NextResponse.json(
        { error: 'Failed to create share' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error in shared-media POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/shared-media
// Revoke a share
export async function PUT(req: NextRequest) {
  try {
    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canSharePhotos')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const { shareId } = await req.json()

    const { data, error } = await supabase
      .from('shared_media_assets')
      .update({ is_active: false })
      .eq('id', shareId)
      .select()
      .single()

    if (error) {
      console.error('Error revoking share:', error)
      return NextResponse.json(
        { error: 'Failed to revoke share' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in shared-media PUT:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
