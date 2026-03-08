"use client"

import { useState, useEffect } from 'react'
import { useThemeColors } from '@/lib/hooks/useThemeColors'

interface Project {
  id: string
  name: string
  client: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  type: 'residential' | 'commercial' | 'industrial' | 'infrastructure' | 'renovation'
  description: string
  startDate: string
  endDate: string
  estimatedBudget: number
  currency: string
  phases: { name: string; startDate: string; endDate: string }[]
  projectManagerId?: string
  teamMembers: string[]
  equipment: string[]
  certificationsRequired: string[]
  documentCategories: string[]
  notificationSettings: {
    emailUpdates: boolean
    milestoneAlerts: boolean
    budgetAlerts: boolean
    teamNotifications: boolean
  }
  clientVisibility: boolean
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  createdAt: string
  updatedAt: string
}

interface ProjectCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (project: Partial<Project>) => void
  editingProject?: Project | null
  mode?: 'create' | 'edit'
}

const PROJECT_TYPES = [
  { value: 'residential', label: 'Residential', icon: '🏠' },
  { value: 'commercial', label: 'Commercial', icon: '🏢' },
  { value: 'industrial', label: 'Industrial', icon: '🏭' },
  { value: 'infrastructure', label: 'Infrastructure', icon: '🌉' },
  { value: 'renovation', label: 'Renovation', icon: '🔨' }
] as const

const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning', color: '#6A9BFD' },
  { value: 'active', label: 'Active', color: '#6BCB77' },
  { value: 'on-hold', label: 'On Hold', color: '#FFD93D' },
  { value: 'completed', label: 'Completed', color: '#4ECDC4' },
  { value: 'cancelled', label: 'Cancelled', color: '#FF6B6B' }
] as const

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
]

const DEFAULT_DOCUMENT_CATEGORIES = [
  'Plans & Blueprints',
  'Permits & Licenses',
  'Contracts',
  'Invoices & Receipts',
  'Inspection Reports',
  'Photos',
  'Change Orders',
  'Safety Documents'
]

const COMMON_CERTIFICATIONS = [
  'OSHA Safety',
  'Building Permit',
  'Environmental Clearance',
  'Electrical License',
  'Plumbing License',
  'HVAC Certification',
  'Crane Operator',
  'Asbestos Handling'
]

const COMMON_EQUIPMENT = [
  'Excavator',
  'Crane',
  'Scaffolding',
  'Concrete Mixer',
  'Forklift',
  'Dump Truck',
  'Generator',
  'Power Tools'
]

