"use client"

import { useEffect, useState } from "react"
import zxcvbn, { ZXCVBNResult } from "zxcvbn"

interface PasswordStrengthMeterProps {
  password: string
  userInputs?: string[] // Email, name, etc. to check against
  showFeedback?: boolean
}

const STRENGTH_LABELS = [
  { label: "Very Weak", color: "bg-red-500", textColor: "text-red-700" },
  { label: "Weak", color: "bg-orange-500", textColor: "text-orange-700" },
  { label: "Fair", color: "bg-yellow-500", textColor: "text-yellow-700" },
  { label: "Good", color: "bg-blue-500", textColor: "text-blue-700" },
  { label: "Strong", color: "bg-green-500", textColor: "text-green-700" },
]

export function PasswordStrengthMeter({
  password,
  userInputs = [],
  showFeedback = true,
}: PasswordStrengthMeterProps) {
  const [result, setResult] = useState<ZXCVBNResult | null>(null)

  useEffect(() => {
    if (!password) {
      setResult(null)
      return
    }

    // Debounce the password strength calculation
    const timeoutId = setTimeout(() => {
      const strength = zxcvbn(password, userInputs)
      setResult(strength)
    }, 150)

    return () => clearTimeout(timeoutId)
  }, [password, userInputs])

  if (!password || !result) {
    return null
  }

  const { score, feedback } = result
  const strengthConfig = STRENGTH_LABELS[score]

  // Calculate time to crack display
  const crackTime = result.crack_times_display.offline_slow_hashing_1e4_per_second

  return (
    <div className="mt-2 space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${strengthConfig.color} transition-all duration-300`}
            style={{ width: `${((score + 1) / 5) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${strengthConfig.textColor}`}>
          {strengthConfig.label}
        </span>
      </div>

      {/* Feedback and Requirements */}
      {showFeedback && (
        <div className="space-y-1">
          {/* Password requirements */}
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center gap-1">
              <span className={password.length >= 8 ? "text-green-600" : "text-gray-400"}>
                {password.length >= 8 ? "✓" : "○"}
              </span>
              <span className={password.length >= 8 ? "text-green-700" : "text-gray-600"}>
                8+ characters
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={/[A-Z]/.test(password) ? "text-green-600" : "text-gray-400"}>
                {/[A-Z]/.test(password) ? "✓" : "○"}
              </span>
              <span className={/[A-Z]/.test(password) ? "text-green-700" : "text-gray-600"}>
                Uppercase letter
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={/[a-z]/.test(password) ? "text-green-600" : "text-gray-400"}>
                {/[a-z]/.test(password) ? "✓" : "○"}
              </span>
              <span className={/[a-z]/.test(password) ? "text-green-700" : "text-gray-600"}>
                Lowercase letter
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className={/[0-9]/.test(password) ? "text-green-600" : "text-gray-400"}>
                {/[0-9]/.test(password) ? "✓" : "○"}
              </span>
              <span className={/[0-9]/.test(password) ? "text-green-700" : "text-gray-600"}>
                Number
              </span>
            </div>
          </div>

          {/* zxcvbn feedback */}
          {(feedback.warning || feedback.suggestions.length > 0) && (
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1 mt-2">
              {feedback.warning && (
                <p className="text-orange-600 dark:text-orange-400">⚠️ {feedback.warning}</p>
              )}
              {feedback.suggestions.map((suggestion, index) => (
                <p key={index} className="text-gray-600 dark:text-gray-400">
                  💡 {suggestion}
                </p>
              ))}
            </div>
          )}

          {/* Time to crack (only show for good passwords) */}
          {score >= 3 && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Time to crack: <span className="font-medium">{crackTime}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Helper function to get password strength score
 * Useful for validation before form submission
 */
export function getPasswordStrength(password: string, userInputs: string[] = []): number {
  if (!password) return 0
  return zxcvbn(password, userInputs).score
}

/**
 * Helper function to check if password meets minimum requirements
 */
export function meetsPasswordRequirements(password: string): boolean {
  if (password.length < 8) return false
  if (!/[A-Z]/.test(password)) return false
  if (!/[a-z]/.test(password)) return false
  if (!/[0-9]/.test(password)) return false
  return true
}
