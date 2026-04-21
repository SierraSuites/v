import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const REMEMBER_ME_COOKIE = 'sb-remember-me'
const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30 // 30 days in seconds

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // If Supabase env vars are not configured, just pass through
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables not configured in middleware')
    return response
  }

  // When the user chose "remember me", preserve the 30-day maxAge on every
  // token refresh so the session cookie doesn't silently shorten to 1 hour.
  const rememberMe = request.cookies.get(REMEMBER_ME_COOKIE)?.value === '1'

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions: CookieOptions = { ...options }
            if (rememberMe) {
              cookieOptions.maxAge = REMEMBER_ME_MAX_AGE
              delete cookieOptions.expires
            } else {
              delete cookieOptions.maxAge
              delete cookieOptions.expires
            }
            response.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes — redirect to /login if not authenticated
  const protectedPaths = [
    '/dashboard',
    '/projects',
    '/settings',
    '/crm',
    '/financial',
    '/taskflow',
    '/teams',
    '/reports',
    '/quotes',
    '/fieldsnap',
    '/sustainability',
    '/billing',
    '/compliance',
  ]

  const pathname = request.nextUrl.pathname
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))

  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}
