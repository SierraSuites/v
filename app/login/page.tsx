"use client"

export const dynamic = 'force-dynamic'

import Link from "next/link"
import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { loginSchema } from "@/lib/validation"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)

  useEffect(() => {
    // Check if user was redirected after email verification
    if (searchParams.get('verified') === 'true') {
      setSuccessMessage('Email verified successfully! Please log in.')
    }
  }, [searchParams])

  // Format locked until time for user display
  const formatLockedTime = (lockedUntilISO: string): string => {
    const lockedDate = new Date(lockedUntilISO)
    const now = new Date()
    const minutesRemaining = Math.ceil((lockedDate.getTime() - now.getTime()) / (1000 * 60))

    if (minutesRemaining <= 1) return 'less than a minute'
    if (minutesRemaining < 60) return `${minutesRemaining} minutes`

    const hours = Math.floor(minutesRemaining / 60)
    const mins = minutesRemaining % 60
    return mins > 0 ? `${hours} hours and ${mins} minutes` : `${hours} hours`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setAttemptsRemaining(null)
    setLockedUntil(null)
    setIsLoading(true)

    try {
      // Validate inputs
      const validated = loginSchema.parse({ email, password, rememberMe })

      // Use new API endpoint with rate limiting and brute force protection
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: validated.email,
          password: validated.password,
        }),
      })

      const data = await response.json()

      // Handle rate limiting (429)
      if (response.status === 429) {
        setError(data.error || 'Too many login attempts. Please try again later.')
        if (data.lockedUntil) {
          setLockedUntil(data.lockedUntil)
        }
        setIsLoading(false)
        return
      }

      // Handle account lockout (423)
      if (response.status === 423) {
        setError(data.error || 'Account temporarily locked.')
        if (data.lockedUntil) {
          setLockedUntil(data.lockedUntil)
        }
        setIsLoading(false)
        return
      }

      // Handle authentication failure (401)
      if (response.status === 401) {
        setError(data.error || 'Invalid email or password.')
        if (typeof data.attemptsRemaining === 'number') {
          setAttemptsRemaining(data.attemptsRemaining)
        }
        setIsLoading(false)
        return
      }

      // Handle other errors
      if (!response.ok) {
        setError(data.error || 'An unexpected error occurred. Please try again.')
        setIsLoading(false)
        return
      }

      // Success - redirect to dashboard
      if (data.success) {
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err: any) {
      if (err.errors) {
        // Validation error
        setError(err.errors[0]?.message || "Please check your inputs")
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold">
            The Sierra Suites
          </Link>
          <h1 className="mt-6 text-3xl font-bold">Welcome Back</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
              <p className="text-sm text-green-700 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive font-medium">{error}</p>
              {attemptsRemaining !== null && attemptsRemaining > 0 && (
                <p className="text-xs text-destructive/80 mt-2">
                  {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining before account lockout
                </p>
              )}
              {lockedUntil && (
                <p className="text-xs text-destructive/80 mt-2">
                  Account will be unlocked in {formatLockedTime(lockedUntil)}
                </p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="password" className="block text-sm font-medium">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-[#1E3A8A] hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="w-full px-4 py-2 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter your password"
              />
            </div>

            <div className="flex items-center">
              <input
                id="rememberMe"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="rounded border-input"
              />
              <label htmlFor="rememberMe" className="ml-2 text-sm text-muted-foreground">
                Remember me for 30 days
              </label>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
