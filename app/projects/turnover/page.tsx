'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useThemeColors } from '@/lib/hooks/useThemeColors'
import toast from 'react-hot-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WarrantyDocument {
  id: string; item: string; category: string; manufacturer: string
  warranty_period: string; expiration_date: string; coverage_details: string; claim_process: string
  document_url: string | null
}
interface MaintenanceItem {
  id: string; system: string; task: string; frequency: string; season: string
  instructions: string; estimated_cost: number; professional_required: boolean
}
interface Doc {
  id: string; name: string; type: string; url: string | null; size_bytes: number; uploaded_at: string
}
interface Contact {
  id: string; name: string; company: string; role: string
  phone: string; email: string; hours: string; notes: string
}
interface TurnoverPackage {
  id: string; project_id: string; package_name: string
  package_type: 'complete' | 'interim' | 'warranty_only'
  warranty_documents: WarrantyDocument[]
  maintenance_schedules: MaintenanceItem[]
  asbuilt_drawings: Doc[]; owner_manuals: Doc[]
  inspection_reports: Doc[]; permits_certificates: Doc[]
  emergency_contacts: Contact[]; subcontractor_contacts: Contact[]; supplier_contacts: Contact[]
  generated_pdf_url: string | null; package_size_bytes: number
  delivered_to: string; delivered_at: string | null
  delivery_method: 'email' | 'usb_drive' | 'cloud_link' | 'printed_binder' | null
  status: 'draft' | 'review' | 'approved' | 'delivered'; notes: string
}

// ─── Demo data ────────────────────────────────────────────────────────────────

