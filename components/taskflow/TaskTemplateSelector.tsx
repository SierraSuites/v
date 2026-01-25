'use client'

import { useState } from 'react'
import {
  workflowTemplates,
  getTemplatesByCategory,
  getTemplateCategories,
  type WorkflowTemplate,
  type TaskTemplate
} from '@/lib/task-templates'

interface TaskTemplateSelectorProps {
  projectId: string
  onApplyTemplate: (tasks: TaskTemplate[], templateName: string) => Promise<void>
  onClose: () => void
}

export default function TaskTemplateSelector({
  projectId,
  onApplyTemplate,
  onClose
}: TaskTemplateSelectorProps) {
  const [category, setCategory] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)
  const [applying, setApplying] = useState(false)

  const categories = getTemplateCategories()
  const templates = getTemplatesByCategory(category)

  async function handleApplyTemplate() {
    if (!selectedTemplate) return

    setApplying(true)
    try {
      await onApplyTemplate(selectedTemplate.tasks, selectedTemplate.name)
      onClose()
    } catch (error) {
      console.error('Failed to apply template:', error)
      alert('Failed to apply template. Please try again.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Task Templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              Select a workflow template to quickly add standard tasks to your project
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category Filters */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => {
                  setCategory(cat.value)
                  setSelectedTemplate(null)
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  category === cat.value
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Templates List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto p-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
              Available Templates ({templates.length})
            </h3>
            <div className="space-y-3">
              {templates.map(template => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-600 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl flex-shrink-0">{template.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {template.tasks.length} tasks
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {template.tasks.reduce((sum, t) => sum + t.estimated_hours, 0)} hours
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}

              {templates.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>No templates found in this category</p>
                </div>
              )}
            </div>
          </div>

          {/* Template Preview */}
          <div className="w-1/2 overflow-y-auto p-6 bg-gray-50">
            {selectedTemplate ? (
              <div>
                <div className="flex items-start gap-4 mb-6">
                  <div className="text-5xl">{selectedTemplate.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedTemplate.name}</h3>
                    <p className="text-gray-600 mb-4">{selectedTemplate.description}</p>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <strong>{selectedTemplate.tasks.length}</strong> tasks
                      </span>
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <strong>{selectedTemplate.tasks.reduce((sum, t) => sum + t.estimated_hours, 0)}</strong> total hours
                      </span>
                    </div>
                  </div>
                </div>

                {/* Task List */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Tasks ({selectedTemplate.tasks.length})
                  </h4>
                  {selectedTemplate.tasks.map((task, index) => (
                    <div
                      key={index}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-start gap-3 mb-2">
                        <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-gray-900 mb-1">{task.title}</h5>
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              task.priority === 'critical' ? 'bg-red-100 text-red-700' :
                              task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {task.priority.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {task.estimated_hours} hours
                            </span>
                            {task.dependencies && task.dependencies.length > 0 && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                                Depends on task {task.dependencies.map(d => d + 1).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Template</h3>
                  <p className="text-gray-600">
                    Choose a workflow template from the list to preview its tasks
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-sm text-gray-600">
            {selectedTemplate
              ? `Adding ${selectedTemplate.tasks.length} tasks to your project`
              : 'Select a template to continue'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyTemplate}
              disabled={!selectedTemplate || applying}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {applying ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Applying...
                </>
              ) : (
                'Apply Template'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
