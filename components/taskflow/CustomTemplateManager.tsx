'use client'

// ============================================================================
// CUSTOM TEMPLATE MANAGER
// Allows users to create, edit, and manage their own task templates
// ============================================================================

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit2, Trash2, Copy, Save, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { TaskTemplate, WorkflowTemplate } from '@/lib/task-templates'

interface CustomTemplateManagerProps {
  isOpen: boolean
  onClose: () => void
  onTemplateCreated?: () => void
}

interface CustomTemplate extends WorkflowTemplate {
  user_id: string
  company_id: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export default function CustomTemplateManager({
  isOpen,
  onClose,
  onTemplateCreated
}: CustomTemplateManagerProps) {
  const [templates, setTemplates] = useState<CustomTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null)
  const [creating, setCreating] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general' as CustomTemplate['category'],
    icon: '📋',
    is_public: false
  })
  const [tasks, setTasks] = useState<TaskTemplate[]>([])
  const [expandedTask, setExpandedTask] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCustomTemplates()
    }
  }, [isOpen])

  async function loadCustomTemplates() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await supabase
        .from('custom_task_templates')
        .select('*')
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .order('created_at', { ascending: false })

      if (error) throw error

      setTemplates(data || [])
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  function startCreating() {
    setCreating(true)
    setEditingTemplate(null)
    setFormData({
      name: '',
      description: '',
      category: 'general',
      icon: '📋',
      is_public: false
    })
    setTasks([{
      title: '',
      description: '',
      estimated_hours: 8,
      priority: 'medium',
      dependencies: []
    }])
  }

  function startEditing(template: CustomTemplate) {
    setEditingTemplate(template)
    setCreating(false)
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      icon: template.icon,
      is_public: template.is_public
    })
    setTasks([...template.tasks])
  }

  function addTask() {
    setTasks([...tasks, {
      title: '',
      description: '',
      estimated_hours: 8,
      priority: 'medium',
      dependencies: []
    }])
  }

  function updateTask(index: number, field: keyof TaskTemplate, value: any) {
    const updated = [...tasks]
    updated[index] = { ...updated[index], [field]: value }
    setTasks(updated)
  }

  function removeTask(index: number) {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  function duplicateTask(index: number) {
    const taskToDuplicate = { ...tasks[index] }
    setTasks([...tasks.slice(0, index + 1), taskToDuplicate, ...tasks.slice(index + 1)])
  }

  async function saveTemplate() {
    if (!formData.name.trim()) {
      alert('Please enter a template name')
      return
    }

    if (tasks.length === 0 || !tasks[0].title.trim()) {
      alert('Please add at least one task')
      return
    }

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      const templateData = {
        user_id: user.id,
        company_id: profile?.company_id,
        name: formData.name,
        description: formData.description,
        category: formData.category,
        icon: formData.icon,
        is_public: formData.is_public,
        tasks: tasks.filter(t => t.title.trim())
      }

      if (editingTemplate) {
        // Update existing
        const { error } = await supabase
          .from('custom_task_templates')
          .update(templateData)
          .eq('id', editingTemplate.id)

        if (error) throw error
      } else {
        // Create new
        const { error } = await supabase
          .from('custom_task_templates')
          .insert([templateData])

        if (error) throw error
      }

      await loadCustomTemplates()
      setCreating(false)
      setEditingTemplate(null)
      onTemplateCreated?.()
      alert(editingTemplate ? 'Template updated successfully!' : 'Template created successfully!')
    } catch (error: any) {
      console.error('Failed to save template:', error)
      alert('Failed to save template: ' + error.message)
    }
  }

  async function deleteTemplate(template: CustomTemplate) {
    if (!confirm(`Delete template "${template.name}"?`)) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('custom_task_templates')
        .delete()
        .eq('id', template.id)

      if (error) throw error

      await loadCustomTemplates()
      alert('Template deleted successfully!')
    } catch (error: any) {
      console.error('Failed to delete template:', error)
      alert('Failed to delete template: ' + error.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Custom Templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Create and manage your own workflow templates
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!creating && !editingTemplate ? (
            // Template List View
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Your Templates ({templates.length})
                </h3>
                <button
                  onClick={startCreating}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Plus className="h-4 w-4" />
                  Create Template
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Custom Templates</h3>
                  <p className="text-gray-600 mb-6">
                    Create your first custom workflow template
                  </p>
                  <button
                    onClick={startCreating}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Create Your First Template
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {templates.map(template => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-3xl flex-shrink-0">{template.icon}</div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                            <span>{template.tasks.length} tasks</span>
                            <span>•</span>
                            <span className="capitalize">{template.category}</span>
                            {template.is_public && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600">Public</span>
                              </>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEditing(template)}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => deleteTemplate(template)}
                              className="flex items-center gap-1 px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Create/Edit Form
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h3>
                <button
                  onClick={() => {
                    setCreating(false)
                    setEditingTemplate(null)
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
              </div>

              {/* Template Info */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-gray-900">Template Information</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Custom Kitchen Remodel"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Icon
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      placeholder="Emoji"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this workflow..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="general">General</option>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="renovation">Renovation</option>
                      <option value="infrastructure">Infrastructure</option>
                    </select>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 pt-7">
                      <input
                        type="checkbox"
                        checked={formData.is_public}
                        onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        Share with company
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900">Tasks ({tasks.length})</h4>
                  <button
                    onClick={addTask}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    <Plus className="h-4 w-4" />
                    Add Task
                  </button>
                </div>

                {tasks.map((task, index) => (
                  <div key={index} className="border rounded-lg">
                    {/* Task Header */}
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedTask(expandedTask === index ? null : index)}
                    >
                      <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => {
                            e.stopPropagation()
                            updateTask(index, 'title', e.target.value)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Task title..."
                          className="w-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 rounded font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            duplicateTask(index)
                          }}
                          className="p-1 hover:bg-gray-200 rounded"
                          title="Duplicate"
                        >
                          <Copy className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            removeTask(index)
                          }}
                          className="p-1 hover:bg-red-100 rounded"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                        {expandedTask === index ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Task Details (Expanded) */}
                    {expandedTask === index && (
                      <div className="p-4 border-t bg-gray-50 space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={task.description}
                            onChange={(e) => updateTask(index, 'description', e.target.value)}
                            placeholder="Task description..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Estimated Hours
                            </label>
                            <input
                              type="number"
                              value={task.estimated_hours}
                              onChange={(e) => updateTask(index, 'estimated_hours', Number(e.target.value))}
                              min="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Priority
                            </label>
                            <select
                              value={task.priority}
                              onChange={(e) => updateTask(index, 'priority', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => {
                    setCreating(false)
                    setEditingTemplate(null)
                  }}
                  className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTemplate}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  <Save className="h-4 w-4" />
                  {editingTemplate ? 'Update Template' : 'Save Template'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
