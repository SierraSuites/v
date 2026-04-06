'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { useSettingsData } from '@/lib/contexts/SettingsContext'
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter'
import toast, { Toaster } from 'react-hot-toast'
import { CameraIcon, XMarkIcon } from '@heroicons/react/24/outline'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'

interface ProfileData {
  id: string
  company_id: string | null
  full_name: string | null
  avatar_url: string | null
  phone: string | null
  role: string
}

export default function ProfilePage() {
  const { colors, darkMode } = useThemeColors()
  const seed = useSettingsData()

  // Seed immediately from layout — no loading state
  const [profile, setProfile] = useState<ProfileData | null>(seed.profile)
  const [email, setEmail] = useState(seed.email)
  const [saving, setSaving] = useState(false)

  // Inline edit state
  const [editingField, setEditingField] = useState<string | null>(null)
  const [fullName, setFullName] = useState(seed.profile?.full_name || '')
  const [phone, setPhone] = useState(seed.profile?.phone || '')

  // Password change
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Email change
  const [showEmailSection, setShowEmailSection] = useState(false)
  const [newEmail, setNewEmail] = useState('')

  // Avatar crop
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels)
  }, [])

  // Silent background refresh
  useEffect(() => {
    async function refresh() {
      const supabase = createClient()
      const [{ data: { user } }, ] = await Promise.all([supabase.auth.getUser()])
      if (!user) return
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('id, company_id, full_name, avatar_url, phone, role')
        .eq('id', user.id)
        .single()
      if (profileData) {
        setProfile(profileData)
        setEmail(user.email || '')
        setFullName(prev => editingField === 'full_name' ? prev : (profileData.full_name || ''))
        setPhone(prev => editingField === 'phone' ? prev : (profileData.phone || ''))
      }
    }
    refresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // reset so same file can be re-selected
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return }
    const objectUrl = URL.createObjectURL(file)
    setCropSrc(objectUrl)
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  async function handleCropConfirm() {
    if (!cropSrc || !croppedAreaPixels || !profile) return
    setSaving(true)
    const t = toast.loading('Uploading photo...')
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels)
      const fileName = `${profile.id}-${Date.now()}.jpg`
      const supabase = createClient()

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)
      if (updateError) throw updateError

      setProfile(p => p ? { ...p, avatar_url: publicUrl } : p)
      toast.success('Photo updated', { id: t })
      setCropSrc(null)
    } catch (error: any) {
      toast.error(error?.message || 'Upload failed', { id: t })
    } finally {
      setSaving(false)
    }
  }

  const bannerBg = darkMode ? '#252a3a' : '#e8eaf0'
  const sectionBg = darkMode ? '#1a1d2e' : '#ffffff'
  const sectionBorder = darkMode ? '#2d3548' : '#e3e5e8'
  const labelColor = darkMode ? '#94a3b8' : '#4e5058'
  const valueColor = darkMode ? '#e2e8f0' : '#060607'
  const editBtnColor = darkMode ? '#94a3b8' : '#6d6f78'

  const inputStyle = {
    backgroundColor: darkMode ? '#252a3a' : '#f2f3f5',
    border: `1px solid ${darkMode ? '#2d3548' : '#c4c9d4'}`,
    color: valueColor,
    borderRadius: '0.375rem',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    outline: 'none',
    width: '100%',
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
                style={{ backgroundColor: darkMode ? '#252a3a' : '#d4d7dc' }}
                title="Change avatar"
              >
                <CameraIcon className="w-3.5 h-3.5" style={{ color: valueColor }} />
              </label>
              <input id="avatar-upload" type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
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

      {/* Avatar Crop Modal */}
      {cropSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="flex flex-col rounded-xl overflow-hidden w-full max-w-sm" style={{ backgroundColor: sectionBg, border: `1px solid ${sectionBorder}` }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${sectionBorder}` }}>
              <span className="font-semibold text-sm" style={{ color: valueColor }}>Crop Photo</span>
              <button onClick={() => setCropSrc(null)} style={{ color: labelColor }}>
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Cropper area */}
            <div className="relative w-full" style={{ height: 300, backgroundColor: '#000' }}>
              <Cropper
                image={cropSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Zoom slider */}
            <div className="px-5 py-3" style={{ borderTop: `1px solid ${sectionBorder}` }}>
              <label className="block text-xs mb-2" style={{ color: labelColor }}>Zoom</label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={e => setZoom(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setCropSrc(null)}
                className="flex-1 py-2 rounded-md text-sm font-medium"
                style={{ backgroundColor: darkMode ? '#252a3a' : '#e3e5e8', color: valueColor }}
              >
                Cancel
              </button>
              <button
                onClick={handleCropConfirm}
                disabled={saving}
                className="flex-1 py-2 rounded-md text-sm font-medium text-white disabled:opacity-60"
                style={{ backgroundColor: '#5865f2' }}
              >
                {saving ? 'Uploading…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ backgroundColor: 'transparent', border: `1px solid ${sectionBorder}`, color: valueColor, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = darkMode ? 'rgba(255,255,255,0.1)' : '#f3f4f6')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
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

// ─── Crop Helper ──────────────────────────────────────────────────────────────

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.addEventListener('load', () => resolve(img))
    img.addEventListener('error', reject)
    img.src = imageSrc
  })

  const canvas = document.createElement('canvas')
  const size = 400 // output size in px
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size,
  )

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('Canvas toBlob failed'))
    }, 'image/jpeg', 0.92)
  })
}
