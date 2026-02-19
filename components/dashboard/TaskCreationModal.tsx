"use client"

import { useState, useEffect } from "react"
import { useThemeColors } from "@/lib/hooks/useThemeColors"

type Task = {
  id: string
  title: string
  description: string
  project: string
  projectId: string
  trade: "electrical" | "plumbing" | "hvac" | "concrete" | "framing" | "finishing" | "general"
  phase: "pre-construction" | "foundation" | "framing" | "mep" | "finishing" | "closeout"
  priority: "critical" | "high" | "medium" | "low"
  status: "not-started" | "in-progress" | "review" | "completed" | "blocked"
  assignee: string
  assigneeId: string
  assigneeAvatar: string
  dueDate: string
  startDate: string
  duration: number
  progress: number
  estimatedHours: number
  actualHours: number
  dependencies: string[]
  attachments: number
  comments: number
  location: string
  weatherDependent: boolean
  weatherBuffer: number
  inspectionRequired: boolean
  inspectionType: string
  crewSize: number
  equipment: string[]
  materials: string[]
  certifications: string[]
  safetyProtocols: string[]
  qualityStandards: string[]
  documentation: string[]
  notifyInspector: boolean
  clientVisibility: boolean
}

type Project = {
  id: string
  name: string
}

type TeamMember = {
  id: string
  name: string
  avatar: string
  role: string
  trades: string[]
}

interface TaskCreationModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (task: Partial<Task>) => void
  editingTask?: Task | null
  projects: Project[]
  teamMembers: TeamMember[]
  existingTasks: Task[]
}