export default function ProjectCreationModal({
  isOpen,
  onClose,
  onSave,
  editingProject,
  mode = 'create'
}: ProjectCreationModalProps) {
  const { colors, darkMode } = useThemeColors()
  const [activeTab, setActiveTab] = useState(0)
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    client: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    type: 'residential',
    description: '',
    startDate: '',
    endDate: '',
    estimatedBudget: 0,
    currency: 'USD',
    phases: [],
    projectManagerId: '',
    teamMembers: [],
    equipment: [],
    certificationsRequired: [],
    documentCategories: [...DEFAULT_DOCUMENT_CATEGORIES],
    notificationSettings: {
      emailUpdates: true,
      milestoneAlerts: true,
      budgetAlerts: true,
      teamNotifications: true
    },
    clientVisibility: false,
    status: 'planning'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newPhase, setNewPhase] = useState({ name: '', startDate: '', endDate: '' })
  const [phaseErrors, setPhaseErrors] = useState<Record<string, string>>({})
  const [customEquipment, setCustomEquipment] = useState('')
  const [customCertification, setCustomCertification] = useState('')

  useEffect(() => {
    if (editingProject && mode === 'edit') {
      setFormData(editingProject)
    }
  }, [editingProject, mode])

  if (!isOpen) return null

  const tabs = [
    { id: 0, label: 'Basic Info', icon: '📋' },
    { id: 1, label: 'Timeline & Budget', icon: '💰' },
    { id: 2, label: 'Team & Resources', icon: '👥' },
    { id: 3, label: 'Documents & Settings', icon: '⚙️' }
  ]

  const inputStyle = (hasError?: boolean) => ({
    backgroundColor: colors.bgAlt,
    border: hasError ? '2px solid #DC2626' : colors.border,
    color: colors.text
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...((prev as any)[parent] as any), [field]: value }
    }))
  }

  const validateTab = (tabIndex: number): boolean => {
    const newErrors: Record<string, string> = {}

    if (tabIndex === 0) {
      if (!formData.name?.trim()) newErrors.name = 'Project name is required'
      if (!formData.client?.trim()) newErrors.client = 'Client name is required'
      if (!formData.address?.trim()) newErrors.address = 'Address is required'
      if (!formData.city?.trim()) newErrors.city = 'City is required'
      if (!formData.state?.trim()) newErrors.state = 'State is required'
      if (!formData.zipCode?.trim()) newErrors.zipCode = 'Zip code is required'
    }

    if (tabIndex === 1) {
      if (!formData.startDate) newErrors.startDate = 'Start date is required'
      if (!formData.endDate) newErrors.endDate = 'End date is required'
      if (formData.startDate && formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
        newErrors.endDate = 'End date must be after start date'
      }
      if (!formData.estimatedBudget || formData.estimatedBudget <= 0) {
        newErrors.estimatedBudget = 'Budget must be greater than 0'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateTab(activeTab)) {
      setActiveTab(prev => Math.min(prev + 1, tabs.length - 1))
    }
  }

  const handleBack = () => {
    setActiveTab(prev => Math.max(prev - 1, 0))
  }

  const handleSave = () => {
    console.log('Modal handleSave called')
    console.log('formData in modal:', formData)
    console.log('formData keys:', Object.keys(formData))
    console.log('Validation result:', validateTab(activeTab))

    if (validateTab(activeTab)) {
      console.log('Validation passed, calling onSave with:', formData)
      onSave(formData)
      handleClose()
    } else {
      console.error('Validation failed for tab:', activeTab)
    }
  }

  const handleClose = () => {
    setActiveTab(0)
    setFormData({
      name: '',
      client: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
      type: 'residential',
      description: '',
      startDate: '',
      endDate: '',
      estimatedBudget: 0,
      currency: 'USD',
      phases: [],
      projectManagerId: '',
      teamMembers: [],
      equipment: [],
      certificationsRequired: [],
      documentCategories: [...DEFAULT_DOCUMENT_CATEGORIES],
      notificationSettings: {
        emailUpdates: true,
        milestoneAlerts: true,
        budgetAlerts: true,
        teamNotifications: true
      },
      clientVisibility: false,
      status: 'planning'
    })
    setErrors({})
    onClose()
  }

  const addPhase = () => {
    const newPhaseErrors: Record<string, string> = {}
    if (!newPhase.name.trim()) newPhaseErrors.phaseName = 'Phase name is required'
    if (!newPhase.startDate) newPhaseErrors.phaseStartDate = 'Start date is required'
    if (!newPhase.endDate) newPhaseErrors.phaseEndDate = 'End date is required'
    if (newPhase.startDate && newPhase.endDate && new Date(newPhase.endDate) <= new Date(newPhase.startDate)) {
      newPhaseErrors.phaseEndDate = 'End date must be after start date'
    }

    if (Object.keys(newPhaseErrors).length > 0) {
      setPhaseErrors(newPhaseErrors)
      return
    }

    setPhaseErrors({})
    setFormData(prev => ({
      ...prev,
      phases: [...(prev.phases || []), { ...newPhase }]
    }))
    setNewPhase({ name: '', startDate: '', endDate: '' })
  }

  const removePhase = (index: number) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases?.filter((_, i) => i !== index) || []
    }))
  }

  const addEquipment = (equipment: string) => {
    if (equipment && !formData.equipment?.includes(equipment)) {
      setFormData(prev => ({
        ...prev,
        equipment: [...(prev.equipment || []), equipment]
      }))
    }
  }

  const removeEquipment = (equipment: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment?.filter(e => e !== equipment) || []
    }))
  }

  const addCertification = (cert: string) => {
    if (cert && !formData.certificationsRequired?.includes(cert)) {
      setFormData(prev => ({
        ...prev,
        certificationsRequired: [...(prev.certificationsRequired || []), cert]
      }))
    }
  }

  const removeCertification = (cert: string) => {
    setFormData(prev => ({
      ...prev,
      certificationsRequired: prev.certificationsRequired?.filter(c => c !== cert) || []
    }))
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return (
          <div className="space-y-6">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm"
                style={inputStyle(!!errors.name)}
                placeholder="e.g., Downtown Office Complex"
              />
              {errors.name && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.name}</p>}
            </div>

            {/* Client */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Client Name *
              </label>
              <input
                type="text"
                value={formData.client}
                onChange={(e) => handleInputChange('client', e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm"
                style={inputStyle(!!errors.client)}
                placeholder="e.g., Acme Corporation"
              />
              {errors.client && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.client}</p>}
            </div>

            {/* Project Type */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Project Type *
              </label>
              <div className="grid grid-cols-5 gap-2">
                {PROJECT_TYPES.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleInputChange('type', type.value)}
                    className="p-3 rounded-lg text-center transition-all cursor-pointer"
                    style={{
                      backgroundColor: formData.type === type.value ? '#FF6B6B' : colors.bgAlt,
                      border: formData.type === type.value ? '2px solid #FF6B6B' : colors.border,
                      color: formData.type === type.value ? '#FFFFFF' : colors.text
                    }}
                  >
                    <div className="text-2xl mb-1">{type.icon}</div>
                    <div className="text-xs font-semibold">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Project Address *
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="w-full px-4 py-3 rounded-lg text-sm mb-3"
                style={inputStyle(!!errors.address)}
                placeholder="Street address"
              />
              {errors.address && <p className="text-xs mt-1 mb-2" style={{ color: '#DC2626' }}>{errors.address}</p>}

              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-3">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg text-sm"
                    style={inputStyle(!!errors.city)}
                    placeholder="City"
                  />
                  {errors.city && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.city}</p>}
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg text-sm"
                    style={inputStyle(!!errors.state)}
                    placeholder="State"
                  />
                  {errors.state && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.state}</p>}
                </div>
                <div className="col-span-1">
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg text-sm"
                    style={inputStyle(!!errors.zipCode)}
                    placeholder="Zip"
                  />
                  {errors.zipCode && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.zipCode}</p>}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg text-sm resize-none"
                style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                placeholder="Describe the project scope, objectives, and any special requirements..."
              />
            </div>
          </div>
        )

      case 1:
        return (
          <div className="space-y-6">
            {/* Timeline */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={inputStyle(!!errors.startDate)}
                />
                {errors.startDate && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.startDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                  End Date *
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm"
                  style={inputStyle(!!errors.endDate)}
                />
                {errors.endDate && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.endDate}</p>}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Estimated Budget *
              </label>
              <div className="flex gap-3">
                <select
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value)}
                  className="px-4 py-3 rounded-lg text-sm"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                >
                  {CURRENCIES.map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={formData.estimatedBudget || ''}
                  onChange={(e) => handleInputChange('estimatedBudget', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  className="flex-1 px-4 py-3 rounded-lg text-sm"
                  style={inputStyle(!!errors.estimatedBudget)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              {errors.estimatedBudget && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{errors.estimatedBudget}</p>}
            </div>

            {/* Phases */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Project Phases
              </label>

              {/* Existing Phases */}
              {formData.phases && formData.phases.length > 0 && (
                <div className="space-y-2 mb-3">
                  {formData.phases.map((phase, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg flex items-center justify-between"
                      style={{ backgroundColor: colors.bgAlt, border: colors.border }}
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-sm" style={{ color: colors.text }}>{phase.name}</p>
                        <p className="text-xs" style={{ color: colors.textMuted }}>
                          {new Date(phase.startDate).toLocaleDateString()} - {new Date(phase.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removePhase(index)}
                        className="text-sm font-bold px-3 py-1 rounded transition-colors cursor-pointer"
                        style={{ color: '#DC2626', backgroundColor: darkMode ? 'rgba(220, 38, 38, 0.1)' : undefined }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Phase */}
              <div className="p-4 rounded-lg space-y-3" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                <div>
                  <input
                    type="text"
                    value={newPhase.name}
                    onChange={(e) => {
                      setNewPhase(prev => ({ ...prev, name: e.target.value }))
                      if (phaseErrors.phaseName) setPhaseErrors(prev => ({ ...prev, phaseName: '' }))
                    }}
                    className="w-full px-3 py-2 rounded text-sm"
                    style={{
                      backgroundColor: colors.bg,
                      border: phaseErrors.phaseName ? '2px solid #DC2626' : colors.border,
                      color: colors.text
                    }}
                    placeholder="Phase name (e.g., Foundation, Framing)"
                  />
                  {phaseErrors.phaseName && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{phaseErrors.phaseName}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <input
                      type="date"
                      value={newPhase.startDate}
                      onChange={(e) => {
                        setNewPhase(prev => ({ ...prev, startDate: e.target.value }))
                        if (phaseErrors.phaseStartDate) setPhaseErrors(prev => ({ ...prev, phaseStartDate: '' }))
                      }}
                      className="w-full px-3 py-2 rounded text-sm"
                      style={{
                        backgroundColor: colors.bg,
                        border: phaseErrors.phaseStartDate ? '2px solid #DC2626' : colors.border,
                        color: colors.text
                      }}
                    />
                    {phaseErrors.phaseStartDate && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{phaseErrors.phaseStartDate}</p>}
                  </div>
                  <div>
                    <input
                      type="date"
                      value={newPhase.endDate}
                      onChange={(e) => {
                        setNewPhase(prev => ({ ...prev, endDate: e.target.value }))
                        if (phaseErrors.phaseEndDate) setPhaseErrors(prev => ({ ...prev, phaseEndDate: '' }))
                      }}
                      className="w-full px-3 py-2 rounded text-sm"
                      style={{
                        backgroundColor: colors.bg,
                        border: phaseErrors.phaseEndDate ? '2px solid #DC2626' : colors.border,
                        color: colors.text
                      }}
                    />
                    {phaseErrors.phaseEndDate && <p className="text-xs mt-1" style={{ color: '#DC2626' }}>{phaseErrors.phaseEndDate}</p>}
                  </div>
                </div>
                <button
                  onClick={addPhase}
                  className="w-full py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                  style={{ backgroundColor: '#4ECDC4', color: '#FFFFFF' }}
                >
                  + Add Phase
                </button>
              </div>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            {/* Equipment */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Required Equipment
              </label>

              {/* Selected Equipment */}
              {formData.equipment && formData.equipment.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.equipment.map((item, index) => (
                    <div
                      key={index}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2"
                      style={{ backgroundColor: darkMode ? 'rgba(107, 203, 119, 0.2)' : '#E6F9EA', color: colors.text, border: '1px solid #6BCB77' }}
                    >
                      <span>{item}</span>
                      <button
                        onClick={() => removeEquipment(item)}
                        className="font-bold hover:opacity-70 cursor-pointer"
                        style={{ color: '#DC2626' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Common Equipment */}
              <div className="flex flex-wrap gap-2 mb-3">
                {COMMON_EQUIPMENT.filter(eq => !formData.equipment?.includes(eq)).map(item => (
                  <button
                    key={item}
                    onClick={() => addEquipment(item)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                    style={{ backgroundColor: colors.bgAlt, color: colors.text, border: colors.border }}
                  >
                    + {item}
                  </button>
                ))}
              </div>

              {/* Custom Equipment */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customEquipment}
                  onChange={(e) => setCustomEquipment(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  placeholder="Add custom equipment..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addEquipment(customEquipment)
                      setCustomEquipment('')
                    }
                  }}
                />
                <button
                  onClick={() => {
                    addEquipment(customEquipment)
                    setCustomEquipment('')
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                  style={{ backgroundColor: '#4ECDC4', color: '#FFFFFF' }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Certifications Required */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Required Certifications
              </label>

              {/* Selected Certifications */}
              {formData.certificationsRequired && formData.certificationsRequired.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.certificationsRequired.map((cert, index) => (
                    <div
                      key={index}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-2"
                      style={{ backgroundColor: darkMode ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7', color: colors.text, border: '1px solid #F59E0B' }}
                    >
                      <span>{cert}</span>
                      <button
                        onClick={() => removeCertification(cert)}
                        className="font-bold hover:opacity-70 cursor-pointer"
                        style={{ color: '#DC2626' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Common Certifications */}
              <div className="flex flex-wrap gap-2 mb-3">
                {COMMON_CERTIFICATIONS.filter(cert => !formData.certificationsRequired?.includes(cert)).map(cert => (
                  <button
                    key={cert}
                    onClick={() => addCertification(cert)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                    style={{ backgroundColor: colors.bgAlt, color: colors.text, border: colors.border }}
                  >
                    + {cert}
                  </button>
                ))}
              </div>

              {/* Custom Certification */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCertification}
                  onChange={(e) => setCustomCertification(e.target.value)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: colors.bgAlt, border: colors.border, color: colors.text }}
                  placeholder="Add custom certification..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addCertification(customCertification)
                      setCustomCertification('')
                    }
                  }}
                />
                <button
                  onClick={() => {
                    addCertification(customCertification)
                    setCustomCertification('')
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                  style={{ backgroundColor: '#4ECDC4', color: '#FFFFFF' }}
                >
                  Add
                </button>
              </div>
            </div>

            {/* Team Members Placeholder */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Team Assignment
              </label>
              <div className="p-4 rounded-lg text-center" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                <p className="text-sm" style={{ color: colors.textMuted }}>
                  Team members will be assigned after project creation
                </p>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            {/* Status */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Project Status
              </label>
              <div className="grid grid-cols-5 gap-2">
                {PROJECT_STATUSES.map(status => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => handleInputChange('status', status.value)}
                    className="p-3 rounded-lg text-center transition-all cursor-pointer"
                    style={{
                      backgroundColor: formData.status === status.value ? status.color : colors.bgAlt,
                      border: formData.status === status.value ? `2px solid ${status.color}` : colors.border,
                      color: formData.status === status.value ? '#FFFFFF' : colors.text
                    }}
                  >
                    <div className="text-xs font-semibold">{status.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Categories */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Document Categories
              </label>
              <div className="p-4 rounded-lg space-y-2" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                {formData.documentCategories?.map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 rounded"
                    style={{ backgroundColor: colors.bg }}
                  >
                    <span className="text-sm" style={{ color: colors.text }}>{category}</span>
                    <span className="text-xs" style={{ color: '#6BCB77' }}>✓</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification Settings */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Notification Settings
              </label>
              <div className="space-y-3">
                {[
                  { key: 'emailUpdates', label: 'Email Updates', desc: 'Receive email notifications for project updates' },
                  { key: 'milestoneAlerts', label: 'Milestone Alerts', desc: 'Get notified when milestones are completed' },
                  { key: 'budgetAlerts', label: 'Budget Alerts', desc: 'Alert when spending approaches budget limits' },
                  { key: 'teamNotifications', label: 'Team Notifications', desc: 'Notify team members of project changes' }
                ].map(setting => (
                  <div
                    key={setting.key}
                    className="p-3 rounded-lg flex items-start gap-3"
                    style={{ backgroundColor: colors.bgAlt, border: colors.border }}
                  >
                    <input
                      type="checkbox"
                      checked={formData.notificationSettings?.[setting.key as keyof typeof formData.notificationSettings]}
                      onChange={(e) => handleNestedInputChange('notificationSettings', setting.key, e.target.checked)}
                      className="mt-1 cursor-pointer"
                      style={{ accentColor: '#FF6B6B' }}
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: colors.text }}>{setting.label}</p>
                      <p className="text-xs" style={{ color: colors.textMuted }}>{setting.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Client Visibility */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: colors.text }}>
                Client Portal Access
              </label>
              <div
                className="p-3 rounded-lg flex items-start gap-3"
                style={{ backgroundColor: colors.bgAlt, border: colors.border }}
              >
                <input
                  type="checkbox"
                  checked={formData.clientVisibility}
                  onChange={(e) => handleInputChange('clientVisibility', e.target.checked)}
                  className="mt-1 cursor-pointer"
                  style={{ accentColor: '#FF6B6B' }}
                />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: colors.text }}>
                    Allow client to view project dashboard
                  </p>
                  <p className="text-xs" style={{ color: colors.textMuted }}>
                    Clients can track progress, view documents, and receive updates
                  </p>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" style={{ backgroundColor: colors.bg }}>
        {/* Header */}
        <div className="p-6" style={{ borderBottom: colors.border }}>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
              {mode === 'edit' ? 'Edit Project' : 'Create New Project'}
            </h2>
            <button
              onClick={handleClose}
              className="text-2xl font-bold hover:opacity-70 transition-opacity cursor-pointer"
              style={{ color: colors.textMuted }}
            >
              ×
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mt-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: activeTab === tab.id ? '#FF6B6B' : colors.bgAlt,
                  color: activeTab === tab.id ? '#FFFFFF' : colors.text,
                  border: activeTab === tab.id ? 'none' : colors.border
                }}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="p-6 flex items-center justify-between" style={{ borderTop: colors.border }}>
          <button
            onClick={handleBack}
            disabled={activeTab === 0}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-30 cursor-pointer"
            style={{ backgroundColor: colors.bgAlt, color: colors.text, border: colors.border }}
          >
            ← Back
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
              style={{ backgroundColor: colors.bgAlt, color: colors.text, border: colors.border }}
            >
              Cancel
            </button>

            {activeTab < tabs.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
                style={{ backgroundColor: '#FF6B6B', color: '#FFFFFF' }}
              >
                Next →
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
                style={{ backgroundColor: '#6BCB77', color: '#FFFFFF' }}
              >
                {mode === 'edit' ? 'Update Project' : 'Create Project'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
