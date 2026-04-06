'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

export default function SecuritySettingsPage() {
  const router = useRouter()
  const { colors, darkMode } = useThemeColors()
  const [loading, setLoading] = useState(true)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(0)

  // 2FA Setup States
  const [showSetup, setShowSetup] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [manualEntryKey, setManualEntryKey] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [setupStep, setSetupStep] = useState<'qr' | 'verify' | 'codes'>('qr')

  // 2FA Disable States
  const [showDisable, setShowDisable] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')

  // Backup Codes Regeneration
  const [showRegenerateCodes, setShowRegenerateCodes] = useState(false)
  const [regeneratePassword, setRegeneratePassword] = useState('')

  // Active Sessions States
  const [sessions, setSessions] = useState<any[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)

  useEffect(() => {
    loadSecuritySettings()
    loadActiveSessions()
  }, [])

  async function loadSecuritySettings() {
    try {
      const response = await fetch('/api/auth/2fa/backup-codes')
      const data = await response.json()
      if (response.ok) {
        setTwoFactorEnabled(data.enabled)
        setBackupCodesRemaining(data.remainingCodes)
      }
    } catch (error) {
      console.error('Failed to load security settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadActiveSessions() {
    try {
      const response = await fetch('/api/auth/sessions')
      const data = await response.json()
      if (response.ok) {
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoadingSessions(false)
    }
  }

  async function handleRevokeSession(sessionId: string) {
    try {
      const response = await fetch('/api/auth/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await response.json()
      if (response.ok) {
        toast.success('Session revoked successfully')
        loadActiveSessions()
      } else {
        toast.error(data.error || 'Failed to revoke session')
      }
    } catch (error) {
      toast.error('An error occurred')
    }
  }

  function formatSessionTime(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMins = Math.floor((now.getTime() - date.getTime()) / 60000)
    if (diffInMins < 1) return 'Just now'
    if (diffInMins < 60) return `${diffInMins} minutes ago`
    const diffInHours = Math.floor(diffInMins / 60)
    if (diffInHours < 24) return `${diffInHours} hours ago`
    return `${Math.floor(diffInHours / 24)} days ago`
  }

  async function handleStartSetup() {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || 'Failed to start 2FA setup'); return }
      setQrCode(data.qrCode)
      setManualEntryKey(data.manualEntryKey)
      setSecret(data.secret)
      setShowSetup(true)
      setSetupStep('qr')
    } catch {
      toast.error('An error occurred while starting 2FA setup')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifySetup() {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }
    try {
      setLoading(true)
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, token: verificationCode }),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || 'Invalid verification code'); return }
      setBackupCodes(data.backupCodes || [])
      setSetupStep('codes')
      toast.success('Two-factor authentication enabled successfully!')
    } catch {
      toast.error('Failed to enable 2FA')
    } finally {
      setLoading(false)
    }
  }

  function handleFinishSetup() {
    setShowSetup(false)
    setTwoFactorEnabled(true)
    setBackupCodesRemaining(8)
    setVerificationCode('')
    setSecret('')
    setQrCode('')
    setManualEntryKey('')
    setBackupCodes([])
    setSetupStep('qr')
  }

  async function handleDisable2FA() {
    if (!disablePassword) { toast.error('Please enter your password'); return }
    try {
      setLoading(true)
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || 'Failed to disable 2FA'); return }
      setTwoFactorEnabled(false)
      setBackupCodesRemaining(0)
      setShowDisable(false)
      setDisablePassword('')
      toast.success('Two-factor authentication has been disabled')
    } catch {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerateCodes() {
    if (!regeneratePassword) { toast.error('Please enter your password'); return }
    try {
      setLoading(true)
      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: regeneratePassword }),
      })
      const data = await response.json()
      if (!response.ok) { toast.error(data.error || 'Failed to regenerate backup codes'); return }
      setBackupCodes(data.backupCodes || [])
      setBackupCodesRemaining(8)
      setShowRegenerateCodes(false)
      setRegeneratePassword('')
      toast.success('Backup codes regenerated successfully')
    } catch {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  function copyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    toast.success('Backup codes copied to clipboard')
  }

  function downloadBackupCodes() {
    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '2fa-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Backup codes downloaded')
  }

  // ─── Derived styles ─────────────────────────────────────────────────────────

  const cardStyle = {
    backgroundColor: colors.bg,
    border: colors.border,
    borderRadius: '0.75rem',
    padding: '1.5rem',
  }

  const inputStyle = {
    backgroundColor: colors.bgAlt,
    border: colors.border,
    color: colors.text,
    borderRadius: '0.375rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  }

  const btnPrimary = {
    backgroundColor: '#5865f2',
    color: '#ffffff',
    border: 'none',
    borderRadius: '0.375rem',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  } as const

  const btnOutline = {
    backgroundColor: 'transparent',
    color: colors.text,
    border: colors.border,
    borderRadius: '0.375rem',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  } as const

  const btnDestructive = {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '0.375rem',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  } as const

  const modalBg = {
    backgroundColor: colors.bg,
    border: colors.border,
    borderRadius: '0.75rem',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '28rem',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading && !showSetup) {
    return (
      <div className="max-w-2xl mx-auto px-10 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 rounded w-48" style={{ backgroundColor: colors.bgMuted }} />
          <div className="h-40 rounded-lg" style={{ backgroundColor: colors.bg }} />
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-10 py-8" style={{ color: colors.text }}>
      <h1 className="text-xl font-bold mb-1" style={{ color: colors.text }}>Security</h1>
      <p className="text-sm mb-6" style={{ color: colors.textMuted }}>
        Manage your account security and two-factor authentication.
      </p>

      {/* Two-Factor Authentication */}
      <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: colors.textMuted }}>
        Two-Factor Authentication
      </h2>
      <div style={cardStyle} className="mb-6">
        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
          Add an extra layer of security by requiring a verification code in addition to your password.
        </p>

        {twoFactorEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
              <span className="text-sm font-medium" style={{ color: '#22c55e' }}>
                Two-factor authentication is enabled
              </span>
            </div>
            <div className="text-sm" style={{ color: colors.textMuted }}>
              Backup codes remaining: <span className="font-medium" style={{ color: colors.text }}>{backupCodesRemaining}</span>
              {backupCodesRemaining === 0 && (
                <span className="ml-2" style={{ color: '#ef4444' }}>Generate new codes immediately!</span>
              )}
            </div>
            <div className="flex gap-3 flex-wrap">
              <button style={btnOutline} onClick={() => setShowRegenerateCodes(true)}>
                Regenerate Backup Codes
              </button>
              <button style={btnDestructive} onClick={() => setShowDisable(true)}>
                Disable 2FA
              </button>
            </div>
          </div>
        ) : (
          <button style={btnPrimary} onClick={handleStartSetup} disabled={loading}>
            Enable Two-Factor Authentication
          </button>
        )}
      </div>

      {/* Active Sessions */}
      <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: colors.textMuted }}>
        Active Sessions
      </h2>
      <div style={cardStyle}>
        <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
          Manage devices and browsers where you're currently logged in.
        </p>

        {loadingSessions ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#5865f2', borderTopColor: 'transparent' }} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: colors.textMuted }}>
            No active sessions found
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-start justify-between p-4 rounded-lg"
                style={{ backgroundColor: colors.bgAlt, border: colors.border }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm" style={{ color: colors.text }}>
                      {session.device_name || 'Unknown Device'}
                    </span>
                    {session.is_current && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: darkMode ? 'rgba(34,197,94,0.15)' : '#dcfce7', color: '#16a34a' }}
                      >
                        Current Session
                      </span>
                    )}
                  </div>
                  <div className="text-xs space-y-0.5" style={{ color: colors.textMuted }}>
                    {session.ip_address && <p>IP: {session.ip_address}</p>}
                    <p>Last active: {formatSessionTime(session.last_active_at)}</p>
                    {session.browser && <p>Browser: {session.browser}</p>}
                    {session.os && <p>OS: {session.os}</p>}
                  </div>
                </div>
                {!session.is_current && (
                  <button
                    style={{ ...btnDestructive, padding: '0.375rem 0.75rem', fontSize: '0.75rem' }}
                    onClick={() => handleRevokeSession(session.id)}
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      {/* 2FA Setup Modal */}
      {showSetup && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div style={modalBg}>
            {setupStep === 'qr' && (
              <div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>Set Up Two-Factor Authentication</h3>
                <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                <div className="bg-white p-4 rounded-lg inline-block mb-4">
                  <Image src={qrCode} alt="2FA QR Code" width={240} height={240} className="w-full max-w-60" />
                </div>
                <div className="mb-6">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textMuted }}>Manual Entry Key</p>
                  <code
                    className="block p-3 rounded text-sm break-all"
                    style={{ backgroundColor: colors.bgAlt, color: colors.text, border: colors.border }}
                  >
                    {manualEntryKey}
                  </code>
                </div>
                <div className="flex gap-3">
                  <button style={{ ...btnOutline, flex: 1 }} onClick={() => setShowSetup(false)}>Cancel</button>
                  <button style={{ ...btnPrimary, flex: 1 }} onClick={() => setSetupStep('verify')}>Next</button>
                </div>
              </div>
            )}

            {setupStep === 'verify' && (
              <div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>Verify Your Code</h3>
                <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
                  Enter the 6-digit code from your authenticator app.
                </p>
                <div className="mb-6">
                  <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textMuted }}>
                    Verification Code
                  </label>
                  <input
                    style={{ ...inputStyle, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.2em' }}
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>
                <div className="flex gap-3">
                  <button style={{ ...btnOutline, flex: 1 }} onClick={() => setSetupStep('qr')}>Back</button>
                  <button
                    style={{ ...btnPrimary, flex: 1, opacity: loading || verificationCode.length !== 6 ? 0.6 : 1 }}
                    onClick={handleVerifySetup}
                    disabled={loading || verificationCode.length !== 6}
                  >
                    {loading ? 'Verifying…' : 'Verify'}
                  </button>
                </div>
              </div>
            )}

            {setupStep === 'codes' && (
              <div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>Save Your Backup Codes</h3>
                <div
                  className="rounded-lg p-4 mb-4"
                  style={{ backgroundColor: darkMode ? 'rgba(234,179,8,0.1)' : '#fefce8', border: `1px solid ${darkMode ? '#713f12' : '#fde68a'}` }}
                >
                  <p className="text-sm" style={{ color: darkMode ? '#fde68a' : '#92400e' }}>
                    Save these backup codes in a safe place. You can use them if you lose your authenticator device.
                  </p>
                </div>
                <div className="p-4 rounded-lg mb-4 grid grid-cols-2 gap-2" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                  {backupCodes.map((code, i) => (
                    <code key={i} className="text-sm font-mono" style={{ color: colors.text }}>{code}</code>
                  ))}
                </div>
                <div className="flex gap-3 mb-3">
                  <button style={{ ...btnOutline, flex: 1 }} onClick={copyBackupCodes}>Copy Codes</button>
                  <button style={{ ...btnOutline, flex: 1 }} onClick={downloadBackupCodes}>Download</button>
                </div>
                <button style={{ ...btnPrimary, width: '100%' }} onClick={handleFinishSetup}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showDisable && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div style={modalBg}>
            <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>Disable Two-Factor Authentication</h3>
            <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
              Enter your password to confirm disabling two-factor authentication.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textMuted }}>Password</label>
              <input
                style={inputStyle}
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <div className="flex gap-3">
              <button style={{ ...btnOutline, flex: 1 }} onClick={() => setShowDisable(false)}>Cancel</button>
              <button
                style={{ ...btnDestructive, flex: 1, opacity: loading ? 0.6 : 1 }}
                onClick={handleDisable2FA}
                disabled={loading}
              >
                {loading ? 'Disabling…' : 'Disable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Codes Modal */}
      {showRegenerateCodes && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div style={modalBg}>
            <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>Regenerate Backup Codes</h3>
            <p className="text-sm mb-4" style={{ color: colors.textMuted }}>
              This will invalidate your current backup codes. Enter your password to confirm.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: colors.textMuted }}>Password</label>
              <input
                style={inputStyle}
                type="password"
                value={regeneratePassword}
                onChange={(e) => setRegeneratePassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>
            <div className="flex gap-3">
              <button style={{ ...btnOutline, flex: 1 }} onClick={() => setShowRegenerateCodes(false)}>Cancel</button>
              <button
                style={{ ...btnPrimary, flex: 1, opacity: loading ? 0.6 : 1 }}
                onClick={handleRegenerateCodes}
                disabled={loading}
              >
                {loading ? 'Generating…' : 'Regenerate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show new backup codes after regeneration */}
      {backupCodes.length > 0 && !showSetup && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div style={modalBg}>
            <h3 className="text-lg font-semibold mb-1" style={{ color: colors.text }}>Your New Backup Codes</h3>
            <div
              className="rounded-lg p-4 mb-4"
              style={{ backgroundColor: darkMode ? 'rgba(234,179,8,0.1)' : '#fefce8', border: `1px solid ${darkMode ? '#713f12' : '#fde68a'}` }}
            >
              <p className="text-sm" style={{ color: darkMode ? '#fde68a' : '#92400e' }}>
                Save these codes in a safe place. Your old codes are no longer valid.
              </p>
            </div>
            <div className="p-4 rounded-lg mb-4 grid grid-cols-2 gap-2" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
              {backupCodes.map((code, i) => (
                <code key={i} className="text-sm font-mono" style={{ color: colors.text }}>{code}</code>
              ))}
            </div>
            <div className="flex gap-3 mb-3">
              <button style={{ ...btnOutline, flex: 1 }} onClick={copyBackupCodes}>Copy Codes</button>
              <button style={{ ...btnOutline, flex: 1 }} onClick={downloadBackupCodes}>Download</button>
            </div>
            <button style={{ ...btnPrimary, width: '100%' }} onClick={() => setBackupCodes([])}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
