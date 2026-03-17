// API Route: Custom Reports
// GET /api/reports/custom - List custom reports
// POST /api/reports/custom - Create custom report

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createReportSchema = z.object({
  reportName: z.string().min(1).max(255),
  description: z.string().optional(),
  reportType: z.enum(['financial', 'project', 'timesheet', 'safety', 'custom']),
  category: z.string().optional(),
  dataSources: z.array(z.string()),
  filters: z.any().optional(), // JSONB
  grouping: z.any().optional(), // JSONB
  sorting: z.any().optional(), // JSONB
  columns: z.any(), // JSONB - required
  chartType: z.string().optional(),
  chartConfig: z.any().optional(), // JSONB
  dateRangeType: z.enum(['custom', 'today', 'this_week', 'this_month', 'this_quarter', 'this_year', 'last_30_days', 'last_90_days', 'year_to_date']).default('custom'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isPublic: z.boolean().default(false),
  sharedWith: z.array(z.string().uuid()).optional(),
  isFavorite: z.boolean().default(false),
})

// ============================================
// GET /api/reports/custom
// List custom reports
// ============================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type')
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true'

    // Build query - user can see reports they created, public reports, or reports shared with them
    let query = supabase
      .from('custom_reports')
      .select(`
        *,
        creator:created_by (
          id,
          profiles (full_name)
        )
      `)
      .eq('company_id', profile.company_id)
      .is('deleted_at', null)
      .or(`created_by.eq.${user.id},is_public.eq.true,shared_with.cs.{${user.id}}`)
      .order('updated_at', { ascending: false })

    if (reportType) query = query.eq('report_type', reportType)
    if (favoritesOnly) query = query.eq('is_favorite', true)

    const { data: reports, error } = await query

    if (error) {
      console.error('Error fetching reports:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Error in GET /api/reports/custom:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ============================================
// POST /api/reports/custom
// Create a new custom report
// ============================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const validationResult = createReportSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    const data = validationResult.data

    const { data: report, error: reportError } = await supabase
      .from('custom_reports')
      .insert({
        company_id: profile.company_id,
        report_name: data.reportName,
        description: data.description || null,
        report_type: data.reportType,
        category: data.category || null,
        data_sources: data.dataSources,
        filters: data.filters || null,
        grouping: data.grouping || null,
        sorting: data.sorting || null,
        columns: data.columns,
        chart_type: data.chartType || null,
        chart_config: data.chartConfig || null,
        date_range_type: data.dateRangeType,
        start_date: data.startDate || null,
        end_date: data.endDate || null,
        is_public: data.isPublic,
        shared_with: data.sharedWith || null,
        is_favorite: data.isFavorite,
        created_by: user.id,
      })
      .select()
      .single()

    if (reportError) {
      console.error('Error creating report:', reportError)
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Report created successfully', report },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/reports/custom:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
