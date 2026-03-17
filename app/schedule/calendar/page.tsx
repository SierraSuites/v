'use client'

/**
 * Team Calendar Page
 * Monthly calendar view of team tasks and availability
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TeamCalendar from '@/components/scheduling/TeamCalendar'
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { format, addMonths, subMonths } from 'date-fns'

interface Task {
  id: string
  title: string
  start_date: string
  due_date: string
  status: string
  assigned_to?: string
  assigned_user_name?: string
  project_name?: string
}

interface Project {
  id: string
  name: string
}

interface TeamMember {
  id: string
  full_name: string
}

export default function CalendarPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedProject, setSelectedProject] = useState<string>('all')
  const [selectedMember, setSelectedMember] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProjects()
    loadTeamMembers()
  }, [])

  useEffect(() => {
    loadTasks()
  }, [selectedDate, selectedProject, selectedMember])

  async function loadProjects() {
    try {
      const res = await fetch('/api/projects')
      if (res.ok) {
        const data = await res.json()
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  async function loadTeamMembers() {
    try {
      const res = await fetch('/api/team')
      if (res.ok) {
        const data = await res.json()
        setTeamMembers(data.team_members || [])
      }
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  async function loadTasks() {
    try {
      setLoading(true)
      const params = new URLSearchParams()

      // Get tasks for the current month
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)

      params.set('start_date', startOfMonth.toISOString())
      params.set('end_date', endOfMonth.toISOString())

      if (selectedProject !== 'all') {
        params.set('project_id', selectedProject)
      }
      if (selectedMember !== 'all') {
        params.set('assigned_to', selectedMember)
      }

      const res = await fetch(`/api/tasks?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  function goToPreviousMonth() {
    setSelectedDate(subMonths(selectedDate, 1))
  }

  function goToNextMonth() {
    setSelectedDate(addMonths(selectedDate, 1))
  }

  function goToToday() {
    setSelectedDate(new Date())
  }

  function handleDateClick(date: Date) {
    // Could open a modal or navigate to tasks for this date
    console.log('Date clicked:', date)
  }

  function handleTaskClick(task: Task) {
    router.push(`/tasks/${task.id}`)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Calendar</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monthly view of team tasks and availability
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/schedule')}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <CalendarIcon className="w-5 h-5" />
              Gantt View
            </button>
          </div>
        </div>
      </div>

      {/* Month Navigator and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-semibold text-gray-900 min-w-[180px] text-center">
              {format(selectedDate, 'MMMM yyyy')}
            </h2>

            <button
              onClick={goToNextMonth}
              className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>

            <button
              onClick={goToToday}
              className="px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              Today
            </button>
          </div>

          <div className="flex items-center gap-3">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Team Members</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Total Tasks</p>
          <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-blue-600">
            {tasks.filter((t) => t.status === 'in_progress').length}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {tasks.filter((t) => t.status === 'completed').length}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-500">Not Started</p>
          <p className="text-2xl font-bold text-gray-600">
            {tasks.filter((t) => t.status === 'not_started').length}
          </p>
        </div>
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <TeamCalendar
          tasks={tasks}
          selectedDate={selectedDate}
          onDateClick={handleDateClick}
          onTaskClick={handleTaskClick}
        />
      )}
    </div>
  )
}
