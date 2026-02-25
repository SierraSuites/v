"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import Link from "next/link"
import Image from "next/image"

export default function SecuritySettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0)

  // 2FA Setup States
  const [showSetup, setShowSetup] = useState(false)
  const [qrCode, setQrCode] = useState("")
  const [manualEntryKey, setManualEntryKey] = useState("")
  const [secret, setSecret] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [setupStep, setSetupStep] = useState<"qr" | "verify" | "codes">("qr")

  // 2FA Disable States
  const [showDisable, setShowDisable] = useState(false)
  const [disablePassword, setDisablePassword] = useState("")

  // Backup Codes Regeneration
  const [showRegenerateCodes, setShowRegenerateCodes] = useState(false)
  const [regeneratePassword, setRegeneratePassword] = useState("")

  // Active Sessions States
  const [sessions, setSessions] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    loadSecuritySettings()
    loadActiveSessions()
  }, [])

  async function loadSecuritySettings() {
    try {
      const response = await fetch("/api/auth/2fa/backup-codes")
      const data = await response.json()

      if (response.ok) {
        setTwoFactorEnabled(data.enabled)
        setBackupCodesRemaining(data.remainingCodes)
      }
    } catch (error) {
      console.error("Failed to load security settings:", error)
    } finally {
      setLoading(false)
    }
  }

  async function loadActiveSessions() {
    try {
      const response = await fetch("/api/auth/sessions")
      const data = await response.json()

      if (response.ok) {
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error("Failed to load sessions:", error)
    } finally {
      setLoadingSessions(false)
    }
  }

  async function handleRevokeSession(sessionId: string) {
    try {
      const response = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success("Session revoked successfully")
        loadActiveSessions() // Reload sessions
      } else {
        toast.error(data.error || "Failed to revoke session")
      }
    } catch (error) {
      toast.error("An error occurred")
    }
  }

  function formatSessionTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMins = Math.floor(diffInMs / 60000)

    if (diffInMins < 1) return "Just now"
    if (diffInMins < 60) return `${diffInMins} minutes ago`

    const diffInHours = Math.floor(diffInMins / 60)
    if (diffInHours < 24) return `${diffInHours} hours ago`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} days ago`
  }

  async function handleStartSetup() {
    try {
      setLoading(true)
      const response = await fetch("/api/auth/2fa/setup", {
        method: "POST",
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Failed to start 2FA setup")
        return
      }

      setQrCode(data.qrCode)
      setManualEntryKey(data.manualEntryKey)
      setSecret(data.secret)
      setShowSetup(true)
      setSetupStep("qr")
    } catch (error) {
      toast.error("An error occurred while starting 2FA setup")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifySetup() {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code")
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/auth/2fa/setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret,
          token: verificationCode,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Invalid verification code")
        return
      }

      setBackupCodes(data.backupCodes || [])
      setSetupStep("codes")
      toast.success("Two-factor authentication enabled successfully!")
    } catch (error) {
      toast.error("Failed to enable 2FA")
    } finally {
      setLoading(false)
    }
  }

  function handleFinishSetup() {
    setShowSetup(false)
    setTwoFactorEnabled(true)
    setBackupCodesRemaining(8)
    setVerificationCode("")
    setSecret("")
    setQrCode("")
    setManualEntryKey("")
    setBackupCodes([])
    setSetupStep("qr")
  }

  async function handleDisable2FA() {
    if (!disablePassword) {
      toast.error("Please enter your password")
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Failed to disable 2FA")
        return
      }

      setTwoFactorEnabled(false)
      setBackupCodesRemaining(0)
      setShowDisable(false)
      setDisablePassword("")
      toast.success("Two-factor authentication has been disabled")
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerateCodes() {
    if (!regeneratePassword) {
      toast.error("Please enter your password")
      return
    }

    try {
      setLoading(true)
      const response = await fetch("/api/auth/2fa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: regeneratePassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || "Failed to regenerate backup codes")
        return
      }

      setBackupCodes(data.backupCodes || [])
      setBackupCodesRemaining(8)
      setShowRegenerateCodes(false)
      setRegeneratePassword("")
      toast.success("Backup codes regenerated successfully")
    } catch (error) {
      toast.error("An error occurred")
    } finally {
      setLoading(false)
    }
  }

  function copyBackupCodes() {
    const text = backupCodes.join("\n")
    navigator.clipboard.writeText(text)
    toast.success("Backup codes copied to clipboard")
  }

  function downloadBackupCodes() {
    const text = backupCodes.join("\n")
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "2fa-backup-codes.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Backup codes downloaded")
  }

  if (loading && !showSetup) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/settings/profile" className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">
            ← Back to Settings
          </Link>
          <h1 className="text-3xl font-bold">Security Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account security and two-factor authentication
          </p>
        </div>

        {/* Two-Factor Authentication Section */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">Two-Factor Authentication</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Add an extra layer of security to your account by requiring a verification code in addition to your password.
              </p>

              {twoFactorEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-400">
                      Two-factor authentication is enabled
                    </span>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Backup codes remaining: <span className="font-medium">{backupCodesRemaining}</span>
                    {backupCodesRemaining === 0 && (
                      <span className="text-destructive ml-2">⚠️ Generate new codes immediately!</span>
                    )}
                  </div>

                  <div className="flex gap-3 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowRegenerateCodes(true)}
                    >
                      Regenerate Backup Codes
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDisable(true)}
                    >
                      Disable 2FA
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={handleStartSetup} disabled={loading}>
                  Enable Two-Factor Authentication
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Active Sessions Section */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Active Sessions</h2>
            <p className="text-sm text-muted-foreground">
              Manage devices and browsers where you're currently logged in. You can revoke access from any device remotely.
            </p>
          </div>

          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No active sessions found
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-start justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{session.device_name || "Unknown Device"}</h3>
                      {session.is_current && (
                        <span className="text-xs bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                          Current Session
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>IP Address: {session.ip_address || "Unknown"}</p>
                      <p>Last Active: {formatSessionTime(session.last_active_at)}</p>
                      {session.browser && <p>Browser: {session.browser}</p>}
                      {session.os && <p>OS: {session.os}</p>}
                    </div>
                  </div>
                  {!session.is_current && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevokeSession(session.id)}
                    >
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2FA Setup Modal */}
        {showSetup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              {setupStep === "qr" && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Set Up Two-Factor Authentication</h3>

                  <p className="text-sm text-muted-foreground mb-4">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)
                  </p>

                  <div className="bg-white p-4 rounded-lg inline-block mb-4">
                    <Image
                      src={qrCode}
                      alt="2FA QR Code"
                      width={300}
                      height={300}
                      className="w-full max-w-[300px]"
                    />
                  </div>

                  <div className="mb-6">
                    <p className="text-sm font-medium mb-2">Manual Entry Key:</p>
                    <code className="block bg-muted p-3 rounded text-sm break-all">
                      {manualEntryKey}
                    </code>
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setShowSetup(false)} variant="outline" className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={() => setSetupStep("verify")} className="flex-1">
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {setupStep === "verify" && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Verify Your Code</h3>

                  <p className="text-sm text-muted-foreground mb-4">
                    Enter the 6-digit code from your authenticator app to verify the setup
                  </p>

                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">Verification Code</label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full px-4 py-2 rounded-md border border-input bg-background text-center text-2xl tracking-widest"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button onClick={() => setSetupStep("qr")} variant="outline" className="flex-1">
                      Back
                    </Button>
                    <Button onClick={handleVerifySetup} disabled={loading || verificationCode.length !== 6} className="flex-1">
                      {loading ? "Verifying..." : "Verify"}
                    </Button>
                  </div>
                </div>
              )}

              {setupStep === "codes" && (
                <div>
                  <h3 className="text-xl font-semibold mb-4">Save Your Backup Codes</h3>

                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ Save these backup codes in a safe place. You can use them to access your account if you lose your authenticator device.
                    </p>
                  </div>

                  <div className="bg-muted p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {backupCodes.map((code, index) => (
                        <code key={index} className="text-sm">
                          {code}
                        </code>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3 mb-4">
                    <Button onClick={copyBackupCodes} variant="outline" className="flex-1">
                      Copy Codes
                    </Button>
                    <Button onClick={downloadBackupCodes} variant="outline" className="flex-1">
                      Download
                    </Button>
                  </div>

                  <Button onClick={handleFinishSetup} className="w-full">
                    Done
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Disable 2FA Modal */}
        {showDisable && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Disable Two-Factor Authentication</h3>

              <p className="text-sm text-muted-foreground mb-4">
                Enter your password to confirm disabling two-factor authentication
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-md border border-input bg-background"
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setShowDisable(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleDisable2FA} disabled={loading} variant="destructive" className="flex-1">
                  {loading ? "Disabling..." : "Disable 2FA"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Regenerate Codes Modal */}
        {showRegenerateCodes && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Regenerate Backup Codes</h3>

              <p className="text-sm text-muted-foreground mb-4">
                This will invalidate your current backup codes and generate new ones. Enter your password to confirm.
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Password</label>
                <input
                  type="password"
                  value={regeneratePassword}
                  onChange={(e) => setRegeneratePassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-md border border-input bg-background"
                  placeholder="Enter your password"
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setShowRegenerateCodes(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleRegenerateCodes} disabled={loading} className="flex-1">
                  {loading ? "Generating..." : "Regenerate"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Show new backup codes after regeneration */}
        {backupCodes.length > 0 && !showSetup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Your New Backup Codes</h3>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ Save these codes in a safe place. Your old codes are no longer valid.
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <code key={index} className="text-sm">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mb-4">
                <Button onClick={copyBackupCodes} variant="outline" className="flex-1">
                  Copy Codes
                </Button>
                <Button onClick={downloadBackupCodes} variant="outline" className="flex-1">
                  Download
                </Button>
              </div>

              <Button onClick={() => setBackupCodes([])} className="w-full">
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
