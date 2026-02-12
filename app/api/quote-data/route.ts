export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/lib/api-permissions'

// GET /api/quote-data
// Returns { clients, projects } for QuoteBuilder dropdowns
export async function GET(req: NextRequest) {
  try {
    // 1. AUTHENTICATION & RBAC PERMISSION CHECK
    const authResult = await requirePermission('canViewFinancials')
    if (!authResult.authorized) return authResult.error

    const supabase = await createClient()

    const [clientsResult, projectsResult] = await Promise.all([
      supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('company_name', { ascending: true }),
      supabase
        .from('projects')
        .select('id, name, status')
        .in('status', ['planning', 'active'])
        .order('name', { ascending: true }),
    ])

    if (clientsResult.error) {
      console.error('Error fetching clients:', clientsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch clients' },
        { status: 500 }
      )
    }

    if (projectsResult.error) {
      console.error('Error fetching projects:', projectsResult.error)
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      clients: clientsResult.data,
      projects: projectsResult.data,
    })
  } catch (error) {
    console.error('Error in quote-data GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
