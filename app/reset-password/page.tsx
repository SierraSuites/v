"use client"

export const dynamic = 'force-dynamic'
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { resetPasswordSchema } from "@/lib/validation"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidToken, setIsValidToken] = useState(false)
  const [isCheckingToken, setIsCheckingToken] = useState(true)

  // Check if we have a valid session from the email link
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient()

      // Check if user is authenticated (came from email link)
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setIsValidToken(true)
      } else {
        setError("This password reset link is invalid or has expired.")
      }

      setIsCheckingToken(false)
    }

    checkSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setErrors({})
    setIsLoading(true)

    try {
      // Validate passwords
      const validated = resetPasswordSchema.parse({ password, confirmPassword })

      // Create Supabase client
      const supabase = createClient()

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: validated.password,
      })

      if (updateError) {
        setError(updateError.message)
        setIsLoading(false)
        return
      }

      // Success - show success message
      setSuccess(true)
      setIsLoading(false)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (err: any) {
      if (err.errors) {
        // Validation errors
        const fieldErrors: Record<string, string> = {}
        err.errors.forEach((error: any) => {
          fieldErrors[error.path[0]] = error.message
        })
        setErrors(fieldErrors)
      } else {
        setError("An unexpected error occurred. Please try again.")
      }
      setIsLoading(false)
    }
  }

  // Show loading while checking token
  if (isCheckingToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  // Show error if token is invalid
  if (!isValidToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="text-2xl font-bold">
              The Sierra Suites
            </Link>
            <h1 className="mt-6 text-3xl font-bold">Invalid Link</h1>
          </div>

          <div className="rounded-xl border border-border bg-card p-8 shadow-lg text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Link Expired</h2>
              <p className="text-sm text-muted-foreground mb-6">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>
            <div className="space-y-3">
              <Link href="/forgot-password" className="block">
                <Button className="w-full">Request New Link</Button>
              </Link>
              <Link href="/login" className="block">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold">
            The Sierra Suites
          </Link>
          <h1 className="mt-6 text-3xl font-bold">Reset Password</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your new password below
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
                <h2 className="text-xl font-semibold mb-2">Password Reset!</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Your password has been successfully reset.
                </p>
                <p className="text-sm text-muted-foreground">
                  Redirecting you to login...
                </p>
              </div>
              <Link href="/login" className="block">
                <Button className="w-full">Go to Login</Button>
              </Link>
            </div>
          ) : (
            <>
              {/* General Error Message */}
              {error && (
                <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">
                    New Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className={`w-full px-4 py-2 rounded-md border ${
                      errors.password ? "border-destructive" : "border-input"
                    } bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed`}
                    placeholder="Create a strong password"
                  />
                  {errors.password && (
                    <p className="text-sm text-destructive mt-1">{errors.password}</p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Must be at least 8 characters with uppercase, lowercase, and number
                  </p>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className={`w-full px-4 py-2 rounded-md border ${
                      errors.confirmPassword ? "border-destructive" : "border-input"
                    } bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed`}
                    placeholder="Confirm your password"
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Resetting..." : "Reset Password"}
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
