export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api-permissions'

// GET /api/quote-templates
// List active quote templates ordered by use_count desc then name
export async function GET(req: NextRequest) {
  try {
    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canViewFinancials')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('quote_templates')
      .select('*')
      .eq('is_active', true)
      .order('use_count', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching quote templates:', error)
      return NextResponse.json(
        { error: 'Failed to fetch quote templates' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in quote-templates GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
