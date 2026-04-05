'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import toast, { Toaster } from 'react-hot-toast'
import { CameraIcon, PencilIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'

interface ProfileData {
  id: string
  company_id: string | null
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { colors, darkMode } = useThemeColors()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Inline edit state
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Email change
  const [showEmailSection, setShowEmailSection] = useState(false)
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

      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, company_id, full_name, avatar_url, phone, role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', JSON.stringify(profileError))
        throw profileError
      }

      setProfile(profileData)
      setEmail(user.email || '')
      setFullName(profileData.full_name || '')
      setPhone(profileData.phone || '')
    } catch (error: any) {
      console.error('Error loading profile:', error)
      toast.error('Error loading profile')
    } finally {
      setLoading(false)
    }
  }

  async function saveField(field: 'full_name' | 'phone', value: string) {
    if (!profile) return
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('user_profiles')
        .update({ [field]: value || null, updated_at: new Date().toISOString() })
        .eq('id', profile.id)

      if (error) throw error
      setProfile(p => p ? { ...p, [field]: value || null } : p)
      setEditingField(null)
      toast.success('Saved')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return }
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return }
    setSaving(true)
    const t = toast.loading('Changing password...')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success('Password changed', { id: t })
      setShowPasswordSection(false)
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
    if (!newEmail || newEmail === email) { toast.error('Enter a different email address'); return }
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
      setShowEmailSection(false)
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

  const bannerBg = darkMode ? '#1a1d2e' : '#e8eaf0'
  const sectionBg = darkMode ? '#2b2d3d' : '#ffffff'
  const sectionBorder = darkMode ? '#3a3d50' : '#e3e5e8'
  const labelColor = darkMode ? '#b5bac1' : '#4e5058'
  const valueColor = darkMode ? '#ffffff' : '#060607'
  const editBtnColor = darkMode ? '#b5bac1' : '#6d6f78'

  const inputStyle = {
    backgroundColor: darkMode ? '#1e2130' : '#f2f3f5',
    border: `1px solid ${darkMode ? '#4a4d60' : '#c4c9d4'}`,
    color: valueColor,
    borderRadius: '0.375rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-10 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-lg" style={{ backgroundColor: bannerBg }} />
          <div className="h-40 rounded-lg" style={{ backgroundColor: sectionBg }} />
        </div>
      </div>
    )
  }

  const initials = fullName
    ? fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : email[0]?.toUpperCase() || '?'

  return (
    <div className="max-w-2xl mx-auto px-10 py-8">
      <Toaster position="top-right" />

      <h1 className="text-xl font-bold mb-6" style={{ color: valueColor }}>My Account</h1>

      {/* Profile card */}
      <div className="rounded-lg overflow-hidden mb-4" style={{ border: `1px solid ${sectionBorder}` }}>

        {/* Banner */}
        <div className="h-24 relative" style={{ backgroundColor: bannerBg }} />

        {/* Avatar row */}
        <div style={{ backgroundColor: sectionBg }} className="px-6 pb-4">
          <div className="flex items-end justify-between" style={{ marginTop: '-40px' }}>
            <div className="relative">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center overflow-hidden text-white font-bold text-2xl ring-4"
                style={{
                  backgroundColor: '#5865f2',
                  ringColor: sectionBg,
                  outline: `4px solid ${sectionBg}`,
                }}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : initials}
              </div>
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 w-6 h-6 rounded-full flex items-center justify-center cursor-pointer"
                style={{ backgroundColor: darkMode ? '#4a4d60' : '#d4d7dc' }}
                title="Change avatar"
              >
                <CameraIcon className="w-3.5 h-3.5" style={{ color: valueColor }} />
              </label>
              <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            </div>
          </div>

          {/* Name + role */}
          <div className="mt-3">
            <div className="font-bold text-lg" style={{ color: valueColor }}>{fullName || 'No name set'}</div>
            <div className="text-sm capitalize" style={{ color: labelColor }}>{profile?.role || 'member'}</div>
          </div>
        </div>

        {/* Fields */}
        <div style={{ backgroundColor: sectionBg, borderTop: `1px solid ${sectionBorder}` }}>

          {/* Display Name */}
          <FieldRow
            label="Display Name"
            value={profile?.full_name || '—'}
            editing={editingField === 'full_name'}
            onEdit={() => { setEditingField('full_name'); setFullName(profile?.full_name || '') }}
            onCancel={() => setEditingField(null)}
            onSave={() => saveField('full_name', fullName)}
            saving={saving}
            labelColor={labelColor}
            valueColor={valueColor}
            editBtnColor={editBtnColor}
            sectionBorder={sectionBorder}
          >
            <input
              style={inputStyle}
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              autoFocus
            />
          </FieldRow>

          {/* Email */}
          <FieldRow
            label="Email"
            value={email}
            editing={showEmailSection}
            onEdit={() => { setShowEmailSection(true); setShowPasswordSection(false) }}
            onCancel={() => { setShowEmailSection(false); setNewEmail('') }}
            onSave={() => {}}
            saving={saving}
            labelColor={labelColor}
            valueColor={valueColor}
            editBtnColor={editBtnColor}
            sectionBorder={sectionBorder}
            customSave
          >
            <form onSubmit={handleEmailChange} className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: labelColor }}>New email address</label>
                <input style={inputStyle} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="new@example.com" required autoFocus />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 rounded text-sm font-medium text-white disabled:opacity-60"
                  style={{ backgroundColor: '#5865f2' }}
                >
                  {saving ? 'Sending…' : 'Send Verification'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEmailSection(false); setNewEmail('') }}
                  className="px-4 py-1.5 rounded text-sm"
                  style={{ color: labelColor }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </FieldRow>

          {/* Phone */}
          <FieldRow
            label="Phone Number"
            value={profile?.phone || '—'}
            editing={editingField === 'phone'}
            onEdit={() => { setEditingField('phone'); setPhone(profile?.phone || '') }}
            onCancel={() => setEditingField(null)}
            onSave={() => saveField('phone', phone)}
            saving={saving}
            labelColor={labelColor}
            valueColor={valueColor}
            editBtnColor={editBtnColor}
            sectionBorder={sectionBorder}
            last
          >
            <input
              style={inputStyle}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+1 (555) 000-0000"
              type="tel"
              autoFocus
            />
          </FieldRow>
        </div>
      </div>

      {/* Password & Authentication */}
      <div className="rounded-lg overflow-hidden mb-4" style={{ border: `1px solid ${sectionBorder}`, backgroundColor: sectionBg }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: showPasswordSection ? `1px solid ${sectionBorder}` : 'none' }}>
          <div>
            <div className="text-sm font-semibold" style={{ color: valueColor }}>Password</div>
            <div className="text-xs mt-0.5" style={{ color: labelColor }}>
              {showPasswordSection ? 'Enter your new password below.' : 'Use a strong, unique password.'}
            </div>
          </div>
          <button
            onClick={() => { setShowPasswordSection(!showPasswordSection); setShowEmailSection(false) }}
            className="px-3 py-1.5 text-xs font-medium rounded"
            style={{ backgroundColor: darkMode ? '#4a4d60' : '#e3e5e8', color: valueColor }}
          >
            {showPasswordSection ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {showPasswordSection && (
          <form onSubmit={handlePasswordChange} className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: labelColor }}>New Password</label>
              <input style={inputStyle} type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" required autoFocus />
              <PasswordStrengthMeter password={newPassword} userInputs={[email, fullName]} showFeedback />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: labelColor }}>Confirm New Password</label>
              <input style={inputStyle} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" required />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: '#5865f2' }}
              >
                {saving ? 'Changing…' : 'Done'}
              </button>
              <button
                type="button"
                onClick={() => { setShowPasswordSection(false); setNewPassword(''); setConfirmPassword('') }}
                className="px-4 py-1.5 rounded text-sm"
                style={{ color: labelColor }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

    </div>
  )
}

// ─── Field Row ────────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string
  value: string
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  saving: boolean
  labelColor: string
  valueColor: string
  editBtnColor: string
  sectionBorder: string
  children: React.ReactNode
  last?: boolean
  customSave?: boolean
}

function FieldRow({
  label, value, editing, onEdit, onCancel, onSave, saving,
  labelColor, valueColor, editBtnColor, sectionBorder, children, last, customSave
}: FieldRowProps) {
  return (
    <div
      className="px-6 py-4"
      style={{ borderBottom: last ? 'none' : `1px solid ${sectionBorder}` }}
    >
      {!editing ? (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide mb-0.5" style={{ color: labelColor }}>{label}</div>
            <div className="text-sm" style={{ color: valueColor }}>{value}</div>
          </div>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs font-medium rounded transition-colors"
            style={{ color: editBtnColor }}
            onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
          >
            Edit
          </button>
        </div>
      ) : (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: labelColor }}>{label}</div>
          {children}
          {!customSave && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={onSave}
                disabled={saving}
                className="px-4 py-1.5 rounded text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: '#5865f2' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-1.5 rounded text-sm"
                style={{ color: labelColor }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
