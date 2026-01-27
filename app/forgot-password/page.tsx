"use client"

export const dynamic = 'force-dynamic'

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { forgotPasswordSchema } from "@/lib/validation"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Validate email
      const validated = forgotPasswordSchema.parse({ email })

      // Create Supabase client
      const supabase = createClient()

      // Use the site URL from environment or current origin
      // This allows the app to work on both localhost and network IP for mobile testing
      const siteUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const redirectUrl = `${siteUrl}/reset-password`

      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        validated.email,
        {
          redirectTo: redirectUrl,
        }
      )

      if (resetError) {
        setError(resetError.message)
        setIsLoading(false)
        return
      }

      // Success
      setSuccess(true)
      setIsLoading(false)
    } catch (err: any) {
      if (err.errors) {
        setError(err.errors[0]?.message || "Please enter a valid email")
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
          <h1 className="mt-6 text-3xl font-bold">Forgot Password?</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your email and we'll send you a reset link
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          {success ? (
            <div className="text-center space-y-4">
              {/* Success State */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-2">Check Your Email</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  We've sent a password reset link to{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  The link will expire in 1 hour. If you don't receive an email,
                  check your spam folder or try again.
                </p>
              </div>
              <div className="space-y-3">
                <Link href="/login" className="block">
                  <Button className="w-full">Back to Login</Button>
                </Link>
                <button
                  onClick={() => {
                    setSuccess(false)
                    setEmail("")
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Try a different email
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">{error}</p>
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
                  <p className="mt-2 text-xs text-muted-foreground">
                    Enter the email associated with your account
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                Remember your password?{" "}
                <Link href="/login" className="text-[#1E3A8A] hover:underline font-medium">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
