'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import toast, { Toaster } from 'react-hot-toast'
import {
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  PhoneIcon,
  CameraIcon,
  KeyIcon,
  BellIcon,
  GlobeAltIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline'

interface ProfileData {
  id: string
  company_id: string | null
  email: string
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: string
  timezone: string | null
  language: string | null
  notification_preferences: {
    email?: boolean
    push?: boolean
    sms?: boolean
  } | null
}

interface CompanyData {
  id: string
  name: string
  website: string | null
  phone: string | null
  email: string | null
  industry: string | null
  size: string | null
  address: {
    street?: string
    city?: string
    state?: string
    zip?: string
  } | null
}

export default function ProfilePage() {
  const router = useRouter()
  const { colors, darkMode } = useThemeColors()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const isAdmin = profile?.role === 'owner' || profile?.role === 'admin'

  // Profile fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')

  // Company fields
  const [companyName, setCompanyName] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyStreet, setCompanyStreet] = useState('')
  const [companyCity, setCompanyCity] = useState('')
  const [companyState, setCompanyState] = useState('')
  const [companyZip, setCompanyZip] = useState('')

  // Notification preferences
  const [notifEmail, setNotifEmail] = useState(true)
  const [notifPush, setNotifPush] = useState(true)
  const [notifSms, setNotifSms] = useState(false)

  // Password change
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Email change
  const [showEmailChange, setShowEmailChange] = useState(false)
  const [newEmail, setNewEmail] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // user_profiles.id == auth.users.id
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, company_id, email, full_name, avatar_url, phone, role, timezone, language, notification_preferences')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      setProfile(profileData)
      setEmail(user.email || '')
      setFullName(profileData.full_name || '')
      setPhone(profileData.phone || '')
      setTimezone(profileData.timezone || 'America/New_York')

      const notifs = profileData.notification_preferences || {}
      setNotifEmail(notifs.email ?? true)
      setNotifPush(notifs.push ?? true)
      setNotifSms(notifs.sms ?? false)

      // Fetch company separately
      if (profileData.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id, name, website, phone, email, industry, size, address')
          .eq('id', profileData.company_id)
          .single()

        if (companyData) {
          setCompany(companyData)
          setCompanyName(companyData.name || '')
          setCompanyWebsite(companyData.website || '')
          setCompanyPhone(companyData.phone || '')
          setCompanyEmail(companyData.email || '')
          const addr = companyData.address || {}
          setCompanyStreet(addr.street || '')
          setCompanyCity(addr.city || '')
          setCompanyState(addr.state || '')
          setCompanyZip(addr.zip || '')
        }
      }
    } catch (error: any) {
      console.error('Error loading profile:', error)
      toast.error('Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const t = toast.loading('Saving...')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName,
          phone: phone || null,
          timezone,
          notification_preferences: { email: notifEmail, push: notifPush, sms: notifSms },
          updated_at: new Date().toISOString()
        })
        .eq('id', profile!.id)

      if (error) throw error
      toast.success('Profile saved', { id: t })
      await loadProfile()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save profile', { id: t })
    } finally {
      setSaving(false)
    }
  }

  async function handleCompanyUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin) return
    setSaving(true)
    const t = toast.loading('Saving...')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('companies')
        .update({
          name: companyName,
          website: companyWebsite || null,
          phone: companyPhone || null,
          email: companyEmail || null,
          address: {
            street: companyStreet || null,
            city: companyCity || null,
            state: companyState || null,
            zip: companyZip || null,
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', company!.id)

      if (error) throw error
      toast.success('Company saved', { id: t })
      await loadProfile()
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save company', { id: t })
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setSaving(true)
    const t = toast.loading('Changing password...')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password changed', { id: t })
      setShowPasswordChange(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to change password', { id: t })
    } finally {
      setSaving(false)
    }
  }

  async function handleEmailChange(e: React.FormEvent) {
    e.preventDefault()
    if (!newEmail || newEmail === email) {
      toast.error('Enter a different email address')
      return
    }
    setSaving(true)
    const t = toast.loading('Sending verification...')
    try {
      const res = await fetch('/api/auth/change-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(data.message || 'Verification email sent', { id: t })
      setShowEmailChange(false)
      setNewEmail('')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send verification', { id: t })
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }

    const t = toast.loading('Uploading photo...')
    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `${profile!.id}-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile!.id)
      if (updateError) throw updateError

      setProfile(p => p ? { ...p, avatar_url: publicUrl } : p)
      toast.success('Photo updated', { id: t })
    } catch (error: any) {
      toast.error(error?.message || 'Upload failed', { id: t })
    }
  }

  const cardStyle = { backgroundColor: colors.bg, border: colors.border, borderRadius: '0.5rem' }
  const inputStyle = {
    backgroundColor: colors.bgAlt,
    border: colors.border,
    color: colors.text,
    borderRadius: '0.5rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    width: '100%',
    outline: 'none',
  }
  const labelStyle = { fontSize: '0.875rem', fontWeight: 500, color: colors.textMuted, marginBottom: '0.375rem', display: 'block' }

  const TIMEZONES = [
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
    'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu', 'UTC',
    'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Australia/Sydney',
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: colors.bgAlt }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-3 text-sm" style={{ color: colors.textMuted }}>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: colors.bgAlt }}>
      <Toaster position="top-right" />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: colors.text }}>Profile Settings</h1>
          <p className="text-sm mt-1" style={{ color: colors.textMuted }}>Manage your account and company information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Avatar card */}
            <div className="p-6 text-center" style={cardStyle}>
              <div className="relative inline-block">
                <div className="w-28 h-28 rounded-full flex items-center justify-center overflow-hidden mx-auto"
                  style={{ backgroundColor: colors.bgMuted }}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-blue-500">
                      {fullName ? fullName[0].toUpperCase() : <UserIcon className="w-12 h-12" />}
                    </span>
                  )}
                </div>
                <label htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-blue-600 text-white p-1.5 rounded-full cursor-pointer hover:bg-blue-700">
                  <CameraIcon className="w-4 h-4" />
                </label>
                <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </div>

              <h2 className="mt-4 text-lg font-semibold" style={{ color: colors.text }}>{fullName || 'No name set'}</h2>
              <p className="text-sm mt-0.5" style={{ color: colors.textMuted }}>{email}</p>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                style={{
                  backgroundColor: darkMode ? 'rgba(59,130,246,0.2)' : '#dbeafe',
                  color: darkMode ? '#93c5fd' : '#1d4ed8'
                }}>
                {profile?.role || 'member'}
              </span>
            </div>

            {/* Quick actions */}
            <div className="p-4 space-y-1" style={cardStyle}>
              <button onClick={() => { setShowPasswordChange(!showPasswordChange); setShowEmailChange(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors"
                style={{ color: colors.text }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.bgMuted)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                <KeyIcon className="w-4 h-4" style={{ color: colors.textMuted }} />
                Change Password
              </button>
              <button onClick={() => { setShowEmailChange(!showEmailChange); setShowPasswordChange(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors"
                style={{ color: colors.text }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.bgMuted)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                <EnvelopeIcon className="w-4 h-4" style={{ color: colors.textMuted }} />
                Change Email
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Personal Information */}
            <div className="p-6" style={cardStyle}>
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
                <UserIcon className="w-4 h-4" />
                Personal Information
              </h3>
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input style={inputStyle} type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} type="email" value={email} disabled />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone</label>
                    <input style={inputStyle} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div>
                    <label style={labelStyle}>Timezone</label>
                    <select style={{ ...inputStyle, appearance: 'none' as any }} value={timezone} onChange={e => setTimezone(e.target.value)}>
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </div>
                </div>

                {/* Notification Preferences inline */}
                <div className="pt-4" style={{ borderTop: colors.borderBottom }}>
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: colors.text }}>
                    <BellIcon className="w-4 h-4" />
                    Notification Preferences
                  </h4>
                  <div className="space-y-2">
                    {[
                      { label: 'Email notifications', value: notifEmail, set: setNotifEmail },
                      { label: 'Push notifications', value: notifPush, set: setNotifPush },
                      { label: 'SMS notifications', value: notifSms, set: setNotifSms },
                    ].map(({ label, value, set }) => (
                      <label key={label} className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm" style={{ color: colors.textMuted }}>{label}</span>
                        <div className="relative">
                          <input type="checkbox" className="sr-only" checked={value} onChange={e => set(e.target.checked)} />
                          <div className="w-9 h-5 rounded-full transition-colors"
                            style={{ backgroundColor: value ? '#3b82f6' : (darkMode ? '#374151' : '#d1d5db') }} />
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                            style={{ transform: value ? 'translateX(16px)' : 'translateX(0)' }} />
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>

            {/* Password Change */}
            {showPasswordChange && (
              <div className="p-6" style={cardStyle}>
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
                  <KeyIcon className="w-4 h-4" />
                  Change Password
                </h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div>
                    <label style={labelStyle}>New Password</label>
                    <input style={inputStyle} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
                    <PasswordStrengthMeter password={newPassword} userInputs={[email, fullName]} showFeedback />
                  </div>
                  <div>
                    <label style={labelStyle}>Confirm New Password</label>
                    <input style={inputStyle} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => setShowPasswordChange(false)}
                      className="px-4 py-2 text-sm rounded-lg transition-colors"
                      style={{ border: colors.border, color: colors.text }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={saving}
                      className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {saving ? 'Changing...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Email Change */}
            {showEmailChange && (
              <div className="p-6" style={cardStyle}>
                <h3 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ color: colors.text }}>
                  <EnvelopeIcon className="w-4 h-4" />
                  Change Email
                </h3>
                <div className="mb-4 p-3 rounded-lg text-sm"
                  style={{ backgroundColor: darkMode ? 'rgba(234,179,8,0.1)' : '#fefce8', color: darkMode ? '#fde047' : '#854d0e', border: `1px solid ${darkMode ? 'rgba(234,179,8,0.2)' : '#fef08a'}` }}>
                  A verification link will be sent to your new address. Your email won't change until you click it.
                </div>
                <form onSubmit={handleEmailChange} className="space-y-4">
                  <div>
                    <label style={labelStyle}>Current Email</label>
                    <input style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} type="email" value={email} disabled />
                  </div>
                  <div>
                    <label style={labelStyle}>New Email Address</label>
                    <input style={inputStyle} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@example.com" required />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button type="button" onClick={() => { setShowEmailChange(false); setNewEmail('') }}
                      className="px-4 py-2 text-sm rounded-lg"
                      style={{ border: colors.border, color: colors.text }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={saving}
                      className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
                      {saving ? 'Sending...' : 'Send Verification'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Company Information */}
            {company && (
              <div className="p-6" style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: colors.text }}>
                    <BuildingOfficeIcon className="w-4 h-4" />
                    Company Information
                  </h3>
                  {!isAdmin && (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md"
                      style={{ backgroundColor: colors.bgMuted, color: colors.textMuted }}>
                      <LockClosedIcon className="w-3 h-3" />
                      Admin only
                    </span>
                  )}
                </div>

                <form onSubmit={handleCompanyUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label style={labelStyle}>Company Name</label>
                      <input style={isAdmin ? inputStyle : { ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                        type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={!isAdmin} />
                    </div>
                    <div>
                      <label style={labelStyle}>Website</label>
                      <input style={isAdmin ? inputStyle : { ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                        type="url" value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)}
                        placeholder="https://..." disabled={!isAdmin} />
                    </div>
                    <div>
                      <label style={labelStyle}>Phone</label>
                      <input style={isAdmin ? inputStyle : { ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                        type="tel" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} disabled={!isAdmin} />
                    </div>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input style={isAdmin ? inputStyle : { ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                        type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} disabled={!isAdmin} />
                    </div>
                    <div className="sm:col-span-2">
                      <label style={labelStyle}>Street Address</label>
                      <input style={isAdmin ? inputStyle : { ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                        type="text" value={companyStreet} onChange={e => setCompanyStreet(e.target.value)} disabled={!isAdmin} />
                    </div>
                    <div>
                      <label style={labelStyle}>City</label>
                      <input style={isAdmin ? inputStyle : { ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                        type="text" value={companyCity} onChange={e => setCompanyCity(e.target.value)} disabled={!isAdmin} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label style={labelStyle}>State</label>
                        <input style={isAdmin ? inputStyle : { ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                          type="text" value={companyState} onChange={e => setCompanyState(e.target.value)} disabled={!isAdmin} />
                      </div>
                      <div>
                        <label style={labelStyle}>ZIP</label>
                        <input style={isAdmin ? inputStyle : { ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                          type="text" value={companyZip} onChange={e => setCompanyZip(e.target.value)} disabled={!isAdmin} />
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex justify-end pt-2">
                      <button type="submit" disabled={saving}
                        className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                        {saving ? 'Saving...' : 'Save Company'}
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
