'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProjectDetails } from '@/lib/projects/get-project-details'
import { createClient } from '@/lib/supabase/client'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Props {
  project: ProjectDetails
  onClose: () => void
}

type FormData = {
  name: string
  client: string
  description: string
  status: ProjectDetails['status']
  type: ProjectDetails['type']
  address: string
  city: string
  state: string
  zip_code: string
  country: string
  start_date: string
  end_date: string
  estimated_budget: string
}

export default function EditProjectModal({ project, onClose }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormData>({
    name: project.name,
    client: project.client,
    description: project.description ?? '',
    status: project.status,
    type: project.type,
    address: project.address ?? '',
    city: project.city ?? '',
    state: project.state ?? '',
    zip_code: project.zip_code ?? '',
    country: project.country ?? 'US',
    start_date: project.start_date?.slice(0, 10) ?? '',
    end_date: project.end_date?.slice(0, 10) ?? '',
    estimated_budget: String(project.estimated_budget ?? 0),
  })

  function set(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.client.trim()) {
      setError('Name and client are required.')
      return
    }
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        name: form.name.trim(),
        client: form.client.trim(),
        description: form.description.trim() || null,
        status: form.status,
        type: form.type,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        zip_code: form.zip_code.trim() || null,
        country: form.country.trim() || 'US',
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        estimated_budget: parseFloat(form.estimated_budget) || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)

    setSaving(false)

    if (updateError) {
      setError('Failed to save changes. Please try again.')
      return
    }

    router.refresh()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Edit Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form id="edit-project-form" onSubmit={handleSave} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Name + Client */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Project Name *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Client *</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.client}
                onChange={e => set('client', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>

          {/* Status + Type */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status}
                onChange={e => set('status', e.target.value as ProjectDetails['status'])}
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.type}
                onChange={e => set('type', e.target.value as ProjectDetails['type'])}
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
                <option value="industrial">Industrial</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="renovation">Renovation</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Address</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.address}
              onChange={e => set('address', e.target.value)}
            />
          </div>

          {/* City / State / Zip / Country */}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.city}
                onChange={e => set('city', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.state}
                onChange={e => set('state', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">ZIP</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.zip_code}
                onChange={e => set('zip_code', e.target.value)}
              />
            </div>
          </div>

          {/* Start / End date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.start_date}
                onChange={e => set('start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.end_date}
                onChange={e => set('end_date', e.target.value)}
              />
            </div>
          </div>

          {/* Budget */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Budget ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.estimated_budget}
              onChange={e => set('estimated_budget', e.target.value)}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="edit-project-form"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
