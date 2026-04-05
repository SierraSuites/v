'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import toast, { Toaster } from 'react-hot-toast'

interface CompanyData {
  id: string
  name: string
  website: string | null
  phone: string | null
  email: string | null
  industry: string | null
  size: string | null
  address: { street?: string; city?: string; state?: string; zip?: string } | null
}

export default function CompanySettingsPage() {
  const { colors, darkMode } = useThemeColors()
  const { user } = useCurrentUser()

  const [company, setCompany] = useState<CompanyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [industry, setIndustry] = useState('')
  const [size, setSize] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')

  const isAdmin = user?.highestRole === 'owner' || user?.highestRole === 'admin'

  useEffect(() => {
    if (user?.company_id) loadCompany(user.company_id)
  }, [user?.company_id])

  async function loadCompany(companyId: string) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, website, phone, email, industry, size, address')
        .eq('id', companyId)
        .single()

      if (error) throw error
      setCompany(data)
      setName(data.name || '')
      setWebsite(data.website || '')
      setPhone(data.phone || '')
      setEmail(data.email || '')
      setIndustry(data.industry || '')
      setSize(data.size || '')
      const addr = data.address || {}
      setStreet(addr.street || '')
      setCity(addr.city || '')
      setState(addr.state || '')
      setZip(addr.zip || '')
    } catch (err) {
      console.error('Error loading company:', err)
      toast.error('Failed to load company')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!company) return
    setSaving(true)
    const t = toast.loading('Saving...')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('companies')
        .update({
          name,
          website: website || null,
          phone: phone || null,
          email: email || null,
          industry: industry || null,
          size: size || null,
          address: { street, city, state, zip },
        })
        .eq('id', company.id)

      if (error) throw error
      toast.success('Company saved', { id: t })
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save', { id: t })
    } finally {
      setSaving(false)
    }
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

  const labelStyle = {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: colors.textMuted,
    marginBottom: '0.375rem',
    display: 'block',
  }

  const sectionStyle = {
    backgroundColor: colors.bg,
    border: colors.border,
    borderRadius: '0.5rem',
    padding: '1.5rem',
    marginBottom: '1rem',
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-10 py-8">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-6 animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-10 py-8" style={{ color: colors.textMuted }}>
        <h1 className="text-xl font-bold mb-2" style={{ color: colors.text }}>Company</h1>
        <p>You need admin or owner permissions to manage company settings.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-10 py-8" style={{ color: colors.text }}>
      <Toaster />
      <h1 className="text-xl font-bold mb-1" style={{ color: colors.text }}>Company</h1>
      <p className="text-sm mb-6" style={{ color: colors.textMuted }}>
        Manage your company profile and contact information.
      </p>

      <form onSubmit={handleSave}>
        {/* Basic Info */}
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: colors.textMuted }}>
          Basic Information
        </h2>
        <div style={sectionStyle} className="space-y-4">
          <div>
            <label style={labelStyle}>Company Name</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Sierra Suites Software" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Industry</label>
              <select style={inputStyle} value={industry} onChange={e => setIndustry(e.target.value)}>
                <option value="">Select industry</option>
                <option value="construction">Construction</option>
                <option value="architecture">Architecture</option>
                <option value="engineering">Engineering</option>
                <option value="real_estate">Real Estate</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Company Size</label>
              <select style={inputStyle} value={size} onChange={e => setSize(e.target.value)}>
                <option value="">Select size</option>
                <option value="solo">Solo (1 person)</option>
                <option value="small">Small (2–10 employees)</option>
                <option value="medium">Medium (11–50 employees)</option>
                <option value="large">Large (50+ employees)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact */}
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 mt-6" style={{ color: colors.textMuted }}>
          Contact
        </h2>
        <div style={sectionStyle} className="space-y-4">
          <div>
            <label style={labelStyle}>Website</label>
            <input style={inputStyle} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourcompany.com" type="url" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@company.com" type="email" />
            </div>
          </div>
        </div>

        {/* Address */}
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 mt-6" style={{ color: colors.textMuted }}>
          Address
        </h2>
        <div style={sectionStyle} className="space-y-4">
          <div>
            <label style={labelStyle}>Street</label>
            <input style={inputStyle} value={street} onChange={e => setStreet(e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} placeholder="San Francisco" />
            </div>
            <div>
              <label style={labelStyle}>State</label>
              <input style={inputStyle} value={state} onChange={e => setState(e.target.value)} placeholder="CA" />
            </div>
            <div>
              <label style={labelStyle}>ZIP</label>
              <input style={inputStyle} value={zip} onChange={e => setZip(e.target.value)} placeholder="94102" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-md text-sm font-semibold text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: '#5865f2' }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
