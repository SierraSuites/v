'use client'

/**
 * New Budget Creation Wizard
 * Multi-step form for creating comprehensive budgets
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface BudgetItem {
  id: string
  category: string
  subcategory: string
  description: string
  budgeted_amount: number
  actual_amount: number
  notes: string
}

interface Project {
  id: string
  name: string
  status: string
}

const STANDARD_CATEGORIES = [
  'Labor',
  'Materials',
  'Equipment',
  'Subcontractors',
  'Permits & Fees',
  'Insurance',
  'Overhead',
  'Contingency',
  'Other',
]

export default function NewBudgetPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    project_id: '',
    fiscal_year: new Date().getFullYear().toString(),
    start_date: '',
    end_date: '',
  })

  const [items, setItems] = useState<BudgetItem[]>([
    {
      id: crypto.randomUUID(),
      category: 'Labor',
      subcategory: '',
      description: '',
      budgeted_amount: 0,
      actual_amount: 0,
      notes: '',
    },
  ])

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      const response = await fetch('/api/projects')
      if (!response.ok) throw new Error('Failed to fetch projects')
      const data = await response.json()
      setProjects(data.projects || [])
    } catch (error) {
      console.error('Error loading projects:', error)
    }
  }

  function addItem() {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        category: 'Labor',
        subcategory: '',
        description: '',
        budgeted_amount: 0,
        actual_amount: 0,
        notes: '',
      },
    ])
  }

  function removeItem(id: string) {
    setItems(items.filter((item) => item.id !== id))
  }

  function updateItem(id: string, field: keyof BudgetItem, value: any) {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    )
  }

  async function handleSubmit() {
    try {
      setLoading(true)

      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          items: items.map(({ id, ...item }) => item), // Remove temporary IDs
        }),
      })

      if (!response.ok) throw new Error('Failed to create budget')

      const data = await response.json()
      router.push(`/financial/budgets/${data.budget.id}`)
    } catch (error) {
      console.error('Error creating budget:', error)
      toast.error('Failed to create budget')
    } finally {
      setLoading(false)
    }
  }

  const totalBudgeted = items.reduce((sum, item) => sum + (item.budgeted_amount || 0), 0)
  const totalActual = items.reduce((sum, item) => sum + (item.actual_amount || 0), 0)

  const canProceedStep1 = formData.name && formData.start_date
  const canProceedStep2 = items.length > 0 && items.every((item) => item.category && item.budgeted_amount > 0)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back to Budgets
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Create New Budget</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set up a comprehensive budget with cost categories and tracking
          </p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= 1
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > 1 ? <CheckCircleIcon className="w-6 h-6" /> : '1'}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Budget Details</div>
                <div className="text-xs text-gray-500">Name, project, dates</div>
              </div>
            </div>

            <div className="h-px flex-1 bg-gray-300 mx-4"></div>

            <div className="flex items-center gap-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= 2
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > 2 ? <CheckCircleIcon className="w-6 h-6" /> : '2'}
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Budget Items</div>
                <div className="text-xs text-gray-500">Categories and amounts</div>
              </div>
            </div>

            <div className="h-px flex-1 bg-gray-300 mx-4"></div>

            <div className="flex items-center gap-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  step >= 3
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                3
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Review</div>
                <div className="text-xs text-gray-500">Confirm and create</div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 1: Budget Details */}
        {step === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Budget Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Q1 2024 Operations Budget"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project (Optional)
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No project (company-wide budget)</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fiscal Year
                  </label>
                  <input
                    type="text"
                    value={formData.fiscal_year}
                    onChange={(e) => setFormData({ ...formData, fiscal_year: e.target.value })}
                    placeholder="2024"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Budget Items */}
        {step === 2 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Budget Items</h2>
              <button
                onClick={addItem}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="text-sm font-medium text-gray-700">Item {index + 1}</div>
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                      </label>
                      <select
                        value={item.category}
                        onChange={(e) =>
                          updateItem(item.id, 'category', e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      >
                        {STANDARD_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subcategory
                      </label>
                      <input
                        type="text"
                        value={item.subcategory}
                        onChange={(e) =>
                          updateItem(item.id, 'subcategory', e.target.value)
                        }
                        placeholder="e.g., Skilled Labor"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, 'description', e.target.value)
                        }
                        placeholder="Brief description of this budget line item"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Budgeted Amount *
                      </label>
                      <input
                        type="number"
                        value={item.budgeted_amount}
                        onChange={(e) =>
                          updateItem(item.id, 'budgeted_amount', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Actual Amount (if known)
                      </label>
                      <input
                        type="number"
                        value={item.actual_amount}
                        onChange={(e) =>
                          updateItem(item.id, 'actual_amount', parseFloat(e.target.value) || 0)
                        }
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={item.notes}
                        onChange={(e) =>
                          updateItem(item.id, 'notes', e.target.value)
                        }
                        placeholder="Additional notes or assumptions"
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-blue-700">Total Budgeted</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(totalBudgeted)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-blue-700">Total Actual</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(totalActual)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Review Budget</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Budget Details</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">Name</dt>
                    <dd className="text-sm font-medium text-gray-900">{formData.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Fiscal Year</dt>
                    <dd className="text-sm font-medium text-gray-900">{formData.fiscal_year}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Start Date</dt>
                    <dd className="text-sm font-medium text-gray-900">
                      {new Date(formData.start_date).toLocaleDateString()}
                    </dd>
                  </div>
                  {formData.end_date && (
                    <div>
                      <dt className="text-sm text-gray-500">End Date</dt>
                      <dd className="text-sm font-medium text-gray-900">
                        {new Date(formData.end_date).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Budget Items ({items.length})
                </h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Category
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                          Description
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          Budgeted
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">
                          Actual
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.category}
                            {item.subcategory && (
                              <span className="text-gray-500"> / {item.subcategory}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {item.description || '—'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            }).format(item.budgeted_amount)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 text-right">
                            {new Intl.NumberFormat('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            }).format(item.actual_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={2} className="px-4 py-2 text-sm font-medium text-gray-900">
                          Total
                        </td>
                        <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(totalBudgeted)}
                        </td>
                        <td className="px-4 py-2 text-sm font-bold text-gray-900 text-right">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                          }).format(totalActual)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="inline-flex items-center gap-2 px-6 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
            Previous
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating...' : 'Create Budget'}
            </button>
          )}
        </div>
      </div>
  )
}
