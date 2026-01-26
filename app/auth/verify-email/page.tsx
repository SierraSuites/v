"use client"
import { Suspense } from "react"
import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      const supabase = createClient()

      // Check if there's a token in the URL (from email click)
      const token = searchParams.get('token')
      const type = searchParams.get('type')

      if (token && type === 'signup') {
        // User clicked the email verification link
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup'
        })

        if (error) {
          setStatus('error')
          setMessage(error.message)
        } else {
          setStatus('success')
          setMessage('Your email has been verified successfully!')

          // Redirect to login after 3 seconds
          setTimeout(() => {
            router.push('/login?verified=true')
          }, 3000)
        }
      } else {
        // Check current session
        const { data: { session } } = await supabase.auth.getSession()

        if (session?.user?.email_confirmed_at) {
          setStatus('success')
          setMessage('Your email is already verified!')
          setTimeout(() => {
            router.push('/login')
          }, 2000)
        } else {
          setStatus('error')
          setMessage('Invalid or expired verification link.')
        }
      }
    }

    verifyEmail()
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold">
            The Sierra Suites
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
          {status === 'loading' && (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
              <p className="text-sm text-muted-foreground">
                Please wait while we confirm your email address.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
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
              <h2 className="text-xl font-semibold mb-2 text-green-600">Email Verified!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {message}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Redirecting you to login...
              </p>
              <Link href="/login">
                <Button className="w-full">
                  Continue to Login
                </Button>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-600"
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
              <h2 className="text-xl font-semibold mb-2 text-red-600">Verification Failed</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {message}
              </p>
              <div className="space-y-3">
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    Go to Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button className="w-full">
                    Create New Account
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Need help?{" "}
          <Link href="#" className="text-primary hover:underline">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