export default function TaskCreationModal({
  isOpen,
  onClose,
  onSave,
  editingTask,
  projects,
  teamMembers,
  existingTasks
}: TaskCreationModalProps) {
  const { colors, darkMode } = useThemeColors()
  const [activeTab, setActiveTab] = useState<"basic" | "scheduling" | "resources" | "quality" | "advanced">("basic")

  // Form state
  const [formData, setFormData] = useState<Partial<Task>>({
    title: "",
    description: "",
    projectId: "",
    project: "",
    phase: "pre-construction",
    trade: "general",
    priority: "medium",
    status: "not-started",
    assigneeId: "",
    assignee: "",
    assigneeAvatar: "",
    startDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    duration: 1,
    estimatedHours: 8,
    location: "",
    weatherDependent: false,
    weatherBuffer: 0,
    inspectionRequired: false,
    inspectionType: "",
    crewSize: 1,
    equipment: [],
    materials: [],
    certifications: [],
    safetyProtocols: [],
    qualityStandards: [],
    documentation: [],
    dependencies: [],
    notifyInspector: false,
    clientVisibility: false,
    progress: 0,
    actualHours: 0,
    attachments: 0,
    comments: 0
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Equipment options
  const equipmentOptions = [
    "Excavator", "Backhoe", "Bulldozer", "Crane", "Forklift", "Scaffolding",
    "Generator", "Concrete Mixer", "Saw", "Drill", "Nail Gun", "Air Compressor",
    "Welding Equipment", "Power Tools", "Safety Equipment", "Measuring Tools"
  ]

  // Material options
  const materialOptions = [
    "Concrete", "Rebar", "Lumber", "Drywall", "Insulation", "Roofing Materials",
    "Electrical Wire", "Conduit", "Pipes", "Fixtures", "Paint", "Flooring",
    "Windows", "Doors", "Hardware", "Fasteners", "Sealant", "Adhesives"
  ]

  // Certification options
  const certificationOptions = [
    "OSHA 10", "OSHA 30", "Electrical License", "Plumbing License",
    "Welding Certification", "Crane Operator", "Forklift Operator",
    "First Aid/CPR", "Confined Space", "Fall Protection"
  ]

  // Safety protocol options
  const safetyProtocolOptions = [
    "PPE Required", "Fall Protection", "Confined Space Entry", "Hot Work Permit",
    "Lockout/Tagout", "Excavation Safety", "Ladder Safety", "Scaffolding Inspection",
    "Fire Prevention", "Electrical Safety", "Heavy Equipment Operation"
  ]

  // Quality standard options
  const qualityStandardOptions = [
    "ACI Standards", "ASTM Standards", "ICC Building Codes", "NFPA Codes",
    "NEC Standards", "UBC Standards", "LEED Certification", "Energy Star",
    "ISO 9001", "Six Sigma"
  ]

  // Documentation options
  const documentationOptions = [
    "Daily Reports", "Progress Photos", "Material Receipts", "Inspection Reports",
    "Change Orders", "RFIs", "As-Built Drawings", "Warranty Documents",
    "Safety Reports", "Quality Control Checklists"
  ]

  // Inspection types
  const inspectionTypes = [
    "Foundation Inspection", "Framing Inspection", "Rough-in Inspection",
    "Electrical Inspection", "Plumbing Inspection", "HVAC Inspection",
    "Insulation Inspection", "Drywall Inspection", "Final Inspection",
    "Occupancy Inspection"
  ]

  useEffect(() => {
    if (editingTask) {
      setFormData(editingTask)
    } else {
      // Reset form when not editing
      setFormData({
        title: "",
        description: "",
        projectId: "",
        project: "",
        phase: "pre-construction",
        trade: "general",
        priority: "medium",
        status: "not-started",
        assigneeId: "",
        assignee: "",
        assigneeAvatar: "",
        startDate: new Date().toISOString().split('T')[0],
        dueDate: "",
        duration: 1,
        estimatedHours: 8,
        location: "",
        weatherDependent: false,
        weatherBuffer: 0,
        inspectionRequired: false,
        inspectionType: "",
        crewSize: 1,
        equipment: [],
        materials: [],
        certifications: [],
        safetyProtocols: [],
        qualityStandards: [],
        documentation: [],
        dependencies: [],
        notifyInspector: false,
        clientVisibility: false,
        progress: 0,
        actualHours: 0,
        attachments: 0,
        comments: 0
      })
    }
    setActiveTab("basic")
    setErrors({})
  }, [editingTask, isOpen])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    setFormData(prev => ({
      ...prev,
      projectId,
      project: project?.name || ""
    }))
  }

  const handleAssigneeChange = (assigneeId: string) => {
    const member = teamMembers.find(m => m.id === assigneeId)
    setFormData(prev => ({
      ...prev,
      assigneeId,
      assignee: member?.name || "",
      assigneeAvatar: member?.avatar || ""
    }))
  }

  const handleMultiSelectChange = (field: string, value: string) => {
    const currentValues = (formData[field as keyof Task] as string[]) || []
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value]
    handleInputChange(field, newValues)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title?.trim()) {
      newErrors.title = "Task title is required"
    }

    if (!formData.projectId) {
      newErrors.projectId = "Project is required"
    }

    if (!formData.dueDate) {
      newErrors.dueDate = "Due date is required"
    }

    if (formData.startDate && formData.dueDate && formData.startDate > formData.dueDate) {
      newErrors.dueDate = "Due date must be after start date"
    }

    if (formData.inspectionRequired && !formData.inspectionType) {
      newErrors.inspectionType = "Inspection type is required when inspection is needed"
    }

    if (formData.estimatedHours && formData.estimatedHours <= 0) {
      newErrors.estimatedHours = "Estimated hours must be greater than 0"
    }

    if (formData.crewSize && formData.crewSize < 1) {
      newErrors.crewSize = "Crew size must be at least 1"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    console.log('TaskCreationModal handleSubmit called')
    console.log('formData in modal:', formData)
    console.log('formData keys:', Object.keys(formData))
    console.log('Validation result:', validateForm())

    if (validateForm()) {
      console.log('Validation passed, calling onSave with:', formData)
      onSave(formData)
      onClose()
    } else {
      console.error('Validation failed, errors:', errors)
    }
  }

  if (!isOpen) return null

  const getTabStyle = (tab: typeof activeTab) => ({
    className: "px-6 py-3 font-medium text-sm transition-all cursor-pointer border-b-2",
    style: activeTab === tab
      ? { color: '#FF6B6B', borderColor: '#FF6B6B' }
      : { color: colors.textMuted, borderColor: 'transparent' }
  })

  const inputStyle = (hasError?: boolean) => ({
    color: colors.text,
    backgroundColor: colors.bg,
    border: hasError ? '1px solid rgb(239 68 68)' : colors.border
  })

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col" style={{
        backgroundColor: colors.bg,
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)"
      }}>
        {/* Modal Header */}
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: colors.borderBottom }}>
          <div>
            <h2 className="text-2xl font-bold" style={{ color: colors.text }}>
              {editingTask ? "Edit Task" : "Create New Task"}
            </h2>
            <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
              {editingTask ? "Update task details" : "Add a new task to your project workflow"}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${darkMode ? 'hover:bg-muted' : 'hover:bg-gray-100'}`}
          >
            <svg className="w-6 h-6" style={{ color: colors.textMuted }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6" style={{ borderBottom: colors.borderBottom }}>
          {(["basic", "scheduling", "resources", "quality", "advanced"] as const).map((tab) => {
            const tabLabels = {
              basic: "Basic Info",
              scheduling: "Scheduling",
              resources: "Resources",
              quality: "Quality & Safety",
              advanced: "Advanced"
            }
            const { className, style } = getTabStyle(tab)
            return (
              <button key={tab} className={className} style={style} onClick={() => setActiveTab(tab)}>
                {tabLabels[tab]}
              </button>
            )
          })}
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Basic Information Tab */}
          {activeTab === "basic" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Task Title <span className="text-[#FF6B6B]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                  style={inputStyle(!!errors.title)}
                  placeholder="e.g., Install electrical panels in basement"
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                  style={inputStyle()}
                  rows={4}
                  placeholder="Detailed description of the task..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Project <span className="text-[#FF6B6B]">*</span>
                  </label>
                  <select
                    value={formData.projectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={inputStyle(!!errors.projectId)}
                  >
                    <option value="">Select Project</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  {errors.projectId && <p className="text-red-500 text-sm mt-1">{errors.projectId}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Phase
                  </label>
                  <select
                    value={formData.phase}
                    onChange={(e) => handleInputChange("phase", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={inputStyle()}
                  >
                    <option value="pre-construction">Pre-Construction</option>
                    <option value="foundation">Foundation</option>
                    <option value="framing">Framing</option>
                    <option value="mep">MEP (Mechanical, Electrical, Plumbing)</option>
                    <option value="finishing">Finishing</option>
                    <option value="closeout">Closeout</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Trade
                  </label>
                  <select
                    value={formData.trade}
                    onChange={(e) => handleInputChange("trade", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={inputStyle()}
                  >
                    <option value="general">General</option>
                    <option value="electrical">Electrical</option>
                    <option value="plumbing">Plumbing</option>
                    <option value="hvac">HVAC</option>
                    <option value="concrete">Concrete</option>
                    <option value="framing">Framing</option>
                    <option value="finishing">Finishing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={inputStyle()}
                    placeholder="e.g., Building A - 2nd Floor"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Scheduling Intelligence Tab */}
          {activeTab === "scheduling" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => handleInputChange("startDate", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={inputStyle()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Due Date <span className="text-[#FF6B6B]">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange("dueDate", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={inputStyle(!!errors.dueDate)}
                  />
                  {errors.dueDate && <p className="text-red-500 text-sm mt-1">{errors.dueDate}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleInputChange("duration", parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={inputStyle()}
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Estimated Hours
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedHours}
                    onChange={(e) => handleInputChange("estimatedHours", parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={inputStyle(!!errors.estimatedHours)}
                    min="0"
                  />
                  {errors.estimatedHours && <p className="text-red-500 text-sm mt-1">{errors.estimatedHours}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Task Dependencies
                </label>
                <select
                  multiple
                  value={formData.dependencies || []}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    handleInputChange("dependencies", selected)
                  }}
                  className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent min-h-30"
                  style={inputStyle()}
                >
                  {existingTasks
                    .filter(task => task.id !== editingTask?.id)
                    .map(task => (
                      <option key={task.id} value={task.id}>
                        {task.title} - {task.project}
                      </option>
                    ))}
                </select>
                <p className="text-xs mt-1" style={{ color: colors.textMuted }}>
                  Hold Ctrl/Cmd to select multiple dependencies
                </p>
              </div>

              <div className="bg-[#FFF9E6] border border-[#FFD93D] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="weatherDependent"
                    checked={formData.weatherDependent}
                    onChange={(e) => handleInputChange("weatherDependent", e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#FF6B6B] border-gray-300 rounded focus:ring-[#FF6B6B]"
                  />
                  <div className="flex-1">
                    <label htmlFor="weatherDependent" className="block text-sm font-medium text-[#1A1A1A] cursor-pointer">
                      ☀️ Weather Dependent Task
                    </label>
                    <p className="text-xs text-[#4A4A4A] mt-1">
                      This task can be affected by weather conditions (e.g., concrete pouring, roofing, exterior painting)
                    </p>
                  </div>
                </div>

                {formData.weatherDependent && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                      Weather Buffer Days
                    </label>
                    <input
                      type="number"
                      value={formData.weatherBuffer}
                      onChange={(e) => handleInputChange("weatherBuffer", parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                      min="0"
                      max="10"
                      placeholder="Additional buffer days for weather delays"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === "resources" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Assign To
                  </label>
                  <select
                    value={formData.assigneeId}
                    onChange={(e) => handleAssigneeChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={inputStyle()}
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} - {member.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Crew Size
                  </label>
                  <input
                    type="number"
                    value={formData.crewSize}
                    onChange={(e) => handleInputChange("crewSize", parseInt(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={inputStyle(!!errors.crewSize)}
                    min="1"
                  />
                  {errors.crewSize && <p className="text-red-500 text-sm mt-1">{errors.crewSize}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Equipment Needed
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                  {equipmentOptions.map(equipment => (
                    <label key={equipment} className="flex items-center gap-2 cursor-pointer hover:bg-card p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={(formData.equipment || []).includes(equipment)}
                        onChange={() => handleMultiSelectChange("equipment", equipment)}
                        className="w-4 h-4 text-[#FF6B6B] border-gray-300 rounded focus:ring-[#FF6B6B]"
                      />
                      <span className="text-sm" style={{ color: colors.text }}>{equipment}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Materials Required
                </label>
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                  {materialOptions.map(material => (
                    <label key={material} className="flex items-center gap-2 cursor-pointer hover:bg-card p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={(formData.materials || []).includes(material)}
                        onChange={() => handleMultiSelectChange("materials", material)}
                        className="w-4 h-4 text-[#FF6B6B] border-gray-300 rounded focus:ring-[#FF6B6B]"
                      />
                      <span className="text-sm" style={{ color: colors.text }}>{material}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Required Certifications
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                  {certificationOptions.map(cert => (
                    <label key={cert} className="flex items-center gap-2 cursor-pointer hover:bg-card p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={(formData.certifications || []).includes(cert)}
                        onChange={() => handleMultiSelectChange("certifications", cert)}
                        className="w-4 h-4 text-[#FF6B6B] border-gray-300 rounded focus:ring-[#FF6B6B]"
                      />
                      <span className="text-sm" style={{ color: colors.text }}>{cert}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quality & Safety Tab */}
          {activeTab === "quality" && (
            <div className="space-y-4">
              <div className="bg-[#FEE2E2] border border-[#DC2626] rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="inspectionRequired"
                    checked={formData.inspectionRequired}
                    onChange={(e) => handleInputChange("inspectionRequired", e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#FF6B6B] border-gray-300 rounded focus:ring-[#FF6B6B]"
                  />
                  <div className="flex-1">
                    <label htmlFor="inspectionRequired" className="block text-sm font-medium text-[#1A1A1A] cursor-pointer">
                      🔍 Inspection Required
                    </label>
                    <p className="text-xs text-[#4A4A4A] mt-1">
                      This task requires official inspection before proceeding to next phase
                    </p>
                  </div>
                </div>

                {formData.inspectionRequired && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-[#1A1A1A] mb-2">
                      Inspection Type <span className="text-[#FF6B6B]">*</span>
                    </label>
                    <select
                      value={formData.inspectionType}
                      onChange={(e) => handleInputChange("inspectionType", e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-lg border ${errors.inspectionType ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent`}
                    >
                      <option value="">Select Inspection Type</option>
                      {inspectionTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                    {errors.inspectionType && <p className="text-red-500 text-sm mt-1">{errors.inspectionType}</p>}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Safety Protocols
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                  {safetyProtocolOptions.map(protocol => (
                    <label key={protocol} className="flex items-center gap-2 cursor-pointer hover:bg-card p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={(formData.safetyProtocols || []).includes(protocol)}
                        onChange={() => handleMultiSelectChange("safetyProtocols", protocol)}
                        className="w-4 h-4 text-[#FF6B6B] border-gray-300 rounded focus:ring-[#FF6B6B]"
                      />
                      <span className="text-sm" style={{ color: colors.text }}>{protocol}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Quality Standards
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                  {qualityStandardOptions.map(standard => (
                    <label key={standard} className="flex items-center gap-2 cursor-pointer hover:bg-card p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={(formData.qualityStandards || []).includes(standard)}
                        onChange={() => handleMultiSelectChange("qualityStandards", standard)}
                        className="w-4 h-4 text-[#FF6B6B] border-gray-300 rounded focus:ring-[#FF6B6B]"
                      />
                      <span className="text-sm" style={{ color: colors.text }}>{standard}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                  Documentation Required
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-3 rounded-lg" style={{ backgroundColor: colors.bgAlt, border: colors.border }}>
                  {documentationOptions.map(doc => (
                    <label key={doc} className="flex items-center gap-2 cursor-pointer hover:bg-card p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={(formData.documentation || []).includes(doc)}
                        onChange={() => handleMultiSelectChange("documentation", doc)}
                        className="w-4 h-4 text-[#FF6B6B] border-gray-300 rounded focus:ring-[#FF6B6B]"
                      />
                      <span className="text-sm" style={{ color: colors.text }}>{doc}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Advanced Options Tab */}
          {activeTab === "advanced" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Priority Level
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange("priority", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={inputStyle()}
                  >
                    <option value="low">✅ Low</option>
                    <option value="medium">➡️ Medium</option>
                    <option value="high">⚠️ High</option>
                    <option value="critical">🔥 Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange("status", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                    style={inputStyle()}
                  >
                    <option value="not-started">⏳ Not Started</option>
                    <option value="in-progress">🚧 In Progress</option>
                    <option value="review">🔍 Review</option>
                    <option value="completed">✅ Completed</option>
                    <option value="blocked">🚨 Blocked</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-lg" style={{ backgroundColor: colors.bgAlt }}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.notifyInspector}
                    onChange={(e) => handleInputChange("notifyInspector", e.target.checked)}
                    className="w-4 h-4 text-[#FF6B6B] border-gray-300 rounded focus:ring-[#FF6B6B]"
                  />
                  <div>
                    <span className="text-sm font-medium" style={{ color: colors.text }}>📧 Notify Inspector</span>
                    <p className="text-xs" style={{ color: colors.textMuted }}>Send automatic notification when task is ready for inspection</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.clientVisibility}
                    onChange={(e) => handleInputChange("clientVisibility", e.target.checked)}
                    className="w-4 h-4 text-[#FF6B6B] border-gray-300 rounded focus:ring-[#FF6B6B]"
                  />
                  <div>
                    <span className="text-sm font-medium" style={{ color: colors.text }}>👁️ Client Visibility</span>
                    <p className="text-xs" style={{ color: colors.textMuted }}>Make this task visible to client in their portal</p>
                  </div>
                </label>
              </div>

              {editingTask && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Progress (%)
                    </label>
                    <input
                      type="number"
                      value={formData.progress}
                      onChange={(e) => handleInputChange("progress", parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                      style={inputStyle()}
                      min="0"
                      max="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.text }}>
                      Actual Hours
                    </label>
                    <input
                      type="number"
                      value={formData.actualHours}
                      onChange={(e) => handleInputChange("actualHours", parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF6B6B] focus:border-transparent"
                      style={inputStyle()}
                      min="0"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 flex items-center justify-end gap-3" style={{ borderTop: colors.borderBottom }}>
          <button
            onClick={onClose}
            className={`px-6 py-2.5 rounded-lg font-medium transition-colors ${darkMode ? 'hover:bg-muted' : 'hover:bg-gray-50'}`}
            style={{ border: colors.border, color: colors.text }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-lg bg-[#FF6B6B] text-white font-medium hover:bg-[#FF5252] transition-colors"
            style={{
              boxShadow: "0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)"
            }}
          >
            {editingTask ? "Update Task" : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  )
}
