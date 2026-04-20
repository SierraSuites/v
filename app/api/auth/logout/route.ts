import { NextResponse } from 'next/server'

const REMEMBER_ME_COOKIE = 'sb-remember-me'

export async function POST() {
  const response = NextResponse.json({ success: true })

  // Clear the remember-me preference cookie so the next login starts fresh.
  response.cookies.set(REMEMBER_ME_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}
