import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Return a dummy client during build time when env vars aren't available
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // During build time, return a proxy object that won't cause errors
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get: () => () => Promise.resolve({ data: null, error: null })
    })
  }

  return createBrowserClient(url, key)
}