const DEMO_PACKAGE: Omit<TurnoverPackage, 'project_id'> = {
  id: '1', package_name: 'Final Turnover Package', package_type: 'complete',
  warranty_documents: [
    { id: 'w1', item: 'Roofing System', category: 'Exterior', manufacturer: 'CertainTeed', warranty_period: '25 years', expiration_date: '2051-03-01', coverage_details: 'Full material and labor for 10 years, then prorated material for remaining 15.', claim_process: 'Contact manufacturer at 1-800-ROOFING or certainteed.com/warranty. Have installation certificate ready.', document_url: null },
    { id: 'w2', item: 'HVAC System', category: 'Mechanical', manufacturer: 'Carrier', warranty_period: '10 years parts, 2 years labor', expiration_date: '2036-03-01', coverage_details: 'Parts covered 10 years from installation. Labor 2 years. Annual maintenance required.', claim_process: 'Contact installer (Metro HVAC) at (555) 123-4567 within first 2 years. After that, contact Carrier directly.', document_url: null },
    { id: 'w3', item: 'Windows & Doors', category: 'Exterior', manufacturer: 'Andersen', warranty_period: '20 years', expiration_date: '2046-03-01', coverage_details: 'Lifetime warranty on glass breakage. 20 years on hardware. Does not cover improper use or acts of nature.', claim_process: 'Register at andersenwindows.com within 30 days. Contact customer service for claims.', document_url: null },
    { id: 'w4', item: 'Kitchen Appliances', category: 'Interior', manufacturer: 'KitchenAid', warranty_period: '1–5 years (varies)', expiration_date: '2031-03-01', coverage_details: 'Refrigerator: 5 yr sealed system, 1 yr parts/labor. Range: 1 yr full. Dishwasher: 1 yr full.', claim_process: 'Call 1-800-KITCHENAID. Have model and serial numbers ready.', document_url: null },
    { id: 'w5', item: 'Structural Components', category: 'Structure', manufacturer: 'Sierra Suites Construction', warranty_period: '10 years', expiration_date: '2036-03-01', coverage_details: 'Full coverage for structural defects including foundation, framing, and load-bearing components.', claim_process: 'Contact us at (555) 987-6543 or warranty@sierrasuites.com', document_url: null },
    { id: 'w6', item: 'Workmanship', category: 'General', manufacturer: 'Sierra Suites Construction', warranty_period: '1 year', expiration_date: '2027-03-01', coverage_details: 'Coverage for defects in workmanship and materials. Does not cover normal wear or owner modifications.', claim_process: 'Report issues within warranty period. We will assess and repair at no cost if covered.', document_url: null },
  ],
  maintenance_schedules: [
    { id: 'm1', system: 'HVAC', task: 'Replace Air Filters', frequency: 'Monthly', season: 'Year-round', instructions: 'Turn off system. Open filter compartment. Insert new 20x25x1 MERV 11 filter. Arrow points toward airflow.', estimated_cost: 15, professional_required: false },
    { id: 'm2', system: 'HVAC', task: 'Professional System Service', frequency: 'Annually', season: 'Spring', instructions: 'Schedule professional HVAC service before cooling season. Tech will clean coils, check refrigerant, test components.', estimated_cost: 175, professional_required: true },
    { id: 'm3', system: 'Gutters', task: 'Clean Gutters & Downspouts', frequency: 'Twice yearly', season: 'Spring & Fall', instructions: 'Remove leaves and debris. Flush with hose. Check for proper drainage and repair any leaks.', estimated_cost: 150, professional_required: false },
    { id: 'm4', system: 'Roof', task: 'Roof Inspection', frequency: 'Annually', season: 'Fall', instructions: 'Inspect for damaged shingles, flashing issues, or moss. Check attic for signs of leaks.', estimated_cost: 200, professional_required: true },
    { id: 'm5', system: 'Plumbing', task: 'Water Heater Flush', frequency: 'Annually', season: 'Spring', instructions: 'Turn off power/gas. Attach hose to drain valve. Flush sediment until water runs clear. Refill and restart.', estimated_cost: 0, professional_required: false },
    { id: 'm6', system: 'Exterior', task: 'Pressure Wash Siding', frequency: 'Annually', season: 'Summer', instructions: 'Use low pressure (1500 PSI max). Work bottom to top. Avoid windows and electrical outlets.', estimated_cost: 300, professional_required: false },
    { id: 'm7', system: 'Landscaping', task: 'Irrigation Winterization', frequency: 'Annually', season: 'Fall', instructions: 'Blow out sprinkler lines before first freeze. Shut off water supply. Open valves to drain residual water.', estimated_cost: 125, professional_required: true },
    { id: 'm8', system: 'Plumbing', task: 'Drain Check', frequency: 'Quarterly', season: 'Year-round', instructions: 'Run hot water through all drains. If slow, use drain snake or enzyme cleaner. Avoid chemical drain cleaners.', estimated_cost: 0, professional_required: false },
  ],
  asbuilt_drawings: [
    { id: 'd1', name: 'Foundation Plan - As-Built.pdf', type: 'PDF', url: null, size_bytes: 2500000, uploaded_at: '2026-03-10' },
    { id: 'd2', name: 'Framing Plan - As-Built.pdf', type: 'PDF', url: null, size_bytes: 3200000, uploaded_at: '2026-03-10' },
    { id: 'd3', name: 'Electrical Plan - As-Built.pdf', type: 'PDF', url: null, size_bytes: 1800000, uploaded_at: '2026-03-10' },
    { id: 'd4', name: 'Plumbing Plan - As-Built.pdf', type: 'PDF', url: null, size_bytes: 1600000, uploaded_at: '2026-03-10' },
    { id: 'd5', name: 'HVAC Plan - As-Built.pdf', type: 'PDF', url: null, size_bytes: 1400000, uploaded_at: '2026-03-10' },
  ],
  owner_manuals: [
    { id: 'om1', name: 'HVAC System Manual.pdf', type: 'PDF', url: null, size_bytes: 4500000, uploaded_at: '2026-03-10' },
    { id: 'om2', name: 'Water Heater Manual.pdf', type: 'PDF', url: null, size_bytes: 1200000, uploaded_at: '2026-03-10' },
    { id: 'om3', name: 'Kitchen Appliances Guide.pdf', type: 'PDF', url: null, size_bytes: 8500000, uploaded_at: '2026-03-10' },
    { id: 'om4', name: 'Garage Door Opener Manual.pdf', type: 'PDF', url: null, size_bytes: 900000, uploaded_at: '2026-03-10' },
  ],
  inspection_reports: [
    { id: 'ir1', name: 'Foundation Inspection - Passed.pdf', type: 'PDF', url: null, size_bytes: 850000, uploaded_at: '2025-06-15' },
    { id: 'ir2', name: 'Framing Inspection - Passed.pdf', type: 'PDF', url: null, size_bytes: 920000, uploaded_at: '2025-08-20' },
    { id: 'ir3', name: 'MEP Rough-In Inspection - Passed.pdf', type: 'PDF', url: null, size_bytes: 1100000, uploaded_at: '2025-09-30' },
    { id: 'ir4', name: 'Final Inspection - Passed.pdf', type: 'PDF', url: null, size_bytes: 1300000, uploaded_at: '2026-03-12' },
  ],
  permits_certificates: [
    { id: 'pc1', name: 'Building Permit.pdf', type: 'PDF', url: null, size_bytes: 450000, uploaded_at: '2025-05-01' },
    { id: 'pc2', name: 'Certificate of Occupancy.pdf', type: 'PDF', url: null, size_bytes: 380000, uploaded_at: '2026-03-13' },
    { id: 'pc3', name: 'Energy Compliance Certificate.pdf', type: 'PDF', url: null, size_bytes: 520000, uploaded_at: '2026-03-12' },
  ],
  emergency_contacts: [
    { id: 'ec1', name: 'Emergency Services', company: '911', role: 'Police/Fire/Medical', phone: '911', email: '', hours: '24/7', notes: 'For life-threatening emergencies only' },
    { id: 'ec2', name: 'Gas Company', company: 'Metro Gas', role: 'Gas Leak Response', phone: '1-800-GAS-LEAK', email: 'emergency@metrogas.com', hours: '24/7', notes: 'If you smell gas, evacuate immediately then call' },
    { id: 'ec3', name: 'Electric Company', company: 'City Electric', role: 'Power Outage/Downed Lines', phone: '1-800-NO-POWER', email: 'outages@cityelectric.com', hours: '24/7', notes: 'For power outages or downed lines' },
    { id: 'ec4', name: 'Water Company', company: 'City Water District', role: 'Water Main Breaks', phone: '(555) 123-WATER', email: 'emergency@citywater.gov', hours: '24/7', notes: 'For water main breaks or service issues' },
  ],
  subcontractor_contacts: [
    { id: 'sc1', name: 'Mike Torres', company: 'Metro HVAC', role: 'HVAC Service', phone: '(555) 123-4567', email: 'service@metrohvac.com', hours: 'Mon–Fri 8am–5pm, Emergency 24/7', notes: 'Installed HVAC system. 2-year labor warranty.' },
    { id: 'sc2', name: 'Advanced Plumbing', company: 'Advanced Plumbing Co.', role: 'Plumbing Service', phone: '(555) 234-5678', email: 'info@advancedplumbing.com', hours: 'Mon–Sat 7am–6pm', notes: 'Installed all plumbing. 1-year labor warranty.' },
    { id: 'sc3', name: 'Bright Electric', company: 'Bright Electric Inc.', role: 'Electrical Service', phone: '(555) 345-6789', email: 'service@brightelectric.com', hours: 'Mon–Fri 8am–5pm', notes: 'Installed electrical system. Licensed electrician.' },
  ],
  supplier_contacts: [
    { id: 'sup1', name: 'BuildRight Supply', company: 'BuildRight Supply', role: 'Materials Supplier', phone: '(555) 456-7890', email: 'sales@buildrightsupply.com', hours: 'Mon–Sat 6am–6pm', notes: 'Supplied lumber, drywall, and hardware' },
    { id: 'sup2', name: 'Appliance Gallery', company: 'Appliance Gallery', role: 'Appliance Sales/Service', phone: '(555) 567-8901', email: 'service@appliancegallery.com', hours: 'Mon–Sat 9am–7pm, Sun 10am–5pm', notes: 'Supplied all kitchen appliances' },
  ],
  generated_pdf_url: null, package_size_bytes: 0,
  delivered_to: '', delivered_at: null, delivery_method: null,
  status: 'draft', notes: '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${Math.round((bytes / Math.pow(1024, i)) * 10) / 10} ${sizes[i]}`
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconShield({ style }: { style?: React.CSSProperties }) {
  return <svg className="w-4 h-4" style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
}
function IconWrench({ style }: { style?: React.CSSProperties }) {
  return <svg className="w-4 h-4" style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
function IconDocument({ style }: { style?: React.CSSProperties }) {
  return <svg className="w-4 h-4" style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
}
function IconPhone({ style }: { style?: React.CSSProperties }) {
  return <svg className="w-4 h-4" style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
}
function IconList({ style }: { style?: React.CSSProperties }) {
  return <svg className="w-4 h-4" style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
}
function IconDownload({ style }: { style?: React.CSSProperties }) {
  return <svg className="w-4 h-4" style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
}
function IconX({ style }: { style?: React.CSSProperties }) {
  return <svg className="w-5 h-5" style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
}
function IconCheck({ style }: { style?: React.CSSProperties }) {
  return <svg className="w-4 h-4" style={style} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
}

// ─── Status config ────────────────────────────────────────────────────────────

const PKG_STATUS: Record<string, { label: string; color: string; bg: string; darkBg: string; darkColor: string }> = {
  draft:     { label: 'Draft',     color: '#D97706', darkColor: '#FBBF24', bg: '#FEF3C7', darkBg: 'rgba(251,191,36,0.1)' },
  review:    { label: 'In Review', color: '#2563EB', darkColor: '#60A5FA', bg: '#EFF6FF', darkBg: 'rgba(96,165,250,0.1)' },
  approved:  { label: 'Approved',  color: '#16A34A', darkColor: '#4ADE80', bg: '#DCFCE7', darkBg: 'rgba(74,222,128,0.1)' },
  delivered: { label: 'Delivered', color: '#7C3AED', darkColor: '#A78BFA', bg: '#F5F3FF', darkBg: 'rgba(167,139,250,0.1)' },
}

// ─── Component ────────────────────────────────────────────────────────────────

function ProjectTurnoverContent() {
  const searchParams = useSearchParams()
  const paramProject = searchParams.get('project')

  const { colors, darkMode } = useThemeColors()

  const [projects, setProjects] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<string>(paramProject || '')
  const [pkg, setPkg] = useState<TurnoverPackage | null>(null)
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [showDeliverModal, setShowDeliverModal] = useState(false)

  // ── Load real projects ─────────────────────────────────────────────────────
  useEffect(() => {
    async function loadProjects() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles').select('company_id').eq('id', user.id).single()
      if (!profile?.company_id) return

      const { data } = await supabase
        .from('projects')
        .select('id, name, client')
        .eq('company_id', profile.company_id)
        .order('name')

      setProjects(data ?? [])
      if (!selectedProject && data?.length) setSelectedProject(data[0].id)
    }
    loadProjects()
  }, [])

  // ── Load package when project changes (demo data; replace with DB query) ──
  useEffect(() => {
    if (!selectedProject) { setPkg(null); return }
    setPkg({ ...DEMO_PACKAGE, project_id: selectedProject })
  }, [selectedProject])

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleGeneratePackage = (format: string) => {
    setShowGenerateModal(false)
    toast(`Generating ${format.toUpperCase()} package…`)
    setTimeout(() => {
      toast.success('Turnover package generated!')
      setPkg(prev => prev ? { ...prev, generated_pdf_url: '/downloads/turnover-package.pdf', package_size_bytes: 45000000, status: 'review' } : prev)
    }, 2500)
  }

  const handleDeliverPackage = (method: string) => {
    setShowDeliverModal(false)
    toast(`Delivering via ${method.replace(/_/g, ' ')}…`)
    setTimeout(() => {
      setPkg(prev => prev ? { ...prev, delivered_to: 'Client', delivered_at: new Date().toISOString(), delivery_method: method as any, status: 'delivered' } : prev)
      toast.success('Turnover package delivered!')
    }, 2000)
  }

  // ── Shared styles ──────────────────────────────────────────────────────────
  const card = { backgroundColor: colors.bg, border: colors.border, borderRadius: '0.75rem' }
  const trackBg = darkMode ? '#374151' : '#E5E7EB'
  const inputStyle = {
    backgroundColor: colors.bgAlt, border: colors.border, color: colors.text,
    borderRadius: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.875rem',
    width: '100%', outline: 'none',
  }

  const totalDocs = pkg
    ? pkg.asbuilt_drawings.length + pkg.owner_manuals.length + pkg.inspection_reports.length + pkg.permits_certificates.length
    : 0
  const totalContacts = pkg
    ? pkg.emergency_contacts.length + pkg.subcontractor_contacts.length + pkg.supplier_contacts.length
    : 0

  const pkgStatusCfg = pkg ? (PKG_STATUS[pkg.status] ?? PKG_STATUS.draft) : PKG_STATUS.draft

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: darkMode ? '#0d0f17' : '#F8F9FA' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: colors.text }}>Project Turnover Package</h1>
            <p className="text-sm" style={{ color: colors.textMuted }}>Final delivery documentation for completed projects</p>
          </div>
          {pkg && (
            <div className="flex gap-2">
              {(pkg.status === 'draft' || pkg.status === 'review') && (
                <button onClick={() => setShowGenerateModal(true)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#16A34A' }}>
                  Generate Package
                </button>
              )}
              {(pkg.status === 'review' || !!pkg.generated_pdf_url) && (
                <button onClick={() => setShowDeliverModal(true)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#2563EB' }}>
                  Deliver to Client
                </button>
              )}
            </div>
          )}
        </div>

        {/* Project picker */}
        <div className="p-4 rounded-xl mb-6 flex items-center gap-4" style={card}>
          <label className="text-sm font-semibold shrink-0" style={{ color: colors.text }}>Project</label>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={inputStyle}>
            <option value="">Choose a project…</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}{p.client ? ` — ${p.client}` : ''}</option>
            ))}
          </select>
        </div>

        {!pkg && (
          <div className="rounded-xl p-12 text-center" style={card}>
            <IconList style={{ color: colors.textMuted, width: 48, height: 48, margin: '0 auto 12px' }} />
            <p className="text-sm" style={{ color: colors.textMuted }}>Select a project to view the turnover package</p>
          </div>
        )}

        {pkg && (
          <>
            {/* Package status banner */}
            <div
              className="p-4 rounded-xl mb-6 flex items-start gap-3"
              style={{
                backgroundColor: darkMode ? pkgStatusCfg.darkBg : pkgStatusCfg.bg,
                borderLeft: `3px solid ${darkMode ? pkgStatusCfg.darkColor : pkgStatusCfg.color}`,
                border: colors.border,
              }}
            >
              <IconCheck style={{ color: darkMode ? pkgStatusCfg.darkColor : pkgStatusCfg.color, marginTop: 2 }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: darkMode ? pkgStatusCfg.darkColor : pkgStatusCfg.color }}>
                  Package Status: {pkgStatusCfg.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                  {pkg.status === 'delivered'
                    ? `Delivered to ${pkg.delivered_to} on ${formatDate(pkg.delivered_at!)} via ${pkg.delivery_method?.replace(/_/g, ' ')}`
                    : pkg.status === 'review'
                    ? 'Package generated and ready for review. Preview before delivering to client.'
                    : 'Complete all sections, then generate the final turnover package.'}
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl" style={card}>
                <div className="flex items-center gap-2 mb-1">
                  <IconShield style={{ color: '#16A34A' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>Warranties</span>
                </div>
                <div className="text-2xl font-bold mb-2" style={{ color: '#16A34A' }}>{pkg.warranty_documents.length}</div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
                  <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: '#16A34A' }} />
                </div>
                <div className="text-xs mt-1" style={{ color: colors.textMuted }}>Warranty documents</div>
              </div>

              <div className="p-4 rounded-xl" style={card}>
                <div className="flex items-center gap-2 mb-1">
                  <IconWrench style={{ color: '#2563EB' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>Maintenance</span>
                </div>
                <div className="text-2xl font-bold mb-2" style={{ color: '#2563EB' }}>{pkg.maintenance_schedules.length}</div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
                  <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: '#2563EB' }} />
                </div>
                <div className="text-xs mt-1" style={{ color: colors.textMuted }}>Scheduled tasks</div>
              </div>

              <div className="p-4 rounded-xl" style={card}>
                <div className="flex items-center gap-2 mb-1">
                  <IconDocument style={{ color: '#7C3AED' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>Documents</span>
                </div>
                <div className="text-2xl font-bold mb-2" style={{ color: '#7C3AED' }}>{totalDocs}</div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
                  <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: '#7C3AED' }} />
                </div>
                <div className="text-xs mt-1" style={{ color: colors.textMuted }}>Plans, reports, permits</div>
              </div>

              <div className="p-4 rounded-xl" style={card}>
                <div className="flex items-center gap-2 mb-1">
                  <IconPhone style={{ color: '#D97706' }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: colors.textMuted }}>Contacts</span>
                </div>
                <div className="text-2xl font-bold mb-2" style={{ color: '#D97706' }}>{totalContacts}</div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: trackBg }}>
                  <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: '#D97706' }} />
                </div>
                <div className="text-xs mt-1" style={{ color: colors.textMuted }}>Emergency &amp; service contacts</div>
              </div>
            </div>

            {/* Tab container */}
            <div className="rounded-xl overflow-hidden" style={card}>
              {/* Tab bar */}
              <div className="flex overflow-x-auto" style={{ borderBottom: colors.border }}>
                {[
                  { key: 'overview',     label: 'Overview',     Icon: IconList },
                  { key: 'warranties',   label: 'Warranties',   Icon: IconShield },
                  { key: 'maintenance',  label: 'Maintenance',  Icon: IconWrench },
                  { key: 'documents',    label: 'Documents',    Icon: IconDocument },
                  { key: 'contacts',     label: 'Contacts',     Icon: IconPhone },
                ].map(({ key, label, Icon }) => {
                  const active = activeTab === key
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveTab(key)}
                      className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors"
                      style={{
                        color: active ? '#2563EB' : colors.textMuted,
                        borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                        marginBottom: -1,
                        backgroundColor: 'transparent',
                      }}
                    >
                      <Icon style={{ color: active ? '#2563EB' : colors.textMuted }} />
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="p-6">

                {/* ── Overview ─────────────────────────────────────────────── */}
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <h2 className="text-base font-semibold mb-4" style={{ color: colors.text }}>Package Overview</h2>
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: darkMode ? 'rgba(59,130,246,0.07)' : '#EFF6FF', borderLeft: '3px solid #2563EB', border: colors.border }}
                    >
                      <h3 className="text-sm font-semibold mb-2" style={{ color: colors.text }}>What's included:</h3>
                      <ul className="space-y-1 text-sm" style={{ color: colors.textMuted }}>
                        <li>· {pkg.warranty_documents.length} warranty documents (structural, HVAC, appliances, etc.)</li>
                        <li>· {pkg.maintenance_schedules.length} maintenance tasks with schedule</li>
                        <li>· {pkg.asbuilt_drawings.length} as-built drawings showing final construction</li>
                        <li>· {pkg.owner_manuals.length} owner's manuals for systems and appliances</li>
                        <li>· {pkg.inspection_reports.length} inspection reports (all passed)</li>
                        <li>· {pkg.permits_certificates.length} permits and certificates (including CO)</li>
                        <li>· Emergency and service contact list</li>
                      </ul>
                    </div>
                    <div
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: darkMode ? 'rgba(34,197,94,0.07)' : '#F0FDF4', borderLeft: '3px solid #16A34A', border: colors.border }}
                    >
                      <h3 className="text-sm font-semibold mb-2" style={{ color: colors.text }}>Next steps:</h3>
                      <ol className="space-y-1 text-sm list-decimal list-inside" style={{ color: colors.textMuted }}>
                        <li>Review all sections to ensure completeness</li>
                        <li>Click "Generate Package" to create the final PDF</li>
                        <li>Deliver to client via preferred method</li>
                        <li>Schedule final walkthrough if not yet complete</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* ── Warranties ───────────────────────────────────────────── */}
                {activeTab === 'warranties' && (
                  <div>
                    <h2 className="text-base font-semibold mb-4" style={{ color: colors.text }}>Warranty Information</h2>
                    <div className="space-y-3">
                      {pkg.warranty_documents.map(w => (
                        <div key={w.id} className="p-4 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                          <div className="flex items-start justify-between mb-3 gap-2">
                            <div>
                              <div className="text-sm font-semibold" style={{ color: colors.text }}>{w.item}</div>
                              <div className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{w.manufacturer} · {w.category}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-semibold" style={{ color: '#16A34A' }}>{w.warranty_period}</div>
                              <div className="text-xs" style={{ color: colors.textMuted }}>Expires {formatDate(w.expiration_date)}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="font-semibold mb-0.5" style={{ color: colors.textMuted }}>Coverage</div>
                              <div style={{ color: colors.text }}>{w.coverage_details}</div>
                            </div>
                            <div>
                              <div className="font-semibold mb-0.5" style={{ color: colors.textMuted }}>How to File a Claim</div>
                              <div style={{ color: colors.text }}>{w.claim_process}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Maintenance ──────────────────────────────────────────── */}
                {activeTab === 'maintenance' && (
                  <div>
                    <h2 className="text-base font-semibold mb-4" style={{ color: colors.text }}>Maintenance Schedule</h2>
                    <div
                      className="p-3 rounded-lg mb-4 text-sm"
                      style={{ backgroundColor: darkMode ? 'rgba(251,191,36,0.08)' : '#FFFBEB', borderLeft: '3px solid #D97706', border: colors.border, color: colors.textMuted }}
                    >
                      Regular maintenance protects your investment and maintains warranties. Some require proof of annual professional service.
                    </div>
                    <div className="space-y-3">
                      {pkg.maintenance_schedules.map(item => (
                        <div key={item.id} className="p-4 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div>
                              <div className="text-sm font-semibold" style={{ color: colors.text }}>{item.task}</div>
                              <div className="text-xs mt-0.5" style={{ color: colors.textMuted }}>{item.system}</div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-semibold" style={{ color: '#2563EB' }}>{item.frequency}</div>
                              <div className="text-xs" style={{ color: colors.textMuted }}>{item.season}</div>
                            </div>
                          </div>
                          <p className="text-xs mb-3" style={{ color: colors.textMuted }}>{item.instructions}</p>
                          <div className="flex items-center gap-3 pt-3" style={{ borderTop: colors.border }}>
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: item.professional_required
                                  ? (darkMode ? 'rgba(217,119,6,0.15)' : '#FEF3C7')
                                  : (darkMode ? 'rgba(34,197,94,0.12)' : '#DCFCE7'),
                                color: item.professional_required ? '#D97706' : '#16A34A',
                              }}
                            >
                              {item.professional_required ? 'Professional required' : 'DIY friendly'}
                            </span>
                            <span className="text-xs" style={{ color: colors.textMuted }}>
                              Est. cost: {item.estimated_cost === 0 ? 'Free' : `$${item.estimated_cost}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Documents ────────────────────────────────────────────── */}
                {activeTab === 'documents' && (
                  <div className="space-y-8">
                    {[
                      { label: 'As-Built Drawings', docs: pkg.asbuilt_drawings, accent: '#7C3AED' },
                      { label: "Owner's Manuals", docs: pkg.owner_manuals, accent: '#2563EB' },
                      { label: 'Inspection Reports', docs: pkg.inspection_reports, accent: '#16A34A' },
                      { label: 'Permits & Certificates', docs: pkg.permits_certificates, accent: '#D97706' },
                    ].map(({ label, docs, accent }) => (
                      <div key={label}>
                        <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text }}>{label}</h3>
                        <div className="space-y-2">
                          {docs.map(doc => (
                            <div
                              key={doc.id}
                              className="flex items-center justify-between p-3 rounded-lg"
                              style={{ backgroundColor: colors.bgAlt, border: colors.border }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <IconDocument style={{ color: accent, flexShrink: 0 }} />
                                <div className="min-w-0">
                                  <div className="text-sm font-medium truncate" style={{ color: colors.text }}>{doc.name}</div>
                                  <div className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                                    {formatBytes(doc.size_bytes)} · {formatDate(doc.uploaded_at)}
                                  </div>
                                </div>
                              </div>
                              <button
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white shrink-0 ml-3"
                                style={{ backgroundColor: accent }}
                              >
                                <IconDownload style={{ width: 12, height: 12 }} />
                                Download
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Contacts ─────────────────────────────────────────────── */}
                {activeTab === 'contacts' && (
                  <div className="space-y-8">
                    {/* Emergency */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text }}>Emergency Contacts</h3>
                      <div className="space-y-2">
                        {pkg.emergency_contacts.map(c => (
                          <div
                            key={c.id}
                            className="p-3 rounded-lg"
                            style={{ backgroundColor: darkMode ? 'rgba(220,38,38,0.07)' : '#FFF5F5', borderLeft: '3px solid #DC2626', border: colors.border }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold" style={{ color: colors.text }}>{c.name}</div>
                                <div className="text-xs" style={{ color: colors.textMuted }}>{c.company} · {c.role}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold" style={{ color: '#DC2626' }}>{c.phone}</div>
                                <div className="text-xs" style={{ color: colors.textMuted }}>{c.hours}</div>
                              </div>
                            </div>
                            {c.notes && <p className="text-xs mt-2" style={{ color: colors.textMuted }}>{c.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Subcontractors */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text }}>Subcontractor Contacts</h3>
                      <div className="space-y-2">
                        {pkg.subcontractor_contacts.map(c => (
                          <div key={c.id} className="p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold" style={{ color: colors.text }}>{c.name}</div>
                                <div className="text-xs" style={{ color: colors.textMuted }}>{c.company} · {c.role}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-medium" style={{ color: colors.text }}>{c.phone}</div>
                                <div className="text-xs" style={{ color: colors.textMuted }}>{c.email}</div>
                                <div className="text-xs" style={{ color: colors.textMuted }}>{c.hours}</div>
                              </div>
                            </div>
                            {c.notes && <p className="text-xs mt-2" style={{ color: colors.textMuted }}>{c.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suppliers */}
                    <div>
                      <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text }}>Supplier Contacts</h3>
                      <div className="space-y-2">
                        {pkg.supplier_contacts.map(c => (
                          <div key={c.id} className="p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-sm font-semibold" style={{ color: colors.text }}>{c.name}</div>
                                <div className="text-xs" style={{ color: colors.textMuted }}>{c.role}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-medium" style={{ color: colors.text }}>{c.phone}</div>
                                <div className="text-xs" style={{ color: colors.textMuted }}>{c.email}</div>
                                <div className="text-xs" style={{ color: colors.textMuted }}>{c.hours}</div>
                              </div>
                            </div>
                            {c.notes && <p className="text-xs mt-2" style={{ color: colors.textMuted }}>{c.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Generate Modal ────────────────────────────────────────────────────── */}
      {showGenerateModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl shadow-xl max-w-lg w-full" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Generate Turnover Package</h2>
                <button onClick={() => setShowGenerateModal(false)} style={{ color: colors.textMuted }}><IconX /></button>
              </div>

              <div
                className="p-3 rounded-lg mb-5 text-sm"
                style={{ backgroundColor: darkMode ? 'rgba(34,197,94,0.07)' : '#F0FDF4', borderLeft: '3px solid #16A34A', border: colors.border, color: colors.textMuted }}
              >
                Includes: warranties · maintenance schedule · as-built drawings · owner's manuals · inspection reports · permits · contact list
              </div>

              <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text }}>Choose format:</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'pdf',   label: 'Digital PDF',       desc: 'Searchable PDF for email or cloud' },
                  { key: 'print', label: 'Print-Ready Binder', desc: 'Formatted for 3-ring binder with tabs' },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => handleGeneratePackage(f.key)}
                    className="p-4 rounded-lg text-left transition-colors"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border }}
                  >
                    <div className="text-sm font-semibold mb-0.5" style={{ color: colors.text }}>{f.label}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>{f.desc}</div>
                  </button>
                ))}
              </div>

              <button onClick={() => setShowGenerateModal(false)} className="w-full mt-4 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: colors.bgAlt, color: colors.textMuted, border: colors.border }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deliver Modal ─────────────────────────────────────────────────────── */}
      {showDeliverModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-xl shadow-xl max-w-lg w-full" style={{ backgroundColor: colors.bg, border: colors.border }}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ color: colors.text }}>Deliver Turnover Package</h2>
                <button onClick={() => setShowDeliverModal(false)} style={{ color: colors.textMuted }}><IconX /></button>
              </div>

              <h3 className="text-sm font-semibold mb-3" style={{ color: colors.text }}>Choose delivery method:</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'email',          label: 'Email',          desc: 'Send PDF via email to client' },
                  { key: 'cloud_link',     label: 'Cloud Link',     desc: 'Share via Dropbox/Google Drive' },
                  { key: 'usb_drive',      label: 'USB Drive',      desc: 'Load files onto USB drive' },
                  { key: 'printed_binder', label: 'Printed Binder', desc: 'Physical 3-ring binder delivery' },
                ].map(m => (
                  <button
                    key={m.key}
                    onClick={() => handleDeliverPackage(m.key)}
                    className="p-4 rounded-lg text-left transition-colors"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border }}
                  >
                    <div className="text-sm font-semibold mb-0.5" style={{ color: colors.text }}>{m.label}</div>
                    <div className="text-xs" style={{ color: colors.textMuted }}>{m.desc}</div>
                  </button>
                ))}
              </div>

              <button onClick={() => setShowDeliverModal(false)} className="w-full mt-4 px-4 py-2 rounded-lg text-sm font-medium" style={{ backgroundColor: colors.bgAlt, color: colors.textMuted, border: colors.border }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProjectTurnoverPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ProjectTurnoverContent />
    </Suspense>
  )
}
