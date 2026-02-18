"use client"

export const dynamic = 'force-dynamic'


import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import TaskCreationModal from "@/components/dashboard/TaskCreationModal"
import { getTasks, createTask, updateTask, subscribeToTasks, type Task as SupabaseTask } from "@/lib/supabase/tasks"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import DraggableTaskCard from "@/components/dashboard/DraggableTaskCard"
import TeamAllocationHeatmap from "@/components/dashboard/TeamAllocationHeatmap"
import ProgressMetricsWidget from "@/components/dashboard/ProgressMetricsWidget"
import CalendarView from "@/components/dashboard/CalendarView"
import GanttChartView from "@/components/dashboard/GanttChartView"
import WeatherWidget from "@/components/dashboard/WeatherWidget"
import { ConstructionErrorBoundary } from "@/components/ErrorBoundary"
import { useThemeColors } from "@/lib/hooks/useThemeColors"

// Task type definition
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

// Droppable Column Component
function DroppableColumn({
  id,
  style,
  count,
  children
}: {
  id: string
  style: { icon: string; label: string; color: string; bg: string }
  count: number
  children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({ id })
  const { colors } = useThemeColors()

  return (
    <div ref={setNodeRef} className="w-80 shrink-0">
      <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: style.bg, border: `1px solid ${style.color}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">{style.icon}</span>
            <h3 className="font-bold text-sm" style={{ color: style.color }}>{style.label}</h3>
          </div>
          <span className="text-sm font-semibold px-2 py-1 rounded" style={{ backgroundColor: colors.bg, color: style.color }}>
            {count}
          </span>
        </div>
      </div>
      {children}
    </div>
  )
}

export default function TaskFlowPage() {
  const router = useRouter()
  const { colors } = useThemeColors()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<"dashboard" | "calendar" | "gantt" | "kanban" | "list">("dashboard")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [selectedTrade, setSelectedTrade] = useState<string>("all")
  const [selectedPriority, setSelectedPriority] = useState<string>("all")
  const [userPlan, setUserPlan] = useState<"starter" | "professional" | "enterprise">("professional")
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const userData = {
    full_name: user?.user_metadata?.full_name || "John Doe",
    company_name: user?.user_metadata?.company_name || "Demo Construction Co.",
  }

  const userName = userData.full_name?.split(' ')[0] || "User"

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return `Good Morning, ${userName}!`
    if (hour < 18) return `Good Afternoon, ${userName}!`
    return `Good Evening, ${userName}!`
  }

  // Trade colors
  const tradeColors = {
    electrical: { bg: "#FFF9E6", border: "#FFD93D", text: "#1A1A1A" },
    plumbing: { bg: "#E5F4FF", border: "#6A9BFD", text: "#1A1A1A" },
    hvac: { bg: "#F0F9FF", border: "#38BDF8", text: "#1A1A1A" },
    concrete: { bg: "#F8F9FA", border: "#4A4A4A", text: "#1A1A1A" },
    framing: { bg: "#FFF5EB", border: "#D97706", text: "#1A1A1A" },
    finishing: { bg: "#FFFFFF", border: "#E0E0E0", text: "#1A1A1A" },
    general: { bg: "#F8F9FA", border: "#E0E0E0", text: "#1A1A1A" }
  }

  // Priority styles
  const priorityStyles = {
    critical: { icon: "🔥", color: "#DC2626", bg: "#FEE2E2" },
    high: { icon: "⚠️", color: "#F59E0B", bg: "#FEF3C7" },
    medium: { icon: "➡️", color: "#FFD93D", bg: "#FFF9E6" },
    low: { icon: "✅", color: "#6BCB77", bg: "#E6F9EA" }
  }

  // Status styles
  const statusStyles = {
    "not-started": { icon: "⏳", label: "Not Started", color: "#4A4A4A", bg: "#F8F9FA" },
    "in-progress": { icon: "🚧", label: "In Progress", color: "#6A9BFD", bg: "#E5F4FF" },
    "review": { icon: "🔍", label: "Review", color: "#F59E0B", bg: "#FEF3C7" },
    "completed": { icon: "✅", label: "Completed", color: "#6BCB77", bg: "#E6F9EA" },
    "blocked": { icon: "🚨", label: "Blocked", color: "#DC2626", bg: "#FEE2E2" }
  }

  // Projects data (loaded from database)
  const [projects, setProjects] = useState<Project[]>([])

  // Load projects on component mount
  useEffect(() => {
    async function loadProjects() {
      const { getProjects } = await import('@/lib/supabase/projects')
      const { data, error } = await getProjects()

      if (error) {
        console.error('Error loading projects for TaskFlow:', error)
        return
      }

      if (data) {
        // Map database projects to the Project type used in TaskFlow
        const mappedProjects = data.map(p => ({
          id: p.id,
          name: p.name
        }))
        setProjects(mappedProjects)
        console.log('Loaded projects for TaskFlow:', mappedProjects)
      }
    }

    loadProjects()
  }, [])

  // Sample team members data
  const teamMembers: TeamMember[] = [
    { id: "user-1", name: "Mike Johnson", avatar: "https://ui-avatars.com/api/?name=Mike+Johnson&background=FF6B6B&color=fff", role: "Electrician", trades: ["electrical"] },
    { id: "user-2", name: "David Lee", avatar: "https://ui-avatars.com/api/?name=David+Lee&background=4A4A4A&color=fff", role: "Concrete Specialist", trades: ["concrete"] },
    { id: "user-3", name: "Sarah Wilson", avatar: "https://ui-avatars.com/api/?name=Sarah+Wilson&background=38BDF8&color=fff", role: "HVAC Technician", trades: ["hvac"] },
    { id: "user-4", name: "Tom Brown", avatar: "https://ui-avatars.com/api/?name=Tom+Brown&background=E0E0E0&color=000", role: "Finishing Specialist", trades: ["finishing"] },
    { id: "user-5", name: "Emily Chen", avatar: "https://ui-avatars.com/api/?name=Emily+Chen&background=6A9BFD&color=fff", role: "Plumber", trades: ["plumbing"] },
    { id: "user-6", name: "Robert Taylor", avatar: "https://ui-avatars.com/api/?name=Robert+Taylor&background=D97706&color=fff", role: "Framing Contractor", trades: ["framing"] },
    { id: "user-7", name: "Lisa Martinez", avatar: "https://ui-avatars.com/api/?name=Lisa+Martinez&background=4ECDC4&color=fff", role: "Project Superintendent", trades: ["general", "electrical", "plumbing", "hvac", "concrete", "framing", "finishing"] }
  ]

  // Sample tasks data
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Electrical rough-in inspection",
      description: "Schedule and complete rough-in inspection before drywall",
      project: "Downtown Office Renovation",
      projectId: "proj-1",
      trade: "electrical",
      phase: "mep",
      priority: "critical",
      status: "in-progress",
      assignee: "Mike Johnson",
      assigneeId: "user-1",
      assigneeAvatar: "https://ui-avatars.com/api/?name=Mike+Johnson&background=FF6B6B&color=fff",
      startDate: "2024-11-07",
      dueDate: "2024-11-10",
      duration: 3,
      progress: 75,
      estimatedHours: 4,
      actualHours: 3.5,
      dependencies: [],
      attachments: 3,
      comments: 5,
      location: "Floor 3, Units 301-305",
      weatherDependent: false,
      weatherBuffer: 0,
      inspectionRequired: true,
      inspectionType: "Electrical Inspection",
      crewSize: 2,
      equipment: ["Scaffolding", "Power Tools", "Measuring Tools"],
      materials: ["Electrical Wire", "Conduit"],
      certifications: ["Electrical License", "OSHA 30"],
      safetyProtocols: ["PPE Required", "Lockout/Tagout", "Ladder Safety"],
      qualityStandards: ["NEC Standards"],
      documentation: ["Daily Reports", "Inspection Reports"],
      notifyInspector: true,
      clientVisibility: true
    },
    {
      id: "2",
      title: "Concrete foundation pour - South wing",
      description: "Pour foundation for south wing expansion",
      project: "Warehouse Build",
      projectId: "proj-2",
      trade: "concrete",
      phase: "foundation",
      priority: "high",
      status: "blocked",
      assignee: "David Lee",
      assigneeId: "user-2",
      assigneeAvatar: "https://ui-avatars.com/api/?name=David+Lee&background=4A4A4A&color=fff",
      startDate: "2024-11-06",
      dueDate: "2024-11-09",
      duration: 3,
      progress: 30,
      estimatedHours: 16,
      actualHours: 5,
      dependencies: ["rebar-inspection"],
      attachments: 2,
      comments: 8,
      location: "South Wing Foundation",
      weatherDependent: true,
      weatherBuffer: 2,
      inspectionRequired: true,
      inspectionType: "Foundation Inspection",
      crewSize: 6,
      equipment: ["Concrete Mixer", "Generator", "Power Tools"],
      materials: ["Concrete", "Rebar"],
      certifications: ["OSHA 30"],
      safetyProtocols: ["PPE Required", "Excavation Safety"],
      qualityStandards: ["ACI Standards"],
      documentation: ["Daily Reports", "Progress Photos", "Material Receipts"],
      notifyInspector: true,
      clientVisibility: true
    },
    {
      id: "3",
      title: "HVAC ductwork installation - Main floor",
      description: "Install main floor ductwork and vents",
      project: "Retail Store Fit-Out",
      projectId: "proj-3",
      trade: "hvac",
      phase: "mep",
      priority: "medium",
      status: "not-started",
      assignee: "Sarah Wilson",
      assigneeId: "user-3",
      assigneeAvatar: "https://ui-avatars.com/api/?name=Sarah+Wilson&background=38BDF8&color=fff",
      startDate: "2024-11-10",
      dueDate: "2024-11-12",
      duration: 2,
      progress: 0,
      estimatedHours: 12,
      actualHours: 0,
      dependencies: ["framing-complete"],
      attachments: 1,
      comments: 2,
      location: "Main Retail Floor",
      weatherDependent: false,
      weatherBuffer: 0,
      inspectionRequired: false,
      inspectionType: "",
      crewSize: 3,
      equipment: ["Scaffolding", "Power Tools", "Measuring Tools"],
      materials: [],
      certifications: ["OSHA 10"],
      safetyProtocols: ["PPE Required", "Ladder Safety"],
      qualityStandards: [],
      documentation: ["Daily Reports"],
      notifyInspector: false,
      clientVisibility: false
    },
    {
      id: "4",
      title: "Drywall installation - Residential units",
      description: "Hang and tape drywall in units 201-210",
      project: "Residential Kitchen Remodel",
      projectId: "proj-4",
      trade: "finishing",
      phase: "finishing",
      priority: "medium",
      status: "in-progress",
      assignee: "Tom Brown",
      assigneeId: "user-4",
      assigneeAvatar: "https://ui-avatars.com/api/?name=Tom+Brown&background=E0E0E0&color=000",
      startDate: "2024-11-08",
      dueDate: "2024-11-11",
      duration: 3,
      progress: 45,
      estimatedHours: 24,
      actualHours: 12,
      dependencies: ["electrical-rough", "plumbing-rough"],
      attachments: 0,
      comments: 3,
      location: "Building A, Floor 2",
      weatherDependent: false,
      weatherBuffer: 0,
      inspectionRequired: false,
      inspectionType: "",
      crewSize: 4,
      equipment: ["Scaffolding", "Power Tools"],
      materials: ["Drywall"],
      certifications: ["OSHA 10"],
      safetyProtocols: ["PPE Required", "Ladder Safety"],
      qualityStandards: [],
      documentation: ["Daily Reports", "Progress Photos"],
      notifyInspector: false,
      clientVisibility: true
    },
    {
      id: "5",
      title: "Plumbing final connections",
      description: "Connect all fixtures and test water pressure",
      project: "Downtown Office Renovation",
      projectId: "proj-1",
      trade: "plumbing",
      phase: "finishing",
      priority: "high",
      status: "review",
      assignee: "Emily Chen",
      assigneeId: "user-5",
      assigneeAvatar: "https://ui-avatars.com/api/?name=Emily+Chen&background=6A9BFD&color=fff",
      startDate: "2024-11-06",
      dueDate: "2024-11-08",
      duration: 2,
      progress: 90,
      estimatedHours: 8,
      actualHours: 7.5,
      dependencies: [],
      attachments: 5,
      comments: 12,
      location: "All Floors",
      weatherDependent: false,
      weatherBuffer: 0,
      inspectionRequired: true,
      inspectionType: "Plumbing Inspection",
      crewSize: 2,
      equipment: ["Power Tools", "Measuring Tools"],
      materials: ["Pipes", "Fixtures"],
      certifications: ["Plumbing License", "OSHA 10"],
      safetyProtocols: ["PPE Required"],
      qualityStandards: [],
      documentation: ["Daily Reports", "Inspection Reports"],
      notifyInspector: true,
      clientVisibility: true
    },
    {
      id: "6",
      title: "Framing interior walls - Unit 305",
      description: "Frame interior walls according to updated plans",
      project: "Residential Kitchen Remodel",
      projectId: "proj-4",
      trade: "framing",
      phase: "framing",
      priority: "critical",
      status: "not-started",
      assignee: "Robert Taylor",
      assigneeId: "user-6",
      assigneeAvatar: "https://ui-avatars.com/api/?name=Robert+Taylor&background=D97706&color=fff",
      startDate: "2024-11-09",
      dueDate: "2024-11-09",
      duration: 1,
      progress: 0,
      estimatedHours: 16,
      actualHours: 0,
      dependencies: [],
      attachments: 2,
      comments: 1,
      location: "Unit 305",
      weatherDependent: false,
      weatherBuffer: 0,
      inspectionRequired: false,
      inspectionType: "",
      crewSize: 4,
      equipment: ["Nail Gun", "Saw", "Measuring Tools"],
      materials: ["Lumber"],
      certifications: ["OSHA 10"],
      safetyProtocols: ["PPE Required", "Ladder Safety"],
      qualityStandards: [],
      documentation: ["Daily Reports"],
      notifyInspector: false,
      clientVisibility: false
    },
  ])

  // Authentication and data loading
  useEffect(() => {
    const supabase = createClient()

    // Check authentication
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      setUser(user)

      // Get user plan from profile
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("plan")
        .eq("id", user.id)
        .single()

      if (profile?.plan) {
        setUserPlan(profile.plan as "starter" | "professional" | "enterprise")
      }

      setLoading(false)
    }

    checkAuth()
  }, [router])

  // Load tasks from Supabase
  useEffect(() => {
    if (!user) return

    const loadTasks = async () => {
      const { data, error } = await getTasks()

      if (error) {
        console.error("Error loading tasks:", error)
        return
      }

      if (data) {
        // Convert Supabase tasks to component Task type
        const convertedTasks: Task[] = data.map(task => ({
          id: task.id,
          title: task.title,
          description: task.description || "",
          project: task.project_name || "",
          projectId: task.project_id || "",
          trade: task.trade,
          phase: task.phase,
          priority: task.priority,
          status: task.status,
          assignee: task.assignee_name || "",
          assigneeId: task.assignee_id || "",
          assigneeAvatar: task.assignee_avatar || "",
          dueDate: task.due_date,
          startDate: task.start_date || "",
          duration: task.duration,
          progress: task.progress,
          estimatedHours: task.estimated_hours,
          actualHours: task.actual_hours,
          dependencies: task.dependencies,
          attachments: task.attachments,
          comments: task.comments,
          location: task.location || "",
          weatherDependent: task.weather_dependent,
          weatherBuffer: task.weather_buffer,
          inspectionRequired: task.inspection_required,
          inspectionType: task.inspection_type || "",
          crewSize: task.crew_size,
          equipment: task.equipment,
          materials: task.materials,
          certifications: task.certifications,
          safetyProtocols: task.safety_protocols,
          qualityStandards: task.quality_standards,
          documentation: task.documentation,
          notifyInspector: task.notify_inspector,
          clientVisibility: task.client_visibility
        }))

        setTasks(convertedTasks)
      }
    }

    loadTasks()

    // Subscribe to real-time updates
    const unsubscribe = subscribeToTasks((payload) => {
      console.log('Real-time event received:', payload.eventType, payload.new)

      if (payload.eventType === "INSERT") {
        console.log('Processing INSERT event for new task')
        const newTask = payload.new as SupabaseTask
        const convertedTask: Task = {
          id: newTask.id,
          title: newTask.title,
          description: newTask.description || "",
          project: newTask.project_name || "",
          projectId: newTask.project_id || "",
          trade: newTask.trade,
          phase: newTask.phase,
          priority: newTask.priority,
          status: newTask.status,
          assignee: newTask.assignee_name || "",
          assigneeId: newTask.assignee_id || "",
          assigneeAvatar: newTask.assignee_avatar || "",
          dueDate: newTask.due_date,
          startDate: newTask.start_date || "",
          duration: newTask.duration,
          progress: newTask.progress,
          estimatedHours: newTask.estimated_hours,
          actualHours: newTask.actual_hours,
          dependencies: newTask.dependencies,
          attachments: newTask.attachments,
          comments: newTask.comments,
          location: newTask.location || "",
          weatherDependent: newTask.weather_dependent,
          weatherBuffer: newTask.weather_buffer,
          inspectionRequired: newTask.inspection_required,
          inspectionType: newTask.inspection_type || "",
          crewSize: newTask.crew_size,
          equipment: newTask.equipment,
          materials: newTask.materials,
          certifications: newTask.certifications,
          safetyProtocols: newTask.safety_protocols,
          qualityStandards: newTask.quality_standards,
          documentation: newTask.documentation,
          notifyInspector: newTask.notify_inspector,
          clientVisibility: newTask.client_visibility
        }
        console.log('Adding new task to state:', convertedTask)
        setTasks(prev => {
          const updated = [...prev, convertedTask]
          console.log('Updated tasks array:', updated.length, 'tasks')
          return updated
        })
      } else if (payload.eventType === "UPDATE") {
        const updatedTask = payload.new as SupabaseTask
        setTasks(prev => prev.map(t => t.id === updatedTask.id ? {
          id: updatedTask.id,
          title: updatedTask.title,
          description: updatedTask.description || "",
          project: updatedTask.project_name || "",
          projectId: updatedTask.project_id || "",
          trade: updatedTask.trade,
          phase: updatedTask.phase,
          priority: updatedTask.priority,
          status: updatedTask.status,
          assignee: updatedTask.assignee_name || "",
          assigneeId: updatedTask.assignee_id || "",
          assigneeAvatar: updatedTask.assignee_avatar || "",
          dueDate: updatedTask.due_date,
          startDate: updatedTask.start_date || "",
          duration: updatedTask.duration,
          progress: updatedTask.progress,
          estimatedHours: updatedTask.estimated_hours,
          actualHours: updatedTask.actual_hours,
          dependencies: updatedTask.dependencies,
          attachments: updatedTask.attachments,
          comments: updatedTask.comments,
          location: updatedTask.location || "",
          weatherDependent: updatedTask.weather_dependent,
          weatherBuffer: updatedTask.weather_buffer,
          inspectionRequired: updatedTask.inspection_required,
          inspectionType: updatedTask.inspection_type || "",
          crewSize: updatedTask.crew_size,
          equipment: updatedTask.equipment,
          materials: updatedTask.materials,
          certifications: updatedTask.certifications,
          safetyProtocols: updatedTask.safety_protocols,
          qualityStandards: updatedTask.quality_standards,
          documentation: updatedTask.documentation,
          notifyInspector: updatedTask.notify_inspector,
          clientVisibility: updatedTask.client_visibility
        } : t))
      } else if (payload.eventType === "DELETE") {
        setTasks(prev => prev.filter(t => t.id !== payload.old.id))
      }
    })

    return () => {
      unsubscribe()
    }
  }, [user])

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (selectedProject !== "all" && task.projectId !== selectedProject) return false
    if (selectedTrade !== "all" && task.trade !== selectedTrade) return false
    if (selectedPriority !== "all" && task.priority !== selectedPriority) return false
    return true
  })

  // Calculate stats
  const stats = {
    total: filteredTasks.length,
    completed: filteredTasks.filter(t => t.status === "completed").length,
    inProgress: filteredTasks.filter(t => t.status === "in-progress").length,
    blocked: filteredTasks.filter(t => t.status === "blocked").length,
    overdue: filteredTasks.filter(t => new Date(t.dueDate) < new Date() && t.status !== "completed").length,
    dueToday: filteredTasks.filter(t => {
      const today = new Date().toISOString().split('T')[0]
      return t.dueDate === today && t.status !== "completed"
    }).length
  }

  // My tasks (assigned to current user)
  const myTasks = filteredTasks.filter(t => t.assignee === userData.full_name || t.assignee === "Mike Johnson")

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      return
    }

    const taskId = active.id as string
    const newStatus = over.id as Task["status"]

    // Find the task
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) {
      setActiveId(null)
      return
    }

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))

    // Update in Supabase
    const { error } = await updateTask(taskId, { status: newStatus })

    if (error) {
      console.error("Error updating task status:", error)
      // Revert on error
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: task.status } : t))
      alert("Failed to update task status. Please try again.")
    }

    setActiveId(null)
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        setUser(session.user)
        // Plan is loaded from user_profiles.plan in the other useEffect (secure, RLS-protected)
      } else {
        setUser({ user_metadata: { full_name: "John Doe" } })
      }
      setLoading(false)
    }
    loadUser()
  }, [])



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: colors.bgAlt }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#FF6B6B', borderTopColor: 'transparent' }}></div>
          <p style={{ color: colors.textMuted }}>Loading TaskFlow...</p>
        </div>
      </div>
    )
  }

  return (
    <>
        {/* Header */}
        <header className="sticky top-0 z-40" style={{ backgroundColor: colors.bg, borderBottom: colors.borderBottom, boxShadow: '0 2px 4px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.05)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold" style={{ color: colors.text }}>{getGreeting()}</h1>
                <p className="text-sm mt-1" style={{ color: colors.textMuted }}>
                  You have {stats.dueToday} tasks due today and {stats.overdue} overdue
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
                  style={{ background: 'linear-gradient(to bottom, #FF6B6B 0%, #FF5252 100%)', boxShadow: '0 2px 4px rgba(255,107,107,0.2), 0 1px 2px rgba(255,107,107,0.3)' }}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Quick Add Task
                </button>
              </div>
            </div>

            {/* View Toggle & Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* View Toggle — horizontally scrollable on mobile */}
              <div className="flex items-center gap-2 rounded-lg p-1 overflow-x-auto" style={{ backgroundColor: colors.bgAlt }}>
                <button
                  onClick={() => setViewMode("dashboard")}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shrink-0 ${viewMode === "dashboard" ? "shadow-sm" : ""}`}
                  style={viewMode === "dashboard" ? { backgroundColor: colors.bg, color: colors.text } : { color: colors.textMuted }}
                >
                  📋 Dashboard
                </button>
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === "kanban" ? "shadow-sm" : ""}`}
                  style={viewMode === "kanban" ? { backgroundColor: colors.bg, color: colors.text } : { color: colors.textMuted }}
                >
                  🎯 Kanban
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === "list" ? "shadow-sm" : ""}`}
                  style={viewMode === "list" ? { backgroundColor: colors.bg, color: colors.text } : { color: colors.textMuted }}
                >
                  📱 List
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === "calendar" ? "shadow-sm" : ""}`}
                  style={viewMode === "calendar" ? { backgroundColor: colors.bg, color: colors.text } : { color: colors.textMuted }}
                  disabled={userPlan === "starter"}
                >
                  🗓️ Calendar {userPlan === "starter" && <span className="text-xs">🔒</span>}
                </button>
                <button
                  onClick={() => setViewMode("gantt")}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${viewMode === "gantt" ? "shadow-sm" : ""}`}
                  style={viewMode === "gantt" ? { backgroundColor: colors.bg, color: colors.text } : { color: colors.textMuted }}
                  disabled={userPlan === "starter"}
                >
                  📊 Gantt {userPlan === "starter" && <span className="text-xs">🔒</span>}
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="px-3 py-2 rounded-lg focus:outline-none text-sm"
                  style={{ border: colors.border, color: colors.text }}
                >
                  <option value="all">All Projects</option>
                  <option value="proj-1">Downtown Office</option>
                  <option value="proj-2">Warehouse Build</option>
                  <option value="proj-3">Retail Fit-Out</option>
                  <option value="proj-4">Kitchen Remodel</option>
                </select>

                <select
                  value={selectedTrade}
                  onChange={(e) => setSelectedTrade(e.target.value)}
                  className="px-3 py-2 rounded-lg focus:outline-none text-sm"
                  style={{ border: colors.border, color: colors.text }}
                >
                  <option value="all">All Trades</option>
                  <option value="electrical">⚡ Electrical</option>
                  <option value="plumbing">🚰 Plumbing</option>
                  <option value="hvac">❄️ HVAC</option>
                  <option value="concrete">🏗️ Concrete</option>
                  <option value="framing">🪚 Framing</option>
                  <option value="finishing">🎨 Finishing</option>
                </select>

                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="px-3 py-2 rounded-lg focus:outline-none text-sm"
                  style={{ border: colors.border, color: colors.text }}
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">🔥 Critical</option>
                  <option value="high">⚠️ High</option>
                  <option value="medium">➡️ Medium</option>
                  <option value="low">✅ Low</option>
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Dashboard View */}
            {viewMode === "dashboard" && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="rounded-xl p-4" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">✅</span>
                      <p className="text-sm font-medium" style={{ color: colors.textMuted }}>Total</p>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: colors.text }}>{stats.total}</p>
                  </div>

                  <div className="rounded-xl p-4" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🚧</span>
                      <p className="text-sm font-medium" style={{ color: colors.textMuted }}>In Progress</p>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: '#6A9BFD' }}>{stats.inProgress}</p>
                  </div>

                  <div className="rounded-xl p-4" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">✅</span>
                      <p className="text-sm font-medium" style={{ color: colors.textMuted }}>Completed</p>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: '#6BCB77' }}>{stats.completed}</p>
                  </div>

                  <div className="rounded-xl p-4" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🚨</span>
                      <p className="text-sm font-medium" style={{ color: colors.textMuted }}>Blocked</p>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: '#DC2626' }}>{stats.blocked}</p>
                  </div>

                  <div className="rounded-xl p-4" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">📅</span>
                      <p className="text-sm font-medium" style={{ color: colors.textMuted }}>Due Today</p>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: '#FFD93D' }}>{stats.dueToday}</p>
                  </div>

                  <div className="rounded-xl p-4" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">⏰</span>
                      <p className="text-sm font-medium" style={{ color: colors.textMuted }}>Overdue</p>
                    </div>
                    <p className="text-3xl font-bold" style={{ color: '#DC2626' }}>{stats.overdue}</p>
                  </div>
                </div>

                {/* Critical Alerts */}
                {stats.overdue > 0 && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: '#FEE2E2', border: '1px solid #DC2626', boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🚨</span>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1" style={{ color: '#DC2626' }}>Critical Alerts</h3>
                        <p className="text-sm mb-2" style={{ color: colors.textMuted }}>
                          You have {stats.overdue} overdue task{stats.overdue !== 1 ? 's' : ''} that need immediate attention
                        </p>
                        <button className="text-sm font-semibold" style={{ color: '#DC2626' }}>
                          View Overdue Tasks →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Weather Widget */}
                <ConstructionErrorBoundary>
                    <WeatherWidget tasks={filteredTasks} countryCode="US" />
                </ConstructionErrorBoundary>

                {/* My Tasks Today */}
                <div className="rounded-xl p-6" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold" style={{ color: colors.text }}>Your Tasks Today</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(#6BCB77 ${(myTasks.filter(t => t.status === 'completed').length / myTasks.length) * 100}%, #E0E0E0 0)` }}>
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: colors.bg }}>
                          <span className="text-sm font-bold" style={{ color: colors.text }}>
                            {myTasks.filter(t => t.status === 'completed').length}/{myTasks.length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {myTasks.slice(0, 5).map((task) => (
                      <div
                        key={task.id}
                        className="p-4 rounded-lg transition-all cursor-pointer hover:-translate-y-0.5"
                        style={{
                          backgroundColor: tradeColors[task.trade].bg,
                          borderLeft: `4px solid ${tradeColors[task.trade].border}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{priorityStyles[task.priority].icon}</span>
                              <h4 className="font-semibold text-sm" style={{ color: colors.text }}>{task.title}</h4>
                              {task.weatherDependent && <span className="text-sm">🌤️</span>}
                              {task.inspectionRequired && <span className="text-sm">🔍</span>}
                            </div>
                            <p className="text-xs mb-2" style={{ color: colors.textMuted }}>{task.project} • {task.location}</p>
                            <div className="flex items-center gap-3 text-xs" style={{ color: colors.textMuted }}>
                              <span>📅 Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                              <span>⏱️ {task.estimatedHours}h est</span>
                              {task.attachments > 0 && <span>📎 {task.attachments}</span>}
                              {task.comments > 0 && <span>💬 {task.comments}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className="px-2 py-1 rounded text-xs font-semibold"
                              style={{ backgroundColor: statusStyles[task.status].bg, color: statusStyles[task.status].color }}
                            >
                              {statusStyles[task.status].icon} {statusStyles[task.status].label}
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1" style={{ color: colors.textMuted }}>
                            <span>Progress</span>
                            <span className="font-semibold">{task.progress}%</span>
                          </div>
                          <div className="w-full rounded-full h-2" style={{ backgroundColor: colors.bgMuted }}>
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${task.progress}%`,
                                backgroundColor: tradeColors[task.trade].border
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Team Allocation Heatmap */}
                <ConstructionErrorBoundary>
                  <TeamAllocationHeatmap tasks={filteredTasks} teamMembers={teamMembers} />
                </ConstructionErrorBoundary>

                {/* Progress & Metrics Widget */}
                <ConstructionErrorBoundary>
                  <ProgressMetricsWidget tasks={filteredTasks} />
                </ConstructionErrorBoundary>
              </div>
            )}

            {/* Kanban View */}
            {viewMode === "kanban" && (
              <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-4 min-w-max">
                    {Object.entries(statusStyles).map(([status, style]) => {
                      const columnTasks = filteredTasks.filter(t => t.status === status)
                      return (
                        <DroppableColumn key={status} id={status} style={style} count={columnTasks.length}>
                          <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-3">
                              {columnTasks.map((task) => (
                                <DraggableTaskCard key={task.id} task={task} />
                              ))}
                            </div>
                          </SortableContext>
                        </DroppableColumn>
                      )
                    })}
                  </div>
                </div>
                <DragOverlay>
                  {activeId ? (
                    <div className="rounded-lg p-3 cursor-grabbing" style={{ backgroundColor: colors.bg, boxShadow: '0 8px 16px rgba(0,0,0,0.15), 0 4px 8px rgba(0,0,0,0.1)', opacity: 0.9 }}>
                      <p className="font-semibold text-sm" style={{ color: colors.text }}>
                        {tasks.find(t => t.id === activeId)?.title || "Task"}
                      </p>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}

            {/* List View */}
            {viewMode === "list" && (
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead style={{ backgroundColor: colors.bgAlt, borderBottom: colors.borderBottom }}>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Task</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Priority</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Status</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Trade</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Assignee</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Due Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Progress</th>
                      </tr>
                    </thead>
                    <tbody style={{ borderTop: `1px solid var(--border)` }}>
                      {filteredTasks.map((task) => (
                        <tr key={task.id} className="transition-colors" style={{ borderBottom: colors.borderBottom }}>
                          <td className="px-6 py-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <p className="font-semibold text-sm mb-1" style={{ color: colors.text }}>{task.title}</p>
                                <p className="text-xs" style={{ color: colors.textMuted }}>{task.project}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold" style={{ backgroundColor: priorityStyles[task.priority].bg, color: priorityStyles[task.priority].color }}>
                              {priorityStyles[task.priority].icon} {task.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: statusStyles[task.status].bg, color: statusStyles[task.status].color }}>
                              {statusStyles[task.status].icon} {statusStyles[task.status].label}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: tradeColors[task.trade].bg, color: tradeColors[task.trade].text }}>
                              {task.trade}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ background: 'linear-gradient(135deg, #4ECDC4 0%, #5FD9CF 100%)' }}>
                                {task.assigneeAvatar}
                              </div>
                              <span className="text-sm" style={{ color: colors.text }}>{task.assignee}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm" style={{ color: colors.text }}>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-24 rounded-full h-2" style={{ backgroundColor: colors.bgMuted }}>
                                <div className="h-2 rounded-full" style={{ width: `${task.progress}%`, backgroundColor: tradeColors[task.trade].border }}></div>
                              </div>
                              <span className="text-sm font-medium min-w-12" style={{ color: colors.text }}>{task.progress}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Calendar & Gantt Views (Pro+) */}
            {(viewMode === "calendar" || viewMode === "gantt") && userPlan === "starter" && (
              <div className="rounded-xl p-12 text-center" style={{ backgroundColor: colors.bg, border: colors.border, boxShadow: '0 2px 4px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.1)' }}>
                <span className="text-6xl mb-4 block">🔒</span>
                <h3 className="text-xl font-bold mb-2" style={{ color: colors.text }}>
                  {viewMode === "calendar" ? "Calendar View" : "Gantt Chart"} - Pro Feature
                </h3>
                <p className="mb-6" style={{ color: colors.textMuted }}>
                  Upgrade to Pro or Enterprise to unlock advanced scheduling and timeline views
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-lg font-semibold transition-colors"
                  style={{ background: 'linear-gradient(to bottom, #FF6B6B 0%, #FF5252 100%)', boxShadow: '0 2px 4px rgba(255,107,107,0.2), 0 1px 2px rgba(255,107,107,0.3)' }}
                >
                  Upgrade Now →
                </Link>
              </div>
            )}

            {viewMode === "calendar" && userPlan !== "starter" && (
              <CalendarView
                tasks={filteredTasks}
                onTaskClick={(task) => {
                  setEditingTask(task as any)
                  setShowCreateModal(true)
                }}
                onDateClick={() => {
                  setShowCreateModal(true)
                }}
              />
            )}

            {viewMode === "gantt" && userPlan !== "starter" && (
              <GanttChartView
                tasks={filteredTasks}
                onTaskClick={(task) => {
                  setEditingTask(task as any)
                  setShowCreateModal(true)
                }}
              />
            )}
          </div>

      {/* Task Creation Modal */}
      <TaskCreationModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingTask(null)
        }}
        onSave={async (taskData) => {
          console.log('TaskFlow onSave called with taskData:', taskData)
          console.log('taskData keys:', Object.keys(taskData))
          console.log('taskData.title:', taskData.title)

          if (editingTask) {
            // Update existing task
            const { error } = await updateTask(editingTask.id, {
              title: taskData.title!,
              description: taskData.description || null,
              project_id: taskData.projectId || null,
              project_name: taskData.project || null,
              trade: taskData.trade!,
              phase: taskData.phase!,
              priority: taskData.priority!,
              status: taskData.status!,
              assignee_id: taskData.assigneeId || null,
              assignee_name: taskData.assignee || null,
              assignee_avatar: taskData.assigneeAvatar || null,
              start_date: taskData.startDate || null,
              due_date: taskData.dueDate!,
              duration: taskData.duration!,
              progress: taskData.progress!,
              estimated_hours: taskData.estimatedHours!,
              actual_hours: taskData.actualHours!,
              dependencies: taskData.dependencies!,
              location: taskData.location || null,
              weather_dependent: taskData.weatherDependent!,
              weather_buffer: taskData.weatherBuffer!,
              inspection_required: taskData.inspectionRequired!,
              inspection_type: taskData.inspectionType || null,
              crew_size: taskData.crewSize!,
              equipment: taskData.equipment!,
              materials: taskData.materials!,
              certifications: taskData.certifications!,
              safety_protocols: taskData.safetyProtocols!,
              quality_standards: taskData.qualityStandards!,
              documentation: taskData.documentation!,
              notify_inspector: taskData.notifyInspector!,
              client_visibility: taskData.clientVisibility!
            })

            if (error) {
              console.error("Error updating task:", error)
              alert("Failed to update task. Please try again.")
            }
          } else {
            // Create new task
            const { error } = await createTask({
              title: taskData.title!,
              description: taskData.description || null,
              project_id: taskData.projectId || null,
              project_name: taskData.project || null,
              trade: taskData.trade || "general",
              phase: taskData.phase || "pre-construction",
              priority: taskData.priority || "medium",
              status: taskData.status || "not-started",
              assignee_id: taskData.assigneeId || null,
              assignee_name: taskData.assignee || null,
              assignee_avatar: taskData.assigneeAvatar || null,
              start_date: taskData.startDate || null,
              due_date: taskData.dueDate || new Date().toISOString().split('T')[0],
              duration: taskData.duration || 1,
              progress: taskData.progress || 0,
              estimated_hours: taskData.estimatedHours || 8,
              actual_hours: taskData.actualHours || 0,
              dependencies: taskData.dependencies || [],
              attachments: taskData.attachments || 0,
              comments: taskData.comments || 0,
              location: taskData.location || null,
              weather_dependent: taskData.weatherDependent || false,
              weather_buffer: taskData.weatherBuffer || 0,
              inspection_required: taskData.inspectionRequired || false,
              inspection_type: taskData.inspectionType || null,
              crew_size: taskData.crewSize || 1,
              equipment: taskData.equipment || [],
              materials: taskData.materials || [],
              certifications: taskData.certifications || [],
              safety_protocols: taskData.safetyProtocols || [],
              quality_standards: taskData.qualityStandards || [],
              documentation: taskData.documentation || [],
              notify_inspector: taskData.notifyInspector || false,
              client_visibility: taskData.clientVisibility || false
            })

            if (error) {
              console.error("Error creating task:", error)
              alert("Failed to create task. Please try again.")
            }
          }
        }}
        editingTask={editingTask}
        projects={projects}
        teamMembers={teamMembers}
        existingTasks={tasks}
      />
    </>
  )
}
