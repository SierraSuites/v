'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface TimesheetEntry {
  id: string
  employee_id: string
  employee_name: string
  project_id: string | null
  project_name: string | null
  work_date: string
  regular_hours: number
  overtime_hours: number
  total_hours: number
  hourly_rate: number
  overtime_rate: number
  total_cost: number
}

interface WeekSummary {
  employee_id: string
  employee_name: string
  total_regular: number
  total_overtime: number
  total_hours: number
  total_cost: number
}

export default function TimesheetsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [entries, setEntries] = useState<TimesheetEntry[]>([])
  const [weekStart, setWeekStart] = useState<string>(getMonday(new Date()))
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)

  useEffect(() => {
    loadTimesheets()
  }, [weekStart])

  function getMonday(date: Date): string {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    return d.toISOString().split('T')[0]
  }

  function getWeekDates(mondayString: string): string[] {
    const dates: string[] = []
    const monday = new Date(mondayString)

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday)
      date.setDate(monday.getDate() + i)
      dates.push(date.toISOString().split('T')[0])
    }

    return dates
  }

  const loadTimesheets = async () => {
    try {
      setLoading(true)

      const weekDates = getWeekDates(weekStart)
      const weekEnd = weekDates[weekDates.length - 1]

      const { data, error } = await supabase
        .from('timesheet_entries')
        .select(`
          *,
          employee:auth.users!employee_id(id, email),
          project:projects(id, name)
        `)
        .eq('week_start_date', weekStart)
        .gte('work_date', weekStart)
        .lte('work_date', weekEnd)
        .order('employee_id')
        .order('work_date')

      if (error) throw error

      const formatted = (data || []).map((entry: any) => ({
        id: entry.id,
        employee_id: entry.employee_id,
        employee_name: entry.employee?.email || 'Unknown',
        project_id: entry.project_id,
        project_name: entry.project?.name || 'No Project',
        work_date: entry.work_date,
        regular_hours: entry.regular_hours || 0,
        overtime_hours: entry.overtime_hours || 0,
        total_hours: entry.total_hours || 0,
        hourly_rate: entry.hourly_rate || 0,
        overtime_rate: entry.overtime_rate || 0,
        total_cost: entry.total_cost || 0
      }))

      setEntries(formatted)
    } catch (error) {
      console.error('Error loading timesheets:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateEntry = async (id: string, field: string, value: number) => {
    try {
      const { error } = await supabase
        .from('timesheet_entries')
        .update({ [field]: value })
        .eq('id', id)

      if (error) throw error

      // Reload to get calculated values
      loadTimesheets()
    } catch (error) {
      console.error('Error updating entry:', error)
    }
  }

  const addQuickEntry = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date().toISOString().split('T')[0]
      const monday = getMonday(new Date())

      const { error } = await supabase
        .from('timesheet_entries')
        .insert([{
          employee_id: user.id,
          work_date: today,
          week_start_date: monday,
          regular_hours: 8,
          overtime_hours: 0,
          hourly_rate: 25
        }])

      if (error) throw error

      loadTimesheets()
    } catch (error) {
      console.error('Error adding entry:', error)
    }
  }

  const generateReport = async () => {
    try {
      setLoading(true)

      const summary = calculateWeekSummary()
      const weekDates = getWeekDates(weekStart)

      const reportData = {
        report_type: 'weekly_timesheet',
        title: `Weekly Timesheet - Week of ${new Date(weekStart).toLocaleDateString()}`,
        date_range_start: weekStart,
        date_range_end: weekDates[weekDates.length - 1],
        status: 'draft',
        data_snapshot: {
          entries,
          summary
        },
        sections: [
          {
            id: 'summary',
            type: 'table',
            title: 'Week Summary',
            data: summary
          },
          {
            id: 'details',
            type: 'table',
            title: 'Detailed Entries',
            data: entries
          }
        ],
        summary: {
          total_employees: summary.length,
          total_hours: summary.reduce((sum, s) => sum + s.total_hours, 0),
          total_cost: summary.reduce((sum, s) => sum + s.total_cost, 0)
        }
      }

      const { data, error } = await supabase
        .from('reports')
        .insert([reportData])
        .select()
        .single()

      if (error) throw error

      router.push(`/reports/${data.id}`)
    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  const exportToExcel = () => {
    // Create CSV content
    const weekDates = getWeekDates(weekStart)
    const summary = calculateWeekSummary()

    let csv = 'Weekly Timesheet Report\n'
    csv += `Week of ${new Date(weekStart).toLocaleDateString()}\n\n`

    // Summary section
    csv += 'SUMMARY\n'
    csv += 'Employee,Regular Hours,Overtime Hours,Total Hours,Total Cost\n'
    summary.forEach(s => {
      csv += `${s.employee_name},${s.total_regular},${s.total_overtime},${s.total_hours},$${s.total_cost.toFixed(2)}\n`
    })

    csv += '\n\nDETAILED ENTRIES\n'
    csv += 'Employee,Project,Date,Regular Hours,Overtime Hours,Total Hours,Rate,OT Rate,Cost\n'
    entries.forEach(e => {
      csv += `${e.employee_name},${e.project_name || 'None'},${e.work_date},${e.regular_hours},${e.overtime_hours},${e.total_hours},$${e.hourly_rate},$${e.overtime_rate},$${e.total_cost.toFixed(2)}\n`
    })

    // Download
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `timesheet-${weekStart}.csv`
    a.click()
  }

  const calculateWeekSummary = (): WeekSummary[] => {
    const grouped = entries.reduce((acc, entry) => {
      if (!acc[entry.employee_id]) {
        acc[entry.employee_id] = {
          employee_id: entry.employee_id,
          employee_name: entry.employee_name,
          total_regular: 0,
          total_overtime: 0,
          total_hours: 0,
          total_cost: 0
        }
      }

      acc[entry.employee_id].total_regular += entry.regular_hours
      acc[entry.employee_id].total_overtime += entry.overtime_hours
      acc[entry.employee_id].total_hours += entry.total_hours
      acc[entry.employee_id].total_cost += entry.total_cost

      return acc
    }, {} as Record<string, WeekSummary>)

    return Object.values(grouped)
  }

  const weekDates = getWeekDates(weekStart)
  const summary = calculateWeekSummary()

  const groupedByEmployee = entries.reduce((acc, entry) => {
    if (!acc[entry.employee_id]) {
      acc[entry.employee_id] = {
        name: entry.employee_name,
        entries: []
      }
    }
    acc[entry.employee_id].entries.push(entry)
    return acc
  }, {} as Record<string, { name: string; entries: TimesheetEntry[] }>)

  const previousWeek = () => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() - 7)
    setWeekStart(getMonday(date))
  }

  const nextWeek = () => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + 7)
    setWeekStart(getMonday(date))
  }

  const thisWeek = () => {
    setWeekStart(getMonday(new Date()))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Weekly Timesheets</h1>
              <p className="text-sm text-gray-600">Track crew hours and generate payroll reports</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Excel
              </button>
              <button
                onClick={generateReport}
                disabled={entries.length === 0 || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Generate Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Week Navigator */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={previousWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                Week of {new Date(weekStart).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {new Date(weekDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(weekDates[6]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <button
                onClick={thisWeek}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Jump to This Week
              </button>
            </div>

            <button
              onClick={nextWeek}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-gray-900">{summary.length}</div>
              <div className="text-sm text-gray-600">Employees</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-blue-600">
                {summary.reduce((sum, s) => sum + s.total_regular, 0).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Regular Hours</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-orange-600">
                {summary.reduce((sum, s) => sum + s.total_overtime, 0).toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Overtime Hours</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-green-600">
                ${summary.reduce((sum, s) => sum + s.total_cost, 0).toFixed(2)}
              </div>
              <div className="text-sm text-gray-600">Total Cost</div>
            </div>
          </div>
        )}

        {/* Week Summary Table */}
        {summary.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6 overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">Week Summary by Employee</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Regular Hrs</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">OT Hrs</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Hrs</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {summary.map((employee) => (
                    <tr key={employee.employee_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{employee.employee_name}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">{employee.total_regular.toFixed(1)}</td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className={employee.total_overtime > 0 ? 'text-orange-600 font-medium' : 'text-gray-900'}>
                          {employee.total_overtime.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">{employee.total_hours.toFixed(1)}</td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-green-600">
                        ${employee.total_cost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100 font-bold">
                    <td className="px-6 py-4 text-sm text-gray-900">TOTAL</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {summary.reduce((sum, s) => sum + s.total_regular, 0).toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-orange-600">
                      {summary.reduce((sum, s) => sum + s.total_overtime, 0).toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {summary.reduce((sum, s) => sum + s.total_hours, 0).toFixed(1)}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-green-600">
                      ${summary.reduce((sum, s) => sum + s.total_cost, 0).toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Entries */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Detailed Timesheet Entries</h2>
            <button
              onClick={addQuickEntry}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              + Add Entry
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading timesheets...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">⏱️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No timesheet entries</h3>
              <p className="text-gray-600 mb-6">Start tracking hours for this week</p>
              <button
                onClick={addQuickEntry}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add First Entry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Regular</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Overtime</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(entry.work_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{entry.employee_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{entry.project_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-right">
                        {editMode ? (
                          <input
                            type="number"
                            value={entry.regular_hours}
                            onChange={(e) => updateEntry(entry.id, 'regular_hours', parseFloat(e.target.value))}
                            className="w-16 px-2 py-1 border rounded text-right"
                            step="0.5"
                          />
                        ) : (
                          <span className="text-gray-900">{entry.regular_hours}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        {editMode ? (
                          <input
                            type="number"
                            value={entry.overtime_hours}
                            onChange={(e) => updateEntry(entry.id, 'overtime_hours', parseFloat(e.target.value))}
                            className="w-16 px-2 py-1 border rounded text-right"
                            step="0.5"
                          />
                        ) : (
                          <span className={entry.overtime_hours > 0 ? 'text-orange-600 font-medium' : 'text-gray-900'}>
                            {entry.overtime_hours}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{entry.total_hours}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">${entry.hourly_rate}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-green-600">${entry.total_cost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
