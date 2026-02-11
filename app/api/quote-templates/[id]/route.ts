export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/quote-templates/[id]
// Get a single quote template by id
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const { data, error } = await supabase
      .from('quote_templates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching quote template:', error)
      return NextResponse.json(
        { error: 'Quote template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in quote-templates/[id] GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
