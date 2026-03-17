'use client'

/**
 * Resource Allocation Page
 * View team member workload and availability
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserGroupIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addWeeks, subWeeks } from 'date-fns'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role?: string
  tasks?: Task[]
  workload_hours?: number
  capacity_hours?: number
}

interface Task {
  id: string
  title: string
  start_date: string
  due_date: string
  estimated_hours?: number
  status: string
  project_name?: string
}

export default function ResourceAllocationPage() {
  const router = useRouter()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedWeek, setSelectedWeek] = useState(new Date())
  const [loading, setLoading] = useState(true)

  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd }).filter(
    (day) => day.getDay() !== 0 && day.getDay() !== 6 // Exclude weekends
  )

  useEffect(() => {
    loadResourceData()
  }, [selectedWeek])

  async function loadResourceData() {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/schedule/resources?start_date=${weekStart.toISOString()}&end_date=${weekEnd.toISOString()}`
      )
      if (res.ok) {
        const data = await res.json()
        setTeamMembers(data.team_members || [])
      }
    } catch (error) {
      console.error('Error loading resource data:', error)
    } finally {
      setLoading(false)
    }
  }

  function goToPreviousWeek() {
    setSelectedWeek(subWeeks(selectedWeek, 1))
  }

  function goToNextWeek() {
    setSelectedWeek(addWeeks(selectedWeek, 1))
  }

  function goToCurrentWeek() {
    setSelectedWeek(new Date())
  }

  function getUtilizationColor(utilizationPercent: number) {
    if (utilizationPercent > 100) return 'text-red-600 bg-red-100'
    if (utilizationPercent >= 90) return 'text-orange-600 bg-orange-100'
    if (utilizationPercent >= 70) return 'text-green-600 bg-green-100'
    return 'text-blue-600 bg-blue-100'
  }

  function getUtilizationStatus(utilizationPercent: number) {
    if (utilizationPercent > 100) return 'Overallocated'
    if (utilizationPercent >= 90) return 'At Capacity'
    if (utilizationPercent >= 70) return 'Well Utilized'
    return 'Available'
  }

  const overallocatedMembers = teamMembers.filter(
    (m) => (m.workload_hours || 0) > (m.capacity_hours || 40)
  )
  const availableMembers = teamMembers.filter(
    (m) => (m.workload_hours || 0) < (m.capacity_hours || 40) * 0.7
  )

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resource Allocation</h1>
            <p className="mt-1 text-sm text-gray-500">
              Team member workload and availability
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/schedule')}
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <CalendarIcon className="w-5 h-5" />
              Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Team Members</p>
              <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Available</p>
              <p className="text-2xl font-bold text-gray-900">{availableMembers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Overallocated</p>
              <p className="text-2xl font-bold text-gray-900">{overallocatedMembers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">
                {teamMembers.reduce((sum, m) => sum + (m.tasks?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousWeek}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Previous Week
          </button>

          <div className="text-center">
            <p className="text-lg font-semibold text-gray-900">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </p>
            <button
              onClick={goToCurrentWeek}
              className="text-sm text-blue-600 hover:text-blue-700 mt-1"
            >
              Today
            </button>
          </div>

          <button
            onClick={goToNextWeek}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Next Week →
          </button>
        </div>
      </div>

      {/* Resource Table */}
      {loading ? (
        <div className="flex items-center justify-center h-96 bg-white rounded-lg border border-gray-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tasks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workload
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Utilization
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {teamMembers.map((member) => {
                  const capacity = member.capacity_hours || 40
                  const workload = member.workload_hours || 0
                  const utilizationPercent = capacity > 0 ? (workload / capacity) * 100 : 0

                  return (
                    <tr key={member.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{member.full_name}</div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{member.role || 'Team Member'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">{member.tasks?.length || 0}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {workload.toFixed(1)}h / {capacity}h
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div
                            className={`h-2 rounded-full ${
                              utilizationPercent > 100
                                ? 'bg-red-600'
                                : utilizationPercent >= 90
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {utilizationPercent.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUtilizationColor(
                            utilizationPercent
                          )}`}
                        >
                          {getUtilizationStatus(utilizationPercent)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {teamMembers.length === 0 && (
            <div className="text-center py-12">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add team members to track resource allocation
              </p>
            </div>
          )}
        </div>
      )}

      {/* Task Breakdown */}
      {teamMembers.length > 0 && (
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Task Breakdown</h2>
          {teamMembers.map((member) => {
            if (!member.tasks || member.tasks.length === 0) return null

            return (
              <div key={member.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="font-medium text-gray-900 mb-3">{member.full_name}</h3>
                <div className="space-y-2">
                  {member.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                      onClick={() => router.push(`/tasks/${task.id}`)}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                        <p className="text-xs text-gray-500">
                          {task.project_name} • {format(new Date(task.start_date), 'MMM d')} -{' '}
                          {format(new Date(task.due_date), 'MMM d')}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          {task.estimated_hours || 0}h
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            task.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : task.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
