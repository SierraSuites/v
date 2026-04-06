export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { user: null, profile: null },
        { status: 200 }
      )
    }

    // Get user profile + company name
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*, companies(name)')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Error fetching profile:', profileError)
      return NextResponse.json(
        { user, profile: null },
        { status: 200 }
      )
    }

    return NextResponse.json({
      user,
      profile: {
        ...profile,
        company_name: (profile.companies as any)?.name ?? null,
      }
    })
  } catch (error) {
    console.error('Session error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
